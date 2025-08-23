'use client'

import React, { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, 
  Eye, 
  Settings, 
  Globe, 
  Crown, 
  Users, 
  Activity,
  MoreVertical,
  Star,
  Archive,
  Trash2,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface MobileOrganizationCardProps {
  organization: Organization
  isCurrentOrg?: boolean
  onViewDetails: (org: Organization) => void
  onOpenSettings: (orgId: string) => void
  onSelectOrganization: (org: Organization) => void
  onToggleFavorite?: (orgId: string) => void
  onArchive?: (orgId: string) => void
  onDelete?: (orgId: string) => void
  onOpenMobileActions: (orgId: string, position: { x: number; y: number }) => void
  index: number
  showAnalytics?: boolean
  enableHapticFeedback?: boolean
}

export function MobileOrganizationCard({
  organization,
  isCurrentOrg = false,
  onViewDetails,
  onOpenSettings,
  onSelectOrganization,
  onToggleFavorite,
  onArchive,
  onDelete,
  onOpenMobileActions,
  index,
  showAnalytics = true,
  enableHapticFeedback = true
}: MobileOrganizationCardProps) {
  
  const [isPressed, setIsPressed] = useState(false)
  
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

  // Haptic feedback function (if available)
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback) return
    
    // Check if the device supports haptic feedback
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHapticFeedback])

  const handleCardPress = useCallback(() => {
    setIsPressed(true)
    triggerHapticFeedback('light')
  }, [triggerHapticFeedback])

  const handleCardRelease = useCallback(() => {
    setIsPressed(false)
  }, [])

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger card click when clicking action buttons
    if ((e.target as HTMLElement).closest('.action-button')) {
      return
    }
    triggerHapticFeedback('medium')
    onSelectOrganization(organization)
  }, [onSelectOrganization, organization, triggerHapticFeedback])

  const handleMoreActionsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    triggerHapticFeedback('medium')
    onOpenMobileActions(organization.id, { 
      x: rect.left + rect.width / 2, 
      y: rect.top 
    })
  }, [onOpenMobileActions, organization.id, triggerHapticFeedback])

  const handleQuickAction = useCallback((action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    triggerHapticFeedback('medium')
    
    switch (action) {
      case 'view':
        onViewDetails(organization)
        break
      case 'settings':
        onOpenSettings(organization.id)
        break
      case 'favorite':
        onToggleFavorite?.(organization.id)
        break
      default:
        break
    }
  }, [organization, onViewDetails, onOpenSettings, onToggleFavorite, triggerHapticFeedback])

  const RoleIcon = getRoleIcon(organization.userRole || organization.role || 'member')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + (index * 0.02) }}
      className="w-full"
    >
      <motion.div
        className={cn(
          "bg-white border border-gray-200 rounded-2xl transition-all duration-300 relative overflow-hidden",
          "active:scale-[0.98] active:shadow-sm",
          isCurrentOrg && "ring-2 ring-green-500 ring-offset-1",
          isPressed ? "shadow-sm scale-[0.99]" : "shadow-md hover:shadow-lg"
        )}
        onMouseDown={handleCardPress}
        onMouseUp={handleCardRelease}
        onMouseLeave={handleCardRelease}
        onTouchStart={handleCardPress}
        onTouchEnd={handleCardRelease}
        onClick={handleCardClick}
        whileTap={{ scale: 0.98 }}
        style={{
          // Ensure minimum touch target size
          minHeight: '80px',
          touchAction: 'manipulation'
        }}
      >
        {/* Favorite indicator */}
        {organization.isFavorite && (
          <motion.div 
            className="absolute top-3 left-3 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.3 + (index * 0.05), 
              type: "spring", 
              stiffness: 500, 
              damping: 30 
            }}
          >
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          </motion.div>
        )}

        {/* Current organization indicator */}
        {isCurrentOrg && (
          <motion.div 
            className="absolute top-3 right-3 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.4 + (index * 0.05), 
              type: "spring", 
              stiffness: 500, 
              damping: 30 
            }}
          >
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </motion.div>
        )}

        {/* Main content */}
        <div className="p-6">
          {/* Header section */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* Logo */}
              <motion.div 
                className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0"
                whileHover={{ scale: 1.05, rotate: 2 }}
                transition={{ duration: 0.2 }}
              >
                {organization.logo_url ? (
                  <img 
                    src={organization.logo_url} 
                    alt={`${organization.name} logo`} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      if (target.nextElementSibling) {
                        target.nextElementSibling.classList.remove('hidden')
                      }
                    }}
                  />
                ) : null}
                <Building2 className={`h-7 w-7 text-blue-600 ${organization.logo_url ? 'hidden' : ''}`} />
              </motion.div>

              {/* Organization info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                  {organization.name}
                </h3>
                <div className="flex items-center space-x-2 mb-2">
                  {organization.industry && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {organization.industry}
                    </span>
                  )}
                  {organization.organization_size && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full capitalize">
                      {organization.organization_size}
                    </span>
                  )}
                </div>
                {/* Role badge */}
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  getRoleColor(organization.userRole || organization.role || 'member')
                )}>
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {organization.userRole || organization.role}
                </span>
              </div>
            </div>

            {/* More actions button - minimum 44px touch target */}
            <motion.button
              onClick={handleMoreActionsClick}
              className="action-button w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </motion.button>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {organization.description || 'No description available'}
          </p>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-4 mb-4 py-3 bg-gray-50 rounded-xl">
            <div className="text-center">
              <div className="text-base font-semibold text-gray-900">
                {organization.memberCount || '1'}
              </div>
              <div className="text-xs text-gray-500">Members</div>
            </div>
            <div className="text-center border-x border-gray-200">
              <div className="text-base font-semibold text-gray-900">
                {new Date(organization.created_at || Date.now()).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-xs text-gray-500">Created</div>
            </div>
            <div className="text-center">
              <div className="text-base font-semibold text-blue-600">
                {organization.status === 'active' ? 'Active' : 'Inactive'}
              </div>
              <div className="text-xs text-gray-500">Status</div>
            </div>
          </div>

          {/* Quick actions row - all buttons are 44px minimum */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <motion.button
                onClick={(e) => handleQuickAction('view', e)}
                className="action-button flex items-center px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors min-h-[44px]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Eye className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">View</span>
              </motion.button>

              <motion.button
                onClick={(e) => handleQuickAction('settings', e)}
                className="action-button flex items-center px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors min-h-[44px]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Settings</span>
              </motion.button>
            </div>

            {/* Favorite button */}
            {onToggleFavorite && (
              <motion.button
                onClick={(e) => handleQuickAction('favorite', e)}
                className="action-button w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Star 
                  className={cn(
                    "h-5 w-5",
                    organization.isFavorite 
                      ? "text-yellow-500 fill-yellow-500" 
                      : "text-gray-400"
                  )} 
                />
              </motion.button>
            )}

            {/* Website link */}
            {organization.website && (
              <motion.a
                href={organization.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="action-button w-11 h-11 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="h-5 w-5 text-gray-500" />
              </motion.a>
            )}
          </div>

          {/* Analytics indicator */}
          {showAnalytics && (
            <div className="flex items-center justify-center pt-3 mt-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-gray-600">Analytics available</span>
              </div>
            </div>
          )}
        </div>

        {/* Tap ripple effect */}
        <AnimatePresence>
          {isPressed && (
            <motion.div
              className="absolute inset-0 bg-gray-200 opacity-20 pointer-events-none"
              initial={{ scale: 0, opacity: 0.3 }}
              animate={{ scale: 1, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                borderRadius: 'inherit'
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default MobileOrganizationCard