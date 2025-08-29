'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  Filter,
  Calendar,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Tag,
  User,
  FolderOpen,
  HardDrive,
  Clock,
  Eye,
  Download,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  History,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/form/input'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'

export interface SearchFilters {
  query: string
  fileTypes: string[]
  categories: string[]
  folders: string[]
  owners: string[]
  tags: string[]
  dateRange: {
    from?: Date
    to?: Date
  }
  sizeRange: {
    min?: number
    max?: number
  }
  isShared?: boolean
  hasAnnotations?: boolean
  contentSearch: boolean
  sortBy: 'relevance' | 'name' | 'date' | 'size' | 'views'
  sortOrder: 'asc' | 'desc'
}

export interface SearchSuggestion {
  type: 'query' | 'tag' | 'category' | 'folder' | 'owner' | 'recent'
  value: string
  label: string
  count?: number
  description?: string
}

export interface SearchResult {
  id: string
  title: string
  fileName: string
  snippet?: string
  matchedContent?: string[]
  relevanceScore: number
  highlights: {
    title?: string[]
    content?: string[]
    fileName?: string[]
  }
}

interface AdvancedSearchPanelProps {
  onSearch: (filters: SearchFilters) => void
  onClearFilters: () => void
  suggestions?: SearchSuggestion[]
  recentSearches?: string[]
  isSearching?: boolean
  totalResults?: number
  availableFilters: {
    fileTypes: Array<{ value: string; label: string; icon: React.ComponentType }>
    categories: Array<{ value: string; label: string }>
    folders: Array<{ value: string; label: string; path: string }>
    owners: Array<{ value: string; label: string; email: string }>
    tags: string[]
  }
  className?: string
}

const FILE_TYPE_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  jpg: Image,
  jpeg: Image,
  png: Image,
  gif: Image,
  mp4: Video,
  mov: Video,
  avi: Video,
  mp3: Music,
  wav: Music,
  zip: Archive,
  rar: Archive
}

const SIZE_PRESETS = [
  { label: 'Small (< 1MB)', min: 0, max: 1024 * 1024 },
  { label: 'Medium (1-10MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: 'Large (10-50MB)', min: 10 * 1024 * 1024, max: 50 * 1024 * 1024 },
  { label: 'Very Large (> 50MB)', min: 50 * 1024 * 1024, max: undefined }
]

const DATE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 }
]

