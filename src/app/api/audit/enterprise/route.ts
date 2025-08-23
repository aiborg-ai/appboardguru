/**
 * Enterprise Audit Management API
 * Provides comprehensive audit logging, analytics, forensic analysis, and reporting
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createEnhancedAPIHandler } from '../../../../lib/api/createAPIHandler'
import { EnterpriseAuditService } from '../../../../lib/services/enterprise-audit.service'
import { createClient } from '@supabase/supabase-js'
import { 
  createUserId, 
  createOrganizationId, 
  createAuditLogId,
  createComplianceFrameworkId,
  ValidationResult
} from '../../../../types/branded'

// ==========================================
// REQUEST/RESPONSE SCHEMAS
// ==========================================

const AuditLogCreateSchema = z.object({
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  action: z.string().min(1).max(100),
  resourceType: z.string().min(1).max(100),
  resourceId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
  category: z.enum(['auth', 'data', 'system', 'security', 'compliance']).default('data'),
  businessImpact: z.string().max(1000).optional(),
  regulatorySignificance: z.boolean().default(false),
  complianceFrameworkId: z.string().optional(),
  correlationId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  metadata: z.record(z.any()).default({}),
  context: z.object({
    ipAddress: z.string().ip().optional(),
    userAgent: z.string().max(500).optional(),
    geographicLocation: z.string().max(100).optional(),
    dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']).optional()
  }).optional()
})

const BulkAuditLogSchema = z.object({
  logs: z.array(AuditLogCreateSchema).min(1).max(1000)
})

const AuditAnalyticsSchema = z.object({
  organizationId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  frameworkId: z.string().optional(),
  categories: z.array(z.enum(['auth', 'data', 'system', 'security', 'compliance'])).optional(),
  includeInsights: z.boolean().default(true),
  insightThreshold: z.number().min(0).max(1).default(0.7)
})

const ForensicAnalysisSchema = z.object({
  organizationId: z.string().min(1),
  trigger: z.object({
    type: z.enum(['correlation_id', 'user_id', 'resource', 'time_range']),
    value: z.string().min(1),
    timeframe: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    }).optional()
  })
})

const AuditEvidenceSchema = z.object({
  auditLogId: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  evidenceType: z.enum(['document', 'screenshot', 'log_file', 'video', 'witness_statement', 'system_output', 'configuration', 'code_review']),
  filePath: z.string().max(1000).optional(),
  fileHash: z.string().max(256).optional(),
  fileSize: z.number().nonnegative().optional(),
  mimeType: z.string().max(100).optional(),
  collectionMethod: z.string().max(100).optional(),
  confidentialityLevel: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
  tags: z.array(z.string().max(50)).default([])
})

const ExecutiveReportSchema = z.object({
  organizationId: z.string().min(1),
  timeframe: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }),
  options: z.object({
    includeForensics: z.boolean().default(false),
    includeRecommendations: z.boolean().default(true),
    confidentialityLevel: z.enum(['internal', 'confidential', 'restricted']).default('internal')
  }).optional()
})

const AuditQuerySchema = z.object({
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  resourceType: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.enum(['auth', 'data', 'system', 'security', 'compliance']).optional(),
  regulatorySignificance: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(1000).default(50)
})

// ==========================================
// API HANDLER IMPLEMENTATION
// ==========================================

const auditHandler = createEnhancedAPIHandler({
  name: 'EnterpriseAuditAPI',
  description: 'Enterprise-grade audit logging, analytics, and forensic analysis',
  version: '2.0'
})

// POST /api/audit/enterprise - Create enhanced audit log
auditHandler.post({
  summary: 'Create Enhanced Audit Log',
  description: 'Create a comprehensive audit log entry with enhanced metadata and risk assessment',
  tags: ['Audit', 'Logging'],
  requestBody: {
    required: true,
    schema: AuditLogCreateSchema
  },
  responses: {
    201: {
      description: 'Audit log created successfully',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          action: z.string(),
          resourceType: z.string(),
          severity: z.string(),
          category: z.string(),
          riskLevel: z.string(),
          regulatorySignificance: z.boolean(),
          retentionPeriodYears: z.number(),
          createdAt: z.string()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = AuditLogCreateSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      const result = await service.createEnhancedAuditLog(validation.data, validation.data.context)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Audit log creation failed' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: 201 }
      )

    } catch (error) {
      console.error('Audit log creation API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/audit/enterprise/bulk - Create multiple audit logs
auditHandler.post({
  path: '/bulk',
  summary: 'Bulk Create Audit Logs',
  description: 'Create multiple audit log entries in a single request',
  tags: ['Audit', 'Bulk Operations'],
  requestBody: {
    required: true,
    schema: BulkAuditLogSchema
  },
  responses: {
    200: {
      description: 'Bulk audit log creation results',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          successful: z.number(),
          failed: z.number(),
          errors: z.array(z.string())
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = BulkAuditLogSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      const result = await service.bulkCreateAuditLogs(validation.data.logs)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Bulk audit log creation failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Bulk audit log creation API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// GET /api/audit/enterprise - Query audit logs with advanced filtering
auditHandler.get({
  summary: 'Query Audit Logs',
  description: 'Query audit logs with advanced filtering and search capabilities',
  tags: ['Audit', 'Search'],
  parameters: {
    query: AuditQuerySchema
  },
  responses: {
    200: {
      description: 'Audit logs query results',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          logs: z.array(z.object({
            id: z.string(),
            userId: z.string().optional(),
            organizationId: z.string().optional(),
            action: z.string(),
            resourceType: z.string(),
            resourceId: z.string().optional(),
            severity: z.string(),
            category: z.string(),
            riskLevel: z.string(),
            businessImpact: z.string().optional(),
            regulatorySignificance: z.boolean(),
            correlationId: z.string().optional(),
            sessionId: z.string().optional(),
            ipAddress: z.string().optional(),
            geographicLocation: z.string().optional(),
            createdAt: z.string()
          })),
          pagination: z.object({
            page: z.number(),
            limit: z.number(),
            total: z.number(),
            totalPages: z.number()
          })
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const searchParams = new URL(request.url).searchParams
      const queryParams = {
        organizationId: searchParams.get('organizationId') || undefined,
        userId: searchParams.get('userId') || undefined,
        action: searchParams.get('action') || undefined,
        resourceType: searchParams.get('resourceType') || undefined,
        severity: searchParams.get('severity') as any || undefined,
        category: searchParams.get('category') as any || undefined,
        regulatorySignificance: searchParams.get('regulatorySignificance') === 'true' || undefined,
        dateFrom: searchParams.get('dateFrom') || undefined,
        dateTo: searchParams.get('dateTo') || undefined,
        search: searchParams.get('search') || undefined,
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50')
      }

      const validation = AuditQuerySchema.safeParse(queryParams)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid query parameters', details: validation.error.errors },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      // Build filters
      const filters: any = {}
      if (validation.data.organizationId) {
        const orgIdResult = createOrganizationId(validation.data.organizationId)
        if (orgIdResult.success) filters.organization_id = orgIdResult.data
      }
      if (validation.data.userId) {
        const userIdResult = createUserId(validation.data.userId)
        if (userIdResult.success) filters.user_id = userIdResult.data
      }
      if (validation.data.action) filters.action = validation.data.action
      if (validation.data.resourceType) filters.resource_type = validation.data.resourceType
      if (validation.data.severity) filters.severity = validation.data.severity
      if (validation.data.category) filters.category = validation.data.category
      if (validation.data.regulatorySignificance !== undefined) {
        filters.regulatory_significance = validation.data.regulatorySignificance
      }
      if (validation.data.dateFrom) filters.date_from = new Date(validation.data.dateFrom)
      if (validation.data.dateTo) filters.date_to = new Date(validation.data.dateTo)
      if (validation.data.search) filters.search = validation.data.search

      const result = await service.auditRepository.findAuditLogsByFilters(filters, {
        page: validation.data.page,
        limit: validation.data.limit
      })

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Audit logs query failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          logs: result.data.data,
          pagination: {
            page: result.data.page,
            limit: result.data.limit,
            total: result.data.total,
            totalPages: result.data.totalPages
          }
        }
      })

    } catch (error) {
      console.error('Audit logs query API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/audit/enterprise/analytics - Generate audit analytics
auditHandler.post({
  path: '/analytics',
  summary: 'Generate Audit Analytics',
  description: 'Generate comprehensive audit analytics with insights and patterns',
  tags: ['Audit', 'Analytics'],
  requestBody: {
    required: true,
    schema: AuditAnalyticsSchema
  },
  responses: {
    200: {
      description: 'Audit analytics results',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          organizationId: z.string(),
          timeframe: z.object({
            startDate: z.string(),
            endDate: z.string()
          }),
          totalEvents: z.number(),
          eventsByCategory: z.record(z.number()),
          eventsBySeverity: z.record(z.number()),
          topUsers: z.array(z.object({
            userId: z.string(),
            username: z.string(),
            eventCount: z.number(),
            riskScore: z.number()
          })),
          topResources: z.array(z.object({
            resourceType: z.string(),
            resourceId: z.string(),
            eventCount: z.number(),
            lastActivity: z.string()
          })),
          complianceMetrics: z.object({
            regulatoryEvents: z.number(),
            criticalEvents: z.number(),
            resolvedIssues: z.number(),
            openIssues: z.number(),
            complianceScore: z.number()
          }),
          securityMetrics: z.object({
            authenticationEvents: z.number(),
            failedLogins: z.number(),
            privilegeEscalations: z.number(),
            dataAccess: z.number(),
            securityScore: z.number()
          }),
          trends: z.array(z.object({
            date: z.string(),
            totalEvents: z.number(),
            criticalEvents: z.number(),
            complianceEvents: z.number(),
            securityEvents: z.number()
          })),
          insights: z.array(z.object({
            type: z.enum(['trend', 'anomaly', 'pattern', 'risk', 'compliance']),
            severity: z.enum(['low', 'medium', 'high', 'critical']),
            title: z.string(),
            description: z.string(),
            recommendation: z.string(),
            metrics: z.record(z.number()),
            relatedEvents: z.array(z.string()),
            confidence: z.number(),
            generatedAt: z.string()
          }))
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = AuditAnalyticsSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      const analyticsRequest = {
        ...validation.data,
        startDate: new Date(validation.data.startDate),
        endDate: new Date(validation.data.endDate)
      }

      const result = await service.generateAuditAnalytics(analyticsRequest)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Analytics generation failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Audit analytics API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/audit/enterprise/forensics - Generate forensic analysis
auditHandler.post({
  path: '/forensics',
  summary: 'Generate Forensic Analysis',
  description: 'Perform comprehensive forensic analysis of audit events',
  tags: ['Audit', 'Forensics'],
  requestBody: {
    required: true,
    schema: ForensicAnalysisSchema
  },
  responses: {
    200: {
      description: 'Forensic analysis results',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          correlationId: z.string(),
          title: z.string(),
          description: z.string(),
          timeframe: z.object({
            startTime: z.string(),
            endTime: z.string()
          }),
          involvedUsers: z.array(z.string()),
          affectedResources: z.array(z.string()),
          eventChain: z.array(z.object({
            timestamp: z.string(),
            event: z.any(),
            impact: z.enum(['low', 'medium', 'high', 'critical']),
            causality: z.enum(['root_cause', 'contributing_factor', 'consequence'])
          })),
          evidence: z.array(z.string()),
          findings: z.array(z.string()),
          recommendations: z.array(z.string()),
          riskAssessment: z.object({
            probability: z.number(),
            impact: z.number(),
            overall: z.number()
          })
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = ForensicAnalysisSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      // Get user from auth header
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const userId = authHeader.split(' ')[1]
      const userIdResult = createUserId(userId)
      if (!userIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid user authentication' },
          { status: 401 }
        )
      }

      const organizationIdResult = createOrganizationId(validation.data.organizationId)
      if (!organizationIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid organization ID' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      // Transform trigger timeframe if provided
      const trigger = {
        ...validation.data.trigger,
        timeframe: validation.data.trigger.timeframe ? {
          startDate: new Date(validation.data.trigger.timeframe.startDate),
          endDate: new Date(validation.data.trigger.timeframe.endDate)
        } : undefined
      }

      const result = await service.generateForensicAnalysis(
        trigger,
        organizationIdResult.data!,
        userIdResult.data!
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Forensic analysis failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Forensic analysis API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/audit/enterprise/evidence - Collect audit evidence
auditHandler.post({
  path: '/evidence',
  summary: 'Collect Audit Evidence',
  description: 'Collect and store audit evidence with chain of custody tracking',
  tags: ['Audit', 'Evidence'],
  requestBody: {
    required: true,
    schema: AuditEvidenceSchema
  },
  responses: {
    201: {
      description: 'Audit evidence collected successfully',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          auditLogId: z.string(),
          evidenceType: z.string(),
          title: z.string(),
          confidentialityLevel: z.string(),
          collectedBy: z.string(),
          collectionTimestamp: z.string(),
          verificationStatus: z.string()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = AuditEvidenceSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      // Get user from auth header
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const userId = authHeader.split(' ')[1]
      const userIdResult = createUserId(userId)
      if (!userIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid user authentication' },
          { status: 401 }
        )
      }

      const auditLogIdResult = createAuditLogId(validation.data.auditLogId)
      if (!auditLogIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid audit log ID' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      const evidenceData = {
        title: validation.data.title,
        description: validation.data.description,
        evidenceType: validation.data.evidenceType,
        filePath: validation.data.filePath,
        fileHash: validation.data.fileHash,
        fileSize: validation.data.fileSize,
        mimeType: validation.data.mimeType,
        collectionMethod: validation.data.collectionMethod,
        confidentialityLevel: validation.data.confidentialityLevel,
        tags: validation.data.tags
      }

      const result = await service.collectAuditEvidence(
        auditLogIdResult.data!,
        evidenceData,
        userIdResult.data!
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Evidence collection failed' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: 201 }
      )

    } catch (error) {
      console.error('Audit evidence API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/audit/enterprise/reports/executive - Generate executive audit report
auditHandler.post({
  path: '/reports/executive',
  summary: 'Generate Executive Audit Report',
  description: 'Generate comprehensive executive-level audit report with analytics and insights',
  tags: ['Audit', 'Reporting'],
  requestBody: {
    required: true,
    schema: ExecutiveReportSchema
  },
  responses: {
    200: {
      description: 'Executive audit report generated successfully',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          organizationId: z.string(),
          title: z.string(),
          reportType: z.string(),
          reportingPeriodStart: z.string(),
          reportingPeriodEnd: z.string(),
          executiveSummary: z.string(),
          totalEventsAnalyzed: z.number(),
          criticalIssues: z.number(),
          highIssues: z.number(),
          mediumIssues: z.number(),
          lowIssues: z.number(),
          confidenceLevel: z.string(),
          reportData: z.object({
            analytics: z.any(),
            reportSections: z.array(z.any()),
            chartData: z.any()
          }),
          createdAt: z.string()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = ExecutiveReportSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      // Get user from auth header
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const userId = authHeader.split(' ')[1]
      const userIdResult = createUserId(userId)
      if (!userIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid user authentication' },
          { status: 401 }
        )
      }

      const organizationIdResult = createOrganizationId(validation.data.organizationId)
      if (!organizationIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid organization ID' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      const timeframe = {
        startDate: new Date(validation.data.timeframe.startDate),
        endDate: new Date(validation.data.timeframe.endDate)
      }

      const result = await service.generateExecutiveAuditReport(
        organizationIdResult.data!,
        timeframe,
        userIdResult.data!,
        validation.data.options || {}
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Report generation failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Executive report API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// GET /api/audit/enterprise/correlation/{correlationId} - Get correlated audit events
auditHandler.get({
  path: '/correlation/:correlationId',
  summary: 'Get Correlated Audit Events',
  description: 'Retrieve all audit events linked by correlation ID',
  tags: ['Audit', 'Correlation'],
  parameters: {
    path: z.object({
      correlationId: z.string().uuid()
    })
  },
  responses: {
    200: {
      description: 'Correlated audit events',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          correlationId: z.string(),
          events: z.array(z.any()),
          totalEvents: z.number(),
          timeSpan: z.object({
            startTime: z.string(),
            endTime: z.string(),
            durationMs: z.number()
          }),
          involvedUsers: z.array(z.string()),
          affectedResources: z.array(z.string())
        })
      })
    }
  },
  handler: async (request: NextRequest, { params }: { params: { correlationId: string } }) => {
    try {
      const correlationId = params.correlationId

      if (!correlationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(correlationId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid correlation ID format' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new EnterpriseAuditService(supabase)

      const result = await service.auditRepository.findCorrelatedEvents(correlationId)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to retrieve correlated events' },
          { status: 500 }
        )
      }

      const events = result.data
      
      // Calculate metadata
      const involvedUsers = [...new Set(events.filter(e => e.user_id).map(e => e.user_id))]
      const affectedResources = [...new Set(events.map(e => `${e.resource_type}:${e.resource_id || 'unknown'}`))]
      
      let timeSpan = {
        startTime: '',
        endTime: '',
        durationMs: 0
      }

      if (events.length > 0) {
        const sortedEvents = events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const startTime = new Date(sortedEvents[0].created_at)
        const endTime = new Date(sortedEvents[sortedEvents.length - 1].created_at)
        
        timeSpan = {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          durationMs: endTime.getTime() - startTime.getTime()
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          correlationId,
          events,
          totalEvents: events.length,
          timeSpan,
          involvedUsers,
          affectedResources
        }
      })

    } catch (error) {
      console.error('Correlation API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

export { auditHandler as GET, auditHandler as POST, auditHandler as PUT, auditHandler as DELETE }