'use client'

import React, { Suspense } from 'react'
import { 
  BookOpen, 
  MessageSquare, 
  Search, 
  Sparkles, 
  Zap,
  X,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Separator } from '@/components/atoms/display/separator'
import { Card } from '@/components/molecules/cards/card'
import { useDocumentContext, useDocumentState, useDocumentActions } from './DocumentContextProvider'

// Lazy load tab content components for better performance
const TableOfContents = React.lazy(() => import('./TableOfContents'))
const EnhancedAnnotations = React.lazy(() => import('./EnhancedAnnotations'))
const DocumentSearch = React.lazy(() => import('./DocumentSearch'))
const DocumentAIChat = React.lazy(() => import('./DocumentAIChat'))
const QuickActions = React.lazy(() => import('./QuickActions'))

// Loading component for tab content
function TabLoadingFallback({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  )
}

// Tab configuration
const tabConfig = [
  {
    id: 'toc' as const,
    label: 'Contents',
    icon: BookOpen,
    description: 'Table of Contents',
    component: TableOfContents
  },
  {
    id: 'annotations' as const,
    label: 'Notes',
    icon: MessageSquare,
    description: 'Annotations & Comments',
    component: EnhancedAnnotations
  },
  {
    id: 'search' as const,
    label: 'Search',
    icon: Search,
    description: 'Find in Document',
    component: DocumentSearch
  },
  {
    id: 'ai-chat' as const,
    label: 'AI Chat',
    icon: Sparkles,
    description: 'Document Assistant',
    component: DocumentAIChat
  },
  {
    id: 'quick-actions' as const,
    label: 'AI Tools',
    icon: Zap,
    description: 'Summary & Podcast',
    component: QuickActions
  }
]

export default function DocumentTabs() {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()

  // Get badge counts for tabs
  const getBadgeCount = (tabId: string) => {
    switch (tabId) {
      case 'toc':
        return state.tableOfContents.length
      case 'annotations':
        return state.annotations.length
      case 'search':
        return state.searchResults.length
      default:
        return 0
    }
  }

  // Check if tab has new content or notifications
  const hasNotification = (tabId: string) => {
    switch (tabId) {
      case 'ai-chat':
        return false // Could be implemented with unread AI messages
      case 'quick-actions':
        return !state.summary || !state.podcast // Show notification if content is available to generate
      default:
        return false
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Document Tools</h2>
          <p className="text-xs text-gray-600 mt-1">
            Explore, annotate, and analyze this document
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={actions.toggleRightPanel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs container */}
      <Tabs 
        value={state.activeTab} 
        onValueChange={(value) => actions.setActiveTab(value as any)}
        className="flex-1 flex flex-col"
      >
        {/* Tab list */}
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white border-b border-gray-200">
          {tabConfig.map((tab) => {
            const Icon = tab.icon
            const badgeCount = getBadgeCount(tab.id)
            const hasNotif = hasNotification(tab.id)
            
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center p-2 h-auto data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 relative"
                title={tab.description}
              >
                <div className="relative">
                  <Icon className="h-4 w-4 mb-1" />
                  {hasNotif && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                  )}
                </div>
                <span className="text-xs font-medium leading-none">{tab.label}</span>
                {badgeCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="mt-1 h-4 text-xs px-1 min-w-[16px] flex items-center justify-center"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Badge>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tabConfig.map((tab) => (
            <TabsContent 
              key={tab.id} 
              value={tab.id} 
              className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <Suspense fallback={<TabLoadingFallback message={`Loading ${tab.label}...`} />}>
                <tab.component />
              </Suspense>
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* Panel footer with quick stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>Document:</span>
            <span className="font-medium">{state.totalPages} pages</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Current:</span>
            <span className="font-medium">Page {state.currentPage}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Zoom:</span>
            <span className="font-medium">{Math.round(state.zoom * 100)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <div className="flex items-center space-x-1">
              {state.collaborators.filter(c => c.isOnline).length > 0 && (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Collaborators online" />
              )}
              <span className="font-medium">
                {state.collaborators.filter(c => c.isOnline).length > 0 ? 'Live' : 'Solo'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick action shortcuts */}
        {state.activeTab !== 'quick-actions' && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => actions.setActiveTab('quick-actions')}
                className="flex-1 h-7 text-xs"
                disabled={state.isLoadingSummary || state.isLoadingPodcast}
              >
                <Zap className="h-3 w-3 mr-1" />
                AI Tools
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Additional utility components for tab content

// Error boundary for tab content
export function TabErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <div className="h-full">
      {children}
    </div>
  )
}

// Empty state component for tabs
export function TabEmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: {
  icon: any
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-xs text-gray-600 mb-4 max-w-sm">{description}</p>
      {action && action}
    </div>
  )
}

// Tab content wrapper with error handling
export function TabContentWrapper({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`h-full flex flex-col overflow-hidden ${className}`}>
      <TabErrorBoundary>
        {children}
      </TabErrorBoundary>
    </div>
  )
}

export { DocumentTabs }