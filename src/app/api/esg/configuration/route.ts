import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ESGService } from '@/lib/services/esg.service'
import type { ESGConfiguration } from '@/types/esg'

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
    const organizationId = url.searchParams.get('organizationId')

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
    const esgService = new ESGService(supabase)

    // Get ESG configuration
    const configResult = await esgService.getConfiguration(orgId)

    if (!configResult.success) {
      return NextResponse.json(
        { error: configResult.error?.message || 'Failed to retrieve ESG configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      configuration: configResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        organizationId: orgId
      }
    })
  } catch (error) {
    console.error('ESG configuration error:', error)
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
    const { organizationId, configuration }: { 
      organizationId: string,
      configuration: Partial<ESGConfiguration>
    } = body

    if (!organizationId || !configuration) {
      return NextResponse.json(
        { error: 'Organization ID and configuration data are required' },
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

    // Update ESG configuration
    const configResult = await esgService.updateConfiguration(orgId, configuration)

    if (!configResult.success) {
      return NextResponse.json(
        { error: configResult.error?.message || 'Failed to update ESG configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      configuration: configResult.data,
      metadata: {
        timestamp: new Date().toISOString(),
        organizationId: orgId,
        updated: true
      }
    })
  } catch (error) {
    console.error('ESG configuration update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}