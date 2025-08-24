'use client'

import React, { useEffect, useState } from 'react'
import { 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Loader2, 
  RefreshCw,
  Hash
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { 
  useDocumentContext, 
  useDocumentActions, 
  TableOfContentsItem 
} from './DocumentContextProvider'
import { TabContentWrapper, TabEmptyState } from './DocumentTabs'

interface TOCItemProps {
  item: TableOfContentsItem
  level: number
  isExpanded: boolean
  onToggle: (id: string) => void
  onNavigate: (page: number) => void
  currentPage: number
}

function TOCItem({ item, level, isExpanded, onToggle, onNavigate, currentPage }: TOCItemProps) {
  const hasChildren = item.children && item.children.length > 0
  const isCurrentPage = currentPage === item.page

  return (
    <div className="select-none">
      <div 
        className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
          isCurrentPage 
            ? 'bg-blue-50 border border-blue-200' 
            : 'hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onNavigate(item.page)}
      >
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(item.id)
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        
        {!hasChildren && (
          <div className="w-4 h-4 flex items-center justify-center">
            <Hash className="h-2 w-2 text-gray-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span 
              className={`text-sm truncate ${
                isCurrentPage 
                  ? 'font-medium text-blue-700' 
                  : level === 0 
                    ? 'font-medium text-gray-900' 
                    : 'text-gray-700'
              }`}
              title={item.title}
            >
              {item.title}
            </span>
            <Badge 
              variant={isCurrentPage ? 'default' : 'secondary'} 
              className="ml-2 text-xs px-1.5 py-0.5"
            >
              {item.page}
            </Badge>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <TOCItem
              key={child.id}
              item={child}
              level={level + 1}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onNavigate={onNavigate}
              currentPage={currentPage}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TableOfContents() {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)

  // Auto-expand all items on first load
  useEffect(() => {
    if (state.tableOfContents.length > 0 && expandedItems.size === 0) {
      const allIds = new Set<string>()
      const collectIds = (items: TableOfContentsItem[]) => {
        items.forEach(item => {
          allIds.add(item.id)
          if (item.children) {
            collectIds(item.children)
          }
        })
      }
      collectIds(state.tableOfContents)
      setExpandedItems(allIds)
    }
  }, [state.tableOfContents, expandedItems.size])

  // Load TOC on mount if not already loaded
  useEffect(() => {
    if (state.tableOfContents.length === 0 && !state.isLoadingToc && state.assetId) {
      handleGenerateTOC()
    }
  }, [state.assetId])

  const handleToggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleNavigateToPage = (page: number) => {
    actions.goToPage(page)
  }

  const handleGenerateTOC = async () => {
    if (state.isLoadingToc) return
    
    setIsGenerating(true)
    try {
      await actions.loadTableOfContents()
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExpandAll = () => {
    const allIds = new Set<string>()
    const collectIds = (items: TableOfContentsItem[]) => {
      items.forEach(item => {
        allIds.add(item.id)
        if (item.children) {
          collectIds(item.children)
        }
      })
    }
    collectIds(state.tableOfContents)
    setExpandedItems(allIds)
  }

  const handleCollapseAll = () => {
    setExpandedItems(new Set())
  }

  const isLoading = state.isLoadingToc || isGenerating

  if (state.tableOfContents.length === 0 && !isLoading) {
    return (
      <TabContentWrapper>
        <TabEmptyState
          icon={BookOpen}
          title="No Table of Contents"
          description="Generate a smart table of contents from this document using AI analysis."
          action={
            <Button 
              onClick={handleGenerateTOC}
              disabled={isLoading}
              className="mt-2"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate TOC
            </Button>
          }
        />
      </TabContentWrapper>
    )
  }

  return (
    <TabContentWrapper>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Table of Contents</h3>
            {state.tableOfContents.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {state.tableOfContents.length} sections
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            {state.tableOfContents.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExpandAll}
                  className="h-6 text-xs px-2"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCollapseAll}
                  className="h-6 text-xs px-2"
                >
                  Collapse All
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateTOC}
              disabled={isLoading}
              className="h-6 w-6 p-0"
              title="Regenerate TOC"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Analyzing document structure...</span>
          </div>
        )}
      </div>

      {/* TOC Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {state.tableOfContents.map((item) => (
              <TOCItem
                key={item.id}
                item={item}
                level={0}
                isExpanded={expandedItems.has(item.id)}
                onToggle={handleToggleExpanded}
                onNavigate={handleNavigateToPage}
                currentPage={state.currentPage}
              />
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Footer with navigation help */}
      {state.tableOfContents.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 text-center">
            Click any section to navigate • Current: Page {state.currentPage}
          </div>
        </div>
      )}
    </TabContentWrapper>
  )
}