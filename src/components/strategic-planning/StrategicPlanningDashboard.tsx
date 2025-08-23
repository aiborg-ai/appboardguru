/**
 * Strategic Planning Dashboard
 * 
 * Main dashboard component that integrates all strategic planning modules:
 * - Executive summary and key metrics
 * - Strategic initiatives overview
 * - OKR progress tracking
 * - Performance scorecards
 * - Scenario analysis results
 * - Financial insights
 * - Predictive analytics
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  BarChart3, LineChart, PieChart, TrendingUp, TrendingDown, 
  Target, DollarSign, Users, Activity, Zap, Award,
  AlertTriangle, CheckCircle, Eye, Settings, RefreshCw,
  Calendar, Clock, Brain, Gauge, Map, ChevronRight
} from 'lucide-react'

import OKRCascadingSystem from './OKRCascadingSystem'
import ScenarioPlanningTools from './ScenarioPlanningTools'
import PerformanceScorecard from './PerformanceScorecard'
import StrategicPlanningWorkflows from './StrategicPlanningWorkflows'
import FinancialIntegration from './FinancialIntegration'

import { useStrategicPlanning } from '../../hooks/useStrategicPlanning'
import {
  StrategicInitiative,
  OKR,
  PerformanceScorecard as ScorecardType,
  Alert,
  Recommendation
} from '../../types/strategic-planning'

interface StrategicPlanningDashboardProps {
  organizationId: string
  userId: string
  userRole: 'board' | 'executive' | 'manager' | 'member'
}

interface DashboardMetrics {
  total_initiatives: number
  active_initiatives: number
  total_okrs: number
  on_track_okrs: number
  total_budget_allocated: number
  budget_utilization: number
  overall_strategic_health: number
  alignment_score: number
  execution_velocity: number
  risk_exposure: number
}

export const StrategicPlanningDashboard: React.FC<StrategicPlanningDashboardProps> = ({
  organizationId,
  userId,
  userRole
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState<'quarter' | 'year' | 'all'>('quarter')
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const {
    initiatives,
    initiativeAnalytics,
    okrHierarchy,
    scorecards,
    budgetOptimization,
    forecasts,
    isLoading,
    error,
    refreshData
  } = useStrategicPlanning(organizationId)

  // Auto-refresh functionality
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        refreshData()
        setLastUpdated(new Date())
      }, refreshInterval)
      
      return () => clearInterval(interval)
    }
  }, [refreshInterval, refreshData])

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo((): DashboardMetrics => {
    const totalInitiatives = initiatives?.length || 0
    const activeInitiatives = initiatives?.filter(i => i.status === 'active').length || 0
    
    const totalOKRs = okrHierarchy?.performance_summary?.on_track + 
                     okrHierarchy?.performance_summary?.at_risk + 
                     okrHierarchy?.performance_summary?.off_track || 0
    const onTrackOKRs = okrHierarchy?.performance_summary?.on_track || 0
    
    const totalBudgetAllocated = initiativeAnalytics?.total_budget || 0
    const budgetUtilization = initiativeAnalytics?.budget_utilization || 0
    
    // Calculate composite scores
    const overallHealth = initiatives?.length > 0 
      ? initiatives.reduce((sum, i) => sum + i.health_score, 0) / initiatives.length 
      : 0
    
    const alignmentScore = okrHierarchy?.alignment_analysis?.overall_alignment_score || 0
    
    const executionVelocity = initiatives?.length > 0
      ? initiatives.reduce((sum, i) => sum + i.progress_percentage, 0) / initiatives.length
      : 0

    const riskExposure = initiatives?.length > 0
      ? initiatives.reduce((sum, i) => sum + i.risk_score, 0) / initiatives.length
      : 0

    return {
      total_initiatives: totalInitiatives,
      active_initiatives: activeInitiatives,
      total_okrs: totalOKRs,
      on_track_okrs: onTrackOKRs,
      total_budget_allocated: totalBudgetAllocated,
      budget_utilization: budgetUtilization,
      overall_strategic_health: overallHealth,
      alignment_score: alignmentScore,
      execution_velocity: executionVelocity,
      risk_exposure: riskExposure
    }
  }, [initiatives, initiativeAnalytics, okrHierarchy])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getHealthColor = (score: number) => {
    if (score >= 7) return 'text-green-600 bg-green-50'
    if (score >= 4) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const renderExecutiveSummary = () => (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Strategic Health</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardMetrics.overall_strategic_health.toFixed(1)}/10
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={dashboardMetrics.overall_strategic_health * 10} className="h-2" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Execution Velocity</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardMetrics.execution_velocity.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={dashboardMetrics.execution_velocity} className="h-2" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">OKR Alignment</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardMetrics.alignment_score.toFixed(1)}/10
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={dashboardMetrics.alignment_score * 10} className="h-2" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Budget Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardMetrics.budget_utilization.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={dashboardMetrics.budget_utilization} className="h-2" />
          </div>
        </Card>
      </div>

      {/* Strategic Initiatives Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Strategic Initiatives</h3>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('initiatives')}>
              <Eye className="h-4 w-4 mr-1" />
              View All
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardMetrics.total_initiatives}
                </p>
                <p className="text-sm text-blue-700">Total</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {dashboardMetrics.active_initiatives}
                </p>
                <p className="text-sm text-green-700">Active</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-600">
                  {formatCurrency(dashboardMetrics.total_budget_allocated)}
                </p>
                <p className="text-sm text-gray-700">Budget</p>
              </div>
            </div>

            {initiatives?.slice(0, 3).map(initiative => (
              <div key={initiative.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm truncate">{initiative.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {initiative.category}
                    </Badge>
                    <Badge className={`text-xs ${getHealthColor(initiative.health_score)}`}>
                      {initiative.health_score}/10
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{initiative.progress_percentage}%</p>
                  <Progress value={initiative.progress_percentage} className="w-16 h-1 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">OKR Performance</h3>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('okrs')}>
              <Target className="h-4 w-4 mr-1" />
              View Hierarchy
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-600">
                  {okrHierarchy?.performance_summary?.on_track || 0}
                </p>
                <p className="text-xs text-green-700">On Track</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-600">
                  {okrHierarchy?.performance_summary?.at_risk || 0}
                </p>
                <p className="text-xs text-yellow-700">At Risk</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-600">
                  {okrHierarchy?.performance_summary?.off_track || 0}
                </p>
                <p className="text-xs text-red-700">Off Track</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">Average Progress</span>
                <span className="text-sm font-bold text-blue-900">
                  {okrHierarchy?.performance_summary?.average_progress?.toFixed(0) || 0}%
                </span>
              </div>
              <Progress 
                value={okrHierarchy?.performance_summary?.average_progress || 0} 
                className="h-2" 
              />
            </div>

            {okrHierarchy?.alignment_analysis?.gaps && okrHierarchy.alignment_analysis.gaps.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Alignment Gaps</span>
                </div>
                <p className="text-xs text-yellow-700">
                  {okrHierarchy.alignment_analysis.gaps.length} gap(s) identified requiring attention
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Performance Scorecards */}
      {scorecards && scorecards.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Performance Scorecards</h3>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('scorecards')}>
              <Gauge className="h-4 w-4 mr-1" />
              View Scorecards
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scorecards.slice(0, 3).map(scorecard => (
              <div key={scorecard.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{scorecard.name}</h4>
                  <Badge className="bg-blue-500 text-white text-xs">
                    {scorecard.overall_score.toFixed(1)}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {scorecard.perspectives.length} perspectives • {scorecard.scorecard_type}
                </div>
                <Progress value={scorecard.overall_score * 10} className="h-1" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Alerts and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Recent Alerts
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Budget Overrun Alert</p>
                  <p className="text-xs text-red-700">Digital Transformation initiative is 95% over budget</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Milestone Delay</p>
                  <p className="text-xs text-yellow-700">Q4 strategic review meeting overdue by 3 days</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">OKR Update Required</p>
                  <p className="text-xs text-blue-700">5 key results need progress updates</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Recommendations
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">Reallocate Budget</p>
                  <p className="text-xs text-green-700">Move $50K from underperforming to high-ROI initiatives</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-900">Improve Alignment</p>
                  <p className="text-xs text-purple-700">Create department-level OKRs to cascade board objectives</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-900">Accelerate Execution</p>
                  <p className="text-xs text-orange-700">Focus resources on 3 critical initiatives for maximum impact</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading strategic planning dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Try Again
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Strategic Planning Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive strategic oversight and performance management
          </p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={refreshInterval || ''}
            onChange={(e) => setRefreshInterval(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Manual</option>
            <option value="30000">30 seconds</option>
            <option value="60000">1 minute</option>
            <option value="300000">5 minutes</option>
          </select>

          <Button variant="outline" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last Updated Indicator */}
      <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
        <span>Last updated: {lastUpdated.toLocaleString()}</span>
        {refreshInterval && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Auto-refresh enabled
          </span>
        )}
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
          <TabsTrigger value="okrs">OKRs</TabsTrigger>
          <TabsTrigger value="scorecards">Scorecards</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderExecutiveSummary()}
        </TabsContent>

        <TabsContent value="initiatives">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Strategic Initiatives</h2>
            <p className="text-gray-600">Strategic initiatives management coming soon</p>
          </Card>
        </TabsContent>

        <TabsContent value="okrs">
          <OKRCascadingSystem
            organizationId={organizationId}
            userId={userId}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="scorecards">
          <PerformanceScorecard
            organizationId={organizationId}
            userId={userId}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="scenarios">
          <ScenarioPlanningTools
            organizationId={organizationId}
            userId={userId}
          />
        </TabsContent>

        <TabsContent value="workflows">
          <StrategicPlanningWorkflows
            organizationId={organizationId}
            userId={userId}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialIntegration
            organizationId={organizationId}
            userId={userId}
            userRole={userRole}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StrategicPlanningDashboard