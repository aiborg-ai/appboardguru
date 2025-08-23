/**
 * API Routes for Board Secretary - Compliance Management
 * GET /api/board-secretary/compliance - Get compliance requirements and alerts
 * POST /api/board-secretary/compliance - Create compliance requirement
 * POST /api/board-secretary/compliance/check - Check compliance and generate alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const CreateComplianceSchema = z.object({
  board_id: z.string().uuid(),
  requirement_name: z.string().min(1).max(255),
  requirement_type: z.enum(['filing', 'meeting', 'reporting', 'governance', 'regulatory']),
  description: z.string().optional(),
  regulatory_body: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'one_time']).optional(),
  next_due_date: z.string().datetime().optional(),
  days_notice_required: z.number().int().min(1).default(30),
  responsible_party: z.string().uuid().optional(),
  is_mandatory: z.boolean().default(true),
})

const GetComplianceSchema = z.object({
  board_id: z.string().uuid(),
  requirement_type: z.string().optional(),
  status: z.string().optional(),
  overdue_only: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

/**
 * GET /api/board-secretary/compliance
 * Get compliance requirements and alerts with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      board_id: searchParams.get('board_id'),
      requirement_type: searchParams.get('requirement_type') || undefined,
      status: searchParams.get('status') || undefined,
      overdue_only: searchParams.get('overdue_only') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    }

    const validation = GetComplianceSchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { board_id, requirement_type, status, overdue_only, page, limit } = validation.data

    // Verify user has access to this board
    const { data: boardAccess, error: accessError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (accessError || !boardAccess) {
      return NextResponse.json({ error: 'Access denied to board' }, { status: 403 })
    }

    // Build query for compliance requirements
    let requirementsQuery = supabase
      .from('compliance_requirements')
      .select('*', { count: 'exact' })
      .eq('board_id', board_id)

    if (requirement_type) {
      requirementsQuery = requirementsQuery.eq('requirement_type', requirement_type)
    }

    if (status) {
      requirementsQuery = requirementsQuery.eq('completion_status', status)
    }

    if (overdue_only) {
      const today = new Date().toISOString().split('T')[0]
      requirementsQuery = requirementsQuery
        .lt('next_due_date', today)
        .neq('completion_status', 'completed')
    }

    const { data: requirements, error: reqError, count } = await requirementsQuery
      .order('next_due_date', { ascending: true })
      .range((page - 1) * limit, page * limit - 1)

    if (reqError) throw reqError

    // Get recent alerts for the board
    const { data: alerts, error: alertError } = await supabase
      .from('compliance_alerts')
      .select(`
        *,
        compliance_requirements (
          requirement_name,
          board_id
        )
      `)
      .eq('compliance_requirements.board_id', board_id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (alertError) throw alertError

    return NextResponse.json({
      success: true,
      data: {
        requirements: requirements || [],
        alerts: alerts || []
      },
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: page < Math.ceil((count || 0) / limit),
        has_prev: page > 1
      }
    })

  } catch (error) {
    console.error('Error in GET /api/board-secretary/compliance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/board-secretary/compliance
 * Create a new compliance requirement
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const service = new AIBoardSecretaryService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = CreateComplianceSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { board_id } = validation.data

    // Verify user has admin access to this board
    const { data: boardMember, error: accessError } = await supabase
      .from('board_members')
      .select('role')
      .eq('board_id', board_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['chairman', 'secretary', 'admin'])
      .single()

    if (accessError || !boardMember) {
      return NextResponse.json({
        error: 'Access denied - admin role required'
      }, { status: 403 })
    }

    // Create compliance requirement
    const result = await service.createComplianceRequirement(validation.data)

    if (!result.success) {
      console.error('Error creating compliance requirement:', result.error)
      return NextResponse.json({
        error: 'Failed to create compliance requirement',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Compliance requirement created successfully',
      data: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/compliance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}