'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { AssignmentBadgeProps } from '../types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Calendar, 
  Mail, 
  Edit, 
  UserCheck,
  Clock
} from 'lucide-react'

/**
 * AssignmentBadge - Molecular component for displaying assignee information
 * 
 * Features:
 * - Compact assignee display with avatar
 * - Detailed information on hover/focus
 * - Assignment date tracking
 * - Editable assignments for managers
 * - Accessible tooltip and interaction
 */
export const AssignmentBadge: React.FC<AssignmentBadgeProps> = ({
  assignee,
  assignedAt,
  size = 'md',
  showDetails = true,
  onAssigneeClick,
  editable = false,
  onReassign,
  className,
  'data-testid': testId,
  ...props
}) => {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }
  
  // Size configurations
  const sizeConfig = {
    xs: {
      avatar: 'h-5 w-5',
      text: 'text-xs',
      padding: 'px-2 py-1',
      gap: 'gap-1'
    },
    sm: {
      avatar: 'h-6 w-6',
      text: 'text-xs',
      padding: 'px-2 py-1',
      gap: 'gap-1.5'
    },
    md: {
      avatar: 'h-8 w-8',
      text: 'text-sm',
      padding: 'px-3 py-1.5',
      gap: 'gap-2'
    },
    lg: {
      avatar: 'h-10 w-10',
      text: 'text-sm',
      padding: 'px-3 py-2',
      gap: 'gap-2'
    },
    xl: {
      avatar: 'h-12 w-12',
      text: 'text-base',
      padding: 'px-4 py-2',
      gap: 'gap-3'
    }
  }
  
  const config = sizeConfig[size]
  
  const handleClick = () => {
    if (onAssigneeClick) {
      onAssigneeClick(assignee.id)
    }
  }
  
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onAssigneeClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      onAssigneeClick(assignee.id)
    }
  }
  
  return (
    <div className="relative">
      {/* Main badge */}
      <div
        className={cn(
          'inline-flex items-center rounded-full border bg-white',
          'transition-all duration-200',
          config.padding,
          config.gap,
          onAssigneeClick && 'cursor-pointer hover:shadow-md hover:bg-gray-50',
          editable && 'pr-1',
          className
        )}
        role={onAssigneeClick ? 'button' : 'group'}
        tabIndex={onAssigneeClick ? 0 : undefined}
        onClick={onAssigneeClick ? handleClick : undefined}
        onKeyDown={onAssigneeClick ? handleKeyDown : undefined}
        onMouseEnter={() => showDetails && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => showDetails && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Assigned to ${assignee.name}${assignedAt ? ` on ${formatDate(assignedAt)}` : ''}`}
        data-testid={testId || `assignment-badge-${assignee.id}`}
        {...props}
      >
        {/* Avatar */}
        <Avatar className={config.avatar}>
          <AvatarImage src={assignee.avatar} alt={assignee.name} />
          <AvatarFallback className={cn(config.text, 'font-medium')}>
            {getInitials(assignee.name)}
          </AvatarFallback>
        </Avatar>
        
        {/* Name */}
        <span className={cn(config.text, 'font-medium text-gray-900 truncate max-w-32')}>
          {assignee.name}
        </span>
        
        {/* Edit button */}
        {editable && onReassign && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-1"
            onClick={(e) => {
              e.stopPropagation()
              onReassign()
            }}
            aria-label={`Reassign from ${assignee.name}`}
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {/* Detailed tooltip */}
      {showDetails && showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 min-w-max shadow-lg">
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
            
            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium">{assignee.name}</span>
              </div>
              
              {assignee.email && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Mail className="h-3 w-3" />
                  <span>{assignee.email}</span>
                </div>
              )}
              
              {assignedAt && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <Clock className="h-3 w-3" />
                  <span>Assigned {formatDate(assignedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

AssignmentBadge.displayName = 'AssignmentBadge'