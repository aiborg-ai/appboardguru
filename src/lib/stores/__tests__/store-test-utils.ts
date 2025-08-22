import { create } from 'zustand'
import { act } from '@testing-library/react'
import { renderHook } from '@testing-library/react-hooks'
import { enhancedDevtools } from '../middleware/devtools-middleware'
import { logging } from '../middleware/logging-middleware'
import { enhancedPersist } from '../middleware/persistence-middleware'
import { MemoryStorage } from '../middleware/persistence-middleware'

// Mock store creator for testing
export function createMockStore<T extends object>(
  initialState: T,
  actions?: Record<string, (...args: any[]) => void>
) {
  return create<T>()((set, get) => ({
    ...initialState,
    ...actions,
    // Testing utilities
    $$testHelpers: {
      setState: (newState: Partial<T>) => set(newState as any),
      getState: () => get(),
      reset: () => set(initialState as any),
      subscribe: (callback: (state: T) => void) => {
        return create.subscribe(callback)
      }
    }
  }))
}

// Enhanced mock store with middleware for testing
export function createTestStore<T extends object>(
  storeInitializer: any,
  options: {
    enableLogging?: boolean
    enablePersistence?: boolean
    enableDevtools?: boolean
    storeName?: string
  } = {}
) {
  const {
    enableLogging = false,
    enablePersistence = false,
    enableDevtools = false,
    storeName = 'test-store'
  } = options

  let composedStore = storeInitializer

  // Add logging middleware for testing
  if (enableLogging) {
    composedStore = logging(composedStore, storeName, {
      enabled: true,
      logLevel: 'debug',
      includeState: true,
      persistLogs: false
    })
  }

  // Add persistence middleware with memory storage for testing
  if (enablePersistence) {
    composedStore = enhancedPersist({
      name: storeName,
      storage: new MemoryStorage(),
      skipHydration: true
    })(composedStore)
  }

  // Add devtools middleware for testing
  if (enableDevtools) {
    composedStore = enhancedDevtools({
      enabled: true,
      name: storeName,
      timeTravel: {
        enabled: true,
        maxSnapshots: 10,
        autoSave: false
      }
    })(composedStore)
  }

  return create(composedStore)
}

// Store snapshot utility for testing state changes
export class StoreSnapshot<T> {
  private snapshots: Array<{ timestamp: number; state: T; action?: string }> = []
  private unsubscribe: (() => void) | null = null

  constructor(private store: any) {
    this.takeSnapshot('INITIAL')
    this.startRecording()
  }

  private startRecording(): void {
    this.unsubscribe = this.store.subscribe((state: T, previousState: T) => {
      if (state !== previousState) {
        this.takeSnapshot('STATE_CHANGE')
      }
    })
  }

  takeSnapshot(action?: string): void {
    this.snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(this.store.getState())),
      action
    })
  }

  getSnapshots(): Array<{ timestamp: number; state: T; action?: string }> {
    return [...this.snapshots]
  }

  getLastSnapshot(): { timestamp: number; state: T; action?: string } | null {
    return this.snapshots[this.snapshots.length - 1] || null
  }

  getSnapshotAtIndex(index: number): { timestamp: number; state: T; action?: string } | null {
    return this.snapshots[index] || null
  }

  compareSnapshots(index1: number, index2: number): {
    differences: Array<{ path: string; before: any; after: any }>
    identical: boolean
  } {
    const snapshot1 = this.getSnapshotAtIndex(index1)
    const snapshot2 = this.getSnapshotAtIndex(index2)

    if (!snapshot1 || !snapshot2) {
      throw new Error('Invalid snapshot indices')
    }

    const differences = this.findDifferences(snapshot1.state, snapshot2.state)
    return {
      differences,
      identical: differences.length === 0
    }
  }

  private findDifferences(obj1: any, obj2: any, path = ''): Array<{ path: string; before: any; after: any }> {
    const differences: Array<{ path: string; before: any; after: any }> = []

    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})])

    for (const key of keys) {
      const currentPath = path ? `${path}.${key}` : key
      const val1 = obj1?.[key]
      const val2 = obj2?.[key]

      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        differences.push(...this.findDifferences(val1, val2, currentPath))
      } else if (val1 !== val2) {
        differences.push({
          path: currentPath,
          before: val1,
          after: val2
        })
      }
    }

    return differences
  }

  reset(): void {
    this.snapshots = []
    this.takeSnapshot('RESET')
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.snapshots = []
  }
}

