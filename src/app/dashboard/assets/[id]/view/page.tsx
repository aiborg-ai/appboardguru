'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  MessageSquare, 
  Highlighter,
  Type,
  MousePointer,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Users,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { PDFViewerWithAnnotations } from '@/components/assets/PDFViewerWithAnnotations'
import { AnnotationSidebar } from '@/components/assets/AnnotationSidebar'
import { CollaboratorsList } from '@/components/assets/CollaboratorsList'

export default function FullPagePDFViewer() {
  const params = useParams()
  const router = useRouter()
  const assetId = params.id as string
  
  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [annotationMode, setAnnotationMode] = useState<'select' | 'highlight' | 'comment'>('select')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)

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

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  // Handle download
  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/download`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = asset?.file_name || 'document.pdf'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  // Handle share
  const handleShare = async () => {
    // TODO: Implement sharing modal
    console.log('Share functionality coming soon')
  }

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

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {asset.title}
              </h1>
              <p className="text-sm text-gray-500">
                {asset.file_name} • {(asset.file_size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
            
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {asset.category?.replace('_', ' ') || 'Document'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Annotation Tools */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAnnotationMode('select')}
              className={`p-2 rounded-md transition-colors ${
                annotationMode === 'select' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Select"
            >
              <MousePointer className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAnnotationMode('highlight')}
              className={`p-2 rounded-md transition-colors ${
                annotationMode === 'highlight' 
                  ? 'bg-white text-yellow-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAnnotationMode('comment')}
              className={`p-2 rounded-md transition-colors ${
                annotationMode === 'comment' 
                  ? 'bg-white text-green-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Add Comment"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>

          {/* View Controls */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700 min-w-[4rem] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-white"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-white"
              title="Rotate"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => setShowCollaborators(!showCollaborators)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Users className="h-4 w-4 mr-2" />
            Collaborators
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </button>

          <button
            onClick={handleShare}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            {showSidebar ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 relative">
          <PDFViewerWithAnnotations
            assetId={assetId}
            filePath={asset.file_path}
            annotationMode={annotationMode}
            onAnnotationChange={() => {
              // Handle new annotation creation
              console.log('Annotation changed')
            }}
          />
        </div>

        {/* Annotation Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <AnnotationSidebar
              assetId={assetId}
              onAnnotationSelect={(annotation) => {
                // Handle annotation selection to jump to location
                console.log('Selected annotation:', annotation)
              }}
            />
          </div>
        )}

        {/* Collaborators Sidebar */}
        {showCollaborators && (
          <div className="w-64 bg-white border-l border-gray-200">
            <CollaboratorsList
              assetId={assetId}
              onClose={() => setShowCollaborators(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}