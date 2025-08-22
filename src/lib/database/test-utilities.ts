/**
 * Database Test Utilities
 * Comprehensive testing utilities for database operations,
 * including transaction testing, constraint validation, and performance monitoring
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { EnhancedOrganizationRepository } from '@/lib/repositories/enhanced-organization.repository'
import { EnhancedOrganizationService } from '@/lib/services/enhanced-organization.service'
import { v4 as uuidv4 } from 'uuid'

export interface TestResult {
  success: boolean
  message: string
  duration: number
  details?: Record<string, any>
  error?: Error
}

export interface TestSuite {
  name: string
  tests: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    duration: number
    success: boolean
  }
}

/**
 * Database Test Runner
 */
export class DatabaseTestRunner {
  private supabase: any
  private repository: EnhancedOrganizationRepository
  private service: EnhancedOrganizationService

  constructor() {
    // Initialize will be called in async methods
  }

  private async initialize() {
    if (!this.supabase) {
      this.supabase = await createSupabaseServerClient()
      this.repository = new EnhancedOrganizationRepository(this.supabase)
      this.service = new EnhancedOrganizationService(this.supabase)
    }
  }

  /**
   * Run comprehensive database tests
   */
  async runAllTests(): Promise<TestSuite[]> {
    await this.initialize()
    
    console.log('🚀 Starting comprehensive database tests...')
    
    const suites: TestSuite[] = [
      await this.runConnectionTests(),
      await this.runSchemaValidationTests(),
      await this.runConstraintTests(),
      await this.runTransactionTests(),
      await this.runPerformanceTests(),
      await this.runErrorHandlingTests(),
      await this.runBusinessLogicTests()
    ]

    const overallSummary = {
      totalSuites: suites.length,
      totalTests: suites.reduce((sum, suite) => sum + suite.summary.total, 0),
      totalPassed: suites.reduce((sum, suite) => sum + suite.summary.passed, 0),
      totalFailed: suites.reduce((sum, suite) => sum + suite.summary.failed, 0),
      totalDuration: suites.reduce((sum, suite) => sum + suite.summary.duration, 0),
      overallSuccess: suites.every(suite => suite.summary.success)
    }

    console.log('📊 Overall Test Summary:', overallSummary)
    
    return suites
  }

  /**
   * Connection and basic functionality tests
   */
  private async runConnectionTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test 1: Basic connection
    tests.push(await this.runTest('Basic Database Connection', async () => {
      const { count } = await this.supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
      
      return { organizationCount: count }
    }))

    // Test 2: Authentication state
    tests.push(await this.runTest('Authentication State', async () => {
      const { data: { user } } = await this.supabase.auth.getUser()
      return { hasUser: !!user, userId: user?.id }
    }))

    // Test 3: RPC functionality
    tests.push(await this.runTest('RPC Function Access', async () => {
      // Test if we can call database functions
      try {
        await this.supabase.rpc('version')
        return { rpcAvailable: true }
      } catch (error) {
        return { rpcAvailable: false, error: error.message }
      }
    }))

