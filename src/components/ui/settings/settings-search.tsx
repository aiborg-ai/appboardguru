'use client'

import React, { memo, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2 } from 'lucide-react'
import type { SettingsSearchProps } from './types'

export const SettingsSearch = memo<SettingsSearchProps>(({
  onSearch,
  onClear,
  suggestions = [],
  loading = false,
  placeholder = 'Search settings...',
  className,
  value,
  onChange,
  ...props
}) => {
  const [searchValue, setSearchValue] = useState(value || '')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filteredSuggestions = useMemo(() => {
    if (!searchValue || !suggestions.length) return []
    return suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(searchValue.toLowerCase())
    ).slice(0, 5)
  }, [searchValue, suggestions])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchValue(newValue)
    onChange?.(e)
    onSearch?.(newValue)
    setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0)
  }, [onChange, onSearch, filteredSuggestions.length])

  const handleClear = useCallback(() => {
    setSearchValue('')
    setShowSuggestions(false)
    onClear?.()
    onSearch?.('')
  }, [onClear, onSearch])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchValue(suggestion)
    setShowSuggestions(false)
    onSearch?.(suggestion)
  }, [onSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [])

  const handleFocus = useCallback(() => {
    if (searchValue && filteredSuggestions.length > 0) {
      setShowSuggestions(true)
    }
  }, [searchValue, filteredSuggestions.length])

  const handleBlur = useCallback(() => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 200)
  }, [])

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <Input
          type="text"
          value={searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            'pl-10 pr-10',
            'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          )}
          {...props}
        />

        {searchValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Search className="h-3 w-3 text-gray-400" />
                  <span>{suggestion}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

SettingsSearch.displayName = 'SettingsSearch'