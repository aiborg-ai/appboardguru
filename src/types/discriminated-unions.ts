/**
 * Discriminated Union Types for Better State Management
 * Provides exhaustive type checking and better error handling
 */

// API Response States
export type ApiState<T> =
  | { status: 'idle' }
  | { status: 'loading'; message?: string }
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; error: { code: string; message: string; details?: unknown } };

// Authentication States
export type AuthState = 
  | { status: 'unauthenticated' }
  | { status: 'authenticating'; method: 'password' | 'oauth' | 'magic-link' }
  | { status: 'authenticated'; user: AuthenticatedUser; session: UserSession }
  | { status: 'expired'; lastUser: AuthenticatedUser }
  | { status: 'error'; error: AuthError };

// Upload States
export type UploadState =
  | { status: 'idle' }
  | { status: 'selecting'; allowedTypes: string[] }
  | { status: 'validating'; file: File }
  | { status: 'uploading'; file: File; progress: number; bytesSent: number; totalBytes: number }
  | { status: 'processing'; fileId: string; stage: 'thumbnail' | 'analysis' | 'indexing' }
  | { status: 'completed'; fileId: string; asset: ProcessedAsset }
  | { status: 'failed'; error: UploadError; file?: File; retryable: boolean };

// Search States
export type SearchState =
  | { status: 'idle' }
  | { status: 'searching'; query: string; searchId: string }
  | { status: 'completed'; query: string; results: SearchResults; searchTime: number }
  | { status: 'failed'; query: string; error: SearchError };

// Sync States for Offline Support
export type SyncState =
  | { status: 'online'; lastSync: number }
  | { status: 'offline'; queuedActions: QueuedAction[]; lastOnline: number }
  | { status: 'syncing'; progress: number; totalActions: number; currentAction: string }
  | { status: 'conflict'; conflicts: SyncConflict[] }
  | { status: 'error'; error: SyncError; canRetry: boolean };

// Notification States
export type NotificationState =
  | { type: 'info'; message: string; dismissible: true }
  | { type: 'success'; message: string; action?: NotificationAction; dismissible: true }
  | { type: 'warning'; message: string; action?: NotificationAction; dismissible: true }
  | { type: 'error'; message: string; action?: NotificationAction; dismissible: boolean; persistent?: boolean }
  | { type: 'loading'; message: string; dismissible: false }
  | { type: 'progress'; message: string; progress: number; dismissible: boolean };

// Asset Processing States
export type AssetProcessingState =
  | { stage: 'uploaded'; assetId: string; originalFile: FileMetadata }
  | { stage: 'analyzing'; assetId: string; progress: number; currentAnalysis: 'content' | 'structure' | 'metadata' }
  | { stage: 'extracting'; assetId: string; progress: number; extractionType: 'text' | 'images' | 'annotations' }
  | { stage: 'indexing'; assetId: string; progress: number; indexType: 'full-text' | 'semantic' | 'metadata' }
  | { stage: 'completed'; assetId: string; result: ProcessedAssetResult; processingTime: number }
  | { stage: 'failed'; assetId: string; error: ProcessingError; stage: 'analyzing' | 'extracting' | 'indexing'; retryable: boolean };

// Real-time Connection States
export type WebSocketState =
  | { status: 'disconnected'; reason?: 'initial' | 'user' | 'error' | 'server' }
  | { status: 'connecting'; attempt: number; maxAttempts: number }
  | { status: 'connected'; connectionId: string; connectedAt: number; latency?: number }
  | { status: 'reconnecting'; attempt: number; lastConnectedAt: number; reason: 'lost' | 'timeout' | 'error' }
  | { status: 'failed'; error: ConnectionError; finalAttempt: boolean };

// Form States
export type FormState<T> =
  | { status: 'pristine'; initialValues: T }
  | { status: 'editing'; values: T; changes: Partial<T>; isValid: boolean; errors: FormErrors }
  | { status: 'validating'; values: T }
  | { status: 'submitting'; values: T; submitAttempt: number }
  | { status: 'submitted'; submittedValues: T; response: unknown }
  | { status: 'error'; values: T; error: SubmissionError; canRetry: boolean };

// Cache States
export type CacheState<T> =
  | { status: 'empty' }
  | { status: 'fresh'; data: T; cachedAt: number; expiresAt: number }
  | { status: 'stale'; data: T; cachedAt: number; expiresAt: number }
  | { status: 'revalidating'; staleData: T; revalidationId: string }
  | { status: 'invalid'; lastData?: T; invalidatedAt: number; reason: 'expired' | 'mutation' | 'manual' };

// Modal/Dialog States
export type ModalState =
  | { status: 'closed' }
  | { status: 'opening'; animation: 'fade' | 'slide' | 'scale' }
  | { status: 'open'; data?: unknown; allowClose: boolean }
  | { status: 'closing'; reason: 'user' | 'escape' | 'backdrop' | 'programmatic' };

