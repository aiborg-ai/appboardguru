'use client'

import React, { useState } from 'react'
import { Activity, Info } from 'lucide-react'
import { ActivityLogsTab } from './ActivityLogsTab'
import { FYITab } from './FYITab'
import { FYIErrorBoundary } from '@/components/ErrorBoundary'

type SecurityTab = 'activity' | 'fyi'

export function SecurityActivityPanel() {
  const [activeTab, setActiveTab] = useState<SecurityTab>('activity')

  const tabs = [
    { 
      id: 'activity' as const, 
      label: 'Activity Log', 
      icon: Activity, 
      description: 'View your account activity history' 
    },
    { 
      id: 'fyi' as const, 
      label: 'FYI', 
      icon: Info, 
      description: 'Context-aware insights and external information' 
    }
  ]

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
        
        {/* Tab description */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <p className="text-xs text-gray-600">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'activity' && <ActivityLogsTab />}
        {activeTab === 'fyi' && (
          <FYIErrorBoundary>
            <FYITab />
          </FYIErrorBoundary>
        )}
      </div>
    </div>
  )
}