'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { AnnotationPanel } from '@/components/organisms/annotation-panel'
import { EnhancedPDFViewer } from '@/components/pdf/EnhancedPDFViewer'
import { AssetId, AnnotationType, AssetAnnotation } from '@/types/annotation-types'
import { useAnnotationStore } from '@/lib/stores/annotation-store'
import { Button } from '@/components/atoms/Button'
import { 
  PanelLeftClose, 
  PanelLeftOpen,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'

interface PDFViewerWithAnnotationsProps {
  assetId: string
  filePath: string
  annotationMode?: AnnotationType
  onAnnotationChange?: () => void
  className?: string
}

export const PDFViewerWithAnnotations = React.memo<PDFViewerWithAnnotationsProps>(function PDFViewerWithAnnotations({
  assetId,
  filePath,
  annotationMode = 'highlight',
  onAnnotationChange,
  className
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [currentAnnotationMode, setCurrentAnnotationMode] = useState<AnnotationType>(annotationMode)
  const [isPanelVisible, setIsPanelVisible] = useState(true)
  const [enableAnnotations, setEnableAnnotations] = useState(true)
  const [selectedAnnotation, setSelectedAnnotation] = useState<AssetAnnotation | null>(null)

  // Store actions
  const { selectAnnotation } = useAnnotationStore()

  // Handlers
  const handleAnnotationSelect = useCallback((annotation: AssetAnnotation) => {
    setSelectedAnnotation(annotation)
    selectAnnotation(annotation.id)
    
    // Navigate to the annotation's page if different
    if (annotation.pageNumber !== currentPage) {
      setCurrentPage(annotation.pageNumber)
    }
    
    onAnnotationChange?.()
  }, [currentPage, selectAnnotation, onAnnotationChange])

  const handleAnnotationSelectById = useCallback((annotationId: string) => {
    // This is called from the annotation panel
    const annotation = selectedAnnotation?.id === annotationId ? null : selectedAnnotation
    setSelectedAnnotation(annotation)
    selectAnnotation(annotationId)
  }, [selectedAnnotation, selectAnnotation])

  const handlePageNavigate = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleAnnotationModeChange = useCallback((mode: AnnotationType) => {
    setCurrentAnnotationMode(mode)
  }, [])

  const togglePanel = useCallback(() => {
    setIsPanelVisible(prev => !prev)
  }, [])

  const toggleAnnotations = useCallback(() => {
    setEnableAnnotations(prev => !prev)
  }, [])

  // Layout configuration
  const pdfViewerProps = useMemo(() => ({
    assetId: assetId as AssetId,
    fileUrl: filePath,
    onAnnotationSelect: handleAnnotationSelect,
    onPageChange: handlePageChange,
    enableAnnotations,
    annotationMode: currentAnnotationMode,
    onAnnotationModeChange: handleAnnotationModeChange
  }), [
    assetId, 
    filePath, 
    handleAnnotationSelect, 
    handlePageChange, 
    enableAnnotations, 
    currentAnnotationMode, 
    handleAnnotationModeChange
  ])

  return (
    <div className={`w-full h-full flex relative ${className || ''}`}>
      {/* Main PDF Viewer */}
      <div 
        className={`flex-1 transition-all duration-300 ${
          isPanelVisible ? 'mr-0' : 'mr-0'
        }`}
      >
        <EnhancedPDFViewer {...pdfViewerProps} />
      </div>
      
      {/* Panel Toggle Button */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-2">
          {/* Annotation toggle */}
          <Button
            size="sm"
            variant={enableAnnotations ? "default" : "outline"}
            onClick={toggleAnnotations}
            className="shadow-lg"
            title={enableAnnotations ? "Hide annotations" : "Show annotations"}
          >
            {enableAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          
          {/* Panel toggle */}
          <Button
            size="sm"
            variant="outline"
            onClick={togglePanel}
            className="shadow-lg"
            title={isPanelVisible ? "Hide panel" : "Show panel"}
          >
            {isPanelVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Annotation Panel */}
      <div 
        className={`transition-all duration-300 bg-white border-l border-gray-200 shadow-lg ${
          isPanelVisible ? 'w-96' : 'w-0 overflow-hidden'
        }`}
      >
        {isPanelVisible && (
          <AnnotationPanel
            assetId={assetId as AssetId}
            currentPage={currentPage}
            onAnnotationSelect={handleAnnotationSelectById}
            onPageNavigate={handlePageNavigate}
            className="h-full"
          />
        )}
      </div>

      {/* Selected Annotation Indicator */}
      {selectedAnnotation && (
        <div className="absolute bottom-4 left-4 bg-blue-600 text-white rounded-lg shadow-lg px-3 py-2 max-w-xs">
          <div className="text-xs font-medium mb-1">
            Selected Annotation
          </div>
          <div className="text-sm">
            Page {selectedAnnotation.pageNumber} • {selectedAnnotation.user.fullName}
          </div>
          {selectedAnnotation.commentText && (
            <div className="text-xs mt-1 opacity-90 line-clamp-2">
              {selectedAnnotation.commentText}
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedAnnotation(null)}
            className="absolute top-1 right-1 h-5 w-5 p-0 text-white hover:bg-blue-700"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  )
})

PDFViewerWithAnnotations.displayName = 'PDFViewerWithAnnotations'