import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ESGService } from '@/lib/services/esg.service'

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
    const { organizationId, period }: { 
      organizationId: string,
      period: string 
    } = body

    if (!organizationId || !period) {
      return NextResponse.json(
        { error: 'Organization ID and period are required' },
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
    const esgService = new ESGService(supabase, {
      enableBenchmarking: true
    })

    // Get ESG analytics
    const analyticsResult = await esgService.getAnalytics(orgId, period)

    if (!analyticsResult.success) {
      return NextResponse.json(
        { error: analyticsResult.error?.message || 'Failed to retrieve ESG analytics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      analytics: analyticsResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        period
      }
    })
  } catch (error) {
    console.error('ESG analytics error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}