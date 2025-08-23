/**
 * Test Utilities and Helpers
 * Following CLAUDE.md patterns for comprehensive testing support
 * Includes Result pattern testing, async utilities, and common assertions
 */

import { Result, isSuccess, isFailure } from '@/lib/repositories/result'
import { AssetWithDetails } from '@/lib/repositories/asset.repository.enhanced'
import { FileUploadItem } from '@/types/upload'

// Result Pattern Test Helpers
export class ResultTestHelpers {
  static assertSuccess<T>(result: Result<T>): asserts result is { success: true; data: T } {
    if (!isSuccess(result)) {
      throw new Error(`Expected success result but got error: ${result.error.message}`)
    }
  }

  static assertFailure<T>(result: Result<T>): asserts result is { success: false; error: Error } {
    if (!isFailure(result)) {
      throw new Error(`Expected failure result but got success with data: ${JSON.stringify(result.data)}`)
    }
  }

  static assertErrorCode<T>(result: Result<T>, expectedCode: string) {
    this.assertFailure(result)
    const errorCode = (result.error as any).code
    if (errorCode !== expectedCode) {
      throw new Error(`Expected error code "${expectedCode}" but got "${errorCode}"`)
    }
  }

  static assertErrorMessage<T>(result: Result<T>, expectedMessage: string | RegExp) {
    this.assertFailure(result)
    const message = result.error.message
    if (typeof expectedMessage === 'string') {
      if (message !== expectedMessage) {
        throw new Error(`Expected error message "${expectedMessage}" but got "${message}"`)
      }
    } else {
      if (!expectedMessage.test(message)) {
        throw new Error(`Expected error message to match ${expectedMessage} but got "${message}"`)
      }
    }
  }

  static expectSuccessWithData<T>(result: Result<T>, expectedData: Partial<T>) {
    this.assertSuccess(result)
    expect(result.data).toMatchObject(expectedData)
  }

  static expectFailureWithCode<T>(result: Result<T>, code: string) {
    this.assertFailure(result)
    expect((result.error as any).code).toBe(code)
  }
}

// Async Testing Utilities
export class AsyncTestHelpers {
  // Wait for condition with timeout
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return
      }
      await this.sleep(interval)
    }
    
    throw new Error(`Condition not met within ${timeout}ms`)
  }

  // Wait for async operation to complete
  static async waitForAsyncOp<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 100
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (i < maxRetries - 1) {
          await this.sleep(delay * Math.pow(2, i)) // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Operation failed after retries')
  }

  // Sleep utility
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Timeout wrapper for promises
  static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ])
  }

  // Batch async operations with concurrency limit
  static async batchAsync<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    concurrency: number = 3
  ): Promise<R[]> {
    const results: R[] = []
    const executing: Promise<void>[] = []
    
    for (const item of items) {
      const promise = operation(item).then(result => {
        results.push(result)
      })
      
      executing.push(promise)
      
      if (executing.length >= concurrency) {
        await Promise.race(executing)
        executing.splice(executing.findIndex(p => p === promise), 1)
      }
    }
    
    await Promise.all(executing)
    return results
  }
}

// File Testing Utilities
export class FileTestHelpers {
  // Create test File objects
  static createFile(
    name: string,
    content: string | ArrayBuffer,
    type: string = 'text/plain'
  ): File {
    const data = typeof content === 'string' ? [content] : [content]
    return new File(data, name, { type })
  }

  // Create test FormData
  static createFormData(fields: Record<string, string | File>): FormData {
    const formData = new FormData()
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value)
    })
    return formData
  }

  // Verify file properties
  static expectFileProperties(file: File, expected: {
    name?: string
    size?: number
    type?: string
  }) {
    if (expected.name !== undefined) {
      expect(file.name).toBe(expected.name)
    }
    if (expected.size !== undefined) {
      expect(file.size).toBe(expected.size)
    }
    if (expected.type !== undefined) {
      expect(file.type).toBe(expected.type)
    }
  }

  // Read file content for testing
  static async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  // Read file as ArrayBuffer
  static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(file)
    })
  }

  // Generate test files of specific sizes
  static generateFileOfSize(name: string, sizeBytes: number, type: string = 'text/plain'): File {
    const content = new ArrayBuffer(sizeBytes)
    return new File([content], name, { type })
  }
}

