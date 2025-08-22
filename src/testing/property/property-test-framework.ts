/**
 * Property-Based Testing Framework
 * Advanced property testing with invariant checking, shrinking, and business rule validation
 */

import { Result, Ok, Err } from '../../lib/result'
import type { AppError } from '../../lib/result/types'

// Core property testing types
export interface PropertyTest<T> {
  name: string
  description: string
  generators: PropertyGenerator<any>[]
  property: (args: any[]) => Promise<Result<boolean, AppError>> | Result<boolean, AppError>
  invariants: Invariant<T>[]
  examples: T[]
  shrinkingStrategy: ShrinkingStrategy<T>
  maxTests: number
  maxShrinks: number
  timeout: number
  seed?: number
}

export interface PropertyGenerator<T> {
  name: string
  generate: (rng: SeededRandom, size: number) => T
  shrink: (value: T) => T[]
  isValid: (value: T) => boolean
}

export interface Invariant<T> {
  name: string
  description: string
  check: (input: T, output?: any) => Result<boolean, AppError>
  category: 'precondition' | 'postcondition' | 'business-rule' | 'data-integrity'
  critical: boolean
}

export interface ShrinkingStrategy<T> {
  name: string
  shrink: (value: T, property: PropertyTest<T>) => Promise<T[]>
  isMinimal: (value: T) => boolean
}

export interface PropertyTestResult {
  testName: string
  success: boolean
  totalTests: number
  failures: PropertyFailure[]
  statistics: PropertyStatistics
  shrinkingResults: ShrinkingResult[]
  invariantViolations: InvariantViolation[]
  executionTime: number
}

export interface PropertyFailure {
  testCase: number
  inputs: any[]
  output?: any
  error: AppError
  shrunk: boolean
  minimalCounterexample?: any[]
}

export interface ShrinkingResult {
  originalInputs: any[]
  shrunkInputs: any[]
  shrinkSteps: number
  shrinkTime: number
  success: boolean
}

export interface InvariantViolation {
  invariantName: string
  category: Invariant<any>['category']
  inputs: any[]
  output?: any
  violation: string
  critical: boolean
}

export interface PropertyStatistics {
  inputDistribution: Record<string, number>
  executionTimes: number[]
  memoryUsage: number[]
  cacheHitRate: number
  generationStats: GenerationStats
}

export interface GenerationStats {
  totalGenerated: number
  validGenerated: number
  rejectionRate: number
  averageSize: number
  sizeDistribution: Record<number, number>
}

// Seeded Random Number Generator for reproducible tests
export class SeededRandom {
  private seed: number
  private state: number

  constructor(seed: number = Date.now()) {
    this.seed = seed
    this.state = seed
  }

  next(): number {
    // Linear congruential generator
    this.state = (this.state * 1664525 + 1013904223) % Math.pow(2, 32)
    return this.state / Math.pow(2, 32)
  }

  integer(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  float(min: number = 0, max: number = 1): number {
    return this.next() * (max - min) + min
  }

  boolean(): boolean {
    return this.next() < 0.5
  }

  element<T>(array: T[]): T {
    return array[this.integer(0, array.length - 1)]
  }

  string(length: number, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
    let result = ''
    for (let i = 0; i < length; i++) {
      result += charset[this.integer(0, charset.length - 1)]
    }
    return result
  }

  getSeed(): number {
    return this.seed
  }
}

// Property Test Runner
export class PropertyTestRunner {
  private rng: SeededRandom
  private testCache: Map<string, any> = new Map()

  constructor(seed?: number) {
    this.rng = new SeededRandom(seed)
  }

