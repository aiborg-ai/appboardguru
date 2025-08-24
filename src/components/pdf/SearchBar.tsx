/**
 * SearchBar Component
 * Compact search interface for quick annotation searches
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { 
  Search,
  X,
  Filter,
  ArrowRight,
  Clock,
  Loader2
} from 'lucide-react'
import { AssetId } from '@/types/annotation-types'
import { SearchResult } from './AdvancedSearch'

interface SearchBarProps {
  assetId?: AssetId
  onResultSelect?: (annotation: SearchResult) => void
  onAdvancedSearch?: () => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

interface QuickSearchResult {
  results: SearchResult[]
  total: number
  hasMore: boolean
}

export const SearchBar = React.memo<SearchBarProps>(function SearchBar({
  assetId,
  onResultSelect,
  onAdvancedSearch,
  placeholder = "Search annotations...",
  className,
  autoFocus = false
}) {
  // State
  const [query, setQuery] = useState<string>('')
  const [isSearching, setIsSearching] = useState<boolean>(false)
  const [results, setResults] = useState<QuickSearchResult | null>(null)
  const [showResults, setShowResults] = useState<boolean>(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('annotation-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5))
      } catch (e) {
        console.error('Failed to load recent searches:', e)
      }
    }
  }, [])

  // Auto focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Perform quick search
  const performQuickSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        searchMode: 'all',
        limit: '8', // Limit for quick results
        sortBy: 'relevance'
      })

      if (assetId) {
        params.append('assetId', assetId)
      }

      const response = await fetch(`/api/search/annotations?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setResults({
            results: data.data.results,
            total: data.data.total,
            hasMore: data.data.results.length < data.data.total
          })
          setShowResults(true)
          setSelectedIndex(-1)
        }
      }
    } catch (error) {
      console.error('Quick search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [assetId])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        performQuickSearch(query)
      } else {
        setResults(null)
        setShowResults(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, performQuickSearch])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    // Add to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(newRecentSearches)
    localStorage.setItem('annotation-recent-searches', JSON.stringify(newRecentSearches))

    // Hide results and call callback
    setShowResults(false)
    setQuery('')
    onResultSelect?.(result)
  }, [query, recentSearches, onResultSelect])

  // Handle recent search selection
  const handleRecentSearch = useCallback((search: string) => {
    setQuery(search)
    inputRef.current?.focus()
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showResults || !results) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < results.results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results.results[selectedIndex]) {
          handleResultSelect(results.results[selectedIndex])
        } else if (query.trim()) {
          onAdvancedSearch?.()
        }
        break
      case 'Escape':
        setShowResults(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }, [showResults, results, selectedIndex, query, handleResultSelect, onAdvancedSearch])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear search
  const handleClear = useCallback(() => {
    setQuery('')
    setResults(null)
    setShowResults(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }, [])

  // Render result preview
  const renderResultPreview = useCallback((result: SearchResult) => {
    const content = result.highlightedContent?.highlightedSelectedText || 
                   result.highlightedContent?.highlightedCommentText ||
                   result.selectedText || 
                   result.commentText ||
                   'No preview available'

    return (
      <div className="text-sm text-gray-600 line-clamp-2">
        <span dangerouslySetInnerHTML={{ 
          __html: content.length > 80 ? content.substring(0, 80) + '...' : content 
        }} />
      </div>
    )
  }, [])

  return (
    <div className={cn('relative', className)} ref={resultsRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && query.trim()) {
              setShowResults(true)
            }
          }}
          placeholder={placeholder}
          className={cn(
            'w-full pl-10 pr-20 py-2 text-sm border border-gray-300 rounded-lg',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-shadow duration-200'
          )}
        />
        
        {/* Right side controls */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
          )}
          
          {query && !isSearching && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {onAdvancedSearch && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onAdvancedSearch}
              className="h-6 w-6 p-0"
              title="Advanced Search"
            >
              <Filter className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {/* Results */}
          {results && results.results.length > 0 && (
            <>
              <div className="p-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-600">
                {results.total} result{results.total !== 1 ? 's' : ''} found
                {results.hasMore && ' (showing first 8)'}
              </div>
              
              {results.results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className={cn(
                    'w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0',
                    'transition-colors duration-150',
                    selectedIndex === index && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    {/* Type indicator */}
                    <div className={cn(
                      'flex-shrink-0 w-2 h-2 rounded-full mt-2',
                      result.annotationType === 'voice' && 'bg-purple-500',
                      result.annotationType === 'highlight' && 'bg-yellow-500',
                      result.annotationType === 'textbox' && 'bg-blue-500',
                      result.annotationType === 'drawing' && 'bg-green-500',
                      result.annotationType === 'area' && 'bg-red-500',
                      result.annotationType === 'stamp' && 'bg-orange-500'
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            Page {result.pageNumber}
                          </Badge>
                          <span className="text-xs text-gray-500 capitalize">
                            {result.annotationType}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(result.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {renderResultPreview(result)}
                      
                      <div className="text-xs text-gray-500 mt-1">
                        by {result.user.fullName}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {/* View all results */}
              {results.hasMore && onAdvancedSearch && (
                <button
                  onClick={onAdvancedSearch}
                  className="w-full p-3 text-center text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>View all {results.total} results</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              )}
            </>
          )}

          {/* No results */}
          {results && results.results.length === 0 && query.trim() && (
            <div className="p-4 text-center text-gray-500">
              <div className="mb-2">No annotations found</div>
              <div className="text-xs">Try different search terms</div>
            </div>
          )}

          {/* Recent searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <>
              <div className="p-2 border-b border-gray-100 bg-gray-50 text-xs text-gray-600 font-medium">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSearch(search)}
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-700">{search}</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Quick tips */}
          {!query.trim() && recentSearches.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-xs space-y-2">
              <div>Start typing to search annotations</div>
              <div className="flex items-center justify-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>⎋ Close</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

SearchBar.displayName = 'SearchBar'