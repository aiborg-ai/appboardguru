import { EventBus, DomainEvent, DomainEventTypes } from './event-bus.service'
import { Result, success, failure } from '../repositories/result'

export interface WorkflowStep {
  id: string
  name: string
  serviceMethod: string
  inputMapping?: Record<string, string>
  outputMapping?: Record<string, string>
  condition?: (context: WorkflowContext) => boolean
  retryPolicy?: RetryPolicy
  timeoutMs?: number
}

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  errorHandling?: ErrorHandlingStrategy
  metadata?: Record<string, any>
}

export interface WorkflowContext {
  id: string
  workflowId: string
  currentStepIndex: number
  data: Record<string, any>
  errors: WorkflowError[]
  startTime: Date
  endTime?: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  metadata?: Record<string, any>
}

export interface WorkflowError {
  stepId: string
  stepName: string
  error: Error
  timestamp: Date
  retryCount: number
}

export interface RetryPolicy {
  maxAttempts: number
  delayMs: number
  backoffMultiplier?: number
  maxDelayMs?: number
}

export interface ErrorHandlingStrategy {
  onStepFailure: 'stop' | 'continue' | 'retry' | 'compensate'
  maxRetries?: number
  compensationSteps?: string[]
}

export interface ServiceCall {
  serviceName: string
  method: string
  parameters: any[]
  timeout?: number
}

export interface OrchestrationResult<T = any> {
  success: boolean
  data?: T
  errors?: WorkflowError[]
  duration: number
  stepsCompleted: number
  totalSteps: number
}

