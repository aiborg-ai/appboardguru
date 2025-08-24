/**
 * Mobile-Specific Types
 * Extends existing DDD types for mobile app functionality
 * Leverages the complete branded type system and Result patterns from the main app
 */

// Re-export complete branded type system
export type {
  // Core IDs
  UserId,
  OrganizationId,
  AssetId,
  VaultId,
  DocumentId,
  AnnotationId,
  CommentId,
  BoardId,
  BoardMateId,
  CommitteeId,
  SessionId,
  SocketId,
  RoomId,
  NotificationId,
  EventId,
  CalendarEventId,
  MeetingId,
  MeetingResolutionId,
  MeetingActionableId,
  MeetingVoteId,
  WorkflowId,
  InvitationId,
  
  // Utility types
  Brand,
  ValidatedBrand,
  ValidationResult,
  UnBrand,
  IsBranded,
  AnyBrandedId,
  
  // Additional types
  Email,
  Slug,
  Url,
  FilePath,
  MimeType,
  JsonString,
  ISODateString,
  JWT,
  ApiKey,
  Percentage,
  FileSize,
  Timestamp,
  Port,
  Version
} from '../types/shared/branded';

// Re-export Result pattern
export type {
  Result,
  Option,
  AppError,
  RepositoryError,
  ErrorCode,
  ErrorCategory
} from '../types/shared/result';

// Re-export type constructors and validators
export {
  createUserId,
  createOrganizationId,
  createAssetId,
  createVaultId,
  createDocumentId,
  createAnnotationId,
  createMeetingId,
  createNotificationId,
  unsafeUserId,
  unsafeOrganizationId,
  unsafeAssetId,
  unsafeVaultId,
  isUserId,
  isOrganizationId,
  isAssetId,
  isVaultId,
  extractId,
  Ok,
  Err,
  Result,
  Some,
  None,
  Option,
  match,
  matchAsync,
  matchOption,
  success,
  failure
} from '../types/shared/branded';

// Mobile-specific branded types
export type DeviceId = Brand<string, 'DeviceId'>;
export type PushToken = Brand<string, 'PushToken'>;
export type BiometricId = Brand<string, 'BiometricId'>;
export type SyncJobId = Brand<string, 'SyncJobId'>;
export type OfflineActionId = Brand<string, 'OfflineActionId'>;
export type CacheKey = Brand<string, 'CacheKey'>;

// Mobile device information
export interface DeviceInfo {
  readonly deviceId: DeviceId;
  readonly platform: 'ios' | 'android';
  readonly osVersion: string;
  readonly appVersion: string;
  readonly deviceName: string;
  readonly deviceModel: string;
  readonly isTablet: boolean;
  readonly hasNotch: boolean;
  readonly screenDimensions: {
    width: number;
    height: number;
    scale: number;
  };
  readonly capabilities: {
    biometric: boolean;
    camera: boolean;
    microphone: boolean;
    location: boolean;
    pushNotifications: boolean;
  };
}

// Biometric authentication types
export interface BiometricConfig {
  readonly enabled: boolean;
  readonly availableTypes: BiometricType[];
  readonly fallbackEnabled: boolean;
  readonly maxAttempts: number;
}

export type BiometricType = 
  | 'TouchID' 
  | 'FaceID' 
  | 'Fingerprint' 
  | 'Face' 
  | 'Iris'
  | 'Voice';

export interface BiometricPromptConfig {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly fallbackTitle?: string;
  readonly negativeText?: string;
}

export interface BiometricAuthResult {
  readonly success: boolean;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly type: 'user_cancel' | 'system_cancel' | 'authentication_failed' | 'biometric_unavailable';
  };
  readonly biometricType?: BiometricType;
}

// Offline storage types
export interface OfflineStorageInfo {
  readonly totalSizeMB: number;
  readonly usedSizeMB: number;
  readonly availableSizeMB: number;
  readonly isNearLimit: boolean;
  readonly lastCleanup: string;
}

export interface OfflineAction {
  readonly id: OfflineActionId;
  readonly type: OfflineActionType;
  readonly data: any;
  readonly timestamp: number;
  readonly retryCount: number;
  readonly priority: SyncPriority;
  readonly organizationId?: OrganizationId;
}

export type OfflineActionType =
  | 'create_asset'
  | 'update_asset'
  | 'delete_asset'
  | 'create_annotation'
  | 'update_annotation'
  | 'submit_vote'
  | 'create_meeting'
  | 'update_meeting'
  | 'mark_notification_read'
  | 'update_profile'
  | 'sync_documents';

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low';

export interface SyncStatus {
  readonly isOnline: boolean;
  readonly lastSyncTime: number;
  readonly pendingActions: number;
  readonly syncInProgress: boolean;
  readonly nextSyncIn: number;
  readonly failedSyncs: number;
}

// Navigation types
export type RootStackParamList = {
  // Authentication flow
  Welcome: undefined;
  Login: undefined;
  BiometricSetup: undefined;
  
  // Main app
  MainTabs: undefined;
  
  // Document viewer
  DocumentViewer: {
    assetId: AssetId;
    vaultId?: VaultId;
    readOnly?: boolean;
  };
  
  // Meeting flows
  MeetingDetail: {
    meetingId: MeetingId;
  };
  VotingSession: {
    meetingId: MeetingId;
    sessionId: string;
  };
  
  // Settings and profile
  Profile: undefined;
  Settings: undefined;
  SecuritySettings: undefined;
  NotificationSettings: undefined;
  
  // Organization management
  OrganizationList: undefined;
  OrganizationDetail: {
    organizationId: OrganizationId;
  };
  
  // Error and offline states
  OfflineMode: undefined;
  ErrorScreen: {
    error: string;
    retry?: () => void;
  };
};

