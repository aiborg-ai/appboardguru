/**
 * Client-side PDF Viewer Component
 * PDF viewer with basic annotation support that only renders on client
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
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
  Loader2,
  MessageSquare,
  Highlighter,
  StickyNote
} from 'lucide-react'

// Types
type AssetId = string
type AnnotationType = 'highlight' | 'comment' | 'note'

interface Annotation {
  id: string
  type: AnnotationType
  page: number
  x: number
  y: number
  width: number
  height: number
  text?: string
  comment?: string
  color: string
}

interface ClientPDFViewerProps {
  assetId: AssetId
  fileUrl: string
  className?: string
  onAnnotationSelect?: (annotation: Annotation) => void
  onAnnotationCreate?: (annotation: Omit<Annotation, 'id'>) => void
  onPageChange?: (page: number) => void
  enableAnnotations?: boolean
  existingAnnotations?: Annotation[]
}

// Default empty array constant to avoid recreating on every render
const EMPTY_ANNOTATIONS: Annotation[] = []

export const ClientPDFViewer: React.FC<ClientPDFViewerProps> = ({
  assetId,
  fileUrl,
  className,
  onAnnotationSelect,
  onAnnotationCreate,
  onPageChange,
  enableAnnotations = true,
  existingAnnotations
}) => {
  const [Document, setDocument] = useState<any>(null)
  const [Page, setPage] = useState<any>(null)
  const [pdfjs, setPdfjs] = useState<any>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>(existingAnnotations || EMPTY_ANNOTATIONS)
  const [annotationMode, setAnnotationMode] = useState<AnnotationType>('highlight')
  const [isAnnotating, setIsAnnotating] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  // Load react-pdf dynamically on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('react-pdf').then((module) => {
        setDocument(() => module.Document)
        setPage(() => module.Page)
        setPdfjs(module.pdfjs)
        
        // Configure worker
        module.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${module.pdfjs.version}/build/pdf.worker.min.js`
      }).catch(err => {
        console.error('Failed to load react-pdf:', err)
        setError('Failed to load PDF viewer')
        setLoading(false)
      })
    }
  }, [])

  // Update annotations when props change
  useEffect(() => {
    if (existingAnnotations) {
      setAnnotations(existingAnnotations)
    }
  }, [existingAnnotations])

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

  // Annotation handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableAnnotations || !isAnnotating) return

    const rect = pageRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    setSelectionStart({ x, y })
  }, [enableAnnotations, isAnnotating, scale])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!enableAnnotations || !isAnnotating || !selectionStart) return

    const rect = pageRef.current?.getBoundingClientRect()
    if (!rect) return

    const endX = (e.clientX - rect.left) / scale
    const endY = (e.clientY - rect.top) / scale

    const annotation: Omit<Annotation, 'id'> = {
      type: annotationMode,
      page: pageNumber,
      x: Math.min(selectionStart.x, endX),
      y: Math.min(selectionStart.y, endY),
      width: Math.abs(endX - selectionStart.x),
      height: Math.abs(endY - selectionStart.y),
      color: annotationMode === 'highlight' ? '#FFFF00' : '#FF6B6B',
      text: '',
      comment: ''
    }

    if (annotation.width > 10 && annotation.height > 10) {
      const newAnnotation = {
        ...annotation,
        id: `annotation-${Date.now()}`
      }
      
      setAnnotations(prev => [...prev, newAnnotation])
      onAnnotationCreate?.(annotation)
    }

    setSelectionStart(null)
    setIsAnnotating(false)
  }, [enableAnnotations, isAnnotating, selectionStart, scale, annotationMode, pageNumber, onAnnotationCreate])

  // If react-pdf isn't loaded yet, show loading or fallback
  if (!Document || !Page) {
    return (
      <Card className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading PDF viewer...</span>
        </div>
      </Card>
    )
  }

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
          {/* Annotation tools */}
          {enableAnnotations && (
            <>
              <div className="border-r pr-2 mr-2">
                <Button
                  size="sm"
                  variant={annotationMode === 'highlight' && isAnnotating ? "default" : "outline"}
                  onClick={() => {
                    setAnnotationMode('highlight')
                    setIsAnnotating(true)
                  }}
                  title="Highlight"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={annotationMode === 'comment' && isAnnotating ? "default" : "outline"}
                  onClick={() => {
                    setAnnotationMode('comment')
                    setIsAnnotating(true)
                  }}
                  title="Add comment"
                  className="ml-1"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={annotationMode === 'note' && isAnnotating ? "default" : "outline"}
                  onClick={() => {
                    setAnnotationMode('note')
                    setIsAnnotating(true)
                  }}
                  title="Add note"
                  className="ml-1"
                >
                  <StickyNote className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

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
      <div 
        className="flex-1 overflow-auto bg-gray-100 p-4"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
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

        {!loading && !error && Document && Page && (
          <div className="flex justify-center">
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

                {/* Render annotations overlay */}
                {enableAnnotations && annotations
                  .filter(a => a.page === pageNumber)
                  .map(annotation => (
                    <div
                      key={annotation.id}
                      className={cn(
                        "absolute border-2 cursor-pointer transition-opacity hover:opacity-80",
                        annotation.type === 'highlight' && "border-yellow-400 bg-yellow-200 bg-opacity-30",
                        annotation.type === 'comment' && "border-blue-400 bg-blue-200 bg-opacity-30",
                        annotation.type === 'note' && "border-green-400 bg-green-200 bg-opacity-30"
                      )}
                      style={{
                        left: annotation.x * scale,
                        top: annotation.y * scale,
                        width: annotation.width * scale,
                        height: annotation.height * scale
                      }}
                      onClick={() => onAnnotationSelect?.(annotation)}
                      title={annotation.comment || annotation.text || 'Click to view annotation'}
                    >
                      {annotation.type === 'comment' && (
                        <MessageSquare className="absolute -top-2 -right-2 h-4 w-4 text-blue-600 bg-white rounded-full" />
                      )}
                      {annotation.type === 'note' && (
                        <StickyNote className="absolute -top-2 -right-2 h-4 w-4 text-green-600 bg-white rounded-full" />
                      )}
                    </div>
                  ))}

                {/* Selection preview */}
                {isAnnotating && selectionStart && (
                  <div
                    className="absolute border-2 border-dashed pointer-events-none"
                    style={{
                      borderColor: annotationMode === 'highlight' ? '#FFFF00' : '#3B82F6',
                      backgroundColor: annotationMode === 'highlight' ? 'rgba(255, 255, 0, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                      left: selectionStart.x * scale,
                      top: selectionStart.y * scale,
                      width: 0,
                      height: 0
                    }}
                  />
                )}
              </div>
            </Document>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600 flex justify-between">
        <span>Document ID: {assetId}</span>
        {enableAnnotations && (
          <span>
            {isAnnotating ? (
              <span className="text-blue-600 font-medium">
                Click and drag to add {annotationMode}
              </span>
            ) : (
              `${annotations.filter(a => a.page === pageNumber).length} annotation(s) on this page`
            )}
          </span>
        )}
      </div>
    </Card>
  )
}

ClientPDFViewer.displayName = 'ClientPDFViewer'