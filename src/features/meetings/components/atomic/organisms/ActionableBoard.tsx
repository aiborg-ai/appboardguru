'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ActionableBoardProps } from '../types'
import { ActionableItem } from '../molecules'
import { StatusBadge } from '../atoms'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { 
  Plus, 
  MoreVertical, 
  CheckSquare,
  Filter,
  ArrowUpDown
} from 'lucide-react'

/**
 * ActionableBoard - Organism component for kanban-style actionable management
 * 
 * Features:
 * - Kanban board layout with status columns
 * - Drag and drop functionality (when enabled)
 * - Customizable column visibility and order
 * - Status-based styling and counters
 * - Loading states and empty column handling
 * - Accessible keyboard navigation
 */
export const ActionableBoard: React.FC<ActionableBoardProps> = ({
  actionables,
  loading = false,
  actions,
  columns,
  dragEnabled = false,
  layout = 'horizontal',
  className,
  'data-testid': testId,
  ...props
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  
  // Default column configuration
  const defaultColumns = ['assigned', 'in_progress', 'under_review', 'completed'] as const
  const visibleColumns = columns?.visible || defaultColumns
  const columnOrder = columns?.customOrder || visibleColumns
  
  // Status configurations
  const statusConfig = {
    assigned: { 
      label: 'Assigned', 
      color: 'bg-blue-50 border-blue-200', 
      headerColor: 'text-blue-700 bg-blue-100' 
    },
    in_progress: { 
      label: 'In Progress', 
      color: 'bg-yellow-50 border-yellow-200', 
      headerColor: 'text-yellow-700 bg-yellow-100' 
    },
    blocked: { 
      label: 'Blocked', 
      color: 'bg-red-50 border-red-200', 
      headerColor: 'text-red-700 bg-red-100' 
    },
    under_review: { 
      label: 'Under Review', 
      color: 'bg-purple-50 border-purple-200', 
      headerColor: 'text-purple-700 bg-purple-100' 
    },
    completed: { 
      label: 'Completed', 
      color: 'bg-green-50 border-green-200', 
      headerColor: 'text-green-700 bg-green-100' 
    },
    cancelled: { 
      label: 'Cancelled', 
      color: 'bg-gray-50 border-gray-200', 
      headerColor: 'text-gray-700 bg-gray-100' 
    },
    overdue: { 
      label: 'Overdue', 
      color: 'bg-red-50 border-red-200', 
      headerColor: 'text-red-700 bg-red-100' 
    }
  }
  
  const handleDragStart = (actionableId: string) => {
    if (!dragEnabled) return
    setDraggedItem(actionableId)
  }
  
  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverColumn(null)
  }
  
  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    if (!dragEnabled) return
    e.preventDefault()
    setDragOverColumn(columnStatus)
  }
  
  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    if (!dragEnabled || !draggedItem) return
    e.preventDefault()
    
    if (actions?.onStatusChange) {
      actions.onStatusChange(draggedItem, newStatus as any)
    }
    
    handleDragEnd()
  }
  
  const renderColumnHeader = (status: string, count: number) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null
    
    return (
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-sm font-semibold text-gray-900">
              {config.label}
            </CardTitle>
            <Badge className={cn('text-xs', config.headerColor)}>
              {count}
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            aria-label={`${config.label} column options`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Quick add button */}
        {actions?.onCreate && (
          <Button
            variant="outline"
            size="sm"
            onClick={actions.onCreate}
            className="w-full justify-start text-gray-600 border-dashed"
            aria-label={`Add new actionable to ${config.label}`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add actionable
          </Button>
        )}
      </CardHeader>
    )
  }
  
  const renderActionableItems = (status: string) => {
    const items = actionables[status as keyof typeof actionables] || []
    
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-2 bg-gray-200 rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }
    
    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CheckSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">No actionables</p>
        </div>
      )
    }
    
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            draggable={dragEnabled}
            onDragStart={() => handleDragStart(item.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              dragEnabled && 'cursor-move',
              draggedItem === item.id && 'opacity-50'
            )}
          >
            <ActionableItem
              {...item}
              viewMode="board"
              className={cn(
                dragEnabled && 'transition-transform hover:scale-105',
                'shadow-sm hover:shadow-md'
              )}
            />
          </div>
        ))}
      </div>
    )
  }
  
  const renderColumn = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null
    
    const itemCount = actionables[status as keyof typeof actionables]?.length || 0
    
    return (
      <Card
        key={status}
        className={cn(
          'flex-1 min-w-80',
          config.color,
          dragOverColumn === status && 'ring-2 ring-blue-500',
          layout === 'vertical' && 'mb-4'
        )}
        onDragOver={(e) => handleDragOver(e, status)}
        onDrop={(e) => handleDrop(e, status)}
        data-testid={`actionable-column-${status}`}
      >
        {renderColumnHeader(status, itemCount)}
        <CardContent className="pt-0">
          {renderActionableItems(status)}
        </CardContent>
      </Card>
    )
  }
  
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <CheckSquare className="h-6 w-6" />
          <span>Actionables Board</span>
        </h2>
        
        <Badge variant="outline">
          {Object.values(actionables).reduce((total, items) => total + items.length, 0)} total
        </Badge>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
          aria-label="Filter actionables"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
          aria-label="Sort actionables"
        >
          <ArrowUpDown className="h-4 w-4" />
          <span>Sort</span>
        </Button>
        
        {actions?.onCreate && (
          <Button
            onClick={actions.onCreate}
            className="flex items-center space-x-2"
            aria-label="Create new actionable"
          >
            <Plus className="h-4 w-4" />
            <span>Add Actionable</span>
          </Button>
        )}
      </div>
    </div>
  )
  
  return (
    <div
      className={cn('space-y-6', className)}
      data-testid={testId || 'actionable-board'}
      {...props}
    >
      {renderHeader()}
      
      {/* Drag and drop hint */}
      {dragEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Drag actionables between columns to change their status
          </p>
        </div>
      )}
      
      {/* Board columns */}
      <div className={cn(
        'gap-6',
        layout === 'horizontal' ? 'flex overflow-x-auto pb-4' : 'space-y-6'
      )}>
        {columnOrder.map(renderColumn)}
      </div>
    </div>
  )
}

ActionableBoard.displayName = 'ActionableBoard'