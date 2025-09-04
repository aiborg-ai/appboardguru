/**
 * Simple PDF Viewer Component
 * Basic PDF viewer without annotation features for testing
 */

'use client'

import React, { useState } from 'react'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { cn } from '@/lib/utils'
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  FileText
} from 'lucide-react'

type AssetId = string

interface SimplePDFViewerProps {
  assetId: AssetId
  fileUrl: string
  className?: string
  onPageChange?: (page: number) => void
}

export const SimplePDFViewer = React.memo<SimplePDFViewerProps>(function SimplePDFViewer({
  assetId,
  fileUrl,
  className,
  onPageChange
}) {
  const [scale, setScale] = useState(1.0)
  const [currentPage, setCurrentPage] = useState(1)

  // For now, we'll use an iframe to display the PDF
  // This is a simple solution that works without complex dependencies
  
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))
  const resetZoom = () => setScale(1.0)

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium">PDF Document</span>
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

      {/* PDF Content using iframe */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        {fileUrl ? (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              width: `${100 / scale}%`,
              height: `${100 / scale}%`
            }}
            title="PDF Viewer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="h-12 w-12 mb-2" />
            <p>No PDF file specified</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600">
        <span>Document ID: {assetId}</span>
      </div>
    </Card>
  )
})

SimplePDFViewer.displayName = 'SimplePDFViewer'