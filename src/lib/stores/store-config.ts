import { create } from 'zustand'
import { createJSONStorage, persist, subscribeWithSelector, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { StoreMigration, PerformanceMetrics } from './types'

// Store configuration interface
export interface StoreConfig {
  name: string
  version: number
  storage?: 'localStorage' | 'sessionStorage' | 'memory'
  migrate?: (persistedState: any, version: number) => any
  partialize?: (state: Record<string, unknown>) => any
  skipHydration?: boolean
  onRehydrateStorage?: (state: Record<string, unknown>) => ((state?: any, error?: Error) => void) | void
}

// Base store creator with all middleware
export function createStore<T extends object>(
  storeFunction: (
    set: (fn: (draft: T) => void) => void,
    get: () => T,
    api: any
  ) => T,
  config: StoreConfig
) {
  const { name, version, storage = 'localStorage', migrate, partialize, skipHydration, onRehydrateStorage } = config

  // Create storage based on config
  const getStorage = () => {
    switch (storage) {
      case 'localStorage':
        return typeof window !== 'undefined' ? localStorage : undefined
      case 'sessionStorage':
        return typeof window !== 'undefined' ? sessionStorage : undefined
      case 'memory':
        return undefined
      default:
        return typeof window !== 'undefined' ? localStorage : undefined
    }
  }

  // Create the store function with metadata
  const enhancedStoreFunction = (set: any, get: any, api: any) => ({
    ...storeFunction(set, get, api),
    _meta: {
      version,
      lastUpdated: Date.now(),
      hydrated: false,
      performance: {
        storeSize: 0,
        lastActionTime: 0,
        actionCounts: {},
        renderCounts: {}
      } as PerformanceMetrics
    }
  })

  // Build middleware chain properly
  let storeCreator = enhancedStoreFunction

  // Add immer for immutable updates
  storeCreator = immer(storeCreator)

  // Add subscription middleware for fine-grained subscriptions
  storeCreator = subscribeWithSelector(storeCreator)

  // Add dev tools in development
  if (process.env['NODE_ENV'] === 'development') {
    storeCreator = devtools(storeCreator)
  }

  // Add persistence if storage is specified
  if (storage !== 'memory') {
    storeCreator = persist(
      storeCreator,
      {
        name: `appboardguru-${name}`,
        version,
        storage: createJSONStorage(() => getStorage()!),
        migrate,
        partialize,
        skipHydration,
        onRehydrateStorage
      }
    )
  }

  // Create the store with properly composed middleware
  return create<T>()(storeCreator as any)
}

// Utility for creating selectors
export function createSelectors<S extends Record<string, unknown>>(store: S) {
  const storeIn = store as S
  const storeOut: S & { use: { [K in keyof S]: () => S[K] } } = {
    ...storeIn,
    use: {} as { [K in keyof S]: () => S[K] }
  }

  for (const k of Object.keys(storeIn) as (keyof S)[]) {
    storeOut.use[k] = () => storeIn((s) => s[k])
  }

  return storeOut
}

// Performance tracking utilities
export const trackStorePerformance = (storeName: string, actionName: string) => {
  if (process.env['NODE_ENV'] === 'development') {
    const startTime = performance.now()
    
    return {
      end: () => {
        const endTime = performance.now()
        console.log(`[${storeName}] ${actionName} took ${endTime - startTime}ms`)
      }
    }
  }
  
  return { end: () => {} }
}

// Common migration utilities
export const createMigrations = (migrations: StoreMigration[]) => {
  return (persistedState: any, version: number) => {
    let state = persistedState
    
    for (const migration of migrations) {
      if (migration.version > version) {
        state = migration.migrate(state)
      }
    }
    
    return state
  }
}

// Common partialize function for sensitive data
export const excludeSensitiveData = (state: Record<string, unknown>) => {
  const { auth, ...rest } = state
  return {
    ...rest,
    auth: {
      ...auth,
      // Exclude sensitive auth data from persistence
      session: undefined,
      tokens: undefined,
      refreshToken: undefined
    }
  }
}

// Store reset utility
export const resetAllStores = () => {
  if (typeof window !== 'undefined') {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('appboardguru-'))
    keys.forEach(key => localStorage.removeItem(key))
    
    // Reload page to reinitialize stores
    window.location.reload()
  }
}

// Store debugging utilities
export const debugStore = (store: any, name: string) => {
  if (process.env['NODE_ENV'] === 'development') {
    (window as any)[`debug_${name}`] = store
    console.log(`Store "${name}" available as window.debug_${name}`)
  }
}

// Batch actions for better performance
export const batchActions = (actions: (() => void)[]) => {
  const startTime = performance.now()
  
  actions.forEach(action => action())
  
  if (process.env['NODE_ENV'] === 'development') {
    const endTime = performance.now()
    console.log(`Batched ${actions.length} actions in ${endTime - startTime}ms`)
  }
}

// Store hydration check
export const waitForHydration = (store: any): Promise<void> => {
  return new Promise((resolve) => {
    const unsubscribe = store.persist?.onHydrate?.((state: Record<string, unknown>) => {
      if (state._meta?.hydrated) {
        unsubscribe?.()
        resolve()
      }
    })
    
    // Fallback timeout
    setTimeout(() => {
      unsubscribe?.()
      resolve()
    }, 1000)
  })
}

// Type-safe store subscription
export function subscribeToStore<T, U>(
  store: any,
  selector: (state: T) => U,
  callback: (current: U, previous: U) => void
) {
  return store.subscribe(selector, callback, {
    equalityFn: (a: U, b: U) => JSON.stringify(a) === JSON.stringify(b)
  })
}