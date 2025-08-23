'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Search, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import useMobileGestures from '@/hooks/useMobileGestures'

interface MobilePullToSearchProps {
  isSearchVisible: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearchSubmit: (query: string) => void
  onSearchToggle: (visible: boolean) => void
  placeholder?: string
  children: React.ReactNode
  className?: string
  enableHapticFeedback?: boolean
  pullThreshold?: number
}

export function MobilePullToSearch({
  isSearchVisible,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearchToggle,
  placeholder = "Search organizations...",
  children,
  className,
  enableHapticFeedback = true,
  pullThreshold = 80
}: MobilePullToSearchProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [searchActivated, setSearchActivated] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const pullDistance = useMotionValue(0)
  const pullOpacity = useTransform(pullDistance, [0, pullThreshold], [0, 1])
  const pullScale = useTransform(pullDistance, [0, pullThreshold], [0.8, 1])

  // Handle pull to search gesture
  const handlePullToSearch = useCallback((gesture: any) => {
    const { distance, isActive } = gesture
    
    pullDistance.set(Math.min(distance, pullThreshold * 1.5))
    
    if (isActive && !searchActivated) {
      setSearchActivated(true)
      onSearchToggle(true)
    }
    
    setIsPulling(isActive)
  }, [pullDistance, pullThreshold, searchActivated, onSearchToggle])

  // Mobile gestures hook
  const { ref: gestureRef, triggerHapticFeedback } = useMobileGestures({
    onPullToRefresh: handlePullToSearch,
    pullThreshold,
    enableHapticFeedback
  })

  // Combine refs
  useEffect(() => {
    if (gestureRef.current && containerRef.current) {
      gestureRef.current = containerRef.current
    }
  }, [gestureRef])

  // Handle search input changes
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }, [onSearchChange])

  // Handle search submission
  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearchSubmit(searchQuery.trim())
      triggerHapticFeedback('medium')
    }
  }, [searchQuery, onSearchSubmit, triggerHapticFeedback])

  // Handle search close
  const handleSearchClose = useCallback(() => {
    onSearchToggle(false)
    onSearchChange('')
    setSearchActivated(false)
    setIsPulling(false)
    pullDistance.set(0)
    triggerHapticFeedback('light')
  }, [onSearchToggle, onSearchChange, pullDistance, triggerHapticFeedback])

  // Auto-focus search input when visible
  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isSearchVisible])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchVisible) {
        handleSearchClose()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onSearchToggle(!isSearchVisible)
        triggerHapticFeedback('medium')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSearchVisible, handleSearchClose, onSearchToggle, triggerHapticFeedback])

  return (
    <div 
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Pull to search indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10"
        style={{ 
          opacity: pullOpacity,
          scale: pullScale,
          y: pullDistance
        }}
        initial={{ y: -60 }}
      >
        <div className={cn(
          "flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200",
          isPulling && "bg-blue-50 border-blue-200"
        )}>
          <motion.div
            animate={{ 
              rotate: isPulling ? 180 : 0 
            }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className={cn(
              "w-6 h-6",
              isPulling ? "text-blue-600" : "text-gray-400"
            )} />
          </motion.div>
        </div>
      </motion.div>

      {/* Search bar */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="sticky top-0 z-20 bg-white border-b border-gray-200"
          >
            <div className="px-4 py-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative flex items-center">
                  {/* Search icon */}
                  <div className="absolute left-3 flex items-center justify-center">
                    <Search className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Search input */}
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    placeholder={placeholder}
                    className={cn(
                      "w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl",
                      "bg-gray-50 text-gray-900 placeholder-gray-500",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white",
                      "text-base" // Prevents zoom on iOS
                    )}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />

                  {/* Clear/Close button */}
                  <motion.button
                    type="button"
                    onClick={handleSearchClose}
                    className="absolute right-3 flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-200 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </motion.button>
                </div>

                {/* Search suggestions or recent searches could go here */}
                {searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-30"
                  >
                    {/* Example: Recent searches or suggestions */}
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 px-3 py-2">
                        Press Enter to search
                      </div>
                    </div>
                  </motion.div>
                )}
              </form>

              {/* Search hint */}
              {!searchQuery && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center mt-2 text-xs text-gray-500"
                >
                  <span>Pull down to search • Cmd+K</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className={cn(
        "transition-transform duration-300 ease-out",
        isPulling && "transform translate-y-2"
      )}>
        {children}
      </div>

      {/* Search overlay for mobile */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-10 md:hidden"
            onClick={handleSearchClose}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Simplified version for basic pull-to-search functionality
interface SimplePullToSearchProps {
  onPullToSearch: () => void
  children: React.ReactNode
  threshold?: number
  className?: string
}

export function SimplePullToSearch({
  onPullToSearch,
  children,
  threshold = 80,
  className
}: SimplePullToSearchProps) {
  const [isPulling, setIsPulling] = useState(false)
  const pullDistance = useMotionValue(0)

  const handlePull = useCallback((gesture: any) => {
    const { distance, isActive } = gesture
    
    pullDistance.set(Math.min(distance, threshold * 1.5))
    setIsPulling(isActive)
    
    if (isActive) {
      onPullToSearch()
    }
  }, [pullDistance, threshold, onPullToSearch])

  const { ref } = useMobileGestures({
    onPullToRefresh: handlePull,
    pullThreshold: threshold
  })

  return (
    <div ref={ref} className={className}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 z-10"
        style={{ 
          y: pullDistance,
          opacity: pullDistance
        }}
      >
        <div className={cn(
          "w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center",
          isPulling && "bg-blue-50"
        )}>
          <Search className={cn(
            "w-4 h-4",
            isPulling ? "text-blue-600" : "text-gray-400"
          )} />
        </div>
      </motion.div>

      {children}
    </div>
  )
}

export default MobilePullToSearch