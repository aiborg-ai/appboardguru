'use client'

import React, { useState, useCallback, useMemo, forwardRef } from 'react'
import { VirtualScrollList, VirtualScrollListRef, VirtualScrollListItem } from './virtual-scroll-list'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Card } from '@/features/shared/ui/card'
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Download,
  Share2,
  Eye,
  User,
  Calendar,
  MessageSquare,
  Building,
  Tag,
  ExternalLink,
  Clock,
  Star,
  Bookmark
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  type: 'asset' | 'boardmate' | 'meeting' | 'vault' | 'organization' | 'annotation' | 'chat'
  content: string
  excerpt: string
  url?: string
  metadata: {
    author?: string
    createdAt: string
    updatedAt?: string
    category?: string
    tags?: string[]
    fileType?: string
    fileSize?: number
    location?: string
    company?: string
    status?: string
    relevanceScore: number
  }
  thumbnail?: string
  highlights?: Array<{
    field: string
    value: string
  }>
}

interface SearchResultsVirtualListProps {
  results: SearchResult[]
  searchTerm: string
  height?: number | string
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onResultClick?: (result: SearchResult) => void
  onSaveResult?: (result: SearchResult) => void
  onShareResult?: (result: SearchResult) => void
  className?: string
  enableSelection?: boolean
  selectedResults?: Set<string>
  onSelectionChange?: (selectedResults: Set<string>) => void
  groupByType?: boolean
}

// Search result item component for virtual list
interface SearchResultItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({ item }) => {
  const result = item.data as SearchResult
  const [isBookmarked, setIsBookmarked] = useState(false)

  const getTypeIcon = (type: string) => {
    const iconProps = { className: "h-4 w-4" }
    
    switch (type) {
      case 'asset':
        return <FileText {...iconProps} />
      case 'boardmate':
        return <User {...iconProps} />
      case 'meeting':
        return <Calendar {...iconProps} />
      case 'vault':
        return <Archive {...iconProps} />
      case 'organization':
        return <Building {...iconProps} />
      case 'annotation':
        return <MessageSquare {...iconProps} />
      case 'chat':
        return <MessageSquare {...iconProps} />
      default:
        return <FileText {...iconProps} />
    }
  }

