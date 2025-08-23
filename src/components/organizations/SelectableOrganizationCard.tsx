'use client'

import React, { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  Building2, 
  Eye, 
  Settings, 
  Globe, 
  Crown, 
  Users, 
  Activity,
  Check
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
}

interface SelectableOrganizationCardProps {
  organization: Organization
  isSelected: boolean
  isCurrentOrg?: boolean
  onToggleSelect: (id: string) => void
  onViewDetails: (org: Organization) => void
  onOpenSettings: (orgId: string) => void
  onSelectOrganization: (org: Organization) => void
  index: number
  showAnalytics?: boolean
}

export function SelectableOrganizationCard({
  organization,
  isSelected,
  isCurrentOrg = false,
  onToggleSelect,
  onViewDetails,
  onOpenSettings,
  onSelectOrganization,
  index,
  showAnalytics = true
}: SelectableOrganizationCardProps) {
  
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

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger card click when clicking the checkbox or action buttons
    if ((e.target as HTMLElement).closest('.checkbox-container') || 
        (e.target as HTMLElement).closest('.action-button')) {
      return
    }
    onSelectOrganization(organization)
  }, [onSelectOrganization, organization])

  const handleCheckboxChange = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect(organization.id)
  }, [onToggleSelect, organization.id])

  const RoleIcon = getRoleIcon(organization.userRole || organization.role || 'member')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (index * 0.05) }}
      className="group relative"
    >
      <motion.div
        className={cn(
          "bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden",
          isCurrentOrg && "ring-2 ring-green-500 ring-offset-2",
          isSelected && "ring-2 ring-blue-500 ring-offset-2 bg-blue-50"
        )}
        onClick={handleCardClick}
        whileHover={{ 
          scale: 1.02,
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)"
        }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Selection Checkbox */}
        <motion.div
          className="checkbox-container absolute top-3 left-3 z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isSelected ? 1 : 0, 
            scale: isSelected ? 1 : 0.8 
          }}
          whileHover={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div
            onClick={handleCheckboxChange}
            className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
              isSelected
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
            )}
          >
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check className="w-3 h-3" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Organization Header */}
        <div className="flex items-start justify-between mb-4 ml-8">
          <div className="flex items-center space-x-3">
            <motion.div 
              className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center"
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
              <Building2 className={`h-6 w-6 text-blue-600 ${organization.logo_url ? 'hidden' : ''}`} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">{organization.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                {organization.industry && (
                  <motion.span 
                    className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + (index * 0.05) }}
                  >
                    {organization.industry}
                  </motion.span>
                )}
                {organization.organization_size && (
                  <motion.span 
                    className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + (index * 0.05) }}
                  >
                    {organization.organization_size}
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
              getRoleColor(organization.userRole || organization.role || 'member')
            )}>
              <RoleIcon className="h-3 w-3 mr-1" />
              {organization.userRole || organization.role}
            </span>
          </motion.div>
        </div>

        {/* Description */}
        <motion.p 
          className="text-sm text-gray-600 mb-4 line-clamp-2 ml-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + (index * 0.05) }}
        >
          {organization.description || 'No description available'}
        </motion.p>

        {/* Metrics & Analytics Preview */}
        <motion.div 
          className="mb-4 space-y-3 ml-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + (index * 0.05) }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{organization.memberCount || '1'}</div>
              <div className="text-xs text-gray-500">Members</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {new Date(organization.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div 
          className="flex items-center justify-between pt-4 border-t border-gray-100 ml-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + (index * 0.05) }}
        >
          <div className="flex space-x-2">
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                onViewDetails(organization)
              }}
              className="action-button text-xs text-gray-500 hover:text-blue-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye className="h-4 w-4 inline mr-1" />
              View
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.stopPropagation()
                onOpenSettings(organization.id)
              }}
              className="action-button text-xs text-gray-500 hover:text-blue-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="h-4 w-4 inline mr-1" />
              Settings
            </motion.button>
          </div>
          {organization.website && (
            <motion.a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="action-button text-xs text-gray-500 hover:text-blue-600 transition-colors"
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

        {/* Selection Overlay */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              className="absolute inset-0 bg-blue-500/5 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

export default SelectableOrganizationCard