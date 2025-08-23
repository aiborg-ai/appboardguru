/**
 * AnnotationFilters - Molecule Component
 * Filtering controls for annotations following Atomic Design principles
 */

'use client'

import React from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { 
  Filter, 
  Eye,
  EyeOff,
  MessageSquare,
  Edit3,
  Palette,
  Trash2
} from 'lucide-react'

interface AnnotationFiltersProps {
  filters: {
    pageNumber?: number
    annotationType?: string
    showPrivate: boolean
    showResolved: boolean
  }
  onFiltersChange: (filters: Partial<AnnotationFiltersProps['filters']>) => void
  totalCount: number
  filteredCount: number
}

const annotationTypes = [
  { value: 'comment', label: 'Comments', icon: MessageSquare },
  { value: 'highlight', label: 'Highlights', icon: Palette },
  { value: 'drawing', label: 'Drawings', icon: Edit3 },
  { value: 'textbox', label: 'Notes', icon: Edit3 }
]

export function AnnotationFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount
}: AnnotationFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.pageNumber || 
    filters.annotationType || 
    !filters.showPrivate || 
    !filters.showResolved
  )

  const clearAllFilters = () => {
    onFiltersChange({
      pageNumber: undefined,
      annotationType: undefined,
      showPrivate: true,
      showResolved: true
    })
  }

  return (
    <div className="space-y-3">
      {/* Type filters */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-medium text-gray-600 min-w-max">Type:</span>
        <div className="flex items-center space-x-1 overflow-x-auto">
          <Button
            variant={!filters.annotationType ? "default" : "ghost"}
            size="sm"
            onClick={() => onFiltersChange({ annotationType: undefined })}
            className="h-6 px-2 text-xs whitespace-nowrap"
          >
            All
          </Button>
          {annotationTypes.map((type) => {
            const Icon = type.icon
            return (
              <Button
                key={type.value}
                variant={filters.annotationType === type.value ? "default" : "ghost"}
                size="sm"
                onClick={() => onFiltersChange({ 
                  annotationType: filters.annotationType === type.value ? undefined : type.value 
                })}
                className="h-6 px-2 text-xs whitespace-nowrap"
              >
                <Icon className="h-3 w-3 mr-1" />
                {type.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Visibility toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant={filters.showPrivate ? "ghost" : "outline"}
            size="sm"
            onClick={() => onFiltersChange({ showPrivate: !filters.showPrivate })}
            className="h-6 px-2 text-xs"
          >
            {filters.showPrivate ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span className="ml-1">Private</span>
          </Button>
          
          <Button
            variant={filters.showResolved ? "ghost" : "outline"}
            size="sm"
            onClick={() => onFiltersChange({ showResolved: !filters.showResolved })}
            className="h-6 px-2 text-xs"
          >
            {filters.showResolved ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span className="ml-1">Resolved</span>
          </Button>
        </div>

        {/* Filter summary and clear */}
        <div className="flex items-center space-x-2">
          {totalCount !== filteredCount && (
            <Badge variant="outline" className="text-xs">
              {filteredCount} of {totalCount}
            </Badge>
          )}
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}