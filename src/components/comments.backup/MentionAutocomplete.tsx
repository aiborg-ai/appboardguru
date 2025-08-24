/**
 * Mention Autocomplete Component
 * Real-time @mention suggestions with keyboard navigation
 * Following CLAUDE.md patterns with Atomic Design
 */

'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Clock, Star, CheckCircle, Circle } from 'lucide-react'
import { Card } from '@/components/molecules/cards/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/display/avatar'
import { Badge } from '@/components/atoms/display/badge'
import type { MentionSuggestion, MentionAutocompleteState } from '../../hooks/useMentions'

interface MentionAutocompleteProps {
  autocomplete: MentionAutocompleteState
  onSelect: (index: number) => void
  onCancel: () => void
  className?: string
  maxHeight?: number
}

interface MentionSuggestionItemProps {
  suggestion: MentionSuggestion
  isSelected: boolean
  onClick: () => void
  query: string
}

export const MentionAutocomplete = memo(function MentionAutocomplete({
  autocomplete,
  onSelect,
  onCancel,
  className = '',
  maxHeight = 300
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLDivElement>(null)

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && containerRef.current) {
      const container = containerRef.current
      const item = selectedItemRef.current
      
      const containerRect = container.getBoundingClientRect()
      const itemRect = item.getBoundingClientRect()
      
      if (itemRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - itemRect.top
      } else if (itemRect.bottom > containerRect.bottom) {
        container.scrollTop += itemRect.bottom - containerRect.bottom
      }
    }
  }, [autocomplete.selectedIndex])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!autocomplete.isActive) return

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        // Navigation handled by parent component
        break
        
      case 'ArrowDown':  
        event.preventDefault()
        // Navigation handled by parent component
        break
        
      case 'Enter':
      case 'Tab':
        event.preventDefault()
        onSelect(autocomplete.selectedIndex)
        break
        
      case 'Escape':
        event.preventDefault()
        onCancel()
        break
    }
  }, [autocomplete.isActive, autocomplete.selectedIndex, onSelect, onCancel])

  // Attach keyboard listeners
  useEffect(() => {
    if (autocomplete.isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [autocomplete.isActive, handleKeyDown])

  // Position the autocomplete relative to cursor
  const getPositionStyle = useCallback((): React.CSSProperties => {
    if (!autocomplete.coordinates) {
      return {}
    }

    return {
      position: 'absolute',
      left: autocomplete.coordinates.x,
      top: autocomplete.coordinates.y + 20, // Offset below cursor
      zIndex: 1000
    }
  }, [autocomplete.coordinates])

  if (!autocomplete.isActive || autocomplete.suggestions.length === 0) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={getPositionStyle()}
        className={`mention-autocomplete ${className}`}
      >
        <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
          <div
            ref={containerRef}
            className="py-2"
            style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto' }}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Mention someone
                </span>
                <Badge variant="secondary" className="text-xs">
                  {autocomplete.suggestions.length}
                </Badge>
              </div>
              {autocomplete.query && (
                <div className="mt-1 text-xs text-gray-500">
                  Searching for "{autocomplete.query}"
                </div>
              )}
            </div>

            {/* Suggestions */}
            <div className="py-1">
              {autocomplete.suggestions.map((suggestion, index) => (
                <MentionSuggestionItem
                  key={suggestion.user.id}
                  ref={index === autocomplete.selectedIndex ? selectedItemRef : undefined}
                  suggestion={suggestion}
                  isSelected={index === autocomplete.selectedIndex}
                  onClick={() => onSelect(index)}
                  query={autocomplete.query}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Use ↑↓ to navigate, Enter to select</span>
                <span>Esc to cancel</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
})

const MentionSuggestionItem = memo(React.forwardRef<HTMLDivElement, MentionSuggestionItemProps>(
  function MentionSuggestionItem({ suggestion, isSelected, onClick, query }, ref) {
    const { user, matchReason, relevanceScore } = suggestion

    // Highlight matching text
    const highlightText = useCallback((text: string, query: string) => {
      if (!query) return text

      const regex = new RegExp(`(${query})`, 'gi')
      const parts = text.split(regex)

      return parts.map((part, index) =>
        regex.test(part) ? (
          <mark key={index} className="bg-blue-100 text-blue-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )
    }, [])

    // Get match reason icon
    const getMatchReasonIcon = useCallback(() => {
      switch (matchReason) {
        case 'recent':
          return <Clock className="h-3 w-3 text-blue-500" />
        case 'frequent':
          return <Star className="h-3 w-3 text-yellow-500" />
        default:
          return null
      }
    }, [matchReason])

    // Get online status indicator
    const getOnlineStatus = useCallback(() => {
      if (user.isOnline) {
        return <CheckCircle className="h-3 w-3 text-green-500" />
      }
      return <Circle className="h-3 w-3 text-gray-400" />
    }, [user.isOnline])

    // Format last seen
    const formatLastSeen = useCallback(() => {
      if (user.isOnline) return 'Online'
      if (!user.lastSeen) return 'Offline'
      
      const now = new Date()
      const lastSeen = new Date(user.lastSeen)
      const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
      
      if (diffMinutes < 60) return `${diffMinutes}m ago`
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`
      return `${Math.floor(diffMinutes / 1440)}d ago`
    }, [user.isOnline, user.lastSeen])

    return (
      <motion.div
        ref={ref}
        className={`
          flex items-center space-x-3 px-3 py-2 cursor-pointer transition-colors duration-150
          ${isSelected 
            ? 'bg-blue-50 border-r-2 border-blue-500' 
            : 'hover:bg-gray-50'
          }
        `}
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="relative">
            <Avatar className="h-8 w-8">
              {user.avatar && (
                <AvatarImage src={user.avatar} alt={user.fullName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            {/* Online status indicator */}
            <div className="absolute -bottom-0.5 -right-0.5">
              {getOnlineStatus()}
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <div className="font-medium text-gray-900 truncate">
              {highlightText(user.fullName, query)}
            </div>
            <div className="flex items-center space-x-1">
              {getMatchReasonIcon()}
              <Badge variant="outline" className="text-xs">
                {user.role}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            <div className="text-sm text-gray-600 truncate">
              @{highlightText(user.username, query)}
            </div>
            <span className="text-gray-300">•</span>
            <div className="text-xs text-gray-500">
              {formatLastSeen()}
            </div>
          </div>
          
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {user.email}
          </div>
        </div>

        {/* Relevance score (for debugging/admin) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {Math.round(relevanceScore * 100)}%
            </Badge>
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0"
          >
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </motion.div>
        )}
      </motion.div>
    )
  }
))

export default MentionAutocomplete