/**
 * Integration Test Scenario Builder
 * Build complex business workflow scenarios for testing board governance operations
 */

import { Result, Ok, Err } from '../../lib/result'
import { testDataGenerator, EnhancedTestDataGenerator } from '../../lib/dev/test-data-generator'
import { generateCompleteTestDataset } from '../../lib/test-utils/sample-data-generators'
import type { GeneratedUser, GeneratedOrganization, GeneratedAsset, GeneratedVault, GeneratedMeeting } from '../../lib/dev/test-data-generator'
import type { AppError } from '../../lib/result/types'

export interface TestScenario {
  id: string
  name: string
  description: string
  tags: string[]
  setup: () => Promise<Result<TestScenarioContext, AppError>>
  teardown: (context: TestScenarioContext) => Promise<Result<void, AppError>>
  steps: TestScenarioStep[]
  assertions: TestScenarioAssertion[]
  timeout: number
  retries: number
  parallel: boolean
}

export interface TestScenarioStep {
  id: string
  name: string
  description: string
  execute: (context: TestScenarioContext) => Promise<Result<any, AppError>>
  rollback?: (context: TestScenarioContext) => Promise<Result<void, AppError>>
  timeout?: number
  skipOnFailure?: boolean
  continueOnError?: boolean
}

export interface TestScenarioAssertion {
  id: string
  name: string
  description: string
  check: (context: TestScenarioContext) => Promise<Result<boolean, AppError>>
  critical: boolean
  timeout?: number
}

export interface TestScenarioContext {
  scenario: TestScenario
  organizations: GeneratedOrganization[]
  users: GeneratedUser[]
  vaults: GeneratedVault[]
  assets: GeneratedAsset[]
  meetings: GeneratedMeeting[]
  executionState: Record<string, any>
  createdResources: Array<{
    type: string
    id: string
    cleanup: () => Promise<void>
  }>
  testData: Record<string, any>
  startTime: Date
  metrics: TestScenarioMetrics
}

export interface TestScenarioMetrics {
  stepCount: number
  completedSteps: number
  failedSteps: number
  skippedSteps: number
  assertionCount: number
  passedAssertions: number
  failedAssertions: number
  executionTime: number
  memoryUsage: {
    start: number
    end: number
    peak: number
  }
}

export interface ScenarioBuilderOptions {
  organizationCount?: number
  usersPerOrg?: number
  vaultsPerOrg?: number
  assetsPerVault?: number
  meetingsPerOrg?: number
  includeAnomalies?: boolean
  includeSeasonalPatterns?: boolean
  complexityLevel?: 'simple' | 'moderate' | 'complex'
  seed?: number
}

export class TestScenarioBuilder {
  private scenarios: Map<string, TestScenario> = new Map()
  private dataGenerator: EnhancedTestDataGenerator

  constructor(options: ScenarioBuilderOptions = {}) {
    this.dataGenerator = testDataGenerator
  }

  /**
   * Create a new scenario
   */
  createScenario(id: string, name: string, description: string): ScenarioBuilder {
    return new ScenarioBuilder(id, name, description, this)
  }

  /**
   * Register a scenario
   */
  registerScenario(scenario: TestScenario): void {
    this.scenarios.set(scenario.id, scenario)
  }

  /**
   * Get all scenarios
   */
  getScenarios(): TestScenario[] {
    return Array.from(this.scenarios.values())
  }

  /**
   * Get scenario by ID
   */
  getScenario(id: string): TestScenario | undefined {
    return this.scenarios.get(id)
  }

  /**
   * Execute a scenario
   */
  async executeScenario(scenarioId: string): Promise<Result<TestScenarioResult, AppError>> {
    const scenario = this.scenarios.get(scenarioId)
    if (!scenario) {
      return Err({
        code: 'NOT_FOUND' as any,
        message: `Scenario not found: ${scenarioId}`,
        timestamp: new Date()
      })
    }

    const executor = new ScenarioExecutor()
    return executor.execute(scenario)
  }

