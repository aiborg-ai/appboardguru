/**
 * Enhanced PDF Viewer Component
 * Advanced PDF viewer with annotation support using react-pdf
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  Loader2
} from 'lucide-react'

// Dynamically import react-pdf to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then(mod => mod.Document),
  { ssr: false }
)

const Page = dynamic(
  () => import('react-pdf').then(mod => mod.Page),
  { ssr: false }
)

import { pdfjs } from 'react-pdf'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
}

// Types
type AssetId = string
type AnnotationType = 'highlight' | 'area' | 'text' | 'voice' | 'sticky'

interface EnhancedPDFViewerProps {
  assetId: AssetId
  fileUrl: string
  className?: string
  onAnnotationSelect?: (annotation: any) => void
  onPageChange?: (page: number) => void
  enableAnnotations?: boolean
  annotationMode?: AnnotationType
  onAnnotationModeChange?: (mode: AnnotationType) => void
}

interface AnnotationData {
  id: string
  pageNumber: number
  x: number
  y: number
  width: number
  height: number
  text: string
  type: AnnotationType
}

export const EnhancedPDFViewer = React.memo<EnhancedPDFViewerProps>(function EnhancedPDFViewer({
  assetId,
  fileUrl,
  className,
  onAnnotationSelect,
  onPageChange,
  enableAnnotations = true,
  annotationMode = 'highlight',
  onAnnotationModeChange
}) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionRect, setSelectionRect] = useState<any>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  // Document load handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: any) => {
    console.error('Error loading PDF:', error)
    setError('Failed to load PDF document')
    setLoading(false)
  }

  // Page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page)
      onPageChange?.(page)
    }
  }

  const goToPrevious = () => goToPage(pageNumber - 1)
  const goToNext = () => goToPage(pageNumber + 1)

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const resetZoom = () => setScale(1.0)

  // Rotation
  const rotate = () => setRotation(prev => (prev + 90) % 360)

  // Text selection for annotations
  const handleTextSelection = useCallback(() => {
    if (!enableAnnotations || annotationMode !== 'highlight') return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const selectedText = selection.toString().trim()
    if (!selectedText) return

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const pageRect = pageRef.current?.getBoundingClientRect()

    if (pageRect) {
      const annotation: AnnotationData = {
        id: `annotation-${Date.now()}`,
        pageNumber,
        x: rect.left - pageRect.left,
        y: rect.top - pageRect.top,
        width: rect.width,
        height: rect.height,
        text: selectedText,
        type: 'highlight'
      }

      setAnnotations(prev => [...prev, annotation])
      onAnnotationSelect?.(annotation)
      
      // Clear selection
      selection.removeAllRanges()
    }
  }, [enableAnnotations, annotationMode, pageNumber, onAnnotationSelect])

  // Area selection for annotations
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableAnnotations || annotationMode !== 'area') return

    const pageRect = pageRef.current?.getBoundingClientRect()
    if (!pageRect) return

    setIsSelecting(true)
    setSelectionRect({
      startX: e.clientX - pageRect.left,
      startY: e.clientY - pageRect.top,
      endX: e.clientX - pageRect.left,
      endY: e.clientY - pageRect.top
    })
  }, [enableAnnotations, annotationMode])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionRect) return

    const pageRect = pageRef.current?.getBoundingClientRect()
    if (!pageRect) return

    setSelectionRect({
      ...selectionRect,
      endX: e.clientX - pageRect.left,
      endY: e.clientY - pageRect.top
    })
  }, [isSelecting, selectionRect])

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !selectionRect) return

    const annotation: AnnotationData = {
      id: `annotation-${Date.now()}`,
      pageNumber,
      x: Math.min(selectionRect.startX, selectionRect.endX),
      y: Math.min(selectionRect.startY, selectionRect.endY),
      width: Math.abs(selectionRect.endX - selectionRect.startX),
      height: Math.abs(selectionRect.endY - selectionRect.startY),
      text: '',
      type: 'area'
    }

    if (annotation.width > 10 && annotation.height > 10) {
      setAnnotations(prev => [...prev, annotation])
      onAnnotationSelect?.(annotation)
    }

    setIsSelecting(false)
    setSelectionRect(null)
  }, [isSelecting, selectionRect, pageNumber, onAnnotationSelect])

  // Add event listener for text selection
  useEffect(() => {
    if (enableAnnotations && annotationMode === 'highlight') {
      document.addEventListener('mouseup', handleTextSelection)
      return () => document.removeEventListener('mouseup', handleTextSelection)
    }
  }, [handleTextSelection, enableAnnotations, annotationMode])

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          {/* Page navigation */}
          <Button
            size="sm"
            variant="outline"
            onClick={goToPrevious}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[100px] text-center">
            Page {pageNumber} of {numPages || '...'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={goToNext}
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Zoom controls */}
          <Button
            size="sm"
            variant="outline"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={zoomIn}
            disabled={scale >= 3}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {/* Other controls */}
          <Button
            size="sm"
            variant="outline"
            onClick={rotate}
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={resetZoom}
            title="Fit to page"
          >
            <Maximize className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank')}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading PDF...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null)
                setLoading(true)
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div 
            className="flex justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={<Loader2 className="h-8 w-8 animate-spin text-blue-600" />}
            >
              <div className="relative" ref={pageRef}>
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg"
                />

                {/* Render annotations */}
                {enableAnnotations && annotations
                  .filter(a => a.pageNumber === pageNumber)
                  .map(annotation => (
                    <div
                      key={annotation.id}
                      className="absolute border-2 border-yellow-400 bg-yellow-200 bg-opacity-30 cursor-pointer hover:bg-opacity-50"
                      style={{
                        left: annotation.x * scale,
                        top: annotation.y * scale,
                        width: annotation.width * scale,
                        height: annotation.height * scale
                      }}
                      onClick={() => onAnnotationSelect?.(annotation)}
                      title={annotation.text || 'Click to view annotation'}
                    />
                  ))}

                {/* Selection overlay */}
                {isSelecting && selectionRect && (
                  <div
                    className="absolute border-2 border-blue-400 bg-blue-200 bg-opacity-30"
                    style={{
                      left: Math.min(selectionRect.startX, selectionRect.endX),
                      top: Math.min(selectionRect.startY, selectionRect.endY),
                      width: Math.abs(selectionRect.endX - selectionRect.startX),
                      height: Math.abs(selectionRect.endY - selectionRect.startY)
                    }}
                  />
                )}
              </div>
            </Document>
          </div>
        )}
      </div>

      {/* Status bar */}
      {enableAnnotations && (
        <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600">
          Annotation mode: <span className="font-medium">{annotationMode}</span>
          {annotations.length > 0 && (
            <span className="ml-4">
              {annotations.filter(a => a.pageNumber === pageNumber).length} annotation(s) on this page
            </span>
          )}
        </div>
      )}
    </Card>
  )
})

EnhancedPDFViewer.displayName = 'EnhancedPDFViewer'