    return this.createTestSuite('Connection Tests', tests, Date.now() - startTime)
  }

  /**
   * Database schema validation tests
   */
  private async runSchemaValidationTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    const requiredTables = [
      'organizations',
      'organization_members',
      'organization_invitations',
      'organization_features'
    ]

    const requiredColumns = {
      organizations: ['id', 'name', 'slug', 'created_by', 'is_active'],
      organization_members: ['id', 'organization_id', 'user_id', 'role', 'status'],
      organization_invitations: ['id', 'organization_id', 'email', 'role', 'status'],
      organization_features: ['organization_id', 'ai_summarization', 'plan_type']
    }

    // Test table existence
    for (const table of requiredTables) {
      tests.push(await this.runTest(`Table ${table} exists`, async () => {
        const { error } = await this.supabase.from(table).select('*').limit(0)
        if (error) throw new Error(`Table ${table} not accessible: ${error.message}`)
        return { tableExists: true }
      }))
    }

    // Test column existence
    for (const [table, columns] of Object.entries(requiredColumns)) {
      tests.push(await this.runTest(`Table ${table} has required columns`, async () => {
        const { data, error } = await this.supabase
          .from(table)
          .select(columns.join(', '))
          .limit(1)

        if (error) throw new Error(`Columns missing in ${table}: ${error.message}`)
        return { columnsExist: true, testedColumns: columns }
      }))
    }

    // Test enum types
    tests.push(await this.runTest('Organization Role Enum', async () => {
      const { error } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('role', 'owner')
        .limit(1)

      if (error) throw new Error(`Role enum validation failed: ${error.message}`)
      return { enumValid: true }
    }))

    return this.createTestSuite('Schema Validation Tests', tests, Date.now() - startTime)
  }

  /**
   * Database constraint tests
   */
  private async runConstraintTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test unique constraints
    tests.push(await this.runTest('Unique Slug Constraint', async () => {
      const testSlug = `test-unique-${Date.now()}`
      
      // Create first organization
      const org1 = await this.supabase
        .from('organizations')
        .insert({
          name: 'Test Org 1',
          slug: testSlug,
          created_by: '00000000-0000-0000-0000-000000000000', // Test UUID
          is_active: true
        })
        .select()
        .single()

      if (org1.error) {
        throw new Error(`Failed to create test org: ${org1.error.message}`)
      }

      // Try to create second with same slug (should fail)
      const org2 = await this.supabase
        .from('organizations')
        .insert({
          name: 'Test Org 2',
          slug: testSlug,
          created_by: '00000000-0000-0000-0000-000000000000',
          is_active: true
        })

      // Cleanup
      await this.supabase
        .from('organizations')
        .delete()
        .eq('id', org1.data.id)

      if (!org2.error) {
        throw new Error('Unique constraint not enforced - duplicate slug allowed')
      }

      return { constraintEnforced: true, duplicateRejected: true }
    }))

    // Test foreign key constraints
    tests.push(await this.runTest('Foreign Key Constraints', async () => {
      const invalidOrgId = '11111111-1111-1111-1111-111111111111'
      const invalidUserId = '22222222-2222-2222-2222-222222222222'

      const { error } = await this.supabase
        .from('organization_members')
        .insert({
          organization_id: invalidOrgId,
          user_id: invalidUserId,
          role: 'member',
          status: 'active'
        })

      if (!error) {
        throw new Error('Foreign key constraint not enforced')
      }

      return { constraintEnforced: true, foreignKeyRejected: true }
    }))

    // Test check constraints
    tests.push(await this.runTest('Check Constraints', async () => {
      const testSlug = `test-check-${Date.now()}`
      
      // Try invalid slug (should fail)
      const { error } = await this.supabase
        .from('organizations')
        .insert({
          name: 'Test Org',
          slug: 'INVALID-SLUG-CAPS', // Should violate check constraint
          created_by: '00000000-0000-0000-0000-000000000000',
          is_active: true
        })

      if (!error) {
        throw new Error('Check constraint not enforced - invalid slug allowed')
      }

      return { constraintEnforced: true, invalidSlugRejected: true }
    }))

    return this.createTestSuite('Constraint Tests', tests, Date.now() - startTime)
  }

  /**
   * Transaction and atomicity tests
   */
  private async runTransactionTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test successful transaction
    tests.push(await this.runTest('Successful Transaction', async () => {
      const testUserId = uuidv4()
      const testSlug = `test-transaction-${Date.now()}`

      const result = await this.repository.createOrganizationWithTransaction({
        name: 'Test Transaction Org',
        slug: testSlug,
        created_by: testUserId
      })

      // Verify both organization and membership were created
      const org = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', result.organization.id)
        .single()

      const member = await this.supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', result.organization.id)
        .eq('user_id', testUserId)
        .single()

      // Cleanup
      await this.supabase.from('organization_members').delete().eq('organization_id', result.organization.id)
      await this.supabase.from('organizations').delete().eq('id', result.organization.id)

      if (org.error || member.error) {
        throw new Error('Transaction incomplete - missing data')
      }

      return { 
        transactionSuccessful: true,
        organizationCreated: true,
        membershipCreated: true,
        organizationId: result.organization.id
      }
    }))

    // Test failed transaction rollback
    tests.push(await this.runTest('Transaction Rollback', async () => {
      const testSlug = `test-rollback-${Date.now()}`
      
      try {
        // This should fail due to invalid user ID
        await this.repository.createOrganizationWithTransaction({
          name: 'Test Rollback Org',
          slug: testSlug,
          created_by: 'invalid-user-id' // This should cause the transaction to fail
        })
        
        throw new Error('Transaction should have failed but succeeded')
      } catch (error) {
        // Expected failure - verify no organization was created
        const { data: orphanOrg } = await this.supabase
          .from('organizations')
          .select('*')
          .eq('slug', testSlug)
          .single()

        if (orphanOrg) {
          throw new Error('Transaction rollback failed - organization exists')
        }

        return { rollbackSuccessful: true, noOrphanData: true }
      }
    }))

    return this.createTestSuite('Transaction Tests', tests, Date.now() - startTime)
  }

  /**
   * Performance tests
   */
  private async runPerformanceTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test query performance
    tests.push(await this.runTest('Query Performance', async () => {
      const queryStart = Date.now()
      
      await this.supabase
        .from('organizations')
        .select(`
          *,
          organization_members(count),
          organization_features(*)
        `)
        .eq('is_active', true)
        .limit(10)

      const duration = Date.now() - queryStart
      
      if (duration > 5000) {
        throw new Error(`Query too slow: ${duration}ms`)
      }

      return { queryDuration: duration, performanceAcceptable: true }
    }))

    // Test connection pooling
    tests.push(await this.runTest('Connection Pooling', async () => {
      const promises = Array.from({ length: 10 }, async (_, i) => {
        const start = Date.now()
        await this.supabase.from('organizations').select('count(*)').limit(1)
        return Date.now() - start
      })

      const durations = await Promise.all(promises)
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length

      return { 
        concurrentQueries: durations.length,
        averageDuration: avgDuration,
        connectionPooling: avgDuration < 1000
      }
    }))

    return this.createTestSuite('Performance Tests', tests, Date.now() - startTime)
  }

  /**
   * Error handling tests
   */
  private async runErrorHandlingTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test invalid UUID handling
    tests.push(await this.runTest('Invalid UUID Handling', async () => {
      try {
        await this.repository.findByIdSafe('invalid-uuid')
        throw new Error('Should have failed with invalid UUID')
      } catch (error) {
        if (!error.message.includes('Invalid organization ID format')) {
          throw new Error(`Unexpected error: ${error.message}`)
        }
        return { errorHandled: true, correctErrorMessage: true }
      }
    }))

    // Test duplicate slug handling
    tests.push(await this.runTest('Duplicate Slug Error Handling', async () => {
      const existingSlug = `existing-${Date.now()}`
      
      // Create organization first
      const result = await this.repository.createOrganizationWithTransaction({
        name: 'Existing Org',
        slug: existingSlug,
        created_by: uuidv4()
      })

      try {
        // Try to create another with same slug
        await this.repository.createOrganizationWithTransaction({
          name: 'Duplicate Org',
          slug: existingSlug,
          created_by: uuidv4()
        })
        
        throw new Error('Should have failed with duplicate slug')
      } catch (error) {
        // Cleanup
        await this.supabase.from('organization_members').delete().eq('organization_id', result.organization.id)
        await this.supabase.from('organizations').delete().eq('id', result.organization.id)

        if (!error.message.includes('already taken')) {
          throw new Error(`Unexpected error: ${error.message}`)
        }
        return { errorHandled: true, correctErrorMessage: true }
      }
    }))

    return this.createTestSuite('Error Handling Tests', tests, Date.now() - startTime)
  }

  /**
   * Business logic tests
   */
  private async runBusinessLogicTests(): Promise<TestSuite> {
    const tests: TestResult[] = []
    const startTime = Date.now()

    // Test slug availability
    tests.push(await this.runTest('Slug Availability Check', async () => {
      const uniqueSlug = `unique-${Date.now()}`
      const availability1 = await this.repository.isSlugAvailable(uniqueSlug)
      
      if (!availability1) {
        throw new Error('Unique slug reported as unavailable')
      }

      // Create organization
      const result = await this.repository.createOrganizationWithTransaction({
        name: 'Test Availability',
        slug: uniqueSlug,
        created_by: uuidv4()
      })

      // Check availability again
      const availability2 = await this.repository.isSlugAvailable(uniqueSlug)
      
      // Cleanup
      await this.supabase.from('organization_members').delete().eq('organization_id', result.organization.id)
      await this.supabase.from('organizations').delete().eq('id', result.organization.id)

      if (availability2) {
        throw new Error('Used slug reported as available')
      }

      return { uniqueSlugAvailable: true, usedSlugUnavailable: true }
    }))

    // Test validation rules
    tests.push(await this.runTest('Validation Rules', async () => {
      const validationTests = [
        { name: 'Empty name', data: { name: '', slug: 'test', created_by: uuidv4() } },
        { name: 'Invalid slug', data: { name: 'Test', slug: 'INVALID', created_by: uuidv4() } },
        { name: 'Long name', data: { name: 'a'.repeat(101), slug: 'test', created_by: uuidv4() } }
      ]

      let validationsPassed = 0

      for (const test of validationTests) {
        try {
          await this.repository.createOrganizationWithTransaction(test.data as any)
          throw new Error(`Validation should have failed for ${test.name}`)
        } catch (error) {
          if (error.message.includes('VALIDATION_ERROR')) {
            validationsPassed++
          } else {
            throw new Error(`Unexpected error for ${test.name}: ${error.message}`)
          }
        }
      }

      return { 
        validationTestsRun: validationTests.length,
        validationsPassed,
        allValidationsPassed: validationsPassed === validationTests.length
      }
    }))

    return this.createTestSuite('Business Logic Tests', tests, Date.now() - startTime)
  }

  /**
   * Run a single test with error handling and timing
   */
  private async runTest(name: string, testFunction: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now()
    
    try {
      const details = await testFunction()
      const duration = Date.now() - startTime
      
      console.log(`✅ ${name} (${duration}ms)`)
      
      return {
        success: true,
        message: name,
        duration,
        details
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      console.log(`❌ ${name} (${duration}ms): ${error.message}`)
      
      return {
        success: false,
        message: name,
        duration,
        error: error as Error
      }
    }
  }

  /**
   * Create test suite summary
   */
  private createTestSuite(name: string, tests: TestResult[], duration: number): TestSuite {
    const passed = tests.filter(t => t.success).length
    const failed = tests.length - passed
    const success = failed === 0

    const summary = {
      total: tests.length,
      passed,
      failed,
      duration,
      success
    }

    console.log(`📋 ${name}: ${passed}/${tests.length} passed (${duration}ms)`)

    return { name, tests, summary }
  }
}

/**
 * Quick database health check
 */
export async function quickHealthCheck() {
  const runner = new DatabaseTestRunner()
  const suites = await runner.runAllTests()
  
  return {
    overall: suites.every(s => s.summary.success),
    suites: suites.map(s => ({
      name: s.name,
      success: s.summary.success,
      passed: s.summary.passed,
      total: s.summary.total
    }))
  }
}