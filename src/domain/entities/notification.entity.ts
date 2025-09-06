/**
 * Notification Domain Entity
 * Core business entity for managing notifications across different channels
 */

import { AggregateRoot } from '../core';
import { Result } from '../../01-shared/types/core.types';
import { ResultUtils } from '../../01-shared/lib/result';
import type { NotificationId, UserId, OrganizationId } from '../../types/core';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
export type NotificationCategory = 'system' | 'meeting' | 'document' | 'task' | 'approval' | 'reminder' | 'alert' | 'announcement';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed' | 'opened' | 'clicked';

export interface NotificationRecipient {
  userId: UserId;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
  preferredChannel?: NotificationChannel;
  deliveryStatus: DeliveryStatus;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  failureReason?: string;
  retryCount: number;
}

export interface NotificationContent {
  subject: string;
  body: string;
  htmlBody?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: string; // Base64 or URL
  }>;
  actions?: Array<{
    label: string;
    url: string;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  imageUrl?: string;
  iconUrl?: string;
}

export interface NotificationSchedule {
  scheduledFor: Date;
  timezone?: string;
  recurring?: {
    pattern: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
    occurrences?: number;
  };
  batchSize?: number; // For large recipient lists
  batchDelay?: number; // Delay between batches in milliseconds
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
    timezone: string;
  };
  categories: {
    [key in NotificationCategory]?: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority?: NotificationPriority;
    };
  };
  frequency?: 'immediate' | 'digest_hourly' | 'digest_daily' | 'digest_weekly';
  language?: string;
}

export interface NotificationTracking {
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  failedCount: number;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  clickThroughRate?: number;
  deliveryRate?: number;
}

export interface NotificationMetadata {
  source?: string; // System or feature that triggered the notification
  sourceId?: string; // ID of the source entity
  groupId?: string; // For grouping related notifications
  tags?: string[];
  expiresAt?: Date;
  importance?: number; // 1-10 scale
  customData?: Record<string, any>;
}

export interface NotificationProps {
  id: NotificationId;
  title: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  content: NotificationContent;
  schedule?: NotificationSchedule;
  tracking: NotificationTracking;
  metadata?: NotificationMetadata;
  organizationId?: OrganizationId;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  retryCount: number;
  maxRetries: number;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
  errors?: Array<{
    timestamp: Date;
    message: string;
    channel?: NotificationChannel;
    recipientId?: UserId;
  }>;
}

/**
 * Notification Domain Entity
 */
export class Notification extends AggregateRoot {
  private _id: NotificationId;
  private _title: string;
  private _category: NotificationCategory;
  private _priority: NotificationPriority;
  private _status: NotificationStatus;
  private _channels: NotificationChannel[];
  private _recipients: NotificationRecipient[];
  private _content: NotificationContent;
  private _schedule?: NotificationSchedule;
  private _tracking: NotificationTracking;
  private _metadata?: NotificationMetadata;
  private _organizationId?: OrganizationId;
  private _createdBy: UserId;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _sentAt?: Date;
  private _completedAt?: Date;
  private _cancelledAt?: Date;
  private _cancelReason?: string;
  private _retryCount: number;
  private _maxRetries: number;
  private _lastRetryAt?: Date;
  private _nextRetryAt?: Date;
  private _errors?: Array<{
    timestamp: Date;
    message: string;
    channel?: NotificationChannel;
    recipientId?: UserId;
  }>;

  private constructor(props: NotificationProps) {
    super();
    this._id = props.id;
    this._title = props.title;
    this._category = props.category;
    this._priority = props.priority;
    this._status = props.status;
    this._channels = props.channels;
    this._recipients = props.recipients;
    this._content = props.content;
    this._schedule = props.schedule;
    this._tracking = props.tracking;
    this._metadata = props.metadata;
    this._organizationId = props.organizationId;
    this._createdBy = props.createdBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._sentAt = props.sentAt;
    this._completedAt = props.completedAt;
    this._cancelledAt = props.cancelledAt;
    this._cancelReason = props.cancelReason;
    this._retryCount = props.retryCount;
    this._maxRetries = props.maxRetries;
    this._lastRetryAt = props.lastRetryAt;
    this._nextRetryAt = props.nextRetryAt;
    this._errors = props.errors;
  }

  // Getters
  get id(): NotificationId { return this._id; }
  get title(): string { return this._title; }
  get category(): NotificationCategory { return this._category; }
  get priority(): NotificationPriority { return this._priority; }
  get status(): NotificationStatus { return this._status; }
  get channels(): NotificationChannel[] { return this._channels; }
  get recipients(): NotificationRecipient[] { return this._recipients; }
  get content(): NotificationContent { return this._content; }
  get isScheduled(): boolean { return !!this._schedule; }
  get isPending(): boolean { return this._status === 'pending'; }
  get isSent(): boolean { return this._status === 'sent' || this._status === 'delivered'; }
  get hasFailed(): boolean { return this._status === 'failed'; }
  get canRetry(): boolean { return this._retryCount < this._maxRetries && this._status === 'failed'; }

