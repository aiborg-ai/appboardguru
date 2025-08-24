import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ESGService } from '@/lib/services/esg.service'
import type { ESGFramework } from '@/types/esg'

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
    const { organizationId, period, framework }: { 
      organizationId: string,
      period: string,
      framework: ESGFramework 
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

    // Generate new scorecard
    const scorecardResult = await esgService.generateScorecard(
      orgId,
      period,
      framework || 'GRI'
    )

    if (!scorecardResult.success) {
      return NextResponse.json(
        { error: scorecardResult.error?.message || 'Failed to generate ESG scorecard' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      scorecard: scorecardResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        framework: framework || 'GRI',
        period,
        generated: true
      }
    })
  } catch (error) {
    console.error('ESG scorecard generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}