/**
 * Integration Test Harness
 * Comprehensive testing framework for repository and service layer integration
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'
import { Result, Ok, Err } from '../../lib/result'
import { RepositoryFactory } from '../../lib/repositories'
import { ServiceFactory } from '../../lib/services'
import { TestIsolationManager, TestContext, TestHooks } from './test-isolation'
import { DatabaseSeeder, SeedResult } from './database-seeding'
import { TestScenarioBuilder, scenarioBuilder } from './test-scenario-builder'
import type { AppError } from '../../lib/result/types'

export interface IntegrationTestSuite {
  suiteName: string
  description: string
  tests: IntegrationTest[]
  hooks: IntegrationTestHooks
  config: IntegrationTestConfig
  dependencies: string[]
  tags: string[]
}

export interface IntegrationTest {
  testName: string
  description: string
  category: 'repository' | 'service' | 'workflow' | 'api' | 'performance'
  execute: (harness: IntegrationTestHarness) => Promise<Result<TestResult, AppError>>
  setup?: (harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
  teardown?: (harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
  timeout: number
  retries: number
  skip: boolean
  tags: string[]
  assertions: TestAssertion[]
}

export interface TestAssertion {
  name: string
  description: string
  check: (result: any, harness: IntegrationTestHarness) => Promise<Result<boolean, AppError>>
  critical: boolean
}

export interface TestResult {
  testName: string
  success: boolean
  executionTime: number
  result?: any
  error?: AppError
  assertions: AssertionResult[]
  metrics: TestMetrics
  artifacts: TestArtifact[]
}

export interface AssertionResult {
  name: string
  passed: boolean
  executionTime: number
  error?: AppError
  metadata?: Record<string, any>
}

export interface TestMetrics {
  databaseQueries: number
  memoryUsage: number
  performanceMarks: Record<string, number>
  resourceUtilization: {
    cpu: number
    memory: number
    io: number
  }
}

export interface TestArtifact {
  type: 'log' | 'screenshot' | 'data' | 'trace' | 'report'
  name: string
  path: string
  size: number
  metadata: Record<string, any>
}

export interface IntegrationTestConfig {
  isolationType: 'transaction' | 'schema' | 'tenant'
  seedData: boolean
  seedScenario?: 'small-board' | 'large-enterprise' | 'startup' | 'nonprofit'
  parallel: boolean
  timeout: number
  retries: number
  continueOnFailure: boolean
  collectMetrics: boolean
  generateReports: boolean
  artifactPath: string
}

export interface IntegrationTestHooks {
  beforeAll?: (harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
  afterAll?: (harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
  beforeEach?: (test: IntegrationTest, harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
  afterEach?: (test: IntegrationTest, result: TestResult, harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
}

export interface SuiteResult {
  suiteName: string
  success: boolean
  executionTime: number
  testResults: TestResult[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    totalAssertions: number
    passedAssertions: number
    failedAssertions: number
  }
  artifacts: TestArtifact[]
}

export class IntegrationTestHarness {
  private supabase: SupabaseClient<Database>
  private repositories: RepositoryFactory
  private services: ServiceFactory
  private isolationManager: TestIsolationManager
  private seeder: DatabaseSeeder
  private scenarioBuilder: TestScenarioBuilder
  private context?: TestContext
  private seedData?: SeedResult
  private artifacts: TestArtifact[] = []

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.repositories = new RepositoryFactory(supabase)
    this.services = new ServiceFactory(this.repositories)
    this.isolationManager = new TestIsolationManager(supabase)
    this.seeder = new DatabaseSeeder(supabase)
    this.scenarioBuilder = scenarioBuilder
  }

  /**
   * Execute integration test suite
   */
  async executeSuite(suite: IntegrationTestSuite): Promise<Result<SuiteResult, AppError>> {
    const startTime = Date.now()
    const testResults: TestResult[] = []
    let globalError: AppError | undefined

    console.log(`🧪 Starting integration test suite: ${suite.suiteName}`)
    console.log(`📝 Description: ${suite.description}`)
    console.log(`🏷️  Tags: ${suite.tags.join(', ')}`)
    console.log(`🔗 Dependencies: ${suite.dependencies.join(', ')}`)

    try {
      // Execute beforeAll hook
      if (suite.hooks.beforeAll) {
        console.log('🔧 Executing beforeAll hook...')
        const hookResult = await suite.hooks.beforeAll(this)
        if (!hookResult.success) {
          return Err(hookResult.error)
        }
      }

      // Set up test isolation context
      const contextResult = await this.isolationManager.createTestContext(
        suite.suiteName,
        {
          isolationType: suite.config.isolationType,
          autoCleanup: !suite.config.continueOnFailure,
          timeout: suite.config.timeout,
          snapshotData: suite.config.generateReports
        }
      )

      if (!contextResult.success) {
        return Err(contextResult.error)
      }

      this.context = contextResult.data

      // Seed test data if requested
      if (suite.config.seedData) {
        console.log('🌱 Seeding test data...')
        const seedResult = suite.config.seedScenario
          ? await this.seeder.seedGovernanceScenario(suite.config.seedScenario)
          : await this.seeder.seedDatabase({
              organizations: 2,
              usersPerOrg: 10,
              vaultsPerOrg: 5,
              assetsPerVault: 20,
              meetingsPerOrg: 8,
              activitiesPerUser: 75
            })

        if (!seedResult.success) {
          return Err(seedResult.error)
        }

        this.seedData = seedResult.data
        console.log(`✅ Seeded ${seedResult.data.recordsCreated} records in ${seedResult.data.executionTime}ms`)
      }

      // Execute tests
      const tests = suite.config.parallel 
        ? await this.executeTestsParallel(suite)
        : await this.executeTestsSequential(suite)

      if (!tests.success) {
        globalError = tests.error
      } else {
        testResults.push(...tests.data)
      }

      // Execute afterAll hook
      if (suite.hooks.afterAll) {
        console.log('🔧 Executing afterAll hook...')
        const hookResult = await suite.hooks.afterAll(this)
        if (!hookResult.success && !globalError) {
          globalError = hookResult.error
        }
      }

    } catch (error) {
      globalError = {
        code: 'INTERNAL_ERROR' as any,
        message: `Suite execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      }
    } finally {
      // Clean up context
      if (this.context) {
        await this.isolationManager.cleanupContext(this.context.contextId)
      }
    }

    const executionTime = Date.now() - startTime
    const summary = this.calculateSummary(testResults)

    const suiteResult: SuiteResult = {
      suiteName: suite.suiteName,
      success: !globalError && summary.failedTests === 0,
      executionTime,
      testResults,
      summary,
      artifacts: this.artifacts
    }

    console.log(`🏁 Suite completed in ${executionTime}ms`)
    console.log(`✅ ${summary.passedTests}/${summary.totalTests} tests passed`)
    console.log(`❌ ${summary.failedTests} tests failed`)
    console.log(`⏭️  ${summary.skippedTests} tests skipped`)

    if (suite.config.generateReports) {
      await this.generateTestReport(suiteResult)
    }

    return globalError ? Err(globalError) : Ok(suiteResult)
  }

  /**
   * Execute single integration test
   */
  async executeTest(test: IntegrationTest): Promise<Result<TestResult, AppError>> {
    const startTime = Date.now()
    const performanceMarks: Record<string, number> = {}
    const artifacts: TestArtifact[] = []

    console.log(`  🧪 Running test: ${test.testName}`)

    try {
      // Skip test if marked
      if (test.skip) {
        return Ok({
          testName: test.testName,
          success: true,
          executionTime: 0,
          assertions: [],
          metrics: {
            databaseQueries: 0,
            memoryUsage: 0,
            performanceMarks: {},
            resourceUtilization: { cpu: 0, memory: 0, io: 0 }
          },
          artifacts: []
        })
      }

      // Execute test setup
      if (test.setup) {
        performanceMarks.setupStart = performance.now()
        const setupResult = await test.setup(this)
        performanceMarks.setupEnd = performance.now()
        
        if (!setupResult.success) {
          return Err(setupResult.error)
        }
      }

      // Execute test with timeout
      performanceMarks.testStart = performance.now()
      const testResult = await this.executeWithTimeout(
        () => test.execute(this),
        test.timeout
      )
      performanceMarks.testEnd = performance.now()

      if (!testResult.success) {
        return Err(testResult.error)
      }

      // Execute assertions
      const assertionResults: AssertionResult[] = []
      for (const assertion of test.assertions) {
        const assertionStart = performance.now()
        
        try {
          const checkResult = await assertion.check(testResult.data, this)
          const assertionEnd = performance.now()

          assertionResults.push({
            name: assertion.name,
            passed: checkResult.success && checkResult.data,
            executionTime: assertionEnd - assertionStart,
            error: checkResult.success ? undefined : checkResult.error,
            metadata: { critical: assertion.critical }
          })

        } catch (error) {
          const assertionEnd = performance.now()
          assertionResults.push({
            name: assertion.name,
            passed: false,
            executionTime: assertionEnd - assertionStart,
            error: {
              code: 'INTERNAL_ERROR' as any,
              message: `Assertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date(),
              cause: error instanceof Error ? error : undefined
            },
            metadata: { critical: assertion.critical }
          })
        }
      }

      // Execute test teardown
      if (test.teardown) {
        performanceMarks.teardownStart = performance.now()
        const teardownResult = await test.teardown(this)
        performanceMarks.teardownEnd = performance.now()
        
        if (!teardownResult.success) {
          console.warn(`Test teardown failed for ${test.testName}:`, teardownResult.error)
        }
      }

      const executionTime = Date.now() - startTime
      const memoryUsage = process.memoryUsage().heapUsed
      const success = assertionResults.every(a => a.passed || !a.metadata?.critical)

      const result: TestResult = {
        testName: test.testName,
        success,
        executionTime,
        result: testResult.data,
        assertions: assertionResults,
        metrics: {
          databaseQueries: this.getDatabaseQueryCount(),
          memoryUsage,
          performanceMarks,
          resourceUtilization: this.getResourceUtilization()
        },
        artifacts
      }

      console.log(`    ${success ? '✅' : '❌'} ${test.testName} (${executionTime}ms)`)
      if (!success) {
        const failedAssertions = assertionResults.filter(a => !a.passed)
        failedAssertions.forEach(a => {
          console.log(`      ❌ ${a.name}: ${a.error?.message || 'Failed'}`)
        })
      }

      return Ok(result)

    } catch (error) {
      const executionTime = Date.now() - startTime
      const appError: AppError = {
        code: 'INTERNAL_ERROR' as any,
        message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      }

      console.log(`    ❌ ${test.testName} (${executionTime}ms) - ${appError.message}`)

      return Ok({
        testName: test.testName,
        success: false,
        executionTime,
        error: appError,
        assertions: [],
        metrics: {
          databaseQueries: 0,
          memoryUsage: process.memoryUsage().heapUsed,
          performanceMarks,
          resourceUtilization: this.getResourceUtilization()
        },
        artifacts
      })
    }
  }

  /**
   * Create test suite builder
   */
  createSuite(suiteName: string, description: string): IntegrationTestSuiteBuilder {
    return new IntegrationTestSuiteBuilder(suiteName, description, this)
  }

  /**
   * Access repositories
   */
  get repo() {
    return this.repositories
  }

  /**
   * Access services  
   */
  get service() {
    return this.services
  }

  /**
   * Get current test context
   */
  getContext(): TestContext | undefined {
    return this.context
  }

  /**
   * Get seeded data
   */
  getSeedData(): SeedResult | undefined {
    return this.seedData
  }

  /**
   * Add test artifact
   */
  addArtifact(artifact: Omit<TestArtifact, 'size'>): void {
    this.artifacts.push({
      ...artifact,
      size: 0 // Would calculate actual size in real implementation
    })
  }

  // Private methods

  private async executeTestsSequential(suite: IntegrationTestSuite): Promise<Result<TestResult[], AppError>> {
    const results: TestResult[] = []

    for (const test of suite.tests) {
      // Execute beforeEach hook
      if (suite.hooks.beforeEach) {
        const hookResult = await suite.hooks.beforeEach(test, this)
        if (!hookResult.success) {
          return Err(hookResult.error)
        }
      }

      // Execute test
      const testResult = await this.executeTest(test)
      if (!testResult.success) {
        if (!suite.config.continueOnFailure) {
          return Err(testResult.error)
        }
        // Add error as failed test result
        results.push({
          testName: test.testName,
          success: false,
          executionTime: 0,
          error: testResult.error,
          assertions: [],
          metrics: {
            databaseQueries: 0,
            memoryUsage: 0,
            performanceMarks: {},
            resourceUtilization: { cpu: 0, memory: 0, io: 0 }
          },
          artifacts: []
        })
      } else {
        results.push(testResult.data)
      }

      // Execute afterEach hook
      if (suite.hooks.afterEach) {
        const hookResult = await suite.hooks.afterEach(test, results[results.length - 1], this)
        if (!hookResult.success && !suite.config.continueOnFailure) {
          return Err(hookResult.error)
        }
      }
    }

    return Ok(results)
  }

  private async executeTestsParallel(suite: IntegrationTestSuite): Promise<Result<TestResult[], AppError>> {
    const testPromises = suite.tests.map(async (test) => {
      // Note: In real parallel execution, each test would need its own isolation context
      if (suite.hooks.beforeEach) {
        await suite.hooks.beforeEach(test, this)
      }

      const result = await this.executeTest(test)
      const testResult = result.success ? result.data : {
        testName: test.testName,
        success: false,
        executionTime: 0,
        error: result.error,
        assertions: [],
        metrics: {
          databaseQueries: 0,
          memoryUsage: 0,
          performanceMarks: {},
          resourceUtilization: { cpu: 0, memory: 0, io: 0 }
        },
        artifacts: []
      }

      if (suite.hooks.afterEach) {
        await suite.hooks.afterEach(test, testResult, this)
      }

      return testResult
    })

    try {
      const results = await Promise.all(testPromises)
      return Ok(results)
    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Parallel test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
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
          message: `Test timed out after ${timeout}ms`,
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
            message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            timestamp: new Date(),
            cause: error instanceof Error ? error : undefined
          }))
        })
    })
  }

  private calculateSummary(results: TestResult[]) {
    const totalTests = results.length
    const passedTests = results.filter(r => r.success).length
    const failedTests = results.filter(r => !r.success).length
    const skippedTests = results.filter(r => r.executionTime === 0).length
    
    const totalAssertions = results.reduce((sum, r) => sum + r.assertions.length, 0)
    const passedAssertions = results.reduce((sum, r) => sum + r.assertions.filter(a => a.passed).length, 0)
    const failedAssertions = totalAssertions - passedAssertions

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      totalAssertions,
      passedAssertions,
      failedAssertions
    }
  }

  private getDatabaseQueryCount(): number {
    // In a real implementation, this would track database queries
    // using connection monitoring or query interceptors
    return 0
  }

  private getResourceUtilization() {
    const usage = process.memoryUsage()
    return {
      cpu: process.cpuUsage().user / 1000, // Convert to milliseconds
      memory: usage.heapUsed / 1024 / 1024, // Convert to MB
      io: 0 // Would track actual I/O in real implementation
    }
  }

  private async generateTestReport(result: SuiteResult): Promise<void> {
    // Generate comprehensive test report
    const reportPath = `test-reports/${result.suiteName}-${Date.now()}.json`
    
    this.addArtifact({
      type: 'report',
      name: 'Test Suite Report',
      path: reportPath,
      metadata: {
        suite: result.suiteName,
        timestamp: new Date().toISOString(),
        summary: result.summary
      }
    })

    console.log(`📊 Test report generated: ${reportPath}`)
  }
}

