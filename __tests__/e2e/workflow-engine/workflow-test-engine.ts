import { Browser, BrowserContext, Page } from '@playwright/test'
import { PerformanceMonitor } from './performance/performance-monitor'
import { RealTimeValidator } from './validation/real-time-validator'
import { WorkflowStateManager } from './state/workflow-state-manager'
import { WebSocketTestManager } from './websocket/websocket-test-manager'

/**
 * Comprehensive Workflow Test Engine
 * 
 * Core orchestration system for end-to-end board meeting lifecycle testing.
 * Provides infrastructure for multi-user simulation, real-time validation,
 * performance monitoring, and complex workflow coordination.
 */
export interface WorkflowEngineConfig {
  browser: Browser
  performanceTracking?: boolean
  realTimeValidation?: boolean
  concurrencySupport?: boolean
  webSocketTesting?: boolean
  stateManagement?: boolean
  maxConcurrentUsers?: number
  performanceThresholds?: PerformanceThresholds
}

export interface PerformanceThresholds {
  maxResponseTime: number
  maxMemoryUsage: number
  maxErrorRate: number
  minThroughput: number
}

export interface WorkflowMetrics {
  startTime: number
  endTime?: number
  responseTimeMetrics: ResponseTimeMetric[]
  memoryUsageMetrics: MemoryUsageMetric[]
  errorMetrics: ErrorMetric[]
  throughputMetrics: ThroughputMetric[]
  userInteractionMetrics: UserInteractionMetric[]
}

export interface ResponseTimeMetric {
  timestamp: number
  operation: string
  responseTime: number
  success: boolean
  userId?: string
}

export interface MemoryUsageMetric {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
  processes: ProcessMemoryInfo[]
}

export interface ErrorMetric {
  timestamp: number
  error: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  operation: string
  userId?: string
  recovered: boolean
  recoveryTime?: number
}

export interface ThroughputMetric {
  timestamp: number
  operation: string
  requestsPerSecond: number
  successRate: number
}

export interface UserInteractionMetric {
  timestamp: number
  userId: string
  action: string
  duration: number
  success: boolean
  concurrentUsers: number
}

export interface ProcessMemoryInfo {
  pid: number
  name: string
  memory: number
}

export class WorkflowTestEngine {
  private browser: Browser
  private config: WorkflowEngineConfig
  private performanceMonitor: PerformanceMonitor
  private realTimeValidator: RealTimeValidator
  private stateManager: WorkflowStateManager
  private webSocketManager: WebSocketTestManager
  private metrics: WorkflowMetrics
  private activeContexts: Map<string, BrowserContext> = new Map()
  private activePagesMap: Map<string, Page> = new Map()

  constructor(config: WorkflowEngineConfig) {
    this.browser = config.browser
    this.config = {
      performanceTracking: true,
      realTimeValidation: true,
      concurrencySupport: true,
      webSocketTesting: true,
      stateManagement: true,
      maxConcurrentUsers: 100,
      performanceThresholds: {
        maxResponseTime: 2000,
        maxMemoryUsage: 2 * 1024 * 1024 * 1024, // 2GB
        maxErrorRate: 0.01,
        minThroughput: 10
      },
      ...config
    }

    this.initializeComponents()
  }

  private initializeComponents(): void {
    this.performanceMonitor = new PerformanceMonitor({
      enabled: this.config.performanceTracking,
      thresholds: this.config.performanceThresholds,
      samplingInterval: 1000 // 1 second
    })

    this.realTimeValidator = new RealTimeValidator({
      enabled: this.config.realTimeValidation,
      validationInterval: 5000, // 5 seconds
      strictMode: true
    })

    this.stateManager = new WorkflowStateManager({
      enabled: this.config.stateManagement,
      persistenceEnabled: true,
      snapshotInterval: 30000 // 30 seconds
    })

    this.webSocketManager = new WebSocketTestManager({
      enabled: this.config.webSocketTesting,
      connectionPoolSize: this.config.maxConcurrentUsers || 100
    })

    this.metrics = {
      startTime: Date.now(),
      responseTimeMetrics: [],
      memoryUsageMetrics: [],
      errorMetrics: [],
      throughputMetrics: [],
      userInteractionMetrics: []
    }
  }

