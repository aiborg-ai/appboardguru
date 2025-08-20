'use client'

import DashboardLayout from '@/components/layout/DashboardLayout'
import { EnhancedAIChat } from '@/components/ai/EnhancedAIChat'
import { 
  Target,
  Shield,
  Users,
  TrendingUp,
  FileText,
  Upload,
  Plus,
  Brain,
  BarChart3,
  Search,
  MoreHorizontal,
  ChevronRight,
  Star,
  Sparkles,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react'

export default function DashboardPage() {
  const getCurrentDate = () => {
    const now = new Date()
    return now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getCurrentTime = () => {
    const now = new Date()
    return now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <DashboardLayout>
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="px-6 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome back, Board Member!</h1>
              <p className="text-blue-100 text-lg">Your governance intelligence dashboard</p>
              <div className="flex items-center mt-4 space-x-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-300" />
                  <span className="text-sm">All systems operational</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-300" />
                  <span className="text-sm">Global security active</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold">{getCurrentDate()}</div>
              <div className="text-blue-100">{getCurrentTime()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-600 font-medium">Board Packs</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">12</div>
              </div>
              <div className="text-green-600 text-sm font-medium flex items-center">
                <span>+2</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600 font-medium">Secure Files</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">3.4k</div>
              </div>
              <div className="text-green-600 text-sm font-medium flex items-center">
                <span>+15</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-gray-600 font-medium">Active Users</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">8</div>
              </div>
              <div className="text-gray-500 text-sm font-medium">
                <span>Stable</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm text-gray-600 font-medium">AI Insights</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">45</div>
              </div>
              <div className="text-green-600 text-sm font-medium flex items-center">
                <span>+5</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Upload className="h-6 w-6 text-blue-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Board Pack Upload</div>
                    <div className="text-sm text-gray-600">Upload new board documents</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
                </button>

                <button className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <Plus className="h-6 w-6 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">Create Project</div>
                    <div className="text-sm text-gray-600">Start a new governance project</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
                </button>

                <button 
                  onClick={() => window.location.href = '/dashboard/ai-chat'}
                  className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Brain className="h-6 w-6 text-purple-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">AI Assistant</div>
                    <div className="text-sm text-gray-600">Chat and get AI insights</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
                </button>

                <button className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">View Reports</div>
                    <div className="text-sm text-gray-600">Access your analytics</div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 ml-auto" />
                </button>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <div className="flex items-center space-x-2">
                <MoreHorizontal className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Searched for "quarterly board materials"</div>
                  <div className="text-xs text-gray-600">2h ago</div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Generated governance analysis report</div>
                  <div className="text-xs text-gray-600">3h ago</div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 rounded-full p-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Updated Project Alpha roadmap</div>
                  <div className="text-xs text-gray-600">Yesterday</div>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="bg-orange-100 rounded-full p-2">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">Team reviewed 5 compliance documents</div>
                  <div className="text-xs text-gray-600">2 days ago</div>
                </div>
              </div>

              <div className="pt-4">
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center">
                  View All Activity
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights & Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Insights */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI Insights</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Board Pack Analysis</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      AI analysis of board documents increased efficiency by 23% this quarter
                    </p>
                    <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Governance Alert</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      New compliance requirement detected in your governance framework
                    </p>
                    <button className="text-yellow-600 text-sm font-medium hover:text-yellow-700">
                      Analyze →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Sparkles className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Strategic Opportunity</h3>
                    <p className="text-sm text-gray-700 mb-3">
                      Gap detected in ESG reporting that could enhance stakeholder value
                    </p>
                    <button className="text-green-600 text-sm font-medium hover:text-green-700">
                      Explore →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended for You */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Try AI Board Pack Generator</h3>
                  <p className="text-sm text-gray-600 mb-2">Generate board materials 10x faster</p>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">Explore New ESG Features</h3>
                  <p className="text-sm text-gray-600 mb-2">7 new sustainability datasets available</p>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating AI Chat */}
      <EnhancedAIChat />
    </DashboardLayout>
  )
}