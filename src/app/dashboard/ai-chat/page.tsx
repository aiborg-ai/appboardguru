'use client'

import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { EnhancedAIChat } from '@/components/ai/EnhancedAIChat'
import { ScopeSelector, type ChatScope } from '@/components/ai/ScopeSelector'
import { 
  MessageSquare,
  Brain,
  Settings,
  HelpCircle,
  Globe,
  Search,
  Lightbulb,
  Target,
  Users,
  FileText,
  Calendar
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const defaultScope: ChatScope = {
  id: 'global',
  type: 'global',
  label: 'Global Knowledge',
  description: 'Access to general knowledge and web search'
}

export default function AIChatPage() {
  const [selectedScope, setSelectedScope] = useState<ChatScope>(defaultScope)
  const [showFullPageChat, setShowFullPageChat] = useState(false)

  const quickActions = [
    {
      title: 'Ask for Help',
      description: 'Get guidance on using BoardGuru features',
      icon: HelpCircle,
      color: 'bg-blue-50 text-blue-600',
      action: () => {
        // This would trigger a help query in the chat
        console.log('Help query triggered')
      }
    },
    {
      title: 'Search Web',
      description: 'Find current information and recent updates',
      icon: Globe,
      color: 'bg-green-50 text-green-600',
      action: () => {
        setSelectedScope({ 
          id: 'global', 
          type: 'global', 
          label: 'Global Knowledge',
          description: 'Web search enabled'
        })
      }
    },
    {
      title: 'Analyze Document',
      description: 'Get insights from uploaded board materials',
      icon: FileText,
      color: 'bg-purple-50 text-purple-600',
      action: () => {
        // Navigate to document analysis
        console.log('Document analysis triggered')
      }
    },
    {
      title: 'Meeting Prep',
      description: 'Prepare for upcoming board meetings',
      icon: Calendar,
      color: 'bg-orange-50 text-orange-600',
      action: () => {
        // Set meeting context
        console.log('Meeting prep triggered')
      }
    }
  ]

  const features = [
    {
      icon: Target,
      title: 'Scope-Based Context',
      description: 'Switch between different contexts like global knowledge, specific meetings, or documents for focused conversations.'
    },
    {
      icon: Search,
      title: 'Web Search Integration',
      description: 'Get current information by searching the web when using global scope for up-to-date insights.'
    },
    {
      icon: Brain,
      title: 'Smart Analysis',
      description: 'Upload documents and get AI-powered summaries, insights, and answers to specific questions.'
    },
    {
      icon: Settings,
      title: 'Customizable Settings',
      description: 'Configure your AI preferences, API keys, and choose between different models in Settings.'
    }
  ]

  if (showFullPageChat) {
    return (
      <DashboardLayout>
        <div className="h-full p-6">
          <div className="h-full bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Brain className="h-6 w-6" />
                <div>
                  <h1 className="text-lg font-semibold">BoardGuru AI Assistant</h1>
                  <p className="text-sm text-blue-100">Full-screen chat interface</p>
                </div>
              </div>
              <Button
                onClick={() => setShowFullPageChat(false)}
                variant="outline"
                className="text-white border-white hover:bg-blue-700"
                size="sm"
              >
                Exit Full Screen
              </Button>
            </div>
            
            {/* Scope Selector */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <ScopeSelector
                selectedScope={selectedScope}
                onScopeChange={setSelectedScope}
              />
            </div>

            {/* Chat Content - This would be the full-screen chat interface */}
            <div className="flex-1 p-4">
              <div className="h-full bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Full-screen chat interface would go here</p>
                  <p className="text-sm text-gray-500 mt-2">Current scope: {selectedScope.label}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
              <p className="text-gray-600">Intelligent support for governance and board management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowFullPageChat(true)}
              variant="outline"
            >
              Full Screen
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Scope */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Chat Scope</h2>
              <ScopeSelector
                selectedScope={selectedScope}
                onScopeChange={setSelectedScope}
              />
              <div className="mt-3 text-sm text-gray-600">
                <p>Current context: <span className="font-medium">{selectedScope.label}</span></p>
                {selectedScope.description && (
                  <p className="text-xs text-gray-500 mt-1">{selectedScope.description}</p>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="flex items-center space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{action.title}</div>
                      <div className="text-sm text-gray-600">{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* AI Features */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Capabilities</h2>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="bg-blue-50 p-2 rounded-lg">
                      <feature.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Getting Started */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Choose your chat scope above</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Click the chat button to start</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Try asking "help" for guidance</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span>Configure settings for best experience</span>
                </div>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Conversations</h3>
              <div className="text-sm text-gray-500 text-center py-4">
                <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p>No recent conversations</p>
                <p className="text-xs">Start chatting to see your history here</p>
              </div>
            </Card>

            {/* Tips */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Use specific scopes for better context and more relevant answers.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Upload documents first, then ask questions about them.</p>
                </div>
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">Configure your API keys in Settings for the best experience.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Floating Chat Button */}
        <EnhancedAIChat 
          defaultScope={selectedScope}
          className="z-50"
        />
      </div>
    </DashboardLayout>
  )
}