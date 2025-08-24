'use client'

import React, { memo, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { SettingsSelectProps } from './types'

export const SettingsSelect = memo<SettingsSelectProps>(({
  id,
  label,
  description,
  placeholder = 'Select an option...',
  options,
  loading = false,
  error,
  success,
  size = 'md',
  className,
  value,
  onValueChange,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const selectId = id || `settings-select-${label.toLowerCase().replace(/\s+/g, '-')}`
  const descriptionId = useMemo(() => 
    description ? `${selectId}-description` : undefined, 
    [selectId, description]
  )
  const errorId = useMemo(() => 
    error ? `${selectId}-error` : undefined, 
    [selectId, error]
  )
  const successId = useMemo(() => 
    success ? `${selectId}-success` : undefined, 
    [selectId, success]
  )

  const handleValueChange = useCallback((newValue: string) => {
    onValueChange?.(newValue)
    onChange?.({
      target: { value: newValue }
    } as React.ChangeEvent<HTMLSelectElement>)
  }, [onValueChange, onChange])

  const sizeClasses = {
    sm: {
      label: 'text-sm',
      description: 'text-xs',
      select: 'h-8 text-sm'
    },
    md: {
      label: 'text-base',
      description: 'text-sm',
      select: 'h-10'
    },
    lg: {
      label: 'text-lg',
      description: 'text-base',
      select: 'h-12 text-lg'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={selectId}
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

      {/* Select */}
      <Select
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-describedby={cn(
          ariaDescribedBy,
          descriptionId,
          errorId,
          successId
        )}
        {...props}
      >
        <SelectTrigger
          id={selectId}
          className={cn(
            currentSize.select,
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            success && 'border-green-300 focus:border-green-500 focus:ring-green-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <SelectValue placeholder={loading ? 'Loading...' : placeholder} />
        </SelectTrigger>
        
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="flex flex-col items-start"
            >
              <span>{option.label}</span>
              {option.description && (
                <span className="text-xs text-gray-500 mt-1">
                  {option.description}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

SettingsSelect.displayName = 'SettingsSelect'