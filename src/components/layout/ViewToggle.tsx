/**
 * ViewToggle Component
 * DESIGN_SPEC compliant view mode switcher for grid/list/detail views
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Grid3X3, List, LayoutGrid, Eye } from 'lucide-react'

export type ViewMode = 'grid' | 'list' | 'details'

export interface ViewToggleProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  availableViews?: ViewMode[]
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  availableViews = ['grid', 'list'],
  className,
  size = 'md'
}) => {
  const viewConfigs = {
    grid: {
      icon: Grid3X3,
      label: 'Grid View',
      ariaLabel: 'Switch to grid view'
    },
    list: {
      icon: List,
      label: 'List View',
      ariaLabel: 'Switch to list view'
    },
    details: {
      icon: Eye,
      label: 'Details View',
      ariaLabel: 'Switch to details view'
    }
  }

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  }

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className={cn(
      "inline-flex items-center bg-gray-100 rounded-lg p-1",
      className
    )}>
      {availableViews.map((view) => {
        const config = viewConfigs[view]
        const Icon = config.icon
        const isActive = currentView === view

        return (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className={cn(
              "inline-flex items-center justify-center rounded-md transition-all duration-200",
              sizeClasses[size],
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
            title={config.label}
            aria-label={config.ariaLabel}
            aria-pressed={isActive}
          >
            <Icon className={iconSizeClasses[size]} />
          </button>
        )
      })}
    </div>
  )
}

// Alternative style with labels
export interface ViewToggleWithLabelsProps extends ViewToggleProps {
  showLabels?: boolean
}

export const ViewToggleWithLabels: React.FC<ViewToggleWithLabelsProps> = ({
  currentView,
  onViewChange,
  availableViews = ['grid', 'list'],
  className,
  size = 'md',
  showLabels = true
}) => {
  const viewConfigs = {
    grid: {
      icon: LayoutGrid,
      label: 'Grid',
      ariaLabel: 'Switch to grid view'
    },
    list: {
      icon: List,
      label: 'List',
      ariaLabel: 'Switch to list view'
    },
    details: {
      icon: Eye,
      label: 'Details',
      ariaLabel: 'Switch to details view'
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1",
      className
    )}>
      {availableViews.map((view, index) => {
        const config = viewConfigs[view]
        const Icon = config.icon
        const isActive = currentView === view

        return (
          <React.Fragment key={view}>
            <button
              onClick={() => onViewChange(view)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md font-medium transition-all duration-200",
                sizeClasses[size],
                isActive
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              )}
              aria-label={config.ariaLabel}
              aria-pressed={isActive}
            >
              <Icon className={iconSizeClasses[size]} />
              {showLabels && <span>{config.label}</span>}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Dropdown style view toggle
export interface ViewDropdownProps {
  currentView: ViewMode
  onViewChange: (view: ViewMode) => void
  availableViews?: ViewMode[]
  className?: string
}

export const ViewDropdown: React.FC<ViewDropdownProps> = ({
  currentView,
  onViewChange,
  availableViews = ['grid', 'list', 'details'],
  className
}) => {
  const [isOpen, setIsOpen] = React.useState(false)

  const viewConfigs = {
    grid: {
      icon: Grid3X3,
      label: 'Grid View'
    },
    list: {
      icon: List,
      label: 'List View'
    },
    details: {
      icon: Eye,
      label: 'Details View'
    }
  }

  const currentConfig = viewConfigs[currentView]
  const CurrentIcon = currentConfig.icon

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <CurrentIcon className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">
          {currentConfig.label}
        </span>
        <svg
          className={cn(
            "h-4 w-4 text-gray-500 transition-transform",
            isOpen && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {availableViews.map((view) => {
                const config = viewConfigs[view]
                const Icon = config.icon
                const isActive = currentView === view

                return (
                  <button
                    key={view}
                    onClick={() => {
                      onViewChange(view)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-gray-50 text-primary-600"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{config.label}</span>
                    {isActive && (
                      <svg
                        className="ml-auto h-4 w-4 text-primary-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}