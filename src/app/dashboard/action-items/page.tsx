'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import ActionItemsDashboard from '@/components/action-items/ActionItemsDashboard'
import { 
  CheckSquare, 
  Plus, 
  Brain,
  Target,
  Calendar,
  Users,
  TrendingUp,
  Settings
} from 'lucide-react'

export default function ActionItemsPage() {
  const [currentView, setCurrentView] = useState<'my-items' | 'team-items' | 'org-items'>('my-items')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Demo data - in production, get from user context
  const organizationId = 'demo-org-123'
  const userId = 'current-user-id'

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                <CheckSquare className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Action Items</h1>
                <p className="text-gray-600">AI-extracted tasks and assignments from meetings</p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-6 py-3"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Action Item
            </button>
          </div>

          {/* View Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8">
              {[
                { key: 'my-items', label: 'My Action Items', icon: Target },
                { key: 'team-items', label: 'Team Items', icon: Users },
                { key: 'org-items', label: 'Organization Overview', icon: TrendingUp }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCurrentView(key as any)}
                  className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                    currentView === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights Banner */}
        <div className="card p-6 mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Action Items</h3>
              <p className="text-gray-700 mb-4">
                Action items are automatically extracted from meeting transcriptions using advanced AI. 
                Each item includes confidence scores, intelligent assignment suggestions, and predicted due dates.
              </p>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Critical Urgency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>High Urgency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Medium Urgency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Low Urgency</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {currentView === 'my-items' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">My Assigned Action Items</h2>
            <ActionItemsDashboard userId={userId} showAnalytics={true} />
          </div>
        )}

        {currentView === 'team-items' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Action Items</h2>
            <ActionItemsDashboard organizationId={organizationId} showAnalytics={true} />
          </div>
        )}

        {currentView === 'org-items' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Organization Overview</h2>
            <ActionItemsDashboard organizationId={organizationId} showAnalytics={true} />
          </div>
        )}

        {/* Quick Stats Footer */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Extraction</h3>
            <p className="text-gray-600">
              Automatically identifies and extracts action items from meeting transcripts with high accuracy.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Assignment</h3>
            <p className="text-gray-600">
              Intelligently assigns tasks to participants based on meeting context and roles.
            </p>
          </div>

          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Due Date Prediction</h3>
            <p className="text-gray-600">
              Predicts realistic due dates based on task complexity and urgency indicators.
            </p>
          </div>
        </div>
      </div>

      {/* Create Action Item Modal - Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Action Item</h3>
            <p className="text-gray-600 mb-4">Manual action item creation form would go here.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-primary px-4 py-2"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}