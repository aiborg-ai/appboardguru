import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { MLInsightsEngine } from '@/lib/activity/ml-insights'
import type { Database } from '@/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userOrgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!userOrgMember?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const timeRange = url.searchParams.get('timeRange') || '30d'
    const insightTypes = url.searchParams.get('types')?.split(',') || ['predictions', 'anomalies', 'recommendations']

    let startDate: Date
    const endDate = new Date()

    switch (timeRange) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const insights = await MLInsightsEngine.generateOrganizationInsights(
      userOrgMember.organization_id,
      {
        timeRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        includePredictions: insightTypes.includes('predictions'),
        includeAnomalies: insightTypes.includes('anomalies'),
        includeRecommendations: insightTypes.includes('recommendations')
      }
    )

    return NextResponse.json({
      success: true,
      data: insights,
      meta: {
        timeRange,
        insightTypes,
        organizationId: userOrgMember.organization_id,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userOrgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', authUser.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!userOrgMember?.organization_id || userOrgMember.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case 'feedback':
        // TODO: Implement MLInsightsEngine.recordInsightFeedback method
        return NextResponse.json({ 
          success: true, 
          message: 'Feedback recording not implemented yet' 
        })

      case 'retrain':
        // TODO: Implement MLInsightsEngine.scheduleModelRetraining method
        return NextResponse.json({ 
          success: true, 
          message: 'Model retraining not implemented yet' 
        })

      case 'configure_anomaly_detection':
        // TODO: Implement MLInsightsEngine.configureAnomalyDetection method
        return NextResponse.json({ 
          success: true, 
          message: 'Anomaly detection configuration not implemented yet' 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing insights request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}