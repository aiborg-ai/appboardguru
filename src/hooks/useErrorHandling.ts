/**
 * Advanced Error Handling Hooks
 * - Comprehensive error handling for React components
 * - Integration with advanced error handling system
 * - Performance tracking for error scenarios
 * - Recovery strategies and user feedback
 */

import { 
  useState, 
  useCallback, 
  useEffect, 
  useRef,
  useMemo
} from 'react'
import { 
  errorHandler, 
  EnhancedError, 
  addBreadcrumb,
  RecoveryResult,
  ErrorContext
} from '@/lib/error-handling/advanced-error-handler'
import { logger } from '@/lib/logging/advanced-logger'

// Hook interfaces
export interface UseErrorHandlingOptions {
  enableRecovery?: boolean
  maxRetries?: number
  retryDelay?: number
  onError?: (error: EnhancedError) => void
  onRecovery?: (result: RecoveryResult) => void
  context?: Partial<ErrorContext>
  trackPerformance?: boolean
  componentName?: string
}

export interface ErrorState {
  error: EnhancedError | null
  isRecovering: boolean
  retryCount: number
  lastErrorTime: number
  recoveryResult: RecoveryResult | null
}

export interface AsyncErrorState<T> {
  data: T | null
  loading: boolean
  error: EnhancedError | null
  retryCount: number
}

/**
 * Main error handling hook with recovery capabilities
 */
export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const {
    enableRecovery = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRecovery,
    context = {},
    trackPerformance = true,
    componentName = 'UnknownComponent'
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRecovering: false,
    retryCount: 0,
    lastErrorTime: 0,
    recoveryResult: null
  })

  const retryTimer = useRef<NodeJS.Timeout>()
  const performanceStart = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current)
      }
    }
  }, [])

  // Handle error with advanced processing
  const handleError = useCallback(async (
    error: Error | EnhancedError,
    additionalContext?: Partial<ErrorContext>
  ) => {
    if (trackPerformance) {
      performanceStart.current = Date.now()
    }

    // Add breadcrumb for error occurrence
    addBreadcrumb({
      category: 'error',
      level: 'error',
      message: `Error in ${componentName}`,
      data: {
        errorMessage: error.message,
        componentName,
        ...additionalContext
      }
    })

    // Process error through advanced handler
    const enhancedError = error instanceof EnhancedError 
      ? error 
      : new EnhancedError(
          error.message,
          'COMPONENT_ERROR',
          'operational',
          {
            context: { component: componentName, ...context, ...additionalContext },
            originalError: error
          }
        )

    // Update error state
    setErrorState(prev => ({
      ...prev,
      error: enhancedError,
      lastErrorTime: Date.now(),
      isRecovering: false,
      recoveryResult: null
    }))

    // Log error
    logger.error(`Error in ${componentName}`, error, {
      component: componentName,
      ...context,
      ...additionalContext
    })

    // Call custom error handler
    onError?.(enhancedError)

    // Attempt recovery if enabled
    if (enableRecovery && enhancedError.isRecoverable) {
      try {
        const recoveryResult = await errorHandler.handleError(enhancedError, {
          component: componentName,
          ...context,
          ...additionalContext
        })

        if (recoveryResult) {
          setErrorState(prev => ({
            ...prev,
            recoveryResult,
            isRecovering: recoveryResult.action === 'retry'
          }))

          onRecovery?.(recoveryResult)

          // Handle different recovery actions
          switch (recoveryResult.action) {
            case 'retry':
              if (errorState.retryCount < maxRetries) {
                scheduleRetry(recoveryResult.delay || retryDelay)
              }
              break
            
            case 'fallback':
              // Recovery successful with fallback data
              clearError()
              break
            
            case 'ignore':
              // Error can be safely ignored
              clearError()
              break
          }
        }
      } catch (recoveryError) {
        logger.error(`Recovery failed for ${componentName}`, recoveryError as Error)
      }
    }

    if (trackPerformance) {
      const duration = Date.now() - performanceStart.current
      logger.info(`Error handling completed for ${componentName}`, {
        component: componentName,
        duration,
        recoverable: enhancedError.isRecoverable
      })
    }
  }, [
    componentName, 
    context, 
    enableRecovery, 
    maxRetries, 
    retryDelay, 
    onError, 
    onRecovery, 
    trackPerformance,
    errorState.retryCount
  ])

  // Schedule retry with exponential backoff
  const scheduleRetry = useCallback((delay: number) => {
    setErrorState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1
    }))

    retryTimer.current = setTimeout(() => {
      addBreadcrumb({
        category: 'user',
        level: 'info',
        message: `Retry attempt ${errorState.retryCount + 1} for ${componentName}`,
        data: { delay, maxRetries }
      })

      clearError()
      setErrorState(prev => ({ ...prev, isRecovering: false }))
    }, delay)
  }, [componentName, errorState.retryCount, maxRetries])

  // Manual retry function
  const retry = useCallback(() => {
    if (errorState.retryCount >= maxRetries) {
      logger.warn(`Max retries exceeded for ${componentName}`, {
        component: componentName,
        retryCount: errorState.retryCount,
        maxRetries
      })
      return
    }

    const delay = retryDelay * Math.pow(2, errorState.retryCount)
    scheduleRetry(delay)
  }, [componentName, errorState.retryCount, maxRetries, retryDelay, scheduleRetry])

  // Clear error state
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRecovering: false,
      retryCount: 0,
      lastErrorTime: 0,
      recoveryResult: null
    })

    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
    }
  }, [])

  // Check if can retry
  const canRetry = useMemo(() => 
    errorState.error?.isRecoverable && errorState.retryCount < maxRetries,
    [errorState.error, errorState.retryCount, maxRetries]
  )

  return {
    ...errorState,
    handleError,
    retry,
    clearError,
    canRetry
  }
}

