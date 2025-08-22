/**
 * Repository Performance Benchmark Suite
 * Comprehensive benchmarking tools for measuring repository performance,
 * comparing implementations, and identifying optimization opportunities
 */

import { Result, success, failure, RepositoryError } from '../result'
import { PerformanceMonitor } from './performance-monitor'

export interface BenchmarkConfig {
  name: string
  description?: string
  iterations: number
  warmupIterations?: number
  timeoutMs?: number
  metadata?: Record<string, unknown>
}

export interface BenchmarkResult {
  name: string
  success: boolean
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  medianTime: number
  p95Time: number
  p99Time: number
  throughput: number // operations per second
  memoryUsage?: {
    heapUsed: number
    heapTotal: number
    external: number
  }
  error?: string
  metadata?: Record<string, unknown>
}

export interface ComparisonResult {
  baseline: BenchmarkResult
  comparison: BenchmarkResult
  improvement: {
    averageTime: number // percentage improvement (negative = slower)
    throughput: number
    memoryUsage: number
  }
  recommendation: string
}

export interface BenchmarkSuite {
  name: string
  description?: string
  benchmarks: BenchmarkConfig[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

/**
 * Individual benchmark runner
 */
export class RepositoryBenchmark {
  private monitor: PerformanceMonitor

  constructor(monitor?: PerformanceMonitor) {
    this.monitor = monitor || new PerformanceMonitor()
  }

  /**
   * Run a single benchmark
   */
  async run<T>(
    config: BenchmarkConfig,
    operation: () => Promise<T>
  ): Promise<Result<BenchmarkResult>> {
    try {
      const { iterations, warmupIterations = 0, timeoutMs = 30000 } = config
      const times: number[] = []
      let error: string | undefined

      // Warm up phase
      if (warmupIterations > 0) {
        for (let i = 0; i < warmupIterations; i++) {
          try {
            await this.runWithTimeout(operation, timeoutMs)
          } catch (e) {
            // Ignore warmup errors
          }
        }
      }

      // Benchmark phase
      const startMemory = process.memoryUsage()
      
      for (let i = 0; i < iterations; i++) {
        try {
          const start = process.hrtime.bigint()
          await this.runWithTimeout(operation, timeoutMs)
          const end = process.hrtime.bigint()
          
          const timeMs = Number(end - start) / 1_000_000
          times.push(timeMs)
        } catch (e) {
          error = e instanceof Error ? e.message : String(e)
          break
        }
      }

      const endMemory = process.memoryUsage()

      if (times.length === 0) {
        return failure(RepositoryError.internal(
          `Benchmark failed: ${error || 'No successful iterations'}`
        ))
      }

      // Calculate statistics
      const totalTime = times.reduce((sum, time) => sum + time, 0)
      const sortedTimes = [...times].sort((a, b) => a - b)
      
      const result: BenchmarkResult = {
        name: config.name,
        success: !error,
        iterations: times.length,
        totalTime,
        averageTime: totalTime / times.length,
        minTime: sortedTimes[0],
        maxTime: sortedTimes[sortedTimes.length - 1],
        medianTime: this.calculatePercentile(sortedTimes, 50),
        p95Time: this.calculatePercentile(sortedTimes, 95),
        p99Time: this.calculatePercentile(sortedTimes, 99),
        throughput: (times.length * 1000) / totalTime,
        memoryUsage: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external
        },
        error,
        metadata: config.metadata
      }

      return success(result)
    } catch (error) {
      return failure(RepositoryError.internal('Benchmark execution failed', error))
    }
  }

  /**
   * Compare two benchmark operations
   */
  async compare<T>(
    baselineConfig: BenchmarkConfig,
    baselineOperation: () => Promise<T>,
    comparisonConfig: BenchmarkConfig,
    comparisonOperation: () => Promise<T>
  ): Promise<Result<ComparisonResult>> {
    try {
      const baselineResult = await this.run(baselineConfig, baselineOperation)
      const comparisonResult = await this.run(comparisonConfig, comparisonOperation)

      if (!baselineResult.success) {
        return failure(RepositoryError.internal(
          `Baseline benchmark failed: ${baselineResult.error.message}`
        ))
      }

      if (!comparisonResult.success) {
        return failure(RepositoryError.internal(
          `Comparison benchmark failed: ${comparisonResult.error.message}`
        ))
      }

      const baseline = baselineResult.data
      const comparison = comparisonResult.data

      // Calculate improvements (positive = better performance)
      const avgTimeImprovement = ((baseline.averageTime - comparison.averageTime) / baseline.averageTime) * 100
      const throughputImprovement = ((comparison.throughput - baseline.throughput) / baseline.throughput) * 100
      const memoryImprovement = baseline.memoryUsage && comparison.memoryUsage ?
        ((baseline.memoryUsage.heapUsed - comparison.memoryUsage.heapUsed) / baseline.memoryUsage.heapUsed) * 100 : 0

      // Generate recommendation
      const recommendation = this.generateRecommendation(
        avgTimeImprovement,
        throughputImprovement,
        memoryImprovement
      )

      const result: ComparisonResult = {
        baseline,
        comparison,
        improvement: {
          averageTime: avgTimeImprovement,
          throughput: throughputImprovement,
          memoryUsage: memoryImprovement
        },
        recommendation
      }

      return success(result)
    } catch (error) {
      return failure(RepositoryError.internal('Benchmark comparison failed', error))
    }
  }

  /**
   * Run a benchmark suite
   */
  async runSuite<T>(
    suite: BenchmarkSuite,
    operationFactory: (config: BenchmarkConfig) => () => Promise<T>
  ): Promise<Result<BenchmarkResult[]>> {
    try {
      const results: BenchmarkResult[] = []

      // Setup
      if (suite.setup) {
        await suite.setup()
      }

      try {
        // Run each benchmark
        for (const config of suite.benchmarks) {
          const operation = operationFactory(config)
          const result = await this.run(config, operation)
          
          if (result.success) {
            results.push(result.data)
          } else {
            console.warn(`Benchmark ${config.name} failed:`, result.error.message)
            results.push({
              name: config.name,
              success: false,
              iterations: 0,
              totalTime: 0,
              averageTime: 0,
              minTime: 0,
              maxTime: 0,
              medianTime: 0,
              p95Time: 0,
              p99Time: 0,
              throughput: 0,
              error: result.error.message
            })
          }
        }
      } finally {
        // Teardown
        if (suite.teardown) {
          await suite.teardown()
        }
      }

      return success(results)
    } catch (error) {
      return failure(RepositoryError.internal('Benchmark suite execution failed', error))
    }
  }

  private async runWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    })

    return Promise.race([operation(), timeoutPromise])
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))]
  }

  private generateRecommendation(
    avgTimeImprovement: number,
    throughputImprovement: number,
    memoryImprovement: number
  ): string {
    const recommendations: string[] = []

    if (avgTimeImprovement > 20) {
      recommendations.push('Significant performance improvement - consider adopting this approach')
    } else if (avgTimeImprovement > 10) {
      recommendations.push('Moderate performance improvement - beneficial in high-load scenarios')
    } else if (avgTimeImprovement < -10) {
      recommendations.push('Performance regression detected - investigate bottlenecks')
    } else {
      recommendations.push('Similar performance - consider other factors like maintainability')
    }

    if (throughputImprovement > 30) {
      recommendations.push('Excellent throughput improvement')
    } else if (throughputImprovement < -20) {
      recommendations.push('Throughput regression - may impact scalability')
    }

    if (memoryImprovement > 15) {
      recommendations.push('Good memory efficiency improvement')
    } else if (memoryImprovement < -20) {
      recommendations.push('Memory usage increased significantly - monitor for leaks')
    }

    return recommendations.join('. ')
  }
}

