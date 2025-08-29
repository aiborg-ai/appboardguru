'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { RiskHeatmap } from '@/components/risk/RiskHeatmap'
import { RiskTrendChart } from '@/components/risk/RiskTrendChart'
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  BarChart3,
  Eye,
  FileText,
  AlertCircle,
  Calendar,
  DollarSign,
  Users,
  Database,
  Lock,
  Globe
} from 'lucide-react'

interface RiskFactor {
  id: string
  name: string
  category: 'operational' | 'financial' | 'strategic' | 'compliance' | 'technology' | 'cyber'
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number
  trend: 'up' | 'down' | 'stable'
  description: string
  impact: number
  likelihood: number
  lastAssessed: Date
  owner: string
  mitigation: string
  dueDate?: Date
}

interface RiskMetric {
  label: string
  value: string | number
  change: number
  icon: any
  color: string
  description: string
}

interface ComplianceItem {
  id: string
  regulation: string
  status: 'compliant' | 'at_risk' | 'non_compliant'
  score: number
  nextReview: Date
  issues: number
}

export default function RiskDashboard() {
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Mock trend data for the chart
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    
    return {
      date: date.toISOString().split('T')[0],
      overallRisk: 6.3 + Math.sin(i * 0.2) * 0.5 + Math.random() * 0.3 - 0.15,
      criticalRisks: Math.floor(Math.random() * 3) + (i > 20 ? 1 : 0),
      highRisks: Math.floor(Math.random() * 4) + 1,
      mediumRisks: Math.floor(Math.random() * 6) + 3,
      lowRisks: Math.floor(Math.random() * 4) + 2
    }
  })

  // Mock risk factors data
  const [riskFactors] = useState<RiskFactor[]>([
    {
      id: '1',
      name: 'Cybersecurity Threats',
      category: 'cyber',
      level: 'high',
      score: 8.2,
      trend: 'up',
      description: 'Increasing ransomware and phishing attacks targeting board communications',
      impact: 9,
      likelihood: 7,
      lastAssessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      owner: 'CISO',
      mitigation: 'Enhanced email security, MFA implementation, security awareness training',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      name: 'Regulatory Compliance',
      category: 'compliance',
      level: 'medium',
      score: 6.5,
      trend: 'stable',
      description: 'New SOX requirements and evolving ESG disclosure mandates',
      impact: 8,
      likelihood: 6,
      lastAssessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      owner: 'Chief Compliance Officer',
      mitigation: 'Regular compliance audits, policy updates, staff training'
    },
    {
      id: '3',
      name: 'Market Volatility',
      category: 'financial',
      level: 'high',
      score: 7.8,
      trend: 'up',
      description: 'Economic uncertainty affecting investment portfolio and cash flow',
      impact: 8,
      likelihood: 8,
      lastAssessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      owner: 'CFO',
      mitigation: 'Portfolio diversification, stress testing, liquidity management'
    },
    {
      id: '4',
      name: 'Key Person Risk',
      category: 'operational',
      level: 'medium',
      score: 5.5,
      trend: 'down',
      description: 'Dependence on key executives and board members',
      impact: 7,
      likelihood: 5,
      lastAssessed: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      owner: 'Board Chair',
      mitigation: 'Succession planning, knowledge transfer, insurance coverage'
    },
    {
      id: '5',
      name: 'Technology Infrastructure',
      category: 'technology',
      level: 'medium',
      score: 6.0,
      trend: 'stable',
      description: 'Aging systems and digital transformation challenges',
      impact: 6,
      likelihood: 7,
      lastAssessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      owner: 'CTO',
      mitigation: 'System modernization, cloud migration, disaster recovery planning'
    },
    {
      id: '6',
      name: 'ESG Reputation',
      category: 'strategic',
      level: 'low',
      score: 3.8,
      trend: 'down',
      description: 'Environmental and social governance expectations from stakeholders',
      impact: 5,
      likelihood: 6,
      lastAssessed: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      owner: 'Chief Sustainability Officer',
      mitigation: 'ESG reporting improvements, stakeholder engagement, sustainability initiatives'
    }
  ])

  // Risk metrics
  const riskMetrics: RiskMetric[] = [
    {
      label: 'Overall Risk Score',
      value: '6.3',
      change: 0.3,
      icon: AlertTriangle,
      color: 'text-orange-600',
      description: 'Composite risk assessment'
    },
    {
      label: 'High Risk Factors',
      value: 2,
      change: 1,
      icon: AlertCircle,
      color: 'text-red-600',
      description: 'Risks requiring immediate attention'
    },
    {
      label: 'Compliance Score',
      value: '94%',
      change: -2,
      icon: Shield,
      color: 'text-green-600',
      description: 'Regulatory compliance percentage'
    },
    {
      label: 'Mitigation Progress',
      value: '78%',
      change: 5,
      icon: Target,
      color: 'text-blue-600',
      description: 'Risk mitigation completion rate'
    }
  ]

  // Compliance data
  const complianceItems: ComplianceItem[] = [
    {
      id: '1',
      regulation: 'SOX 404',
      status: 'compliant',
      score: 96,
      nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      issues: 0
    },
    {
      id: '2',
      regulation: 'GDPR',
      status: 'compliant',
      score: 92,
      nextReview: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      issues: 2
    },
    {
      id: '3',
      regulation: 'ESG Disclosure',
      status: 'at_risk',
      score: 78,
      nextReview: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      issues: 5
    },
    {
      id: '4',
      regulation: 'Cyber Security Framework',
      status: 'compliant',
      score: 89,
      nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issues: 1
    }
  ]

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cyber':
        return Lock
      case 'compliance':
        return Shield
      case 'financial':
        return DollarSign
      case 'operational':
        return Users
      case 'technology':
        return Database
      case 'strategic':
        return Globe
      default:
        return AlertTriangle
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-red-500" />
      case 'down':
        return <ArrowDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-600 bg-green-50'
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50'
      case 'non_compliant':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setLastRefresh(new Date())
    }, 1000)
  }

  // Sort risk factors by score (highest first)
  const sortedRiskFactors = [...riskFactors].sort((a, b) => b.score - a.score)

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              Risk Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Real-time risk monitoring and assessment with predictive analytics and compliance tracking
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {riskMetrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${metric.color.includes('orange') ? 'bg-orange-100' : 
                                     metric.color.includes('red') ? 'bg-red-100' :
                                     metric.color.includes('green') ? 'bg-green-100' : 'bg-blue-100'}`}>
                      <Icon className={`h-5 w-5 ${metric.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                      <p className="text-xs text-gray-500">{metric.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {metric.change > 0 ? (
                      <ArrowUp className="h-3 w-3 text-red-500" />
                    ) : metric.change < 0 ? (
                      <ArrowDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <Minus className="h-3 w-3 text-gray-500" />
                    )}
                    <span className={`text-xs ${metric.change > 0 ? 'text-red-600' : metric.change < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {Math.abs(metric.change)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className={`text-3xl font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Factors */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Risk Factors</h2>
                  <span className="text-sm text-gray-500">{riskFactors.length} identified risks</span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {sortedRiskFactors.map((risk) => {
                    const CategoryIcon = getCategoryIcon(risk.category)
                    return (
                      <div key={risk.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${
                              risk.category === 'cyber' ? 'bg-purple-100' :
                              risk.category === 'compliance' ? 'bg-blue-100' :
                              risk.category === 'financial' ? 'bg-green-100' :
                              risk.category === 'operational' ? 'bg-yellow-100' :
                              risk.category === 'technology' ? 'bg-indigo-100' :
                              'bg-gray-100'
                            }`}>
                              <CategoryIcon className={`h-4 w-4 ${
                                risk.category === 'cyber' ? 'text-purple-600' :
                                risk.category === 'compliance' ? 'text-blue-600' :
                                risk.category === 'financial' ? 'text-green-600' :
                                risk.category === 'operational' ? 'text-yellow-600' :
                                risk.category === 'technology' ? 'text-indigo-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-sm font-medium text-gray-900">{risk.name}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(risk.level)}`}>
                                  {risk.level.toUpperCase()}
                                </span>
                                {getTrendIcon(risk.trend)}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{risk.description}</p>
                              
                              <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <span>Impact:</span>
                                  <div className="flex space-x-0.5">
                                    {Array.from({ length: 10 }, (_, i) => (
                                      <div
                                        key={i}
                                        className={`w-1.5 h-3 rounded-sm ${
                                          i < risk.impact ? 'bg-red-400' : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-1">
                                  <span>Likelihood:</span>
                                  <div className="flex space-x-0.5">
                                    {Array.from({ length: 10 }, (_, i) => (
                                      <div
                                        key={i}
                                        className={`w-1.5 h-3 rounded-sm ${
                                          i < risk.likelihood ? 'bg-orange-400' : 'bg-gray-200'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-xs">
                                <p className="text-gray-600">
                                  <span className="font-medium">Owner:</span> {risk.owner}
                                </p>
                                <p className="text-gray-600 mt-0.5">
                                  <span className="font-medium">Mitigation:</span> {risk.mitigation}
                                </p>
                                {risk.dueDate && (
                                  <p className="text-gray-600 mt-0.5">
                                    <span className="font-medium">Due:</span> {risk.dueDate.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{risk.score}</div>
                            <div className="text-xs text-gray-500">Risk Score</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Compliance Status */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Compliance Status</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {complianceItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{item.regulation}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${getComplianceStatusColor(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500">{item.score}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Next review: {item.nextReview.toLocaleDateString()}
                        </p>
                        {item.issues > 0 && (
                          <p className="text-xs text-orange-600 mt-1">
                            {item.issues} issue{item.issues !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <BarChart3 className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Run Risk Assessment</h4>
                        <p className="text-xs text-gray-500">Comprehensive risk analysis</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Compliance Audit</h4>
                        <p className="text-xs text-gray-500">Check regulatory compliance</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Generate Risk Report</h4>
                        <p className="text-xs text-gray-500">Executive risk summary</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="w-full p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Eye className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Risk Register</h4>
                        <p className="text-xs text-gray-500">View complete risk inventory</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Visualization Components */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Risk Heat Map */}
          <RiskHeatmap
            risks={riskFactors.map(risk => ({
              id: risk.id,
              name: risk.name,
              impact: risk.impact,
              likelihood: risk.likelihood,
              category: risk.category,
              level: risk.level
            }))}
          />
          
          {/* Risk Trend Chart */}
          <RiskTrendChart data={trendData} />
        </div>
      </div>
    </DashboardLayout>
  )
}