export type TabParamList = {
  Dashboard: undefined;
  Meetings: undefined;
  Documents: undefined;
  Notifications: undefined;
  Profile: undefined;
};

// Screen component types
export interface ScreenProps<T extends keyof RootStackParamList> {
  navigation: any; // TODO: Type this properly with navigation prop
  route: {
    params: RootStackParamList[T];
  };
}

// Touch and gesture types
export interface GestureConfig {
  readonly swipeEnabled: boolean;
  readonly pullToRefreshEnabled: boolean;
  readonly hapticFeedbackEnabled: boolean;
  readonly gestureHandlerTag?: string;
}

export interface SwipeActionConfig {
  readonly text: string;
  readonly icon: string;
  readonly color: string;
  readonly backgroundColor: string;
  readonly onPress: () => void;
  readonly hapticType?: 'light' | 'medium' | 'heavy';
}

export interface TouchFeedbackConfig {
  readonly type: 'light' | 'medium' | 'heavy' | 'selection';
  readonly enabled: boolean;
}

// Mobile-specific UI state
export interface MobileUIState {
  readonly isKeyboardVisible: boolean;
  readonly keyboardHeight: number;
  readonly orientation: 'portrait' | 'landscape';
  readonly isTablet: boolean;
  readonly safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  readonly theme: 'light' | 'dark' | 'system';
}

// Performance monitoring types
export interface PerformanceMetrics {
  readonly screenLoadTime: number;
  readonly renderTime: number;
  readonly memoryUsage: number;
  readonly networkLatency: number;
  readonly crashCount: number;
  readonly errorCount: number;
  readonly offlineActionsCount: number;
}

export interface ComponentPerformanceConfig {
  readonly enableProfiling: boolean;
  readonly trackRenders: boolean;
  readonly trackMemory: boolean;
  readonly performanceBudget?: {
    renderTime: number;
    memoryUsage: number;
  };
}

// Security and compliance types
export interface SecurityConfig {
  readonly jailbreakDetectionEnabled: boolean;
  readonly rootDetectionEnabled: boolean;
  readonly debuggerDetectionEnabled: boolean;
  readonly screenshotPreventionEnabled: boolean;
  readonly certificatePinningEnabled: boolean;
  readonly biometricLockTimeout: number;
}

export interface ComplianceConfig {
  readonly auditLoggingEnabled: boolean;
  readonly dataRetentionDays: number;
  readonly encryptionRequired: boolean;
  readonly accessLoggingEnabled: boolean;
  readonly remoteWipeEnabled: boolean;
}

// MDM (Mobile Device Management) types
export interface MDMConfig {
  readonly enrolled: boolean;
  readonly policies: MDMPolicy[];
  readonly restrictions: MDMRestriction[];
  readonly compliance: {
    readonly isCompliant: boolean;
    readonly violations: string[];
    readonly lastCheck: string;
  };
}

export interface MDMPolicy {
  readonly id: string;
  readonly name: string;
  readonly type: 'security' | 'app' | 'device' | 'network';
  readonly enforced: boolean;
  readonly value: any;
}

export interface MDMRestriction {
  readonly id: string;
  readonly type: 'app_installation' | 'camera' | 'screenshot' | 'copy_paste' | 'backup';
  readonly enforced: boolean;
  readonly message?: string;
}

// Push notification data
export interface PushNotificationData {
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, any>;
  readonly category?: string;
  readonly priority?: 'high' | 'normal' | 'low';
  readonly silent?: boolean;
  readonly badge?: number;
  readonly sound?: string;
  readonly actions?: Array<{
    readonly id: string;
    readonly title: string;
    readonly destructive?: boolean;
  }>;
}

// Export utility types
export type MobileTheme = 'light' | 'dark' | 'system';
export type NetworkStatus = 'online' | 'offline' | 'poor';
export type AppState = 'active' | 'background' | 'inactive';

// Generic mobile component props
export interface MobileComponentProps {
  readonly testID?: string;
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: string;
  readonly disabled?: boolean;
}

// Error boundary types
export interface ErrorInfo {
  readonly error: Error;
  readonly errorInfo: {
    readonly componentStack: string;
  };
  readonly timestamp: number;
  readonly userId?: UserId;
  readonly organizationId?: OrganizationId;
  readonly screenName?: string;
  readonly additionalContext?: Record<string, any>;
}

// Type guards for mobile-specific types
export function isDeviceId(value: unknown): value is DeviceId {
  return typeof value === 'string' && value.length > 0;
}

export function isPushToken(value: unknown): value is PushToken {
  return typeof value === 'string' && value.length > 10;
}

export function isBiometricType(value: unknown): value is BiometricType {
  const validTypes: BiometricType[] = ['TouchID', 'FaceID', 'Fingerprint', 'Face', 'Iris', 'Voice'];
  return typeof value === 'string' && validTypes.includes(value as BiometricType);
}

// Mobile-specific utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredMobile<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Brand type for mobile IDs
export type Brand<T, B> = T & { readonly __brand: B };