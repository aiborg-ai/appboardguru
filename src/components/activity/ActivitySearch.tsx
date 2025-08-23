'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Input } from '@/components/atoms/form/input'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, Clock, User, FileText, Download, Sparkles } from 'lucide-react'
import { debounce } from 'lodash'

interface SearchResult {
  id: string
  eventType: string
  entityType: string
  entityId: string
  timestamp: string
  userId: string
  userName: string
  userEmail: string
  metadata: Record<string, unknown>
  relevanceScore: number
  context: string
  correlationId: string
}

interface SearchTemplate {
  id: string
  name: string
  description: string
  query: string
  filters: Record<string, unknown>
}

interface ActivitySearchProps {
  organizationId: string
  onResultSelect?: (result: SearchResult) => void
}

const SEARCH_TEMPLATES: SearchTemplate[] = [
  {
    id: 'recent-uploads',
    name: 'Recent Uploads',
    description: 'Files uploaded in the last 24 hours',
    query: 'uploaded files last 24 hours',
    filters: { eventTypes: ['asset_upload'], timeRange: '24h' }
  },
  {
    id: 'high-activity-users',
    name: 'Active Users',
    description: 'Users with high activity today',
    query: 'most active users today',
    filters: { timeRange: '24h', groupBy: 'user' }
  },
  {
    id: 'security-events',
    name: 'Security Events',
    description: 'Login and authentication activities',
    query: 'login logout security events',
    filters: { eventTypes: ['user_login', 'user_logout', 'failed_login'] }
  },
  {
    id: 'vault-activity',
    name: 'Vault Activity',
    description: 'Vault creation and modification',
    query: 'vault created modified',
    filters: { eventTypes: ['vault_create', 'vault_update'], entityTypes: ['vault'] }
  }
]

export function ActivitySearch({ organizationId, onResultSelect }: ActivitySearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [filters, setFilters] = useState({
    timeRange: '7d',
    eventTypes: [] as string[],
    entityTypes: [] as string[]
  })
  const [naturalLanguageMode, setNaturalLanguageMode] = useState(true)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const performSearch = useCallback(async (searchQuery: string, searchFilters: any = {}) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch('/api/activity/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          organizationId,
          naturalLanguage: naturalLanguageMode,
          filters: { ...filters, ...searchFilters },
          limit: 50
        })
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.results || [])
      } else {
        console.error('Search failed:', data.error)
        setResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [organizationId, filters, naturalLanguageMode])

  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => performSearch(searchQuery), 300),
    [performSearch]
  )

  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query)
    } else {
      setResults([])
    }
  }, [query, debouncedSearch])

  const handleTemplateSelect = (templateId: string) => {
    const template = SEARCH_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setQuery(template.query)
      setFilters(prev => ({ ...prev, ...template.filters }))
      performSearch(template.query, template.filters)
    }
  }

  const exportResults = () => {
    if (results.length === 0) return

    const csv = [
      'Timestamp,User,Event Type,Entity Type,Entity ID,Relevance Score,Context',
      ...results.map(result => [
        result.timestamp,
        result.userName,
        result.eventType,
        result.entityType,
        result.entityId,
        result.relevanceScore.toFixed(2),
        result.context.replace(/"/g, '""')
      ].join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-search-results-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatEventDescription = (result: SearchResult) => {
    const { eventType, entityType, metadata, userName } = result
    
    switch (eventType) {
      case 'asset_view':
        return `${userName} viewed ${entityType} "${metadata.title || metadata.name || 'Untitled'}"`
      case 'asset_upload':
        return `${userName} uploaded ${entityType} "${metadata.fileName || 'file'}"`
      case 'vault_create':
        return `${userName} created vault "${metadata.name || 'Untitled'}"`
      case 'annotation_create':
        return `${userName} added annotation`
      default:
        return `${userName} performed ${eventType} on ${entityType}`
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Activity Search
          {naturalLanguageMode && <Sparkles className="h-4 w-4 text-yellow-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={naturalLanguageMode ? 
                "Ask anything: 'Who uploaded files yesterday?' or 'Show me vault activity'" :
                "Search events, users, or entities..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={naturalLanguageMode ? 'default' : 'outline'}
              onClick={() => setNaturalLanguageMode(!naturalLanguageMode)}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Natural Language
            </Button>
            <Select value={filters.timeRange} onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Templates */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick searches:</p>
            <div className="flex flex-wrap gap-2">
              {SEARCH_TEMPLATES.map(template => (
                <Button
                  key={template.id}
                  size="sm"
                  variant={selectedTemplate === template.id ? 'default' : 'outline'}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isSearching ? 'Searching...' : 
               results.length > 0 ? `${results.length} results found` : 
               query.trim() ? 'No results found' : 'Enter a search query above'}
            </p>
            {results.length > 0 && (
              <Button size="sm" variant="outline" onClick={exportResults}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onResultSelect?.(result)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{result.eventType.replace('_', ' ')}</Badge>
                        <Badge variant="outline">{result.entityType}</Badge>
                        <span className={`text-xs font-medium ${getConfidenceColor(result.relevanceScore)}`}>
                          {(result.relevanceScore * 100).toFixed(0)}% match
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">
                        {formatEventDescription(result)}
                      </p>
                      
                      {result.context && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {result.context}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(result.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {result.userName}
                        </span>
                        <span>ID: {result.correlationId.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {!isSearching && query.trim() && results.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No results found</p>
                  <p className="text-sm">Try adjusting your search terms or time range</p>
                  {naturalLanguageMode && (
                    <p className="text-xs mt-2">
                      Try queries like: "files uploaded yesterday", "who accessed vault X", "login activity this week"
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}