// Asset Testing Utilities
export class AssetTestHelpers {
  // Compare assets ignoring timestamps
  static expectAssetEqual(actual: AssetWithDetails, expected: Partial<AssetWithDetails>) {
    const { created_at, updated_at, ...expectedWithoutTimestamps } = expected
    const { created_at: actualCreated, updated_at: actualUpdated, ...actualWithoutTimestamps } = actual
    
    expect(actualWithoutTimestamps).toMatchObject(expectedWithoutTimestamps)
    
    if (created_at) {
      expect(new Date(actualCreated)).toEqual(new Date(created_at))
    }
    if (updated_at) {
      expect(new Date(actualUpdated)).toEqual(new Date(updated_at))
    }
  }

  // Verify upload item status transitions
  static expectUploadItemStatus(item: FileUploadItem, expectedStatus: FileUploadItem['status']) {
    expect(item.status).toBe(expectedStatus)
    
    switch (expectedStatus) {
      case 'pending':
        expect(item.progress).toBe(0)
        expect(item.error).toBeUndefined()
        break
      case 'uploading':
        expect(item.progress).toBeGreaterThanOrEqual(0)
        expect(item.progress).toBeLessThanOrEqual(100)
        expect(item.error).toBeUndefined()
        break
      case 'success':
        expect(item.progress).toBe(100)
        expect(item.error).toBeUndefined()
        break
      case 'error':
        expect(item.error).toBeDefined()
        expect(typeof item.error).toBe('string')
        break
    }
  }

  // Verify asset metadata
  static expectAssetMetadata(asset: AssetWithDetails, expected: {
    hasUser?: boolean
    hasOrganization?: boolean
    hasVault?: boolean
    hasAnalytics?: boolean
  }) {
    if (expected.hasUser) {
      expect(asset.uploaded_by_user).toBeDefined()
      expect(asset.uploaded_by_user?.id).toBeDefined()
      expect(asset.uploaded_by_user?.email).toBeDefined()
    }
    
    if (expected.hasOrganization) {
      expect(asset.organization).toBeDefined()
      expect(asset.organization?.id).toBeDefined()
      expect(asset.organization?.name).toBeDefined()
    }
    
    if (expected.hasVault) {
      expect(asset.vault).toBeDefined()
      expect(asset.vault?.id).toBeDefined()
      expect(asset.vault?.name).toBeDefined()
    }
    
    if (expected.hasAnalytics) {
      expect(asset.access_analytics).toBeDefined()
      expect(typeof asset.access_analytics?.total_views).toBe('number')
      expect(typeof asset.access_analytics?.total_downloads).toBe('number')
    }
  }
}

// Performance Testing Utilities
export class PerformanceTestHelpers {
  // Measure execution time
  static async measureExecutionTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now()
    const result = await operation()
    const endTime = performance.now()
    return {
      result,
      duration: endTime - startTime
    }
  }

  // Memory usage measurement (if available)
  static measureMemoryUsage(): { used: number; total: number } | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      }
    }
    return null
  }

  // Benchmark multiple operations
  static async benchmark<T>(
    operations: Record<string, () => Promise<T>>,
    iterations: number = 100
  ): Promise<Record<string, { avg: number; min: number; max: number; total: number }>> {
    const results: Record<string, { avg: number; min: number; max: number; total: number }> = {}
    
    for (const [name, operation] of Object.entries(operations)) {
      const times: number[] = []
      
      for (let i = 0; i < iterations; i++) {
        const { duration } = await this.measureExecutionTime(operation)
        times.push(duration)
      }
      
      results[name] = {
        avg: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        total: times.reduce((a, b) => a + b, 0)
      }
    }
    
    return results
  }

  // Assert performance constraints
  static assertPerformance(duration: number, maxDuration: number, operation: string) {
    if (duration > maxDuration) {
      throw new Error(`${operation} took ${duration}ms, expected less than ${maxDuration}ms`)
    }
  }
}

