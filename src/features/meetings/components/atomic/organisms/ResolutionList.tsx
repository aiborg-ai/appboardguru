'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ResolutionListProps } from '../types'
import { ResolutionCard } from '../molecules'
import { StatusBadge } from '../atoms'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List, 
  Table,
  Scale,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Download,
  Archive
} from 'lucide-react'

/**
 * ResolutionList - Organism component for displaying and managing resolutions
 * 
 * Features:
 * - Multiple view modes (card, list, table)
 * - Sorting and filtering capabilities
 * - Bulk selection and actions
 * - Pagination support
 * - Loading and empty states
 * - Accessible navigation and controls
 */
export const ResolutionList: React.FC<ResolutionListProps> = ({
  resolutions,
  loading = false,
  emptyMessage = 'No resolutions found',
  actions,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  sort,
  pagination,
  viewMode = 'card',
  className,
  'data-testid': testId,
  ...props
}) => {
  const [currentViewMode, setCurrentViewMode] = useState(viewMode)
  const [showFilters, setShowFilters] = useState(false)
  
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange(resolutions.map(r => r.id))
    } else {
      onSelectionChange([])
    }
  }
  
  const handleSelectResolution = (resolutionId: string, checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      onSelectionChange([...selectedIds, resolutionId])
    } else {
      onSelectionChange(selectedIds.filter(id => id !== resolutionId))
    }
  }
  
  const handleSort = (field: string) => {
    if (!sort) return
    
    const newOrder = sort.field === field && sort.order === 'asc' ? 'desc' : 'asc'
    sort.onChange(field, newOrder)
  }
  
  const handleBulkAction = (action: string) => {
    if (actions?.onBulkAction && selectedIds.length > 0) {
      actions.onBulkAction(action, selectedIds)
    }
  }
  
  const isAllSelected = selectedIds.length === resolutions.length && resolutions.length > 0
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < resolutions.length
  
  const viewModeOptions = [
    { value: 'card', icon: Grid, label: 'Card view' },
    { value: 'list', icon: List, label: 'List view' },
    { value: 'table', icon: Table, label: 'Table view' }
  ] as const
  
  const renderViewModeSelector = () => (
    <div className="flex items-center border rounded-lg p-1">
      {viewModeOptions.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={currentViewMode === value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setCurrentViewMode(value)}
          className="h-8 w-8 p-0"
          aria-label={label}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  )
  
  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
          <Scale className="h-6 w-6" />
          <span>Resolutions</span>
          {resolutions.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {resolutions.length}
            </Badge>
          )}
        </h2>
        
        {selectable && selectedIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <Badge className="bg-blue-100 text-blue-700">
              {selectedIds.length} selected
            </Badge>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('export')}
                aria-label="Export selected resolutions"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('archive')}
                aria-label="Archive selected resolutions"
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-3">
        {/* View mode selector */}
        {renderViewModeSelector()}
        
        {/* Sort controls */}
        {sort && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSort('createdAt')}
            className="flex items-center space-x-1"
            aria-label={`Sort by date ${sort.order === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sort.order === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            <span>Sort</span>
          </Button>
        )}
        
        {/* Filter toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-gray-100')}
          aria-label="Toggle filters"
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
        
        {/* Create action */}
        {actions?.onCreate && (
          <Button
            onClick={actions.onCreate}
            className="flex items-center space-x-2"
            aria-label="Create new resolution"
          >
            <Plus className="h-4 w-4" />
            <span>Add Resolution</span>
          </Button>
        )}
      </div>
    </div>
  )
  
  const renderBulkSelection = () => {
    if (!selectable) return null
    
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            checked={isAllSelected}
            indeterminate={isPartiallySelected}
            onCheckedChange={handleSelectAll}
            aria-label="Select all resolutions"
          />
          <span className="text-sm font-medium text-gray-700">
            {isAllSelected ? 'All selected' : 
             isPartiallySelected ? `${selectedIds.length} selected` : 
             'Select all'}
          </span>
        </div>
        
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange?.([])}
              aria-label="Clear selection"
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    )
  }
  
  const renderResolutions = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
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
    
    if (resolutions.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Scale className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No resolutions found
            </h3>
            <p className="text-gray-500 mb-4">
              {emptyMessage}
            </p>
            {actions?.onCreate && (
              <Button onClick={actions.onCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resolution
              </Button>
            )}
          </CardContent>
        </Card>
      )
    }
    
    const gridClass = currentViewMode === 'card' ? 'grid grid-cols-1 gap-4' : 'space-y-3'
    
    return (
      <div className={gridClass}>
        {resolutions.map((resolution) => (
          <div
            key={resolution.id}
            className={cn(
              'relative',
              selectable && 'group'
            )}
          >
            {selectable && (
              <div className="absolute top-4 left-4 z-10">
                <Checkbox
                  checked={selectedIds.includes(resolution.id)}
                  onCheckedChange={(checked) => 
                    handleSelectResolution(resolution.id, !!checked)
                  }
                  aria-label={`Select resolution ${resolution.title}`}
                />
              </div>
            )}
            
            <ResolutionCard
              {...resolution}
              compact={currentViewMode === 'list'}
              className={cn(
                selectable && selectedIds.includes(resolution.id) && 'ring-2 ring-blue-500',
                selectable && 'pl-12'
              )}
            />
          </div>
        ))}
      </div>
    )
  }
  
  const renderPagination = () => {
    if (!pagination || pagination.total <= pagination.limit) return null
    
    const totalPages = Math.ceil(pagination.total / pagination.limit)
    const hasNextPage = pagination.page < totalPages
    const hasPrevPage = pagination.page > 1
    
    return (
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-700">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} resolutions
        </p>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={!hasPrevPage}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium px-3 py-1">
            Page {pagination.page} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={!hasNextPage}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div
      className={cn('space-y-6', className)}
      data-testid={testId || 'resolution-list'}
      {...props}
    >
      {renderHeader()}
      
      {/* Filters panel would go here when showFilters is true */}
      
      {renderBulkSelection()}
      
      {renderResolutions()}
      
      {renderPagination()}
    </div>
  )
}

ResolutionList.displayName = 'ResolutionList'