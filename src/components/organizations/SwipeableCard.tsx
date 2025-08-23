'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion'
import { Star, Archive, Trash2, Heart, Pin, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeAction {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  backgroundColor: string
  action: () => void
  threshold?: number
}

interface SwipeableCardProps {
  children: React.ReactNode
  leftActions?: SwipeAction[]
  rightActions?: SwipeAction[]
  onSwipeComplete?: (actionId: string, direction: 'left' | 'right') => void
  swipeThreshold?: number
  className?: string
  disabled?: boolean
  enableHapticFeedback?: boolean
}

const defaultLeftActions: SwipeAction[] = [
  {
    id: 'archive',
    icon: Archive,
    label: 'Archive',
    color: 'text-orange-600',
    backgroundColor: 'bg-orange-100',
    action: () => {}
  }
]

const defaultRightActions: SwipeAction[] = [
  {
    id: 'favorite',
    icon: Heart,
    label: 'Favorite',
    color: 'text-red-600',
    backgroundColor: 'bg-red-100',
    action: () => {}
  }
]

export function SwipeableCard({
  children,
  leftActions = defaultLeftActions,
  rightActions = defaultRightActions,
  onSwipeComplete,
  swipeThreshold = 100,
  className,
  disabled = false,
  enableHapticFeedback = true
}: SwipeableCardProps) {
  const constraintsRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentAction, setCurrentAction] = useState<SwipeAction | null>(null)
  const [actionDirection, setActionDirection] = useState<'left' | 'right' | null>(null)
  
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.6, 0.8, 1, 0.8, 0.6])
  const scale = useTransform(x, [-200, -100, 0, 100, 200], [0.95, 0.98, 1, 0.98, 0.95])

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

  // Handle drag start
  const handleDragStart = useCallback(() => {
    if (disabled) return
    setIsDragging(true)
    triggerHapticFeedback('light')
  }, [disabled, triggerHapticFeedback])

  // Handle drag
  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return
    
    const dragX = info.point.x - info.offset.x
    const isLeftSwipe = dragX < -swipeThreshold / 2
    const isRightSwipe = dragX > swipeThreshold / 2
    
    let newAction: SwipeAction | null = null
    let direction: 'left' | 'right' | null = null
    
    if (isLeftSwipe && leftActions.length > 0) {
      // Find the appropriate action based on drag distance
      const actionIndex = Math.min(
        Math.floor(Math.abs(dragX) / swipeThreshold),
        leftActions.length - 1
      )
      newAction = leftActions[actionIndex]
      direction = 'left'
    } else if (isRightSwipe && rightActions.length > 0) {
      // Find the appropriate action based on drag distance
      const actionIndex = Math.min(
        Math.floor(Math.abs(dragX) / swipeThreshold),
        rightActions.length - 1
      )
      newAction = rightActions[actionIndex]
      direction = 'right'
    }
    
    // Trigger haptic feedback when action changes
    if (newAction !== currentAction) {
      if (newAction) {
        triggerHapticFeedback('medium')
      }
      setCurrentAction(newAction)
      setActionDirection(direction)
    }
  }, [disabled, swipeThreshold, leftActions, rightActions, currentAction, triggerHapticFeedback])

  // Handle drag end
  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return
    
    const dragX = info.point.x - info.offset.x
    const shouldComplete = Math.abs(dragX) >= swipeThreshold
    
    if (shouldComplete && currentAction && actionDirection) {
      // Trigger the action
      triggerHapticFeedback('heavy')
      currentAction.action()
      onSwipeComplete?.(currentAction.id, actionDirection)
    }
    
    // Reset state
    setIsDragging(false)
    setCurrentAction(null)
    setActionDirection(null)
    
    // Return to center
    x.set(0)
  }, [disabled, swipeThreshold, currentAction, actionDirection, onSwipeComplete, triggerHapticFeedback, x])

  // Background actions display
  const renderActionBackground = () => {
    if (!currentAction || !actionDirection) return null
    
    const actions = actionDirection === 'left' ? leftActions : rightActions
    const IconComponent = currentAction.icon
    
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-4 rounded-lg",
            currentAction.backgroundColor
          )}
        >
          <IconComponent className={cn("w-6 h-6 mb-1", currentAction.color)} />
          <span className={cn("text-xs font-medium", currentAction.color)}>
            {currentAction.label}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <div 
      ref={constraintsRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Action indicators on the sides */}
      <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center pointer-events-none z-0">
        <AnimatePresence>
          {actionDirection === 'left' && currentAction && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                currentAction.backgroundColor
              )}
            >
              <currentAction.icon className={cn("w-6 h-6", currentAction.color)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center pointer-events-none z-0">
        <AnimatePresence>
          {actionDirection === 'right' && currentAction && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                currentAction.backgroundColor
              )}
            >
              <currentAction.icon className={cn("w-6 h-6", currentAction.color)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={constraintsRef}
        dragElastic={0.2}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ 
          x,
          opacity,
          scale,
          zIndex: isDragging ? 10 : 1
        }}
        animate={{
          x: 0,
          transition: {
            type: "spring",
            stiffness: 500,
            damping: 30
          }
        }}
        className={cn(
          "relative bg-white rounded-xl",
          isDragging && "cursor-grabbing shadow-lg",
          !disabled && !isDragging && "cursor-grab"
        )}
      >
        {children}
      </motion.div>

      {/* Swipe hint overlay (shows briefly on first load) */}
      {!disabled && (
        <SwipeHintOverlay 
          leftActions={leftActions}
          rightActions={rightActions}
        />
      )}
    </div>
  )
}

