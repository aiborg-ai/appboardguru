'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Organization } from '@/types/entities/organization.types'
import { FilterState, FilterPreset } from '@/components/organizations/FilterPanel'

export interface SortConfig {
  field: 'name' | 'created_at' | 'member_count' | 'last_activity' | 'industry'
  order: 'asc' | 'desc'
}

export interface UseOrganizationFiltersOptions {
  organizations: Organization[]
  enableUrlSync?: boolean
  defaultFilters?: Partial<FilterState>
  defaultSort?: SortConfig
  customPresets?: FilterPreset[]
}

export interface UseOrganizationFiltersResult {
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  debouncedSearchQuery: string
  
  // Filters
  filters: FilterState
  setFilters: (filters: FilterState) => void
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  clearFilters: () => void
  activeFilterCount: number
  
  // Sorting
  sortConfig: SortConfig
  setSortConfig: (config: SortConfig) => void
  
  // Results
  filteredOrganizations: Organization[]
  totalCount: number
  
  // Search suggestions and history
  recentSearches: string[]
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  
  // Presets
  filterPresets: FilterPreset[]
  savePreset: (name: string, filters: FilterState) => void
  deletePreset: (presetId: string) => void
  
  // URL synchronization
  updateUrl: () => void
  loadFromUrl: () => void
  
  // Highlighting
  getHighlightedText: (text: string) => string
}

const defaultFilterState: FilterState = {
  industries: [],
  sizes: [],
  roles: [],
  statuses: [],
  memberCountRange: [0, 1000],
  dateRange: {},
}

