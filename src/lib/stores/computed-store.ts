import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { StoreSlice } from './types'

// Computed property dependency tracking
export interface ComputedDependency<T = any> {
  selector: (state: T) => any
  id: string
  lastValue?: any
}

// Computed property definition
export interface ComputedProperty<T, R> {
  id: string
  selector: (state: T) => R
  compute: (deps: any[]) => R
  dependencies: ComputedDependency<T>[]
  memoized?: boolean
  cache?: {
    value: R
    timestamp: number
    dependencies: any[]
  }
  debugInfo?: {
    computeCount: number
    lastComputeTime: number
    averageComputeTime: number
  }
}

// Computed store state
export interface ComputedStoreState extends StoreSlice {
  computedProperties: Map<string, ComputedProperty<any, any>>
  subscriptions: Map<string, Set<() => void>>
  debugMode: boolean
  
  // Actions
  defineComputed: <T, R>(
    id: string,
    selector: (state: T) => R,
    dependencies: string[] | ((state: T) => any)[],
    options?: ComputedOptions
  ) => void
  
  removeComputed: (id: string) => void
  clearAllComputed: () => void
  getComputedValue: <R>(id: string) => R | undefined
  invalidateComputed: (id: string) => void
  getComputedDebugInfo: (id: string) => ComputedDebugInfo | undefined
  setDebugMode: (enabled: boolean) => void
  
  // Internal methods
  _notifyComputedDependencies: (changedKeys: string[]) => void
  _executeComputed: <R>(property: ComputedProperty<any, R>) => R
}

// Computed property options
export interface ComputedOptions {
  memoized?: boolean
  cacheTTL?: number
  equalityFn?: (a: any, b: any) => boolean
  debugName?: string
}

// Debug information for computed properties
export interface ComputedDebugInfo {
  id: string
  computeCount: number
  lastComputeTime: number
  averageComputeTime: number
  cacheHitRate: number
  dependencies: string[]
  lastValues: any[]
}

