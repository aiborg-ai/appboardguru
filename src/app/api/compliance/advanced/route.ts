/**
 * Advanced Compliance Management API
 * Provides comprehensive compliance framework management, gap analysis, and roadmap generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createEnhancedAPIHandler } from '../../../../lib/api/createAPIHandler'
import { AdvancedComplianceEngineService } from '../../../../lib/services/advanced-compliance-engine.service'
import { createClient } from '@supabase/supabase-js'
import { 
  createUserId, 
  createOrganizationId, 
  createComplianceFrameworkId,
  ValidationResult
} from '../../../../types/branded'

// ==========================================
// REQUEST/RESPONSE SCHEMAS
// ==========================================

const FrameworksQuerySchema = z.object({
  jurisdiction: z.string().optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
})

const GapAnalysisRequestSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().min(1)
})

const RoadmapRequestSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().min(1),
  targetCompletionDate: z.string().datetime(),
  resources: z.object({
    internalTeamSize: z.number().min(1).default(2),
    budget: z.number().min(0).optional(),
    externalConsultingDays: z.number().min(0).optional()
  }).optional()
})

const AssessmentCreateSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().min(1),
  title: z.string().min(1).max(500),
  assessmentType: z.enum(['self', 'internal_audit', 'external_audit', 'regulatory_exam', 'continuous']),
  scope: z.string().max(2000).optional(),
  plannedStartDate: z.string().datetime(),
  plannedEndDate: z.string().datetime(),
  leadAssessorId: z.string().optional(),
  assessmentTeam: z.array(z.string()).default([]),
  requirementsToTest: z.array(z.string()).default([]),
  methodology: z.string().max(5000).optional(),
  budget: z.number().min(0).optional()
})

const ViolationReportSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().optional(),
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1).max(100),
  detectedDate: z.string().datetime(),
  affectedSystems: z.array(z.string()).default([]),
  impactAssessment: z.string().max(2000).optional(),
  remediationPlan: z.string().min(1),
  responsibleParty: z.string().optional(),
  targetResolutionDate: z.string().datetime().optional()
})

const ComplianceReportSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().min(1),
  reportType: z.enum(['executive_summary', 'detailed_assessment', 'gap_analysis', 'roadmap']),
  options: z.object({
    includeRecommendations: z.boolean().default(true),
    includeRoadmap: z.boolean().default(false),
    customDateRange: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime()
    }).optional()
  }).optional()
})

// ==========================================
// API HANDLER IMPLEMENTATION
// ==========================================

const complianceHandler = createEnhancedAPIHandler({
  name: 'AdvancedComplianceAPI',
  description: 'Advanced compliance management with comprehensive audit trails',
  version: '2.0'
})

// GET /api/compliance/advanced - Get available compliance frameworks
complianceHandler.get({
  summary: 'Get Available Compliance Frameworks',
  description: 'Retrieve available compliance frameworks with optional filtering',
  tags: ['Compliance', 'Frameworks'],
  parameters: {
    query: FrameworksQuerySchema,
  },
  responses: {
    200: {
      description: 'List of available compliance frameworks',
      schema: z.object({
        success: z.boolean(),
        data: z.array(z.object({
          id: z.string(),
          name: z.string(),
          acronym: z.string(),
          version: z.string(),
          jurisdiction: z.string().optional(),
          industry: z.string().optional(),
          requirementCount: z.number(),
          organizationPolicyCount: z.number(),
          assessmentCount: z.number(),
          violationCount: z.number(),
          complianceScore: z.number().optional(),
          lastAssessmentDate: z.string().optional(),
          nextAssessmentDue: z.string().optional()
        })),
        pagination: z.object({
          page: z.number(),
          limit: z.number(),
          total: z.number(),
          totalPages: z.number()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    const searchParams = new URL(request.url).searchParams
    const query = {
      jurisdiction: searchParams.get('jurisdiction') || undefined,
      industry: searchParams.get('industry') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20')
    }

    const validation = FrameworksQuerySchema.safeParse(query)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const result = await service.getAvailableFrameworks({
        jurisdiction: validation.data.jurisdiction,
        industry: validation.data.industry,
        search: validation.data.search
      })

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Failed to retrieve frameworks' },
          { status: 500 }
        )
      }

      // Apply pagination
      const startIndex = (validation.data.page - 1) * validation.data.limit
      const endIndex = startIndex + validation.data.limit
      const paginatedData = result.data.slice(startIndex, endIndex)

      return NextResponse.json({
        success: true,
        data: paginatedData,
        pagination: {
          page: validation.data.page,
          limit: validation.data.limit,
          total: result.data.length,
          totalPages: Math.ceil(result.data.length / validation.data.limit)
        }
      })

    } catch (error) {
      console.error('Frameworks API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/compliance/advanced/gap-analysis - Perform compliance gap analysis
complianceHandler.post({
  path: '/gap-analysis',
  summary: 'Perform Compliance Gap Analysis',
  description: 'Analyze compliance gaps for an organization against a specific framework',
  tags: ['Compliance', 'Analysis'],
  requestBody: {
    required: true,
    schema: GapAnalysisRequestSchema
  },
  responses: {
    200: {
      description: 'Compliance gap analysis results',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          frameworkId: z.string(),
          frameworkName: z.string(),
          totalRequirements: z.number(),
          implementedRequirements: z.number(),
          missingRequirements: z.number(),
          implementationGaps: z.array(z.object({
            requirementId: z.string(),
            requirementCode: z.string(),
            title: z.string(),
            priority: z.enum(['low', 'medium', 'high', 'critical']),
            category: z.string(),
            riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
            recommendedActions: z.array(z.string()),
            estimatedEffort: z.enum(['low', 'medium', 'high']),
            dependencies: z.array(z.string())
          })),
          compliancePercentage: z.number(),
          riskScore: z.number(),
          recommendedNextSteps: z.array(z.string())
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = GapAnalysisRequestSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      // Validate and transform IDs
      const organizationIdResult = createOrganizationId(validation.data.organizationId)
      const frameworkIdResult = createComplianceFrameworkId(validation.data.frameworkId)

      if (!organizationIdResult.success || !frameworkIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid organization or framework ID' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const result = await service.performGapAnalysis(
        organizationIdResult.data!,
        frameworkIdResult.data!
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Gap analysis failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Gap analysis API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/compliance/advanced/roadmap - Generate compliance roadmap
complianceHandler.post({
  path: '/roadmap',
  summary: 'Generate Compliance Roadmap',
  description: 'Generate a comprehensive compliance implementation roadmap',
  tags: ['Compliance', 'Planning'],
  requestBody: {
    required: true,
    schema: RoadmapRequestSchema
  },
  responses: {
    200: {
      description: 'Compliance implementation roadmap',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          organizationId: z.string(),
          frameworkId: z.string(),
          phases: z.array(z.object({
            phase: z.number(),
            title: z.string(),
            description: z.string(),
            startDate: z.string(),
            endDate: z.string(),
            milestones: z.array(z.object({
              title: z.string(),
              description: z.string(),
              dueDate: z.string(),
              dependencies: z.array(z.string()),
              assignedTo: z.string().optional(),
              estimatedHours: z.number(),
              priority: z.enum(['low', 'medium', 'high', 'critical'])
            })),
            deliverables: z.array(z.string()),
            resourceRequirements: z.array(z.object({
              type: z.enum(['internal', 'external', 'tool', 'training']),
              description: z.string(),
              quantity: z.number(),
              estimatedCost: z.number().optional()
            }))
          })),
          totalDuration: z.number(),
          totalCost: z.number().optional(),
          keyRisks: z.array(z.object({
            risk: z.string(),
            impact: z.enum(['low', 'medium', 'high', 'critical']),
            probability: z.enum(['low', 'medium', 'high']),
            mitigation: z.string()
          }))
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = RoadmapRequestSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      // Validate and transform IDs
      const organizationIdResult = createOrganizationId(validation.data.organizationId)
      const frameworkIdResult = createComplianceFrameworkId(validation.data.frameworkId)

      if (!organizationIdResult.success || !frameworkIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid organization or framework ID' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const result = await service.generateComplianceRoadmap(
        organizationIdResult.data!,
        frameworkIdResult.data!,
        new Date(validation.data.targetCompletionDate),
        validation.data.resources
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Roadmap generation failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Roadmap API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/compliance/advanced/assessments - Create compliance assessment
complianceHandler.post({
  path: '/assessments',
  summary: 'Create Compliance Assessment',
  description: 'Create a new compliance assessment',
  tags: ['Compliance', 'Assessments'],
  requestBody: {
    required: true,
    schema: AssessmentCreateSchema
  },
  responses: {
    201: {
      description: 'Assessment created successfully',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          organizationId: z.string(),
          frameworkId: z.string(),
          title: z.string(),
          assessmentType: z.string(),
          status: z.string(),
          plannedStartDate: z.string(),
          plannedEndDate: z.string(),
          createdAt: z.string()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = AssessmentCreateSchema.safeParse(body)
      
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body', details: validation.error.errors },
          { status: 400 }
        )
      }

      // Get user from auth header (simplified - would use proper auth middleware)
      const authHeader = request.headers.get('authorization')
      if (!authHeader) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Extract user ID from auth (simplified)
      const userId = authHeader.split(' ')[1] // Assuming Bearer token format
      const userIdResult = createUserId(userId)
      if (!userIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid user authentication' },
          { status: 401 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const assessmentRequest = {
        ...validation.data,
        plannedStartDate: new Date(validation.data.plannedStartDate),
        plannedEndDate: new Date(validation.data.plannedEndDate)
      }

      const result = await service.createAssessment(assessmentRequest, userIdResult.data!)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Assessment creation failed' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: 201 }
      )

    } catch (error) {
      console.error('Assessment creation API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/compliance/advanced/violations - Report compliance violation
complianceHandler.post({
  path: '/violations',
  summary: 'Report Compliance Violation',
  description: 'Report a new compliance violation',
  tags: ['Compliance', 'Violations'],
  requestBody: {
    required: true,
    schema: ViolationReportSchema
  },
  responses: {
    201: {
      description: 'Violation reported successfully',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          id: z.string(),
          violationCode: z.string(),
          organizationId: z.string(),
          title: z.string(),
          severity: z.string(),
          status: z.string(),
          detectedDate: z.string(),
          createdAt: z.string()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = ViolationReportSchema.safeParse(body)
      
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

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const violationRequest = {
        ...validation.data,
        detectedDate: new Date(validation.data.detectedDate),
        targetResolutionDate: validation.data.targetResolutionDate 
          ? new Date(validation.data.targetResolutionDate)
          : undefined
      }

      const result = await service.reportViolation(violationRequest, userIdResult.data!)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Violation reporting failed' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: 201 }
      )

    } catch (error) {
      console.error('Violation reporting API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// POST /api/compliance/advanced/reports - Generate compliance report
complianceHandler.post({
  path: '/reports',
  summary: 'Generate Compliance Report',
  description: 'Generate comprehensive compliance reports',
  tags: ['Compliance', 'Reporting'],
  requestBody: {
    required: true,
    schema: ComplianceReportSchema
  },
  responses: {
    200: {
      description: 'Compliance report generated successfully',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          reportId: z.string(),
          title: z.string(),
          generatedAt: z.string(),
          reportType: z.string(),
          executiveSummary: z.string(),
          sections: z.array(z.object({
            title: z.string(),
            content: z.string(),
            charts: z.array(z.object({
              type: z.string(),
              data: z.any(),
              config: z.any()
            })).optional()
          })),
          recommendations: z.array(z.string()).optional(),
          attachments: z.array(z.object({
            name: z.string(),
            type: z.string(),
            url: z.string()
          })).optional()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const body = await request.json()
      const validation = ComplianceReportSchema.safeParse(body)
      
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

      // Validate and transform IDs
      const organizationIdResult = createOrganizationId(validation.data.organizationId)
      const frameworkIdResult = createComplianceFrameworkId(validation.data.frameworkId)

      if (!organizationIdResult.success || !frameworkIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid organization or framework ID' },
          { status: 400 }
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const result = await service.generateComplianceReport(
        organizationIdResult.data!,
        frameworkIdResult.data!,
        validation.data.reportType,
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
      console.error('Report generation API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

// GET /api/compliance/advanced/dashboard - Get compliance dashboard
complianceHandler.get({
  path: '/dashboard',
  summary: 'Get Compliance Dashboard',
  description: 'Retrieve comprehensive compliance dashboard data',
  tags: ['Compliance', 'Dashboard'],
  parameters: {
    query: z.object({
      organizationId: z.string().min(1),
      frameworkId: z.string().optional()
    })
  },
  responses: {
    200: {
      description: 'Compliance dashboard data',
      schema: z.object({
        success: z.boolean(),
        data: z.object({
          assessments: z.object({
            total: z.number(),
            completed: z.number(),
            inProgress: z.number(),
            planned: z.number(),
            overdue: z.number()
          }),
          violations: z.object({
            total: z.number(),
            open: z.number(),
            critical: z.number(),
            resolved: z.number(),
            byCategory: z.record(z.number())
          }),
          policies: z.object({
            total: z.number(),
            active: z.number(),
            needsReview: z.number(),
            draft: z.number()
          }),
          training: z.object({
            assignedUsers: z.number(),
            completedUsers: z.number(),
            overdue: z.number(),
            completionRate: z.number()
          }),
          upcomingDeadlines: z.array(z.object({
            type: z.enum(['assessment', 'policy_review', 'training']),
            title: z.string(),
            dueDate: z.string(),
            priority: z.string()
          })),
          healthScore: z.object({
            overallScore: z.number(),
            categoryScores: z.object({
              assessments: z.number(),
              violations: z.number(),
              policies: z.number(),
              training: z.number()
            }),
            riskFactors: z.array(z.object({
              category: z.string(),
              impact: z.enum(['low', 'medium', 'high', 'critical']),
              description: z.string(),
              recommendation: z.string()
            })),
            trend: z.enum(['improving', 'stable', 'declining'])
          }).optional()
        })
      })
    }
  },
  handler: async (request: NextRequest) => {
    try {
      const searchParams = new URL(request.url).searchParams
      const organizationId = searchParams.get('organizationId')
      const frameworkId = searchParams.get('frameworkId')

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'Organization ID is required' },
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

      // Validate organization ID
      const organizationIdResult = createOrganizationId(organizationId)
      if (!organizationIdResult.success) {
        return NextResponse.json(
          { success: false, error: 'Invalid organization ID' },
          { status: 400 }
        )
      }

      // Validate framework ID if provided
      let frameworkIdResult: ValidationResult<any> | undefined
      if (frameworkId) {
        frameworkIdResult = createComplianceFrameworkId(frameworkId)
        if (!frameworkIdResult.success) {
          return NextResponse.json(
            { success: false, error: 'Invalid framework ID' },
            { status: 400 }
          )
        }
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const service = new AdvancedComplianceEngineService(supabase)

      const result = await service.getComplianceDashboard(
        organizationIdResult.data!,
        userIdResult.data!,
        frameworkIdResult?.data
      )

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error?.message || 'Dashboard retrieval failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: result.data
      })

    } catch (error) {
      console.error('Dashboard API error:', error)
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
})

export { complianceHandler as GET, complianceHandler as POST, complianceHandler as PUT, complianceHandler as DELETE }