/**
 * Pre-built benchmark suites for common scenarios
 */
export class BenchmarkSuites {
  /**
   * Cache performance benchmark suite
   */
  static createCacheBenchmarks(recordCount: number = 1000): BenchmarkSuite {
    return {
      name: 'Cache Performance',
      description: 'Compare cached vs uncached repository operations',
      benchmarks: [
        {
          name: 'Uncached Query',
          description: 'Direct database query without caching',
          iterations: 100,
          warmupIterations: 10,
          metadata: { cacheEnabled: false, recordCount }
        },
        {
          name: 'Cached Query - Cold Cache',
          description: 'First query to populate cache',
          iterations: 100,
          warmupIterations: 0,
          metadata: { cacheEnabled: true, cacheState: 'cold', recordCount }
        },
        {
          name: 'Cached Query - Warm Cache',
          description: 'Subsequent queries from cache',
          iterations: 1000,
          warmupIterations: 100,
          metadata: { cacheEnabled: true, cacheState: 'warm', recordCount }
        }
      ]
    }
  }

  /**
   * Batch operations benchmark suite
   */
  static createBatchBenchmarks(batchSizes: number[] = [1, 10, 50, 100]): BenchmarkSuite {
    return {
      name: 'Batch Operations Performance',
      description: 'Compare individual vs batch operations at different scales',
      benchmarks: batchSizes.flatMap(size => [
        {
          name: `Individual Operations (${size} items)`,
          description: `Execute ${size} individual operations`,
          iterations: 50,
          warmupIterations: 5,
          metadata: { operationType: 'individual', batchSize: size }
        },
        {
          name: `Batch Operations (${size} items)`,
          description: `Execute 1 batch of ${size} operations`,
          iterations: 50,
          warmupIterations: 5,
          metadata: { operationType: 'batch', batchSize: size }
        }
      ])
    }
  }