// Create computed store factory
export function createComputedStore() {
  return create<ComputedStoreState>()(
    subscribeWithSelector(
      immer((set, get) => ({
        computedProperties: new Map(),
        subscriptions: new Map(),
        debugMode: process.env.NODE_ENV === 'development',

        // Define a computed property
        defineComputed: <T, R>(
          id: string,
          selector: (state: T) => R,
          dependencies: string[] | ((state: T) => any)[],
          options: ComputedOptions = {}
        ) => {
          const { memoized = true, cacheTTL = 60000, equalityFn, debugName } = options
          
          // Convert dependencies to dependency objects
          const deps: ComputedDependency<T>[] = dependencies.map((dep, index) => {
            if (typeof dep === 'string') {
              return {
                id: dep,
                selector: (state: T) => (state as any)[dep]
              }
            } else {
              return {
                id: `${id}_dep_${index}`,
                selector: dep
              }
            }
          })

          const property: ComputedProperty<T, R> = {
            id,
            selector,
            compute: (depValues: any[]) => {
              // Create a mock state with dependency values for selector
              const mockState = {} as T
              deps.forEach((dep, index) => {
                if (typeof dependencies[index] === 'string') {
                  (mockState as any)[dependencies[index] as string] = depValues[index]
                }
              })
              return selector(mockState)
            },
            dependencies: deps,
            memoized,
            debugInfo: {
              computeCount: 0,
              lastComputeTime: 0,
              averageComputeTime: 0
            }
          }

          set(draft => {
            draft.computedProperties.set(id, property)
          })

          if (get().debugMode) {
            console.log(`[ComputedStore] Defined computed property: ${debugName || id}`)
          }
        },

        // Remove a computed property
        removeComputed: (id: string) => {
          set(draft => {
            draft.computedProperties.delete(id)
            draft.subscriptions.delete(id)
          })

          if (get().debugMode) {
            console.log(`[ComputedStore] Removed computed property: ${id}`)
          }
        },

        // Clear all computed properties
        clearAllComputed: () => {
          set(draft => {
            draft.computedProperties.clear()
            draft.subscriptions.clear()
          })

          if (get().debugMode) {
            console.log('[ComputedStore] Cleared all computed properties')
          }
        },

        // Get computed value
        getComputedValue: <R>(id: string): R | undefined => {
          const property = get().computedProperties.get(id)
          if (!property) return undefined

          return get()._executeComputed(property)
        },

        // Invalidate computed property cache
        invalidateComputed: (id: string) => {
          set(draft => {
            const property = draft.computedProperties.get(id)
            if (property && property.cache) {
              delete property.cache
            }
          })

          if (get().debugMode) {
            console.log(`[ComputedStore] Invalidated computed property: ${id}`)
          }
        },

        // Get debug information
        getComputedDebugInfo: (id: string): ComputedDebugInfo | undefined => {
          const property = get().computedProperties.get(id)
          if (!property || !property.debugInfo) return undefined

          const cacheHitRate = property.debugInfo.computeCount > 0 
            ? (property.cache ? 1 : 0) * 100 
            : 0

          return {
            id: property.id,
            computeCount: property.debugInfo.computeCount,
            lastComputeTime: property.debugInfo.lastComputeTime,
            averageComputeTime: property.debugInfo.averageComputeTime,
            cacheHitRate,
            dependencies: property.dependencies.map(dep => dep.id),
            lastValues: property.dependencies.map(dep => dep.lastValue)
          }
        },

        // Set debug mode
        setDebugMode: (enabled: boolean) => {
          set(draft => {
            draft.debugMode = enabled
          })
        },

        // Notify computed dependencies (internal method)
        _notifyComputedDependencies: (changedKeys: string[]) => {
          const state = get()
          const computedToUpdate = new Set<string>()

          // Find computed properties that depend on changed keys
          for (const [computedId, property] of state.computedProperties) {
            const shouldUpdate = property.dependencies.some(dep =>
              changedKeys.includes(dep.id) || 
              changedKeys.some(key => dep.id.includes(key))
            )

            if (shouldUpdate) {
              computedToUpdate.add(computedId)
            }
          }

          // Invalidate and notify subscriptions
          computedToUpdate.forEach(computedId => {
            state.invalidateComputed(computedId)
            
            const subscriptions = state.subscriptions.get(computedId)
            if (subscriptions) {
              subscriptions.forEach(callback => {
                try {
                  callback()
                } catch (error) {
                  console.error(`[ComputedStore] Error in computed subscription for ${computedId}:`, error)
                }
              })
            }
          })

          if (state.debugMode && computedToUpdate.size > 0) {
            console.log(`[ComputedStore] Updated computed properties:`, Array.from(computedToUpdate))
          }
        },

        // Execute computed property (internal method)
        _executeComputed: <R>(property: ComputedProperty<any, R>): R => {
          const startTime = performance.now()

          // Check cache if memoized
          if (property.memoized && property.cache) {
            const now = Date.now()
            const cacheAge = now - property.cache.timestamp
            
            // Return cached value if still valid
            if (cacheAge < 60000) { // 1 minute cache TTL
              return property.cache.value
            }
          }

          // Get dependency values
          const depValues = property.dependencies.map(dep => {
            // In a real implementation, this would get values from the actual store
            // For now, return the last known value or undefined
            return dep.lastValue
          })

          // Compute the value
          const result = property.compute(depValues)

          // Update cache if memoized
          if (property.memoized) {
            set(draft => {
              const updatedProperty = draft.computedProperties.get(property.id)
              if (updatedProperty) {
                updatedProperty.cache = {
                  value: result,
                  timestamp: Date.now(),
                  dependencies: depValues
                }
              }
            })
          }

          // Update debug info
          const endTime = performance.now()
          const computeTime = endTime - startTime

          set(draft => {
            const updatedProperty = draft.computedProperties.get(property.id)
            if (updatedProperty && updatedProperty.debugInfo) {
              const debugInfo = updatedProperty.debugInfo
              debugInfo.computeCount++
              debugInfo.lastComputeTime = computeTime
              debugInfo.averageComputeTime = 
                (debugInfo.averageComputeTime * (debugInfo.computeCount - 1) + computeTime) / 
                debugInfo.computeCount
            }
          })

          if (get().debugMode) {
            console.log(`[ComputedStore] Computed ${property.id} in ${computeTime.toFixed(2)}ms`)
          }

          return result
        },

        _meta: {
          version: 1,
          lastUpdated: Date.now(),
          hydrated: false
        }
      }))
    )
  )
}

// Global computed store instance
export const computedStore = createComputedStore()

