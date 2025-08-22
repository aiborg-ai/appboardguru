import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ComplianceEngine } from '@/lib/services/compliance-engine'
import type { CreateCalendarEntryRequest, ComplianceStatus } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase)
    const { searchParams } = new URL(request.url)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Parse query parameters
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const statusParam = searchParams.get('status')
    const regulationType = searchParams.get('regulation_type')
    const includeRecurring = searchParams.get('include_recurring') === 'true'

    const status: ComplianceStatus[] | undefined = statusParam 
      ? statusParam.split(',') as ComplianceStatus[]
      : undefined

    // Get calendar entries
    const filterOptions: {
      startDate?: string
      endDate?: string
      status?: ("active" | "in_progress" | "scheduled" | "completed" | "cancelled" | "postponed" | "overdue")[]
      regulationType?: string
      includeRecurring?: boolean
    } = { includeRecurring }
    
    if (startDate) filterOptions.startDate = startDate
    if (endDate) filterOptions.endDate = endDate
    if (status) filterOptions.status = status
    if (regulationType) filterOptions.regulationType = regulationType
    
    const result = await complianceEngine.getCalendarEntries(orgMember.organization_id, filterOptions)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Compliance calendar GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const complianceEngine = new ComplianceEngine(supabase)
    const body = await request.json() as CreateCalendarEntryRequest
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and role
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: 'No active organization membership found' }, { status: 403 })
    }

    // Check permissions - only admins and owners can create calendar entries
    if (!['owner', 'admin'].includes(orgMember.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Validate required fields
    if (!body.title || !body.regulation_type || !body.due_date) {
      return NextResponse.json({ 
        error: 'Title, regulation type, and due date are required' 
      }, { status: 400 })
    }

    // Validate due date format
    const dueDate = new Date(body.due_date)
    if (isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'Invalid due date format' }, { status: 400 })
    }

    // Create calendar entry
    const result = await complianceEngine.createCalendarEntry(orgMember.organization_id, body)

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
    console.error('Compliance calendar POST API error:', error)
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
    const entryId = searchParams.get('id')
    const body = await request.json()
    
    if (!entryId) {
      return NextResponse.json({ error: 'Calendar entry ID is required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can update this calendar entry
    const { data: entry } = await supabase
      .from('compliance_calendar')
      .select(`
        *,
        organization:organizations!inner(
          id,
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', entryId)
      .eq('organization.organization_members.user_id', user.id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Calendar entry not found or access denied' }, { status: 404 })
    }

    // Check permissions
    const userRole = entry.organization.organization_members[0]?.role
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update calendar entry
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
      recurrence_pattern: body.recurrence_pattern ? 
        JSON.stringify(body.recurrence_pattern) : undefined,
      metadata: body.metadata ? 
        JSON.stringify(body.metadata) : undefined
    }

    const { data: updatedEntry, error: updateError } = await supabase
      .from('compliance_calendar')
      .update(updateData)
      .eq('id', entryId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      data: updatedEntry,
      message: 'Calendar entry updated successfully'
    })

  } catch (error) {
    console.error('Compliance calendar PUT API error:', error)
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
    const entryId = searchParams.get('id')
    
    if (!entryId) {
      return NextResponse.json({ error: 'Calendar entry ID is required' }, { status: 400 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can delete this calendar entry
    const { data: entry } = await supabase
      .from('compliance_calendar')
      .select(`
        *,
        organization:organizations!inner(
          id,
          organization_members!inner(user_id, role)
        )
      `)
      .eq('id', entryId)
      .eq('organization.organization_members.user_id', user.id)
      .single()

    if (!entry) {
      return NextResponse.json({ error: 'Calendar entry not found or access denied' }, { status: 404 })
    }

    // Check permissions
    const userRole = entry.organization.organization_members[0]?.role
    if (!['owner', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Soft delete by updating status to cancelled
    const { error: deleteError } = await supabase
      .from('compliance_calendar')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', entryId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar entry cancelled successfully'
    })

  } catch (error) {
    console.error('Compliance calendar DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}