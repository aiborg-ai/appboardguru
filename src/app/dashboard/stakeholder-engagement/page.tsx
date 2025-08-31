'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Target,
  Activity,
  Globe,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  Video,
  FileText,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface InvestorMetrics {
  totalInvestors: number
  activeInvestors: number
  newInvestors: number
  totalInvestment: number
  avgShareholding: number
  engagementRate: number
}

interface VotingMetrics {
  activeProposals: number
  totalVotes: number
  participationRate: number
  pendingVotes: number
  upcomingDeadlines: number
}

interface ESGMetrics {
  environmentalScore: number
  socialScore: number
  governanceScore: number
  compositeScore: number
  improvementRate: number
  peerRanking: number
}

interface SentimentMetrics {
  overallSentiment: number
  trendDirection: 'positive' | 'negative' | 'neutral'
  volumeChange: number
  criticalAlerts: number
  positiveRatio: number
  negativeRatio: number
}

interface CommunicationMetrics {
  messagesSent: number
  deliveryRate: number
  engagementRate: number
  responseRate: number
  pendingTemplates: number
  scheduledCommunications: number
}

interface AnalystMetrics {
  totalAnalysts: number
  activeRelationships: number
  avgInfluenceScore: number
  upcomingBriefings: number
  pendingQuestions: number
  consensusRating: string
}

interface StakeholderData {
  investorMetrics: InvestorMetrics
  votingMetrics: VotingMetrics
  esgMetrics: ESGMetrics
  sentimentMetrics: SentimentMetrics
  communicationMetrics: CommunicationMetrics
  analystMetrics: AnalystMetrics
  recentActivity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    severity: 'low' | 'medium' | 'high'
  }>
  sentimentTrend: Array<{
    date: string
    sentiment: number
    volume: number
  }>
  esgTrend: Array<{
    period: string
    environmental: number
    social: number
    governance: number
  }>
}

// ============================================================================
// MOCK DATA (Replace with actual API calls)
// ============================================================================

