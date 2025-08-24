import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ESGService } from '@/lib/services/esg.service'
import type { ESGCategory, ESGFramework } from '@/types/esg'

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
    const { organizationId, category, framework }: { 
      organizationId: string,
      category?: ESGCategory,
      framework?: ESGFramework 
    } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
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

    // Get ESG benchmarks
    const benchmarksResult = await esgService.getBenchmarks(orgId, category, framework)

    if (!benchmarksResult.success) {
      return NextResponse.json(
        { error: benchmarksResult.error?.message || 'Failed to retrieve ESG benchmarks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      benchmarks: benchmarksResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        category,
        framework,
        count: benchmarksResult.data.length
      }
    })
  } catch (error) {
    console.error('ESG benchmarks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}