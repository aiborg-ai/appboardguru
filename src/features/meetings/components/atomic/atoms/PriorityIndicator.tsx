'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { PriorityIndicatorProps } from '../types'
import { ArrowUp, ArrowDown, Minus, AlertTriangle, Flag } from 'lucide-react'

/**
 * PriorityIndicator - Atomic component for displaying priority levels
 * 
 * Features:
 * - Multiple visual variants (badge, dot, bar, flag)
 * - Both text and numeric priority support
 * - Size variants and accessibility support
 * - Consistent color coding across priority levels
 */
export const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({
  priority,
  size = 'md',
  showLabel = true,
  variant = 'badge',
  className,
  'data-testid': testId,
  ...props
}) => {
  // Normalize priority to text format
  const getPriorityInfo = () => {
    let priorityKey: string
    let priorityLevel: number
    
    if (typeof priority === 'number') {
      priorityLevel = priority
      switch (priority) {
        case 1: priorityKey = 'critical'; break
        case 2: priorityKey = 'high'; break
        case 3: priorityKey = 'medium'; break
        case 4: 
        case 5: priorityKey = 'low'; break
        default: priorityKey = 'medium'; priorityLevel = 3; break
      }
    } else {
      priorityKey = priority
      switch (priority) {
        case 'critical': priorityLevel = 1; break
        case 'high': priorityLevel = 2; break
        case 'medium': priorityLevel = 3; break
        case 'low': priorityLevel = 4; break
        default: priorityLevel = 3; break
      }
    }
    
    return { priorityKey, priorityLevel }
  }
  
  const { priorityKey, priorityLevel } = getPriorityInfo()
  
  // Size configurations
  const sizeConfig = {
    xs: { text: 'text-xs', icon: 'h-3 w-3', padding: 'px-1.5 py-0.5', dot: 'h-2 w-2' },
    sm: { text: 'text-xs', icon: 'h-3 w-3', padding: 'px-2 py-1', dot: 'h-2.5 w-2.5' },
    md: { text: 'text-sm', icon: 'h-4 w-4', padding: 'px-2.5 py-1', dot: 'h-3 w-3' },
    lg: { text: 'text-sm', icon: 'h-4 w-4', padding: 'px-3 py-1.5', dot: 'h-4 w-4' },
    xl: { text: 'text-base', icon: 'h-5 w-5', padding: 'px-4 py-2', dot: 'h-5 w-5' }
  }
  
  // Priority configurations
  const priorityConfig = {
    critical: {
      label: 'Critical',
      color: 'text-red-700 bg-red-100 border-red-200',
      dotColor: 'bg-red-500',
      barColor: 'bg-red-500',
      icon: AlertTriangle
    },
    high: {
      label: 'High',
      color: 'text-orange-700 bg-orange-100 border-orange-200',
      dotColor: 'bg-orange-500',
      barColor: 'bg-orange-500',
      icon: ArrowUp
    },
    medium: {
      label: 'Medium',
      color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
      dotColor: 'bg-yellow-500',
      barColor: 'bg-yellow-500',
      icon: Minus
    },
    low: {
      label: 'Low',
      color: 'text-green-700 bg-green-100 border-green-200',
      dotColor: 'bg-green-500',
      barColor: 'bg-green-500',
      icon: ArrowDown
    }
  }
  
  const config = priorityConfig[priorityKey as keyof typeof priorityConfig]
  const PriorityIcon = config.icon
  const sizeConf = sizeConfig[size]
  
  // Render based on variant
  const renderVariant = () => {
    switch (variant) {
      case 'dot':
        return (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-full',
                config.dotColor,
                sizeConf.dot
              )}
              aria-hidden="true"
            />
            {showLabel && (
              <span className={cn('font-medium', sizeConf.text)}>
                {config.label}
              </span>
            )}
          </div>
        )
      
      case 'bar':
        return (
          <div className="flex items-center gap-2">
            <div className={cn('flex flex-col gap-0.5', sizeConf.text)}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-0.5 w-3 rounded-full',
                    i < (5 - priorityLevel) ? config.barColor : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              ))}
            </div>
            {showLabel && (
              <span className={cn('font-medium', sizeConf.text)}>
                {config.label}
              </span>
            )}
          </div>
        )
      
      case 'flag':
        return (
          <div className="flex items-center gap-1">
            <Flag
              className={cn(
                sizeConf.icon,
                config.dotColor.replace('bg-', 'text-')
              )}
              aria-hidden="true"
            />
            {showLabel && (
              <span className={cn('font-medium', sizeConf.text)}>
                {config.label}
              </span>
            )}
          </div>
        )
      
      case 'badge':
      default:
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1',
              'font-medium rounded-md border',
              'transition-all duration-200',
              config.color,
              sizeConf.padding,
              sizeConf.text
            )}
          >
            <PriorityIcon
              className={cn(sizeConf.icon, 'flex-shrink-0')}
              aria-hidden="true"
            />
            {showLabel && (
              <span className="truncate">
                {config.label}
              </span>
            )}
          </span>
        )
    }
  }
  
  return (
    <div
      className={cn('inline-flex items-center', className)}
      role="status"
      aria-label={`Priority: ${config.label} (level ${priorityLevel})`}
      data-testid={testId || `priority-indicator-${priorityKey}`}
      {...props}
    >
      {renderVariant()}
    </div>
  )
}

PriorityIndicator.displayName = 'PriorityIndicator'