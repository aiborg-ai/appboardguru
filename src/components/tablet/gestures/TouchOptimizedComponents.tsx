'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TabletGestureHandler, useTabletGestures } from './TabletGestureHandler';
import { 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  RotateCw,
  Move,
  ZoomIn,
  ZoomOut,
  Hand
} from 'lucide-react';

// Touch-optimized button with haptic feedback
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  haptic?: 'light' | 'medium' | 'heavy';
  pressScale?: number;
  className?: string;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  haptic = 'light',
  pressScale = 0.95,
  className,
  onClick,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = useCallback(() => {
    setIsPressed(true);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      const patterns = { light: [10], medium: [20], heavy: [50] };
      navigator.vibrate(patterns[haptic]);
    }
  }, [haptic]);

  const handleRelease = useCallback(() => {
    setIsPressed(false);
  }, []);

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 touch-manipulation',
        'active:scale-95 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2',
        {
          'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500': variant === 'default',
          'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500': variant === 'outline',
          'text-blue-600 hover:bg-blue-50 focus:ring-blue-500': variant === 'ghost',
          'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': variant === 'destructive'
        },
        sizeClasses[size],
        className
      )}
      style={{
        transform: isPressed ? `scale(${pressScale})` : 'scale(1)',
      }}
      onTouchStart={handlePress}
      onTouchEnd={handleRelease}
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// Touch-optimized slider
interface TouchSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
}

export const TouchSlider: React.FC<TouchSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  orientation = 'horizontal',
  onValueChange,
  onValueCommit,
  className,
  trackClassName,
  thumbClassName
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const sliderRef = useRef<HTMLDivElement>(null);

  const isHorizontal = orientation === 'horizontal';
  
  const updateValue = useCallback((clientX: number, clientY: number) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    let percentage: number;
    
    if (isHorizontal) {
      percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    } else {
      percentage = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    }
    
    const rawValue = min + (max - min) * percentage;
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    
    setDragValue(clampedValue);
    onValueChange(clampedValue);
  }, [min, max, step, isHorizontal, onValueChange]);

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    updateValue(clientX, clientY);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([5]);
    }
  }, [updateValue]);

  const handleMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    updateValue(clientX, clientY);
  }, [isDragging, updateValue]);

  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onValueCommit?.(dragValue);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10]);
      }
    }
  }, [isDragging, dragValue, onValueCommit]);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleMove(e);
      const handleTouchMove = (e: TouchEvent) => handleMove(e);
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  const percentage = ((isDragging ? dragValue : value) - min) / (max - min) * 100;

  return (
    <div
      ref={sliderRef}
      className={cn(
        'relative touch-manipulation cursor-pointer select-none',
        isHorizontal ? 'w-full h-12' : 'h-full w-12',
        className
      )}
      onTouchStart={handleStart}
      onMouseDown={handleStart}
    >
      {/* Track */}
      <div
        className={cn(
          'absolute bg-gray-200 rounded-full',
          isHorizontal ? 'top-1/2 left-0 w-full h-2 -translate-y-1/2' : 'left-1/2 top-0 w-2 h-full -translate-x-1/2',
          trackClassName
        )}
      />
      
      {/* Active track */}
      <div
        className={cn(
          'absolute bg-blue-600 rounded-full transition-all duration-150',
          isHorizontal ? 'top-1/2 left-0 h-2 -translate-y-1/2' : 'left-1/2 bottom-0 w-2 -translate-x-1/2',
        )}
        style={{
          [isHorizontal ? 'width' : 'height']: `${percentage}%`
        }}
      />
      
      {/* Thumb */}
      <div
        className={cn(
          'absolute w-6 h-6 bg-white border-2 border-blue-600 rounded-full shadow-lg transition-all duration-150 transform -translate-x-1/2 -translate-y-1/2',
          isDragging ? 'scale-125' : 'scale-100',
          thumbClassName
        )}
        style={{
          [isHorizontal ? 'left' : 'bottom']: `${percentage}%`,
          [isHorizontal ? 'top' : 'left']: '50%'
        }}
      />
    </div>
  );
};

// Touch-optimized number input with increment/decrement buttons
interface TouchNumberInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showControls?: boolean;
}

export const TouchNumberInput: React.FC<TouchNumberInputProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  size = 'md',
  showControls = true
}) => {
  const increment = useCallback(() => {
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([5]);
    }
  }, [value, step, max, onValueChange]);

  const decrement = useCallback(() => {
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([5]);
    }
  }, [value, step, min, onValueChange]);

  const sizeClasses = {
    sm: 'h-10 text-sm',
    md: 'h-12 text-base',
    lg: 'h-14 text-lg'
  };

  const buttonSize = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14'
  };

  return (
    <div className={cn('flex items-center', className)}>
      {showControls && (
        <TouchButton
          variant="outline"
          className={cn('rounded-r-none border-r-0', buttonSize[size])}
          onClick={decrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </TouchButton>
      )}
      
      <div
        className={cn(
          'flex-1 bg-white border-2 border-gray-300 text-center font-medium flex items-center justify-center',
          sizeClasses[size],
          showControls ? 'rounded-none' : 'rounded-lg'
        )}
      >
        {value}
      </div>
      
      {showControls && (
        <TouchButton
          variant="outline"
          className={cn('rounded-l-none border-l-0', buttonSize[size])}
          onClick={increment}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </TouchButton>
      )}
    </div>
  );
};

