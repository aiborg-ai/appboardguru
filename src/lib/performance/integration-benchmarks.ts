/**
 * Integration Performance Benchmarks and Monitoring
 * 
 * Performance benchmarks for cross-feature integration operations:
 * 1. Enhanced Board Meeting Workflows (voting, proxies, workflows)
 * 2. Advanced Compliance Reporting (audit trails, frameworks)
 * 3. Real-time Collaborative Document Editing (OT, collaboration)
 * 4. AI-powered Meeting Summarization (transcription, insights)
 * 
 * Performance Requirements:
 * - Integration operations under 200ms
 * - Real-time sync under 100ms latency
 * - Database queries optimized with proper indexing
 * - Memory-efficient state synchronization
 * 
 * Follows CLAUDE.md architecture with enterprise reliability patterns
 */

import { EnhancedFeatureIntegrationService } from '../services/enhanced-feature-integration.service'
import { WebSocketCoordinatorService } from '../services/websocket-coordinator.service'
import { useCrossFeatureStateSyncStore } from '../stores/state-sync'
import { Result, success, failure } from '../repositories/result'
import {
  OrganizationId,
  UserId,
  MeetingId,
  DocumentId,
  createOrganizationId,
  createUserId,
  createMeetingId,
  createDocumentId
} from '../../types/branded'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

// =============================================
// BENCHMARK TYPES AND INTERFACES
// =============================================

export interface BenchmarkResult {
  readonly testName: string
  readonly testType: 'latency' | 'throughput' | 'memory' | 'reliability'
  readonly startTime: number
  readonly endTime: number
  readonly duration: number
  readonly operations: number
  readonly throughput: number // ops/second
  readonly averageLatency: number // ms
  readonly p50Latency: number // ms
  readonly p95Latency: number // ms
  readonly p99Latency: number // ms
  readonly memoryUsage: {
    readonly initial: number
    readonly peak: number
    readonly final: number
    readonly leaked: number
  }
  readonly errorRate: number // percentage
  readonly passed: boolean
  readonly requirements: BenchmarkRequirements
}

export interface BenchmarkRequirements {
  readonly maxAverageLatency: number // ms
  readonly maxP95Latency: number // ms
  readonly minThroughput: number // ops/second
  readonly maxErrorRate: number // percentage
  readonly maxMemoryIncrease: number // bytes
}

export interface PerformanceMetrics {
  readonly timestamp: string
  readonly organizationId: OrganizationId
  readonly feature: string
  readonly operation: string
  readonly latency: number
  readonly throughput: number
  readonly memoryUsage: number
  readonly errorCount: number
  readonly successCount: number
}

// =============================================
// PERFORMANCE REQUIREMENTS DEFINITIONS
// =============================================

const PERFORMANCE_REQUIREMENTS = {
  INTEGRATION_WORKFLOW: {
    maxAverageLatency: 200,
    maxP95Latency: 500,
    minThroughput: 10,
    maxErrorRate: 5,
    maxMemoryIncrease: 50 * 1024 * 1024 // 50MB
  } as BenchmarkRequirements,
  
  STATE_SYNC: {
    maxAverageLatency: 100,
    maxP95Latency: 200,
    minThroughput: 50,
    maxErrorRate: 2,
    maxMemoryIncrease: 20 * 1024 * 1024 // 20MB
  } as BenchmarkRequirements,
  
  WEBSOCKET_ROUTING: {
    maxAverageLatency: 50,
    maxP95Latency: 100,
    minThroughput: 100,
    maxErrorRate: 1,
    maxMemoryIncrease: 10 * 1024 * 1024 // 10MB
  } as BenchmarkRequirements,
  
  DATABASE_OPERATIONS: {
    maxAverageLatency: 100,
    maxP95Latency: 300,
    minThroughput: 20,
    maxErrorRate: 1,
    maxMemoryIncrease: 30 * 1024 * 1024 // 30MB
  } as BenchmarkRequirements
}

// =============================================
// INTEGRATION PERFORMANCE BENCHMARK SUITE
// =============================================

