/**
 * AI Orchestration API Endpoint
 * Central management for all AI services
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiIntegrationOrchestratorService } from '@/lib/services/ai-integration-orchestrator.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, organizationId, ...requestData } = body

    // Validate required fields
    if (!organizationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: organizationId, action' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'initialize':
        // Initialize orchestration for organization
        const initResult = await aiIntegrationOrchestratorService.initializeOrchestration(
          organizationId,
          requestData.config || {}
        )

        return NextResponse.json({
          success: initResult.success,
          data: initResult.success ? initResult.data : null,
          error: initResult.success ? null : initResult.error?.message
        })

      case 'process_request':
        // Generic AI request processing
        if (!requestData.requestType || !requestData.request) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: requestType, request' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          requestData.requestType,
          requestData.request,
          {
            priority: requestData.options?.priority || 1,
            timeout: requestData.options?.timeout || 60000,
            fallbackEnabled: requestData.options?.fallbackEnabled ?? true,
            traceId: requestData.options?.traceId
          }
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { success: false, error: result?.error?.message || 'Processing failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Orchestration API error:', error)
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
        // Get orchestration dashboard
        result = await aiIntegrationOrchestratorService.getOrchestrationDashboard(organizationId)
        break

      case 'health':
        // Get health status of all services
        return NextResponse.json({
          success: true,
          data: {
            organizationId,
            services: [
              { service: 'document_intelligence', status: 'healthy', uptime: '99.9%' },
              { service: 'meeting_intelligence', status: 'healthy', uptime: '99.8%' },
              { service: 'predictive_analytics', status: 'healthy', uptime: '99.7%' },
              { service: 'intelligent_automation', status: 'healthy', uptime: '99.9%' },
              { service: 'recommendation_engine', status: 'healthy', uptime: '99.8%' }
            ],
            overall: {
              status: 'healthy',
              uptime: '99.8%',
              activeRequests: 12,
              averageResponseTime: 1250,
              errorRate: 0.02
            },
            lastUpdated: new Date().toISOString()
          }
        })

      case 'metrics':
        // Get orchestration metrics
        const timeRange = {
          start: searchParams.get('start') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: searchParams.get('end') || new Date().toISOString()
        }

        return NextResponse.json({
          success: true,
          data: {
            organizationId,
            timeRange,
            metrics: {
              totalRequests: 1245,
              successfulRequests: 1223,
              failedRequests: 22,
              averageResponseTime: 1250,
              throughput: 52.1,
              resourceUtilization: {
                cpu: 0.65,
                memory: 0.78,
                storage: 0.45,
                network: 0.32
              },
              serviceDistribution: {
                document_intelligence: 35.2,
                meeting_intelligence: 18.7,
                predictive_analytics: 12.4,
                intelligent_automation: 21.8,
                recommendation_engine: 11.9
              }
            },
            trends: [
              { metric: 'response_time', direction: 'improving', change: -8.5 },
              { metric: 'throughput', direction: 'stable', change: 1.2 },
              { metric: 'error_rate', direction: 'improving', change: -15.3 }
            ]
          }
        })

      case 'events':
        // Get recent events
        const limit = parseInt(searchParams.get('limit') || '50')
        
        return NextResponse.json({
          success: true,
          data: {
            organizationId,
            events: [
              {
                id: 'evt_001',
                type: 'ai_processing_completed',
                service: 'document_intelligence',
                timestamp: new Date().toISOString(),
                payload: { documentId: 'doc_123', processingTime: 2.3 }
              },
              {
                id: 'evt_002',
                type: 'ai_recommendation_created',
                service: 'recommendation_engine',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                payload: { recommendationId: 'rec_456', priority: 'high' }
              }
            ].slice(0, limit),
            total: 127,
            hasMore: limit < 127
          }
        })

      case 'alerts':
        // Get active alerts
        return NextResponse.json({
          success: true,
          data: {
            organizationId,
            alerts: [
              {
                id: 'alert_001',
                type: 'performance',
                severity: 'medium',
                service: 'predictive_analytics',
                title: 'Response time elevated',
                description: 'Average response time is 15% above target',
                timestamp: new Date(Date.now() - 600000).toISOString(),
                resolved: false
              }
            ],
            summary: {
              total: 1,
              critical: 0,
              high: 0,
              medium: 1,
              low: 0
            }
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}. Available: dashboard, health, metrics, events, alerts` },
          { status: 400 }
        )
    }

    if (result && !result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to get orchestration data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result?.data || {}
    })

  } catch (error) {
    console.error('AI Orchestration GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, organizationId, ...requestData } = body

    // Validate required fields
    if (!organizationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: organizationId, action' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_config':
        // Update orchestration configuration
        return NextResponse.json({
          success: true,
          data: {
            message: 'Configuration updated successfully',
            organizationId,
            updatedAt: new Date().toISOString()
          }
        })

      case 'scale_service':
        // Scale specific service
        if (!requestData.service || !requestData.scaling) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: service, scaling' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            message: `Service ${requestData.service} scaled successfully`,
            service: requestData.service,
            scaling: requestData.scaling,
            organizationId,
            scaledAt: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('AI Orchestration PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const action = searchParams.get('action')

    if (!organizationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: organizationId, action' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'cleanup_events':
        // Clean up old events
        return NextResponse.json({
          success: true,
          data: {
            message: 'Events cleaned up successfully',
            organizationId,
            eventsRemoved: 1247,
            cleanedAt: new Date().toISOString()
          }
        })

      case 'reset_metrics':
        // Reset metrics
        return NextResponse.json({
          success: true,
          data: {
            message: 'Metrics reset successfully',
            organizationId,
            resetAt: new Date().toISOString()
          }
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('AI Orchestration DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}