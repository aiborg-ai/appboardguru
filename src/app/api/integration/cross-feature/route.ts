/**
 * Cross-Feature Integration API Endpoints
 * 
 * Composite API endpoints serving multiple features with transaction coordination:
 * 1. Enhanced Board Meeting Workflows (voting, proxies, workflows)
 * 2. Advanced Compliance Reporting (audit trails, frameworks)
 * 3. Real-time Collaborative Document Editing (OT, collaboration)
 * 4. AI-powered Meeting Summarization (transcription, insights)
 * 
 * Features:
 * - Transactional consistency across features
 * - Composite operations
 * - Error rollback and recovery
 * - Performance optimization
 * - Enterprise reliability patterns
 * 
 * Follows CLAUDE.md architecture with Result pattern and proper error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { EnhancedFeatureIntegrationService } from '@/lib/services/enhanced-feature-integration.service'
import { Result, success, failure } from '@/lib/result'
import {
  OrganizationId,
  UserId,
  MeetingId,
  DocumentId,
  CollaborationSessionId,
  createOrganizationId,
  createUserId,
  createMeetingId,
  createDocumentId
} from '@/types/branded'
import { z } from 'zod'

// =============================================
// REQUEST/RESPONSE SCHEMAS
// =============================================

// Meeting AI Compliance Workflow
const MeetingAIComplianceWorkflowSchema = z.object({
  meetingId: z.string(),
  organizationId: z.string(),
  workflowConfig: z.object({
    enableAITranscription: z.boolean().default(true),
    enableSentimentAnalysis: z.boolean().default(false),
    enableComplianceValidation: z.boolean().default(true),
    generateAuditTrail: z.boolean().default(true),
    createActionItems: z.boolean().default(true),
    checkVotingCompliance: z.boolean().default(true),
    frameworkIds: z.array(z.string()).default([])
  }),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
})

// Document Compliance AI Workflow
const DocumentComplianceAIWorkflowSchema = z.object({
  documentId: z.string(),
  sessionId: z.string(),
  organizationId: z.string(),
  workflowConfig: z.object({
    enableRealTimeCompliance: z.boolean().default(true),
    enableAIReview: z.boolean().default(true),
    enableAutomaticApproval: z.boolean().default(false),
    requireManualReview: z.boolean().default(false),
    complianceThreshold: z.number().min(0).max(100).default(80),
    aiAnalysisDepth: z.enum(['basic', 'standard', 'comprehensive']).default('standard')
  })
})

// Voting Compliance Audit Workflow
const VotingComplianceAuditWorkflowSchema = z.object({
  meetingId: z.string(),
  votingSessionId: z.string(),
  organizationId: z.string(),
  workflowConfig: z.object({
    validateQuorum: z.boolean().default(true),
    auditProxies: z.boolean().default(true),
    checkEligibility: z.boolean().default(true),
    generateComplianceReport: z.boolean().default(true),
    submitRegulatoryFiling: z.boolean().default(false),
    frameworkIds: z.array(z.string()).default([])
  })
})

// Cross-Feature State Sync
const CrossFeatureStateSyncSchema = z.object({
  organizationId: z.string(),
  changes: z.array(z.object({
    feature: z.enum(['meetings', 'compliance', 'documents', 'ai']),
    resourceId: z.string(),
    changeType: z.enum(['create', 'update', 'delete']),
    data: z.record(z.any()),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    dependencies: z.array(z.string()).optional()
  }))
})

// Integration Status Query
const IntegrationStatusQuerySchema = z.object({
  organizationId: z.string(),
  workflowId: z.string().optional(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
})

// =============================================
// API HANDLERS
// =============================================

/**
 * POST /api/integration/cross-feature/meeting-ai-compliance
 * Execute Meeting → AI → Compliance integration workflow
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const endpoint = url.pathname.split('/').pop()

  try {
    const supabase = createServerClient()
    const integrationService = new EnhancedFeatureIntegrationService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    switch (endpoint) {
      case 'meeting-ai-compliance':
        return handleMeetingAIComplianceWorkflow(integrationService, body)
      
      case 'document-compliance-ai':
        return handleDocumentComplianceAIWorkflow(integrationService, body)
      
      case 'voting-compliance-audit':
        return handleVotingComplianceAuditWorkflow(integrationService, body)
      
      case 'state-sync':
        return handleCrossFeatureStateSync(integrationService, body)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Endpoint not found' },
          { status: 404 }
        )
    }

  } catch (error) {
    console.error('Cross-feature integration API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/integration/cross-feature/status
 * Get integration status and metrics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const integrationService = new EnhancedFeatureIntegrationService(supabase)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organizationId')
    const workflowId = url.searchParams.get('workflowId')
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      )
    }

    // Validate query parameters
    const queryValidation = IntegrationStatusQuerySchema.safeParse({
      organizationId,
      workflowId: workflowId || undefined,
      timeRange: start && end ? { start, end } : undefined
    })

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: queryValidation.error.errors },
        { status: 400 }
      )
    }

    const query = queryValidation.data

    // Get integration metrics
    const metrics = integrationService.getIntegrationMetrics()

    // Get specific workflow status if requested
    let workflowStatus = null
    if (query.workflowId) {
      workflowStatus = await getWorkflowStatus(supabase, query.workflowId, createOrganizationId(organizationId))
    }

    // Get integration events for time range
    let recentEvents = null
    if (query.timeRange) {
      recentEvents = await getIntegrationEvents(
        supabase,
        createOrganizationId(organizationId),
        query.timeRange.start,
        query.timeRange.end
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        metrics,
        workflowStatus,
        recentEvents,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Integration status API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

// =============================================
// INDIVIDUAL WORKFLOW HANDLERS
// =============================================

async function handleMeetingAIComplianceWorkflow(
  integrationService: EnhancedFeatureIntegrationService,
  body: any
): Promise<NextResponse> {
  const validation = MeetingAIComplianceWorkflowSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request data', details: validation.error.errors },
      { status: 400 }
    )
  }

  const request = {
    meetingId: createMeetingId(validation.data.meetingId),
    organizationId: createOrganizationId(validation.data.organizationId),
    workflowConfig: validation.data.workflowConfig,
    priority: validation.data.priority as 'low' | 'medium' | 'high' | 'critical'
  }

  const result = await integrationService.executeMeetingAIComplianceWorkflow(request)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data
  })
}

async function handleDocumentComplianceAIWorkflow(
  integrationService: EnhancedFeatureIntegrationService,
  body: any
): Promise<NextResponse> {
  const validation = DocumentComplianceAIWorkflowSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request data', details: validation.error.errors },
      { status: 400 }
    )
  }

  const request = {
    documentId: createDocumentId(validation.data.documentId),
    sessionId: validation.data.sessionId as CollaborationSessionId,
    organizationId: createOrganizationId(validation.data.organizationId),
    workflowConfig: validation.data.workflowConfig
  }

  const result = await integrationService.executeDocumentComplianceAIWorkflow(request)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data
  })
}

async function handleVotingComplianceAuditWorkflow(
  integrationService: EnhancedFeatureIntegrationService,
  body: any
): Promise<NextResponse> {
  const validation = VotingComplianceAuditWorkflowSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request data', details: validation.error.errors },
      { status: 400 }
    )
  }

  const request = {
    meetingId: createMeetingId(validation.data.meetingId),
    votingSessionId: validation.data.votingSessionId,
    organizationId: createOrganizationId(validation.data.organizationId),
    workflowConfig: validation.data.workflowConfig
  }

  const result = await integrationService.executeVotingComplianceAuditWorkflow(request)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data
  })
}

async function handleCrossFeatureStateSync(
  integrationService: EnhancedFeatureIntegrationService,
  body: any
): Promise<NextResponse> {
  const validation = CrossFeatureStateSyncSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request data', details: validation.error.errors },
      { status: 400 }
    )
  }

  const request = {
    organizationId: createOrganizationId(validation.data.organizationId),
    changes: validation.data.changes.map(change => ({
      ...change,
      priority: change.priority as 'low' | 'medium' | 'high' | 'critical'
    }))
  }

  const result = await integrationService.synchronizeCrossFeatureState(
    request.organizationId,
    request.changes
  )

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    data: result.data
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

async function getWorkflowStatus(
  supabase: any,
  workflowId: string,
  organizationId: OrganizationId
) {
  const { data, error } = await supabase
    .from('integration_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    console.error('Error fetching workflow status:', error)
    return null
  }

  return data
}

async function getIntegrationEvents(
  supabase: any,
  organizationId: OrganizationId,
  start: string,
  end: string
) {
  const { data, error } = await supabase
    .from('integration_events')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching integration events:', error)
    return null
  }

  return data
}

// =============================================
// SPECIFIC ENDPOINT HANDLERS
// =============================================

/**
 * Bulk operation endpoint for multiple workflows
 * POST /api/integration/cross-feature/bulk
 */
