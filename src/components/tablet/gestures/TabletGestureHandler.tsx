'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface GestureEvent {
  type: 'tap' | 'double-tap' | 'long-press' | 'pinch' | 'swipe' | 'rotate' | 'pan';
  detail: {
    position?: { x: number; y: number };
    deltaX?: number;
    deltaY?: number;
    scale?: number;
    rotation?: number;
    velocity?: { x: number; y: number };
    direction?: 'up' | 'down' | 'left' | 'right';
    distance?: number;
    duration?: number;
  };
  target: HTMLElement;
  originalEvent: TouchEvent;
}

interface TabletGestureHandlerProps {
  children: React.ReactNode;
  className?: string;
  onTap?: (event: GestureEvent) => void;
  onDoubleTap?: (event: GestureEvent) => void;
  onLongPress?: (event: GestureEvent) => void;
  onPinch?: (event: GestureEvent) => void;
  onSwipe?: (event: GestureEvent) => void;
  onRotate?: (event: GestureEvent) => void;
  onPan?: (event: GestureEvent) => void;
  
  // Configuration options
  doubleTapDelay?: number;
  longPressDelay?: number;
  swipeThreshold?: number;
  pinchThreshold?: number;
  rotationThreshold?: number;
  preventDefaultBehaviors?: boolean;
  enableHapticFeedback?: boolean;
  debugMode?: boolean;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  touches: Map<number, TouchPoint>;
  startTime: number;
  lastTapTime: number;
  tapCount: number;
  isLongPress: boolean;
  isPanning: boolean;
  isPinching: boolean;
  isRotating: boolean;
  initialDistance: number;
  initialAngle: number;
  initialScale: number;
  currentScale: number;
  currentRotation: number;
  panStart: { x: number; y: number };
  panCurrent: { x: number; y: number };
}

const initialGestureState: GestureState = {
  touches: new Map(),
  startTime: 0,
  lastTapTime: 0,
  tapCount: 0,
  isLongPress: false,
  isPanning: false,
  isPinching: false,
  isRotating: false,
  initialDistance: 0,
  initialAngle: 0,
  initialScale: 1,
  currentScale: 1,
  currentRotation: 0,
  panStart: { x: 0, y: 0 },
  panCurrent: { x: 0, y: 0 }
};

