'use client'

import React from 'react'
import { 
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Download,
  Eye,
  Activity,
  Calendar,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Progress } from '@/features/shared/ui/progress'
import { cn } from '@/lib/utils'

interface VaultAnalyticsProps {
  vaultId: string
}

export default function VaultAnalytics({ vaultId }: VaultAnalyticsProps) {
  // Mock analytics data
  const analytics = {
    overview: {
      totalAssets: 47,
      totalMembers: 12,
      totalDownloads: 234,
      totalViews: 1892,
      storageUsed: 2.4, // GB
      storageLimit: 10, // GB
      activeUsers: 8,
      completionRate: 78
    },
    trends: {
      assets: { value: 47, change: 12, trend: 'up' },
      members: { value: 12, change: -8, trend: 'down' },
      downloads: { value: 234, change: 25, trend: 'up' },
      views: { value: 1892, change: 0, trend: 'neutral' }
    },
    popularAssets: [
      { name: 'Annual Strategy Review.pdf', views: 342, downloads: 89 },
      { name: 'Q4 Financial Report.xlsx', views: 287, downloads: 67 },
      { name: 'Board Meeting Minutes.docx', views: 198, downloads: 45 },
      { name: 'Compliance Checklist.pdf', views: 156, downloads: 34 },
      { name: 'Risk Assessment Matrix.xlsx', views: 142, downloads: 28 }
    ],
    memberActivity: [
      { name: 'John Doe', role: 'Owner', actions: 156, lastActive: '2 hours ago' },
      { name: 'Alice Smith', role: 'Editor', actions: 89, lastActive: '1 day ago' },
      { name: 'Bob Johnson', role: 'Member', actions: 67, lastActive: '3 hours ago' },
      { name: 'Carol Williams', role: 'Viewer', actions: 45, lastActive: '5 days ago' }
    ],
    activityByType: [
      { type: 'Uploads', count: 23, percentage: 18 },
      { type: 'Downloads', count: 234, percentage: 45 },
      { type: 'Views', count: 892, percentage: 28 },
      { type: 'Comments', count: 56, percentage: 9 }
    ],
    weeklyActivity: [
      { day: 'Mon', uploads: 5, downloads: 32, views: 128 },
      { day: 'Tue', uploads: 3, downloads: 28, views: 145 },
      { day: 'Wed', uploads: 7, downloads: 45, views: 189 },
      { day: 'Thu', uploads: 2, downloads: 38, views: 167 },
      { day: 'Fri', uploads: 4, downloads: 52, views: 203 },
      { day: 'Sat', uploads: 1, downloads: 18, views: 89 },
      { day: 'Sun', uploads: 1, downloads: 21, views: 71 }
    ]
  }
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-600" />
      case 'down': return <ArrowDown className="h-4 w-4 text-red-600" />
      default: return <Minus className="h-4 w-4 text-gray-600" />
    }
  }
  
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Vault Analytics
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Insights and metrics for vault performance
        </p>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-8 w-8 text-blue-500" />
              {getTrendIcon(analytics.trends.assets.trend)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.trends.assets.value}</p>
            <p className="text-sm text-gray-600">Total Assets</p>
            <p className={cn("text-xs mt-1", getTrendColor(analytics.trends.assets.trend))}>
              {Math.abs(analytics.trends.assets.change)}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-green-500" />
              {getTrendIcon(analytics.trends.members.trend)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.trends.members.value}</p>
            <p className="text-sm text-gray-600">Active Members</p>
            <p className={cn("text-xs mt-1", getTrendColor(analytics.trends.members.trend))}>
              {Math.abs(analytics.trends.members.change)}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Download className="h-8 w-8 text-purple-500" />
              {getTrendIcon(analytics.trends.downloads.trend)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.trends.downloads.value}</p>
            <p className="text-sm text-gray-600">Downloads</p>
            <p className={cn("text-xs mt-1", getTrendColor(analytics.trends.downloads.trend))}>
              {Math.abs(analytics.trends.downloads.change)}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="h-8 w-8 text-orange-500" />
              {getTrendIcon(analytics.trends.views.trend)}
            </div>
            <p className="text-2xl font-bold text-gray-900">{analytics.trends.views.value.toLocaleString()}</p>
            <p className="text-sm text-gray-600">Total Views</p>
            <p className={cn("text-xs mt-1", getTrendColor(analytics.trends.views.trend))}>
              {analytics.trends.views.change === 0 ? 'No change' : `${Math.abs(analytics.trends.views.change)}% from last month`}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Storage Usage</CardTitle>
            <CardDescription>Current vault storage consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Used Storage</span>
                  <span className="text-sm font-medium">
                    {analytics.overview.storageUsed} GB / {analytics.overview.storageLimit} GB
                  </span>
                </div>
                <Progress 
                  value={(analytics.overview.storageUsed / analytics.overview.storageLimit) * 100} 
                  className="h-3"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {((analytics.overview.storageUsed / analytics.overview.storageLimit) * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600">Storage Used</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">
                    {(analytics.overview.storageLimit - analytics.overview.storageUsed).toFixed(1)} GB
                  </p>
                  <p className="text-xs text-gray-600">Available</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Activity Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Distribution</CardTitle>
            <CardDescription>Breakdown of vault activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.activityByType.map((activity) => (
                <div key={activity.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{activity.type}</span>
                    <span className="text-sm font-medium">{activity.count}</span>
                  </div>
                  <div className="relative">
                    <Progress value={activity.percentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Activities</span>
                <span className="text-lg font-bold text-gray-900">
                  {analytics.activityByType.reduce((sum, a) => sum + a.count, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Popular Assets</CardTitle>
            <CardDescription>Most viewed and downloaded files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.popularAssets.map((asset, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 w-8">
                      #{index + 1}
                    </div>
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-900 truncate">{asset.name}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {asset.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {asset.downloads}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Member Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Contributors</CardTitle>
            <CardDescription>Most active vault members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.memberActivity.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{member.actions} actions</p>
                    <p className="text-xs text-gray-500">{member.lastActive}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Activity</CardTitle>
          <CardDescription>Vault activity over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-600">Uploads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600">Downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-gray-600">Views</span>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {analytics.weeklyActivity.map((day) => {
                const maxValue = Math.max(...analytics.weeklyActivity.flatMap(d => [d.uploads, d.downloads, d.views]))
                
                return (
                  <div key={day.day} className="text-center">
                    <div className="relative h-32 flex items-end justify-center gap-1">
                      <div 
                        className="w-2 bg-blue-500 rounded-t"
                        style={{ height: `${(day.uploads / maxValue) * 100}%` }}
                        title={`${day.uploads} uploads`}
                      />
                      <div 
                        className="w-2 bg-green-500 rounded-t"
                        style={{ height: `${(day.downloads / maxValue) * 100}%` }}
                        title={`${day.downloads} downloads`}
                      />
                      <div 
                        className="w-2 bg-purple-500 rounded-t"
                        style={{ height: `${(day.views / maxValue) * 100}%` }}
                        title={`${day.views} views`}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{day.day}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}