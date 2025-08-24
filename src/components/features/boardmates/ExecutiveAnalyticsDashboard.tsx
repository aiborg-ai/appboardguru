'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { Progress } from '@/components/atoms/display/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Shield, 
  Brain,
  Network,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Eye,
  Settings,
  Download,
  Share,
  RefreshCw,
  Calendar,
  Globe,
  Award,
  Activity
} from 'lucide-react'
import { EnhancedBoardMate, BoardDynamicsInsight, PerformanceMetrics, RiskAssessment } from '@/types/boardmates'

interface ExecutiveAnalyticsDashboardProps {
  boardMembers: EnhancedBoardMate[]
  organizationId: string
  onExportReport?: () => void
  onScheduleUpdate?: () => void
}

interface BoardCompositionMetrics {
  totalMembers: number
  diversityScore: number
  averageExperience: number
  skillCoverage: number
  riskLevel: 'low' | 'medium' | 'high'
  performanceIndex: number
  innovationQuotient: number
  stabilityRating: number
}

interface PredictiveInsight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  timeframe: string
  actionRequired?: string
}

interface NetworkNode {
  id: string
  name: string
  influence: number
  connections: string[]
  expertise: string[]
  position: { x: number; y: number; z: number }
}

interface BoardHealthMetrics {
  overallHealth: number
  communicationEffectiveness: number
  decisionMakingSpeed: number
  memberEngagement: number
  conflictResolution: number
  strategicAlignment: number
}

