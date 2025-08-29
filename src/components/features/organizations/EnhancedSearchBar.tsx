'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { 
  Search,
  X,
  Clock,
  Zap,
  Building2,
  Users,
  Loader2,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Organization } from '@/types/entities/organization.types'

export interface SearchSuggestion {
  id: string
  type: 'organization' | 'industry' | 'recent' | 'suggestion'
  value: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  metadata?: {
    memberCount?: number
    industry?: string
    matchType?: 'name' | 'description' | 'industry'
  }
}

export interface EnhancedSearchBarProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  organizations: Organization[]
  className?: string
  disabled?: boolean
  highlightTerm?: string
  showSuggestions?: boolean
  recentSearches?: string[]
  onRecentSearchAdd?: (search: string) => void
  onSuggestionClick?: (suggestion: SearchSuggestion) => void
}

interface HighlightedTextProps {
  text: string
  highlight: string
  className?: string
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, highlight, className = '' }) => {
  if (!highlight.trim()) {
    return <span className={className}>{text}</span>
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <span className={className}>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 text-yellow-900 font-medium rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  )
}

export const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = "Search organizations...",
  organizations = [],
  className,
  disabled = false,
  highlightTerm,
  showSuggestions = true,
  recentSearches = [],
  onRecentSearchAdd,
  onSuggestionClick
}) => {
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedValue, setDebouncedValue] = useState(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
      setIsLoading(false)
    }, 300)

    if (value !== debouncedValue) {
      setIsLoading(value.length > 0)
    }

    return () => clearTimeout(timer)
  }, [value, debouncedValue])

  // Generate search suggestions
  const suggestions = useMemo(() => {
    if (!showSuggestions || (!value && recentSearches.length === 0)) {
      return []
    }

    const results: SearchSuggestion[] = []
    const searchTerm = value.toLowerCase().trim()

    // Recent searches (only show when no current search)
    if (!value && recentSearches.length > 0) {
      recentSearches.slice(0, 3).forEach((search, index) => {
        results.push({
          id: `recent-${index}`,
          type: 'recent',
          value: search,
          label: search,
          icon: Clock,
          description: 'Recent search'
        })
      })
    }

    // Organization suggestions
    if (searchTerm) {
      const matchedOrgs = organizations
        .filter(org => {
          const nameMatch = org.name.toLowerCase().includes(searchTerm)
          const descMatch = org.description?.toLowerCase().includes(searchTerm) || false
          const industryMatch = org.industry?.toLowerCase().includes(searchTerm) || false
          return nameMatch || descMatch || industryMatch
        })
        .slice(0, 5)
        .map(org => {
          let matchType: 'name' | 'description' | 'industry' = 'name'
          if (org.description?.toLowerCase().includes(searchTerm)) matchType = 'description'
          if (org.industry?.toLowerCase().includes(searchTerm)) matchType = 'industry'

          return {
            id: `org-${org.id}`,
            type: 'organization' as const,
            value: org.name,
            label: org.name,
            description: org.description || undefined,
            icon: Building2,
            metadata: {
              memberCount: (org as any).memberCount,
              industry: org.industry,
              matchType
            }
          }
        })

      results.push(...matchedOrgs)

      // Industry suggestions
      const industries = Array.from(new Set(
        organizations
          .map(org => org.industry)
          .filter(industry => 
            industry && industry.toLowerCase().includes(searchTerm)
          )
      )).slice(0, 3)

      industries.forEach(industry => {
        const orgCount = organizations.filter(org => org.industry === industry).length
        results.push({
          id: `industry-${industry}`,
          type: 'industry',
          value: `industry:${industry}`,
          label: industry!,
          description: `${orgCount} organization${orgCount !== 1 ? 's' : ''}`,
          icon: Users
        })
      })

      // Search suggestions
      if (searchTerm.length > 2 && results.length === 0) {
        const suggestions = [
          'active organizations',
          'large organizations',
          'recently created',
          'technology companies'
        ].filter(suggestion => 
          suggestion.toLowerCase().includes(searchTerm)
        ).slice(0, 2)

        suggestions.forEach((suggestion, index) => {
          results.push({
            id: `suggestion-${index}`,
            type: 'suggestion',
            value: suggestion,
            label: suggestion,
            icon: Zap,
            description: 'Search suggestion'
          })
        })
      }
    }

    return results
  }, [value, organizations, recentSearches, showSuggestions])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setSelectedIndex(-1)
  }, [onChange])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    setShowDropdown(true)
    onFocus?.()
  }, [onFocus])

  const handleBlur = useCallback(() => {
    // Delay hiding dropdown to allow for suggestion clicks
    setTimeout(() => {
      setIsFocused(false)
      setShowDropdown(false)
      setSelectedIndex(-1)
      onBlur?.()
    }, 150)
  }, [onBlur])

  const handleClear = useCallback(() => {
    onChange('')
    setSelectedIndex(-1)
  }, [onChange])

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'recent' || suggestion.type === 'suggestion') {
      onChange(suggestion.value)
    } else if (suggestion.type === 'organization') {
      onChange(suggestion.label)
    } else if (suggestion.type === 'industry') {
      onChange(`industry:"${suggestion.label}"`)
    }

    // Add to recent searches
    if (onRecentSearchAdd && suggestion.value.trim()) {
      onRecentSearchAdd(suggestion.value)
    }

    onSuggestionClick?.(suggestion)
    setShowDropdown(false)
  }, [onChange, onRecentSearchAdd, onSuggestionClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (value.trim() && onRecentSearchAdd) {
          onRecentSearchAdd(value.trim())
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedIndex(-1)
        break
    }
  }, [showDropdown, suggestions, selectedIndex, handleSuggestionClick, value, onRecentSearchAdd])

  return (
    <div className={cn("relative flex-1 max-w-md", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <Input
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-10 pr-20 transition-all duration-200",
            isFocused && "ring-2 ring-blue-500/20 border-blue-300",
            disabled && "bg-gray-50"
          )}
          disabled={disabled}
        />

        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
          
          <VoiceInputButton
            onTranscription={(text) => {
              const newValue = value + (value ? ' ' : '') + text
              onChange(newValue)
            }}
            disabled={disabled}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
          />
          
          {value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100"
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Suggestions Dropdown */}
      <AnimatePresence>
        {showDropdown && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            <div className="py-2">
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon || Search
                return (
                  <div
                    key={suggestion.id}
                    className={cn(
                      "flex items-center space-x-3 px-4 py-2 cursor-pointer transition-colors",
                      "hover:bg-gray-50",
                      selectedIndex === index && "bg-blue-50 text-blue-700"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <HighlightedText
                          text={suggestion.label}
                          highlight={suggestion.type === 'organization' ? value : ''}
                          className="font-medium text-gray-900 truncate"
                        />
                        
                        {suggestion.metadata?.memberCount && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {suggestion.metadata.memberCount} members
                          </Badge>
                        )}
                      </div>
                      
                      {suggestion.description && (
                        <HighlightedText
                          text={suggestion.description}
                          highlight={suggestion.type === 'organization' ? value : ''}
                          className="text-sm text-gray-500 truncate"
                        />
                      )}
                      
                      {suggestion.metadata?.industry && suggestion.metadata.matchType !== 'industry' && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {suggestion.metadata.industry}
                        </div>
                      )}
                    </div>
                    
                    {suggestion.type === 'recent' && (
                      <ChevronRight className="h-3 w-3 text-gray-300" />
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Search Tips */}
            {value && suggestions.length === 0 && (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                <div className="mb-2">No results found for "{value}"</div>
                <div className="text-xs text-gray-400">
                  Try searching for organization names, industries, or descriptions
                </div>
              </div>
            )}
            
            {!value && recentSearches.length === 0 && (
              <div className="px-4 py-3 text-center text-sm text-gray-500">
                <div className="mb-2">Search Tips</div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>• Search by organization name or description</div>
                  <div>• Use "industry:Technology" for industry filtering</div>
                  <div>• Recent searches will appear here</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EnhancedSearchBar