/**
 * Predictive Notifications API
 * Handles ML-powered notification predictions and insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { createTypedSupabaseClient, type TypedSupabaseClient } from '@/lib/supabase-typed'
import { predictiveNotificationService } from '@/lib/services/predictive-notifications'
import { patternRecognitionEngine } from '@/lib/services/pattern-recognition'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createTypedSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = searchParams.get('organizationId')
    const lookbackDays = parseInt(searchParams.get('lookbackDays') || '30')
    const type = searchParams.get('type') // 'insights' | 'predictions' | 'performance'

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Verify user has access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let result = {}

    if (!type || type === 'insights') {
      // Generate predictive insights
      const insights = await predictiveNotificationService.generatePredictiveInsights(
        organizationId,
        lookbackDays
      )
      result = { ...result, insights }
    }

    if (!type || type === 'predictions') {
      // Get active predictions
      const { data: predictions } = await supabase
        .from('predicted_notifications')
        .select(`
          *,
          users!inner(full_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('is_sent', false)
        .gte('predicted_time', new Date().toISOString())
        .order('predicted_time')
        .limit(50)

      result = { ...result, predictions: predictions || [] }
    }

    if (!type || type === 'performance') {
      // Get performance report
      const performance = await predictiveNotificationService.generatePerformanceReport(
        organizationId
      )
      result = { ...result, performance }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Predictions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      action,
      userId,
      organizationId,
      type,
      category,
      title,
      message,
      priority = 'medium',
      resourceType,
      resourceId,
      metadata = {},
      scheduleOptions = { allowDelay: true, maxDelayHours: 24 }
    } = body

    if (action === 'create_smart_notification') {
      // Create a smart notification with ML optimization
      if (!userId || !type || !title || !message) {
        return NextResponse.json(
          { error: 'Missing required fields: userId, type, title, message' },
          { status: 400 }
        )
      }

      // Verify user has permission to send notifications to target user
      if (organizationId) {
        const { data: senderMembership } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', organizationId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (!senderMembership || !['owner', 'admin', 'member'].includes((senderMembership as any)?.role)) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }

      const smartNotificationRequest = {
        userId,
        organizationId,
        type,
        category,
        title,
        message,
        priority,
        resourceType,
        resourceId,
        metadata: {
          ...metadata,
          created_by: user.id,
          is_ai_generated: true
        },
        scheduleOptions
      }

      const result = await predictiveNotificationService.generateSmartNotification(
        smartNotificationRequest
      )

      return NextResponse.json({
        predictionId: result.predictionId,
        scheduledTime: result.scheduledTime,
        confidence: result.confidence,
        optimization: result.optimization,
        status: 'scheduled'
      }, { status: 201 })

    } else if (action === 'bulk_optimize') {
      // Optimize timing for multiple notifications
      const { notifications } = body
      
      if (!notifications || !Array.isArray(notifications)) {
        return NextResponse.json(
          { error: 'notifications array required' },
          { status: 400 }
        )
      }

      const optimizations = await predictiveNotificationService.optimizeBulkNotifications(
        notifications
      )

      return NextResponse.json({ optimizations })

    } else if (action === 'record_outcome') {
      // Record actual notification outcome for model learning
      const { predictionId, outcome } = body
      
      if (!predictionId || !outcome) {
        return NextResponse.json(
          { error: 'predictionId and outcome required' },
          { status: 400 }
        )
      }

      await predictiveNotificationService.recordNotificationOutcome(predictionId, outcome)
      
      return NextResponse.json({ status: 'recorded' })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported: create_smart_notification, bulk_optimize, record_outcome' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Predictions POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { predictionId, action, ...updateData } = body

    if (!predictionId) {
      return NextResponse.json({ error: 'predictionId required' }, { status: 400 })
    }

    // Get the prediction to verify ownership
    const { data: prediction } = await supabase
      .from('predicted_notifications')
      .select(`
        *,
        users!inner(id)
      `)
      .eq('prediction_id', predictionId)
      .single()

    if (!prediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })
    }

    // Verify user has permission to update this prediction
    const canUpdate = (prediction as any)?.user_id === user.id || 
      ((prediction as any)?.organization_id && await hasOrgAccess(supabase, user.id, (prediction as any).organization_id))

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (action === 'reschedule') {
      const { newTime } = updateData
      if (!newTime) {
        return NextResponse.json({ error: 'newTime required for reschedule' }, { status: 400 })
      }

      await supabase
        .from('predicted_notifications')
        .update({
          predicted_time: newTime,
          updated_at: new Date().toISOString()
        })
        .eq('prediction_id', predictionId)

      return NextResponse.json({ status: 'rescheduled', newTime })

    } else if (action === 'cancel') {
      await supabase
        .from('predicted_notifications')
        .update({
          is_sent: true,
          is_successful: false,
          actual_outcome: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('prediction_id', predictionId)

      return NextResponse.json({ status: 'cancelled' })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported: reschedule, cancel' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Predictions PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to check organization access
async function hasOrgAccess(supabase: TypedSupabaseClient, userId: string, organizationId: string): Promise<boolean> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  return !!membership
}