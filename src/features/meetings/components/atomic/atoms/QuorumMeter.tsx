'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { QuorumMeterProps } from '../types'
import { Users, CheckCircle, AlertTriangle } from 'lucide-react'

/**
 * QuorumMeter - Atomic component for visualizing voting quorum status
 * 
 * Features:
 * - Visual representation of current vs required participation
 * - Clear quorum achievement indication
 * - Detailed labels and progress visualization
 * - Accessibility compliant with proper ARIA attributes
 */
export const QuorumMeter: React.FC<QuorumMeterProps> = ({
  current,
  required,
  total,
  size = 'md',
  showDetails = true,
  animated = true,
  className,
  'data-testid': testId,
  ...props
}) => {
  // Calculate percentages and status
  const currentPercentage = total > 0 ? (current / total) * 100 : 0
  const requiredPercentage = total > 0 ? (required / total) * 100 : 0
  const hasQuorum = current >= required
  const participationRate = total > 0 ? Math.round((current / total) * 100) : 0
  
  // Size configurations
  const sizeConfig = {
    xs: {
      height: 'h-2',
      text: 'text-xs',
      icon: 'h-3 w-3',
      gap: 'gap-1'
    },
    sm: {
      height: 'h-3',
      text: 'text-xs',
      icon: 'h-4 w-4',
      gap: 'gap-2'
    },
    md: {
      height: 'h-4',
      text: 'text-sm',
      icon: 'h-4 w-4',
      gap: 'gap-2'
    },
    lg: {
      height: 'h-5',
      text: 'text-sm',
      icon: 'h-5 w-5',
      gap: 'gap-3'
    },
    xl: {
      height: 'h-6',
      text: 'text-base',
      icon: 'h-5 w-5',
      gap: 'gap-3'
    }
  }
  
  const config = sizeConfig[size]
  
  // Status styling
  const statusConfig = hasQuorum
    ? {
        color: 'text-green-700',
        bgColor: 'bg-green-500',
        icon: CheckCircle,
        status: 'Quorum achieved'
      }
    : {
        color: 'text-orange-700',
        bgColor: current > 0 ? 'bg-yellow-500' : 'bg-gray-300',
        icon: AlertTriangle,
        status: 'Quorum pending'
      }
  
  const StatusIcon = statusConfig.icon
  
  return (
    <div
      className={cn('w-full', className)}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Quorum meter: ${current} of ${required} required participants present (${current} of ${total} total)`}
      data-testid={testId || 'quorum-meter'}
      {...props}
    >
      {/* Header with status */}
      {showDetails && (
        <div className={cn('flex items-center justify-between mb-2', config.gap)}>
          <div className="flex items-center gap-1">
            <Users className={cn(config.icon, 'text-gray-600')} aria-hidden="true" />
            <span className={cn(config.text, 'font-medium text-gray-700')}>
              Quorum Status
            </span>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon 
              className={cn(config.icon, statusConfig.color)} 
              aria-hidden="true" 
            />
            <span className={cn(config.text, 'font-medium', statusConfig.color)}>
              {statusConfig.status}
            </span>
          </div>
        </div>
      )}
      
      {/* Progress bar container */}
      <div className="relative">
        {/* Background bar */}
        <div
          className={cn(
            'w-full bg-gray-200 rounded-full overflow-hidden',
            config.height
          )}
        >
          {/* Current participation bar */}
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              statusConfig.bgColor,
              animated && 'transform origin-left'
            )}
            style={{
              width: `${Math.min(currentPercentage, 100)}%`,
              ...(animated && {
                transition: 'width 0.8s ease-out, background-color 0.3s ease-out'
              })
            }}
            aria-hidden="true"
          />
        </div>
        
        {/* Required quorum marker */}
        {requiredPercentage > 0 && requiredPercentage < 100 && (
          <div
            className={cn(
              'absolute top-0 w-0.5 bg-red-500 rounded-full',
              config.height,
              'transform -translate-x-0.5'
            )}
            style={{ left: `${requiredPercentage}%` }}
            aria-hidden="true"
          />
        )}
        
        {/* Required quorum label */}
        {showDetails && requiredPercentage > 0 && requiredPercentage < 100 && (
          <div
            className="absolute -top-6 transform -translate-x-1/2"
            style={{ left: `${requiredPercentage}%` }}
          >
            <span className={cn(config.text, 'text-red-600 font-medium whitespace-nowrap')}>
              Required ({required})
            </span>
          </div>
        )}
      </div>
      
      {/* Details footer */}
      {showDetails && (
        <div className={cn('flex items-center justify-between mt-2', config.gap)}>
          <div className="flex items-center gap-4">
            <span className={cn(config.text, 'text-gray-600')}>
              <span className="font-semibold text-gray-900">{current}</span> present
            </span>
            <span className={cn(config.text, 'text-gray-600')}>
              <span className="font-semibold text-gray-900">{required}</span> required
            </span>
            <span className={cn(config.text, 'text-gray-600')}>
              <span className="font-semibold text-gray-900">{total}</span> total
            </span>
          </div>
          <span className={cn(config.text, 'font-medium', statusConfig.color)}>
            {participationRate}% participation
          </span>
        </div>
      )}
      
      {/* Screen reader only detailed status */}
      <span className="sr-only">
        Quorum status: {current} out of {required} required participants are present.
        Total participation: {current} out of {total} eligible participants ({participationRate}%).
        Quorum is {hasQuorum ? 'achieved' : 'not yet achieved'}.
      </span>
    </div>
  )
}

QuorumMeter.displayName = 'QuorumMeter'