/**
 * RoleBadge Component
 * DESIGN_SPEC compliant badge for displaying user roles and permissions
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Shield, Crown, User, Users, Briefcase, UserCheck, Star, Award } from 'lucide-react'

// Role definitions with colors and icons
const roleConfig = {
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'error' as const,
  },
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'warning' as const,
  },
  director: {
    label: 'Director',
    icon: Briefcase,
    color: 'primary' as const,
  },
  executive: {
    label: 'Executive',
    icon: Star,
    color: 'purple' as const,
  },
  manager: {
    label: 'Manager',
    icon: UserCheck,
    color: 'info' as const,
  },
  member: {
    label: 'Member',
    icon: User,
    color: 'success' as const,
  },
  viewer: {
    label: 'Viewer',
    icon: Users,
    color: 'default' as const,
  },
  guest: {
    label: 'Guest',
    icon: Users,
    color: 'default' as const,
  },
  superadmin: {
    label: 'Super Admin',
    icon: Award,
    color: 'gradient' as const,
  },
}

const roleBadgeVariants = cva(
  "inline-flex items-center gap-1.5 font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        filled: "",
        outline: "bg-transparent border",
        soft: "",
        ghost: "bg-transparent",
        gradient: "bg-gradient-to-r text-white border-0",
      },
      color: {
        default: "",
        primary: "",
        secondary: "",
        success: "",
        warning: "",
        error: "",
        info: "",
        purple: "",
        gradient: "",
      },
      size: {
        xs: "text-xs px-1.5 py-0.5 rounded",
        sm: "text-xs px-2 py-1 rounded-md",
        md: "text-sm px-2.5 py-1 rounded-md",
        lg: "text-base px-3 py-1.5 rounded-lg",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md active:scale-95",
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
      {
        variant: "filled",
        color: "purple",
        className: "bg-purple-500 text-white",
      },
      {
        variant: "filled",
        color: "gradient",
        className: "from-primary-500 to-secondary-500",
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
      {
        variant: "outline",
        color: "purple",
        className: "border-purple-500 text-purple-600",
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
      {
        variant: "soft",
        color: "purple",
        className: "bg-purple-100 text-purple-700",
      },
      // Ghost variants
      {
        variant: "ghost",
        color: "default",
        className: "text-gray-600 hover:bg-gray-100",
      },
      {
        variant: "ghost",
        color: "primary",
        className: "text-primary-600 hover:bg-primary-100",
      },
      {
        variant: "ghost",
        color: "success",
        className: "text-success-600 hover:bg-success-100",
      },
      {
        variant: "ghost",
        color: "warning",
        className: "text-warning-600 hover:bg-warning-100",
      },
      {
        variant: "ghost",
        color: "error",
        className: "text-error-600 hover:bg-error-100",
      },
      {
        variant: "ghost",
        color: "info",
        className: "text-info-600 hover:bg-info-100",
      },
      {
        variant: "ghost",
        color: "purple",
        className: "text-purple-600 hover:bg-purple-100",
      },
    ],
    defaultVariants: {
      variant: "soft",
      size: "sm",
      interactive: false,
    },
  }
)

export type RoleType = keyof typeof roleConfig

export interface RoleBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof roleBadgeVariants> {
  role?: RoleType
  customLabel?: string
  showIcon?: boolean
  iconOnly?: boolean
  count?: number
}

const RoleBadge = React.forwardRef<HTMLSpanElement, RoleBadgeProps>(
  ({ 
    className, 
    variant, 
    color,
    size, 
    interactive,
    role,
    customLabel,
    showIcon = true,
    iconOnly = false,
    count,
    onClick,
    ...props 
  }, ref) => {
    const config = role ? roleConfig[role] : null
    const Icon = config?.icon
    const displayLabel = customLabel || config?.label || 'Unknown'
    const displayColor = color || config?.color || 'default'

    const iconSizeMap = {
      xs: "w-3 h-3",
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-5 h-5",
    }

    return (
      <span
        ref={ref}
        className={cn(
          roleBadgeVariants({ variant, color: displayColor, size, interactive }),
          className
        )}
        onClick={onClick}
        {...props}
      >
        {showIcon && Icon && (
          <Icon className={iconSizeMap[size || 'sm']} />
        )}
        {!iconOnly && (
          <span>{displayLabel}</span>
        )}
        {count !== undefined && (
          <span className="ml-1 px-1 min-w-[20px] text-center rounded-full bg-white/20">
            {count}
          </span>
        )}
      </span>
    )
  }
)

RoleBadge.displayName = "RoleBadge"

// Helper component for displaying multiple roles
export interface RoleBadgeGroupProps {
  roles: (RoleType | { role: RoleType; count?: number })[]
  variant?: VariantProps<typeof roleBadgeVariants>['variant']
  size?: VariantProps<typeof roleBadgeVariants>['size']
  className?: string
  gap?: 'xs' | 'sm' | 'md' | 'lg'
}

export const RoleBadgeGroup: React.FC<RoleBadgeGroupProps> = ({
  roles,
  variant,
  size,
  className,
  gap = 'sm',
}) => {
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  }

  return (
    <div className={cn('inline-flex items-center flex-wrap', gapClasses[gap], className)}>
      {roles.map((roleItem, index) => {
        const isObject = typeof roleItem === 'object'
        const role = isObject ? roleItem.role : roleItem
        const count = isObject ? roleItem.count : undefined
        
        return (
          <RoleBadge
            key={`${role}-${index}`}
            role={role}
            variant={variant}
            size={size}
            count={count}
          />
        )
      })}
    </div>
  )
}

export { RoleBadge, roleBadgeVariants }