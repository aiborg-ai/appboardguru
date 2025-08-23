/**
 * Email Processing Logs API Endpoint
 * Provides access to user's email processing history and statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { EmailProcessingRepository } from '../../../../lib/repositories/email-processing.repository'
import { createSupabaseClient } from '../../../../lib/supabase/client'
import { createUserId } from '../../../../lib/utils/branded-type-helpers'

/**
 * GET /api/email/processing-logs
 * Get user's email processing logs with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // Max 100 per page
    const status = searchParams.get('status') // Filter by status
    const offset = (page - 1) * limit

    // Initialize repository
    const emailRepo = new EmailProcessingRepository(supabase)
    
    // Create branded user ID
    const userIdResult = createUserId(user.id)
    if (!userIdResult.success) {
      return NextResponse.json(
        { error: 'Invalid user ID', message: userIdResult.error.message },
        { status: 400 }
      )
    }

    // Get user's processing logs
    const logsResult = await emailRepo.findByUser(userIdResult.data, {
      limit,
      offset
    })

    if (!logsResult.success) {
      console.error('Failed to fetch email processing logs:', logsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch processing logs', message: logsResult.error.message },
        { status: 500 }
      )
    }

    const logs = logsResult.data

    // Filter by status if provided
    let filteredLogs = logs.data
    if (status) {
      filteredLogs = logs.data.filter(log => log.status === status)
    }

    // Get user's processing statistics
    const statsResult = await emailRepo.getUserProcessingStats(userIdResult.data)
    const stats = statsResult.success ? statsResult.data : null

    return NextResponse.json({
      success: true,
      data: {
        logs: filteredLogs.map(log => ({
          id: log.id,
          messageId: log.messageId,
          subject: log.subject,
          status: log.status,
          assetsCreated: log.assetsCreated.length,
          errorMessage: log.errorMessage,
          processingTimeMs: log.processingTimeMs,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString()
        })),
        pagination: {
          page,
          limit,
          total: logs.total,
          totalPages: Math.ceil(logs.total / limit),
          hasNext: page < Math.ceil(logs.total / limit),
          hasPrev: page > 1
        },
        stats,
        filters: {
          status: status || null
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Email processing logs API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch email processing logs'
      },
      { status: 500 }
    )
  }
}