// Swipe hint component that shows briefly to indicate swipe actions are available
interface SwipeHintOverlayProps {
  leftActions: SwipeAction[]
  rightActions: SwipeAction[]
}

function SwipeHintOverlay({ leftActions, rightActions }: SwipeHintOverlayProps) {
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    // Show hint after a delay if there are actions available
    if (leftActions.length > 0 || rightActions.length > 0) {
      const timer = setTimeout(() => {
        setShowHint(true)
        // Hide after a short duration
        setTimeout(() => setShowHint(false), 2000)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [leftActions.length, rightActions.length])

  if (!showHint) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 pointer-events-none z-20 flex items-center justify-between px-4"
    >
      {/* Left hint */}
      {leftActions.length > 0 && (
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center space-x-1 bg-black/70 text-white px-3 py-1 rounded-full text-xs"
        >
          <Archive className="w-3 h-3" />
          <span>Swipe left</span>
        </motion.div>
      )}

      {/* Right hint */}
      {rightActions.length > 0 && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center space-x-1 bg-black/70 text-white px-3 py-1 rounded-full text-xs"
        >
          <span>Swipe right</span>
          <Heart className="w-3 h-3" />
        </motion.div>
      )}
    </motion.div>
  )
}

// Pre-defined action sets for common use cases
export const commonSwipeActions = {
  organizationLeft: [
    {
      id: 'archive',
      icon: Archive,
      label: 'Archive',
      color: 'text-orange-600',
      backgroundColor: 'bg-orange-100',
      action: () => {}
    },
    {
      id: 'delete',
      icon: Trash2,
      label: 'Delete',
      color: 'text-red-600',
      backgroundColor: 'bg-red-100',
      action: () => {}
    }
  ],
  organizationRight: [
    {
      id: 'favorite',
      icon: Heart,
      label: 'Favorite',
      color: 'text-red-600',
      backgroundColor: 'bg-red-100',
      action: () => {}
    },
    {
      id: 'pin',
      icon: Pin,
      label: 'Pin',
      color: 'text-blue-600',
      backgroundColor: 'bg-blue-100',
      action: () => {}
    }
  ]
}

export default SwipeableCard