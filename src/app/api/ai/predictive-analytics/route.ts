/**
 * AI Predictive Analytics API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiIntegrationOrchestratorService } from '@/lib/services/ai-integration-orchestrator.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, timeRange, options } = body

    // Validate required fields
    if (!organizationId || !timeRange) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: organizationId, timeRange' },
        { status: 400 }
      )
    }

    // Validate time range
    if (!timeRange.start || !timeRange.end) {
      return NextResponse.json(
        { success: false, error: 'Time range must include start and end dates' },
        { status: 400 }
      )
    }

    // Process through orchestrator
    const result = await aiIntegrationOrchestratorService.processAIRequest(
      organizationId,
      'predictive_analytics',
      { 
        organizationId,
        timeRange,
        options: {
          includePredictions: options?.includePredictions ?? true,
          includeRiskAnalysis: options?.includeRiskAnalysis ?? true,
          includeBenchmarking: options?.includeBenchmarking ?? true,
          modelDepth: options?.modelDepth || 'advanced'
        }
      },
      { 
        priority: 2,
        fallbackEnabled: true,
        timeout: 180000 // 3 minutes for complex analytics
      }
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Analytics processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Predictive Analytics API error:', error)
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
        // Get real-time dashboard data
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'predictive_analytics',
          {
            action: 'get_dashboard',
            organizationId,
            options: {
              includeLiveMetrics: true,
              includeAlerts: true,
              includeRecommendations: true
            }
          },
          { 
            priority: 1,
            fallbackEnabled: true,
            timeout: 30000
          }
        )
        break

      case 'trends':
        // Get trend analysis
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'predictive_analytics',
          {
            action: 'get_trends',
            organizationId,
            timeRange: {
              start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
              end: new Date().toISOString()
            }
          },
          { 
            priority: 2,
            fallbackEnabled: true,
            timeout: 60000
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
        { success: false, error: result.error?.message || 'Failed to get analytics data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Predictive Analytics GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}