'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  FileText, 
  Shield, 
  Users, 
  Brain,
  Search,
  FileBarChart,
  Edit,
  UserCheck,
  Wand2,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { useDashboard } from '@/hooks/useDashboard'

const DashboardOverview: React.FC = () => {
  const {
    metrics,
    activities,
    recommendations,
    insights,
    isLoading,
    error,
    dismissRecommendation,
    trackActivity
  } = useDashboard()

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">Failed to load dashboard data. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, Board Member!</h1>
          <p className="text-gray-600 mt-1">Your governance intelligence dashboard</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
          })}
          <br />
          {new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          })}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-gray-600">All systems operational</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <span className="text-gray-600">Global security active</span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Board Packs */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-gray-600">Board Packs</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : metrics?.board_packs.count || 0}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={metrics?.board_packs.change > 0 ? 'default' : 'secondary'} className="text-xs">
                  {isLoading ? '...' : metrics?.board_packs.label || 'Stable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secure Files */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-gray-600">Secure Files</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : metrics?.secure_files.formatted || '0'}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={metrics?.secure_files.change > 0 ? 'default' : 'secondary'} className="text-xs">
                  {isLoading ? '...' : metrics?.secure_files.label || 'Stable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : metrics?.active_users.count || 0}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="text-xs">
                  {isLoading ? '...' : metrics?.active_users.label || 'Stable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-medium text-gray-600">AI Insights</p>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {isLoading ? '...' : metrics?.ai_insights.count || 0}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={metrics?.ai_insights.change > 0 ? 'default' : 'secondary'} className="text-xs">
                  {isLoading ? '...' : metrics?.ai_insights.label || 'Stable'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => trackActivity({
                  type: 'navigation',
                  title: 'Accessed Board Pack Upload',
                  resource_type: 'board_pack'
                })}
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Board Pack Upload</div>
                  <div className="text-xs text-gray-500">Upload new board documents</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => trackActivity({
                  type: 'navigation',
                  title: 'Accessed Asset Management',
                  resource_type: 'assets'
                })}
              >
                <Shield className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Manage Assets</div>
                  <div className="text-xs text-gray-500">Upload and share documents</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => trackActivity({
                  type: 'navigation',
                  title: 'Accessed AI Assistant',
                  resource_type: 'ai'
                })}
              >
                <Brain className="h-5 w-5 text-purple-600" />
                <div className="text-left">
                  <div className="font-medium">AI Assistant</div>
                  <div className="text-xs text-gray-500">Chat and get AI insights</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() => trackActivity({
                  type: 'navigation',
                  title: 'Accessed Reports',
                  resource_type: 'reports'
                })}
              >
                <FileBarChart className="h-5 w-5 text-orange-600" />
                <div className="text-left">
                  <div className="font-medium">View Reports</div>
                  <div className="text-xs text-gray-500">Access your analytics</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                View All Activity <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              activities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {activity.icon === 'search' && <Search className="h-4 w-4 text-blue-600" />}
                    {activity.icon === 'file-text' && <FileText className="h-4 w-4 text-blue-600" />}
                    {activity.icon === 'edit' && <Edit className="h-4 w-4 text-blue-600" />}
                    {activity.icon === 'users' && <Users className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="p-3 border rounded-lg animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : insights.length > 0 ? (
              insights.slice(0, 2).map((insight) => (
                <div key={insight.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <Badge 
                      variant={insight.status === 'warning' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{insight.description}</p>
                  {insight.action_required && (
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      {insight.type === 'alert' ? 'Analyze' : 'View Details'} →
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No AI insights available</p>
            )}
          </CardContent>
        </Card>

        {/* Recommended for You */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              ⭐ Recommended for You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="h-3 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              recommendations.slice(0, 2).map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`h-10 w-10 bg-${rec.color}-100 rounded-lg flex items-center justify-center`}>
                    {rec.icon === 'wand-2' && <Wand2 className={`h-5 w-5 text-${rec.color}-600`} />}
                    {rec.icon === 'leaf' && <Leaf className={`h-5 w-5 text-${rec.color}-600`} />}
                    {rec.icon === 'shield-check' && <ShieldCheck className={`h-5 w-5 text-${rec.color}-600`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{rec.title}</h4>
                    <p className="text-xs text-gray-600">{rec.description}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-xs h-7 px-2"
                    onClick={() => dismissRecommendation(rec.id)}
                  >
                    →
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No recommendations available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardOverview