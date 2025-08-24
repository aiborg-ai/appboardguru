/**
 * Offline Governance Dashboard
 * Comprehensive demo of offline governance capabilities
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield, Users, FileText, Vote, AlertTriangle, CheckCircle,
  Wifi, WifiOff, Download, Upload, Settings, Activity,
  Clock, HardDrive, Lock, Smartphone, BarChart3, RefreshCw
} from 'lucide-react'
import { useOfflineGovernance } from '@/hooks/useOfflineGovernance'
import { OfflineStatusBar } from './OfflineStatusBar'
import { OfflineManager } from './OfflineManager'
import { PerformanceMonitor } from './PerformanceMonitor'

export const OfflineGovernanceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'meeting' | 'documents' | 'voting' | 'compliance' | 'performance'>('overview')
  const [showManager, setShowManager] = useState(false)
  const [stats, setStats] = useState<any>(null)
  
  const {
    isInitialized,
    initError,
    capabilityStatus,
    isOnline,
    isOfflineMode,
    syncInProgress,
    syncProgress,
    actions
  } = useOfflineGovernance({
    enableMeetings: true,
    enableDocuments: true,
    enableVoting: true,
    enableCompliance: true,
    enableMDM: true,
    enableComplianceReporting: true,
    encryptionEnabled: true,
    autoSync: true,
    maxStorageSize: 1000
  })
  
  useEffect(() => {
    if (isInitialized) {
      loadStats()
    }
  }, [isInitialized, actions])
  
  const loadStats = async () => {
    try {
      const governanceStats = await actions.getGovernanceStats()
      setStats(governanceStats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }
  
  const handleEmergencyOffline = async () => {
    if (confirm('This will activate emergency offline mode and cache critical data. Continue?')) {
      await actions.emergencyOfflineMode()
      await loadStats()
    }
  }
  
  const handleDiagnosticReport = async () => {
    const report = await actions.diagnosticReport()
    console.log('Diagnostic Report:', report)
    
    // In production, would download as file
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `offline-governance-diagnostic-${new Date().getTime()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const getCapabilityIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'limited': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'unavailable': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'ready': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'syncing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      case 'offline': return <WifiOff className="h-4 w-4 text-red-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'enabled': return <Lock className="h-4 w-4 text-green-600" />
      case 'disabled': return <Lock className="h-4 w-4 text-gray-400" />
      case 'compliant': return <Shield className="h-4 w-4 text-green-600" />
      case 'violations': return <Shield className="h-4 w-4 text-red-600" />
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }
  
  const renderCapabilityCard = (title: string, icon: React.ReactNode, status: string, description: string) => (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="font-medium">{title}</h3>
        </div>
        {getCapabilityIcon(status)}
      </div>
      <p className="text-sm text-gray-600">{description}</p>
      <div className="mt-2">
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'available' || status === 'ready' || status === 'healthy' || status === 'enabled' || status === 'compliant'
            ? 'bg-green-100 text-green-700'
            : status === 'limited' || status === 'warning'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        }`}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </span>
      </div>
    </div>
  )
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="text-center">
            {initError ? (
              <>
                <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-red-900 mb-2">Initialization Failed</h2>
                <p className="text-red-700 mb-4">{initError}</p>
                <button
                  onClick={actions.initialize}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Retry Initialization
                </button>
              </>
            ) : (
              <>
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing Offline Governance</h2>
                <p className="text-gray-600">Setting up offline database, encryption, and enterprise integrations...</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Offline Governance System</h1>
                <p className="text-sm text-gray-600">Enterprise board management with offline capabilities</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <OfflineStatusBar showDetails />
              
              <button
                onClick={() => setShowManager(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-1"
              >
                <Settings className="h-4 w-4" />
                <span>Manage</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
            { id: 'meeting', label: 'Meetings', icon: <Users className="h-4 w-4" /> },
            { id: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
            { id: 'voting', label: 'Voting', icon: <Vote className="h-4 w-4" /> },
            { id: 'compliance', label: 'Compliance', icon: <Shield className="h-4 w-4" /> },
            { id: 'performance', label: 'Performance', icon: <Activity className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <HardDrive className="h-5 w-5 text-gray-600" />
                    <h3 className="font-medium">Cached Items</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalCachedItems}</p>
                  <p className="text-sm text-gray-500">Available offline</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="h-5 w-5 text-gray-600" />
                    <h3 className="font-medium">Storage Used</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.storageUsedMB.toFixed(1)} MB
                  </p>
                  <p className="text-sm text-gray-500">Encrypted storage</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="h-5 w-5 text-gray-600" />
                    <h3 className="font-medium">Last Sync</h3>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {stats.lastSyncTime ? new Date(stats.lastSyncTime).toLocaleTimeString() : 'Never'}
                  </p>
                  <p className="text-sm text-gray-500">{stats.pendingSync} pending</p>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <h3 className="font-medium">Compliance</h3>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{stats.complianceScore}%</p>
                  <p className="text-sm text-gray-500">Security: {stats.securityScore}%</p>
                </div>
              </div>
            )}
            
            {/* Capability Status */}
            <div>
              <h2 className="text-lg font-semibold mb-4">System Capabilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderCapabilityCard(
                  'Meetings',
                  <Users className="h-5 w-5 text-blue-600" />,
                  capabilityStatus.meetings,
                  'Offline meeting participation and management'
                )}
                
                {renderCapabilityCard(
                  'Documents',
                  <FileText className="h-5 w-5 text-green-600" />,
                  capabilityStatus.documents,
                  'Document access and annotation offline'
                )}
                
                {renderCapabilityCard(
                  'Voting',
                  <Vote className="h-5 w-5 text-purple-600" />,
                  capabilityStatus.voting,
                  'Cast votes and manage proxies offline'
                )}
                
                {renderCapabilityCard(
                  'Compliance',
                  <Shield className="h-5 w-5 text-red-600" />,
                  capabilityStatus.compliance,
                  'Compliance monitoring and reporting'
                )}
              </div>
            </div>
            
            {/* System Status */}
            <div>
              <h2 className="text-lg font-semibold mb-4">System Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {renderCapabilityCard(
                  'Sync Engine',
                  <RefreshCw className="h-5 w-5 text-blue-600" />,
                  capabilityStatus.sync,
                  'Data synchronization status'
                )}
                
                {renderCapabilityCard(
                  'Storage',
                  <HardDrive className="h-5 w-5 text-green-600" />,
                  capabilityStatus.storage,
                  'Local storage health and usage'
                )}
                
                {renderCapabilityCard(
                  'Encryption',
                  <Lock className="h-5 w-5 text-yellow-600" />,
                  capabilityStatus.encryption,
                  'Data encryption and security'
                )}
                
                {renderCapabilityCard(
                  'MDM Compliance',
                  <Smartphone className="h-5 w-5 text-purple-600" />,
                  capabilityStatus.mdm,
                  'Mobile device management status'
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={actions.sync}
                  disabled={syncInProgress || !isOnline}
                  className="p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RefreshCw className={`h-5 w-5 text-blue-600 ${syncInProgress ? 'animate-spin' : ''}`} />
                    <span className="font-medium">Sync All Data</span>
                  </div>
                  <p className="text-sm text-gray-600">Synchronize all offline changes</p>
                </button>
                
                <button
                  onClick={handleEmergencyOffline}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Emergency Offline</span>
                  </div>
                  <p className="text-sm text-gray-600">Cache critical data for offline use</p>
                </button>
                
                <button
                  onClick={handleDiagnosticReport}
                  className="p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Download className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Diagnostic Report</span>
                  </div>
                  <p className="text-sm text-gray-600">Export system diagnostic data</p>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <PerformanceMonitor showDetailedMetrics autoRefresh />
        )}
        
        {/* Other tabs would have their specific content */}
        {activeTab !== 'overview' && activeTab !== 'performance' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="mb-4">
              {activeTab === 'meeting' && <Users className="h-12 w-12 text-blue-600 mx-auto" />}
              {activeTab === 'documents' && <FileText className="h-12 w-12 text-green-600 mx-auto" />}
              {activeTab === 'voting' && <Vote className="h-12 w-12 text-purple-600 mx-auto" />}
              {activeTab === 'compliance' && <Shield className="h-12 w-12 text-red-600 mx-auto" />}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
            </h2>
            <p className="text-gray-600 mb-4">
              This section would contain specific {activeTab} management interfaces and offline capabilities.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Available Offline Features:</h3>
              <ul className="text-sm text-gray-600 space-y-1 text-left max-w-md mx-auto">
                {activeTab === 'meeting' && (
                  <>
                    <li>• View meeting agendas and documents</li>
                    <li>• Take meeting notes and action items</li>
                    <li>• Cast votes in critical decisions</li>
                    <li>• Access participant lists and roles</li>
                  </>
                )}
                {activeTab === 'documents' && (
                  <>
                    <li>• Read board documents and reports</li>
                    <li>• Make annotations and comments</li>
                    <li>• Review previous meeting minutes</li>
                    <li>• Search cached documents</li>
                  </>
                )}
                {activeTab === 'voting' && (
                  <>
                    <li>• Cast votes for resolutions offline</li>
                    <li>• Review voting history and decisions</li>
                    <li>• Manage proxy voting delegations</li>
                    <li>• Emergency voting procedures</li>
                  </>
                )}
                {activeTab === 'compliance' && (
                  <>
                    <li>• Review compliance requirements</li>
                    <li>• Access audit trails and reports</li>
                    <li>• Update compliance status</li>
                    <li>• Generate compliance reports</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
      
      {/* Offline Manager Modal */}
      {showManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <OfflineManager onClose={() => setShowManager(false)} />
        </div>
      )}
    </div>
  )
}