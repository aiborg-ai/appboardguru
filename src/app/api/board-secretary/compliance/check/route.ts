/**
 * API Route for Board Secretary - Compliance Checking
 * POST /api/board-secretary/compliance/check - Check compliance status and generate alerts
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const CheckComplianceSchema = z.object({
  board_id: z.string().uuid(),
})

/**
 * POST /api/board-secretary/compliance/check
 * Check compliance status and generate alerts for a board
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
    const validation = CheckComplianceSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { board_id } = validation.data

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

    // Check compliance and generate alerts
    const result = await service.checkComplianceAlerts(board_id)

    if (!result.success) {
      console.error('Error checking compliance:', result.error)
      return NextResponse.json({
        error: 'Failed to check compliance',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Compliance check completed. ${result.data.length} alerts generated.`,
      data: {
        alerts_generated: result.data.length,
        alerts: result.data
      }
    })

  } catch (error) {
    console.error('Error in POST /api/board-secretary/compliance/check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}