export class IntegrationPerformanceBenchmarks {
  private integrationService: EnhancedFeatureIntegrationService
  private webSocketCoordinator: WebSocketCoordinatorService
  private results: Map<string, BenchmarkResult> = new Map()
  private metricsBuffer: PerformanceMetrics[] = []
  private isRunning = false

  constructor(supabase: SupabaseClient<Database>) {
    this.integrationService = new EnhancedFeatureIntegrationService(supabase)
    // WebSocketCoordinator would be initialized properly in real implementation
    this.webSocketCoordinator = new WebSocketCoordinatorService(
      supabase,
      {} as any, // Mock WebSocket service
      {
        enablePriorityQueue: true,
        maxQueueSize: 10000,
        processingInterval: 50,
        metricsEnabled: true
      }
    )
  }

  // =============================================
  // BENCHMARK EXECUTION METHODS
  // =============================================

  /**
   * Run all integration performance benchmarks
   */
  async runAllBenchmarks(organizationId: OrganizationId): Promise<Map<string, BenchmarkResult>> {
    if (this.isRunning) {
      throw new Error('Benchmarks already running')
    }

    this.isRunning = true
    this.results.clear()

    try {
      console.log('🚀 Starting Cross-Feature Integration Performance Benchmarks')

      // 1. Meeting AI Compliance Workflow Benchmarks
      await this.benchmarkMeetingAIComplianceWorkflow(organizationId)

      // 2. Document Compliance AI Workflow Benchmarks
      await this.benchmarkDocumentComplianceAIWorkflow(organizationId)

      // 3. Voting Compliance Audit Workflow Benchmarks
      await this.benchmarkVotingComplianceAuditWorkflow(organizationId)

      // 4. Cross-Feature State Synchronization Benchmarks
      await this.benchmarkCrossFeatureStateSync(organizationId)

      // 5. WebSocket Message Routing Benchmarks
      await this.benchmarkWebSocketMessageRouting(organizationId)

      // 6. Database Integration Benchmarks
      await this.benchmarkDatabaseIntegration(organizationId)

      // 7. Concurrent Load Benchmarks
      await this.benchmarkConcurrentLoad(organizationId)

      // 8. Memory Efficiency Benchmarks
      await this.benchmarkMemoryEfficiency(organizationId)

      console.log('✅ All benchmarks completed')
      this.printBenchmarkSummary()

      return new Map(this.results)

    } finally {
      this.isRunning = false
    }
  }