export function AdvancedSearchPanel({
  onSearch,
  onClearFilters,
  suggestions = [],
  recentSearches = [],
  isSearching = false,
  totalResults = 0,
  availableFilters,
  className = ''
}: AdvancedSearchPanelProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    fileTypes: [],
    categories: [],
    folders: [],
    owners: [],
    tags: [],
    dateRange: {},
    sizeRange: {},
    contentSearch: true,
    sortBy: 'relevance',
    sortOrder: 'desc'
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeDateRange, setActiveDateRange] = useState<string>('')
  const [activeSizeRange, setActiveSizeRange] = useState<string>('')

  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>()

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  const handleFilterChange = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleMultiSelectToggle = useCallback((key: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const currentValues = prev[key] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return {
        ...prev,
        [key]: newValues
      }
    })
  }, [])

  const handleQueryChange = useCallback((query: string) => {
    handleFilterChange('query', query)
    
    // Show suggestions after typing delay
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }
    
    suggestionTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(query.length > 0)
    }, 300)
  }, [handleFilterChange])

  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'query' || suggestion.type === 'recent') {
      handleFilterChange('query', suggestion.value)
    } else {
      handleMultiSelectToggle(suggestion.type + 's' as keyof SearchFilters, suggestion.value)
    }
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }, [handleFilterChange, handleMultiSelectToggle])

  const handleDatePresetSelect = useCallback((preset: typeof DATE_PRESETS[0]) => {
    const to = new Date()
    const from = new Date()
    
    if (preset.days === 0) {
      from.setHours(0, 0, 0, 0)
    } else {
      from.setDate(from.getDate() - preset.days)
    }
    
    handleFilterChange('dateRange', { from, to })
    setActiveDateRange(preset.label)
  }, [handleFilterChange])

  const handleSizePresetSelect = useCallback((preset: typeof SIZE_PRESETS[0]) => {
    handleFilterChange('sizeRange', { min: preset.min, max: preset.max })
    setActiveSizeRange(preset.label)
  }, [handleFilterChange])

  const handleSearch = useCallback(() => {
    onSearch(filters)
    setShowSuggestions(false)
  }, [filters, onSearch])

  const handleClearFilters = useCallback(() => {
    setFilters({
      query: '',
      fileTypes: [],
      categories: [],
      folders: [],
      owners: [],
      tags: [],
      dateRange: {},
      sizeRange: {},
      contentSearch: true,
      sortBy: 'relevance',
      sortOrder: 'desc'
    })
    setActiveDateRange('')
    setActiveSizeRange('')
    onClearFilters()
    searchInputRef.current?.focus()
  }, [onClearFilters])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [handleSearch])

  const activeFilterCount = useMemo(() => {
    return (
      filters.fileTypes.length +
      filters.categories.length +
      filters.folders.length +
      filters.owners.length +
      filters.tags.length +
      (filters.dateRange.from ? 1 : 0) +
      (filters.sizeRange.min !== undefined ? 1 : 0) +
      (filters.isShared !== undefined ? 1 : 0) +
      (filters.hasAnnotations !== undefined ? 1 : 0)
    )
  }, [filters])

  const filteredSuggestions = useMemo(() => {
    if (!filters.query) return suggestions.slice(0, 10)
    
    return suggestions
      .filter(s => 
        s.label.toLowerCase().includes(filters.query.toLowerCase()) ||
        s.value.toLowerCase().includes(filters.query.toLowerCase())
      )
      .slice(0, 10)
  }, [suggestions, filters.query])

  return (
    <Card className={`p-4 ${className}`}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            value={filters.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(filters.query.length > 0)}
            placeholder="Search files and content..."
            className="pl-10 pr-4 h-12"
          />
          
          {filters.contentSearch && (
            <Badge className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 text-blue-800">
              <Sparkles className="h-3 w-3 mr-1" />
              Content
            </Badge>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <Card className="absolute top-full left-0 right-0 mt-1 z-50 p-0 max-h-64 overflow-y-auto">
            <div className="py-2">
              {recentSearches.length > 0 && !filters.query && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 flex items-center">
                    <History className="h-3 w-3 mr-1" />
                    Recent Searches
                  </div>
                  {recentSearches.slice(0, 5).map((search, index) => (
                    <button
                      key={`recent-${index}`}
                      onClick={() => handleSuggestionSelect({ type: 'recent', value: search, label: search })}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center text-sm"
                    >
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      {search}
                    </button>
                  ))}
                  {filteredSuggestions.length > 0 && <hr className="my-2" />}
                </>
              )}
              
              {filteredSuggestions.map((suggestion, index) => {
                const IconComponent = suggestion.type === 'tag' ? Tag :
                                   suggestion.type === 'category' ? BookOpen :
                                   suggestion.type === 'folder' ? FolderOpen :
                                   suggestion.type === 'owner' ? User :
                                   Target

                return (
                  <button
                    key={`suggestion-${index}`}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center">
                      <IconComponent className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{suggestion.label}</span>
                      {suggestion.description && (
                        <span className="ml-2 text-xs text-gray-500">
                          {suggestion.description}
                        </span>
                      )}
                    </div>
                    {suggestion.count !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        {suggestion.count}
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Search Actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center space-x-2">
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-blue-600">
                {activeFilterCount}
              </Badge>
            )}
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {totalResults > 0 && (
          <div className="text-sm text-gray-600">
            {totalResults.toLocaleString()} results
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-6 space-y-6 border-t pt-6">
          {/* File Type Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              File Types
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableFilters.fileTypes.map(type => {
                const IconComponent = type.icon
                const isSelected = filters.fileTypes.includes(type.value)
                
                return (
                  <button
                    key={type.value}
                    onClick={() => handleMultiSelectToggle('fileTypes', type.value)}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm transition-colors
                      ${isSelected 
                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {type.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Category Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Categories
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableFilters.categories.map(category => (
                <div key={category.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={filters.categories.includes(category.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleMultiSelectToggle('categories', category.value)
                      } else {
                        handleFilterChange('categories', filters.categories.filter(c => c !== category.value))
                      }
                    }}
                  />
                  <span className="text-sm">{category.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date Range
              </label>
              <div className="space-y-2">
                {DATE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleDatePresetSelect(preset)}
                    className={`
                      w-full text-left px-3 py-2 rounded text-sm transition-colors
                      ${activeDateRange === preset.label
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    {preset.label}
                  </button>
                ))}
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      initialFocus
                      mode="range"
                      selected={{
                        from: filters.dateRange.from,
                        to: filters.dateRange.to
                      }}
                      onSelect={(range) => {
                        handleFilterChange('dateRange', range || {})
                        setActiveDateRange('')
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Size Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                File Size
              </label>
              <div className="space-y-2">
                {SIZE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleSizePresetSelect(preset)}
                    className={`
                      w-full text-left px-3 py-2 rounded text-sm transition-colors
                      ${activeSizeRange === preset.label
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }
                    `}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Additional Options
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.contentSearch}
                  onCheckedChange={(checked) => handleFilterChange('contentSearch', checked)}
                />
                <span className="text-sm">Search within document content</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.isShared === true}
                  onCheckedChange={(checked) => handleFilterChange('isShared', checked ? true : undefined)}
                />
                <span className="text-sm">Only shared files</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={filters.hasAnnotations === true}
                  onCheckedChange={(checked) => handleFilterChange('hasAnnotations', checked ? true : undefined)}
                />
                <span className="text-sm">Files with annotations</span>
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date Modified</SelectItem>
                  <SelectItem value="size">File Size</SelectItem>
                  <SelectItem value="views">View Count</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order
              </label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => handleFilterChange('sortOrder', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            {filters.fileTypes.map(type => (
              <Badge
                key={`filetype-${type}`}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {type}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('fileTypes', filters.fileTypes.filter(t => t !== type))}
                />
              </Badge>
            ))}
            
            {filters.categories.map(category => (
              <Badge
                key={`category-${category}`}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {availableFilters.categories.find(c => c.value === category)?.label || category}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange('categories', filters.categories.filter(c => c !== category))}
                />
              </Badge>
            ))}

            {filters.dateRange.from && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {activeDateRange || 'Custom date range'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    handleFilterChange('dateRange', {})
                    setActiveDateRange('')
                  }}
                />
              </Badge>
            )}

            {filters.sizeRange.min !== undefined && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {activeSizeRange || 'Custom size range'}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    handleFilterChange('sizeRange', {})
                    setActiveSizeRange('')
                  }}
                />
              </Badge>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}