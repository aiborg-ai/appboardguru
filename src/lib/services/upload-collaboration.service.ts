/**
 * Upload Collaboration Service
 * Manages real-time collaboration features for file uploads
 */

import { BaseService } from './base.service'
import { Result, Ok, Err } from '../repositories/result'
import { 
  CollaborationEvent, 
  CollaborationState, 
  UserPresence, 
  TeamUploadQueue,
  UploadCollaborationConfig,
  SmartSharingRule,
  UploadMention
} from '@/types/collaboration'
import { UserId, OrganizationId, VaultId } from '@/types/branded'
import { FileUploadItem, UploadedAsset } from '@/types/upload'

export class UploadCollaborationService extends BaseService {
  private websocket: WebSocket | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private collaborationState: CollaborationState = {
    presence: [],
    teamUploads: [],
    recentActivity: [],
    notifications: []
  }
  private eventListeners: Map<string, Set<(event: CollaborationEvent) => void>> = new Map()
  private presenceUpdateInterval: NodeJS.Timeout | null = null

  constructor(
    private config: UploadCollaborationConfig,
    private userId: UserId,
    private userInfo: { name: string; email: string; avatar?: string }
  ) {
    super()
    this.initializeWebSocket()
    this.startPresenceUpdates()
  }

  // WebSocket Connection Management
  private async initializeWebSocket(): Promise<void> {
    try {
      const wsUrl = this.buildWebSocketUrl()
      this.websocket = new WebSocket(wsUrl)
      
      this.websocket.onopen = this.handleWebSocketOpen.bind(this)
      this.websocket.onmessage = this.handleWebSocketMessage.bind(this)
      this.websocket.onclose = this.handleWebSocketClose.bind(this)
      this.websocket.onerror = this.handleWebSocketError.bind(this)
      
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
    }
  }

  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/ws/uploads?` + new URLSearchParams({
      organizationId: this.config.organizationId,
      vaultId: this.config.vaultId || '',
      userId: this.userId
    })
  }

  private handleWebSocketOpen(): void {
    console.log('Upload collaboration WebSocket connected')
    this.reconnectAttempts = 0
    this.startHeartbeat()
    this.joinCollaborationRoom()
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      this.processCollaborationEvent(data)
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleWebSocketClose(): void {
    console.log('Upload collaboration WebSocket disconnected')
    this.stopHeartbeat()
    this.attemptReconnect()
  }

  private handleWebSocketError(error: Event): void {
    console.error('Upload collaboration WebSocket error:', error)
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
      
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.initializeWebSocket()
      }, delay)
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Collaboration Event Management
  private processCollaborationEvent(data: any): void {
    const event = data as CollaborationEvent
    
    // Update local state
    this.updateCollaborationState(event)
    
    // Notify listeners
    this.notifyEventListeners(event)
    
    // Handle specific event types
    this.handleSpecificEvent(event)
  }

  private updateCollaborationState(event: CollaborationEvent): void {
    switch (event.type) {
      case 'upload:started':
        this.addTeamUpload(event)
        break
      case 'upload:progress':
        this.updateTeamUploadProgress(event)
        break
      case 'upload:completed':
        this.completeTeamUpload(event)
        break
      case 'upload:failed':
        this.failTeamUpload(event)
        break
      case 'presence:join':
        this.addUserPresence(event)
        break
      case 'presence:leave':
        this.removeUserPresence(event)
        break
    }
    
    // Add to recent activity
    this.collaborationState.recentActivity.unshift(event)
    
    // Keep only last 50 activities
    if (this.collaborationState.recentActivity.length > 50) {
      this.collaborationState.recentActivity = this.collaborationState.recentActivity.slice(0, 50)
    }
  }

  private addTeamUpload(event: any): void {
    this.collaborationState.teamUploads.push({
      fileId: event.data.fileId,
      fileName: event.data.fileName,
      userId: event.userId,
      userName: event.user.name,
      progress: 0,
      status: 'uploading',
      startTime: event.timestamp
    })
  }

  private updateTeamUploadProgress(event: any): void {
    const upload = this.collaborationState.teamUploads.find(u => u.fileId === event.data.fileId)
    if (upload) {
      upload.progress = event.data.progress
      
      // Estimate completion time
      if (event.data.speed && event.data.progress > 0) {
        const remainingBytes = event.data.totalBytes - event.data.bytesUploaded
        const remainingSeconds = remainingBytes / event.data.speed
        upload.estimatedCompletion = new Date(Date.now() + remainingSeconds * 1000).toISOString()
      }
    }
  }

  private completeTeamUpload(event: any): void {
    const uploadIndex = this.collaborationState.teamUploads.findIndex(u => u.fileId === event.data.fileId)
    if (uploadIndex !== -1) {
      this.collaborationState.teamUploads[uploadIndex].status = 'completed'
      this.collaborationState.teamUploads[uploadIndex].progress = 100
      
      // Create success notification
      this.addNotification({
        type: 'success',
        message: `${event.user.name} successfully uploaded ${event.data.asset.title}`,
        userId: event.userId,
        assetId: event.data.asset.id,
        actions: [
          { label: 'View', action: 'view_asset', data: { assetId: event.data.asset.id } },
          { label: 'Share', action: 'share_asset', data: { assetId: event.data.asset.id } }
        ]
      })
    }
  }

  private failTeamUpload(event: any): void {
    const upload = this.collaborationState.teamUploads.find(u => u.fileId === event.data.fileId)
    if (upload) {
      upload.status = 'failed'
      
      // Create error notification
      this.addNotification({
        type: 'error',
        message: `Upload failed: ${event.data.fileName} - ${event.data.error}`,
        userId: event.userId,
        actions: event.data.retryCount < 3 ? [
          { label: 'Retry', action: 'retry_upload', data: { fileId: event.data.fileId } }
        ] : []
      })
    }
  }

  private addUserPresence(event: any): void {
    const existingIndex = this.collaborationState.presence.findIndex(p => p.userId === event.userId)
    
    const presence: UserPresence = {
      userId: event.userId,
      user: event.user,
      status: 'online',
      lastSeen: event.timestamp,
      currentPage: event.data.currentPage,
      activeUploads: event.data.activeUploads || [],
      organizationId: event.organizationId,
      vaultId: event.vaultId
    }
    
    if (existingIndex !== -1) {
      this.collaborationState.presence[existingIndex] = presence
    } else {
      this.collaborationState.presence.push(presence)
    }
  }

  private removeUserPresence(event: any): void {
    this.collaborationState.presence = this.collaborationState.presence.filter(
      p => p.userId !== event.userId
    )
  }

  private addNotification(notification: Omit<any, 'id' | 'timestamp' | 'read'>): void {
    this.collaborationState.notifications.unshift({
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    })
    
    // Keep only last 100 notifications
    if (this.collaborationState.notifications.length > 100) {
      this.collaborationState.notifications = this.collaborationState.notifications.slice(0, 100)
    }
  }

  // Public API Methods
  async broadcastUploadStarted(fileItem: FileUploadItem): Promise<Result<void>> {
    const event = {
      type: 'upload:started',
      data: {
        fileId: fileItem.id,
        fileName: fileItem.file.name,
        fileSize: fileItem.file.size,
        category: fileItem.category,
        estimatedDuration: this.estimateUploadDuration(fileItem.file.size)
      }
    }
    
    return this.sendCollaborationEvent(event)
  }

  async broadcastUploadProgress(fileId: string, fileName: string, progress: number, bytesUploaded: number, totalBytes: number, speed?: number): Promise<Result<void>> {
    const event = {
      type: 'upload:progress',
      data: {
        fileId,
        fileName,
        progress,
        bytesUploaded,
        totalBytes,
        speed
      }
    }
    
    return this.sendCollaborationEvent(event)
  }

  async broadcastUploadCompleted(fileId: string, asset: UploadedAsset, duration: number): Promise<Result<void>> {
    const event = {
      type: 'upload:completed',
      data: {
        fileId,
        asset,
        duration,
        autoShared: await this.checkAutoSharing(asset)
      }
    }
    
    return this.sendCollaborationEvent(event)
  }

  async broadcastUploadFailed(fileId: string, fileName: string, error: string, retryCount: number): Promise<Result<void>> {
    const event = {
      type: 'upload:failed',
      data: {
        fileId,
        fileName,
        error,
        retryCount
      }
    }
    
    return this.sendCollaborationEvent(event)
  }

  async mentionUsers(users: UploadMention[]): Promise<Result<void>> {
    try {
      for (const mention of users) {
        const event = {
          type: 'upload:commented',
          data: {
            assetId: mention.assetId || '',
            assetTitle: '',
            comment: mention.message,
            mentionedUsers: [mention.userId]
          }
        }
        
        await this.sendCollaborationEvent(event)
      }
      
      return Ok(undefined)
    } catch (error) {
      return Err(error as Error)
    }
  }

  private async sendCollaborationEvent(eventData: any): Promise<Result<void>> {
    try {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.websocket.send(JSON.stringify(eventData))
        return Ok(undefined)
      } else {
        return Err(new Error('WebSocket not connected'))
      }
    } catch (error) {
      return Err(error as Error)
    }
  }

  // Event Listeners
  addEventListener(eventType: string, callback: (event: CollaborationEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(callback)
  }

  removeEventListener(eventType: string, callback: (event: CollaborationEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(callback)
  }

  private notifyEventListeners(event: CollaborationEvent): void {
    // Notify specific event type listeners
    this.eventListeners.get(event.type)?.forEach(callback => callback(event))
    
    // Notify global listeners
    this.eventListeners.get('*')?.forEach(callback => callback(event))
  }

  // Presence Management
  private joinCollaborationRoom(): void {
    const event = {
      type: 'presence:join',
      data: {
        currentPage: window.location.pathname,
        isUploading: false,
        activeUploads: []
      }
    }
    
    this.sendCollaborationEvent(event)
  }

  private startPresenceUpdates(): void {
    this.presenceUpdateInterval = setInterval(() => {
      this.updatePresence()
    }, 60000) // Update every minute
  }

  private updatePresence(): void {
    const event = {
      type: 'presence:active',
      data: {
        currentPage: window.location.pathname,
        isUploading: this.isCurrentlyUploading(),
        activeUploads: this.getCurrentActiveUploads()
      }
    }
    
    this.sendCollaborationEvent(event)
  }

  private isCurrentlyUploading(): boolean {
    return this.collaborationState.teamUploads.some(
      upload => upload.userId === this.userId && upload.status === 'uploading'
    )
  }

  private getCurrentActiveUploads(): any[] {
    return this.collaborationState.teamUploads
      .filter(upload => upload.userId === this.userId && upload.status === 'uploading')
      .map(upload => ({
        fileId: upload.fileId,
        fileName: upload.fileName,
        progress: upload.progress,
        startTime: upload.startTime
      }))
  }

  // Utility Methods
  private estimateUploadDuration(fileSize: number): number {
    // Estimate based on average upload speed (adjust based on historical data)
    const averageSpeedMbps = 10 // 10 Mbps
    const averageSpeedBps = (averageSpeedMbps * 1024 * 1024) / 8
    return Math.ceil(fileSize / averageSpeedBps)
  }

  private async checkAutoSharing(asset: UploadedAsset): Promise<boolean> {
    try {
      const { SmartSharingService } = await import('./smart-sharing.service')
      const smartSharingService = new SmartSharingService()
      
      const context = {
        asset,
        uploader: {
          id: this.userId,
          name: this.userInfo.name,
          role: 'member' // TODO: Get actual role
        },
        organizationId: this.config.organizationId,
        vaultId: this.config.vaultId,
        uploadTime: new Date(),
        fileMetadata: {
          category: 'general', // TODO: Extract from asset
          fileType: asset.file_extension || '',
          keywords: asset.tags || [],
          size: asset.file_size || 0
        }
      }
      
      const result = await smartSharingService.evaluateSmartSharing(context)
      if (result.success && result.data.recommendations.length > 0) {
        await smartSharingService.applyAutoSharing(asset.id, result.data.recommendations)
        return result.data.recommendations.some(r => r.autoShare)
      }
      
      return false
    } catch (error) {
      console.error('Smart sharing evaluation failed:', error)
      return false
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  // State Getters
  getCollaborationState(): CollaborationState {
    return { ...this.collaborationState }
  }

  getPresence(): UserPresence[] {
    return [...this.collaborationState.presence]
  }

  getTeamUploads(): any[] {
    return [...this.collaborationState.teamUploads]
  }

  getNotifications(): any[] {
    return [...this.collaborationState.notifications]
  }

  markNotificationAsRead(notificationId: string): void {
    const notification = this.collaborationState.notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  // Cleanup
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval)
    }
    
    this.eventListeners.clear()
  }
}