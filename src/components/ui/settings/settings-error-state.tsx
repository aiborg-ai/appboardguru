'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import type { SettingsErrorStateProps } from './types'

export const SettingsErrorState = memo<SettingsErrorStateProps>(({
  title = 'Something went wrong',
  message,
  action,
  recoverable = true,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'border border-red-200 bg-red-50 rounded-lg',
        className
      )}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <div className="mx-auto mb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600" aria-hidden="true" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-red-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-red-700 mb-4 max-w-sm">
        {message}
      </p>

      {(action || recoverable) && (
        <div className="flex items-center space-x-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              {action.label}
            </Button>
          )}
          
          {recoverable && !action && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  )
})

SettingsErrorState.displayName = 'SettingsErrorState'