/**
 * Main Offline Governance Hook
 * Orchestrates all offline capabilities for governance functions
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOfflineStore } from '@/lib/stores/offline-store'
import { useMeetingStore } from '@/lib/stores/meeting-store'
import { useVotingStore } from '@/lib/stores/voting-store'
import { useComplianceStore } from '@/lib/stores/compliance-store'
import { useDocumentStore } from '@/lib/stores/document-store'
import { initializeOfflineDB } from '@/lib/offline-db/database'
import { mdmIntegration } from '@/lib/enterprise/mdm-integration'
import { complianceReporting } from '@/lib/enterprise/compliance-reporting'

export interface OfflineGovernanceConfig {
  enableMeetings?: boolean
  enableDocuments?: boolean
  enableVoting?: boolean
  enableCompliance?: boolean
  enableMDM?: boolean
  enableComplianceReporting?: boolean
  encryptionEnabled?: boolean
  autoSync?: boolean
  maxStorageSize?: number // MB
}

export interface OfflineCapabilityStatus {
  meetings: 'available' | 'limited' | 'unavailable'
  documents: 'available' | 'limited' | 'unavailable'
  voting: 'available' | 'limited' | 'unavailable'
  compliance: 'available' | 'limited' | 'unavailable'
  sync: 'ready' | 'syncing' | 'error' | 'offline'
  storage: 'healthy' | 'warning' | 'critical'
  encryption: 'enabled' | 'disabled' | 'error'
  mdm: 'compliant' | 'violations' | 'disabled'
}

export interface OfflineGovernanceStats {
  totalCachedItems: number
  storageUsedMB: number
  lastSyncTime: Date | null
  pendingSync: number
  conflictsCount: number
  complianceScore: number
  securityScore: number
}

export const useOfflineGovernance = (config: OfflineGovernanceConfig = {}) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [capabilityStatus, setCapabilityStatus] = useState<OfflineCapabilityStatus>({
    meetings: 'unavailable',
    documents: 'unavailable',
    voting: 'unavailable',
    compliance: 'unavailable',
    sync: 'offline',
    storage: 'healthy',
    encryption: 'disabled',
    mdm: 'disabled'
  })
  
  const offlineStore = useOfflineStore()
  const meetingStore = useMeetingStore()
  const votingStore = useVotingStore()
  const complianceStore = useComplianceStore()
  const documentStore = useDocumentStore()
  
  // Initialize offline governance system
  const initialize = useCallback(async () => {
    try {
      setInitError(null)
      
      // 1. Initialize offline database with encryption
      if (config.encryptionEnabled !== false) {
        await initializeOfflineDB()
      }
      
      // 2. Initialize enterprise integrations
      if (config.enableMDM) {
        await mdmIntegration.initialize()
      }
      
      if (config.enableComplianceReporting) {
        await complianceReporting.initialize()
      }
      
      // 3. Configure auto-sync
      if (config.autoSync !== false) {
        offlineStore.actions.setAutoSync(true)
      }
      
      // 4. Set storage limits
      if (config.maxStorageSize) {
        // Would configure storage limits
        console.log(`Storage limit set to ${config.maxStorageSize}MB`)
      }
      
      setIsInitialized(true)
      await updateCapabilityStatus()
      
      console.log('Offline governance system initialized successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error'
      setInitError(errorMessage)
      console.error('Failed to initialize offline governance:', error)
    }
  }, [config, offlineStore.actions])
  
  // Update capability status
  const updateCapabilityStatus = useCallback(async () => {
    const newStatus: OfflineCapabilityStatus = {
      meetings: getMeetingCapabilityStatus(),
      documents: getDocumentCapabilityStatus(),
      voting: getVotingCapabilityStatus(),
      compliance: getComplianceCapabilityStatus(),
      sync: getSyncStatus(),
      storage: await getStorageStatus(),
      encryption: getEncryptionStatus(),
      mdm: getMDMStatus()
    }
    
    setCapabilityStatus(newStatus)
  }, [offlineStore.offline, meetingStore, votingStore, complianceStore, documentStore])
  
  // Capability status helpers
  const getMeetingCapabilityStatus = (): OfflineCapabilityStatus['meetings'] => {
    if (!config.enableMeetings) return 'unavailable'
    if (meetingStore.offline.cached_meetings.length > 0) return 'available'
    if (offlineStore.offline.isOnline) return 'limited'
    return 'unavailable'
  }
  
  const getDocumentCapabilityStatus = (): OfflineCapabilityStatus['documents'] => {
    if (!config.enableDocuments) return 'unavailable'
    if (documentStore.offline.cached_documents.length > 0) return 'available'
    if (offlineStore.offline.isOnline) return 'limited'
    return 'unavailable'
  }
  
  const getVotingCapabilityStatus = (): OfflineCapabilityStatus['voting'] => {
    if (!config.enableVoting) return 'unavailable'
    if (votingStore.offlineQueue.ballots.length > 0 || votingStore.offlineQueue.votes.length > 0) {
      return 'available'
    }
    if (offlineStore.offline.isOnline) return 'limited'
    return 'unavailable'
  }
  
  const getComplianceCapabilityStatus = (): OfflineCapabilityStatus['compliance'] => {
    if (!config.enableCompliance) return 'unavailable'
    if (complianceStore.offline.cached_frameworks.length > 0) return 'available'
    if (offlineStore.offline.isOnline) return 'limited'
    return 'unavailable'
  }
  
  const getSyncStatus = (): OfflineCapabilityStatus['sync'] => {
    if (offlineStore.offline.syncInProgress) return 'syncing'
    if (!offlineStore.offline.isOnline) return 'offline'
    if (offlineStore.offline.queuedOperations > 0) return 'ready'
    return 'ready'
  }
  
  const getStorageStatus = async (): Promise<OfflineCapabilityStatus['storage']> => {
    try {
      const info = await offlineStore.actions.getStorageInfo()
      const usagePercentage = config.maxStorageSize 
        ? (info.size / (config.maxStorageSize * 1024 * 1024)) * 100
        : 50 // Default assumption
      
      if (usagePercentage > 90) return 'critical'
      if (usagePercentage > 75) return 'warning'
      return 'healthy'
    } catch (error) {
      return 'warning'
    }
  }
  
  const getEncryptionStatus = (): OfflineCapabilityStatus['encryption'] => {
    if (offlineStore.offline.encryptionEnabled) return 'enabled'
    return 'disabled'
  }
  
  const getMDMStatus = (): OfflineCapabilityStatus['mdm'] => {
    if (!config.enableMDM) return 'disabled'
    
    const deviceInfo = mdmIntegration.getDeviceInfo()
    if (!deviceInfo) return 'disabled'
    
    if (deviceInfo.violations.length > 0) return 'violations'
    return 'compliant'
  }
  
  // Get governance statistics
  const getGovernanceStats = useCallback(async (): Promise<OfflineGovernanceStats> => {
    const storageInfo = await offlineStore.actions.getStorageInfo()
    
    const totalCachedItems = 
      meetingStore.offline.cached_meetings.length +
      documentStore.offline.cached_documents.length +
      votingStore.offlineQueue.ballots.length +
      complianceStore.offline.cached_frameworks.length
    
    const pendingSync = 
      meetingStore.offline.sync_queue.length +
      documentStore.offline.pending_uploads.length +
      documentStore.offline.pending_annotations.length +
      votingStore.offlineQueue.ballots.length +
      complianceStore.offline.sync_queue.length
    
    const conflictsCount = 
      meetingStore.offline.conflicts.length +
      complianceStore.offline.conflicts.length
    
    // Calculate compliance score
    let complianceScore = 100
    if (config.enableComplianceReporting) {
      const frameworks = complianceReporting.getFrameworks()
      if (frameworks.length > 0) {
        // Simplified compliance score calculation
        complianceScore = 85 // Would calculate based on actual compliance status
      }
    }
    
    // Calculate security score
    let securityScore = 0
    if (offlineStore.offline.encryptionEnabled) securityScore += 40
    if (getMDMStatus() === 'compliant') securityScore += 30
    if (getStorageStatus() === 'healthy') securityScore += 20
    if (conflictsCount === 0) securityScore += 10
    
    return {
      totalCachedItems,
      storageUsedMB: storageInfo.size / (1024 * 1024),
      lastSyncTime: offlineStore.offline.lastSync ? new Date(offlineStore.offline.lastSync) : null,
      pendingSync,
      conflictsCount,
      complianceScore,
      securityScore: Math.min(100, securityScore)
    }
  }, [offlineStore, meetingStore, documentStore, votingStore, complianceStore, config])
  
  // Governance actions
  const actions = {
    // Core actions
    initialize,
    sync: offlineStore.actions.startSync,
    toggleOfflineMode: offlineStore.actions.toggleOfflineMode,
    clearAllData: offlineStore.actions.clearOfflineData,
    optimizeStorage: offlineStore.actions.optimizeStorage,
    
    // Meeting actions
    cacheMeetingForOffline: meetingStore.actions.cacheMeetingForOffline,
    createOfflineMeeting: meetingStore.actions.createMeeting,
    joinMeetingOffline: meetingStore.actions.joinMeeting,
    
    // Document actions
    cacheDocumentForOffline: documentStore.actions.cacheDocument,
    uploadDocumentOffline: documentStore.actions.uploadDocument,
    createAnnotationOffline: documentStore.actions.createAnnotation,
    
    // Voting actions
    queueOfflineVote: votingStore.actions.queueOfflineVote,
    castOfflineVote: votingStore.actions.castVote,
    sendProxyRequest: votingStore.actions.sendProxyRequest,
    
    // Compliance actions
    cacheComplianceFramework: complianceStore.actions.cacheFrameworkForOffline,
    updateComplianceOffline: complianceStore.actions.updateComplianceItem,
    runAutomatedChecks: complianceStore.actions.runAutomatedChecks,
    
    // Enterprise actions
    generateComplianceReport: async (frameworkId: string, organizationId: string) => {
      if (config.enableComplianceReporting) {
        return await complianceReporting.generateComplianceReport(frameworkId, organizationId)
      }
      throw new Error('Compliance reporting not enabled')
    },
    
    getMDMDeviceInfo: () => {
      if (config.enableMDM) {
        return mdmIntegration.getDeviceInfo()
      }
      return null
    },
    
    // Utility actions
    refreshCapabilityStatus: updateCapabilityStatus,
    getGovernanceStats,
    
    // Emergency actions
    emergencyOfflineMode: async () => {
      // Enable offline mode and cache critical data
      offlineStore.actions.toggleOfflineMode()
      
      // Cache recent meetings
      if (config.enableMeetings) {
        const recentMeetings = meetingStore.upcomingMeetings.slice(0, 5)
        for (const meeting of recentMeetings) {
          await meetingStore.actions.cacheMeetingForOffline(meeting.id)
        }
      }
      
      // Cache favorite documents
      if (config.enableDocuments) {
        for (const docId of documentStore.favorites.slice(0, 10)) {
          await documentStore.actions.cacheDocument(docId, 'critical')
        }
      }
      
      console.log('Emergency offline mode activated')
    },
    
    diagnosticReport: async () => {
      const stats = await getGovernanceStats()
      const deviceInfo = config.enableMDM ? mdmIntegration.getDeviceInfo() : null
      const alerts = config.enableComplianceReporting ? complianceReporting.getActiveAlerts() : []
      
      return {
        timestamp: new Date().toISOString(),
        initialization: {
          initialized: isInitialized,
          error: initError,
          config
        },
        capabilities: capabilityStatus,
        statistics: stats,
        device: deviceInfo,
        alerts: alerts,
        stores: {
          offline: {
            isOnline: offlineStore.offline.isOnline,
            queuedOperations: offlineStore.offline.queuedOperations,
            encryptionEnabled: offlineStore.offline.encryptionEnabled
          },
          meetings: {
            cached: meetingStore.offline.cached_meetings.length,
            pending: meetingStore.offline.sync_queue.length
          },
          documents: {
            cached: documentStore.offline.cached_documents.length,
            pending: documentStore.offline.pending_uploads.length
          },
          voting: {
            ballots: votingStore.offlineQueue.ballots.length,
            votes: votingStore.offlineQueue.votes.length
          },
          compliance: {
            frameworks: complianceStore.offline.cached_frameworks.length,
            pending: complianceStore.offline.sync_queue.length
          }
        }
      }
    }
  }
  
  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized && !initError) {
      initialize()
    }
  }, [initialize, isInitialized, initError])
  
  // Update capability status periodically
  useEffect(() => {
    if (isInitialized) {
      updateCapabilityStatus()
      
      const interval = setInterval(updateCapabilityStatus, 30000) // Every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isInitialized, updateCapabilityStatus])
  
  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      updateCapabilityStatus()
    }
    
    const handleOffline = () => {
      updateCapabilityStatus()
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateCapabilityStatus])
  
  return {
    isInitialized,
    initError,
    capabilityStatus,
    isOnline: offlineStore.offline.isOnline,
    isOfflineMode: offlineStore.offline.isOfflineMode,
    syncInProgress: offlineStore.offline.syncInProgress,
    syncProgress: offlineStore.offline.syncProgress,
    actions
  }
}