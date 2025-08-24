'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/shared/ui/button';
import { 
  SplitSquareHorizontal,
  SplitSquareVertical,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface SplitViewContainerProps {
  primaryContent: React.ReactNode;
  secondaryContent: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  initialSplit?: number; // Percentage (0-100)
  minSize?: number; // Minimum size in pixels
  maxSize?: number; // Maximum size in pixels
  className?: string;
  resizable?: boolean;
  collapsible?: boolean;
  onSplitChange?: (splitPercentage: number) => void;
  onToggleOrientation?: () => void;
}

export const SplitViewContainer: React.FC<SplitViewContainerProps> = ({
  primaryContent,
  secondaryContent,
  orientation = 'horizontal',
  initialSplit = 50,
  minSize = 200,
  maxSize,
  className,
  resizable = true,
  collapsible = true,
  onSplitChange,
  onToggleOrientation
}) => {
  const [split, setSplit] = useState(initialSplit);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsed, setCollapsed] = useState<'none' | 'primary' | 'secondary'>('none');
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const handleSplitChange = useCallback((newSplit: number) => {
    setSplit(newSplit);
    onSplitChange?.(newSplit);
  }, [onSplitChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsDragging(true);
  }, [resizable]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let percentage: number;

    if (orientation === 'horizontal') {
      const x = e.clientX - rect.left;
      percentage = (x / rect.width) * 100;
    } else {
      const y = e.clientY - rect.top;
      percentage = (y / rect.height) * 100;
    }

    // Apply constraints
    const containerSize = orientation === 'horizontal' ? rect.width : rect.height;
    const minPercentage = (minSize / containerSize) * 100;
    const maxPercentage = maxSize ? (maxSize / containerSize) * 100 : 90;

    percentage = Math.max(minPercentage, Math.min(maxPercentage, percentage));
    handleSplitChange(percentage);
  }, [isDragging, orientation, minSize, maxSize, handleSplitChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch events for tablet support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!resizable) return;
    e.preventDefault();
    setIsDragging(true);
  }, [resizable]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    let percentage: number;

    if (orientation === 'horizontal') {
      const x = touch.clientX - rect.left;
      percentage = (x / rect.width) * 100;
    } else {
      const y = touch.clientY - rect.top;
      percentage = (y / rect.height) * 100;
    }

    // Apply constraints
    const containerSize = orientation === 'horizontal' ? rect.width : rect.height;
    const minPercentage = (minSize / containerSize) * 100;
    const maxPercentage = maxSize ? (maxSize / containerSize) * 100 : 90;

    percentage = Math.max(minPercentage, Math.min(maxPercentage, percentage));
    handleSplitChange(percentage);
  }, [isDragging, orientation, minSize, maxSize, handleSplitChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Touch events
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const toggleCollapse = useCallback((panel: 'primary' | 'secondary') => {
    if (!collapsible) return;
    
    setCollapsed(current => {
      if (current === panel) return 'none';
      return panel;
    });
  }, [collapsible]);

  const getPanelSize = (isPrimary: boolean) => {
    if (collapsed === 'primary' && isPrimary) return '0%';
    if (collapsed === 'secondary' && !isPrimary) return '0%';
    if (collapsed === 'primary' && !isPrimary) return '100%';
    if (collapsed === 'secondary' && isPrimary) return '100%';
    
    return isPrimary ? `${split}%` : `${100 - split}%`;
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex w-full h-full bg-gray-50 relative overflow-hidden",
        isHorizontal ? "flex-row" : "flex-col",
        className
      )}
    >
      {/* Primary Panel */}
      <div
        className={cn(
          "bg-white transition-all duration-300 ease-in-out overflow-hidden",
          collapsed === 'primary' && "opacity-0",
          isHorizontal ? "border-r" : "border-b",
          "border-gray-200"
        )}
        style={{
          [isHorizontal ? 'width' : 'height']: getPanelSize(true)
        }}
      >
        {/* Panel Header */}
        <div className="h-10 flex items-center justify-between px-3 bg-gray-50 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700">Primary Panel</div>
          {collapsible && (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCollapse('primary')}
                className="p-1 h-6 w-6"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {primaryContent}
        </div>
      </div>

      {/* Resizer */}
      {resizable && collapsed === 'none' && (
        <div
          ref={resizerRef}
          className={cn(
            "bg-gray-200 hover:bg-blue-500 transition-colors duration-200 flex-shrink-0 relative group",
            isHorizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
            isDragging && "bg-blue-500"
          )}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Resizer Handle */}
          <div className={cn(
            "absolute bg-gray-400 group-hover:bg-blue-600 transition-colors duration-200 rounded",
            isDragging && "bg-blue-600",
            isHorizontal 
              ? "w-1 h-12 top-1/2 left-0 -translate-y-1/2"
              : "h-1 w-12 left-1/2 top-0 -translate-x-1/2"
          )} />
          
          {/* Orientation Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleOrientation}
            className={cn(
              "absolute p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white border border-gray-300 shadow-sm",
              isHorizontal 
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8"
                : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8"
            )}
          >
            {isHorizontal ? 
              <SplitSquareVertical className="h-4 w-4" /> : 
              <SplitSquareHorizontal className="h-4 w-4" />
            }
          </Button>
        </div>
      )}

      {/* Secondary Panel */}
      <div
        className={cn(
          "bg-white transition-all duration-300 ease-in-out overflow-hidden",
          collapsed === 'secondary' && "opacity-0"
        )}
        style={{
          [isHorizontal ? 'width' : 'height']: getPanelSize(false)
        }}
      >
        {/* Panel Header */}
        <div className="h-10 flex items-center justify-between px-3 bg-gray-50 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700">Secondary Panel</div>
          {collapsible && (
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCollapse('secondary')}
                className="p-1 h-6 w-6"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        
        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {secondaryContent}
        </div>
      </div>

      {/* Collapsed Panel Restore Buttons */}
      {collapsed === 'primary' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCollapsed('none')}
          className="absolute top-4 left-4 z-10"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Show Primary
        </Button>
      )}
      
      {collapsed === 'secondary' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCollapsed('none')}
          className={cn(
            "absolute z-10",
            isHorizontal ? "top-4 right-4" : "bottom-4 left-4"
          )}
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Show Secondary
        </Button>
      )}
    </div>
  );
};

export default SplitViewContainer;