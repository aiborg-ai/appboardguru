'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { SettingsSkeleton } from './settings-skeleton'
import { SettingsErrorState } from './settings-error-state'
import { SettingsSuccessState } from './settings-success-state'
import type { SettingsCardProps } from './types'

export const SettingsCard = memo<SettingsCardProps>(({
  title,
  description,
  icon: Icon,
  variant = 'default',
  size = 'md',
  loading = false,
  error = false,
  success = false,
  className,
  children,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  // Show loading state
  if (loading) {
    return (
      <SettingsSkeleton 
        variant="card" 
        className={className}
        showAvatar={!!Icon}
        showActions={true}
      />
    )
  }

  // Show error state
  if (error) {
    return (
      <SettingsErrorState
        message="Failed to load settings"
        recoverable={true}
        className={className}
      />
    )
  }

  const cardVariants = {
    default: 'border-gray-200 bg-white',
    elevated: 'border-gray-200 bg-white shadow-md',
    bordered: 'border-2 border-gray-300 bg-white'
  }

  const sizeVariants = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <Card
      id={id}
      className={cn(
        'transition-all duration-200 hover:shadow-sm',
        cardVariants[variant],
        sizeVariants[size],
        success && 'border-green-200 bg-green-50',
        className
      )}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {(title || Icon) && (
        <div className="mb-4 flex items-start space-x-3">
          {Icon && (
            <div className={cn(
              'rounded-lg p-2 transition-colors',
              success ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            )}>
              <Icon className={cn(
                size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
              )} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={cn(
                'font-semibold text-gray-900',
                size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg'
              )}>
                {title}
              </h3>
            )}
            {description && (
              <p className={cn(
                'text-gray-600 mt-1',
                size === 'sm' ? 'text-xs' : 'text-sm'
              )}>
                {description}
              </p>
            )}
          </div>
        </div>
      )}

      {success && (
        <SettingsSuccessState
          message="Settings updated successfully"
          autoHide={true}
          duration={3000}
          className="mb-4"
        />
      )}

      <div className="space-y-4">
        {children}
      </div>
    </Card>
  )
})

SettingsCard.displayName = 'SettingsCard'