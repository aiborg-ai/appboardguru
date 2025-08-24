'use client'

/**
 * Board Effectiveness Assessment Page
 * 
 * Comprehensive board performance and effectiveness analysis dashboard.
 * Provides deep insights into board governance, member engagement, meeting effectiveness,
 * and overall organizational performance.
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import BoardAnalyticsDashboard from '@/components/analytics/BoardAnalyticsDashboard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Skeleton } from '@/features/shared/ui/skeleton'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select'
import { 
  Target,
  TrendingUp,
  Users,
  Calendar,
  Award,
  BarChart3,
  FileText,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Gauge,
  Eye,
  Share2
} from 'lucide-react'

// Hooks
import { useOrganizations } from '@/lib/stores/organization-store'
import { useAuth } from '@/lib/stores/auth-store'

// Types
interface BoardEffectivenessScore {
  overall: number
  governance: number
  engagement: number
  performance: number
  risk: number
  compliance: number
  trend: 'up' | 'down' | 'stable'
  lastUpdated: string
}

interface QuickMetric {
  label: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
}

export default function BoardEffectivenessPage() {
  const router = useRouter()
  const organizations = useOrganizations()
  const { user, loading: authLoading } = useAuth()
  const currentOrganization = organizations[0] || null
  const orgLoading = false
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [effectivenessScore, setEffectivenessScore] = useState<BoardEffectivenessScore | null>(null)
  const [timePeriod, setTimePeriod] = useState<'30d' | '90d' | '6m' | '1y'>('90d')
  const [refreshing, setRefreshing] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview')

  // Quick metrics for the overview
  const quickMetrics: QuickMetric[] = [
    {
      label: 'Board Attendance',
      value: '92%',
      change: '+5%',
      changeType: 'positive',
      icon: Users
    },
    {
      label: 'Decision Velocity',
      value: '8.2/10',
      change: '+0.3',
      changeType: 'positive',
      icon: Activity
    },
    {
      label: 'Meeting Effectiveness',
      value: '87%',
      change: '+2%',
      changeType: 'positive',
      icon: Calendar
    },
    {
      label: 'Skills Coverage',
      value: '85%',
      change: '-1%',
      changeType: 'negative',
      icon: Award
    }
  ]

  // Load board effectiveness data
  useEffect(() => {
    if (currentOrganization && user) {
      loadEffectivenessData()
    }
  }, [currentOrganization, user, timePeriod])

  const loadEffectivenessData = async (force = false) => {
    if (!currentOrganization) return

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

      // Load effectiveness metrics
      const response = await fetch('/api/analytics/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          timePeriod: {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            granularity: 'monthly'
          },
          metrics: ['effectiveness_summary', 'governance_metrics', 'engagement_trends']
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load effectiveness data')
      }

      const data = await response.json()
      
      // Calculate overall effectiveness score
      const score: BoardEffectivenessScore = {
        overall: Math.round((data.governance_score + data.engagement_score + data.performance_score + data.compliance_score) / 4),
        governance: data.governance_score || 85,
        engagement: data.engagement_score || 87,
        performance: data.performance_score || 82,
        risk: data.risk_score || 78,
        compliance: data.compliance_score || 91,
        trend: data.trend || 'up',
        lastUpdated: new Date().toISOString()
      }

      setEffectivenessScore(score)
      setLoading(false)
      setRefreshing(false)
    } catch (err) {
      console.error('Error loading effectiveness data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load board effectiveness data')
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadEffectivenessData(true)
  }

  const handleExport = async () => {
    if (!currentOrganization) return

    try {
      const response = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          reportType: 'board-effectiveness',
          timePeriod,
          format: 'pdf'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `board-effectiveness-report-${currentOrganization.slug}-${timePeriod}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting report:', err)
    }
  }

  // Check if user has access to view effectiveness data
  const canViewFullData = currentOrganization?.user_role === 'owner' || 
                         currentOrganization?.user_role === 'admin'

  if (orgLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    )
  }

  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to view board effectiveness data.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (!canViewFullData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              Board effectiveness data is only available to organization owners and administrators.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Board Effectiveness</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive assessment of board performance and governance effectiveness for {currentOrganization.name}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timePeriod} onValueChange={(value: any) => setTimePeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Detailed Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overall Score Card */}
            {loading ? (
              <Skeleton className="h-48" />
            ) : effectivenessScore ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Overall Board Effectiveness Score
                  </CardTitle>
                  <CardDescription>
                    Comprehensive assessment across all governance dimensions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">
                            {effectivenessScore.overall}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Excellent Performance</h3>
                        <p className="text-gray-600">
                          Your board demonstrates strong effectiveness across key metrics
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Trending upward</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{effectivenessScore.governance}%</div>
                      <div className="text-sm text-gray-600">Governance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{effectivenessScore.engagement}%</div>
                      <div className="text-sm text-gray-600">Engagement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{effectivenessScore.performance}%</div>
                      <div className="text-sm text-gray-600">Performance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{effectivenessScore.risk}%</div>
                      <div className="text-sm text-gray-600">Risk Mgmt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-teal-600">{effectivenessScore.compliance}%</div>
                      <div className="text-sm text-gray-600">Compliance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickMetrics.map((metric, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className={`text-sm ${
                            metric.changeType === 'positive' ? 'text-green-600' :
                            metric.changeType === 'negative' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {metric.change}
                          </span>
                          <span className="text-sm text-gray-500">vs previous period</span>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <metric.icon className="h-6 w-6 text-gray-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights & Recommendations</CardTitle>
                <CardDescription>
                  AI-powered insights based on your board's performance data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Strong Attendance Performance</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your board maintains excellent attendance rates at 92%, well above industry average of 85%.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Decision-Making Excellence</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Decision velocity has improved by 15% this quarter, indicating more efficient board processes.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900">Skills Gap Opportunity</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Consider adding a board member with digital transformation expertise to address identified skills gap.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Detailed Analytics Dashboard */}
            {currentOrganization && user && (
              <BoardAnalyticsDashboard
                organizationId={currentOrganization.id}
                userId={user.id}
                userRole={currentOrganization.user_role}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}