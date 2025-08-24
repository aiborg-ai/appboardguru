'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  FileText, 
  Building2, 
  Calendar, 
  Package, 
  Users, 
  Clock,
  Star,
  ArrowRight,
  X,
  ChevronDown,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import { Card } from '@/features/shared/ui/card'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/features/shared/ui/dropdown-menu'

interface SearchResult {
  id: string
  type: 'asset' | 'organization' | 'meeting' | 'vault' | 'user'
  title: string
  subtitle: string
  description?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  metadata: {
    createdAt: string
    updatedAt?: string
    owner?: string
    tags?: string[]
    category?: string
    relevance: number
  }
  preview?: {
    thumbnail?: string
    snippet?: string
  }
}

interface SearchFilters {
  types: string[]
  dateRange: 'all' | '1d' | '7d' | '30d' | '90d'
  sortBy: 'relevance' | 'date' | 'name'
  sortOrder: 'asc' | 'desc'
}

interface UniversalSearchProps {
  query?: string
  onQueryChange?: (query: string) => void
  autoFocus?: boolean
  placeholder?: string
  className?: string
}

const searchResultTypes = [
  { value: 'asset', label: 'Assets', icon: FileText, color: 'bg-blue-50 text-blue-700' },
  { value: 'organization', label: 'Organizations', icon: Building2, color: 'bg-purple-50 text-purple-700' },
  { value: 'meeting', label: 'Meetings', icon: Calendar, color: 'bg-green-50 text-green-700' },
  { value: 'vault', label: 'Vaults', icon: Package, color: 'bg-orange-50 text-orange-700' },
  { value: 'user', label: 'Users', icon: Users, color: 'bg-gray-50 text-gray-700' }
]