// Media Query States
export type ViewportState =
  | { breakpoint: 'mobile'; width: number; height: number; orientation: 'portrait' | 'landscape' }
  | { breakpoint: 'tablet'; width: number; height: number; orientation: 'portrait' | 'landscape' }
  | { breakpoint: 'desktop'; width: number; height: number; isWidescreen: boolean }
  | { breakpoint: 'ultra-wide'; width: number; height: number };

// Permission States
export type PermissionState =
  | { status: 'unknown' }
  | { status: 'requesting'; permission: string }
  | { status: 'granted'; permission: string; grantedAt: number }
  | { status: 'denied'; permission: string; deniedAt: number; canPromptAgain: boolean }
  | { status: 'blocked'; permission: string; blockedAt: number };

// Supporting Types
interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
}

interface UserSession {
  id: string;
  expiresAt: number;
  refreshToken: string;
}

interface AuthError {
  code: 'invalid_credentials' | 'account_locked' | 'network_error' | 'server_error';
  message: string;
  retryable: boolean;
}

interface ProcessedAsset {
  id: string;
  title: string;
  thumbnailUrl?: string;
  metadata: AssetMetadata;
}

interface AssetMetadata {
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  pageCount?: number;
}

interface UploadError {
  code: 'file_too_large' | 'invalid_type' | 'network_error' | 'server_error' | 'quota_exceeded';
  message: string;
  maxFileSize?: number;
  allowedTypes?: string[];
}

interface SearchResults {
  items: SearchResultItem[];
  totalCount: number;
  facets?: SearchFacets;
  suggestions?: string[];
}

interface SearchResultItem {
  id: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

interface SearchFacets {
  fileTypes: { value: string; count: number }[];
  categories: { value: string; count: number }[];
  dateRanges: { value: string; count: number }[];
}

interface SearchError {
  code: 'invalid_query' | 'timeout' | 'server_error' | 'quota_exceeded';
  message: string;
}

interface QueuedAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

interface SyncConflict {
  id: string;
  localVersion: unknown;
  serverVersion: unknown;
  conflictType: 'content' | 'metadata' | 'permissions';
}

interface SyncError {
  code: 'network_error' | 'auth_error' | 'server_error' | 'conflict_error';
  message: string;
}

interface NotificationAction {
  label: string;
  action: () => void | Promise<void>;
}

interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface ProcessedAssetResult {
  textContent?: string;
  extractedImages?: string[];
  metadata: Record<string, unknown>;
  searchTerms: string[];
}

interface ProcessingError {
  code: 'unsupported_format' | 'corrupted_file' | 'processing_timeout' | 'server_error';
  message: string;
  details?: Record<string, unknown>;
}

interface ConnectionError {
  code: 'network_error' | 'auth_error' | 'server_error' | 'rate_limited';
  message: string;
  shouldRetry: boolean;
}

interface FormErrors {
  [field: string]: string | string[];
}

interface SubmissionError {
  code: 'validation_error' | 'network_error' | 'server_error' | 'auth_error';
  message: string;
  fieldErrors?: FormErrors;
}

// Type guards for exhaustive checking
export const isApiLoading = <T>(state: ApiState<T>): state is { status: 'loading'; message?: string } =>
  state.status === 'loading';

export const isApiSuccess = <T>(state: ApiState<T>): state is { status: 'success'; data: T; timestamp: number } =>
  state.status === 'success';

export const isApiError = <T>(state: ApiState<T>): state is { status: 'error'; error: { code: string; message: string; details?: unknown } } =>
  state.status === 'error';

export const isAuthenticated = (state: AuthState): state is { status: 'authenticated'; user: AuthenticatedUser; session: UserSession } =>
  state.status === 'authenticated';

export const isUploadInProgress = (state: UploadState): state is { status: 'uploading'; file: File; progress: number; bytesSent: number; totalBytes: number } =>
  state.status === 'uploading';

export const isSearchCompleted = (state: SearchState): state is { status: 'completed'; query: string; results: SearchResults; searchTime: number } =>
  state.status === 'completed';

export const isSyncOffline = (state: SyncState): state is { status: 'offline'; queuedActions: QueuedAction[]; lastOnline: number } =>
  state.status === 'offline';

export const isWebSocketConnected = (state: WebSocketState): state is { status: 'connected'; connectionId: string; connectedAt: number; latency?: number } =>
  state.status === 'connected';

export const isFormSubmitting = <T>(state: FormState<T>): state is { status: 'submitting'; values: T; submitAttempt: number } =>
  state.status === 'submitting';

export const isCacheFresh = <T>(state: CacheState<T>): state is { status: 'fresh'; data: T; cachedAt: number; expiresAt: number } =>
  state.status === 'fresh';

// Utility functions for state transitions
export const createLoadingState = (message?: string): { status: 'loading'; message?: string } => ({
  status: 'loading',
  message
});

export const createSuccessState = <T>(data: T): { status: 'success'; data: T; timestamp: number } => ({
  status: 'success',
  data,
  timestamp: Date.now()
});

export const createErrorState = (error: { code: string; message: string; details?: unknown }): { status: 'error'; error: { code: string; message: string; details?: unknown } } => ({
  status: 'error',
  error
});