  async initializeTestEnvironment(): Promise<void> {
    await this.performanceMonitor.start()
    await this.realTimeValidator.start()
    await this.stateManager.initialize()
    await this.webSocketManager.initialize()

    // Start metrics collection
    this.startMetricsCollection()
  }

  async createUserContext(userId: string, userType: string, permissions: string[] = []): Promise<BrowserContext> {
    const context = await this.browser.newContext({
      userAgent: `BoardGuru-Test-${userType}-${userId}`,
      viewport: { width: 1920, height: 1080 },
      permissions: ['microphone', 'camera', 'notifications', ...permissions],
      recordVideo: process.env.CI ? undefined : { dir: `./test-results/videos/${userId}` },
      recordHar: { path: `./test-results/har/${userId}.har` }
    })

    // Attach performance monitoring to context
    await this.attachContextMonitoring(context, userId, userType)

    this.activeContexts.set(userId, context)
    return context
  }

  async createUserPage(context: BrowserContext, userId: string, url?: string): Promise<Page> {
    const page = await context.newPage()

    // Attach page-level monitoring
    await this.attachPageMonitoring(page, userId)

    if (url) {
      await this.navigateWithMonitoring(page, url, userId, 'page_load')
    }

    this.activePagesMap.set(userId, page)
    return page
  }

  async navigateWithMonitoring(page: Page, url: string, userId: string, operation: string): Promise<void> {
    const startTime = Date.now()
    let success = false
    let error: string | undefined

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
      success = true
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      await this.recordError(error, 'high', operation, userId)
    }

