/**
 * Offline Manager Component
 * Complete interface for managing offline capabilities
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  Download, Upload, Trash2, Settings, RefreshCw, Database,
  HardDrive, Wifi, WifiOff, AlertTriangle, CheckCircle2,
  Clock, Users, FileText, Vote, Shield, BarChart3
} from 'lucide-react'
import { useOfflineStore } from '@/lib/stores/offline-store'
import { useMeetingStore } from '@/lib/stores/meeting-store'
import { useVotingStore } from '@/lib/stores/voting-store'
import { useComplianceStore } from '@/lib/stores/compliance-store'
import { useDocumentStore } from '@/lib/stores/document-store'

export interface OfflineManagerProps {
  onClose?: () => void
}

type TabType = 'overview' | 'sync' | 'cache' | 'settings' | 'conflicts'

export const OfflineManager: React.FC<OfflineManagerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [storageInfo, setStorageInfo] = useState<any>(null)
  
  const offlineStore = useOfflineStore()
  const meetingStore = useMeetingStore()
  const votingStore = useVotingStore()
  const complianceStore = useComplianceStore()
  const documentStore = useDocumentStore()
  
  useEffect(() => {
    loadStorageInfo()
  }, [])
  
  const loadStorageInfo = async () => {
    try {
      const info = await offlineStore.actions.getStorageInfo()
      setStorageInfo(info)
    } catch (error) {
      console.error('Failed to load storage info:', error)
    }
  }
  
  const handleFullSync = async () => {
    try {
      await offlineStore.actions.startSync()
      await loadStorageInfo()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }
  
  const handleClearData = async () => {
    if (confirm('This will clear all offline data. Are you sure?')) {
      await offlineStore.actions.clearOfflineData()
      await loadStorageInfo()
    }
  }
  
  const handleOptimizeStorage = async () => {
    await offlineStore.actions.optimizeStorage()
    await loadStorageInfo()
  }
  
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }
  
  const getOfflineCapabilities = () => {
    const capabilities = []
    
    // Meeting capabilities
    if (meetingStore.offline.cached_meetings.length > 0) {
      capabilities.push({
        type: 'Meetings',
        icon: <Users className="h-4 w-4" />,
        count: meetingStore.offline.cached_meetings.length,
        pending: meetingStore.offline.sync_queue.length,
        conflicts: meetingStore.offline.conflicts.length
      })
    }
    
    // Document capabilities
    if (documentStore.offline.cached_documents.length > 0) {
      capabilities.push({
        type: 'Documents',
        icon: <FileText className="h-4 w-4" />,
        count: documentStore.offline.cached_documents.length,
        pending: documentStore.offline.pending_uploads.length + documentStore.offline.pending_annotations.length,
        conflicts: 0
      })
    }
    
    // Voting capabilities
    if (votingStore.offlineQueue.ballots.length > 0 || votingStore.offlineQueue.votes.length > 0) {
      capabilities.push({
        type: 'Voting',
        icon: <Vote className="h-4 w-4" />,
        count: votingStore.offlineQueue.ballots.length + votingStore.offlineQueue.votes.length,
        pending: votingStore.offlineQueue.ballots.length,
        conflicts: 0
      })
    }
    
    // Compliance capabilities
    if (complianceStore.offline.cached_frameworks.length > 0) {
      capabilities.push({
        type: 'Compliance',
        icon: <Shield className="h-4 w-4" />,
        count: complianceStore.offline.cached_frameworks.length,
        pending: complianceStore.offline.sync_queue.length,
        conflicts: complianceStore.offline.conflicts.length
      })
    }
    
    return capabilities
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'sync', label: 'Sync', icon: <RefreshCw className="h-4 w-4" /> },
    { id: 'cache', label: 'Cache', icon: <Database className="h-4 w-4" /> },
    { id: 'conflicts', label: 'Conflicts', icon: <AlertTriangle className="h-4 w-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> }
  ]
  
  return (
    <div className="bg-white rounded-lg shadow-lg border max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${offlineStore.offline.isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
            {offlineStore.offline.isOnline ? 
              <Wifi className="h-5 w-5 text-green-600" /> : 
              <WifiOff className="h-5 w-5 text-red-600" />
            }
          </div>
          <div>
            <h2 className="text-lg font-semibold">Offline Manager</h2>
            <p className="text-sm text-gray-500">
              {offlineStore.offline.isOnline ? 'Connected' : 'Offline Mode'}
              {offlineStore.offline.encryptionEnabled && ' • Encrypted'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFullSync}
            disabled={offlineStore.offline.syncInProgress || !offlineStore.offline.isOnline}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${offlineStore.offline.syncInProgress ? 'animate-spin' : ''}`} />
            <span>Sync All</span>
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <HardDrive className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium">Storage</h3>
                </div>
                <p className="text-2xl font-bold">
                  {storageInfo ? formatBytes(storageInfo.size) : '---'}
                </p>
                <p className="text-sm text-gray-500">
                  {storageInfo ? `${storageInfo.usage}` : 'Loading...'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <h3 className="font-medium">Last Sync</h3>
                </div>
                <p className="text-2xl font-bold">
                  {offlineStore.offline.lastSync ? 
                    new Date(offlineStore.offline.lastSync).toLocaleTimeString() : 
                    'Never'
                  }
                </p>
                <p className="text-sm text-gray-500">
                  {offlineStore.offline.queuedOperations} pending
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="font-medium">Status</h3>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {offlineStore.offline.isOnline ? 'Online' : 'Offline'}
                </p>
                <p className="text-sm text-gray-500">
                  Auto-sync {offlineStore.offline.autoSyncEnabled ? 'enabled' : 'disabled'}
                </p>
              </div>
            </div>
            
            {/* Offline Capabilities */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Offline Capabilities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getOfflineCapabilities().map((capability, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {capability.icon}
                      <h4 className="font-medium">{capability.type}</h4>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Cached:</span>
                        <div className="font-semibold">{capability.count}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Pending:</span>
                        <div className="font-semibold text-orange-600">{capability.pending}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Conflicts:</span>
                        <div className="font-semibold text-red-600">{capability.conflicts}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getOfflineCapabilities().length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No offline data cached</p>
                    <p className="text-sm">Download content to access offline</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Synchronization</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleFullSync}
                  disabled={offlineStore.offline.syncInProgress || !offlineStore.offline.isOnline}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {offlineStore.offline.syncInProgress ? 'Syncing...' : 'Sync All'}
                </button>
              </div>
            </div>
            
            {offlineStore.offline.syncProgress && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    Syncing {offlineStore.offline.syncProgress.entityType}
                  </span>
                  <span className="text-sm text-gray-600">
                    {offlineStore.offline.syncProgress.processed} / {offlineStore.offline.syncProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${offlineStore.offline.syncProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Pending Upload</h4>
                <div className="space-y-2">
                  {offlineStore.offline.queuedOperations === 0 ? (
                    <p className="text-gray-500 text-sm">No pending uploads</p>
                  ) : (
                    <p className="text-sm">{offlineStore.offline.queuedOperations} items in queue</p>
                  )}
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Auto Sync</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={offlineStore.offline.autoSyncEnabled}
                      onChange={(e) => offlineStore.actions.setAutoSync(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enable automatic sync</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'cache' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cache Management</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleOptimizeStorage}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Optimize
                </button>
                <button
                  onClick={handleClearData}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </button>
              </div>
            </div>
            
            {storageInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span>Storage Usage</span>
                  <span className="font-medium">{formatBytes(storageInfo.size)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: '60%' }} // Would calculate actual usage percentage
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Encryption: {offlineStore.offline.encryptionEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium">Cached Content</h4>
              {getOfflineCapabilities().map((capability, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    {capability.icon}
                    <span>{capability.type}</span>
                    <span className="text-sm text-gray-500">({capability.count} items)</span>
                  </div>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sync Conflicts</h3>
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No sync conflicts</p>
              <p className="text-sm">Conflicts will appear here when data changes conflict</p>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Offline Settings</h3>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Network</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={offlineStore.offline.autoSyncEnabled}
                      onChange={(e) => offlineStore.actions.setAutoSync(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Enable automatic sync when online</span>
                  </label>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => offlineStore.actions.setOnlineStatus(false)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        !offlineStore.offline.isOnline ? 'bg-red-100 text-red-700' : 'bg-gray-100'
                      }`}
                    >
                      Force Offline
                    </button>
                    <button
                      onClick={() => offlineStore.actions.setOnlineStatus(true)}
                      className={`px-3 py-2 rounded-md text-sm ${
                        offlineStore.offline.isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                      }`}
                    >
                      Force Online
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Storage</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Max Cache Size (MB)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="5000"
                      defaultValue="500"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600">
                      Encryption: {offlineStore.offline.encryptionEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}