'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Cloud,
  CloudOff,
  Activity,
  Zap,
  Database
} from 'lucide-react';

// Real-time connection status
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';
export type SyncStatus = 'synced' | 'syncing' | 'conflict' | 'error';

interface SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'presence' | 'vote' | 'annotation';
  entityType: 'meeting' | 'document' | 'comment' | 'vote' | 'annotation' | 'participant';
  entityId: string;
  data: any;
  timestamp: Date;
  userId: string;
  userName: string;
}

interface PresenceInfo {
  userId: string;
  userName: string;
  lastSeen: Date;
  status: 'online' | 'away' | 'offline';
  currentPage?: string;
  cursor?: { x: number; y: number };
  isTyping?: boolean;
}

interface SyncState {
  connectionStatus: ConnectionStatus;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  pendingChanges: number;
  conflictCount: number;
  presenceData: Map<string, PresenceInfo>;
  eventQueue: SyncEvent[];
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

interface RealTimeSyncProps {
  meetingId: string;
  currentUserId: string;
  onSyncEvent: (event: SyncEvent) => void;
  onPresenceUpdate: (presence: Map<string, PresenceInfo>) => void;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  websocketUrl?: string;
  enableOfflineMode?: boolean;
  syncInterval?: number;
  className?: string;
}

export const RealTimeSync: React.FC<RealTimeSyncProps> = ({
  meetingId,
  currentUserId,
  onSyncEvent,
  onPresenceUpdate,
  onConnectionStatusChange,
  websocketUrl = 'ws://localhost:3001',
  enableOfflineMode = true,
  syncInterval = 30000,
  className
}) => {
  const [syncState, setSyncState] = useState<SyncState>({
    connectionStatus: 'disconnected',
    syncStatus: 'synced',
    lastSyncTime: null,
    pendingChanges: 0,
    conflictCount: 0,
    presenceData: new Map(),
    eventQueue: [],
    reconnectAttempts: 0,
    maxReconnectAttempts: 5
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update connection status
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setSyncState(prev => ({ ...prev, connectionStatus: status }));
    onConnectionStatusChange(status);
  }, [onConnectionStatusChange]);

  // WebSocket connection management
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    updateConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket(`${websocketUrl}/meeting/${meetingId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus('connected');
        
        setSyncState(prev => ({
          ...prev,
          reconnectAttempts: 0
        }));

        // Send authentication
        ws.send(JSON.stringify({
          type: 'auth',
          userId: currentUserId,
          meetingId
        }));

        // Start heartbeat
        heartbeatTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);

        // Process queued events
        syncState.eventQueue.forEach(event => {
          ws.send(JSON.stringify(event));
        });
        
        setSyncState(prev => ({ ...prev, eventQueue: [] }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        updateConnectionStatus('disconnected');
        
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }

        // Attempt reconnection if not a clean close
        if (event.code !== 1000 && syncState.reconnectAttempts < syncState.maxReconnectAttempts) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      updateConnectionStatus('error');
      scheduleReconnect();
    }
  }, [websocketUrl, meetingId, currentUserId, syncState.eventQueue, syncState.reconnectAttempts, syncState.maxReconnectAttempts, updateConnectionStatus]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;

    setSyncState(prev => ({
      ...prev,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    const delay = Math.min(1000 * Math.pow(2, syncState.reconnectAttempts), 30000);
    
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [connect, syncState.reconnectAttempts]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // Handle incoming messages
  const handleIncomingMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'sync_event':
        const syncEvent: SyncEvent = {
          id: data.id,
          type: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
          data: data.data,
          timestamp: new Date(data.timestamp),
          userId: data.userId,
          userName: data.userName
        };
        onSyncEvent(syncEvent);
        break;

      case 'presence_update':
        setSyncState(prev => {
          const newPresence = new Map(prev.presenceData);
          data.presence.forEach((user: any) => {
            newPresence.set(user.userId, {
              userId: user.userId,
              userName: user.userName,
              lastSeen: new Date(user.lastSeen),
              status: user.status,
              currentPage: user.currentPage,
              cursor: user.cursor,
              isTyping: user.isTyping
            });
          });
          
          onPresenceUpdate(newPresence);
          return { ...prev, presenceData: newPresence };
        });
        break;

      case 'sync_status':
        setSyncState(prev => ({
          ...prev,
          syncStatus: data.status,
          lastSyncTime: new Date(),
          pendingChanges: data.pendingChanges || 0,
          conflictCount: data.conflicts || 0
        }));
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.warn('Unknown message type:', data.type);
    }
  }, [onSyncEvent, onPresenceUpdate]);

  // Send sync event
  const sendSyncEvent = useCallback((event: Omit<SyncEvent, 'id' | 'timestamp' | 'userId' | 'userName'>) => {
    const syncEvent: SyncEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: currentUserId,
      userName: 'Current User' // This should come from user context
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'sync_event',
        ...syncEvent
      }));
    } else {
      // Queue event for later sending
      setSyncState(prev => ({
        ...prev,
        eventQueue: [...prev.eventQueue, syncEvent],
        pendingChanges: prev.pendingChanges + 1
      }));
    }
  }, [currentUserId]);

  // Update presence
  const updatePresence = useCallback((updates: Partial<PresenceInfo>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'presence_update',
        userId: currentUserId,
        ...updates,
        timestamp: new Date().toISOString()
      }));
    }
  }, [currentUserId]);

  // Force sync
  const forceSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, syncStatus: 'syncing' }));
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'force_sync',
        meetingId,
        userId: currentUserId
      }));
    }
  }, [meetingId, currentUserId]);

  // Resolve conflicts
  const resolveConflicts = useCallback((resolution: 'local' | 'remote' | 'merge') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resolve_conflicts',
        meetingId,
        userId: currentUserId,
        resolution
      }));
    }
  }, [meetingId, currentUserId]);

  // Effects
  useEffect(() => {
    connect();

    // Periodic sync for redundancy
    if (syncInterval > 0) {
      syncTimerRef.current = setInterval(() => {
        if (syncState.connectionStatus === 'connected') {
          forceSync();
        }
      }, syncInterval);
    }

    return () => {
      disconnect();
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [connect, disconnect, forceSync, syncInterval]);

  // Auto-reconnect on network change
  useEffect(() => {
    const handleOnline = () => {
      if (syncState.connectionStatus === 'disconnected') {
        connect();
      }
    };

    const handleOffline = () => {
      updateConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connect, syncState.connectionStatus, updateConnectionStatus]);

  // Expose API for parent components
  useEffect(() => {
    (window as any).boardGuruSync = {
      sendSyncEvent,
      updatePresence,
      forceSync,
      resolveConflicts,
      getConnectionStatus: () => syncState.connectionStatus,
      getSyncStatus: () => syncState.syncStatus
    };

    return () => {
      delete (window as any).boardGuruSync;
    };
  }, [sendSyncEvent, updatePresence, forceSync, resolveConflicts, syncState.connectionStatus, syncState.syncStatus]);

  const getStatusIcon = () => {
    switch (syncState.connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getSyncIcon = () => {
    switch (syncState.syncStatus) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'conflict':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className={cn("sync-status-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center space-x-2">
          <Activity className="h-4 w-4 text-blue-600" />
          <span>Real-time Sync</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium capitalize">
              {syncState.connectionStatus}
            </span>
          </div>
          {syncState.connectionStatus !== 'connected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              disabled={syncState.connectionStatus === 'connecting'}
            >
              Reconnect
            </Button>
          )}
        </div>

        {/* Sync Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getSyncIcon()}
            <span className="text-sm font-medium capitalize">
              {syncState.syncStatus.replace('_', ' ')}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={forceSync}
            disabled={syncState.syncStatus === 'syncing'}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {Array.from(syncState.presenceData.values()).filter(p => p.status === 'online').length}
            </div>
            <div className="text-xs text-gray-500">Online</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">
              {syncState.pendingChanges}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
        </div>

        {/* Last Sync Time */}
        {syncState.lastSyncTime && (
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>Last sync: {syncState.lastSyncTime.toLocaleTimeString()}</span>
          </div>
        )}

        {/* Conflicts */}
        {syncState.conflictCount > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-800">
                {syncState.conflictCount} conflict{syncState.conflictCount > 1 ? 's' : ''} detected
              </span>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveConflicts('local')}
                className="text-xs"
              >
                Keep Local
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveConflicts('remote')}
                className="text-xs"
              >
                Use Remote
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => resolveConflicts('merge')}
                className="text-xs"
              >
                Merge
              </Button>
            </div>
          </div>
        )}

        {/* Offline Mode */}
        {!navigator.onLine && enableOfflineMode && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CloudOff className="h-4 w-4" />
              <span>Working offline - changes will sync when connected</span>
            </div>
          </div>
        )}

        {/* Reconnection Info */}
        {syncState.connectionStatus === 'disconnected' && syncState.reconnectAttempts > 0 && (
          <div className="text-xs text-gray-500 text-center">
            Reconnect attempt {syncState.reconnectAttempts} of {syncState.maxReconnectAttempts}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealTimeSync;