'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/shared/ui/button';
import { 
  Maximize2, 
  Minimize2, 
  Grid3X3, 
  Sidebar,
  PanelLeftClose,
  PanelLeftOpen,
  Settings
} from 'lucide-react';

interface TabletMeetingLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
  onLayoutChange?: (layout: LayoutState) => void;
}

interface LayoutState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  bottomPanelHeight: number;
  sidebarVisible: boolean;
  isFullscreen: boolean;
  activeLayout: 'default' | 'focus' | 'presentation' | 'collaboration';
}

const DEFAULT_LAYOUT: LayoutState = {
  leftPanelWidth: 400,
  rightPanelWidth: 350,
  bottomPanelHeight: 300,
  sidebarVisible: true,
  isFullscreen: false,
  activeLayout: 'default'
};

export const TabletMeetingLayout: React.FC<TabletMeetingLayoutProps> = ({
  children,
  leftPanel,
  rightPanel,
  bottomPanel,
  sidebar,
  className,
  onLayoutChange
}) => {
  const [layout, setLayout] = useState<LayoutState>(DEFAULT_LAYOUT);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  // Handle layout changes
  const updateLayout = useCallback((updates: Partial<LayoutState>) => {
    const newLayout = { ...layout, ...updates };
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  }, [layout, onLayoutChange]);

  // Predefined layouts for quick switching
  const switchLayout = useCallback((layoutType: LayoutState['activeLayout']) => {
    const layouts: Record<typeof layoutType, Partial<LayoutState>> = {
      default: {
        leftPanelWidth: 400,
        rightPanelWidth: 350,
        bottomPanelHeight: 300,
        sidebarVisible: true,
        activeLayout: 'default'
      },
      focus: {
        leftPanelWidth: 0,
        rightPanelWidth: 250,
        bottomPanelHeight: 200,
        sidebarVisible: false,
        activeLayout: 'focus'
      },
      presentation: {
        leftPanelWidth: 0,
        rightPanelWidth: 0,
        bottomPanelHeight: 80,
        sidebarVisible: false,
        activeLayout: 'presentation'
      },
      collaboration: {
        leftPanelWidth: 350,
        rightPanelWidth: 350,
        bottomPanelHeight: 350,
        sidebarVisible: true,
        activeLayout: 'collaboration'
      }
    };

    updateLayout(layouts[layoutType]);
  }, [updateLayout]);

  // Handle mouse events for resizing panels
  const handleMouseDown = useCallback((panelType: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(panelType);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const rect = document.getElementById('tablet-meeting-layout')?.getBoundingClientRect();
    if (!rect) return;

    switch (isDragging) {
      case 'left':
        const leftWidth = Math.max(200, Math.min(600, e.clientX - rect.left));
        updateLayout({ leftPanelWidth: leftWidth });
        break;
      case 'right':
        const rightWidth = Math.max(200, Math.min(600, rect.right - e.clientX));
        updateLayout({ rightPanelWidth: rightWidth });
        break;
      case 'bottom':
        const bottomHeight = Math.max(150, Math.min(500, rect.bottom - e.clientY));
        updateLayout({ bottomPanelHeight: bottomHeight });
        break;
    }
  }, [isDragging, updateLayout]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  // Effect for handling mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle touch events for tablet gestures
  const handleTouchGesture = useCallback((gesture: string) => {
    switch (gesture) {
      case 'swipe-left':
        updateLayout({ sidebarVisible: false });
        break;
      case 'swipe-right':
        updateLayout({ sidebarVisible: true });
        break;
      case 'pinch-out':
        updateLayout({ isFullscreen: true });
        break;
      case 'pinch-in':
        updateLayout({ isFullscreen: false });
        break;
    }
  }, [updateLayout]);

  return (
    <div 
      id="tablet-meeting-layout"
      className={cn(
        "h-screen flex flex-col bg-gray-50 overflow-hidden",
        layout.isFullscreen && "fixed inset-0 z-50",
        className
      )}
    >
      {/* Layout Controls Header */}
      <div className="flex items-center justify-between h-12 px-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateLayout({ sidebarVisible: !layout.sidebarVisible })}
            className="p-1"
          >
            {layout.sidebarVisible ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <div className="h-4 w-px bg-gray-300" />
          <div className="flex space-x-1">
            {(['default', 'focus', 'presentation', 'collaboration'] as const).map((layoutType) => (
              <Button
                key={layoutType}
                variant={layout.activeLayout === layoutType ? "default" : "ghost"}
                size="sm"
                onClick={() => switchLayout(layoutType)}
                className="px-2 py-1 text-xs capitalize"
              >
                {layoutType}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateLayout({ isFullscreen: !layout.isFullscreen })}
            className="p-1"
          >
            {layout.isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" className="p-1">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {layout.sidebarVisible && sidebar && (
          <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300">
            {sidebar}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Panel Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Panel */}
            {leftPanel && layout.leftPanelWidth > 0 && (
              <>
                <div 
                  className="bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300"
                  style={{ width: `${layout.leftPanelWidth}px` }}
                >
                  {leftPanel}
                </div>
                {/* Left Resize Handle */}
                <div
                  className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 flex-shrink-0"
                  onMouseDown={handleMouseDown('left')}
                />
              </>
            )}

            {/* Main Content */}
            <div className="flex-1 bg-white overflow-hidden">
              {children}
            </div>

            {/* Right Panel */}
            {rightPanel && layout.rightPanelWidth > 0 && (
              <>
                {/* Right Resize Handle */}
                <div
                  className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors duration-200 flex-shrink-0"
                  onMouseDown={handleMouseDown('right')}
                />
                <div 
                  className="bg-white border-l border-gray-200 flex flex-col overflow-hidden transition-all duration-300"
                  style={{ width: `${layout.rightPanelWidth}px` }}
                >
                  {rightPanel}
                </div>
              </>
            )}
          </div>

          {/* Bottom Panel */}
          {bottomPanel && layout.bottomPanelHeight > 0 && (
            <>
              {/* Bottom Resize Handle */}
              <div
                className="h-1 bg-gray-200 hover:bg-blue-500 cursor-row-resize transition-colors duration-200 flex-shrink-0"
                onMouseDown={handleMouseDown('bottom')}
              />
              <div 
                className="bg-white border-t border-gray-200 flex flex-col overflow-hidden transition-all duration-300"
                style={{ height: `${layout.bottomPanelHeight}px` }}
              >
                {bottomPanel}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Touch Gesture Detection Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        onTouchStart={(e) => {
          // Implement touch gesture detection for tablets
          // This would include swipe, pinch, and multi-touch gestures
        }}
      />
    </div>
  );
};

export default TabletMeetingLayout;