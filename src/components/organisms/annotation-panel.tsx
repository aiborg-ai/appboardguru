/**
 * AnnotationPanel - Organism Component
 * Complete annotation management panel following Atomic Design principles
 */

'use client'

import React, { useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Separator } from '@/components/atoms/display/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  Plus, 
  Filter, 
  Search,
  Eye,
  EyeOff
} from 'lucide-react'
import { 
  useAnnotationStore,
  useAnnotationsForAsset,
  useAnnotationLoadingState,
  useAnnotationFilters,
  useAnnotationMode,
  useIsCreatingAnnotation
} from '@/lib/stores/annotation-store'
import { AssetId } from '@/types/annotation-types'
import { AnnotationCard } from '@/components/molecules/annotation-card'
import { AnnotationForm } from '@/components/molecules/annotation-form'
import { AnnotationFilters } from '@/components/molecules/annotation-filters'

interface AnnotationPanelProps {
  assetId: AssetId
  currentPage: number
  className?: string
  onAnnotationSelect?: (annotationId: string) => void
  onPageNavigate?: (page: number) => void
}

export function AnnotationPanel({
  assetId,
  currentPage,
  className,
  onAnnotationSelect,
  onPageNavigate
}: AnnotationPanelProps) {
  // Store hooks
  const annotations = useAnnotationsForAsset(assetId)
  const loadingState = useAnnotationLoadingState(assetId)
  const filters = useAnnotationFilters()
  const annotationMode = useAnnotationMode()
  const isCreating = useIsCreatingAnnotation()
  
  // Store actions
  const {
    loadAnnotations,
    createAnnotation,
    deleteAnnotation,
    selectAnnotation,
    setFilters,
    setAnnotationMode,
    enableRealTimeUpdates,
    disableRealTimeUpdates
  } = useAnnotationStore()

  // Load annotations on mount and when assetId changes
  useEffect(() => {
    loadAnnotations(assetId)
    enableRealTimeUpdates(assetId)
    
    return () => {
      disableRealTimeUpdates()
    }
  }, [assetId]) // Only depend on assetId, not the functions

  // Filter annotations based on current page and filters
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations

    // Filter by current page if page filter is enabled
    if (filters.pageNumber === currentPage) {
      filtered = filtered.filter(annotation => annotation.pageNumber === currentPage)
    }

    // Apply other filters
    if (filters.annotationType) {
      filtered = filtered.filter(annotation => annotation.annotationType === filters.annotationType)
    }

    if (!filters.showPrivate) {
      filtered = filtered.filter(annotation => !annotation.isPrivate)
    }

    if (!filters.showResolved) {
      filtered = filtered.filter(annotation => !annotation.isResolved)
    }

    return filtered
  }, [annotations, filters, currentPage])

  // Handlers
  const handleCreateAnnotation = async (data: unknown) => {
    const annotationData = {
      annotationType: annotationMode === 'select' ? 'textbox' : annotationMode,
      content: { text: data.content },
      pageNumber: currentPage,
      position: {
        pageNumber: currentPage,
        rects: [{
          x1: 100, y1: 100, x2: 300, y2: 150,
          width: 200, height: 50
        }],
        boundingRect: {
          x1: 100, y1: 100, x2: 300, y2: 150,
          width: 200, height: 50
        }
      },
      commentText: data.content,
      color: data.color || '#FFFF00',
      opacity: data.opacity || 0.3,
      isPrivate: data.isPrivate || false
    }

    return await createAnnotation(assetId, annotationData)
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (confirm('Are you sure you want to delete this annotation?')) {
      return await deleteAnnotation(assetId, annotationId)
    }
    return false
  }

  const handleAnnotationSelect = (annotationId: string) => {
    selectAnnotation(annotationId)
    onAnnotationSelect?.(annotationId)
  }

  const handlePageNavigate = (page: number) => {
    onPageNavigate?.(page)
  }

  const togglePageFilter = () => {
    setFilters({
      pageNumber: filters.pageNumber === currentPage ? undefined : currentPage
    })
  }

  const isLoading = loadingState.status === 'loading'
  const hasError = loadingState.status === 'error'

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">Annotations</h3>
          {annotations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {filteredAnnotations.length}/{annotations.length}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Page filter toggle */}
          <Button
            variant={filters.pageNumber === currentPage ? "default" : "ghost"}
            size="sm"
            onClick={togglePageFilter}
            className="h-6 px-2 text-xs"
          >
            {filters.pageNumber === currentPage ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span className="ml-1">Page {currentPage}</span>
          </Button>
          
          {/* Add annotation button */}
          <Button 
            size="sm" 
            onClick={() => setAnnotationMode('comment')}
            disabled={isCreating}
            className="h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b bg-gray-50">
        <AnnotationFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={annotations.length}
          filteredCount={filteredAnnotations.length}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading annotations...</span>
          </div>
        )}

        {/* Error state */}
        {hasError && (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <p className="text-sm text-red-600 mb-2">Failed to load annotations</p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => loadAnnotations(assetId)}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Annotation form */}
        {annotationMode !== 'select' && (
          <div className="p-4 border-b bg-blue-50">
            <AnnotationForm
              mode={annotationMode}
              currentPage={currentPage}
              onSubmit={handleCreateAnnotation}
              onCancel={() => setAnnotationMode('select')}
              isSubmitting={isCreating}
            />
          </div>
        )}

        {/* Annotations list */}
        {!isLoading && !hasError && (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {filteredAnnotations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 mb-2">
                    {annotations.length === 0 
                      ? "No annotations yet" 
                      : "No annotations match your filters"
                    }
                  </p>
                  {annotations.length === 0 ? (
                    <Button
                      size="sm"
                      onClick={() => setAnnotationMode('comment')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Annotation
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFilters({ pageNumber: undefined, annotationType: undefined })}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredAnnotations.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    currentPage={currentPage}
                    onSelect={() => handleAnnotationSelect(annotation.id)}
                    onDelete={() => handleDeleteAnnotation(annotation.id)}
                    onPageNavigate={handlePageNavigate}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span>{filteredAnnotations.length} visible</span>
            {annotations.length > filteredAnnotations.length && (
              <span>of {annotations.length} total</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>Page {currentPage}</span>
            <Separator orientation="vertical" className="h-3" />
            <span className="capitalize">{annotationMode} mode</span>
          </div>
        </div>
      </div>
    </Card>
  )
}