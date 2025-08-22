import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'
import type { CreateWorkflowRequest, UpdateWorkflowRequest } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase as any)
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    const workflowId = searchParams.get('id')
    
    if (workflowId) {
      // Get specific workflow details
      const result = await complianceEngine.getWorkflowDetails(workflowId)
      return NextResponse.json(result)
    }

    // Get workflows list with filters
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assigned_to')
    const regulationType = searchParams.get('regulation_type')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('notification_workflows')
      .select(`
        *,
        template:compliance_templates(*),
        calendar_entry:compliance_calendar(*),
        assigned_user:assigned_to(id, full_name, email)
      `)
      .eq('organization_id', (orgMember as any)?.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }

    if (regulationType) {
      query = query.eq('template.regulation_type', regulationType)
    }

    const { data: workflows, error, count } = await query

    if (error) {
      console.error('Error fetching workflows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: workflows,
      metadata: {
        total: count || 0,
        limit,
        offset,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Compliance workflows API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase as any)
    const body = await request.json() as CreateWorkflowRequest
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await (supabase as any)
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Check permissions - only admins and owners can create workflows
    if (!['owner', 'admin'].includes((orgMember as any)?.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Workflow name is required' }, { status: 400 })
    }

    // Create workflow
    const result = await complianceEngine.createWorkflow((orgMember as any)?.organization_id, body)

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Compliance workflows POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('id')
    const body = await request.json() as UpdateWorkflowRequest
    
    if (!workflowId) {
      return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can update this workflow
    const { data: workflow } = await (supabase as any)
      .from('notification_workflows')
      .select(`
        *,
        organization:organizations!inner(
          id,
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', workflowId)
      .eq('organization.organization_members.user_id', user.id)
      .single()

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 })
    }

    // Update workflow
    const { error: updateError } = await (supabase as any)
      .from('notification_workflows')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)

    if (updateError) {
      throw updateError
    }

    // Get updated workflow details
    const complianceEngine = new ComplianceEngine(supabase as any)
    const result = await complianceEngine.getWorkflowDetails(workflowId)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Compliance workflows PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}