'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Switch } from '@/features/shared/ui/switch'
import { Label } from '@/features/shared/ui/label'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { SettingsToggleProps } from './types'

export const SettingsToggle = memo<SettingsToggleProps>(({
  id,
  label,
  description,
  loading = false,
  error,
  size = 'md',
  variant = 'default',
  className,
  checked,
  onValueChange,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const toggleId = id || `settings-toggle-${label.toLowerCase().replace(/\s+/g, '-')}`
  const descriptionId = useMemo(() => 
    description ? `${toggleId}-description` : undefined, 
    [toggleId, description]
  )
  const errorId = useMemo(() => 
    error ? `${toggleId}-error` : undefined, 
    [toggleId, error]
  )

  const handleValueChange = useCallback((value: boolean) => {
    onValueChange?.(value)
    onChange?.({
      target: { checked: value }
    } as React.ChangeEvent<HTMLInputElement>)
  }, [onValueChange, onChange])

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      label: 'text-sm',
      description: 'text-xs',
      switch: 'scale-90'
    },
    md: {
      container: 'gap-3',
      label: 'text-base',
      description: 'text-sm',
      switch: ''
    },
    lg: {
      container: 'gap-4',
      label: 'text-lg',
      description: 'text-base',
      switch: 'scale-110'
    }
  }

  const variantClasses = {
    default: {
      label: 'text-gray-900',
      description: 'text-gray-600'
    },
    success: {
      label: 'text-green-900',
      description: 'text-green-700'
    },
    warning: {
      label: 'text-yellow-900',
      description: 'text-yellow-700'
    },
    error: {
      label: 'text-red-900',
      description: 'text-red-700'
    }
  }

  const currentSize = sizeClasses[size]
  const currentVariant = error ? variantClasses.error : variantClasses[variant]

  return (
    <div 
      className={cn('flex items-start space-x-3', currentSize.container, className)}
      role="group"
      aria-labelledby={toggleId}
      aria-describedby={cn(
        ariaDescribedBy,
        descriptionId,
        errorId
      )}
    >
      {/* Toggle Switch */}
      <div className="flex-shrink-0 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
          </div>
        )}
        <Switch
          id={toggleId}
          checked={checked}
          onCheckedChange={handleValueChange}
          disabled={disabled || loading}
          className={cn(currentSize.switch)}
          aria-label={ariaLabel}
          {...props}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center space-x-2">
          <Label
            htmlFor={toggleId}
            className={cn(
              'font-medium cursor-pointer select-none',
              currentSize.label,
              currentVariant.label,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </Label>

          {/* Status Icons */}
          {variant === 'success' && !error && (
            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          )}
          {error && (
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
        </div>

        {description && (
          <p
            id={descriptionId}
            className={cn(
              currentSize.description,
              currentVariant.description,
              disabled && 'opacity-50'
            )}
          >
            {description}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className={cn(
              'text-red-600 font-medium',
              currentSize.description
            )}
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  )
})

SettingsToggle.displayName = 'SettingsToggle'