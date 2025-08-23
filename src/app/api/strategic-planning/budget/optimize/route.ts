/**
 * Budget Optimization API Endpoint
 * 
 * Handles budget allocation optimization including:
 * - Portfolio optimization algorithms
 * - Constraint-based allocation
 * - Risk-adjusted budget distribution
 * - ROI maximization strategies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

// Validation schemas
const BudgetConstraintSchema = z.object({
  type: z.enum(['min_allocation', 'max_allocation', 'fixed_allocation', 'ratio_constraint']),
  initiative_id: z.string().uuid().optional(),
  category: z.string().optional(),
  value: z.number().min(0),
  description: z.string()
})

const OptimizeBudgetSchema = z.object({
  organization_id: z.string().uuid(),
  total_budget: z.number().min(1),
  optimization_method: z.enum(['maximize_roi', 'minimize_risk', 'balanced', 'strategic_priority']).default('balanced'),
  risk_tolerance: z.number().min(1).max(10).default(5),
  constraints: z.array(BudgetConstraintSchema).default([]),
  time_horizon_months: z.number().int().min(1).max(60).default(12),
  include_existing_commitments: z.boolean().default(true)
})

/**
 * POST /api/strategic-planning/budget/optimize
 * Optimize budget allocation across strategic initiatives
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
    const validationResult = OptimizeBudgetSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const optimizationData = validationResult.data

    // Check organization access and permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', optimizationData.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow financial decision makers to run optimization
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to run budget optimization' },
        { status: 403 }
      )
    }

    // Get active strategic initiatives for the organization
    const { data: initiatives, error: initiativesError } = await supabase
      .from('strategic_initiatives')
      .select(`
        id,
        name,
        category,
        priority,
        budget_allocated,
        budget_used,
        progress_percentage,
        health_score,
        risk_score,
        status,
        start_date,
        end_date,
        financial_metrics:initiative_financial_metrics(*)
      `)
      .eq('organization_id', optimizationData.organization_id)
      .in('status', ['planning', 'active'])

    if (initiativesError) {
      throw initiativesError
    }

    if (!initiatives || initiatives.length === 0) {
      return NextResponse.json(
        { error: 'No active strategic initiatives found for optimization' },
        { status: 400 }
      )
    }

    // Validate constraints
    for (const constraint of optimizationData.constraints) {
      if (constraint.initiative_id) {
        const initiativeExists = initiatives.some(i => i.id === constraint.initiative_id)
        if (!initiativeExists) {
          return NextResponse.json(
            { error: `Initiative not found: ${constraint.initiative_id}` },
            { status: 400 }
          )
        }
      }
      
      if (constraint.type === 'fixed_allocation' && constraint.value > optimizationData.total_budget) {
        return NextResponse.json(
          { error: 'Fixed allocation constraint exceeds total budget' },
          { status: 400 }
        )
      }
    }

    // Check if total budget is reasonable
    const currentTotalAllocated = initiatives.reduce((sum, i) => sum + (i.budget_allocated || 0), 0)
    if (optimizationData.total_budget < currentTotalAllocated * 0.1) {
      return NextResponse.json(
        { error: 'Total budget too low compared to current allocations' },
        { status: 400 }
      )
    }

    // Run budget optimization
    const result = await strategicPlanningService.optimizeBudgetAllocation(
      optimizationData.organization_id,
      optimizationData.total_budget,
      optimizationData.constraints
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    // Calculate additional insights
    const optimization = result.data
    const totalAllocated = optimization.allocations.reduce((sum, a) => sum + a.allocated_amount, 0)
    const averageROI = optimization.allocations.reduce((sum, a) => sum + a.expected_roi, 0) / optimization.allocations.length
    const averageRisk = optimization.allocations.reduce((sum, a) => sum + a.risk_score, 0) / optimization.allocations.length

    // Save optimization result
    const { error: saveError } = await supabase
      .from('budget_optimizations')
      .insert({
        organization_id: optimizationData.organization_id,
        total_budget: optimizationData.total_budget,
        optimization_method: optimizationData.optimization_method,
        optimization_results: optimization,
        optimization_score: optimization.optimization_score,
        created_by: user.id
      })

    if (saveError) {
      console.error('Failed to save optimization result:', saveError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      data: {
        ...optimization,
        insights: {
          total_allocated: totalAllocated,
          remaining_budget: optimizationData.total_budget - totalAllocated,
          average_expected_roi: averageROI,
          average_risk_score: averageRisk,
          allocation_efficiency: (totalAllocated / optimizationData.total_budget) * 100,
          optimization_method: optimizationData.optimization_method,
          constraint_count: optimizationData.constraints.length
        }
      },
      message: 'Budget optimization completed successfully'
    })

  } catch (error) {
    console.error('Budget optimization error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/strategic-planning/budget/optimize
 * Get recent budget optimization results
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Check organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get recent optimization results
    const { data: optimizations, error } = await supabase
      .from('budget_optimizations')
      .select(`
        *,
        creator:users!created_by(id, email, full_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: optimizations || [],
      metadata: {
        timestamp: new Date().toISOString(),
        total_results: optimizations?.length || 0,
        organization_id: organizationId
      }
    })

  } catch (error) {
    console.error('Budget optimization GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}