/**
 * Hook for handling async operations with comprehensive error handling
 */
export function useAsyncErrorHandling<T>(
  asyncOperation: () => Promise<T>,
  options: UseErrorHandlingOptions & {
    immediate?: boolean
    dependencies?: React.DependencyList
  } = {}
) {
  const {
    immediate = false,
    dependencies = [],
    ...errorOptions
  } = options

  const [state, setState] = useState<AsyncErrorState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0
  })

  const { handleError, clearError, retry: retryError } = useErrorHandling(errorOptions)
  const operationRef = useRef<() => Promise<T>>(asyncOperation)
  const abortController = useRef<AbortController>()

  // Update operation reference
  useEffect(() => {
    operationRef.current = asyncOperation
  }, [asyncOperation])

  // Execute async operation
  const execute = useCallback(async () => {
    // Cancel previous operation
    if (abortController.current) {
      abortController.current.abort()
    }
    
    abortController.current = new AbortController()
    const currentController = abortController.current

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    addBreadcrumb({
      category: 'user',
      level: 'info',
      message: `Starting async operation in ${options.componentName}`,
      data: { retryCount: state.retryCount }
    })

    const operationStart = Date.now()

    try {
      const result = await operationRef.current()
      
      // Check if operation was cancelled
      if (currentController.signal.aborted) {
        return
      }

      const duration = Date.now() - operationStart
      
      setState(prev => ({
        data: result,
        loading: false,
        error: null,
        retryCount: 0
      }))

      logger.info(`Async operation completed in ${options.componentName}`, {
        component: options.componentName,
        duration,
        success: true
      })

      clearError()

    } catch (error) {
      // Check if operation was cancelled
      if (currentController.signal.aborted) {
        return
      }

      const duration = Date.now() - operationStart
      const enhancedError = new EnhancedError(
        (error as Error).message || 'Async operation failed',
        'ASYNC_OPERATION_ERROR',
        'operational',
        {
          context: {
            component: options.componentName,
            operation: 'asyncOperation',
            duration
          },
          originalError: error as Error
        }
      )

      setState(prev => ({
        ...prev,
        loading: false,
        error: enhancedError,
        retryCount: prev.retryCount + 1
      }))

      await handleError(enhancedError, {
        operation: 'asyncOperation',
        duration
      })
    }
  }, [
    state.retryCount, 
    options.componentName, 
    handleError, 
    clearError
  ])

  // Retry function
  const retry = useCallback(() => {
    retryError()
    execute()
  }, [retryError, execute])

  // Execute on mount if immediate
  useEffect(() => {
    if (immediate) {
      execute()
    }
  }, [immediate, execute])

  // Execute when dependencies change
  useEffect(() => {
    if (dependencies.length > 0) {
      execute()
    }
  }, dependencies) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [])

  return {
    ...state,
    execute,
    retry,
    cancel: useCallback(() => {
      abortController.current?.abort()
      setState(prev => ({ ...prev, loading: false }))
    }, [])
  }
}

/**
 * Hook for form error handling with validation
 */
