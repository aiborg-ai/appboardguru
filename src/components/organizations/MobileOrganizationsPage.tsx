'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Filter, Grid, List, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

// Import mobile components
import MobileOrganizationCard from './MobileOrganizationCard'
import SwipeableCard, { commonSwipeActions } from './SwipeableCard'
import MobileBottomSheet, { QuickActionsBottomSheet } from './MobileBottomSheet'
import MobilePullToSearch from './MobilePullToSearch'
import { useIsMobile, useDeviceCapabilities } from '@/hooks/useMobileGestures'

// Import styles
import '@/styles/organizations-mobile.css'

interface Organization {
  id: string
  name: string
  description?: string
  logo_url?: string
  website?: string
  industry?: string
  organization_size?: string
  userRole?: string
  role?: string
  memberCount?: number
  created_at?: string
  status?: 'active' | 'pending' | 'suspended'
  isFavorite?: boolean
}

interface MobileOrganizationsPageProps {
  organizations: Organization[]
  isLoading: boolean
  currentOrganizationId?: string
  onSelectOrganization: (org: Organization) => void
  onViewDetails: (org: Organization) => void
  onOpenSettings: (orgId: string) => void
  onToggleFavorite?: (orgId: string) => void
  onArchiveOrganization?: (orgId: string) => void
  onDeleteOrganization?: (orgId: string) => void
  onShareOrganization?: (orgId: string) => void
  onCreateNew?: () => void
  onRefresh?: () => void
  className?: string
}

