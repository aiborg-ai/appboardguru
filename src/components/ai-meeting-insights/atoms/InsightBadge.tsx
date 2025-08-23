/**
 * InsightBadge Atom Component
 * 
 * Displays AI-generated insights with confidence indicators and impact levels
 * Optimized with React.memo for performance
 */

import React from 'react'
import { AlertTriangle, CheckCircle, Info, Lightbulb, TrendingUp } from 'lucide-react'
import { cn } from '../../../lib/utils'

// ==== Component Types ====

export interface InsightBadgeProps {
  readonly type: 'effectiveness' | 'engagement' | 'productivity' | 'sentiment' | 'recommendation' | 'warning'
  readonly title: string
  readonly description?: string
  readonly confidence?: number
  readonly impact?: 'high' | 'medium' | 'low'
  readonly actionable?: boolean
  readonly size?: 'sm' | 'md' | 'lg'
  readonly variant?: 'default' | 'outline' | 'subtle'
  readonly className?: string
  readonly onClick?: () => void
}

// ==== Component Implementation ====

const InsightBadge: React.FC<InsightBadgeProps> = React.memo(({
  type,
  title,
  description,
  confidence,
  impact = 'medium',
  actionable = false,
  size = 'md',
  variant = 'default',
  className,
  onClick
}) => {
  // Type-based styling
  const typeConfig = {
    effectiveness: {
      icon: TrendingUp,
      color: 'blue',
      label: 'Effectiveness'
    },
    engagement: {
      icon: CheckCircle,
      color: 'green',
      label: 'Engagement'
    },
    productivity: {
      icon: TrendingUp,
      color: 'purple',
      label: 'Productivity'
    },
    sentiment: {
      icon: Info,
      color: 'yellow',
      label: 'Sentiment'
    },
    recommendation: {
      icon: Lightbulb,
      color: 'indigo',
      label: 'Recommendation'
    },
    warning: {
      icon: AlertTriangle,
      color: 'red',
      label: 'Warning'
    }
  }

  // Color variants
  const colorVariants = {
    blue: {
      default: 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800',
      outline: 'border-2 border-blue-500 text-blue-700 bg-transparent dark:text-blue-300',
      subtle: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/10 dark:text-blue-200 dark:border-blue-900'
    },
    green: {
      default: 'bg-green-100 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800',
      outline: 'border-2 border-green-500 text-green-700 bg-transparent dark:text-green-300',
      subtle: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/10 dark:text-green-200 dark:border-green-900'
    },
    purple: {
      default: 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/20 dark:text-purple-100 dark:border-purple-800',
      outline: 'border-2 border-purple-500 text-purple-700 bg-transparent dark:text-purple-300',
      subtle: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/10 dark:text-purple-200 dark:border-purple-900'
    },
    yellow: {
      default: 'bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-100 dark:border-yellow-800',
      outline: 'border-2 border-yellow-500 text-yellow-700 bg-transparent dark:text-yellow-300',
      subtle: 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/10 dark:text-yellow-200 dark:border-yellow-900'
    },
    indigo: {
      default: 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-100 dark:border-indigo-800',
      outline: 'border-2 border-indigo-500 text-indigo-700 bg-transparent dark:text-indigo-300',
      subtle: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/10 dark:text-indigo-200 dark:border-indigo-900'
    },
    red: {
      default: 'bg-red-100 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800',
      outline: 'border-2 border-red-500 text-red-700 bg-transparent dark:text-red-300',
      subtle: 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/10 dark:text-red-200 dark:border-red-900'
    }
  }

  // Size variants
  const sizeVariants = {
    sm: {
      container: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
      badge: 'text-xs px-1.5 py-0.5'
    },
    md: {
      container: 'px-3 py-2 text-sm',
      icon: 'h-4 w-4',
      badge: 'text-xs px-2 py-1'
    },
    lg: {
      container: 'px-4 py-3 text-base',
      icon: 'h-5 w-5',
      badge: 'text-sm px-2.5 py-1'
    }
  }

  // Impact styling
  const impactConfig = {
    high: { 
      color: 'red', 
      label: 'High Impact',
      intensity: 'font-bold'
    },
    medium: { 
      color: 'yellow', 
      label: 'Medium Impact',
      intensity: 'font-semibold'
    },
    low: { 
      color: 'green', 
      label: 'Low Impact',
      intensity: 'font-medium'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon
  const colorClasses = colorVariants[config.color as keyof typeof colorVariants]
  const sizeClasses = sizeVariants[size]
  const impactStyle = impactConfig[impact]

  // Confidence indicator component
  const ConfidenceIndicator: React.FC = React.memo(() => {
    if (typeof confidence !== 'number') return null

    const confidenceLevel = confidence >= 0.8 ? 'high' : 
                            confidence >= 0.6 ? 'medium' : 'low'
    
    const confidenceColor = confidenceLevel === 'high' ? 'bg-green-500' :
                           confidenceLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'

    return (
      <div className="flex items-center space-x-1">
        <div className="flex items-center space-x-0.5">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={cn(
                'w-1 h-3 rounded-sm',
                bar <= Math.ceil(confidence * 5) 
                  ? confidenceColor 
                  : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </div>
        <span className="text-xs opacity-70">
          {Math.round(confidence * 100)}%
        </span>
      </div>
    )
  })

  ConfidenceIndicator.displayName = 'ConfidenceIndicator'

  return (
    <div
      className={cn(
        'inline-flex items-start space-x-2 rounded-lg border transition-all duration-200',
        colorClasses[variant],
        sizeClasses.container,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        actionable && 'ring-2 ring-offset-2 ring-blue-500 ring-offset-transparent',
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
      {/* Icon */}
      <Icon className={cn(sizeClasses.icon, 'flex-shrink-0 mt-0.5')} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header with title and badges */}
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'font-medium leading-tight',
              impactStyle.intensity
            )}>
              {title}
            </h4>
          </div>
          
          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
            {/* Type badge */}
            <span className={cn(
              'inline-flex items-center rounded-full font-medium',
              sizeClasses.badge,
              colorClasses.outline
            )}>
              {config.label}
            </span>
            
            {/* Impact badge */}
            <span className={cn(
              'inline-flex items-center rounded-full font-medium',
              sizeClasses.badge,
              colorVariants[impactStyle.color as keyof typeof colorVariants].default
            )}>
              {impactStyle.label}
            </span>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm opacity-90 leading-relaxed mb-2">
            {description}
          </p>
        )}

        {/* Footer with confidence and actionable indicator */}
        <div className="flex items-center justify-between">
          <ConfidenceIndicator />
          
          {actionable && (
            <span className="text-xs font-medium opacity-70">
              Action Required
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

InsightBadge.displayName = 'InsightBadge'

export { InsightBadge }