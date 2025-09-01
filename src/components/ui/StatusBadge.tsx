/**
 * StatusBadge Component
 * DESIGN_SPEC compliant badge for displaying status indicators
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  PauseCircle, 
  PlayCircle,
  RefreshCw,
  Archive,
  Zap,
  Ban,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

// Status definitions with colors and icons
const statusConfig = {
  // Common statuses
  active: { label: 'Active', icon: CheckCircle, color: 'success' as const },
  inactive: { label: 'Inactive', icon: XCircle, color: 'error' as const },
  pending: { label: 'Pending', icon: Clock, color: 'warning' as const },
  completed: { label: 'Completed', icon: CheckCircle, color: 'success' as const },
  failed: { label: 'Failed', icon: XCircle, color: 'error' as const },
  cancelled: { label: 'Cancelled', icon: Ban, color: 'default' as const },
  paused: { label: 'Paused', icon: PauseCircle, color: 'warning' as const },
  running: { label: 'Running', icon: PlayCircle, color: 'info' as const },
  processing: { label: 'Processing', icon: Loader2, color: 'info' as const, animate: true },
  archived: { label: 'Archived', icon: Archive, color: 'default' as const },
  
  // Approval statuses
  approved: { label: 'Approved', icon: CheckCircle, color: 'success' as const },
  rejected: { label: 'Rejected', icon: XCircle, color: 'error' as const },
  review: { label: 'Under Review', icon: AlertCircle, color: 'warning' as const },
  draft: { label: 'Draft', icon: Clock, color: 'default' as const },
  
  // System statuses
  online: { label: 'Online', icon: Zap, color: 'success' as const },
  offline: { label: 'Offline', icon: XCircle, color: 'default' as const },
  maintenance: { label: 'Maintenance', icon: RefreshCw, color: 'warning' as const },
  error: { label: 'Error', icon: AlertCircle, color: 'error' as const },
  
  // Performance statuses
  high: { label: 'High', icon: ArrowUpCircle, color: 'success' as const },
  medium: { label: 'Medium', icon: Minus, color: 'warning' as const },
  low: { label: 'Low', icon: ArrowDownCircle, color: 'error' as const },
  increasing: { label: 'Increasing', icon: TrendingUp, color: 'success' as const },
  decreasing: { label: 'Decreasing', icon: TrendingDown, color: 'error' as const },
  stable: { label: 'Stable', icon: Minus, color: 'info' as const },
  
  // Task statuses
  todo: { label: 'To Do', icon: Clock, color: 'default' as const },
  inprogress: { label: 'In Progress', icon: RefreshCw, color: 'info' as const, animate: true },
  done: { label: 'Done', icon: CheckCircle, color: 'success' as const },
  blocked: { label: 'Blocked', icon: Ban, color: 'error' as const },
}

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        filled: "",
        outline: "bg-transparent border",
        soft: "",
        ghost: "bg-transparent",
        dot: "",
      },
      color: {
        default: "",
        primary: "",
        secondary: "",
        success: "",
        warning: "",
        error: "",
        info: "",
      },
      size: {
        xs: "text-xs",
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
      },
      rounded: {
        sm: "rounded",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      },
      pulse: {
        true: "",
        false: "",
      }
    },
    compoundVariants: [
      // Filled variants
      {
        variant: "filled",
        color: "default",
        className: "bg-gray-500 text-white",
      },
      {
        variant: "filled",
        color: "primary",
        className: "bg-primary-500 text-white",
      },
      {
        variant: "filled",
        color: "success",
        className: "bg-success-500 text-white",
      },
      {
        variant: "filled",
        color: "warning",
        className: "bg-warning-500 text-white",
      },
      {
        variant: "filled",
        color: "error",
        className: "bg-error-500 text-white",
      },
      {
        variant: "filled",
        color: "info",
        className: "bg-info-500 text-white",
      },
      // Outline variants
      {
        variant: "outline",
        color: "default",
        className: "border-gray-300 text-gray-700",
      },
      {
        variant: "outline",
        color: "primary",
        className: "border-primary-500 text-primary-600",
      },
      {
        variant: "outline",
        color: "success",
        className: "border-success-500 text-success-600",
      },
      {
        variant: "outline",
        color: "warning",
        className: "border-warning-500 text-warning-600",
      },
      {
        variant: "outline",
        color: "error",
        className: "border-error-500 text-error-600",
      },
      {
        variant: "outline",
        color: "info",
        className: "border-info-500 text-info-600",
      },
      // Soft variants
      {
        variant: "soft",
        color: "default",
        className: "bg-gray-100 text-gray-700",
      },
      {
        variant: "soft",
        color: "primary",
        className: "bg-primary-100 text-primary-700",
      },
      {
        variant: "soft",
        color: "success",
        className: "bg-success-100 text-success-700",
      },
      {
        variant: "soft",
        color: "warning",
        className: "bg-warning-100 text-warning-700",
      },
      {
        variant: "soft",
        color: "error",
        className: "bg-error-100 text-error-700",
      },
      {
        variant: "soft",
        color: "info",
        className: "bg-info-100 text-info-700",
      },
      // Ghost variants
      {
        variant: "ghost",
        color: "default",
        className: "text-gray-600",
      },
      {
        variant: "ghost",
        color: "primary",
        className: "text-primary-600",
      },
      {
        variant: "ghost",
        color: "success",
        className: "text-success-600",
      },
      {
        variant: "ghost",
        color: "warning",
        className: "text-warning-600",
      },
      {
        variant: "ghost",
        color: "error",
        className: "text-error-600",
      },
      {
        variant: "ghost",
        color: "info",
        className: "text-info-600",
      },
      // Dot variants (just a colored dot with text)
      {
        variant: "dot",
        color: "default",
        className: "text-gray-700",
      },
      {
        variant: "dot",
        color: "primary",
        className: "text-primary-700",
      },
      {
        variant: "dot",
        color: "success",
        className: "text-success-700",
      },
      {
        variant: "dot",
        color: "warning",
        className: "text-warning-700",
      },
      {
        variant: "dot",
        color: "error",
        className: "text-error-700",
      },
      {
        variant: "dot",
        color: "info",
        className: "text-info-700",
      },
      // Size specific padding
      {
        variant: ["filled", "outline", "soft"],
        size: "xs",
        className: "px-1.5 py-0.5",
      },
      {
        variant: ["filled", "outline", "soft"],
        size: "sm",
        className: "px-2 py-1",
      },
      {
        variant: ["filled", "outline", "soft"],
        size: "md",
        className: "px-2.5 py-1",
      },
      {
        variant: ["filled", "outline", "soft"],
        size: "lg",
        className: "px-3 py-1.5",
      },
      // Pulse animation
      {
        pulse: true,
        color: "success",
        className: "relative before:absolute before:inset-0 before:bg-success-400 before:rounded-full before:animate-ping before:opacity-75",
      },
      {
        pulse: true,
        color: "warning",
        className: "relative before:absolute before:inset-0 before:bg-warning-400 before:rounded-full before:animate-ping before:opacity-75",
      },
      {
        pulse: true,
        color: "error",
        className: "relative before:absolute before:inset-0 before:bg-error-400 before:rounded-full before:animate-ping before:opacity-75",
      },
      {
        pulse: true,
        color: "info",
        className: "relative before:absolute before:inset-0 before:bg-info-400 before:rounded-full before:animate-ping before:opacity-75",
      },
    ],
    defaultVariants: {
      variant: "soft",
      size: "sm",
      rounded: "md",
      pulse: false,
    },
  }
)

export type StatusType = keyof typeof statusConfig

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: StatusType
  customLabel?: string
  showIcon?: boolean
  iconOnly?: boolean
  showDot?: boolean
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ 
    className, 
    variant, 
    color,
    size, 
    rounded,
    pulse,
    status,
    customLabel,
    showIcon = true,
    iconOnly = false,
    showDot = false,
    ...props 
  }, ref) => {
    const config = status ? statusConfig[status] : null
    const Icon = config?.icon
    const displayLabel = customLabel || config?.label || 'Unknown'
    const displayColor = color || config?.color || 'default'
    const shouldAnimate = config?.animate

    const iconSizeMap = {
      xs: "w-3 h-3",
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    }

    const dotColorMap = {
      default: "bg-gray-400",
      primary: "bg-primary-500",
      success: "bg-success-500",
      warning: "bg-warning-500",
      error: "bg-error-500",
      info: "bg-info-500",
    }

    // Handle dot variant specially
    if (variant === 'dot' || showDot) {
      return (
        <span
          ref={ref}
          className={cn(
            "inline-flex items-center gap-2",
            statusBadgeVariants({ variant: 'dot', color: displayColor, size }),
            className
          )}
          {...props}
        >
          <span className={cn(
            "inline-block w-2 h-2 rounded-full",
            dotColorMap[displayColor],
            pulse && "animate-pulse"
          )} />
          {!iconOnly && <span>{displayLabel}</span>}
        </span>
      )
    }

    return (
      <span
        ref={ref}
        className={cn(
          statusBadgeVariants({ variant, color: displayColor, size, rounded, pulse }),
          className
        )}
        {...props}
      >
        {showIcon && Icon && (
          <Icon className={cn(
            iconSizeMap[size || 'sm'],
            shouldAnimate && "animate-spin"
          )} />
        )}
        {!iconOnly && (
          <span className="relative z-10">{displayLabel}</span>
        )}
      </span>
    )
  }
)

StatusBadge.displayName = "StatusBadge"

// Helper component for status with description
export interface StatusIndicatorProps {
  status: StatusType
  title?: string
  description?: string
  variant?: VariantProps<typeof statusBadgeVariants>['variant']
  size?: VariantProps<typeof statusBadgeVariants>['size']
  className?: string
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  title,
  description,
  variant = 'soft',
  size = 'sm',
  className,
}) => {
  const config = statusConfig[status]
  
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <StatusBadge
        status={status}
        variant={variant}
        size={size}
        iconOnly
      />
      <div className="flex-1">
        {title && (
          <p className="text-sm font-medium text-gray-900">{title}</p>
        )}
        {description && (
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

export { StatusBadge, statusBadgeVariants }