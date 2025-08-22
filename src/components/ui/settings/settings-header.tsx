'use client'

import React, { memo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import type { SettingsHeaderProps } from './types'

export const SettingsHeader = memo<SettingsHeaderProps>(({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-gray-600" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center space-x-2">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-gray-400" aria-hidden="true" />
                )}
                {crumb.href || crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {Icon && (
            <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex-shrink-0">
              <Icon className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 mt-1">
                {subtitle}
              </p>
            )}
            {children && (
              <div className="mt-3">
                {children}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex-shrink-0 ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
})

SettingsHeader.displayName = 'SettingsHeader'