/**
 * Anomaly Detection API
 * Handles detection and management of behavioral anomalies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { patternRecognitionEngine } from '@/lib/services/pattern-recognition'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status') || 'new'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Build query for anomaly detections
    let query = supabase
      .from('anomaly_detections')
      .select(`
        *,
        users!anomaly_detections_user_id_fkey(full_name, email),
        investigated_user:users!anomaly_detections_investigated_by_fkey(full_name, email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    if (status) {
      query = query.eq('investigation_status', status)
    }

    const { data: anomalies, error } = await query

    if (error) {
      console.error('Error fetching anomalies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch anomalies' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('anomaly_detections')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    if (userId) {
      countQuery = countQuery.eq('user_id', userId)
    }

    if (severity) {
      countQuery = countQuery.eq('severity', severity)
    }

    if (status) {
      countQuery = countQuery.eq('investigation_status', status)
    }

    const { count } = await countQuery

    // Get summary statistics
    const { data: summaryData } = await supabase
      .from('anomaly_detections')
      .select('severity, investigation_status')
      .eq('organization_id', organizationId)

    const summary = {
      total: count || 0,
      bySeverity: summaryData?.reduce((acc, item) => {
        acc[item.severity] = (acc[item.severity] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {},
      byStatus: summaryData?.reduce((acc, item) => {
        acc[item.investigation_status] = (acc[item.investigation_status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}
    }

    return NextResponse.json({
      anomalies: anomalies || [],
      summary,
      pagination: {
        offset,
        limit,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    })

  } catch (error) {
    console.error('Anomalies GET API error:', error)
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
      organizationId,
      userId,
      lookbackDays = 14,
      sensitivity = 'medium'
    } = body

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

    if (action === 'detect') {
      // Run anomaly detection
      const anomalies = await patternRecognitionEngine.detectAnomalies(organizationId, {
        userId,
        lookbackDays,
        sensitivity
      })

      return NextResponse.json({
        anomalies,
        detectionParams: {
          organizationId,
          userId,
          lookbackDays,
          sensitivity,
          detectedAt: new Date().toISOString()
        }
      })

    } else if (action === 'investigate') {
      // Start investigation of an anomaly
      const { anomalyId, notes } = body

      if (!anomalyId) {
        return NextResponse.json({ error: 'anomalyId required' }, { status: 400 })
      }

      const { data: updatedAnomaly, error } = await supabase
        .from('anomaly_detections')
        .update({
          investigation_status: 'in_progress',
          investigated_by: user.id,
          investigated_at: new Date().toISOString(),
          resolution_notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', anomalyId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('Error updating anomaly:', error)
        return NextResponse.json(
          { error: 'Failed to update anomaly investigation status' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        status: 'investigation_started',
        anomaly: updatedAnomaly 
      })

    } else if (action === 'resolve') {
      // Resolve an anomaly
      const { anomalyId, resolution, notes } = body

      if (!anomalyId || !resolution) {
        return NextResponse.json({ 
          error: 'anomalyId and resolution required' 
        }, { status: 400 })
      }

      const validResolutions = ['resolved', 'false_positive', 'monitoring', 'escalated']
      if (!validResolutions.includes(resolution)) {
        return NextResponse.json({
          error: `Invalid resolution. Must be one of: ${validResolutions.join(', ')}`
        }, { status: 400 })
      }

      const { data: updatedAnomaly, error } = await supabase
        .from('anomaly_detections')
        .update({
          investigation_status: resolution,
          investigated_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || null,
          is_resolved: resolution === 'resolved' || resolution === 'false_positive',
          updated_at: new Date().toISOString()
        })
        .eq('id', anomalyId)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) {
        console.error('Error resolving anomaly:', error)
        return NextResponse.json(
          { error: 'Failed to resolve anomaly' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        status: 'resolved',
        anomaly: updatedAnomaly 
      })

    } else if (action === 'bulk_resolve') {
      // Bulk resolve multiple anomalies
      const { anomalyIds, resolution, notes } = body

      if (!anomalyIds || !Array.isArray(anomalyIds) || !resolution) {
        return NextResponse.json({
          error: 'anomalyIds array and resolution required'
        }, { status: 400 })
      }

      const { data: updatedAnomalies, error } = await supabase
        .from('anomaly_detections')
        .update({
          investigation_status: resolution,
          investigated_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || null,
          is_resolved: resolution === 'resolved' || resolution === 'false_positive',
          updated_at: new Date().toISOString()
        })
        .in('id', anomalyIds)
        .eq('organization_id', organizationId)
        .select()

      if (error) {
        console.error('Error bulk resolving anomalies:', error)
        return NextResponse.json(
          { error: 'Failed to bulk resolve anomalies' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        status: 'bulk_resolved',
        count: updatedAnomalies?.length || 0,
        anomalies: updatedAnomalies 
      })

    } else {
      return NextResponse.json({
        error: 'Invalid action. Supported: detect, investigate, resolve, bulk_resolve'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Anomalies POST API error:', error)
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

    const { anomalyId, organizationId, ...updates } = body

    if (!anomalyId || !organizationId) {
      return NextResponse.json({ error: 'anomalyId and organizationId required' }, { status: 400 })
    }

    // Verify user has admin access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Update the anomaly
    const { data: updatedAnomaly, error } = await supabase
      .from('anomaly_detections')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', anomalyId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating anomaly:', error)
      return NextResponse.json(
        { error: 'Failed to update anomaly' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      status: 'updated',
      anomaly: updatedAnomaly 
    })

  } catch (error) {
    console.error('Anomalies PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const anomalyId = searchParams.get('anomalyId')
    const organizationId = searchParams.get('organizationId')

    if (!anomalyId || !organizationId) {
      return NextResponse.json({ error: 'anomalyId and organizationId required' }, { status: 400 })
    }

    // Verify user has admin access to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete the anomaly
    const { error } = await supabase
      .from('anomaly_detections')
      .delete()
      .eq('id', anomalyId)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting anomaly:', error)
      return NextResponse.json(
        { error: 'Failed to delete anomaly' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'deleted', anomalyId })

  } catch (error) {
    console.error('Anomalies DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}