export async function handleBulkOperations(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const integrationService = new EnhancedFeatureIntegrationService(supabase)

    const body = await request.json()
    const { operations } = body

    if (!Array.isArray(operations)) {
      return NextResponse.json(
        { success: false, error: 'operations must be an array' },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    // Execute operations in parallel with concurrency limit
    const concurrencyLimit = 5
    const batches = []
    for (let i = 0; i < operations.length; i += concurrencyLimit) {
      batches.push(operations.slice(i, i + concurrencyLimit))
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (operation: any, index: number) => {
        try {
          let result
          switch (operation.type) {
            case 'meeting-ai-compliance':
              result = await integrationService.executeMeetingAIComplianceWorkflow(operation.request)
              break
            case 'document-compliance-ai':
              result = await integrationService.executeDocumentComplianceAIWorkflow(operation.request)
              break
            case 'voting-compliance-audit':
              result = await integrationService.executeVotingComplianceAuditWorkflow(operation.request)
              break
            default:
              throw new Error(`Unknown operation type: ${operation.type}`)
          }

          return {
            operationIndex: i * concurrencyLimit + index,
            success: result.success,
            data: result.success ? result.data : null,
            error: !result.success ? result.error.message : null
          }
        } catch (error) {
          return {
            operationIndex: i * concurrencyLimit + index,
            success: false,
            data: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(r => r.success))
      errors.push(...batchResults.filter(r => !r.success))
    }

    return NextResponse.json({
      success: true,
      data: {
        totalOperations: operations.length,
        successfulOperations: results.length,
        failedOperations: errors.length,
        results,
        errors
      }
    })

  } catch (error) {
    console.error('Bulk operations error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint for integration services
 * GET /api/integration/cross-feature/health
 */
export async function handleHealthCheck() {
  try {
    const supabase = createServerClient()
    
    // Test database connection
    const { error: dbError } = await supabase.from('organizations').select('id').limit(1)
    if (dbError) {
      throw new Error(`Database connection failed: ${dbError.message}`)
    }

    // Test integration service initialization
    const integrationService = new EnhancedFeatureIntegrationService(supabase)
    const metrics = integrationService.getIntegrationMetrics()

    return NextResponse.json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        integrationService: 'initialized',
        metrics: {
          activeWorkflows: metrics.activeWorkflows,
          performanceMonitor: metrics.performanceMonitor
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      },
      { status: 503 }
    )
  }
}