// Store action tester utility
export class StoreActionTester<T> {
  private originalState: T
  private snapshot: StoreSnapshot<T>

  constructor(private store: any) {
    this.originalState = JSON.parse(JSON.stringify(store.getState()))
    this.snapshot = new StoreSnapshot(store)
  }

  async testAction(
    actionName: string,
    actionArgs: any[] = [],
    expectations: {
      shouldChangeState?: boolean
      expectedChanges?: Partial<T>
      stateValidator?: (state: T) => boolean
      shouldThrow?: boolean
      errorValidator?: (error: Error) => boolean
    } = {}
  ): Promise<{
    success: boolean
    error?: Error
    stateBefore: T
    stateAfter: T
    changes: Array<{ path: string; before: any; after: any }>
  }> {
    const stateBefore = JSON.parse(JSON.stringify(this.store.getState()))
    let error: Error | undefined
    let success = false

    this.snapshot.takeSnapshot(`BEFORE_${actionName}`)

    try {
      const action = this.store.getState()[actionName]
      if (typeof action !== 'function') {
        throw new Error(`Action '${actionName}' is not a function`)
      }

      // Execute the action
      await act(async () => {
        const result = action(...actionArgs)
        if (result instanceof Promise) {
          await result
        }
      })

      success = true
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      
      if (!expectations.shouldThrow) {
        success = false
      } else if (expectations.errorValidator) {
        success = expectations.errorValidator(error)
      } else {
        success = true
      }
    }

    this.snapshot.takeSnapshot(`AFTER_${actionName}`)
    const stateAfter = this.store.getState()

    // Analyze state changes
    const snapshots = this.snapshot.getSnapshots()
    const beforeSnapshot = snapshots[snapshots.length - 2]
    const afterSnapshot = snapshots[snapshots.length - 1]
    
    const changes = beforeSnapshot && afterSnapshot 
      ? this.snapshot.compareSnapshots(snapshots.length - 2, snapshots.length - 1).differences
      : []

    // Validate expectations
    if (expectations.shouldChangeState !== undefined) {
      const stateChanged = changes.length > 0
      if (expectations.shouldChangeState !== stateChanged) {
        success = false
      }
    }

    if (expectations.expectedChanges && success) {
      for (const [key, expectedValue] of Object.entries(expectations.expectedChanges)) {
        if ((stateAfter as any)[key] !== expectedValue) {
          success = false
          break
        }
      }
    }

    if (expectations.stateValidator && success) {
      success = expectations.stateValidator(stateAfter)
    }

    return {
      success,
      error,
      stateBefore,
      stateAfter,
      changes
    }
  }

  async testActionSequence(
    actions: Array<{
      name: string
      args?: any[]
      expectations?: any
      delay?: number
    }>
  ): Promise<Array<any>> {
    const results = []

    for (const action of actions) {
      if (action.delay) {
        await new Promise(resolve => setTimeout(resolve, action.delay))
      }

      const result = await this.testAction(
        action.name,
        action.args || [],
        action.expectations || {}
      )

      results.push(result)

      // Stop on first failure unless configured otherwise
      if (!result.success) {
        break
      }
    }

    return results
  }

  reset(): void {
    this.store.setState(this.originalState)
    this.snapshot.reset()
  }

  destroy(): void {
    this.snapshot.destroy()
  }
}

// Store performance tester
export class StorePerformanceTester<T> {
  private metrics: Map<string, {
    calls: number
    totalTime: number
    averageTime: number
    minTime: number
    maxTime: number
  }> = new Map()

  constructor(private store: any) {
    this.wrapActions()
  }

  private wrapActions(): void {
    const state = this.store.getState()
    
    for (const [key, value] of Object.entries(state)) {
      if (typeof value === 'function' && !key.startsWith('$$')) {
        const originalAction = value.bind(state)
        
        this.store.setState({
          [key]: (...args: any[]) => {
            return this.measureAction(key, originalAction, args)
          }
        })
      }
    }
  }