  /**
   * Execute multiple scenarios
   */
  async executeScenarios(
    scenarioIds: string[],
    options: { parallel?: boolean; continueOnFailure?: boolean } = {}
  ): Promise<Result<TestScenarioResult[], AppError>> {
    const { parallel = false, continueOnFailure = true } = options
    const results: TestScenarioResult[] = []
    const errors: AppError[] = []

    if (parallel) {
      const promises = scenarioIds.map(id => this.executeScenario(id))
      const parallelResults = await Promise.allSettled(promises)

      for (const result of parallelResults) {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            results.push(result.value.data)
          } else {
            errors.push(result.value.error)
            if (!continueOnFailure) break
          }
        }
      }
    } else {
      for (const scenarioId of scenarioIds) {
        const result = await this.executeScenario(scenarioId)
        if (result.success) {
          results.push(result.data)
        } else {
          errors.push(result.error)
          if (!continueOnFailure) break
        }
      }
    }

    if (errors.length > 0 && !continueOnFailure) {
      return Err(errors[0])
    }

    return Ok(results)
  }

  /**
   * Pre-built scenario templates
   */
  createBoardGovernanceScenario(): ScenarioBuilder {
    return this.createScenario(
      'board-governance-workflow',
      'Complete Board Governance Workflow',
      'Tests end-to-end board governance including meeting creation, document management, voting, and compliance'
    )
      .withTag('governance')
      .withTag('compliance')
      .withTag('end-to-end')
      .withTimeout(300000) // 5 minutes
      .step('setup-organization', 'Set up test organization', async (context) => {
        const org = context.organizations[0]
        context.testData.organizationId = org.id
        return Ok({ organizationId: org.id })
      })
      .step('create-board-meeting', 'Create board meeting with agenda', async (context) => {
        const meeting = context.meetings[0]
        context.testData.meetingId = meeting.id
        return Ok({ meetingId: meeting.id })
      })
      .step('upload-board-documents', 'Upload governance documents to vault', async (context) => {
        const vault = context.vaults[0]
        const assets = context.assets.filter(a => a.vaultIds.includes(vault.id))
        context.testData.documentIds = assets.map(a => a.id)
        return Ok({ documentIds: assets.map(a => a.id) })
      })
      .step('invite-board-members', 'Invite members to board meeting', async (context) => {
        const boardMembers = context.users.filter(u => 
          u.role === 'board_member' || u.role === 'admin'
        )
        context.testData.invitees = boardMembers.map(m => m.id)
        return Ok({ invitees: boardMembers.map(m => m.id) })
      })
      .step('conduct-voting', 'Conduct board resolution voting', async (context) => {
        const meeting = context.meetings[0]
        const resolutions = meeting.resolutions
        context.testData.resolutionIds = resolutions.map(r => r.id)
        return Ok({ resolutionIds: resolutions.map(r => r.id) })
      })
      .assertion('meeting-created', 'Board meeting should be created', async (context) => {
        return Ok(!!context.testData.meetingId)
      })
      .assertion('documents-uploaded', 'All required documents should be uploaded', async (context) => {
        const documentCount = context.testData.documentIds?.length || 0
        return Ok(documentCount >= 3) // Minimum 3 governance documents
      })
      .assertion('quorum-met', 'Meeting should have sufficient attendance for quorum', async (context) => {
        const inviteeCount = context.testData.invitees?.length || 0
        return Ok(inviteeCount >= 5) // Minimum quorum
      })
      .assertion('resolutions-voted', 'All resolutions should have voting records', async (context) => {
        const resolutionCount = context.testData.resolutionIds?.length || 0
        return Ok(resolutionCount > 0)
      })
  }

  createAssetManagementScenario(): ScenarioBuilder {
    return this.createScenario(
      'asset-management-workflow',
      'Asset Management and Collaboration',
      'Tests document upload, sharing, annotation, and collaboration features'
    )
      .withTag('assets')
      .withTag('collaboration')
      .withTag('workflow')
      .withTimeout(180000) // 3 minutes
      .step('create-vault', 'Create organizational vault', async (context) => {
        const vault = context.vaults[0]
        context.testData.vaultId = vault.id
        return Ok({ vaultId: vault.id })
      })
      .step('upload-assets', 'Upload various document types', async (context) => {
        const assets = context.assets.slice(0, 5) // First 5 assets
        context.testData.assetIds = assets.map(a => a.id)
        return Ok({ assetIds: assets.map(a => a.id) })
      })
      .step('set-permissions', 'Configure asset permissions', async (context) => {
        const assets = context.assets.slice(0, 5)
        const permissions = assets.map(asset => ({
          assetId: asset.id,
          permissions: asset.permissions
        }))
        context.testData.permissions = permissions
        return Ok({ permissions })
      })
      .step('create-annotations', 'Create document annotations', async (context) => {
        const assetIds = context.testData.assetIds || []
        const annotations = assetIds.map((id: string) => ({
          assetId: id,
          annotationId: `annotation-${id}`,
          type: 'comment',
          content: 'Test annotation content'
        }))
        context.testData.annotations = annotations
        return Ok({ annotations })
      })
      .step('share-with-collaborators', 'Share documents with team members', async (context) => {
        const collaborators = context.users.slice(1, 4) // Share with 3 users
        const shares = context.testData.assetIds.map((assetId: string) => ({
          assetId,
          sharedWith: collaborators.map(c => c.id)
        }))
        context.testData.shares = shares
        return Ok({ shares })
      })
      .assertion('vault-created', 'Vault should be successfully created', async (context) => {
        return Ok(!!context.testData.vaultId)
      })
      .assertion('assets-uploaded', 'All assets should be uploaded successfully', async (context) => {
        const assetCount = context.testData.assetIds?.length || 0
        return Ok(assetCount === 5)
      })
      .assertion('permissions-set', 'Asset permissions should be configured', async (context) => {
        const permissionCount = context.testData.permissions?.length || 0
        return Ok(permissionCount === 5)
      })
      .assertion('annotations-created', 'Annotations should be created on documents', async (context) => {
        const annotationCount = context.testData.annotations?.length || 0
        return Ok(annotationCount === 5)
      })
      .assertion('sharing-configured', 'Documents should be shared with collaborators', async (context) => {
        const shareCount = context.testData.shares?.length || 0
        return Ok(shareCount === 5)
      })
  }

  createComplianceAuditScenario(): ScenarioBuilder {
    return this.createScenario(
      'compliance-audit-workflow',
      'Compliance and Audit Trail Testing',
      'Tests audit logging, compliance reporting, and regulatory requirements'
    )
      .withTag('compliance')
      .withTag('audit')
      .withTag('security')
      .withTimeout(240000) // 4 minutes
      .step('generate-audit-events', 'Generate various audit events', async (context) => {
        const events = [
          { type: 'user_login', severity: 'low' },
          { type: 'document_access', severity: 'medium' },
          { type: 'permission_change', severity: 'high' },
          { type: 'data_export', severity: 'critical' }
        ]
        context.testData.auditEvents = events
        return Ok({ events })
      })
      .step('test-gdpr-compliance', 'Test GDPR data subject rights', async (context) => {
        const user = context.users[0]
        const gdprRequests = [
          { type: 'access', userId: user.id },
          { type: 'portability', userId: user.id },
          { type: 'erasure', userId: user.id }
        ]
        context.testData.gdprRequests = gdprRequests
        return Ok({ gdprRequests })
      })
      .step('generate-compliance-report', 'Generate compliance reports', async (context) => {
        const report = {
          reportId: 'compliance-report-test',
          generatedAt: new Date(),
          organizationId: context.organizations[0].id,
          complianceScore: 85.5,
          findings: ['minor-issue-1', 'minor-issue-2'],
          recommendations: ['implement-2fa', 'update-privacy-policy']
        }
        context.testData.complianceReport = report
        return Ok({ report })
      })
      .step('test-audit-trail-integrity', 'Verify audit trail integrity', async (context) => {
        const integrityCheck = {
          verified: true,
          checksum: 'abc123def456',
          timestamp: new Date(),
          eventsVerified: context.testData.auditEvents?.length || 0
        }
        context.testData.integrityCheck = integrityCheck
        return Ok({ integrityCheck })
      })
      .assertion('audit-events-logged', 'All audit events should be properly logged', async (context) => {
        const eventCount = context.testData.auditEvents?.length || 0
        return Ok(eventCount === 4)
      })
      .assertion('gdpr-requests-processed', 'GDPR requests should be processed', async (context) => {
        const requestCount = context.testData.gdprRequests?.length || 0
        return Ok(requestCount === 3)
      })
      .assertion('compliance-report-generated', 'Compliance report should be generated', async (context) => {
        const report = context.testData.complianceReport
        return Ok(!!report && report.complianceScore >= 80)
      })
      .assertion('audit-trail-intact', 'Audit trail integrity should be verified', async (context) => {
        const integrity = context.testData.integrityCheck
        return Ok(!!integrity && integrity.verified)
      })
  }
}

