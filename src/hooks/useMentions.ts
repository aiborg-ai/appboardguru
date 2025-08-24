/**
 * @Mentions Hook - Real-time mention detection and autocomplete
 * React hook for @mention functionality with user search
 * Following CLAUDE.md patterns with Result handling
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useUser } from '../lib/stores'
import { CommentService } from '../lib/services/comment.service'
import type { OrganizationId, UserId } from '../types/database'
import type { Result } from '../lib/types/result'

export interface MentionUser {
  id: UserId
  username: string
  fullName: string
  email: string
  avatar?: string
  role: string
  isOnline: boolean
  lastSeen?: Date
}

export interface MentionSuggestion {
  user: MentionUser
  relevanceScore: number
  matchReason: 'username' | 'name' | 'email' | 'recent' | 'frequent'
}

export interface MentionMatch {
  text: string
  username: string
  start: number
  end: number
  isValid: boolean
  user?: MentionUser
}

export interface MentionAutocompleteState {
  isActive: boolean
  query: string
  position: { start: number; end: number }
  suggestions: MentionSuggestion[]
  selectedIndex: number
  coordinates?: { x: number; y: number }
}

export interface UseMentionsOptions {
  organizationId: OrganizationId
  enabled?: boolean
  maxSuggestions?: number
  minQueryLength?: number
  includeOfflineUsers?: boolean
  customMentionTypes?: Array<{
    prefix: string
    type: 'role' | 'team' | 'everyone'
    suggestions: string[]
  }>
}

export interface UseMentionsReturn {
  // Autocomplete state
  autocomplete: MentionAutocompleteState
  
  // Mention detection
  detectMentions: (text: string) => MentionMatch[]
  processMentions: (text: string) => Promise<Result<MentionMatch[]>>
  
  // Autocomplete actions
  startAutocomplete: (query: string, position: { start: number; end: number }) => void
  updateAutocomplete: (query: string) => void
  selectSuggestion: (index: number) => MentionUser | null
  cancelAutocomplete: () => void
  
  // Navigation
  navigateUp: () => void
  navigateDown: () => void
  getSelectedSuggestion: () => MentionSuggestion | null
  
  // User management
  searchUsers: (query: string) => Promise<Result<MentionUser[]>>
  getRecentMentions: () => MentionUser[]
  getFrequentMentions: () => MentionUser[]
  
  // State
  isSearching: boolean
  error: string | null
  clearError: () => void
}

export function useMentions({
  organizationId,
  enabled = true,
  maxSuggestions = 10,
  minQueryLength = 1,
  includeOfflineUsers = true,
  customMentionTypes = []
}: UseMentionsOptions): UseMentionsReturn {
  const user = useUser()

  // Autocomplete state
  const [autocomplete, setAutocomplete] = useState<MentionAutocompleteState>({
    isActive: false,
    query: '',
    position: { start: 0, end: 0 },
    suggestions: [],
    selectedIndex: 0
  })

  // Search state
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cache
  const [userCache, setUserCache] = useState<Map<string, MentionUser>>(new Map())
  const [recentMentions, setRecentMentions] = useState<MentionUser[]>([])
  const [frequentMentions, setFrequentMentions] = useState<MentionUser[]>([])

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const lastQueryRef = useRef<string>('')

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load initial data
  useEffect(() => {
    if (!enabled || !user || !organizationId) return

    loadRecentAndFrequentMentions()
  }, [enabled, user, organizationId])

  // Mention detection regex
  const mentionRegex = useMemo(() => {
    const customPrefixes = customMentionTypes.map(t => t.prefix).join('|')
    const pattern = customPrefixes 
      ? `(@|${customPrefixes})([a-zA-Z0-9._-]*)`
      : '@([a-zA-Z0-9._-]*)'
    return new RegExp(pattern, 'g')
  }, [customMentionTypes])

  /**
   * Detect mentions in text
   */
  const detectMentions = useCallback((text: string): MentionMatch[] => {
    if (!enabled) return []

    const mentions: MentionMatch[] = []
    let match

    const regex = new RegExp(mentionRegex.source, 'g')
    
    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0]
      const username = match[1] || match[2] // Handle custom prefixes
      
      mentions.push({
        text: fullMatch,
        username,
        start: match.index,
        end: match.index + fullMatch.length,
        isValid: false, // Will be validated by processMentions
        user: userCache.get(username.toLowerCase())
      })
    }

    return mentions
  }, [enabled, mentionRegex, userCache])

  /**
   * Process mentions and validate users
   */
  const processMentions = useCallback(async (text: string): Promise<Result<MentionMatch[]>> => {
    if (!enabled) {
      return success([])
    }

    try {
      clearError()
      const mentions = detectMentions(text)
      
      if (mentions.length === 0) {
        return success([])
      }

      // Validate mentions against organization users
      const validatedMentions = await Promise.all(
        mentions.map(async (mention) => {
          // Check cache first
          const cachedUser = userCache.get(mention.username.toLowerCase())
          if (cachedUser) {
            return {
              ...mention,
              isValid: true,
              user: cachedUser
            }
          }

          // Search for user
          const searchResult = await searchUsers(mention.username)
          if (searchResult.success && searchResult.data.length > 0) {
            const user = searchResult.data[0]
            
            // Update cache
            setUserCache(prev => new Map(prev.set(user.username.toLowerCase(), user)))
            
            return {
              ...mention,
              isValid: true,
              user
            }
          }

          return mention
        })
      )

      return success(validatedMentions)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process mentions'
      setError(errorMessage)
      return failure(RepositoryError.internal('MENTION_PROCESSING_ERROR', errorMessage)
    }
  }, [enabled, detectMentions, userCache, clearError])

  /**
   * Start autocomplete
   */
  const startAutocomplete = useCallback((
    query: string,
    position: { start: number; end: number }
  ) => {
    if (!enabled) return

    setAutocomplete({
      isActive: true,
      query,
      position,
      suggestions: [],
      selectedIndex: 0
    })

    // Start searching
    updateAutocomplete(query)
  }, [enabled])

  /**
   * Update autocomplete with new query
   */
  const updateAutocomplete = useCallback(async (query: string) => {
    if (!enabled || !autocomplete.isActive) return

    setAutocomplete(prev => ({ ...prev, query, selectedIndex: 0 }))

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (query.length < minQueryLength) {
        // Show recent/frequent mentions for short queries
        const suggestions = [
          ...recentMentions.slice(0, 5).map(user => ({
            user,
            relevanceScore: 0.8,
            matchReason: 'recent' as const
          })),
          ...frequentMentions.slice(0, 5).map(user => ({
            user,
            relevanceScore: 0.7,
            matchReason: 'frequent' as const
          }))
        ].slice(0, maxSuggestions)

        setAutocomplete(prev => ({ ...prev, suggestions }))
        return
      }

      // Search users
      setIsSearching(true)
      const searchResult = await searchUsers(query)
      setIsSearching(false)

      if (searchResult.success) {
        const suggestions = searchResult.data
          .map(user => ({
            user,
            relevanceScore: calculateRelevanceScore(user, query),
            matchReason: getMatchReason(user, query)
          }))
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, maxSuggestions)

        setAutocomplete(prev => ({ ...prev, suggestions }))
      } else {
        setError(searchResult.error.message)
      }
    }, 150) // 150ms debounce

  }, [enabled, autocomplete.isActive, minQueryLength, maxSuggestions, recentMentions, frequentMentions])

  /**
   * Select suggestion
   */
  const selectSuggestion = useCallback((index: number): MentionUser | null => {
    if (!autocomplete.suggestions[index]) return null

    const suggestion = autocomplete.suggestions[index]
    
    // Update recent mentions
    setRecentMentions(prev => {
      const filtered = prev.filter(u => u.id !== suggestion.user.id)
      return [suggestion.user, ...filtered].slice(0, 10)
    })

    // Update frequent mentions (simplified counting)
    setFrequentMentions(prev => {
      const existing = prev.find(u => u.id === suggestion.user.id)
      if (existing) {
        return prev.sort((a, b) => 
          (a.id === suggestion.user.id ? 1 : 0) - 
          (b.id === suggestion.user.id ? 1 : 0)
        )
      }
      return [suggestion.user, ...prev].slice(0, 10)
    })

    return suggestion.user
  }, [autocomplete.suggestions])

  /**
   * Cancel autocomplete
   */
  const cancelAutocomplete = useCallback(() => {
    setAutocomplete({
      isActive: false,
      query: '',
      position: { start: 0, end: 0 },
      suggestions: [],
      selectedIndex: 0
    })

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  /**
   * Navigate up in suggestions
   */
  const navigateUp = useCallback(() => {
    setAutocomplete(prev => ({
      ...prev,
      selectedIndex: prev.selectedIndex > 0 
        ? prev.selectedIndex - 1 
        : prev.suggestions.length - 1
    }))
  }, [])

  /**
   * Navigate down in suggestions
   */
  const navigateDown = useCallback(() => {
    setAutocomplete(prev => ({
      ...prev,
      selectedIndex: prev.selectedIndex < prev.suggestions.length - 1 
        ? prev.selectedIndex + 1 
        : 0
    }))
  }, [])

  /**
   * Get currently selected suggestion
   */
  const getSelectedSuggestion = useCallback((): MentionSuggestion | null => {
    return autocomplete.suggestions[autocomplete.selectedIndex] || null
  }, [autocomplete.suggestions, autocomplete.selectedIndex])

  /**
   * Search users in organization
   */
  const searchUsers = useCallback(async (query: string): Promise<Result<MentionUser[]>> => {
    if (!user || !organizationId) {
      return failure(RepositoryError.internal('NOT_AUTHENTICATED', 'User not authenticated')
    }

    try {
      // This would integrate with user repository
      // For now, return mock data
      const mockUsers: MentionUser[] = [
        {
          id: 'user1' as UserId,
          username: 'john.doe',
          fullName: 'John Doe',
          email: 'john.doe@company.com',
          role: 'admin',
          isOnline: true,
          avatar: '/avatars/john.jpg'
        },
        {
          id: 'user2' as UserId,
          username: 'jane.smith',
          fullName: 'Jane Smith',
          email: 'jane.smith@company.com',
          role: 'member',
          isOnline: false,
          lastSeen: new Date(Date.now() - 3600000)
        }
      ].filter(user => {
        const searchQuery = query.toLowerCase()
        return user.username.toLowerCase().includes(searchQuery) ||
               user.fullName.toLowerCase().includes(searchQuery) ||
               user.email.toLowerCase().includes(searchQuery)
      })

      return success(mockUsers)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search users'
      return failure(RepositoryError.internal('USER_SEARCH_ERROR', errorMessage)
    }
  }, [user, organizationId])

  /**
   * Get recent mentions
   */
  const getRecentMentions = useCallback(() => {
    return recentMentions
  }, [recentMentions])

  /**
   * Get frequent mentions
   */
  const getFrequentMentions = useCallback(() => {
    return frequentMentions
  }, [frequentMentions])

  /**
   * Load recent and frequent mentions from storage
   */
  const loadRecentAndFrequentMentions = useCallback(async () => {
    try {
      // Load from localStorage as fallback
      const stored = localStorage.getItem(`mentions_${organizationId}_${user?.id}`)
      if (stored) {
        const { recent, frequent } = JSON.parse(stored)
        setRecentMentions(recent || [])
        setFrequentMentions(frequent || [])
      }
    } catch (error) {
      console.error('Error loading mention history:', error)
    }
  }, [organizationId, user?.id])

  /**
   * Calculate relevance score for user search
   */
  const calculateRelevanceScore = useCallback((user: MentionUser, query: string): number => {
    const searchQuery = query.toLowerCase()
    let score = 0

    // Exact username match
    if (user.username.toLowerCase() === searchQuery) score += 1.0
    
    // Username starts with query
    else if (user.username.toLowerCase().startsWith(searchQuery)) score += 0.8
    
    // Username contains query
    else if (user.username.toLowerCase().includes(searchQuery)) score += 0.6

    // Name matches
    if (user.fullName.toLowerCase().startsWith(searchQuery)) score += 0.7
    else if (user.fullName.toLowerCase().includes(searchQuery)) score += 0.5

    // Email matches
    if (user.email.toLowerCase().includes(searchQuery)) score += 0.4

    // Boost for online users
    if (user.isOnline) score += 0.1

    // Boost for recent mentions
    if (recentMentions.some(u => u.id === user.id)) score += 0.2

    // Boost for frequent mentions
    if (frequentMentions.some(u => u.id === user.id)) score += 0.15

    return Math.min(score, 1.0)
  }, [recentMentions, frequentMentions])

  /**
   * Determine match reason
   */
  const getMatchReason = useCallback((user: MentionUser, query: string): MentionSuggestion['matchReason'] => {
    const searchQuery = query.toLowerCase()
    
    if (user.username.toLowerCase().includes(searchQuery)) return 'username'
    if (user.fullName.toLowerCase().includes(searchQuery)) return 'name'  
    if (user.email.toLowerCase().includes(searchQuery)) return 'email'
    if (recentMentions.some(u => u.id === user.id)) return 'recent'
    if (frequentMentions.some(u => u.id === user.id)) return 'frequent'
    
    return 'username'
  }, [recentMentions, frequentMentions])

  // Save mention history to storage
  useEffect(() => {
    if (!user || !organizationId) return

    try {
      localStorage.setItem(
        `mentions_${organizationId}_${user.id}`,
        JSON.stringify({
          recent: recentMentions,
          frequent: frequentMentions
        })
      )
    } catch (error) {
      console.error('Error saving mention history:', error)
    }
  }, [recentMentions, frequentMentions, user, organizationId])

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    // Autocomplete state
    autocomplete,
    
    // Mention detection
    detectMentions,
    processMentions,
    
    // Autocomplete actions
    startAutocomplete,
    updateAutocomplete,
    selectSuggestion,
    cancelAutocomplete,
    
    // Navigation
    navigateUp,
    navigateDown,
    getSelectedSuggestion,
    
    // User management
    searchUsers,
    getRecentMentions,
    getFrequentMentions,
    
    // State
    isSearching,
    error,
    clearError
  }
}