export class IntegrationTestSuiteBuilder {
  private suite: Partial<IntegrationTestSuite>

  constructor(suiteName: string, description: string, private harness: IntegrationTestHarness) {
    this.suite = {
      suiteName,
      description,
      tests: [],
      hooks: {},
      dependencies: [],
      tags: [],
      config: {
        isolationType: 'transaction',
        seedData: false,
        parallel: false,
        timeout: 30000,
        retries: 0,
        continueOnFailure: false,
        collectMetrics: true,
        generateReports: true,
        artifactPath: './test-artifacts'
      }
    }
  }

  withTag(tag: string): this {
    this.suite.tags?.push(tag)
    return this
  }

  withDependency(dependency: string): this {
    this.suite.dependencies?.push(dependency)
    return this
  }

  withConfig(config: Partial<IntegrationTestConfig>): this {
    this.suite.config = { ...this.suite.config!, ...config }
    return this
  }

  withHooks(hooks: Partial<IntegrationTestHooks>): this {
    this.suite.hooks = { ...this.suite.hooks, ...hooks }
    return this
  }

  test(
    testName: string,
    description: string,
    execute: (harness: IntegrationTestHarness) => Promise<Result<any, AppError>>,
    options: {
      category?: IntegrationTest['category']
      timeout?: number
      retries?: number
      skip?: boolean
      tags?: string[]
      setup?: (harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
      teardown?: (harness: IntegrationTestHarness) => Promise<Result<void, AppError>>
    } = {}
  ): this {
    const test: IntegrationTest = {
      testName,
      description,
      category: options.category || 'workflow',
      execute,
      setup: options.setup,
      teardown: options.teardown,
      timeout: options.timeout || this.suite.config!.timeout,
      retries: options.retries || this.suite.config!.retries,
      skip: options.skip || false,
      tags: options.tags || [],
      assertions: []
    }

    this.suite.tests?.push(test)
    return this
  }

  assertion(
    testName: string,
    name: string,
    description: string,
    check: (result: any, harness: IntegrationTestHarness) => Promise<Result<boolean, AppError>>,
    critical = false
  ): this {
    const test = this.suite.tests?.find(t => t.testName === testName)
    if (test) {
      test.assertions.push({
        name,
        description,
        check,
        critical
      })
    }
    return this
  }

  async run(): Promise<Result<SuiteResult, AppError>> {
    const suite = this.suite as IntegrationTestSuite
    return this.harness.executeSuite(suite)
  }

  build(): IntegrationTestSuite {
    return this.suite as IntegrationTestSuite
  }
}

// Export factory functions
export function createIntegrationTestHarness(supabase: SupabaseClient<Database>): IntegrationTestHarness {
  return new IntegrationTestHarness(supabase)
}