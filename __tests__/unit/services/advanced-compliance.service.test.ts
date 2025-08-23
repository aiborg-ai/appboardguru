/**
 * Unit Tests for Advanced Compliance Service
 * Testing enterprise-grade compliance checking system
 */

import { AdvancedComplianceService } from '@/lib/services/advanced-compliance.service'
import { 
  EnhancedBoardMate, 
  ComplianceCheckResult,
  ComplianceFramework,
  BackgroundCheckResult,
  ViolationRecord,
  RiskScore 
} from '@/types/boardmates'

// Mock external compliance APIs
jest.mock('@/lib/api/compliance-providers', () => ({
  checkSOXCompliance: jest.fn(),
  checkSECCompliance: jest.fn(),
  checkGDPRCompliance: jest.fn(),
  performBackgroundCheck: jest.fn(),
  checkSanctionsList: jest.fn()
}))

// Mock data factories
const createMockBoardMate = (overrides: Partial<EnhancedBoardMate> = {}): EnhancedBoardMate => ({
  id: 'test-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member',
  status: 'active',
  joined_at: '2024-01-01T00:00:00Z',
  compliance_status: {
    overall_status: 'compliant',
    sox_compliant: true,
    sec_compliant: true,
    gdpr_compliant: true,
    last_check: new Date(),
    violations: [],
    background_check: {
      status: 'passed',
      last_updated: new Date(),
      provider: 'Sterling',
      score: 95
    }
  },
  risk_assessment: {
    overall_risk_level: 0.15,
    compliance_risk: 0.1,
    reputation_risk: 0.1,
    performance_risk: 0.2
  },
  ...overrides
})

const createMockCurrentBoard = (): EnhancedBoardMate[] => [
  createMockBoardMate({ id: 'member-1', full_name: 'John Doe', role: 'owner' }),
  createMockBoardMate({ id: 'member-2', full_name: 'Jane Smith', role: 'admin' }),
  createMockBoardMate({ id: 'member-3', full_name: 'Bob Wilson', role: 'member' })
]

