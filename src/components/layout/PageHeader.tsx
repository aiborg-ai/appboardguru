/**
 * PageHeader Component
 * DESIGN_SPEC compliant page header with icon, title, description, and actions
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { InfoTooltip } from '@/components/atoms/feedback/info-tooltip'

export interface PageHeaderProps {
  icon?: LucideIcon
  iconColor?: string
  title: string
  description?: string
  tooltip?: React.ReactNode
  actions?: React.ReactNode
  breadcrumbs?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  iconColor = 'text-gray-600',
  title,
  description,
  tooltip,
  actions,
  breadcrumbs,
  className,
  children
}) => {
  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <div className="mb-4">
          {breadcrumbs}
        </div>
      )}
      
      {/* Main Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          {Icon && (
            <div className="flex-shrink-0 mt-1">
              <Icon className={cn("h-8 w-8", iconColor)} />
            </div>
          )}
          
          {/* Title and Description */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {tooltip && (
                <InfoTooltip content={tooltip} />
              )}
            </div>
            {description && (
              <p className="mt-1 text-gray-600">
                {description}
              </p>
            )}
            {children && (
              <div className="mt-2">
                {children}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Subcomponent for breadcrumbs
export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = '/',
  className
}) => {
  return (
    <nav className={cn("flex items-center text-sm text-gray-500", className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="mx-2 text-gray-400">{separator}</span>
          )}
          {item.href ? (
            <a
              href={item.href}
              className="hover:text-primary-600 transition-colors"
              onClick={item.onClick}
            >
              {item.label}
            </a>
          ) : item.onClick ? (
            <button
              onClick={item.onClick}
              className="hover:text-primary-600 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className={index === items.length - 1 ? "text-gray-900 font-medium" : ""}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}