    const responseTime = Date.now() - startTime
    await this.recordResponseTime(operation, responseTime, success, userId)
  }

  async executeWithMonitoring<T>(
    operation: string, 
    action: () => Promise<T>, 
    userId?: string
  ): Promise<T> {
    const startTime = Date.now()
    let result: T
    let success = false
    let error: string | undefined

    try {
      result = await action()
      success = true
      return result
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      await this.recordError(error, 'high', operation, userId)
      throw e
    } finally {
      const responseTime = Date.now() - startTime
      await this.recordResponseTime(operation, responseTime, success, userId)
    }
  }

  async simulateConcurrentUsers(
    userCount: number,
    userTypes: Record<string, number>,
    actions: (userId: string, userType: string, context: BrowserContext, page: Page) => Promise<void>
  ): Promise<void> {
    const userSessions: Promise<void>[] = []
    let currentUserId = 0

    for (const [userType, count] of Object.entries(userTypes)) {
      for (let i = 0; i < count; i++) {
        const userId = `${userType}_${currentUserId++}`
        
        const userSession = this.createUserSession(userId, userType, actions)
        userSessions.push(userSession)
      }
    }

    // Execute all user sessions concurrently
    await Promise.all(userSessions)
  }

  private async createUserSession(
    userId: string,
    userType: string,
    actions: (userId: string, userType: string, context: BrowserContext, page: Page) => Promise<void>
  ): Promise<void> {
    const context = await this.createUserContext(userId, userType)
    const page = await this.createUserPage(context, userId)

    try {
      await actions(userId, userType, context, page)
    } catch (error) {
      await this.recordError(
        error instanceof Error ? error.message : String(error),
        'high',
        'user_session',
        userId
      )
    } finally {
      await this.recordUserInteraction(userId, 'session_complete', 0, true)
      await context.close()
      this.activeContexts.delete(userId)
      this.activePagesMap.delete(userId)
    }
  }

  async attachContextMonitoring(context: BrowserContext, userId: string, userType: string): Promise<void> {
    // Monitor context-level events
    context.on('page', async (page) => {
      await this.attachPageMonitoring(page, userId)
    })

    context.on('requestfailed', async (request) => {
      await this.recordError(
        `Request failed: ${request.url()}`,
        'medium',
        'network_request',
        userId
      )
    })
  }

  async attachPageMonitoring(page: Page, userId: string): Promise<void> {
    // Monitor page performance
    await page.addInitScript(() => {
      (window as any).performanceData = {
        navigationStart: Date.now(),
        interactions: []
      }
    })

    // Monitor console errors
    page.on('pageerror', async (error) => {
      await this.recordError(error.message, 'high', 'javascript_error', userId)
    })

    // Monitor network requests
    page.on('request', async (request) => {
      const startTime = Date.now()
      request.response().then(async (response) => {
        if (response) {
          const responseTime = Date.now() - startTime
          await this.recordResponseTime(
            `network_${request.method()}`,
            responseTime,
            response.status() < 400,
            userId
          )
        }
      }).catch(() => {
        // Response failed, already handled by requestfailed event
      })
    })

    // Monitor user interactions
    await page.addInitScript(() => {
      const recordInteraction = (event: Event) => {
        const interactionData = {
          type: event.type,
          timestamp: Date.now(),
          target: (event.target as Element)?.tagName || 'unknown'
        };
        (window as any).performanceData.interactions.push(interactionData)
      }

      ['click', 'keypress', 'scroll', 'focus'].forEach(eventType => {
        document.addEventListener(eventType, recordInteraction, true)
      })
    })
  }

  async recordResponseTime(operation: string, responseTime: number, success: boolean, userId?: string): Promise<void> {
    const metric: ResponseTimeMetric = {
      timestamp: Date.now(),
      operation,
      responseTime,
      success,
      userId
    }

    this.metrics.responseTimeMetrics.push(metric)

    // Check against thresholds
    if (responseTime > this.config.performanceThresholds!.maxResponseTime) {
      await this.recordError(
        `Response time threshold exceeded: ${responseTime}ms > ${this.config.performanceThresholds!.maxResponseTime}ms`,
        'medium',
        operation,
        userId
      )
    }

    await this.realTimeValidator.validateResponseTime(metric)
  }

  async recordError(error: string, severity: 'low' | 'medium' | 'high' | 'critical', operation: string, userId?: string): Promise<void> {
    const metric: ErrorMetric = {
      timestamp: Date.now(),
      error,
      severity,
      operation,
      userId,
      recovered: false
    }

    this.metrics.errorMetrics.push(metric)
    await this.realTimeValidator.validateError(metric)

    // Auto-recovery for certain error types
    if (severity === 'medium' && this.shouldAttemptRecovery(error)) {
      const recovered = await this.attemptErrorRecovery(error, operation, userId)
      metric.recovered = recovered
      if (recovered) {
        metric.recoveryTime = Date.now() - metric.timestamp
      }
    }
  }

  async recordUserInteraction(userId: string, action: string, duration: number, success: boolean): Promise<void> {
    const metric: UserInteractionMetric = {
      timestamp: Date.now(),
      userId,
      action,
      duration,
      success,
      concurrentUsers: this.activeContexts.size
    }

    this.metrics.userInteractionMetrics.push(metric)
    await this.realTimeValidator.validateUserInteraction(metric)
  }

  async recordMemoryUsage(): Promise<void> {
    const memoryInfo = await this.getDetailedMemoryUsage()
    const metric: MemoryUsageMetric = {
      timestamp: Date.now(),
      ...memoryInfo
    }

    this.metrics.memoryUsageMetrics.push(metric)

    // Check against thresholds
    if (metric.heapUsed > this.config.performanceThresholds!.maxMemoryUsage) {
      await this.recordError(
        `Memory usage threshold exceeded: ${metric.heapUsed} > ${this.config.performanceThresholds!.maxMemoryUsage}`,
        'high',
        'memory_usage'
      )
    }
  }

  async getMemoryUsage(): Promise<number> {
    const memoryInfo = await this.getDetailedMemoryUsage()
    return memoryInfo.heapUsed
  }

  private async getDetailedMemoryUsage(): Promise<MemoryUsageMetric> {
    // Get Node.js process memory
    const nodeMemory = process.memoryUsage()
    
    // Get browser process memory (if available)
    let browserProcesses: ProcessMemoryInfo[] = []
    try {
      // This would require additional browser process monitoring
      browserProcesses = await this.getBrowserProcessMemory()
    } catch {
      // Browser process monitoring not available
    }

    return {
      timestamp: Date.now(),
      heapUsed: nodeMemory.heapUsed,
      heapTotal: nodeMemory.heapTotal,
      external: nodeMemory.external,
      processes: browserProcesses
    }
  }

  private async getBrowserProcessMemory(): Promise<ProcessMemoryInfo[]> {
    // Implementation would depend on platform-specific process monitoring
    // For now, return empty array
    return []
  }

  private shouldAttemptRecovery(error: string): boolean {
    const recoverableErrors = [
      'network',
      'timeout',
      'connection',
      'temporary'
    ]
    
    return recoverableErrors.some(keyword => 
      error.toLowerCase().includes(keyword)
    )
  }

  private async attemptErrorRecovery(error: string, operation: string, userId?: string): Promise<boolean> {
    try {
      // Wait and retry logic
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Attempt to restore state if user session
      if (userId && this.activeContexts.has(userId)) {
        const context = this.activeContexts.get(userId)!
        const pages = context.pages()
        
        // Reload current page if available
        if (pages.length > 0) {
          await pages[0].reload({ waitUntil: 'networkidle' })
        }
      }
      
      return true
    } catch {
      return false
    }
  }

  private startMetricsCollection(): void {
    // Collect memory metrics every 10 seconds
    setInterval(async () => {
      await this.recordMemoryUsage()
    }, 10000)

    // Collect throughput metrics every 5 seconds
    setInterval(async () => {
      await this.calculateThroughputMetrics()
    }, 5000)
  }

  private async calculateThroughputMetrics(): Promise<void> {
    const now = Date.now()
    const timeWindow = 5000 // 5 seconds

    // Calculate throughput for different operations
    const operations = new Set(this.metrics.responseTimeMetrics.map(m => m.operation))
    
    for (const operation of operations) {
      const recentMetrics = this.metrics.responseTimeMetrics.filter(
        m => m.operation === operation && (now - m.timestamp) <= timeWindow
      )

      if (recentMetrics.length > 0) {
        const successfulRequests = recentMetrics.filter(m => m.success).length
        const requestsPerSecond = recentMetrics.length / (timeWindow / 1000)
        const successRate = successfulRequests / recentMetrics.length

        const throughputMetric: ThroughputMetric = {
          timestamp: now,
          operation,
          requestsPerSecond,
          successRate
        }

        this.metrics.throughputMetrics.push(throughputMetric)
      }
    }
  }

  async getLatestMeetingSession(): Promise<any> {
    return this.stateManager.getLatestSnapshot('meeting_session')
  }

  async saveWorkflowState(workflowId: string, state: any): Promise<void> {
    await this.stateManager.saveState(workflowId, state)
  }

  async loadWorkflowState(workflowId: string): Promise<any> {
    return this.stateManager.loadState(workflowId)
  }

  getMetrics(): WorkflowMetrics {
    return {
      ...this.metrics,
      endTime: Date.now()
    }
  }

  async generatePerformanceReport(): Promise<string> {
    return this.performanceMonitor.generateReport(this.metrics)
  }

  async cleanup(): Promise<void> {
    // Close all active contexts
    for (const [userId, context] of this.activeContexts) {
      try {
        await context.close()
      } catch (error) {
        console.warn(`Failed to close context for user ${userId}:`, error)
      }
    }

    this.activeContexts.clear()
    this.activePagesMap.clear()

    // Stop monitoring services
    await this.performanceMonitor.stop()
    await this.realTimeValidator.stop()
    await this.stateManager.cleanup()
    await this.webSocketManager.cleanup()

    // Save final metrics
    this.metrics.endTime = Date.now()
  }
}