// Error Testing Utilities
export class ErrorTestHelpers {
  // Test error scenarios
  static async expectToThrowError<T>(
    operation: () => Promise<T>,
    expectedError: string | RegExp | Error
  ) {
    let thrownError: Error | null = null
    
    try {
      await operation()
    } catch (error) {
      thrownError = error as Error
    }
    
    if (!thrownError) {
      throw new Error('Expected operation to throw an error, but it completed successfully')
    }
    
    if (typeof expectedError === 'string') {
      expect(thrownError.message).toBe(expectedError)
    } else if (expectedError instanceof RegExp) {
      expect(thrownError.message).toMatch(expectedError)
    } else if (expectedError instanceof Error) {
      expect(thrownError.message).toBe(expectedError.message)
      expect(thrownError.name).toBe(expectedError.name)
    }
  }

  // Test error recovery
  static async testErrorRecovery<T>(
    operation: () => Promise<T>,
    expectedRetries: number,
    finalResult?: T
  ) {
    let attempts = 0
    const mockOperation = jest.fn().mockImplementation(async () => {
      attempts++
      if (attempts <= expectedRetries) {
        throw new Error(`Attempt ${attempts} failed`)
      }
      return finalResult
    })
    
    if (finalResult !== undefined) {
      const result = await AsyncTestHelpers.waitForAsyncOp(mockOperation, expectedRetries + 1)
      expect(result).toBe(finalResult)
    } else {
      await expect(AsyncTestHelpers.waitForAsyncOp(mockOperation, expectedRetries + 1)).rejects.toThrow()
    }
    
    expect(attempts).toBe(expectedRetries + 1)
  }
}

// Mock Verification Helpers
export class MockVerificationHelpers {
  // Verify mock call sequence
  static expectCallSequence(mocks: jest.MockedFunction<any>[], expectedSequence: string[]) {
    const actualSequence = mocks.map(mock => mock.mock.lastCall?.[0] || 'unknown')
    expect(actualSequence).toEqual(expectedSequence)
  }

  // Verify mock was called with specific parameters
  static expectMockCalledWith<T extends any[]>(
    mock: jest.MockedFunction<(...args: T) => any>,
    expectedArgs: Partial<T>
  ) {
    const calls = mock.mock.calls
    const matchingCall = calls.find(call => 
      expectedArgs.every((expectedArg, index) => 
        expectedArg === undefined || call[index] === expectedArg
      )
    )
    
    if (!matchingCall) {
      throw new Error(`Expected mock to be called with ${JSON.stringify(expectedArgs)}, but no matching call found`)
    }
  }

  // Reset all mocks in an object
  static resetMocks(obj: Record<string, any>) {
    Object.values(obj).forEach(value => {
      if (jest.isMockFunction(value)) {
        value.mockReset()
      }
    })
  }
}

// Test Environment Helpers
export class TestEnvironmentHelpers {
  // Setup test environment
  static setupTestEnv() {
    // Mock console methods to reduce noise in tests
    global.console = {
      ...console,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }
    
    // Mock window.URL.createObjectURL
    if (typeof window !== 'undefined') {
      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = jest.fn()
    }
    
    // Mock File and FileReader for Node.js environment
    if (typeof File === 'undefined') {
      global.File = class MockFile {
        name: string
        size: number
        type: string
        
        constructor(chunks: any[], filename: string, options: any = {}) {
          this.name = filename
          this.type = options.type || ''
          this.size = chunks.reduce((total, chunk) => total + chunk.length, 0)
        }
      } as any
    }
    
    if (typeof FileReader === 'undefined') {
      global.FileReader = class MockFileReader {
        result: any = null
        onload: any = null
        onerror: any = null
        
        readAsText(file: any) {
          setTimeout(() => {
            this.result = 'mock file content'
            this.onload?.()
          }, 0)
        }
        
        readAsArrayBuffer(file: any) {
          setTimeout(() => {
            this.result = new ArrayBuffer(file.size || 0)
            this.onload?.()
          }, 0)
        }
      } as any
    }
  }

  // Cleanup test environment
  static cleanupTestEnv() {
    jest.restoreAllMocks()
    jest.clearAllTimers()
  }
}

// Export all helpers
export {
  ResultTestHelpers,
  AsyncTestHelpers,
  FileTestHelpers,
  AssetTestHelpers,
  PerformanceTestHelpers,
  ErrorTestHelpers,
  MockVerificationHelpers,
  TestEnvironmentHelpers
}