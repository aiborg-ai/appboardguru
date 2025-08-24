/**
 * AI Recommendation Engine API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiIntegrationOrchestratorService } from '@/lib/services/ai-integration-orchestrator.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...requestData } = body

    // Validate required fields
    if (!requestData.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: organizationId' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'generate':
        // Generate new recommendations
        result = await aiIntegrationOrchestratorService.processAIRequest(
          requestData.organizationId,
          'recommendation_engine',
          {
            organizationId: requestData.organizationId,
            userId: requestData.userId,
            context: requestData.context,
            filters: requestData.filters,
            limit: requestData.limit || 10,
            urgentOnly: requestData.urgentOnly || false
          },
          { 
            priority: 1,
            fallbackEnabled: true,
            timeout: 30000
          }
        )
        break

      case 'feedback':
        // Process user feedback
        if (!requestData.recommendationId || !requestData.userId || !requestData.feedback) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields for feedback: recommendationId, userId, feedback' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          requestData.organizationId,
          'recommendation_engine',
          {
            action: 'process_feedback',
            recommendationId: requestData.recommendationId,
            userId: requestData.userId,
            feedback: requestData.feedback
          },
          { 
            priority: 2,
            fallbackEnabled: false,
            timeout: 15000
          }
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Recommendations API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'dashboard'

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'dashboard':
        // Get dashboard data with recommendations
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'recommendation_engine',
          {
            action: 'get_dashboard',
            organizationId,
            userId
          },
          { 
            priority: 1,
            fallbackEnabled: true,
            timeout: 20000
          }
        )
        break

      case 'recommendations':
        // Get current recommendations
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'recommendation_engine',
          {
            organizationId,
            userId,
            limit: parseInt(searchParams.get('limit') || '10'),
            urgentOnly: searchParams.get('urgentOnly') === 'true'
          },
          { 
            priority: 1,
            fallbackEnabled: true,
            timeout: 15000
          }
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}` },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to get recommendations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Recommendations GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}