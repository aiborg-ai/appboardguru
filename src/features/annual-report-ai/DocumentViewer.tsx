'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Search,
  Maximize2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Evidence {
  id: string
  quote: string
  pageNumber: number
  startChar: number
  endChar: number
  confidence: number
  type: 'positive' | 'warning' | 'negative' | 'neutral'
}

interface DocumentViewerProps {
  documentUrl?: string
  documentContent?: string
  evidences: Evidence[]
  activeEvidenceId?: string
  onEvidenceClick?: (evidenceId: string) => void
  className?: string
}

export function DocumentViewer({
  documentUrl,
  documentContent,
  evidences,
  activeEvidenceId,
  onEvidenceClick,
  className
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)
  const [highlightedRanges, setHighlightedRanges] = useState<Map<string, Evidence>>(new Map())

  // Process evidences and create highlight ranges
  useEffect(() => {
    const rangeMap = new Map<string, Evidence>()
    evidences.forEach(evidence => {
      rangeMap.set(evidence.id, evidence)
    })
    setHighlightedRanges(rangeMap)
  }, [evidences])

  // Scroll to active evidence
  useEffect(() => {
    if (activeEvidenceId && contentRef.current) {
      const element = contentRef.current.querySelector(`[data-evidence-id="${activeEvidenceId}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeEvidenceId])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50))
  }

  const handleResetZoom = () => {
    setZoom(100)
  }

  // Get highlight color based on evidence type
  const getHighlightColor = (type: Evidence['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-200/50 hover:bg-green-300/50 border-green-500'
      case 'warning':
        return 'bg-yellow-200/50 hover:bg-yellow-300/50 border-yellow-500'
      case 'negative':
        return 'bg-red-200/50 hover:bg-red-300/50 border-red-500'
      default:
        return 'bg-blue-200/50 hover:bg-blue-300/50 border-blue-500'
    }
  }

  // Render document content with highlights
  const renderHighlightedContent = () => {
    if (!documentContent) return null

    // This is a simplified version - in production, you'd parse the document
    // and apply highlights based on character positions
    let processedContent = documentContent
    const sortedEvidences = Array.from(highlightedRanges.values()).sort((a, b) => a.startChar - b.startChar)

    return (
      <div className="prose max-w-none">
        {/* Simulate document pages */}
        <div className="space-y-8">
          {/* Sample content with highlights */}
          <div className="bg-white p-8 rounded-lg shadow-sm border">
            <h2 className="text-2xl font-bold mb-4">Annual Report 2024</h2>
            
            {/* Example highlighted sections */}
            {sortedEvidences.map(evidence => (
              <span
                key={evidence.id}
                data-evidence-id={evidence.id}
                className={cn(
                  "inline-block px-1 py-0.5 mx-1 rounded cursor-pointer transition-colors border-l-2",
                  getHighlightColor(evidence.type),
                  activeEvidenceId === evidence.id && "ring-2 ring-offset-2 ring-blue-500"
                )}
                onClick={() => onEvidenceClick?.(evidence.id)}
                title={`Page ${evidence.pageNumber} | Confidence: ${Math.round(evidence.confidence * 100)}%`}
              >
                {evidence.quote}
              </span>
            ))}
            
            {/* Sample document text */}
            <p className="mt-4 text-gray-700">
              The fiscal year 2024 has been marked by significant achievements and strategic progress. 
              Our company has demonstrated resilience and adaptability in a challenging market environment.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Financial Performance</h3>
            <p className="text-gray-700">
              Revenue increased by 23% year-over-year, reaching $2.3 billion, driven by strong performance 
              in our core business segments and successful expansion into new markets.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Strategic Initiatives</h3>
            <p className="text-gray-700">
              We successfully launched three new product lines and entered emerging markets in Southeast Asia,
              establishing partnerships with local distributors and achieving initial market penetration.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Preview
          </CardTitle>
          
          {/* Document Controls */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                className="h-7 w-7 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2 min-w-[3rem] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                className="h-7 w-7 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="h-7 w-7 p-0"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Other Controls */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Evidence Legend */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-500">Highlights:</span>
          <Badge className="bg-green-200/50 text-green-800 text-xs">Positive</Badge>
          <Badge className="bg-yellow-200/50 text-yellow-800 text-xs">Warning</Badge>
          <Badge className="bg-red-200/50 text-red-800 text-xs">Risk</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div 
            ref={contentRef}
            className="p-6"
            style={{ zoom: `${zoom}%` }}
          >
            {documentUrl ? (
              // If we have a PDF URL, we could use a PDF viewer library here
              // For now, we'll render the highlighted content
              renderHighlightedContent()
            ) : (
              renderHighlightedContent()
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}