// Swipeable card component
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  swipeThreshold?: number;
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  swipeThreshold = 100,
  className
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const gestureHandlers = useTabletGestures({
    onPan: (event) => {
      if (event.detail.deltaX !== undefined && event.detail.deltaY !== undefined) {
        setOffset({ x: event.detail.deltaX, y: event.detail.deltaY });
        setIsDragging(true);
      }
    },
    onSwipe: (event) => {
      const { direction, distance } = event.detail;
      
      if (distance! > swipeThreshold) {
        switch (direction) {
          case 'left':
            onSwipeLeft?.();
            break;
          case 'right':
            onSwipeRight?.();
            break;
          case 'up':
            onSwipeUp?.();
            break;
          case 'down':
            onSwipeDown?.();
            break;
        }
      }
      
      // Reset position
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  });

  const resetPosition = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      const timer = setTimeout(resetPosition, 150);
      return () => clearTimeout(timer);
    }
  }, [isDragging, resetPosition]);

  return (
    <TabletGestureHandler {...gestureHandlers}>
      <Card
        className={cn(
          'transition-transform duration-150',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
          className
        )}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) ${isDragging ? 'scale(1.02)' : 'scale(1)'}`
        }}
      >
        {children}
      </Card>
    </TabletGestureHandler>
  );
};

// Zoomable and pannable viewport
interface ZoomablePanViewportProps {
  children: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  className?: string;
  onZoomChange?: (zoom: number) => void;
}

export const ZoomablePanViewport: React.FC<ZoomablePanViewportProps> = ({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  initialZoom = 1,
  className,
  onZoomChange
}) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const updateZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    setZoom(clampedZoom);
    onZoomChange?.(clampedZoom);
  }, [minZoom, maxZoom, onZoomChange]);

  const gestureHandlers = useTabletGestures({
    onPinch: (event) => {
      if (event.detail.scale !== undefined) {
        const newZoom = zoom * event.detail.scale;
        updateZoom(newZoom);
      }
    },
    onPan: (event) => {
      if (event.detail.deltaX !== undefined && event.detail.deltaY !== undefined) {
        setIsPanning(true);
        setPan({
          x: event.detail.deltaX / zoom,
          y: event.detail.deltaY / zoom
        });
      }
    },
    onDoubleTap: () => {
      // Reset zoom and pan on double tap
      setZoom(initialZoom);
      setPan({ x: 0, y: 0 });
      setIsPanning(false);
    }
  });

  return (
    <div className={cn('relative overflow-hidden bg-gray-100', className)}>
      <TabletGestureHandler {...gestureHandlers}>
        <div
          className="transition-transform duration-150 origin-center w-full h-full"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            cursor: isPanning ? 'grabbing' : 'grab'
          }}
        >
          {children}
        </div>
      </TabletGestureHandler>
      
      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        <TouchButton
          variant="outline"
          size="sm"
          onClick={() => updateZoom(zoom * 1.2)}
          disabled={zoom >= maxZoom}
          className="bg-white shadow-lg"
        >
          <ZoomIn className="h-4 w-4" />
        </TouchButton>
        <TouchButton
          variant="outline"
          size="sm"
          onClick={() => updateZoom(zoom / 1.2)}
          disabled={zoom <= minZoom}
          className="bg-white shadow-lg"
        >
          <ZoomOut className="h-4 w-4" />
        </TouchButton>
      </div>
      
      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};

// Long-press context menu
interface TouchContextMenuProps {
  children: React.ReactNode;
  menuItems: Array<{
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    destructive?: boolean;
  }>;
  className?: string;
}

export const TouchContextMenu: React.FC<TouchContextMenuProps> = ({
  children,
  menuItems,
  className
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const gestureHandlers = useTabletGestures({
    onLongPress: (event) => {
      if (event.detail.position) {
        setMenuPosition(event.detail.position);
        setShowMenu(true);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50]);
        }
      }
    }
  });

  const handleMenuItemClick = useCallback((onClick: () => void) => {
    onClick();
    setShowMenu(false);
  }, []);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
  }, []);

  useEffect(() => {
    if (showMenu) {
      document.addEventListener('click', closeMenu);
      return () => document.removeEventListener('click', closeMenu);
    }
  }, [showMenu, closeMenu]);

  return (
    <>
      <TabletGestureHandler {...gestureHandlers} className={className}>
        {children}
      </TabletGestureHandler>
      
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
          />
          
          {/* Menu */}
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-[160px]"
            style={{
              left: menuPosition.x,
              top: menuPosition.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleMenuItemClick(item.onClick)}
                  className={cn(
                    'w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 transition-colors text-sm',
                    item.destructive && 'text-red-600 hover:bg-red-50'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
};