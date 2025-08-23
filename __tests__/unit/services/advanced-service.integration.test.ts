/**
 * @jest-environment jsdom
 */
import { 
  BaseService, 
  EventBus, 
  ServiceOrchestrator,
  DomainEventTypes,
  type DomainEvent,
  type EventHandler,
  type WorkflowDefinition,
  type ServiceCall,
  type OrchestrationResult,
  UserCreatedEvent,
  AssetUploadedEvent,
  NotificationCreatedEvent
} from '@/lib/services'
import { UserService } from '@/lib/services/user.service'
import { 
  Result, 
  success, 
  failure, 
  RepositoryError, 
  ErrorCode,
  ErrorCategory,
  RetryStrategy,
  FallbackStrategy,
  withRecovery
} from '@/lib/repositories/result'
import { createSupabaseAdminClient } from '@/config/database.config'
import { testDb } from '../../../tests/utils/test-database'
import { UserFactory } from '../../factories'

// Mock Supabase client
jest.mock('@/config/database.config', () => ({
  createSupabaseAdminClient: jest.fn(),
}))

// Mock external services
class MockNotificationService extends BaseService {
  async sendEmail(userId: string, subject: string, content: string): Promise<Result<void>> {
    if (userId === 'fail-user') {
      return failure(RepositoryError.externalService('email-service', 'Email service unavailable'))
    }
    return success(undefined)
  }

  async sendPushNotification(userId: string, title: string, message: string): Promise<Result<{ messageId: string }>> {
    if (userId === 'timeout-user') {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate timeout
      return failure(RepositoryError.timeout('push-notification', 1500))
    }
    return success({ messageId: `msg_${Date.now()}` })
  }

  async createNotification(data: any): Promise<Result<any>> {
    return success({ id: 'notification-123', ...data })
  }
}

class MockAnalyticsService extends BaseService {
  async trackEvent(event: string, properties: Record<string, any>): Promise<Result<void>> {
    return success(undefined)
  }

  async trackUserActivity(userId: string, activity: string): Promise<Result<void>> {
    if (userId === 'analytics-fail') {
      return failure(RepositoryError.externalService('analytics', 'Analytics service down'))
    }
    return success(undefined)
  }
}

class MockPaymentService extends BaseService {
  private charges = new Map<string, { status: 'pending' | 'completed' | 'failed', amount: number }>()

  async createCharge(userId: string, amount: number): Promise<Result<{ chargeId: string, status: string }>> {
    const chargeId = `charge_${Date.now()}`
    this.charges.set(chargeId, { status: 'pending', amount })
    
    if (amount < 0) {
      return failure(RepositoryError.validation('Amount must be positive'))
    }
    
    return success({ chargeId, status: 'pending' })
  }

  async processCharge(chargeId: string): Promise<Result<{ status: string }>> {
    const charge = this.charges.get(chargeId)
    if (!charge) {
      return failure(RepositoryError.notFound('Charge'))
    }

    // Simulate processing failure for high amounts
    if (charge.amount > 1000) {
      charge.status = 'failed'
      return failure(RepositoryError.externalService('payment-processor', 'Payment declined'))
    }

    charge.status = 'completed'
    return success({ status: 'completed' })
  }

  async refundCharge(chargeId: string): Promise<Result<void>> {
    // Compensation step for failed workflows
    const charge = this.charges.get(chargeId)
    if (charge && charge.status === 'completed') {
      charge.status = 'pending' // Simulate refund process
    }
    return success(undefined)
  }
}

// Event Handlers for Testing
class UserActivityHandler implements EventHandler<UserCreatedEvent> {
  public handledEvents: UserCreatedEvent[] = []

  async handle(event: UserCreatedEvent): Promise<void> {
    this.handledEvents.push(event)
  }
}

class NotificationHandler implements EventHandler<AssetUploadedEvent> {
  public handledEvents: AssetUploadedEvent[] = []
  private shouldFail: boolean = false

