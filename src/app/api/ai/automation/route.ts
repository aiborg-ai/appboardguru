/**
 * AI Intelligent Automation API Endpoint
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
      case 'generate_workflows':
        // Generate workflow recommendations
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'generate_workflows',
            organizationId,
            context: {
              currentProcesses: requestData.currentProcesses || [],
              painPoints: requestData.painPoints || [],
              objectives: requestData.objectives || [],
              constraints: requestData.constraints || []
            }
          },
          { 
            priority: 2,
            fallbackEnabled: true,
            timeout: 60000
          }
        )
        break

      case 'implement_workflow':
        // Implement a workflow recommendation
        if (!requestData.recommendationId) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: recommendationId' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'implement_workflow',
            recommendationId: requestData.recommendationId,
            organizationId,
            implementationOptions: {
              phaseApproach: requestData.phaseApproach || true,
              customizations: requestData.customizations || {},
              approvers: requestData.approvers || []
            }
          },
          { 
            priority: 1,
            fallbackEnabled: false,
            timeout: 90000
          }
        )
        break

      case 'setup_compliance':
        // Set up automated compliance checks
        if (!requestData.frameworks || !Array.isArray(requestData.frameworks)) {
          return NextResponse.json(
            { success: false, error: 'Missing or invalid field: frameworks (must be array)' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'setup_compliance',
            organizationId,
            frameworks: requestData.frameworks,
            options: {
              automationLevel: requestData.automationLevel || 'advanced',
              customRules: requestData.customRules || [],
              integrations: requestData.integrations || []
            }
          },
          { 
            priority: 1,
            fallbackEnabled: false,
            timeout: 120000
          }
        )
        break

      case 'run_compliance':
        // Run specific compliance check
        if (!requestData.checkId) {
          return NextResponse.json(
            { success: false, error: 'Missing required field: checkId' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'run_compliance',
            checkId: requestData.checkId,
            scope: requestData.scope
          },
          { 
            priority: 1,
            fallbackEnabled: false,
            timeout: 180000
          }
        )
        break

      case 'categorize_document':
        // Categorize uploaded document
        if (!requestData.documentId || !requestData.content) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: documentId, content' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'categorize_document',
            documentId: requestData.documentId,
            content: requestData.content,
            metadata: requestData.metadata || {}
          },
          { 
            priority: 1,
            fallbackEnabled: true,
            timeout: 30000
          }
        )
        break

      case 'setup_alerts':
        // Set up proactive alert system
        if (!requestData.alertTypes || !Array.isArray(requestData.alertTypes)) {
          return NextResponse.json(
            { success: false, error: 'Missing or invalid field: alertTypes (must be array)' },
            { status: 400 }
          )
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'setup_alerts',
            organizationId,
            alertTypes: requestData.alertTypes,
            configuration: {
              sensitivity: requestData.sensitivity || 'medium',
              thresholds: requestData.thresholds || {},
              escalationRules: requestData.escalationRules || []
            }
          },
          { 
            priority: 2,
            fallbackEnabled: false,
            timeout: 60000
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
    console.error('AI Intelligent Automation API error:', error)
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
    const type = searchParams.get('type')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID required' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'workflows':
        // Get workflow recommendations
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'get_workflows',
            organizationId
          },
          { 
            priority: 2,
            fallbackEnabled: true,
            timeout: 30000
          }
        )
        break

      case 'compliance':
        // Get compliance check status
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'get_compliance',
            organizationId
          },
          { 
            priority: 2,
            fallbackEnabled: true,
            timeout: 20000
          }
        )
        break

      case 'alerts':
        // Get active alerts
        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'get_alerts',
            organizationId
          },
          { 
            priority: 2,
            fallbackEnabled: true,
            timeout: 15000
          }
        )
        break

      case 'metrics':
        // Get automation metrics
        const timeRange = {
          start: searchParams.get('start') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: searchParams.get('end') || new Date().toISOString()
        }

        result = await aiIntegrationOrchestratorService.processAIRequest(
          organizationId,
          'intelligent_automation',
          {
            action: 'get_metrics',
            organizationId,
            timeRange
          },
          { 
            priority: 2,
            fallbackEnabled: true,
            timeout: 45000
          }
        )
        break

      default:
        return NextResponse.json(
          { success: false, error: `Unknown type: ${type}. Available types: workflows, compliance, alerts, metrics` },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to get automation data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data
    })

  } catch (error) {
    console.error('AI Intelligent Automation GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}