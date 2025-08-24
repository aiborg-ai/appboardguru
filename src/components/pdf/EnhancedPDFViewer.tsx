/**
 * Enhanced PDF Viewer Component
 * Advanced PDF viewer with annotation support using react-pdf and react-pdf-highlighter-extended
 * TEMPORARILY DISABLED DUE TO STYLE-LOADER DEPENDENCY ISSUES
 */

'use client'

import React from 'react'
import { Card } from '@/components/molecules/cards/card'
import { cn } from '@/lib/utils'

// Temporary fallback types
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
  // Temporary fallback due to style-loader dependency issues with react-pdf-highlighter-extended
  return (
    <Card className={cn("w-full h-full", className)}>
      <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded p-6">
        <p className="text-gray-600 text-center mb-2">PDF Viewer temporarily disabled</p>
        <p className="text-gray-500 text-sm text-center">
          Working to resolve dependency issues with react-pdf-highlighter-extended
        </p>
        <p className="text-gray-400 text-xs mt-2">File: {fileUrl}</p>
      </div>
    </Card>
  )
})

EnhancedPDFViewer.displayName = 'EnhancedPDFViewer'