  private measureAction(actionName: string, action: Function, args: any[]): any {
    const startTime = performance.now()
    
    try {
      const result = action(...args)
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.recordMetric(actionName, performance.now() - startTime)
        })
      } else {
        this.recordMetric(actionName, performance.now() - startTime)
        return result
      }
    } catch (error) {
      this.recordMetric(actionName, performance.now() - startTime)
      throw error
    }
  }

  private recordMetric(actionName: string, duration: number): void {
    const existing = this.metrics.get(actionName) || {
      calls: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0
    }

    existing.calls++
    existing.totalTime += duration
    existing.averageTime = existing.totalTime / existing.calls
    existing.minTime = Math.min(existing.minTime, duration)
    existing.maxTime = Math.max(existing.maxTime, duration)

    this.metrics.set(actionName, existing)
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const [actionName, metrics] of this.metrics) {
      result[actionName] = {
        ...metrics,
        minTime: metrics.minTime === Infinity ? 0 : metrics.minTime
      }
    }
    
    return result
  }

  getSlowestActions(limit = 5): Array<{ action: string; averageTime: number }> {
    return Array.from(this.metrics.entries())
      .map(([action, metrics]) => ({ action, averageTime: metrics.averageTime }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, limit)
  }

  reset(): void {
    this.metrics.clear()
  }
}

// Mock API client for testing
export class MockAPIClient {
  private responses: Map<string, { data?: any; error?: Error; delay?: number }> = new Map()
  private callLog: Array<{ method: string; url: string; data?: any; timestamp: number }> = []

  mockResponse(pattern: string, response: { data?: any; error?: Error; delay?: number }): void {
    this.responses.set(pattern, response)
  }

  async request(method: string, url: string, data?: any): Promise<any> {
    this.callLog.push({
      method: method.toUpperCase(),
      url,
      data,
      timestamp: Date.now()
    })

    // Find matching mock response
    for (const [pattern, response] of this.responses) {
      if (this.matchesPattern(url, pattern)) {
        if (response.delay) {
          await new Promise(resolve => setTimeout(resolve, response.delay))
        }

        if (response.error) {
          throw response.error
        }

        return response.data
      }
    }

    // Default response if no mock found
    throw new Error(`No mock response configured for ${method} ${url}`)
  }

  private matchesPattern(url: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '\\?')
      .replace(/\//g, '\\/')
    
    return new RegExp(`^${regexPattern}$`).test(url)
  }

  getCallLog(): Array<{ method: string; url: string; data?: any; timestamp: number }> {
    return [...this.callLog]
  }

  clearCallLog(): void {
    this.callLog = []
  }

  reset(): void {
    this.responses.clear()
    this.callLog = []
  }
}

// Store test assertions
export const storeAssertions = {
  // Assert that state has specific properties
  hasProperties: <T>(state: T, properties: (keyof T)[]): boolean => {
    return properties.every(prop => prop in (state as object))
  },

  // Assert that state property equals expected value
  propertyEquals: <T>(state: T, property: keyof T, expectedValue: any): boolean => {
    return state[property] === expectedValue
  },

  // Assert that state property is truthy
  propertyIsTruthy: <T>(state: T, property: keyof T): boolean => {
    return !!state[property]
  },

  // Assert that state property is falsy
  propertyIsFalsy: <T>(state: T, property: keyof T): boolean => {
    return !state[property]
  },

  // Assert that array property has specific length
  arrayHasLength: <T>(state: T, property: keyof T, expectedLength: number): boolean => {
    const value = state[property]
    return Array.isArray(value) && value.length === expectedLength
  },

  // Assert that array property contains specific item
  arrayContains: <T>(state: T, property: keyof T, item: any): boolean => {
    const value = state[property]
    return Array.isArray(value) && value.includes(item)
  },

  // Assert that object property has specific keys
  objectHasKeys: <T>(state: T, property: keyof T, keys: string[]): boolean => {
    const value = state[property]
    if (typeof value !== 'object' || value === null) return false
    return keys.every(key => key in value)
  },

  // Assert that loading state is correct
  loadingStateIs: (state: any, operation: string, expected: boolean): boolean => {
    return state.loading?.[operation] === expected
  },

  // Assert that error state is correct
  errorStateIs: (state: any, operation: string, expectedError: string | null): boolean => {
    return state.errors?.[operation] === expectedError
  },

  // Assert that store is in initial state
  isInitialState: <T>(state: T, initialState: T): boolean => {
    return JSON.stringify(state) === JSON.stringify(initialState)
  }
}

