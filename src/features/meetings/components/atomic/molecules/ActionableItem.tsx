'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { ActionableItemProps } from '../types'
import { StatusBadge, ProgressBar, PriorityIndicator } from '../atoms'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { 
  Calendar, 
  Clock, 
  User, 
  Timer, 
  Eye, 
  Edit, 
  Trash2,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'

/**
 * ActionableItem - Molecular component for displaying actionable information
 * 
 * Features:
 * - Comprehensive actionable display with progress tracking
 * - Multiple view modes (card, list, board)
 * - Assignee information with avatar
 * - Due date tracking with overdue indicators
 * - Dependencies and effort tracking
 * - Accessible action buttons
 */
export const ActionableItem: React.FC<ActionableItemProps> = ({
  id,
  actionNumber,
  title,
  description,
  status,
  priority,
  category,
  dueDate,
  progress,
  assignee,
  effort,
  dependencies,
  actions,
  canManage = false,
  viewMode = 'card',
  className,
  'data-testid': testId,
  ...props
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }
  
  const getDaysUntilDue = (dueDateString: string) => {
    const due = new Date(dueDateString)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }
  
  const categoryLabels = {
    follow_up: 'Follow Up',
    research: 'Research',
    implementation: 'Implementation',
    compliance: 'Compliance',
    reporting: 'Reporting',
    communication: 'Communication',
    approval: 'Approval',
    review: 'Review',
    other: 'Other'
  }
  
  const daysUntilDue = getDaysUntilDue(dueDate)
  const isOverdue = daysUntilDue < 0
  const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0
  
  const handleAction = (action: string, callback?: () => void) => {
    if (callback) {
      callback()
    }
  }
  
  const renderAssigneeInfo = () => {
    if (!assignee) return null
    
    return (
      <div className="flex items-center space-x-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={assignee.avatar} alt={assignee.name} />
          <AvatarFallback className="text-xs">
            {assignee.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{assignee.name}</p>
        </div>
      </div>
    )
  }
  
  const renderMetadata = () => {
    const isCompact = viewMode === 'board' || viewMode === 'list'
    
    return (
      <div className={cn(
        'grid gap-4 text-sm',
        isCompact ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'
      )}>
        {/* Assignee */}
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Assigned to</p>
            {assignee ? (
              <div className="flex items-center space-x-2 mt-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={assignee.avatar} alt={assignee.name} />
                  <AvatarFallback className="text-xs">
                    {assignee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-gray-500 text-sm truncate">{assignee.name}</span>
              </div>
            ) : (
              <span className="text-gray-500">Unassigned</span>
            )}
          </div>
        </div>
        
        {/* Due date */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <p className="font-medium">Due Date</p>
            <p className={cn(
              'text-gray-500',
              isOverdue && 'text-red-600 font-medium',
              isDueSoon && 'text-yellow-600 font-medium'
            )}>
              {formatDate(dueDate)}
            </p>
          </div>
        </div>
        
        {/* Effort tracking */}
        {effort && (effort.estimated || effort.actual) && (
          <div className="flex items-center space-x-2">
            <Timer className="h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium">Effort</p>
              <p className="text-gray-500 text-sm">
                {effort.actual ? `${effort.actual}h` : '0h'}
                {effort.estimated && ` / ${effort.estimated}h`}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  const renderDependencies = () => {
    if (!dependencies || (dependencies.dependsOn === 0 && dependencies.blocks === 0)) {
      return null
    }
    
    return (
      <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
        {dependencies.dependsOn > 0 && (
          <>
            <span>Depends on {dependencies.dependsOn} action(s)</span>
            <span>•</span>
          </>
        )}
        {dependencies.blocks > 0 && (
          <>
            <span>Blocks {dependencies.blocks} action(s)</span>
            <span>•</span>
          </>
        )}
      </div>
    )
  }
  
  const isCompact = viewMode === 'board'
  
  return (
    <Card 
      className={cn(
        'hover:shadow-md transition-shadow',
        viewMode === 'list' && 'shadow-sm',
        className
      )}
      data-testid={testId || `actionable-item-${id}`}
      {...props}
    >
      <CardContent className={cn('p-6', isCompact && 'p-4')}>
        <div className={cn(
          'flex items-start justify-between',
          viewMode === 'list' && 'flex-row space-x-4'
        )}>
          <div className="flex-1 min-w-0">
            {/* Header with badges */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              {actionNumber && (
                <Badge variant="outline" className="text-xs font-mono">
                  {actionNumber}
                </Badge>
              )}
              <StatusBadge status={status} size="sm" />
              <PriorityIndicator priority={priority} size="sm" variant="badge" />
              <Badge variant="outline" className="text-xs">
                {categoryLabels[category]}
              </Badge>
              {(isOverdue || isDueSoon) && (
                <Badge className={cn(
                  'text-xs',
                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                )}>
                  <Clock className="h-3 w-3 mr-1" />
                  {isOverdue ? 'Overdue' : 'Due Soon'}
                </Badge>
              )}
            </div>
            
            {/* Title */}
            <h3 className={cn(
              'font-semibold text-gray-900 mb-2',
              isCompact ? 'text-base' : 'text-lg'
            )}>
              {title}
            </h3>
            
            {/* Description */}
            {!isCompact && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {description}
              </p>
            )}
            
            {/* Progress Bar */}
            <div className="mb-4">
              <ProgressBar
                value={progress}
                status={status}
                showLabel={!isCompact}
                size={isCompact ? 'sm' : 'md'}
                animated
              />
            </div>
            
            {/* Metadata */}
            {!isCompact && renderMetadata()}
            
            {/* Dependencies */}
            {!isCompact && renderDependencies()}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            {actions?.onView && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAction('view', actions.onView)}
                aria-label={`View actionable ${title}`}
              >
                <Eye className="h-4 w-4 mr-1" />
                {!isCompact && 'View'}
              </Button>
            )}
            
            {canManage && actions?.onEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleAction('edit', actions.onEdit)}
                aria-label={`Edit actionable ${title}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {canManage && actions?.onDelete && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleAction('delete', actions.onDelete)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Delete actionable ${title}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

ActionableItem.displayName = 'ActionableItem'