  /**
   * Factory method to create a new notification
   */
  static create(params: {
    id: NotificationId;
    title: string;
    category: NotificationCategory;
    priority?: NotificationPriority;
    channels: NotificationChannel[];
    recipients: Array<{
      userId: UserId;
      email?: string;
      phone?: string;
      deviceTokens?: string[];
      preferredChannel?: NotificationChannel;
    }>;
    content: NotificationContent;
    schedule?: NotificationSchedule;
    metadata?: NotificationMetadata;
    organizationId?: OrganizationId;
    createdBy: UserId;
    maxRetries?: number;
  }): Result<Notification> {
    // Validate required fields
    if (!params.title || params.title.trim().length === 0) {
      return ResultUtils.fail(new Error('Notification title is required'));
    }

    if (!params.content.subject || params.content.subject.trim().length === 0) {
      return ResultUtils.fail(new Error('Notification subject is required'));
    }

    if (!params.content.body || params.content.body.trim().length === 0) {
      return ResultUtils.fail(new Error('Notification body is required'));
    }

    if (!params.channels || params.channels.length === 0) {
      return ResultUtils.fail(new Error('At least one notification channel is required'));
    }

    if (!params.recipients || params.recipients.length === 0) {
      return ResultUtils.fail(new Error('At least one recipient is required'));
    }

    // Validate channel-specific requirements
    for (const recipient of params.recipients) {
      if (params.channels.includes('email') && !recipient.email) {
        return ResultUtils.fail(new Error(`Email address required for recipient ${recipient.userId}`));
      }
      if (params.channels.includes('sms') && !recipient.phone) {
        return ResultUtils.fail(new Error(`Phone number required for recipient ${recipient.userId}`));
      }
      if (params.channels.includes('push') && (!recipient.deviceTokens || recipient.deviceTokens.length === 0)) {
        return ResultUtils.fail(new Error(`Device tokens required for recipient ${recipient.userId}`));
      }
    }

    // Validate schedule if provided
    if (params.schedule) {
      if (params.schedule.scheduledFor < new Date()) {
        return ResultUtils.fail(new Error('Scheduled time must be in the future'));
      }
    }

    // Create recipient objects
    const recipients: NotificationRecipient[] = params.recipients.map(r => ({
      ...r,
      deliveryStatus: 'pending' as DeliveryStatus,
      retryCount: 0
    }));

    // Initialize tracking
    const tracking: NotificationTracking = {
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      failedCount: 0
    };

    const notification = new Notification({
      id: params.id,
      title: params.title,
      category: params.category,
      priority: params.priority || 'normal',
      status: params.schedule ? 'pending' : 'pending',
      channels: params.channels,
      recipients,
      content: params.content,
      schedule: params.schedule,
      tracking,
      metadata: params.metadata,
      organizationId: params.organizationId,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: params.maxRetries || 3,
      errors: []
    });

    // Add domain event
    notification.addDomainEvent('NotificationCreated', {
      notificationId: notification.id,
      title: notification.title,
      category: notification.category,
      recipientCount: notification._recipients.length,
      channels: notification.channels
    });

    return ResultUtils.ok(notification);
  }

