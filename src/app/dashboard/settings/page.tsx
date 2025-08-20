'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AISettingsPanel } from '@/components/settings/AISettingsPanel'
import { 
  Settings, 
  Brain, 
  User, 
  Shield, 
  Bell, 
  Download,
  Upload
} from 'lucide-react'

type SettingsTab = 'ai' | 'account' | 'security' | 'notifications' | 'export'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  const tabs = [
    { id: 'ai' as const, label: 'AI Assistant', icon: Brain, color: 'text-purple-600' },
    { id: 'account' as const, label: 'Account', icon: User, color: 'text-blue-600' },
    { id: 'security' as const, label: 'Security', icon: Shield, color: 'text-green-600' },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, color: 'text-yellow-600' },
    { id: 'export' as const, label: 'Export & Backup', icon: Download, color: 'text-gray-600' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AISettingsPanel />
      
      case 'account':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Account Settings</h3>
            <p className="text-gray-600">Profile and account management features coming soon.</p>
          </div>
        )
      
      case 'security':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Security Settings</h3>
            <p className="text-gray-600">Security and privacy settings coming soon.</p>
          </div>
        )
      
      case 'notifications':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Notification Settings</h3>
            <p className="text-gray-600">Notification preferences coming soon.</p>
          </div>
        )
      
      case 'export':
        return (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Download className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Export & Backup</h3>
            <p className="text-gray-600">Data export and backup features coming soon.</p>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-8 w-8 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and application preferences</p>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Settings Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <nav className="space-y-1 p-2">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700' : tab.color}`} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>
          
          {/* Settings Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}