export class ServiceOrchestrator {
  private workflows: Map<string, WorkflowDefinition> = new Map()
  private activeWorkflows: Map<string, WorkflowContext> = new Map()
  private serviceRegistry: Map<string, any> = new Map()

  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  /**
   * Register a service with the orchestrator
   */
  registerService(name: string, service: any): void {
    this.serviceRegistry.set(name, service)
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow)
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    initialData: Record<string, any> = {},
    contextId?: string
  ): Promise<Result<OrchestrationResult>> {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      return failure(new Error(`Workflow ${workflowId} not found`))
    }

    const context: WorkflowContext = {
      id: contextId || this.generateContextId(),
      workflowId,
      currentStepIndex: 0,
      data: { ...initialData },
      errors: [],
      startTime: new Date(),
      status: 'running'
    }

    this.activeWorkflows.set(context.id, context)

    try {
      // Publish workflow started event
      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.started',
        context.id,
        'workflow',
        { workflowId, contextId: context.id }
      ))

      const result = await this.executeWorkflowSteps(workflow, context)

      context.endTime = new Date()
      context.status = result.success ? 'completed' : 'failed'

      // Publish workflow completed event
      await this.eventBus.publish(this.eventBus.createEvent(
        result.success ? 'workflow.completed' : 'workflow.failed',
        context.id,
        'workflow',
        { 
          workflowId, 
          contextId: context.id, 
          duration: result.duration,
          stepsCompleted: result.stepsCompleted,
          errors: result.errors 
        }
      ))

      return success(result)
    } catch (error) {
      context.status = 'failed'
      context.endTime = new Date()

      await this.eventBus.publish(this.eventBus.createEvent(
        'workflow.error',
        context.id,
        'workflow',
        { 
          workflowId, 
          contextId: context.id, 
          error: error instanceof Error ? error.message : String(error) 
        }
      ))

      return failure(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.activeWorkflows.delete(context.id)
    }
  }

  /**
   * Execute multiple services in parallel
   */
  async executeParallel(
    serviceCalls: ServiceCall[]
  ): Promise<Result<any[]>> {
    try {
      const promises = serviceCalls.map(call => this.executeServiceCall(call))
      const results = await Promise.allSettled(promises)

      const successes: any[] = []
      const failures: Error[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successes.push(result.value)
        } else {
          failures.push(new Error(`Service call ${index} failed: ${result.reason}`))
        }
      })

      if (failures.length > 0) {
        return failure(new Error(`${failures.length} service calls failed`))
      }

      return success(successes)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Execute services in sequence
   */
  async executeSequence(
    serviceCalls: ServiceCall[]
  ): Promise<Result<any[]>> {
    const results: any[] = []

    try {
      for (const call of serviceCalls) {
        const result = await this.executeServiceCall(call)
        results.push(result)
      }

      return success(results)
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Execute a conditional service call
   */
  async executeConditional(
    condition: () => boolean | Promise<boolean>,
    trueCall: ServiceCall,
    falseCall?: ServiceCall
  ): Promise<Result<any>> {
    try {
      const shouldExecuteTrue = await condition()
      const callToExecute = shouldExecuteTrue ? trueCall : falseCall

      if (!callToExecute) {
        return success(null)
      }

      return success(await this.executeServiceCall(callToExecute))
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Cancel a running workflow
   */
  async cancelWorkflow(contextId: string): Promise<Result<void>> {
    const context = this.activeWorkflows.get(contextId)
    if (!context) {
      return failure(new Error(`Workflow context ${contextId} not found`))
    }

    context.status = 'cancelled'
    context.endTime = new Date()

    await this.eventBus.publish(this.eventBus.createEvent(
      'workflow.cancelled',
      contextId,
      'workflow',
      { workflowId: context.workflowId, contextId }
    ))

    this.activeWorkflows.delete(contextId)
    return success(undefined)
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(contextId: string): WorkflowContext | null {
    return this.activeWorkflows.get(contextId) || null
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowContext[] {
    return Array.from(this.activeWorkflows.values())
  }

  /**
   * Get registered workflows
   */
  getRegisteredWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Create a saga pattern for distributed transactions
   */
  async executeSaga(
    steps: Array<{
      execute: ServiceCall
      compensate: ServiceCall
    }>,
    data: Record<string, any> = {}
  ): Promise<Result<any[]>> {
    const completedSteps: number[] = []
    const results: any[] = []

    try {
      // Execute forward steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        const result = await this.executeServiceCall(step.execute)
        results.push(result)
        completedSteps.push(i)
      }

      return success(results)
    } catch (error) {
      // Execute compensation in reverse order
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const stepIndex = completedSteps[i]
        const step = steps[stepIndex]
        
        try {
          await this.executeServiceCall(step.compensate)
        } catch (compensationError) {
          console.error(`Compensation failed for step ${stepIndex}:`, compensationError)
        }
      }

      return failure(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Circuit breaker pattern implementation
   */
  createCircuitBreaker(
    serviceName: string,
    options: {
      failureThreshold: number
      resetTimeoutMs: number
      monitoringPeriodMs: number
    }
  ): {
    execute: <T>(serviceCall: ServiceCall) => Promise<T>
    getState: () => 'closed' | 'open' | 'half-open'
    getMetrics: () => { failures: number, successes: number, state: string }
  } {
    let state: 'closed' | 'open' | 'half-open' = 'closed'
    let failures = 0
    let successes = 0
    let lastFailureTime = 0

    const execute = async <T>(serviceCall: ServiceCall): Promise<T> => {
      if (state === 'open') {
        if (Date.now() - lastFailureTime > options.resetTimeoutMs) {
          state = 'half-open'
        } else {
          throw new Error(`Circuit breaker is open for ${serviceName}`)
        }
      }

      try {
        const result = await this.executeServiceCall(serviceCall)
        
        if (state === 'half-open') {
          state = 'closed'
          failures = 0
        }
        
        successes++
        return result
      } catch (error) {
        failures++
        lastFailureTime = Date.now()

        if (failures >= options.failureThreshold) {
          state = 'open'
        }

        throw error
      }
    }

    return {
      execute,
      getState: () => state,
      getMetrics: () => ({ failures, successes, state })
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Cancel all active workflows
    const activeWorkflows = Array.from(this.activeWorkflows.keys())
    
    await Promise.all(
      activeWorkflows.map(contextId => this.cancelWorkflow(contextId))
    )

    // Clear registries
    this.workflows.clear()
    this.serviceRegistry.clear()
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflowSteps(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<OrchestrationResult> {
    const startTime = Date.now()
    let stepsCompleted = 0

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i]
      context.currentStepIndex = i

      // Check step condition
      if (step.condition && !step.condition(context)) {
        continue
      }

      try {
        const stepResult = await this.executeStep(step, context)
        
        // Update context with step result
        if (step.outputMapping) {
          this.applyOutputMapping(stepResult, context.data, step.outputMapping)
        } else {
          context.data[`step_${step.id}_result`] = stepResult
        }

        stepsCompleted++

        // Publish step completed event
        await this.eventBus.publish(this.eventBus.createEvent(
          'workflow.step_completed',
          context.id,
          'workflow_step',
          { 
            workflowId: context.workflowId, 
            stepId: step.id, 
            stepName: step.name,
            result: stepResult 
          }
        ))

      } catch (error) {
        const workflowError: WorkflowError = {
          stepId: step.id,
          stepName: step.name,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
          retryCount: 0
        }

        context.errors.push(workflowError)

        // Handle error based on strategy
        const shouldContinue = await this.handleStepError(workflow, step, workflowError, context)
        
        if (!shouldContinue) {
          break
        }
      }
    }

    const duration = Date.now() - startTime
    const success = context.errors.length === 0

    return {
      success,
      data: context.data,
      errors: context.errors.length > 0 ? context.errors : undefined,
      duration,
      stepsCompleted,
      totalSteps: workflow.steps.length
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<any> {
    const [serviceName, methodName] = step.serviceMethod.split('.')
    const service = this.serviceRegistry.get(serviceName)

    if (!service) {
      throw new Error(`Service ${serviceName} not found`)
    }

    const method = service[methodName]
    if (!method || typeof method !== 'function') {
      throw new Error(`Method ${methodName} not found on service ${serviceName}`)
    }

    // Prepare parameters
    const parameters = this.prepareStepParameters(step, context)

    // Execute with timeout
    const timeout = step.timeoutMs || 30000
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Step ${step.name} timed out after ${timeout}ms`)), timeout)
    })

    const executionPromise = method.apply(service, parameters)

    return Promise.race([executionPromise, timeoutPromise])
  }

  /**
   * Prepare step parameters from context
   */
  private prepareStepParameters(step: WorkflowStep, context: WorkflowContext): any[] {
    if (!step.inputMapping) {
      return []
    }

    const parameters: any[] = []
    
    Object.entries(step.inputMapping).forEach(([paramIndex, contextPath]) => {
      const index = parseInt(paramIndex)
      const value = this.getValueFromPath(context.data, contextPath)
      parameters[index] = value
    })

    return parameters
  }

  /**
   * Apply output mapping to context
   */
  private applyOutputMapping(
    result: any,
    contextData: Record<string, any>,
    outputMapping: Record<string, string>
  ): void {
    Object.entries(outputMapping).forEach(([resultPath, contextPath]) => {
      const value = this.getValueFromPath(result, resultPath)
      this.setValueAtPath(contextData, contextPath, value)
    })
  }

  /**
   * Get value from nested object path
   */
  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Set value at nested object path
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  /**
   * Handle step error
   */
  private async handleStepError(
    workflow: WorkflowDefinition,
    step: WorkflowStep,
    error: WorkflowError,
    context: WorkflowContext
  ): Promise<boolean> {
    const strategy = workflow.errorHandling?.onStepFailure || 'stop'

    switch (strategy) {
      case 'continue':
        return true
      
      case 'retry':
        if (step.retryPolicy && error.retryCount < step.retryPolicy.maxAttempts) {
          const delay = this.calculateRetryDelay(step.retryPolicy, error.retryCount)
          await new Promise(resolve => setTimeout(resolve, delay))
          error.retryCount++
          return true
        }
        return false
      
      case 'compensate':
        await this.executeCompensation(workflow, context)
        return false
      
      case 'stop':
      default:
        return false
    }
  }

  /**
   * Calculate retry delay with backoff
   */
  private calculateRetryDelay(retryPolicy: RetryPolicy, attemptCount: number): number {
    const { delayMs, backoffMultiplier = 2, maxDelayMs = 60000 } = retryPolicy
    const delay = delayMs * Math.pow(backoffMultiplier, attemptCount)
    return Math.min(delay, maxDelayMs)
  }

  /**
   * Execute compensation steps
   */
  private async executeCompensation(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<void> {
    const compensationSteps = workflow.errorHandling?.compensationSteps || []
    
    for (const stepId of compensationSteps.reverse()) {
      const step = workflow.steps.find(s => s.id === stepId)
      if (step) {
        try {
          await this.executeStep(step, context)
        } catch (error) {
          console.error(`Compensation step ${stepId} failed:`, error)
        }
      }
    }
  }

  /**
   * Execute a service call
   */
  private async executeServiceCall(call: ServiceCall): Promise<any> {
    const service = this.serviceRegistry.get(call.serviceName)
    if (!service) {
      throw new Error(`Service ${call.serviceName} not found`)
    }

    const method = service[call.method]
    if (!method || typeof method !== 'function') {
      throw new Error(`Method ${call.method} not found on service ${call.serviceName}`)
    }

    if (call.timeout) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Service call timed out after ${call.timeout}ms`)), call.timeout)
      })

      return Promise.race([
        method.apply(service, call.parameters),
        timeoutPromise
      ])
    }

    return method.apply(service, call.parameters)
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle workflow events
    this.eventBus.subscribe('workflow.step_failed', async (event) => {
      // Could trigger alerts, notifications, etc.
      console.log('Workflow step failed:', event.data)
    })
  }

  /**
   * Generate unique context ID
   */
  private generateContextId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }
}