  /**
   * Send the notification
   */
  send(): Result<void> {
    if (this._status !== 'pending') {
      return ResultUtils.fail(new Error('Only pending notifications can be sent'));
    }

    if (this._schedule && this._schedule.scheduledFor > new Date()) {
      return ResultUtils.fail(new Error('Cannot send scheduled notification before its scheduled time'));
    }

    this._status = 'sending';
    this._sentAt = new Date();
    this._updatedAt = new Date();

    this.addDomainEvent('NotificationSending', {
      notificationId: this.id,
      channels: this.channels,
      recipientCount: this._recipients.length
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Mark notification as delivered for a recipient
   */
  markDelivered(recipientId: UserId, channel?: NotificationChannel): Result<void> {
    const recipient = this._recipients.find(r => r.userId === recipientId);
    
    if (!recipient) {
      return ResultUtils.fail(new Error('Recipient not found'));
    }

    recipient.deliveryStatus = 'delivered';
    recipient.deliveredAt = new Date();
    
    this._tracking.deliveredCount++;
    this._tracking.deliveryRate = (this._tracking.deliveredCount / this._recipients.length) * 100;
    
    // Check if all recipients have been processed
    const allProcessed = this._recipients.every(r => 
      ['delivered', 'bounced', 'failed'].includes(r.deliveryStatus)
    );

    if (allProcessed) {
      this._status = 'delivered';
      this._completedAt = new Date();
      
      this.addDomainEvent('NotificationDelivered', {
        notificationId: this.id,
        deliveryRate: this._tracking.deliveryRate
      });
    }

    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Mark notification as opened by a recipient
   */
  markOpened(recipientId: UserId): Result<void> {
    const recipient = this._recipients.find(r => r.userId === recipientId);
    
    if (!recipient) {
      return ResultUtils.fail(new Error('Recipient not found'));
    }

    if (recipient.deliveryStatus !== 'delivered' && recipient.deliveryStatus !== 'opened') {
      return ResultUtils.fail(new Error('Notification must be delivered before it can be opened'));
    }

    if (recipient.deliveryStatus !== 'opened') {
      recipient.deliveryStatus = 'opened';
      recipient.openedAt = new Date();
      
      this._tracking.openedCount++;
      
      if (!this._tracking.firstOpenedAt) {
        this._tracking.firstOpenedAt = new Date();
      }
      this._tracking.lastOpenedAt = new Date();
    }

    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Mark notification as clicked by a recipient
   */
  markClicked(recipientId: UserId, actionUrl?: string): Result<void> {
    const recipient = this._recipients.find(r => r.userId === recipientId);
    
    if (!recipient) {
      return ResultUtils.fail(new Error('Recipient not found'));
    }

    if (!['delivered', 'opened', 'clicked'].includes(recipient.deliveryStatus)) {
      return ResultUtils.fail(new Error('Invalid delivery status for click tracking'));
    }

    if (recipient.deliveryStatus !== 'clicked') {
      recipient.deliveryStatus = 'clicked';
      recipient.clickedAt = new Date();
      
      this._tracking.clickedCount++;
      this._tracking.clickThroughRate = (this._tracking.clickedCount / this._tracking.deliveredCount) * 100;
    }

    this._updatedAt = new Date();

    this.addDomainEvent('NotificationClicked', {
      notificationId: this.id,
      recipientId,
      actionUrl
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Mark notification as failed for a recipient
   */
  markFailed(recipientId: UserId, reason: string, channel?: NotificationChannel): Result<void> {
    const recipient = this._recipients.find(r => r.userId === recipientId);
    
    if (!recipient) {
      return ResultUtils.fail(new Error('Recipient not found'));
    }

    recipient.deliveryStatus = 'failed';
    recipient.failureReason = reason;
    recipient.retryCount++;
    
    this._tracking.failedCount++;
    
    // Add error to the list
    if (!this._errors) {
      this._errors = [];
    }
    
    this._errors.push({
      timestamp: new Date(),
      message: reason,
      channel,
      recipientId
    });

    // Check if all recipients have failed
    const allFailed = this._recipients.every(r => r.deliveryStatus === 'failed');
    if (allFailed) {
      this._status = 'failed';
      this._completedAt = new Date();
    }

    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Retry failed notification
   */
  retry(): Result<void> {
    if (!this.canRetry) {
      return ResultUtils.fail(new Error('Cannot retry: max retries exceeded or notification not failed'));
    }

    this._status = 'pending';
    this._retryCount++;
    this._lastRetryAt = new Date();
    
    // Calculate next retry time with exponential backoff
    const backoffMinutes = Math.pow(2, this._retryCount) * 5;
    this._nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
    
    // Reset failed recipients
    this._recipients.forEach(r => {
      if (r.deliveryStatus === 'failed') {
        r.deliveryStatus = 'pending';
        r.failureReason = undefined;
      }
    });

    this._updatedAt = new Date();

    this.addDomainEvent('NotificationRetrying', {
      notificationId: this.id,
      retryCount: this._retryCount,
      nextRetryAt: this._nextRetryAt
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Cancel notification
   */
  cancel(reason: string): Result<void> {
    if (this._status === 'cancelled') {
      return ResultUtils.fail(new Error('Notification is already cancelled'));
    }

    if (this._status === 'delivered' || this._status === 'sent') {
      return ResultUtils.fail(new Error('Cannot cancel sent or delivered notification'));
    }

    this._status = 'cancelled';
    this._cancelledAt = new Date();
    this._cancelReason = reason;
    this._updatedAt = new Date();

    this.addDomainEvent('NotificationCancelled', {
      notificationId: this.id,
      reason
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Add recipient to notification
   */
  addRecipient(recipient: {
    userId: UserId;
    email?: string;
    phone?: string;
    deviceTokens?: string[];
    preferredChannel?: NotificationChannel;
  }): Result<void> {
    if (this._status !== 'pending') {
      return ResultUtils.fail(new Error('Can only add recipients to pending notifications'));
    }

    if (this._recipients.some(r => r.userId === recipient.userId)) {
      return ResultUtils.fail(new Error('Recipient already exists'));
    }

    // Validate channel requirements
    if (this._channels.includes('email') && !recipient.email) {
      return ResultUtils.fail(new Error('Email address required for this notification'));
    }
    if (this._channels.includes('sms') && !recipient.phone) {
      return ResultUtils.fail(new Error('Phone number required for this notification'));
    }

    const newRecipient: NotificationRecipient = {
      ...recipient,
      deliveryStatus: 'pending',
      retryCount: 0
    };

    this._recipients.push(newRecipient);
    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Remove recipient from notification
   */
  removeRecipient(userId: UserId): Result<void> {
    if (this._status !== 'pending') {
      return ResultUtils.fail(new Error('Can only remove recipients from pending notifications'));
    }

    const index = this._recipients.findIndex(r => r.userId === userId);
    if (index === -1) {
      return ResultUtils.fail(new Error('Recipient not found'));
    }

    this._recipients.splice(index, 1);
    
    if (this._recipients.length === 0) {
      return ResultUtils.fail(new Error('Cannot remove last recipient'));
    }

    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Update notification content
   */
  updateContent(content: Partial<NotificationContent>): Result<void> {
    if (this._status !== 'pending') {
      return ResultUtils.fail(new Error('Can only update content of pending notifications'));
    }

    this._content = { ...this._content, ...content };
    this._updatedAt = new Date();

    return ResultUtils.ok(undefined);
  }

  /**
   * Reschedule notification
   */
  reschedule(newSchedule: NotificationSchedule): Result<void> {
    if (this._status !== 'pending') {
      return ResultUtils.fail(new Error('Can only reschedule pending notifications'));
    }

    if (newSchedule.scheduledFor < new Date()) {
      return ResultUtils.fail(new Error('Scheduled time must be in the future'));
    }

    this._schedule = newSchedule;
    this._updatedAt = new Date();

    this.addDomainEvent('NotificationRescheduled', {
      notificationId: this.id,
      scheduledFor: newSchedule.scheduledFor
    });

    return ResultUtils.ok(undefined);
  }

  /**
   * Get delivery statistics
   */
  getStatistics(): {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    bounced: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    const total = this._recipients.length;
    const pending = this._recipients.filter(r => r.deliveryStatus === 'pending').length;
    const sent = this._recipients.filter(r => r.deliveryStatus === 'sent').length;
    const delivered = this._recipients.filter(r => r.deliveryStatus === 'delivered').length;
    const opened = this._recipients.filter(r => r.deliveryStatus === 'opened').length;
    const clicked = this._recipients.filter(r => r.deliveryStatus === 'clicked').length;
    const failed = this._recipients.filter(r => r.deliveryStatus === 'failed').length;
    const bounced = this._recipients.filter(r => r.deliveryStatus === 'bounced').length;

    return {
      total,
      pending,
      sent,
      delivered,
      opened,
      clicked,
      failed,
      bounced,
      deliveryRate: delivered > 0 ? (delivered / total) * 100 : 0,
      openRate: opened > 0 ? (opened / delivered) * 100 : 0,
      clickRate: clicked > 0 ? (clicked / opened) * 100 : 0
    };
  }

  /**
   * Check if notification should be sent based on recipient preferences
   */
  shouldSendToRecipient(userId: UserId, preferences: NotificationPreferences): boolean {
    // Check if category is enabled
    const categoryPrefs = preferences.categories[this._category];
    if (categoryPrefs && !categoryPrefs.enabled) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const startTime = new Date(`1970-01-01T${preferences.quietHours.startTime}:00`);
      const endTime = new Date(`1970-01-01T${preferences.quietHours.endTime}:00`);
      const currentTime = new Date(`1970-01-01T${now.getHours()}:${now.getMinutes()}:00`);
      
      if (currentTime >= startTime && currentTime <= endTime) {
        return false;
      }
    }

    // Check if channels match preferences
    const preferredChannels = categoryPrefs?.channels || preferences.channels;
    const hasMatchingChannel = this._channels.some(c => preferredChannels.includes(c));
    
    return hasMatchingChannel;
  }

  /**
   * Convert to plain object for persistence
   */
  toPersistence(): NotificationProps {
    return {
      id: this._id,
      title: this._title,
      category: this._category,
      priority: this._priority,
      status: this._status,
      channels: this._channels,
      recipients: this._recipients,
      content: this._content,
      schedule: this._schedule,
      tracking: this._tracking,
      metadata: this._metadata,
      organizationId: this._organizationId,
      createdBy: this._createdBy,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      sentAt: this._sentAt,
      completedAt: this._completedAt,
      cancelledAt: this._cancelledAt,
      cancelReason: this._cancelReason,
      retryCount: this._retryCount,
      maxRetries: this._maxRetries,
      lastRetryAt: this._lastRetryAt,
      nextRetryAt: this._nextRetryAt,
      errors: this._errors
    };
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: NotificationProps): Notification {
    return new Notification(props);
  }
}