/**
 * PDF Viewer Test Page
 * Test page for the enhanced PDF viewer with annotations
 */

'use client'

import React, { useState } from 'react'
import { PDFViewerWithAnnotations } from '@/components/features/assets/PDFViewerWithAnnotations'
import { AnnotationType } from '@/types/annotation-types'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Upload, FileText, Download } from 'lucide-react'

// Sample PDF URLs (you can use any PDF URL for testing)
const samplePDFs = [
  {
    id: 'test-asset-1',
    name: 'Sample PDF Document',
    url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    size: '1.2 MB'
  },
  {
    id: 'test-asset-2', 
    name: 'React Documentation',
    url: 'https://react.dev/learn/react-developer-tools',
    size: '856 KB'
  }
]

export default function TestPDFPage() {
  const [selectedPDF, setSelectedPDF] = useState(samplePDFs[0])
  const [annotationMode, setAnnotationMode] = useState<AnnotationType>('highlight')

  const handlePDFSelect = (pdf: typeof samplePDFs[0]) => {
    setSelectedPDF(pdf)
  }

  const handleAnnotationModeChange = (mode: AnnotationType) => {
    setAnnotationMode(mode)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PDF Viewer Test</h1>
            <p className="text-sm text-gray-600">
              Test the enhanced PDF viewer with annotation capabilities
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* PDF Selection */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Test PDF:</span>
              <div className="flex space-x-2">
                {samplePDFs.map((pdf) => (
                  <Button
                    key={pdf.id}
                    size="sm"
                    variant={selectedPDF.id === pdf.id ? 'default' : 'outline'}
                    onClick={() => handlePDFSelect(pdf)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {pdf.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Current annotation mode */}
            <Badge variant="secondary" className="capitalize">
              Mode: {annotationMode}
            </Badge>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 p-4">
        <Card className="h-full overflow-hidden">
          <PDFViewerWithAnnotations
            assetId={selectedPDF.id}
            filePath={selectedPDF.url}
            annotationMode={annotationMode}
            onAnnotationChange={() => {
              console.log('Annotation changed')
            }}
            className="h-full"
          />
        </Card>
      </div>

      {/* Instructions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="text-center">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            How to Test Annotations
          </h3>
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span>Select text to highlight</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Click anywhere to add notes</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Use toolbar to switch modes</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>View annotations in side panel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}