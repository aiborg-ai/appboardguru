/**
 * Key Result Progress Update API Endpoint
 * 
 * Handles updating individual key result progress with:
 * - Progress value updates
 * - Confidence scoring
 * - Automatic OKR recalculation
 * - Progress history tracking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

const UpdateKeyResultSchema = z.object({
  current_value: z.number(),
  confidence: z.number().min(1).max(10).optional(),
  notes: z.string().optional()
})

/**
 * PATCH /api/strategic-planning/okrs/[id]/key-results/[krId]
 * Update key result progress
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; krId: string } }
) {
  try {
    const supabase = createServerClient()
    const strategicPlanningService = new StrategicPlanningService(supabase)
    const { id: okrId, krId } = params

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
    const validationResult = UpdateKeyResultSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Verify key result belongs to OKR and user has access
    const { data: keyResult, error: krError } = await supabase
      .from('okr_key_results')
      .select(`
        id,
        okr_id,
        description,
        target_value,
        okr:okrs!okr_id(
          id,
          organization_id,
          owner_id,
          contributors
        )
      `)
      .eq('id', krId)
      .eq('okr_id', okrId)
      .single()

    if (krError || !keyResult) {
      return NextResponse.json(
        { error: 'Key result not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', keyResult.okr.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user can update (owner, contributors, or admin/board)
    const canUpdate = keyResult.okr.owner_id === user.id ||
                     keyResult.okr.contributors.includes(user.id) ||
                     ['admin', 'owner'].includes(membership.role)

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update this key result' },
        { status: 403 }
      )
    }

    // Update key result progress
    const result = await strategicPlanningService.updateKeyResultProgress(
      okrId,
      krId,
      validationResult.data
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
      message: 'Key result progress updated successfully'
    })

  } catch (error) {
    console.error('Key result PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/strategic-planning/okrs/[id]/key-results/[krId]
 * Get key result details with progress history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; krId: string } }
) {
  try {
    const supabase = createServerClient()
    const { id: okrId, krId } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get key result with progress history
    const { data: keyResult, error } = await supabase
      .from('okr_key_results')
      .select(`
        *,
        progress_updates:key_result_progress(
          *,
          updated_by_user:users!updated_by(id, email, full_name)
        ),
        okr:okrs!okr_id(
          id,
          organization_id,
          objective
        )
      `)
      .eq('id', krId)
      .eq('okr_id', okrId)
      .single()

    if (error || !keyResult) {
      return NextResponse.json(
        { error: 'Key result not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', keyResult.okr.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate additional metrics
    const progressHistory = keyResult.progress_updates || []
    const currentProgress = keyResult.target_value !== 0 
      ? Math.min(100, Math.max(0, (keyResult.current_value / keyResult.target_value) * 100))
      : 0

    const trend = calculateTrend(progressHistory)

    return NextResponse.json({
      success: true,
      data: {
        ...keyResult,
        calculated_metrics: {
          progress_percentage: currentProgress,
          trend,
          total_updates: progressHistory.length,
          last_updated: progressHistory.length > 0 
            ? progressHistory[progressHistory.length - 1].date 
            : null
        }
      }
    })

  } catch (error) {
    console.error('Key result GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to calculate trend
function calculateTrend(progressHistory: any[]): 'improving' | 'declining' | 'stable' {
  if (progressHistory.length < 2) return 'stable'

  const recent = progressHistory.slice(-3) // Last 3 updates
  const values = recent.map(p => p.value)
  
  let improvingCount = 0
  let decliningCount = 0

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) improvingCount++
    else if (values[i] < values[i - 1]) decliningCount++
  }

  if (improvingCount > decliningCount) return 'improving'
  if (decliningCount > improvingCount) return 'declining'
  return 'stable'
}