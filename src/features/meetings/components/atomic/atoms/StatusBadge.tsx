'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { StatusBadgeProps } from '../types'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Edit, 
  AlertTriangle,
  User,
  Play,
  Pause,
  Eye 
} from 'lucide-react'

/**
 * StatusBadge - Atomic component for displaying resolution/actionable status
 * 
 * Features:
 * - Consistent status styling across resolution and actionable types
 * - Optional icons and interactive behavior
 * - Size variants and accessibility support
 * - Hover states for interactive badges
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  label,
  interactive = false,
  onStatusClick,
  className,
  'data-testid': testId,
  ...props
}) => {
  // Size configurations
  const sizeConfig = {
    xs: 'text-xs px-1.5 py-0.5 h-5',
    sm: 'text-xs px-2 py-1 h-6',
    md: 'text-sm px-2.5 py-1 h-7',
    lg: 'text-sm px-3 py-1.5 h-8',
    xl: 'text-base px-4 py-2 h-9'
  }
  
  const iconSizeConfig = {
    xs: 'h-3 w-3',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-4 w-4'
  }
  
  // Status configurations for resolutions and actionables
  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    // Resolution statuses
    proposed: { label: 'Proposed', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    passed: { label: 'Passed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
    tabled: { label: 'Tabled', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
    withdrawn: { label: 'Withdrawn', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: FileText },
    amended: { label: 'Amended', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Edit },
    
    // Actionable statuses
    assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: User },
    in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Play },
    blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700 border-red-200', icon: Pause },
    under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Eye },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle }
  }
  
  const config = statusConfig[status]
  if (!config) {
    console.warn(`Unknown status: ${status}`)
    return null
  }
  
  const StatusIcon = config.icon
  const displayLabel = label || config.label
  
  const handleClick = () => {
    if (interactive && onStatusClick) {
      onStatusClick(status as any)
    }
  }
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && onStatusClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onStatusClick(status as any)
    }
  }
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'font-medium rounded-md border',
        'transition-all duration-200',
        config.color,
        sizeConfig[size],
        interactive && 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
        className
      )}
      role={interactive ? 'button' : 'status'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`Status: ${displayLabel}`}
      onClick={interactive ? handleClick : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      data-testid={testId || `status-badge-${status}`}
      {...props}
    >
      {showIcon && (
        <StatusIcon 
          className={cn(iconSizeConfig[size], 'flex-shrink-0')} 
          aria-hidden="true" 
        />
      )}
      <span className="truncate">
        {displayLabel}
      </span>
    </span>
  )
}

StatusBadge.displayName = 'StatusBadge'