  /**
   * Query optimization benchmark suite
   */
  static createQueryOptimizationBenchmarks(): BenchmarkSuite {
    return {
      name: 'Query Optimization',
      description: 'Compare optimized vs unoptimized queries',
      benchmarks: [
        {
          name: 'SELECT * Query',
          description: 'Unoptimized query selecting all columns',
          iterations: 200,
          warmupIterations: 20,
          metadata: { queryType: 'select_all' }
        },
        {
          name: 'Selective Column Query',
          description: 'Optimized query selecting specific columns',
          iterations: 200,
          warmupIterations: 20,
          metadata: { queryType: 'selective_columns' }
        },
        {
          name: 'Unindexed Filter',
          description: 'Query with filter on non-indexed column',
          iterations: 100,
          warmupIterations: 10,
          metadata: { queryType: 'unindexed_filter' }
        },
        {
          name: 'Indexed Filter',
          description: 'Query with filter on indexed column',
          iterations: 100,
          warmupIterations: 10,
          metadata: { queryType: 'indexed_filter' }
        },
        {
          name: 'Complex Join',
          description: 'Multi-table join query',
          iterations: 50,
          warmupIterations: 5,
          metadata: { queryType: 'complex_join' }
        },
        {
          name: 'Optimized Join',
          description: 'Optimized join with proper indexing',
          iterations: 50,
          warmupIterations: 5,
          metadata: { queryType: 'optimized_join' }
        }
      ]
    }
  }

  /**
   * Transaction performance benchmark suite
   */
  static createTransactionBenchmarks(): BenchmarkSuite {
    return {
      name: 'Transaction Performance',
      description: 'Compare different transaction strategies',
      benchmarks: [
        {
          name: 'No Transaction',
          description: 'Individual operations without transaction wrapping',
          iterations: 100,
          warmupIterations: 10,
          metadata: { transactionType: 'none' }
        },
        {
          name: 'Simple Transaction',
          description: 'Operations wrapped in simple transaction',
          iterations: 100,
          warmupIterations: 10,
          metadata: { transactionType: 'simple' }
        },
        {
          name: 'Saga Transaction',
          description: 'Operations using saga pattern',
          iterations: 50,
          warmupIterations: 5,
          metadata: { transactionType: 'saga' }
        },
        {
          name: 'Optimistic Locking',
          description: 'Operations with optimistic locking',
          iterations: 50,
          warmupIterations: 5,
          metadata: { transactionType: 'optimistic_lock' }
        }
      ]
    }
  }

  /**
   * Repository implementation comparison
   */
  static createImplementationComparison(): BenchmarkSuite {
    return {
      name: 'Repository Implementation Comparison',
      description: 'Compare base vs enhanced vs cached repository implementations',
      benchmarks: [
        {
          name: 'Base Repository',
          description: 'Standard repository implementation',
          iterations: 200,
          warmupIterations: 20,
          metadata: { implementation: 'base' }
        },
        {
          name: 'Enhanced Repository',
          description: 'Repository with hooks and events',
          iterations: 200,
          warmupIterations: 20,
          metadata: { implementation: 'enhanced' }
        },
        {
          name: 'Cached Repository',
          description: 'Repository with intelligent caching',
          iterations: 200,
          warmupIterations: 20,
          metadata: { implementation: 'cached' }
        },
        {
          name: 'Full-Featured Repository',
          description: 'Repository with all enhancements',
          iterations: 200,
          warmupIterations: 20,
          metadata: { implementation: 'full_featured' }
        }
      ]
    }
  }
}

/**
 * Benchmark report generator
 */
