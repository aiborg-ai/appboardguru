/**
 * Scenario Analysis API Endpoint
 * 
 * Re-runs Monte Carlo simulation and sensitivity analysis for existing scenarios
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

const RunAnalysisSchema = z.object({
  monte_carlo_runs: z.number().int().min(1000).max(50000).optional()
})

/**
 * POST /api/strategic-planning/scenarios/[id]/analyze
 * Re-run analysis for an existing scenario
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const strategicPlanningService = new StrategicPlanningService(supabase)
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body (optional parameters)
    let body = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is allowed
    }

    // Validate input
    const validationResult = RunAnalysisSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Get scenario details
    const { data: scenario, error: scenarioError } = await supabase
      .from('scenario_plans')
      .select(`
        *,
        variables:scenario_variables(*),
        market_assumptions(*),
        internal_assumptions(*)
      `)
      .eq('id', id)
      .single()

    if (scenarioError || !scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    // Check organization access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', scenario.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update monte carlo runs if specified
    if (validationResult.data.monte_carlo_runs) {
      scenario.monte_carlo_runs = validationResult.data.monte_carlo_runs
    }

    // Re-run Monte Carlo analysis
    const result = await strategicPlanningService.runMonteCarloAnalysis(id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Scenario analysis completed successfully'
    })

  } catch (error) {
    console.error('Scenario analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}