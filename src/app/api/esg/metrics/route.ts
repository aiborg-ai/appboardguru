import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ESGService } from '@/lib/services/esg.service'
import type { ESGFramework, ESGCategory } from '@/types/esg'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const framework = url.searchParams.get('framework') as ESGFramework
    const category = url.searchParams.get('category') as ESGCategory

    // Initialize ESG service
    const esgService = new ESGService(supabase)

    // Get available metrics
    const metricsResult = await esgService.getAvailableMetrics(framework, category)

    if (!metricsResult.success) {
      return NextResponse.json(
        { error: metricsResult.error?.message || 'Failed to retrieve ESG metrics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      metrics: metricsResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        framework,
        category,
        count: metricsResult.data.length
      }
    })
  } catch (error) {
    console.error('ESG metrics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      organizationId, 
      metricId, 
      value, 
      period, 
      dataSource, 
      notes 
    }: { 
      organizationId: string,
      metricId: string,
      value: number,
      period: string,
      dataSource: string,
      notes?: string
    } = body

    if (!organizationId || !metricId || value === undefined || !period || !dataSource) {
      return NextResponse.json(
        { error: 'Organization ID, metric ID, value, period, and data source are required' },
        { status: 400 }
      )
    }

    // Get user's primary organization if not specified
    let orgId = organizationId
    if (!orgId) {
      const { data: userOrg } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .eq('status', 'active')
        .single()
      
      orgId = (userOrg as any)?.organization_id || 'default'
    }

    // Initialize ESG service
    const esgService = new ESGService(supabase)

    // Update metric data
    const dataPointResult = await esgService.updateMetricData(
      orgId,
      metricId,
      value,
      period,
      dataSource,
      user.id,
      notes
    )

    if (!dataPointResult.success) {
      return NextResponse.json(
        { error: dataPointResult.error?.message || 'Failed to update metric data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      dataPoint: dataPointResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        metricId,
        period
      }
    })
  } catch (error) {
    console.error('ESG metric update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}