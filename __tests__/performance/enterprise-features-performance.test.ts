/**
 * Performance Tests for Enterprise BoardMates Features
 * Testing scalability, memory usage, and responsiveness for $500K/seat application
 */

import { performance } from 'perf_hooks'
import { AIMemberRecommendationsService } from '@/lib/services/ai-member-recommendations.service'
import { AdvancedComplianceService } from '@/lib/services/advanced-compliance.service'
import { VoiceCommandService } from '@/lib/services/voice-command.service'
import { EnhancedBoardMate, MemberRecommendation } from '@/types/boardmates'

// Mock performance APIs for Node.js environment
global.performance = performance as any

// Performance testing utilities
class PerformanceTester {
  private static instance: PerformanceTester
  private metrics: Map<string, number[]> = new Map()
  
  static getInstance(): PerformanceTester {
    if (!PerformanceTester.instance) {
      PerformanceTester.instance = new PerformanceTester()
    }
    return PerformanceTester.instance
  }
  
  async measureExecutionTime<T>(
    operation: () => Promise<T>,
    operationName: string,
    iterations: number = 1
  ): Promise<{ result: T; avgTime: number; minTime: number; maxTime: number }> {
    const times: number[] = []
    let result: T
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      result = await operation()
      const endTime = performance.now()
      times.push(endTime - startTime)
    }
    
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    // Store metrics for reporting
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, [])
    }
    this.metrics.get(operationName)!.push(...times)
    
    return {
      result: result!,
      avgTime,
      minTime,
      maxTime
    }
  }
  
  getMetricsSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    for (const [operation, times] of this.metrics) {
      summary[operation] = {
        avg: times.reduce((sum, time) => sum + time, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length
      }
    }
    
    return summary
  }
  
  clearMetrics(): void {
    this.metrics.clear()
  }
}

// Data generators for performance testing
class PerformanceDataGenerator {
  static generateLargeBoardMemberDataset(size: number): EnhancedBoardMate[] {
    return Array.from({ length: size }, (_, i) => ({
      id: `member-${i}`,
      email: `member${i}@company.com`,
      full_name: `Member ${i}`,
      role: ['owner', 'admin', 'member', 'viewer'][i % 4] as any,
      status: 'active' as any,
      joined_at: new Date(2024, 0, 1 + (i % 365)).toISOString(),
      ai_score: {
        overall_match: 0.7 + Math.random() * 0.3,
        skill_alignment: 0.6 + Math.random() * 0.4,
        cultural_fit: 0.7 + Math.random() * 0.3,
        risk_factor: Math.random() * 0.3,
        growth_potential: 0.6 + Math.random() * 0.4,
        leadership_capacity: 0.5 + Math.random() * 0.5
      },
      expertise_profile: {
        core_competencies: this.generateRandomSkills(3 + Math.floor(Math.random() * 3)),
        industry_experience: ['Technology', 'Healthcare', 'Finance', 'Manufacturing'][i % 4],
        years_experience: 5 + Math.floor(Math.random() * 25),
        innovation_index: 0.5 + Math.random() * 0.5,
        collaboration_style: ['Collaborative', 'Direct', 'Consensus-driven'][i % 3] as any
      },
      performance_metrics: {
        overall_score: 0.6 + Math.random() * 0.4,
        decision_quality: 0.7 + Math.random() * 0.3,
        strategic_impact: 0.6 + Math.random() * 0.4,
        team_effectiveness: 0.7 + Math.random() * 0.3,
        stakeholder_satisfaction: 0.8 + Math.random() * 0.2
      },
      risk_assessment: {
        overall_risk_level: Math.random() * 0.4,
        compliance_risk: Math.random() * 0.3,
        reputation_risk: Math.random() * 0.2,
        performance_risk: Math.random() * 0.3
      },
      network_position: {
        influence_score: 0.4 + Math.random() * 0.6,
        centrality_measure: 0.3 + Math.random() * 0.7,
        connection_strength: 0.5 + Math.random() * 0.5
      }
    }))
  }
  
  static generateRandomSkills(count: number): string[] {
    const allSkills = [
      'Leadership', 'Strategy', 'Finance', 'Technology', 'Marketing', 'Operations',
      'Legal', 'HR', 'Sales', 'Product', 'International', 'Sustainability',
      'Cybersecurity', 'Data Analytics', 'Innovation', 'Risk Management',
      'Compliance', 'Digital Transformation', 'Supply Chain', 'Customer Experience'
    ]
    
    return allSkills
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
  }
  
