/**
 * Pull-to-Refresh Hook
 * Provides touch-based pull-to-refresh functionality with visual feedback
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number // Distance in pixels to trigger refresh
  maxPullDistance?: number // Maximum pull distance
  refreshingDistance?: number // Distance to maintain while refreshing
  resistance?: number // Resistance factor for pull distance calculation
  enabled?: boolean // Whether pull-to-refresh is enabled
  snapBackDuration?: number // Duration for snap back animation (ms)
  refreshTimeout?: number // Maximum time to wait for refresh (ms)
}

export interface PullToRefreshState {
  isPulling: boolean
  pullDistance: number
  isRefreshing: boolean
  canRefresh: boolean
  pullPercentage: number
}

export interface UsePullToRefreshReturn {
  state: PullToRefreshState
  bind: {
    onTouchStart: (e: TouchEvent) => void
    onTouchMove: (e: TouchEvent) => void
    onTouchEnd: (e: TouchEvent) => void
  }
  refresh: () => Promise<void>
  cancel: () => void
}

const defaultOptions: Required<UsePullToRefreshOptions> = {
  onRefresh: async () => {},
  threshold: 70,
  maxPullDistance: 120,
  refreshingDistance: 50,
  resistance: 2,
  enabled: true,
  snapBackDuration: 300,
  refreshTimeout: 30000
}

export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const config = { ...defaultOptions, ...options }
  
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
    pullPercentage: 0
  })

  const touchStartRef = useRef<{ y: number; time: number } | null>(null)
  const animationFrameRef = useRef<number>()
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const snapBackTimeoutRef = useRef<NodeJS.Timeout>()
  const initialScrollTopRef = useRef<number>(0)

  // Calculate pull distance with resistance
  const calculatePullDistance = useCallback((rawDistance: number): number => {
    const resistance = config.resistance
    const threshold = config.threshold
    const maxDistance = config.maxPullDistance

    let distance = rawDistance / resistance

    // Apply exponential resistance after threshold
    if (distance > threshold) {
      const excess = distance - threshold
      distance = threshold + Math.sqrt(excess * 20)
    }

    return Math.min(distance, maxDistance)
  }, [config.resistance, config.threshold, config.maxPullDistance])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!config.enabled || state.isRefreshing) return

    // Only activate if scrolled to top
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    if (scrollTop > 0) return

    const touch = e.touches[0]
    if (!touch) return

    touchStartRef.current = {
      y: touch.clientY,
      time: Date.now()
    }

    initialScrollTopRef.current = scrollTop

    setState(prev => ({
      ...prev,
      isPulling: true,
      pullDistance: 0,
      canRefresh: false,
      pullPercentage: 0
    }))

  }, [config.enabled, state.isRefreshing])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!config.enabled || state.isRefreshing || !touchStartRef.current || !state.isPulling) return

    const touch = e.touches[0]
    if (!touch) return

    const currentScrollTop = document.documentElement.scrollTop || document.body.scrollTop
    
    // Only continue if still at top
    if (currentScrollTop > 0) {
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false,
        pullPercentage: 0
      }))
      touchStartRef.current = null
      return
    }

    const rawDistance = Math.max(0, touch.clientY - touchStartRef.current.y)
    
    // Only activate pull-to-refresh for significant downward movement
    if (rawDistance < 10) return

    // Prevent default scrolling
    e.preventDefault()

    const pullDistance = calculatePullDistance(rawDistance)
    const canRefresh = pullDistance >= config.threshold
    const pullPercentage = Math.min(pullDistance / config.threshold, 1)

    setState(prev => ({
      ...prev,
      pullDistance,
      canRefresh,
      pullPercentage
    }))

  }, [config.enabled, config.threshold, state.isRefreshing, state.isPulling, calculatePullDistance])

  // Handle touch end
  const handleTouchEnd = useCallback(async (e: TouchEvent) => {
    if (!config.enabled || !touchStartRef.current || !state.isPulling) return

    touchStartRef.current = null

    if (state.canRefresh && !state.isRefreshing) {
      // Trigger refresh
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        pullDistance: config.refreshingDistance,
        isPulling: false
      }))

      try {
        // Set refresh timeout
        refreshTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            isRefreshing: false,
            pullDistance: 0,
            canRefresh: false,
            pullPercentage: 0,
            isPulling: false
          }))
        }, config.refreshTimeout)

        await config.onRefresh()

        // Clear timeout if refresh completes early
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current)
        }

        // Animate back to original position
        animateSnapBack()

      } catch (error) {
        console.error('Pull-to-refresh error:', error)
        animateSnapBack()
      }
    } else {
      // Snap back without refreshing
      animateSnapBack()
    }

  }, [config.enabled, config.onRefresh, config.refreshingDistance, config.refreshTimeout, state.isPulling, state.canRefresh, state.isRefreshing])

  // Animate snap back to original position
  const animateSnapBack = useCallback(() => {
    const startDistance = state.pullDistance
    const startTime = Date.now()
    const duration = config.snapBackDuration

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Use easeOutCubic for smooth snap back
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentDistance = startDistance * (1 - easeProgress)

      setState(prev => ({
        ...prev,
        pullDistance: currentDistance,
        pullPercentage: currentDistance / config.threshold
      }))

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        setState(prev => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false,
          pullPercentage: 0
        }))
      }
    }

    animate()
  }, [state.pullDistance, config.snapBackDuration, config.threshold])

  // Manual refresh function
  const refresh = useCallback(async (): Promise<void> => {
    if (state.isRefreshing) return

    setState(prev => ({
      ...prev,
      isRefreshing: true,
      pullDistance: config.refreshingDistance,
      isPulling: false,
      canRefresh: true
    }))

    try {
      await config.onRefresh()
    } catch (error) {
      console.error('Manual refresh error:', error)
    } finally {
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        pullDistance: 0,
        canRefresh: false,
        pullPercentage: 0,
        isPulling: false
      }))
    }
  }, [config.onRefresh, config.refreshingDistance, state.isRefreshing])

  // Cancel refresh
  const cancel = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (snapBackTimeoutRef.current) {
      clearTimeout(snapBackTimeoutRef.current)
    }

    setState({
      isPulling: false,
      pullDistance: 0,
      isRefreshing: false,
      canRefresh: false,
      pullPercentage: 0
    })

    touchStartRef.current = null
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  // Prevent scrolling when pulling
  useEffect(() => {
    if (state.isPulling && state.pullDistance > 0) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [state.isPulling, state.pullDistance])

  // Bind touch events (use passive: false to prevent default)
  const bind = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }

  return {
    state,
    bind,
    refresh,
    cancel
  }
}