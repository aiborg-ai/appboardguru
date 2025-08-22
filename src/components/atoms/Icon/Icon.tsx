import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"

const iconVariants = cva(
  "flex-shrink-0",
  {
    variants: {
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4", 
        default: "h-5 w-5",
        lg: "h-6 w-6",
        xl: "h-8 w-8",
      },
      color: {
        default: "text-current",
        primary: "text-primary",
        secondary: "text-secondary",
        muted: "text-muted-foreground",
        destructive: "text-destructive",
        success: "text-green-600",
        warning: "text-yellow-600",
      },
    },
    defaultVariants: {
      size: "default",
      color: "default",
    },
  }
)

export type IconName = keyof typeof LucideIcons

export interface IconProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'name'>,
    VariantProps<typeof iconVariants> {
  name: IconName
  loading?: boolean
}

const Icon = React.memo(React.forwardRef<SVGSVGElement, IconProps>(
  ({ 
    name, 
    className, 
    size, 
    color,
    loading = false,
    ...props 
  }, ref) => {
    const IconComponent = LucideIcons[name] as React.ComponentType<React.SVGProps<SVGSVGElement>>

    if (!IconComponent) {
      console.warn(`Icon "${name}" not found in Lucide icons`)
      return null
    }

    if (loading) {
      return (
        <LucideIcons.Loader2 
          ref={ref}
          className={cn(iconVariants({ size, color }), "animate-spin", className)}
          {...props}
        />
      )
    }

    return (
      <IconComponent
        ref={ref}
        className={cn(iconVariants({ size, color }), className)}
        {...props}
      />
    )
  }
))
Icon.displayName = "Icon"

// Helper component for commonly used icon patterns
export interface StatusIconProps extends Omit<IconProps, 'name' | 'color'> {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading'
}

const StatusIcon = React.memo<StatusIconProps>(({ status, ...props }) => {
  const iconMap: Record<StatusIconProps['status'], { name: IconName; color: IconProps['color'] }> = {
    success: { name: 'CheckCircle2', color: 'success' },
    error: { name: 'XCircle', color: 'destructive' },
    warning: { name: 'AlertTriangle', color: 'warning' },
    info: { name: 'Info', color: 'primary' },
    loading: { name: 'Loader2', color: 'default' },
  }

  const config = iconMap[status]

  return (
    <Icon
      name={config.name}
      color={config.color}
      loading={status === 'loading'}
      {...props}
    />
  )
})
StatusIcon.displayName = "StatusIcon"

export { Icon, StatusIcon, iconVariants }