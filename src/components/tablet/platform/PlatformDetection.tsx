'use client';

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  platform: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  device: 'iPad' | 'Android Tablet' | 'Surface' | 'Desktop' | 'Phone' | 'Unknown';
  browser: 'Safari' | 'Chrome' | 'Firefox' | 'Edge' | 'Samsung Internet' | 'Unknown';
  version: string;
  isTouchDevice: boolean;
  isTablet: boolean;
  supportsHover: boolean;
  screenSize: {
    width: number;
    height: number;
    ratio: number;
  };
  orientation: 'portrait' | 'landscape';
  capabilities: {
    pencilSupport: boolean;
    stageManager: boolean;
    splitView: boolean;
    multiWindow: boolean;
    dexMode: boolean;
    handoff: boolean;
    shortcuts: boolean;
  };
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    platform: 'Unknown',
    device: 'Unknown',
    browser: 'Unknown',
    version: '',
    isTouchDevice: false,
    isTablet: false,
    supportsHover: false,
    screenSize: { width: 0, height: 0, ratio: 1 },
    orientation: 'portrait',
    capabilities: {
      pencilSupport: false,
      stageManager: false,
      splitView: false,
      multiWindow: false,
      dexMode: false,
      handoff: false,
      shortcuts: false
    }
  });

  useEffect(() => {
    const detectDevice = (): DeviceInfo => {
      const userAgent = navigator.userAgent;
      const platform = navigator.platform;
      const standalone = (window.navigator as any).standalone;
      
      // Platform detection
      let detectedPlatform: DeviceInfo['platform'] = 'Unknown';
      let device: DeviceInfo['device'] = 'Unknown';
      let browser: DeviceInfo['browser'] = 'Unknown';
      let version = '';

      // iOS Detection
      if (/iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        detectedPlatform = 'iOS';
        
        if (/iPad/.test(userAgent) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
          device = 'iPad';
        }
        
        // iOS version
        const match = userAgent.match(/OS (\d+)_(\d+)/);
        if (match) {
          version = `${match[1]}.${match[2]}`;
        }
        
        // Browser detection on iOS
        if (/CriOS/.test(userAgent)) {
          browser = 'Chrome';
        } else if (/FxiOS/.test(userAgent)) {
          browser = 'Firefox';
        } else if (/EdgiOS/.test(userAgent)) {
          browser = 'Edge';
        } else {
          browser = 'Safari';
        }
      }
      
      // Android Detection
      else if (/Android/.test(userAgent)) {
        detectedPlatform = 'Android';
        
        // Android tablet detection
        if (!/Mobile/.test(userAgent)) {
          device = 'Android Tablet';
        }
        
        // Android version
        const androidMatch = userAgent.match(/Android (\d+\.?\d*)/);
        if (androidMatch) {
          version = androidMatch[1];
        }
        
        // Browser detection on Android
        if (/Chrome/.test(userAgent)) {
          if (/SamsungBrowser/.test(userAgent)) {
            browser = 'Samsung Internet';
          } else {
            browser = 'Chrome';
          }
        } else if (/Firefox/.test(userAgent)) {
          browser = 'Firefox';
        } else if (/Edge/.test(userAgent)) {
          browser = 'Edge';
        }
      }
      
      // Windows Detection
      else if (/Windows/.test(userAgent)) {
        detectedPlatform = 'Windows';
        if (/Touch/.test(userAgent) || navigator.maxTouchPoints > 0) {
          device = 'Surface';
        } else {
          device = 'Desktop';
        }
        
        // Browser detection on Windows
        if (/Chrome/.test(userAgent) && !/Edge/.test(userAgent)) {
          browser = 'Chrome';
        } else if (/Firefox/.test(userAgent)) {
          browser = 'Firefox';
        } else if (/Edge/.test(userAgent)) {
          browser = 'Edge';
        }
      }
      
      // macOS Detection
      else if (/Mac/.test(platform) && navigator.maxTouchPoints === 0) {
        detectedPlatform = 'macOS';
        device = 'Desktop';
        
        if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
          browser = 'Safari';
        } else if (/Chrome/.test(userAgent)) {
          browser = 'Chrome';
        } else if (/Firefox/.test(userAgent)) {
          browser = 'Firefox';
        }
      }

      // Touch and tablet detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isTablet = isTouchDevice && (
        device === 'iPad' || 
        device === 'Android Tablet' || 
        device === 'Surface' ||
        (window.innerWidth >= 768 && window.innerWidth <= 1366)
      );

      // Screen info
      const screenSize = {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: window.devicePixelRatio || 1
      };

      const orientation = screenSize.width > screenSize.height ? 'landscape' : 'portrait';

      // Capability detection
      const capabilities = {
        // Apple Pencil support (iOS 9.1+)
        pencilSupport: detectedPlatform === 'iOS' && device === 'iPad' && 
          parseFloat(version) >= 9.1,
        
        // Stage Manager (iOS 16+ on iPad)
        stageManager: detectedPlatform === 'iOS' && device === 'iPad' && 
          parseFloat(version) >= 16,
        
        // Split View (iOS 9+ on iPad)
        splitView: detectedPlatform === 'iOS' && device === 'iPad' && 
          parseFloat(version) >= 9,
        
        // Multi-window (Android 7+)
        multiWindow: detectedPlatform === 'Android' && parseFloat(version) >= 7,
        
        // Samsung DeX mode
        dexMode: detectedPlatform === 'Android' && /Samsung/.test(userAgent),
        
        // Handoff (iOS/macOS)
        handoff: detectedPlatform === 'iOS' || detectedPlatform === 'macOS',
        
        // Shortcuts app (iOS 12+)
        shortcuts: detectedPlatform === 'iOS' && parseFloat(version) >= 12
      };

      // Hover support
      const supportsHover = window.matchMedia('(hover: hover)').matches;

      return {
        platform: detectedPlatform,
        device,
        browser,
        version,
        isTouchDevice,
        isTablet,
        supportsHover,
        screenSize,
        orientation,
        capabilities
      };
    };

    const updateDeviceInfo = () => {
      setDeviceInfo(detectDevice());
    };

    // Initial detection
    updateDeviceInfo();

    // Listen for orientation changes
    const handleOrientationChange = () => {
      setTimeout(updateDeviceInfo, 100); // Small delay to ensure dimensions are updated
    };

    // Listen for resize events
    const handleResize = () => {
      updateDeviceInfo();
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceInfo;
};

