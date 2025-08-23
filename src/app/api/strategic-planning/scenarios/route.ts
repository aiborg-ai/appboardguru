/**
 * Scenario Planning API Endpoints
 * 
 * Handles scenario planning operations including:
 * - Create scenarios with Monte Carlo simulation
 * - List scenarios with results
 * - Run analysis on existing scenarios
 * - Sensitivity analysis and what-if modeling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

// Validation schemas
const ScenarioVariableSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(['market_size', 'growth_rate', 'competition', 'regulation', 'technology']),
  min_value: z.number(),
  max_value: z.number(),
  most_likely_value: z.number(),
  distribution: z.enum(['normal', 'uniform', 'triangular', 'beta']),
  correlation_factors: z.record(z.string(), z.number()).default({})
}).refine(
  (data) => data.min_value <= data.most_likely_value && data.most_likely_value <= data.max_value,
  { message: "Values must be in order: min <= most_likely <= max" }
)

const MarketAssumptionSchema = z.object({
  category: z.string().min(2).max(100),
  description: z.string().min(10),
  probability: z.number().min(0).max(1),
  impact_score: z.number().int().min(1).max(10),
  confidence_level: z.number().int().min(1).max(10)
})

const InternalAssumptionSchema = z.object({
  department: z.string().min(2).max(100),
  description: z.string().min(10),
  feasibility_score: z.number().int().min(1).max(10),
  resource_impact: z.number().int().min(1).max(10)
})

const CreateScenarioSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  scenario_type: z.enum(['optimistic', 'realistic', 'pessimistic', 'stress_test']),
  key_variables: z.array(ScenarioVariableSchema).min(1).max(20),
  market_assumptions: z.array(MarketAssumptionSchema).default([]),
  internal_assumptions: z.array(InternalAssumptionSchema).default([]),
  monte_carlo_runs: z.number().int().min(1000).max(50000).default(10000)
})

const RunAnalysisSchema = z.object({
  monte_carlo_runs: z.number().int().min(1000).max(50000).optional()
})

/**
 * GET /api/strategic-planning/scenarios
 * List scenario plans for an organization
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

    // Get scenarios with related data
    const { data: scenarios, error } = await supabase
      .from('scenario_plans')
      .select(`
        *,
        variables:scenario_variables(*),
        market_assumptions(*),
        internal_assumptions(*),
        creator:users!created_by(id, email, full_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: scenarios || [],
      metadata: {
        timestamp: new Date().toISOString(),
        total_scenarios: scenarios?.length || 0,
        organization_id: organizationId
      }
    })

  } catch (error) {
    console.error('Scenarios GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/strategic-planning/scenarios
 * Create a new scenario plan with Monte Carlo analysis
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
    const validationResult = CreateScenarioSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const scenarioData = validationResult.data

    // Check organization access and permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', scenarioData.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow certain roles to create scenarios
    if (!['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create scenarios' },
        { status: 403 }
      )
    }

    // Validate variable correlations
    for (const variable of scenarioData.key_variables) {
      const correlationSum = Object.values(variable.correlation_factors).reduce((sum, val) => sum + Math.abs(val), 0)
      if (correlationSum > scenarioData.key_variables.length - 1) {
        return NextResponse.json(
          { error: `Variable "${variable.name}" has invalid correlation factors` },
          { status: 400 }
        )
      }
    }

    // Create scenario with Monte Carlo simulation
    const result = await strategicPlanningService.createScenarioPlan(
      scenarioData.organization_id,
      scenarioData
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
      message: 'Scenario created and analyzed successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Scenarios POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}