/**
 * Error States Components
 * DESIGN_SPEC compliant error displays and fallbacks
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, XCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Alert Types
export type AlertType = 'error' | 'warning' | 'success' | 'info'

// Alert Component
export interface AlertProps {
  type?: AlertType
  title?: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  onClose?: () => void
  className?: string
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  action,
  onClose,
  className
}) => {
  const configs = {
    error: {
      icon: XCircle,
      bgColor: 'bg-error-50',
      borderColor: 'border-error-200',
      iconColor: 'text-error-500',
      titleColor: 'text-error-800',
      messageColor: 'text-error-600'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-50',
      borderColor: 'border-warning-200',
      iconColor: 'text-warning-500',
      titleColor: 'text-warning-800',
      messageColor: 'text-warning-600'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-50',
      borderColor: 'border-success-200',
      iconColor: 'text-success-500',
      titleColor: 'text-success-800',
      messageColor: 'text-success-600'
    },
    info: {
      icon: Info,
      bgColor: 'bg-info-50',
      borderColor: 'border-info-200',
      iconColor: 'text-info-500',
      titleColor: 'text-info-800',
      messageColor: 'text-info-600'
    }
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className={cn(
      config.bgColor,
      config.borderColor,
      "border rounded-lg p-4",
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn("h-5 w-5 mt-0.5", config.iconColor)} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h4 className={cn("text-sm font-medium mb-1", config.titleColor)}>
              {title}
            </h4>
          )}
          <p className={cn("text-sm", config.messageColor)}>
            {message}
          </p>
          {action && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={action.onClick}
                className="text-sm"
              >
                {action.label}
              </Button>
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              onClick={onClose}
              className={cn(
                "inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                config.iconColor,
                "hover:bg-white/50"
              )}
            >
              <span className="sr-only">Dismiss</span>
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Error Card Component
export interface ErrorCardProps {
  title?: string
  message: string
  details?: string
  onRetry?: () => void
  className?: string
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title = 'Something went wrong',
  message,
  details,
  onRetry,
  className
}) => {
  return (
    <div className={cn(
      "bg-white border border-error-200 rounded-lg p-6 text-center",
      className
    )}>
      <div className="flex flex-col items-center">
        <div className="rounded-full bg-error-50 p-3 mb-4">
          <AlertCircle className="h-8 w-8 text-error-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-gray-600 mb-4">
          {message}
        </p>
        {details && (
          <details className="text-left w-full mb-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Show details
            </summary>
            <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
              {details}
            </pre>
          </details>
        )}
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

// Empty State Component
export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 max-w-sm mb-6">
        {message}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Input Error Component
export interface InputErrorProps {
  message: string
  className?: string
}

export const InputError: React.FC<InputErrorProps> = ({
  message,
  className
}) => {
  return (
    <p className={cn("text-sm text-error-600 mt-1", className)}>
      {message}
    </p>
  )
}

// Error Boundary Fallback Component
export interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
  className?: string
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  resetError,
  className
}) => {
  return (
    <div className={cn(
      "min-h-[400px] flex items-center justify-center p-4",
      className
    )}>
      <ErrorCard
        title="Application Error"
        message="An unexpected error occurred. Please try refreshing the page."
        details={error.message}
        onRetry={resetError}
      />
    </div>
  )
}

// Toast Notification Component (for use with a toast library)
export interface ToastProps {
  type?: AlertType
  title?: string
  message: string
  duration?: number
  onClose?: () => void
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onClose
}) => {
  const configs = {
    error: {
      icon: XCircle,
      bgColor: 'bg-error-500',
      textColor: 'text-white'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-warning-500',
      textColor: 'text-white'
    },
    success: {
      icon: CheckCircle,
      bgColor: 'bg-success-500',
      textColor: 'text-white'
    },
    info: {
      icon: Info,
      bgColor: 'bg-info-500',
      textColor: 'text-white'
    }
  }

  const config = configs[type]
  const Icon = config.icon

  return (
    <div className={cn(
      config.bgColor,
      config.textColor,
      "rounded-lg shadow-lg p-4 min-w-[300px] max-w-md"
    )}>
      <div className="flex items-start">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="ml-3 flex-1">
          {title && (
            <p className="font-medium mb-1">{title}</p>
          )}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded hover:bg-white/20 p-1"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}