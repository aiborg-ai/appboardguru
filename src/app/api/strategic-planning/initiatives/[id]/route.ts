/**
 * Individual Strategic Initiative API Endpoints
 * 
 * Handles operations for specific strategic initiatives:
 * - Get initiative details
 * - Update initiative progress
 * - Delete initiative
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../../../lib/supabase-server'
import { StrategicPlanningService } from '../../../../../lib/services/strategic-planning.service'
import { z } from 'zod'

const UpdateProgressSchema = z.object({
  progress_percentage: z.number().min(0).max(100).optional(),
  health_score: z.number().min(1).max(10).optional(),
  risk_score: z.number().min(1).max(10).optional(),
  budget_used: z.number().min(0).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  notes: z.string().optional()
})

/**
 * GET /api/strategic-planning/initiatives/[id]
 * Get detailed information about a specific strategic initiative
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get initiative details
    const { data: initiative, error } = await supabase
      .from('strategic_initiatives')
      .select(`
        *,
        milestones:initiative_milestones(*),
        resources:initiative_resources(*),
        dependencies:initiative_dependencies(
          *,
          depends_on_initiative:strategic_initiatives!depends_on_initiative_id(id, name, status)
        ),
        financial_metrics:initiative_financial_metrics(*),
        outcomes:initiative_outcomes(*),
        owner:users!owner_id(id, email, full_name),
        creator:users!created_by(id, email, full_name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Strategic initiative not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Check access permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', initiative.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: initiative
    })

  } catch (error) {
    console.error('Strategic initiative GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/strategic-planning/initiatives/[id]
 * Update strategic initiative progress and details
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json()

    // Validate input
    const validationResult = UpdateProgressSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    // Update initiative progress
    const result = await strategicPlanningService.updateInitiativeProgress(
      id,
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
      message: 'Initiative progress updated successfully'
    })

  } catch (error) {
    console.error('Strategic initiative PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/strategic-planning/initiatives/[id]
 * Delete a strategic initiative (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { id } = params

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if initiative exists and user has permission
    const { data: initiative, error: fetchError } = await supabase
      .from('strategic_initiatives')
      .select('id, organization_id, owner_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !initiative) {
      return NextResponse.json(
        { error: 'Strategic initiative not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', initiative.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.status !== 'active') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Only allow owners, admins, or board members to delete
    const canDelete = membership.role === 'owner' || 
                     membership.role === 'admin' || 
                     initiative.owner_id === user.id

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete this initiative' },
        { status: 403 }
      )
    }

    // Soft delete by updating status
    const { error: updateError } = await supabase
      .from('strategic_initiatives')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: 'Strategic initiative deleted successfully'
    })

  } catch (error) {
    console.error('Strategic initiative DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}