  const getTypeColor = (type: string) => {
    const colors = {
      'asset': 'bg-blue-50 text-blue-700 border-blue-200',
      'boardmate': 'bg-green-50 text-green-700 border-green-200',
      'meeting': 'bg-purple-50 text-purple-700 border-purple-200',
      'vault': 'bg-orange-50 text-orange-700 border-orange-200',
      'organization': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'annotation': 'bg-pink-50 text-pink-700 border-pink-200',
      'chat': 'bg-cyan-50 text-cyan-700 border-cyan-200'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      'asset': 'Document',
      'boardmate': 'BoardMate',
      'meeting': 'Meeting',
      'vault': 'Vault',
      'organization': 'Organization',
      'annotation': 'Annotation',
      'chat': 'Chat Message'
    }
    return labels[type as keyof typeof labels] || type
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsBookmarked(!isBookmarked)
  }, [isBookmarked])

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onShareResult from props
  }, [])

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onSaveResult from props
  }, [])

  return (
    <Card className="mb-3 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-blue-200">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Thumbnail or Icon */}
          <div className="flex-shrink-0">
            {result.thumbnail ? (
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-12 h-12 object-cover rounded border"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                {getTypeIcon(result.type)}
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={cn('text-xs px-2 py-0.5 border', getTypeColor(result.type))}>
                    {getTypeIcon(result.type)}
                    <span className="ml-1">{getTypeLabel(result.type)}</span>
                  </Badge>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-3 w-3',
                          i < Math.round(result.metadata.relevanceScore * 5)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                    <span className={cn(
                      'text-xs ml-1',
                      getRelevanceColor(result.metadata.relevanceScore)
                    )}>
                      {Math.round(result.metadata.relevanceScore * 100)}%
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                  {result.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {result.excerpt}
                </p>

                {/* Highlights */}
                {result.highlights && result.highlights.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {result.highlights.slice(0, 2).map((highlight, index) => (
                      <div key={index} className="text-xs">
                        <span className="text-gray-500 font-medium">{highlight.field}:</span>
                        <span className="ml-1 text-gray-700" dangerouslySetInnerHTML={{ __html: highlight.value }} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {result.metadata.author && (
                    <span className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {result.metadata.author}
                    </span>
                  )}
                  
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(result.metadata.createdAt)}
                  </span>

                  {result.metadata.fileSize && (
                    <span>{formatFileSize(result.metadata.fileSize)}</span>
                  )}

                  {result.metadata.location && (
                    <span>{result.metadata.location}</span>
                  )}

                  {result.metadata.company && (
                    <span className="flex items-center">
                      <Building className="h-3 w-3 mr-1" />
                      {result.metadata.company}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {result.metadata.tags && result.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {result.metadata.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </span>
                    ))}
                    {result.metadata.tags.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{result.metadata.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-yellow-50 hover:text-yellow-600"
                  onClick={handleBookmark}
                >
                  <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current text-yellow-600')} />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>

                {result.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open(result.url, '_blank')
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Main SearchResultsVirtualList component
export const SearchResultsVirtualList = forwardRef<VirtualScrollListRef, SearchResultsVirtualListProps>(
  ({
    results,
    searchTerm,
    height = 600,
    loading = false,
    hasMore = false,
    onLoadMore,
    onResultClick,
    onSaveResult,
    onShareResult,
    className,
    enableSelection = false,
    selectedResults,
    onSelectionChange,
    groupByType = false
  }, ref) => {

    // Group results by type if enabled
    const processedResults = useMemo(() => {
      if (!groupByType) return results

      const grouped = results.reduce((acc, result) => {
        if (!acc[result.type]) acc[result.type] = []
        acc[result.type].push(result)
        return acc
      }, {} as Record<string, SearchResult[]>)

      // Flatten back to array with type headers
      const flattened: SearchResult[] = []
      Object.entries(grouped).forEach(([type, typeResults]) => {
        // Add a synthetic header item
        flattened.push({
          id: `header-${type}`,
          title: `${typeResults.length} ${type}(s)`,
          type: 'header' as any,
          content: '',
          excerpt: '',
          metadata: {
            createdAt: '',
            relevanceScore: 0
          }
        })
        flattened.push(...typeResults)
      })

      return flattened
    }, [results, groupByType])

    // Convert results to virtual list items
    const virtualItems = useMemo((): VirtualScrollListItem[] => {
      return processedResults.map(result => ({
        id: result.id,
        data: result
      }))
    }, [processedResults])

    // Dynamic height calculation based on content
    const getItemHeight = useCallback((index: number, item: VirtualScrollListItem) => {
      const result = item.data as SearchResult
      
      if (result.type === 'header') {
        return 40
      }
      
      // Base height
      let height = 120
      
      // Add height for highlights
      if (result.highlights && result.highlights.length > 0) {
        height += Math.min(result.highlights.length * 16, 32)
      }
      
      // Add height for tags
      if (result.metadata.tags && result.metadata.tags.length > 0) {
        height += 24
      }
      
      // Add height for longer excerpts
      if (result.excerpt.length > 100) {
        height += 20
      }
      
      // Add padding
      height += 24
      
      return height
    }, [])

    const handleItemClick = useCallback((item: VirtualScrollListItem, index: number) => {
      const result = item.data as SearchResult
      if (result.type !== 'header') {
        onResultClick?.(result)
      }
    }, [onResultClick])

    return (
      <div className={cn('search-results-virtual-list', className)}>
        {/* Search Summary */}
        {results.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">
                  {results.length} results found
                </span>
                {searchTerm && (
                  <span className="text-blue-700">
                    for "{searchTerm}"
                  </span>
                )}
              </div>
              
              {results.length > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <span>Avg relevance:</span>
                  <span className="font-medium">
                    {Math.round(results.reduce((sum, r) => sum + r.metadata.relevanceScore, 0) / results.length * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <VirtualScrollList
          ref={ref}
          items={virtualItems}
          itemComponent={SearchResultItem}
          itemHeight={getItemHeight}
          height={height}
          estimatedItemHeight={150}
          searchTerm={searchTerm}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          enableSelection={enableSelection}
          selectedItems={selectedResults}
          onSelectionChange={onSelectionChange}
          onItemClick={handleItemClick}
          enableKeyboardNavigation={true}
          overscan={3}
          loadMoreThreshold={5}
        />
      </div>
    )
  }
)

SearchResultsVirtualList.displayName = 'SearchResultsVirtualList'

export default SearchResultsVirtualList