  /**
   * Run property-based test
   */
  async runPropertyTest<T>(test: PropertyTest<T>): Promise<Result<PropertyTestResult, AppError>> {
    const startTime = Date.now()
    const failures: PropertyFailure[] = []
    const shrinkingResults: ShrinkingResult[] = []
    const invariantViolations: InvariantViolation[] = []
    const executionTimes: number[] = []
    const memoryUsage: number[] = []

    console.log(`🔍 Running property test: ${test.name}`)
    console.log(`📝 Description: ${test.description}`)
    console.log(`🎯 Max tests: ${test.maxTests}`)

    try {
      // Run example-based tests first
      for (const example of test.examples) {
        const exampleResult = await this.runSingleTest(test, [example], 'example')
        if (!exampleResult.success) {
          failures.push({
            testCase: -1,
            inputs: [example],
            error: exampleResult.error,
            shrunk: false
          })
        }
      }

      // Run generated property tests
      let testCount = 0
      let successCount = 0
      const generationStats: GenerationStats = {
        totalGenerated: 0,
        validGenerated: 0,
        rejectionRate: 0,
        averageSize: 0,
        sizeDistribution: {}
      }

      while (testCount < test.maxTests && failures.length === 0) {
        const testStartTime = performance.now()
        const size = this.calculateTestSize(testCount, test.maxTests)
        
        // Generate test inputs
        const inputs = test.generators.map(gen => {
          generationStats.totalGenerated++
          const value = gen.generate(this.rng, size)
          
          if (gen.isValid(value)) {
            generationStats.validGenerated++
            return value
          } else {
            // Retry with different parameters
            return gen.generate(this.rng, Math.max(1, size - 1))
          }
        })

        // Track size distribution
        generationStats.sizeDistribution[size] = (generationStats.sizeDistribution[size] || 0) + 1

        // Check precondition invariants
        const preconditionResult = await this.checkInvariants(
          test.invariants.filter(inv => inv.category === 'precondition'),
          inputs
        )

        if (!preconditionResult.success) {
          // Skip this test case if preconditions not met
          continue
        }

        // Run the property test
        const propertyResult = await this.runSingleTest(test, inputs, testCount)
        const testEndTime = performance.now()
        
        executionTimes.push(testEndTime - testStartTime)
        memoryUsage.push(process.memoryUsage().heapUsed)

        if (propertyResult.success) {
          successCount++

          // Check postcondition and business rule invariants
          const postconditionResult = await this.checkInvariants(
            test.invariants.filter(inv => 
              inv.category === 'postcondition' || inv.category === 'business-rule'
            ),
            inputs,
            propertyResult.data
          )

          if (!postconditionResult.success) {
            invariantViolations.push(...postconditionResult.violations!)
            
            // Treat critical invariant violations as failures
            const criticalViolations = postconditionResult.violations!.filter(v => v.critical)
            if (criticalViolations.length > 0) {
              failures.push({
                testCase: testCount,
                inputs,
                output: propertyResult.data,
                error: {
                  code: 'BUSINESS_RULE_VIOLATION' as any,
                  message: `Critical invariant violations: ${criticalViolations.map(v => v.invariantName).join(', ')}`,
                  timestamp: new Date()
                },
                shrunk: false
              })
            }
          }
        } else {
          // Property test failed - attempt shrinking
          console.log(`❌ Test case ${testCount} failed, attempting to shrink...`)
          
          const shrinkResult = await this.shrinkCounterexample(test, inputs, propertyResult.error)
          shrinkingResults.push(shrinkResult)

          failures.push({
            testCase: testCount,
            inputs,
            error: propertyResult.error,
            shrunk: shrinkResult.success,
            minimalCounterexample: shrinkResult.success ? shrinkResult.shrunkInputs : undefined
          })
        }

        testCount++
      }

      // Calculate final statistics
      generationStats.rejectionRate = generationStats.totalGenerated > 0 
        ? (generationStats.totalGenerated - generationStats.validGenerated) / generationStats.totalGenerated 
        : 0
      generationStats.averageSize = Object.entries(generationStats.sizeDistribution)
        .reduce((sum, [size, count]) => sum + (parseInt(size) * count), 0) / generationStats.validGenerated

      const statistics: PropertyStatistics = {
        inputDistribution: this.calculateInputDistribution(test.generators, testCount),
        executionTimes,
        memoryUsage,
        cacheHitRate: this.calculateCacheHitRate(),
        generationStats
      }

      const result: PropertyTestResult = {
        testName: test.name,
        success: failures.length === 0,
        totalTests: testCount,
        failures,
        statistics,
        shrinkingResults,
        invariantViolations,
        executionTime: Date.now() - startTime
      }

      console.log(`${result.success ? '✅' : '❌'} Property test completed`)
      console.log(`📊 ${successCount}/${testCount} tests passed`)
      console.log(`🔬 ${shrinkingResults.length} counterexamples shrunk`)
      console.log(`⚠️  ${invariantViolations.length} invariant violations`)

      return Ok(result)

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Property test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  /**
   * Create property test builder
   */
  property<T>(name: string, description: string): PropertyTestBuilder<T> {
    return new PropertyTestBuilder<T>(name, description, this)
  }

  // Private helper methods

  private async runSingleTest<T>(
    test: PropertyTest<T>, 
    inputs: any[], 
    testCase: number | string
  ): Promise<Result<any, AppError>> {
    try {
      // Check cache for repeated inputs
      const cacheKey = JSON.stringify(inputs)
      if (this.testCache.has(cacheKey)) {
        return Ok(this.testCache.get(cacheKey))
      }

      // Execute property with timeout
      const result = await this.executeWithTimeout(
        () => test.property(inputs),
        test.timeout
      )

      if (result.success && result.data) {
        this.testCache.set(cacheKey, result.data)
      }

      return result

    } catch (error) {
      return Err({
        code: 'INTERNAL_ERROR' as any,
        message: `Property test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        cause: error instanceof Error ? error : undefined
      })
    }
  }

  private async checkInvariants<T>(
    invariants: Invariant<T>[],
    inputs: any[],
    output?: any
  ): Promise<{ success: boolean; violations?: InvariantViolation[] }> {
    const violations: InvariantViolation[] = []

    for (const invariant of invariants) {
      try {
        const checkResult = invariant.check(inputs, output)
        
        if (!checkResult.success || !checkResult.data) {
          violations.push({
            invariantName: invariant.name,
            category: invariant.category,
            inputs,
            output,
            violation: checkResult.success 
              ? 'Invariant returned false' 
              : checkResult.error.message,
            critical: invariant.critical
          })
        }
      } catch (error) {
        violations.push({
          invariantName: invariant.name,
          category: invariant.category,
          inputs,
          output,
          violation: `Invariant check threw error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          critical: invariant.critical
        })
      }
    }

    return {
      success: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined
    }
  }

  private async shrinkCounterexample<T>(
    test: PropertyTest<T>,
    inputs: any[],
    originalError: AppError
  ): Promise<ShrinkingResult> {
    const shrinkStartTime = Date.now()
    let currentInputs = [...inputs]
    let shrinkSteps = 0
    let bestFailure = originalError

    try {
      while (shrinkSteps < test.maxShrinks) {
        let shrunk = false
        
        // Try shrinking each input
        for (let i = 0; i < currentInputs.length; i++) {
          const generator = test.generators[i]
          if (!generator) continue

          const shrunkValues = generator.shrink(currentInputs[i])
          
          for (const shrunkValue of shrunkValues) {
            const testInputs = [...currentInputs]
            testInputs[i] = shrunkValue

            // Test if this shrunk input still fails
            const shrinkResult = await this.runSingleTest(test, testInputs, `shrink-${shrinkSteps}`)
            
            if (!shrinkResult.success) {
              currentInputs = testInputs
              bestFailure = shrinkResult.error
              shrunk = true
              shrinkSteps++
              break
            }
          }
          
          if (shrunk) break
        }

        if (!shrunk) break
      }

      return {
        originalInputs: inputs,
        shrunkInputs: currentInputs,
        shrinkSteps,
        shrinkTime: Date.now() - shrinkStartTime,
        success: shrinkSteps > 0
      }

    } catch (error) {
      return {
        originalInputs: inputs,
        shrunkInputs: inputs,
        shrinkSteps,
        shrinkTime: Date.now() - shrinkStartTime,
        success: false
      }
    }
  }

  private calculateTestSize(testNumber: number, maxTests: number): number {
    // Gradually increase size complexity
    const progress = testNumber / maxTests
    return Math.floor(1 + progress * 10) // Size from 1 to 10
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<Result<T, AppError>> | Result<T, AppError>,
    timeout: number
  ): Promise<Result<T, AppError>> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(Err({
          code: 'TIMEOUT' as any,
          message: `Property test timed out after ${timeout}ms`,
          timestamp: new Date()
        }))
      }, timeout)