// Mock search function - replace with actual API call
const performSearch = async (query: string, filters: SearchFilters): Promise<SearchResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  if (!query.trim()) return []
  
  // Mock results
  const mockResults: SearchResult[] = [
    {
      id: '1',
      type: 'asset',
      title: 'Q4 Financial Report 2024',
      subtitle: 'TechVision Solutions',
      description: 'Comprehensive quarterly financial analysis with revenue projections and market insights.',
      href: '/dashboard/assets/1',
      icon: FileText,
      metadata: {
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-16T14:20:00Z',
        owner: 'John Smith',
        tags: ['financial', 'quarterly', 'revenue'],
        category: 'Financial Reports',
        relevance: 0.95
      },
      preview: {
        snippet: 'Revenue increased by 23% compared to Q3, with strong performance in enterprise sales...'
      }
    },
    {
      id: '2',
      type: 'organization',
      title: 'TechVision Solutions',
      subtitle: 'Technology Company',
      description: 'Enterprise software solutions provider with focus on AI and automation.',
      href: '/dashboard/organizations/techvision',
      icon: Building2,
      metadata: {
        createdAt: '2023-06-10T08:00:00Z',
        owner: 'Board Administrator',
        tags: ['technology', 'enterprise', 'ai'],
        relevance: 0.87
      }
    },
    {
      id: '3',
      type: 'meeting',
      title: 'Board Meeting - January 2024',
      subtitle: 'TechVision Solutions',
      description: 'Monthly board meeting to discuss Q4 results and strategic initiatives.',
      href: '/dashboard/meetings/3',
      icon: Calendar,
      metadata: {
        createdAt: '2024-01-20T09:00:00Z',
        owner: 'Sarah Johnson',
        tags: ['board', 'monthly', 'strategy'],
        relevance: 0.78
      }
    },
    {
      id: '4',
      type: 'vault',
      title: 'Executive Documents',
      subtitle: 'TechVision Solutions',
      description: 'Secure vault containing confidential executive documents and strategic plans.',
      href: '/dashboard/vaults/4',
      icon: Package,
      metadata: {
        createdAt: '2023-12-01T12:00:00Z',
        owner: 'Board Secretary',
        tags: ['executive', 'confidential', 'strategic'],
        relevance: 0.72
      }
    },
    {
      id: '5',
      type: 'user',
      title: 'John Smith',
      subtitle: 'Chief Financial Officer',
      description: 'CFO at TechVision Solutions, responsible for financial planning and analysis.',
      href: '/dashboard/boardmates/john-smith',
      icon: Users,
      metadata: {
        createdAt: '2023-05-15T10:00:00Z',
        tags: ['cfo', 'financial', 'executive'],
        relevance: 0.65
      }
    }
  ]
  
  // Filter by type
  let filteredResults = mockResults.filter(result => 
    filters.types.length === 0 || filters.types.includes(result.type)
  )
  
  // Filter by query
  filteredResults = filteredResults.filter(result =>
    result.title.toLowerCase().includes(query.toLowerCase()) ||
    result.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    result.description?.toLowerCase().includes(query.toLowerCase()) ||
    result.metadata.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  )
  
  // Filter by date range
  if (filters.dateRange !== 'all') {
    const now = new Date()
    const dateThreshold = new Date()
    
    switch (filters.dateRange) {
      case '1d':
        dateThreshold.setDate(now.getDate() - 1)
        break
      case '7d':
        dateThreshold.setDate(now.getDate() - 7)
        break
      case '30d':
        dateThreshold.setDate(now.getDate() - 30)
        break
      case '90d':
        dateThreshold.setDate(now.getDate() - 90)
        break
    }
    
    filteredResults = filteredResults.filter(result =>
      new Date(result.metadata.createdAt) >= dateThreshold
    )
  }
  
  // Sort results
  filteredResults.sort((a, b) => {
    let aValue: any, bValue: any
    
    switch (filters.sortBy) {
      case 'relevance':
        aValue = a.metadata.relevance
        bValue = b.metadata.relevance
        break
      case 'date':
        aValue = new Date(a.metadata.updatedAt || a.metadata.createdAt).getTime()
        bValue = new Date(b.metadata.updatedAt || b.metadata.createdAt).getTime()
        break
      case 'name':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      default:
        return 0
    }
    
    if (filters.sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
  
  return filteredResults
}

export default function UniversalSearch({ 
  query: initialQuery = '', 
  onQueryChange,
  autoFocus = false,
  placeholder = "Search across all content...",
  className = ""
}: UniversalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    dateRange: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showFilters, setShowFilters] = useState(false)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim()) {
        setIsLoading(true)
        try {
          const searchResults = await performSearch(query, filters)
          setResults(searchResults)
        } catch (error) {
          console.error('Search error:', error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, filters])

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    onQueryChange?.(newQuery)
  }, [onQueryChange])

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTypeFilter = useCallback((type: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      types: checked 
        ? [...prev.types, type]
        : prev.types.filter(t => t !== type)
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      types: [],
      dateRange: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc'
    })
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTypeConfig = (type: string) => {
    return searchResultTypes.find(t => t.value === type)
  }

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    results.forEach(result => {
      if (!groups[result.type]) {
        groups[result.type] = []
      }
      groups[result.type].push(result)
    })
    return groups
  }, [results])

  const hasActiveFilters = filters.types.length > 0 || filters.dateRange !== 'all'

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoFocus={autoFocus}
            className="pl-10 pr-4 py-3 text-lg"
          />
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filters */}
          <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1">
                    {filters.types.length + (filters.dateRange !== 'all' ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* Content Types */}
              <div className="px-3 py-2">
                <h4 className="text-sm font-medium text-gray-900">Content Types</h4>
              </div>
              {searchResultTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type.value}
                  checked={filters.types.includes(type.value)}
                  onCheckedChange={(checked) => handleTypeFilter(type.value, checked)}
                  className="flex items-center space-x-2 px-3 py-2"
                >
                  <type.icon className="h-4 w-4" />
                  <span>{type.label}</span>
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Date Range */}
              <div className="px-3 py-2">
                <h4 className="text-sm font-medium text-gray-900">Date Range</h4>
              </div>
              {[
                { value: 'all', label: 'All time' },
                { value: '1d', label: 'Last 24 hours' },
                { value: '7d', label: 'Last 7 days' },
                { value: '30d', label: 'Last 30 days' },
                { value: '90d', label: 'Last 90 days' }
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFilterChange('dateRange', option.value)}
                  className={`px-3 py-2 ${filters.dateRange === option.value ? 'bg-blue-50 text-blue-700' : ''}`}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
              
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters} className="px-3 py-2 text-red-600">
                    Clear all filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[
                { value: 'relevance', label: 'Relevance' },
                { value: 'date', label: 'Date' },
                { value: 'name', label: 'Name' }
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFilterChange('sortBy', option.value)}
                  className={filters.sortBy === option.value ? 'bg-blue-50 text-blue-700' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* View Mode */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!isLoading && query && results.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">
            Try adjusting your search terms or filters to find what you're looking for.
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Found <span className="font-medium">{results.length}</span> results for "
              <span className="font-medium">{query}</span>"
            </div>
          </div>

          {/* Results by Type */}
          {Object.entries(groupedResults).map(([type, typeResults]) => {
            const typeConfig = getTypeConfig(type)
            if (!typeConfig) return null

            return (
              <div key={type}>
                <div className="flex items-center space-x-2 mb-4">
                  <typeConfig.icon className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900">
                    {typeConfig.label}
                  </h3>
                  <Badge variant="secondary">{typeResults.length}</Badge>
                </div>

                {viewMode === 'list' ? (
                  <div className="space-y-3">
                    {typeResults.map((result) => (
                      <Card 
                        key={result.id} 
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(result.href)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                            <result.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-medium text-gray-900 truncate">
                                {result.title}
                              </h4>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{result.subtitle}</p>
                            {result.description && (
                              <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                            {result.preview?.snippet && (
                              <p className="text-sm text-gray-400 italic mb-2 line-clamp-1">
                                "{result.preview.snippet}"
                              </p>
                            )}
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(result.metadata.updatedAt || result.metadata.createdAt)}</span>
                              </div>
                              {result.metadata.owner && (
                                <div>By {result.metadata.owner}</div>
                              )}
                              {result.metadata.tags && result.metadata.tags.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  {result.metadata.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typeResults.map((result) => (
                      <Card 
                        key={result.id} 
                        className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(result.href)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                            <result.icon className="h-5 w-5" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-1 truncate">
                          {result.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{result.subtitle}</p>
                        {result.description && (
                          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                            {result.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-400">
                          {formatDate(result.metadata.updatedAt || result.metadata.createdAt)}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}