/**
 * PageHeader Component
 * DESIGN_SPEC compliant page header with consistent styling
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { StatusBadge, StatusType } from './StatusBadge'
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

export interface PageAction {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

export interface PageHeaderProps {
  // Basic props
  title: string
  subtitle?: string
  description?: string
  
  // Navigation
  breadcrumbs?: BreadcrumbItem[]
  backButton?: {
    label?: string
    onClick: () => void
  }
  
  // Actions
  primaryAction?: PageAction
  secondaryActions?: PageAction[]
  moreActions?: PageAction[]
  
  // Status
  status?: StatusType
  statusLabel?: string
  
  // Metadata
  metadata?: Array<{
    label: string
    value: string | React.ReactNode
    icon?: LucideIcon
  }>
  
  // Styling
  variant?: 'default' | 'compact' | 'hero' | 'minimal'
  className?: string
  contentClassName?: string
  bordered?: boolean
  sticky?: boolean
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  description,
  breadcrumbs,
  backButton,
  primaryAction,
  secondaryActions,
  moreActions,
  status,
  statusLabel,
  metadata,
  variant = 'default',
  className,
  contentClassName,
  bordered = true,
  sticky = false,
}) => {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false)

  const variantStyles = {
    default: {
      wrapper: "bg-white",
      padding: "px-6 py-4",
      titleSize: "text-2xl",
      spacing: "space-y-4",
    },
    compact: {
      wrapper: "bg-white",
      padding: "px-6 py-3",
      titleSize: "text-xl",
      spacing: "space-y-2",
    },
    hero: {
      wrapper: "bg-gradient-to-r from-primary-50 to-secondary-50",
      padding: "px-8 py-8",
      titleSize: "text-3xl",
      spacing: "space-y-6",
    },
    minimal: {
      wrapper: "bg-transparent",
      padding: "px-0 py-2",
      titleSize: "text-xl",
      spacing: "space-y-2",
    },
  }

  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        styles.wrapper,
        bordered && "border-b",
        sticky && "sticky top-0 z-40",
        "transition-all duration-200",
        className
      )}
    >
      <div className={cn(styles.padding, contentClassName)}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {item.href || item.onClick ? (
                      <BreadcrumbLink
                        href={item.href}
                        onClick={item.onClick}
                        className="cursor-pointer hover:text-primary-600"
                      >
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <span className="text-gray-900 font-medium">{item.label}</span>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        <div className={cn(styles.spacing)}>
          {/* Main Header Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Back Button + Title Row */}
              <div className="flex items-center gap-3 mb-2">
                {backButton && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={backButton.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                
                <div className="flex items-center gap-3">
                  <h1 className={cn(
                    "font-semibold text-gray-900",
                    styles.titleSize
                  )}>
                    {title}
                  </h1>
                  
                  {status && (
                    <StatusBadge
                      status={status}
                      customLabel={statusLabel}
                      size={variant === 'hero' ? 'md' : 'sm'}
                    />
                  )}
                </div>
              </div>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-lg text-gray-700 font-medium mb-1">
                  {subtitle}
                </p>
              )}

              {/* Description */}
              {description && (
                <p className="text-gray-600 max-w-3xl">
                  {description}
                </p>
              )}

              {/* Metadata */}
              {metadata && metadata.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {metadata.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {item.icon && (
                        <item.icon className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-gray-500">{item.label}:</span>
                      <span className="text-gray-900 font-medium">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {secondaryActions?.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  size={action.size || 'md'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="gap-2"
                >
                  {action.icon && <action.icon className="h-4 w-4" />}
                  {action.label}
                </Button>
              ))}

              {moreActions && moreActions.length > 0 && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="h-9 w-9 p-0"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showMoreMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                      {moreActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            action.onClick()
                            setShowMoreMenu(false)
                          }}
                          disabled={action.disabled}
                          className={cn(
                            "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2",
                            action.disabled && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {action.icon && <action.icon className="h-4 w-4" />}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {primaryAction && (
                <Button
                  variant={primaryAction.variant || 'default'}
                  size={primaryAction.size || 'md'}
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className="gap-2"
                >
                  {primaryAction.icon && <primaryAction.icon className="h-4 w-4" />}
                  {primaryAction.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simplified version for smaller sections
export interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: PageAction
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <Button
          variant={action.variant || 'outline'}
          size={action.size || 'sm'}
          onClick={action.onClick}
          disabled={action.disabled}
          className="gap-2"
        >
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  )
}

export { PageHeader }