/**
 * IconBox Component
 * DESIGN_SPEC compliant icon container with configurable colors and sizes
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

const iconBoxVariants = cva(
  "flex items-center justify-center transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-600",
        primary: "bg-primary-100 text-primary-600",
        secondary: "bg-secondary-100 text-secondary-600",
        success: "bg-success-100 text-success-600",
        warning: "bg-warning-100 text-warning-600",
        error: "bg-error-100 text-error-600",
        info: "bg-info-100 text-info-600",
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        yellow: "bg-yellow-100 text-yellow-600",
        red: "bg-red-100 text-red-600",
        purple: "bg-purple-100 text-purple-600",
        indigo: "bg-indigo-100 text-indigo-600",
        pink: "bg-pink-100 text-pink-600",
        orange: "bg-orange-100 text-orange-600",
        gradient: "bg-gradient-to-br from-primary-100 to-secondary-100 text-primary-600",
      },
      size: {
        xs: "w-6 h-6",
        sm: "w-8 h-8",
        md: "w-10 h-10",
        lg: "w-12 h-12",
        xl: "w-14 h-14",
        "2xl": "w-16 h-16",
      },
      shape: {
        square: "rounded-lg",
        circle: "rounded-full",
        rounded: "rounded-xl",
      },
      interactive: {
        true: "cursor-pointer hover:scale-105 active:scale-95",
        false: "",
      },
      glow: {
        true: "shadow-lg",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "square",
      interactive: false,
      glow: false,
    },
  }
)

const iconSizeMap = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-7 h-7",
  "2xl": "w-8 h-8",
}

export interface IconBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconBoxVariants> {
  icon?: LucideIcon | React.ReactNode
  iconClassName?: string
  label?: string
  labelPosition?: 'top' | 'bottom' | 'left' | 'right'
  badge?: string | number
  badgeVariant?: 'default' | 'success' | 'warning' | 'error'
}

const IconBox = React.forwardRef<HTMLDivElement, IconBoxProps>(
  ({ 
    className, 
    variant, 
    size, 
    shape, 
    interactive,
    glow,
    icon: Icon,
    iconClassName,
    label,
    labelPosition = 'bottom',
    badge,
    badgeVariant = 'default',
    onClick,
    ...props 
  }, ref) => {
    const containerClasses = cn(
      label && (labelPosition === 'left' || labelPosition === 'right') && "flex items-center gap-2",
      label && (labelPosition === 'top' || labelPosition === 'bottom') && "flex flex-col items-center gap-1",
    )

    const badgeColors = {
      default: "bg-gray-500",
      success: "bg-success-500",
      warning: "bg-warning-500",
      error: "bg-error-500",
    }

    const iconBox = (
      <div
        ref={ref}
        className={cn(
          iconBoxVariants({ variant, size, shape, interactive, glow }),
          "relative",
          className
        )}
        onClick={onClick}
        {...props}
      >
        {React.isValidElement(Icon) ? (
          Icon
        ) : Icon && typeof Icon === 'function' ? (
          <Icon className={cn(iconSizeMap[size || 'md'], iconClassName)} />
        ) : null}
        
        {badge !== undefined && (
          <div className={cn(
            "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 text-white text-xs font-medium",
            badgeColors[badgeVariant]
          )}>
            {badge}
          </div>
        )}
      </div>
    )

    if (!label) {
      return iconBox
    }

    const labelElement = (
      <span className={cn(
        "text-sm text-gray-600",
        interactive && "group-hover:text-gray-900 transition-colors"
      )}>
        {label}
      </span>
    )

    return (
      <div className={cn(containerClasses, interactive && "group")}>
        {labelPosition === 'top' && labelElement}
        {labelPosition === 'left' && labelElement}
        {iconBox}
        {labelPosition === 'right' && labelElement}
        {labelPosition === 'bottom' && labelElement}
      </div>
    )
  }
)

IconBox.displayName = "IconBox"

export { IconBox, iconBoxVariants }