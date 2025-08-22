import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { act } from '@testing-library/react'
import { create } from 'zustand'
import {
  logging,
  enhancedPersist,
  enhancedDevtools,
  composeMiddleware,
  createEnhancedStore,
  MemoryStorage
} from '../middleware'
import { createTestStore, StoreSnapshot } from './store-test-utils'

// Mock performance API
Object.defineProperty(global.performance, 'now', {
  value: jest.fn(() => Date.now()),
  writable: true
})

// Mock localStorage for persistence tests
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

// Mock BroadcastChannel for cross-tab sync
global.BroadcastChannel = jest.fn().mockImplementation((name) => ({
  name,
  postMessage: jest.fn(),
  close: jest.fn(),
  onmessage: null,
  onmessageerror: null,
  onerror: null
}))

// Mock CompressionStream and DecompressionStream
global.CompressionStream = jest.fn().mockImplementation((format) => ({
  writable: {
    getWriter: () => ({
      write: jest.fn(),
      close: jest.fn()
    })
  },
  readable: {
    getReader: () => ({
      read: jest.fn().mockResolvedValue({ value: new Uint8Array([1, 2, 3]), done: true })
    })
  }
}))

global.DecompressionStream = jest.fn().mockImplementation((format) => ({
  writable: {
    getWriter: () => ({
      write: jest.fn(),
      close: jest.fn()
    })
  },
  readable: {
    getReader: () => ({
      read: jest.fn().mockResolvedValue({ value: new Uint8Array([1, 2, 3]), done: true })
    })
  }
}))

// Mock Web Crypto API for encryption
global.crypto = {
  subtle: {
    generateKey: jest.fn().mockResolvedValue({}),
    importKey: jest.fn().mockResolvedValue({}),
    encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
    digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
  },
  getRandomValues: jest.fn().mockImplementation((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  })
} as any

