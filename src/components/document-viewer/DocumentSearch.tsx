'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ArrowRight,
  Filter,
  Settings,
  Loader2,
  FileText,
  MapPin,
  RotateCcw,
  Copy,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Input } from '@/components/atoms/form/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/atoms/display/separator'
import { Checkbox } from '@/components/atoms/form/checkbox'
import { SearchInput } from '@/components/molecules/forms/SearchInput/SearchInput'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  useDocumentContext, 
  useDocumentActions, 
  DocumentSearchResult 
} from './DocumentContextProvider'
import { TabContentWrapper, TabEmptyState } from './DocumentTabs'

interface SearchResultCardProps {
  result: DocumentSearchResult
  index: number
  total: number
  onNavigate: (page: number, coordinates?: DocumentSearchResult['coordinates']) => void
  onCopyText: (text: string) => void
  currentPage: number
  searchQuery: string
}

function SearchResultCard({ 
  result, 
  index, 
  total, 
  onNavigate, 
  onCopyText, 
  currentPage,
  searchQuery 
}: SearchResultCardProps) {
  const isCurrentPage = result.page === currentPage

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-200 px-1 rounded">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    )
  }

  return (
    <Card className={`p-3 transition-all cursor-pointer hover:bg-gray-50 ${
      isCurrentPage ? 'ring-2 ring-blue-200 bg-blue-50' : ''
    }`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Page {result.page}
            </Badge>
            <span className="text-xs text-gray-500">
              Result {index + 1} of {total}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onCopyText(result.text)
              }}
              className="h-6 w-6 p-0"
              title="Copy text"
            >
              <Copy className="h-3 w-3" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(result.page, result.coordinates)}
              className="h-6 w-6 p-0"
              title="Go to result"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Main result text */}
        <div 
          className="text-sm cursor-pointer"
          onClick={() => onNavigate(result.page, result.coordinates)}
        >
          <div className="font-medium text-gray-900 mb-1">
            {highlightText(result.text, searchQuery)}
          </div>
          
          {/* Context */}
          {result.context && result.context !== result.text && (
            <div className="text-xs text-gray-600 line-clamp-2">
              ...{highlightText(result.context, searchQuery)}...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3" />
            <span>
              Position: {Math.round(result.coordinates.x)}, {Math.round(result.coordinates.y)}
            </span>
          </div>
          
          {isCurrentPage && (
            <Badge variant="secondary" className="text-xs">
              Current page
            </Badge>
          )}
        </div>
      </div>
    </Card>
  )
}

interface SearchOptionsProps {
  caseSensitive: boolean
  wholeWords: boolean
  useRegex: boolean
  onCaseSensitiveChange: (value: boolean) => void
  onWholeWordsChange: (value: boolean) => void
  onUseRegexChange: (value: boolean) => void
}

