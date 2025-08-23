'use client'

/**
 * Member Engagement Dashboard
 * 
 * Comprehensive dashboard for tracking and visualizing board member engagement
 * metrics including attendance, participation, preparation, and peer interactions.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Progress } from '../ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  Calendar, 
  MessageCircle, 
  FileText, 
  Clock,
  Award,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts'

import type { MemberEngagementMetrics, TrendAnalysis, EngagementHistory } from '../../lib/services/board-analytics.service'

interface MemberEngagementDashboardProps {
  organizationId: string
  timePeriod?: {
    start_date: string
    end_date: string
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  }
  onExport?: (format: 'csv' | 'pdf' | 'xlsx') => void
  onRefresh?: () => void
}

interface EngagementSummary {
  totalMembers: number
  averageAttendance: number
  averageParticipation: number
  topPerformers: string[]
  improvementNeeded: string[]
  engagementTrend: 'up' | 'down' | 'stable'
}

interface EngagementMetric {
  name: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  color: string
}

const ENGAGEMENT_COLORS = {
  excellent: '#10B981', // green
  good: '#3B82F6',     // blue
  average: '#F59E0B',  // amber
  poor: '#EF4444'      // red
}

const METRIC_THRESHOLDS = {
  attendance: { excellent: 90, good: 80, average: 70 },
  participation: { excellent: 8, good: 6, average: 4 },
  preparation: { excellent: 85, good: 70, average: 55 },
  interaction: { excellent: 8, good: 6, average: 4 }
}

export default function MemberEngagementDashboard({ 
  organizationId, 
  timePeriod, 
  onExport,
  onRefresh 
}: MemberEngagementDashboardProps) {
  const [engagementData, setEngagementData] = useState<MemberEngagementMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'trends'>('overview')
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'participation' | 'engagement'>('engagement')
  const [filterLevel, setFilterLevel] = useState<'all' | 'excellent' | 'good' | 'average' | 'poor'>('all')

  // Load engagement data
  useEffect(() => {
    loadEngagementData()
  }, [organizationId, timePeriod])

  const loadEngagementData = async () => {
    setLoading(true)
    setError(null)

    try {
      // This would typically call your analytics service
      const response = await fetch(`/api/analytics/engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          timePeriod,
          metrics: ['engagement_summary', 'member_details', 'trends']
        })
      })

      if (!response.ok) throw new Error('Failed to load engagement data')

      const data = await response.json()
      setEngagementData(data.memberDetails || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Calculate engagement summary
  const engagementSummary: EngagementSummary = useMemo(() => {
    if (engagementData.length === 0) {
      return {
        totalMembers: 0,
        averageAttendance: 0,
        averageParticipation: 0,
        topPerformers: [],
        improvementNeeded: [],
        engagementTrend: 'stable'
      }
    }

    const avgAttendance = engagementData.reduce((sum, m) => sum + m.attendance_rate, 0) / engagementData.length
    const avgParticipation = engagementData.reduce((sum, m) => sum + m.participation_score, 0) / engagementData.length
    
    // Calculate overall engagement score
    const membersWithEngagement = engagementData.map(member => ({
      ...member,
      overallEngagement: calculateOverallEngagement(member)
    })).sort((a, b) => b.overallEngagement - a.overallEngagement)

    const topPerformers = membersWithEngagement.slice(0, 3).map(m => m.full_name)
    const improvementNeeded = membersWithEngagement.slice(-3).map(m => m.full_name)

    // Determine trend based on trend analysis
    const trendCounts = engagementData.reduce((acc, member) => {
      acc[member.trend_analysis.engagement_trend]++
      return acc
    }, { improving: 0, stable: 0, declining: 0 })

    let engagementTrend: 'up' | 'down' | 'stable' = 'stable'
    if (trendCounts.improving > trendCounts.declining) engagementTrend = 'up'
    else if (trendCounts.declining > trendCounts.improving) engagementTrend = 'down'

    return {
      totalMembers: engagementData.length,
      averageAttendance: Math.round(avgAttendance * 100) / 100,
      averageParticipation: Math.round(avgParticipation * 100) / 100,
      topPerformers,
      improvementNeeded,
      engagementTrend
    }
  }, [engagementData])

  // Calculate overall engagement score
  const calculateOverallEngagement = (member: MemberEngagementMetrics): number => {
    const weights = {
      attendance: 0.3,
      participation: 0.25,
      preparation: 0.2,
      interaction: 0.25
    }

    const normalizedParticipation = (member.participation_score / 10) * 100
    const normalizedPreparation = (
      (member.preparation_metrics.document_access_rate * 0.3) +
      (member.preparation_metrics.pre_meeting_activity_score / 10 * 100 * 0.4) +
      (Math.min(member.preparation_metrics.questions_prepared_count * 10, 100) * 0.3)
    )
    const normalizedInteraction = (member.peer_interaction_score / 10) * 100

    return (
      member.attendance_rate * weights.attendance +
      normalizedParticipation * weights.participation +
      normalizedPreparation * weights.preparation +
      normalizedInteraction * weights.interaction
    )
  }

  // Get engagement level
  const getEngagementLevel = (score: number): 'excellent' | 'good' | 'average' | 'poor' => {
    if (score >= 85) return 'excellent'
    if (score >= 70) return 'good'
    if (score >= 55) return 'average'
    return 'poor'
  }

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  // Filter and sort members
  const filteredMembers = useMemo(() => {
    let filtered = engagementData

    // Filter by engagement level
    if (filterLevel !== 'all') {
      filtered = filtered.filter(member => {
        const score = calculateOverallEngagement(member)
        return getEngagementLevel(score) === filterLevel
      })
    }

    // Sort members
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name)
        case 'attendance':
          return b.attendance_rate - a.attendance_rate
        case 'participation':
          return b.participation_score - a.participation_score
        case 'engagement':
        default:
          return calculateOverallEngagement(b) - calculateOverallEngagement(a)
      }
    })

    return filtered
  }, [engagementData, filterLevel, sortBy])

  // Prepare chart data
  const trendChartData = useMemo(() => {
    if (engagementData.length === 0) return []

    // Aggregate data by month for trend visualization
    const monthlyData: Record<string, { 
      period: string
      attendance: number
      participation: number
      engagement: number
      count: number 
    }> = {}

    engagementData.forEach(member => {
      member.engagement_history.forEach(history => {
        if (!monthlyData[history.period]) {
          monthlyData[history.period] = {
            period: history.period,
            attendance: 0,
            participation: 0,
            engagement: 0,
            count: 0
          }
        }

        monthlyData[history.period].attendance += history.attendance_rate
        monthlyData[history.period].participation += history.participation_score
        monthlyData[history.period].count++
      })
    })

    return Object.values(monthlyData).map(data => ({
      ...data,
      attendance: Math.round(data.attendance / data.count * 100) / 100,
      participation: Math.round(data.participation / data.count * 100) / 100,
      engagement: Math.round((data.attendance + data.participation * 10) / data.count / 2 * 100) / 100
    })).sort((a, b) => a.period.localeCompare(b.period))
  }, [engagementData])

  // Prepare distribution data
  const distributionData = useMemo(() => {
    const levels = { excellent: 0, good: 0, average: 0, poor: 0 }
    
    engagementData.forEach(member => {
      const score = calculateOverallEngagement(member)
      const level = getEngagementLevel(score)
      levels[level]++
    })

    return Object.entries(levels).map(([level, count]) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: count,
      percentage: Math.round((count / engagementData.length) * 100),
      color: ENGAGEMENT_COLORS[level as keyof typeof ENGAGEMENT_COLORS]
    }))
  }, [engagementData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadEngagementData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Member Engagement Analytics</h1>
            <p className="text-gray-600">Track and analyze board member participation and performance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="trends">Trends</SelectItem>
              </SelectContent>
            </Select>
            {onExport && (
              <Select onValueChange={(format: any) => onExport(format)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-3xl font-bold">{engagementSummary.totalMembers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Attendance</p>
                  <p className="text-3xl font-bold">{engagementSummary.averageAttendance}%</p>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-green-500" />
                  {getTrendIcon(engagementSummary.engagementTrend)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Participation</p>
                  <p className="text-3xl font-bold">{engagementSummary.averageParticipation}/10</p>
                </div>
                <div className="flex items-center">
                  <MessageCircle className="h-8 w-8 text-purple-500" />
                  {getTrendIcon(engagementSummary.engagementTrend)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Performers</p>
                  <p className="text-sm text-gray-600">
                    {engagementSummary.topPerformers.slice(0, 2).join(', ')}
                    {engagementSummary.topPerformers.length > 2 && '...'}
                  </p>
                </div>
                <Award className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Member Details</TabsTrigger>
            <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Engagement Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Distribution</CardTitle>
                  <CardDescription>
                    Distribution of members across engagement levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {distributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Engagement Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Engagement Trends</CardTitle>
                  <CardDescription>
                    Average engagement metrics over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="attendance" 
                        stroke="#10B981" 
                        name="Attendance %"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="participation" 
                        stroke="#3B82F6" 
                        name="Participation Score"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="attendance">Sort by Attendance</SelectItem>
                  <SelectItem value="participation">Sort by Participation</SelectItem>
                  <SelectItem value="engagement">Sort by Overall Engagement</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLevel} onValueChange={(value: any) => setFilterLevel(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="poor">Needs Improvement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Member Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMembers.map((member) => {
                const overallScore = calculateOverallEngagement(member)
                const level = getEngagementLevel(overallScore)

                return (
                  <Card key={member.user_id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src="" alt={member.full_name} />
                            <AvatarFallback>
                              {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{member.full_name}</CardTitle>
                            <CardDescription>Board Member</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={level === 'excellent' ? 'default' : level === 'good' ? 'secondary' : 'destructive'}
                          >
                            {level.charAt(0).toUpperCase() + level.slice(1)}
                          </Badge>
                          {getTrendIcon(member.trend_analysis.engagement_trend)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Overall Engagement Score */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Overall Engagement</span>
                          <span className="font-medium">{Math.round(overallScore)}%</span>
                        </div>
                        <Progress value={overallScore} className="h-2" />
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">{member.attendance_rate}%</p>
                              <p className="text-xs text-gray-600">Attendance</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Meeting attendance rate</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">{member.participation_score}/10</p>
                              <p className="text-xs text-gray-600">Participation</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Average participation score in meetings</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">
                                {Math.round(member.preparation_metrics.document_access_rate * 100)}%
                              </p>
                              <p className="text-xs text-gray-600">Preparation</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Document access and preparation rate</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-orange-600">{member.peer_interaction_score}/10</p>
                              <p className="text-xs text-gray-600">Interaction</p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Peer interaction and collaboration score</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Committee Involvement */}
                      {member.committee_involvement.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Committee Involvement</p>
                          <div className="flex flex-wrap gap-1">
                            {member.committee_involvement.map((committee, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {committee.committee_name} ({committee.role})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trend Summary */}
                      <div className="text-xs text-gray-600">
                        <p>
                          <span className="font-medium">Trend:</span> {member.trend_analysis.engagement_trend}
                          {member.trend_analysis.three_month_change !== 0 && (
                            <span className={member.trend_analysis.three_month_change > 0 ? 'text-green-600' : 'text-red-600'}>
                              {' '}({member.trend_analysis.three_month_change > 0 ? '+' : ''}{member.trend_analysis.three_month_change}% over 3 months)
                            </span>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Detailed Trends Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Engagement Trends</CardTitle>
                <CardDescription>
                  Historical engagement patterns and predictions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="participationGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="attendance"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#attendanceGradient)"
                      name="Attendance Rate"
                    />
                    <Area
                      type="monotone"
                      dataKey="participation"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#participationGradient)"
                      name="Participation Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Correlation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance vs Participation</CardTitle>
                  <CardDescription>
                    Correlation between attendance and participation levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="attendance_rate" name="Attendance %" />
                      <YAxis dataKey="participation_score" name="Participation Score" />
                      <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter 
                        name="Members" 
                        data={engagementData} 
                        fill="#3B82F6"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Engagement Factors</CardTitle>
                  <CardDescription>
                    Key factors affecting member engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Meeting Frequency</span>
                      </div>
                      <span className="text-sm font-medium">Optimal</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Meeting Duration</span>
                      </div>
                      <span className="text-sm font-medium">Above Average</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Material Accessibility</span>
                      </div>
                      <span className="text-sm font-medium">Good</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Communication Quality</span>
                      </div>
                      <span className="text-sm font-medium">Excellent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}