export function ExecutiveAnalyticsDashboard({ 
  boardMembers, 
  organizationId,
  onExportReport,
  onScheduleUpdate
}: ExecutiveAnalyticsDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [networkData, setNetworkData] = useState<NetworkNode[]>([])
  const [insights, setInsights] = useState<PredictiveInsight[]>([])

  // Calculate comprehensive board metrics
  const boardMetrics = useMemo((): BoardCompositionMetrics => {
    if (!boardMembers.length) {
      return {
        totalMembers: 0,
        diversityScore: 0,
        averageExperience: 0,
        skillCoverage: 0,
        riskLevel: 'low',
        performanceIndex: 0,
        innovationQuotient: 0,
        stabilityRating: 0
      }
    }

    const totalExperience = boardMembers.reduce((sum, member) => 
      sum + (member.expertise_profile?.years_experience || 0), 0)
    
    const uniqueSkills = new Set(
      boardMembers.flatMap(member => member.expertise_profile?.core_competencies || [])
    )

    const avgPerformance = boardMembers.reduce((sum, member) => 
      sum + (member.performance_metrics?.overall_score || 0.75), 0) / boardMembers.length

    const avgRisk = boardMembers.reduce((sum, member) => {
      const riskScore = member.risk_assessment?.overall_risk_level || 0.2
      return sum + riskScore
    }, 0) / boardMembers.length

    const innovationScore = boardMembers.reduce((sum, member) => 
      sum + (member.expertise_profile?.innovation_index || 0.7), 0) / boardMembers.length

    return {
      totalMembers: boardMembers.length,
      diversityScore: Math.min(95, uniqueSkills.size * 8.5), // Max 95%
      averageExperience: totalExperience / boardMembers.length,
      skillCoverage: Math.min(100, (uniqueSkills.size / 15) * 100), // 15 key skills max
      riskLevel: avgRisk < 0.3 ? 'low' : avgRisk < 0.6 ? 'medium' : 'high',
      performanceIndex: avgPerformance * 100,
      innovationQuotient: innovationScore * 100,
      stabilityRating: Math.max(50, 100 - (avgRisk * 50))
    }
  }, [boardMembers])

  // Calculate board health metrics
  const healthMetrics = useMemo((): BoardHealthMetrics => {
    const baseHealth = Math.min(95, boardMetrics.performanceIndex + boardMetrics.diversityScore / 2)
    
    return {
      overallHealth: baseHealth,
      communicationEffectiveness: Math.min(95, 85 + (boardMetrics.diversityScore * 0.1)),
      decisionMakingSpeed: Math.min(95, 78 + (boardMetrics.performanceIndex * 0.15)),
      memberEngagement: Math.min(95, 82 + (boardMetrics.innovationQuotient * 0.12)),
      conflictResolution: Math.min(95, 75 + (boardMetrics.stabilityRating * 0.18)),
      strategicAlignment: Math.min(95, 88 + (boardMetrics.skillCoverage * 0.08))
    }
  }, [boardMetrics])

  // Generate predictive insights
  useEffect(() => {
    const generateInsights = (): PredictiveInsight[] => {
      const insights: PredictiveInsight[] = []

      // Performance insights
      if (boardMetrics.performanceIndex > 85) {
        insights.push({
          id: 'high-performance',
          type: 'opportunity',
          title: 'High-Performance Board Detected',
          description: 'Current board composition shows exceptional performance metrics. Consider leveraging this momentum for strategic initiatives.',
          impact: 'high',
          confidence: 92,
          timeframe: 'Next Quarter',
          actionRequired: 'Schedule strategic planning session'
        })
      }

      // Diversity insights
      if (boardMetrics.diversityScore < 60) {
        insights.push({
          id: 'diversity-gap',
          type: 'risk',
          title: 'Diversity Enhancement Opportunity',
          description: 'Board diversity metrics indicate potential for improved decision-making through broader representation.',
          impact: 'medium',
          confidence: 87,
          timeframe: 'Next 6 months',
          actionRequired: 'Review recruitment strategy'
        })
      }

      // Skill coverage insights
      if (boardMetrics.skillCoverage < 70) {
        insights.push({
          id: 'skill-gap',
          type: 'recommendation',
          title: 'Strategic Skill Gaps Identified',
          description: 'Analysis reveals opportunities to strengthen board capabilities in emerging technology and sustainability.',
          impact: 'high',
          confidence: 84,
          timeframe: 'Next recruitment cycle',
          actionRequired: 'Define target skill profiles'
        })
      }

      // Innovation insights
      if (boardMetrics.innovationQuotient > 80) {
        insights.push({
          id: 'innovation-advantage',
          type: 'opportunity',
          title: 'Innovation Leadership Position',
          description: 'Board demonstrates strong innovation capacity. Consider accelerating digital transformation initiatives.',
          impact: 'critical',
          confidence: 91,
          timeframe: 'Immediate',
          actionRequired: 'Present innovation roadmap'
        })
      }

      // Risk insights
      if (boardMetrics.riskLevel === 'high') {
        insights.push({
          id: 'risk-mitigation',
          type: 'risk',
          title: 'Risk Management Priority',
          description: 'Elevated risk indicators require immediate attention and mitigation strategies.',
          impact: 'critical',
          confidence: 89,
          timeframe: 'Within 30 days',
          actionRequired: 'Implement risk management protocols'
        })
      }

      return insights
    }

    setInsights(generateInsights())
  }, [boardMetrics])

  // Generate network visualization data
  useEffect(() => {
    const generateNetworkData = (): NetworkNode[] => {
      return boardMembers.map((member, index) => ({
        id: member.id,
        name: member.full_name,
        influence: member.network_position?.influence_score || Math.random() * 0.4 + 0.6,
        connections: boardMembers
          .filter((_, i) => i !== index && Math.random() > 0.6)
          .map(m => m.id)
          .slice(0, 3),
        expertise: member.expertise_profile?.core_competencies || [],
        position: {
          x: Math.cos((index / boardMembers.length) * 2 * Math.PI) * 100,
          y: Math.sin((index / boardMembers.length) * 2 * Math.PI) * 100,
          z: (member.network_position?.influence_score || 0.5) * 50
        }
      }))
    }

    setNetworkData(generateNetworkData())
  }, [boardMembers])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsRefreshing(false)
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Board Analytics</h1>
          <p className="text-gray-600 mt-1">Strategic insights and performance intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={onExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={onScheduleUpdate}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Update
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Board Performance</p>
                <p className="text-3xl font-bold text-blue-900">{boardMetrics.performanceIndex.toFixed(0)}%</p>
                <p className="text-blue-600 text-xs mt-1">Overall effectiveness</p>
              </div>
              <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-600 text-sm font-medium">Diversity Index</p>
                <p className="text-3xl font-bold text-emerald-900">{boardMetrics.diversityScore.toFixed(0)}%</p>
                <p className="text-emerald-600 text-xs mt-1">Skill & background diversity</p>
              </div>
              <div className="h-12 w-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Innovation Score</p>
                <p className="text-3xl font-bold text-purple-900">{boardMetrics.innovationQuotient.toFixed(0)}%</p>
                <p className="text-purple-600 text-xs mt-1">Future-readiness index</p>
              </div>
              <div className="h-12 w-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Risk Level</p>
                <p className="text-3xl font-bold text-orange-900 capitalize">{boardMetrics.riskLevel}</p>
                <p className="text-orange-600 text-xs mt-1">Overall risk assessment</p>
              </div>
              <div className="h-12 w-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Board Health</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="network">Network Map</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Composition Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Board Composition Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Members</span>
                    <span className="text-lg font-bold">{boardMetrics.totalMembers}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Average Experience</span>
                      <span className="text-sm font-medium">{boardMetrics.averageExperience.toFixed(1)} years</span>
                    </div>
                    <Progress value={Math.min(100, (boardMetrics.averageExperience / 30) * 100)} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Skill Coverage</span>
                      <span className="text-sm font-medium">{boardMetrics.skillCoverage.toFixed(0)}%</span>
                    </div>
                    <Progress value={boardMetrics.skillCoverage} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Stability Rating</span>
                      <span className="text-sm font-medium">{boardMetrics.stabilityRating.toFixed(0)}%</span>
                    </div>
                    <Progress value={boardMetrics.stabilityRating} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">Decision Efficiency</p>
                        <p className="text-sm text-green-700">+12% this quarter</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">+12%</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">Member Engagement</p>
                        <p className="text-sm text-blue-700">+8% this month</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">+8%</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">Innovation Index</p>
                        <p className="text-sm text-purple-700">+15% YoY</p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">+15%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Board Health Tab */}
        <TabsContent value="health" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Board Health Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(healthMetrics).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className={`text-lg font-bold ${getHealthColor(value)}`}>
                        {value.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={value} className="h-3" />
                    <div className="flex items-center gap-1">
                      {value >= 90 ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : value >= 75 ? (
                        <Clock className="h-3 w-3 text-blue-500" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {value >= 90 ? 'Excellent' : value >= 75 ? 'Good' : 'Needs Attention'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {insights.map((insight) => (
              <Card key={insight.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{insight.title}</CardTitle>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className={getImpactColor(insight.impact)}>
                          {insight.impact.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">
                          {insight.confidence}% confidence
                        </Badge>
                        <Badge variant="outline">
                          {insight.timeframe}
                        </Badge>
                      </div>
                    </div>
                    <div className={`h-2 w-2 rounded-full ${
                      insight.type === 'opportunity' ? 'bg-green-500' :
                      insight.type === 'risk' ? 'bg-red-500' :
                      insight.type === 'trend' ? 'bg-blue-500' : 'bg-purple-500'
                    }`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{insight.description}</p>
                  {insight.actionRequired && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 mb-1">Recommended Action:</p>
                      <p className="text-sm text-gray-700">{insight.actionRequired}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Network Map Tab */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Board Network Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                    <Network className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">3D Network Visualization</h3>
                  <p className="text-gray-600 max-w-md">
                    Interactive 3D visualization showing board member relationships, influence networks, and collaboration patterns.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {networkData.slice(0, 4).map((node) => (
                      <div key={node.id} className="bg-white p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-3 w-3 bg-blue-500 rounded-full" />
                          <span className="font-medium text-sm">{node.name}</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Influence: {(node.influence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-600">
                          Connections: {node.connections.length}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="mt-4">
                    <Eye className="h-4 w-4 mr-2" />
                    Launch 3D Viewer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Scenario Planning & Modeling
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Current Scenario: Optimal Performance</h4>
                  <p className="text-blue-800 text-sm mb-3">
                    Based on current board composition and performance metrics, the board is operating at 85% efficiency.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Decision Speed</p>
                      <p className="text-lg font-bold text-green-600">+12%</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Risk Mitigation</p>
                      <p className="text-lg font-bold text-blue-600">+8%</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h5 className="font-semibold text-green-900 mb-2">Growth Scenario</h5>
                    <p className="text-green-800 text-sm mb-2">Adding 2 tech-focused board members</p>
                    <ul className="text-xs text-green-700 space-y-1">
                      <li>• Innovation index: +18%</li>
                      <li>• Digital readiness: +25%</li>
                      <li>• Risk profile: Minimal increase</li>
                    </ul>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <h5 className="font-semibold text-orange-900 mb-2">Succession Scenario</h5>
                    <p className="text-orange-800 text-sm mb-2">3 senior members retiring in 18 months</p>
                    <ul className="text-xs text-orange-700 space-y-1">
                      <li>• Experience gap: -15%</li>
                      <li>• Network influence: -22%</li>
                      <li>• Recruitment urgency: High</li>
                    </ul>
                  </div>
                </div>

                <Button className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  Run Advanced Scenario Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}