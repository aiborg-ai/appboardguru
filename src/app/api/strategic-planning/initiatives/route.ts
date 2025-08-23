/**
 * Strategic Initiatives API Endpoints
 * 
 * Handles CRUD operations for strategic initiatives including:
 * - Create new initiatives
 * - List initiatives with filtering and analytics
 * - Update initiative progress
 * - Dependency management
 * - Budget tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

// Validation schemas
const CreateInitiativeSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.enum(['growth', 'operational', 'innovation', 'risk', 'sustainability']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  start_date: z.string().pipe(z.coerce.date()),
  end_date: z.string().pipe(z.coerce.date()),
  budget_allocated: z.number().min(0),
  owner_id: z.string().uuid()
})

const UpdateProgressSchema = z.object({
  progress_percentage: z.number().min(0).max(100).optional(),
  health_score: z.number().min(1).max(10).optional(),
  risk_score: z.number().min(1).max(10).optional(),
  budget_used: z.number().min(0).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  notes: z.string().optional()
})

const InitiativeFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  date_range: z.object({
    start: z.string().pipe(z.coerce.date()),
    end: z.string().pipe(z.coerce.date())
  }).optional(),
  owner_ids: z.array(z.string().uuid()).optional(),
  budget_range: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).optional()
})

/**
 * GET /api/strategic-planning/initiatives
 * List strategic initiatives with optional filtering and analytics
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

    // Parse filters
    const filters: any = {}
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',')
    }
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!.split(',')
    }
    if (searchParams.get('priority')) {
      filters.priority = searchParams.get('priority')!.split(',')
    }
    if (searchParams.get('start_date') && searchParams.get('end_date')) {
      filters.date_range = {
        start: new Date(searchParams.get('start_date')!),
        end: new Date(searchParams.get('end_date')!)
      }
    }

    // Validate filters
    const validationResult = InitiativeFiltersSchema.safeParse(filters)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Get initiatives with analytics
    const result = await strategicPlanningService.getStrategicInitiatives(
      organizationId,
      validationResult.data
    )

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
        total_initiatives: result.data.initiatives.length,
        query_filters: validationResult.data
      }
    })

  } catch (error) {
    console.error('Strategic initiatives GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/strategic-planning/initiatives
 * Create a new strategic initiative
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
    const validationResult = CreateInitiativeSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const initiativeData = validationResult.data

    // Validate date range
    if (initiativeData.end_date <= initiativeData.start_date) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    // Create initiative
    const result = await strategicPlanningService.createStrategicInitiative(
      initiativeData.organization_id,
      initiativeData
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
      message: 'Strategic initiative created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Strategic initiatives POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}