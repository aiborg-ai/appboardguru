'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Building2, Plus, Eye, Settings, Globe, Crown, Users, BarChart3, Activity } from 'lucide-react'

// Import our custom components and hooks
import { OrganizationCardSkeleton, OrganizationCardSkeletonGrid } from './OrganizationCardSkeleton'
import { AnimatedCard, StaggeredContainer, ShimmerOverlay, TransitionWrapper } from './CardAnimations'
import { useStaggeredAnimation } from '@/hooks/useStaggeredAnimation'
import { useRenderPerformance } from '@/hooks/useRenderPerformance'

// Import existing UI components
import { cn } from '@/lib/utils'
import { ActivityIndicator } from './ActivityIndicator'
import OrganizationAnalytics from './OrganizationAnalytics'

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
}

interface EnhancedOrganizationsGridProps {
  organizations: Organization[]
  isLoading: boolean
  isRefreshing?: boolean
  currentOrganizationId?: string
  onSelectOrganization: (org: Organization) => void
  onViewDetails: (org: Organization) => void
  onOpenSettings: (orgId: string) => void
  className?: string
  showAnalytics?: boolean
}

export function EnhancedOrganizationsGrid({
  organizations,
  isLoading,
  isRefreshing = false,
  currentOrganizationId,
  onSelectOrganization,
  onViewDetails,
  onOpenSettings,
  className,
  showAnalytics = true
}: EnhancedOrganizationsGridProps) {
  
  // Performance monitoring
  useRenderPerformance('EnhancedOrganizationsGrid', {
    organizationCount: organizations.length,
    isLoading,
    isRefreshing
  })

  // State for animation controls
  const [showContent, setShowContent] = useState(!isLoading)
  const [refreshKey, setRefreshKey] = useState(0)
  const [analyticsOrgId, setAnalyticsOrgId] = useState<string | null>(null)

  // Staggered animation for the grid
  const { 
    containerRef, 
    containerVariants, 
    itemVariants,
    isVisible
  } = useStaggeredAnimation({
    staggerDelay: 0.1,
    initialDelay: 0.3,
    direction: 'up',
    distance: 20,
    duration: 0.5
  })

  // Handle loading state changes with smooth transitions
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 200)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isLoading])

  // Handle refresh animations
  useEffect(() => {
    if (isRefreshing) {
      setRefreshKey(prev => prev + 1)
    }
  }, [isRefreshing])

  const getRoleColor = useCallback((role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  const getRoleIcon = useCallback((role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Settings
      default: return Users
    }
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("relative", className)}>
        <OrganizationCardSkeletonGrid 
          count={6} 
          withCreateCard={true}
          className="animate-pulse-soft"
        />
      </div>
    )
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {showContent && (
          <TransitionWrapper key={refreshKey} mode="fade" duration={0.4}>
            <StaggeredContainer 
              ref={containerRef}
              staggerDelay={0.08}
              initialDelay={0.2}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {/* Create Organization Card */}
              <AnimatedCard
                animationType="cardEntrance"
                enableHover={true}
                delay={0}
                className="group relative"
              >
                <motion.div
                  variants={itemVariants}
                  className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden"
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.15)"
                  }}
                >
                  <Link href="/dashboard/organizations/create" className="block h-full">
                    <div className="flex flex-col items-center justify-center h-40 text-center relative z-10">
                      <motion.div 
                        className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus className="h-8 w-8 text-blue-600" />
                      </motion.div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Organization</h3>
                      <p className="text-sm text-gray-600">Start a new organization and invite your team members</p>
                    </div>
                  </Link>
                  
                  {/* Subtle hover effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 opacity-0"
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.div>
              </AnimatedCard>

              {/* Organization Cards */}
              {organizations.map((org, index) => {
                const RoleIcon = getRoleIcon(org.userRole || org.role || 'member')
                const isCurrentOrg = currentOrganizationId === org.id
                
                return (
                  <AnimatedCard
                    key={org.id}
                    animationType="cardEntrance"
                    enableHover={true}
                    delay={0.1 + (index * 0.05)} // Stagger each card
                    className="group relative"
                  >
                    <motion.div
                      variants={itemVariants}
                      className={cn(
                        "bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden",
                        isCurrentOrg && "ring-2 ring-green-500 ring-offset-2"
                      )}
                      onClick={() => onSelectOrganization(org)}
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Organization Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <motion.div 
                            className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
                            whileHover={{ scale: 1.05, rotate: 2 }}
                            transition={{ duration: 0.2 }}
                          >
                            {org.logo_url ? (
                              <img 
                                src={org.logo_url} 
                                alt={`${org.name} logo`} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling!.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <Building2 className={`h-6 w-6 text-blue-600 ${org.logo_url ? 'hidden' : ''}`} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">{org.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {org.industry && (
                                <motion.span 
                                  className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.3 + (index * 0.05) }}
                                >
                                  {org.industry}
                                </motion.span>
                              )}
                              {org.organization_size && (
                                <motion.span 
                                  className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.4 + (index * 0.05) }}
                                >
                                  {org.organization_size}
                                </motion.span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Role Badge */}
                        <motion.div 
                          className="flex items-center space-x-2"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + (index * 0.05) }}
                        >
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            getRoleColor(org.userRole || org.role || 'member')
                          )}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {org.userRole || org.role}
                          </span>
                        </motion.div>
                      </div>

                      {/* Description */}
                      <motion.p 
                        className="text-sm text-gray-600 mb-4 line-clamp-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + (index * 0.05) }}
                      >
                        {org.description || 'No description available'}
                      </motion.p>

                      {/* Metrics & Analytics Preview */}
                      <motion.div 
                        className="mb-4 space-y-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + (index * 0.05) }}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">{org.memberCount || '1'}</div>
                            <div className="text-xs text-gray-500">Members</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-900">
                              {new Date(org.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="text-xs text-gray-500">Created</div>
                          </div>
                        </div>
                        
                        {/* Quick Analytics Indicator */}
                        {showAnalytics && (
                          <div className="flex items-center justify-center pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <Activity className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-gray-600">
                                Analytics available
                              </span>
                            </div>
                          </div>
                        )}
                      </motion.div>

                      {/* Current Organization Indicator */}
                      {isCurrentOrg && (
                        <motion.div 
                          className="absolute top-2 right-2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ 
                            delay: 0.5 + (index * 0.05), 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 30 
                          }}
                        >
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse-soft"></div>
                        </motion.div>
                      )}

                      {/* Action Buttons */}
                      <motion.div 
                        className="flex items-center justify-between pt-4 border-t border-gray-100"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + (index * 0.05) }}
                      >
                        <div className="flex space-x-2">
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewDetails(org)
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Eye className="h-4 w-4 inline mr-1" />
                            View
                          </motion.button>
                          {showAnalytics && (
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                setAnalyticsOrgId(org.id)
                              }}
                              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              title="View Analytics"
                            >
                              <BarChart3 className="h-4 w-4 inline mr-1" />
                              Analytics
                            </motion.button>
                          )}
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenSettings(org.id)
                            }}
                            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Settings className="h-4 w-4 inline mr-1" />
                            Settings
                          </motion.button>
                        </div>
                        {org.website && (
                          <motion.a
                            href={org.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Globe className="h-4 w-4 inline mr-1" />
                            Website
                          </motion.a>
                        )}
                      </motion.div>

                      {/* Hover shimmer effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full opacity-0 group-hover:opacity-100"
                        animate={{ x: ['0%', '100%'] }}
                        transition={{ 
                          duration: 1.5, 
                          ease: "linear", 
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                      />
                    </motion.div>
                  </AnimatedCard>
                )
              })}
            </StaggeredContainer>
          </TransitionWrapper>
        )}
      </AnimatePresence>

      {/* Refreshing overlay */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3"
            >
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-600">Refreshing organizations...</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {analyticsOrgId && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAnalyticsOrgId(null)}
          >
            <motion.div
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <OrganizationAnalytics
                organizationId={analyticsOrgId}
                mode="modal"
                onClose={() => setAnalyticsOrgId(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default EnhancedOrganizationsGrid