import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AdvancedRiskAssessmentEngineService } from '@/lib/services/advanced-risk-assessment-engine.service'
import { EnterpriseRegulatoryComplianceEngineService } from '@/lib/services/enterprise-regulatory-compliance-engine.service'
import { createRouteHandler } from '@/lib/middleware/apiHandler'
import { withPermissionCheck } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rateLimiting'
import { withValidation } from '@/lib/middleware/validation'
import { withAuditLog } from '@/lib/middleware/auditLog'
import { createClient } from '@/lib/supabase-server'
import { createOrganizationId, createComplianceFrameworkId, createUserId } from '@/types/branded'

// ==========================================
// VALIDATION SCHEMAS
// ==========================================

const GetAssessmentsQuerySchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().optional(),
  status: z.enum(['planning', 'in_progress', 'review', 'approved', 'published', 'archived']).optional(),
  assessmentType: z.enum(['initial', 'periodic', 'event_driven', 'regulatory_required']).optional(),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  includeMetrics: z.string().optional().transform(val => val === 'true'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

const CreateRiskAssessmentSchema = z.object({
  organizationId: z.string().min(1),
  assessmentName: z.string().min(1).max(200),
  assessmentType: z.enum(['initial', 'periodic', 'event_driven', 'regulatory_required']),
  scope: z.object({
    frameworks: z.array(z.string()),
    businessUnits: z.array(z.string()),
    processes: z.array(z.string()),
    systems: z.array(z.string()),
    geographies: z.array(z.string())
  }),
  methodology: z.object({
    approachType: z.enum(['quantitative', 'qualitative', 'hybrid']),
    riskCriteria: z.object({
      impactScale: z.enum(['monetary', 'categorical', 'hybrid']),
      likelihoodScale: z.enum(['frequency', 'probability', 'categorical']),
      timeHorizon: z.enum(['short_term', 'medium_term', 'long_term']),
      confidenceLevel: z.number().min(50).max(100)
    }),
    riskAppetite: z.object({
      overall: z.enum(['conservative', 'moderate', 'aggressive']),
      categories: z.record(z.enum(['low', 'medium', 'high'])),
      thresholds: z.object({
        residualRisk: z.number().min(0).max(25),
        inherentRisk: z.number().min(0).max(25),
        riskVelocity: z.number().min(0).max(5)
      })
    })
  }),
  timeline: z.object({
    assessmentStart: z.string().datetime(),
    assessmentEnd: z.string().datetime(),
    reportingDeadline: z.string().datetime(),
    nextReviewDue: z.string().datetime()
  }).refine(data => new Date(data.assessmentEnd) > new Date(data.assessmentStart), {
    message: "Assessment end date must be after start date"
  })
})

const CreateComplianceAssessmentSchema = z.object({
  organizationId: z.string().min(1),
  frameworkId: z.string().min(1),
  title: z.string().min(1).max(500),
  assessmentType: z.enum(['self', 'internal_audit', 'external_audit', 'regulatory_exam', 'continuous']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  scopeDescription: z.string().max(2000).optional(),
  assessmentPeriodStart: z.string().datetime(),
  assessmentPeriodEnd: z.string().datetime(),
  plannedStartDate: z.string().datetime(),
  plannedEndDate: z.string().datetime(),
  leadAssessorId: z.string().optional(),
  assessmentTeam: z.array(z.string()).default([]),
  externalAssessorInfo: z.record(z.any()).default({}),
  requirementsTested: z.array(z.string()).default([]),
  methodology: z.string().max(5000).optional(),
  testingApproach: z.string().max(5000).optional(),
  costEstimate: z.number().min(0).optional(),
  vendorInfo: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({})
}).refine(data => new Date(data.assessmentPeriodEnd) >= new Date(data.assessmentPeriodStart), {
  message: "Assessment period end must be after start date"
}).refine(data => new Date(data.plannedEndDate) >= new Date(data.plannedStartDate), {
  message: "Planned end date must be after start date"
})

const UpdateAssessmentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['planning', 'in_progress', 'review', 'approved', 'published', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  scopeDescription: z.string().max(2000).optional(),
  methodology: z.string().max(5000).optional(),
  testingApproach: z.string().max(5000).optional(),
  overallScore: z.number().min(0).max(100).optional(),
  executiveSummary: z.string().optional(),
  limitations: z.string().optional(),
  nextAssessmentDate: z.string().datetime().optional(),
  actualCost: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional()
})

// ==========================================
// API HANDLERS
// ==========================================

/**
 * GET /api/compliance/assessments
 * Retrieve compliance and risk assessments
 */
export const GET = createRouteHandler({
  middleware: [
    withRateLimit({ maxRequests: 100, windowMs: 60000 }),
    withPermissionCheck(['compliance:read']),
    withValidation({ query: GetAssessmentsQuerySchema }),
    withAuditLog({
      action: 'list_compliance_assessments',
      resourceType: 'compliance_assessment',
      severity: 'low'
    })
  ],
  handler: async (req: NextRequest, context: any) => {
    try {
      const supabase = createClient()
      const complianceService = new EnterpriseRegulatoryComplianceEngineService(supabase)
      const riskService = new AdvancedRiskAssessmentEngineService(supabase)
      
      const query = context.validatedQuery as z.infer<typeof GetAssessmentsQuerySchema>
      const organizationIdResult = createOrganizationId(query.organizationId)
      
      if (!organizationIdResult.success) {
        return NextResponse.json(
          { error: 'Invalid organization ID', code: 'INVALID_ORGANIZATION_ID' },
          { status: 400 }
        )
      }
      
      const organizationId = organizationIdResult.data!
      
      // Get compliance assessments
      let complianceAssessments: any[] = []
      if (query.frameworkId) {
        const frameworkIdResult = createComplianceFrameworkId(query.frameworkId)
        if (frameworkIdResult.success) {
          const result = await complianceService.complianceRepository.findAssessmentsByOrganization(
            organizationId,
            frameworkIdResult.data!,
            query.status as any
          )
          if (result.success) {
            complianceAssessments = result.data.data
          }
        }
      }
      
      // Get risk assessments (would be implemented similarly)
      const riskAssessments: any[] = []
      
      // Combine and format assessments
      const allAssessments = [
        ...complianceAssessments.map(assessment => ({
          ...assessment,
          type: 'compliance',
          riskMetrics: query.includeMetrics ? {
            inherentRisk: assessment.overall_score ? 100 - assessment.overall_score : null,
            residualRisk: null,
            controlEffectiveness: null
          } : undefined
        })),
        ...riskAssessments.map(assessment => ({
          ...assessment,
          type: 'risk'
        }))
      ]
      
      // Apply pagination
      const page = query.page || 1
      const limit = query.limit || 20
      const startIndex = (page - 1) * limit
      const paginatedAssessments = allAssessments.slice(startIndex, startIndex + limit)
      
      const response = {
        success: true,
        data: {
          assessments: paginatedAssessments,
          summary: {
            total: allAssessments.length,
            compliance: complianceAssessments.length,
            risk: riskAssessments.length,
            byStatus: allAssessments.reduce((acc, assessment) => {
              acc[assessment.status] = (acc[assessment.status] || 0) + 1
              return acc
            }, {} as Record<string, number>),
            byType: allAssessments.reduce((acc, assessment) => {
              acc[assessment.assessment_type || assessment.type] = (acc[assessment.assessment_type || assessment.type] || 0) + 1
              return acc
            }, {} as Record<string, number>)
          }
        },
        pagination: {
          page,
          limit,
          total: allAssessments.length,
          pages: Math.ceil(allAssessments.length / limit)
        },
        metadata: {
          includeMetrics: query.includeMetrics,
          filters: {
            organizationId: query.organizationId,
            frameworkId: query.frameworkId,
            status: query.status,
            assessmentType: query.assessmentType
          },
          generatedAt: new Date().toISOString()
        }
      }
      
      return NextResponse.json(response, {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
          'X-Total-Count': allAssessments.length.toString()
        }
      })
      
    } catch (error) {
      console.error('Error retrieving assessments:', error)
      return NextResponse.json(
        {
          error: 'Failed to retrieve assessments',
          code: 'ASSESSMENTS_RETRIEVAL_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
})

/**
 * POST /api/compliance/assessments
 * Create a new compliance or risk assessment
 */
export const POST = createRouteHandler({
  middleware: [
    withRateLimit({ maxRequests: 20, windowMs: 60000 }),
    withPermissionCheck(['compliance:write', 'risk:write']),
    withAuditLog({
      action: 'create_assessment',
      resourceType: 'compliance_assessment',
      severity: 'medium',
      includeRequestBody: true
    })
  ],
  handler: async (req: NextRequest, context: any) => {
    try {
      const supabase = createClient()
      const body = await req.json()
      const userId = createUserId(context.user.id)
      
      if (!userId.success) {
        return NextResponse.json(
          { error: 'Invalid user ID', code: 'INVALID_USER_ID' },
          { status: 400 }
        )
      }
      
      // Determine assessment type and validate accordingly
      if (body.assessmentName && body.methodology) {
        // Risk assessment
        const validation = CreateRiskAssessmentSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid risk assessment data',
              code: 'VALIDATION_FAILED',
              details: validation.error.issues
            },
            { status: 400 }
          )
        }
        
        const riskService = new AdvancedRiskAssessmentEngineService(supabase)
        const organizationIdResult = createOrganizationId(validation.data.organizationId)
        
        if (!organizationIdResult.success) {
          return NextResponse.json(
            { error: 'Invalid organization ID', code: 'INVALID_ORGANIZATION_ID' },
            { status: 400 }
          )
        }
        
        const assessmentData = {
          ...validation.data,
          organizationId: organizationIdResult.data!,
          scope: {
            ...validation.data.scope,
            frameworks: validation.data.scope.frameworks.map(id => {
              const result = createComplianceFrameworkId(id)
              return result.success ? result.data! : id as any
            })
          },
          timeline: {
            assessmentStart: new Date(validation.data.timeline.assessmentStart),
            assessmentEnd: new Date(validation.data.timeline.assessmentEnd),
            reportingDeadline: new Date(validation.data.timeline.reportingDeadline),
            nextReviewDue: new Date(validation.data.timeline.nextReviewDue)
          }
        }
        
        const result = await riskService.createRiskAssessment(assessmentData, userId.data!)
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error.message, code: 'RISK_ASSESSMENT_CREATION_FAILED' },
            { status: result.error.statusCode || 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: result.data,
          message: 'Risk assessment created successfully',
          type: 'risk'
        }, { status: 201 })
        
      } else {
        // Compliance assessment
        const validation = CreateComplianceAssessmentSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json(
            {
              error: 'Invalid compliance assessment data',
              code: 'VALIDATION_FAILED',
              details: validation.error.issues
            },
            { status: 400 }
          )
        }
        
        const complianceService = new EnterpriseRegulatoryComplianceEngineService(supabase)
        const organizationIdResult = createOrganizationId(validation.data.organizationId)
        const frameworkIdResult = createComplianceFrameworkId(validation.data.frameworkId)
        
        if (!organizationIdResult.success || !frameworkIdResult.success) {
          return NextResponse.json(
            { error: 'Invalid organization or framework ID', code: 'INVALID_IDS' },
            { status: 400 }
          )
        }
        
        const assessmentData = {
          organizationId: organizationIdResult.data!,
          frameworkId: frameworkIdResult.data!,
          title: validation.data.title,
          assessmentType: validation.data.assessmentType,
          priority: validation.data.priority,
          scopeDescription: validation.data.scopeDescription,
          assessmentPeriodStart: new Date(validation.data.assessmentPeriodStart),
          assessmentPeriodEnd: new Date(validation.data.assessmentPeriodEnd),
          plannedStartDate: new Date(validation.data.plannedStartDate),
          plannedEndDate: new Date(validation.data.plannedEndDate),
          leadAssessorId: validation.data.leadAssessorId ? createUserId(validation.data.leadAssessorId).data : undefined,
          assessmentTeam: validation.data.assessmentTeam.map(id => {
            const result = createUserId(id)
            return result.success ? result.data! : id as any
          }).filter(id => id),
          externalAssessorInfo: validation.data.externalAssessorInfo,
          requirementsTested: validation.data.requirementsTested,
          methodology: validation.data.methodology,
          testingApproach: validation.data.testingApproach,
          costEstimate: validation.data.costEstimate,
          vendorInfo: validation.data.vendorInfo,
          metadata: validation.data.metadata
        }
        
        const result = await complianceService.createAssessment(assessmentData, userId.data!)
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error.message, code: 'COMPLIANCE_ASSESSMENT_CREATION_FAILED' },
            { status: result.error.statusCode || 500 }
          )
        }
        
        return NextResponse.json({
          success: true,
          data: result.data,
          message: 'Compliance assessment created successfully',
          type: 'compliance'
        }, { status: 201 })
      }
      
    } catch (error) {
      console.error('Error creating assessment:', error)
      return NextResponse.json(
        {
          error: 'Failed to create assessment',
          code: 'ASSESSMENT_CREATION_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
})