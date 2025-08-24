/**
 * WatermelonDB Models
 * Enterprise-grade offline data models with sync capabilities
 */

import { Model, field, date, readonly, json, relation, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';

// Base Model with common fields
export class BaseOfflineModel extends Model {
  @field('sync_status') syncStatus!: string; // 'synced' | 'pending' | 'conflict' | 'error'
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('server_updated_at') serverUpdatedAt?: number;
}

// Offline Actions Queue Model
export class OfflineActionModel extends Model {
  static table = 'offline_actions';
  
  @field('action_id') actionId!: string;
  @field('action_type') actionType!: string;
  @field('data') data!: string; // JSON string
  @field('priority') priority!: string;
  @field('retry_count') retryCount!: number;
  @readonly @date('created_at') createdAt!: number;
  @field('last_retry_at') lastRetryAt?: number;
  @field('completed_at') completedAt?: number;
  @field('error_message') errorMessage?: string;
}

// Cached Data Model
export class CachedDataModel extends Model {
  static table = 'cached_data';
  
  @field('cache_key') cacheKey!: string;
  @field('data') data!: string; // JSON string
  @field('expires_at') expiresAt!: number;
  @readonly @date('created_at') createdAt!: number;
  @date('updated_at') updatedAt!: number;
  @field('access_count') accessCount!: number;
  @field('size_bytes') sizeBytes?: number;
}

// Sync Log Model
export class SyncLogModel extends Model {
  static table = 'sync_logs';
  
  @field('sync_id') syncId!: string;
  @field('sync_type') syncType!: string;
  @field('status') status!: string;
  @readonly @date('created_at') createdAt!: number;
  @field('completed_at') completedAt?: number;
  @field('duration_ms') durationMs?: number;
  @field('records_synced') recordsSynced?: number;
  @field('error_message') errorMessage?: string;
  @field('metadata') metadata?: string; // JSON string
}

// User Data Model
export class UserDataModel extends BaseOfflineModel {
  static table = 'user_data';
  
  @field('user_id') userId!: string;
  @field('email') email!: string;
  @field('full_name') fullName?: string;
  @field('avatar_url') avatarUrl?: string;
  @field('organization_id') organizationId?: string;
  @field('role') role?: string;
  @field('preferences') preferences?: string; // JSON string
  @field('last_active') lastActive?: number;
  @field('is_offline') isOffline!: boolean;

  // Relations
  @relation('organization_data', 'organization_id') organization?: any;
}

// Asset Data Model
export class AssetDataModel extends BaseOfflineModel {
  static table = 'asset_data';
  
  static associations: Associations = {
    vault_data: { type: 'belongs_to', key: 'vault_id' },
    organization_data: { type: 'belongs_to', key: 'organization_id' },
    annotation_data: { type: 'has_many', foreignKey: 'asset_id' },
    downloaded_files: { type: 'has_many', foreignKey: 'asset_id' },
  };
  
  @field('asset_id') assetId!: string;
  @field('vault_id') vaultId?: string;
  @field('organization_id') organizationId!: string;
  @field('file_name') fileName!: string;
  @field('original_file_name') originalFileName!: string;
  @field('file_size') fileSize!: number;
  @field('mime_type') mimeType!: string;
  @field('file_path') filePath?: string;
  @field('download_url') downloadUrl?: string;
  @field('thumbnail_url') thumbnailUrl?: string;
  @field('processing_status') processingStatus?: string;
  @field('tags') tags?: string; // JSON array
  @field('metadata') metadata?: string; // JSON string
  @field('is_downloaded') isDownloaded!: boolean;
  @field('is_favorite') isFavorite!: boolean;
  @field('view_count') viewCount!: number;
  @field('last_viewed') lastViewed?: number;

  // Relations
  @relation('vault_data', 'vault_id') vault?: any;
  @relation('organization_data', 'organization_id') organization?: any;
  @children('annotation_data') annotations?: any[];
  @children('downloaded_files') downloadedFiles?: any[];

  // Computed properties
  get isOfflineAvailable(): boolean {
    return this.isDownloaded && !!this.filePath;
  }

  get tagArray(): string[] {
    return this.tags ? JSON.parse(this.tags) : [];
  }

  get metadataObject(): Record<string, any> {
    return this.metadata ? JSON.parse(this.metadata) : {};
  }
}

// Meeting Data Model
export class MeetingDataModel extends BaseOfflineModel {
  static table = 'meeting_data';
  
  static associations: Associations = {
    organization_data: { type: 'belongs_to', key: 'organization_id' },
  };
  
  @field('meeting_id') meetingId!: string;
  @field('organization_id') organizationId!: string;
  @field('title') title!: string;
  @field('description') description?: string;
  @field('scheduled_date') scheduledDate!: number;
  @field('duration_minutes') durationMinutes?: number;
  @field('status') status!: string;
  @field('meeting_type') meetingType!: string;
  @field('location') location?: string;
  @field('virtual_link') virtualLink?: string;
  @field('agenda_items') agendaItems?: string; // JSON array
  @field('participants') participants?: string; // JSON array
  @field('voting_items') votingItems?: string; // JSON array
  @field('user_votes') userVotes?: string; // JSON object
  @field('minutes') minutes?: string;
  @field('attachments') attachments?: string; // JSON array
  @field('is_attending') isAttending!: boolean;
  @field('attendance_status') attendanceStatus?: string;
  @field('reminder_sent') reminderSent!: boolean;

  // Relations
  @relation('organization_data', 'organization_id') organization?: any;

  // Computed properties
  get agendaArray(): any[] {
    return this.agendaItems ? JSON.parse(this.agendaItems) : [];
  }

  get participantArray(): any[] {
    return this.participants ? JSON.parse(this.participants) : [];
  }

  get votingItemArray(): any[] {
    return this.votingItems ? JSON.parse(this.votingItems) : [];
  }

  get userVotesObject(): Record<string, any> {
    return this.userVotes ? JSON.parse(this.userVotes) : {};
  }

  get attachmentArray(): any[] {
    return this.attachments ? JSON.parse(this.attachments) : [];
  }

  get isUpcoming(): boolean {
    return this.scheduledDate > Date.now() && this.status === 'scheduled';
  }

  get isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  get hasVotingItems(): boolean {
    return this.votingItemArray.length > 0;
  }
}

// Notification Data Model
export class NotificationDataModel extends BaseOfflineModel {
  static table = 'notification_data';
  
  static associations: Associations = {
    user_data: { type: 'belongs_to', key: 'user_id' },
    organization_data: { type: 'belongs_to', key: 'organization_id' },
  };
  
  @field('notification_id') notificationId!: string;
  @field('user_id') userId!: string;
  @field('organization_id') organizationId?: string;
  @field('title') title!: string;
  @field('message') message!: string;
  @field('type') type!: string;
  @field('category') category!: string;
  @field('priority') priority!: string;
  @field('is_read') isRead!: boolean;
  @field('is_archived') isArchived!: boolean;
  @field('action_url') actionUrl?: string;
  @field('action_data') actionData?: string; // JSON string
  @field('expires_at') expiresAt?: number;
  @field('read_at') readAt?: number;
  @field('dismissed_at') dismissedAt?: number;
  @field('push_sent') pushSent!: boolean;
  @field('email_sent') emailSent!: boolean;

  // Relations
  @relation('user_data', 'user_id') user?: any;
  @relation('organization_data', 'organization_id') organization?: any;

  // Computed properties
  get actionDataObject(): Record<string, any> {
    return this.actionData ? JSON.parse(this.actionData) : {};
  }

  get isExpired(): boolean {
    return this.expiresAt ? this.expiresAt <= Date.now() : false;
  }

  get isUnread(): boolean {
    return !this.isRead && !this.isArchived && !this.isExpired;
  }

  get isUrgent(): boolean {
    return this.priority === 'critical' || this.priority === 'high';
  }
}

// Organization Data Model
export class OrganizationDataModel extends BaseOfflineModel {
  static table = 'organization_data';
  
  static associations: Associations = {
    user_data: { type: 'has_many', foreignKey: 'organization_id' },
    asset_data: { type: 'has_many', foreignKey: 'organization_id' },
    meeting_data: { type: 'has_many', foreignKey: 'organization_id' },
    vault_data: { type: 'has_many', foreignKey: 'organization_id' },
    notification_data: { type: 'has_many', foreignKey: 'organization_id' },
  };
  
  @field('organization_id') organizationId!: string;
  @field('name') name!: string;
  @field('slug') slug!: string;
  @field('description') description?: string;
  @field('logo_url') logoUrl?: string;
  @field('settings') settings?: string; // JSON string
  @field('member_role') memberRole!: string;
  @field('member_permissions') memberPermissions?: string; // JSON array
  @field('is_active') isActive!: boolean;
  @field('is_primary') isPrimary!: boolean;
  @field('last_accessed') lastAccessed?: number;

  // Relations
  @children('user_data') users?: any[];
  @children('asset_data') assets?: any[];
  @children('meeting_data') meetings?: any[];
  @children('vault_data') vaults?: any[];
  @children('notification_data') notifications?: any[];

  // Computed properties
  get settingsObject(): Record<string, any> {
    return this.settings ? JSON.parse(this.settings) : {};
  }

  get permissionArray(): string[] {
    return this.memberPermissions ? JSON.parse(this.memberPermissions) : [];
  }

  get hasAdminAccess(): boolean {
    return this.memberRole === 'admin' || this.memberRole === 'owner';
  }
}

// Vault Data Model
export class VaultDataModel extends BaseOfflineModel {
  static table = 'vault_data';
  
  static associations: Associations = {
    organization_data: { type: 'belongs_to', key: 'organization_id' },
    asset_data: { type: 'has_many', foreignKey: 'vault_id' },
  };
  
  @field('vault_id') vaultId!: string;
  @field('organization_id') organizationId!: string;
  @field('name') name!: string;
  @field('description') description?: string;
  @field('vault_type') vaultType!: string;
  @field('permissions') permissions!: string; // JSON object
  @field('asset_count') assetCount!: number;
  @field('total_size_bytes') totalSizeBytes!: number;
  @field('is_accessible') isAccessible!: boolean;
  @field('access_level') accessLevel!: string;
  @field('last_accessed') lastAccessed?: number;

  // Relations
  @relation('organization_data', 'organization_id') organization?: any;
  @children('asset_data') assets?: any[];

  // Computed properties
  get permissionsObject(): Record<string, any> {
    return JSON.parse(this.permissions);
  }

  get canWrite(): boolean {
    return this.accessLevel === 'write' || this.accessLevel === 'admin';
  }

  get canAdmin(): boolean {
    return this.accessLevel === 'admin';
  }

  get totalSizeMB(): number {
    return this.totalSizeBytes / (1024 * 1024);
  }
}

// Annotation Data Model
export class AnnotationDataModel extends BaseOfflineModel {
  static table = 'annotation_data';
  
  static associations: Associations = {
    asset_data: { type: 'belongs_to', key: 'asset_id' },
    user_data: { type: 'belongs_to', key: 'user_id' },
  };
  
  @field('annotation_id') annotationId!: string;
  @field('asset_id') assetId!: string;
  @field('user_id') userId!: string;
  @field('page_number') pageNumber!: number;
  @field('annotation_type') annotationType!: string;
  @field('content') content?: string;
  @field('position_data') positionData!: string; // JSON with coordinates
  @field('style_data') styleData?: string; // JSON with styling
  @field('voice_file_path') voiceFilePath?: string;
  @field('voice_duration') voiceDuration?: number;
  @field('is_private') isPrivate!: boolean;
  @field('parent_annotation_id') parentAnnotationId?: string;
  @field('reply_count') replyCount!: number;

  // Relations
  @relation('asset_data', 'asset_id') asset?: any;
  @relation('user_data', 'user_id') user?: any;

  // Computed properties
  get positionObject(): Record<string, any> {
    return JSON.parse(this.positionData);
  }

  get styleObject(): Record<string, any> {
    return this.styleData ? JSON.parse(this.styleData) : {};
  }

  get hasVoiceNote(): boolean {
    return this.annotationType === 'voice' && !!this.voiceFilePath;
  }

  get isReply(): boolean {
    return !!this.parentAnnotationId;
  }
}

// Downloaded Files Model
export class DownloadedFileModel extends Model {
  static table = 'downloaded_files';
  
  static associations: Associations = {
    asset_data: { type: 'belongs_to', key: 'asset_id' },
  };
  
  @field('file_id') fileId!: string;
  @field('asset_id') assetId!: string;
  @field('local_path') localPath!: string;
  @field('original_url') originalUrl!: string;
  @field('file_size') fileSize!: number;
  @field('mime_type') mimeType!: string;
  @field('checksum') checksum!: string;
  @field('download_progress') downloadProgress!: number;
  @field('is_complete') isComplete!: boolean;
  @field('last_accessed') lastAccessed?: number;
  @field('expires_at') expiresAt?: number;
  @field('download_count') downloadCount!: number;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  // Relations
  @relation('asset_data', 'asset_id') asset?: any;

  // Computed properties
  get isExpired(): boolean {
    return this.expiresAt ? this.expiresAt <= Date.now() : false;
  }

  get fileSizeMB(): number {
    return this.fileSize / (1024 * 1024);
  }
}

// Analytics Events Model
export class AnalyticsEventModel extends Model {
  static table = 'analytics_events';
  
  @field('event_id') eventId!: string;
  @field('event_type') eventType!: string;
  @field('event_category') eventCategory!: string;
  @field('event_data') eventData?: string; // JSON string
  @field('user_id') userId?: string;
  @field('organization_id') organizationId?: string;
  @field('session_id') sessionId?: string;
  @field('screen_name') screenName?: string;
  @field('duration_ms') durationMs?: number;
  @field('error_message') errorMessage?: string;
  @field('device_info') deviceInfo?: string; // JSON string
  @field('network_info') networkInfo?: string; // JSON string
  @field('synced_to_server') syncedToServer!: boolean;
  @readonly @date('created_at') createdAt!: number;

  // Computed properties
  get eventDataObject(): Record<string, any> {
    return this.eventData ? JSON.parse(this.eventData) : {};
  }

  get deviceInfoObject(): Record<string, any> {
    return this.deviceInfo ? JSON.parse(this.deviceInfo) : {};
  }

  get networkInfoObject(): Record<string, any> {
    return this.networkInfo ? JSON.parse(this.networkInfo) : {};
  }
}

// Export all models
export {
  OfflineActionModel,
  CachedDataModel,
  SyncLogModel,
  UserDataModel,
  AssetDataModel,
  MeetingDataModel,
  NotificationDataModel,
  OrganizationDataModel,
  VaultDataModel,
  AnnotationDataModel,
  DownloadedFileModel,
  AnalyticsEventModel,
};