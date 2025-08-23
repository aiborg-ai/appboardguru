/**
 * Upload Analytics Dashboard Component
 * Shows team upload insights, metrics, and collaboration analytics
 */

'use client'

import React, { useMemo, useEffect, useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Upload, 
  Share2, 
  Clock, 
  FileText, 
  Award,
  Activity,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react'
import { Card } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import { Progress } from '@/features/shared/ui/progress'
import { useUploadCollaborationStore } from '@/lib/stores/upload-collaboration.store'
import { SmartSharingService } from '@/lib/services/smart-sharing.service'
import { formatFileSize } from '@/types/upload'
import { cn } from '@/lib/utils'

interface UploadAnalyticsDashboardProps {
  className?: string
  timeRange?: '24h' | '7d' | '30d' | '90d'
  showDetails?: boolean
}

export function UploadAnalyticsDashboard({
  className = '',
  timeRange = '24h',
  showDetails = true
}: UploadAnalyticsDashboardProps) {
  const { recentActivity, presence, teamUploads } = useUploadCollaborationStore()
  const [smartSharingInsights, setSmartSharingInsights] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Load smart sharing insights
  useEffect(() => {
    const loadInsights = async () => {
      setLoading(true)
      try {
        const smartSharingService = new SmartSharingService()
        const result = smartSharingService.getSmartSharingInsights()
        if (result.success) {
          setSmartSharingInsights(result.data)
        }
      } catch (error) {
        console.error('Failed to load smart sharing insights:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInsights()
  }, [])

  const analytics = useMemo(() => {
    const now = new Date()
    const timeRangeMs = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[timeRange]

    const filteredActivity = recentActivity.filter(activity => {
      const activityTime = new Date(activity.timestamp)
      return now.getTime() - activityTime.getTime() <= timeRangeMs
    })

    const uploads = filteredActivity.filter(a => a.type === 'upload:completed')
    const shares = filteredActivity.filter(a => a.type === 'upload:shared')
    const comments = filteredActivity.filter(a => a.type === 'upload:commented')

    // Calculate file size totals
    const totalSize = uploads.reduce((sum, upload) => {
      const data = upload as any
      return sum + (data.data?.asset?.file_size || 0)
    }, 0)

    // User activity analysis
    const userActivity = new Map<string, { uploads: number; shares: number; comments: number }>()
    
    filteredActivity.forEach(activity => {
      const userId = activity.userId
      const current = userActivity.get(userId) || { uploads: 0, shares: 0, comments: 0 }
      
      if (activity.type === 'upload:completed') current.uploads++
      if (activity.type === 'upload:shared') current.shares++
      if (activity.type === 'upload:commented') current.comments++
      
      userActivity.set(userId, current)
    })

    const mostActiveUser = Array.from(userActivity.entries())
      .sort(([,a], [,b]) => (b.uploads + b.shares + b.comments) - (a.uploads + a.shares + a.comments))[0]

    // Category analysis
    const categoryStats = new Map<string, number>()
    uploads.forEach(upload => {
      const data = upload as any
      const category = data.data?.asset?.category || 'uncategorized'
      categoryStats.set(category, (categoryStats.get(category) || 0) + 1)
    })

    // Collaboration metrics
    const collaborationScore = Math.min(100, 
      (presence.length * 10) + 
      (shares.length * 5) + 
      (comments.length * 3) + 
      (uploads.length * 2)
    )

    return {
      totalUploads: uploads.length,
      totalShares: shares.length,
      totalComments: comments.length,
      totalSize,
      averageFileSize: uploads.length > 0 ? totalSize / uploads.length : 0,
      mostActiveUser: mostActiveUser ? {
        userId: mostActiveUser[0],
        userName: filteredActivity.find(a => a.userId === mostActiveUser[0])?.user.name || 'Unknown',
        activity: mostActiveUser[1]
      } : null,
      categoryStats: Array.from(categoryStats.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      collaborationScore,
      averageUploadTime: this.calculateAverageUploadTime(teamUploads),
      peakUploadHours: this.calculatePeakHours(filteredActivity)
    }
  }, [recentActivity, presence, teamUploads, timeRange])

  const calculateAverageUploadTime = (uploads: any[]) => {
    const completedUploads = uploads.filter(u => u.status === 'completed')
    if (completedUploads.length === 0) return 0

    // Estimate based on file sizes and completion times
    return 45 // seconds (placeholder)
  }

  const calculatePeakHours = (activities: any[]) => {
    const hourCounts = new Array(24).fill(0)
    
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours()
      hourCounts[hour]++
    })

    return hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <Activity className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Loading analytics...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Upload Analytics</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Last {timeRange}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Uploads"
          value={analytics.totalUploads}
          icon={<Upload className="h-5 w-5 text-blue-600" />}
          trend={analytics.totalUploads > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Files Shared"
          value={analytics.totalShares}
          icon={<Share2 className="h-5 w-5 text-green-600" />}
          trend={analytics.totalShares > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Comments"
          value={analytics.totalComments}
          icon={<FileText className="h-5 w-5 text-purple-600" />}
          trend={analytics.totalComments > 0 ? 'up' : 'neutral'}
        />
        
        <MetricCard
          title="Collaboration Score"
          value={analytics.collaborationScore}
          icon={<Users className="h-5 w-5 text-amber-600" />}
          suffix="/100"
          trend={analytics.collaborationScore > 60 ? 'up' : analytics.collaborationScore > 30 ? 'neutral' : 'down'}
        />
      </div>

      {/* Detailed Analytics */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File Activity */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">File Activity</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Data Uploaded</span>
                <span className="font-medium">{formatFileSize(analytics.totalSize)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average File Size</span>
                <span className="font-medium">{formatFileSize(analytics.averageFileSize)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Upload Time</span>
                <span className="font-medium">{analytics.averageUploadTime}s</span>
              </div>
            </div>
          </Card>

          {/* Top Categories */}
          <Card className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Popular Categories</h3>
            </div>
            
            <div className="space-y-3">
              {analytics.categoryStats.slice(0, 5).map((stat, index) => (
                <div key={stat.category} className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-900 truncate capitalize">
                        {stat.category}
                      </span>
                      <span className="text-sm font-medium">{stat.count}</span>
                    </div>
                    <Progress 
                      value={(stat.count / Math.max(analytics.totalUploads, 1)) * 100} 
                      className="h-1 mt-1"
                    />
                  </div>
                </div>
              ))}
              
              {analytics.categoryStats.length === 0 && (
                <p className="text-sm text-gray-500">No upload data available</p>
              )}
            </div>
          </Card>

          {/* Most Active User */}
          {analytics.mostActiveUser && (
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Award className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-gray-900">Top Contributor</h3>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-amber-800">
                    {analytics.mostActiveUser.userName.charAt(0)}
                  </span>
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {analytics.mostActiveUser.userName}
                  </p>
                  <div className="flex space-x-4 text-xs text-gray-600">
                    <span>{analytics.mostActiveUser.activity.uploads} uploads</span>
                    <span>{analytics.mostActiveUser.activity.shares} shares</span>
                    <span>{analytics.mostActiveUser.activity.comments} comments</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Smart Sharing Insights */}
          {smartSharingInsights && (
            <Card className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Smart Sharing</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Evaluations</span>
                  <span className="font-medium">{smartSharingInsights.totalEvaluations}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Rules Matched</span>
                  <span className="font-medium">{smartSharingInsights.averageRulesMatched.toFixed(1)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Processing Time</span>
                  <span className="font-medium">{smartSharingInsights.averageProcessingTime.toFixed(0)}ms</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Peak Hours */}
      {showDetails && analytics.peakUploadHours.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Peak Upload Hours</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {analytics.peakUploadHours.map((peak, index) => (
              <div key={peak.hour} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">
                  {peak.hour}:00
                </div>
                <div className="text-sm text-gray-600">
                  {peak.count} uploads
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  suffix?: string
}

function MetricCard({ title, value, icon, trend = 'neutral', suffix = '' }: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
        {getTrendIcon()}
      </div>
      
      <div className="mt-2">
        <span className={cn("text-2xl font-bold", getTrendColor())}>
          {value}
          {suffix}
        </span>
      </div>
    </Card>
  )
}

export default UploadAnalyticsDashboard