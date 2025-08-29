'use client'

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-4">
              <div>
                <h3 className="font-medium">Something went wrong</h3>
                <p className="text-sm text-muted-foreground">
                  There was an error loading this component. Please try refreshing the page.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Refresh Page
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}