/**
 * OKRs API Endpoints
 * 
 * Handles CRUD operations for OKRs including:
 * - Create new OKRs with cascading support
 * - List OKR hierarchy with alignment analysis
 * - Update OKR progress and key results
 * - Alignment gap analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

// Validation schemas
const KeyResultSchema = z.object({
  description: z.string().min(10).max(500),
  metric_type: z.enum(['number', 'percentage', 'boolean', 'currency']),
  baseline_value: z.number(),
  target_value: z.number(),
  current_value: z.number().default(0),
  unit: z.string().optional(),
  measurement_frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  automated_tracking: z.boolean().default(false),
  data_source: z.string().optional()
})

const CreateOKRSchema = z.object({
  organization_id: z.string().uuid(),
  parent_okr_id: z.string().uuid().optional(),
  level: z.enum(['board', 'executive', 'department', 'team', 'individual']),
  objective: z.string().min(10).max(500),
  objective_description: z.string().optional(),
  objective_category: z.enum(['growth', 'customer', 'operational', 'learning', 'financial']),
  period_type: z.enum(['annual', 'quarterly', 'monthly']),
  start_date: z.string().pipe(z.coerce.date()),
  end_date: z.string().pipe(z.coerce.date()),
  owner_id: z.string().uuid(),
  contributors: z.array(z.string().uuid()).default([]),
  key_results: z.array(KeyResultSchema).min(1).max(5),
  strategic_initiatives: z.array(z.string().uuid()).default([])
})

const UpdateKeyResultSchema = z.object({
  current_value: z.number(),
  confidence: z.number().min(1).max(10).optional(),
  notes: z.string().optional()
})

/**
 * GET /api/strategic-planning/okrs
 * Get OKR hierarchy with alignment analysis
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const strategicPlanningService = new StrategicPlanningService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Parse period filter
    let period: { start: Date; end: Date } | undefined
    if (searchParams.get('start_date') && searchParams.get('end_date')) {
      period = {
        start: new Date(searchParams.get('start_date')!),
        end: new Date(searchParams.get('end_date')!)
      }
    }

    // Get OKR hierarchy with alignment analysis
    const result = await strategicPlanningService.getOKRHierarchy(organizationId, period)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      metadata: {
        timestamp: new Date().toISOString(),
        total_okrs: result.data.okr_tree?.length || 0,
        period_filter: period
      }
    })

  } catch (error) {
    console.error('OKRs GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/strategic-planning/okrs
 * Create a new OKR
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const strategicPlanningService = new StrategicPlanningService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = CreateOKRSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const okrData = validationResult.data

    // Validate date range
    if (okrData.end_date <= okrData.start_date) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Validate cascading rules
    if (okrData.parent_okr_id && okrData.level === 'board') {
      return NextResponse.json(
        { error: 'Board level OKRs cannot have parent OKRs' },
        { status: 400 }
      )
    }

    // Create OKR
    const result = await strategicPlanningService.createOKR(
      okrData.organization_id,
      okrData
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'OKR created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('OKRs POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}