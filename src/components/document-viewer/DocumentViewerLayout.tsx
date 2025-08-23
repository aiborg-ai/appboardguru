'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Sidebar,
  Search,
  MessageSquare,
  BookOpen,
  Sparkles,
  X
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Separator } from '@/components/atoms/display/separator'
import { Slider } from '@/components/atoms/form/slider'
import { Badge } from '@/components/atoms/display/badge'
import { useDocumentContext, useDocumentState, useDocumentActions } from './DocumentContextProvider'
import { LiveCursorOverlay } from '../organisms/features/LiveCursorOverlay'
import { useLiveCursors } from '../../hooks/useLiveCursors'
import DocumentTabs from './DocumentTabs'
import type { AssetId } from '../../types/database'

interface DocumentViewerLayoutProps {
  children: React.ReactNode
  assetId?: AssetId
  className?: string
}

export default function DocumentViewerLayout({ children, assetId, className = '' }: DocumentViewerLayoutProps) {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()
  const [isToolbarVisible, setIsToolbarVisible] = useState(true)
  const [lastMouseMove, setLastMouseMove] = useState(Date.now())
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Live cursor tracking for document viewing
  const {
    cursors: liveCursors,
    isTracking: isCursorTracking
  } = useLiveCursors({
    assetId: assetId || ('' as AssetId),
    enabled: !!assetId && !state.isFullscreen // Only enable when not in fullscreen
  })

  // Auto-hide toolbar in fullscreen mode
  useEffect(() => {
    if (!state.isFullscreen) {
      setIsToolbarVisible(true)
      return
    }

    const handleMouseMove = () => {
      setLastMouseMove(Date.now())
      setIsToolbarVisible(true)
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsToolbarVisible(false)
      }, 3000)
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [state.isFullscreen])

  const handleZoomChange = (value: number[]) => {
    actions.setZoom(value[0]! / 100)
  }

  const zoomIn = () => {
    const newZoom = Math.min(state.zoom + 0.1, 3)
    actions.setZoom(newZoom)
  }

  const zoomOut = () => {
    const newZoom = Math.max(state.zoom - 0.1, 0.5)
    actions.setZoom(newZoom)
  }

  const goToNextPage = () => {
    if (state.currentPage < state.totalPages) {
      actions.goToPage(state.currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (state.currentPage > 1) {
      actions.goToPage(state.currentPage - 1)
    }
  }

  // Quick action handlers
  const handleQuickSearch = () => {
    actions.setActiveTab('search')
    if (!state.rightPanelOpen) {
      actions.toggleRightPanel()
    }
  }

  const handleOpenAnnotations = () => {
    actions.setActiveTab('annotations')
    if (!state.rightPanelOpen) {
      actions.toggleRightPanel()
    }
  }

  const handleOpenTOC = () => {
    actions.setActiveTab('toc')
    if (!state.rightPanelOpen) {
      actions.toggleRightPanel()
    }
  }

  const handleOpenAIChat = () => {
    actions.setActiveTab('ai-chat')
    if (!state.rightPanelOpen) {
      actions.toggleRightPanel()
    }
  }

  return (
    <div 
      className={`flex h-screen bg-gray-50 relative ${state.isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}
    >
      {/* Main document viewer area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top toolbar */}
        <div 
          className={`flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 transition-transform duration-300 ${
            state.isFullscreen && !isToolbarVisible ? '-translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="flex items-center space-x-4">
            {/* Document title and info */}
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                {state.assetName}
              </h1>
              <Badge variant="secondary" className="text-xs">
                {state.assetType.toUpperCase()}
              </Badge>
            </div>
            
            {/* Page navigation */}
            {state.totalPages > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={state.currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-max">
                  Page {state.currentPage} of {state.totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={state.currentPage >= state.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Toolbar controls */}
          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-24">
                <Slider
                  value={[state.zoom * 100]}
                  onValueChange={handleZoomChange}
                  min={50}
                  max={300}
                  step={10}
                />
              </div>
              <span className="text-xs text-gray-600 min-w-max">
                {Math.round(state.zoom * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Quick actions */}
            <Button variant="ghost" size="sm" onClick={handleOpenTOC} title="Table of Contents">
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleQuickSearch} title="Search">
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenAnnotations} title="Annotations">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenAIChat} title="AI Chat">
              <Sparkles className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-6" />

            {/* View controls */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={actions.toggleRightPanel}
              title={state.rightPanelOpen ? "Hide panel" : "Show panel"}
            >
              <Sidebar className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={actions.toggleFullscreen}
              title={state.isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {state.isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {state.isFullscreen && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={actions.toggleFullscreen}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Document content area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Document viewer */}
          <div 
            ref={containerRef}
            className="h-full w-full bg-gray-100 overflow-auto relative"
            style={{
              transform: `scale(${state.zoom})`,
              transformOrigin: 'top left'
            }}
          >
            {children}
            
            {/* Live cursor overlay for document viewing */}
            {assetId && (
              <LiveCursorOverlay
                assetId={assetId}
                cursors={liveCursors}
                containerRef={containerRef}
                isVisible={isCursorTracking && !state.isFullscreen}
                showSelections={true}
                showUserInfo={true}
                className="absolute inset-0 pointer-events-none"
              />
            )}
          </div>

          {/* Floating collaborators indicator */}
          {state.collaborators.length > 0 && (
            <div className="absolute top-4 left-4 z-10">
              <Card className="p-2 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="flex -space-x-2">
                    {state.collaborators.slice(0, 3).map((collaborator) => (
                      <div
                        key={collaborator.id}
                        className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium ${
                          collaborator.isOnline ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                        }`}
                        title={collaborator.name}
                      >
                        {collaborator.avatar ? (
                          <img 
                            src={collaborator.avatar} 
                            alt={collaborator.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          collaborator.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    ))}
                  </div>
                  {state.collaborators.length > 3 && (
                    <span className="text-xs text-gray-600">
                      +{state.collaborators.length - 3} more
                    </span>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Loading overlay */}
          {(state.isLoadingToc || state.isLoadingSummary || state.isLoadingPodcast) && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-20">
              <Card className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-700">
                    {state.isLoadingToc && "Generating table of contents..."}
                    {state.isLoadingSummary && "Creating summary..."}
                    {state.isLoadingPodcast && "Generating podcast..."}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* Error notification */}
          {state.error && (
            <div className="absolute top-4 right-4 z-30">
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-red-700">{state.error}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={actions.clearError}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div 
          className={`flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-600 transition-transform duration-300 ${
            state.isFullscreen && !isToolbarVisible ? 'translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="flex items-center space-x-4">
            <span>
              {state.annotations.length} annotation{state.annotations.length !== 1 ? 's' : ''}
            </span>
            {state.searchResults.length > 0 && (
              <span>
                {state.searchResults.length} search result{state.searchResults.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {state.summary && (
              <Badge variant="outline" className="text-xs">
                Summary available
              </Badge>
            )}
            {state.podcast && (
              <Badge variant="outline" className="text-xs">
                Podcast ready
              </Badge>
            )}
            {state.tableOfContents.length > 0 && (
              <Badge variant="outline" className="text-xs">
                TOC: {state.tableOfContents.length} items
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      {state.rightPanelOpen && (
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <DocumentTabs />
        </div>
      )}

      {/* Keyboard shortcuts overlay */}
      {state.isFullscreen && (
        <div className="absolute bottom-4 left-4 opacity-0 hover:opacity-100 transition-opacity">
          <Card className="p-3 text-xs text-gray-600">
            <div className="space-y-1">
              <div>Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to exit fullscreen</div>
              <div>Use <kbd className="px-1 py-0.5 bg-gray-100 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-gray-100 rounded">→</kbd> to navigate pages</div>
              <div>Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-gray-100 rounded">F</kbd> to search</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// Export for use in other components
export { DocumentViewerLayout }