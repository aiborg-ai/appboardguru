/**
 * Advanced Error Boundary Components
 * - Comprehensive error catching with context preservation
 * - Recovery strategies and fallback UI
 * - Integration with advanced error handling system
 * - Performance monitoring for error scenarios
 */

import React, { 
  Component, 
  ReactNode, 
  ErrorInfo,
  PropsWithChildren,
  useState,
  useEffect,
  useCallback
} from 'react'
import { errorHandler, EnhancedError, addBreadcrumb } from '@/lib/error-handling/advanced-error-handler'
import { logger } from '@/lib/logging/advanced-logger'

// Error boundary state interface
interface ErrorBoundaryState {
  hasError: boolean
  error?: EnhancedError
  errorId?: string
  retryCount: number
  isRecovering: boolean
  lastErrorTime: number
}

// Error boundary props interface
interface ErrorBoundaryProps extends PropsWithChildren {
  fallback?: (error: EnhancedError, retry: () => void, retryCount: number) => ReactNode
  onError?: (error: EnhancedError, errorInfo: ErrorInfo) => void
  isolate?: boolean // Prevent error propagation to parent boundaries
  enableRecovery?: boolean
  maxRetries?: number
  retryDelay?: number
  level?: 'page' | 'section' | 'component'
  name?: string // For error tracking and debugging
  resetKeys?: Array<string | number> // Keys that trigger reset when changed
  resetOnPropsChange?: boolean
}

// Default fallback UI components
const DefaultErrorFallback: React.FC<{
  error: EnhancedError
  retry: () => void
  retryCount: number
}> = ({ error, retry, retryCount }) => (
  <div className="min-h-32 flex items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg">
    <div className="text-center max-w-md">
      <div className="mb-4">
        <svg
          className="mx-auto h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-red-800 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-red-600 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
        >
          Try Again {retryCount > 0 && `(${retryCount})`}
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-100 text-sm font-medium"
        >
          Reload Page
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-left">
          <summary className="cursor-pointer text-sm text-red-600 font-medium">
            Error Details (Development)
          </summary>
          <pre className="mt-2 text-xs text-red-800 bg-red-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(error.toJSON(), null, 2)}
          </pre>
        </details>
      )}
    </div>
  </div>
)

/**
 * Class-based Error Boundary with advanced error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimer?: NodeJS.Timeout
  private unsubscribeErrorHandler?: () => void

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      retryCount: 0,
      isRecovering: false,
      lastErrorTime: 0
    }

    this.retry = this.retry.bind(this)
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name = 'ErrorBoundary', onError, level = 'component' } = this.props

    // Create enhanced error with React-specific context
    const enhancedError = new EnhancedError(
      error.message || 'React component error',
      'REACT_ERROR_BOUNDARY',
      'operational',
      {
        severity: level === 'page' ? 'high' : level === 'section' ? 'medium' : 'low',
        isRecoverable: true,
        context: {
          component: name,
          operation: 'render',
          componentStack: errorInfo.componentStack,
          errorBoundary: name,
          level
        },
        originalError: error
      }
    )

    // Add breadcrumb for error boundary catch
    addBreadcrumb({
      category: 'error',
      level: 'error',
      message: `Error caught by ${name}`,
      data: {
        errorMessage: error.message,
        componentStack: errorInfo.componentStack.split('\n').slice(0, 3).join('\n')
      }
    })

    // Handle error through advanced error system
    errorHandler.handleError(enhancedError)

    // Log error
    logger.error(`Error boundary caught error in ${name}`, error, {
      component: name,
      level,
      componentStack: errorInfo.componentStack
    })

    // Update state with enhanced error
    this.setState({
      error: enhancedError,
      errorId: enhancedError.id
    })

    // Call custom error handler
    onError?.(enhancedError, errorInfo)

    // Subscribe to error handler for recovery updates
    this.unsubscribeErrorHandler = errorHandler.subscribe((handledError) => {
      if (handledError.id === enhancedError.id && handledError.resolvedAt) {
        this.setState({ isRecovering: false })
      }
    })
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.children !== this.props.children) {
      // Reset if children change (common recovery pattern)
      if (resetOnPropsChange) {
        this.reset()
        return
      }

      // Reset if any reset keys changed
      if (resetKeys && resetKeys.length > 0) {
        const prevResetKeys = (prevProps as any).resetKeys || []
        const hasResetKeyChanged = resetKeys.some((key, index) => 
          key !== prevResetKeys[index]
        )
        
        if (hasResetKeyChanged) {
          this.reset()
        }
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
    this.unsubscribeErrorHandler?.()
  }

  retry = () => {
    const { maxRetries = 3, retryDelay = 1000, name = 'ErrorBoundary' } = this.props
    const { retryCount, error } = this.state

    if (retryCount >= maxRetries) {
      logger.warn(`${name} exceeded max retries (${maxRetries})`, undefined, {
        component: name,
        errorId: error?.id,
        retryCount
      })
      return
    }

    // Add breadcrumb for retry attempt
    addBreadcrumb({
      category: 'user',
      level: 'info',
      message: `Error boundary retry attempt ${retryCount + 1}`,
      data: {
        errorBoundary: name,
        retryCount: retryCount + 1,
        maxRetries
      }
    })

    this.setState({
      isRecovering: true,
      retryCount: retryCount + 1
    })

    // Delay retry to prevent rapid retries
    const delay = retryDelay * Math.pow(2, retryCount) // Exponential backoff
    this.retryTimer = setTimeout(() => {
      this.reset()
    }, delay)
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorId: undefined,
      isRecovering: false,
      lastErrorTime: 0
      // Keep retryCount for tracking
    })

    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }

    this.unsubscribeErrorHandler?.()
  }

  render() {
    const { children, fallback, isolate, name = 'ErrorBoundary' } = this.props
    const { hasError, error, retryCount, isRecovering } = this.state

    if (hasError && error) {
      // Render fallback UI
      const fallbackUI = fallback ? (
        fallback(error, this.retry, retryCount)
      ) : (
        <DefaultErrorFallback
          error={error}
          retry={this.retry}
          retryCount={retryCount}
        />
      )

      return (
        <div data-error-boundary={name} data-recovering={isRecovering}>
          {fallbackUI}
        </div>
      )
    }

    return children
  }
}

/**
 * Hook-based error boundary wrapper
 */
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)

  const resetError = useCallback(() => {
    setError(null)
  }, [])

  const captureError = useCallback((error: Error, context?: any) => {
    // Add breadcrumb for manual error capture
    addBreadcrumb({
      category: 'error',
      level: 'error',
      message: 'Manual error capture',
      data: { context }
    })

    // Handle through advanced error system
    errorHandler.handleError(error, context)
    
    // Set local error state
    setError(error)
  }, [])

  // Throw error to be caught by error boundary
  if (error) {
    throw error
  }

  return { captureError, resetError }
}