function SearchOptions({
  caseSensitive,
  wholeWords,
  useRegex,
  onCaseSensitiveChange,
  onWholeWordsChange,
  onUseRegexChange
}: SearchOptionsProps) {
  return (
    <Card className="p-3 bg-gray-50">
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Settings className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Search Options</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="caseSensitive"
              checked={caseSensitive}
              onCheckedChange={onCaseSensitiveChange}
            />
            <label htmlFor="caseSensitive" className="text-sm text-gray-700">
              Case sensitive
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="wholeWords"
              checked={wholeWords}
              onCheckedChange={onWholeWordsChange}
            />
            <label htmlFor="wholeWords" className="text-sm text-gray-700">
              Whole words only
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="useRegex"
              checked={useRegex}
              onCheckedChange={onUseRegexChange}
            />
            <label htmlFor="useRegex" className="text-sm text-gray-700">
              Use regular expressions
            </label>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function DocumentSearch() {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()
  const [localQuery, setLocalQuery] = useState(state.searchQuery)
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWords, setWholeWords] = useState(false)
  const [useRegex, setUseRegex] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus search input when tab is opened
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])

  // Update local query when state changes
  useEffect(() => {
    setLocalQuery(state.searchQuery)
  }, [state.searchQuery])

  // Reset current result index when search results change
  useEffect(() => {
    setCurrentResultIndex(0)
  }, [state.searchResults])

  const handleSearch = async (query: string) => {
    setLocalQuery(query)
    if (query.trim()) {
      await actions.searchInDocument(query.trim())
    } else {
      await actions.searchInDocument('')
    }
  }

  const handleVoiceTranscription = (text: string) => {
    const newQuery = localQuery + (localQuery ? ' ' : '') + text
    setLocalQuery(newQuery)
    handleSearch(newQuery)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(localQuery)
    } else if (e.key === 'Escape') {
      setLocalQuery('')
      handleSearch('')
    }
  }

  const handleClearSearch = () => {
    setLocalQuery('')
    handleSearch('')
    setCurrentResultIndex(0)
  }

  const handleNavigateToResult = (page: number, coordinates?: DocumentSearchResult['coordinates']) => {
    actions.goToPage(page)
    // Here you would typically also scroll to the specific coordinates
    // This would require additional integration with the PDF viewer
  }

  const handleNextResult = () => {
    if (state.searchResults.length > 0) {
      const nextIndex = (currentResultIndex + 1) % state.searchResults.length
      setCurrentResultIndex(nextIndex)
      const result = state.searchResults[nextIndex]
      if (result) {
        handleNavigateToResult(result.page, result.coordinates)
      }
    }
  }

  const handlePreviousResult = () => {
    if (state.searchResults.length > 0) {
      const prevIndex = currentResultIndex === 0 ? state.searchResults.length - 1 : currentResultIndex - 1
      setCurrentResultIndex(prevIndex)
      const result = state.searchResults[prevIndex]
      if (result) {
        handleNavigateToResult(result.page, result.coordinates)
      }
    }
  }

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const groupResultsByPage = (results: DocumentSearchResult[]) => {
    const grouped = results.reduce((acc, result) => {
      if (!acc[result.page]) {
        acc[result.page] = []
      }
      acc[result.page]!.push(result)
      return acc
    }, {} as Record<number, DocumentSearchResult[]>)

    return Object.entries(grouped)
      .map(([page, results]) => ({ page: parseInt(page), results }))
      .sort((a, b) => a.page - b.page)
  }

  const groupedResults = groupResultsByPage(state.searchResults)

  return (
    <TabContentWrapper>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Search Document</h3>
          </div>

          {/* Search input */}
          <div className="relative">
            <SearchInput
              ref={searchInputRef}
              placeholder="Search for text in document..."
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              onKeyDown={handleKeyPress}
              className="pr-20"
              showClearButton={false}
              showVoiceInput={true}
              loading={state.isSearching}
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {state.isSearching && (
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              )}
              
              {localQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOptions(!showOptions)}
                className="h-6 w-6 p-0"
                title="Search options"
              >
                <Filter className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Search options */}
          <Collapsible open={showOptions} onOpenChange={setShowOptions}>
            <CollapsibleContent>
              <SearchOptions
                caseSensitive={caseSensitive}
                wholeWords={wholeWords}
                useRegex={useRegex}
                onCaseSensitiveChange={setCaseSensitive}
                onWholeWordsChange={setWholeWords}
                onUseRegexChange={setUseRegex}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Search results summary */}
          {state.searchResults.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  {state.searchResults.length} results
                </Badge>
                <span className="text-xs text-gray-600">
                  in {groupedResults.length} pages
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousResult}
                  disabled={state.searchResults.length === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                
                <span className="text-xs text-gray-600 min-w-max">
                  {state.searchResults.length > 0 ? currentResultIndex + 1 : 0} of {state.searchResults.length}
                </span>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextResult}
                  disabled={state.searchResults.length === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {state.searchResults.length === 0 && !state.isSearching && !state.searchQuery ? (
          <TabEmptyState
            icon={Search}
            title="Search the Document"
            description="Enter keywords to find specific content within this document. Use the search options for advanced filtering."
            action={
              <Button 
                onClick={() => searchInputRef.current?.focus()}
                className="mt-2"
                variant="outline"
              >
                <Search className="h-4 w-4 mr-2" />
                Start Searching
              </Button>
            }
          />
        ) : state.searchResults.length === 0 && state.searchQuery && !state.isSearching ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No Results Found</h3>
            <p className="text-xs text-gray-600 mb-4">
              No matches found for "{state.searchQuery}". Try different keywords or check your search options.
            </p>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearSearch}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear Search
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowOptions(true)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Search Options
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {groupedResults.map(({ page, results }) => (
                <div key={page} className="space-y-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">Page {page}</span>
                    <Badge variant="outline" className="text-xs">
                      {results.length} result{results.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 ml-6">
                    {results.map((result, index) => {
                      const globalIndex = state.searchResults.indexOf(result)
                      return (
                        <SearchResultCard
                          key={`${result.page}-${index}`}
                          result={result}
                          index={globalIndex}
                          total={state.searchResults.length}
                          onNavigate={handleNavigateToResult}
                          onCopyText={handleCopyText}
                          currentPage={state.currentPage}
                          searchQuery={state.searchQuery}
                        />
                      )
                    })}
                  </div>
                  
                  {page !== groupedResults[groupedResults.length - 1]?.page && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {state.searchResults.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 text-center">
            Use ↑↓ to navigate results • Press Enter to search • Esc to clear
          </div>
        </div>
      )}
    </TabContentWrapper>
  )
}