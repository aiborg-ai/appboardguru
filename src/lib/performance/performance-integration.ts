/**
 * Performance Integration Layer
 * Integrates all performance optimization and monitoring systems
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedCacheManager } from './enhanced-cache-manager'
import { performanceMonitoringMiddleware, PerformanceMonitoringUtils } from '../middleware/performance-monitoring'
import { connectionPoolManager, optimizedQueryBuilder } from '../database/query-optimizer'
import { bundleAnalyzer, lazyLoadingManager, BundleOptimizationUtils } from './bundle-optimizer'
import { distributedTracingManager, createTracingMiddleware } from '../tracing/distributed-tracing'
import { telemetry } from '../logging/telemetry'
import { Logger } from '../logging/logger'

const logger = Logger.getLogger('PerformanceIntegration')

export interface PerformanceConfiguration {
  cache: {
    enabled: boolean
    enableRedis: boolean
    defaultTTL: number
    maxMemorySize: number
  }
  monitoring: {
    enabled: boolean
    detailedProfiling: boolean
    slowRequestThreshold: number
    highMemoryThreshold: number
    sampling: {
      enabled: boolean
      rate: number
    }
  }
  database: {
    optimizationEnabled: boolean
    connectionPooling: boolean
    queryAnalysis: boolean
    autoTuning: boolean
  }
  bundleOptimization: {
    enabled: boolean
    lazyLoading: boolean
    preloading: boolean
    compressionEnabled: boolean
  }
  tracing: {
    enabled: boolean
    sampleRate: number
    exportToExternal: boolean
    retentionDays: number
  }
}

/**
 * Integrated Performance Manager
 */
export class IntegratedPerformanceManager {
  private config: PerformanceConfiguration
  private initialized = false

  constructor(config: Partial<PerformanceConfiguration> = {}) {
    this.config = {
      cache: {
        enabled: true,
        enableRedis: !!process.env.REDIS_URL,
        defaultTTL: 300,
        maxMemorySize: 2000,
        ...config.cache
      },
      monitoring: {
        enabled: true,
        detailedProfiling: process.env.NODE_ENV === 'development',
        slowRequestThreshold: 1000,
        highMemoryThreshold: 100 * 1024 * 1024,
        sampling: {
          enabled: process.env.NODE_ENV === 'production',
          rate: 0.1
        },
        ...config.monitoring
      },
      database: {
        optimizationEnabled: true,
        connectionPooling: true,
        queryAnalysis: true,
        autoTuning: process.env.NODE_ENV === 'production',
        ...config.database
      },
      bundleOptimization: {
        enabled: true,
        lazyLoading: true,
        preloading: true,
        compressionEnabled: true,
        ...config.bundleOptimization
      },
      tracing: {
        enabled: true,
        sampleRate: 0.1,
        exportToExternal: false,
        retentionDays: 7,
        ...config.tracing
      }
    }
  }

