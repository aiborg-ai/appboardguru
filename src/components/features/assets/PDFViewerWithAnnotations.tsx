'use client'

import React, { useState, useCallback } from 'react'
import { AnnotationPanel } from '@/components/organisms/annotation-panel'
import { AssetId } from '@/types/annotation-types'

interface PDFViewerWithAnnotationsProps {
  assetId: string
  filePath: string
  annotationMode: 'select' | 'highlight' | 'comment'
  onAnnotationChange?: () => void
}

export const PDFViewerWithAnnotations = React.memo<PDFViewerWithAnnotationsProps>(function PDFViewerWithAnnotations({
  assetId,
  filePath,
  annotationMode,
  onAnnotationChange
}) {
  const [currentPage, setCurrentPage] = useState(1)

  const handleAnnotationSelect = useCallback((annotationId: string) => {
    // Handle annotation selection logic
    console.log('Selected annotation:', annotationId)
  }, [])

  const handlePageNavigate = useCallback((page: number) => {
    setCurrentPage(page)
    // You could also add logic to actually navigate to the page in the PDF
  }, [])

  return (
    <div className="w-full h-full flex">
      {/* PDF Viewer */}
      <div className="flex-1 relative">
        <iframe
          src={filePath}
          className="w-full h-full border-0"
          title="PDF Viewer"
        />
        
        {/* Page indicator */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-1">
          <span className="text-sm text-gray-700">Page {currentPage}</span>
        </div>
      </div>
      
      {/* Annotation Panel */}
      <div className="w-96 border-l border-gray-200">
        <AnnotationPanel
          assetId={assetId as AssetId}
          currentPage={currentPage}
          onAnnotationSelect={handleAnnotationSelect}
          onPageNavigate={handlePageNavigate}
        />
      </div>
    </div>
  )
})

PDFViewerWithAnnotations.displayName = 'PDFViewerWithAnnotations'