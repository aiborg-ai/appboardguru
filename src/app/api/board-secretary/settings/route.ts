/**
 * API Routes for Board Secretary - Settings Management
 * GET /api/board-secretary/settings - Get board secretary settings
 * PUT /api/board-secretary/settings - Update board secretary settings
 */

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { AIBoardSecretaryService } from '@/lib/services/ai-board-secretary.service'
import { z } from 'zod'

const UpdateSettingsSchema = z.object({
  board_id: z.string().uuid(),
  ai_transcription_enabled: z.boolean().optional(),
  auto_agenda_generation: z.boolean().optional(),
  auto_minutes_generation: z.boolean().optional(),
  auto_action_extraction: z.boolean().optional(),
  compliance_monitoring_enabled: z.boolean().optional(),
  notification_preferences: z.object({
    email_alerts: z.boolean().default(true),
    slack_notifications: z.boolean().default(false),
    sms_urgent_only: z.boolean().default(false),
    digest_frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  }).optional(),
  ai_model_preferences: z.object({
    transcription_model: z.string().default('openai/whisper-large-v3'),
    text_model: z.string().default('anthropic/claude-3.5-sonnet'),
    temperature: z.number().min(0).max(2).default(0.1),
    max_tokens: z.number().min(100).max(8000).default(4000),
  }).optional(),
  language_preference: z.string().min(2).max(10).optional(),
  timezone: z.string().optional(),
  secretary_signature: z.string().optional(),
  document_templates: z.object({
    agenda_template: z.string().optional(),
    minutes_template: z.string().optional(),
    resolution_template: z.string().optional(),
    notice_template: z.string().optional(),
  }).optional(),
})

const GetSettingsSchema = z.object({
  board_id: z.string().uuid(),
})

/**
 * GET /api/board-secretary/settings
 * Get board secretary settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const service = new AIBoardSecretaryService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      board_id: searchParams.get('board_id'),
    }

    const validation = GetSettingsSchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
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

    // Get secretary settings
    const result = await service.getSecretarySettings(board_id)

    if (!result.success) {
      console.error('Error getting secretary settings:', result.error)
      return NextResponse.json({
        error: 'Failed to get secretary settings',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('Error in GET /api/board-secretary/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/board-secretary/settings
 * Update board secretary settings
 */
export async function PUT(request: NextRequest) {
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
    const validation = UpdateSettingsSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { board_id, ...settings } = validation.data

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

    // Update secretary settings
    const result = await service.updateSecretarySettings(board_id, settings)

    if (!result.success) {
      console.error('Error updating secretary settings:', result.error)
      return NextResponse.json({
        error: 'Failed to update secretary settings',
        details: result.error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Secretary settings updated successfully',
      data: result.data
    })

  } catch (error) {
    console.error('Error in PUT /api/board-secretary/settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}