  setShouldFail(fail: boolean) {
    this.shouldFail = fail
  }

  async handle(event: AssetUploadedEvent): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Notification handler failed')
    }
    this.handledEvents.push(event)
  }
}

describe('Advanced Service Integration Tests', () => {
  let mockSupabase: any
  let eventBus: EventBus
  let orchestrator: ServiceOrchestrator
  let userService: UserService
  let notificationService: MockNotificationService
  let analyticsService: MockAnalyticsService
  let paymentService: MockPaymentService
  let testUser: any
  let userActivityHandler: UserActivityHandler
  let notificationHandler: NotificationHandler

  beforeAll(async () => {
    await testDb.setup()
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  beforeEach(async () => {
    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id', email: 'test@example.com' } },
          error: null
        })
      }
    }

    ;(createSupabaseAdminClient as jest.Mock).mockReturnValue(mockSupabase)

    // Initialize services
    eventBus = new EventBus()
    orchestrator = new ServiceOrchestrator(eventBus)
    userService = new UserService(mockSupabase)
    notificationService = new MockNotificationService(mockSupabase)
    analyticsService = new MockAnalyticsService(mockSupabase)
    paymentService = new MockPaymentService(mockSupabase)

    // Register services with orchestrator
    orchestrator.registerService('userService', userService)
    orchestrator.registerService('notificationService', notificationService)
    orchestrator.registerService('analyticsService', analyticsService)
    orchestrator.registerService('paymentService', paymentService)

    // Setup event handlers
    userActivityHandler = new UserActivityHandler()
    notificationHandler = new NotificationHandler()

    eventBus.subscribe(DomainEventTypes.USER_CREATED, userActivityHandler)
    eventBus.subscribe(DomainEventTypes.ASSET_UPLOADED, notificationHandler)

    // Create test user
    testUser = await testDb.createUser({
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'director'
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    eventBus.clearEventStore()
    eventBus.clearDeadLetterQueue()
  })

  describe('Event Bus Integration', () => {
    it('should publish and handle domain events successfully', async () => {
      const event: UserCreatedEvent = {
        id: 'evt_123',
        type: DomainEventTypes.USER_CREATED,
        aggregateId: testUser.id,
        aggregateType: 'user',
        version: 1,
        occurredAt: new Date(),
        data: {
          userId: testUser.id,
          email: testUser.email,
          organizationId: 'org-123'
        }
      }

      const result = await eventBus.publish(event)

      expect(result.success).toBe(true)
      expect(result.eventId).toBe(event.id)
      expect(userActivityHandler.handledEvents).toHaveLength(1)
      expect(userActivityHandler.handledEvents[0]).toEqual(event)
    })

    it('should handle event handler failures and use dead letter queue', async () => {
      notificationHandler.setShouldFail(true)

      const event: AssetUploadedEvent = {
        id: 'evt_456',
        type: DomainEventTypes.ASSET_UPLOADED,
        aggregateId: 'asset-123',
        aggregateType: 'asset',
        version: 1,
        occurredAt: new Date(),
        data: {
          assetId: 'asset-123',
          userId: testUser.id,
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          vaultId: 'vault-123'
        }
      }

      const result = await eventBus.publish(event)

      // Event publishing should succeed even if handlers fail
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()

      // Check dead letter queue
      const deadLetterItems = eventBus.getDeadLetterQueue()
      expect(deadLetterItems.length).toBeGreaterThan(0)
    })

    it('should replay events for specific aggregate', async () => {
      const events: DomainEvent[] = [
        eventBus.createEvent(
          DomainEventTypes.USER_CREATED,
          testUser.id,
          'user',
          { email: testUser.email }
        ),
        eventBus.createEvent(
          DomainEventTypes.USER_UPDATED,
          testUser.id,
          'user',
          { name: 'Updated Name' }
        )
      ]

      // Publish events initially
      for (const event of events) {
        await eventBus.publish(event)
      }

      // Clear handler state
      userActivityHandler.handledEvents = []

      // Replay events
      await eventBus.replayEvents(testUser.id, 'user')

      // Handlers should receive replayed events
      expect(userActivityHandler.handledEvents.length).toBeGreaterThan(0)
    })

    it('should provide comprehensive event statistics', async () => {
      // Publish multiple events
      await eventBus.publish(eventBus.createEvent(
        DomainEventTypes.USER_CREATED,
        'user-1',
        'user',
        {}
      ))
      
      await eventBus.publish(eventBus.createEvent(
        DomainEventTypes.ASSET_UPLOADED,
        'asset-1',
        'asset',
        {}
      ))

      const stats = eventBus.getStatistics()

      expect(stats.totalEvents).toBe(2)
      expect(stats.eventsByType[DomainEventTypes.USER_CREATED]).toBe(1)
      expect(stats.eventsByType[DomainEventTypes.ASSET_UPLOADED]).toBe(1)
      expect(stats.subscriptionCount).toBeGreaterThan(0)
    })
  })

  describe('Service Orchestration', () => {
    it('should execute workflow with multiple services successfully', async () => {
      const workflow: WorkflowDefinition = {
        id: 'user-onboarding',
        name: 'User Onboarding Workflow',
        description: 'Complete user onboarding process',
        steps: [
          {
            id: 'create-user-profile',
            name: 'Create User Profile',
            serviceMethod: 'userService.updateUserProfile',
            inputMapping: {
              '0': 'userId',
              '1': 'profileData'
            },
            outputMapping: {
              'id': 'createdUserId'
            }
          },
          {
            id: 'send-welcome-email',
            name: 'Send Welcome Email',
            serviceMethod: 'notificationService.sendEmail',
            inputMapping: {
              '0': 'createdUserId',
              '1': 'emailSubject',
              '2': 'emailContent'
            }
          },
          {
            id: 'track-signup',
            name: 'Track User Signup',
            serviceMethod: 'analyticsService.trackEvent',
            inputMapping: {
              '0': 'eventName',
              '1': 'eventProperties'
            }
          }
        ]
      }

      orchestrator.registerWorkflow(workflow)

      // Mock successful responses
      mockSupabase.single.mockResolvedValue({
        data: { id: testUser.id, email: testUser.email },
        error: null
      })

      const result = await orchestrator.executeWorkflow('user-onboarding', {
        userId: testUser.id,
        profileData: { first_name: 'John', last_name: 'Doe' },
        emailSubject: 'Welcome!',
        emailContent: 'Welcome to our platform',
        eventName: 'user_signup',
        eventProperties: { source: 'web' }
      })

      expect(result.success).toBe(true)
      expect(result.data?.stepsCompleted).toBe(3)
      expect(result.data?.totalSteps).toBe(3)
    })

    it('should handle workflow errors and compensation', async () => {
      const sagaWorkflow: WorkflowDefinition = {
        id: 'payment-processing',
        name: 'Payment Processing Saga',
        description: 'Process payment with compensation',
        steps: [
          {
            id: 'create-charge',
            name: 'Create Charge',
            serviceMethod: 'paymentService.createCharge',
            inputMapping: {
              '0': 'userId',
              '1': 'amount'
            },
            outputMapping: {
              'chargeId': 'chargeId'
            }
          },
          {
            id: 'process-charge',
            name: 'Process Charge',
            serviceMethod: 'paymentService.processCharge',
            inputMapping: {
              '0': 'chargeId'
            }
          }
        ],
        errorHandling: {
          onStepFailure: 'compensate',
          compensationSteps: ['refund-charge']
        }
      }

      // Add compensation step
      sagaWorkflow.steps.push({
        id: 'refund-charge',
        name: 'Refund Charge',
        serviceMethod: 'paymentService.refundCharge',
        inputMapping: {
          '0': 'chargeId'
        }
      })

      orchestrator.registerWorkflow(sagaWorkflow)

      // This should fail at process-charge step due to high amount
      const result = await orchestrator.executeWorkflow('payment-processing', {
        userId: testUser.id,
        amount: 1500 // Amount > 1000 will fail
      })

      expect(result.success).toBe(false)
      expect(result.data?.errors).toBeDefined()
    })

    it('should execute services in parallel efficiently', async () => {
      const parallelCalls: ServiceCall[] = [
        {
          serviceName: 'analyticsService',
          method: 'trackEvent',
          parameters: ['user_login', { userId: testUser.id }]
        },
        {
          serviceName: 'notificationService',
          method: 'createNotification',
          parameters: [{ title: 'Login Alert', userId: testUser.id }]
        }
      ]

      const startTime = Date.now()
      const result = await orchestrator.executeParallel(parallelCalls)
      const duration = Date.now() - startTime

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(duration).toBeLessThan(1000) // Should be much faster than sequential
    })

    it('should implement circuit breaker pattern', async () => {
      const circuitBreaker = orchestrator.createCircuitBreaker('notificationService', {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        monitoringPeriodMs: 5000
      })

      const failingCall: ServiceCall = {
        serviceName: 'notificationService',
        method: 'sendEmail',
        parameters: ['fail-user', 'Test', 'Content'] // This will fail
      }

      // First failure
      await expect(circuitBreaker.execute(failingCall)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('closed')

      // Second failure - should open circuit
      await expect(circuitBreaker.execute(failingCall)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('open')

      // Third attempt should fail immediately due to open circuit
      await expect(circuitBreaker.execute(failingCall)).rejects.toThrow('Circuit breaker is open')

      const metrics = circuitBreaker.getMetrics()
      expect(metrics.failures).toBe(2)
      expect(metrics.state).toBe('open')
    })

    it('should execute saga pattern with proper compensation', async () => {
      const sagaSteps = [
        {
          execute: {
            serviceName: 'paymentService',
            method: 'createCharge',
            parameters: [testUser.id, 100]
          },
          compensate: {
            serviceName: 'paymentService',
            method: 'refundCharge',
            parameters: ['${chargeId}'] // Will be resolved at runtime
          }
        }
      ]

      const result = await orchestrator.executeSaga(sagaSteps, {
        userId: testUser.id
      })

      expect(result.success).toBe(true)
    })
  })

  describe('BaseService Recovery Strategies', () => {
    let testService: UserService

    beforeEach(() => {
      testService = new UserService(mockSupabase)
    })

    it('should implement retry strategy for transient failures', async () => {
      let attemptCount = 0
      mockSupabase.single.mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.resolve({
            data: null,
            error: { code: 'CONNECTION_FAILED', message: 'Network error' }
          })
        }
        return Promise.resolve({
          data: { id: testUser.id, email: testUser.email },
          error: null
        })
      })

      const result = await testService.getUserProfile(testUser.id)

      expect(result.success).toBe(true)
      expect(attemptCount).toBe(3) // Should have retried twice
    })

    it('should handle validation errors with detailed context', async () => {
      const result = await testService.updateUserProfile('', {
        first_name: 'John'
      })

      expect(result.success).toBe(false)
      expect(result.error?.category).toBe(ErrorCategory.VALIDATION)
    })

    it('should implement fallback strategies for external service failures', async () => {
      // Mock external service failure
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'EXTERNAL_SERVICE_ERROR', message: 'Service unavailable' }
      })

      const fallbackStrategy = FallbackStrategy({
        id: 'fallback-user',
        email: 'fallback@example.com'
      })

      const operationWithFallback = async (): Promise<Result<any>> => {
        const primaryResult = await testService.getUserProfile(testUser.id)
        if (!primaryResult.success) {
          return withRecovery(primaryResult, [fallbackStrategy])
        }
        return primaryResult
      }

      const result = await operationWithFallback()

      expect(result.success).toBe(true)
      expect(result.data?.email).toBe('fallback@example.com')
    })

    it('should execute operations with timeout and recovery', async () => {
      // Simulate slow response
      mockSupabase.single.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: { id: testUser.id },
              error: null
            })
          }, 2000)
        })
      })

      const timeoutResult = await testService.getUserProfile(testUser.id)

      expect(timeoutResult.success).toBe(false)
      expect(timeoutResult.error?.code).toBe(ErrorCode.TIMEOUT)
    })
  })

  describe('Service Integration Error Scenarios', () => {
    it('should handle cascading service failures gracefully', async () => {
      // Setup failing services
      const failingWorkflow: WorkflowDefinition = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        description: 'Test cascading failures',
        steps: [
          {
            id: 'step1',
            name: 'First Step',
            serviceMethod: 'notificationService.sendEmail',
            inputMapping: {
              '0': 'userId',
              '1': 'subject',
              '2': 'content'
            }
          },
          {
            id: 'step2',
            name: 'Second Step',
            serviceMethod: 'analyticsService.trackUserActivity',
            inputMapping: {
              '0': 'userId',
              '1': 'activity'
            }
          }
        ],
        errorHandling: {
          onStepFailure: 'continue' // Continue despite failures
        }
      }

      orchestrator.registerWorkflow(failingWorkflow)

      const result = await orchestrator.executeWorkflow('failing-workflow', {
        userId: 'fail-user', // This will cause email service to fail
        subject: 'Test',
        content: 'Test content',
        activity: 'test-activity'
      })

      expect(result.success).toBe(false)
      expect(result.data?.errors).toBeDefined()
      expect(result.data?.stepsCompleted).toBeLessThan(2)
    })

    it('should handle event publishing failures in service operations', async () => {
      const eventSpy = jest.spyOn(eventBus, 'publish')
      eventSpy.mockRejectedValue(new Error('Event bus failure'))

      // This should still complete the database operation even if event publishing fails
      mockSupabase.single.mockResolvedValue({
        data: { id: testUser.id, first_name: 'Updated' },
        error: null
      })

      const result = await userService.updateUserProfile(testUser.id, {
        first_name: 'Updated Name'
      })

      expect(result.success).toBe(true)
      expect(eventSpy).toHaveBeenCalled()
    })

    it('should handle service registry errors', async () => {
      const missingServiceCall: ServiceCall = {
        serviceName: 'nonExistentService',
        method: 'someMethod',
        parameters: []
      }

      const result = await orchestrator.executeParallel([missingServiceCall])

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Service nonExistentService not found')
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle high-volume event processing efficiently', async () => {
      const eventCount = 100
      const events: DomainEvent[] = []

      for (let i = 0; i < eventCount; i++) {
        events.push(eventBus.createEvent(
          DomainEventTypes.USER_CREATED,
          `user-${i}`,
          'user',
          { index: i }
        ))
      }

      const startTime = Date.now()
      const results = await eventBus.publishBatch(events)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(eventCount)
      expect(results.every(r => r.success)).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete in under 5 seconds
    })

    it('should handle concurrent workflow executions', async () => {
      const simpleWorkflow: WorkflowDefinition = {
        id: 'concurrent-test',
        name: 'Concurrent Test Workflow',
        description: 'Test concurrent execution',
        steps: [
          {
            id: 'track-event',
            name: 'Track Event',
            serviceMethod: 'analyticsService.trackEvent',
            inputMapping: {
              '0': 'eventName',
              '1': 'properties'
            }
          }
        ]
      }

      orchestrator.registerWorkflow(simpleWorkflow)

      const concurrentExecutions = Array(10).fill(null).map((_, index) =>
        orchestrator.executeWorkflow('concurrent-test', {
          eventName: `concurrent-event-${index}`,
          properties: { index }
        })
      )

      const results = await Promise.all(concurrentExecutions)

      expect(results.every(r => r.success)).toBe(true)
    })

    it('should monitor service health and performance', async () => {
      const startTime = Date.now()

      // Execute multiple operations
      await Promise.all([
        userService.getUserProfile(testUser.id),
        notificationService.createNotification({ title: 'Test' }),
        analyticsService.trackEvent('test-event', {})
      ])

      const duration = Date.now() - startTime

      // Verify all operations complete within reasonable time
      expect(duration).toBeLessThan(1000)

      // Check event bus statistics
      const stats = eventBus.getStatistics()
      expect(stats).toHaveProperty('totalEvents')
      expect(stats).toHaveProperty('subscriptionCount')
    })
  })

  describe('Security and Access Control', () => {
    it('should enforce permission checks across service boundaries', async () => {
      // Mock permission failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No user found' }
      })

      const result = await userService.updateUserProfile(testUser.id, {
        first_name: 'Unauthorized Update'
      })

      expect(result.success).toBe(false)
      expect(result.error?.category).toBe(ErrorCategory.SECURITY)
    })

    it('should log security events for audit purposes', async () => {
      const auditSpy = jest.spyOn(userService as any, 'logActivity')

      // Mock successful operation
      mockSupabase.single.mockResolvedValue({
        data: { id: testUser.id },
        error: null
      })

      await userService.updateUserProfile(testUser.id, {
        first_name: 'Audited Update'
      })

      expect(auditSpy).toHaveBeenCalledWith(
        'update_profile',
        'user',
        testUser.id,
        expect.any(Object)
      )
    })

    it('should prevent sensitive data exposure in error messages', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: {
          message: 'Database connection failed: password=secret123',
          details: 'Connection string contains sensitive info'
        }
      })

      const result = await userService.getUserProfile(testUser.id)

      expect(result.success).toBe(false)
      // Error should be sanitized and not contain sensitive information
      expect(result.error?.message).not.toContain('password')
      expect(result.error?.message).not.toContain('secret123')
    })
  })

  describe('Graceful Shutdown and Cleanup', () => {
    it('should gracefully shutdown orchestrator and clean up resources', async () => {
      // Start some workflows
      const testWorkflow: WorkflowDefinition = {
        id: 'cleanup-test',
        name: 'Cleanup Test',
        description: 'Test cleanup',
        steps: [
          {
            id: 'long-running-step',
            name: 'Long Running Step',
            serviceMethod: 'analyticsService.trackEvent',
            inputMapping: { '0': 'event', '1': 'properties' }
          }
        ]
      }

      orchestrator.registerWorkflow(testWorkflow)

      // Start workflow but don't wait
      const workflowPromise = orchestrator.executeWorkflow('cleanup-test', {
        event: 'test',
        properties: {}
      })

      // Get active workflows
      const activeWorkflows = orchestrator.getActiveWorkflows()
      expect(activeWorkflows.length).toBeGreaterThan(0)

      // Initiate shutdown
      await orchestrator.shutdown()

      // Verify cleanup
      const activeWorkflowsAfterShutdown = orchestrator.getActiveWorkflows()
      expect(activeWorkflowsAfterShutdown.length).toBe(0)

      // Verify registries are cleared
      const registeredWorkflows = orchestrator.getRegisteredWorkflows()
      expect(registeredWorkflows.length).toBe(0)
    })

    it('should handle event bus cleanup properly', async () => {
      // Publish some events
      await eventBus.publish(eventBus.createEvent(
        DomainEventTypes.USER_CREATED,
        'cleanup-user',
        'user',
        {}
      ))

      const statsBefore = eventBus.getStatistics()
      expect(statsBefore.totalEvents).toBeGreaterThan(0)

      // Clear event store
      eventBus.clearEventStore()
      eventBus.clearDeadLetterQueue()

      const statsAfter = eventBus.getStatistics()
      expect(statsAfter.totalEvents).toBe(0)
      expect(statsAfter.deadLetterQueueSize).toBe(0)
    })
  })
})