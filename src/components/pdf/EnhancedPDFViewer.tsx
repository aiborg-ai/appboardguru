/**
 * Enhanced PDF Viewer Component
 * Advanced PDF viewer with annotation support using react-pdf and react-pdf-highlighter-extended
 */

'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { 
  PdfHighlighter, 
  Tip, 
  Highlight, 
  Popup, 
  AreaHighlight,
  setPdfWorkerSrc,
  type IHighlight,
  type NewHighlight,
  type ScaledPosition,
  type Content
} from 'react-pdf-highlighter-extended'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Spinner } from '@/components/atoms/display/spinner'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Fullscreen,
  ChevronLeft,
  ChevronRight,
  Search,
  Bookmark,
  Palette,
  MessageSquare,
  Edit3,
  Move3D
} from 'lucide-react'
import { AssetId, AnnotationType, AssetAnnotation, CreateAnnotationRequest } from '@/types/annotation-types'
import { useAnnotationStore, useAnnotationsForAsset } from '@/lib/stores/annotation-store'
import { AnnotationToolbar } from './AnnotationToolbar'
import { ColorPicker } from './ColorPicker'
import { VoiceAnnotationRecorder } from './VoiceAnnotationRecorder'
import { OCRExtractor } from './OCRExtractor'
import { AdvancedSearch, SearchResult } from './AdvancedSearch'
import { SearchBar } from './SearchBar'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  setPdfWorkerSrc(`//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`)
}

interface EnhancedPDFViewerProps {
  assetId: AssetId
  fileUrl: string
  className?: string
  onAnnotationSelect?: (annotation: AssetAnnotation) => void
  onPageChange?: (page: number) => void
  enableAnnotations?: boolean
  annotationMode?: AnnotationType
  onAnnotationModeChange?: (mode: AnnotationType) => void
}

interface PDFHighlight extends IHighlight {
  annotationId?: string
  userId?: string
  userName?: string
  createdAt?: string
  isPrivate?: boolean
  replies?: number
  color?: string
  opacity?: number
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
  // State
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [rotation, setRotation] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [selectedHighlight, setSelectedHighlight] = useState<PDFHighlight | null>(null)
  const [selectedColor, setSelectedColor] = useState<string>('#FFFF00')
  const [opacity, setOpacity] = useState<number>(0.3)
  const [showToolbar, setShowToolbar] = useState<boolean>(enableAnnotations)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<boolean>(false)
  const [voiceRecordingPosition, setVoiceRecordingPosition] = useState<{ x: number; y: number } | null>(null)
  const [showOCRExtractor, setShowOCRExtractor] = useState<boolean>(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false)
  const [showSearchBar, setShowSearchBar] = useState<boolean>(true)
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const highlighterRef = useRef<any>(null)

  // Store hooks
  const annotations = useAnnotationsForAsset(assetId)
  const { createAnnotation, updateAnnotationById, deleteAnnotation } = useAnnotationStore()

  // Convert annotations to PDF highlights
  const highlights: PDFHighlight[] = useMemo(() => {
    return annotations.map((annotation) => ({
      id: annotation.id,
      annotationId: annotation.id,
      content: annotation.content,
      position: annotation.position as ScaledPosition,
      comment: {
        text: annotation.commentText || '',
        emoji: '💬'
      },
      userId: annotation.createdBy,
      userName: annotation.user.fullName,
      createdAt: annotation.createdAt,
      isPrivate: annotation.isPrivate,
      replies: annotation.repliesCount,
      // Add color and opacity from annotation
      color: annotation.color,
      opacity: annotation.opacity
    }))
  }, [annotations])

  // PDF document load handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }, [])

  const onDocumentLoadError = useCallback((error: Error) => {
    setError(error.message)
    setIsLoading(false)
  }, [])

