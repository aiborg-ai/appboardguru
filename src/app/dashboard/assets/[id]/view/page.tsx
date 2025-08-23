'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DocumentContextProvider } from '@/components/document-viewer/DocumentContextProvider'
import DocumentViewerLayout from '@/components/document-viewer/DocumentViewerLayout'
import { PDFViewerWithAnnotations } from '@/components/features/assets/PDFViewerWithAnnotations'

export default function EnhancedDocumentViewer() {
  const params = useParams()
  const router = useRouter()
  const assetId = params.id as string
  
  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch asset details
  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const response = await fetch(`/api/assets/${assetId}`)
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch asset')
        }
        
        setAsset(result.asset)
      } catch (error) {
        console.error('Error fetching asset:', error)
      } finally {
        setLoading(false)
      }
    }

    if (assetId) {
      fetchAsset()
    }
  }, [assetId])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Asset Not Found</h2>
          <p className="text-gray-600 mb-4">The requested document could not be found.</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Determine document type for context
  const assetType = asset.file_name?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'document'

  return (
    <DocumentContextProvider
      assetId={assetId}
      assetUrl={asset.file_path}
      assetName={asset.title || asset.file_name}
      assetType={assetType}
    >
      <DocumentViewerLayout>
        <PDFViewerWithAnnotations
          assetId={assetId}
          filePath={asset.file_path}
          annotationMode="select"
          onAnnotationChange={() => {
            // Handle new annotation creation
            console.log('Annotation changed')
          }}
        />
      </DocumentViewerLayout>
    </DocumentContextProvider>
  )
}