/**
 * Async error boundary for handling async errors
 */
export function AsyncErrorBoundary({ 
  children, 
  fallback,
  name = 'AsyncErrorBoundary'
}: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Handle unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Add breadcrumb
      addBreadcrumb({
        category: 'error',
        level: 'error',
        message: `Unhandled promise rejection in ${name}`,
        data: { reason: event.reason }
      })

      // Create error from rejection
      const rejectionError = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))

      setError(rejectionError)
      event.preventDefault() // Prevent browser console error
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [name])

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1)
    setError(null)
  }, [])

  if (error) {
    const enhancedError = new EnhancedError(
      error.message,
      'ASYNC_ERROR',
      'operational',
      {
        context: { component: name, operation: 'async' },
        originalError: error
      }
    )

    if (fallback) {
      return <>{fallback(enhancedError, retry, retryCount)}</>
    }

    return <DefaultErrorFallback error={enhancedError} retry={retry} retryCount={retryCount} />
  }

  return <>{children}</>
}

/**
 * Higher-order component for adding error boundaries
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.ComponentType<P> {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithErrorBoundaryComponent
}

/**
 * Specialized error boundaries for different contexts
 */

// Page-level error boundary with full page fallback
export const PageErrorBoundary: React.FC<PropsWithChildren<{
  name?: string
  onError?: (error: EnhancedError) => void
}>> = ({ 
  children, 
  name = 'PageErrorBoundary',
  onError 
}) => (
  <ErrorBoundary
    name={name}
    level="page"
    enableRecovery={true}
    maxRetries={3}
    onError={onError}
    fallback={(error, retry, retryCount) => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg text-center p-8">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-8">
            We're sorry, but something unexpected happened. Our team has been notified.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={retry}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
)

// Section-level error boundary for UI sections
export const SectionErrorBoundary: React.FC<PropsWithChildren<{
  name?: string
  title?: string
}>> = ({ 
  children, 
  name = 'SectionErrorBoundary',
  title = 'Section Error'
}) => (
  <ErrorBoundary
    name={name}
    level="section"
    enableRecovery={true}
    maxRetries={2}
    fallback={(error, retry, retryCount) => (
      <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
        <div className="flex">
          <svg
            className="h-5 w-5 text-orange-400 mt-0.5 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-orange-800">
              {title}
            </h3>
            <p className="text-sm text-orange-700 mt-1">
              This section couldn't load properly.
            </p>
            <div className="mt-3">
              <button
                onClick={retry}
                className="text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
              >
                Retry {retryCount > 0 && `(${retryCount})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
)

// Component-level error boundary for individual components
export const ComponentErrorBoundary: React.FC<PropsWithChildren<{
  name?: string
  fallbackHeight?: string
}>> = ({ 
  children, 
  name = 'ComponentErrorBoundary',
  fallbackHeight = 'h-24'
}) => (
  <ErrorBoundary
    name={name}
    level="component"
    enableRecovery={false}
    isolate={true}
    fallback={(error, retry) => (
      <div className={`${fallbackHeight} flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-center p-4`}>
        <div>
          <p className="text-sm text-gray-600 mb-2">Component failed to load</p>
          <button
            onClick={retry}
            className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
)