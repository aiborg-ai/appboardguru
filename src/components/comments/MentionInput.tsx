/**
 * Mention Input Component
 * Rich text input with real-time @mention detection and autocomplete
 * Following CLAUDE.md patterns with Atomic Design
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import { Send, AtSign, Smile, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import MentionAutocomplete from './MentionAutocomplete'
import { useMentions } from '../../hooks/useMentions'
import type { OrganizationId } from '../../types/database'
import type { MentionUser, MentionMatch } from '../../hooks/useMentions'

interface MentionInputProps {
  organizationId: OrganizationId
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string, mentions: MentionMatch[]) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  minRows?: number
  maxRows?: number
  showCharCount?: boolean
  showMentionCount?: boolean
  autoFocus?: boolean
  allowAttachments?: boolean
  className?: string
}

export const MentionInput = memo(function MentionInput({
  organizationId,
  value,
  onChange,
  onSubmit,
  placeholder = 'Write a comment... Use @username to mention someone',
  disabled = false,
  maxLength = 10000,
  minRows = 3,
  maxRows = 8,
  showCharCount = true,
  showMentionCount = true,
  autoFocus = false,
  allowAttachments = false,
  className = ''
}: MentionInputProps) {
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // State
  const [cursorPosition, setCursorPosition] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])

  // Mentions hook
  const {
    autocomplete,
    detectMentions,
    processMentions,
    startAutocomplete,
    updateAutocomplete,
    selectSuggestion,
    cancelAutocomplete,
    navigateUp,
    navigateDown,
    getSelectedSuggestion,
    isSearching,
    error: mentionError
  } = useMentions({
    organizationId,
    enabled: !disabled
  })

  // Detected mentions in current text
  const mentions = useMemo(() => {
    return detectMentions(value)
  }, [value, detectMentions])

  // Valid mentions count
  const validMentionsCount = useMemo(() => {
    return mentions.filter(m => m.isValid).length
  }, [mentions])

  // Character count with styling
  const characterCountStyle = useMemo(() => {
    const remaining = maxLength - value.length
    if (remaining < 100) return 'text-red-500'
    if (remaining < 200) return 'text-yellow-500'
    return 'text-gray-500'
  }, [value.length, maxLength])

  // Handle text change
  const handleTextChange = useCallback((newValue: string) => {
    if (disabled || newValue.length > maxLength) return

    onChange(newValue)

    // Check for @mention trigger
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    const textBeforeCursor = newValue.slice(0, cursorPos)
    
    // Look for @mention pattern
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      
      // Check if we're in the middle of a mention (no spaces)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const query = textAfterAt
        const mentionStart = lastAtIndex
        const mentionEnd = cursorPos
        
        if (!autocomplete.isActive) {
          // Start autocomplete
          startAutocomplete(query, { start: mentionStart, end: mentionEnd })
        } else {
          // Update existing autocomplete
          updateAutocomplete(query)
        }
        
        // Update autocomplete position
        updateAutocompletePosition(mentionStart)
        return
      }
    }

    // Cancel autocomplete if no valid mention context
    if (autocomplete.isActive) {
      cancelAutocomplete()
    }
  }, [disabled, maxLength, onChange, autocomplete.isActive, startAutocomplete, updateAutocomplete, cancelAutocomplete])

  // Update autocomplete position based on cursor
  const updateAutocompletePosition = useCallback((mentionStart: number) => {
    if (!textareaRef.current || !containerRef.current) return

    const textarea = textareaRef.current
    const container = containerRef.current

    // Create a temporary span to measure text position
    const measurer = document.createElement('span')
    measurer.style.font = getComputedStyle(textarea).font
    measurer.style.whiteSpace = 'pre-wrap'
    measurer.style.position = 'absolute'
    measurer.style.visibility = 'hidden'
    measurer.textContent = value.slice(0, mentionStart)
    
    document.body.appendChild(measurer)
    
    const textRect = measurer.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const textareaRect = textarea.getBoundingClientRect()
    
    document.body.removeChild(measurer)

    // Calculate relative position
    const x = textareaRect.left - containerRect.left
    const y = textareaRect.top - containerRect.top + 24 // Offset for line height
    
    // Update autocomplete coordinates (this would be passed to the autocomplete component)
    // For now, we'll use a simple approach
  }, [value])

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return
    
    const newPosition = textareaRef.current.selectionStart
    setCursorPosition(newPosition)
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle autocomplete navigation
    if (autocomplete.isActive) {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          navigateUp()
          return
          
        case 'ArrowDown':
          event.preventDefault()
          navigateDown()
          return
          
        case 'Enter':
          if (!event.shiftKey) {
            event.preventDefault()
            const selectedSuggestion = getSelectedSuggestion()
            if (selectedSuggestion) {
              handleMentionSelect(selectedSuggestion.user)
            }
            return
          }
          break
          
        case 'Tab':
          event.preventDefault()
          const selectedSuggestion = getSelectedSuggestion()
          if (selectedSuggestion) {
            handleMentionSelect(selectedSuggestion.user)
          }
          return
          
        case 'Escape':
          event.preventDefault()
          cancelAutocomplete()
          return
      }
    }

    // Handle submit
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault()
      handleSubmit()
    }
  }, [autocomplete.isActive, navigateUp, navigateDown, getSelectedSuggestion, cancelAutocomplete, isComposing])

  // Handle mention selection
  const handleMentionSelect = useCallback((user: MentionUser) => {
    if (!textareaRef.current || !autocomplete.isActive) return

    const textarea = textareaRef.current
    const { start, end } = autocomplete.position
    
    // Replace the @mention text with the selected user
    const beforeMention = value.slice(0, start)
    const afterMention = value.slice(end)
    const mentionText = `@${user.username}`
    
    const newValue = beforeMention + mentionText + afterMention
    const newCursorPosition = start + mentionText.length
    
    onChange(newValue)
    
    // Set cursor position after mention
    setTimeout(() => {
      textarea.setSelectionRange(newCursorPosition, newCursorPosition)
      textarea.focus()
    }, 0)
    
    cancelAutocomplete()
  }, [value, autocomplete.isActive, autocomplete.position, onChange, cancelAutocomplete])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!onSubmit || !value.trim()) return

    try {
      // Process mentions to validate them
      const processedMentionsResult = await processMentions(value)
      const validMentions = processedMentionsResult.success ? processedMentionsResult.data : []
      
      onSubmit(value, validMentions)
    } catch (error) {
      console.error('Error submitting comment with mentions:', error)
      onSubmit(value, [])
    }
  }, [onSubmit, value, processMentions])

  // Handle attachment
  const handleAttachment = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }, [])

  // Remove attachment
  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const resizeTextarea = () => {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = parseInt(getComputedStyle(textarea).lineHeight || '20') * maxRows
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }

    resizeTextarea()
    textarea.addEventListener('input', resizeTextarea)
    
    return () => textarea.removeEventListener('input', resizeTextarea)
  }, [value, maxRows])

  // Focus on mount if autoFocus
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [autoFocus, disabled])

  return (
    <div ref={containerRef} className={`mention-input-container relative ${className}`}>
      {/* Main input area */}
      <div className="border border-gray-200 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectionChange}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="border-0 focus-visible:ring-0 resize-none"
          style={{
            minHeight: `${minRows * 1.5}rem`,
            maxHeight: `${maxRows * 1.5}rem`
          }}
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-3 py-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-2">
                  <span className="text-xs truncate max-w-24">{file.name}</span>
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                    onClick={() => removeAttachment(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
          {/* Left side - tools */}
          <div className="flex items-center space-x-2">
            {allowAttachments && (
              <label>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachment}
                  disabled={disabled}
                />
                <Paperclip className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" />
              </label>
            )}
            
            <AtSign className="h-4 w-4 text-gray-500" />
            <Smile className="h-4 w-4 text-gray-500 hover:text-gray-700 cursor-pointer" />
          </div>

          {/* Right side - stats and submit */}
          <div className="flex items-center space-x-3">
            {/* Mention count */}
            {showMentionCount && validMentionsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <AtSign className="h-3 w-3 mr-1" />
                {validMentionsCount}
              </Badge>
            )}

            {/* Character count */}
            {showCharCount && (
              <span className={`text-xs ${characterCountStyle}`}>
                {value.length}/{maxLength}
              </span>
            )}

            {/* Submit button */}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={disabled || !value.trim() || isSearching}
              className="px-3"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mention autocomplete */}
      <MentionAutocomplete
        autocomplete={autocomplete}
        onSelect={(index) => {
          const suggestion = autocomplete.suggestions[index]
          if (suggestion) {
            handleMentionSelect(suggestion.user)
          }
        }}
        onCancel={cancelAutocomplete}
        className="absolute z-50"
      />

      {/* Error display */}
      {mentionError && (
        <div className="mt-2 text-sm text-red-600 flex items-center space-x-1">
          <X className="h-4 w-4" />
          <span>{mentionError}</span>
        </div>
      )}

      {/* Mention preview */}
      {mentions.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <AtSign className="h-3 w-3" />
            <span>
              Mentions: {mentions.map(m => m.isValid ? m.username : `${m.username} (not found)`).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
})

export default MentionInput