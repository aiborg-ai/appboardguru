'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { PlatformWrapper, useDeviceDetection } from './PlatformDetection';
import { 
  Maximize2,
  Minimize2,
  Grid3X3,
  Square,
  MoreVertical,
  Share2,
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  Eye,
  Hand,
  Settings,
  Chrome,
  Layers
} from 'lucide-react';

// Android Multi-Window support
interface MultiWindowProps {
  children: React.ReactNode;
  onWindowModeChange?: (mode: 'fullscreen' | 'split' | 'freeform' | 'picture-in-picture') => void;
  supportsPictureInPicture?: boolean;
}

export const AndroidMultiWindow: React.FC<MultiWindowProps> = ({
  children,
  onWindowModeChange,
  supportsPictureInPicture = false
}) => {
  const [windowMode, setWindowMode] = useState<'fullscreen' | 'split' | 'freeform' | 'picture-in-picture'>('fullscreen');
  const [isMultiWindow, setIsMultiWindow] = useState(false);
  const deviceInfo = useDeviceDetection();

  const detectWindowMode = useCallback(() => {
    if (!deviceInfo.capabilities.multiWindow) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    const widthRatio = windowWidth / screenWidth;
    const heightRatio = windowHeight / screenHeight;

    // Detect different multi-window modes
    if (widthRatio < 0.9 || heightRatio < 0.9) {
      setIsMultiWindow(true);
      
      if (widthRatio < 0.5 && heightRatio > 0.8) {
        // Split screen side by side
        setWindowMode('split');
        onWindowModeChange?.('split');
      } else if (widthRatio < 0.8 && heightRatio < 0.8) {
        // Freeform window
        setWindowMode('freeform');
        onWindowModeChange?.('freeform');
      } else if (widthRatio < 0.4 && heightRatio < 0.4) {
        // Picture-in-picture
        setWindowMode('picture-in-picture');
        onWindowModeChange?.('picture-in-picture');
      } else {
        setWindowMode('fullscreen');
        onWindowModeChange?.('fullscreen');
      }
    } else {
      setIsMultiWindow(false);
      setWindowMode('fullscreen');
      onWindowModeChange?.('fullscreen');
    }
  }, [deviceInfo.capabilities.multiWindow, onWindowModeChange]);

  useEffect(() => {
    detectWindowMode();
    
    const resizeObserver = new ResizeObserver(detectWindowMode);
    resizeObserver.observe(document.body);

    return () => {
      resizeObserver.disconnect();
    };
  }, [detectWindowMode]);

  // Picture-in-picture API support
  const enterPictureInPicture = useCallback(async () => {
    if (supportsPictureInPicture && 'documentPictureInPicture' in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width: 400,
          height: 300
        });
        
        // Move content to PiP window
        const pipContent = document.createElement('div');
        pipContent.innerHTML = '<div>Picture-in-Picture Mode</div>';
        pipWindow.document.body.appendChild(pipContent);
        
        setWindowMode('picture-in-picture');
        onWindowModeChange?.('picture-in-picture');
      } catch (error) {
        console.error('Failed to enter Picture-in-Picture:', error);
      }
    }
  }, [supportsPictureInPicture, onWindowModeChange]);

  const getWindowModeStyles = () => {
    switch (windowMode) {
      case 'split':
        return 'max-w-full px-2 py-4';
      case 'freeform':
        return 'max-w-2xl mx-auto p-4 rounded-lg shadow-lg';
      case 'picture-in-picture':
        return 'p-2 text-sm';
      default:
        return '';
    }
  };

  if (!deviceInfo.capabilities.multiWindow) {
    return <>{children}</>;
  }

  return (
    <div className={cn("android-multi-window transition-all duration-300", getWindowModeStyles())} 
         data-window-mode={windowMode}>
      {/* Multi-window indicator */}
      {isMultiWindow && (
        <div className="mb-2 flex items-center justify-center">
          <div className="inline-flex items-center space-x-2 text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">
            <Grid3X3 className="h-3 w-3" />
            <span className="capitalize">{windowMode.replace('-', ' ')} Mode</span>
          </div>
        </div>
      )}

      {/* PiP controls */}
      {supportsPictureInPicture && windowMode !== 'picture-in-picture' && (
        <div className="absolute top-2 right-2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={enterPictureInPicture}
            className="bg-white shadow-md"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      )}

      {children}
    </div>
  );
};