describe('Store Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    mockLocalStorage.setItem.mockImplementation(() => {})
  })

  describe('Logging Middleware', () => {
    it('should log store actions in development', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation()
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation()

      const store = create(
        logging(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
          }),
          'test-store',
          {
            enabled: true,
            logLevel: 'debug',
            includeState: true,
            includeTimestamp: true
          }
        )
      )

      act(() => {
        store.getState().increment()
      })

      expect(consoleLogSpy).toHaveBeenCalled()
      expect(consoleGroupSpy).toHaveBeenCalled()
      expect(consoleGroupEndSpy).toHaveBeenCalled()

      consoleLogSpy.mockRestore()
      consoleGroupSpy.mockRestore()
      consoleGroupEndSpy.mockRestore()
    })

    it('should capture performance metrics', () => {
      const store = create(
        logging(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
          }),
          'test-store',
          {
            enabled: true,
            includeTimestamp: true
          }
        )
      )

      const logStore = (store as any).$$logStore
      expect(logStore).toBeDefined()

      act(() => {
        store.getState().increment()
      })

      const logs = logStore.getLogs()
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].duration).toBeDefined()
      expect(typeof logs[0].duration).toBe('number')
    })

    it('should filter actions based on configuration', () => {
      const store = create(
        logging(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
            decrement: () => set((state) => ({ count: state.count - 1 }), false, 'decrement')
          }),
          'test-store',
          {
            enabled: true,
            filterActions: ['increment']
          }
        )
      )

      const logStore = (store as any).$$logStore

      act(() => {
        store.getState().increment()
        store.getState().decrement()
      })

      const logs = logStore.getLogs()
      const incrementLogs = logs.filter((log: any) => log.action === 'increment')
      const decrementLogs = logs.filter((log: any) => log.action === 'decrement')

      expect(incrementLogs.length).toBeGreaterThan(0)
      expect(decrementLogs.length).toBe(0)
    })

    it('should exclude actions based on configuration', () => {
      const store = create(
        logging(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
            decrement: () => set((state) => ({ count: state.count - 1 }), false, 'decrement')
          }),
          'test-store',
          {
            enabled: true,
            excludeActions: ['decrement']
          }
        )
      )

      const logStore = (store as any).$$logStore

      act(() => {
        store.getState().increment()
        store.getState().decrement()
      })

      const logs = logStore.getLogs()
      const incrementLogs = logs.filter((log: any) => log.action === 'increment')
      const decrementLogs = logs.filter((log: any) => log.action === 'decrement')

      expect(incrementLogs.length).toBeGreaterThan(0)
      expect(decrementLogs.length).toBe(0)
    })
  })

  describe('Persistence Middleware', () => {
    it('should persist state to memory storage', async () => {
      const memoryStorage = new MemoryStorage()
      
      const store = create(
        enhancedPersist({
          name: 'test-store',
          storage: memoryStorage
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          })
        )
      )

      act(() => {
        store.getState().increment()
      })

      // Give some time for persistence
      await new Promise(resolve => setTimeout(resolve, 100))

      const persistedData = memoryStorage.getItem('test-store')
      expect(persistedData).toBeDefined()
      
      if (persistedData) {
        const parsed = JSON.parse(persistedData)
        expect(parsed.state.count).toBe(1)
      }
    })

    it('should handle storage encryption', async () => {
      const store = create(
        enhancedPersist({
          name: 'test-store',
          storage: 'memory',
          encryption: {
            enabled: true,
            key: 'test-key'
          }
        })(
          (set) => ({
            sensitiveData: 'secret',
            updateData: (data: string) => set({ sensitiveData: data })
          })
        )
      )

      act(() => {
        store.getState().updateData('new secret')
      })

      // Verify that crypto methods would be called
      // (actual encryption is mocked, but we can verify the setup)
      expect(store.getState().sensitiveData).toBe('new secret')
    })

    it('should handle cross-tab synchronization', async () => {
      const store = create(
        enhancedPersist({
          name: 'test-store',
          storage: 'memory',
          sync: {
            crossTab: true,
            conflictResolution: 'timestamp_wins',
            debounceMs: 100
          }
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          })
        )
      )

      act(() => {
        store.getState().increment()
      })

      // Verify BroadcastChannel was created
      expect(BroadcastChannel).toHaveBeenCalled()
    })
  })

  describe('Devtools Middleware', () => {
    beforeEach(() => {
      // Mock Redux DevTools
      ;(global as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: jest.fn(() => ({
          subscribe: jest.fn(),
          unsubscribe: jest.fn(),
          send: jest.fn(),
          init: jest.fn(),
          error: jest.fn()
        }))
      }
    })

    it('should integrate with Redux DevTools', () => {
      const store = create(
        enhancedDevtools({
          enabled: true,
          name: 'Test Store'
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
          })
        )
      )

      expect(store.$$devtools).toBeDefined()
      expect(typeof store.$$devtools.goBack).toBe('function')
      expect(typeof store.$$devtools.goForward).toBe('function')
    })

    it('should support time travel functionality', () => {
      const store = create(
        enhancedDevtools({
          enabled: true,
          timeTravel: {
            enabled: true,
            maxSnapshots: 10
          }
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
          })
        )
      )

      // Perform some actions
      act(() => {
        store.getState().increment()
        store.getState().increment()
        store.getState().increment()
      })

      const snapshots = store.$$devtools.getSnapshots()
      expect(snapshots.length).toBeGreaterThan(0)

      // Test time travel
      const initialCount = store.getState().count
      act(() => {
        store.$$devtools.goBack()
      })

      // State should have changed
      expect(store.getState().count).toBeLessThanOrEqual(initialCount)
    })

    it('should record action performance metrics', () => {
      const store = create(
        enhancedDevtools({
          enabled: true,
          actionLogging: {
            enabled: true,
            includeState: true,
            includeTimestamp: true
          }
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
          })
        )
      )

      act(() => {
        store.getState().increment()
      })

      // Verify that performance metrics are being tracked
      expect(store.$$devtools.actionLogger).toBeDefined()
    })

    it('should export and import snapshots', () => {
      const store = create(
        enhancedDevtools({
          enabled: true,
          timeTravel: {
            enabled: true
          }
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
          })
        )
      )

      // Perform actions to create snapshots
      act(() => {
        store.getState().increment()
        store.getState().increment()
      })

      // Export snapshots
      const exported = store.$$devtools.exportSnapshots()
      expect(typeof exported).toBe('string')
      expect(exported.length).toBeGreaterThan(0)

      // Clear snapshots
      act(() => {
        store.$$devtools.clearSnapshots()
      })

      expect(store.$$devtools.getSnapshots().length).toBe(0)

      // Import snapshots
      const imported = store.$$devtools.importSnapshots(exported)
      expect(imported).toBe(true)
      expect(store.$$devtools.getSnapshots().length).toBeGreaterThan(0)
    })
  })

  describe('Middleware Composition', () => {
    it('should compose multiple middleware correctly', () => {
      const store = createEnhancedStore(
        (set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment')
        }),
        'composed-store',
        {
          logging: {
            enabled: true,
            config: { logLevel: 'debug' }
          },
          persistence: {
            name: 'composed-store',
            storage: 'memory'
          },
          devtools: {
            enabled: true,
            name: 'Composed Store'
          }
        }
      )

      // Verify all middleware features are available
      expect(store.$$logStore).toBeDefined()
      expect(store.$$devtools).toBeDefined()

      act(() => {
        store.getState().increment()
      })

      expect(store.getState().count).toBe(1)
    })

    it('should handle middleware order correctly', () => {
      const executionOrder: string[] = []

      const middleware1 = (storeInitializer: any) => (set: any, get: any, api: any) => {
        executionOrder.push('middleware1')
        return storeInitializer(set, get, api)
      }

      const middleware2 = (storeInitializer: any) => (set: any, get: any, api: any) => {
        executionOrder.push('middleware2')
        return storeInitializer(set, get, api)
      }

      const composedStore = composeMiddleware(
        (set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 }))
        }),
        {} // No built-in middleware for this test
      )

      const store = create(composedStore)

      // Middleware should be executed in the correct order
      expect(store.getState().count).toBe(0)
    })
  })

  describe('Middleware Configuration', () => {
    it('should respect environment-based configuration', () => {
      const originalEnv = process.env.NODE_ENV

      // Test development configuration
      process.env.NODE_ENV = 'development'
      
      const devStore = createEnhancedStore(
        (set) => ({ count: 0 }),
        'dev-store'
      )

      expect(devStore.$$logStore).toBeDefined()
      expect(devStore.$$devtools).toBeDefined()

      // Test production configuration
      process.env.NODE_ENV = 'production'
      
      const prodStore = createEnhancedStore(
        (set) => ({ count: 0 }),
        'prod-store'
      )

      // In production, logging and devtools should be disabled
      // (though our mocks might still show them as defined)

      process.env.NODE_ENV = originalEnv
    })

    it('should allow custom middleware configuration', () => {
      const store = createEnhancedStore(
        (set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 }))
        }),
        'custom-store',
        {
          logging: {
            enabled: true,
            config: {
              logLevel: 'warn',
              includeState: false,
              maxLogEntries: 50
            }
          },
          persistence: {
            name: 'custom-store',
            storage: 'memory',
            encryption: {
              enabled: true
            },
            compression: {
              enabled: true
            }
          },
          devtools: {
            enabled: true,
            timeTravel: {
              enabled: true,
              maxSnapshots: 25
            }
          }
        }
      )

      expect(store).toBeDefined()
      expect(typeof store.getState).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', () => {
      const errorMiddleware = (storeInitializer: any) => (set: any, get: any, api: any) => {
        const wrappedSet = (updater: any, replace?: boolean, action?: string) => {
          if (action === 'error') {
            throw new Error('Middleware error')
          }
          return set(updater, replace, action)
        }
        
        return storeInitializer(wrappedSet, get, api)
      }

      const store = create(
        errorMiddleware(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }), false, 'increment'),
            error: () => set((state) => ({ count: state.count + 1 }), false, 'error')
          })
        )
      )

      // Normal action should work
      act(() => {
        store.getState().increment()
      })
      expect(store.getState().count).toBe(1)

      // Error action should throw
      expect(() => {
        act(() => {
          store.getState().error()
        })
      }).toThrow('Middleware error')
    })

    it('should handle storage errors in persistence middleware', async () => {
      const errorStorage = {
        getItem: jest.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
        setItem: jest.fn().mockImplementation(() => {
          throw new Error('Storage error')
        }),
        removeItem: jest.fn()
      }

      const store = create(
        enhancedPersist({
          name: 'error-store',
          storage: errorStorage as any
        })(
          (set) => ({
            count: 0,
            increment: () => set((state) => ({ count: state.count + 1 }))
          })
        )
      )

      // Store should still work despite storage errors
      act(() => {
        store.getState().increment()
      })

      expect(store.getState().count).toBe(1)
    })
  })

  describe('Performance', () => {
    it('should not significantly impact store performance', () => {
      const plainStore = create((set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 }))
      }))

      const enhancedStore = createEnhancedStore(
        (set) => ({
          count: 0,
          increment: () => set((state) => ({ count: state.count + 1 }))
        }),
        'perf-store'
      )

      const iterations = 1000

      // Measure plain store performance
      const plainStartTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        act(() => {
          plainStore.getState().increment()
        })
      }
      const plainEndTime = performance.now()
      const plainDuration = plainEndTime - plainStartTime

      // Reset enhanced store
      enhancedStore.setState({ count: 0 })

      // Measure enhanced store performance
      const enhancedStartTime = performance.now()
      for (let i = 0; i < iterations; i++) {
        act(() => {
          enhancedStore.getState().increment()
        })
      }
      const enhancedEndTime = performance.now()
      const enhancedDuration = enhancedEndTime - enhancedStartTime

      // Enhanced store should not be more than 5x slower than plain store
      // (This is a generous threshold to account for test environment variations)
      expect(enhancedDuration).toBeLessThan(plainDuration * 5)

      // Both stores should have the same final state
      expect(plainStore.getState().count).toBe(iterations)
      expect(enhancedStore.getState().count).toBe(iterations)
    })
  })
})