export function useFormErrorHandling<T extends Record<string, any>>(
  validationSchema?: (values: T) => Record<keyof T, string | null>,
  options: UseErrorHandlingOptions = {}
) {
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof T, string>>>({})
  const { handleError, clearError } = useErrorHandling(options)

  // Validate field
  const validateField = useCallback((name: keyof T, value: any, allValues: T) => {
    if (!validationSchema) return null

    const errors = validationSchema(allValues)
    const fieldError = errors[name]

    setFieldErrors(prev => ({
      ...prev,
      [name]: fieldError || undefined
    }))

    if (fieldError) {
      const validationError = new EnhancedError(
        fieldError,
        'VALIDATION_ERROR',
        'validation',
        {
          context: {
            component: options.componentName,
            operation: 'fieldValidation',
            field: String(name),
            value: typeof value === 'string' ? value.substring(0, 100) : String(value)
          }
        }
      )

      handleError(validationError)
    }

    return fieldError
  }, [validationSchema, options.componentName, handleError])

  // Validate all fields
  const validateForm = useCallback((values: T) => {
    if (!validationSchema) return {}

    const errors = validationSchema(values)
    const hasErrors = Object.values(errors).some(error => error !== null)

    setFieldErrors(errors)

    if (hasErrors) {
      const formError = new EnhancedError(
        'Form validation failed',
        'FORM_VALIDATION_ERROR',
        'validation',
        {
          context: {
            component: options.componentName,
            operation: 'formValidation'
          },
          extra: { errors }
        }
      )

      handleError(formError)
    } else {
      clearError()
    }

    return errors
  }, [validationSchema, options.componentName, handleError, clearError])

  // Clear field error
  const clearFieldError = useCallback((name: keyof T) => {
    setFieldErrors(prev => {
      const updated = { ...prev }
      delete updated[name]
      return updated
    })
  }, [])

  // Clear all field errors
  const clearAllErrors = useCallback(() => {
    setFieldErrors({})
    clearError()
  }, [clearError])

  return {
    fieldErrors,
    validateField,
    validateForm,
    clearFieldError,
    clearAllErrors,
    hasErrors: Object.keys(fieldErrors).length > 0
  }
}

/**
 * Hook for API error handling with retry logic
 */
export function useApiErrorHandling(options: UseErrorHandlingOptions = {}) {
  const { handleError, ...errorState } = useErrorHandling({
    ...options,
    context: {
      ...options.context,
      operation: 'apiCall'
    }
  })

  // Handle API errors with specific context
  const handleApiError = useCallback((
    error: Error,
    requestInfo: {
      url: string
      method: string
      status?: number
      body?: any
    }
  ) => {
    const apiError = new EnhancedError(
      error.message || 'API request failed',
      'API_ERROR',
      'network',
      {
        severity: requestInfo.status && requestInfo.status >= 500 ? 'high' : 'medium',
        context: {
          ...options.context,
          operation: 'apiCall',
          url: requestInfo.url,
          method: requestInfo.method,
          statusCode: requestInfo.status
        },
        extra: {
          requestBody: requestInfo.body,
          responseStatus: requestInfo.status
        },
        originalError: error
      }
    )

    addBreadcrumb({
      category: 'http',
      level: 'error',
      message: `API Error: ${requestInfo.method} ${requestInfo.url}`,
      data: {
        status: requestInfo.status,
        errorMessage: error.message
      }
    })

    return handleError(apiError)
  }, [handleError, options.context])

  return {
    ...errorState,
    handleApiError
  }
}

/**
 * Hook for global error boundary integration
 */
export function useGlobalErrorHandler() {
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      addBreadcrumb({
        category: 'error',
        level: 'error',
        message: 'Global error event',
        data: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          message: event.message
        }
      })

      const globalError = new EnhancedError(
        event.message || 'Global error',
        'GLOBAL_ERROR',
        'system',
        {
          severity: 'high',
          context: {
            operation: 'globalErrorHandler',
            url: event.filename,
            line: event.lineno,
            column: event.colno
          },
          originalError: event.error
        }
      )

      errorHandler.handleError(globalError)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addBreadcrumb({
        category: 'error',
        level: 'error',
        message: 'Unhandled promise rejection',
        data: {
          reason: String(event.reason)
        }
      })

      const rejectionError = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))

      const globalError = new EnhancedError(
        rejectionError.message || 'Unhandled promise rejection',
        'UNHANDLED_REJECTION',
        'system',
        {
          severity: 'high',
          context: {
            operation: 'unhandledRejection'
          },
          originalError: rejectionError
        }
      )

      errorHandler.handleError(globalError)
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return {
    getErrorMetrics: () => errorHandler.getErrorMetrics(),
    clearOldErrors: (maxAge?: number) => errorHandler.clearOldErrors(maxAge)
  }
}