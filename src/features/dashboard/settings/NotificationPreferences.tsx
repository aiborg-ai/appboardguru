'use client'

import React, { useState } from 'react'
import {
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  Calendar,
  FileText,
  Users,
  Shield,
  AlertTriangle,
  Settings,
  Clock,
  Moon,
  CheckCircle,
  Volume2,
  VolumeX
} from 'lucide-react'

interface NotificationCategory {
  id: string
  name: string
  description: string
  icon: React.ComponentType<any>
  channels: NotificationChannel[]
  priority: 'high' | 'medium' | 'low'
}

interface NotificationChannel {
  id: string
  name: string
  enabled: boolean
  icon: React.ComponentType<any>
  frequency: 'immediate' | 'digest' | 'weekly' | 'disabled'
}

interface QuietHours {
  enabled: boolean
  startTime: string
  endTime: string
  timezone: string
  weekendsIncluded: boolean
}

export function NotificationPreferences() {
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'meetings',
      name: 'Meetings & Calendar',
      description: 'Meeting invites, updates, and reminders',
      icon: Calendar,
      priority: 'high',
      channels: [
        { id: 'email', name: 'Email', enabled: true, icon: Mail, frequency: 'immediate' },
        { id: 'push', name: 'Push Notification', enabled: true, icon: Bell, frequency: 'immediate' },
        { id: 'sms', name: 'SMS', enabled: false, icon: Smartphone, frequency: 'immediate' },
        { id: 'teams', name: 'Teams/Slack', enabled: true, icon: MessageCircle, frequency: 'immediate' }
      ]
    },
    {
      id: 'documents',
      name: 'Documents & Assets',
      description: 'Document sharing, comments, and approvals',
      icon: FileText,
      priority: 'medium',
      channels: [
        { id: 'email', name: 'Email', enabled: true, icon: Mail, frequency: 'digest' },
        { id: 'push', name: 'Push Notification', enabled: true, icon: Bell, frequency: 'immediate' },
        { id: 'sms', name: 'SMS', enabled: false, icon: Smartphone, frequency: 'disabled' },
        { id: 'teams', name: 'Teams/Slack', enabled: false, icon: MessageCircle, frequency: 'disabled' }
      ]
    },
    {
      id: 'compliance',
      name: 'Compliance & Governance',
      description: 'Deadlines, policy updates, and regulatory alerts',
      icon: Shield,
      priority: 'high',
      channels: [
        { id: 'email', name: 'Email', enabled: true, icon: Mail, frequency: 'immediate' },
        { id: 'push', name: 'Push Notification', enabled: true, icon: Bell, frequency: 'immediate' },
        { id: 'sms', name: 'SMS', enabled: true, icon: Smartphone, frequency: 'immediate' },
        { id: 'teams', name: 'Teams/Slack', enabled: true, icon: MessageCircle, frequency: 'immediate' }
      ]
    },
    {
      id: 'security',
      name: 'Security Alerts',
      description: 'Login attempts, suspicious activity, and breaches',
      icon: AlertTriangle,
      priority: 'high',
      channels: [
        { id: 'email', name: 'Email', enabled: true, icon: Mail, frequency: 'immediate' },
        { id: 'push', name: 'Push Notification', enabled: true, icon: Bell, frequency: 'immediate' },
        { id: 'sms', name: 'SMS', enabled: true, icon: Smartphone, frequency: 'immediate' },
        { id: 'teams', name: 'Teams/Slack', enabled: false, icon: MessageCircle, frequency: 'disabled' }
      ]
    },
    {
      id: 'team',
      name: 'Team & Collaboration',
      description: 'Team updates, mentions, and collaboration requests',
      icon: Users,
      priority: 'medium',
      channels: [
        { id: 'email', name: 'Email', enabled: false, icon: Mail, frequency: 'weekly' },
        { id: 'push', name: 'Push Notification', enabled: true, icon: Bell, frequency: 'immediate' },
        { id: 'sms', name: 'SMS', enabled: false, icon: Smartphone, frequency: 'disabled' },
        { id: 'teams', name: 'Teams/Slack', enabled: true, icon: MessageCircle, frequency: 'immediate' }
      ]
    },
    {
      id: 'system',
      name: 'System & Maintenance',
      description: 'System updates, maintenance, and announcements',
      icon: Settings,
      priority: 'low',
      channels: [
        { id: 'email', name: 'Email', enabled: true, icon: Mail, frequency: 'digest' },
        { id: 'push', name: 'Push Notification', enabled: false, icon: Bell, frequency: 'disabled' },
        { id: 'sms', name: 'SMS', enabled: false, icon: Smartphone, frequency: 'disabled' },
        { id: 'teams', name: 'Teams/Slack', enabled: false, icon: MessageCircle, frequency: 'disabled' }
      ]
    }
  ])

  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: true,
    startTime: '18:00',
    endTime: '08:00',
    timezone: 'America/New_York',
    weekendsIncluded: true
  })

  const [globalSettings, setGlobalSettings] = useState({
    soundEnabled: true,
    digestTime: '09:00',
    emergencyOverride: true,
    executiveDigest: true
  })

  const updateChannelSetting = (categoryId: string, channelId: string, field: string, value: any) => {
    setCategories(prev => 
      prev.map(category => 
        category.id === categoryId
          ? {
              ...category,
              channels: category.channels.map(channel =>
                channel.id === channelId
                  ? { ...channel, [field]: value }
                  : channel
              )
            }
          : category
      )
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'low':
        return 'border-green-200 bg-green-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'immediate':
        return 'bg-blue-100 text-blue-800'
      case 'digest':
        return 'bg-purple-100 text-purple-800'
      case 'weekly':
        return 'bg-green-100 text-green-800'
      case 'disabled':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Bell className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Notification Preferences</h3>
            <p className="text-gray-600">Customize how and when you receive notifications</p>
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Global Settings</h3>
          <p className="text-sm text-gray-600 mt-1">General notification preferences</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {globalSettings.soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-gray-600" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-gray-600" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">Sound Notifications</div>
                    <div className="text-sm text-gray-600">Play sounds for notifications</div>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    globalSettings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      globalSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Emergency Override</div>
                    <div className="text-sm text-gray-600">Override quiet hours for urgent alerts</div>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalSettings(prev => ({ ...prev, emergencyOverride: !prev.emergencyOverride }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    globalSettings.emergencyOverride ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      globalSettings.emergencyOverride ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Digest Time
                </label>
                <select
                  value={globalSettings.digestTime}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, digestTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="07:00">7:00 AM</option>
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium text-gray-900">Executive Digest</div>
                    <div className="text-sm text-gray-600">Daily executive summary email</div>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalSettings(prev => ({ ...prev, executiveDigest: !prev.executiveDigest }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    globalSettings.executiveDigest ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      globalSettings.executiveDigest ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Moon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Do Not Disturb</h3>
            </div>
            <button
              onClick={() => setQuietHours(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        {quietHours.enabled && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={quietHours.startTime}
                  onChange={(e) => setQuietHours(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={quietHours.endTime}
                  onChange={(e) => setQuietHours(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-2">
              <input
                type="checkbox"
                id="weekends"
                checked={quietHours.weekendsIncluded}
                onChange={(e) => setQuietHours(prev => ({ ...prev, weekendsIncluded: e.target.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="weekends" className="text-sm text-gray-700">
                Include weekends
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Notification Categories */}
      <div className="space-y-4">
        {categories.map(category => {
          const Icon = category.icon
          return (
            <div key={category.id} className={`border rounded-lg ${getPriorityColor(category.priority)}`}>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">{category.name}</h4>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    category.priority === 'high' ? 'bg-red-100 text-red-800' :
                    category.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {category.priority} priority
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {category.channels.map(channel => {
                    const ChannelIcon = channel.icon
                    return (
                      <div key={channel.id} className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <ChannelIcon className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateChannelSetting(category.id, channel.id, 'enabled', !channel.enabled)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              channel.enabled ? 'bg-blue-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                channel.enabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        
                        {channel.enabled && (
                          <select
                            value={channel.frequency}
                            onChange={(e) => updateChannelSetting(category.id, channel.id, 'frequency', e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="immediate">Immediate</option>
                            <option value="digest">Daily Digest</option>
                            <option value="weekly">Weekly</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        )}
                        
                        <div className={`text-xs px-2 py-1 rounded text-center ${getFrequencyColor(channel.frequency)}`}>
                          {channel.frequency}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Quick Actions</h4>
            <p className="text-sm text-gray-600">Common notification settings</p>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
              Disable All
            </button>
            <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
              Enable High Priority Only
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}