// Platform-specific styles and behaviors
export const usePlatformStyles = (deviceInfo: DeviceInfo) => {
  return {
    // iOS-specific styles
    ios: {
      // Safe area handling
      paddingTop: deviceInfo.platform === 'iOS' ? 'env(safe-area-inset-top)' : '0',
      paddingBottom: deviceInfo.platform === 'iOS' ? 'env(safe-area-inset-bottom)' : '0',
      paddingLeft: deviceInfo.platform === 'iOS' ? 'env(safe-area-inset-left)' : '0',
      paddingRight: deviceInfo.platform === 'iOS' ? 'env(safe-area-inset-right)' : '0',
      
      // iOS-specific interactions
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      
      // Smooth scrolling
      WebkitOverflowScrolling: 'touch'
    },

    // Android-specific styles
    android: {
      // Navigation bar handling
      paddingBottom: deviceInfo.platform === 'Android' ? '0' : '0', // Android handles this differently
      
      // Material design elevation
      boxShadow: deviceInfo.platform === 'Android' ? 
        '0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)' : 'none'
    },

    // Touch-optimized sizes
    touch: {
      minHeight: deviceInfo.isTouchDevice ? '48px' : '36px',
      minWidth: deviceInfo.isTouchDevice ? '48px' : 'auto',
      fontSize: deviceInfo.isTablet ? '16px' : '14px',
      padding: deviceInfo.isTouchDevice ? '12px' : '8px'
    },

    // Tablet-specific layouts
    tablet: {
      maxWidth: deviceInfo.isTablet ? '100%' : '1200px',
      padding: deviceInfo.isTablet ? '16px' : '24px',
      gap: deviceInfo.isTablet ? '12px' : '8px'
    }
  };
};

