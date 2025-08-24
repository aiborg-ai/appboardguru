/**
 * AdvancedSearch Component
 * Comprehensive search interface for PDF annotations with filtering and results
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { Spinner } from '@/components/atoms/display/spinner'
import { Separator } from '@/components/atoms/display/separator'
import { 
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Mic,
  Scan,
  MessageSquare,
  Edit3,
  Square,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Hash,
  Download,
  Eye,
  MoreHorizontal,
  ArrowUpDown
} from 'lucide-react'
import { AssetId, AnnotationType, AssetAnnotation } from '@/types/annotation-types'

export interface SearchFilters {
  query: string
  assetId?: AssetId
  annotationType?: AnnotationType
  pageNumber?: number
  userId?: string
  dateFrom?: string
  dateTo?: string
  isPrivate?: boolean
  isResolved?: boolean
  includeReplies: boolean
  searchMode: 'content' | 'comments' | 'transcripts' | 'all'
  sortBy: 'relevance' | 'date' | 'type' | 'user'
  sortOrder: 'asc' | 'desc'
}

export interface SearchResult extends AssetAnnotation {
  searchScore: number
  highlightedContent: {
    highlightedSelectedText?: string
    highlightedCommentText?: string  
    highlightedContentText?: string
    highlightedTranscription?: string
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  filters: SearchFilters
  searchTime: number
  aggregations: {
    types: Record<string, number>
    users: Record<string, number>
    dateRanges: Record<string, number>
  }
}

interface AdvancedSearchProps {
  assetId?: AssetId
  onResultSelect?: (annotation: SearchResult) => void
  onClose?: () => void
  className?: string
  defaultQuery?: string
  showFilters?: boolean
  maxResults?: number
}

type SearchState = 'idle' | 'searching' | 'completed' | 'error'

const annotationTypeIcons = {
  highlight: FileText,
  textbox: MessageSquare,
  voice: Mic,
  drawing: Edit3,
  area: Square,
  stamp: Circle
}

const annotationTypeLabels = {
  highlight: 'Highlight',
  textbox: 'Text Note',
  voice: 'Voice Note', 
  drawing: 'Drawing',
  area: 'Area',
  stamp: 'Stamp'
}

const searchModeOptions = [
  { value: 'all', label: 'All Content', description: 'Search in all fields' },
  { value: 'content', label: 'Text Content', description: 'Search in highlighted text and content' },
  { value: 'comments', label: 'Comments', description: 'Search in annotation comments' },
  { value: 'transcripts', label: 'Voice Transcripts', description: 'Search in voice note transcripts' }
]

export const AdvancedSearch = React.memo<AdvancedSearchProps>(function AdvancedSearch({
  assetId,
  onResultSelect,
  onClose,
  className,
  defaultQuery = '',
  showFilters = true,
  maxResults = 50
}) {
  // State
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())

  // Search filters
  const [filters, setFilters] = useState<SearchFilters>({
    query: defaultQuery,
    assetId,
    annotationType: undefined,
    pageNumber: undefined,
    userId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    isPrivate: undefined,
    isResolved: undefined,
    includeReplies: false,
    searchMode: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc'
  })

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Debounced search
  const performSearch = useCallback(async (searchFilters: SearchFilters) => {
    if (!searchFilters.query.trim()) {
      setSearchResults(null)
      setSearchState('idle')
      return
    }

    setSearchState('searching')
    setError(null)

    try {
      const params = new URLSearchParams()
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/search/annotations?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Search failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setSearchResults(data.data)
        setSearchState('completed')
      } else {
        throw new Error(data.error || 'Search failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'
      setError(errorMessage)
      setSearchState('error')
    }
  }, [])

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (filters.query.trim().length > 0) {
        performSearch(filters)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [filters, performSearch])

  // Handle filter changes
  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Handle result selection
  const handleResultClick = useCallback((result: SearchResult) => {
    onResultSelect?.(result)
  }, [onResultSelect])

  // Toggle result selection for bulk operations
  const toggleResultSelection = useCallback((resultId: string) => {
    setSelectedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }, [])

  // Clear search
  const handleClearSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, query: '' }))
    setSearchResults(null)
    setSearchState('idle')
    setError(null)
    setSelectedResults(new Set())
    searchInputRef.current?.focus()
  }, [])

  // Format search result content with highlights
  const formatHighlightedContent = useCallback((result: SearchResult): React.ReactNode => {
    const { highlightedContent } = result
    
    const renderHighlightedText = (html: string) => (
      <span 
        dangerouslySetInnerHTML={{ __html: html }} 
        className="prose prose-sm max-w-none"
      />
    )

    const contents: React.ReactNode[] = []

    if (highlightedContent.highlightedSelectedText) {
      contents.push(
        <div key="selected" className="mb-2">
          <div className="text-xs font-medium text-gray-500 mb-1">Selected Text:</div>
          {renderHighlightedText(highlightedContent.highlightedSelectedText)}
        </div>
      )
    }

    if (highlightedContent.highlightedCommentText) {
      contents.push(
        <div key="comment" className="mb-2">
          <div className="text-xs font-medium text-gray-500 mb-1">Comment:</div>
          {renderHighlightedText(highlightedContent.highlightedCommentText)}
        </div>
      )
    }

    if (highlightedContent.highlightedContentText) {
      contents.push(
        <div key="content" className="mb-2">
          <div className="text-xs font-medium text-gray-500 mb-1">Content:</div>
          {renderHighlightedText(highlightedContent.highlightedContentText)}
        </div>
      )
    }

    if (highlightedContent.highlightedTranscription) {
      contents.push(
        <div key="transcript" className="mb-2">
          <div className="text-xs font-medium text-gray-500 mb-1">Voice Transcript:</div>
          {renderHighlightedText(highlightedContent.highlightedTranscription)}
        </div>
      )
    }

    return contents.length > 0 ? contents : (
      <div className="text-sm text-gray-600">
        {result.commentText || result.selectedText || 'No preview available'}
      </div>
    )
  }, [])

  // Get search statistics
  const searchStats = useMemo(() => {
    if (!searchResults) return null

    return {
      total: searchResults.total,
      showing: searchResults.results.length,
      searchTime: searchResults.searchTime,
      hasMore: searchResults.results.length < searchResults.total
    }
  }, [searchResults])

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Advanced Search</h3>
        </div>
        
        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            placeholder="Search annotations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {filters.query && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Search Mode */}
        <div className="flex items-center space-x-2 mt-3">
          <span className="text-sm font-medium text-gray-700">Search in:</span>
          <select
            value={filters.searchMode}
            onChange={(e) => updateFilter('searchMode', e.target.value as SearchFilters['searchMode'])}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {searchModeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="border-b border-gray-100">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Advanced Filters</span>
            </div>
            {showAdvancedFilters ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showAdvancedFilters && (
            <div className="p-4 bg-gray-50 space-y-4">
              {/* Annotation Type Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Annotation Type:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateFilter('annotationType', undefined)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-full border',
                      !filters.annotationType 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    )}
                  >
                    All Types
                  </button>
                  {(Object.entries(annotationTypeLabels) as [AnnotationType, string][]).map(([type, label]) => {
                    const Icon = annotationTypeIcons[type]
                    return (
                      <button
                        key={type}
                        onClick={() => updateFilter('annotationType', filters.annotationType === type ? undefined : type)}
                        className={cn(
                          'flex items-center space-x-1 px-3 py-1 text-xs rounded-full border',
                          filters.annotationType === type
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    From Date:
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => updateFilter('dateFrom', e.target.value || undefined)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    To Date:
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => updateFilter('dateTo', e.target.value || undefined)}
                    className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                  />
                </div>
              </div>

              {/* Additional Options */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.includeReplies}
                    onChange={(e) => updateFilter('includeReplies', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include replies in search</span>
                </label>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="privacy"
                      checked={filters.isPrivate === undefined}
                      onChange={() => updateFilter('isPrivate', undefined)}
                    />
                    <span className="text-sm text-gray-700">All annotations</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="privacy"
                      checked={filters.isPrivate === false}
                      onChange={() => updateFilter('isPrivate', false)}
                    />
                    <span className="text-sm text-gray-700">Public only</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="privacy"
                      checked={filters.isPrivate === true}
                      onChange={() => updateFilter('isPrivate', true)}
                    />
                    <span className="text-sm text-gray-700">Private only</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Results Header */}
        {searchResults && (
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>
                  Showing {searchStats?.showing} of {searchStats?.total} results
                </span>
                <span>
                  ({searchStats?.searchTime}ms)
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-') as [SearchFilters['sortBy'], SearchFilters['sortOrder']]
                    setFilters(prev => ({ ...prev, sortBy, sortOrder }))
                  }}
                  className="text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="relevance-desc">Most Relevant</option>
                  <option value="date-desc">Newest First</option>
                  <option value="date-asc">Oldest First</option>
                  <option value="type-asc">By Type</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {searchState === 'searching' && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <Spinner className="h-6 w-6" />
              <span className="text-sm text-gray-600">Searching annotations...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {searchState === 'error' && error && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <div className="text-red-600 mb-2">Search Error</div>
              <div className="text-sm text-gray-600">{error}</div>
            </div>
          </div>
        )}

        {/* No Results */}
        {searchState === 'completed' && searchResults && searchResults.results.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-600 mb-2">No annotations found</div>
              <div className="text-sm text-gray-500">
                Try adjusting your search terms or filters
              </div>
            </div>
          </div>
        )}

        {/* Results List */}
        {searchResults && searchResults.results.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {searchResults.results.map((result) => {
                const Icon = annotationTypeIcons[result.annotationType]
                const isSelected = selectedResults.has(result.id)
                
                return (
                  <div
                    key={result.id}
                    className={cn(
                      'p-4 hover:bg-gray-50 cursor-pointer transition-colors',
                      isSelected && 'bg-blue-50 border-l-4 border-blue-500'
                    )}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Annotation Type Icon */}
                      <div className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        result.annotationType === 'voice' && 'bg-purple-100 text-purple-600',
                        result.annotationType === 'highlight' && 'bg-yellow-100 text-yellow-600',
                        result.annotationType === 'textbox' && 'bg-blue-100 text-blue-600',
                        result.annotationType === 'drawing' && 'bg-green-100 text-green-600',
                        result.annotationType === 'area' && 'bg-red-100 text-red-600',
                        result.annotationType === 'stamp' && 'bg-orange-100 text-orange-600'
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {annotationTypeLabels[result.annotationType]}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Page {result.pageNumber}
                            </span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">
                              {result.user.fullName}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                            >
                              {result.searchScore}/10
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(result.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Highlighted Content */}
                        <div className="text-sm">
                          {formatHighlightedContent(result)}
                        </div>

                        {/* Asset Info */}
                        {result.assets && (
                          <div className="mt-2 text-xs text-gray-500">
                            📄 {result.assets.file_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Search Aggregations */}
      {searchResults?.aggregations && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-3">Search Insights</div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-600 mb-1">By Type:</div>
              {Object.entries(searchResults.aggregations.types).slice(0, 3).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span>{annotationTypeLabels[type as AnnotationType] || type}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-medium text-gray-600 mb-1">Date Range:</div>
              {Object.entries(searchResults.aggregations.dateRanges).slice(0, 3).map(([range, count]) => (
                <div key={range} className="flex justify-between">
                  <span className="capitalize">{range.replace('_', ' ')}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-medium text-gray-600 mb-1">Activity:</div>
              <div className="flex justify-between">
                <span>Total Results</span>
                <span>{searchResults.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Search Time</span>
                <span>{searchResults.searchTime}ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
})

AdvancedSearch.displayName = 'AdvancedSearch'