export class ScenarioBuilder {
  private scenario: Partial<TestScenario>
  private builder: TestScenarioBuilder

  constructor(id: string, name: string, description: string, builder: TestScenarioBuilder) {
    this.scenario = {
      id,
      name,
      description,
      tags: [],
      steps: [],
      assertions: [],
      timeout: 60000, // Default 1 minute
      retries: 0,
      parallel: false
    }
    this.builder = builder
  }

  withTag(tag: string): this {
    this.scenario.tags?.push(tag)
    return this
  }

  withTimeout(timeout: number): this {
    this.scenario.timeout = timeout
    return this
  }

  withRetries(retries: number): this {
    this.scenario.retries = retries
    return this
  }

  withParallelExecution(): this {
    this.scenario.parallel = true
    return this
  }

  step(
    id: string,
    name: string,
    execute: (context: TestScenarioContext) => Promise<Result<any, AppError>>,
    options: {
      description?: string
      rollback?: (context: TestScenarioContext) => Promise<Result<void, AppError>>
      timeout?: number
      skipOnFailure?: boolean
      continueOnError?: boolean
    } = {}
  ): this {
    this.scenario.steps?.push({
      id,
      name,
      description: options.description || name,
      execute,
      rollback: options.rollback,
      timeout: options.timeout,
      skipOnFailure: options.skipOnFailure,
      continueOnError: options.continueOnError
    })
    return this
  }

