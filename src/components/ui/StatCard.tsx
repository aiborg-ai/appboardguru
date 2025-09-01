/**
 * StatCard Component
 * DESIGN_SPEC compliant statistics card for displaying metrics
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Info } from 'lucide-react'
import { IconBox } from './IconBox'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const statCardVariants = cva(
  "relative overflow-hidden transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-white",
        gradient: "bg-gradient-to-br",
        bordered: "bg-white border-l-4",
        elevated: "bg-white shadow-lg hover:shadow-xl",
        interactive: "bg-white hover:scale-[1.02] cursor-pointer",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface TrendData {
  value: number
  type: 'increase' | 'decrease' | 'neutral'
  label?: string
}

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  // Basic props
  title: string
  value: string | number
  subtitle?: string
  description?: string
  
  // Icon
  icon?: LucideIcon | React.ReactNode
  iconColor?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  
  // Trend
  trend?: TrendData
  showTrendIcon?: boolean
  
  // Additional info
  tooltip?: string
  footer?: React.ReactNode
  
  // Styling
  gradientFrom?: string
  gradientTo?: string
  borderColor?: string
  
  // Interaction
  onClick?: () => void
  href?: string
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ 
    className,
    variant,
    size,
    title,
    value,
    subtitle,
    description,
    icon,
    iconColor = 'primary',
    trend,
    showTrendIcon = true,
    tooltip,
    footer,
    gradientFrom = 'from-primary-50',
    gradientTo = 'to-secondary-50',
    borderColor = 'border-primary-500',
    onClick,
    href,
    ...props 
  }, ref) => {
    const isInteractive = onClick || href || variant === 'interactive'
    
    const trendConfig = {
      increase: {
        icon: showTrendIcon ? TrendingUp : ArrowUp,
        color: 'text-success-600',
        bgColor: 'bg-success-100',
      },
      decrease: {
        icon: showTrendIcon ? TrendingDown : ArrowDown,
        color: 'text-error-600',
        bgColor: 'bg-error-100',
      },
      neutral: {
        icon: Minus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      },
    }

    const cardContent = (
      <>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-medium text-gray-600">
                {title}
              </h3>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-sm">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                {value}
              </p>
              {subtitle && (
                <span className="text-sm text-gray-500">{subtitle}</span>
              )}
            </div>

            {description && (
              <p className="text-sm text-gray-600 mt-2">
                {description}
              </p>
            )}

            {trend && (
              <div className="flex items-center gap-2 mt-3">
                <div className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  trendConfig[trend.type].bgColor,
                  trendConfig[trend.type].color
                )}>
                  {React.createElement(trendConfig[trend.type].icon, {
                    className: "h-3 w-3"
                  })}
                  <span>{trend.value}%</span>
                </div>
                {trend.label && (
                  <span className="text-xs text-gray-500">{trend.label}</span>
                )}
              </div>
            )}
          </div>

          {icon && (
            <div className="flex-shrink-0">
              {React.isValidElement(icon) ? (
                icon
              ) : (
                <IconBox
                  icon={icon as LucideIcon}
                  variant={iconColor}
                  size="md"
                />
              )}
            </div>
          )}
        </div>

        {footer && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {footer}
          </div>
        )}

        {/* Decorative gradient overlay for gradient variant */}
        {variant === 'gradient' && (
          <div className={cn(
            "absolute inset-0 opacity-5 pointer-events-none",
            "bg-gradient-to-br",
            gradientFrom,
            gradientTo
          )} />
        )}
      </>
    )

    const cardClasses = cn(
      statCardVariants({ variant, size }),
      variant === 'bordered' && borderColor,
      variant === 'gradient' && `${gradientFrom} ${gradientTo}`,
      isInteractive && "cursor-pointer",
      className
    )

    if (href) {
      return (
        <a href={href} className="block">
          <Card ref={ref} className={cardClasses} {...props}>
            {cardContent}
          </Card>
        </a>
      )
    }

    return (
      <Card 
        ref={ref} 
        className={cardClasses}
        onClick={onClick}
        {...props}
      >
        {cardContent}
      </Card>
    )
  }
)

StatCard.displayName = "StatCard"

// Grid component for multiple stat cards
export interface StatCardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export const StatCardGrid: React.FC<StatCardGridProps> = ({
  children,
  columns = 4,
  gap = 'md',
  className,
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  }

  const gapClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }

  return (
    <div className={cn(
      'grid',
      columnClasses[columns],
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  )
}

// Mini stat for compact displays
export interface MiniStatProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: TrendData
  className?: string
}

export const MiniStat: React.FC<MiniStatProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  className,
}) => {
  const trendColors = {
    increase: 'text-success-600',
    decrease: 'text-error-600',
    neutral: 'text-gray-600',
  }

  const TrendIcon = trend?.type === 'increase' ? ArrowUp : 
                    trend?.type === 'decrease' ? ArrowDown : 
                    Minus

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {Icon && (
        <div className="flex-shrink-0">
          <Icon className="h-4 w-4 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{value}</p>
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trendColors[trend.type]
            )}>
              <TrendIcon className="h-3 w-3" />
              {trend.value}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export { StatCard, statCardVariants }