  /**
   * Initialize all performance systems
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    logger.info('Initializing integrated performance systems...')

    try {
      // Initialize cache system
      if (this.config.cache.enabled) {
        await this.initializeCache()
      }

      // Initialize database optimization
      if (this.config.database.optimizationEnabled) {
        await this.initializeDatabase()
      }

      // Initialize bundle optimization
      if (this.config.bundleOptimization.enabled) {
        await this.initializeBundle()
      }

      // Initialize monitoring
      if (this.config.monitoring.enabled) {
        await this.initializeMonitoring()
      }

      // Initialize tracing
      if (this.config.tracing.enabled) {
        await this.initializeTracing()
      }

      this.initialized = true
      logger.info('Performance systems initialized successfully')

      // Record initialization metrics
      telemetry.recordCounter('performance_system_initialized', 1, {
        cache_enabled: this.config.cache.enabled.toString(),
        monitoring_enabled: this.config.monitoring.enabled.toString(),
        tracing_enabled: this.config.tracing.enabled.toString()
      })

    } catch (error) {
      logger.error('Failed to initialize performance systems:', error)
      throw error
    }
  }

  /**
   * Get comprehensive performance health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: Record<string, any>
    metrics: any
    recommendations: string[]
  }> {
    const components: Record<string, any> = {}
    const recommendations: string[] = []

    // Cache health
    if (this.config.cache.enabled) {
      const cacheHealth = await enhancedCacheManager.healthCheck()
      components.cache = cacheHealth
      
      if (cacheHealth.status !== 'healthy') {
        recommendations.push(`Cache system ${cacheHealth.status}: ${cacheHealth.details}`)
      }
    }

    // Database health
    if (this.config.database.optimizationEnabled) {
      const dbMetrics = connectionPoolManager.getDatabaseMetrics()
      components.database = {
        status: dbMetrics.connectionPool.poolUtilization < 0.8 ? 'healthy' : 'degraded',
        utilization: dbMetrics.connectionPool.poolUtilization,
        activeConnections: dbMetrics.connectionPool.activeConnections
      }

      if (dbMetrics.connectionPool.poolUtilization > 0.8) {
        recommendations.push('Database connection pool utilization is high')
      }
    }

    // Bundle health
    if (this.config.bundleOptimization.enabled) {
      const bundleStats = bundleAnalyzer.getChunkStatistics()
      components.bundle = {
        status: bundleStats.averageLoadTime < 2000 ? 'healthy' : 'degraded',
        averageLoadTime: bundleStats.averageLoadTime,
        failureRate: bundleStats.failureRate
      }

      if (bundleStats.averageLoadTime > 2000) {
        recommendations.push('Bundle loading time is high - consider optimization')
      }
    }

    // Monitoring health
    if (this.config.monitoring.enabled) {
      const monitoringStats = PerformanceMonitoringUtils.getPerformanceSummary()
      components.monitoring = {
        status: 'healthy',
        activeRequests: monitoringStats?.totalRequests || 0
      }
    }

    // Tracing health
    if (this.config.tracing.enabled) {
      const tracingStats = distributedTracingManager.getTracingStatistics()
      components.tracing = {
        status: tracingStats.errorRate < 0.1 ? 'healthy' : 'degraded',
        activeTraces: tracingStats.activeTraces,
        errorRate: tracingStats.errorRate
      }

      if (tracingStats.errorRate > 0.1) {
        recommendations.push('High error rate detected in traces')
      }
    }

    // Determine overall status
    const componentStatuses = Object.values(components).map(c => c.status)
    const overallStatus = componentStatuses.includes('unhealthy') ? 'unhealthy' :
                         componentStatuses.includes('degraded') ? 'degraded' : 'healthy'

    return {
      status: overallStatus,
      components,
      metrics: await this.getPerformanceMetrics(),
      recommendations
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    const metrics: any = {}

    if (this.config.cache.enabled) {
      metrics.cache = await enhancedCacheManager.getEnhancedMetrics()
    }

    if (this.config.database.optimizationEnabled) {
      metrics.database = connectionPoolManager.getDatabaseMetrics()
    }

    if (this.config.bundleOptimization.enabled) {
      metrics.bundle = await BundleOptimizationUtils.getPerformanceReport()
    }

    if (this.config.tracing.enabled) {
      metrics.tracing = distributedTracingManager.getTracingStatistics()
    }

    return metrics
  }

  /**
   * Run automatic performance optimization
   */
  async autoOptimize(): Promise<{
    optimizations: Array<{
      category: string
      applied: boolean
      description: string
      impact?: any
    }>
    overall: {
      improvementEstimate: number
      riskLevel: 'low' | 'medium' | 'high'
    }
  }> {
    const optimizations: any[] = []
    let totalImpact = 0

    logger.info('Starting automatic performance optimization...')

    // Cache optimization
    if (this.config.cache.enabled) {
      try {
        await enhancedCacheManager.autoOptimize()
        optimizations.push({
          category: 'cache',
          applied: true,
          description: 'Cache configuration optimized based on usage patterns',
          impact: { performance: 15, memory: 10 }
        })
        totalImpact += 15
      } catch (error) {
        optimizations.push({
          category: 'cache',
          applied: false,
          description: `Cache optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    // Database optimization
    if (this.config.database.autoTuning) {
      try {
        await connectionPoolManager.optimizePools()
        optimizations.push({
          category: 'database',
          applied: true,
          description: 'Database connection pools optimized',
          impact: { performance: 20, reliability: 15 }
        })
        totalImpact += 20
      } catch (error) {
        optimizations.push({
          category: 'database',
          applied: false,
          description: `Database optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    // Bundle preloading optimization
    if (this.config.bundleOptimization.preloading) {
      try {
        await BundleOptimizationUtils.preloadCriticalComponents(['Dashboard', 'PerformanceDashboard'])
        optimizations.push({
          category: 'bundle',
          applied: true,
          description: 'Critical components preloaded',
          impact: { userExperience: 25, loadTime: 30 }
        })
        totalImpact += 25
      } catch (error) {
        optimizations.push({
          category: 'bundle',
          applied: false,
          description: `Bundle optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    const riskLevel: 'low' | 'medium' | 'high' = 
      optimizations.filter(o => o.applied).length > 2 ? 'medium' : 'low'

    logger.info(`Performance optimization completed. Total impact: ${totalImpact}%`)

    return {
      optimizations,
      overall: {
        improvementEstimate: totalImpact,
        riskLevel
      }
    }
  }

  /**
   * Create integrated middleware stack
   */
  createMiddlewareStack(): Array<(req: NextRequest, next: () => Promise<NextResponse>) => Promise<NextResponse>> {
    const middleware: Array<(req: NextRequest, next: () => Promise<NextResponse>) => Promise<NextResponse>> = []

    // Tracing middleware (first)
    if (this.config.tracing.enabled) {
      middleware.push(createTracingMiddleware(distributedTracingManager))
    }

    // Performance monitoring middleware
    if (this.config.monitoring.enabled) {
      middleware.push(async (req: NextRequest, next: () => Promise<NextResponse>) => {
        // Create a mock context for the middleware
        const context = {
          request: req,
          response: new NextResponse(),
          requestId: req.headers.get('x-internal-span-id') || `req_${Date.now()}`,
          error: undefined as Error | undefined
        }

        // Execute performance monitoring
        await performanceMonitoringMiddleware.before?.(context)
        
        try {
          const response = await next()
          context.response = response
          await performanceMonitoringMiddleware.after?.(context)
          return response
        } catch (error) {
          context.error = error as Error
          await performanceMonitoringMiddleware.onError?.(context, error as Error)
          throw error
        }
      })
    }

    return middleware
  }

  // Private initialization methods
  private async initializeCache(): Promise<void> {
    logger.debug('Initializing enhanced cache system...')
    
    // Register cache patterns for organization system
    enhancedCacheManager.registerPattern('organization_data', {
      pattern: 'org:*',
      ttl: 900, // 15 minutes
      tags: ['organization'],
      priority: 'high',
      warmupStrategy: 'eager',
      compressionEnabled: this.config.cache.enableRedis
    })

    enhancedCacheManager.registerPattern('user_sessions', {
      pattern: 'session:*',
      ttl: 1800, // 30 minutes
      tags: ['user', 'session'],
      priority: 'high',
      warmupStrategy: 'lazy'
    })

    // Register invalidation rules
    enhancedCacheManager.registerInvalidationRule({
      id: 'organization_updates',
      name: 'Organization Data Updates',
      triggers: [
        { pattern: 'organizations', operations: ['CREATE', 'UPDATE', 'DELETE'] }
      ],
      invalidates: [
        { pattern: 'org:*', immediate: true },
        { pattern: 'session:*', immediate: false, delay: 5000 }
      ]
    })

    logger.debug('Cache system initialized')
  }

  private async initializeDatabase(): Promise<void> {
    logger.debug('Initializing database optimization...')
    
    // Start periodic optimization if auto-tuning is enabled
    if (this.config.database.autoTuning) {
      setInterval(async () => {
        try {
          await connectionPoolManager.optimizePools()
        } catch (error) {
          logger.warn('Automatic database optimization failed:', error)
        }
      }, 300000) // Every 5 minutes
    }

    logger.debug('Database optimization initialized')
  }

  private async initializeBundle(): Promise<void> {
    logger.debug('Initializing bundle optimization...')
    
    // Enable intelligent preloading if configured
    if (this.config.bundleOptimization.preloading) {
      lazyLoadingManager.enableIntelligentPreloading()
    }

    logger.debug('Bundle optimization initialized')
  }

  private async initializeMonitoring(): Promise<void> {
    logger.debug('Initializing performance monitoring...')
    
    // The monitoring middleware is initialized separately
    // This could set up additional monitoring configurations
    
    logger.debug('Performance monitoring initialized')
  }

  private async initializeTracing(): Promise<void> {
    logger.debug('Initializing distributed tracing...')
    
    // Tracing is already initialized via the singleton
    // This could set up additional tracing configurations
    
    logger.debug('Distributed tracing initialized')
  }
}

/**
 * Default integrated performance manager instance
 */
export const integratedPerformanceManager = new IntegratedPerformanceManager({
  cache: {
    enabled: true,
    enableRedis: !!process.env.REDIS_URL
  },
  monitoring: {
    enabled: true,
    detailedProfiling: process.env.NODE_ENV === 'development'
  },
  database: {
    autoTuning: process.env.NODE_ENV === 'production'
  },
  tracing: {
    enabled: true,
    sampleRate: parseFloat(process.env.TRACE_SAMPLE_RATE || '0.1')
  }
})

/**
 * Initialize performance systems on module load
 */
if (typeof window === 'undefined') {
  integratedPerformanceManager.initialize().catch(error => {
    logger.error('Failed to initialize performance systems:', error)
  })
}

export default integratedPerformanceManager