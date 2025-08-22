'use client'

import React, { useState } from 'react'
import { AnnotationPanel } from '@/components/organisms/annotation-panel'
import { AssetId } from '@/types/annotation-types'

interface PDFViewerWithAnnotationsProps {
  assetId: string
  filePath: string
  annotationMode: 'select' | 'highlight' | 'comment'
  onAnnotationChange?: () => void
}

export function PDFViewerWithAnnotations({
  assetId,
  filePath,
  annotationMode,
  onAnnotationChange
}: PDFViewerWithAnnotationsProps) {
  const [currentPage, setCurrentPage] = useState(1)

  const handleAnnotationSelect = (annotationId: string) => {
    // Handle annotation selection logic
    console.log('Selected annotation:', annotationId)
  }

  const handlePageNavigate = (page: number) => {
    setCurrentPage(page)
    // You could also add logic to actually navigate to the page in the PDF
  }

  return (
    <div className="w-full h-full relative">
      {/* Simple PDF iframe viewer for now */}
      <iframe
        src={filePath}
        className="w-full h-full border-0"
        title="PDF Viewer"
      />
      
      {/* Annotation overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Annotations</h3>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {annotations.length}
          </span>
        </div>
        
        {/* Add Note Button */}
        <button 
          onClick={() => {
            // For now, create a simple test annotation
            const testAnnotation = {
              annotation_type: 'textbox' as const,
              content: { text: 'Test annotation from UI' },
              page_number: 1,
              position: {
                pageNumber: 1,
                rects: [{
                  x1: 100, y1: 100, x2: 300, y2: 150,
                  width: 200, height: 50
                }],
                boundingRect: {
                  x1: 100, y1: 100, x2: 300, y2: 150,
                  width: 200, height: 50
                }
              },
              comment_text: 'Test annotation from UI',
              color: '#FFFF00',
              opacity: 0.3,
              is_private: false
            }
            
            fetch(`/api/assets/${assetId}/annotations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(testAnnotation)
            })
            .then(res => res.json())
            .then(data => {
              console.log('Annotation created:', data)
              // Refresh annotations
              fetchAnnotations()
              if (onAnnotationChange) onAnnotationChange()
            })
            .catch(console.error)
          }}
          className="w-full bg-blue-600 text-white text-sm px-3 py-2 rounded-md hover:bg-blue-700 mb-3"
        >
          Add Test Note
        </button>
        
        {/* Existing Annotations */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {annotations.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No annotations yet</p>
          ) : (
            annotations.map((annotation) => (
              <div key={annotation.id} className="bg-gray-50 p-2 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{annotation.user?.full_name || 'User'}</span>
                  <span className="text-gray-500">p.{annotation.position?.page || 1}</span>
                </div>
                <p className="text-gray-700">
                  {annotation.comment_text || annotation.content?.text || 'No content'}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-400">
                    {new Date(annotation.created_at).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => {
                      if (confirm('Delete this annotation?')) {
                        fetch(`/api/assets/${assetId}/annotations/${annotation.id}`, {
                          method: 'DELETE'
                        })
                        .then(() => {
                          fetchAnnotations()
                          if (onAnnotationChange) onAnnotationChange()
                        })
                        .catch(console.error)
                      }
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Mode: {annotationMode}
          </p>
        </div>
      </div>
    </div>
  )
}