// Samsung DeX mode support
interface DexModeProps {
  children: React.ReactNode;
  onDexModeChange?: (isDexMode: boolean) => void;
  dexOptimizedLayout?: boolean;
}

export const SamsungDexMode: React.FC<DexModeProps> = ({
  children,
  onDexModeChange,
  dexOptimizedLayout = true
}) => {
  const [isDexMode, setIsDexMode] = useState(false);
  const deviceInfo = useDeviceDetection();

  useEffect(() => {
    if (deviceInfo.capabilities.dexMode) {
      const detectDexMode = () => {
        // Check for DeX mode indicators
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const pixelRatio = window.devicePixelRatio;
        
        // DeX mode typically has different screen dimensions and pixel ratio
        const isDex = (
          (screenWidth >= 1920 && screenHeight >= 1080) || // Desktop resolution
          pixelRatio === 1 || // DeX often has pixel ratio of 1
          navigator.userAgent.includes('DeX') // Direct DeX detection
        );
        
        setIsDexMode(isDex);
        onDexModeChange?.(isDex);
      };

      detectDexMode();
      window.addEventListener('resize', detectDexMode);
      
      return () => {
        window.removeEventListener('resize', detectDexMode);
      };
    }
  }, [deviceInfo.capabilities.dexMode, onDexModeChange]);

  const dexStyles = isDexMode && dexOptimizedLayout ? {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    display: 'grid',
    gridTemplateColumns: '250px 1fr 300px',
    gap: '24px',
    minHeight: '100vh'
  } : {};

  if (!deviceInfo.capabilities.dexMode) {
    return <>{children}</>;
  }

  return (
    <div className={cn("samsung-dex transition-all duration-300", {
      'dex-active': isDexMode,
      'mobile-layout': !isDexMode
    })} style={dexStyles}>
      
      {/* DeX mode indicator */}
      {isDexMode && (
        <div className="fixed top-4 left-4 z-50 flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          <Monitor className="h-4 w-4" />
          <span>DeX Mode</span>
        </div>
      )}

      {isDexMode && dexOptimizedLayout ? (
        <>
          {/* Sidebar */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-4">Navigation</h3>
            {/* Navigation content would go here */}
          </div>
          
          {/* Main content */}
          <div className="bg-white rounded-lg">
            {children}
          </div>
          
          {/* Right panel */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-4">Tools</h3>
            {/* Tools content would go here */}
          </div>
        </>
      ) : (
        children
      )}
    </div>
  );
};

// Android Material Design Components
interface MaterialButtonProps {
  children: React.ReactNode;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  rippleColor?: string;
  className?: string;
  onClick?: () => void;
}

export const MaterialButton: React.FC<MaterialButtonProps> = ({
  children,
  variant = 'filled',
  size = 'medium',
  rippleColor = 'rgba(255,255,255,0.3)',
  className,
  onClick
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const ripple = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      
      setRipples(prev => [...prev, ripple]);
      
      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== ripple.id));
      }, 600);
    }
    
    onClick?.();
  }, [onClick]);

  const baseClasses = "relative overflow-hidden transition-all duration-200 rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-500";
  
  const variantClasses = {
    filled: "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg",
    outlined: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
    text: "text-blue-600 hover:bg-blue-50"
  };
  
  const sizeClasses = {
    small: "px-4 py-2 text-sm min-h-[36px]",
    medium: "px-6 py-3 text-base min-h-[48px]",
    large: "px-8 py-4 text-lg min-h-[56px]"
  };

  return (
    <button
      ref={buttonRef}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      onClick={handleClick}
    >
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full animate-ping pointer-events-none"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
            backgroundColor: rippleColor,
            animation: 'material-ripple 0.6s ease-out'
          }}
        />
      ))}
      
      <span className="relative z-10">{children}</span>
      
      <style jsx>{`
        @keyframes material-ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
};

// Android-specific navigation patterns
interface AndroidNavigationProps {
  items: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    onClick: () => void;
  }>;
  variant?: 'bottom' | 'rail' | 'drawer';
}

export const AndroidNavigation: React.FC<AndroidNavigationProps> = ({
  items,
  variant = 'bottom'
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const NavItem: React.FC<{ item: typeof items[0]; vertical?: boolean }> = ({ 
    item, 
    vertical = false 
  }) => (
    <MaterialButton
      variant={item.active ? 'filled' : 'text'}
      onClick={item.onClick}
      className={cn(
        "flex items-center justify-center",
        vertical ? "flex-col space-y-1 py-4" : "flex-row space-x-2"
      )}
    >
      <item.icon className="h-5 w-5" />
      <span className={cn("text-xs", vertical ? "mt-1" : "")}>{item.label}</span>
    </MaterialButton>
  );

  switch (variant) {
    case 'bottom':
      return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="flex justify-around py-2">
            {items.map((item, index) => (
              <NavItem key={index} item={item} vertical />
            ))}
          </div>
        </div>
      );

    case 'rail':
      return (
        <div className="fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-gray-200 z-40 flex flex-col justify-start pt-8">
          {items.map((item, index) => (
            <NavItem key={index} item={item} vertical />
          ))}
        </div>
      );

    case 'drawer':
      return (
        <>
          {/* Backdrop */}
          {drawerOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setDrawerOpen(false)}
            />
          )}
          
          {/* Drawer */}
          <div className={cn(
            "fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 transform transition-transform duration-300",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Navigation</h2>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <NavItem key={index} item={item} />
                ))}
              </div>
            </div>
          </div>
          
          {/* Drawer toggle */}
          <Button
            variant="outline"
            onClick={() => setDrawerOpen(true)}
            className="fixed top-4 left-4 z-30"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </>
      );

    default:
      return null;
  }
};

// Android-optimized container
interface AndroidOptimizedContainerProps {
  children: React.ReactNode;
  className?: string;
  enableMultiWindow?: boolean;
  enableDexMode?: boolean;
  useMaterialDesign?: boolean;
  navigationItems?: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    active?: boolean;
    onClick: () => void;
  }>;
}

export const AndroidOptimizedContainer: React.FC<AndroidOptimizedContainerProps> = ({
  children,
  className,
  enableMultiWindow = true,
  enableDexMode = true,
  useMaterialDesign = true,
  navigationItems
}) => {
  const deviceInfo = useDeviceDetection();

  // Only apply Android optimizations if we're on Android
  if (deviceInfo.platform !== 'Android') {
    return <PlatformWrapper className={className}>{children}</PlatformWrapper>;
  }

  let content = children;

  // Wrap with Samsung DeX integration
  if (enableDexMode && deviceInfo.capabilities.dexMode) {
    content = (
      <SamsungDexMode>
        {content}
      </SamsungDexMode>
    );
  }

  // Wrap with Multi-Window integration
  if (enableMultiWindow && deviceInfo.capabilities.multiWindow) {
    content = (
      <AndroidMultiWindow>
        {content}
      </AndroidMultiWindow>
    );
  }

  return (
    <PlatformWrapper className={cn("android-optimized", className)}>
      {content}
      
      {/* Android Navigation */}
      {navigationItems && (
        <AndroidNavigation 
          items={navigationItems} 
          variant={deviceInfo.capabilities.dexMode ? 'rail' : 'bottom'}
        />
      )}
      
      {/* Android-specific styles */}
      <style jsx>{`
        .android-optimized {
          /* Material Design elevation */
          --elevation-1: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24);
          --elevation-2: 0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23);
          --elevation-3: 0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23);
          
          /* Android-specific spacing */
          --spacing-unit: 8px;
          
          /* Material Design colors */
          --primary-color: #1976d2;
          --primary-variant: #1565c0;
          --secondary-color: #03dac6;
          
          /* System bars padding */
          padding-top: env(safe-area-inset-top, 24px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        
        .android-optimized .material-card {
          box-shadow: var(--elevation-1);
          border-radius: 8px;
          transition: box-shadow 0.2s ease;
        }
        
        .android-optimized .material-card:hover {
          box-shadow: var(--elevation-2);
        }
        
        .dex-active {
          /* Desktop-like experience for DeX mode */
          font-size: 14px;
          line-height: 1.5;
        }
        
        .mobile-layout {
          /* Touch-optimized for mobile */
          font-size: 16px;
          line-height: 1.6;
        }
        
        @media (orientation: landscape) and (min-width: 900px) {
          .android-optimized {
            /* Tablet landscape optimizations */
            padding: 24px 48px;
          }
        }
      `}</style>
    </PlatformWrapper>
  );
};

export default AndroidOptimizedContainer;