/**
 * WatermelonDB Database Schema
 * Defines the structure for offline storage with encryption support
 */

import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Offline Actions Queue
    tableSchema({
      name: 'offline_actions',
      columns: [
        { name: 'action_id', type: 'string', isIndexed: true },
        { name: 'action_type', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' }, // JSON string
        { name: 'priority', type: 'string', isIndexed: true },
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'last_retry_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'error_message', type: 'string', isOptional: true },
      ]
    }),

    // Cached API Responses
    tableSchema({
      name: 'cached_data',
      columns: [
        { name: 'cache_key', type: 'string', isIndexed: true },
        { name: 'data', type: 'string' }, // JSON string
        { name: 'expires_at', type: 'number', isIndexed: true },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'access_count', type: 'number' },
        { name: 'size_bytes', type: 'number', isOptional: true },
      ]
    }),

    // Sync Logs for debugging and analytics
    tableSchema({
      name: 'sync_logs',
      columns: [
        { name: 'sync_id', type: 'string', isIndexed: true },
        { name: 'sync_type', type: 'string', isIndexed: true }, // 'full', 'incremental', 'action'
        { name: 'status', type: 'string', isIndexed: true }, // 'started', 'completed', 'failed'
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'duration_ms', type: 'number', isOptional: true },
        { name: 'records_synced', type: 'number', isOptional: true },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'metadata', type: 'string', isOptional: true }, // JSON string
      ]
    }),

    // User Data (profile, preferences)
    tableSchema({
      name: 'user_data',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'email', type: 'string', isIndexed: true },
        { name: 'full_name', type: 'string', isOptional: true },
        { name: 'avatar_url', type: 'string', isOptional: true },
        { name: 'organization_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'role', type: 'string', isOptional: true },
        { name: 'preferences', type: 'string', isOptional: true }, // JSON string
        { name: 'last_active', type: 'number', isOptional: true },
        { name: 'is_offline', type: 'boolean' },
        { name: 'sync_status', type: 'string' }, // 'synced', 'pending', 'conflict'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Asset Data (documents, files)
    tableSchema({
      name: 'asset_data',
      columns: [
        { name: 'asset_id', type: 'string', isIndexed: true },
        { name: 'vault_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'organization_id', type: 'string', isIndexed: true },
        { name: 'file_name', type: 'string' },
        { name: 'original_file_name', type: 'string' },
        { name: 'file_size', type: 'number' },
        { name: 'mime_type', type: 'string' },
        { name: 'file_path', type: 'string', isOptional: true }, // Local file path if downloaded
        { name: 'download_url', type: 'string', isOptional: true },
        { name: 'thumbnail_url', type: 'string', isOptional: true },
        { name: 'processing_status', type: 'string', isOptional: true },
        { name: 'tags', type: 'string', isOptional: true }, // JSON array
        { name: 'metadata', type: 'string', isOptional: true }, // JSON string
        { name: 'is_downloaded', type: 'boolean' },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'view_count', type: 'number' },
        { name: 'last_viewed', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Meeting Data
    tableSchema({
      name: 'meeting_data',
      columns: [
        { name: 'meeting_id', type: 'string', isIndexed: true },
        { name: 'organization_id', type: 'string', isIndexed: true },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'scheduled_date', type: 'number', isIndexed: true },
        { name: 'duration_minutes', type: 'number', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true }, // 'scheduled', 'in_progress', 'completed', 'cancelled'
        { name: 'meeting_type', type: 'string' }, // 'board', 'committee', 'general'
        { name: 'location', type: 'string', isOptional: true },
        { name: 'virtual_link', type: 'string', isOptional: true },
        { name: 'agenda_items', type: 'string', isOptional: true }, // JSON array
        { name: 'participants', type: 'string', isOptional: true }, // JSON array
        { name: 'voting_items', type: 'string', isOptional: true }, // JSON array
        { name: 'user_votes', type: 'string', isOptional: true }, // JSON object
        { name: 'minutes', type: 'string', isOptional: true },
        { name: 'attachments', type: 'string', isOptional: true }, // JSON array
        { name: 'is_attending', type: 'boolean' },
        { name: 'attendance_status', type: 'string', isOptional: true },
        { name: 'reminder_sent', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Notification Data
    tableSchema({
      name: 'notification_data',
      columns: [
        { name: 'notification_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'organization_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'title', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'type', type: 'string', isIndexed: true }, // 'info', 'warning', 'urgent', 'meeting', 'document', 'voting'
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string', isIndexed: true }, // 'low', 'normal', 'high', 'critical'
        { name: 'is_read', type: 'boolean', isIndexed: true },
        { name: 'is_archived', type: 'boolean' },
        { name: 'action_url', type: 'string', isOptional: true },
        { name: 'action_data', type: 'string', isOptional: true }, // JSON string
        { name: 'expires_at', type: 'number', isOptional: true, isIndexed: true },
        { name: 'read_at', type: 'number', isOptional: true },
        { name: 'dismissed_at', type: 'number', isOptional: true },
        { name: 'push_sent', type: 'boolean' },
        { name: 'email_sent', type: 'boolean' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Organization Data (cached)
    tableSchema({
      name: 'organization_data',
      columns: [
        { name: 'organization_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'slug', type: 'string', isIndexed: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'logo_url', type: 'string', isOptional: true },
        { name: 'settings', type: 'string', isOptional: true }, // JSON string
        { name: 'member_role', type: 'string' }, // User's role in this org
        { name: 'member_permissions', type: 'string', isOptional: true }, // JSON array
        { name: 'is_active', type: 'boolean' },
        { name: 'is_primary', type: 'boolean' },
        { name: 'last_accessed', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Vault Data
    tableSchema({
      name: 'vault_data',
      columns: [
        { name: 'vault_id', type: 'string', isIndexed: true },
        { name: 'organization_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'vault_type', type: 'string' }, // 'private', 'shared', 'board', 'committee'
        { name: 'permissions', type: 'string' }, // JSON object
        { name: 'asset_count', type: 'number' },
        { name: 'total_size_bytes', type: 'number' },
        { name: 'is_accessible', type: 'boolean' },
        { name: 'access_level', type: 'string' }, // 'read', 'write', 'admin'
        { name: 'last_accessed', type: 'number', isOptional: true },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Document Annotations (for offline PDF annotation)
    tableSchema({
      name: 'annotation_data',
      columns: [
        { name: 'annotation_id', type: 'string', isIndexed: true },
        { name: 'asset_id', type: 'string', isIndexed: true },
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'page_number', type: 'number', isIndexed: true },
        { name: 'annotation_type', type: 'string' }, // 'highlight', 'note', 'comment', 'voice'
        { name: 'content', type: 'string', isOptional: true },
        { name: 'position_data', type: 'string' }, // JSON with coordinates
        { name: 'style_data', type: 'string', isOptional: true }, // JSON with styling
        { name: 'voice_file_path', type: 'string', isOptional: true },
        { name: 'voice_duration', type: 'number', isOptional: true },
        { name: 'is_private', type: 'boolean' },
        { name: 'parent_annotation_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'reply_count', type: 'number' },
        { name: 'sync_status', type: 'string' },
        { name: 'created_at', type: 'number', isIndexed: true },
        { name: 'updated_at', type: 'number' },
        { name: 'server_updated_at', type: 'number', isOptional: true },
      ]
    }),

    // Downloaded Files (for offline access)
    tableSchema({
      name: 'downloaded_files',
      columns: [
        { name: 'file_id', type: 'string', isIndexed: true },
        { name: 'asset_id', type: 'string', isIndexed: true },
        { name: 'local_path', type: 'string' },
        { name: 'original_url', type: 'string' },
        { name: 'file_size', type: 'number' },
        { name: 'mime_type', type: 'string' },
        { name: 'checksum', type: 'string' }, // For integrity verification
        { name: 'download_progress', type: 'number' }, // 0-100
        { name: 'is_complete', type: 'boolean' },
        { name: 'last_accessed', type: 'number', isOptional: true },
        { name: 'expires_at', type: 'number', isOptional: true },
        { name: 'download_count', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),

    // Analytics Data (for performance monitoring)
    tableSchema({
      name: 'analytics_events',
      columns: [
        { name: 'event_id', type: 'string', isIndexed: true },
        { name: 'event_type', type: 'string', isIndexed: true },
        { name: 'event_category', type: 'string', isIndexed: true },
        { name: 'event_data', type: 'string', isOptional: true }, // JSON string
        { name: 'user_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'organization_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'session_id', type: 'string', isIndexed: true, isOptional: true },
        { name: 'screen_name', type: 'string', isOptional: true },
        { name: 'duration_ms', type: 'number', isOptional: true },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'device_info', type: 'string', isOptional: true }, // JSON string
        { name: 'network_info', type: 'string', isOptional: true }, // JSON string
        { name: 'synced_to_server', type: 'boolean' },
        { name: 'created_at', type: 'number', isIndexed: true },
      ]
    }),
  ]
});

export default schema;