  // Page navigation
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, numPages))
    setCurrentPage(targetPage)
    onPageChange?.(targetPage)
  }, [numPages, onPageChange])

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage])
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage])

  // Zoom controls
  const zoomIn = useCallback(() => setScale(prev => Math.min(prev + 0.2, 3)), [])
  const zoomOut = useCallback(() => setScale(prev => Math.max(prev - 0.2, 0.5)), [])
  const resetZoom = useCallback(() => setScale(1.2), [])

  // Rotation
  const rotate = useCallback(() => setRotation(prev => (prev + 90) % 360), [])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Voice annotation click handling
  useEffect(() => {
    if (annotationMode === 'voice' && enableAnnotations) {
      document.addEventListener('click', handleDocumentClick)
      return () => document.removeEventListener('click', handleDocumentClick)
    }
  }, [annotationMode, enableAnnotations, handleDocumentClick])

  // Annotation handlers
  const handleNewHighlight = useCallback(async (highlight: NewHighlight) => {
    if (!enableAnnotations) return

    try {
      const annotationData: CreateAnnotationRequest = {
        annotationType: annotationMode,
        content: highlight.content,
        pageNumber: currentPage,
        position: highlight.position,
        selectedText: highlight.content?.text,
        commentText: '', // Will be added via comment popup
        color: selectedColor,
        opacity: opacity,
        isPrivate: false
      }

      const newAnnotation = await createAnnotation(assetId, annotationData)
      if (newAnnotation) {
        // Scroll to the new annotation
        setSelectedHighlight({
          ...highlight,
          id: newAnnotation.id,
          annotationId: newAnnotation.id,
          userId: newAnnotation.createdBy,
          userName: newAnnotation.user.fullName,
          createdAt: newAnnotation.createdAt,
          isPrivate: newAnnotation.isPrivate,
          replies: 0
        } as PDFHighlight)
      }
    } catch (error) {
      console.error('Error creating annotation:', error)
    }
  }, [enableAnnotations, annotationMode, currentPage, assetId, createAnnotation, selectedColor, opacity])

  // Toolbar handlers
  const handleModeChange = useCallback((mode: AnnotationType | 'select') => {
    if (mode === 'select') {
      onAnnotationModeChange?.('highlight') // Default to highlight when not selecting
    } else {
      onAnnotationModeChange?.(mode)
    }
  }, [onAnnotationModeChange])

  const handleClearAll = useCallback(async () => {
    if (!enableAnnotations) return
    
    const confirmed = confirm('Are you sure you want to delete all annotations on this page?')
    if (!confirmed) return

    // Delete all annotations on current page
    const pageAnnotations = annotations.filter(a => a.pageNumber === currentPage)
    for (const annotation of pageAnnotations) {
      await deleteAnnotation(assetId, annotation.id)
    }
  }, [enableAnnotations, annotations, currentPage, assetId, deleteAnnotation])

  const handleHighlightClick = useCallback((highlight: PDFHighlight) => {
    setSelectedHighlight(highlight)
    
    // Find the corresponding annotation
    const annotation = annotations.find(a => a.id === highlight.annotationId)
    if (annotation) {
      onAnnotationSelect?.(annotation)
    }
  }, [annotations, onAnnotationSelect])

  const handleDeleteHighlight = useCallback(async (highlightId: string) => {
    if (!enableAnnotations) return

    const success = await deleteAnnotation(assetId, highlightId)
    if (success) {
      setSelectedHighlight(null)
    }
  }, [enableAnnotations, assetId, deleteAnnotation])

  // Annotation mode handlers
  const handleAnnotationModeChange = useCallback((mode: AnnotationType) => {
    onAnnotationModeChange?.(mode)
  }, [onAnnotationModeChange])

  // Voice annotation handlers
  const handleDocumentClick = useCallback((event: MouseEvent) => {
    if (annotationMode === 'voice' && enableAnnotations) {
      const target = event.target as HTMLElement
      const pdfPage = target.closest('.react-pdf__Page')
      
      if (pdfPage) {
        const rect = pdfPage.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        
        setVoiceRecordingPosition({ x, y })
        setShowVoiceRecorder(true)
      }
    }
  }, [annotationMode, enableAnnotations])

  const handleVoiceRecordingSave = useCallback(async (audioBlob: Blob, transcript: string, duration: number) => {
    if (!enableAnnotations || !voiceRecordingPosition) return

    try {
      // Convert blob to base64 for storage
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result as string
        const audioData = base64Audio.split(',')[1] // Remove data:audio/webm;base64, prefix
        
        // Create a dummy position for voice annotations
        const position = {
          pageNumber: currentPage,
          rects: [{
            x1: voiceRecordingPosition.x,
            y1: voiceRecordingPosition.y,
            x2: voiceRecordingPosition.x + 100,
            y2: voiceRecordingPosition.y + 30,
            width: 100,
            height: 30
          }],
          boundingRect: {
            x1: voiceRecordingPosition.x,
            y1: voiceRecordingPosition.y,
            x2: voiceRecordingPosition.x + 100,
            y2: voiceRecordingPosition.y + 30,
            width: 100,
            height: 30
          }
        }

        const annotationData: CreateAnnotationRequest = {
          annotationType: 'voice',
          content: {
            audioTranscription: transcript,
            audioDuration: duration,
            audioFormat: 'webm'
          },
          pageNumber: currentPage,
          position,
          commentText: transcript || 'Voice annotation',
          color: selectedColor,
          opacity: opacity,
          isPrivate: false,
          audioData,
          audioFormat: 'webm',
          transcribeAudio: false // Already transcribed
        }

        const newAnnotation = await createAnnotation(assetId, annotationData)
        if (newAnnotation) {
          console.log('Voice annotation created:', newAnnotation)
        }
      }
      
      reader.readAsDataURL(audioBlob)
    } catch (error) {
      console.error('Error creating voice annotation:', error)
    } finally {
      setShowVoiceRecorder(false)
      setVoiceRecordingPosition(null)
    }
  }, [enableAnnotations, voiceRecordingPosition, currentPage, selectedColor, opacity, assetId, createAnnotation])

  const handleVoiceRecordingCancel = useCallback(() => {
    setShowVoiceRecorder(false)
    setVoiceRecordingPosition(null)
  }, [])

  // OCR handlers
  const handleOCRExtract = useCallback(() => {
    setShowOCRExtractor(true)
  }, [])

  const handleOCRResult = useCallback(async (result: any) => {
    console.log('OCR extraction result:', result)
    
    // Create a text annotation with the extracted content
    if (result.text || result.tables || result.formFields) {
      try {
        let extractedText = ''
        
        if (result.text) {
          extractedText = result.text
        } else if (result.tables) {
          extractedText = result.tables.map((table: any) => {
            const headerRow = table.headers.join(' | ')
            const dataRows = table.rows.map((row: string[]) => row.join(' | ')).join('\n')
            return `${table.title || 'Table'}:\n${headerRow}\n${dataRows}`
          }).join('\n\n')
        } else if (result.formFields) {
          extractedText = result.formFields.map((field: any) => 
            `${field.label}: ${field.value}`
          ).join('\n')
        }

        // Create a textbox annotation with the extracted content
        const position = {
          pageNumber: currentPage,
          rects: [{
            x1: 50,
            y1: 50,
            x2: 300,
            y2: 150,
            width: 250,
            height: 100
          }],
          boundingRect: {
            x1: 50,
            y1: 50,
            x2: 300,
            y2: 150,
            width: 250,
            height: 100
          }
        }

        const annotationData: CreateAnnotationRequest = {
          annotationType: 'textbox',
          content: { text: extractedText },
          pageNumber: currentPage,
          position,
          commentText: `OCR Extracted Text (${result.metadata.mode})`,
          color: '#E6F3FF',
          opacity: 0.8,
          isPrivate: false
        }

        const newAnnotation = await createAnnotation(assetId, annotationData)
        if (newAnnotation) {
          console.log('OCR annotation created:', newAnnotation)
        }
      } catch (error) {
        console.error('Error creating OCR annotation:', error)
      }
    }
    
    setShowOCRExtractor(false)
  }, [currentPage, assetId, createAnnotation])

  const handleOCRCancel = useCallback(() => {
    setShowOCRExtractor(false)
  }, [])

  // Search handlers
  const handleAdvancedSearch = useCallback(() => {
    setShowAdvancedSearch(true)
  }, [])

  const handleAdvancedSearchClose = useCallback(() => {
    setShowAdvancedSearch(false)
  }, [])

  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    console.log('Search result selected:', result)
    
    // Navigate to the page containing the annotation
    if (result.pageNumber !== currentPage) {
      goToPage(result.pageNumber)
    }
    
    // Highlight the annotation (if possible)
    // This would require finding the annotation in the current highlights
    const matchingHighlight = highlights.find(h => h.annotationId === result.id)
    if (matchingHighlight) {
      setSelectedHighlight(matchingHighlight)
    }
    
    // Call the annotation select callback
    onAnnotationSelect?.(result)
    
    // Close advanced search
    setShowAdvancedSearch(false)
  }, [currentPage, goToPage, highlights, onAnnotationSelect])

  const toggleSearchBar = useCallback(() => {
    setShowSearchBar(!showSearchBar)
  }, [showSearchBar])

  // Render highlight popup
  const renderHighlightPopup = useCallback((highlight: PDFHighlight) => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px] max-w-[300px]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium">
              {highlight.userName?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {highlight.userName}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {highlight.createdAt ? new Date(highlight.createdAt).toLocaleDateString() : ''}
        </span>
      </div>
      
      {highlight.content?.text && (
        <div className="mb-2 p-2 bg-yellow-50 border-l-2 border-yellow-300">
          <p className="text-sm text-gray-700">"{highlight.content.text}"</p>
        </div>
      )}
      
      {highlight.comment?.text && (
        <div className="mb-3">
          <p className="text-sm text-gray-700">{highlight.comment.text}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          {highlight.replies && highlight.replies > 0 && (
            <span>{highlight.replies} replies</span>
          )}
          {highlight.isPrivate && (
            <span className="text-orange-600">Private</span>
          )}
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDeleteHighlight(highlight.id)}
          className="text-red-500 hover:text-red-700 h-6 px-2"
        >
          Delete
        </Button>
      </div>
    </div>
  ), [handleDeleteHighlight])

  if (error) {
    return (
      <Card className={cn('p-6 text-center', className)}>
        <div className="text-red-600 mb-4">
          <p className="font-medium">Error loading PDF</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        'flex flex-col h-full bg-gray-50',
        isFullscreen && 'fixed inset-0 z-50 bg-gray-900',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        {/* Left controls */}
        <div className="flex items-center space-x-2">
          {/* Page navigation */}
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={prevPage}
              disabled={currentPage <= 1}
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2 px-3">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-12 text-center text-sm border border-gray-300 rounded px-1 py-1"
                min="1"
                max={numPages}
              />
              <span className="text-sm text-gray-600">of {numPages}</span>
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={nextPage}
              disabled={currentPage >= numPages}
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 border-l border-gray-300 pl-3">
            <Button size="sm" variant="ghost" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={resetZoom}
              className="min-w-[60px]"
            >
              {Math.round(scale * 100)}%
            </Button>
            <Button size="sm" variant="ghost" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center - Annotation Tools */}
        {enableAnnotations && (
          <div className="flex items-center space-x-3">
            {/* Annotation mode buttons */}
            <div className="flex items-center space-x-2 border border-gray-300 rounded-lg p-1">
              <Button
                size="sm"
                variant={annotationMode === 'highlight' ? 'default' : 'ghost'}
                onClick={() => handleAnnotationModeChange('highlight')}
              >
                <Palette className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={annotationMode === 'textbox' ? 'default' : 'ghost'}
                onClick={() => handleAnnotationModeChange('textbox')}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={annotationMode === 'drawing' ? 'default' : 'ghost'}
                onClick={() => handleAnnotationModeChange('drawing')}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={annotationMode === 'area' ? 'default' : 'ghost'}
                onClick={() => handleAnnotationModeChange('area')}
              >
                <Move3D className="h-4 w-4" />
              </Button>
            </div>

            {/* Color picker */}
            <ColorPicker
              selectedColor={selectedColor}
              onColorChange={setSelectedColor}
              size="sm"
            />

            {/* Opacity slider for highlights */}
            {annotationMode === 'highlight' && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600">Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-600 min-w-[30px]">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Center - Search Bar */}
        {enableAnnotations && showSearchBar && (
          <div className="flex-1 max-w-md mx-4">
            <SearchBar
              assetId={assetId}
              onResultSelect={handleSearchResultSelect}
              onAdvancedSearch={handleAdvancedSearch}
              placeholder="Search annotations..."
            />
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center space-x-2">
          {enableAnnotations && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={toggleSearchBar}
              title={showSearchBar ? 'Hide search' : 'Show search'}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={rotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
            <Fullscreen className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => window.open(fileUrl, '_blank')}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Floating Annotation Toolbar */}
      {enableAnnotations && showToolbar && (
        <AnnotationToolbar
          currentMode={annotationMode}
          onModeChange={handleModeChange}
          onClearAll={handleClearAll}
          onOCRExtract={handleOCRExtract}
          isVisible={!isFullscreen}
        />
      )}

      {/* PDF Viewer */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="flex items-center space-x-3">
              <Spinner size="sm" />
              <span className="text-sm text-gray-600">Loading PDF...</span>
            </div>
          </div>
        )}
        
        <div className="h-full overflow-auto">
          {enableAnnotations ? (
            <PdfHighlighter
              ref={highlighterRef}
              pdfDocument={fileUrl}
              enableAreaSelection={(content) => annotationMode === 'area'}
              onScrollChange={() => {}}
              scrollRef={(scrollTo) => {
                // Store scroll function for external use
              }}
              highlights={highlights}
              onSelectionFinished={(
                position: ScaledPosition,
                content: Content,
                hideTipAndSelection: () => void,
                transformSelection: () => void
              ) => {
                const highlight: NewHighlight = { content, position }
                handleNewHighlight(highlight)
                hideTipAndSelection()
              }}
              highlightTransform={(
                highlight: PDFHighlight,
                index: number,
                setTip: (tip: React.ReactNode) => void,
                hideTip: () => void,
                viewportToScaled: (rect: any) => any,
                screenshot: (rect: any) => Promise<string>,
                isScrolledTo: boolean
              ) => {
                const isTextHighlight = !highlight.position.boundingRect.height
                
                const component = isTextHighlight ? (
                  <Highlight
                    position={highlight.position}
                    comment={highlight.comment}
                    isScrolledTo={isScrolledTo}
                  />
                ) : (
                  <AreaHighlight
                    highlight={highlight}
                    onChange={(boundingRect) => {
                      // Handle highlight update
                    }}
                    isScrolledTo={isScrolledTo}
                  />
                )
                
                return (
                  <div
                    onClick={() => handleHighlightClick(highlight)}
                    onMouseEnter={() => setTip(renderHighlightPopup(highlight))}
                    onMouseLeave={hideTip}
                  >
                    {component}
                  </div>
                )
              }}
            />
          ) : (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                rotate={rotation}
                loading=""
              />
            </Document>
          )}
        </div>
      </div>

      {/* Voice Annotation Recorder Modal */}
      {showVoiceRecorder && voiceRecordingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div 
            className="relative bg-white rounded-lg shadow-xl"
            style={{
              position: 'absolute',
              left: voiceRecordingPosition.x + 20,
              top: voiceRecordingPosition.y + 20,
              transform: 'none'
            }}
          >
            <VoiceAnnotationRecorder
              onSave={handleVoiceRecordingSave}
              onCancel={handleVoiceRecordingCancel}
              maxDuration={120}
              autoTranscribe={true}
              className="w-80"
            />
          </div>
        </div>
      )}

      {/* OCR Text Extractor Modal */}
      {showOCRExtractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <OCRExtractor
              onExtract={handleOCRResult}
              onCancel={handleOCRCancel}
              pageNumber={currentPage}
              defaultMode="text"
              autoExtract={false}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Advanced Search Modal */}
      {showAdvancedSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <AdvancedSearch
              assetId={assetId}
              onResultSelect={handleSearchResultSelect}
              onClose={handleAdvancedSearchClose}
              showFilters={true}
              maxResults={100}
              className="w-full h-[80vh]"
            />
          </div>
        </div>
      )}
    </div>
  )
})

EnhancedPDFViewer.displayName = 'EnhancedPDFViewer'