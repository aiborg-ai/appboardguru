/**
 * Tablet Meeting Layout Component
 * Master-detail layout optimized for board meetings on tablets
 * Supports iPad and Android tablets with responsive split views
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDeviceOrientation } from '@react-native-community/hooks';

import { TabletNavigationBar } from './TabletNavigationBar';
import { ContextualSidebar } from './ContextualSidebar';
import { FloatingActionPanel } from './FloatingActionPanel';
import { useMobileGestures } from '../../hooks/useMobileGestures';

interface TabletMeetingLayoutProps {
  children: React.ReactNode;
  leftPane?: React.ReactNode;
  rightPane?: React.ReactNode;
  bottomPanel?: React.ReactNode;
  sidebarContent?: React.ReactNode;
  floatingActions?: Array<{
    id: string;
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
    disabled?: boolean;
  }>;
  onPaneResize?: (leftWidth: number, rightWidth: number) => void;
  meetingId: string;
  organizationId: string;
}

interface LayoutConfig {
  splitViewEnabled: boolean;
  leftPaneMinWidth: number;
  rightPaneMinWidth: number;
  sidebarWidth: number;
  bottomPanelHeight: number;
  adaptiveBreakpoint: number;
}

export const TabletMeetingLayout: React.FC<TabletMeetingLayoutProps> = ({
  children,
  leftPane,
  rightPane,
  bottomPanel,
  sidebarContent,
  floatingActions = [],
  onPaneResize,
  meetingId,
  organizationId,
}) => {
  const { portrait } = useDeviceOrientation();
  const screenData = Dimensions.get('screen');
  const windowData = Dimensions.get('window');
  
  // Layout state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(0.6); // 60/40 split by default
  const [floatingPanelVisible, setFloatingPanelVisible] = useState(false);

  // Animation values
  const sidebarAnimation = useRef(new Animated.Value(0)).current;
  const bottomPanelAnimation = useRef(new Animated.Value(0)).current;
  const splitAnimation = useRef(new Animated.Value(splitRatio)).current;

  // Configuration based on device type and orientation
  const layoutConfig: LayoutConfig = {
    splitViewEnabled: windowData.width >= 768, // Enable split view for tablets
    leftPaneMinWidth: 320,
    rightPaneMinWidth: 280,
    sidebarWidth: portrait ? windowData.width * 0.85 : 320,
    bottomPanelHeight: 300,
    adaptiveBreakpoint: 1024,
  };

  // Calculate layout dimensions
  const availableWidth = layoutConfig.splitViewEnabled 
    ? windowData.width - (sidebarOpen ? layoutConfig.sidebarWidth : 0)
    : windowData.width;
  
  const leftPaneWidth = layoutConfig.splitViewEnabled 
    ? availableWidth * splitRatio 
    : availableWidth;
  
  const rightPaneWidth = layoutConfig.splitViewEnabled 
    ? availableWidth * (1 - splitRatio) 
    : availableWidth;

  // Gesture handlers for split view resizing
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => layoutConfig.splitViewEnabled,
      onPanResponderGrant: () => {
        splitAnimation.setOffset(splitRatio);
      },
      onPanResponderMove: (_, gestureState) => {
        const newRatio = Math.max(
          0.3,
          Math.min(0.7, splitRatio + gestureState.dx / availableWidth)
        );
        splitAnimation.setValue(newRatio - splitRatio);
      },
      onPanResponderRelease: (_, gestureState) => {
        const newRatio = Math.max(
          0.3,
          Math.min(0.7, splitRatio + gestureState.dx / availableWidth)
        );
        
        splitAnimation.flattenOffset();
        setSplitRatio(newRatio);
        onPaneResize?.(availableWidth * newRatio, availableWidth * (1 - newRatio));

        Animated.spring(splitAnimation, {
          toValue: newRatio,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // Mobile gesture integration
  const { handleSwipeGesture } = useMobileGestures({
    onSwipeLeft: () => {
      if (sidebarOpen) {
        toggleSidebar();
      }
    },
    onSwipeRight: () => {
      if (!sidebarOpen) {
        toggleSidebar();
      }
    },
    onSwipeUp: () => {
      if (!bottomPanelOpen && bottomPanel) {
        toggleBottomPanel();
      }
    },
    onSwipeDown: () => {
      if (bottomPanelOpen) {
        toggleBottomPanel();
      }
    },
  });

  // Layout control functions
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
    Animated.spring(sidebarAnimation, {
      toValue: sidebarOpen ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [sidebarOpen, sidebarAnimation]);

  const toggleBottomPanel = useCallback(() => {
    setBottomPanelOpen(prev => !prev);
    Animated.spring(bottomPanelAnimation, {
      toValue: bottomPanelOpen ? 0 : 1,
      useNativeDriver: true,
    }).start();
  }, [bottomPanelOpen, bottomPanelAnimation]);

  const toggleFloatingPanel = useCallback(() => {
    setFloatingPanelVisible(prev => !prev);
  }, []);

  // Apple Pencil support for iPad
  const handleStylusInput = useCallback((event: any) => {
    if (Platform.OS === 'ios' && event.nativeEvent.touches) {
      const touch = event.nativeEvent.touches[0];
      if (touch && touch.force > 0.5) {
        // Handle pressure-sensitive input
        setFloatingPanelVisible(true);
      }
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} {...handleSwipeGesture}>
      {/* Navigation Bar */}
      <TabletNavigationBar
        onMenuPress={toggleSidebar}
        onActionPress={toggleFloatingPanel}
        meetingId={meetingId}
        organizationId={organizationId}
        layout={layoutConfig.splitViewEnabled ? 'split' : 'single'}
      />

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        {layoutConfig.splitViewEnabled && (leftPane || rightPane) ? (
          // Split View Layout
          <View style={styles.splitContainer}>
            {leftPane && (
              <Animated.View
                style={[
                  styles.leftPane,
                  {
                    width: splitAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [leftPaneWidth, leftPaneWidth],
                    }),
                  },
                ]}
              >
                {leftPane}
              </Animated.View>
            )}

            {/* Resizer Handle */}
            {leftPane && rightPane && (
              <View
                style={styles.resizer}
                {...panResponder.panHandlers}
              >
                <View style={styles.resizerHandle} />
              </View>
            )}

            {rightPane && (
              <Animated.View
                style={[
                  styles.rightPane,
                  {
                    width: splitAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [rightPaneWidth, rightPaneWidth],
                    }),
                  },
                ]}
              >
                {rightPane}
              </Animated.View>
            )}
          </View>
        ) : (
          // Single Pane Layout
          <View style={styles.singlePane} onTouchStart={handleStylusInput}>
            {children}
          </View>
        )}

        {/* Bottom Panel */}
        {bottomPanel && (
          <Animated.View
            style={[
              styles.bottomPanel,
              {
                height: layoutConfig.bottomPanelHeight,
                transform: [
                  {
                    translateY: bottomPanelAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layoutConfig.bottomPanelHeight, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {bottomPanel}
          </Animated.View>
        )}
      </View>

      {/* Contextual Sidebar */}
      <ContextualSidebar
        isOpen={sidebarOpen}
        width={layoutConfig.sidebarWidth}
        onClose={toggleSidebar}
        content={sidebarContent}
        meetingId={meetingId}
        animationValue={sidebarAnimation}
      />

      {/* Floating Action Panel */}
      <FloatingActionPanel
        visible={floatingPanelVisible}
        actions={floatingActions}
        onClose={() => setFloatingPanelVisible(false)}
        position={{ bottom: 100, right: 20 }}
      />

      {/* Stage Manager Support (iPad) */}
      {Platform.OS === 'ios' && (
        <View style={styles.stageManagerSupport}>
          {/* Stage Manager indicators and controls */}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  rightPane: {
    backgroundColor: '#ffffff',
  },
  singlePane: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  resizer: {
    width: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: Platform.OS === 'web' ? 'col-resize' : undefined,
  },
  resizerHandle: {
    width: 4,
    height: 40,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
  },
  bottomPanel: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  stageManagerSupport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0, // Will be adjusted based on Stage Manager state
  },
});