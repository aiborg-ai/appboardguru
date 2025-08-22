'use client'

import React, { useState } from 'react'
import {
  Lock,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Shield,
  Globe,
  Users,
  FileText,
  Calendar,
  Cookie,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface PrivacySetting {
  id: string
  name: string
  description: string
  enabled: boolean
  level: 'public' | 'internal' | 'private'
  icon: React.ComponentType<any>
}

interface DataExportRequest {
  id: string
  type: string
  status: 'pending' | 'processing' | 'ready' | 'expired'
  requestDate: string
  expiryDate?: string
  downloadUrl?: string
}

export function PrivacyControls() {
  const [privacySettings, setPrivacySettings] = useState<PrivacySetting[]>([
    {
      id: 'profile_visibility',
      name: 'Profile Visibility',
      description: 'Who can see your profile information',
      enabled: true,
      level: 'internal',
      icon: Eye
    },
    {
      id: 'contact_sharing',
      name: 'Contact Information Sharing',
      description: 'Share contact details with other users',
      enabled: true,
      level: 'internal',
      icon: Users
    },
    {
      id: 'activity_tracking',
      name: 'Activity Tracking',
      description: 'Track and analyze your usage patterns',
      enabled: true,
      level: 'internal',
      icon: FileText
    },
    {
      id: 'calendar_visibility',
      name: 'Calendar Visibility',
      description: 'Show availability and meeting details',
      enabled: true,
      level: 'internal',
      icon: Calendar
    },
    {
      id: 'search_indexing',
      name: 'Search Indexing',
      description: 'Include your content in search results',
      enabled: true,
      level: 'internal',
      icon: Globe
    },
    {
      id: 'analytics_participation',
      name: 'Analytics Participation',
      description: 'Include your data in aggregated analytics',
      enabled: false,
      level: 'private',
      icon: Database
    }
  ])

  const [cookieSettings, setCookieSettings] = useState({
    essential: true,
    functional: true,
    analytics: false,
    marketing: false
  })

  const [dataRequests, setDataRequests] = useState<DataExportRequest[]>([
    {
      id: '1',
      type: 'Personal Data Export (GDPR)',
      status: 'ready',
      requestDate: '2024-01-20',
      expiryDate: '2024-01-27',
      downloadUrl: '#'
    },
    {
      id: '2',
      type: 'Activity History',
      status: 'processing',
      requestDate: '2024-01-22'
    }
  ])

  const [retentionSettings, setRetentionSettings] = useState({
    emailRetention: '7_years',
    documentRetention: '10_years',
    activityLogs: '2_years',
    autoDelete: false
  })

  const updatePrivacySetting = (settingId: string, field: string, value: any) => {
    setPrivacySettings(prev =>
      prev.map(setting =>
        setting.id === settingId
          ? { ...setting, [field]: value }
          : setting
      )
    )
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'public':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'internal':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'private':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'expired':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-100">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Data & Privacy Controls</h3>
            <p className="text-gray-600">Manage your privacy settings and data handling preferences</p>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Privacy Settings</h3>
          <p className="text-sm text-gray-600 mt-1">Control how your information is shared and used</p>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {privacySettings.map(setting => {
              const Icon = setting.icon
              return (
                <div key={setting.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{setting.name}</div>
                      <div className="text-sm text-gray-600">{setting.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <select
                      value={setting.level}
                      onChange={(e) => updatePrivacySetting(setting.id, 'level', e.target.value)}
                      className="text-sm px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="public">Public</option>
                      <option value="internal">Internal Only</option>
                      <option value="private">Private</option>
                    </select>
                    
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(setting.level)}`}>
                      {setting.level}
                    </span>
                    
                    <button
                      onClick={() => updatePrivacySetting(setting.id, 'enabled', !setting.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        setting.enabled ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          setting.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Cookie Preferences */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Cookie className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Cookie Preferences</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Essential Cookies</div>
                <div className="text-sm text-gray-600">Required for basic site functionality</div>
              </div>
              <div className="text-sm text-gray-500">Always Active</div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Functional Cookies</div>
                <div className="text-sm text-gray-600">Enable enhanced features and personalization</div>
              </div>
              <button
                onClick={() => setCookieSettings(prev => ({ ...prev, functional: !prev.functional }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  cookieSettings.functional ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    cookieSettings.functional ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Analytics Cookies</div>
                <div className="text-sm text-gray-600">Help us understand how you use our services</div>
              </div>
              <button
                onClick={() => setCookieSettings(prev => ({ ...prev, analytics: !prev.analytics }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  cookieSettings.analytics ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    cookieSettings.analytics ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">Marketing Cookies</div>
                <div className="text-sm text-gray-600">Used to deliver relevant advertisements</div>
              </div>
              <button
                onClick={() => setCookieSettings(prev => ({ ...prev, marketing: !prev.marketing }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  cookieSettings.marketing ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    cookieSettings.marketing ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Export & Requests */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Data Export & Requests</h3>
            </div>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Request Data Export
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {dataRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(request.status)}
                  <div>
                    <div className="font-medium text-gray-900">{request.type}</div>
                    <div className="text-sm text-gray-600">
                      Requested: {request.requestDate}
                      {request.expiryDate && ` • Expires: ${request.expiryDate}`}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                  {request.status === 'ready' && request.downloadUrl && (
                    <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                      Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Data Export Information</h4>
                <div className="mt-1 text-sm text-blue-800">
                  <p>• Personal data exports include profile, preferences, and activity history</p>
                  <p>• Exports are available for 7 days after processing</p>
                  <p>• Large exports may take up to 48 hours to process</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">Data Retention Settings</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Retention Period
              </label>
              <select
                value={retentionSettings.emailRetention}
                onChange={(e) => setRetentionSettings(prev => ({ ...prev, emailRetention: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="1_year">1 Year</option>
                <option value="3_years">3 Years</option>
                <option value="7_years">7 Years (Recommended)</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Retention Period
              </label>
              <select
                value={retentionSettings.documentRetention}
                onChange={(e) => setRetentionSettings(prev => ({ ...prev, documentRetention: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="5_years">5 Years</option>
                <option value="10_years">10 Years (Recommended)</option>
                <option value="15_years">15 Years</option>
                <option value="indefinite">Indefinite</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Log Retention
              </label>
              <select
                value={retentionSettings.activityLogs}
                onChange={(e) => setRetentionSettings(prev => ({ ...prev, activityLogs: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="6_months">6 Months</option>
                <option value="1_year">1 Year</option>
                <option value="2_years">2 Years (Recommended)</option>
                <option value="5_years">5 Years</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoDelete"
                checked={retentionSettings.autoDelete}
                onChange={(e) => setRetentionSettings(prev => ({ ...prev, autoDelete: e.target.checked }))}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="autoDelete" className="text-sm text-gray-700">
                Automatically delete expired data
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900">Account Deletion</h4>
            <p className="text-sm text-red-800 mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="mt-3">
              <button className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                Request Account Deletion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right to be Forgotten */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">GDPR Rights</h4>
              <p className="text-sm text-gray-600">Exercise your data protection rights</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
              Data Portability
            </button>
            <button className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
              Right to be Forgotten
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}