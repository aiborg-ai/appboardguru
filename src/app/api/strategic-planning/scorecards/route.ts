/**
 * Performance Scorecards API Endpoints
 * 
 * Handles performance scorecard operations including:
 * - Create scorecards with perspectives and metrics
 * - List scorecards with access control
 * - Get real-time scorecard data
 * - Update scorecard configurations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

// Validation schemas
const ScorecardMetricSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  target_value: z.number(),
  baseline_value: z.number().default(0),
  unit: z.string().optional(),
  format: z.enum(['number', 'percentage', 'currency', 'ratio']).default('number'),
  direction: z.enum(['higher_is_better', 'lower_is_better', 'target_is_best']).default('higher_is_better'),
  green_threshold: z.number(),
  yellow_threshold: z.number(),
  red_threshold: z.number(),
  data_source: z.string().optional(),
  calculation_method: z.string().optional()
})

const ScorecardPerspectiveSchema = z.object({
  name: z.string().min(2).max(100),
  weight: z.number().min(0.01).max(1),
  color: z.string().default('#3b82f6'),
  icon: z.string().default('target'),
  metrics: z.array(ScorecardMetricSchema).min(1).max(20)
})

const AccessPermissionSchema = z.object({
  user_id: z.string().uuid(),
  permission_level: z.enum(['view', 'edit', 'admin']),
  perspective_restrictions: z.array(z.string()).optional()
})

const CreateScorecardSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(3).max(200),
  scorecard_type: z.enum(['balanced', 'custom', 'kpi_dashboard', 'executive']),
  perspectives: z.array(ScorecardPerspectiveSchema).min(1).max(10),
  refresh_frequency: z.enum(['real_time', 'daily', 'weekly', 'monthly']).default('daily'),
  visibility: z.enum(['board', 'executives', 'all_managers', 'organization']).default('executives'),
  access_permissions: z.array(AccessPermissionSchema).default([])
}).refine(
  (data) => {
    // Ensure perspective weights sum to approximately 1
    const totalWeight = data.perspectives.reduce((sum, p) => sum + p.weight, 0)
    return Math.abs(totalWeight - 1) < 0.01
  },
  { message: "Perspective weights must sum to 1.0" }
)

/**
 * GET /api/strategic-planning/scorecards
 * List performance scorecards for an organization
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

    // Get scorecards with visibility filtering
    let query = supabase
      .from('performance_scorecards')
      .select(`
        *,
        perspectives:scorecard_perspectives(
          *,
          metrics:scorecard_metrics(*)
        ),
        access_permissions:scorecard_access_permissions(
          user_id,
          permission_level,
          perspective_restrictions
        ),
        creator:users!created_by(id, email, full_name)
      `)
      .eq('organization_id', organizationId)

    // Apply visibility filters based on user role
    if (membership.role === 'viewer') {
      query = query.or(`visibility.eq.organization,access_permissions.user_id.eq.${user.id}`)
    } else if (membership.role === 'member') {
      query = query.or(`visibility.in.(organization,all_managers),access_permissions.user_id.eq.${user.id}`)
    }
    // Admins, owners, and board members can see all scorecards

    const { data: scorecards, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Filter out restricted perspectives for users
    const filteredScorecards = scorecards?.map(scorecard => {
      const userPermission = scorecard.access_permissions.find((p: any) => p.user_id === user.id)
      
      if (userPermission?.perspective_restrictions?.length > 0) {
        return {
          ...scorecard,
          perspectives: scorecard.perspectives.filter((p: any) => 
            !userPermission.perspective_restrictions.includes(p.name)
          )
        }
      }
      
      return scorecard
    })

    return NextResponse.json({
      success: true,
      data: filteredScorecards || [],
      metadata: {
        timestamp: new Date().toISOString(),
        total_scorecards: filteredScorecards?.length || 0,
        user_role: membership.role
      }
    })

  } catch (error) {
    console.error('Scorecards GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/strategic-planning/scorecards
 * Create a new performance scorecard
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
    const validationResult = CreateScorecardSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const scorecardData = validationResult.data

    // Check organization access and permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', scorecardData.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow certain roles to create scorecards
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create scorecards' },
        { status: 403 }
      )
    }

    // Validate metric thresholds
    for (const perspective of scorecardData.perspectives) {
      for (const metric of perspective.metrics) {
        if (metric.direction === 'higher_is_better') {
          if (!(metric.red_threshold < metric.yellow_threshold && metric.yellow_threshold < metric.green_threshold)) {
            return NextResponse.json(
              { error: `Invalid thresholds for metric "${metric.name}": red < yellow < green required for higher_is_better` },
              { status: 400 }
            )
          }
        } else if (metric.direction === 'lower_is_better') {
          if (!(metric.green_threshold < metric.yellow_threshold && metric.yellow_threshold < metric.red_threshold)) {
            return NextResponse.json(
              { error: `Invalid thresholds for metric "${metric.name}": green < yellow < red required for lower_is_better` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Create scorecard
    const result = await strategicPlanningService.createPerformanceScorecard(
      scorecardData.organization_id,
      scorecardData
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
      message: 'Performance scorecard created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Scorecards POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}