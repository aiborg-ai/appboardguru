'use client'

/**
 * ESG Scorecard Page
 * 
 * Environmental, Social, and Governance scorecard providing comprehensive
 * sustainability metrics, stakeholder impact assessment, and regulatory compliance
 * tracking for modern corporate governance.
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2,
  Leaf,
  Users,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Target,
  BarChart3,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Zap,
  Globe,
  Heart,
  Scale,
  Recycle,
  Factory,
  Car,
  Home
} from 'lucide-react'

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
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
  Radar
} from 'recharts'

// Hooks
import { useOrganizationStore } from '@/lib/stores/organization-store'
import { useAuthStore } from '@/lib/stores/auth-store'

// Types
interface ESGScore {
  overall: number
  environmental: number
  social: number
  governance: number
  trend: 'improving' | 'stable' | 'declining'
  last_updated: string
  industry_percentile: number
}

interface ESGMetric {
  id: string
  category: 'environmental' | 'social' | 'governance'
  name: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  performance: 'excellent' | 'good' | 'fair' | 'poor'
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface Initiative {
  id: string
  title: string
  category: 'environmental' | 'social' | 'governance'
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  progress: number
  impact_score: number
  target_completion: string
  responsible_party: string
  description: string
}

interface StakeholderFeedback {
  category: string
  score: number
  response_rate: number
  trend: 'up' | 'down' | 'stable'
  key_concerns: string[]
}

const ESG_COLORS = {
  environmental: '#10B981',
  social: '#3B82F6',
  governance: '#8B5CF6',
  excellent: '#22C55E',
  good: '#84CC16',
  fair: '#F59E0B',
  poor: '#EF4444'
}

const CHART_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4']

export default function ESGScorecardPage() {
  const router = useRouter()
  const { currentOrganization, loading: orgLoading } = useOrganizationStore()
  const { user } = useAuthStore()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [esgScore, setESGScore] = useState<ESGScore | null>(null)
  const [metrics, setMetrics] = useState<ESGMetric[]>([])
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [stakeholderFeedback, setStakeholderFeedback] = useState<StakeholderFeedback[]>([])
  const [timePeriod, setTimePeriod] = useState<'30d' | '90d' | '6m' | '1y'>('1y')
  const [refreshing, setRefreshing] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'metrics' | 'initiatives' | 'stakeholders'>('overview')

  // Mock ESG metrics data
  const mockMetrics: ESGMetric[] = [
    // Environmental
    {
      id: 'carbon-emissions',
      category: 'environmental',
      name: 'Carbon Emissions Reduction',
      value: 32,
      target: 50,
      unit: '% reduction vs baseline',
      trend: 'up',
      performance: 'good',
      description: 'Total CO2 emissions reduction from operations',
      icon: Leaf
    },
    {
      id: 'renewable-energy',
      category: 'environmental',
      name: 'Renewable Energy Usage',
      value: 68,
      target: 100,
      unit: '% renewable',
      trend: 'up',
      performance: 'good',
      description: 'Percentage of energy from renewable sources',
      icon: Zap
    },
    {
      id: 'waste-reduction',
      category: 'environmental',
      name: 'Waste Reduction',
      value: 45,
      target: 60,
      unit: '% reduction',
      trend: 'up',
      performance: 'fair',
      description: 'Operational waste reduction initiatives',
      icon: Recycle
    },
    // Social
    {
      id: 'diversity-inclusion',
      category: 'social',
      name: 'Board Diversity',
      value: 42,
      target: 50,
      unit: '% diverse members',
      trend: 'up',
      performance: 'good',
      description: 'Gender and ethnic diversity on board',
      icon: Users
    },
    {
      id: 'employee-satisfaction',
      category: 'social',
      name: 'Employee Satisfaction',
      value: 87,
      target: 90,
      unit: '% satisfaction',
      trend: 'stable',
      performance: 'excellent',
      description: 'Annual employee engagement survey',
      icon: Heart
    },
    {
      id: 'community-investment',
      category: 'social',
      name: 'Community Investment',
      value: 2.8,
      target: 3.0,
      unit: '% of revenue',
      trend: 'up',
      performance: 'good',
      description: 'Investment in local communities',
      icon: Globe
    },
    // Governance
    {
      id: 'board-independence',
      category: 'governance',
      name: 'Board Independence',
      value: 78,
      target: 80,
      unit: '% independent',
      trend: 'stable',
      performance: 'good',
      description: 'Independent board member percentage',
      icon: Scale
    },
    {
      id: 'ethics-training',
      category: 'governance',
      name: 'Ethics Training',
      value: 95,
      target: 100,
      unit: '% completion',
      trend: 'up',
      performance: 'excellent',
      description: 'Annual ethics training completion',
      icon: Shield
    }
  ]

  // Mock initiatives data
  const mockInitiatives: Initiative[] = [
    {
      id: '1',
      title: 'Carbon Neutral Operations by 2030',
      category: 'environmental',
      status: 'in_progress',
      progress: 65,
      impact_score: 9,
      target_completion: '2030-12-31',
      responsible_party: 'Chief Sustainability Officer',
      description: 'Comprehensive plan to achieve carbon neutrality across all operations'
    },
    {
      id: '2',
      title: 'Diversity & Inclusion Program',
      category: 'social',
      status: 'in_progress',
      progress: 78,
      impact_score: 8,
      target_completion: '2025-06-30',
      responsible_party: 'Chief Diversity Officer',
      description: 'Initiative to improve diversity at all organizational levels'
    },
    {
      id: '3',
      title: 'Enhanced Board Governance Framework',
      category: 'governance',
      status: 'completed',
      progress: 100,
      impact_score: 7,
      target_completion: '2024-03-31',
      responsible_party: 'Board Secretary',
      description: 'Updated governance policies and procedures'
    },
    {
      id: '4',
      title: 'Supply Chain Sustainability Assessment',
      category: 'environmental',
      status: 'planning',
      progress: 25,
      impact_score: 8,
      target_completion: '2025-12-31',
      responsible_party: 'Chief Procurement Officer',
      description: 'Comprehensive assessment of supplier ESG practices'
    }
  ]

  // Mock stakeholder feedback
  const mockStakeholderFeedback: StakeholderFeedback[] = [
    {
      category: 'Investors',
      score: 8.2,
      response_rate: 76,
      trend: 'up',
      key_concerns: ['Climate risk disclosure', 'Long-term sustainability strategy']
    },
    {
      category: 'Employees',
      score: 7.8,
      response_rate: 89,
      trend: 'stable',
      key_concerns: ['Work-life balance', 'Career development', 'DEI initiatives']
    },
    {
      category: 'Customers',
      score: 8.5,
      response_rate: 42,
      trend: 'up',
      key_concerns: ['Product sustainability', 'Ethical sourcing', 'Community impact']
    },
    {
      category: 'Communities',
      score: 7.1,
      response_rate: 34,
      trend: 'up',
      key_concerns: ['Local employment', 'Environmental impact', 'Community investment']
    }
  ]

  // ESG trend data for charts
  const esgTrendData = [
    { month: 'Jan', environmental: 72, social: 78, governance: 85, overall: 78 },
    { month: 'Feb', environmental: 74, social: 79, governance: 86, overall: 80 },
    { month: 'Mar', environmental: 76, social: 81, governance: 86, overall: 81 },
    { month: 'Apr', environmental: 78, social: 82, governance: 87, overall: 82 },
    { month: 'May', environmental: 80, social: 83, governance: 87, overall: 83 },
    { month: 'Jun', environmental: 82, social: 84, governance: 88, overall: 85 }
  ]

  // Load ESG data
  useEffect(() => {
    if (currentOrganization && user) {
      loadESGData()
    }
  }, [currentOrganization, user, timePeriod])

  const loadESGData = async (force = false) => {
    if (!currentOrganization) return

    if (force) setRefreshing(true)
    setLoading(!force)
    setError(null)

    try {
      // Mock API call - in real implementation, this would fetch from /api/esg/scorecard
      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockScore: ESGScore = {
        overall: 85,
        environmental: 78,
        social: 84,
        governance: 88,
        trend: 'improving',
        last_updated: new Date().toISOString(),
        industry_percentile: 87
      }

      setESGScore(mockScore)
      setMetrics(mockMetrics)
      setInitiatives(mockInitiatives)
      setStakeholderFeedback(mockStakeholderFeedback)
      setLoading(false)
      setRefreshing(false)
    } catch (err) {
      console.error('Error loading ESG data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ESG data')
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadESGData(true)
  }

  const handleExport = async () => {
    if (!currentOrganization) return

    try {
      // Mock export functionality
      console.log('Exporting ESG report...')
    } catch (err) {
      console.error('Error exporting report:', err)
    }
  }

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-lime-600 bg-lime-50 border-lime-200'
      case 'fair': return 'text-amber-600 bg-amber-50 border-amber-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'planning': return 'text-amber-600 bg-amber-50'
      case 'on_hold': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'environmental': return Leaf
      case 'social': return Users
      case 'governance': return Shield
      default: return Activity
    }
  }

  // Check if user has access to view ESG data
  const canViewESGData = currentOrganization?.user_role === 'owner' || 
                        currentOrganization?.user_role === 'admin'

  if (orgLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 3 }).map((_, i) => (
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
              Please select an organization to view ESG scorecard data.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  if (!canViewESGData) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              ESG scorecard data is only available to organization owners and administrators.
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
            <h1 className="text-3xl font-bold text-gray-900">ESG Scorecard</h1>
            <p className="text-gray-600 mt-1">
              Environmental, Social, and Governance performance tracking for {currentOrganization.name}
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overall ESG Score */}
            {loading ? (
              <Skeleton className="h-48" />
            ) : esgScore ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Overall ESG Performance
                  </CardTitle>
                  <CardDescription>
                    Comprehensive sustainability and governance assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                          <span className="text-2xl font-bold text-white">
                            {esgScore.overall}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Strong ESG Performance</h3>
                        <p className="text-gray-600">
                          Above industry average with improving trend
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">
                            {esgScore.industry_percentile}th percentile in industry
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ESG Category Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Leaf className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-600">{esgScore.environmental}</div>
                      <div className="text-sm text-gray-600">Environmental</div>
                      <Progress value={esgScore.environmental} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-blue-600">{esgScore.social}</div>
                      <div className="text-sm text-gray-600">Social</div>
                      <Progress value={esgScore.social} className="mt-2" />
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-purple-600">{esgScore.governance}</div>
                      <div className="text-sm text-gray-600">Governance</div>
                      <Progress value={esgScore.governance} className="mt-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* ESG Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>ESG Performance Trends</CardTitle>
                <CardDescription>
                  Performance evolution across ESG categories over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={esgTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Legend />
                      <Line type="monotone" dataKey="overall" stroke="#22C55E" strokeWidth={3} name="Overall" />
                      <Line type="monotone" dataKey="environmental" stroke="#10B981" strokeWidth={2} name="Environmental" />
                      <Line type="monotone" dataKey="social" stroke="#3B82F6" strokeWidth={2} name="Social" />
                      <Line type="monotone" dataKey="governance" stroke="#8B5CF6" strokeWidth={2} name="Governance" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mockMetrics.slice(0, 4).map((metric) => (
                <Card key={metric.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className={`h-5 w-5 ${
                        metric.category === 'environmental' ? 'text-green-600' :
                        metric.category === 'social' ? 'text-blue-600' : 'text-purple-600'
                      }`} />
                      <span className="text-sm font-medium text-gray-600">{metric.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{metric.value}</span>
                      <span className="text-sm text-gray-500">{metric.unit}</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Target: {metric.target}{metric.unit}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPerformanceColor(metric.performance)}`}
                        >
                          {metric.performance.toUpperCase()}
                        </Badge>
                      </div>
                      <Progress value={(metric.value / metric.target) * 100} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            {/* Detailed Metrics by Category */}
            <div className="space-y-6">
              {['environmental', 'social', 'governance'].map((category) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 capitalize">
                      {getCategoryIcon(category)({ className: `h-5 w-5 ${
                        category === 'environmental' ? 'text-green-600' :
                        category === 'social' ? 'text-blue-600' : 'text-purple-600'
                      }` })}
                      {category} Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {mockMetrics
                        .filter(metric => metric.category === category)
                        .map((metric) => (
                          <div key={metric.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900">{metric.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                              </div>
                              <Badge 
                                variant="outline" 
                                className={`${getPerformanceColor(metric.performance)}`}
                              >
                                {metric.performance.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-2xl font-bold text-gray-900">
                                  {metric.value}{metric.unit}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Target: {metric.target}{metric.unit}
                                </span>
                              </div>
                              
                              <Progress 
                                value={Math.min((metric.value / metric.target) * 100, 100)} 
                                className="h-3"
                              />
                              
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-medium">
                                  {Math.round((metric.value / metric.target) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="initiatives" className="space-y-6">
            {/* ESG Initiatives */}
            <Card>
              <CardHeader>
                <CardTitle>Active ESG Initiatives</CardTitle>
                <CardDescription>
                  Strategic initiatives driving sustainability and governance improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockInitiatives.map((initiative) => (
                    <div key={initiative.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{initiative.title}</h4>
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(initiative.status)}`}
                            >
                              {initiative.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              initiative.category === 'environmental' ? 'bg-green-100 text-green-700' :
                              initiative.category === 'social' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {initiative.category.toUpperCase()}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{initiative.description}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Progress</span>
                              <div className="font-semibold">{initiative.progress}%</div>
                              <Progress value={initiative.progress} className="h-1 mt-1" />
                            </div>
                            <div>
                              <span className="text-gray-500">Impact Score</span>
                              <div className="font-semibold">{initiative.impact_score}/10</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Target Completion</span>
                              <div className="font-semibold">
                                {new Date(initiative.target_completion).toLocaleDateString()}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Responsible Party</span>
                              <div className="font-semibold">{initiative.responsible_party}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stakeholders" className="space-y-6">
            {/* Stakeholder Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Stakeholder Engagement</CardTitle>
                <CardDescription>
                  Feedback and satisfaction scores from key stakeholder groups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mockStakeholderFeedback.map((feedback, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900">{feedback.category}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-blue-600">{feedback.score}</span>
                          <span className="text-sm text-gray-500">/10</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Satisfaction Score</span>
                            <span>{feedback.response_rate}% response rate</span>
                          </div>
                          <Progress value={feedback.score * 10} className="h-2" />
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Key Concerns:</h5>
                          <div className="space-y-1">
                            {feedback.key_concerns.map((concern, i) => (
                              <div key={i} className="text-sm text-gray-600">
                                • {concern}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}