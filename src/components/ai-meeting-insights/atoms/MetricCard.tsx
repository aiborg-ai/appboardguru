/**
 * MetricCard Atom Component
 * 
 * Displays a single metric with value, trend indicator, and optional chart
 * Optimized with React.memo for performance
 */

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '../../../lib/utils'

// ==== Component Types ====

export interface MetricCardProps {
  readonly title: string
  readonly value: string | number
  readonly previousValue?: string | number
  readonly trend?: 'up' | 'down' | 'stable'
  readonly trendPercentage?: number
  readonly description?: string
  readonly icon?: React.ReactNode
  readonly color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray'
  readonly size?: 'sm' | 'md' | 'lg'
  readonly loading?: boolean
  readonly className?: string
  readonly onClick?: () => void
}

// ==== Component Implementation ====

const MetricCard: React.FC<MetricCardProps> = React.memo(({
  title,
  value,
  previousValue,
  trend,
  trendPercentage,
  description,
  icon,
  color = 'blue',
  size = 'md',
  loading = false,
  className,
  onClick
}) => {
  // Color variant classes
  const colorVariants = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      accent: 'text-blue-600 dark:text-blue-400'
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      accent: 'text-green-600 dark:text-green-400'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      accent: 'text-yellow-600 dark:text-yellow-400'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      accent: 'text-red-600 dark:text-red-400'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-900 dark:text-purple-100',
      accent: 'text-purple-600 dark:text-purple-400'
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      accent: 'text-gray-600 dark:text-gray-400'
    }
  }

  // Size variant classes
  const sizeVariants = {
    sm: {
      padding: 'p-3',
      title: 'text-xs font-medium',
      value: 'text-lg font-bold',
      description: 'text-xs',
      icon: 'h-4 w-4'
    },
    md: {
      padding: 'p-4',
      title: 'text-sm font-medium',
      value: 'text-2xl font-bold',
      description: 'text-sm',
      icon: 'h-5 w-5'
    },
    lg: {
      padding: 'p-6',
      title: 'text-base font-medium',
      value: 'text-3xl font-bold',
      description: 'text-base',
      icon: 'h-6 w-6'
    }
  }

  const colorClasses = colorVariants[color]
  const sizeClasses = sizeVariants[size]

  // Trend indicator component
  const TrendIndicator: React.FC = React.memo(() => {
    if (!trend || !trendPercentage) return null

    const trendColor = trend === 'up' ? 'text-green-600' : 
                       trend === 'down' ? 'text-red-600' : 
                       'text-gray-500'

    const TrendIcon = trend === 'up' ? TrendingUp :
                     trend === 'down' ? TrendingDown :
                     Minus

    return (
      <div className={cn('flex items-center space-x-1', trendColor)}>
        <TrendIcon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {Math.abs(trendPercentage).toFixed(1)}%
        </span>
      </div>
    )
  })

  TrendIndicator.displayName = 'TrendIndicator'

  // Loading skeleton
  if (loading) {
    return (
      <div className={cn(
        'rounded-lg border-2 border-dashed animate-pulse',
        colorClasses.border,
        colorClasses.bg,
        sizeClasses.padding,
        className
      )}>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded dark:bg-gray-600 w-1/2"></div>
          <div className="h-8 bg-gray-300 rounded dark:bg-gray-600 w-3/4"></div>
          {description && (
            <div className="h-3 bg-gray-300 rounded dark:bg-gray-600 w-full"></div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'rounded-lg border transition-all duration-200',
        colorClasses.bg,
        colorClasses.border,
        sizeClasses.padding,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      {/* Header with title and icon */}
      <div className="flex items-start justify-between mb-2">
        <h3 className={cn(
          colorClasses.text,
          sizeClasses.title,
          'truncate'
        )}>
          {title}
        </h3>
        {icon && (
          <div className={cn(
            colorClasses.accent,
            sizeClasses.icon,
            'flex-shrink-0 ml-2'
          )}>
            {icon}
          </div>
        )}
      </div>

      {/* Main value */}
      <div className="flex items-baseline space-x-2 mb-1">
        <span className={cn(
          colorClasses.text,
          sizeClasses.value,
          'tabular-nums'
        )}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        <TrendIndicator />
      </div>

      {/* Previous value comparison */}
      {previousValue && (
        <div className={cn(
          'text-xs',
          colorClasses.accent,
          'mb-1'
        )}>
          Previous: {typeof previousValue === 'number' ? previousValue.toLocaleString() : previousValue}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className={cn(
          colorClasses.accent,
          sizeClasses.description,
          'leading-relaxed'
        )}>
          {description}
        </p>
      )}
    </div>
  )
})

MetricCard.displayName = 'MetricCard'

export { MetricCard }