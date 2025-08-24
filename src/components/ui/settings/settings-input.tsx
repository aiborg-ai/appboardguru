'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { SettingsInputProps } from './types'

export const SettingsInput = memo<SettingsInputProps>(({
  id,
  label,
  description,
  error,
  success,
  loading = false,
  size = 'md',
  startIcon: StartIcon,
  endIcon: EndIcon,
  className,
  value,
  onValueChange,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const inputId = id || `settings-input-${label.toLowerCase().replace(/\s+/g, '-')}`
  const descriptionId = useMemo(() => 
    description ? `${inputId}-description` : undefined, 
    [inputId, description]
  )
  const errorId = useMemo(() => 
    error ? `${inputId}-error` : undefined, 
    [inputId, error]
  )
  const successId = useMemo(() => 
    success ? `${inputId}-success` : undefined, 
    [inputId, success]
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange?.(e.target.value)
    onChange?.(e)
  }, [onValueChange, onChange])

  const sizeClasses = {
    sm: {
      label: 'text-sm',
      description: 'text-xs',
      input: 'h-8 text-sm px-3',
      icon: 'h-4 w-4'
    },
    md: {
      label: 'text-base',
      description: 'text-sm',
      input: 'h-10 px-3',
      icon: 'h-4 w-4'
    },
    lg: {
      label: 'text-lg',
      description: 'text-base',
      input: 'h-12 text-lg px-4',
      icon: 'h-5 w-5'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={inputId}
          className={cn(
            'font-medium text-gray-900',
            currentSize.label,
            disabled && 'opacity-50'
          )}
        >
          {label}
        </Label>

        {/* Status Icons */}
        <div className="flex items-center space-x-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          )}
          {success && !error && !loading && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {error && !loading && (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p
          id={descriptionId}
          className={cn(
            'text-gray-600',
            currentSize.description,
            disabled && 'opacity-50'
          )}
        >
          {description}
        </p>
      )}

      {/* Input with Icons */}
      <div className="relative">
        {StartIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <StartIcon className={cn(currentSize.icon, 'text-gray-400')} />
          </div>
        )}
        
        <Input
          id={inputId}
          value={value}
          onChange={handleChange}
          disabled={disabled || loading}
          className={cn(
            currentSize.input,
            StartIcon && 'pl-10',
            EndIcon && 'pr-10',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            success && 'border-green-300 focus:border-green-500 focus:ring-green-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={ariaLabel}
          aria-describedby={cn(
            ariaDescribedBy,
            descriptionId,
            errorId,
            successId
          )}
          {...props}
        />

        {EndIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <EndIcon className={cn(currentSize.icon, 'text-gray-400')} />
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && !error && (
        <p
          id={successId}
          className={cn(
            'text-green-600 font-medium',
            currentSize.description
          )}
          role="status"
          aria-live="polite"
        >
          {success}
        </p>
      )}

      {/* Error Message */}
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
  )
})

SettingsInput.displayName = 'SettingsInput'