export class BenchmarkReporter {
  /**
   * Generate detailed text report
   */
  static generateReport(results: BenchmarkResult[]): string {
    const lines: string[] = []
    
    lines.push('Repository Performance Benchmark Report')
    lines.push('=' .repeat(50))
    lines.push('')

    // Summary
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    
    lines.push(`Total Benchmarks: ${results.length}`)
    lines.push(`Successful: ${successful.length}`)
    lines.push(`Failed: ${failed.length}`)
    lines.push('')

    // Individual results
    for (const result of results) {
      lines.push(`Benchmark: ${result.name}`)
      lines.push('-'.repeat(30))
      
      if (result.success) {
        lines.push(`Status: SUCCESS`)
        lines.push(`Iterations: ${result.iterations}`)
        lines.push(`Average Time: ${result.averageTime.toFixed(2)}ms`)
        lines.push(`Median Time: ${result.medianTime.toFixed(2)}ms`)
        lines.push(`Min Time: ${result.minTime.toFixed(2)}ms`)
        lines.push(`Max Time: ${result.maxTime.toFixed(2)}ms`)
        lines.push(`P95 Time: ${result.p95Time.toFixed(2)}ms`)
        lines.push(`P99 Time: ${result.p99Time.toFixed(2)}ms`)
        lines.push(`Throughput: ${result.throughput.toFixed(2)} ops/sec`)
        
        if (result.memoryUsage) {
          lines.push(`Memory Usage: ${Math.round(result.memoryUsage.heapUsed / 1024)}KB heap`)
        }
      } else {
        lines.push(`Status: FAILED`)
        lines.push(`Error: ${result.error}`)
      }
      
      lines.push('')
    }

    // Performance ranking
    if (successful.length > 1) {
      lines.push('Performance Ranking (by average time)')
      lines.push('-'.repeat(40))
      
      const ranked = successful.sort((a, b) => a.averageTime - b.averageTime)
      ranked.forEach((result, index) => {
        lines.push(`${index + 1}. ${result.name}: ${result.averageTime.toFixed(2)}ms`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Generate JSON report
   */
  static generateJSONReport(results: BenchmarkResult[]): string {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      results: results.map(result => ({
        ...result,
        // Round numbers for cleaner JSON
        averageTime: Math.round(result.averageTime * 100) / 100,
        minTime: Math.round(result.minTime * 100) / 100,
        maxTime: Math.round(result.maxTime * 100) / 100,
        medianTime: Math.round(result.medianTime * 100) / 100,
        p95Time: Math.round(result.p95Time * 100) / 100,
        p99Time: Math.round(result.p99Time * 100) / 100,
        throughput: Math.round(result.throughput * 100) / 100
      }))
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * Generate comparison report
   */
  static generateComparisonReport(comparison: ComparisonResult): string {
    const lines: string[] = []
    
    lines.push('Benchmark Comparison Report')
    lines.push('='.repeat(40))
    lines.push('')

    lines.push(`Baseline: ${comparison.baseline.name}`)
    lines.push(`Comparison: ${comparison.comparison.name}`)
    lines.push('')

    lines.push('Performance Metrics')
    lines.push('-'.repeat(20))
    lines.push(`Average Time: ${comparison.baseline.averageTime.toFixed(2)}ms → ${comparison.comparison.averageTime.toFixed(2)}ms`)
    lines.push(`Improvement: ${comparison.improvement.averageTime > 0 ? '+' : ''}${comparison.improvement.averageTime.toFixed(1)}%`)
    lines.push('')
    
    lines.push(`Throughput: ${comparison.baseline.throughput.toFixed(2)} → ${comparison.comparison.throughput.toFixed(2)} ops/sec`)
    lines.push(`Improvement: ${comparison.improvement.throughput > 0 ? '+' : ''}${comparison.improvement.throughput.toFixed(1)}%`)
    lines.push('')

    if (comparison.improvement.memoryUsage !== 0) {
      lines.push(`Memory Usage Improvement: ${comparison.improvement.memoryUsage > 0 ? '+' : ''}${comparison.improvement.memoryUsage.toFixed(1)}%`)
      lines.push('')
    }

    lines.push('Recommendation')
    lines.push('-'.repeat(15))
    lines.push(comparison.recommendation)
    lines.push('')

    return lines.join('\n')
  }
}

/**
 * Utility functions for benchmarking
 */
export class BenchmarkUtils {
  /**
   * Create mock data for benchmarks
   */
  static generateMockUsers(count: number): Array<{
    id: string
    email: string
    full_name: string
    created_at: string
  }> {
    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      full_name: `User ${i + 1}`,
      created_at: new Date().toISOString()
    }))
  }

  /**
   * Measure memory usage during operation
   */
  static async measureMemory<T>(operation: () => Promise<T>): Promise<{
    result: T
    memoryDelta: NodeJS.MemoryUsage
  }> {
    const beforeMemory = process.memoryUsage()
    const result = await operation()
    const afterMemory = process.memoryUsage()

    const memoryDelta = {
      rss: afterMemory.rss - beforeMemory.rss,
      heapTotal: afterMemory.heapTotal - beforeMemory.heapTotal,
      heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
      external: afterMemory.external - beforeMemory.external,
      arrayBuffers: afterMemory.arrayBuffers - beforeMemory.arrayBuffers
    }

    return { result, memoryDelta }
  }

  /**
   * Force garbage collection if available
   */
  static forceGC(): void {
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * Wait for next tick (useful for async benchmarks)
   */
  static async nextTick(): Promise<void> {
    return new Promise(resolve => process.nextTick(resolve))
  }
}