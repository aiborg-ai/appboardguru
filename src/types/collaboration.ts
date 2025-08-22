/**
 * Real-time collaboration types for upload system
 * Supporting live collaboration, presence, and notifications
 */

import { UserId, OrganizationId, VaultId } from './branded'
import { FileUploadItem, UploadedAsset } from './upload'

export type CollaborationEventType = 
  | 'upload:started'
  | 'upload:progress'
  | 'upload:completed'
  | 'upload:failed'
  | 'upload:cancelled'
  | 'upload:shared'
  | 'upload:commented'
  | 'presence:join'
  | 'presence:leave'
  | 'presence:active'

export interface BaseCollaborationEvent {
  id: string
  type: CollaborationEventType
  timestamp: string
  organizationId: OrganizationId
  vaultId?: VaultId
  userId: UserId
  user: {
    id: UserId
    name: string
    email: string
    avatar?: string
  }
}

export interface UploadStartedEvent extends BaseCollaborationEvent {
  type: 'upload:started'
  data: {
    fileId: string
    fileName: string
    fileSize: number
    category: string
    estimatedDuration?: number
  }
}

export interface UploadProgressEvent extends BaseCollaborationEvent {
  type: 'upload:progress'
  data: {
    fileId: string
    fileName: string
    progress: number
    bytesUploaded: number
    totalBytes: number
    speed?: number // bytes per second
  }
}

export interface UploadCompletedEvent extends BaseCollaborationEvent {
  type: 'upload:completed'
  data: {
    fileId: string
    asset: UploadedAsset
    duration: number
    autoShared?: boolean
  }
}

export interface UploadFailedEvent extends BaseCollaborationEvent {
  type: 'upload:failed'
  data: {
    fileId: string
    fileName: string
    error: string
    retryCount: number
  }
}

export interface UploadSharedEvent extends BaseCollaborationEvent {
  type: 'upload:shared'
  data: {
    assetId: string
    assetTitle: string
    sharedWith: Array<{
      userId: UserId
      userName: string
      permission: 'view' | 'download' | 'edit'
    }>
    message?: string
  }
}

export interface UploadCommentEvent extends BaseCollaborationEvent {
  type: 'upload:commented'
  data: {
    assetId: string
    assetTitle: string
    comment: string
    mentionedUsers?: UserId[]
  }
}

export interface PresenceEvent extends BaseCollaborationEvent {
  type: 'presence:join' | 'presence:leave' | 'presence:active'
  data: {
    activeUploads?: string[]
    currentPage?: string
    isUploading?: boolean
  }
}

export type CollaborationEvent = 
  | UploadStartedEvent
  | UploadProgressEvent  
  | UploadCompletedEvent
  | UploadFailedEvent
  | UploadSharedEvent
  | UploadCommentEvent
  | PresenceEvent

export interface UserPresence {
  userId: UserId
  user: {
    id: UserId
    name: string
    email: string
    avatar?: string
  }
  status: 'online' | 'uploading' | 'idle' | 'away'
  lastSeen: string
  currentPage?: string
  activeUploads: Array<{
    fileId: string
    fileName: string
    progress: number
    startTime: string
  }>
  organizationId: OrganizationId
  vaultId?: VaultId
}

export interface CollaborationState {
  // Current users online in this context
  presence: UserPresence[]
  
  // Active uploads across all team members
  teamUploads: Array<{
    fileId: string
    fileName: string
    userId: UserId
    userName: string
    progress: number
    status: 'uploading' | 'processing' | 'completed' | 'failed'
    startTime: string
    estimatedCompletion?: string
  }>
  
  // Recent upload activity
  recentActivity: CollaborationEvent[]
  
  // Upload notifications
  notifications: Array<{
    id: string
    type: 'success' | 'info' | 'warning' | 'error'
    message: string
    timestamp: string
    userId?: UserId
    assetId?: string
    read: boolean
    actions?: Array<{
      label: string
      action: string
      data?: any
    }>
  }>
}

export interface UploadCollaborationConfig {
  organizationId: OrganizationId
  vaultId?: VaultId
  enablePresence: boolean
  enableRealTimeProgress: boolean
  enableNotifications: boolean
  enableActivityFeed: boolean
  enableAutoSharing: boolean
  notificationSettings: {
    uploadStarted: boolean
    uploadCompleted: boolean
    uploadFailed: boolean
    uploadShared: boolean
    mentions: boolean
  }
}

export interface SmartSharingRule {
  id: string
  name: string
  condition: {
    category?: string[]
    fileType?: string[]
    keywords?: string[]
    uploader?: UserId[]
    size?: { min?: number; max?: number }
  }
  action: {
    shareWith: UserId[]
    permission: 'view' | 'download' | 'edit'
    notify: boolean
    message?: string
  }
  enabled: boolean
}

export interface CollaborativeUploadMetrics {
  teamUploadCount: number
  totalBytesUploaded: number
  averageUploadTime: number
  mostActiveUploader: {
    userId: UserId
    userName: string
    uploadCount: number
  }
  popularCategories: Array<{
    category: string
    count: number
  }>
  peakUploadHours: Array<{
    hour: number
    uploadCount: number
  }>
  collaborationScore: number // 0-100 based on sharing, comments, etc.
}

// Real-time upload queue for team visibility
export interface TeamUploadQueue {
  organizationId: OrganizationId
  vaultId?: VaultId
  uploads: Array<{
    id: string
    userId: UserId
    userName: string
    files: FileUploadItem[]
    status: 'queued' | 'uploading' | 'processing' | 'completed'
    priority: 'low' | 'normal' | 'high' | 'urgent'
    estimatedCompletion?: string
    dependencies?: string[] // Other upload IDs this depends on
  }>
  queueStats: {
    totalFiles: number
    totalSize: number
    estimatedCompletionTime: string
    averageWaitTime: number
  }
}

export interface UploadMention {
  userId: UserId
  userName: string
  type: 'share_request' | 'review_request' | 'approval_needed' | 'fyi'
  message: string
  assetId?: string
  urgent: boolean
}

export interface CollaborativeUploadSettings {
  autoShareByCategory: Record<string, UserId[]>
  mentionNotifications: boolean
  progressNotifications: boolean
  completionNotifications: boolean
  failureNotifications: boolean
  smartSharingRules: SmartSharingRule[]
  queuePriority: 'fifo' | 'smart' | 'manual'
}