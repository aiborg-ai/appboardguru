'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PdfHighlighter, Highlight, Popup, AreaHighlight } from 'react-pdf-highlighter-extended'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface PDFViewerWithAnnotationsProps {
  assetId: string
  filePath: string
  annotationMode: 'select' | 'highlight' | 'comment'
  zoom: number
  rotation: number
  onAnnotationCreate?: (annotation: any) => void
}

interface AnnotationData {
  id: string
  content: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  position: any
  type: 'highlight' | 'area' | 'comment'
}

export function PDFViewerWithAnnotations({
  assetId,
  filePath,
  annotationMode,
  zoom,
  rotation,
  onAnnotationCreate
}: PDFViewerWithAnnotationsProps) {
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [highlights, setHighlights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const supabase = createSupabaseBrowserClient()

  // Fetch existing annotations
  const fetchAnnotations = useCallback(async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch annotations')
      }

      setAnnotations(result.data || [])
      
      // Transform annotations to highlights format for react-pdf-highlighter
      const transformedHighlights = (result.data || []).map((annotation: AnnotationData) => ({
        id: annotation.id,
        content: {
          text: annotation.content,
          image: null
        },
        position: annotation.position,
        comment: {
          text: annotation.content,
          emoji: annotation.type === 'highlight' ? '💡' : '💬'
        }
      }))
      
      setHighlights(transformedHighlights)
    } catch (err) {
      console.error('Error fetching annotations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load annotations')
    } finally {
      setLoading(false)
    }
  }, [assetId])

  // Create new annotation
  const handleCreateAnnotation = async (highlight: any, content: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pageNumber: highlight.position.pageNumber,
          annotationType: annotationMode === 'highlight' ? 'highlight' : 'comment',
          content: content,
          position: highlight.position,
          style: {
            color: annotationMode === 'highlight' ? '#ffff00' : '#00ff00',
            opacity: 0.3
          }
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create annotation')
      }

      // Add new highlight to state
      const newHighlight = {
        id: result.data.id,
        content: { text: content },
        position: highlight.position,
        comment: {
          text: content,
          emoji: annotationMode === 'highlight' ? '💡' : '💬'
        }
      }

      setHighlights(prev => [...prev, newHighlight])
      
      // Refresh annotations to get latest data
      fetchAnnotations()
      
      // Notify parent component
      onAnnotationCreate?.(result.data)
    } catch (error) {
      console.error('Error creating annotation:', error)
    }
  }

  // Handle annotation selection
  const handleAnnotationClick = (highlight: any) => {
    console.log('Annotation clicked:', highlight)
    // Could open annotation details or focus on sidebar
  }

  // Real-time annotation updates via Supabase subscription
  useEffect(() => {
    const channel = supabase
      .channel(`annotations:${assetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `asset_id=eq.${assetId}`
        },
        (payload) => {
          console.log('Annotation change:', payload)
          fetchAnnotations() // Refresh annotations on any change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [assetId, fetchAnnotations, supabase])

  // Load annotations on mount
  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchAnnotations}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <PdfHighlighter
        pdfUrl={filePath}
        enableAreaSelection={(event) => annotationMode === 'comment'}
        onScrollChange={() => {}}
        scrollRef={(scrollTo) => {
          // Handle programmatic scrolling
        }}
        onSelectionFinished={(
          position,
          content,
          hideTipAndSelection,
          transformSelection
        ) => {
          if (annotationMode === 'select') return

          // Show popup for annotation input
          return (
            <Popup
              onOpen={transformSelection}
              onConfirm={(content) => {
                handleCreateAnnotation({ position }, content.text)
                hideTipAndSelection()
              }}
              onCancel={hideTipAndSelection}
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
            />
          )
        }}
        highlightTransform={(
          highlight,
          index,
          setTip,
          hideTip,
          viewportToScaled,
          screenshot,
          isScrolledTo
        ) => {
          const isHighlight = highlight.content?.text
          const Component = isHighlight ? Highlight : AreaHighlight

          return (
            <Component
              key={index}
              isScrolledTo={isScrolledTo}
              position={highlight.position}
              comment={highlight.comment}
              onMouseOver={(event) => {
                setTip({
                  position: highlight.position,
                  content: (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg max-w-xs">
                      <p className="text-sm text-gray-900">{highlight.comment?.text}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        Click to view details
                      </div>
                    </div>
                  )
                })
              }}
              onMouseOut={hideTip}
              onClick={() => handleAnnotationClick(highlight)}
              style={{
                background: annotationMode === 'highlight' ? '#ffff0050' : '#00ff0030',
                cursor: 'pointer'
              }}
            />
          )
        }}
        highlights={highlights}
        style={{
          height: '100%',
          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          transformOrigin: 'center center'
        }}
      />
    </div>
  )
}