  static generateMockRecommendations(count: number): MemberRecommendation[] {
    return Array.from({ length: count }, (_, i) => ({
      candidate_id: `candidate-${i}`,
      full_name: `Candidate ${i}`,
      email: `candidate${i}@example.com`,
      match_score: 0.7 + Math.random() * 0.3,
      rank: i + 1,
      strengths: this.generateRandomSkills(3),
      concerns: ['Limited availability', 'Potential conflicts'][Math.floor(Math.random() * 2)] ? 
        ['Limited availability'] : ['Potential conflicts'],
      expected_impact: `Would bring strong expertise in key areas and enhance board effectiveness.`,
      risk_factors: ['Time commitment'],
      confidence_level: 0.8 + Math.random() * 0.2,
      ai_rationale: `Strong candidate with relevant experience and skills alignment.`,
      suggested_role: ['member', 'admin'][Math.floor(Math.random() * 2)] as any,
      onboarding_timeline: '4-6 weeks'
    }))
  }
}

describe('Enterprise Features Performance Tests', () => {
  let performanceTester: PerformanceTester

  beforeAll(() => {
    performanceTester = PerformanceTester.getInstance()
  })

  afterEach(() => {
    // Log performance metrics for each test
    const summary = performanceTester.getMetricsSummary()
    console.table(summary)
  })

  afterAll(() => {
    performanceTester.clearMetrics()
  })

  describe('AI Member Recommendations Service Performance', () => {
    let aiService: AIMemberRecommendationsService

    beforeEach(() => {
      aiService = new AIMemberRecommendationsService()
      
      // Mock external API calls for performance testing
      jest.spyOn(aiService as any, 'callOpenRouterAPI').mockResolvedValue({
        choices: [{ message: { content: '{"recommendations": "mock_data"}' } }]
      })
    })

    it('should handle large board analysis efficiently', async () => {
      const largeBoardDataset = PerformanceDataGenerator.generateLargeBoardMemberDataset(100)
      
      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await aiService.analyzeTeamComposition(largeBoardDataset),
        'large_board_analysis',
        3
      )
      
      expect(avgTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result.overall_score).toBeGreaterThanOrEqual(0)
      expect(result.overall_score).toBeLessThanOrEqual(100)
    })

    it('should generate recommendations at scale', async () => {
      const boardMembers = PerformanceDataGenerator.generateLargeBoardMemberDataset(50)
      const criteria = {
        required_skills: ['Leadership', 'Finance'],
        preferred_experience: 10,
        diversity_goals: {
          gender: 'balanced' as const,
          ethnicity: 'diverse' as const,
          age_range: { min: 35, max: 65 },
          geographic: 'global' as const
        },
        risk_tolerance: 'medium' as const,
        innovation_focus: 'high' as const,
        board_size_target: 7,
        expertise_gaps: ['Technology', 'Marketing']
      }

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await aiService.getRecommendations(
          'vault-123' as any,
          'org-123' as any,
          boardMembers,
          criteria
        ),
        'ai_recommendations_generation',
        5
      )

      expect(avgTime).toBeLessThan(8000) // Should complete within 8 seconds
      expect(result.length).toBe(5) // Standard recommendation count
      expect(result.every(r => r.match_score > 0.5)).toBe(true)
    })

    it('should process voice queries efficiently', async () => {
      const boardMembers = PerformanceDataGenerator.generateLargeBoardMemberDataset(20)
      const voiceContext = {
        user_id: 'test-user',
        current_board: boardMembers,
        organization_context: {
          industry: 'Technology',
          size: 'Large',
          stage: 'Growth',
          focus_areas: ['Innovation', 'Global Expansion']
        }
      }

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await aiService.processVoiceQuery(
          'Find me someone with cybersecurity and compliance experience',
          voiceContext
        ),
        'voice_query_processing',
        10
      )

      expect(avgTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle concurrent recommendation requests', async () => {
      const boardMembers = PerformanceDataGenerator.generateLargeBoardMemberDataset(30)
      const criteria = {
        required_skills: ['Leadership'],
        preferred_experience: 5,
        risk_tolerance: 'low' as const,
        innovation_focus: 'medium' as const,
        board_size_target: 5,
        expertise_gaps: ['Technology']
      }

      const concurrentRequests = Array.from({ length: 5 }, () =>
        aiService.getRecommendations(
          `vault-${Math.random()}` as any,
          `org-${Math.random()}` as any,
          boardMembers,
          criteria
        )
      )

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await Promise.all(concurrentRequests),
        'concurrent_recommendations',
        3
      )

      expect(avgTime).toBeLessThan(12000) // All requests within 12 seconds
      expect(result).toHaveLength(5)
      expect(result.every(recommendations => recommendations.length > 0)).toBe(true)
    })

    it('should maintain performance with complex team dynamics analysis', async () => {
      const complexBoard = PerformanceDataGenerator.generateLargeBoardMemberDataset(25)
      
      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await aiService.generateTeamDynamicsInsights(complexBoard, 'technology'),
        'team_dynamics_analysis',
        5
      )

      expect(avgTime).toBeLessThan(6000) // Should complete within 6 seconds
      expect(result.collaboration_patterns).toBeDefined()
      expect(result.decision_making_style).toBeDefined()
      expect(result.innovation_capacity).toBeDefined()
    })
  })

  describe('Advanced Compliance Service Performance', () => {
    let complianceService: AdvancedComplianceService

    beforeEach(() => {
      complianceService = new AdvancedComplianceService()
      
      // Mock external compliance API calls
      jest.spyOn(complianceService as any, 'callComplianceAPI').mockResolvedValue({
        compliant: true,
        score: 85
      })
      
      jest.spyOn(complianceService as any, 'performBackgroundCheckWithTimeout').mockResolvedValue({
        status: 'passed',
        score: 92
      })
    })

    it('should handle large-scale compliance checking efficiently', async () => {
      const largeBoard = PerformanceDataGenerator.generateLargeBoardMemberDataset(50)
      const organizationId = 'large-org-123' as any

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const complianceChecks = largeBoard.map(member => 
            complianceService.performComplianceCheck(member, organizationId, largeBoard)
          )
          return await Promise.all(complianceChecks)
        },
        'large_scale_compliance_checking',
        3
      )

      expect(avgTime).toBeLessThan(15000) // Should complete within 15 seconds
      expect(result).toHaveLength(50)
      expect(result.every(check => check.overall_status !== undefined)).toBe(true)
    })

    it('should efficiently process background checks in batch', async () => {
      const memberIds = Array.from({ length: 20 }, (_, i) => `member-${i}`)

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const backgroundChecks = memberIds.map(id => 
            complianceService.performBackgroundCheck(id)
          )
          return await Promise.all(backgroundChecks)
        },
        'batch_background_checks',
        3
      )

      expect(avgTime).toBeLessThan(10000) // Should complete within 10 seconds
      expect(result).toHaveLength(20)
      expect(result.every(check => check.status !== undefined)).toBe(true)
    })

    it('should generate compliance reports efficiently', async () => {
      const board = PerformanceDataGenerator.generateLargeBoardMemberDataset(15)
      const organizationId = 'report-org-123' as any

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await complianceService.generateComplianceReport(organizationId, board),
        'compliance_report_generation',
        5
      )

      expect(avgTime).toBeLessThan(8000) // Should complete within 8 seconds
      expect(result.organization_id).toBe(organizationId)
      expect(result.overall_compliance_score).toBeGreaterThanOrEqual(0)
      expect(result.framework_breakdown).toBeDefined()
    })

    it('should handle real-time compliance monitoring efficiently', async () => {
      const board = PerformanceDataGenerator.generateLargeBoardMemberDataset(30)
      const organizationId = 'monitoring-org-123' as any

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await complianceService.startComplianceMonitoring(organizationId, board),
        'compliance_monitoring_setup',
        3
      )

      expect(avgTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(result.monitoring_id).toBeDefined()
      expect(result.alerts_configured).toBeGreaterThan(0)
    })

    it('should scale risk score calculations', async () => {
      const complexBoard = PerformanceDataGenerator.generateLargeBoardMemberDataset(40)
      
      const riskCalculations = complexBoard.slice(0, 10).map(member => 
        complianceService.calculateRiskScore(member, complexBoard)
      )

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => await Promise.all(riskCalculations),
        'risk_score_calculations',
        5
      )

      expect(avgTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result).toHaveLength(10)
      expect(result.every(score => score.score >= 0 && score.score <= 100)).toBe(true)
    })
  })

  describe('Voice Command Service Performance', () => {
    let voiceService: VoiceCommandService

    beforeEach(() => {
      // Mock browser APIs for testing
      global.window = {
        dispatchEvent: jest.fn()
      } as any
      
      voiceService = new VoiceCommandService()
    })

    it('should process voice commands quickly', async () => {
      const commands = [
        'Add John Smith to the board as admin',
        'Find members with finance experience',
        'Show board performance metrics',
        'Export member data as PDF',
        'Search for Sarah Johnson'
      ]

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const processedCommands = []
          for (const command of commands) {
            const processed = await (voiceService as any).processVoiceCommand(
              command,
              0.9,
              'test-user'
            )
            processedCommands.push(processed)
          }
          return processedCommands
        },
        'voice_command_processing',
        10
      )

      expect(avgTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(result).toHaveLength(5)
      expect(result.every(cmd => cmd.status !== undefined)).toBe(true)
    })

    it('should handle rapid command succession efficiently', async () => {
      const rapidCommands = Array.from({ length: 20 }, (_, i) => 
        `Command number ${i + 1}`
      )

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const processPromises = rapidCommands.map((command, i) =>
            (voiceService as any).processVoiceCommand(command, 0.8, `user-${i}`)
          )
          return await Promise.all(processPromises)
        },
        'rapid_voice_commands',
        5
      )

      expect(avgTime).toBeLessThan(3000) // Should handle all within 3 seconds
      expect(result).toHaveLength(20)
    })

    it('should maintain intent analysis performance', async () => {
      const complexQueries = [
        'Add Sarah Johnson with 15 years of financial oversight experience to the board as an admin member with expertise in regulatory compliance and audit committee leadership',
        'Find all members from healthcare industry with digital transformation background and show their performance metrics with diversity considerations',
        'Generate comprehensive analytics report including board dynamics, risk assessment, and strategic recommendations for the next quarter'
      ]

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const analysisResults = []
          for (const query of complexQueries) {
            const analysis = await (voiceService as any).analyzeIntent(query)
            analysisResults.push(analysis)
          }
          return analysisResults
        },
        'complex_intent_analysis',
        10
      )

      expect(avgTime).toBeLessThan(1500) // Should complete within 1.5 seconds
      expect(result).toHaveLength(3)
      expect(result.every(analysis => analysis.intent !== 'unknown')).toBe(true)
    })

    it('should efficiently manage command history', async () => {
      // Generate large command history
      const historySize = 1000
      const commands = Array.from({ length: historySize }, (_, i) => ({
        id: `cmd-${i}`,
        text: `Command ${i}`,
        status: 'completed' as const,
        timestamp: new Date(),
        confidence: 0.8 + Math.random() * 0.2
      }))

      const { avgTime } = await performanceTester.measureExecutionTime(
        async () => {
          // Simulate adding commands to history
          for (const command of commands.slice(0, 100)) {
            ;(voiceService as any).commandHistory.push(command)
          }
          
          // Test history retrieval
          const history = voiceService.getCommandHistory()
          return history
        },
        'command_history_management',
        5
      )

      expect(avgTime).toBeLessThan(100) // Should be very fast (< 100ms)
    })

    it('should handle biometric processing efficiently', async () => {
      const mockAudioData = new Float32Array(44100) // 1 second of audio at 44.1kHz
      for (let i = 0; i < mockAudioData.length; i++) {
        mockAudioData[i] = Math.sin(i * 0.01) * 0.5 // Generate sine wave
      }

      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const characteristics = (voiceService as any).extractVoiceCharacteristics(mockAudioData)
          const similarity = await voiceService.verifyBiometrics('test-user', mockAudioData.slice(0, 1024))
          return { characteristics, similarity }
        },
        'biometric_processing',
        20
      )

      expect(avgTime).toBeLessThan(200) // Should complete within 200ms
      expect(result.characteristics).toBeDefined()
      expect(result.similarity).toBeGreaterThanOrEqual(0)
      expect(result.similarity).toBeLessThanOrEqual(1)
    })
  })

  describe('Memory Usage and Optimization Tests', () => {
    it('should manage memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage()
      
      // Process large amounts of data
      const largeDatasets = Array.from({ length: 10 }, () => 
        PerformanceDataGenerator.generateLargeBoardMemberDataset(100)
      )
      
      const aiService = new AIMemberRecommendationsService()
      jest.spyOn(aiService as any, 'callOpenRouterAPI').mockResolvedValue({
        choices: [{ message: { content: '{"analysis": "mock"}' } }]
      })
      
      // Process all datasets
      const analysisPromises = largeDatasets.map(dataset => 
        aiService.analyzeTeamComposition(dataset)
      )
      
      const results = await Promise.all(analysisPromises)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
      expect(results).toHaveLength(10)
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
    })

    it('should handle concurrent operations without memory leaks', async () => {
      const initialMemory = process.memoryUsage()
      
      const services = {
        ai: new AIMemberRecommendationsService(),
        compliance: new AdvancedComplianceService(),
        voice: new VoiceCommandService()
      }
      
      // Mock external calls
      jest.spyOn(services.ai as any, 'callOpenRouterAPI').mockResolvedValue({
        choices: [{ message: { content: '{"mock": true}' } }]
      })
      jest.spyOn(services.compliance as any, 'callComplianceAPI').mockResolvedValue({
        compliant: true
      })
      
      // Run concurrent operations
      const operations = Array.from({ length: 50 }, async (_, i) => {
        const board = PerformanceDataGenerator.generateLargeBoardMemberDataset(5)
        
        const aiAnalysis = services.ai.analyzeTeamComposition(board)
        const complianceCheck = services.compliance.performComplianceCheck(
          board[0], 
          `org-${i}` as any, 
          board
        )
        const voiceCommand = (services.voice as any).processVoiceCommand(
          `Command ${i}`,
          0.9,
          `user-${i}`
        )
        
        return Promise.all([aiAnalysis, complianceCheck, voiceCommand])
      })
      
      const results = await Promise.all(operations)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory increase should be controlled
      expect(memoryIncrease).toBeLessThan(150 * 1024 * 1024) // Less than 150MB
      expect(results).toHaveLength(50)
    })
  })

  describe('Scalability Benchmarks', () => {
    it('should maintain linear performance scaling', async () => {
      const aiService = new AIMemberRecommendationsService()
      jest.spyOn(aiService as any, 'callOpenRouterAPI').mockResolvedValue({
        choices: [{ message: { content: '{"analysis": "mock"}' } }]
      })
      
      const datasetSizes = [10, 25, 50, 100, 200]
      const performanceResults: Record<number, number> = {}
      
      for (const size of datasetSizes) {
        const dataset = PerformanceDataGenerator.generateLargeBoardMemberDataset(size)
        
        const { avgTime } = await performanceTester.measureExecutionTime(
          async () => await aiService.analyzeTeamComposition(dataset),
          `analysis_size_${size}`,
          3
        )
        
        performanceResults[size] = avgTime
      }
      
      // Performance should scale reasonably (not exponentially)
      const scalingRatio = performanceResults[200] / performanceResults[10]
      expect(scalingRatio).toBeLessThan(50) // Should not be more than 50x slower for 20x data
      
      // Log scaling results
      console.log('Scaling Performance Results:', performanceResults)
    })

    it('should handle enterprise-level concurrent users', async () => {
      const services = {
        ai: new AIMemberRecommendationsService(),
        compliance: new AdvancedComplianceService()
      }
      
      // Mock services
      jest.spyOn(services.ai as any, 'callOpenRouterAPI').mockResolvedValue({
        choices: [{ message: { content: '{"recommendations": []}' } }]
      })
      jest.spyOn(services.compliance as any, 'callComplianceAPI').mockResolvedValue({
        compliant: true
      })
      
      const concurrentUsers = 100
      const operationsPerUser = 3
      
      const { avgTime, result } = await performanceTester.measureExecutionTime(
        async () => {
          const userOperations = Array.from({ length: concurrentUsers }, async (_, userId) => {
            const board = PerformanceDataGenerator.generateLargeBoardMemberDataset(10)
            
            const operations = Array.from({ length: operationsPerUser }, async (_, opId) => {
              if (opId === 0) {
                return services.ai.getRecommendations(
                  `vault-${userId}` as any,
                  `org-${userId}` as any,
                  board,
                  { required_skills: ['Leadership'], preferred_experience: 5 }
                )
              } else if (opId === 1) {
                return services.compliance.performComplianceCheck(
                  board[0],
                  `org-${userId}` as any,
                  board
                )
              } else {
                return services.ai.analyzeTeamComposition(board)
              }
            })
            
            return Promise.all(operations)
          })
          
          return Promise.all(userOperations)
        },
        'enterprise_concurrent_load',
        1
      )
      
      // Should handle enterprise load within reasonable time
      expect(avgTime).toBeLessThan(30000) // 30 seconds for 100 concurrent users
      expect(result).toHaveLength(concurrentUsers)
      
      console.log(`Enterprise Load Test: ${concurrentUsers} users, ${operationsPerUser} ops each = ${avgTime}ms total`)
    })
  })
})

// Export performance testing utilities for use in other tests
export { PerformanceTester, PerformanceDataGenerator }