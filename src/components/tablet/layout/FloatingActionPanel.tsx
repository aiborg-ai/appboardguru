'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X,
  Move,
  Pin,
  PinOff,
  Maximize2,
  Minimize2,
  MoreVertical,
  GripVertical
} from 'lucide-react';

interface FloatingActionPanelProps {
  title: string;
  children: React.ReactNode;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  resizable?: boolean;
  draggable?: boolean;
  pinnable?: boolean;
  collapsible?: boolean;
  className?: string;
  onClose?: () => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
  onPin?: (pinned: boolean) => void;
}

interface PanelState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isDragging: boolean;
  isResizing: boolean;
  isPinned: boolean;
  isCollapsed: boolean;
  dragOffset: { x: number; y: number };
}

export const FloatingActionPanel: React.FC<FloatingActionPanelProps> = ({
  title,
  children,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 400, height: 300 },
  resizable = true,
  draggable = true,
  pinnable = true,
  collapsible = true,
  className,
  onClose,
  onPositionChange,
  onSizeChange,
  onPin
}) => {
  const [panelState, setPanelState] = useState<PanelState>({
    position: defaultPosition,
    size: defaultSize,
    isDragging: false,
    isResizing: false,
    isPinned: false,
    isCollapsed: false,
    dragOffset: { x: 0, y: 0 }
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const updateState = useCallback((updates: Partial<PanelState>) => {
    setPanelState(prev => {
      const newState = { ...prev, ...updates };
      
      // Trigger callbacks
      if (updates.position) onPositionChange?.(updates.position);
      if (updates.size) onSizeChange?.(updates.size);
      if (updates.isPinned !== undefined) onPin?.(updates.isPinned);
      
      return newState;
    });
  }, [onPositionChange, onSizeChange, onPin]);

  // Dragging functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!draggable || panelState.isPinned) return;
    
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    updateState({ 
      isDragging: true, 
      dragOffset 
    });
  }, [draggable, panelState.isPinned, updateState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (panelState.isDragging) {
      const newPosition = {
        x: e.clientX - panelState.dragOffset.x,
        y: e.clientY - panelState.dragOffset.y
      };

      // Constrain to viewport
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      newPosition.x = Math.max(0, Math.min(viewport.width - panelState.size.width, newPosition.x));
      newPosition.y = Math.max(0, Math.min(viewport.height - panelState.size.height, newPosition.y));

      updateState({ position: newPosition });
    }
    
    if (panelState.isResizing) {
      const newSize = {
        width: Math.max(200, e.clientX - panelState.position.x),
        height: Math.max(150, e.clientY - panelState.position.y)
      };

      updateState({ size: newSize });
    }
  }, [panelState, updateState]);

  const handleMouseUp = useCallback(() => {
    updateState({ 
      isDragging: false, 
      isResizing: false 
    });
  }, [updateState]);

  // Touch events for tablet support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!draggable || panelState.isPinned) return;
    
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = e.touches[0];
    const dragOffset = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    updateState({ 
      isDragging: true, 
      dragOffset 
    });
  }, [draggable, panelState.isPinned, updateState]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!panelState.isDragging) return;
    
    const touch = e.touches[0];
    const newPosition = {
      x: touch.clientX - panelState.dragOffset.x,
      y: touch.clientY - panelState.dragOffset.y
    };

    // Constrain to viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    newPosition.x = Math.max(0, Math.min(viewport.width - panelState.size.width, newPosition.x));
    newPosition.y = Math.max(0, Math.min(viewport.height - panelState.size.height, newPosition.y));

    updateState({ position: newPosition });
  }, [panelState, updateState]);

  const handleTouchEnd = useCallback(() => {
    updateState({ 
      isDragging: false, 
      isResizing: false 
    });
  }, [updateState]);

  // Resize functionality
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!resizable) return;
    e.stopPropagation();
    updateState({ isResizing: true });
  }, [resizable, updateState]);

  // Pin/Unpin functionality
  const togglePin = useCallback(() => {
    if (!pinnable) return;
    updateState({ isPinned: !panelState.isPinned });
  }, [pinnable, panelState.isPinned, updateState]);

  // Collapse/Expand functionality
  const toggleCollapse = useCallback(() => {
    if (!collapsible) return;
    updateState({ isCollapsed: !panelState.isCollapsed });
  }, [collapsible, panelState.isCollapsed, updateState]);

  // Event listeners
  useEffect(() => {
    if (panelState.isDragging || panelState.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [panelState.isDragging, panelState.isResizing, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Snap to edges on tablet
  const snapToEdge = useCallback(() => {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    
    const { x, y } = panelState.position;
    const snapThreshold = 50;
    
    let newPosition = { ...panelState.position };
    
    // Snap to edges
    if (x < snapThreshold) newPosition.x = 0;
    if (y < snapThreshold) newPosition.y = 0;
    if (x > viewport.width - panelState.size.width - snapThreshold) {
      newPosition.x = viewport.width - panelState.size.width;
    }
    if (y > viewport.height - panelState.size.height - snapThreshold) {
      newPosition.y = viewport.height - panelState.size.height;
    }
    
    if (newPosition.x !== x || newPosition.y !== y) {
      updateState({ position: newPosition });
    }
  }, [panelState.position, panelState.size, updateState]);

  return (
    <Card
      ref={panelRef}
      className={cn(
        "fixed z-50 shadow-lg border border-gray-200 transition-all duration-200",
        panelState.isDragging && "shadow-xl scale-105",
        panelState.isPinned && "ring-2 ring-blue-500",
        panelState.isCollapsed && "h-auto",
        className
      )}
      style={{
        left: `${panelState.position.x}px`,
        top: `${panelState.position.y}px`,
        width: panelState.isCollapsed ? 'auto' : `${panelState.size.width}px`,
        height: panelState.isCollapsed ? 'auto' : `${panelState.size.height}px`,
        cursor: panelState.isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Panel Header */}
      <CardHeader
        ref={headerRef}
        className={cn(
          "flex flex-row items-center justify-between space-y-0 pb-2 bg-gray-50 border-b",
          draggable && !panelState.isPinned && "cursor-grab active:cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center space-x-2">
          {draggable && !panelState.isPinned && (
            <GripVertical className="h-4 w-4 text-gray-400" />
          )}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        
        <div className="flex items-center space-x-1">
          {pinnable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePin}
              className="p-1 h-6 w-6"
              title={panelState.isPinned ? "Unpin panel" : "Pin panel"}
            >
              {panelState.isPinned ? 
                <PinOff className="h-3 w-3" /> : 
                <Pin className="h-3 w-3" />
              }
            </Button>
          )}
          
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="p-1 h-6 w-6"
              title={panelState.isCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {panelState.isCollapsed ? 
                <Maximize2 className="h-3 w-3" /> : 
                <Minimize2 className="h-3 w-3" />
              }
            </Button>
          )}
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-6 w-6"
              title="Close panel"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Panel Content */}
      {!panelState.isCollapsed && (
        <CardContent className="p-4 overflow-auto">
          {children}
        </CardContent>
      )}

      {/* Resize Handle */}
      {resizable && !panelState.isCollapsed && (
        <div
          ref={resizeHandleRef}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-300 hover:bg-gray-400 transition-colors duration-200"
          onMouseDown={handleResizeStart}
          style={{
            clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
          }}
        />
      )}

      {/* Status Indicators */}
      <div className="absolute -top-1 -right-1 flex space-x-1">
        {panelState.isPinned && (
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
        )}
        {panelState.isDragging && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    </Card>
  );
};

export default FloatingActionPanel;