describe('AdvancedComplianceService', () => {
  let service: AdvancedComplianceService
  let mockMember: EnhancedBoardMate
  let mockCurrentBoard: EnhancedBoardMate[]

  beforeEach(() => {
    service = new AdvancedComplianceService()
    mockMember = createMockBoardMate()
    mockCurrentBoard = createMockCurrentBoard()
    jest.clearAllMocks()
  })

  describe('performComplianceCheck', () => {
    it('should perform comprehensive compliance check for new member', async () => {
      const organizationId = 'org-123' as any
      
      const result = await service.performComplianceCheck(
        mockMember,
        organizationId,
        mockCurrentBoard
      )

      expect(result).toHaveProperty('member_id')
      expect(result).toHaveProperty('overall_status')
      expect(result).toHaveProperty('framework_results')
      expect(result).toHaveProperty('risk_score')
      expect(result).toHaveProperty('violations')
      expect(result).toHaveProperty('recommendations')
      expect(result).toHaveProperty('background_check')
      expect(result).toHaveProperty('timestamp')

      expect(result.member_id).toBe(mockMember.id)
      expect(['compliant', 'non_compliant', 'pending']).toContain(result.overall_status)
      expect(result.framework_results).toHaveProperty('SOX')
      expect(result.framework_results).toHaveProperty('SEC')
      expect(result.framework_results).toHaveProperty('GDPR')
    })

    it('should detect independence violations for board composition', async () => {
      const dependentMember = createMockBoardMate({
        id: 'dependent-member',
        full_name: 'Dependent Member',
        // Simulate a member who would violate independence rules
        compliance_status: {
          ...createMockBoardMate().compliance_status!,
          violations: [{
            type: 'independence',
            severity: 'high',
            description: 'Current employment relationship with organization',
            framework: 'SOX',
            date_identified: new Date(),
            status: 'active'
          }]
        }
      })

      const result = await service.performComplianceCheck(
        dependentMember,
        'org-123' as any,
        mockCurrentBoard
      )

      expect(result.violations.length).toBeGreaterThan(0)
      expect(result.violations.some(v => v.type === 'independence')).toBe(true)
      expect(result.overall_status).toBe('non_compliant')
      expect(result.risk_score.score).toBeGreaterThan(60) // High risk
    })

    it('should validate board size and composition requirements', async () => {
      // Test with oversized board
      const largeBoard = Array.from({ length: 20 }, (_, i) => 
        createMockBoardMate({ id: `member-${i}` })
      )

      const result = await service.performComplianceCheck(
        mockMember,
        'org-123' as any,
        largeBoard
      )

      const hasGovernanceViolation = result.violations.some(v => 
        v.type === 'governance' && v.description.includes('board size')
      )
      expect(hasGovernanceViolation).toBe(true)
    })

    it('should check diversity requirements', async () => {
      // Test with non-diverse board
      const homogeneousBoard = Array.from({ length: 5 }, (_, i) => 
        createMockBoardMate({ 
          id: `member-${i}`,
          full_name: `John Doe ${i}` // All same demographic profile
        })
      )

      const result = await service.performComplianceCheck(
        mockMember,
        'org-123' as any,
        homogeneousBoard
      )

      const hasDiversityRecommendation = result.recommendations.some(r =>
        r.toLowerCase().includes('diversity')
      )
      expect(hasDiversityRecommendation).toBe(true)
    })

    it('should handle financial expertise requirements (SOX)', async () => {
      const nonFinancialBoard = mockCurrentBoard.map(member => ({
        ...member,
        expertise_profile: {
          ...member.expertise_profile!,
          core_competencies: ['Marketing', 'Operations'] // No financial expertise
        }
      }))

      const result = await service.performComplianceCheck(
        mockMember,
        'org-123' as any,
        nonFinancialBoard
      )

      const hasFinancialExpertiseViolation = result.violations.some(v =>
        v.type === 'expertise' && v.description.includes('financial')
      )
      expect(hasFinancialExpertiseViolation).toBe(true)
    })
  })

  describe('Background Check Integration', () => {
    it('should perform comprehensive background checks', async () => {
      const backgroundResult = await service.performBackgroundCheck(mockMember.id)

      expect(backgroundResult).toHaveProperty('member_id')
      expect(backgroundResult).toHaveProperty('status')
      expect(backgroundResult).toHaveProperty('checks_performed')
      expect(backgroundResult).toHaveProperty('risk_indicators')
      expect(backgroundResult).toHaveProperty('verification_results')
      expect(backgroundResult).toHaveProperty('provider_details')

      expect(['passed', 'failed', 'pending', 'review_required']).toContain(backgroundResult.status)
      expect(backgroundResult.checks_performed).toContain('criminal_history')
      expect(backgroundResult.checks_performed).toContain('sanctions_screening')
      expect(backgroundResult.checks_performed).toContain('education_verification')
    })

    it('should flag high-risk background check results', async () => {
      const riskyCandidateId = 'risky-candidate'
      
      // Mock a high-risk result
      jest.spyOn(service as any, 'callBackgroundCheckProvider').mockResolvedValue({
        criminal_history: { status: 'found_issues', severity: 'medium' },
        sanctions_screening: { status: 'clear' },
        education_verification: { status: 'discrepancies_found' },
        employment_verification: { status: 'unable_to_verify' }
      })

      const result = await service.performBackgroundCheck(riskyCandidateId)

      expect(result.status).toBe('review_required')
      expect(result.risk_indicators.length).toBeGreaterThan(0)
      expect(result.risk_indicators.some(r => r.category === 'criminal')).toBe(true)
    })

    it('should handle background check provider failures', async () => {
      jest.spyOn(service as any, 'callBackgroundCheckProvider').mockRejectedValue(
        new Error('Provider unavailable')
      )

      const result = await service.performBackgroundCheck('test-member-id')

      expect(result.status).toBe('pending')
      expect(result.provider_details.error).toBeDefined()
    })
  })

  describe('Framework-Specific Compliance', () => {
    describe('SOX Compliance', () => {
      it('should validate Sarbanes-Oxley requirements', async () => {
        const soxResult = await service.checkSOXCompliance(mockMember, mockCurrentBoard)

        expect(soxResult).toHaveProperty('compliant')
        expect(soxResult).toHaveProperty('violations')
        expect(soxResult).toHaveProperty('requirements_met')
        expect(soxResult).toHaveProperty('audit_committee_qualified')

        if (soxResult.compliant) {
          expect(soxResult.violations).toHaveLength(0)
        }
      })

      it('should check audit committee financial expertise', async () => {
        const nonFinancialMember = createMockBoardMate({
          expertise_profile: {
            ...createMockBoardMate().expertise_profile!,
            core_competencies: ['Marketing', 'HR']
          }
        })

        const result = await service.checkSOXCompliance(nonFinancialMember, mockCurrentBoard)
        
        expect(result.audit_committee_qualified).toBe(false)
      })
    })

    describe('SEC Compliance', () => {
      it('should validate SEC disclosure requirements', async () => {
        const secResult = await service.checkSECCompliance(mockMember, mockCurrentBoard)

        expect(secResult).toHaveProperty('compliant')
        expect(secResult).toHaveProperty('disclosure_requirements')
        expect(secResult).toHaveProperty('independence_validated')
        expect(secResult).toHaveProperty('conflicts_of_interest')
      })

      it('should identify conflicts of interest', async () => {
        const conflictedMember = createMockBoardMate({
          id: 'conflicted-member',
          // Simulate a member with potential conflicts
          compliance_status: {
            ...createMockBoardMate().compliance_status!,
            violations: [{
              type: 'conflict_of_interest',
              severity: 'medium',
              description: 'Serves on board of competitor organization',
              framework: 'SEC',
              date_identified: new Date(),
              status: 'active'
            }]
          }
        })

        const result = await service.checkSECCompliance(conflictedMember, mockCurrentBoard)
        
        expect(result.conflicts_of_interest.length).toBeGreaterThan(0)
      })
    })

    describe('GDPR Compliance', () => {
      it('should validate data privacy requirements', async () => {
        const gdprResult = await service.checkGDPRCompliance(mockMember)

        expect(gdprResult).toHaveProperty('compliant')
        expect(gdprResult).toHaveProperty('data_processing_consent')
        expect(gdprResult).toHaveProperty('right_to_erasure')
        expect(gdprResult).toHaveProperty('data_portability')
      })

      it('should handle international data transfers', async () => {
        const internationalMember = createMockBoardMate({
          id: 'international-member',
          email: 'member@eu-company.eu'
        })

        const result = await service.checkGDPRCompliance(internationalMember)
        
        expect(result.data_processing_consent).toBeDefined()
        expect(result.cross_border_transfers).toBeDefined()
      })
    })
  })

  describe('Risk Assessment and Scoring', () => {
    it('should calculate comprehensive risk scores', async () => {
      const riskScore = await service.calculateRiskScore(mockMember, mockCurrentBoard)

      expect(riskScore).toHaveProperty('score')
      expect(riskScore).toHaveProperty('risk_level')
      expect(riskScore).toHaveProperty('contributing_factors')
      expect(riskScore).toHaveProperty('mitigation_strategies')

      expect(riskScore.score).toBeGreaterThanOrEqual(0)
      expect(riskScore.score).toBeLessThanOrEqual(100)
      expect(['low', 'medium', 'high', 'critical']).toContain(riskScore.risk_level)
    })

    it('should weight different risk factors appropriately', async () => {
      const highRiskMember = createMockBoardMate({
        compliance_status: {
          ...createMockBoardMate().compliance_status!,
          violations: [
            {
              type: 'criminal',
              severity: 'high',
              description: 'Financial fraud conviction',
              framework: 'background_check',
              date_identified: new Date(),
              status: 'active'
            }
          ]
        }
      })

      const riskScore = await service.calculateRiskScore(highRiskMember, mockCurrentBoard)
      
      expect(riskScore.risk_level).toBe('high')
      expect(riskScore.score).toBeGreaterThan(70)
      expect(riskScore.contributing_factors).toContain('Criminal history violations')
    })

    it('should provide actionable mitigation strategies', async () => {
      const mediumRiskMember = createMockBoardMate({
        risk_assessment: {
          overall_risk_level: 0.5,
          compliance_risk: 0.4,
          reputation_risk: 0.3,
          performance_risk: 0.6
        }
      })

      const riskScore = await service.calculateRiskScore(mediumRiskMember, mockCurrentBoard)
      
      expect(riskScore.mitigation_strategies.length).toBeGreaterThan(0)
      riskScore.mitigation_strategies.forEach(strategy => {
        expect(strategy).toHaveProperty('action')
        expect(strategy).toHaveProperty('priority')
        expect(strategy).toHaveProperty('timeline')
      })
    })
  })

  describe('Real-time Monitoring and Alerts', () => {
    it('should monitor ongoing compliance status', async () => {
      const monitoringResult = await service.startComplianceMonitoring(
        'org-123' as any,
        mockCurrentBoard
      )

      expect(monitoringResult).toHaveProperty('monitoring_id')
      expect(monitoringResult).toHaveProperty('alerts_configured')
      expect(monitoringResult).toHaveProperty('check_frequency')
      expect(monitoringResult).toHaveProperty('notification_settings')
    })

    it('should generate compliance alerts for violations', async () => {
      const violatingMember = createMockBoardMate({
        compliance_status: {
          ...createMockBoardMate().compliance_status!,
          violations: [{
            type: 'independence',
            severity: 'critical',
            description: 'New conflict of interest identified',
            framework: 'SOX',
            date_identified: new Date(),
            status: 'active'
          }]
        }
      })

      const alerts = await service.generateComplianceAlerts([violatingMember])
      
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0]).toHaveProperty('alert_type')
      expect(alerts[0]).toHaveProperty('severity')
      expect(alerts[0]).toHaveProperty('member_id')
      expect(alerts[0]).toHaveProperty('violation_details')
      expect(alerts[0]).toHaveProperty('required_actions')
    })
  })

  describe('Integration and Performance Tests', () => {
    it('should handle large board compliance checks efficiently', async () => {
      const largeBoard = Array.from({ length: 50 }, (_, i) => 
        createMockBoardMate({ id: `member-${i}` })
      )

      const startTime = Date.now()
      const results = await Promise.all(
        largeBoard.map(member => 
          service.performComplianceCheck(member, 'org-123' as any, largeBoard)
        )
      )
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
      expect(results).toHaveLength(50)
      results.forEach(result => {
        expect(result.overall_status).toBeDefined()
      })
    })

    it('should provide compliance summary reports', async () => {
      const report = await service.generateComplianceReport(
        'org-123' as any,
        mockCurrentBoard
      )

      expect(report).toHaveProperty('organization_id')
      expect(report).toHaveProperty('overall_compliance_score')
      expect(report).toHaveProperty('framework_breakdown')
      expect(report).toHaveProperty('risk_assessment')
      expect(report).toHaveProperty('violations_summary')
      expect(report).toHaveProperty('recommendations')
      expect(report).toHaveProperty('next_review_date')

      expect(report.framework_breakdown).toHaveProperty('SOX')
      expect(report.framework_breakdown).toHaveProperty('SEC')
      expect(report.framework_breakdown).toHaveProperty('GDPR')
    })

    it('should handle API rate limiting gracefully', async () => {
      // Mock rate limiting scenario
      jest.spyOn(service as any, 'callComplianceAPI')
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValue({ compliant: true })

      const result = await service.performComplianceCheck(
        mockMember,
        'org-123' as any,
        mockCurrentBoard
      )

      expect(result.overall_status).toBeDefined()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing compliance data gracefully', async () => {
      const incompleteMember = createMockBoardMate({
        compliance_status: undefined
      })

      const result = await service.performComplianceCheck(
        incompleteMember,
        'org-123' as any,
        mockCurrentBoard
      )

      expect(result.overall_status).toBe('pending')
      expect(result.recommendations).toContain('Complete compliance data collection')
    })

    it('should validate framework requirements', async () => {
      const invalidFramework = 'INVALID_FRAMEWORK' as ComplianceFramework
      
      await expect(
        service.checkFrameworkCompliance(mockMember, invalidFramework)
      ).resolves.toHaveProperty('compliant', false)
    })

    it('should handle network timeouts in background checks', async () => {
      jest.spyOn(service as any, 'performBackgroundCheckWithTimeout')
        .mockRejectedValue(new Error('Timeout'))

      const result = await service.performBackgroundCheck('timeout-test-id')
      
      expect(result.status).toBe('pending')
      expect(result.provider_details).toHaveProperty('retry_scheduled')
    })
  })
})