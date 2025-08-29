'use client'

import React, { memo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SettingsSuccessStateProps } from './types'

export const SettingsSuccessState = memo<SettingsSuccessStateProps>(({
  title = 'Success!',
  message,
  autoHide = false,
  duration = 5000,
  action,
  className,
  ...props
}) => {
  const [isVisible, setIsVisible] = React.useState(true)

  useEffect(() => {
    if (autoHide && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoHide, duration])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center space-x-3 p-4',
        'border border-green-200 bg-green-50 rounded-lg',
        'transition-all duration-500 ease-in-out',
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
          <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-sm font-semibold text-green-900">
            {title}
          </h4>
        )}
        <p className="text-sm text-green-700">
          {message}
        </p>
      </div>

      {action && (
        <div className="flex-shrink-0">
          <Button
            onClick={action.onClick}
            variant="outline"
            size="sm"
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
})

SettingsSuccessState.displayName = 'SettingsSuccessState'