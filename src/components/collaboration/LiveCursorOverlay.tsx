/**
 * Live Cursor Overlay Component
 * Renders real-time cursors and selections from other users
 * Following CLAUDE.md patterns with Atomic Design
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Eye, EyeOff, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { UserCursor, CursorUpdateEvent } from '../../lib/services/cursor-tracking.service'
import type { AssetId } from '../../types/database'

interface LiveCursorOverlayProps {
  assetId: AssetId
  cursors: UserCursor[]
  containerRef: React.RefObject<HTMLElement>
  textareaRef?: React.RefObject<HTMLTextAreaElement>
  isVisible?: boolean
  showSelections?: boolean
  showUserInfo?: boolean
  animationDuration?: number
  className?: string
  onCursorClick?: (cursor: UserCursor) => void
}

interface RenderedCursor {
  cursor: UserCursor
  position: { x: number; y: number }
  isVisible: boolean
  isInViewport: boolean
}

interface SelectionHighlight {
  cursor: UserCursor
  bounds: DOMRect[]
  isVisible: boolean
}

export const LiveCursorOverlay = memo(function LiveCursorOverlay({
  assetId,
  cursors,
  containerRef,
  textareaRef,
  isVisible = true,
  showSelections = true,
  showUserInfo = true,
  animationDuration = 300,
  className = '',
  onCursorClick
}: LiveCursorOverlayProps) {
  const [renderedCursors, setRenderedCursors] = useState<RenderedCursor[]>([])
  const [selectionHighlights, setSelectionHighlights] = useState<SelectionHighlight[]>([])
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null)
  const animationFrameRef = useRef<number>()
  const lastUpdateRef = useRef<number>(0)

  // Calculate cursor positions based on text content and container
  const calculateCursorPositions = useCallback(() => {
    if (!containerRef.current || !isVisible || cursors.length === 0) {
      setRenderedCursors([])
      setSelectionHighlights([])
      return
    }

    const container = containerRef.current
    const textarea = textareaRef?.current
    const bounds = container.getBoundingClientRect()
    
    if (!bounds.width || !bounds.height) return

    setContainerBounds(bounds)

    const newRenderedCursors: RenderedCursor[] = []
    const newSelectionHighlights: SelectionHighlight[] = []

    cursors.forEach(cursor => {
      if (!cursor.isActive) return

      let position = { x: 0, y: 0 }
      let isInViewport = true

      // Calculate position based on cursor position
      if (textarea) {
        // For textarea/input elements
        position = calculateTextareaPosition(textarea, cursor, bounds)
      } else {
        // For contenteditable or other elements
        position = calculateContentEditablePosition(container, cursor, bounds)
      }

      // Check if cursor is within viewport
      const containerRect = container.getBoundingClientRect()
      isInViewport = (
        position.x >= containerRect.left &&
        position.x <= containerRect.right &&
        position.y >= containerRect.top &&
        position.y <= containerRect.bottom
      )

      newRenderedCursors.push({
        cursor,
        position,
        isVisible: cursor.isActive && !cursor.metadata?.isIdle,
        isInViewport
      })

      // Calculate selection highlights
      if (showSelections && cursor.selection) {
        const selectionBounds = calculateSelectionBounds(
          textarea || container,
          cursor,
          bounds
        )
        
        if (selectionBounds.length > 0) {
          newSelectionHighlights.push({
            cursor,
            bounds: selectionBounds,
            isVisible: cursor.isActive
          })
        }
      }
    })

    setRenderedCursors(newRenderedCursors)
    setSelectionHighlights(newSelectionHighlights)
    
  }, [cursors, containerRef, textareaRef, isVisible, showSelections])

  // Calculate position for textarea elements
  const calculateTextareaPosition = useCallback((
    textarea: HTMLTextAreaElement,
    cursor: UserCursor,
    containerBounds: DOMRect
  ) => {
    const style = getComputedStyle(textarea)
    const fontSize = parseFloat(style.fontSize)
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2
    const paddingLeft = parseFloat(style.paddingLeft)
    const paddingTop = parseFloat(style.paddingTop)

    // Create temporary element to measure text
    const measurer = document.createElement('div')
    measurer.style.position = 'absolute'
    measurer.style.visibility = 'hidden'
    measurer.style.whiteSpace = 'pre-wrap'
    measurer.style.font = style.font
    measurer.style.width = `${textarea.clientWidth - paddingLeft * 2}px`
    measurer.style.wordWrap = 'break-word'
    
    document.body.appendChild(measurer)

    try {
      const content = textarea.value.substring(0, cursor.position.offset)
      measurer.textContent = content

      const textBounds = measurer.getBoundingClientRect()
      const textareaRect = textarea.getBoundingClientRect()

      const x = textareaRect.left + paddingLeft + (textBounds.width % (textarea.clientWidth - paddingLeft * 2))
      const y = textareaRect.top + paddingTop + (cursor.position.line * lineHeight)

      return { x, y }
    } finally {
      document.body.removeChild(measurer)
    }
  }, [])

  // Calculate position for contenteditable elements
  const calculateContentEditablePosition = useCallback((
    element: HTMLElement,
    cursor: UserCursor,
    containerBounds: DOMRect
  ) => {
    try {
      // Create a range at the cursor position
      const range = document.createRange()
      const textNodes = getTextNodes(element)
      
      let currentOffset = 0
      let targetNode: Node | null = null
      let targetOffset = 0

      // Find the text node containing the cursor position
      for (const node of textNodes) {
        const nodeLength = node.textContent?.length || 0
        if (currentOffset + nodeLength >= cursor.position.offset) {
          targetNode = node
          targetOffset = cursor.position.offset - currentOffset
          break
        }
        currentOffset += nodeLength
      }

      if (targetNode) {
        range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0))
        range.collapse(true)
        
        const rect = range.getBoundingClientRect()
        return { x: rect.left, y: rect.top }
      }

      return { x: containerBounds.left, y: containerBounds.top }
    } catch {
      return { x: containerBounds.left, y: containerBounds.top }
    }
  }, [])

  // Calculate selection bounds
  const calculateSelectionBounds = useCallback((
    element: HTMLElement | HTMLTextAreaElement,
    cursor: UserCursor,
    containerBounds: DOMRect
  ): DOMRect[] => {
    if (!cursor.selection) return []

    try {
      const bounds: DOMRect[] = []
      const range = document.createRange()

      if (element instanceof HTMLTextAreaElement) {
        // For textarea, create visual selection rectangles
        const style = getComputedStyle(element)
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
        const rect = element.getBoundingClientRect()

        const startLine = cursor.selection.start.line
        const endLine = cursor.selection.end.line

        for (let line = startLine; line <= endLine; line++) {
          const y = rect.top + parseFloat(style.paddingTop) + (line * lineHeight)
          const startCol = line === startLine ? cursor.selection.start.column : 0
          const endCol = line === endLine ? cursor.selection.end.column : 100 // Estimate

          bounds.push(new DOMRect(
            rect.left + parseFloat(style.paddingLeft) + (startCol * 8), // Estimate char width
            y,
            (endCol - startCol) * 8, // Estimate char width
            lineHeight
          ))
        }
      } else {
        // For contenteditable, use Range API
        const textNodes = getTextNodes(element)
        let currentOffset = 0

        for (const node of textNodes) {
          const nodeLength = node.textContent?.length || 0
          const nodeStart = currentOffset
          const nodeEnd = currentOffset + nodeLength

          // Check if selection intersects with this node
          if (cursor.selection.start.offset < nodeEnd && cursor.selection.end.offset > nodeStart) {
            const rangeStart = Math.max(cursor.selection.start.offset - nodeStart, 0)
            const rangeEnd = Math.min(cursor.selection.end.offset - nodeStart, nodeLength)

            if (rangeStart < rangeEnd) {
              range.setStart(node, rangeStart)
              range.setEnd(node, rangeEnd)
              
              const rects = range.getClientRects()
              bounds.push(...Array.from(rects))
            }
          }

          currentOffset += nodeLength
        }
      }

      return bounds
    } catch {
      return []
    }
  }, [])

  // Get all text nodes from an element
  const getTextNodes = useCallback((element: HTMLElement): Text[] => {
    const textNodes: Text[] = []
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    )

    let node
    while (node = walker.nextNode()) {
      textNodes.push(node as Text)
    }

    return textNodes
  }, [])

  // Update positions with throttling
  useEffect(() => {
    const throttledUpdate = () => {
      const now = Date.now()
      if (now - lastUpdateRef.current < 16) { // ~60fps
        animationFrameRef.current = requestAnimationFrame(throttledUpdate)
        return
      }
      
      lastUpdateRef.current = now
      calculateCursorPositions()
    }

    throttledUpdate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [cursors, calculateCursorPositions])

  // Handle container resize
  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      calculateCursorPositions()
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef, calculateCursorPositions])

  // Cursor component
  const CursorIndicator = memo(({ renderedCursor }: { renderedCursor: RenderedCursor }) => {
    const { cursor, position, isVisible, isInViewport } = renderedCursor

    if (!isVisible || !isInViewport) return null

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: animationDuration / 1000 }}
        className="absolute pointer-events-none z-50"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-1px, -2px)'
        }}
      >
        {/* Cursor line */}
        <motion.div
          className="w-0.5 h-5 rounded-full"
          style={{ backgroundColor: cursor.color }}
          animate={{
            opacity: cursor.metadata?.isTyping ? [1, 0.3, 1] : 1
          }}
          transition={{
            duration: cursor.metadata?.isTyping ? 1 : 0,
            repeat: cursor.metadata?.isTyping ? Infinity : 0
          }}
        />

        {/* User info card */}
        {showUserInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-12 left-0 pointer-events-auto"
          >
            <Card 
              className="px-2 py-1 shadow-lg border-0 text-xs whitespace-nowrap cursor-pointer"
              style={{ backgroundColor: cursor.color, color: 'white' }}
              onClick={() => onCursorClick?.(cursor)}
            >
              <div className="flex items-center space-x-1">
                <Avatar className="w-4 h-4">
                  {cursor.userAvatar && (
                    <AvatarImage src={cursor.userAvatar} alt={cursor.userName} />
                  )}
                  <AvatarFallback className="text-xs">
                    {cursor.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{cursor.userName}</span>
                {cursor.metadata?.isTyping && (
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex space-x-0.5"
                  >
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    )
  })
  CursorIndicator.displayName = 'CursorIndicator'

  // Selection highlight component
  const SelectionHighlight = memo(({ highlight }: { highlight: SelectionHighlight }) => {
    if (!highlight.isVisible) return null

    return (
      <>
        {highlight.bounds.map((rect, index) => (
          <motion.div
            key={`${highlight.cursor.userId}-selection-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            exit={{ opacity: 0 }}
            className="absolute pointer-events-none z-40"
            style={{
              left: rect.left - (containerBounds?.left || 0),
              top: rect.top - (containerBounds?.top || 0),
              width: rect.width,
              height: rect.height,
              backgroundColor: highlight.cursor.color,
              borderRadius: '2px'
            }}
          />
        ))}
      </>
    )
  })
  SelectionHighlight.displayName = 'SelectionHighlight'

  if (!isVisible || (!renderedCursors.length && !selectionHighlights.length)) {
    return null
  }

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {/* Selection highlights */}
      <AnimatePresence>
        {selectionHighlights.map(highlight => (
          <SelectionHighlight
            key={`selection-${highlight.cursor.userId}`}
            highlight={highlight}
          />
        ))}
      </AnimatePresence>

      {/* Cursor indicators */}
      <AnimatePresence>
        {renderedCursors.map(renderedCursor => (
          <CursorIndicator
            key={`cursor-${renderedCursor.cursor.userId}`}
            renderedCursor={renderedCursor}
          />
        ))}
      </AnimatePresence>

      {/* Connection status indicator */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <Badge variant="secondary" className="text-xs">
          <Wifi className="w-3 h-3 mr-1" />
          {cursors.filter(c => c.isActive).length} active
        </Badge>
      </div>
    </div>
  )
})

export default LiveCursorOverlay