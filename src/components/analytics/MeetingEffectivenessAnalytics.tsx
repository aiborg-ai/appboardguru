'use client'

/**
 * Meeting Effectiveness Analytics
 * 
 * Advanced analytics dashboard for tracking meeting performance, decision velocity,
 * discussion quality, time allocation, and participant satisfaction.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Progress } from '../ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  MessageSquare, 
  Target, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Timer,
  Vote,
  BookOpen,
  Star,
  Activity,
  PieChart,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
  ComposedChart,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar
} from 'recharts'

import type { 
  MeetingEffectivenessMetrics,
  DecisionVelocity,
  DiscussionQuality,
  TimeAllocation,
  ActionItemTracking,
  SatisfactionSurvey
} from '../../lib/services/board-analytics.service'

interface MeetingEffectivenessAnalyticsProps {
  organizationId: string
  timePeriod?: {
    start_date: string
    end_date: string
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  }
  onExport?: (format: 'csv' | 'pdf' | 'xlsx') => void
  onRefresh?: () => void
}

interface EffectivenessSummary {
  totalMeetings: number
  averageEffectivenessScore: number
  averageDecisionTime: number
  averageSatisfaction: number
  actionItemCompletionRate: number
  trendDirection: 'up' | 'down' | 'stable'
  topPerformingMeetings: string[]
  improvementAreas: string[]
}

interface MeetingInsight {
  type: 'success' | 'warning' | 'info'
  title: string
  description: string
  metric: number
  trend?: number
}

const EFFECTIVENESS_THRESHOLDS = {
  excellent: 85,
  good: 70,
  average: 55,
  poor: 0
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981', 
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6B7280'
}

const MEETING_TYPE_COLORS = {
  'board': '#3B82F6',
  'committee': '#10B981',
  'executive': '#8B5CF6',
  'strategic': '#F59E0B',
  'quarterly': '#EC4899'
}

export default function MeetingEffectivenessAnalytics({
  organizationId,
  timePeriod,
  onExport,
  onRefresh
}: MeetingEffectivenessAnalyticsProps) {
  const [effectivenessData, setEffectivenessData] = useState<MeetingEffectivenessMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'overview' | 'meetings' | 'decisions' | 'satisfaction'>('overview')
  const [sortBy, setSortBy] = useState<'date' | 'effectiveness' | 'satisfaction' | 'decisions'>('date')
  const [filterType, setFilterType] = useState<'all' | 'board' | 'committee' | 'executive'>('all')
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)

  // Load effectiveness data
  useEffect(() => {
    loadEffectivenessData()
  }, [organizationId, timePeriod])

  const loadEffectivenessData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/analytics/meeting-effectiveness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          timePeriod,
          metrics: ['effectiveness_summary', 'meeting_details', 'trends']
        })
      })

      if (!response.ok) throw new Error('Failed to load meeting effectiveness data')

      const data = await response.json()
      setEffectivenessData(data.meetingDetails || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Calculate overall effectiveness score
  const calculateEffectivenessScore = (meeting: MeetingEffectivenessMetrics): number => {
    const weights = {
      decision_velocity: 0.25,
      discussion_quality: 0.25,
      satisfaction: 0.3,
      action_completion: 0.2
    }

    const decisionScore = calculateDecisionVelocityScore(meeting.decision_velocity)
    const discussionScore = calculateDiscussionQualityScore(meeting.discussion_quality)
    const satisfactionScore = meeting.satisfaction_survey.overall_satisfaction * 10
    const actionScore = meeting.action_item_tracking.completion_rate

    return (
      decisionScore * weights.decision_velocity +
      discussionScore * weights.discussion_quality +
      satisfactionScore * weights.satisfaction +
      actionScore * weights.action_completion
    )
  }

  const calculateDecisionVelocityScore = (velocity: DecisionVelocity): number => {
    if (velocity.decisions_made === 0) return 50 // Neutral score for no decisions
    
    let score = 0
    
    // Decision count score (0-30 points)
    score += Math.min(velocity.decisions_made * 5, 30)
    
    // Decision time score (0-30 points)
    if (velocity.average_decision_time_minutes <= 15) score += 30
    else if (velocity.average_decision_time_minutes <= 30) score += 20
    else if (velocity.average_decision_time_minutes <= 60) score += 10
    
    // Consensus rate score (0-25 points)
    score += velocity.consensus_rate * 0.25
    
    // Quality score (0-15 points)
    score += velocity.quality_score * 1.5
    
    return Math.min(score, 100)
  }

  const calculateDiscussionQualityScore = (quality: DiscussionQuality): number => {
    const scores = [
      quality.topic_coverage_score,
      quality.depth_of_analysis_score,
      quality.constructive_dialogue_score,
      quality.dissent_handling_score
    ]
    
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    return averageScore * 10 // Convert to 0-100 scale
  }

  // Generate effectiveness summary
  const effectivenessSummary: EffectivenessSummary = useMemo(() => {
    if (effectivenessData.length === 0) {
      return {
        totalMeetings: 0,
        averageEffectivenessScore: 0,
        averageDecisionTime: 0,
        averageSatisfaction: 0,
        actionItemCompletionRate: 0,
        trendDirection: 'stable',
        topPerformingMeetings: [],
        improvementAreas: []
      }
    }

    const effectivenessScores = effectivenessData.map(calculateEffectivenessScore)
    const averageEffectiveness = effectivenessScores.reduce((sum, score) => sum + score, 0) / effectivenessScores.length

    const averageDecisionTime = effectivenessData
      .filter(m => m.decision_velocity.decisions_made > 0)
      .reduce((sum, m) => sum + m.decision_velocity.average_decision_time_minutes, 0) / 
      effectivenessData.filter(m => m.decision_velocity.decisions_made > 0).length || 0

    const averageSatisfaction = effectivenessData
      .filter(m => m.satisfaction_survey.overall_satisfaction > 0)
      .reduce((sum, m) => sum + m.satisfaction_survey.overall_satisfaction, 0) /
      effectivenessData.filter(m => m.satisfaction_survey.overall_satisfaction > 0).length || 0

    const totalActionItems = effectivenessData.reduce((sum, m) => sum + m.action_item_tracking.items_created, 0)
    const completedActionItems = effectivenessData.reduce((sum, m) => sum + m.action_item_tracking.items_completed, 0)
    const actionItemCompletionRate = totalActionItems > 0 ? (completedActionItems / totalActionItems) * 100 : 0

    // Determine trend (simplified)
    const recentMeetings = effectivenessData.slice(-3)
    const earlierMeetings = effectivenessData.slice(-6, -3)
    
    let trendDirection: 'up' | 'down' | 'stable' = 'stable'
    if (recentMeetings.length > 0 && earlierMeetings.length > 0) {
      const recentAvg = recentMeetings.reduce((sum, m) => sum + calculateEffectivenessScore(m), 0) / recentMeetings.length
      const earlierAvg = earlierMeetings.reduce((sum, m) => sum + calculateEffectivenessScore(m), 0) / earlierMeetings.length
      
      if (recentAvg > earlierAvg + 5) trendDirection = 'up'
      else if (recentAvg < earlierAvg - 5) trendDirection = 'down'
    }

    const topPerformingMeetings = effectivenessData
      .map(m => ({ id: m.meeting_id, score: calculateEffectivenessScore(m), type: m.meeting_type }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => `${m.type} (${Math.round(m.score)}%)`)

    const improvementAreas: string[] = []
    if (averageDecisionTime > 45) improvementAreas.push('Decision Speed')
    if (averageSatisfaction < 7) improvementAreas.push('Participant Satisfaction')
    if (actionItemCompletionRate < 70) improvementAreas.push('Action Item Follow-up')
    if (averageEffectiveness < 70) improvementAreas.push('Overall Effectiveness')

    return {
      totalMeetings: effectivenessData.length,
      averageEffectivenessScore: Math.round(averageEffectiveness),
      averageDecisionTime: Math.round(averageDecisionTime),
      averageSatisfaction: Math.round(averageSatisfaction * 10) / 10,
      actionItemCompletionRate: Math.round(actionItemCompletionRate),
      trendDirection,
      topPerformingMeetings,
      improvementAreas
    }
  }, [effectivenessData])

  // Generate insights
  const insights: MeetingInsight[] = useMemo(() => {
    const insights: MeetingInsight[] = []

    // Decision velocity insight
    if (effectivenessSummary.averageDecisionTime < 30) {
      insights.push({
        type: 'success',
        title: 'Efficient Decision Making',
        description: 'Meetings are making decisions quickly and effectively',
        metric: effectivenessSummary.averageDecisionTime,
        trend: -5 // Improvement
      })
    } else if (effectivenessSummary.averageDecisionTime > 60) {
      insights.push({
        type: 'warning',
        title: 'Slow Decision Process',
        description: 'Consider streamlining decision-making processes',
        metric: effectivenessSummary.averageDecisionTime,
        trend: 10 // Getting worse
      })
    }

    // Satisfaction insight
    if (effectivenessSummary.averageSatisfaction >= 8) {
      insights.push({
        type: 'success',
        title: 'High Participant Satisfaction',
        description: 'Members are highly satisfied with meeting quality',
        metric: effectivenessSummary.averageSatisfaction,
        trend: 2
      })
    } else if (effectivenessSummary.averageSatisfaction < 6) {
      insights.push({
        type: 'warning',
        title: 'Low Meeting Satisfaction',
        description: 'Focus on improving meeting structure and engagement',
        metric: effectivenessSummary.averageSatisfaction,
        trend: -3
      })
    }

    // Action item completion insight
    if (effectivenessSummary.actionItemCompletionRate >= 80) {
      insights.push({
        type: 'success',
        title: 'Strong Follow-through',
        description: 'Action items are being completed effectively',
        metric: effectivenessSummary.actionItemCompletionRate,
        trend: 5
      })
    } else if (effectivenessSummary.actionItemCompletionRate < 60) {
      insights.push({
        type: 'warning',
        title: 'Poor Action Item Completion',
        description: 'Improve action item tracking and accountability',
        metric: effectivenessSummary.actionItemCompletionRate,
        trend: -8
      })
    }

    return insights
  }, [effectivenessSummary])

  // Filter and sort meetings
  const filteredMeetings = useMemo(() => {
    let filtered = effectivenessData

    if (filterType !== 'all') {
      filtered = filtered.filter(meeting => meeting.meeting_type === filterType)
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
        case 'effectiveness':
          return calculateEffectivenessScore(b) - calculateEffectivenessScore(a)
        case 'satisfaction':
          return b.satisfaction_survey.overall_satisfaction - a.satisfaction_survey.overall_satisfaction
        case 'decisions':
          return b.decision_velocity.decisions_made - a.decision_velocity.decisions_made
        default:
          return 0
      }
    })

    return filtered
  }, [effectivenessData, filterType, sortBy])

  // Prepare chart data
  const trendData = useMemo(() => {
    return effectivenessData.map((meeting, index) => ({
      meeting_number: index + 1,
      meeting_date: new Date(meeting.meeting_date).toLocaleDateString(),
      effectiveness_score: calculateEffectivenessScore(meeting),
      satisfaction: meeting.satisfaction_survey.overall_satisfaction * 10,
      decisions_made: meeting.decision_velocity.decisions_made,
      action_completion: meeting.action_item_tracking.completion_rate,
      meeting_type: meeting.meeting_type
    })).reverse()
  }, [effectivenessData])

  const decisionData = useMemo(() => {
    const typeData: Record<string, { total: number; avg_time: number; count: number }> = {}
    
    effectivenessData.forEach(meeting => {
      if (!typeData[meeting.meeting_type]) {
        typeData[meeting.meeting_type] = { total: 0, avg_time: 0, count: 0 }
      }
      typeData[meeting.meeting_type].total += meeting.decision_velocity.decisions_made
      typeData[meeting.meeting_type].avg_time += meeting.decision_velocity.average_decision_time_minutes
      typeData[meeting.meeting_type].count++
    })

    return Object.entries(typeData).map(([type, data]) => ({
      type,
      decisions_per_meeting: data.total / data.count,
      average_decision_time: data.avg_time / data.count,
      fill: MEETING_TYPE_COLORS[type as keyof typeof MEETING_TYPE_COLORS] || COLORS.info
    }))
  }, [effectivenessData])

  if (loading) {
    return (
      <div className="space-y-6">
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
            <Button onClick={loadEffectivenessData} variant="outline">
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
            <h1 className="text-3xl font-bold">Meeting Effectiveness Analytics</h1>
            <p className="text-gray-600">Analyze meeting performance, decisions, and participant satisfaction</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
                  <p className="text-sm font-medium text-gray-600">Total Meetings</p>
                  <p className="text-3xl font-bold">{effectivenessSummary.totalMeetings}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Effectiveness Score</p>
                  <p className="text-3xl font-bold">{effectivenessSummary.averageEffectivenessScore}%</p>
                </div>
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-green-500" />
                  {effectivenessSummary.trendDirection === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
                  ) : effectivenessSummary.trendDirection === 'down' ? (
                    <TrendingDown className="h-4 w-4 text-red-500 ml-1" />
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Decision Time</p>
                  <p className="text-3xl font-bold">{effectivenessSummary.averageDecisionTime}m</p>
                </div>
                <Timer className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                  <p className="text-3xl font-bold">{effectivenessSummary.averageSatisfaction}/10</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <Card key={index} className={`border-l-4 ${
                insight.type === 'success' ? 'border-green-500' :
                insight.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                      <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                      <p className="text-lg font-bold mt-2">
                        {insight.metric}
                        {insight.title.includes('Time') ? 'm' : 
                         insight.title.includes('Satisfaction') ? '/10' : '%'}
                      </p>
                    </div>
                    {insight.trend && (
                      <div className={`text-xs font-medium ${
                        insight.trend > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {insight.trend > 0 ? '+' : ''}{insight.trend}%
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="meetings">Meeting Details</TabsTrigger>
            <TabsTrigger value="decisions">Decision Analysis</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfaction Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Effectiveness Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting Effectiveness Trends</CardTitle>
                <CardDescription>
                  Track effectiveness scores and key metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="meeting_date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <RechartsTooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="effectiveness_score"
                      fill="#3B82F6"
                      fillOpacity={0.3}
                      stroke="#3B82F6"
                      name="Effectiveness Score"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="#10B981"
                      strokeWidth={2}
                      name="Satisfaction Score"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="decisions_made"
                      fill="#F59E0B"
                      name="Decisions Made"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Decision Performance by Meeting Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Decision Performance by Type</CardTitle>
                  <CardDescription>
                    Average decisions per meeting by type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={decisionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="decisions_per_meeting" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Decision Time Analysis</CardTitle>
                  <CardDescription>
                    Average time to decision by meeting type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={decisionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="average_decision_time" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="meetings" className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="effectiveness">Sort by Effectiveness</SelectItem>
                  <SelectItem value="satisfaction">Sort by Satisfaction</SelectItem>
                  <SelectItem value="decisions">Sort by Decisions</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meeting Types</SelectItem>
                  <SelectItem value="board">Board Meetings</SelectItem>
                  <SelectItem value="committee">Committee</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Meeting List */}
            <div className="space-y-4">
              {filteredMeetings.map((meeting) => {
                const effectivenessScore = calculateEffectivenessScore(meeting)
                const isExpanded = expandedMeeting === meeting.meeting_id
                
                return (
                  <Card key={meeting.meeting_id} className="overflow-hidden">
                    <CardHeader className="cursor-pointer" onClick={() => 
                      setExpandedMeeting(isExpanded ? null : meeting.meeting_id)
                    }>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {meeting.meeting_type} - {new Date(meeting.meeting_date).toLocaleDateString()}
                          </CardTitle>
                          <CardDescription>
                            Duration: {meeting.duration_minutes}m | 
                            Decisions: {meeting.decision_velocity.decisions_made} |
                            Satisfaction: {meeting.satisfaction_survey.overall_satisfaction}/10
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Effectiveness</p>
                            <p className="text-2xl font-bold">{Math.round(effectivenessScore)}%</p>
                          </div>
                          <Badge variant={effectivenessScore >= 85 ? 'default' : 
                                        effectivenessScore >= 70 ? 'secondary' : 'destructive'}>
                            {effectivenessScore >= 85 ? 'Excellent' :
                             effectivenessScore >= 70 ? 'Good' : 
                             effectivenessScore >= 55 ? 'Average' : 'Poor'}
                          </Badge>
                          {isExpanded ? <ChevronUp /> : <ChevronDown />}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Decision Velocity */}
                          <div>
                            <h4 className="font-semibold mb-2">Decision Velocity</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm">Decisions Made</span>
                                <span className="text-sm font-medium">
                                  {meeting.decision_velocity.decisions_made}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Avg Time</span>
                                <span className="text-sm font-medium">
                                  {meeting.decision_velocity.average_decision_time_minutes}m
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Consensus Rate</span>
                                <span className="text-sm font-medium">
                                  {meeting.decision_velocity.consensus_rate}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Deferred</span>
                                <span className="text-sm font-medium">
                                  {meeting.decision_velocity.deferred_decisions}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Discussion Quality */}
                          <div>
                            <h4 className="font-semibold mb-2">Discussion Quality</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm">Topic Coverage</span>
                                <span className="text-sm font-medium">
                                  {meeting.discussion_quality.topic_coverage_score}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Analysis Depth</span>
                                <span className="text-sm font-medium">
                                  {meeting.discussion_quality.depth_of_analysis_score}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Constructive Dialogue</span>
                                <span className="text-sm font-medium">
                                  {meeting.discussion_quality.constructive_dialogue_score}/10
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Dissent Handling</span>
                                <span className="text-sm font-medium">
                                  {meeting.discussion_quality.dissent_handling_score}/10
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Items */}
                          <div>
                            <h4 className="font-semibold mb-2">Action Items</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm">Created</span>
                                <span className="text-sm font-medium">
                                  {meeting.action_item_tracking.items_created}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Completed</span>
                                <span className="text-sm font-medium">
                                  {meeting.action_item_tracking.items_completed}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Completion Rate</span>
                                <span className="text-sm font-medium">
                                  {meeting.action_item_tracking.completion_rate}%
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm">Avg Completion Time</span>
                                <span className="text-sm font-medium">
                                  {meeting.action_item_tracking.average_completion_time_days}d
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Time Allocation */}
                        <div className="mt-6">
                          <h4 className="font-semibold mb-4">Time Allocation</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-blue-600">
                                {meeting.time_allocation.strategic_topics_percentage}%
                              </p>
                              <p className="text-xs text-gray-600">Strategic</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-green-600">
                                {meeting.time_allocation.operational_topics_percentage}%
                              </p>
                              <p className="text-xs text-gray-600">Operational</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-purple-600">
                                {meeting.time_allocation.governance_topics_percentage}%
                              </p>
                              <p className="text-xs text-gray-600">Governance</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-orange-600">
                                {meeting.time_allocation.compliance_topics_percentage}%
                              </p>
                              <p className="text-xs text-gray-600">Compliance</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-600">
                                {meeting.time_allocation.off_topic_percentage}%
                              </p>
                              <p className="text-xs text-gray-600">Off-topic</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="decisions" className="space-y-6">
            {/* Decision Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Decision Velocity Trends</CardTitle>
                  <CardDescription>
                    Decisions made per meeting over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="meeting_date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="decisions_made"
                        stroke="#3B82F6"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Decision Quality Distribution</CardTitle>
                  <CardDescription>
                    Distribution of decision quality scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={effectivenessData.map(m => ({
                      quality: m.decision_velocity.quality_score,
                      count: 1
                    })).reduce((acc, curr) => {
                      const existing = acc.find(item => item.quality === curr.quality)
                      if (existing) {
                        existing.count++
                      } else {
                        acc.push(curr)
                      }
                      return acc
                    }, [] as any[])}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="quality" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="satisfaction" className="space-y-6">
            {/* Satisfaction Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Trends</CardTitle>
                <CardDescription>
                  Participant satisfaction scores over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="meeting_date" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="#10B981"
                      strokeWidth={3}
                      name="Overall Satisfaction"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Satisfaction Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Satisfaction Scores</CardTitle>
                  <CardDescription>
                    Breakdown of satisfaction components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {effectivenessData.length > 0 && (() => {
                      const avgScores = {
                        preparation: effectivenessData.reduce((sum, m) => sum + m.satisfaction_survey.meeting_preparation, 0) / effectivenessData.length,
                        discussion: effectivenessData.reduce((sum, m) => sum + m.satisfaction_survey.discussion_quality, 0) / effectivenessData.length,
                        decision: effectivenessData.reduce((sum, m) => sum + m.satisfaction_survey.decision_making, 0) / effectivenessData.length,
                        time: effectivenessData.reduce((sum, m) => sum + m.satisfaction_survey.time_management, 0) / effectivenessData.length,
                        followup: effectivenessData.reduce((sum, m) => sum + m.satisfaction_survey.follow_up_effectiveness, 0) / effectivenessData.length
                      }

                      return Object.entries(avgScores).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium capitalize">
                              {key.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-bold">{Math.round(value * 10) / 10}/10</span>
                          </div>
                          <Progress value={value * 10} className="h-2" />
                        </div>
                      ))
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Response Rate Analysis</CardTitle>
                  <CardDescription>
                    Satisfaction survey participation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={effectivenessData.map(m => ({
                      date: new Date(m.meeting_date).toLocaleDateString(),
                      response_rate: m.satisfaction_survey.response_rate
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Bar dataKey="response_rate" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}