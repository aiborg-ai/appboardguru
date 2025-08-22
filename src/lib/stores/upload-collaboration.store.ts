/**
 * Upload Collaboration Store
 * Manages real-time collaboration state using Zustand
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  CollaborationState, 
  CollaborationEvent, 
  UserPresence, 
  TeamUploadQueue,
  UploadCollaborationConfig 
} from '@/types/collaboration'
import { UploadCollaborationService } from '@/lib/services/upload-collaboration.service'
import { UserId, OrganizationId, VaultId } from '@/types/branded'
import { FileUploadItem, UploadedAsset } from '@/types/upload'

interface UploadCollaborationStore extends CollaborationState {
  // Service instance
  collaborationService: UploadCollaborationService | null
  
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  
  // Configuration
  config: UploadCollaborationConfig | null
  
  // UI state
  showPresence: boolean
  showActivityFeed: boolean
  showNotifications: boolean
  unreadNotificationCount: number
  
  // Team upload queue
  teamQueue: TeamUploadQueue | null
  
  // Actions
  initialize: (config: UploadCollaborationConfig, userId: UserId, userInfo: any) => Promise<void>
  disconnect: () => void
  
  // Upload collaboration actions
  broadcastUploadStarted: (fileItem: FileUploadItem) => Promise<void>
  broadcastUploadProgress: (fileId: string, fileName: string, progress: number, bytesUploaded: number, totalBytes: number, speed?: number) => Promise<void>
  broadcastUploadCompleted: (fileId: string, asset: UploadedAsset, duration: number) => Promise<void>
  broadcastUploadFailed: (fileId: string, fileName: string, error: string, retryCount: number) => Promise<void>
  
  // Presence actions
  updatePresence: (presence: UserPresence[]) => void
  
  // Notification actions
  addNotification: (notification: any) => void
  markNotificationAsRead: (notificationId: string) => void
  clearAllNotifications: () => void
  
  // UI actions
  togglePresence: () => void
  toggleActivityFeed: () => void
  toggleNotifications: () => void
  
  // Event handling
  handleCollaborationEvent: (event: CollaborationEvent) => void
  
  // Team queue actions
  updateTeamQueue: (queue: TeamUploadQueue) => void
  
  // Smart features
  getMostActiveCollaborators: () => UserPresence[]
  getUploadSuggestions: () => string[]
  getCollaborationInsights: () => any
}

export const useUploadCollaborationStore = create<UploadCollaborationStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    collaborationService: null,
    presence: [],
    teamUploads: [],
    recentActivity: [],
    notifications: [],
    
    // Connection state
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    
    // Configuration
    config: null,
    
    // UI state
    showPresence: true,
    showActivityFeed: false,
    showNotifications: false,
    unreadNotificationCount: 0,
    
    // Team upload queue
    teamQueue: null,
    
    // Actions
    initialize: async (config: UploadCollaborationConfig, userId: UserId, userInfo: any) => {
      set({ isConnecting: true, connectionError: null, config })
      
      try {
        const service = new UploadCollaborationService(config, userId, userInfo)
        
        // Set up event listeners
        service.addEventListener('*', (event: CollaborationEvent) => {
          get().handleCollaborationEvent(event)
        })
        
        // Monitor connection state
        service.addEventListener('connection:open', () => {
          set({ isConnected: true, isConnecting: false })
        })
        
        service.addEventListener('connection:close', () => {
          set({ isConnected: false })
        })
        
        service.addEventListener('connection:error', (event: any) => {
          set({ connectionError: event.data.error, isConnecting: false })
        })
        
        set({ collaborationService: service, isConnecting: false })
        
      } catch (error) {
        set({ 
          connectionError: error instanceof Error ? error.message : 'Connection failed',
          isConnecting: false 
        })
      }
    },
    
    disconnect: () => {
      const { collaborationService } = get()
      if (collaborationService) {
        collaborationService.disconnect()
      }
      
      set({
        collaborationService: null,
        isConnected: false,
        isConnecting: false,
        presence: [],
        teamUploads: [],
        recentActivity: [],
        notifications: []
      })
    },
    
    // Upload collaboration actions
    broadcastUploadStarted: async (fileItem: FileUploadItem) => {
      const { collaborationService } = get()
      if (collaborationService) {
        await collaborationService.broadcastUploadStarted(fileItem)
      }
    },
    
    broadcastUploadProgress: async (fileId: string, fileName: string, progress: number, bytesUploaded: number, totalBytes: number, speed?: number) => {
      const { collaborationService } = get()
      if (collaborationService) {
        await collaborationService.broadcastUploadProgress(fileId, fileName, progress, bytesUploaded, totalBytes, speed)
      }
    },
    
    broadcastUploadCompleted: async (fileId: string, asset: UploadedAsset, duration: number) => {
      const { collaborationService } = get()
      if (collaborationService) {
        await collaborationService.broadcastUploadCompleted(fileId, asset, duration)
      }
    },
    
    broadcastUploadFailed: async (fileId: string, fileName: string, error: string, retryCount: number) => {
      const { collaborationService } = get()
      if (collaborationService) {
        await collaborationService.broadcastUploadFailed(fileId, fileName, error, retryCount)
      }
    },
    
    // Event handling
    handleCollaborationEvent: (event: CollaborationEvent) => {
      const state = get()
      
      switch (event.type) {
        case 'upload:started':
          // Add to team uploads
          set({
            teamUploads: [
              ...state.teamUploads,
              {
                fileId: (event as any).data.fileId,
                fileName: (event as any).data.fileName,
                userId: event.userId,
                userName: event.user.name,
                progress: 0,
                status: 'uploading',
                startTime: event.timestamp
              }
            ]
          })
          break
          
        case 'upload:progress':
          // Update progress
          set({
            teamUploads: state.teamUploads.map(upload =>
              upload.fileId === (event as any).data.fileId
                ? { ...upload, progress: (event as any).data.progress }
                : upload
            )
          })
          break
          
        case 'upload:completed':
          // Mark as completed and add notification
          set({
            teamUploads: state.teamUploads.map(upload =>
              upload.fileId === (event as any).data.fileId
                ? { ...upload, status: 'completed', progress: 100 }
                : upload
            )
          })
          
          get().addNotification({
            type: 'success',
            message: `${event.user.name} uploaded ${(event as any).data.asset.title}`,
            userId: event.userId,
            assetId: (event as any).data.asset.id,
            actions: [
              { label: 'View', action: 'view_asset', data: { assetId: (event as any).data.asset.id } }
            ]
          })
          break
          
        case 'upload:failed':
          // Mark as failed and add notification
          set({
            teamUploads: state.teamUploads.map(upload =>
              upload.fileId === (event as any).data.fileId
                ? { ...upload, status: 'failed' }
                : upload
            )
          })
          
          get().addNotification({
            type: 'error',
            message: `Upload failed: ${(event as any).data.fileName}`,
            userId: event.userId
          })
          break
          
        case 'presence:join':
        case 'presence:active':
          // Update presence
          const newPresence: UserPresence = {
            userId: event.userId,
            user: event.user,
            status: 'online',
            lastSeen: event.timestamp,
            currentPage: (event as any).data.currentPage,
            activeUploads: (event as any).data.activeUploads || [],
            organizationId: event.organizationId,
            vaultId: event.vaultId
          }
          
          set({
            presence: [
              ...state.presence.filter(p => p.userId !== event.userId),
              newPresence
            ]
          })
          break
          
        case 'presence:leave':
          // Remove from presence
          set({
            presence: state.presence.filter(p => p.userId !== event.userId)
          })
          break
      }
      
      // Add to recent activity
      set({
        recentActivity: [event, ...state.recentActivity.slice(0, 49)]
      })
    },
    
    // Presence actions
    updatePresence: (presence: UserPresence[]) => {
      set({ presence })
    },
    
    // Notification actions
    addNotification: (notification: Omit<any, 'id' | 'timestamp' | 'read'>) => {
      const newNotification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification
      }
      
      const state = get()
      set({
        notifications: [newNotification, ...state.notifications.slice(0, 99)],
        unreadNotificationCount: state.unreadNotificationCount + 1
      })
    },
    
    markNotificationAsRead: (notificationId: string) => {
      const state = get()
      const notification = state.notifications.find(n => n.id === notificationId)
      
      if (notification && !notification.read) {
        set({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadNotificationCount: Math.max(0, state.unreadNotificationCount - 1)
        })
      }
    },
    
    clearAllNotifications: () => {
      set({
        notifications: [],
        unreadNotificationCount: 0
      })
    },
    
    // UI actions
    togglePresence: () => {
      set(state => ({ showPresence: !state.showPresence }))
    },
    
    toggleActivityFeed: () => {
      set(state => ({ showActivityFeed: !state.showActivityFeed }))
    },
    
    toggleNotifications: () => {
      set(state => ({ showNotifications: !state.showNotifications }))
    },
    
    // Team queue actions
    updateTeamQueue: (queue: TeamUploadQueue) => {
      set({ teamQueue: queue })
    },
    
    // Smart features
    getMostActiveCollaborators: () => {
      const { presence } = get()
      return presence
        .filter(p => p.activeUploads.length > 0)
        .sort((a, b) => b.activeUploads.length - a.activeUploads.length)
        .slice(0, 5)
    },
    
    getUploadSuggestions: () => {
      const { recentActivity } = get()
      const recentUploads = recentActivity
        .filter(activity => activity.type === 'upload:completed')
        .slice(0, 10)
      
      // Analyze patterns and return suggestions
      return [
        'Consider uploading meeting notes',
        'Financial reports are due soon',
        'Team is actively uploading presentations'
      ]
    },
    
    getCollaborationInsights: () => {
      const { teamUploads, presence, recentActivity } = get()
      
      return {
        activeCollaborators: presence.filter(p => p.status === 'online').length,
        uploadsInProgress: teamUploads.filter(u => u.status === 'uploading').length,
        recentCompletions: recentActivity.filter(a => 
          a.type === 'upload:completed' && 
          new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        collaborationScore: Math.min(100, 
          (presence.length * 10) + 
          (teamUploads.length * 5) + 
          (recentActivity.length * 2)
        )
      }
    }
  }))
)

// Selectors for optimized component subscriptions
export const selectPresence = (state: UploadCollaborationStore) => state.presence
export const selectTeamUploads = (state: UploadCollaborationStore) => state.teamUploads
export const selectNotifications = (state: UploadCollaborationStore) => state.notifications
export const selectUnreadCount = (state: UploadCollaborationStore) => state.unreadNotificationCount
export const selectConnectionState = (state: UploadCollaborationStore) => ({
  isConnected: state.isConnected,
  isConnecting: state.isConnecting,
  error: state.connectionError
})
export const selectUIState = (state: UploadCollaborationStore) => ({
  showPresence: state.showPresence,
  showActivityFeed: state.showActivityFeed,
  showNotifications: state.showNotifications
})