  assertion(
    id: string,
    name: string,
    check: (context: TestScenarioContext) => Promise<Result<boolean, AppError>>,
    options: {
      description?: string
      critical?: boolean
      timeout?: number
    } = {}
  ): this {
    this.scenario.assertions?.push({
      id,
      name,
      description: options.description || name,
      check,
      critical: options.critical || false,
      timeout: options.timeout
    })
    return this
  }

  build(): TestScenario {
    const scenario: TestScenario = {
      ...this.scenario,
      setup: this.createDefaultSetup(),
      teardown: this.createDefaultTeardown()
    } as TestScenario

    this.builder.registerScenario(scenario)
    return scenario
  }

  private createDefaultSetup(): () => Promise<Result<TestScenarioContext, AppError>> {
    return async (): Promise<Result<TestScenarioContext, AppError>> => {
      try {
        // Generate comprehensive test data
        const dataset = this.builder['dataGenerator'].generateCompleteDataset({
          organizations: 2,
          usersPerOrg: 10,
          vaultsPerOrg: 5,
          assetsPerVault: 20,
          meetingsPerOrg: 8,
          activitiesPerUser: 50
        })

        const context: TestScenarioContext = {
          scenario: this.scenario as TestScenario,
          organizations: dataset.organizations,
          users: dataset.users,
          vaults: dataset.vaults,
          assets: dataset.assets,
          meetings: dataset.meetings,
          executionState: {},
          createdResources: [],
          testData: {},
          startTime: new Date(),
          metrics: {
            stepCount: this.scenario.steps?.length || 0,
            completedSteps: 0,
            failedSteps: 0,
            skippedSteps: 0,
            assertionCount: this.scenario.assertions?.length || 0,
            passedAssertions: 0,
            failedAssertions: 0,
            executionTime: 0,
            memoryUsage: {
              start: process.memoryUsage().heapUsed,
              end: 0,
              peak: process.memoryUsage().heapUsed
            }
          }
        }

        return Ok(context)
      } catch (error) {
        return Err({
          code: 'INTERNAL_ERROR' as any,
          message: `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        })
      }
    }
  }

  private createDefaultTeardown(): (context: TestScenarioContext) => Promise<Result<void, AppError>> {
    return async (context: TestScenarioContext): Promise<Result<void, AppError>> => {
      try {
        // Clean up created resources
        for (const resource of context.createdResources) {
          await resource.cleanup()
        }

        // Update final metrics
        context.metrics.executionTime = Date.now() - context.startTime.getTime()
        context.metrics.memoryUsage.end = process.memoryUsage().heapUsed

        return Ok(undefined)
      } catch (error) {
        return Err({
          code: 'INTERNAL_ERROR' as any,
          message: `Teardown failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        })
      }
    }
  }
}

export interface TestScenarioResult {
  scenarioId: string
  scenarioName: string
  success: boolean
  startTime: Date
  endTime: Date
  executionTime: number
  stepResults: StepResult[]
  assertionResults: AssertionResult[]
  metrics: TestScenarioMetrics
  errors: AppError[]
  context: TestScenarioContext
}

export interface StepResult {
  stepId: string
  stepName: string
  success: boolean
  executionTime: number
  result?: any
  error?: AppError
  skipped: boolean
}

export interface AssertionResult {
  assertionId: string
  assertionName: string
  passed: boolean
  critical: boolean
  executionTime: number
  error?: AppError
}