export function MobileOrganizationsPage({
  organizations,
  isLoading,
  currentOrganizationId,
  onSelectOrganization,
  onViewDetails,
  onOpenSettings,
  onToggleFavorite,
  onArchiveOrganization,
  onDeleteOrganization,
  onShareOrganization,
  onCreateNew,
  onRefresh,
  className
}: MobileOrganizationsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Device capabilities
  const isMobile = useIsMobile()
  const { hasTouch, supportsVibration } = useDeviceCapabilities()

  // Filter organizations based on search
  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleSearchSubmit = useCallback((query: string) => {
    console.log('Search submitted:', query)
    // Implement search logic here
  }, [])

  const handleSearchToggle = useCallback((visible: boolean) => {
    setIsSearchVisible(visible)
    if (!visible) {
      setSearchQuery('')
    }
  }, [])

  // Handle organization actions
  const handleOpenMobileActions = useCallback((orgId: string, position: { x: number; y: number }) => {
    const org = organizations.find(o => o.id === orgId)
    if (org) {
      setSelectedOrgId(orgId)
      setSelectedOrg(org)
      setShowBottomSheet(true)
    }
  }, [organizations])

  const handleCloseBottomSheet = useCallback(() => {
    setShowBottomSheet(false)
    setSelectedOrgId(null)
    setSelectedOrg(null)
  }, [])

  const handleSwipeComplete = useCallback((actionId: string, direction: 'left' | 'right', orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    if (!org) return

    switch (actionId) {
      case 'favorite':
        onToggleFavorite?.(orgId)
        break
      case 'archive':
        onArchiveOrganization?.(orgId)
        break
      case 'delete':
        onDeleteOrganization?.(orgId)
        break
      default:
        break
    }
  }, [organizations, onToggleFavorite, onArchiveOrganization, onDeleteOrganization])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500) // Minimum refresh duration for UX
    }
  }, [isRefreshing, onRefresh])

  // Create swipe actions for each organization
  const createSwipeActions = useCallback((org: Organization) => {
    const leftActions = [
      {
        ...commonSwipeActions.organizationLeft[0], // Archive
        action: () => onArchiveOrganization?.(org.id)
      }
    ]

    const rightActions = [
      {
        ...commonSwipeActions.organizationRight[0], // Favorite
        action: () => onToggleFavorite?.(org.id)
      }
    ]

    return { leftActions, rightActions }
  }, [onArchiveOrganization, onToggleFavorite])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("mobile-scroll-container", className)}>
        <div className="organizations-mobile-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="mobile-org-card animate-pulse"
              style={{ height: '200px' }}
            >
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative h-full", className)}>
      {/* Pull to search container */}
      <MobilePullToSearch
        isSearchVisible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onSearchToggle={handleSearchToggle}
        placeholder="Search organizations..."
        enableHapticFeedback={supportsVibration}
        className="h-full"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 safe-area-top">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
            <div className="flex items-center space-x-2">
              {/* Search button */}
              <motion.button
                onClick={() => handleSearchToggle(!isSearchVisible)}
                className="touch-target rounded-lg hover:bg-gray-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <Search className="w-5 h-5 text-gray-600" />
              </motion.button>

              {/* View mode toggle */}
              <motion.button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="touch-target rounded-lg hover:bg-gray-100 transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                {viewMode === 'grid' ? (
                  <List className="w-5 h-5 text-gray-600" />
                ) : (
                  <Grid className="w-5 h-5 text-gray-600" />
                )}
              </motion.button>

              {/* Create organization button */}
              {onCreateNew && (
                <motion.button
                  onClick={onCreateNew}
                  className="touch-target bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
              )}
            </div>
          </div>
        </div>

        {/* Organizations grid */}
        <div className={cn(
          "mobile-scroll-container safe-area-bottom",
          isRefreshing && "pointer-events-none"
        )}>
          {/* Refresh indicator */}
          <AnimatePresence>
            {isRefreshing && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-center py-4"
              >
                <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm px-4 py-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">Refreshing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {filteredOrganizations.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No results found' : 'No organizations yet'}
              </h3>
              <p className="text-gray-500 text-center mb-6">
                {searchQuery 
                  ? `No organizations match "${searchQuery}"`
                  : 'Get started by creating your first organization'
                }
              </p>
              {!searchQuery && onCreateNew && (
                <motion.button
                  onClick={onCreateNew}
                  className="mobile-button bg-blue-600 text-white hover:bg-blue-700"
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Organization
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Organizations list */}
          <div className={cn(
            "organizations-mobile-grid",
            viewMode === 'list' && "grid-cols-1"
          )}>
            {filteredOrganizations.map((org, index) => {
              const { leftActions, rightActions } = createSwipeActions(org)
              const isCurrentOrg = currentOrganizationId === org.id

              return (
                <SwipeableCard
                  key={org.id}
                  leftActions={leftActions}
                  rightActions={rightActions}
                  onSwipeComplete={(actionId, direction) => 
                    handleSwipeComplete(actionId, direction, org.id)
                  }
                  enableHapticFeedback={supportsVibration}
                  className="mobile-org-card"
                >
                  <MobileOrganizationCard
                    organization={org}
                    isCurrentOrg={isCurrentOrg}
                    onViewDetails={onViewDetails}
                    onOpenSettings={onOpenSettings}
                    onSelectOrganization={onSelectOrganization}
                    onToggleFavorite={onToggleFavorite}
                    onArchive={onArchiveOrganization}
                    onDelete={onDeleteOrganization}
                    onOpenMobileActions={handleOpenMobileActions}
                    index={index}
                    showAnalytics={true}
                    enableHapticFeedback={supportsVibration}
                  />
                </SwipeableCard>
              )
            })}
          </div>
        </div>
      </MobilePullToSearch>

      {/* Bottom sheets */}
      <MobileBottomSheet
        isOpen={showBottomSheet}
        onClose={handleCloseBottomSheet}
        organization={selectedOrg}
        enableHapticFeedback={supportsVibration}
      />

      <QuickActionsBottomSheet
        isOpen={showQuickActions}
        onClose={() => setShowQuickActions(false)}
        organization={selectedOrg}
        onFavorite={onToggleFavorite}
        onArchive={onArchiveOrganization}
        onDelete={onDeleteOrganization}
        onShare={onShareOrganization}
        enableHapticFeedback={supportsVibration}
      />
    </div>
  )
}

export default MobileOrganizationsPage