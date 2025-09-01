'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  onResize: (width: number) => void
  minWidth?: number
  maxWidth?: number
  className?: string
  showIndicator?: boolean
}

export function ResizeHandle({
  onResize,
  minWidth = 320,
  maxWidth = 1200,
  className,
  showIndicator = true
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [currentWidth, setCurrentWidth] = useState<number | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const newWidth = window.innerWidth - e.clientX
    const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth)
    
    setCurrentWidth(clampedWidth)
    onResize(clampedWidth)
  }, [isDragging, minWidth, maxWidth, onResize])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setCurrentWidth(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <>
      <div
        ref={handleRef}
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize group z-50",
          "hover:bg-blue-500 hover:w-1.5 transition-all",
          isDragging && "bg-blue-600 w-1.5",
          className
        )}
      >
        {/* Visual indicator line */}
        <div className="absolute inset-0 bg-transparent group-hover:bg-blue-500/20" />
        
        {/* Larger invisible hit area for easier grabbing */}
        <div className="absolute -left-2 -right-2 top-0 bottom-0" />
        
        {/* Drag handle dots */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col gap-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
            <div className="w-1 h-1 bg-gray-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* Width indicator tooltip */}
      {showIndicator && isDragging && currentWidth && (
        <div className="fixed z-[100] pointer-events-none" 
          style={{ 
            left: window.innerWidth - currentWidth - 60, 
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
            {currentWidth}px
          </div>
        </div>
      )}
    </>
  )
}