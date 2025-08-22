'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { VoteIndicatorProps } from '../types'

/**
 * VoteIndicator - Atomic component for displaying vote counts and percentages
 * 
 * Features:
 * - Visual vote count display with type-based styling
 * - Percentage or count display modes
 * - Size variants and animations
 * - Accessibility compliant
 */
export const VoteIndicator: React.FC<VoteIndicatorProps> = ({
  count,
  total,
  voteType,
  size = 'md',
  showPercentage = false,
  animated = true,
  className,
  'data-testid': testId,
  ...props
}) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0
  
  // Size configurations
  const sizeConfig = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
    xl: 'text-xl px-5 py-2.5'
  }
  
  // Vote type styling
  const voteTypeConfig = {
    for: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      icon: '✓'
    },
    against: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      border: 'border-red-200',
      icon: '✗'
    },
    abstain: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      icon: '○'
    }
  }
  
  const config = voteTypeConfig[voteType]
  
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'font-semibold rounded-md border',
        'transition-all duration-200',
        config.bg,
        config.text,
        config.border,
        sizeConfig[size],
        animated && 'hover:scale-105 transform',
        className
      )}
      role="status"
      aria-label={`${count} ${voteType} votes out of ${total} total${showPercentage ? `, ${percentage}%` : ''}`}
      data-testid={testId || `vote-indicator-${voteType}`}
      {...props}
    >
      <span className="mr-1" aria-hidden="true">
        {config.icon}
      </span>
      <span className="font-mono">
        {showPercentage ? `${percentage}%` : count}
      </span>
      {!showPercentage && size !== 'xs' && (
        <span className="ml-1 text-xs opacity-70">
          /{total}
        </span>
      )}
    </div>
  )
}

VoteIndicator.displayName = 'VoteIndicator'