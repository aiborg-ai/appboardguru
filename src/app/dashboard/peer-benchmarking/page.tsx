'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

/**
 * Peer Benchmarking Intelligence System
 * 
 * Premium board governance benchmarking platform providing real-time
 * competitive intelligence and peer comparison analytics for board directors.
 * 
 * Key Features:
 * - AI-powered peer selection and matching
 * - Executive compensation benchmarking
 * - Board composition and diversity analytics
 * - ESG performance comparison
 * - Governance maturity scoring
 * - Predictive insights and recommendations
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Brain,
  Globe,
  DollarSign,
  Shield,
  Leaf,
  AlertTriangle,
  ChevronRight,
  Download,
  RefreshCw,
  Settings,
  Info,
  Sparkles,
  Building2,
  Scale,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'

// Components
import PeerSelector from './components/PeerSelector'
import MetricsDashboard from './components/MetricsDashboard'
import CompensationBenchmark from './components/CompensationBenchmark'
import GovernanceScorecard from './components/GovernanceScorecard'
import ESGComparison from './components/ESGComparison'
import BoardComposition from './components/BoardComposition'
import InsightsPanel from './components/InsightsPanel'

// Hooks
import { useOrganizations } from '@/lib/stores/organization-store'
import { useAuth } from '@/lib/stores/auth-store'
import { usePeerBenchmarking } from './hooks/usePeerBenchmarking'

// Types
interface PeerOrganization {
  id: string
  name: string
  ticker?: string
  industry: string
  marketCap: number
  revenue: number
  employees: number
  relevanceScore: number
  dataQuality: number
  lastUpdate: Date
}

interface BenchmarkingMetric {
  category: string
  name: string
  value: number
  unit: string
  percentile: number
  trend: 'up' | 'down' | 'stable'
  peerAverage: number
  industryBenchmark: number
}

interface GovernanceScore {
  overall: number
  boardEffectiveness: number
  riskManagement: number
  compliance: number
  transparency: number
  stakeholderEngagement: number
}

const formatCurrency = (value: number): string => {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
  return `$${(value / 1e3).toFixed(0)}K`
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <ArrowUpRight className="h-4 w-4 text-green-600" />
    case 'down': return <ArrowDownRight className="h-4 w-4 text-red-600" />
    default: return <Minus className="h-4 w-4 text-gray-600" />
  }
}

const getPercentileColor = (percentile: number): string => {
  if (percentile >= 75) return 'text-green-600 bg-green-50'
  if (percentile >= 50) return 'text-yellow-600 bg-yellow-50'
  if (percentile >= 25) return 'text-orange-600 bg-orange-50'
  return 'text-red-600 bg-red-50'
}

export default function PeerBenchmarkingPage() {
  const router = useRouter()
  const organizations = useOrganizations()
  const { user } = useAuth()
  const currentOrganization = organizations?.[0]
  
  const [selectedPeerGroup, setSelectedPeerGroup] = useState<string>('default')
  const [timePeriod, setTimePeriod] = useState<'quarterly' | 'annual' | 'ltm'>('annual')
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Use custom hook for benchmarking data
  const {
    peerOrganizations,
    benchmarkingMetrics,
    governanceScore,
    insights,
    loadingPeers,
    loadingMetrics,
    refreshData
  } = usePeerBenchmarking(currentOrganization?.id, selectedPeerGroup, timePeriod)
  
  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => setLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])
  
  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshData()
    setRefreshing(false)
  }
  
  const handleExportReport = () => {
    // Generate and download comprehensive benchmarking report
    console.log('Generating benchmarking report...')
  }
  
  // Key performance indicators for overview
  const keyMetrics = [
    {
      label: 'Governance Score',
      value: governanceScore?.overall || 82,
      percentile: 78,
      trend: 'up' as const,
      icon: Shield,
      color: 'blue'
    },
    {
      label: 'Board Effectiveness',
      value: 91,
      percentile: 85,
      trend: 'up' as const,
      icon: Users,
      color: 'green'
    },
    {
      label: 'ESG Performance',
      value: 76,
      percentile: 62,
      trend: 'stable' as const,
      icon: Leaf,
      color: 'emerald'
    },
    {
      label: 'Risk Management',
      value: 88,
      percentile: 71,
      trend: 'up' as const,
      icon: AlertTriangle,
      color: 'orange'
    }
  ]
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Peer Benchmarking Intelligence</h1>
              <Badge variant="outline" className="bg-gradient-to-r from-blue-50 to-purple-50">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </div>
            <p className="text-gray-600">
              Real-time competitive intelligence and governance benchmarking against {peerOrganizations?.length || 15} carefully selected peer organizations
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timePeriod} onValueChange={(v: any) => setTimePeriod(v)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="ltm">LTM</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
        
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {keyMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <Card key={index} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full -mr-16 -mt-16 opacity-50" />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 bg-${metric.color}-100 rounded-lg`}>
                      <Icon className={`h-5 w-5 text-${metric.color}-600`} />
                    </div>
                    {getTrendIcon(metric.trend)}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{metric.label}</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold">{metric.value}</span>
                      <Badge className={getPercentileColor(metric.percentile)}>
                        {metric.percentile}th percentile
                      </Badge>
                    </div>
                    <Progress value={metric.percentile} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
        
        {/* AI Insights Alert */}
        {insights && insights.length > 0 && (
          <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <Brain className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="font-semibold">AI Insight: </span>
                {insights[0].description}
              </div>
              <Button variant="ghost" size="sm">
                View All Insights
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="board">Board Composition</TabsTrigger>
            <TabsTrigger value="esg">ESG</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <MetricsDashboard
              metrics={benchmarkingMetrics}
              peerGroup={selectedPeerGroup}
              timePeriod={timePeriod}
            />
          </TabsContent>
          
          <TabsContent value="compensation" className="space-y-6">
            <CompensationBenchmark
              organizationId={currentOrganization?.id}
              peerGroup={selectedPeerGroup}
              timePeriod={timePeriod}
            />
          </TabsContent>
          
          <TabsContent value="governance" className="space-y-6">
            <GovernanceScorecard
              organizationId={currentOrganization?.id}
              peerGroup={selectedPeerGroup}
              score={governanceScore}
            />
          </TabsContent>
          
          <TabsContent value="board" className="space-y-6">
            <BoardComposition
              organizationId={currentOrganization?.id}
              peerGroup={selectedPeerGroup}
            />
          </TabsContent>
          
          <TabsContent value="esg" className="space-y-6">
            <ESGComparison
              organizationId={currentOrganization?.id}
              peerGroup={selectedPeerGroup}
              timePeriod={timePeriod}
            />
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-6">
            <InsightsPanel
              insights={insights}
              organizationId={currentOrganization?.id}
            />
          </TabsContent>
        </Tabs>
        
        {/* Peer Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Peer Organizations
            </CardTitle>
            <CardDescription>
              Your benchmarking cohort of {peerOrganizations?.length || 15} carefully matched organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PeerSelector
              currentPeers={peerOrganizations}
              selectedGroup={selectedPeerGroup}
              onGroupChange={setSelectedPeerGroup}
              organizationId={currentOrganization?.id}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}