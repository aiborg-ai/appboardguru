import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import { EnterpriseRegulatoryComplianceEngineService } from '@/lib/services/enterprise-regulatory-compliance-engine.service'
import { AdvancedComplianceRepository } from '@/lib/repositories/advanced-compliance.repository'
import { EnhancedAuditRepository } from '@/lib/repositories/enhanced-audit.repository'
import { createOrganizationId, createComplianceFrameworkId, createUserId } from '@/types/branded'
import { success, failure, RepositoryError } from '@/lib/repositories/result'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock the dependencies
jest.mock('@/lib/repositories/advanced-compliance.repository')
jest.mock('@/lib/repositories/enhanced-audit.repository')

const MockedAdvancedComplianceRepository = AdvancedComplianceRepository as jest.MockedClass<typeof AdvancedComplianceRepository>
const MockedEnhancedAuditRepository = EnhancedAuditRepository as jest.MockedClass<typeof EnhancedAuditRepository>

describe('EnterpriseRegulatoryComplianceEngineService', () => {
  let service: EnterpriseRegulatoryComplianceEngineService
  let mockSupabaseClient: jest.Mocked<SupabaseClient>
  let mockComplianceRepository: jest.Mocked<AdvancedComplianceRepository>
  let mockAuditRepository: jest.Mocked<EnhancedAuditRepository>

  const testOrganizationId = createOrganizationId('test-org-123').data!
  const testFrameworkId = createComplianceFrameworkId('test-framework-456').data!
  const testUserId = createUserId('test-user-789').data!

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn(),
      auth: { getUser: jest.fn() },
      storage: { from: jest.fn() },
      rpc: jest.fn(),
      channel: jest.fn()
    } as any

    // Setup repository mocks
    mockComplianceRepository = new MockedAdvancedComplianceRepository(mockSupabaseClient) as any
    mockAuditRepository = new MockedEnhancedAuditRepository(mockSupabaseClient) as any

    // Create service instance
    service = new EnterpriseRegulatoryComplianceEngineService(mockSupabaseClient)
    ;(service as any).complianceRepository = mockComplianceRepository
    ;(service as any).auditRepository = mockAuditRepository

    // Mock base service methods
    jest.spyOn(service as any, 'logActivity').mockResolvedValue(undefined)
    jest.spyOn(service as any, 'checkPermissionWithContext').mockResolvedValue(success(true))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAvailableFrameworks', () => {
    test('should return available compliance frameworks successfully', async () => {
      const mockFrameworks = [
        {
          id: testFrameworkId,
          name: 'General Data Protection Regulation',
          acronym: 'GDPR',
          version: '2.0',
          jurisdiction: 'EU',
          industry: 'General'
        },
        {
          id: createComplianceFrameworkId('sox-framework').data!,
          name: 'Sarbanes-Oxley Act',
          acronym: 'SOX',
          version: '1.0',
          jurisdiction: 'US',
          industry: 'Finance'
        }
      ]

      const mockRequirements = { success: true, data: { total: 25, data: [] } }

      mockComplianceRepository.findAllFrameworks.mockResolvedValue(
        success({ data: mockFrameworks, total: 2 })
      )
      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(mockRequirements as any)

      const result = await service.getAvailableFrameworks({
        jurisdiction: 'EU',
        industry: 'General'
      })

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toMatchObject({
        id: testFrameworkId,
        name: 'General Data Protection Regulation',
        acronym: 'GDPR',
        requirementCount: 0
      })

      expect(mockComplianceRepository.findAllFrameworks).toHaveBeenCalledWith({
        search: undefined,
        filters: {
          jurisdiction: 'EU',
          industry: 'General'
        }
      })
    })

    test('should handle repository error gracefully', async () => {
      mockComplianceRepository.findAllFrameworks.mockResolvedValue(
        failure(RepositoryError.database('Database connection failed'))
      )

      const result = await service.getAvailableFrameworks()

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Database connection failed')
    })

    test('should filter frameworks by search term', async () => {
      const mockFrameworks = [
        {
          id: testFrameworkId,
          name: 'General Data Protection Regulation',
          acronym: 'GDPR',
          version: '2.0',
          jurisdiction: 'EU',
          industry: 'General'
        }
      ]

      mockComplianceRepository.findAllFrameworks.mockResolvedValue(
        success({ data: mockFrameworks, total: 1 })
      )
      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(
        success({ data: { total: 15, data: [] } }) as any
      )

      const result = await service.getAvailableFrameworks({
        search: 'GDPR'
      })

      expect(result.success).toBe(true)
      expect(mockComplianceRepository.findAllFrameworks).toHaveBeenCalledWith({
        search: 'GDPR',
        filters: {}
      })
    })
  })

  describe('getFrameworkDetails', () => {
    test('should return detailed framework information', async () => {
      const mockFramework = {
        id: testFrameworkId,
        name: 'General Data Protection Regulation',
        acronym: 'GDPR',
        description: 'EU data protection regulation',
        version: '2.0'
      }

      const mockRequirements = [
        {
          id: 'req-1',
          requirement_code: 'GDPR-25',
          title: 'Data Protection by Design',
          category: 'Technical Measures',
          priority: 'high'
        }
      ]

      mockComplianceRepository.findFrameworkById.mockResolvedValue(success(mockFramework))
      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(
        success({ data: mockRequirements, total: 1 })
      )

      const result = await service.getFrameworkDetails(testFrameworkId)

      expect(result.success).toBe(true)
      expect(result.data.framework).toEqual(mockFramework)
      expect(result.data.requirements).toEqual(mockRequirements)
    })

    test('should include organization-specific status when provided', async () => {
      const mockFramework = { id: testFrameworkId, name: 'GDPR' }
      const mockRequirements = []
      const mockPolicies = { success: true, data: { total: 5, data: [] } }
      const mockAssessments = { success: true, data: { total: 2, data: [{ overall_score: 85 }] } }
      const mockViolations = { success: true, data: { total: 1, data: [] } }

      mockComplianceRepository.findFrameworkById.mockResolvedValue(success(mockFramework))
      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(
        success({ data: mockRequirements, total: 0 })
      )
      mockComplianceRepository.findPoliciesByOrganization.mockResolvedValue(mockPolicies as any)
      mockComplianceRepository.findAssessmentsByOrganization.mockResolvedValue(mockAssessments as any)
      mockComplianceRepository.findViolationsByOrganization.mockResolvedValue(mockViolations as any)

      const result = await service.getFrameworkDetails(testFrameworkId, testOrganizationId)

      expect(result.success).toBe(true)
      expect(result.data.organizationStatus).toBeDefined()
      expect(result.data.organizationStatus.policiesCount).toBe(5)
      expect(result.data.organizationStatus.assessmentsCount).toBe(2)
      expect(result.data.organizationStatus.violationsCount).toBe(1)
    })

    test('should handle missing framework', async () => {
      mockComplianceRepository.findFrameworkById.mockResolvedValue(
        failure(RepositoryError.notFound('Framework not found'))
      )

      const result = await service.getFrameworkDetails(testFrameworkId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Framework not found')
    })
  })

  describe('performGapAnalysis', () => {
    test('should perform comprehensive gap analysis', async () => {
      const mockRequirements = [
        {
          id: 'req-1',
          title: 'Data Protection Impact Assessment',
          requirement_code: 'GDPR-35',
          priority: 'high',
          category: 'Assessment',
          related_requirements: []
        },
        {
          id: 'req-2',
          title: 'Data Protection Officer',
          requirement_code: 'GDPR-37',
          priority: 'critical',
          category: 'Governance',
          related_requirements: []
        }
      ]

      const mockPolicies = [
        {
          status: 'active',
          content: 'This policy covers data protection impact assessment procedures...'
        }
      ]

      const mockFramework = { name: 'General Data Protection Regulation' }

      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(
        success({ data: mockRequirements, total: 2 })
      )
      mockComplianceRepository.findPoliciesByOrganization.mockResolvedValue(
        success({ data: mockPolicies, total: 1 })
      )
      mockComplianceRepository.findAssessmentsByOrganization.mockResolvedValue(
        success({ data: [], total: 0 })
      )
      mockComplianceRepository.findFrameworkById.mockResolvedValue(success(mockFramework))

      const result = await service.performGapAnalysis(testOrganizationId, testFrameworkId)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        frameworkId: testFrameworkId,
        frameworkName: 'General Data Protection Regulation',
        totalRequirements: 2,
        implementedRequirements: 1,
        missingRequirements: 1
      })
      expect(result.data.implementationGaps).toHaveLength(1)
      expect(result.data.compliancePercentage).toBe(50) // 1 out of 2 requirements
    })

    test('should identify high-risk gaps', async () => {
      const mockRequirements = [
        {
          id: 'req-critical',
          title: 'Critical Security Requirement',
          requirement_code: 'SEC-001',
          priority: 'critical',
          category: 'Security',
          related_requirements: []
        }
      ]

      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(
        success({ data: mockRequirements, total: 1 })
      )
      mockComplianceRepository.findPoliciesByOrganization.mockResolvedValue(
        success({ data: [], total: 0 }) // No covering policies
      )
      mockComplianceRepository.findAssessmentsByOrganization.mockResolvedValue(
        success({ data: [], total: 0 })
      )
      mockComplianceRepository.findFrameworkById.mockResolvedValue(
        success({ name: 'Test Framework' })
      )

      const result = await service.performGapAnalysis(testOrganizationId, testFrameworkId)

      expect(result.success).toBe(true)
      expect(result.data.implementationGaps).toHaveLength(1)
      expect(result.data.implementationGaps[0].riskLevel).toBe('critical')
      expect(result.data.implementationGaps[0].recommendedActions).toContain(
        'Develop and implement policy addressing this requirement'
      )
    })

    test('should handle repository errors', async () => {
      mockComplianceRepository.findFrameworkRequirements.mockResolvedValue(
        failure(RepositoryError.database('Requirements query failed'))
      )

      const result = await service.performGapAnalysis(testOrganizationId, testFrameworkId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Requirements query failed')
    })
  })

  describe('generateComplianceRoadmap', () => {
    test('should generate comprehensive implementation roadmap', async () => {
      const targetDate = new Date('2024-12-31')
      
      // Mock gap analysis result
      const mockGapAnalysis = {
        success: true,
        data: {
          frameworkId: testFrameworkId,
          frameworkName: 'Test Framework',
          totalRequirements: 10,
          implementedRequirements: 6,
          missingRequirements: 4,
          implementationGaps: [
            {
              requirementId: 'req-1',
              title: 'Critical Requirement',
              priority: 'critical',
              riskLevel: 'critical',
              recommendedActions: ['Implement policy', 'Train staff'],
              estimatedEffort: 'high',
              dependencies: []
            },
            {
              requirementId: 'req-2',
              title: 'High Priority Requirement',
              priority: 'high',
              riskLevel: 'high',
              recommendedActions: ['Update procedures'],
              estimatedEffort: 'medium',
              dependencies: []
            }
          ],
          compliancePercentage: 60,
          riskScore: 25,
          recommendedNextSteps: ['Address critical gaps first']
        }
      }

      jest.spyOn(service, 'performGapAnalysis').mockResolvedValue(mockGapAnalysis as any)

      const result = await service.generateComplianceRoadmap(
        testOrganizationId,
        testFrameworkId,
        targetDate,
        {
          internalTeamSize: 3,
          budget: 100000,
          externalConsultingDays: 10
        }
      )

      expect(result.success).toBe(true)
      expect(result.data.organizationId).toBe(testOrganizationId)
      expect(result.data.frameworkId).toBe(testFrameworkId)
      expect(result.data.phases).toHaveLength(3) // Critical, High, Medium phases
      expect(result.data.totalCost).toBeGreaterThan(0)
      expect(result.data.keyRisks).toHaveLength(4)
    })

    test('should handle gap analysis failure', async () => {
      jest.spyOn(service, 'performGapAnalysis').mockResolvedValue(
        failure(RepositoryError.database('Gap analysis failed'))
      )

      const result = await service.generateComplianceRoadmap(
        testOrganizationId,
        testFrameworkId,
        new Date('2024-12-31')
      )

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Gap analysis failed')
    })

    test('should adjust timeline based on available resources', async () => {
      const mockGapAnalysis = {
        success: true,
        data: {
          implementationGaps: [
            {
              requirementId: 'req-1',
              priority: 'critical',
              riskLevel: 'critical',
              recommendedActions: ['Action 1'],
              estimatedEffort: 'high',
              dependencies: []
            }
          ]
        }
      }

      jest.spyOn(service, 'performGapAnalysis').mockResolvedValue(mockGapAnalysis as any)

      const result = await service.generateComplianceRoadmap(
        testOrganizationId,
        testFrameworkId,
        new Date('2024-12-31'),
        { internalTeamSize: 1, budget: 10000 } // Limited resources
      )

      expect(result.success).toBe(true)
      expect(result.data.keyRisks.some(risk => 
        risk.risk.includes('Insufficient internal resources')
      )).toBe(true)
    })
  })

  describe('createAssessment', () => {
    const mockAssessmentRequest = {
      organizationId: testOrganizationId,
      frameworkId: testFrameworkId,
      title: 'Q1 2024 GDPR Assessment',
      assessmentType: 'internal_audit' as const,
      scope: 'Full organizational scope',
      plannedStartDate: new Date('2024-03-01'),
      plannedEndDate: new Date('2024-03-31'),
      leadAssessorId: testUserId,
      assessmentTeam: [testUserId],
      requirementsToTest: ['req-1', 'req-2'],
      methodology: 'Risk-based assessment approach',
      budget: 50000
    }

    test('should create assessment successfully', async () => {
      const mockCreatedAssessment = {
        id: 'assessment-123',
        ...mockAssessmentRequest,
        status: 'planned',
        created_at: new Date().toISOString()
      }

      mockComplianceRepository.createComplianceAssessment.mockResolvedValue(
        success(mockCreatedAssessment)
      )

      const result = await service.createAssessment(mockAssessmentRequest, testUserId)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockCreatedAssessment)
      expect(mockComplianceRepository.createComplianceAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrganizationId,
          framework_id: testFrameworkId,
          title: 'Q1 2024 GDPR Assessment'
        }),
        testUserId
      )
    })

    test('should validate assessment request data', async () => {
      const invalidRequest = {
        ...mockAssessmentRequest,
        title: '', // Invalid: empty title
        plannedEndDate: new Date('2024-02-28') // Invalid: end date before start date
      }

      const result = await service.createAssessment(invalidRequest as any, testUserId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('validation')
    })

    test('should check permissions before creating assessment', async () => {
      jest.spyOn(service as any, 'checkPermissionWithContext').mockResolvedValueOnce(
        failure(RepositoryError.unauthorized('Insufficient permissions'))
      )

      const result = await service.createAssessment(mockAssessmentRequest, testUserId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Insufficient permissions')
    })

    test('should log assessment creation activity', async () => {
      const mockCreatedAssessment = { id: 'assessment-123' }
      mockComplianceRepository.createComplianceAssessment.mockResolvedValue(
        success(mockCreatedAssessment)
      )

      const logActivitySpy = jest.spyOn(service as any, 'logActivity')

      await service.createAssessment(mockAssessmentRequest, testUserId)

      expect(logActivitySpy).toHaveBeenCalledWith(
        'create_assessment',
        'compliance_assessment',
        'assessment-123',
        expect.objectContaining({
          frameworkId: testFrameworkId,
          organizationId: testOrganizationId,
          assessmentType: 'internal_audit'
        })
      )
    })
  })

  describe('startAssessment', () => {
    const assessmentId = createComplianceFrameworkId('assessment-123').data!

    test('should start assessment successfully', async () => {
      const mockStartedAssessment = {
        id: assessmentId,
        status: 'in_progress',
        actual_start_date: new Date().toISOString(),
        organization_id: testOrganizationId,
        title: 'Test Assessment'
      }

      mockComplianceRepository.startAssessment.mockResolvedValue(
        success(mockStartedAssessment)
      )
      mockAuditRepository.createAuditLog.mockResolvedValue(success({ id: 'audit-123' }))

      const result = await service.startAssessment(assessmentId, testUserId)

      expect(result.success).toBe(true)
      expect(mockComplianceRepository.startAssessment).toHaveBeenCalledWith(
        assessmentId,
        testUserId
      )
      expect(mockAuditRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'assessment_started',
          resource_type: 'compliance_assessment',
          resource_id: assessmentId,
          regulatory_significance: true
        })
      )
    })

    test('should check permissions before starting assessment', async () => {
      jest.spyOn(service as any, 'checkPermissionWithContext').mockResolvedValueOnce(
        failure(RepositoryError.unauthorized('Cannot start assessment'))
      )

      const result = await service.startAssessment(assessmentId, testUserId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Cannot start assessment')
    })
  })

  describe('reportViolation', () => {
    const mockViolationRequest = {
      organizationId: testOrganizationId,
      frameworkId: testFrameworkId,
      title: 'Data Breach Incident',
      description: 'Unauthorized access to customer data',
      severity: 'critical' as const,
      category: 'Data Security',
      detectedDate: new Date('2024-03-01'),
      affectedSystems: ['CRM', 'Database'],
      impactAssessment: 'High impact on customer privacy',
      remediationPlan: 'Immediate containment and investigation',
      responsibleParty: testUserId,
      targetResolutionDate: new Date('2024-03-15')
    }

    test('should report violation successfully', async () => {
      const mockCreatedViolation = {
        id: 'violation-123',
        violation_code: 'VIO-TEST-GD-C-12345678',
        ...mockViolationRequest,
        organization_id: testOrganizationId,
        status: 'identified',
        created_at: new Date().toISOString()
      }

      mockComplianceRepository.createComplianceViolation.mockResolvedValue(
        success(mockCreatedViolation)
      )
      mockAuditRepository.createAuditLog.mockResolvedValue(success({ id: 'audit-124' }))

      const result = await service.reportViolation(mockViolationRequest, testUserId)

      expect(result.success).toBe(true)
      expect(result.data.violation_code).toMatch(/^VIO-/)
      expect(mockAuditRepository.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'violation_reported',
          resource_type: 'compliance_violation',
          severity: 'critical',
          regulatory_significance: true
        })
      )
    })

    test('should generate unique violation codes', async () => {
      const mockCreatedViolation = { id: 'violation-123', violation_code: 'VIO-TEST-GD-C-12345678' }
      mockComplianceRepository.createComplianceViolation.mockResolvedValue(
        success(mockCreatedViolation)
      )
      mockAuditRepository.createAuditLog.mockResolvedValue(success({ id: 'audit-124' }))

      const result = await service.reportViolation(mockViolationRequest, testUserId)

      expect(result.success).toBe(true)
      expect(result.data.violation_code).toMatch(/^VIO-[A-Z0-9]+-[A-Z0-9]+-[A-Z]-\d{8}$/)
    })

    test('should auto-trigger critical violation workflow', async () => {
      const mockCreatedViolation = { 
        id: 'violation-critical', 
        severity: 'critical',
        violation_code: 'VIO-CRIT-123'
      }
      
      mockComplianceRepository.createComplianceViolation.mockResolvedValue(
        success(mockCreatedViolation)
      )
      mockAuditRepository.createAuditLog.mockResolvedValue(success({ id: 'audit-125' }))

      const logActivitySpy = jest.spyOn(service as any, 'logActivity')

      await service.reportViolation(mockViolationRequest, testUserId)

      expect(logActivitySpy).toHaveBeenCalledWith(
        'trigger_critical_workflow',
        'compliance_violation',
        'violation-critical',
        expect.objectContaining({
          trigger: 'critical_violation',
          reportedBy: testUserId
        })
      )
    })

    test('should validate violation request data', async () => {
      const invalidRequest = {
        ...mockViolationRequest,
        title: '', // Invalid: empty title
        severity: 'invalid' as any // Invalid severity level
      }

      const result = await service.reportViolation(invalidRequest, testUserId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('validation')
    })
  })

  describe('getComplianceDashboard', () => {
    test('should return comprehensive dashboard data', async () => {
      const mockDashboardData = {
        assessments: { total: 10, completed: 8, inProgress: 1, planned: 1, overdue: 0 },
        violations: { 
          total: 5, 
          open: 2, 
          critical: 1, 
          resolved: 3,
          byCategory: { 'Data Security': 3, 'Financial': 2 }
        },
        policies: { total: 25, active: 22, needsReview: 2, draft: 1 },
        training: { 
          assignedUsers: 100, 
          completedUsers: 85, 
          overdue: 5, 
          completionRate: 85 
        },
        upcomingDeadlines: [
          { type: 'assessment', title: 'Q2 Review', dueDate: '2024-06-30', priority: 'high' }
        ]
      }

      const mockHealthScore = {
        overallScore: 87,
        categoryScores: { assessments: 90, violations: 80, policies: 88, training: 85 },
        riskFactors: [],
        trend: 'improving'
      }

      mockComplianceRepository.getComplianceDashboard.mockResolvedValue(
        success(mockDashboardData)
      )
      mockComplianceRepository.generateComplianceHealthScore.mockResolvedValue(
        success(mockHealthScore)
      )

      const result = await service.getComplianceDashboard(
        testOrganizationId,
        testUserId,
        testFrameworkId
      )

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        ...mockDashboardData,
        healthScore: mockHealthScore
      })
    })

    test('should check permissions before returning dashboard', async () => {
      jest.spyOn(service as any, 'checkPermissionWithContext').mockResolvedValueOnce(
        failure(RepositoryError.unauthorized('Cannot access dashboard'))
      )

      const result = await service.getComplianceDashboard(testOrganizationId, testUserId)

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Cannot access dashboard')
    })

    test('should handle health score calculation failure gracefully', async () => {
      const mockDashboardData = { assessments: { total: 5 } }

      mockComplianceRepository.getComplianceDashboard.mockResolvedValue(
        success(mockDashboardData)
      )
      mockComplianceRepository.generateComplianceHealthScore.mockResolvedValue(
        failure(RepositoryError.database('Health score calculation failed'))
      )

      const result = await service.getComplianceDashboard(testOrganizationId, testUserId)

      expect(result.success).toBe(true)
      expect(result.data.healthScore).toBeUndefined()
    })
  })

  describe('generateComplianceReport', () => {
    test('should generate gap analysis report', async () => {
      const mockGapAnalysis = {
        success: true,
        data: {
          frameworkName: 'Test Framework',
          compliancePercentage: 75,
          implementedRequirements: 15,
          totalRequirements: 20,
          missingRequirements: 5,
          implementationGaps: [
            {
              title: 'Missing Policy',
              riskLevel: 'high',
              recommendedActions: ['Create policy', 'Train staff']
            }
          ],
          recommendedNextSteps: ['Address high-risk gaps']
        }
      }

      jest.spyOn(service, 'performGapAnalysis').mockResolvedValue(mockGapAnalysis as any)

      const result = await service.generateComplianceReport(
        testOrganizationId,
        testFrameworkId,
        'gap_analysis',
        testUserId
      )

      expect(result.success).toBe(true)
      expect(result.data.reportType).toBe('gap_analysis')
      expect(result.data.executiveSummary).toContain('75.0%')
      expect(result.data.sections).toHaveLength(3) // Overview, Risk Assessment, Details
      expect(result.data.recommendations).toContain('Address high-risk gaps')
    })

    test('should generate roadmap report', async () => {
      const mockRoadmap = {
        success: true,
        data: {
          totalDuration: 180,
          phases: [
            { phase: 1, title: 'Phase 1', milestones: [{ title: 'Milestone 1' }] }
          ],
          totalCost: 100000,
          keyRisks: [{ risk: 'Resource constraint', impact: 'high' }]
        }
      }

      jest.spyOn(service, 'generateComplianceRoadmap').mockResolvedValue(mockRoadmap as any)

      const result = await service.generateComplianceReport(
        testOrganizationId,
        testFrameworkId,
        'roadmap',
        testUserId
      )

      expect(result.success).toBe(true)
      expect(result.data.reportType).toBe('roadmap')
      expect(result.data.executiveSummary).toContain('180 days')
      expect(result.data.sections).toHaveLength(3)
    })

    test('should check permissions before generating report', async () => {
      jest.spyOn(service as any, 'checkPermissionWithContext').mockResolvedValueOnce(
        failure(RepositoryError.unauthorized('Cannot generate report'))
      )

      const result = await service.generateComplianceReport(
        testOrganizationId,
        testFrameworkId,
        'executive_summary',
        testUserId
      )

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Cannot generate report')
    })

    test('should handle unsupported report type', async () => {
      const result = await service.generateComplianceReport(
        testOrganizationId,
        testFrameworkId,
        'unsupported_type' as any,
        testUserId
      )

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('Unsupported report type')
    })
  })

  describe('Error Handling', () => {
    test('should handle unexpected errors gracefully', async () => {
      mockComplianceRepository.findAllFrameworks.mockRejectedValue(
        new Error('Unexpected database error')
      )

      const result = await service.getAvailableFrameworks()

      expect(result.success).toBe(false)
      expect(result.error.message).toContain('getAvailableFrameworks')
    })

    test('should handle network timeouts', async () => {
      mockComplianceRepository.findAllFrameworks.mockRejectedValue(
        new Error('ETIMEDOUT')
      )

      const result = await service.getAvailableFrameworks()

      expect(result.success).toBe(false)
    })
  })
})