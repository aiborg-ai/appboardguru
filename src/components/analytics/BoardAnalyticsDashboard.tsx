'use client'

/**
 * Board Performance & Analytics Dashboard
 * 
 * Comprehensive analytics dashboard that combines all board performance metrics
 * including member engagement, meeting effectiveness, skills matrix, and benchmarking.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '../ui/progress'
import { Skeleton } from '../ui/skeleton'
import { Alert, AlertDescription } from '../ui/alert'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  Target, 
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Download,
  RefreshCw,
  Settings,
  Eye,
  Filter,
  Share,
  Bookmark
} from 'lucide-react'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

// Import sub-dashboard components
import MemberEngagementDashboard from './MemberEngagementDashboard'
import MeetingEffectivenessAnalytics from './MeetingEffectivenessAnalytics'
import SkillsMatrixDashboard from './SkillsMatrixDashboard'

interface BoardAnalyticsDashboardProps {
  organizationId: string
  userId: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
}

interface DashboardSummary {
  memberEngagement: {
    totalMembers: number
    averageAttendance: number
    averageParticipation: number
    topPerformers: string[]
    trend: 'up' | 'down' | 'stable'
  }
  meetingEffectiveness: {
    totalMeetings: number
    averageEffectiveness: number
    averageDecisionTime: number
    averageSatisfaction: number
    trend: 'up' | 'down' | 'stable'
  }
  skillsMatrix: {
    totalSkills: number
    criticalGaps: number
    averageSkillLevel: number
    successionRisks: number
  }
  overallScore: {
    governance: number
    performance: number
    risk: number
    compliance: number
    overall: number
  }
}

interface AnalyticsInsight {
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  description: string
  action?: string
  priority: 'high' | 'medium' | 'low'
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  info: '#6B7280'
}

export default function BoardAnalyticsDashboard({
  organizationId,
  userId,
  userRole
}: BoardAnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null)
  const [insights, setInsights] = useState<AnalyticsInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'meetings' | 'skills'>('overview')
  const [timePeriod, setTimePeriod] = useState<'30d' | '90d' | '6m' | '1y'>('90d')
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [organizationId, timePeriod])

  const loadDashboardData = async (force = false) => {
    if (force) setRefreshing(true)
    setLoading(!force)
    setError(null)

    try {
      // Calculate date range based on selected period
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timePeriod) {
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
        case '6m':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const timePeriodConfig = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        granularity: 'monthly' as const
      }

      // Load all analytics data in parallel
      const [engagementResponse, effectivenessResponse, skillsResponse] = await Promise.all([
        fetch('/api/analytics/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            timePeriod: timePeriodConfig,
            metrics: ['engagement_summary', 'engagement_trends']
          })
        }),
        fetch('/api/analytics/meeting-effectiveness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            timePeriod: timePeriodConfig,
            metrics: ['effectiveness_summary', 'effectiveness_trends']
          })
        }),
        fetch('/api/analytics/skills-matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            metrics: ['skills_summary', 'gap_analysis', 'succession_planning']
          })
        })
      ])

      const [engagementData, effectivenessData, skillsData] = await Promise.all([
        engagementResponse.json(),
        effectivenessResponse.json(),
        skillsResponse.json()
      ])

      // Process and combine data
      const summary: DashboardSummary = {
        memberEngagement: {
          totalMembers: engagementData.data?.summary?.totalMembers || 0,
          averageAttendance: engagementData.data?.summary?.averageAttendance || 0,
          averageParticipation: engagementData.data?.summary?.averageParticipation || 0,
          topPerformers: engagementData.data?.summary?.topPerformers || [],
          trend: engagementData.data?.summary?.engagementTrend || 'stable'
        },
        meetingEffectiveness: {
          totalMeetings: effectivenessData.data?.summary?.totalMeetings || 0,
          averageEffectiveness: effectivenessData.data?.summary?.averageEffectivenessScore || 0,
          averageDecisionTime: effectivenessData.data?.summary?.averageDecisionTime || 0,
          averageSatisfaction: effectivenessData.data?.summary?.averageSatisfaction || 0,
          trend: effectivenessData.data?.summary?.trendDirection || 'stable'
        },
        skillsMatrix: {
          totalSkills: skillsData.data?.summary?.totalSkills || 0,
          criticalGaps: skillsData.data?.summary?.criticalGaps || 0,
          averageSkillLevel: skillsData.data?.summary?.averageSkillLevel || 0,
          successionRisks: skillsData.data?.summary?.highRiskSuccessions || 0
        },
        overallScore: calculateOverallScores(engagementData.data, effectivenessData.data, skillsData.data)
      }

      setDashboardData(summary)
      setInsights(generateInsights(summary))
      setLastUpdated(new Date().toLocaleTimeString())

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      console.error('Dashboard loading error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateOverallScores = (engagement: any, effectiveness: any, skills: any) => {
    // Calculate composite scores based on available data
    const governanceScore = Math.round((
      (effectiveness?.summary?.averageEffectivenessScore || 70) * 0.4 +
      (engagement?.summary?.averageParticipation * 10 || 70) * 0.3 +
      (skills?.summary?.averageSkillLevel * 10 || 70) * 0.3
    ))

    const performanceScore = Math.round((
      (engagement?.summary?.averageAttendance || 70) * 0.3 +
      (effectiveness?.summary?.averageEffectivenessScore || 70) * 0.4 +
      (effectiveness?.summary?.averageSatisfaction * 10 || 70) * 0.3
    ))

    const riskScore = Math.round(100 - (
      (skills?.summary?.criticalGaps || 0) * 10 +
      (skills?.summary?.highRiskSuccessions || 0) * 15
    ))

    const complianceScore = Math.round((
      (engagement?.summary?.averageAttendance || 70) * 0.4 +
      (effectiveness?.summary?.averageEffectivenessScore || 70) * 0.4 +
      Math.max(0, 100 - (skills?.summary?.criticalGaps || 0) * 20) * 0.2
    ))

    const overallScore = Math.round((governanceScore + performanceScore + riskScore + complianceScore) / 4)

    return {
      governance: Math.min(100, Math.max(0, governanceScore)),
      performance: Math.min(100, Math.max(0, performanceScore)),
      risk: Math.min(100, Math.max(0, riskScore)),
      compliance: Math.min(100, Math.max(0, complianceScore)),
      overall: Math.min(100, Math.max(0, overallScore))
    }
  }

  const generateInsights = (data: DashboardSummary): AnalyticsInsight[] => {
    const insights: AnalyticsInsight[] = []

    // Engagement insights
    if (data.memberEngagement.averageAttendance < 75) {
      insights.push({
        type: 'warning',
        title: 'Low Member Attendance',
        description: `Average attendance is ${Math.round(data.memberEngagement.averageAttendance)}%. Consider reviewing meeting frequency and relevance.`,
        action: 'Review Meeting Schedule',
        priority: 'high'
      })
    }

    if (data.memberEngagement.trend === 'down') {
      insights.push({
        type: 'error',
        title: 'Declining Engagement Trend',
        description: 'Member engagement is trending downward. Immediate attention required.',
        action: 'Investigate Engagement Issues',
        priority: 'high'
      })
    }

    // Meeting effectiveness insights
    if (data.meetingEffectiveness.averageDecisionTime > 60) {
      insights.push({
        type: 'warning',
        title: 'Slow Decision Making',
        description: `Average decision time is ${data.meetingEffectiveness.averageDecisionTime} minutes. Consider streamlining processes.`,
        action: 'Optimize Decision Process',
        priority: 'medium'
      })
    }

    if (data.meetingEffectiveness.averageSatisfaction < 7) {
      insights.push({
        type: 'warning',
        title: 'Low Meeting Satisfaction',
        description: `Meeting satisfaction is ${data.meetingEffectiveness.averageSatisfaction}/10. Focus on improving meeting quality.`,
        action: 'Improve Meeting Structure',
        priority: 'medium'
      })
    }

    // Skills matrix insights
    if (data.skillsMatrix.criticalGaps > 0) {
      insights.push({
        type: 'error',
        title: 'Critical Skill Gaps',
        description: `${data.skillsMatrix.criticalGaps} critical skill gaps identified. Immediate action required.`,
        action: 'Address Skill Gaps',
        priority: 'high'
      })
    }

    if (data.skillsMatrix.successionRisks > 0) {
      insights.push({
        type: 'warning',
        title: 'Succession Risks',
        description: `${data.skillsMatrix.successionRisks} high-risk succession scenarios identified.`,
        action: 'Plan Succession Strategy',
        priority: 'high'
      })
    }

    // Overall performance insights
    if (data.overallScore.overall >= 85) {
      insights.push({
        type: 'success',
        title: 'Excellent Board Performance',
        description: `Overall board performance score is ${data.overallScore.overall}%. Keep up the great work!`,
        priority: 'low'
      })
    } else if (data.overallScore.overall < 60) {
      insights.push({
        type: 'error',
        title: 'Board Performance Needs Attention',
        description: `Overall score is ${data.overallScore.overall}%. Multiple areas require improvement.`,
        action: 'Comprehensive Review Required',
        priority: 'high'
      })
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 55) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleRefresh = () => {
    loadDashboardData(true)
  }

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    // Export functionality would be implemented here
    console.log(`Exporting dashboard data as ${format}`)
  }

  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="max-w-2xl mx-auto mt-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div>
            <p className="mb-2">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (!dashboardData) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Board Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive insights into board performance and effectiveness
            {lastUpdated && (
              <span className="text-sm text-gray-500 ml-2">
                • Last updated: {lastUpdated}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Select onValueChange={handleExport}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">Export PDF</SelectItem>
              <SelectItem value="xlsx">Export Excel</SelectItem>
              <SelectItem value="csv">Export CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(dashboardData.overallScore.overall)}`}>
                  {dashboardData.overallScore.overall}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Member Engagement</p>
                <p className="text-3xl font-bold">{Math.round(dashboardData.memberEngagement.averageAttendance)}%</p>
                <p className="text-xs text-gray-500">{dashboardData.memberEngagement.totalMembers} members</p>
              </div>
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-500" />
                {getTrendIcon(dashboardData.memberEngagement.trend)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meeting Effectiveness</p>
                <p className="text-3xl font-bold">{dashboardData.meetingEffectiveness.averageEffectiveness}%</p>
                <p className="text-xs text-gray-500">{dashboardData.meetingEffectiveness.totalMeetings} meetings</p>
              </div>
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-500" />
                {getTrendIcon(dashboardData.meetingEffectiveness.trend)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Skills & Succession</p>
                <p className="text-3xl font-bold">{dashboardData.skillsMatrix.averageSkillLevel}/10</p>
                <p className="text-xs text-gray-500">
                  {dashboardData.skillsMatrix.criticalGaps} critical gaps
                </p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>
              Critical areas requiring attention and areas of excellence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.slice(0, 6).map((insight, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'success' ? 'border-green-500 bg-green-50' :
                  insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                  insight.type === 'error' ? 'border-red-500 bg-red-50' :
                  'border-blue-500 bg-blue-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                      {insight.action && (
                        <Button variant="outline" size="sm" className="mt-2">
                          {insight.action}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center">
                      {insight.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {insight.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      <Badge variant={insight.priority === 'high' ? 'destructive' : 'default'} className="ml-1">
                        {insight.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Board Performance Scorecard</CardTitle>
          <CardDescription>
            Detailed breakdown of board effectiveness across key dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {[
                { name: 'Governance', score: dashboardData.overallScore.governance, icon: Target },
                { name: 'Performance', score: dashboardData.overallScore.performance, icon: TrendingUp },
                { name: 'Risk Management', score: dashboardData.overallScore.risk, icon: AlertTriangle },
                { name: 'Compliance', score: dashboardData.overallScore.compliance, icon: CheckCircle2 }
              ].map((dimension) => (
                <div key={dimension.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <dimension.icon className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{dimension.name}</span>
                    </div>
                    <span className={`font-bold ${getScoreColor(dimension.score)}`}>
                      {dimension.score}%
                    </span>
                  </div>
                  <Progress value={dimension.score} className="h-2" />
                </div>
              ))}
            </div>

            <div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { dimension: 'Governance', score: dashboardData.overallScore.governance },
                  { dimension: 'Performance', score: dashboardData.overallScore.performance },
                  { dimension: 'Risk', score: dashboardData.overallScore.risk },
                  { dimension: 'Compliance', score: dashboardData.overallScore.compliance }
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Board Performance"
                    dataKey="score"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Member Engagement</TabsTrigger>
          <TabsTrigger value="meetings">Meeting Effectiveness</TabsTrigger>
          <TabsTrigger value="skills">Skills & Succession</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Members</CardTitle>
                <CardDescription>
                  Members with highest engagement and contribution scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.memberEngagement.topPerformers.slice(0, 5).map((member, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <span className="font-medium">{member}</span>
                      </div>
                      <Award className="h-4 w-4 text-yellow-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics Summary</CardTitle>
                <CardDescription>
                  Overview of critical performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Attendance Rate</span>
                    <span className="font-bold">{Math.round(dashboardData.memberEngagement.averageAttendance)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Decision Time (avg)</span>
                    <span className="font-bold">{dashboardData.meetingEffectiveness.averageDecisionTime}m</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Meeting Satisfaction</span>
                    <span className="font-bold">{dashboardData.meetingEffectiveness.averageSatisfaction}/10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Critical Skill Gaps</span>
                    <span className="font-bold text-red-600">{dashboardData.skillsMatrix.criticalGaps}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Succession Risks</span>
                    <span className="font-bold text-orange-600">{dashboardData.skillsMatrix.successionRisks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <MemberEngagementDashboard
            organizationId={organizationId}
            timePeriod={{
              start_date: new Date(Date.now() - (timePeriod === '30d' ? 30 : timePeriod === '90d' ? 90 : timePeriod === '6m' ? 180 : 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
              granularity: 'monthly'
            }}
            onExport={handleExport}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="meetings" className="mt-6">
          <MeetingEffectivenessAnalytics
            organizationId={organizationId}
            timePeriod={{
              start_date: new Date(Date.now() - (timePeriod === '30d' ? 30 : timePeriod === '90d' ? 90 : timePeriod === '6m' ? 180 : 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
              granularity: 'monthly'
            }}
            onExport={handleExport}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="skills" className="mt-6">
          <SkillsMatrixDashboard
            organizationId={organizationId}
            onExport={handleExport}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}