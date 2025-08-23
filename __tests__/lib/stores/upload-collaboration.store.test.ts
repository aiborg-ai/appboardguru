/**
 * Upload Collaboration Store Tests
 * Comprehensive testing for Zustand store managing real-time upload collaboration
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadCollaborationStore } from '@/lib/stores/upload-collaboration.store';
import { UploadCollaborationService } from '@/lib/services/upload-collaboration.service';
import { CollaborationEvent, UploadCollaborationConfig } from '@/types/collaboration';
import { createUserId, createOrganizationId } from '@/lib/utils/branded-type-helpers';

// Mock the service
vi.mock('@/lib/services/upload-collaboration.service');

describe('Upload Collaboration Store', () => {
  let mockService: Partial<UploadCollaborationService>;
  
  beforeEach(() => {
    // Reset store to initial state
    useUploadCollaborationStore.setState({
      collaborationService: null,
      presence: [],
      teamUploads: [],
      recentActivity: [],
      notifications: [],
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      config: null,
      showPresence: true,
      showActivityFeed: false,
      showNotifications: false,
      unreadNotificationCount: 0,
      teamQueue: null
    });

    // Setup mock service
    mockService = {
      addEventListener: vi.fn(),
      disconnect: vi.fn(),
      broadcastUploadStarted: vi.fn().mockResolvedValue(undefined),
      broadcastUploadProgress: vi.fn().mockResolvedValue(undefined),
      broadcastUploadCompleted: vi.fn().mockResolvedValue(undefined),
      broadcastUploadFailed: vi.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());
      const state = result.current;

      expect(state.collaborationService).toBeNull();
      expect(state.presence).toEqual([]);
      expect(state.teamUploads).toEqual([]);
      expect(state.recentActivity).toEqual([]);
      expect(state.notifications).toEqual([]);
      expect(state.isConnected).toBe(false);
      expect(state.isConnecting).toBe(false);
      expect(state.connectionError).toBeNull();
      expect(state.showPresence).toBe(true);
      expect(state.showActivityFeed).toBe(false);
      expect(state.showNotifications).toBe(false);
      expect(state.unreadNotificationCount).toBe(0);
    });

    it('has all required action methods', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());
      const state = result.current;

      expect(typeof state.initialize).toBe('function');
      expect(typeof state.disconnect).toBe('function');
      expect(typeof state.broadcastUploadStarted).toBe('function');
      expect(typeof state.broadcastUploadProgress).toBe('function');
      expect(typeof state.broadcastUploadCompleted).toBe('function');
      expect(typeof state.broadcastUploadFailed).toBe('function');
      expect(typeof state.updatePresence).toBe('function');
      expect(typeof state.addNotification).toBe('function');
      expect(typeof state.markNotificationAsRead).toBe('function');
      expect(typeof state.clearAllNotifications).toBe('function');
      expect(typeof state.togglePresence).toBe('function');
      expect(typeof state.toggleActivityFeed).toBe('function');
      expect(typeof state.toggleNotifications).toBe('function');
    });
  });

  describe('Initialization', () => {
    it('initializes collaboration service successfully', async () => {
      const mockConstructor = vi.mocked(UploadCollaborationService);
      mockConstructor.mockImplementation(() => mockService as UploadCollaborationService);

      const { result } = renderHook(() => useUploadCollaborationStore());

      const config: UploadCollaborationConfig = {
        organizationId: createOrganizationId('org-1'),
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: true,
        notificationSettings: {
          uploadStarted: true,
          uploadCompleted: true,
          uploadFailed: true,
          uploadShared: true,
          mentions: true
        }
      };

      const userId = createUserId('user-1');
      const userInfo = {
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.jpg'
      };

      await act(async () => {
        await result.current.initialize(config, userId, userInfo);
      });

      expect(mockConstructor).toHaveBeenCalledWith(config, userId, userInfo);
      expect(mockService.addEventListener).toHaveBeenCalled();
    });

    it('sets connection state during initialization', async () => {
      const mockConstructor = vi.mocked(UploadCollaborationService);
      mockConstructor.mockImplementation(() => mockService as UploadCollaborationService);

      const { result } = renderHook(() => useUploadCollaborationStore());

      const config: UploadCollaborationConfig = {
        organizationId: createOrganizationId('org-1'),
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: false,
        notificationSettings: {
          uploadStarted: true,
          uploadCompleted: true,
          uploadFailed: true,
          uploadShared: true,
          mentions: true
        }
      };

      // Check initial connecting state
      act(() => {
        result.current.initialize(config, createUserId('user-1'), { name: 'Test', email: 'test@example.com' });
      });

      expect(result.current.isConnecting).toBe(true);
      expect(result.current.connectionError).toBeNull();
      expect(result.current.config).toEqual(config);
    });

    it('handles initialization errors', async () => {
      const mockConstructor = vi.mocked(UploadCollaborationService);
      mockConstructor.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const { result } = renderHook(() => useUploadCollaborationStore());

      const config: UploadCollaborationConfig = {
        organizationId: createOrganizationId('org-1'),
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: false,
        notificationSettings: {
          uploadStarted: false,
          uploadCompleted: false,
          uploadFailed: false,
          uploadShared: false,
          mentions: false
        }
      };

      await act(async () => {
        await result.current.initialize(config, createUserId('user-1'), { name: 'Test', email: 'test@example.com' });
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.connectionError).toBe('Connection failed');
    });
  });

  describe('Collaboration Events', () => {
    beforeEach(async () => {
      const mockConstructor = vi.mocked(UploadCollaborationService);
      mockConstructor.mockImplementation(() => mockService as UploadCollaborationService);

      const { result } = renderHook(() => useUploadCollaborationStore());

      const config: UploadCollaborationConfig = {
        organizationId: createOrganizationId('org-1'),
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: false,
        notificationSettings: {
          uploadStarted: true,
          uploadCompleted: true,
          uploadFailed: true,
          uploadShared: true,
          mentions: true
        }
      };

      await act(async () => {
        await result.current.initialize(config, createUserId('user-1'), { name: 'Test', email: 'test@example.com' });
      });
    });

    it('handles upload started events', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const event: CollaborationEvent = {
        id: 'event-1',
        type: 'upload:started',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          fileId: 'file-1',
          fileName: 'document.pdf',
          fileSize: 1024000,
          category: 'board-documents'
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(event);
      });

      expect(result.current.teamUploads).toHaveLength(1);
      expect(result.current.teamUploads[0]).toMatchObject({
        fileId: 'file-1',
        fileName: 'document.pdf',
        userId: createUserId('user-2'),
        userName: 'Jane Doe',
        progress: 0,
        status: 'uploading'
      });
      expect(result.current.recentActivity).toHaveLength(1);
      expect(result.current.recentActivity[0]).toBe(event);
    });

    it('handles upload progress events', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      // First add an upload started event
      const startEvent: CollaborationEvent = {
        id: 'event-1',
        type: 'upload:started',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          fileId: 'file-1',
          fileName: 'document.pdf',
          fileSize: 1024000,
          category: 'board-documents'
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(startEvent);
      });

      // Now add progress event
      const progressEvent: CollaborationEvent = {
        id: 'event-2',
        type: 'upload:progress',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          fileId: 'file-1',
          fileName: 'document.pdf',
          progress: 50,
          bytesUploaded: 512000,
          totalBytes: 1024000
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(progressEvent);
      });

      expect(result.current.teamUploads[0].progress).toBe(50);
    });

    it('handles upload completed events', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const event: CollaborationEvent = {
        id: 'event-1',
        type: 'upload:completed',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          fileId: 'file-1',
          asset: {
            id: 'asset-1',
            title: 'document.pdf',
            file_name: 'document.pdf'
          }
        }
      } as any;

      // First add the upload
      const startEvent: CollaborationEvent = {
        ...event,
        id: 'event-0',
        type: 'upload:started',
        data: {
          fileId: 'file-1',
          fileName: 'document.pdf'
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(startEvent);
        result.current.handleCollaborationEvent(event);
      });

      expect(result.current.teamUploads[0].status).toBe('completed');
      expect(result.current.teamUploads[0].progress).toBe(100);
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[0].message).toContain('Jane Doe uploaded');
    });

    it('handles upload failed events', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const event: CollaborationEvent = {
        id: 'event-1',
        type: 'upload:failed',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          fileId: 'file-1',
          fileName: 'document.pdf',
          error: 'Upload timeout'
        }
      } as any;

      // First add the upload
      const startEvent: CollaborationEvent = {
        ...event,
        id: 'event-0',
        type: 'upload:started',
        data: {
          fileId: 'file-1',
          fileName: 'document.pdf'
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(startEvent);
        result.current.handleCollaborationEvent(event);
      });

      expect(result.current.teamUploads[0].status).toBe('failed');
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('error');
      expect(result.current.notifications[0].message).toContain('Upload failed');
    });

    it('handles presence join events', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const event: CollaborationEvent = {
        id: 'event-1',
        type: 'presence:join',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          currentPage: '/dashboard/assets',
          activeUploads: []
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(event);
      });

      expect(result.current.presence).toHaveLength(1);
      expect(result.current.presence[0]).toMatchObject({
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        status: 'online',
        currentPage: '/dashboard/assets',
        activeUploads: []
      });
    });

    it('handles presence leave events', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      // First add a user
      const joinEvent: CollaborationEvent = {
        id: 'event-1',
        type: 'presence:join',
        timestamp: new Date().toISOString(),
        organizationId: createOrganizationId('org-1'),
        userId: createUserId('user-2'),
        user: {
          id: createUserId('user-2'),
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        data: {
          currentPage: '/dashboard/assets',
          activeUploads: []
        }
      } as any;

      act(() => {
        result.current.handleCollaborationEvent(joinEvent);
      });

      expect(result.current.presence).toHaveLength(1);

      // Now remove them
      const leaveEvent: CollaborationEvent = {
        ...joinEvent,
        id: 'event-2',
        type: 'presence:leave'
      };

      act(() => {
        result.current.handleCollaborationEvent(leaveEvent);
      });

      expect(result.current.presence).toHaveLength(0);
    });
  });

  describe('Broadcast Methods', () => {
    let store: ReturnType<typeof useUploadCollaborationStore>;

    beforeEach(async () => {
      const mockConstructor = vi.mocked(UploadCollaborationService);
      mockConstructor.mockImplementation(() => mockService as UploadCollaborationService);

      const { result } = renderHook(() => useUploadCollaborationStore());
      store = result.current;

      const config: UploadCollaborationConfig = {
        organizationId: createOrganizationId('org-1'),
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: false,
        notificationSettings: {
          uploadStarted: true,
          uploadCompleted: true,
          uploadFailed: true,
          uploadShared: true,
          mentions: true
        }
      };

      await act(async () => {
        await store.initialize(config, createUserId('user-1'), { name: 'Test', email: 'test@example.com' });
      });
    });

    it('broadcasts upload started', async () => {
      const fileItem = {
        id: 'file-1',
        file: new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        title: 'Test Document',
        category: 'board-documents' as const,
        tags: ['test'],
        description: 'Test file',
        status: 'pending' as const,
        progress: 0
      };

      await act(async () => {
        await store.broadcastUploadStarted(fileItem);
      });

      expect(mockService.broadcastUploadStarted).toHaveBeenCalledWith(fileItem);
    });

    it('broadcasts upload progress', async () => {
      await act(async () => {
        await store.broadcastUploadProgress('file-1', 'test.pdf', 50, 512000, 1024000, 1000);
      });

      expect(mockService.broadcastUploadProgress).toHaveBeenCalledWith(
        'file-1',
        'test.pdf', 
        50,
        512000,
        1024000,
        1000
      );
    });

    it('broadcasts upload completed', async () => {
      const asset = {
        id: 'asset-1',
        title: 'Test Document',
        file_name: 'test.pdf'
      };

      await act(async () => {
        await store.broadcastUploadCompleted('file-1', asset as any, 5000);
      });

      expect(mockService.broadcastUploadCompleted).toHaveBeenCalledWith('file-1', asset, 5000);
    });

    it('broadcasts upload failed', async () => {
      await act(async () => {
        await store.broadcastUploadFailed('file-1', 'test.pdf', 'Upload timeout', 1);
      });

      expect(mockService.broadcastUploadFailed).toHaveBeenCalledWith(
        'file-1',
        'test.pdf',
        'Upload timeout',
        1
      );
    });

    it('handles broadcast when service is not connected', async () => {
      // Reset to no service
      act(() => {
        useUploadCollaborationStore.setState({ collaborationService: null });
      });

      const { result } = renderHook(() => useUploadCollaborationStore());

      const fileItem = {
        id: 'file-1',
        file: new File(['content'], 'test.pdf'),
        title: 'Test Document',
        category: 'board-documents' as const,
        tags: [],
        description: '',
        status: 'pending' as const,
        progress: 0
      };

      await act(async () => {
        await result.current.broadcastUploadStarted(fileItem);
      });

      // Should not throw error, just silently handle
      expect(mockService.broadcastUploadStarted).not.toHaveBeenCalled();
    });
  });

  describe('Notification Management', () => {
    it('adds notifications correctly', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const notification = {
        type: 'success' as const,
        message: 'Upload completed successfully',
        userId: createUserId('user-1')
      };

      act(() => {
        result.current.addNotification(notification);
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject(notification);
      expect(result.current.notifications[0].id).toBeDefined();
      expect(result.current.notifications[0].timestamp).toBeDefined();
      expect(result.current.notifications[0].read).toBe(false);
      expect(result.current.unreadNotificationCount).toBe(1);
    });

    it('marks notifications as read', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          message: 'Test notification'
        });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markNotificationAsRead(notificationId);
      });

      expect(result.current.notifications[0].read).toBe(true);
      expect(result.current.unreadNotificationCount).toBe(0);
    });

    it('does not decrease unread count for already read notifications', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          message: 'Test notification'
        });
      });

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.markNotificationAsRead(notificationId);
        result.current.markNotificationAsRead(notificationId); // Mark as read again
      });

      expect(result.current.unreadNotificationCount).toBe(0); // Should not go negative
    });

    it('clears all notifications', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      act(() => {
        result.current.addNotification({
          type: 'success',
          message: 'Test notification 1'
        });
        result.current.addNotification({
          type: 'info',
          message: 'Test notification 2'
        });
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadNotificationCount).toBe(2);

      act(() => {
        result.current.clearAllNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
      expect(result.current.unreadNotificationCount).toBe(0);
    });

    it('limits notifications to 100 items', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      // Add 105 notifications
      act(() => {
        for (let i = 0; i < 105; i++) {
          result.current.addNotification({
            type: 'info',
            message: `Test notification ${i}`
          });
        }
      });

      expect(result.current.notifications).toHaveLength(100);
      expect(result.current.unreadNotificationCount).toBe(100);
    });
  });

  describe('UI State Management', () => {
    it('toggles presence visibility', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      expect(result.current.showPresence).toBe(true);

      act(() => {
        result.current.togglePresence();
      });

      expect(result.current.showPresence).toBe(false);

      act(() => {
        result.current.togglePresence();
      });

      expect(result.current.showPresence).toBe(true);
    });

    it('toggles activity feed visibility', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      expect(result.current.showActivityFeed).toBe(false);

      act(() => {
        result.current.toggleActivityFeed();
      });

      expect(result.current.showActivityFeed).toBe(true);

      act(() => {
        result.current.toggleActivityFeed();
      });

      expect(result.current.showActivityFeed).toBe(false);
    });

    it('toggles notifications visibility', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      expect(result.current.showNotifications).toBe(false);

      act(() => {
        result.current.toggleNotifications();
      });

      expect(result.current.showNotifications).toBe(true);

      act(() => {
        result.current.toggleNotifications();
      });

      expect(result.current.showNotifications).toBe(false);
    });
  });

  describe('Smart Analytics Features', () => {
    it('gets most active collaborators', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const presence = [
        {
          userId: createUserId('user-1'),
          user: { id: createUserId('user-1'), name: 'User 1', email: 'user1@example.com' },
          status: 'online' as const,
          lastSeen: new Date().toISOString(),
          activeUploads: [{ fileId: 'file-1', fileName: 'doc1.pdf', progress: 50, startTime: new Date().toISOString() }],
          organizationId: createOrganizationId('org-1')
        },
        {
          userId: createUserId('user-2'),
          user: { id: createUserId('user-2'), name: 'User 2', email: 'user2@example.com' },
          status: 'online' as const,
          lastSeen: new Date().toISOString(),
          activeUploads: [
            { fileId: 'file-2', fileName: 'doc2.pdf', progress: 75, startTime: new Date().toISOString() },
            { fileId: 'file-3', fileName: 'doc3.pdf', progress: 25, startTime: new Date().toISOString() }
          ],
          organizationId: createOrganizationId('org-1')
        }
      ];

      act(() => {
        result.current.updatePresence(presence);
      });

      const mostActive = result.current.getMostActiveCollaborators();
      expect(mostActive).toHaveLength(2);
      expect(mostActive[0].userId).toBe(createUserId('user-2')); // User with 2 uploads
      expect(mostActive[1].userId).toBe(createUserId('user-1')); // User with 1 upload
    });

    it('gets upload suggestions', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const suggestions = result.current.getUploadSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('calculates collaboration insights', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const insights = result.current.getCollaborationInsights();
      expect(insights).toHaveProperty('activeCollaborators');
      expect(insights).toHaveProperty('uploadsInProgress');
      expect(insights).toHaveProperty('recentCompletions');
      expect(insights).toHaveProperty('collaborationScore');
      expect(typeof insights.collaborationScore).toBe('number');
      expect(insights.collaborationScore).toBeGreaterThanOrEqual(0);
      expect(insights.collaborationScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Store Selectors', () => {
    it('provides presence selector', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const presence = [
        {
          userId: createUserId('user-1'),
          user: { id: createUserId('user-1'), name: 'User 1', email: 'user1@example.com' },
          status: 'online' as const,
          lastSeen: new Date().toISOString(),
          activeUploads: [],
          organizationId: createOrganizationId('org-1')
        }
      ];

      act(() => {
        result.current.updatePresence(presence);
      });

      // Test selector import directly
      const { selectPresence } = require('@/lib/stores/upload-collaboration.store');
      const selectedPresence = selectPresence(result.current);
      expect(selectedPresence).toEqual(presence);
    });

    it('provides connection state selector', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      act(() => {
        useUploadCollaborationStore.setState({
          isConnected: true,
          isConnecting: false,
          connectionError: 'Test error'
        });
      });

      const { selectConnectionState } = require('@/lib/stores/upload-collaboration.store');
      const connectionState = selectConnectionState(result.current);

      expect(connectionState).toEqual({
        isConnected: true,
        isConnecting: false,
        error: 'Test error'
      });
    });

    it('provides UI state selector', () => {
      const { result } = renderHook(() => useUploadCollaborationStore());

      const { selectUIState } = require('@/lib/stores/upload-collaboration.store');
      const uiState = selectUIState(result.current);

      expect(uiState).toEqual({
        showPresence: true,
        showActivityFeed: false,
        showNotifications: false
      });
    });
  });

  describe('Disconnect', () => {
    it('properly disconnects and cleans up', async () => {
      const mockConstructor = vi.mocked(UploadCollaborationService);
      mockConstructor.mockImplementation(() => mockService as UploadCollaborationService);

      const { result } = renderHook(() => useUploadCollaborationStore());

      const config: UploadCollaborationConfig = {
        organizationId: createOrganizationId('org-1'),
        enablePresence: true,
        enableRealTimeProgress: true,
        enableNotifications: true,
        enableActivityFeed: true,
        enableAutoSharing: false,
        notificationSettings: {
          uploadStarted: false,
          uploadCompleted: false,
          uploadFailed: false,
          uploadShared: false,
          mentions: false
        }
      };

      await act(async () => {
        await result.current.initialize(config, createUserId('user-1'), { name: 'Test', email: 'test@example.com' });
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockService.disconnect).toHaveBeenCalled();
      expect(result.current.collaborationService).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.presence).toEqual([]);
      expect(result.current.teamUploads).toEqual([]);
      expect(result.current.recentActivity).toEqual([]);
      expect(result.current.notifications).toEqual([]);
    });
  });
});