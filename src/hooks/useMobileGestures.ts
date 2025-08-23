'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

export interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

export interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right'
  distance: number
  velocity: number
  duration: number
  startPoint: TouchPoint
  endPoint: TouchPoint
}

export interface PinchGesture {
  scale: number
  centerX: number
  centerY: number
}

export interface PullGesture {
  distance: number
  isActive: boolean
  threshold: number
}

interface UseMobileGesturesOptions {
  onSwipe?: (gesture: SwipeGesture) => void
  onPinch?: (gesture: PinchGesture) => void
  onPullToRefresh?: (gesture: PullGesture) => void
  onLongPress?: (point: TouchPoint) => void
  onDoubleTap?: (point: TouchPoint) => void
  swipeThreshold?: number
  pinchThreshold?: number
  pullThreshold?: number
  longPressThreshold?: number
  doubleTapThreshold?: number
  enableHapticFeedback?: boolean
  disabled?: boolean
}

interface GestureState {
  startTouch: TouchPoint | null
  lastTouch: TouchPoint | null
  startDistance: number
  lastScale: number
  tapCount: number
  lastTapTime: number
  longPressTimer: NodeJS.Timeout | null
  isPulling: boolean
  pullStartY: number
}

export function useMobileGestures(options: UseMobileGesturesOptions = {}) {
  const {
    onSwipe,
    onPinch,
    onPullToRefresh,
    onLongPress,
    onDoubleTap,
    swipeThreshold = 50,
    pinchThreshold = 0.1,
    pullThreshold = 80,
    longPressThreshold = 500,
    doubleTapThreshold = 300,
    enableHapticFeedback = true,
    disabled = false
  } = options

  const elementRef = useRef<HTMLElement>(null)
  const gestureState = useRef<GestureState>({
    startTouch: null,
    lastTouch: null,
    startDistance: 0,
    lastScale: 1,
    tapCount: 0,
    lastTapTime: 0,
    longPressTimer: null,
    isPulling: false,
    pullStartY: 0
  })

  const [pullGesture, setPullGesture] = useState<PullGesture>({
    distance: 0,
    isActive: false,
    threshold: pullThreshold
  })

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || disabled) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20], 
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHapticFeedback, disabled])

  // Helper functions
  const getTouchPoint = useCallback((touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    timestamp: Date.now()
  }), [])

  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const getSwipeDirection = useCallback((start: TouchPoint, end: TouchPoint): SwipeGesture['direction'] => {
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left'
    } else {
      return dy > 0 ? 'down' : 'up'
    }
  }, [])

  const calculateVelocity = useCallback((start: TouchPoint, end: TouchPoint): number => {
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    )
    const duration = end.timestamp - start.timestamp
    return duration > 0 ? distance / duration : 0
  }, [])

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (disabled || !elementRef.current) return

    const touch = event.touches[0]
    const touchPoint = getTouchPoint(touch)
    
    gestureState.current.startTouch = touchPoint
    gestureState.current.lastTouch = touchPoint

    // Handle multi-touch for pinch
    if (event.touches.length === 2) {
      gestureState.current.startDistance = getDistance(event.touches[0], event.touches[1])
      gestureState.current.lastScale = 1
    }

    // Handle pull to refresh (only at top of scroll)
    const element = elementRef.current
    if (element.scrollTop === 0 && touchPoint.y < 100) {
      gestureState.current.isPulling = true
      gestureState.current.pullStartY = touchPoint.y
    }

    // Long press detection
    if (onLongPress) {
      gestureState.current.longPressTimer = setTimeout(() => {
        triggerHapticFeedback('medium')
        onLongPress(touchPoint)
      }, longPressThreshold)
    }

    // Handle tap counting for double tap
    const now = Date.now()
    if (now - gestureState.current.lastTapTime < doubleTapThreshold) {
      gestureState.current.tapCount++
    } else {
      gestureState.current.tapCount = 1
    }
    gestureState.current.lastTapTime = now

  }, [disabled, getTouchPoint, getDistance, onLongPress, triggerHapticFeedback, longPressThreshold, doubleTapThreshold])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (disabled || !gestureState.current.startTouch) return

    const touch = event.touches[0]
    const touchPoint = getTouchPoint(touch)
    gestureState.current.lastTouch = touchPoint

    // Handle pinch gesture
    if (event.touches.length === 2 && onPinch) {
      const currentDistance = getDistance(event.touches[0], event.touches[1])
      const scale = currentDistance / gestureState.current.startDistance
      
      if (Math.abs(scale - gestureState.current.lastScale) > pinchThreshold) {
        const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2
        const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2
        
        onPinch({
          scale,
          centerX,
          centerY
        })
        
        gestureState.current.lastScale = scale
      }
    }

    // Handle pull to refresh
    if (gestureState.current.isPulling && onPullToRefresh) {
      const pullDistance = Math.max(0, touchPoint.y - gestureState.current.pullStartY)
      const isActive = pullDistance > pullThreshold

      setPullGesture({
        distance: pullDistance,
        isActive,
        threshold: pullThreshold
      })

      // Trigger haptic feedback when threshold is reached
      if (isActive && pullGesture.distance < pullThreshold) {
        triggerHapticFeedback('medium')
      }

      onPullToRefresh({
        distance: pullDistance,
        isActive,
        threshold: pullThreshold
      })
    }

    // Cancel long press if moved too far
    if (gestureState.current.longPressTimer) {
      const distance = Math.sqrt(
        Math.pow(touchPoint.x - gestureState.current.startTouch.x, 2) + 
        Math.pow(touchPoint.y - gestureState.current.startTouch.y, 2)
      )
      
      if (distance > 10) { // 10px threshold for long press cancellation
        clearTimeout(gestureState.current.longPressTimer)
        gestureState.current.longPressTimer = null
      }
    }

  }, [disabled, getTouchPoint, getDistance, onPinch, onPullToRefresh, pullThreshold, pullGesture.distance, triggerHapticFeedback, pinchThreshold])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (disabled) return

    // Clear long press timer
    if (gestureState.current.longPressTimer) {
      clearTimeout(gestureState.current.longPressTimer)
      gestureState.current.longPressTimer = null
    }

    // Handle swipe gesture
    if (gestureState.current.startTouch && gestureState.current.lastTouch && onSwipe) {
      const distance = Math.sqrt(
        Math.pow(gestureState.current.lastTouch.x - gestureState.current.startTouch.x, 2) + 
        Math.pow(gestureState.current.lastTouch.y - gestureState.current.startTouch.y, 2)
      )

      if (distance >= swipeThreshold) {
        const direction = getSwipeDirection(gestureState.current.startTouch, gestureState.current.lastTouch)
        const velocity = calculateVelocity(gestureState.current.startTouch, gestureState.current.lastTouch)
        const duration = gestureState.current.lastTouch.timestamp - gestureState.current.startTouch.timestamp

        triggerHapticFeedback('light')
        
        onSwipe({
          direction,
          distance,
          velocity,
          duration,
          startPoint: gestureState.current.startTouch,
          endPoint: gestureState.current.lastTouch
        })
      }
    }

    // Handle double tap
    if (gestureState.current.tapCount === 2 && onDoubleTap && gestureState.current.startTouch) {
      triggerHapticFeedback('medium')
      onDoubleTap(gestureState.current.startTouch)
      gestureState.current.tapCount = 0
    }

    // Handle pull to refresh completion
    if (gestureState.current.isPulling) {
      if (pullGesture.isActive && onPullToRefresh) {
        triggerHapticFeedback('heavy')
      }
      
      gestureState.current.isPulling = false
      gestureState.current.pullStartY = 0
      
      setPullGesture({
        distance: 0,
        isActive: false,
        threshold: pullThreshold
      })
    }

    // Reset gesture state
    gestureState.current.startTouch = null
    gestureState.current.lastTouch = null
    gestureState.current.startDistance = 0
    gestureState.current.lastScale = 1

  }, [disabled, onSwipe, swipeThreshold, getSwipeDirection, calculateVelocity, triggerHapticFeedback, onDoubleTap, pullGesture.isActive, onPullToRefresh, pullThreshold])

  // Attach event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element || disabled) return

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, disabled])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (gestureState.current.longPressTimer) {
        clearTimeout(gestureState.current.longPressTimer)
      }
    }
  }, [])

  return {
    ref: elementRef,
    pullGesture,
    isGestureActive: gestureState.current.startTouch !== null,
    triggerHapticFeedback
  }
}

// Utility hook for detecting mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isSmallScreen = window.innerWidth <= 768
      
      setIsMobile(mobileRegex.test(userAgent) || (isTouchDevice && isSmallScreen))
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

// Utility hook for detecting device capabilities
export function useDeviceCapabilities() {
  const [capabilities, setCapabilities] = useState({
    hasTouch: false,
    hasHaptic: false,
    maxTouchPoints: 0,
    supportsVibration: false
  })

  useEffect(() => {
    setCapabilities({
      hasTouch: 'ontouchstart' in window,
      hasHaptic: 'vibrate' in navigator,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      supportsVibration: 'vibrate' in navigator
    })
  }, [])

  return capabilities
}

export default useMobileGestures