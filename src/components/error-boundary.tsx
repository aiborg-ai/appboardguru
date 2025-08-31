'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
  isolate?: boolean
  level?: 'page' | 'section' | 'component'
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null
  private errorCounter = 0

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props
    
    // Log error details in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // Update state with error info
    this.setState({ errorInfo })

    // Increment error counter for rate limiting
    this.errorCounter++

    // Auto-retry after 5 seconds if error rate is low
    if (this.errorCounter <= 3 && this.props.level !== 'page') {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetError()
      }, 5000)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state
    
    // Reset error if resetKeys changed
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetError()
      }
    }

    // Reset error if props changed and resetOnPropsChange is true
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetError()
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  resetError = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }
    
    this.errorCounter = 0
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    const { hasError, error } = this.state
    const { children, fallback, isolate = true, level = 'component' } = this.props

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>
      }

      // Default error UI based on level
      const errorUI = this.getErrorUI(level, error)
      
      // Isolate error to prevent cascading
      if (isolate && level !== 'page') {
        return <div className="error-boundary-wrapper">{errorUI}</div>
      }
      
      return errorUI
    }

    return children
  }

  private getErrorUI(level: 'page' | 'section' | 'component', error?: Error) {
    switch (level) {
      case 'page':
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <CardTitle>Page Error</CardTitle>
                </div>
                <CardDescription>
                  Something went wrong while loading this page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {process.env.NODE_ENV === 'development' && error && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-mono text-muted-foreground">
                      {error.message}
                    </p>
                  </div>
                )}
                <Button onClick={this.resetError} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )

      case 'section':
        return (
          <Alert className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Section Unavailable</h3>
                  <p className="text-sm text-muted-foreground">
                    This section encountered an error
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={this.resetError}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
              {process.env.NODE_ENV === 'development' && error && (
                <p className="text-xs font-mono text-muted-foreground">
                  {error.message}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )

      case 'component':
      default:
        return (
          <div className="p-4 border border-destructive/50 rounded-md bg-destructive/5">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-muted-foreground">Component error</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={this.resetError}
                className="ml-auto h-6 px-2"
              >
                Retry
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && error && (
              <p className="mt-2 text-xs font-mono text-muted-foreground">
                {error.message}
              </p>
            )}
          </div>
        )
    }
  }
}

/**
 * Higher-order component to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Hook to imperatively throw errors to nearest error boundary
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}