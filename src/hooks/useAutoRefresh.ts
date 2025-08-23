/**
 * Auto-Refresh Hook with Background Efficiency
 * Manages automatic data refreshing with smart background optimization and configurable intervals
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface AutoRefreshConfig {
  interval: number // Base refresh interval in milliseconds
  backgroundInterval?: number // Interval when tab is hidden (defaults to 5x base interval)
  enableBackgroundRefresh: boolean
  maxBackgroundInterval?: number // Maximum background interval (defaults to 5 minutes)
  minInterval?: number // Minimum allowed interval (defaults to 5 seconds)
  maxInterval?: number // Maximum allowed interval (defaults to 1 hour)
  adaptiveInterval?: boolean // Automatically adjust interval based on data changes
  pauseOnError?: boolean // Pause refreshing after errors
  maxErrorCount?: number // Max consecutive errors before pausing (defaults to 3)
  errorBackoff?: boolean // Use exponential backoff on errors
  networkAware?: boolean // Adjust behavior based on network conditions
}

export interface AutoRefreshState {
  isActive: boolean
  isPaused: boolean
  isVisible: boolean
  currentInterval: number
  actualInterval: number
  lastRefresh: Date | null
  nextRefresh: Date | null
  consecutiveErrors: number
  refreshCount: number
  backgroundRefreshCount: number
  adaptiveMultiplier: number
  networkCondition: 'fast' | 'slow' | 'unknown'
}

export interface UseAutoRefreshOptions {
  onRefresh: () => Promise<void>
  config: AutoRefreshConfig
  enabled?: boolean
  onStateChange?: (state: AutoRefreshState) => void
  onError?: (error: any, consecutiveErrors: number) => void
  onNetworkChange?: (condition: 'fast' | 'slow' | 'unknown') => void
}

export interface UseAutoRefreshReturn {
  state: AutoRefreshState
  controls: {
    start: () => void
    stop: () => void
    pause: () => void
    resume: () => void
    refresh: () => Promise<void>
    setInterval: (interval: number) => void
    setConfig: (config: Partial<AutoRefreshConfig>) => void
    reset: () => void
  }
  adaptive: {
    increaseFrequency: () => void
    decreaseFrequency: () => void
    resetFrequency: () => void
  }
}

const defaultConfig: AutoRefreshConfig = {
  interval: 30000, // 30 seconds
  enableBackgroundRefresh: true,
  backgroundInterval: undefined, // Will be set to 5x interval
  maxBackgroundInterval: 300000, // 5 minutes
  minInterval: 5000, // 5 seconds
  maxInterval: 3600000, // 1 hour
  adaptiveInterval: true,
  pauseOnError: true,
  maxErrorCount: 3,
  errorBackoff: true,
  networkAware: true
}

export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const { onRefresh, enabled = true, onStateChange, onError, onNetworkChange } = options
  const [config, setConfigState] = useState<AutoRefreshConfig>({ 
    ...defaultConfig, 
    ...options.config,
    backgroundInterval: options.config.backgroundInterval || (options.config.interval * 5)
  })

  const [state, setState] = useState<AutoRefreshState>({
    isActive: false,
    isPaused: false,
    isVisible: true,
    currentInterval: config.interval,
    actualInterval: config.interval,
    lastRefresh: null,
    nextRefresh: null,
    consecutiveErrors: 0,
    refreshCount: 0,
    backgroundRefreshCount: 0,
    adaptiveMultiplier: 1,
    networkCondition: 'unknown'
  })

  const refreshTimerRef = useRef<NodeJS.Timeout>()
  const refreshingRef = useRef(false)
  const startTimeRef = useRef<number>(Date.now())
  const lastActivityRef = useRef<number>(Date.now())
  const networkMonitorRef = useRef<{ startTime: number; requestCount: number; totalTime: number }>({
    startTime: Date.now(),
    requestCount: 0,
    totalTime: 0
  })

  // Network condition monitoring
  const updateNetworkCondition = useCallback((requestDuration: number) => {
    if (!config.networkAware) return

    const monitor = networkMonitorRef.current
    monitor.requestCount++
    monitor.totalTime += requestDuration

    if (monitor.requestCount >= 5) {
      const averageTime = monitor.totalTime / monitor.requestCount
      const newCondition = averageTime < 1000 ? 'fast' : averageTime > 3000 ? 'slow' : 'unknown'
      
      if (newCondition !== state.networkCondition) {
        setState(prev => ({ ...prev, networkCondition: newCondition }))
        onNetworkChange?.(newCondition)
        
        // Adjust intervals based on network condition
        if (newCondition === 'slow') {
          setState(prev => ({ 
            ...prev, 
            actualInterval: Math.min(prev.currentInterval * 1.5, config.maxInterval!)
          }))
        } else if (newCondition === 'fast') {
          setState(prev => ({ 
            ...prev, 
            actualInterval: Math.max(prev.currentInterval * 0.8, config.minInterval!)
          }))
        }
      }

      // Reset monitor
      networkMonitorRef.current = {
        startTime: Date.now(),
        requestCount: 0,
        totalTime: 0
      }
    }
  }, [config.networkAware, config.maxInterval, config.minInterval, state.networkCondition, onNetworkChange])

  // Calculate actual refresh interval based on various factors
  const calculateActualInterval = useCallback(() => {
    let interval = state.currentInterval
    
    // Apply adaptive multiplier
    if (config.adaptiveInterval) {
      interval *= state.adaptiveMultiplier
    }

    // Apply background adjustment
    if (!state.isVisible && config.enableBackgroundRefresh) {
      const backgroundInterval = config.backgroundInterval || (config.interval * 5)
      interval = Math.max(interval, backgroundInterval)
      interval = Math.min(interval, config.maxBackgroundInterval || 300000)
    }

    // Apply error backoff
    if (config.errorBackoff && state.consecutiveErrors > 0) {
      const backoffMultiplier = Math.pow(2, Math.min(state.consecutiveErrors, 5))
      interval *= backoffMultiplier
    }

    // Enforce limits
    interval = Math.max(interval, config.minInterval!)
    interval = Math.min(interval, config.maxInterval!)

    return interval
  }, [state, config])

  // Execute refresh with error handling and timing
  const executeRefresh = useCallback(async () => {
    if (refreshingRef.current || !enabled || state.isPaused) return

    refreshingRef.current = true
    const refreshStart = Date.now()
    
    try {
      await onRefresh()
      
      const refreshDuration = Date.now() - refreshStart
      updateNetworkCondition(refreshDuration)

      setState(prev => ({
        ...prev,
        consecutiveErrors: 0,
        refreshCount: prev.refreshCount + 1,
        backgroundRefreshCount: prev.isVisible ? prev.backgroundRefreshCount : prev.backgroundRefreshCount + 1,
        lastRefresh: new Date()
      }))

      // Adaptive frequency adjustment based on refresh success
      if (config.adaptiveInterval && state.consecutiveErrors === 0) {
        // Gradually return to normal frequency after successful refreshes
        setState(prev => ({
          ...prev,
          adaptiveMultiplier: Math.max(prev.adaptiveMultiplier * 0.95, 0.5)
        }))
      }

    } catch (error) {
      console.error('Auto-refresh failed:', error)
      
      setState(prev => ({
        ...prev,
        consecutiveErrors: prev.consecutiveErrors + 1
      }))

      onError?.(error, state.consecutiveErrors + 1)

      // Pause if too many consecutive errors
      if (config.pauseOnError && state.consecutiveErrors + 1 >= config.maxErrorCount!) {
        setState(prev => ({ ...prev, isPaused: true }))
      }

      // Adaptive frequency adjustment on error
      if (config.adaptiveInterval) {
        setState(prev => ({
          ...prev,
          adaptiveMultiplier: Math.min(prev.adaptiveMultiplier * 1.5, 3)
        }))
      }
    } finally {
      refreshingRef.current = false
      lastActivityRef.current = Date.now()
    }
  }, [enabled, state.isPaused, state.consecutiveErrors, onRefresh, onError, config, updateNetworkCondition])

  // Schedule next refresh
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    if (!state.isActive || state.isPaused) return

    const actualInterval = calculateActualInterval()
    const nextRefreshTime = new Date(Date.now() + actualInterval)

    setState(prev => ({
      ...prev,
      actualInterval,
      nextRefresh: nextRefreshTime
    }))

    refreshTimerRef.current = setTimeout(() => {
      executeRefresh().then(() => {
        scheduleRefresh() // Schedule next refresh after current one completes
      })
    }, actualInterval)

  }, [state.isActive, state.isPaused, calculateActualInterval, executeRefresh])

  // Start auto-refresh
  const start = useCallback(() => {
    setState(prev => ({ ...prev, isActive: true, isPaused: false }))
  }, [])

  // Stop auto-refresh
  const stop = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = undefined
    }
    
    setState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
      nextRefresh: null
    }))
  }, [])

  // Pause auto-refresh
  const pause = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = undefined
    }
    
    setState(prev => ({ ...prev, isPaused: true, nextRefresh: null }))
  }, [])

  // Resume auto-refresh
  const resume = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false, consecutiveErrors: 0 }))
  }, [])

  // Manual refresh
  const refresh = useCallback(async () => {
    await executeRefresh()
    if (state.isActive && !state.isPaused) {
      scheduleRefresh() // Reschedule after manual refresh
    }
  }, [executeRefresh, state.isActive, state.isPaused, scheduleRefresh])

  // Set new interval
  const setInterval = useCallback((newInterval: number) => {
    const clampedInterval = Math.max(
      Math.min(newInterval, config.maxInterval!),
      config.minInterval!
    )
    
    setState(prev => ({ ...prev, currentInterval: clampedInterval }))
    
    if (state.isActive) {
      scheduleRefresh() // Reschedule with new interval
    }
  }, [config.maxInterval, config.minInterval, state.isActive, scheduleRefresh])

  // Update configuration
  const setConfig = useCallback((newConfig: Partial<AutoRefreshConfig>) => {
    setConfigState(prev => ({ 
      ...prev, 
      ...newConfig,
      backgroundInterval: newConfig.backgroundInterval || 
        (newConfig.interval ? newConfig.interval * 5 : prev.backgroundInterval)
    }))
  }, [])

  // Reset to initial state
  const reset = useCallback(() => {
    stop()
    setState({
      isActive: false,
      isPaused: false,
      isVisible: true,
      currentInterval: config.interval,
      actualInterval: config.interval,
      lastRefresh: null,
      nextRefresh: null,
      consecutiveErrors: 0,
      refreshCount: 0,
      backgroundRefreshCount: 0,
      adaptiveMultiplier: 1,
      networkCondition: 'unknown'
    })
    startTimeRef.current = Date.now()
    lastActivityRef.current = Date.now()
  }, [stop, config.interval])

  // Adaptive frequency controls
  const increaseFrequency = useCallback(() => {
    setState(prev => ({
      ...prev,
      adaptiveMultiplier: Math.max(prev.adaptiveMultiplier * 0.5, 0.1)
    }))
  }, [])

  const decreaseFrequency = useCallback(() => {
    setState(prev => ({
      ...prev,
      adaptiveMultiplier: Math.min(prev.adaptiveMultiplier * 2, 10)
    }))
  }, [])

  const resetFrequency = useCallback(() => {
    setState(prev => ({ ...prev, adaptiveMultiplier: 1 }))
  }, [])

  // Handle visibility changes
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setState(prev => ({ ...prev, isVisible }))
      
      // Immediately reschedule if visibility changed
      if (state.isActive && !state.isPaused) {
        scheduleRefresh()
      }

      // Track activity on visibility change
      if (isVisible) {
        lastActivityRef.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.isActive, state.isPaused, scheduleRefresh])

  // Handle user activity detection
  useEffect(() => {
    if (!config.adaptiveInterval || typeof window === 'undefined') return

    const handleActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [config.adaptiveInterval])

  // Auto-start effect
  useEffect(() => {
    if (enabled && !state.isActive) {
      start()
    } else if (!enabled && state.isActive) {
      stop()
    }
  }, [enabled, state.isActive, start, stop])

  // Schedule refresh when active state changes
  useEffect(() => {
    if (state.isActive && !state.isPaused) {
      scheduleRefresh()
    }
  }, [state.isActive, state.isPaused, scheduleRefresh])

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state)
  }, [state, onStateChange])

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [])

  return {
    state,
    controls: {
      start,
      stop,
      pause,
      resume,
      refresh,
      setInterval,
      setConfig,
      reset
    },
    adaptive: {
      increaseFrequency,
      decreaseFrequency,
      resetFrequency
    }
  }
}