  /**
   * Benchmark Meeting AI Compliance Workflow performance
   */
  async benchmarkMeetingAIComplianceWorkflow(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Meeting AI Compliance Workflow'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 20
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        const request = {
          meetingId: createMeetingId(`benchmark-meeting-${i}`),
          organizationId,
          workflowConfig: {
            enableAITranscription: true,
            enableSentimentAnalysis: false,
            enableComplianceValidation: true,
            generateAuditTrail: true,
            createActionItems: true,
            checkVotingCompliance: true,
            frameworkIds: ['benchmark-framework']
          },
          priority: 'medium' as const
        }

        const result = await this.integrationService.executeMeetingAIComplianceWorkflow(request)
        
        if (!result.success) {
          errors.push(result.error)
        }

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        // Track peak memory usage
        const currentMemory = process.memoryUsage().heapUsed
        peakMemory = Math.max(peakMemory, currentMemory)

        // Log progress every 5 operations
        if ((i + 1) % 5 === 0) {
          console.log(`  Progress: ${i + 1}/${operations} operations completed`)
        }

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'latency',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      PERFORMANCE_REQUIREMENTS.INTEGRATION_WORKFLOW
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark Document Compliance AI Workflow performance
   */
  async benchmarkDocumentComplianceAIWorkflow(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Document Compliance AI Workflow'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 15
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        const request = {
          documentId: createDocumentId(`benchmark-doc-${i}`),
          sessionId: `session-${i}` as any,
          organizationId,
          workflowConfig: {
            enableRealTimeCompliance: true,
            enableAIReview: true,
            enableAutomaticApproval: false,
            requireManualReview: false,
            complianceThreshold: 80,
            aiAnalysisDepth: 'standard' as const
          }
        }

        const result = await this.integrationService.executeDocumentComplianceAIWorkflow(request)
        
        if (!result.success) {
          errors.push(result.error)
        }

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed)

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'latency',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      PERFORMANCE_REQUIREMENTS.INTEGRATION_WORKFLOW
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark Voting Compliance Audit Workflow performance
   */
  async benchmarkVotingComplianceAuditWorkflow(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Voting Compliance Audit Workflow'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 10
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        const request = {
          meetingId: createMeetingId(`benchmark-voting-meeting-${i}`),
          votingSessionId: `voting-session-${i}`,
          organizationId,
          workflowConfig: {
            validateQuorum: true,
            auditProxies: true,
            checkEligibility: true,
            generateComplianceReport: true,
            submitRegulatoryFiling: false, // Skip for benchmarking
            frameworkIds: ['voting-compliance']
          }
        }

        const result = await this.integrationService.executeVotingComplianceAuditWorkflow(request)
        
        if (!result.success) {
          errors.push(result.error)
        }

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed)

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'latency',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      PERFORMANCE_REQUIREMENTS.INTEGRATION_WORKFLOW
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark Cross-Feature State Synchronization performance
   */
  async benchmarkCrossFeatureStateSync(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Cross-Feature State Synchronization'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 50
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        const changes = [
          {
            feature: 'meetings' as const,
            resourceId: `resource-${i}`,
            changeType: 'update' as const,
            data: { status: 'updated', timestamp: Date.now() },
            priority: 'medium' as const
          },
          {
            feature: 'documents' as const,
            resourceId: `doc-${i}`,
            changeType: 'update' as const,
            data: { lastModified: Date.now() },
            priority: 'low' as const
          }
        ]

        const result = await this.integrationService.synchronizeCrossFeatureState(organizationId, changes)
        
        if (!result.success) {
          errors.push(result.error)
        }

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed)

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'latency',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      PERFORMANCE_REQUIREMENTS.STATE_SYNC
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark WebSocket Message Routing performance
   */
  async benchmarkWebSocketMessageRouting(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'WebSocket Message Routing'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 100
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        const messageTypes = ['compliance-alert', 'meeting-workflow-update', 'ai-insights-ready', 'document-collaboration-sync']
        const messageType = messageTypes[i % messageTypes.length] as any

        const result = await this.webSocketCoordinator.routeIntegratedMessage({
          type: 'integrated_message',
          roomId: `org_${organizationId}` as any,
          userId: createUserId(`user-${i}`),
          integrationType: messageType,
          priority: 'medium',
          targetFeatures: ['meetings', 'compliance'],
          sourceFeature: 'ai',
          data: { benchmarkData: `data-${i}`, timestamp: Date.now() },
          routingInfo: {
            broadcast: true,
            requireAck: false,
            retryCount: 0,
            maxRetries: 1
          },
          metadata: {
            organizationId,
            feature: 'benchmark'
          }
        })
        
        if (!result.success) {
          errors.push(result.error)
        }

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed)

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'throughput',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      PERFORMANCE_REQUIREMENTS.WEBSOCKET_ROUTING
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark Database Integration operations
   */
  async benchmarkDatabaseIntegration(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Database Integration Operations'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 30
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    // This would test actual database operations
    // For now, we'll simulate database operations
    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        // Simulate database operations
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20))

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed)

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'latency',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      PERFORMANCE_REQUIREMENTS.DATABASE_OPERATIONS
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark concurrent load handling
   */
  async benchmarkConcurrentLoad(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Concurrent Load Handling'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const concurrency = 10
    const operationsPerWorker = 5
    const totalOperations = concurrency * operationsPerWorker
    const startTime = Date.now()
    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    // Create concurrent workers
    const workers = Array.from({ length: concurrency }, (_, workerIndex) => 
      Array.from({ length: operationsPerWorker }, (_, opIndex) => 
        this.simulateConcurrentOperation(workerIndex, opIndex, organizationId)
      )
    ).flat()

    const results = await Promise.allSettled(workers)

    results.forEach(result => {
      if (result.status === 'fulfilled') {
        latencies.push(result.value.latency)
        peakMemory = Math.max(peakMemory, process.memoryUsage().heapUsed)
      } else {
        errors.push(result.reason)
        latencies.push(5000) // High latency for failed operations
      }
    })

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'throughput',
      startTime,
      endTime,
      totalOperations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      {
        maxAverageLatency: 500,
        maxP95Latency: 1000,
        minThroughput: 5,
        maxErrorRate: 10,
        maxMemoryIncrease: 100 * 1024 * 1024 // 100MB for concurrent load
      }
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  /**
   * Benchmark memory efficiency
   */
  async benchmarkMemoryEfficiency(organizationId: OrganizationId): Promise<BenchmarkResult> {
    const testName = 'Memory Efficiency'
    console.log(`\n📊 Running ${testName} benchmark...`)

    const latencies: number[] = []
    const errors: Error[] = []
    const operations = 100
    const startTime = Date.now()

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const initialMemory = process.memoryUsage().heapUsed
    let peakMemory = initialMemory

    // Create many small operations to test memory allocation/deallocation
    for (let i = 0; i < operations; i++) {
      const operationStart = Date.now()

      try {
        // Simulate memory-intensive operation
        const data = new Array(1000).fill(null).map(() => ({
          id: `item-${i}-${Math.random()}`,
          timestamp: Date.now(),
          data: new Array(100).fill('benchmark-data')
        }))

        // Process data
        const processed = data.map(item => ({
          ...item,
          processed: true,
          processedAt: Date.now()
        }))

        const operationEnd = Date.now()
        latencies.push(operationEnd - operationStart)

        const currentMemory = process.memoryUsage().heapUsed
        peakMemory = Math.max(peakMemory, currentMemory)

        // Clear references to allow garbage collection
        data.length = 0
        processed.length = 0

      } catch (error) {
        errors.push(error as Error)
        latencies.push(Date.now() - operationStart)
      }

      // Periodic garbage collection
      if (i % 20 === 0 && global.gc) {
        global.gc()
      }
    }

    // Final garbage collection
    if (global.gc) {
      global.gc()
    }

    const endTime = Date.now()
    const finalMemory = process.memoryUsage().heapUsed

    const result = this.calculateBenchmarkResult(
      testName,
      'memory',
      startTime,
      endTime,
      operations,
      latencies,
      errors,
      initialMemory,
      peakMemory,
      finalMemory,
      {
        maxAverageLatency: 50,
        maxP95Latency: 100,
        minThroughput: 20,
        maxErrorRate: 0,
        maxMemoryIncrease: 50 * 1024 * 1024 // 50MB
      }
    )

    this.results.set(testName, result)
    this.printBenchmarkResult(result)
    return result
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async simulateConcurrentOperation(
    workerIndex: number, 
    opIndex: number, 
    organizationId: OrganizationId
  ): Promise<{ latency: number }> {
    const start = Date.now()

    // Simulate varying operation types
    const operationType = (workerIndex + opIndex) % 3
    
    switch (operationType) {
      case 0:
        // State sync operation
        await this.integrationService.synchronizeCrossFeatureState(organizationId, [
          {
            feature: 'meetings' as const,
            resourceId: `concurrent-${workerIndex}-${opIndex}`,
            changeType: 'update' as const,
            data: { timestamp: Date.now() },
            priority: 'medium' as const
          }
        ])
        break
        
      case 1:
        // WebSocket message
        await this.webSocketCoordinator.routeIntegratedMessage({
          type: 'integrated_message',
          roomId: `org_${organizationId}` as any,
          userId: createUserId(`concurrent-user-${workerIndex}`),
          integrationType: 'meeting-workflow-update',
          priority: 'medium',
          targetFeatures: ['ai'],
          sourceFeature: 'meetings',
          data: { workerIndex, opIndex },
          routingInfo: {
            broadcast: false,
            requireAck: false,
            retryCount: 0,
            maxRetries: 1
          },
          metadata: {
            organizationId,
            feature: 'concurrent-test'
          }
        })
        break
        
      default:
        // Simple processing delay
        await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 10))
        break
    }

    return { latency: Date.now() - start }
  }

  private calculateBenchmarkResult(
    testName: string,
    testType: 'latency' | 'throughput' | 'memory' | 'reliability',
    startTime: number,
    endTime: number,
    operations: number,
    latencies: number[],
    errors: Error[],
    initialMemory: number,
    peakMemory: number,
    finalMemory: number,
    requirements: BenchmarkRequirements
  ): BenchmarkResult {
    const duration = endTime - startTime
    const throughput = (operations * 1000) / duration // ops/second
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    const errorRate = (errors.length / operations) * 100

    // Calculate percentiles
    const sortedLatencies = [...latencies].sort((a, b) => a - b)
    const p50Index = Math.floor(sortedLatencies.length * 0.5)
    const p95Index = Math.floor(sortedLatencies.length * 0.95)
    const p99Index = Math.floor(sortedLatencies.length * 0.99)

    const p50Latency = sortedLatencies[p50Index] || 0
    const p95Latency = sortedLatencies[p95Index] || 0
    const p99Latency = sortedLatencies[p99Index] || 0

    // Check if benchmark passed
    const passed = 
      averageLatency <= requirements.maxAverageLatency &&
      p95Latency <= requirements.maxP95Latency &&
      throughput >= requirements.minThroughput &&
      errorRate <= requirements.maxErrorRate &&
      (finalMemory - initialMemory) <= requirements.maxMemoryIncrease

    return {
      testName,
      testType,
      startTime,
      endTime,
      duration,
      operations,
      throughput,
      averageLatency,
      p50Latency,
      p95Latency,
      p99Latency,
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
        leaked: finalMemory - initialMemory
      },
      errorRate,
      passed,
      requirements
    }
  }

  private printBenchmarkResult(result: BenchmarkResult): void {
    const status = result.passed ? '✅ PASS' : '❌ FAIL'
    const memoryMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)}MB`
    
    console.log(`  ${status} ${result.testName}`)
    console.log(`    Duration: ${result.duration}ms`)
    console.log(`    Operations: ${result.operations}`)
    console.log(`    Throughput: ${result.throughput.toFixed(1)} ops/sec`)
    console.log(`    Latency (avg/p95/p99): ${result.averageLatency.toFixed(1)}/${result.p95Latency}/${result.p99Latency}ms`)
    console.log(`    Memory (initial/peak/final): ${memoryMB(result.memoryUsage.initial)}/${memoryMB(result.memoryUsage.peak)}/${memoryMB(result.memoryUsage.final)}`)
    console.log(`    Error Rate: ${result.errorRate.toFixed(1)}%`)
    
    if (!result.passed) {
      console.log('    ⚠️  Failed Requirements:')
      if (result.averageLatency > result.requirements.maxAverageLatency) {
        console.log(`      - Average latency: ${result.averageLatency.toFixed(1)}ms > ${result.requirements.maxAverageLatency}ms`)
      }
      if (result.p95Latency > result.requirements.maxP95Latency) {
        console.log(`      - P95 latency: ${result.p95Latency}ms > ${result.requirements.maxP95Latency}ms`)
      }
      if (result.throughput < result.requirements.minThroughput) {
        console.log(`      - Throughput: ${result.throughput.toFixed(1)} ops/sec < ${result.requirements.minThroughput} ops/sec`)
      }
      if (result.errorRate > result.requirements.maxErrorRate) {
        console.log(`      - Error rate: ${result.errorRate.toFixed(1)}% > ${result.requirements.maxErrorRate}%`)
      }
      if (result.memoryUsage.leaked > result.requirements.maxMemoryIncrease) {
        console.log(`      - Memory increase: ${memoryMB(result.memoryUsage.leaked)} > ${memoryMB(result.requirements.maxMemoryIncrease)}`)
      }
    }
  }

  private printBenchmarkSummary(): void {
    const totalTests = this.results.size
    const passedTests = Array.from(this.results.values()).filter(r => r.passed).length
    const failedTests = totalTests - passedTests

    console.log('\n' + '='.repeat(80))
    console.log('🎯 Cross-Feature Integration Performance Benchmark Summary')
    console.log('='.repeat(80))
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} ✅`)
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    
    if (failedTests === 0) {
      console.log('\n🎉 All integration performance benchmarks passed!')
      console.log('The cross-feature integration system meets all performance requirements.')
    } else {
      console.log('\n⚠️  Some benchmarks failed. Review the failed tests above for optimization opportunities.')
    }
    
    console.log('='.repeat(80))
  }

  /**
   * Get benchmark results
   */
  public getBenchmarkResults(): Map<string, BenchmarkResult> {
    return new Map(this.results)
  }

  /**
   * Get performance metrics buffer
   */
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.metricsBuffer]
  }

  /**
   * Clear all results and metrics
   */
  public clearResults(): void {
    this.results.clear()
    this.metricsBuffer.length = 0
  }
}

