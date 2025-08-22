'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ProgressBarProps } from '../types'

/**
 * ProgressBar - Atomic component for displaying progress with status-based styling
 * 
 * Features:
 * - Animated progress visualization
 * - Status-based color coding
 * - Size variants and label options
 * - Accessibility compliant with proper ARIA attributes
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  status,
  showLabel = false,
  animated = true,
  label,
  className,
  'data-testid': testId,
  ...props
}) => {
  // Normalize value to 0-100 range
  const normalizedValue = Math.min(Math.max(value, 0), max)
  const percentage = (normalizedValue / max) * 100
  
  // Size configurations
  const sizeConfig = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
    xl: 'h-6'
  }
  
  // Status-based color schemes
  const getProgressColor = () => {
    if (status) {
      switch (status) {
        case 'completed':
          return 'bg-green-500'
        case 'in_progress':
          return percentage >= 75 ? 'bg-green-500' : 
                 percentage >= 50 ? 'bg-yellow-500' : 
                 percentage >= 25 ? 'bg-orange-500' : 'bg-blue-500'
        case 'blocked':
        case 'overdue':
          return 'bg-red-500'
        case 'under_review':
          return 'bg-purple-500'
        case 'assigned':
          return 'bg-blue-500'
        case 'cancelled':
          return 'bg-gray-400'
        default:
          return 'bg-blue-500'
      }
    }
    
    // Default color based on percentage
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 75) return 'bg-green-400'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-blue-500'
  }
  
  const progressColor = getProgressColor()
  const displayLabel = label || (showLabel ? `${Math.round(percentage)}%` : '')
  
  return (
    <div
      className={cn('w-full', className)}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={displayLabel || `Progress: ${Math.round(percentage)}%`}
      data-testid={testId || 'progress-bar'}
      {...props}
    >
      {displayLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {displayLabel}
          </span>
          {showLabel && (
            <span className="text-sm text-gray-500">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      
      <div
        className={cn(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          sizeConfig[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            progressColor,
            animated && 'transform origin-left'
          )}
          style={{ 
            width: `${percentage}%`,
            ...(animated && {
              transform: 'scaleX(1)',
              transition: 'width 0.5s ease-out, background-color 0.3s ease-out'
            })
          }}
          aria-hidden="true"
        />
      </div>
      
      {/* Screen reader only text for detailed progress */}
      <span className="sr-only">
        Progress: {normalizedValue} out of {max} ({Math.round(percentage)}% complete)
        {status && ` - Status: ${status}`}
      </span>
    </div>
  )
}

ProgressBar.displayName = 'ProgressBar'