/**
 * Compliance Controller
 * Consolidated controller for all compliance and regulatory workflow features
 * Following enterprise architecture with Repository Pattern and Result<T> types
 * 
 * Consolidates compliance-related API routes into a single controller:
 * - Compliance framework management and standards
 * - Document compliance checking and validation
 * - Audit trail generation and management
 * - Regulatory reporting and submissions
 * - Risk assessment and mitigation tracking
 * - Policy management and enforcement
 * - Training and certification tracking
 * - Incident management and remediation
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ComplianceRepository } from '@/lib/repositories/compliance.repository'
import { ComplianceService } from '@/lib/services/compliance.service'
import { RiskService } from '@/lib/services/risk.service'
import { NotificationService } from '@/lib/services/notification.service'
import { AnalyticsService } from '@/lib/services/analytics.service'
import { RepositoryFactory } from '@/lib/repositories'
import { Result } from '@/lib/repositories/result'
import { createUserId, createOrganizationId, createVaultId, createAssetId } from '@/lib/utils/branded-type-helpers'
import { logError, logActivity } from '@/lib/utils/logging'
import { validateRequest } from '@/lib/utils/validation'
import { withAuth } from '@/lib/middleware/auth'
import { withRateLimit } from '@/lib/middleware/rate-limit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Compliance Types
export interface ComplianceFramework {
  id?: string
  name: string
  version: string
  description?: string
  category: 'governance' | 'financial' | 'security' | 'privacy' | 'industry' | 'custom'
  standards: Array<{
    id: string
    name: string
    description: string
    requirements: string[]
    mandatory: boolean
    evidenceRequired: boolean
  }>
  applicability: {
    organizationTypes: string[]
    industries: string[]
    jurisdictions: string[]
    companySize?: 'small' | 'medium' | 'large' | 'enterprise'
  }
  implementation: {
    phases: Array<{
      name: string
      duration: number // days
      activities: string[]
      deliverables: string[]
    }>
    estimatedCost?: number
    complexity: 'low' | 'medium' | 'high' | 'expert'
  }
  metadata: {
    createdBy: string
    effectiveDate: string
    expiryDate?: string
    lastReviewDate?: string
    nextReviewDate?: string
    status: 'draft' | 'active' | 'deprecated' | 'archived'
    tags: string[]
  }
}

interface ComplianceAssessment {
  id?: string
  frameworkId: string
  organizationId: string
  assessmentType: 'initial' | 'periodic' | 'targeted' | 'audit_preparation'
  scope: {
    departments: string[]
    processes: string[]
    systems: string[]
    documentTypes: string[]
  }
  status: 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  findings: Array<{
    standardId: string
    requirement: string
    status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable'
    evidence?: string[]
    gaps?: string[]
    recommendations?: string[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    remediation?: {
      action: string
      owner: string
      dueDate: string
      priority: 'low' | 'medium' | 'high' | 'urgent'
    }
  }>
  timeline: {
    plannedStart: string
    plannedEnd: string
    actualStart?: string
    actualEnd?: string
  }
  team: {
    lead: string
    assessors: string[]
    stakeholders: string[]
  }
}

interface PolicyDocument {
  id?: string
  title: string
  policyNumber: string
  category: 'governance' | 'operational' | 'security' | 'hr' | 'financial' | 'compliance'
  content: string
  version: string
  status: 'draft' | 'under_review' | 'approved' | 'published' | 'archived'
  approval: {
    requiredApprovers: string[]
    currentApprovals: Array<{
      userId: string
      timestamp: string
      comments?: string
    }>
    finalApprover?: string
    approvalDate?: string
  }
  effectiveDate?: string
  reviewCycle: number // months
  nextReviewDate?: string
  relatedPolicies: string[]
  applicableRoles: string[]
  organizationId: string
  metadata: {
    createdBy: string
    lastModifiedBy?: string
    keywords: string[]
    complianceFrameworks: string[]
  }
}

interface ComplianceIncident {
  id?: string
  title: string
  description: string
  incidentType: 'violation' | 'breach' | 'non_compliance' | 'policy_deviation' | 'risk_materialization'
  severity: 'low' | 'medium' | 'high' | 'critical'
  organizationId: string
  affectedSystems?: string[]
  affectedData?: string[]
  discoveredBy: string
  discoveredDate: string
  reportedDate: string
  status: 'reported' | 'investigating' | 'remediation' | 'resolved' | 'closed'
  investigation: {
    lead: string
    team: string[]
    findings?: string
    rootCause?: string
    impact: string
    timeline: Array<{
      timestamp: string
      activity: string
      performedBy: string
      notes?: string
    }>
  }
  remediation: {
    actions: Array<{
      description: string
      owner: string
      dueDate: string
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      evidence?: string[]
    }>
    preventiveMeasures: string[]
  }
  reporting: {
    internalNotifications: string[]
    externalReporting: Array<{
      authority: string
      reportingDate: string
      reportReference?: string
      status: 'pending' | 'submitted' | 'acknowledged' | 'closed'
    }>
  }
}

interface TrainingProgram {
  id?: string
  title: string
  description: string
  category: 'compliance' | 'security' | 'governance' | 'risk' | 'ethics'
  organizationId: string
  content: {
    modules: Array<{
      title: string
      description: string
      duration: number // minutes
      content: string
      assessments?: Array<{
        question: string
        options: string[]
        correctAnswer: string
        explanation?: string
      }>
    }>
    resources: Array<{
      type: 'document' | 'video' | 'link' | 'quiz'
      title: string
      url: string
      description?: string
    }>
  }
  requirements: {
    mandatory: boolean
    frequency: number // months, 0 for one-time
    roles: string[]
    departments: string[]
    completionCriteria: {
      passingScore?: number // percentage
      timeRequirement?: number // minutes
      attestationRequired: boolean
    }
  }
  tracking: {
    enrolled: number
    completed: number
    passed: number
    failed: number
  }
  status: 'draft' | 'published' | 'archived'
  metadata: {
    createdBy: string
    effectiveDate: string
    expiryDate?: string
  }
}

// Validation Schemas
const complianceFrameworkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().max(1000, 'Description too long').optional(),
  category: z.enum(['governance', 'financial', 'security', 'privacy', 'industry', 'custom']),
  standards: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    requirements: z.array(z.string()),
    mandatory: z.boolean(),
    evidenceRequired: z.boolean()
  })),
  applicability: z.object({
    organizationTypes: z.array(z.string()),
    industries: z.array(z.string()),
    jurisdictions: z.array(z.string()),
    companySize: z.enum(['small', 'medium', 'large', 'enterprise']).optional()
  }),
  implementation: z.object({
    phases: z.array(z.object({
      name: z.string(),
      duration: z.number().min(1),
      activities: z.array(z.string()),
      deliverables: z.array(z.string())
    })),
    estimatedCost: z.number().min(0).optional(),
    complexity: z.enum(['low', 'medium', 'high', 'expert'])
  }),
  metadata: z.object({
    effectiveDate: z.string().datetime(),
    expiryDate: z.string().datetime().optional(),
    lastReviewDate: z.string().datetime().optional(),
    nextReviewDate: z.string().datetime().optional(),
    status: z.enum(['draft', 'active', 'deprecated', 'archived']).default('draft'),
    tags: z.array(z.string()).default([])
  })
})

const complianceAssessmentSchema = z.object({
  frameworkId: z.string().min(1, 'Framework ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  assessmentType: z.enum(['initial', 'periodic', 'targeted', 'audit_preparation']),
  scope: z.object({
    departments: z.array(z.string()),
    processes: z.array(z.string()),
    systems: z.array(z.string()),
    documentTypes: z.array(z.string())
  }),
  timeline: z.object({
    plannedStart: z.string().datetime(),
    plannedEnd: z.string().datetime()
  }),
  team: z.object({
    lead: z.string().min(1, 'Assessment lead is required'),
    assessors: z.array(z.string()),
    stakeholders: z.array(z.string())
  })
})

const policyDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  policyNumber: z.string().min(1, 'Policy number is required'),
  category: z.enum(['governance', 'operational', 'security', 'hr', 'financial', 'compliance']),
  content: z.string().min(1, 'Content is required'),
  version: z.string().min(1, 'Version is required'),
  approval: z.object({
    requiredApprovers: z.array(z.string()).min(1, 'At least one approver required'),
    finalApprover: z.string().optional()
  }),
  effectiveDate: z.string().datetime().optional(),
  reviewCycle: z.number().min(1).max(120), // 1-120 months
  relatedPolicies: z.array(z.string()).default([]),
  applicableRoles: z.array(z.string()).default([]),
  organizationId: z.string().min(1, 'Organization ID is required'),
  metadata: z.object({
    keywords: z.array(z.string()).default([]),
    complianceFrameworks: z.array(z.string()).default([])
  })
})

const complianceIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  incidentType: z.enum(['violation', 'breach', 'non_compliance', 'policy_deviation', 'risk_materialization']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  organizationId: z.string().min(1, 'Organization ID is required'),
  affectedSystems: z.array(z.string()).optional(),
  affectedData: z.array(z.string()).optional(),
  discoveredDate: z.string().datetime(),
  investigation: z.object({
    lead: z.string().min(1, 'Investigation lead is required'),
    team: z.array(z.string()),
    impact: z.string().min(1, 'Impact description is required')
  })
})

const trainingProgramSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required'),
  category: z.enum(['compliance', 'security', 'governance', 'risk', 'ethics']),
  organizationId: z.string().min(1, 'Organization ID is required'),
  content: z.object({
    modules: z.array(z.object({
      title: z.string(),
      description: z.string(),
      duration: z.number().min(1),
      content: z.string(),
      assessments: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()).min(2),
        correctAnswer: z.string(),
        explanation: z.string().optional()
      })).optional()
    })),
    resources: z.array(z.object({
      type: z.enum(['document', 'video', 'link', 'quiz']),
      title: z.string(),
      url: z.string(),
      description: z.string().optional()
    }))
  }),
  requirements: z.object({
    mandatory: z.boolean(),
    frequency: z.number().min(0),
    roles: z.array(z.string()),
    departments: z.array(z.string()),
    completionCriteria: z.object({
      passingScore: z.number().min(0).max(100).optional(),
      timeRequirement: z.number().min(1).optional(),
      attestationRequired: z.boolean()
    })
  }),
  metadata: z.object({
    effectiveDate: z.string().datetime(),
    expiryDate: z.string().datetime().optional()
  })
})

export class ComplianceController {
  private complianceService: ComplianceService
  private riskService: RiskService
  private notificationService: NotificationService
  private analyticsService: AnalyticsService
  private repositoryFactory: RepositoryFactory

  constructor() {
    this.repositoryFactory = new RepositoryFactory(this.createSupabaseClient())
    this.complianceService = new ComplianceService(this.repositoryFactory)
    this.riskService = new RiskService(this.repositoryFactory)
    this.notificationService = new NotificationService(this.repositoryFactory)
    this.analyticsService = new AnalyticsService(this.repositoryFactory)
  }

  private createSupabaseClient() {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )
  }

  /**
   * GET /api/compliance/frameworks
   * Retrieve compliance frameworks
   */
  async getFrameworks(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const category = url.searchParams.get('category')
      const status = url.searchParams.get('status')
      const industry = url.searchParams.get('industry')
      const jurisdiction = url.searchParams.get('jurisdiction')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      const frameworksResult = await this.complianceService.getFrameworks({
        userId: createUserId(user.id),
        category: category as ComplianceFramework['category'] || undefined,
        status: status as ComplianceFramework['metadata']['status'] || undefined,
        industry,
        jurisdiction,
        limit,
        offset
      })

      if (!frameworksResult.success) {
        return NextResponse.json(
          { success: false, error: frameworksResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: frameworksResult.data
      })

    } catch (error) {
      logError('Compliance frameworks retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Frameworks retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/frameworks
   * Create a new compliance framework
   */
  async createFramework(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, complianceFrameworkSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const frameworkData = validation.data as ComplianceFramework

      const frameworkResult = await this.complianceService.createFramework({
        ...frameworkData,
        metadata: {
          ...frameworkData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!frameworkResult.success) {
        return NextResponse.json(
          { success: false, error: frameworkResult.error },
          { status: 500 }
        )
      }

      // Log framework creation
      await logActivity({
        userId: user.id,
        action: 'compliance_framework_created',
        details: {
          frameworkId: frameworkResult.data.id,
          name: frameworkData.name,
          category: frameworkData.category,
          standardsCount: frameworkData.standards.length
        }
      })

      return NextResponse.json({
        success: true,
        data: frameworkResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Compliance framework creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Framework creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/assessments
   * Create a new compliance assessment
   */
  async createAssessment(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, complianceAssessmentSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const assessmentData = validation.data as ComplianceAssessment

      const assessmentResult = await this.complianceService.createAssessment({
        ...assessmentData,
        organizationId: createOrganizationId(assessmentData.organizationId),
        status: 'planned',
        findings: []
      }, createUserId(user.id))

      if (!assessmentResult.success) {
        return NextResponse.json(
          { success: false, error: assessmentResult.error },
          { status: 500 }
        )
      }

      // Notify assessment team
      await this.notificationService.sendAssessmentCreated({
        assessmentId: assessmentResult.data.id,
        lead: assessmentData.team.lead,
        assessors: assessmentData.team.assessors,
        stakeholders: assessmentData.team.stakeholders,
        timeline: assessmentData.timeline
      })

      // Log assessment creation
      await logActivity({
        userId: user.id,
        action: 'compliance_assessment_created',
        details: {
          assessmentId: assessmentResult.data.id,
          frameworkId: assessmentData.frameworkId,
          organizationId: assessmentData.organizationId,
          assessmentType: assessmentData.assessmentType
        }
      })

      return NextResponse.json({
        success: true,
        data: assessmentResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Compliance assessment creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Assessment creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/compliance/assessments/[id]
   * Get a specific compliance assessment
   */
  async getAssessment(request: NextRequest, assessmentId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const assessmentResult = await this.complianceService.getAssessmentById({
        assessmentId,
        userId: createUserId(user.id)
      })

      if (!assessmentResult.success) {
        return NextResponse.json(
          { success: false, error: assessmentResult.error },
          { status: assessmentResult.error === 'Assessment not found' ? 404 : 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: assessmentResult.data
      })

    } catch (error) {
      logError('Compliance assessment retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Assessment retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * PUT /api/compliance/assessments/[id]
   * Update a compliance assessment
   */
  async updateAssessment(request: NextRequest, assessmentId: string): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const updateData = await request.json()

      const assessmentResult = await this.complianceService.updateAssessment({
        assessmentId,
        userId: createUserId(user.id),
        updateData
      })

      if (!assessmentResult.success) {
        return NextResponse.json(
          { success: false, error: assessmentResult.error },
          { status: assessmentResult.error === 'Assessment not found' ? 404 : 500 }
        )
      }

      // Log assessment update
      await logActivity({
        userId: user.id,
        action: 'compliance_assessment_updated',
        details: {
          assessmentId,
          changesCount: Object.keys(updateData).length
        }
      })

      return NextResponse.json({
        success: true,
        data: assessmentResult.data
      })

    } catch (error) {
      logError('Compliance assessment update failed', error)
      return NextResponse.json(
        { success: false, error: 'Assessment update failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/policies
   * Create a new policy document
   */
  async createPolicy(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, policyDocumentSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const policyData = validation.data as PolicyDocument

      const policyResult = await this.complianceService.createPolicy({
        ...policyData,
        organizationId: createOrganizationId(policyData.organizationId),
        status: 'draft',
        approval: {
          ...policyData.approval,
          currentApprovals: []
        },
        metadata: {
          ...policyData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!policyResult.success) {
        return NextResponse.json(
          { success: false, error: policyResult.error },
          { status: 500 }
        )
      }

      // Log policy creation
      await logActivity({
        userId: user.id,
        action: 'compliance_policy_created',
        details: {
          policyId: policyResult.data.id,
          title: policyData.title,
          category: policyData.category,
          policyNumber: policyData.policyNumber
        }
      })

      return NextResponse.json({
        success: true,
        data: policyResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Policy creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Policy creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/incidents
   * Report a new compliance incident
   */
  async reportIncident(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, complianceIncidentSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const incidentData = validation.data as ComplianceIncident

      const incidentResult = await this.complianceService.reportIncident({
        ...incidentData,
        organizationId: createOrganizationId(incidentData.organizationId),
        discoveredBy: user.id,
        reportedDate: new Date().toISOString(),
        status: 'reported',
        investigation: {
          ...incidentData.investigation,
          timeline: [{
            timestamp: new Date().toISOString(),
            activity: 'Incident reported',
            performedBy: user.id,
            notes: 'Initial incident report'
          }]
        },
        remediation: {
          actions: [],
          preventiveMeasures: []
        },
        reporting: {
          internalNotifications: [],
          externalReporting: []
        }
      }, createUserId(user.id))

      if (!incidentResult.success) {
        return NextResponse.json(
          { success: false, error: incidentResult.error },
          { status: 500 }
        )
      }

      // Notify incident response team
      await this.notificationService.sendIncidentReported({
        incidentId: incidentResult.data.id,
        title: incidentData.title,
        severity: incidentData.severity,
        type: incidentData.incidentType,
        investigationLead: incidentData.investigation.lead,
        organizationId: incidentData.organizationId
      })

      // Update risk register if applicable
      if (incidentData.severity === 'high' || incidentData.severity === 'critical') {
        await this.riskService.updateRiskFromIncident({
          incidentId: incidentResult.data.id,
          severity: incidentData.severity,
          type: incidentData.incidentType,
          organizationId: createOrganizationId(incidentData.organizationId)
        })
      }

      // Log incident reporting
      await logActivity({
        userId: user.id,
        action: 'compliance_incident_reported',
        details: {
          incidentId: incidentResult.data.id,
          title: incidentData.title,
          severity: incidentData.severity,
          type: incidentData.incidentType
        }
      })

      return NextResponse.json({
        success: true,
        data: incidentResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Incident reporting failed', error)
      return NextResponse.json(
        { success: false, error: 'Incident reporting failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/training
   * Create a new training program
   */
  async createTrainingProgram(request: NextRequest): Promise<NextResponse> {
    try {
      const validation = await validateRequest(request, trainingProgramSchema)
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400 }
        )
      }

      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const trainingData = validation.data as TrainingProgram

      const trainingResult = await this.complianceService.createTrainingProgram({
        ...trainingData,
        organizationId: createOrganizationId(trainingData.organizationId),
        status: 'draft',
        tracking: {
          enrolled: 0,
          completed: 0,
          passed: 0,
          failed: 0
        },
        metadata: {
          ...trainingData.metadata,
          createdBy: user.id
        }
      }, createUserId(user.id))

      if (!trainingResult.success) {
        return NextResponse.json(
          { success: false, error: trainingResult.error },
          { status: 500 }
        )
      }

      // Log training program creation
      await logActivity({
        userId: user.id,
        action: 'compliance_training_created',
        details: {
          programId: trainingResult.data.id,
          title: trainingData.title,
          category: trainingData.category,
          modulesCount: trainingData.content.modules.length,
          mandatory: trainingData.requirements.mandatory
        }
      })

      return NextResponse.json({
        success: true,
        data: trainingResult.data
      }, { status: 201 })

    } catch (error) {
      logError('Training program creation failed', error)
      return NextResponse.json(
        { success: false, error: 'Training program creation failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/document-check
   * Check document compliance against frameworks
   */
  async checkDocumentCompliance(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { documentId, frameworkIds, organizationId } = await request.json()

      if (!documentId || !frameworkIds || !organizationId) {
        return NextResponse.json(
          { success: false, error: 'Document ID, framework IDs, and organization ID are required' },
          { status: 400 }
        )
      }

      const complianceResult = await this.complianceService.checkDocumentCompliance({
        documentId: createAssetId(documentId),
        frameworkIds,
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id)
      })

      if (!complianceResult.success) {
        return NextResponse.json(
          { success: false, error: complianceResult.error },
          { status: 500 }
        )
      }

      // Log compliance check
      await logActivity({
        userId: user.id,
        action: 'document_compliance_checked',
        details: {
          documentId,
          frameworksCount: frameworkIds.length,
          complianceScore: complianceResult.data.overallScore
        }
      })

      return NextResponse.json({
        success: true,
        data: complianceResult.data
      })

    } catch (error) {
      logError('Document compliance check failed', error)
      return NextResponse.json(
        { success: false, error: 'Compliance check failed' },
        { status: 500 }
      )
    }
  }

  /**
   * GET /api/compliance/dashboard
   * Get compliance dashboard data
   */
  async getDashboard(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const url = new URL(request.url)
      const organizationId = url.searchParams.get('organizationId')
      const timeRange = url.searchParams.get('timeRange') || '30d'

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'Organization ID is required' },
          { status: 400 }
        )
      }

      const dashboardResult = await this.complianceService.getComplianceDashboard({
        organizationId: createOrganizationId(organizationId),
        userId: createUserId(user.id),
        timeRange
      })

      if (!dashboardResult.success) {
        return NextResponse.json(
          { success: false, error: dashboardResult.error },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: dashboardResult.data
      })

    } catch (error) {
      logError('Compliance dashboard retrieval failed', error)
      return NextResponse.json(
        { success: false, error: 'Dashboard retrieval failed' },
        { status: 500 }
      )
    }
  }

  /**
   * POST /api/compliance/audit-report
   * Generate compliance audit report
   */
  async generateAuditReport(request: NextRequest): Promise<NextResponse> {
    try {
      const user = await this.getCurrentUser()
      
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      const { organizationId, frameworkIds, dateRange, format = 'pdf' } = await request.json()

      if (!organizationId || !frameworkIds || !dateRange) {
        return NextResponse.json(
          { success: false, error: 'Organization ID, framework IDs, and date range are required' },
          { status: 400 }
        )
      }

      const reportResult = await this.complianceService.generateAuditReport({
        organizationId: createOrganizationId(organizationId),
        frameworkIds,
        dateRange,
        format,
        generatedBy: createUserId(user.id)
      })

      if (!reportResult.success) {
        return NextResponse.json(
          { success: false, error: reportResult.error },
          { status: 500 }
        )
      }

      // Log report generation
      await logActivity({
        userId: user.id,
        action: 'compliance_audit_report_generated',
        details: {
          organizationId,
          frameworksCount: frameworkIds.length,
          format,
          dateRange
        }
      })

      // Return file or data based on format
      if (format === 'json') {
        return NextResponse.json({
          success: true,
          data: reportResult.data
        })
      } else {
        const contentTypes = {
          pdf: 'application/pdf',
          csv: 'text/csv',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }

        return new Response(reportResult.data.content, {
          status: 200,
          headers: {
            'Content-Type': contentTypes[format as keyof typeof contentTypes],
            'Content-Disposition': `attachment; filename="compliance_audit_report.${format}"`,
            'Cache-Control': 'no-store'
          }
        })
      }

    } catch (error) {
      logError('Audit report generation failed', error)
      return NextResponse.json(
        { success: false, error: 'Report generation failed' },
        { status: 500 }
      )
    }
  }

  private async getCurrentUser() {
    try {
      const supabase = this.createSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch (error) {
      logError('Failed to get current user', error)
      return null
    }
  }
}

// Export controller instance
export const complianceController = new ComplianceController()

// Route handlers for different HTTP methods and endpoints
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting
  const rateLimitResult = await withRateLimit(request, {
    limit: 100, // 100 requests per minute for read operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/frameworks')) {
    return await complianceController.getFrameworks(request)
  } else if (pathname.includes('/dashboard')) {
    return await complianceController.getDashboard(request)
  } else if (pathname.includes('/assessments/')) {
    const assessmentId = pathname.split('/assessments/')[1]?.split('/')[0]
    if (assessmentId) {
      return await complianceController.getAssessment(request, assessmentId)
    }
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for POST operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 40, // 40 requests per minute for write operations
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/audit-report')) {
    return await complianceController.generateAuditReport(request)
  } else if (pathname.includes('/document-check')) {
    return await complianceController.checkDocumentCompliance(request)
  } else if (pathname.includes('/training')) {
    return await complianceController.createTrainingProgram(request)
  } else if (pathname.includes('/incidents')) {
    return await complianceController.reportIncident(request)
  } else if (pathname.includes('/policies')) {
    return await complianceController.createPolicy(request)
  } else if (pathname.includes('/assessments')) {
    return await complianceController.createAssessment(request)
  } else if (pathname.includes('/frameworks')) {
    return await complianceController.createFramework(request)
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}

export async function PUT(request: NextRequest) {
  const url = new URL(request.url)
  const pathname = url.pathname
  
  // Apply rate limiting for PUT operations
  const rateLimitResult = await withRateLimit(request, {
    limit: 40,
    window: 60 * 1000
  })
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  if (pathname.includes('/assessments/')) {
    const assessmentId = pathname.split('/assessments/')[1]?.split('/')[0]
    if (assessmentId) {
      return await complianceController.updateAssessment(request, assessmentId)
    }
  }
  
  return NextResponse.json(
    { success: false, error: 'Endpoint not found' },
    { status: 404 }
  )
}