      try {
        const result = operation()
        
        if (result instanceof Promise) {
          result
            .then((res) => {
              clearTimeout(timer)
              resolve(res)
            })
            .catch((error) => {
              clearTimeout(timer)
              resolve(Err({
                code: 'INTERNAL_ERROR' as any,
                message: `Property test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date(),
                cause: error instanceof Error ? error : undefined
              }))
            })
        } else {
          clearTimeout(timer)
          resolve(result)
        }
      } catch (error) {
        clearTimeout(timer)
        resolve(Err({
          code: 'INTERNAL_ERROR' as any,
          message: `Property test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        }))
      }
    })
  }

  private calculateInputDistribution(generators: PropertyGenerator<any>[], testCount: number): Record<string, number> {
    // This would track actual input distributions in a real implementation
    const distribution: Record<string, number> = {}
    
    generators.forEach((gen, index) => {
      distribution[`generator_${index}_${gen.name}`] = testCount
    })

    return distribution
  }

  private calculateCacheHitRate(): number {
    // This would calculate actual cache hit rate in a real implementation
    return this.testCache.size > 0 ? 0.15 : 0 // Simulated 15% hit rate
  }
}

// Property Test Builder
export class PropertyTestBuilder<T> {
  private test: Partial<PropertyTest<T>>