const mockData: StakeholderData = {
  investorMetrics: {
    totalInvestors: 247,
    activeInvestors: 198,
    newInvestors: 12,
    totalInvestment: 45600000,
    avgShareholding: 2.3,
    engagementRate: 78.5
  },
  votingMetrics: {
    activeProposals: 3,
    totalVotes: 156,
    participationRate: 84.2,
    pendingVotes: 8,
    upcomingDeadlines: 2
  },
  esgMetrics: {
    environmentalScore: 76,
    socialScore: 82,
    governanceScore: 89,
    compositeScore: 82.3,
    improvementRate: 12.5,
    peerRanking: 3
  },
  sentimentMetrics: {
    overallSentiment: 0.34,
    trendDirection: 'positive',
    volumeChange: 15.2,
    criticalAlerts: 0,
    positiveRatio: 64.2,
    negativeRatio: 18.7
  },
  communicationMetrics: {
    messagesSent: 1245,
    deliveryRate: 97.8,
    engagementRate: 42.1,
    responseRate: 23.6,
    pendingTemplates: 3,
    scheduledCommunications: 7
  },
  analystMetrics: {
    totalAnalysts: 18,
    activeRelationships: 14,
    avgInfluenceScore: 78.5,
    upcomingBriefings: 2,
    pendingQuestions: 5,
    consensusRating: 'Buy'
  },
  recentActivity: [
    {
      id: '1',
      type: 'vote',
      description: 'New vote submitted for Proposal #2023-Q4-01',
      timestamp: '2024-01-15T14:30:00Z',
      severity: 'medium'
    },
    {
      id: '2',
      type: 'sentiment',
      description: 'Positive sentiment spike detected in analyst coverage',
      timestamp: '2024-01-15T13:15:00Z',
      severity: 'low'
    },
    {
      id: '3',
      type: 'esg',
      description: 'ESG score updated: Environmental +3 points',
      timestamp: '2024-01-15T11:45:00Z',
      severity: 'low'
    },
    {
      id: '4',
      type: 'communication',
      description: 'Q4 Earnings Report sent to 198 investors',
      timestamp: '2024-01-15T10:00:00Z',
      severity: 'medium'
    }
  ],
  sentimentTrend: [
    { date: '2024-01-01', sentiment: 0.12, volume: 45 },
    { date: '2024-01-02', sentiment: 0.18, volume: 52 },
    { date: '2024-01-03', sentiment: 0.25, volume: 48 },
    { date: '2024-01-04', sentiment: 0.31, volume: 61 },
    { date: '2024-01-05', sentiment: 0.28, volume: 58 },
    { date: '2024-01-06', sentiment: 0.34, volume: 63 },
    { date: '2024-01-07', sentiment: 0.29, volume: 55 }
  ],
  esgTrend: [
    { period: 'Q1 2023', environmental: 72, social: 78, governance: 85 },
    { period: 'Q2 2023', environmental: 74, social: 80, governance: 87 },
    { period: 'Q3 2023', environmental: 75, social: 81, governance: 88 },
    { period: 'Q4 2023', environmental: 76, social: 82, governance: 89 }
  ]
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200'
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low': return 'bg-green-100 text-green-800 border-green-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTrendIcon = (direction: string) => {
  switch (direction) {
    case 'positive': return <ArrowUp className="h-4 w-4 text-green-500" />
    case 'negative': return <ArrowDown className="h-4 w-4 text-red-500" />
    default: return <Minus className="h-4 w-4 text-gray-500" />
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'number',
  trend 
}: {
  title: string
  value: number
  change?: number
  icon: React.ElementType
  format?: 'number' | 'currency' | 'percentage'
  trend?: 'positive' | 'negative' | 'neutral'
}) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency': return formatCurrency(val)
      case 'percentage': return formatPercentage(val)
      default: return val.toLocaleString()
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-gray-500" />
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          {trend && getTrendIcon(trend)}
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold">{formatValue(value)}</p>
          {change !== undefined && (
            <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}% from last month
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const ActivityFeed = ({ activities }: { activities: StakeholderData['recentActivity'] }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className={`h-2 w-2 rounded-full ${getSeverityColor(activity.severity).split(' ')[0]}`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-500">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className={getSeverityColor(activity.severity)}>
            {activity.severity}
          </Badge>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StakeholderEngagementDashboard() {
  const [data, setData] = useState<StakeholderData>(mockData)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')

  const refreshData = async () => {
    setRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000)
    return () => clearInterval(interval)
  }, [])

  const chartColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <PageHeader
            icon={Users}
            title="Stakeholder Engagement Portal"
            description="Manage relationships and communication with shareholders, investors, and board members"
          />
          <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Crisis Alerts */}
      {data.sentimentMetrics.criticalAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Crisis Alert</AlertTitle>
          <AlertDescription>
            {data.sentimentMetrics.criticalAlerts} critical stakeholder sentiment alert(s) require immediate attention.
            <Button variant="link" className="p-0 h-auto font-normal text-red-600 underline ml-2">
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Investors"
          value={data.investorMetrics.totalInvestors}
          change={4.8}
          icon={Users}
          trend="positive"
        />
        <MetricCard
          title="Total Investment"
          value={data.investorMetrics.totalInvestment}
          change={12.3}
          icon={DollarSign}
          format="currency"
          trend="positive"
        />
        <MetricCard
          title="ESG Composite Score"
          value={data.esgMetrics.compositeScore}
          change={2.1}
          icon={Target}
          format="number"
          trend="positive"
        />
        <MetricCard
          title="Sentiment Score"
          value={data.sentimentMetrics.overallSentiment * 100}
          change={8.4}
          icon={Activity}
          format="percentage"
          trend={data.sentimentMetrics.trendDirection}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="investors">Investors</TabsTrigger>
          <TabsTrigger value="voting">Voting</TabsTrigger>
          <TabsTrigger value="esg">ESG</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="analysts">Analysts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Trend</CardTitle>
                <CardDescription>Stakeholder sentiment over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.sentimentTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="sentiment" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest stakeholder engagement activities</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed activities={data.recentActivity} />
              </CardContent>
            </Card>
          </div>

          {/* ESG Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>ESG Performance Trend</CardTitle>
              <CardDescription>Environmental, Social, and Governance scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.esgTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="environmental" stroke="#00C49F" name="Environmental" />
                  <Line type="monotone" dataKey="social" stroke="#0088FE" name="Social" />
                  <Line type="monotone" dataKey="governance" stroke="#FFBB28" name="Governance" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investors Tab */}
        <TabsContent value="investors" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Active Investors"
              value={data.investorMetrics.activeInvestors}
              change={2.4}
              icon={Users}
            />
            <MetricCard
              title="Engagement Rate"
              value={data.investorMetrics.engagementRate}
              change={5.7}
              icon={Activity}
              format="percentage"
            />
            <MetricCard
              title="Avg Shareholding"
              value={data.investorMetrics.avgShareholding}
              change={-1.2}
              icon={BarChart3}
              format="percentage"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Investor Segmentation</CardTitle>
              <CardDescription>Distribution by investor type and access level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-medium mb-4">By Type</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Institutional', value: 65 },
                          { name: 'Individual', value: 28 },
                          { name: 'Strategic', value: 7 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#0088FE"
                        dataKey="value"
                      >
                        {[
                          { name: 'Institutional', value: 65 },
                          { name: 'Individual', value: 28 },
                          { name: 'Strategic', value: 7 }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-4">By Access Level</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Basic', value: 45 },
                          { name: 'Premium', value: 35 },
                          { name: 'VIP', value: 20 }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#00C49F"
                        dataKey="value"
                      >
                        {[
                          { name: 'Basic', value: 45 },
                          { name: 'Premium', value: 35 },
                          { name: 'VIP', value: 20 }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voting Tab */}
        <TabsContent value="voting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Active Proposals"
              value={data.votingMetrics.activeProposals}
              icon={FileText}
            />
            <MetricCard
              title="Total Votes"
              value={data.votingMetrics.totalVotes}
              change={18.5}
              icon={CheckCircle}
            />
            <MetricCard
              title="Participation Rate"
              value={data.votingMetrics.participationRate}
              change={4.2}
              icon={Activity}
              format="percentage"
            />
            <MetricCard
              title="Upcoming Deadlines"
              value={data.votingMetrics.upcomingDeadlines}
              icon={Calendar}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Voting Progress</CardTitle>
                <CardDescription>Current proposal voting status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Proposal 2023-Q4-01</span>
                    <span>84%</span>
                  </div>
                  <Progress value={84} className="mt-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Proposal 2023-Q4-02</span>
                    <span>67%</span>
                  </div>
                  <Progress value={67} className="mt-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Proposal 2023-Q4-03</span>
                    <span>42%</span>
                  </div>
                  <Progress value={42} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vote Distribution</CardTitle>
                <CardDescription>Latest proposal voting breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { category: 'For', votes: 89, shares: 78.2 },
                      { category: 'Against', votes: 12, shares: 15.8 },
                      { category: 'Abstain', votes: 5, shares: 6.0 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="votes" fill="#0088FE" name="Vote Count" />
                    <Bar dataKey="shares" fill="#00C49F" name="Share %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ESG Tab */}
        <TabsContent value="esg" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Environmental"
              value={data.esgMetrics.environmentalScore}
              change={3.2}
              icon={Globe}
            />
            <MetricCard
              title="Social"
              value={data.esgMetrics.socialScore}
              change={1.8}
              icon={Users}
            />
            <MetricCard
              title="Governance"
              value={data.esgMetrics.governanceScore}
              change={2.4}
              icon={Target}
            />
            <MetricCard
              title="Peer Ranking"
              value={data.esgMetrics.peerRanking}
              icon={BarChart3}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ESG Score Breakdown</CardTitle>
              <CardDescription>Detailed performance across all ESG categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Environmental Score</span>
                    <span className="text-2xl font-bold">{data.esgMetrics.environmentalScore}</span>
                  </div>
                  <Progress value={data.esgMetrics.environmentalScore} className="h-3" />
                  <p className="text-xs text-gray-500 mt-1">Carbon footprint, renewable energy, waste management</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Social Score</span>
                    <span className="text-2xl font-bold">{data.esgMetrics.socialScore}</span>
                  </div>
                  <Progress value={data.esgMetrics.socialScore} className="h-3" />
                  <p className="text-xs text-gray-500 mt-1">Employee welfare, community impact, diversity & inclusion</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Governance Score</span>
                    <span className="text-2xl font-bold">{data.esgMetrics.governanceScore}</span>
                  </div>
                  <Progress value={data.esgMetrics.governanceScore} className="h-3" />
                  <p className="text-xs text-gray-500 mt-1">Board independence, executive compensation, transparency</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Overall Sentiment"
              value={data.sentimentMetrics.overallSentiment * 100}
              change={8.4}
              icon={Activity}
              format="percentage"
            />
            <MetricCard
              title="Volume Change"
              value={data.sentimentMetrics.volumeChange}
              icon={TrendingUp}
              format="percentage"
            />
            <MetricCard
              title="Positive Ratio"
              value={data.sentimentMetrics.positiveRatio}
              icon={TrendingUp}
              format="percentage"
            />
            <MetricCard
              title="Critical Alerts"
              value={data.sentimentMetrics.criticalAlerts}
              icon={AlertTriangle}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment by Source</CardTitle>
                <CardDescription>Breakdown by information source</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { source: 'Social Media', positive: 45, negative: 12, neutral: 23 },
                      { source: 'News', positive: 32, negative: 8, neutral: 15 },
                      { source: 'Analyst Reports', positive: 18, negative: 3, neutral: 9 },
                      { source: 'Earnings Calls', positive: 12, negative: 2, neutral: 6 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="positive" stackId="a" fill="#00C49F" />
                    <Bar dataKey="neutral" stackId="a" fill="#FFBB28" />
                    <Bar dataKey="negative" stackId="a" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Themes</CardTitle>
                <CardDescription>Most discussed topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { theme: 'Q4 Earnings', sentiment: 0.78, frequency: 45 },
                    { theme: 'Strategic Partnership', sentiment: 0.62, frequency: 32 },
                    { theme: 'Market Expansion', sentiment: 0.45, frequency: 28 },
                    { theme: 'Leadership Changes', sentiment: -0.12, frequency: 15 }
                  ].map((theme, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{theme.theme}</p>
                        <p className="text-sm text-gray-500">{theme.frequency} mentions</p>
                      </div>
                      <div className={`px-2 py-1 rounded text-sm ${
                        theme.sentiment > 0 ? 'bg-green-100 text-green-800' : 
                        theme.sentiment < 0 ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {theme.sentiment > 0 ? '+' : ''}{(theme.sentiment * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analysts Tab */}
        <TabsContent value="analysts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <MetricCard
              title="Total Analysts"
              value={data.analystMetrics.totalAnalysts}
              change={12.5}
              icon={Users}
            />
            <MetricCard
              title="Active Relationships"
              value={data.analystMetrics.activeRelationships}
              icon={Activity}
            />
            <MetricCard
              title="Avg Influence Score"
              value={data.analystMetrics.avgInfluenceScore}
              change={5.2}
              icon={BarChart3}
            />
            <MetricCard
              title="Upcoming Briefings"
              value={data.analystMetrics.upcomingBriefings}
              icon={Calendar}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analyst Coverage</CardTitle>
                <CardDescription>Ratings distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Buy', value: 8 },
                        { name: 'Hold', value: 6 },
                        { name: 'Sell', value: 2 },
                        { name: 'Neutral', value: 2 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#0088FE"
                      dataKey="value"
                    >
                      {[
                        { name: 'Buy', value: 8 },
                        { name: 'Hold', value: 6 },
                        { name: 'Sell', value: 2 },
                        { name: 'Neutral', value: 2 }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    Consensus: {data.analystMetrics.consensusRating}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Q&A</CardTitle>
                <CardDescription>Questions requiring responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { question: 'What is the expected impact of the new product launch?', priority: 'high', analyst: 'Goldman Sachs' },
                    { question: 'Can you provide more details on margin improvements?', priority: 'medium', analyst: 'Morgan Stanley' },
                    { question: 'How will regulatory changes affect operations?', priority: 'high', analyst: 'JP Morgan' }
                  ].map((item, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.question}</p>
                          <p className="text-xs text-gray-500 mt-1">{item.analyst}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={item.priority === 'high' ? 'border-red-200 text-red-800' : 'border-yellow-200 text-yellow-800'}
                        >
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Communication Channels Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Immediate stakeholder engagement actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Mail className="h-6 w-6" />
              <span className="text-sm">Send Update</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Calendar className="h-6 w-6" />
              <span className="text-sm">Schedule Briefing</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm">Create Proposal</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-sm">Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  )
}