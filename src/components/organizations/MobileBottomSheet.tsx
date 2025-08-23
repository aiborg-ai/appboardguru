'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { 
  X, 
  Eye, 
  Settings, 
  Star, 
  Archive, 
  Trash2, 
  Heart, 
  Pin, 
  Share2, 
  Copy, 
  Globe,
  Users,
  MoreHorizontal,
  Building2
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

interface BottomSheetAction {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description?: string
  color?: string
  destructive?: boolean
  action: () => void
}

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  organization?: Organization | null
  actions?: BottomSheetAction[]
  position?: { x: number; y: number }
  enableHapticFeedback?: boolean
}

const defaultActions: BottomSheetAction[] = [
  {
    id: 'view',
    icon: Eye,
    label: 'View Details',
    description: 'See full organization information',
    action: () => {}
  },
  {
    id: 'settings',
    icon: Settings,
    label: 'Settings',
    description: 'Manage organization settings',
    action: () => {}
  },
  {
    id: 'favorite',
    icon: Heart,
    label: 'Add to Favorites',
    description: 'Quick access from favorites',
    color: 'text-red-600',
    action: () => {}
  },
  {
    id: 'share',
    icon: Share2,
    label: 'Share Organization',
    description: 'Send invitation link',
    action: () => {}
  },
  {
    id: 'copy',
    icon: Copy,
    label: 'Copy Link',
    description: 'Copy organization URL',
    action: () => {}
  },
  {
    id: 'archive',
    icon: Archive,
    label: 'Archive',
    description: 'Hide from main view',
    color: 'text-orange-600',
    action: () => {}
  },
  {
    id: 'delete',
    icon: Trash2,
    label: 'Delete',
    description: 'Permanently remove organization',
    color: 'text-red-600',
    destructive: true,
    action: () => {}
  }
]

export function MobileBottomSheet({
  isOpen,
  onClose,
  organization,
  actions = defaultActions,
  position,
  enableHapticFeedback = true
}: MobileBottomSheetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHapticFeedback])

  // Handle drag to dismiss
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.offset.y > 150 || info.velocity.y > 500
    
    if (shouldClose) {
      triggerHapticFeedback('light')
      onClose()
    } else {
      y.set(0)
    }
    
    setIsDragging(false)
  }, [onClose, y, triggerHapticFeedback])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    triggerHapticFeedback('light')
  }, [triggerHapticFeedback])

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      triggerHapticFeedback('light')
      onClose()
    }
  }, [onClose, triggerHapticFeedback])

  // Handle action click
  const handleActionClick = useCallback((action: BottomSheetAction) => {
    triggerHapticFeedback(action.destructive ? 'heavy' : 'medium')
    action.action()
    onClose()
  }, [onClose, triggerHapticFeedback])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        />

        {/* Bottom Sheet */}
        <motion.div
          ref={sheetRef}
          drag="y"
          dragConstraints={{ top: 0, bottom: 400 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{ 
            y,
            opacity: isDragging ? opacity : 1
          }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300,
            duration: 0.3
          }}
          className={cn(
            "relative w-full max-w-md mx-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl",
            "sm:mb-8 sm:max-h-[80vh] overflow-hidden",
            isDragging && "shadow-xl"
          )}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Header */}
          {organization && (
            <div className="px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {organization.logo_url ? (
                    <img 
                      src={organization.logo_url} 
                      alt={`${organization.name} logo`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {organization.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {organization.industry || 'Organization'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          )}

          {/* Actions List */}
          <div className="py-2 max-h-96 overflow-y-auto">
            {actions.map((action, index) => {
              const IconComponent = action.icon
              
              return (
                <motion.button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    "w-full flex items-center space-x-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left",
                    "min-h-[60px] active:bg-gray-100",
                    action.destructive && "hover:bg-red-50 active:bg-red-100"
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: { delay: index * 0.05 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    action.destructive 
                      ? "bg-red-100" 
                      : action.color === 'text-red-600'
                      ? "bg-red-100"
                      : action.color === 'text-orange-600'
                      ? "bg-orange-100"
                      : "bg-gray-100"
                  )}>
                    <IconComponent 
                      className={cn(
                        "w-5 h-5",
                        action.color || (action.destructive ? "text-red-600" : "text-gray-700")
                      )} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium",
                      action.destructive ? "text-red-700" : "text-gray-900"
                    )}>
                      {action.label}
                    </div>
                    {action.description && (
                      <div className="text-sm text-gray-500 truncate">
                        {action.description}
                      </div>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Safe area for iOS */}
          <div className="h-6 sm:h-0" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Quick actions bottom sheet for swipe gestures
interface QuickActionsBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  organization?: Organization | null
  onFavorite?: (orgId: string) => void
  onArchive?: (orgId: string) => void
  onDelete?: (orgId: string) => void
  onShare?: (orgId: string) => void
  enableHapticFeedback?: boolean
}

export function QuickActionsBottomSheet({
  isOpen,
  onClose,
  organization,
  onFavorite,
  onArchive,
  onDelete,
  onShare,
  enableHapticFeedback = true
}: QuickActionsBottomSheetProps) {
  
  const quickActions: BottomSheetAction[] = [
    {
      id: 'favorite',
      icon: organization?.isFavorite ? Heart : Star,
      label: organization?.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      description: organization?.isFavorite ? 'Remove from quick access' : 'Add for quick access',
      color: 'text-red-600',
      action: () => onFavorite?.(organization!.id)
    },
    {
      id: 'share',
      icon: Share2,
      label: 'Share',
      description: 'Send organization link',
      action: () => onShare?.(organization!.id)
    },
    {
      id: 'archive',
      icon: Archive,
      label: 'Archive',
      description: 'Hide from main view',
      color: 'text-orange-600',
      action: () => onArchive?.(organization!.id)
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      description: 'Permanently remove',
      destructive: true,
      action: () => onDelete?.(organization!.id)
    }
  ]

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      organization={organization}
      actions={quickActions}
      enableHapticFeedback={enableHapticFeedback}
    />
  )
}

export default MobileBottomSheet