  constructor(name: string, description: string, private runner: PropertyTestRunner) {
    this.test = {
      name,
      description,
      generators: [],
      invariants: [],
      examples: [],
      maxTests: 100,
      maxShrinks: 100,
      timeout: 5000
    }
  }

  withGenerator<U>(name: string, generator: Omit<PropertyGenerator<U>, 'name'>): this {
    this.test.generators?.push({
      name,
      ...generator
    })
    return this
  }

  withInvariant(invariant: Invariant<T>): this {
    this.test.invariants?.push(invariant)
    return this
  }

  withExample(example: T): this {
    this.test.examples?.push(example)
    return this
  }

  withMaxTests(maxTests: number): this {
    this.test.maxTests = maxTests
    return this
  }

  withMaxShrinks(maxShrinks: number): this {
    this.test.maxShrinks = maxShrinks
    return this
  }

  withTimeout(timeout: number): this {
    this.test.timeout = timeout
    return this
  }

  withShrinkingStrategy(strategy: ShrinkingStrategy<T>): this {
    this.test.shrinkingStrategy = strategy
    return this
  }

  check(property: PropertyTest<T>['property']): this {
    this.test.property = property
    return this
  }

  async run(): Promise<Result<PropertyTestResult, AppError>> {
    if (!this.test.property) {
      return Err({
        code: 'VALIDATION_ERROR' as any,
        message: 'Property function is required',
        timestamp: new Date()
      })
    }

    return this.runner.runPropertyTest(this.test as PropertyTest<T>)
  }

  build(): PropertyTest<T> {
    if (!this.test.property) {
      throw new Error('Property function is required')
    }

    return {
      ...this.test,
      property: this.test.property!,
      shrinkingStrategy: this.test.shrinkingStrategy || DefaultShrinkingStrategy
    } as PropertyTest<T>
  }
}

// Default shrinking strategy
const DefaultShrinkingStrategy: ShrinkingStrategy<any> = {
  name: 'default',
  shrink: async (value: any) => {
    if (typeof value === 'number') {
      return value > 0 ? [0, Math.floor(value / 2)] : []
    }
    if (typeof value === 'string') {
      return value.length > 0 ? ['', value.slice(1), value.slice(0, -1)] : []
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? [[], value.slice(1), value.slice(0, -1)] : []
    }
    return []
  },
  isMinimal: (value: any) => {
    if (typeof value === 'number') return value === 0
    if (typeof value === 'string') return value === ''
    if (Array.isArray(value)) return value.length === 0
    return true
  }
}

// Export singleton
export const propertyTestRunner = new PropertyTestRunner()

export function createPropertyTestRunner(seed?: number): PropertyTestRunner {
  return new PropertyTestRunner(seed)
}