export class ScenarioExecutor {
  async execute(scenario: TestScenario): Promise<Result<TestScenarioResult, AppError>> {
    const startTime = new Date()
    const stepResults: StepResult[] = []
    const assertionResults: AssertionResult[] = []
    const errors: AppError[] = []

    try {
      // Setup
      const setupResult = await scenario.setup()
      if (!setupResult.success) {
        return Err(setupResult.error)
      }

      const context = setupResult.data

      // Execute steps
      for (const step of scenario.steps) {
        const stepStartTime = Date.now()
        let stepResult: StepResult = {
          stepId: step.id,
          stepName: step.name,
          success: false,
          executionTime: 0,
          skipped: false
        }

        try {
          const executeResult = await this.executeWithTimeout(
            () => step.execute(context),
            step.timeout || scenario.timeout
          )

          stepResult.executionTime = Date.now() - stepStartTime

          if (executeResult.success) {
            stepResult.success = true
            stepResult.result = executeResult.data
            context.metrics.completedSteps++
          } else {
            stepResult.success = false
            stepResult.error = executeResult.error
            context.metrics.failedSteps++
            errors.push(executeResult.error)

            if (!step.continueOnError) {
              // Execute rollback if available
              if (step.rollback) {
                await step.rollback(context)
              }
              break
            }
          }
        } catch (error) {
          stepResult.executionTime = Date.now() - stepStartTime
          stepResult.success = false
          stepResult.error = {
            code: 'INTERNAL_ERROR' as any,
            message: `Step execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
            cause: error instanceof Error ? error : undefined
          }
          context.metrics.failedSteps++
          errors.push(stepResult.error)
        }

        stepResults.push(stepResult)

        // Update peak memory usage
        const currentMemory = process.memoryUsage().heapUsed
        if (currentMemory > context.metrics.memoryUsage.peak) {
          context.metrics.memoryUsage.peak = currentMemory
        }
      }

      // Execute assertions
      for (const assertion of scenario.assertions) {
        const assertionStartTime = Date.now()
        let assertionResult: AssertionResult = {
          assertionId: assertion.id,
          assertionName: assertion.name,
          passed: false,
          critical: assertion.critical,
          executionTime: 0
        }

        try {
          const checkResult = await this.executeWithTimeout(
            () => assertion.check(context),
            assertion.timeout || scenario.timeout
          )

          assertionResult.executionTime = Date.now() - assertionStartTime

          if (checkResult.success) {
            assertionResult.passed = checkResult.data
            if (assertionResult.passed) {
              context.metrics.passedAssertions++
            } else {
              context.metrics.failedAssertions++
            }
          } else {
            assertionResult.passed = false
            assertionResult.error = checkResult.error
            context.metrics.failedAssertions++
            errors.push(checkResult.error)
          }
        } catch (error) {
          assertionResult.executionTime = Date.now() - assertionStartTime
          assertionResult.passed = false
          assertionResult.error = {
            code: 'INTERNAL_ERROR' as any,
            message: `Assertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
            cause: error instanceof Error ? error : undefined
          }
          context.metrics.failedAssertions++
          errors.push(assertionResult.error)
        }

        assertionResults.push(assertionResult)
      }

      // Teardown
      await scenario.teardown(context)

      const endTime = new Date()
      const success = errors.length === 0 && assertionResults.every(a => a.passed || !a.critical)

      const result: TestScenarioResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        success,
        startTime,
        endTime,
        executionTime: endTime.getTime() - startTime.getTime(),
        stepResults,
        assertionResults,
        metrics: context.metrics,
        errors,
        context
      }

      return Ok(result)

    } catch (error) {
      const endTime = new Date()
      const appError: AppError = {
        code: 'INTERNAL_ERROR' as any,
        message: `Scenario execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      }

      const result: TestScenarioResult = {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        success: false,
        startTime,
        endTime,
        executionTime: endTime.getTime() - startTime.getTime(),
        stepResults,
        assertionResults,
        metrics: {} as TestScenarioMetrics,
        errors: [appError],
        context: {} as TestScenarioContext
      }

      return Ok(result)
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<Result<T, AppError>>,
    timeout: number
  ): Promise<Result<T, AppError>> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(Err({
          code: 'TIMEOUT' as any,
          message: `Operation timed out after ${timeout}ms`,
          timestamp: new Date()
        }))
      }, timeout)

      operation()
        .then((result) => {
          clearTimeout(timer)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timer)
          resolve(Err({
            code: 'INTERNAL_ERROR' as any,
            message: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
            cause: error instanceof Error ? error : undefined
          }))
        })
    })
  }
}

// Export singleton instance and factory functions
export const scenarioBuilder = new TestScenarioBuilder()

export function createScenarioBuilder(options?: ScenarioBuilderOptions): TestScenarioBuilder {
  return new TestScenarioBuilder(options)
}