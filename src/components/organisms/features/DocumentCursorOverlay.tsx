/**
 * DocumentCursorOverlay - Real-time Cursor Tracking Component  
 * Shows live cursors of collaborating users following CLAUDE.md patterns
 */

'use client'

import React, { memo, useCallback, useEffect, useState, useRef } from 'react'
import { cn } from '../../lib/utils'
import type { DocumentCursor, UserPresence } from '../../types/websocket'
import type { AssetId, UserId } from '../../types/branded'
import { useDocumentCollaboration } from '../../hooks/useDocumentCollaboration'

// Props interface following CLAUDE.md naming conventions
interface DocumentCursorOverlayProps {
  assetId: AssetId
  containerRef: React.RefObject<HTMLElement>
  enabled?: boolean
  showUserNames?: boolean
  cursorFadeTimeout?: number
  className?: string
}

/**
 * Animated cursor component for individual users
 */
interface AnimatedCursorProps {
  cursor: DocumentCursor
  containerBounds: DOMRect
  showUserName: boolean
  onFade?: () => void
}

/**
 * Individual cursor component with animation
 */
const AnimatedCursor = memo(function AnimatedCursor({
  cursor,
  containerBounds,
  showUserName,
  onFade
}: AnimatedCursorProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const fadeTimeout = useRef<NodeJS.Timeout>()

  // Calculate cursor position based on line/column
  const calculatePosition = useCallback(() => {
    // This would calculate actual pixel position from line/column
    // For now, using a simplified calculation
    const lineHeight = 20 // Would be determined from editor
    const charWidth = 8 // Would be determined from editor font
    
    const x = cursor.position.column * charWidth
    const y = cursor.position.line * lineHeight
    
    // Ensure cursor stays within container bounds
    const constrainedX = Math.max(0, Math.min(x, containerBounds.width - 20))
    const constrainedY = Math.max(0, Math.min(y, containerBounds.height - 20))
    
    setPosition({ x: constrainedX, y: constrainedY })
  }, [cursor.position, containerBounds])

  // Update position when cursor changes
  useEffect(() => {
    calculatePosition()
    
    // Reset fade timeout
    if (fadeTimeout.current) {
      clearTimeout(fadeTimeout.current)
    }
    
    setIsVisible(true)
    
    // Fade cursor after inactivity
    fadeTimeout.current = setTimeout(() => {
      setIsVisible(false)
      onFade?.()
    }, 3000)

    return () => {
      if (fadeTimeout.current) {
        clearTimeout(fadeTimeout.current)
      }
    }
  }, [cursor.position, calculatePosition, onFade])

  // Get user display name from cursor metadata
  const displayName = cursor.userId.substring(0, 8) // Would get from user service

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute pointer-events-none transition-all duration-200 z-50',
        'transform -translate-x-1 -translate-y-1'
      )}
      style={{
        left: position.x,
        top: position.y,
        color: cursor.color
      }}
    >
      {/* Cursor Line */}
      <div
        className="w-0.5 h-5 animate-pulse"
        style={{ backgroundColor: cursor.color }}
      />
      
      {/* User Name Label */}
      {showUserName && (
        <div
          className={cn(
            'absolute -top-6 left-0 px-2 py-1 rounded text-xs font-medium',
            'text-white shadow-sm whitespace-nowrap',
            'animate-in fade-in duration-200'
          )}
          style={{ backgroundColor: cursor.color }}
        >
          {displayName}
        </div>
      )}
      
      {/* Selection Range */}
      {cursor.selection && (
        <div
          className="absolute opacity-30 pointer-events-none"
          style={{
            backgroundColor: cursor.color,
            left: 0,
            top: 0,
            width: (cursor.selection.end.column - cursor.selection.start.column) * 8, // char width
            height: (cursor.selection.end.line - cursor.selection.start.line + 1) * 20 // line height
          }}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Performance optimization following CLAUDE.md
  return (
    prevProps.cursor.userId === nextProps.cursor.userId &&
    prevProps.cursor.position.line === nextProps.cursor.position.line &&
    prevProps.cursor.position.column === nextProps.cursor.position.column &&
    prevProps.cursor.timestamp === nextProps.cursor.timestamp &&
    prevProps.showUserName === nextProps.showUserName
  )
})

/**
 * Main DocumentCursorOverlay Component
 * Enterprise-grade real-time cursor tracking
 */
export const DocumentCursorOverlay = memo(function DocumentCursorOverlay({
  assetId,
  containerRef,
  enabled = true,
  showUserNames = true,
  cursorFadeTimeout = 3000,
  className
}: DocumentCursorOverlayProps) {
  // Real-time collaboration data
  const { cursors, activeUsers } = useDocumentCollaboration({ 
    assetId, 
    enabled 
  })

  // Container bounds for cursor positioning
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null)
  const [activeCursors, setActiveCursors] = useState<DocumentCursor[]>(cursors)

  // Update container bounds when container changes
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect()
        setContainerBounds(bounds)
      }
    }

    updateBounds()
    
    // Update bounds on resize
    const resizeObserver = new ResizeObserver(updateBounds)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  // Update active cursors when data changes
  useEffect(() => {
    setActiveCursors(cursors)
  }, [cursors])

  // Handle cursor fade
  const handleCursorFade = useCallback((userId: UserId) => {
    setActiveCursors(prev => prev.filter(c => c.userId !== userId))
  }, [])

  // Early return if disabled or no container bounds
  if (!enabled || !containerBounds || activeCursors.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none overflow-hidden',
        className
      )}
      style={{
        width: containerBounds.width,
        height: containerBounds.height
      }}
    >
      {/* Render each cursor */}
      {activeCursors.map(cursor => (
        <AnimatedCursor
          key={cursor.userId}
          cursor={cursor}
          containerBounds={containerBounds}
          showUserName={showUserNames}
          onFade={() => handleCursorFade(cursor.userId)}
        />
      ))}
      
      {/* Collaboration Status Indicator */}
      {activeUsers.length > 1 && (
        <div className="absolute top-2 right-2 pointer-events-auto">
          <div className="flex items-center gap-1 bg-white shadow-sm rounded-full px-3 py-1 border">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gray-700">
              {activeUsers.length} collaborating
            </span>
          </div>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Performance optimization following CLAUDE.md guidelines
  return (
    prevProps.assetId === nextProps.assetId &&
    prevProps.enabled === nextProps.enabled &&
    prevProps.showUserNames === nextProps.showUserNames &&
    prevProps.cursorFadeTimeout === nextProps.cursorFadeTimeout &&
    prevProps.className === nextProps.className
  )
})

export type { DocumentCursorOverlayProps }