// Utility function to enhance any Zustand store with computed properties
export function withComputedProperties<T extends object>(store: any) {
  // Subscribe to store changes and notify computed dependencies
  store.subscribe(
    (state: T, previousState: T) => {
      const changedKeys = Object.keys(state).filter(key => 
        (state as any)[key] !== (previousState as any)[key]
      )
      
      if (changedKeys.length > 0) {
        computedStore.getState()._notifyComputedDependencies(changedKeys)
      }
    }
  )

  return {
    ...store,
    // Add computed property methods to the store
    defineComputed: computedStore.getState().defineComputed,
    removeComputed: computedStore.getState().removeComputed,
    getComputedValue: computedStore.getState().getComputedValue,
    invalidateComputed: computedStore.getState().invalidateComputed,
    getComputedDebugInfo: computedStore.getState().getComputedDebugInfo
  }
}

// React hook for subscribing to computed properties
export function useComputed<R>(computedId: string): R | undefined {
  const [value, setValue] = React.useState<R | undefined>(() => 
    computedStore.getState().getComputedValue<R>(computedId)
  )

  React.useEffect(() => {
    // Subscribe to computed property changes
    const state = computedStore.getState()
    
    if (!state.subscriptions.has(computedId)) {
      state.subscriptions.set(computedId, new Set())
    }

    const callback = () => {
      const newValue = state.getComputedValue<R>(computedId)
      setValue(newValue)
    }

    state.subscriptions.get(computedId)!.add(callback)

    // Cleanup subscription
    return () => {
      state.subscriptions.get(computedId)?.delete(callback)
    }
  }, [computedId])

  return value
}

// Computed property builder for fluent API
export class ComputedBuilder<T, R = any> {
  private id: string
  private dependencies: string[] | ((state: T) => any)[] = []
  private selector?: (state: T) => R
  private options: ComputedOptions = {}

  constructor(id: string) {
    this.id = id
  }

  dependsOn(...deps: string[] | ((state: T) => any)[]): this {
    this.dependencies = deps
    return this
  }

  compute(selector: (state: T) => R): this {
    this.selector = selector
    return this
  }

  memoized(enabled: boolean = true): this {
    this.options.memoized = enabled
    return this
  }

  cacheTTL(ttl: number): this {
    this.options.cacheTTL = ttl
    return this
  }

  debugName(name: string): this {
    this.options.debugName = name
    return this
  }

  equalityFn(fn: (a: any, b: any) => boolean): this {
    this.options.equalityFn = fn
    return this
  }

  build(): void {
    if (!this.selector) {
      throw new Error(`Computed property ${this.id} must have a compute function`)
    }

    computedStore.getState().defineComputed(
      this.id,
      this.selector,
      this.dependencies,
      this.options
    )
  }
}

// Fluent API for defining computed properties
export function computed<T>(id: string): ComputedBuilder<T> {
  return new ComputedBuilder<T>(id)
}

// Performance monitoring utilities
export const computedPerformanceMonitor = {
  getAllMetrics: (): ComputedDebugInfo[] => {
    const state = computedStore.getState()
    const metrics: ComputedDebugInfo[] = []
    
    for (const [id] of state.computedProperties) {
      const debugInfo = state.getComputedDebugInfo(id)
      if (debugInfo) {
        metrics.push(debugInfo)
      }
    }
    
    return metrics
  },

  getSlowComputedProperties: (threshold: number = 10): ComputedDebugInfo[] => {
    return computedPerformanceMonitor.getAllMetrics()
      .filter(metric => metric.averageComputeTime > threshold)
      .sort((a, b) => b.averageComputeTime - a.averageComputeTime)
  },

  logPerformanceSummary: (): void => {
    const metrics = computedPerformanceMonitor.getAllMetrics()
    const slowProperties = computedPerformanceMonitor.getSlowComputedProperties()
    
    console.group('[ComputedStore] Performance Summary')
    console.log(`Total computed properties: ${metrics.length}`)
    console.log(`Slow properties (>10ms): ${slowProperties.length}`)
    
    if (slowProperties.length > 0) {
      console.table(slowProperties.map(prop => ({
        ID: prop.id,
        'Avg Time (ms)': prop.averageComputeTime.toFixed(2),
        'Compute Count': prop.computeCount,
        'Cache Hit Rate (%)': prop.cacheHitRate.toFixed(1)
      })))
    }
    
    console.groupEnd()
  }
}

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // Make computed store available globally for debugging
  (window as any).computedStore = computedStore
  (window as any).computedPerformanceMonitor = computedPerformanceMonitor
}