export const useOrganizationFilters = ({
  organizations = [],
  enableUrlSync = true,
  defaultFilters = {},
  defaultSort = { field: 'name', order: 'asc' },
  customPresets = []
}: UseOrganizationFiltersOptions): UseOrganizationFiltersResult => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilterState,
    ...defaultFilters
  })
  
  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort)
  
  // Recent searches (stored in localStorage)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Custom presets (stored in localStorage)
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>([])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('organizationFilters')
      if (stored) {
        const data = JSON.parse(stored)
        setRecentSearches(data.recentSearches || [])
        setSavedPresets(data.savedPresets || [])
      }
    } catch (error) {
      console.warn('Failed to load filter data from localStorage:', error)
    }
  }, [])

  // Load filters from URL parameters on mount
  useEffect(() => {
    if (enableUrlSync) {
      loadFromUrl()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save to localStorage when data changes
  useEffect(() => {
    try {
      localStorage.setItem('organizationFilters', JSON.stringify({
        recentSearches: recentSearches.slice(0, 10), // Keep only last 10 searches
        savedPresets
      }))
    } catch (error) {
      console.warn('Failed to save filter data to localStorage:', error)
    }
  }, [recentSearches, savedPresets])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.industries.length > 0) count++
    if (filters.sizes.length > 0) count++
    if (filters.roles.length > 0) count++
    if (filters.statuses.length > 0) count++
    if (filters.memberCountRange[0] > 0 || filters.memberCountRange[1] < 1000) count++
    if (filters.dateRange.from || filters.dateRange.to) count++
    if (filters.lastActivityDays) count++
    return count
  }, [filters])

  // Combine default and custom presets
  const filterPresets = useMemo(() => {
    return [...customPresets, ...savedPresets]
  }, [customPresets, savedPresets])

  // Filter and sort organizations
  const filteredOrganizations = useMemo(() => {
    let result = [...organizations]

    // Text search
    if (debouncedSearchQuery.trim()) {
      const searchTerms = debouncedSearchQuery.toLowerCase().trim().split(/\s+/)
      
      result = result.filter(org => {
        const searchableText = [
          org.name,
          org.description || '',
          org.industry || '',
          (org as any).role || ''
        ].join(' ').toLowerCase()

        // Check for industry-specific search
        const industryMatch = searchTerms.some(term => 
          term.startsWith('industry:') && 
          org.industry?.toLowerCase().includes(term.replace('industry:', '').replace(/"/g, ''))
        )

        if (industryMatch) return true

        // Regular text search - all terms must match
        return searchTerms.every(term => 
          searchableText.includes(term)
        )
      })
    }

    // Industry filter
    if (filters.industries.length > 0) {
      result = result.filter(org => 
        org.industry && filters.industries.includes(org.industry)
      )
    }

    // Size filter
    if (filters.sizes.length > 0) {
      result = result.filter(org => 
        org.organization_size && filters.sizes.includes(org.organization_size)
      )
    }

    // Role filter
    if (filters.roles.length > 0) {
      result = result.filter(org => {
        const role = (org as any).role || 'member'
        return filters.roles.includes(role)
      })
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter(org => {
        const status = (org as any).status || 'active'
        return filters.statuses.includes(status)
      })
    }

    // Member count range filter
    if (filters.memberCountRange[0] > 0 || filters.memberCountRange[1] < 1000) {
      result = result.filter(org => {
        const memberCount = (org as any).memberCount || 0
        return memberCount >= filters.memberCountRange[0] && 
               memberCount <= filters.memberCountRange[1]
      })
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      result = result.filter(org => {
        const createdAt = new Date((org as any).created_at || Date.now())
        
        if (filters.dateRange.from && createdAt < filters.dateRange.from) {
          return false
        }
        
        if (filters.dateRange.to && createdAt > filters.dateRange.to) {
          return false
        }
        
        return true
      })
    }

    // Last activity filter
    if (filters.lastActivityDays) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - filters.lastActivityDays)
      
      result = result.filter(org => {
        const lastActivity = new Date((org as any).last_activity || (org as any).created_at || Date.now())
        return lastActivity >= cutoffDate
      })
    }

    // Sort results
    result.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortConfig.field) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'created_at':
          aValue = new Date((a as any).created_at || 0).getTime()
          bValue = new Date((b as any).created_at || 0).getTime()
          break
        case 'member_count':
          aValue = (a as any).memberCount || 0
          bValue = (b as any).memberCount || 0
          break
        case 'last_activity':
          aValue = new Date((a as any).last_activity || (a as any).created_at || 0).getTime()
          bValue = new Date((b as any).last_activity || (b as any).created_at || 0).getTime()
          break
        case 'industry':
          aValue = (a.industry || '').toLowerCase()
          bValue = (b.industry || '').toLowerCase()
          break
        default:
          return 0
      }

      if (sortConfig.order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return result
  }, [organizations, debouncedSearchQuery, filters, sortConfig])

  // Helper functions
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ ...defaultFilterState, ...defaultFilters })
    setSearchQuery('')
  }, [defaultFilters])

  const addRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return
    
    setRecentSearches(prev => {
      const filtered = prev.filter(search => search !== query)
      return [query, ...filtered].slice(0, 10)
    })
  }, [])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
  }, [])

  const savePreset = useCallback((name: string, presetFilters: FilterState) => {
    const preset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name,
      description: 'Custom filter preset',
      icon: () => null,
      filters: { ...presetFilters }
    }
    
    setSavedPresets(prev => [...prev, preset])
  }, [])

  const deletePreset = useCallback((presetId: string) => {
    setSavedPresets(prev => prev.filter(preset => preset.id !== presetId))
  }, [])

  // URL synchronization
  const updateUrl = useCallback(() => {
    if (!enableUrlSync) return

    const params = new URLSearchParams()
    
    if (searchQuery) params.set('search', searchQuery)
    if (filters.industries.length > 0) params.set('industries', filters.industries.join(','))
    if (filters.sizes.length > 0) params.set('sizes', filters.sizes.join(','))
    if (filters.roles.length > 0) params.set('roles', filters.roles.join(','))
    if (filters.statuses.length > 0) params.set('statuses', filters.statuses.join(','))
    if (filters.memberCountRange[0] > 0 || filters.memberCountRange[1] < 1000) {
      params.set('memberCount', `${filters.memberCountRange[0]}-${filters.memberCountRange[1]}`)
    }
    if (filters.lastActivityDays) params.set('lastActivity', filters.lastActivityDays.toString())
    if (sortConfig.field !== 'name' || sortConfig.order !== 'asc') {
      params.set('sort', `${sortConfig.field}:${sortConfig.order}`)
    }

    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [enableUrlSync, router, searchQuery, filters, sortConfig])

  const loadFromUrl = useCallback(() => {
    if (!enableUrlSync) return

    const search = searchParams.get('search') || ''
    const industries = searchParams.get('industries')?.split(',').filter(Boolean) || []
    const sizes = searchParams.get('sizes')?.split(',').filter(Boolean) || []
    const roles = searchParams.get('roles')?.split(',').filter(Boolean) || []
    const statuses = searchParams.get('statuses')?.split(',').filter(Boolean) || []
    
    const memberCountParam = searchParams.get('memberCount')
    const memberCountRange: [number, number] = memberCountParam
      ? memberCountParam.split('-').map(Number) as [number, number]
      : [0, 1000]

    const lastActivityDays = searchParams.get('lastActivity') 
      ? parseInt(searchParams.get('lastActivity')!) 
      : undefined

    const sortParam = searchParams.get('sort')
    const [sortField, sortOrder] = sortParam 
      ? sortParam.split(':') as [SortConfig['field'], SortConfig['order']]
      : ['name', 'asc'] as [SortConfig['field'], SortConfig['order']]

    setSearchQuery(search)
    setFilters({
      industries,
      sizes,
      roles,
      statuses,
      memberCountRange,
      dateRange: {},
      lastActivityDays
    })
    setSortConfig({ field: sortField, order: sortOrder })
  }, [enableUrlSync, searchParams])

  // Auto-update URL when filters change
  useEffect(() => {
    if (enableUrlSync) {
      const timer = setTimeout(updateUrl, 500) // Debounce URL updates
      return () => clearTimeout(timer)
    }
  }, [updateUrl, enableUrlSync])

  // Highlight matching text
  const getHighlightedText = useCallback((text: string) => {
    if (!debouncedSearchQuery.trim()) return text

    const searchTerms = debouncedSearchQuery.toLowerCase().trim().split(/\s+/)
    let highlighted = text

    searchTerms.forEach(term => {
      if (!term.startsWith('industry:')) {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 font-medium rounded px-0.5">$1</mark>')
      }
    })

    return highlighted
  }, [debouncedSearchQuery])

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    
    // Filters
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    activeFilterCount,
    
    // Sorting
    sortConfig,
    setSortConfig,
    
    // Results
    filteredOrganizations,
    totalCount: organizations.length,
    
    // Search suggestions and history
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    
    // Presets
    filterPresets,
    savePreset,
    deletePreset,
    
    // URL synchronization
    updateUrl,
    loadFromUrl,
    
    // Highlighting
    getHighlightedText
  }
}