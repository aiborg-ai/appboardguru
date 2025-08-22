'use client'

import React, { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
          <p className="text-sm text-red-600 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleRetry}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export function FYIErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log FYI-specific errors
        console.error('FYI Error:', error)
        
        // Could send to error tracking service here
        // analytics.track('FYI_Error', { error: error.message, stack: error.stack })
      }}
      fallback={
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">FYI Service Unavailable</h3>
          <p className="text-sm text-yellow-600 mb-4">
            We're having trouble loading external insights right now. Please try again later.
          </p>
          <p className="text-xs text-yellow-500">
            You can still use other features while we work on fixing this.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}