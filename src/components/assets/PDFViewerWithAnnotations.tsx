'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface PDFViewerWithAnnotationsProps {
  assetId: string
  filePath: string
  annotationMode: 'select' | 'highlight' | 'comment'
  onAnnotationChange?: () => void
}

interface Annotation {
  id: string
  asset_id: string
  created_by: string
  user?: {
    full_name: string
    avatar_url?: string
  }
  annotation_type: 'highlight' | 'area' | 'textbox' | 'drawing' | 'stamp'
  content: {
    text?: string
    image?: string
  }
  position: {
    x: number
    y: number
    width: number
    height: number
    page?: number
  }
  selected_text?: string
  comment_text?: string
  color: string
  opacity: number
  created_at: string
  is_resolved: boolean
  replies?: Array<{
    id: string
    reply_text: string
    user: {
      full_name: string
      avatar_url?: string
    }
    created_at: string
  }>
}

export function PDFViewerWithAnnotations({
  assetId,
  filePath,
  annotationMode,
  onAnnotationChange
}: PDFViewerWithAnnotationsProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowserClient()

  // Fetch annotations from API
  const fetchAnnotations = useCallback(async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations`)
      const data = await response.json()
      
      if (response.ok) {
        setAnnotations(data.annotations || [])
      }
    } catch (error) {
      console.error('Error fetching annotations:', error)
    } finally {
      setLoading(false)
    }
  }, [assetId])

  // Subscribe to real-time annotation updates
  useEffect(() => {
    const channel = supabase
      .channel(`annotations:${assetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asset_annotations',
          filter: `asset_id=eq.${assetId}`,
        },
        () => {
          fetchAnnotations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [assetId, supabase, fetchAnnotations])

  // Initial fetch
  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      {/* Simple PDF iframe viewer for now */}
      <iframe
        src={filePath}
        className="w-full h-full border-0"
        title="PDF Viewer"
      />
      
      {/* Annotation overlay - placeholder for now */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4">
        <p className="text-sm text-gray-600">
          Annotations: {annotations.length}
        </p>
        <p className="text-xs text-gray-500">
          Mode: {annotationMode}
        </p>
      </div>
    </div>
  )
}