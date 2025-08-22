/**
 * Repository Performance Optimization Tools
 * Query optimization, connection pooling, metrics collection,
 * slow query detection, and benchmarking utilities
 */

export { QueryOptimizer, QueryAnalyzer } from './query-optimizer'
export { RepositoryBenchmark, BenchmarkSuites, BenchmarkReporter } from './benchmark-suite'
export { PerformanceMonitor } from './performance-monitor'

// Re-export types
export type { 
  QueryPlan, 
  OptimizationSuggestion,
  BenchmarkResult,
  BenchmarkConfig,
  ComparisonResult,
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceReport
} from './query-optimizer'

export type {
  BenchmarkSuite
} from './benchmark-suite'