// Platform-specific component wrapper
interface PlatformWrapperProps {
  children: React.ReactNode;
  className?: string;
  applyPlatformStyles?: boolean;
}

export const PlatformWrapper: React.FC<PlatformWrapperProps> = ({
  children,
  className,
  applyPlatformStyles = true
}) => {
  const deviceInfo = useDeviceDetection();
  const styles = usePlatformStyles(deviceInfo);

  const wrapperStyle = applyPlatformStyles ? {
    ...styles.ios,
    ...styles.android,
    ...styles.touch,
    ...styles.tablet
  } : {};

  // Add platform-specific classes
  const platformClasses = [
    `platform-${deviceInfo.platform.toLowerCase()}`,
    `device-${deviceInfo.device.toLowerCase().replace(/ /g, '-')}`,
    `browser-${deviceInfo.browser.toLowerCase().replace(/ /g, '-')}`,
    deviceInfo.isTouchDevice && 'touch-device',
    deviceInfo.isTablet && 'tablet-device',
    deviceInfo.supportsHover && 'supports-hover',
    `orientation-${deviceInfo.orientation}`,
    deviceInfo.capabilities.pencilSupport && 'pencil-support',
    deviceInfo.capabilities.stageManager && 'stage-manager',
    deviceInfo.capabilities.splitView && 'split-view',
    deviceInfo.capabilities.multiWindow && 'multi-window',
    deviceInfo.capabilities.dexMode && 'dex-mode'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={`${platformClasses} ${className || ''}`} 
      style={wrapperStyle}
      data-platform={deviceInfo.platform}
      data-device={deviceInfo.device}
      data-browser={deviceInfo.browser}
      data-version={deviceInfo.version}
    >
      {children}
    </div>
  );
};

// Hook for platform-specific behaviors
export const usePlatformBehaviors = (deviceInfo: DeviceInfo) => {
  return {
    // Prevent zoom on double tap for iOS Safari
    preventDoubleTapZoom: deviceInfo.platform === 'iOS' && deviceInfo.browser === 'Safari',
    
    // Use bounce scrolling for iOS
    useBounceScrolling: deviceInfo.platform === 'iOS',
    
    // Enable hardware acceleration
    useHardwareAcceleration: deviceInfo.isTablet,
    
    // Use different animation durations
    animationDuration: deviceInfo.platform === 'iOS' ? 300 : 250,
    
    // Different touch feedback
    hapticFeedback: deviceInfo.platform === 'iOS' ? 'light' : 'medium',
    
    // Platform-specific shortcuts
    shortcuts: {
      save: deviceInfo.platform === 'iOS' ? '⌘S' : 'Ctrl+S',
      copy: deviceInfo.platform === 'iOS' ? '⌘C' : 'Ctrl+C',
      paste: deviceInfo.platform === 'iOS' ? '⌘V' : 'Ctrl+V',
      undo: deviceInfo.platform === 'iOS' ? '⌘Z' : 'Ctrl+Z'
    },
    
    // File handling
    fileTypes: deviceInfo.platform === 'iOS' ? 
      ['image/*', 'application/pdf'] : 
      ['*/*'],
    
    // Sharing capabilities
    canShare: 'share' in navigator && deviceInfo.isTablet,
    
    // Fullscreen capabilities
    canFullscreen: 'requestFullscreen' in document.documentElement || 
      'webkitRequestFullscreen' in document.documentElement
  };
};

export default PlatformWrapper;