// Store test matchers for Jest
export const storeMatchers = {
  toHaveProperty: (state: any, property: string) => {
    const pass = property in state
    return {
      pass,
      message: () => pass
        ? `Expected state not to have property ${property}`
        : `Expected state to have property ${property}`
    }
  },

  toHavePropertyValue: (state: any, property: string, expectedValue: any) => {
    const hasProperty = property in state
    const hasCorrectValue = hasProperty && state[property] === expectedValue
    
    return {
      pass: hasCorrectValue,
      message: () => hasCorrectValue
        ? `Expected state.${property} not to equal ${expectedValue}`
        : hasProperty
          ? `Expected state.${property} to equal ${expectedValue}, but got ${state[property]}`
          : `Expected state to have property ${property}`
    }
  },

  toBeLoading: (state: any, operation?: string) => {
    const isLoading = operation 
      ? state.loading?.[operation] === true
      : Object.values(state.loading || {}).some(Boolean)
    
    return {
      pass: isLoading,
      message: () => isLoading
        ? `Expected state not to be loading${operation ? ` for ${operation}` : ''}`
        : `Expected state to be loading${operation ? ` for ${operation}` : ''}`
    }
  },

  toHaveError: (state: any, operation?: string, expectedError?: string) => {
    const error = operation ? state.errors?.[operation] : Object.values(state.errors || {}).find(Boolean)
    const hasError = !!error
    const hasCorrectError = !expectedError || error === expectedError
    
    return {
      pass: hasError && hasCorrectError,
      message: () => {
        if (!hasError) return `Expected state to have an error${operation ? ` for ${operation}` : ''}`
        if (!hasCorrectError) return `Expected error to be "${expectedError}", but got "${error}"`
        return `Expected state not to have an error${operation ? ` for ${operation}` : ''}`
      }
    }
  }
}

// React hook testing utilities
export function renderStoreHook<T>(
  hook: () => T,
  store?: any
): {
  result: { current: T }
  rerender: (newProps?: any) => void
  unmount: () => void
} {
  return renderHook(hook)
}

export async function waitForStoreUpdate<T>(
  store: any,
  predicate: (state: T) => boolean,
  timeout = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Store update timeout after ${timeout}ms`))
    }, timeout)

    const unsubscribe = store.subscribe((state: T) => {
      if (predicate(state)) {
        clearTimeout(timeoutId)
        unsubscribe()
        resolve(state)
      }
    })

    // Check initial state
    const currentState = store.getState()
    if (predicate(currentState)) {
      clearTimeout(timeoutId)
      unsubscribe()
      resolve(currentState)
    }
  })
}

// Test data generators
export const testDataGenerators = {
  user: (overrides: any = {}) => ({
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Math.random().toString(36).substr(2, 5)}@example.com`,
    full_name: `Test User ${Math.random().toString(36).substr(2, 3)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),

  organization: (overrides: any = {}) => ({
    id: `org_${Math.random().toString(36).substr(2, 9)}`,
    name: `Test Organization ${Math.random().toString(36).substr(2, 3)}`,
    slug: `test-org-${Math.random().toString(36).substr(2, 5)}`,
    description: 'A test organization',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    userRole: 'member',
    membershipStatus: 'active',
    memberCount: Math.floor(Math.random() * 50) + 1,
    vaultCount: Math.floor(Math.random() * 10),
    assetCount: Math.floor(Math.random() * 100),
    ...overrides
  }),

  asset: (overrides: any = {}) => ({
    id: `asset_${Math.random().toString(36).substr(2, 9)}`,
    filename: `test-file-${Math.random().toString(36).substr(2, 5)}.pdf`,
    file_type: 'application/pdf',
    file_size: Math.floor(Math.random() * 1000000) + 10000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  })
}

// Export all utilities
export {
  createMockStore,
  createTestStore,
  StoreSnapshot,
  StoreActionTester,
  StorePerformanceTester,
  MockAPIClient,
  storeAssertions,
  storeMatchers,
  renderStoreHook,
  waitForStoreUpdate,
  testDataGenerators
}