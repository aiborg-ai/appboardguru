'use client'

import React, { memo, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SettingsSectionProps } from './types'

export const SettingsSection = memo<SettingsSectionProps>(({
  title,
  description,
  collapsible = false,
  defaultExpanded = true,
  onExpandChange,
  headerActions,
  className,
  children,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggleExpand = useCallback(() => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onExpandChange?.(newExpanded)
  }, [isExpanded, onExpandChange])

  const sectionId = id || `settings-section-${title.toLowerCase().replace(/\s+/g, '-')}`
  const contentId = `${sectionId}-content`
  const headerId = `${sectionId}-header`

  return (
    <div
      className={cn('space-y-4', className)}
      id={sectionId}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      {...props}
    >
      {/* Section Header */}
      <div
        id={headerId}
        className={cn(
          'flex items-center justify-between',
          collapsible && 'cursor-pointer select-none'
        )}
        onClick={collapsible ? handleToggleExpand : undefined}
        onKeyDown={collapsible ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggleExpand()
          }
        } : undefined}
        tabIndex={collapsible ? 0 : undefined}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={collapsible ? contentId : undefined}
      >
        <div className="flex items-center space-x-2">
          {collapsible && (
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" aria-hidden="true" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {headerActions && (
          <div className="flex-shrink-0 ml-4">
            {headerActions}
          </div>
        )}
      </div>

      {/* Section Content */}
      {(!collapsible || isExpanded) && (
        <div
          id={contentId}
          className={cn(
            'transition-all duration-200 ease-in-out',
            collapsible && 'animate-in slide-in-from-top-2 fade-in-0'
          )}
          aria-labelledby={headerId}
        >
          {children}
        </div>
      )}
    </div>
  )
})

SettingsSection.displayName = 'SettingsSection'