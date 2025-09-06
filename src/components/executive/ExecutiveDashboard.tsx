'use client'

/**
 * Executive Dashboard - Strategic Governance Intelligence Platform
 * 
 * Comprehensive executive-level dashboard providing strategic insights,
 * governance oversight, and real-time operational intelligence across
 * multiple organizations and board governance activities.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
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
  Bookmark,
  Shield,
  FileText,
  Brain,
  Search,
  Zap,
  Globe,
  PieChart,
  LineChart,
  MoreHorizontal,
  ChevronRight,
  Star,
  Sparkles,
  Building,
  Network,
  Gauge
} from 'lucide-react'

import {
  LineChart as RechartsLineChart,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'

import { useOrganizations, useCurrentOrganization } from '@/lib/stores/organization-store'
import { useAuth } from '@/lib/stores/auth-store'
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip'
import ExecutiveActionsPanel from './ExecutiveActionsPanel'
import ExecutiveHeatmap from './ExecutiveHeatmap'

// Executive Dashboard Interfaces
interface ExecutiveDashboardProps {
  userRole: 'ceo' | 'board_chair' | 'audit_committee' | 'multi_org_executive'
  viewMode?: 'strategic' | 'operational' | 'compliance' | 'risk'
}

interface GovernanceHealthMetrics {
  overall: number
  boardEffectiveness: number
  memberEngagement: number
  complianceStatus: number
  riskManagement: number
  decisionVelocity: number
  stakeholderSatisfaction: number
  trend: 'improving' | 'declining' | 'stable'
  lastUpdated: string
}

interface OrganizationPortfolioData {
  id: string
  name: string
  slug: string
  healthScore: number
  memberCount: number
  meetingFrequency: number
  complianceRisk: 'low' | 'medium' | 'high' | 'critical'
  lastActivity: string
  keyMetrics: {
    documentsReviewed: number
    decisionsRequired: number
    upcomingMeetings: number
    alertsCount: number
  }
  performance: {
    attendanceRate: number
    satisfactionScore: number
    decisionTime: number
  }
}

interface RealTimeActivity {
  id: string
  type: 'meeting' | 'document' | 'decision' | 'compliance' | 'member' | 'system'
  title: string
  description: string
  organization: string
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in_progress' | 'completed' | 'attention_required'
  assignees?: string[]
  metadata?: Record<string, any>
}

interface ExecutiveInsight {
  type: 'opportunity' | 'risk' | 'achievement' | 'alert'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  category: 'governance' | 'performance' | 'compliance' | 'risk' | 'strategic'
  actionRequired: boolean
  recommendedActions?: string[]
  confidence: number
  dataPoints?: string[]
}

const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  info: '#6B7280',
  purple: '#8B5CF6',
  indigo: '#6366F1',
  pink: '#EC4899'
}

const ROLE_CONFIGURATIONS = {
  ceo: {
    title: 'CEO Dashboard',
    description: 'Strategic overview and executive decision support',
    defaultView: 'strategic',
    keyMetrics: ['governance', 'performance', 'risk', 'growth'],
    panels: ['portfolio', 'insights', 'activities', 'performance']
  },
  board_chair: {
    title: 'Board Chair Dashboard',
    description: 'Board governance and meeting coordination',
    defaultView: 'operational',
    keyMetrics: ['effectiveness', 'engagement', 'compliance', 'satisfaction'],
    panels: ['governance', 'meetings', 'members', 'compliance']
  },
  audit_committee: {
    title: 'Audit Committee Dashboard',
    description: 'Compliance oversight and risk management',
    defaultView: 'compliance',
    keyMetrics: ['compliance', 'risk', 'controls', 'audits'],
    panels: ['compliance', 'risk', 'controls', 'reports']
  },
  multi_org_executive: {
    title: 'Portfolio Executive Dashboard',
    description: 'Multi-organization oversight and benchmarking',
    defaultView: 'strategic',
    keyMetrics: ['portfolio', 'comparison', 'performance', 'consolidation'],
    panels: ['portfolio', 'comparison', 'trends', 'consolidation']
  }
}

export default function ExecutiveDashboard({ 
  userRole, 
  viewMode 
}: ExecutiveDashboardProps) {
  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  
  // Data state
  const [governanceHealth, setGovernanceHealth] = useState<GovernanceHealthMetrics | null>(null)
  const [portfolioData, setPortfolioData] = useState<OrganizationPortfolioData[]>([])
  const [realtimeActivities, setRealtimeActivities] = useState<RealTimeActivity[]>([])
  const [executiveInsights, setExecutiveInsights] = useState<ExecutiveInsight[]>([])
  
  // UI state
  const [activeView, setActiveView] = useState(viewMode || ROLE_CONFIGURATIONS[userRole].defaultView)
  const [timePeriod, setTimePeriod] = useState<'24h' | '7d' | '30d' | '90d'>('30d')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(ROLE_CONFIGURATIONS[userRole].keyMetrics)
  
  // Zustand stores
  const organizations = useOrganizations()
  const currentOrganization = useCurrentOrganization()
  const { user } = useAuth()

  const roleConfig = ROLE_CONFIGURATIONS[userRole]

  // Load executive dashboard data
  useEffect(() => {
    loadExecutiveDashboard()
  }, [userRole, activeView, timePeriod])

  const loadExecutiveDashboard = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    setLoading(!forceRefresh)
    setError(null)

    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      
      switch (timePeriod) {
        case '24h':
          startDate.setDate(endDate.getDate() - 1)
          break
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      // Load dashboard data in parallel
      const [healthResponse, portfolioResponse, activitiesResponse, insightsResponse] = await Promise.all([
        fetch('/api/executive/governance-health', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userRole,
            organizationIds: organizations.map(org => org.id),
            timePeriod: {
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0]
            }
          })
        }),
        fetch('/api/executive/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userRole,
            organizationIds: organizations.map(org => org.id),
            metrics: selectedMetrics
          })
        }),
        fetch('/api/executive/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userRole,
            organizationIds: organizations.map(org => org.id),
            limit: 50,
            types: ['meeting', 'document', 'decision', 'compliance']
          })
        }),
        fetch('/api/executive/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userRole,
            organizationIds: organizations.map(org => org.id),
            categories: ['governance', 'performance', 'compliance', 'risk']
          })
        })
      ])

      const [healthData, portfolioResults, activitiesData, insightsData] = await Promise.all([
        healthResponse.json(),
        portfolioResponse.json(),
        activitiesResponse.json(),
        insightsResponse.json()
      ])

      // Process and set data
      if (healthData.success) {
        setGovernanceHealth(healthData.data)
      }
      
      if (portfolioResults.success) {
        setPortfolioData(portfolioResults.data.organizations || [])
      }
      
      if (activitiesData.success) {
        setRealtimeActivities(activitiesData.data.activities || [])
      }
      
      if (insightsData.success) {
        setExecutiveInsights(insightsData.data.insights || [])
      }

      setLastUpdated(new Date().toLocaleTimeString())

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executive dashboard')
      console.error('Executive dashboard loading error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Computed values
  const criticalAlerts = useMemo(() => {
    return realtimeActivities.filter(activity => activity.priority === 'critical').length
  }, [realtimeActivities])

  const portfolioSummary = useMemo(() => {
    if (!portfolioData.length) return null
    
    return {
      totalOrganizations: portfolioData.length,
      averageHealthScore: Math.round(portfolioData.reduce((sum, org) => sum + org.healthScore, 0) / portfolioData.length),
      highRiskOrganizations: portfolioData.filter(org => org.complianceRisk === 'high' || org.complianceRisk === 'critical').length,
      totalMembers: portfolioData.reduce((sum, org) => sum + org.memberCount, 0),
      pendingDecisions: portfolioData.reduce((sum, org) => sum + org.keyMetrics.decisionsRequired, 0),
      upcomingMeetings: portfolioData.reduce((sum, org) => sum + org.keyMetrics.upcomingMeetings, 0)
    }
  }, [portfolioData])

  const handleRefresh = useCallback(() => {
    loadExecutiveDashboard(true)
  }, [])

  const handleExport = useCallback((format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting executive dashboard as ${format}`)
    // Export implementation would go here
  }, [])

  const getHealthScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-blue-600' 
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getHealthScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Fair'
    if (score >= 60) return 'Needs Attention'
    return 'Critical'
  }

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading && !governanceHealth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-24" />)}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
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
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Executive Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 text-white rounded-xl">
        <div className="px-8 py-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{roleConfig.title}</h1>
                <InfoTooltip
                  content={
                    <InfoSection
                      title="Executive Intelligence Dashboard"
                      description={roleConfig.description}
                      features={[
                        "Real-time governance health monitoring",
                        "Multi-organization portfolio oversight",
                        "AI-powered insights and recommendations",
                        "Strategic decision support tools",
                        "Comprehensive compliance tracking"
                      ]}
                      tips={[
                        "Use keyboard shortcuts for quick navigation",
                        "Customize metrics based on your role",
                        "Set up alerts for critical governance issues",
                        "Export reports for board presentations"
                      ]}
                    />
                  }
                  side="bottom"
                  size="lg"
                  className="text-white hover:text-purple-200"
                />
              </div>
              <p className="text-purple-100 text-lg mb-4">{roleConfig.description}</p>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  {governanceHealth && governanceHealth.overall >= 80 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-300" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-300" />
                  )}
                  <span className="text-sm">
                    Governance Health: {governanceHealth?.overall || 0}% ({getHealthScoreLabel(governanceHealth?.overall || 0)})
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-300" />
                  <span className="text-sm">
                    {portfolioSummary?.totalOrganizations || 0} Organizations
                  </span>
                </div>
                
                {criticalAlerts > 0 && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-300" />
                    <span className="text-sm">{criticalAlerts} Critical Alerts</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-purple-200">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </div>
              {lastUpdated && (
                <div className="text-xs text-purple-300 mt-1">
                  Updated: {lastUpdated}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Select value={activeView} onValueChange={setActiveView}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strategic">Strategic View</SelectItem>
              <SelectItem value="operational">Operational View</SelectItem>
              <SelectItem value="compliance">Compliance View</SelectItem>
              <SelectItem value="risk">Risk View</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
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
              <SelectItem value="excel">Export Excel</SelectItem>
              <SelectItem value="csv">Export CSV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Executive Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Governance Health Score */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Gauge className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-gray-600 font-medium">Governance Health</span>
                  <InfoTooltip
                    content="Composite score measuring board effectiveness, member engagement, compliance status, and decision-making velocity."
                    size="sm"
                  />
                </div>
                <div className={`text-3xl font-bold mt-2 ${getHealthScoreColor(governanceHealth?.overall || 0)}`}>
                  {governanceHealth?.overall || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {getHealthScoreLabel(governanceHealth?.overall || 0)}
                </div>
              </div>
              <div className="flex items-center">
                <div className="text-right mr-2">
                  <Badge variant={governanceHealth?.trend === 'improving' ? 'default' : governanceHealth?.trend === 'declining' ? 'destructive' : 'secondary'}>
                    {governanceHealth?.trend || 'stable'}
                  </Badge>
                </div>
                {getTrendIcon(governanceHealth?.trend || 'stable')}
              </div>
            </div>
            <Progress value={governanceHealth?.overall || 0} className="mt-3" />
          </CardContent>
        </Card>

        {/* Portfolio Summary */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-gray-600 font-medium">Portfolio Health</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {portfolioSummary?.averageHealthScore || 0}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {portfolioSummary?.totalOrganizations || 0} organizations
                </div>
              </div>
              <div className="text-center">
                {portfolioSummary?.highRiskOrganizations ? (
                  <div className="text-orange-600">
                    <AlertTriangle className="h-6 w-6 mx-auto" />
                    <div className="text-xs mt-1">{portfolioSummary.highRiskOrganizations} at risk</div>
                  </div>
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Decision Pipeline */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-gray-600 font-medium">Decision Pipeline</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {portfolioSummary?.pendingDecisions || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  requiring executive attention
                </div>
              </div>
              <div className="text-center">
                <Clock className="h-8 w-8 text-purple-500" />
                <div className="text-xs text-gray-500 mt-1">
                  avg: {governanceHealth?.decisionVelocity || 0}d
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Governance */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  <span className="text-sm text-gray-600 font-medium">Active Governance</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {portfolioSummary?.upcomingMeetings || 0}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  meetings this month
                </div>
              </div>
              <div className="text-center">
                <Calendar className="h-8 w-8 text-orange-500" />
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(governanceHealth?.memberEngagement || 0)}% engagement
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeView} onValueChange={setActiveView} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strategic">Strategic Overview</TabsTrigger>
          <TabsTrigger value="operational">Operational Intelligence</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Dashboard</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
        </TabsList>

        {/* Strategic Overview */}
        <TabsContent value="strategic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Portfolio Performance Matrix
                </CardTitle>
                <CardDescription>
                  Organization performance across key governance dimensions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {portfolioData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { dimension: 'Governance', value: governanceHealth?.boardEffectiveness || 0 },
                      { dimension: 'Engagement', value: governanceHealth?.memberEngagement || 0 },
                      { dimension: 'Compliance', value: governanceHealth?.complianceStatus || 0 },
                      { dimension: 'Risk Mgmt', value: governanceHealth?.riskManagement || 0 },
                      { dimension: 'Decision Speed', value: governanceHealth?.decisionVelocity || 0 },
                      { dimension: 'Satisfaction', value: governanceHealth?.stakeholderSatisfaction || 0 }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar
                        name="Performance"
                        dataKey="value"
                        stroke={COLORS.primary}
                        fill={COLORS.primary}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    No portfolio data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Executive Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Powered Executive Insights
                </CardTitle>
                <CardDescription>
                  Strategic recommendations and governance intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-72 overflow-y-auto">
                  {executiveInsights.length > 0 ? (
                    executiveInsights.slice(0, 4).map((insight, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${
                        insight.type === 'opportunity' ? 'border-green-500 bg-green-50' :
                        insight.type === 'risk' ? 'border-red-500 bg-red-50' :
                        insight.type === 'achievement' ? 'border-blue-500 bg-blue-50' :
                        'border-yellow-500 bg-yellow-50'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">{insight.title}</h4>
                          <div className="flex items-center gap-1">
                            <Badge variant={insight.impact === 'critical' ? 'destructive' : 'default'}>
                              {insight.impact}
                            </Badge>
                            <div className="text-xs text-gray-500">{insight.confidence}%</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{insight.description}</p>
                        {insight.actionRequired && insight.recommendedActions && (
                          <div className="mt-2">
                            <Button variant="outline" size="sm">
                              {insight.recommendedActions[0]}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Loading executive insights...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Performance Heatmap */}
          <ExecutiveHeatmap
            title="Portfolio Performance Matrix"
            description="Organization performance across key governance metrics over time"
            data={portfolioData.length > 0 ? portfolioData.flatMap(org => [
              {
                x: 'Q1 2024',
                y: org.name,
                value: org.healthScore,
                trend: 'stable' as const,
                riskLevel: org.complianceRisk,
                metadata: {
                  description: `Health score: ${org.healthScore}%`,
                  lastUpdated: org.lastActivity,
                  confidence: 85
                }
              },
              {
                x: 'Q2 2024',
                y: org.name,
                value: Math.max(0, org.healthScore + Math.floor(Math.random() * 20) - 10),
                trend: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down',
                riskLevel: org.complianceRisk,
                metadata: {
                  description: `Performance trend analysis`,
                  confidence: 78
                }
              },
              {
                x: 'Q3 2024',
                y: org.name,
                value: Math.max(0, org.healthScore + Math.floor(Math.random() * 20) - 10),
                trend: 'stable' as const,
                riskLevel: org.complianceRisk,
                metadata: {
                  description: `Latest performance data`,
                  confidence: 92
                }
              }
            ]) : []}
            xAxisLabel="Time Period"
            yAxisLabel="Organizations"
            metric="Health Score (%)"
            colorScheme="health"
            showTrends={true}
            showFilters={true}
            onCellClick={(dataPoint) => {
              console.log('Clicked on:', dataPoint)
            }}
          />

          {/* Organization Portfolio Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Organization Portfolio Overview
              </CardTitle>
              <CardDescription>
                Detailed view of all organizations under executive oversight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Organization</th>
                      <th className="text-left py-2">Health Score</th>
                      <th className="text-left py-2">Members</th>
                      <th className="text-left py-2">Risk Level</th>
                      <th className="text-left py-2">Decisions Pending</th>
                      <th className="text-left py-2">Last Activity</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioData.map((org) => (
                      <tr key={org.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-gray-500">{org.slug}</div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getHealthScoreColor(org.healthScore)}`}>
                              {org.healthScore}%
                            </span>
                            <div className="w-12 h-2 bg-gray-200 rounded">
                              <div 
                                className={`h-full rounded ${org.healthScore >= 80 ? 'bg-green-500' : org.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${org.healthScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3">{org.memberCount}</td>
                        <td className="py-3">
                          <Badge variant={org.complianceRisk === 'low' ? 'default' : org.complianceRisk === 'critical' ? 'destructive' : 'secondary'}>
                            {org.complianceRisk}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span className={org.keyMetrics.decisionsRequired > 0 ? 'text-orange-600 font-semibold' : ''}>
                            {org.keyMetrics.decisionsRequired}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-gray-500">{org.lastActivity}</td>
                        <td className="py-3">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operational Intelligence */}
        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-Time Activity Feed */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Real-Time Activity Center
                </CardTitle>
                <CardDescription>
                  Live updates from across your governance portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {realtimeActivities.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        {getPriorityIcon(activity.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {activity.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{activity.organization}</span>
                          <span>•</span>
                          <span>{activity.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Governance Health Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Governance Health Breakdown
                </CardTitle>
                <CardDescription>
                  Detailed analysis of governance effectiveness metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Board Effectiveness', score: governanceHealth?.boardEffectiveness || 0, icon: Target },
                    { name: 'Member Engagement', score: governanceHealth?.memberEngagement || 0, icon: Users },
                    { name: 'Compliance Status', score: governanceHealth?.complianceStatus || 0, icon: Shield },
                    { name: 'Risk Management', score: governanceHealth?.riskManagement || 0, icon: AlertTriangle },
                    { name: 'Decision Velocity', score: governanceHealth?.decisionVelocity || 0, icon: Clock },
                    { name: 'Stakeholder Satisfaction', score: governanceHealth?.stakeholderSatisfaction || 0, icon: Star }
                  ].map((metric) => (
                    <div key={metric.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <metric.icon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">{metric.name}</span>
                        </div>
                        <span className={`font-bold ${getHealthScoreColor(metric.score)}`}>
                          {Math.round(metric.score)}%
                        </span>
                      </div>
                      <Progress value={metric.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Executive Actions Panel */}
          <ExecutiveActionsPanel
            userRole={userRole}
            organizationIds={organizations.map(org => org.id)}
            permissions={['schedule_meetings', 'send_communications', 'generate_reports', 'approve_documents', 'manage_compliance']}
            onActionExecute={async (actionId: string, parameters?: any) => {
              console.log('Executing action:', actionId, parameters)
              // Implementation would handle specific actions
            }}
          />
        </TabsContent>

        {/* Compliance Dashboard */}
        <TabsContent value="compliance" className="space-y-6">
          <div className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">Compliance Dashboard</h3>
            <p className="text-gray-500">Comprehensive compliance tracking and risk assessment tools coming soon.</p>
          </div>
        </TabsContent>

        {/* Risk Management */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Heatmap */}
            <ExecutiveHeatmap
              title="Portfolio Risk Assessment"
              description="Risk levels across organizations and risk categories"
              data={portfolioData.length > 0 ? portfolioData.flatMap(org => [
                {
                  x: 'Operational',
                  y: org.name,
                  value: org.riskProfile?.operationalRisk || 45,
                  trend: 'stable' as const,
                  riskLevel: org.complianceRisk,
                  metadata: {
                    description: `Operational risk: ${org.riskProfile?.operationalRisk || 45}%`,
                    confidence: 85
                  }
                },
                {
                  x: 'Compliance',
                  y: org.name,
                  value: org.riskProfile?.complianceRisk || 35,
                  trend: 'down' as const,
                  riskLevel: org.complianceRisk,
                  metadata: {
                    description: `Compliance risk improving`,
                    confidence: 90
                  }
                },
                {
                  x: 'Financial',
                  y: org.name,
                  value: org.riskProfile?.financialRisk || 40,
                  trend: 'stable' as const,
                  riskLevel: org.complianceRisk,
                  metadata: {
                    description: `Financial risk stable`,
                    confidence: 88
                  }
                },
                {
                  x: 'Reputational',
                  y: org.name,
                  value: org.riskProfile?.reputationalRisk || 30,
                  trend: 'up' as const,
                  riskLevel: org.complianceRisk,
                  metadata: {
                    description: `Reputational risk increasing`,
                    confidence: 82
                  }
                }
              ]) : []}
              xAxisLabel="Risk Categories"
              yAxisLabel="Organizations"
              metric="Risk Level (%)"
              colorScheme="risk"
              showTrends={true}
              showFilters={true}
            />

            {/* Risk Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Management Summary
                </CardTitle>
                <CardDescription>
                  Overview of enterprise risk factors and mitigation status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { category: 'Operational Risk', level: 45, trend: 'stable', color: 'text-orange-600' },
                    { category: 'Compliance Risk', level: 35, trend: 'improving', color: 'text-yellow-600' },
                    { category: 'Financial Risk', level: 40, trend: 'stable', color: 'text-red-600' },
                    { category: 'Reputational Risk', level: 30, trend: 'monitor', color: 'text-purple-600' }
                  ].map((risk) => (
                    <div key={risk.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{risk.category}</div>
                        <div className="text-sm text-gray-600">{risk.trend}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${risk.color}`}>
                          {risk.level}%
                        </div>
                        <div className="text-xs text-gray-500">risk level</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}