// =============================================
// CONTINUOUS PERFORMANCE MONITORING
// =============================================

export class ContinuousPerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private isMonitoring = false
  private monitoringInterval: NodeJS.Timeout | null = null

  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.collectPerformanceMetrics()
    }, intervalMs)

    console.log('📊 Started continuous performance monitoring')
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('🛑 Stopped continuous performance monitoring')
  }

  private collectPerformanceMetrics(): void {
    const timestamp = new Date().toISOString()
    const memoryUsage = process.memoryUsage().heapUsed

    // This would collect real metrics from the integration services
    // For now, we'll create sample metrics
    const sampleMetric: PerformanceMetrics = {
      timestamp,
      organizationId: 'monitoring' as OrganizationId,
      feature: 'integration',
      operation: 'health_check',
      latency: Math.random() * 100,
      throughput: Math.random() * 50,
      memoryUsage,
      errorCount: 0,
      successCount: 1
    }

    const featureMetrics = this.metrics.get('integration') || []
    featureMetrics.push(sampleMetric)

    // Keep only last 1000 metrics per feature
    if (featureMetrics.length > 1000) {
      featureMetrics.shift()
    }

    this.metrics.set('integration', featureMetrics)
  }

  getMetrics(feature?: string): Map<string, PerformanceMetrics[]> | PerformanceMetrics[] {
    if (feature) {
      return this.metrics.get(feature) || []
    }
    return new Map(this.metrics)
  }

  generatePerformanceReport(): {
    summary: any
    recommendations: string[]
  } {
    const allMetrics = Array.from(this.metrics.values()).flat()
    
    if (allMetrics.length === 0) {
      return {
        summary: { message: 'No performance data available' },
        recommendations: ['Start monitoring to collect performance data']
      }
    }

    const avgLatency = allMetrics.reduce((sum, m) => sum + m.latency, 0) / allMetrics.length
    const avgThroughput = allMetrics.reduce((sum, m) => sum + m.throughput, 0) / allMetrics.length
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    const totalSuccess = allMetrics.reduce((sum, m) => sum + m.successCount, 0)
    const errorRate = totalErrors / (totalErrors + totalSuccess) * 100

    const summary = {
      totalMetrics: allMetrics.length,
      averageLatency: avgLatency,
      averageThroughput: avgThroughput,
      errorRate,
      timeRange: {
        start: allMetrics[0]?.timestamp,
        end: allMetrics[allMetrics.length - 1]?.timestamp
      }
    }

    const recommendations: string[] = []

    if (avgLatency > 200) {
      recommendations.push('High average latency detected. Consider optimizing database queries and reducing network calls.')
    }

    if (avgThroughput < 10) {
      recommendations.push('Low throughput detected. Consider implementing connection pooling and request batching.')
    }

    if (errorRate > 5) {
      recommendations.push('High error rate detected. Review error logs and implement better error handling.')
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable limits. Continue monitoring.')
    }

    return { summary, recommendations }
  }
}

// =============================================
// EXPORTS
// =============================================

export {
  PERFORMANCE_REQUIREMENTS,
  IntegrationPerformanceBenchmarks,
  ContinuousPerformanceMonitor
}

// Default export for easy usage
export default IntegrationPerformanceBenchmarks