export const TabletGestureHandler: React.FC<TabletGestureHandlerProps> = ({
  children,
  className,
  onTap,
  onDoubleTap,
  onLongPress,
  onPinch,
  onSwipe,
  onRotate,
  onPan,
  doubleTapDelay = 300,
  longPressDelay = 500,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  rotationThreshold = 15,
  preventDefaultBehaviors = true,
  enableHapticFeedback = true,
  debugMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureState = useRef<GestureState>(initialGestureState);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Utility functions
  const getDistance = useCallback((touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getAngle = useCallback((touch1: TouchPoint, touch2: TouchPoint): number => {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }, []);

  const getCenter = useCallback((touches: TouchPoint[]): { x: number; y: number } => {
    const x = touches.reduce((sum, touch) => sum + touch.x, 0) / touches.length;
    const y = touches.reduce((sum, touch) => sum + touch.y, 0) / touches.length;
    return { x, y };
  }, []);

  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback) return;
    
    // Use Vibration API if available
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  }, [enableHapticFeedback]);

  const createGestureEvent = useCallback((
    type: GestureEvent['type'],
    detail: GestureEvent['detail'],
    originalEvent: TouchEvent
  ): GestureEvent => {
    return {
      type,
      detail,
      target: originalEvent.target as HTMLElement,
      originalEvent
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (doubleTapTimer.current) {
      clearTimeout(doubleTapTimer.current);
      doubleTapTimer.current = null;
    }
  }, []);

  const resetGestureState = useCallback(() => {
    gestureState.current = { ...initialGestureState, touches: new Map() };
    clearTimers();
  }, [clearTimers]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (preventDefaultBehaviors) {
      e.preventDefault();
    }

    const state = gestureState.current;
    const now = Date.now();
    
    // Update touches
    Array.from(e.touches).forEach(touch => {
      state.touches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: now
      });
    });

    const touchCount = state.touches.size;
    
    if (touchCount === 1) {
      // Single touch - potential tap, long press, or pan
      const touch = Array.from(state.touches.values())[0];
      state.startTime = now;
      state.panStart = { x: touch.x, y: touch.y };
      state.panCurrent = { x: touch.x, y: touch.y };
      
      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        if (state.touches.size === 1 && !state.isPanning) {
          state.isLongPress = true;
          hapticFeedback('medium');
          
          if (onLongPress) {
            const event = createGestureEvent('long-press', {
              position: { x: touch.x, y: touch.y },
              duration: now - state.startTime
            }, e);
            onLongPress(event);
          }
          
          if (debugMode) {
            setDebugInfo(`Long press at (${touch.x}, ${touch.y})`);
          }
        }
      }, longPressDelay);
      
    } else if (touchCount === 2) {
      // Two touches - potential pinch or rotate
      clearTimers();
      
      const touches = Array.from(state.touches.values());
      state.initialDistance = getDistance(touches[0], touches[1]);
      state.initialAngle = getAngle(touches[0], touches[1]);
      state.currentScale = 1;
      state.currentRotation = 0;
      
      if (debugMode) {
        setDebugInfo(`Two touches: distance=${state.initialDistance.toFixed(1)}, angle=${state.initialAngle.toFixed(1)}`);
      }
    }
  }, [
    preventDefaultBehaviors, 
    longPressDelay, 
    hapticFeedback, 
    onLongPress, 
    createGestureEvent, 
    getDistance, 
    getAngle,
    debugMode,
    clearTimers
  ]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (preventDefaultBehaviors) {
      e.preventDefault();
    }

    const state = gestureState.current;
    const now = Date.now();
    
    // Update touches
    Array.from(e.touches).forEach(touch => {
      if (state.touches.has(touch.identifier)) {
        const existingTouch = state.touches.get(touch.identifier)!;
        state.touches.set(touch.identifier, {
          ...existingTouch,
          x: touch.clientX,
          y: touch.clientY,
          timestamp: now
        });
      }
    });

    const touchCount = state.touches.size;
    const touches = Array.from(state.touches.values());

    if (touchCount === 1 && !state.isLongPress) {
      // Single touch movement - panning
      const touch = touches[0];
      const deltaX = touch.x - state.panStart.x;
      const deltaY = touch.y - state.panStart.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 10 && !state.isPanning) {
        // Start panning
        state.isPanning = true;
        clearTimers(); // Cancel long press
      }
      
      if (state.isPanning) {
        state.panCurrent = { x: touch.x, y: touch.y };
        
        if (onPan) {
          const velocity = {
            x: deltaX / (now - state.startTime),
            y: deltaY / (now - state.startTime)
          };
          
          const event = createGestureEvent('pan', {
            position: { x: touch.x, y: touch.y },
            deltaX,
            deltaY,
            velocity
          }, e);
          onPan(event);
        }
        
        if (debugMode) {
          setDebugInfo(`Pan: (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
        }
      }
      
    } else if (touchCount === 2) {
      // Two-finger gestures - pinch and rotate
      const currentDistance = getDistance(touches[0], touches[1]);
      const currentAngle = getAngle(touches[0], touches[1]);
      
      // Pinch detection
      const scaleChange = currentDistance / state.initialDistance;
      const scaleDelta = Math.abs(scaleChange - state.currentScale);
      
      if (scaleDelta > pinchThreshold) {
        state.isPinching = true;
        state.currentScale = scaleChange;
        
        if (onPinch) {
          const center = getCenter(touches);
          const event = createGestureEvent('pinch', {
            position: center,
            scale: scaleChange,
            distance: currentDistance
          }, e);
          onPinch(event);
        }
        
        if (debugMode) {
          setDebugInfo(`Pinch: scale=${scaleChange.toFixed(2)}`);
        }
      }
      
      // Rotation detection
      let angleDelta = currentAngle - state.initialAngle;
      if (angleDelta > 180) angleDelta -= 360;
      if (angleDelta < -180) angleDelta += 360;
      
      const rotationDelta = Math.abs(angleDelta - state.currentRotation);
      
      if (rotationDelta > rotationThreshold) {
        state.isRotating = true;
        state.currentRotation = angleDelta;
        
        if (onRotate) {
          const center = getCenter(touches);
          const event = createGestureEvent('rotate', {
            position: center,
            rotation: angleDelta
          }, e);
          onRotate(event);
        }
        
        if (debugMode) {
          setDebugInfo(`Rotate: ${angleDelta.toFixed(1)}°`);
        }
      }
    }
  }, [
    preventDefaultBehaviors,
    clearTimers,
    onPan,
    onPinch,
    onRotate,
    createGestureEvent,
    getDistance,
    getAngle,
    getCenter,
    pinchThreshold,
    rotationThreshold,
    debugMode
  ]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (preventDefaultBehaviors) {
      e.preventDefault();
    }

    const state = gestureState.current;
    const now = Date.now();
    
    // Remove ended touches
    Array.from(e.changedTouches).forEach(touch => {
      state.touches.delete(touch.identifier);
    });

    const remainingTouches = state.touches.size;
    
    if (remainingTouches === 0) {
      // All touches ended
      if (!state.isLongPress && !state.isPanning && !state.isPinching && !state.isRotating) {
        // This was a tap
        state.tapCount++;
        
        const touch = Array.from(e.changedTouches)[0];
        const tapDuration = now - state.startTime;
        
        if (state.tapCount === 1) {
          // First tap - wait for potential double tap
          doubleTapTimer.current = setTimeout(() => {
            // Single tap confirmed
            hapticFeedback('light');
            
            if (onTap) {
              const event = createGestureEvent('tap', {
                position: { x: touch.clientX, y: touch.clientY },
                duration: tapDuration
              }, e);
              onTap(event);
            }
            
            state.tapCount = 0;
            if (debugMode) {
              setDebugInfo(`Tap at (${touch.clientX}, ${touch.clientY})`);
            }
          }, doubleTapDelay);
          
        } else if (state.tapCount === 2 && (now - state.lastTapTime) < doubleTapDelay) {
          // Double tap
          clearTimers();
          hapticFeedback('medium');
          
          if (onDoubleTap) {
            const event = createGestureEvent('double-tap', {
              position: { x: touch.clientX, y: touch.clientY },
              duration: tapDuration
            }, e);
            onDoubleTap(event);
          }
          
          state.tapCount = 0;
          if (debugMode) {
            setDebugInfo(`Double tap at (${touch.clientX}, ${touch.clientY})`);
          }
        }
        
        state.lastTapTime = now;
        
      } else if (state.isPanning) {
        // End of pan - check for swipe
        const deltaX = state.panCurrent.x - state.panStart.x;
        const deltaY = state.panCurrent.y - state.panStart.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const duration = now - state.startTime;
        const velocity = distance / duration;
        
        if (distance > swipeThreshold && velocity > 0.5) {
          // This was a swipe
          let direction: 'up' | 'down' | 'left' | 'right';
          
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }
          
          hapticFeedback('light');
          
          if (onSwipe) {
            const event = createGestureEvent('swipe', {
              direction,
              distance,
              velocity: { x: deltaX / duration, y: deltaY / duration },
              deltaX,
              deltaY
            }, e);
            onSwipe(event);
          }
          
          if (debugMode) {
            setDebugInfo(`Swipe ${direction}: distance=${distance.toFixed(1)}, velocity=${velocity.toFixed(2)}`);
          }
        }
      }
      
      // Reset state
      resetGestureState();
      
    } else {
      // Some touches remain - update state
      if (remainingTouches === 1) {
        // Back to single touch
        clearTimers();
        state.isPinching = false;
        state.isRotating = false;
        
        const remainingTouch = Array.from(state.touches.values())[0];
        state.startTime = now;
        state.panStart = { x: remainingTouch.x, y: remainingTouch.y };
        state.panCurrent = { x: remainingTouch.x, y: remainingTouch.y };
      }
    }
  }, [
    preventDefaultBehaviors,
    doubleTapDelay,
    swipeThreshold,
    hapticFeedback,
    onTap,
    onDoubleTap,
    onSwipe,
    createGestureEvent,
    resetGestureState,
    clearTimers,
    debugMode
  ]);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const options = { passive: !preventDefaultBehaviors };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);
    container.addEventListener('touchcancel', handleTouchEnd, options);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, preventDefaultBehaviors]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return (
    <div
      ref={containerRef}
      className={cn("touch-none select-none", className)}
      style={{ touchAction: preventDefaultBehaviors ? 'none' : 'auto' }}
    >
      {children}
      
      {/* Debug overlay */}
      {debugMode && (
        <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-sm font-mono z-50 pointer-events-none">
          <div>Touches: {gestureState.current.touches.size}</div>
          <div>State: {JSON.stringify({
            isPanning: gestureState.current.isPanning,
            isPinching: gestureState.current.isPinching,
            isRotating: gestureState.current.isRotating,
            isLongPress: gestureState.current.isLongPress
          })}</div>
          <div>{debugInfo}</div>
        </div>
      )}
    </div>
  );
};

// Hook for using gestures in components
export const useTabletGestures = (
  callbacks: {
    onTap?: (event: GestureEvent) => void;
    onDoubleTap?: (event: GestureEvent) => void;
    onLongPress?: (event: GestureEvent) => void;
    onPinch?: (event: GestureEvent) => void;
    onSwipe?: (event: GestureEvent) => void;
    onRotate?: (event: GestureEvent) => void;
    onPan?: (event: GestureEvent) => void;
  },
  options?: {
    doubleTapDelay?: number;
    longPressDelay?: number;
    swipeThreshold?: number;
    pinchThreshold?: number;
    rotationThreshold?: number;
    preventDefaultBehaviors?: boolean;
    enableHapticFeedback?: boolean;
  }
) => {
  return {
    ...callbacks,
    ...options
  };
};

export default TabletGestureHandler;