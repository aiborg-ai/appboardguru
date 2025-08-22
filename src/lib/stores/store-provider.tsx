'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { initializeStores, waitForStoreHydration, stores } from './store-utils'
import { webSocketManager } from './websocket-manager'
import { authStore } from './auth-store'

// Store context
interface StoreContextValue {
  isInitialized: boolean
  isHydrated: boolean
  error: string | null
}

const StoreContext = createContext<StoreContextValue | null>(null)

// Store provider props
interface StoreProviderProps {
  children: React.ReactNode
  enableWebSocket?: boolean
  enableDevTools?: boolean
}

// Store provider component
export function StoreProvider({ 
  children, 
  enableWebSocket = true,
  enableDevTools = process.env.NODE_ENV === 'development'
}: StoreProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize all stores
        await initializeStores()
        setIsInitialized(true)

        // Wait for hydration
        await waitForStoreHydration()
        setIsHydrated(true)

        // Initialize WebSocket if enabled
        if (enableWebSocket) {
          const user = authStore.getState().user
          if (user) {
            webSocketManager.connect()
          }
        }

        // Enable dev tools if in development
        if (enableDevTools && typeof window !== 'undefined') {
          Object.entries(stores).forEach(([name, store]) => {
            (window as any)[`${name}Store`] = store
          })
          console.log('Stores available on window:', Object.keys(stores).map(name => `${name}Store`))
        }
      } catch (err) {
        console.error('Failed to initialize stores:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize stores')
      }
    }

    init()

    // Cleanup on unmount
    return () => {
      if (enableWebSocket) {
        webSocketManager.disconnect()
      }
    }
  }, [enableWebSocket, enableDevTools])

  // Show loading state while initializing
  if (!isInitialized || !isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">
            {!isInitialized ? 'Initializing stores...' : 'Loading data...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Initialize Application
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    )
  }

  const contextValue: StoreContextValue = {
    isInitialized,
    isHydrated,
    error
  }

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  )
}

// Hook to use store context
export function useStoreContext() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider')
  }
  return context
}

// HOC for components that require stores to be initialized
export function withStoreProvider<P extends object>(
  Component: React.ComponentType<P>,
  options: { enableWebSocket?: boolean; enableDevTools?: boolean } = {}
) {
  return function WrappedComponent(props: P) {
    return (
      <StoreProvider {...options}>
        <Component {...props} />
      </StoreProvider>
    )
  }
}

// Store status component for debugging
export function StoreStatus() {
  const { isInitialized, isHydrated, error } = useStoreContext()
  const [wsState, setWsState] = useState(webSocketManager.getState())

  useEffect(() => {
    const unsubscribe = webSocketManager.on('stateChanged', (state) => {
      setWsState(state)
    })

    return unsubscribe
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-80 text-white text-xs p-2 rounded max-w-xs">
      <div className="space-y-1">
        <div>Stores: {isInitialized ? '✅' : '❌'}</div>
        <div>Hydrated: {isHydrated ? '✅' : '❌'}</div>
        <div>WebSocket: {wsState === 'connected' ? '✅' : wsState === 'connecting' ? '🔄' : '❌'}</div>
        {error && <div className="text-red-400">Error: {error}</div>}
      </div>
    </div>
  )
}