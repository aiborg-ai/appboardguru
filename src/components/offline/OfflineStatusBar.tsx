/**
 * Offline Status Bar Component
 * Shows connection status and offline capabilities
 */

'use client'

import React from 'react'
import { Wifi, WifiOff, Cloud, CloudOff, Download, Sync, AlertCircle, CheckCircle } from 'lucide-react'
import { useOfflineStore } from '@/lib/stores/offline-store'

export interface OfflineStatusBarProps {
  showDetails?: boolean
  className?: string
}

export const OfflineStatusBar: React.FC<OfflineStatusBarProps> = ({
  showDetails = false,
  className = ''
}) => {
  const { offline, actions } = useOfflineStore()
  
  const getStatusColor = () => {
    if (!offline.isOnline && offline.queuedOperations > 0) return 'text-red-600 bg-red-50'
    if (!offline.isOnline) return 'text-yellow-600 bg-yellow-50'
    if (offline.syncInProgress) return 'text-blue-600 bg-blue-50'
    return 'text-green-600 bg-green-50'
  }
  
  const getStatusIcon = () => {
    if (offline.syncInProgress) return <Sync className="h-4 w-4 animate-spin" />
    if (!offline.isOnline && offline.queuedOperations > 0) return <AlertCircle className="h-4 w-4" />
    if (!offline.isOnline) return <WifiOff className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }
  
  const getStatusText = () => {
    if (offline.syncInProgress) {
      return offline.syncProgress 
        ? `Syncing ${offline.syncProgress.entityType}... ${offline.syncProgress.percentage}%`
        : 'Syncing...'
    }
    if (!offline.isOnline && offline.queuedOperations > 0) {
      return `Offline - ${offline.queuedOperations} pending changes`
    }
    if (!offline.isOnline) return 'Offline Mode'
    if (offline.lastSync) {
      const lastSyncTime = new Date(offline.lastSync).toLocaleTimeString()
      return `Online - Last sync: ${lastSyncTime}`
    }
    return 'Online'
  }
  
  const formatStorageSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`
  }
  
  const handleSync = async () => {
    if (!offline.syncInProgress && offline.isOnline) {
      await actions.startSync()
    }
  }
  
  const toggleOfflineMode = () => {
    actions.toggleOfflineMode()
  }
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-2 rounded-md border ${getStatusColor()} ${className}`}>
      {/* Status Icon */}
      <div className="flex items-center space-x-1">
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
      </div>
      
      {/* Connection Toggle */}
      <button
        onClick={toggleOfflineMode}
        className="p-1 rounded hover:bg-white/20 transition-colors"
        title={offline.isOfflineMode ? 'Switch to Online Mode' : 'Switch to Offline Mode'}
      >
        {offline.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      </button>
      
      {/* Sync Button */}
      {offline.isOnline && !offline.syncInProgress && (
        <button
          onClick={handleSync}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          title="Sync Now"
        >
          <Cloud className="h-3 w-3" />
        </button>
      )}
      
      {/* Detailed Info */}
      {showDetails && (
        <div className="flex items-center space-x-2 text-xs">
          <span className="opacity-75">|</span>
          <span>Storage: {formatStorageSize(offline.storageUsed)}</span>
          {offline.encryptionEnabled && (
            <>
              <span className="opacity-75">|</span>
              <span className="text-green-600">🔒 Encrypted</span>
            </>
          )}
        </div>
      )}
      
      {/* Sync Progress Bar */}
      {offline.syncInProgress && offline.syncProgress && (
        <div className="flex-1 max-w-32">
          <div className="w-full bg-white/30 rounded-full h-1.5">
            <div
              className="bg-current h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${offline.syncProgress.percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}