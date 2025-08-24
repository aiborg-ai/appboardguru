'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlatformWrapper, useDeviceDetection } from './PlatformDetection';
import { 
  Maximize2,
  Minimize2,
  Grid3X3,
  Square,
  Copy,
  Share2,
  BookOpen,
  Shortcuts,
  Apple,
  Zap,
  Eye,
  Hand,
  Settings
} from 'lucide-react';

// iPad-specific Stage Manager integration
interface StageManagerProps {
  children: React.ReactNode;
  appName: string;
  onStageChange?: (stage: 'center' | 'left' | 'right' | 'hidden') => void;
}

export const StageManagerIntegration: React.FC<StageManagerProps> = ({
  children,
  appName,
  onStageChange
}) => {
  const [currentStage, setCurrentStage] = useState<'center' | 'left' | 'right' | 'hidden'>('center');
  const [isStageManagerActive, setIsStageManagerActive] = useState(false);
  const deviceInfo = useDeviceDetection();

  useEffect(() => {
    if (deviceInfo.capabilities.stageManager) {
      // Detect Stage Manager activation
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          setCurrentStage('hidden');
          onStageChange?.('hidden');
        } else {
          // Determine stage position based on window size and position
          const windowWidth = window.innerWidth;
          const screenWidth = window.screen.width;
          
          if (windowWidth === screenWidth) {
            setCurrentStage('center');
            onStageChange?.('center');
          } else if (window.screenX === 0) {
            setCurrentStage('left');
            onStageChange?.('left');
          } else {
            setCurrentStage('right');
            onStageChange?.('right');
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('resize', handleVisibilityChange);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('resize', handleVisibilityChange);
      };
    }
  }, [deviceInfo.capabilities.stageManager, onStageChange]);

  // Add Stage Manager specific styles
  const stageManagerClasses = cn(
    'transition-all duration-300 ease-in-out',
    {
      'scale-95 opacity-90': currentStage === 'left' || currentStage === 'right',
      'scale-100 opacity-100': currentStage === 'center',
      'scale-75 opacity-50': currentStage === 'hidden'
    }
  );

  if (!deviceInfo.capabilities.stageManager) {
    return <>{children}</>;
  }

  return (
    <div className={stageManagerClasses} data-stage={currentStage}>
      {/* Stage Manager indicator */}
      <div className="absolute top-2 left-2 z-50 flex items-center space-x-2">
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          currentStage === 'center' ? 'bg-green-500' :
          currentStage === 'hidden' ? 'bg-red-500' : 'bg-yellow-500'
        )} />
        <span className="text-xs text-gray-500">{appName}</span>
      </div>
      {children}
    </div>
  );
};

// iPad Split View integration
interface SplitViewProps {
  children: React.ReactNode;
  onSplitChange?: (splitRatio: number) => void;
  adaptiveLayout?: boolean;
}

export const IPadSplitView: React.FC<SplitViewProps> = ({
  children,
  onSplitChange,
  adaptiveLayout = true
}) => {
  const [splitRatio, setSplitRatio] = useState(1);
  const [isSplitView, setIsSplitView] = useState(false);
  const deviceInfo = useDeviceDetection();

  useEffect(() => {
    if (deviceInfo.capabilities.splitView) {
      const detectSplitView = () => {
        const windowWidth = window.innerWidth;
        const screenWidth = window.screen.width;
        const ratio = windowWidth / screenWidth;
        
        // Detect if we're in split view (less than full screen width)
        if (ratio < 0.95 && ratio > 0.3) {
          setIsSplitView(true);
          setSplitRatio(ratio);
          onSplitChange?.(ratio);
        } else {
          setIsSplitView(false);
          setSplitRatio(1);
          onSplitChange?.(1);
        }
      };

      detectSplitView();
      window.addEventListener('resize', detectSplitView);

      return () => {
        window.removeEventListener('resize', detectSplitView);
      };
    }
  }, [deviceInfo.capabilities.splitView, onSplitChange]);

  const splitViewClasses = cn(
    'transition-all duration-200',
    {
      'max-w-full': !isSplitView,
      'max-w-lg mx-auto': isSplitView && splitRatio < 0.6,
      'max-w-2xl mx-auto': isSplitView && splitRatio >= 0.6
    }
  );

  if (!deviceInfo.capabilities.splitView) {
    return <>{children}</>;
  }

  return (
    <div className={adaptiveLayout ? splitViewClasses : ''} data-split-view={isSplitView}>
      {isSplitView && (
        <div className="mb-2 text-center">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1">
            <Grid3X3 className="h-3 w-3" />
            <span>Split View Active</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

// Apple Pencil integration
interface ApplePencilProps {
  onPencilInput?: (event: {
    type: 'start' | 'move' | 'end';
    pressure: number;
    tiltX: number;
    tiltY: number;
    azimuthAngle: number;
    altitudeAngle: number;
    position: { x: number; y: number };
  }) => void;
  children: React.ReactNode;
  enablePencilOnly?: boolean;
}

export const ApplePencilIntegration: React.FC<ApplePencilProps> = ({
  onPencilInput,
  children,
  enablePencilOnly = false
}) => {
  const deviceInfo = useDeviceDetection();
  const [isPencilActive, setIsPencilActive] = useState(false);

  const handlePointerEvent = useCallback((e: PointerEvent, type: 'start' | 'move' | 'end') => {
    // Check if this is an Apple Pencil input
    if (e.pointerType === 'pen' && deviceInfo.capabilities.pencilSupport) {
      setIsPencilActive(type !== 'end');
      
      if (onPencilInput) {
        onPencilInput({
          type,
          pressure: e.pressure || 0,
          tiltX: (e as any).tiltX || 0,
          tiltY: (e as any).tiltY || 0,
          azimuthAngle: (e as any).azimuthAngle || 0,
          altitudeAngle: (e as any).altitudeAngle || 0,
          position: { x: e.clientX, y: e.clientY }
        });
      }
    } else if (enablePencilOnly && e.pointerType !== 'pen') {
      // Ignore non-pencil input if pencil-only mode is enabled
      e.preventDefault();
      e.stopPropagation();
    }
  }, [deviceInfo.capabilities.pencilSupport, onPencilInput, enablePencilOnly]);

  useEffect(() => {
    if (deviceInfo.capabilities.pencilSupport) {
      const handlePointerDown = (e: PointerEvent) => handlePointerEvent(e, 'start');
      const handlePointerMove = (e: PointerEvent) => handlePointerEvent(e, 'move');
      const handlePointerUp = (e: PointerEvent) => handlePointerEvent(e, 'end');

      document.addEventListener('pointerdown', handlePointerDown);
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);

      return () => {
        document.removeEventListener('pointerdown', handlePointerDown);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [handlePointerEvent, deviceInfo.capabilities.pencilSupport]);

  if (!deviceInfo.capabilities.pencilSupport) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative", isPencilActive && "pencil-active")}>
      {/* Pencil indicator */}
      {isPencilActive && (
        <div className="absolute top-2 right-2 z-50 flex items-center space-x-1 bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
          <Hand className="h-3 w-3" />
          <span>Pencil</span>
        </div>
      )}
      
      <div style={{ touchAction: enablePencilOnly ? 'none' : 'auto' }}>
        {children}
      </div>
    </div>
  );
};

// Shortcuts app integration
interface ShortcutsIntegrationProps {
  shortcuts: Array<{
    name: string;
    url: string;
    icon?: React.ComponentType<{ className?: string }>;
    description?: string;
  }>;
  onShortcutTrigger?: (shortcut: string) => void;
}

export const ShortcutsIntegration: React.FC<ShortcutsIntegrationProps> = ({
  shortcuts,
  onShortcutTrigger
}) => {
  const deviceInfo = useDeviceDetection();

  const registerShortcuts = useCallback(() => {
    if (deviceInfo.capabilities.shortcuts && 'serviceWorker' in navigator) {
      // Register URL scheme handlers for shortcuts
      shortcuts.forEach(shortcut => {
        const url = `${window.location.origin}${shortcut.url}`;
        
        // Create a link that iOS can use to add shortcuts
        const link = document.createElement('a');
        link.href = `shortcuts://create-shortcut?name=${encodeURIComponent(shortcut.name)}&url=${encodeURIComponent(url)}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      });
    }
  }, [deviceInfo.capabilities.shortcuts, shortcuts]);

  useEffect(() => {
    // Listen for shortcut triggers via URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shortcut = urlParams.get('shortcut');
    
    if (shortcut && onShortcutTrigger) {
      onShortcutTrigger(shortcut);
      
      // Clean up URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('shortcut');
      window.history.replaceState({}, '', newUrl);
    }
  }, [onShortcutTrigger]);

  if (!deviceInfo.capabilities.shortcuts) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center space-x-2">
          <Shortcuts className="h-4 w-4 text-blue-600" />
          <span>Shortcuts Integration</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map((shortcut, index) => {
            const Icon = shortcut.icon || Zap;
            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={registerShortcuts}
                className="flex items-center space-x-2 h-auto py-3"
              >
                <Icon className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-xs">{shortcut.name}</div>
                  {shortcut.description && (
                    <div className="text-xs text-gray-500">{shortcut.description}</div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Handoff integration
interface HandoffProps {
  activityType: string;
  title: string;
  webpageURL: string;
  userInfo?: Record<string, any>;
  onContinue?: (userInfo: Record<string, any>) => void;
}

export const HandoffIntegration: React.FC<HandoffProps> = ({
  activityType,
  title,
  webpageURL,
  userInfo = {},
  onContinue
}) => {
  const deviceInfo = useDeviceDetection();

  useEffect(() => {
    if (deviceInfo.capabilities.handoff) {
      // Set document metadata for Handoff
      document.title = title;
      
      // Add canonical URL
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = webpageURL;

      // Add activity metadata
      const metaTags = [
        { property: 'al:ios:app_store_id', content: '123456789' }, // Your App Store ID
        { property: 'al:ios:url', content: `boardguru://${activityType}?${new URLSearchParams(userInfo)}` },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: title }
      ];

      metaTags.forEach(tag => {
        let meta = document.querySelector(`meta[${tag.property ? 'property' : 'name'}="${tag.property || tag.name}"]`) as HTMLMetaElement;
        if (!meta) {
          meta = document.createElement('meta');
          if (tag.property) {
            meta.setAttribute('property', tag.property);
          } else {
            meta.setAttribute('name', tag.name!);
          }
          document.head.appendChild(meta);
        }
        meta.content = tag.content;
      });
    }

    // Listen for activity continuation
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#handoff=')) {
        const handoffData = decodeURIComponent(hash.substring(9));
        try {
          const data = JSON.parse(handoffData);
          onContinue?.(data);
        } catch (error) {
          console.error('Failed to parse Handoff data:', error);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check on mount

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [deviceInfo.capabilities.handoff, activityType, title, webpageURL, userInfo, onContinue]);

  return null; // This component doesn't render anything visible
};

// iPad-specific optimized container
interface IPadContainerProps {
  children: React.ReactNode;
  className?: string;
  enableStageManager?: boolean;
  enableSplitView?: boolean;
  enableApplePencil?: boolean;
  shortcuts?: Array<{
    name: string;
    url: string;
    icon?: React.ComponentType<{ className?: string }>;
    description?: string;
  }>;
  handoffConfig?: {
    activityType: string;
    title: string;
    webpageURL: string;
    userInfo?: Record<string, any>;
  };
}

export const IPadOptimizedContainer: React.FC<IPadContainerProps> = ({
  children,
  className,
  enableStageManager = true,
  enableSplitView = true,
  enableApplePencil = true,
  shortcuts,
  handoffConfig
}) => {
  const deviceInfo = useDeviceDetection();

  // Only apply iPad optimizations if we're on iPad
  if (deviceInfo.device !== 'iPad') {
    return <PlatformWrapper className={className}>{children}</PlatformWrapper>;
  }

  let content = children;

  // Wrap with Apple Pencil integration
  if (enableApplePencil && deviceInfo.capabilities.pencilSupport) {
    content = (
      <ApplePencilIntegration>
        {content}
      </ApplePencilIntegration>
    );
  }

  // Wrap with Split View integration
  if (enableSplitView && deviceInfo.capabilities.splitView) {
    content = (
      <IPadSplitView>
        {content}
      </IPadSplitView>
    );
  }

  // Wrap with Stage Manager integration
  if (enableStageManager && deviceInfo.capabilities.stageManager) {
    content = (
      <StageManagerIntegration appName="BoardGuru">
        {content}
      </StageManagerIntegration>
    );
  }

  return (
    <PlatformWrapper className={cn("ipad-optimized", className)}>
      {/* Shortcuts integration */}
      {shortcuts && deviceInfo.capabilities.shortcuts && (
        <ShortcutsIntegration shortcuts={shortcuts} />
      )}
      
      {/* Handoff integration */}
      {handoffConfig && deviceInfo.capabilities.handoff && (
        <HandoffIntegration {...handoffConfig} />
      )}
      
      {/* Main content */}
      {content}
      
      {/* iPad-specific styles */}
      <style jsx>{`
        .ipad-optimized {
          /* iOS safe area support */
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
          
          /* Smooth scrolling */
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          
          /* Prevent zoom on double tap */
          touch-action: manipulation;
        }
        
        .pencil-active {
          /* Optimizations when Apple Pencil is active */
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        
        @media (max-width: 768px) {
          .ipad-optimized {
            /* Portrait orientation optimizations */
            padding: 16px;
          }
        }
        
        @media (min-width: 1024px) {
          .ipad-optimized {
            /* Landscape orientation optimizations */
            padding: 24px;
          }
        }
      `}</style>
    </PlatformWrapper>
  );
};

export default IPadOptimizedContainer;