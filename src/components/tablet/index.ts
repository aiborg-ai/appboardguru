// Tablet-Optimized Board Meeting Interface Components
// Built by the Tablet-Optimized Board Meeting Interface Specialist Agent

// Layout Components
export { TabletMeetingLayout } from './layout/TabletMeetingLayout';
export { SplitViewContainer } from './layout/SplitViewContainer';
export { FloatingActionPanel } from './layout/FloatingActionPanel';

// Meeting Components
export { TabletMeetingInterface } from './meetings/TabletMeetingInterface';
export { MeetingOrchestrator } from './meetings/MeetingOrchestrator';

// Document Components
export { TabletDocumentViewer } from './documents/TabletDocumentViewer';

// Voting Components
export { TabletVotingInterface } from './voting/TabletVotingInterface';

// Collaboration Components
export { CollaborativeWhiteboard } from './collaboration/CollaborativeWhiteboard';
export { RealTimeComments } from './collaboration/RealTimeComments';

// Gesture Components
export { TabletGestureHandler, useTabletGestures } from './gestures/TabletGestureHandler';
export {
  TouchButton,
  TouchSlider,
  TouchNumberInput,
  SwipeableCard,
  ZoomablePanViewport,
  TouchContextMenu
} from './gestures/TouchOptimizedComponents';

// Platform Components
export { 
  useDeviceDetection,
  usePlatformStyles,
  usePlatformBehaviors,
  PlatformWrapper
} from './platform/PlatformDetection';

export {
  StageManagerIntegration,
  IPadSplitView,
  ApplePencilIntegration,
  ShortcutsIntegration,
  HandoffIntegration,
  IPadOptimizedContainer
} from './platform/IPadOptimizations';

export {
  AndroidMultiWindow,
  SamsungDexMode,
  MaterialButton,
  AndroidNavigation,
  AndroidOptimizedContainer
} from './platform/AndroidOptimizations';

// Sync Components
export { RealTimeSync } from './sync/RealTimeSync';

// Types
export type {
  DeviceInfo,
  ConnectionStatus,
  SyncStatus
} from './platform/PlatformDetection';

// Re-export commonly used types for convenience
export interface TabletMeetingConfig {
  meetingId: string;
  currentUserId: string;
  enableGestures?: boolean;
  enableRealTimeSync?: boolean;
  platform?: 'auto' | 'ipad' | 'android' | 'generic';
  syncWebSocketUrl?: string;
  offlineMode?: boolean;
}

export interface TabletFeatures {
  multiPaneLayout: boolean;
  documentAnnotation: boolean;
  advancedVoting: boolean;
  collaborativeWhiteboard: boolean;
  realTimeComments: boolean;
  gestureSupport: boolean;
  platformOptimizations: boolean;
  realTimeSync: boolean;
}

// Default configuration
export const DEFAULT_TABLET_CONFIG: TabletMeetingConfig = {
  meetingId: '',
  currentUserId: '',
  enableGestures: true,
  enableRealTimeSync: true,
  platform: 'auto',
  syncWebSocketUrl: process.env.NODE_ENV === 'production' 
    ? 'wss://boardguru.ai/ws' 
    : 'ws://localhost:3001',
  offlineMode: true
};

export const SUPPORTED_FEATURES: TabletFeatures = {
  multiPaneLayout: true,
  documentAnnotation: true,
  advancedVoting: true,
  collaborativeWhiteboard: true,
  realTimeComments: true,
  gestureSupport: true,
  platformOptimizations: true,
  realTimeSync: true
};