'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart,
  Treemap, Scatter, ScatterChart, RadialBarChart, RadialBar,
  Legend, ReferenceLine
} from 'recharts'
import { 
  AlertTriangle, Shield, FileText, Users, Calendar, 
  TrendingUp, TrendingDown, CheckCircle, XCircle,
  Clock, Target, Activity, BarChart3, AlertCircle,
  Zap, Eye, Download, Filter, RefreshCw
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

// ==========================================
// INTERFACES AND TYPES
// ==========================================

interface ComplianceMetrics {
  overallScore: number
  frameworksTracked: number
  activePolicies: number
  pendingAssessments: number
  criticalViolations: number
  upcomingDeadlines: number
  trainingCompletionRate: number
  riskScore: number
}

interface FrameworkStatus {
  id: string
  name: string
  acronym: string
  complianceScore: number
  lastAssessment: string
  nextAssessment: string
  status: 'compliant' | 'partially_compliant' | 'non_compliant' | 'pending'
  criticalIssues: number
  trends: 'improving' | 'stable' | 'declining'
  jurisdiction: string
}

interface RiskHeatMapData {
  category: string
  impact: number
  likelihood: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  count: number
}

interface ComplianceTrend {
  date: string
  overallScore: number
  violations: number
  assessments: number
  trainingCompletion: number
  policyUpdates: number
}

interface PolicyMetrics {
  id: string
  title: string
  framework: string
  status: 'active' | 'draft' | 'expired' | 'under_review'
  acknowledgmentRate: number
  lastUpdated: string
  nextReview: string
  violationCount: number
  trainingRequired: boolean
}

interface ViolationData {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  framework: string
  detectedDate: string
  status: 'open' | 'investigating' | 'resolved'
  daysOpen: number
  assignedTo: string
}

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================

export default function ComplianceDashboard({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d')
  const [selectedFramework, setSelectedFramework] = useState<string>('all')
  const [dashboardData, setDashboardData] = useState<any>(null)
  const { toast } = useToast()

  // Sample data - would be fetched from API
  const sampleMetrics: ComplianceMetrics = {
    overallScore: 85,
    frameworksTracked: 8,
    activePolicies: 47,
    pendingAssessments: 3,
    criticalViolations: 2,
    upcomingDeadlines: 12,
    trainingCompletionRate: 78,
    riskScore: 15
  }

  const sampleFrameworks: FrameworkStatus[] = [
    {
      id: 'gdpr',
      name: 'General Data Protection Regulation',
      acronym: 'GDPR',
      complianceScore: 92,
      lastAssessment: '2024-01-15',
      nextAssessment: '2024-07-15',
      status: 'compliant',
      criticalIssues: 0,
      trends: 'stable',
      jurisdiction: 'EU'
    },
    {
      id: 'sox',
      name: 'Sarbanes-Oxley Act',
      acronym: 'SOX',
      complianceScore: 88,
      lastAssessment: '2024-02-01',
      nextAssessment: '2024-08-01',
      status: 'compliant',
      criticalIssues: 1,
      trends: 'improving',
      jurisdiction: 'US'
    },
    {
      id: 'iso27001',
      name: 'ISO 27001',
      acronym: 'ISO27001',
      complianceScore: 76,
      lastAssessment: '2023-12-10',
      nextAssessment: '2024-06-10',
      status: 'partially_compliant',
      criticalIssues: 3,
      trends: 'declining',
      jurisdiction: 'Global'
    }
  ]

  const sampleRiskHeatMap: RiskHeatMapData[] = [
    { category: 'Data Privacy', impact: 4, likelihood: 3, riskLevel: 'high', count: 5 },
    { category: 'Financial Reporting', impact: 5, likelihood: 2, riskLevel: 'medium', count: 8 },
    { category: 'Cybersecurity', impact: 5, likelihood: 4, riskLevel: 'critical', count: 3 },
    { category: 'Operational', impact: 3, likelihood: 3, riskLevel: 'medium', count: 12 },
    { category: 'Third Party', impact: 4, likelihood: 2, riskLevel: 'medium', count: 7 },
    { category: 'Regulatory Change', impact: 3, likelihood: 4, riskLevel: 'medium', count: 4 }
  ]

  const sampleTrends: ComplianceTrend[] = [
    { date: '2024-01', overallScore: 82, violations: 15, assessments: 4, trainingCompletion: 75, policyUpdates: 3 },
    { date: '2024-02', overallScore: 84, violations: 12, assessments: 6, trainingCompletion: 78, policyUpdates: 5 },
    { date: '2024-03', overallScore: 85, violations: 10, assessments: 3, trainingCompletion: 78, policyUpdates: 2 },
    { date: '2024-04', overallScore: 87, violations: 8, assessments: 5, trainingCompletion: 82, policyUpdates: 4 },
    { date: '2024-05', overallScore: 85, violations: 11, assessments: 2, trainingCompletion: 78, policyUpdates: 1 }
  ]

  useEffect(() => {
    loadDashboardData()
  }, [organizationId, selectedTimeframe, selectedFramework])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setDashboardData({
        metrics: sampleMetrics,
        frameworks: sampleFrameworks,
        riskHeatMap: sampleRiskHeatMap,
        trends: sampleTrends
      })
    } catch (error) {
      toast({
        title: 'Error Loading Dashboard',
        description: 'Failed to load compliance dashboard data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboard = async () => {
    setRefreshing(true)
    try {
      await loadDashboardData()
      toast({
        title: 'Dashboard Refreshed',
        description: 'Compliance dashboard data has been updated',
        variant: 'default'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'compliant': 'bg-green-100 text-green-800',
      'partially_compliant': 'bg-yellow-100 text-yellow-800',
      'non_compliant': 'bg-red-100 text-red-800',
      'pending': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || colors.pending
  }

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />
    return <div className="h-4 w-4 rounded-full bg-gray-300" />
  }

  const getRiskColor = (level: string) => {
    const colors = {
      'low': '#22c55e',
      'medium': '#f59e0b',
      'high': '#ef4444',
      'critical': '#dc2626'
    }
    return colors[level as keyof typeof colors] || colors.medium
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive view of your organization's compliance posture
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button
            onClick={refreshDashboard}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Overall Compliance Score"
          value={`${dashboardData.metrics.overallScore}%`}
          change="+2.1%"
          trend="up"
          icon={<Shield className="h-5 w-5" />}
          color="blue"
        />
        <MetricsCard
          title="Critical Violations"
          value={dashboardData.metrics.criticalViolations.toString()}
          change="-3"
          trend="down"
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
        />
        <MetricsCard
          title="Training Completion"
          value={`${dashboardData.metrics.trainingCompletionRate}%`}
          change="+5.2%"
          trend="up"
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
        <MetricsCard
          title="Upcoming Deadlines"
          value={dashboardData.metrics.upcomingDeadlines.toString()}
          change="+2"
          trend="up"
          icon={<Calendar className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Score Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Compliance Score Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="overallScore" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <ReferenceLine y={85} stroke="#ef4444" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Framework Status */}
            <Card>
              <CardHeader>
                <CardTitle>Framework Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.frameworks.map((framework: FrameworkStatus) => (
                    <div key={framework.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium">{framework.acronym}</div>
                          <div className="text-sm text-gray-600">{framework.jurisdiction}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(framework.status)}>
                          {framework.status.replace('_', ' ')}
                        </Badge>
                        <div className="text-right">
                          <div className="font-medium">{framework.complianceScore}%</div>
                          <div className="flex items-center text-sm text-gray-600">
                            {getTrendIcon(framework.trends)}
                            <span className="ml-1">{framework.trends}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Heat Map */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Heat Map</CardTitle>
              <CardDescription>
                Risk assessment across different categories based on impact and likelihood
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={dashboardData.riskHeatMap}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="likelihood" 
                    domain={[0, 5]} 
                    tickCount={6}
                    label={{ value: 'Likelihood', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    dataKey="impact" 
                    domain={[0, 5]} 
                    tickCount={6}
                    label={{ value: 'Impact', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-md">
                            <p className="font-medium">{data.category}</p>
                            <p>Risk Level: <span className="font-medium" style={{color: getRiskColor(data.riskLevel)}}>{data.riskLevel}</span></p>
                            <p>Count: {data.count}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter 
                    dataKey="count" 
                    fill={(entry: any) => getRiskColor(entry.riskLevel)}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frameworks" className="space-y-4">
          <FrameworksView frameworks={dashboardData.frameworks} />
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <RiskAnalysisView riskData={dashboardData.riskHeatMap} />
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <PoliciesView />
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <ViolationsView />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <TrendsView trends={dashboardData.trends} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ==========================================
// SUPPORTING COMPONENTS
// ==========================================

function MetricsCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  color 
}: { 
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ReactNode
  color: 'blue' | 'red' | 'green' | 'yellow'
}) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-600">{title}</div>
            <div className={`text-xs flex items-center mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {change}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FrameworksView({ frameworks }: { frameworks: FrameworkStatus[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {frameworks.map((framework) => (
        <Card key={framework.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{framework.acronym}</CardTitle>
              <Badge className={`${framework.status === 'compliant' ? 'bg-green-100 text-green-800' : 
                framework.status === 'partially_compliant' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'}`}>
                {framework.status.replace('_', ' ')}
              </Badge>
            </div>
            <CardDescription>{framework.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Compliance Score</span>
                  <span>{framework.complianceScore}%</span>
                </div>
                <Progress value={framework.complianceScore} className="h-2" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Last Assessment</div>
                  <div className="font-medium">{format(new Date(framework.lastAssessment), 'MMM dd, yyyy')}</div>
                </div>
                <div>
                  <div className="text-gray-600">Next Assessment</div>
                  <div className="font-medium">{format(new Date(framework.nextAssessment), 'MMM dd, yyyy')}</div>
                </div>
              </div>

              {framework.criticalIssues > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {framework.criticalIssues} critical issue{framework.criticalIssues > 1 ? 's' : ''} require immediate attention
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                  {getTrendIcon(framework.trends)}
                  <span className="ml-2 text-gray-600">{framework.trends}</span>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RiskAnalysisView({ riskData }: { riskData: RiskHeatMapData[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {['critical', 'high', 'medium', 'low'].map((level) => {
              const count = riskData.filter(r => r.riskLevel === level).length
              const total = riskData.reduce((sum, r) => sum + r.count, 0)
              return (
                <div key={level} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold" style={{color: getRiskColor(level)}}>{count}</div>
                  <div className="text-sm text-gray-600 capitalize">{level} Risk</div>
                  <div className="text-xs text-gray-500 mt-1">{((count / riskData.length) * 100).toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function PoliciesView() {
  // Implementation for policies view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-8">
          Policy management view coming soon...
        </div>
      </CardContent>
    </Card>
  )
}

function ViolationsView() {
  // Implementation for violations view
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Violations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-8">
          Violations view coming soon...
        </div>
      </CardContent>
    </Card>
  )
}

function TrendsView({ trends }: { trends: ComplianceTrend[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Multi-Metric Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="overallScore" stroke="#2563eb" name="Compliance Score" />
              <Line yAxisId="left" type="monotone" dataKey="trainingCompletion" stroke="#16a34a" name="Training Completion" />
              <Line yAxisId="right" type="monotone" dataKey="violations" stroke="#dc2626" name="Violations" />
              <Line yAxisId="right" type="monotone" dataKey="assessments" stroke="#f59e0b" name="Assessments" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function getTrendIcon(trend: string) {
  if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />
  if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />
  return <div className="h-4 w-4 rounded-full bg-gray-300" />
}

function getRiskColor(level: string) {
  const colors = {
    'low': '#22c55e',
    'medium': '#f59e0b',
    'high': '#ef4444',
    'critical': '#dc2626'
  }
  return colors[level as keyof typeof colors] || colors.medium
}