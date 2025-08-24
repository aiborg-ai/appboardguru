'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  Leaf,
  Users,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Target,
  Award,
  BarChart3,
  Calendar,
  Settings as SettingsIcon,
  RefreshCw,
  Download,
  ExternalLink,
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react'
import type { 
  ESGScorecard, 
  ESGCategory, 
  ESGFramework, 
  OrganizationId,
  ESGBenchmark,
  ESGTrend,
  ESGRisk,
  ESGOpportunity
} from '@/types/esg'
import { InfoTooltip, InfoSection } from '@/components/ui/info-tooltip'

interface ESGScorecardTabProps {
  organizationId: OrganizationId
}

export function ESGScorecardTab({ organizationId }: ESGScorecardTabProps) {
  const [scorecard, setScorecard] = useState<ESGScorecard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedFramework, setSelectedFramework] = useState<ESGFramework>('GRI')
  const [activeView, setActiveView] = useState<'overview' | 'metrics' | 'benchmarks' | 'trends' | 'risks' | 'opportunities'>('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Load ESG scorecard data
  const loadScorecard = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/esg/scorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId,
          period: selectedPeriod || undefined,
          framework: selectedFramework
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load ESG scorecard (${response.status})`)
      }

      const data = await response.json()
      setScorecard(data.scorecard)
    } catch (err) {
      console.error('Error loading ESG scorecard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load ESG scorecard')
    } finally {
      setLoading(false)
    }
  }

  // Generate/refresh scorecard
  const generateScorecard = async () => {
    try {
      setRefreshing(true)
      setError('')

      const response = await fetch('/api/esg/scorecard/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId,
          period: selectedPeriod || new Date().toISOString().slice(0, 7), // YYYY-MM
          framework: selectedFramework
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to generate ESG scorecard (${response.status})`)
      }

      const data = await response.json()
      setScorecard(data.scorecard)
    } catch (err) {
      console.error('Error generating ESG scorecard:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate ESG scorecard')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadScorecard()
  }, [organizationId, selectedPeriod, selectedFramework])

  // Helper functions
  const getCategoryIcon = (category: ESGCategory) => {
    switch (category) {
      case 'Environmental': return <Leaf className="h-5 w-5 text-green-600" />
      case 'Social': return <Users className="h-5 w-5 text-blue-600" />
      case 'Governance': return <Shield className="h-5 w-5 text-purple-600" />
    }
  }

  const getCategoryColor = (category: ESGCategory) => {
    switch (category) {
      case 'Environmental': return 'bg-green-50 border-green-200 text-green-800'
      case 'Social': return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'Governance': return 'bg-purple-50 border-purple-200 text-purple-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRatingBadgeColor = (rating: string) => {
    if (rating.startsWith('A')) return 'bg-green-100 text-green-800'
    if (rating.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (rating.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getTrendIcon = (trend: 'Improving' | 'Stable' | 'Declining') => {
    switch (trend) {
      case 'Improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'Stable': return <Minus className="h-4 w-4 text-gray-600" />
      case 'Declining': return <TrendingDown className="h-4 w-4 text-red-600" />
    }
  }

  const getRiskColor = (impact: string) => {
    switch (impact) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading && !scorecard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-gray-600">Loading ESG scorecard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-green-600" />
            <span>ESG Scorecard</span>
            <InfoTooltip
              content={
                <InfoSection
                  title="ESG Scorecard Overview"
                  description="Comprehensive Environmental, Social, and Governance performance tracking and benchmarking system."
                  features={[
                    "Multi-framework ESG scoring (GRI, SASB, TCFD)",
                    "Industry benchmarking and peer comparison",
                    "Trend analysis and performance tracking",
                    "Risk and opportunity identification",
                    "Automated recommendations and action plans",
                    "Real-time data collection and validation",
                    "Compliance reporting and documentation"
                  ]}
                  tips={[
                    "Regular data updates improve score accuracy",
                    "Compare against industry benchmarks",
                    "Focus on high-impact improvement areas",
                    "Set measurable targets for each category"
                  ]}
                />
              }
              side="right"
            />
          </h2>
          <p className="text-gray-600 mt-1">
            Track and improve your organization's sustainability performance
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Latest</option>
            <option value="2024-12">December 2024</option>
            <option value="2024-11">November 2024</option>
            <option value="2024-10">October 2024</option>
            <option value="2024-09">September 2024</option>
            <option value="2024-08">August 2024</option>
          </select>

          {/* Framework Selector */}
          <select
            value={selectedFramework}
            onChange={(e) => setSelectedFramework(e.target.value as ESGFramework)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="GRI">GRI Standards</option>
            <option value="SASB">SASB Standards</option>
            <option value="TCFD">TCFD Framework</option>
            <option value="CDP">CDP</option>
            <option value="DJSI">DJSI</option>
            <option value="MSCI">MSCI</option>
          </select>

          {/* Actions */}
          <button
            onClick={generateScorecard}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Generating...' : 'Generate'}
          </button>

          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Error</h4>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'metrics', label: 'Metrics', icon: Target },
            { id: 'benchmarks', label: 'Benchmarks', icon: Award },
            { id: 'trends', label: 'Trends', icon: TrendingUp },
            { id: 'risks', label: 'Risks', icon: AlertTriangle },
            { id: 'opportunities', label: 'Opportunities', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon
            const isActive = activeView === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {scorecard ? (
        <div className="space-y-6">
          {activeView === 'overview' && (
            <ESGOverviewView scorecard={scorecard} />
          )}
          {activeView === 'metrics' && (
            <ESGMetricsView organizationId={organizationId} scorecard={scorecard} />
          )}
          {activeView === 'benchmarks' && (
            <ESGBenchmarksView scorecard={scorecard} />
          )}
          {activeView === 'trends' && (
            <ESGTrendsView scorecard={scorecard} />
          )}
          {activeView === 'risks' && (
            <ESGRisksView risks={scorecard.risks} />
          )}
          {activeView === 'opportunities' && (
            <ESGOpportunitiesView opportunities={scorecard.opportunities} />
          )}
        </div>
      ) : !loading && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ESG Scorecard Available</h3>
          <p className="text-gray-600 mb-6">
            Generate your first ESG scorecard to start tracking sustainability performance.
          </p>
          <button
            onClick={generateScorecard}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Generating Scorecard...' : 'Generate Scorecard'}
          </button>
        </div>
      )}
    </div>
  )
}

// Sub-components for different views
function ESGOverviewView({ scorecard }: { scorecard: ESGScorecard }) {
  const getCategoryIcon = (category: ESGCategory) => {
    switch (category) {
      case 'Environmental': return <Leaf className="h-5 w-5 text-green-600" />
      case 'Social': return <Users className="h-5 w-5 text-blue-600" />
      case 'Governance': return <Shield className="h-5 w-5 text-purple-600" />
    }
  }

  const getCategoryColor = (category: ESGCategory) => {
    switch (category) {
      case 'Environmental': return 'bg-green-50 border-green-200'
      case 'Social': return 'bg-blue-50 border-blue-200'
      case 'Governance': return 'bg-purple-50 border-purple-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRatingBadgeColor = (rating: string) => {
    if (rating.startsWith('A')) return 'bg-green-100 text-green-800'
    if (rating.startsWith('B')) return 'bg-blue-100 text-blue-800'
    if (rating.startsWith('C')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Overall ESG Score</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRatingBadgeColor(scorecard.overallRating)}`}>
            {scorecard.overallRating}
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(scorecard.overallScore)}`}>
              {scorecard.overallScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600 mt-1">Out of 100</div>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(scorecard.overallScore, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { category: 'Environmental' as ESGCategory, score: scorecard.environmentalScore },
          { category: 'Social' as ESGCategory, score: scorecard.socialScore },
          { category: 'Governance' as ESGCategory, score: scorecard.governanceScore }
        ].map(({ category, score }) => (
          <div key={category} className={`bg-white rounded-lg border p-6 ${getCategoryColor(category)}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                {getCategoryIcon(category)}
                <h4 className="font-semibold text-gray-900">{category}</h4>
              </div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(1)}
              </div>
              <div className="w-full bg-white rounded-full h-2 mt-3">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    category === 'Environmental' ? 'bg-green-500' :
                    category === 'Social' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommendations */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Recommendations</h3>
          <div className="space-y-3">
            {scorecard.recommendations.slice(0, 3).map((rec, index) => (
              <div key={rec.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                  rec.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                  rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Scorecard generated</span>
              <span className="text-gray-900 font-medium">{new Date(scorecard.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <BarChart3 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Framework</span>
              <span className="text-gray-900 font-medium">{scorecard.framework}</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Info className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                scorecard.status === 'Published' ? 'bg-green-100 text-green-800' :
                scorecard.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                scorecard.status === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {scorecard.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ESGMetricsView({ organizationId, scorecard }: { organizationId: OrganizationId, scorecard: ESGScorecard }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ESG Metrics</h3>
      <p className="text-gray-600">Detailed metrics view coming soon...</p>
    </div>
  )
}

function ESGBenchmarksView({ scorecard }: { scorecard: ESGScorecard }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Industry Benchmarks</h3>
      <p className="text-gray-600">Benchmark comparison coming soon...</p>
    </div>
  )
}

function ESGTrendsView({ scorecard }: { scorecard: ESGScorecard }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
      <p className="text-gray-600">Trend analysis coming soon...</p>
    </div>
  )
}

function ESGRisksView({ risks }: { risks: ESGRisk[] }) {
  const getRiskColor = (impact: string) => {
    switch (impact) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ESG Risks</h3>
      {risks.length === 0 ? (
        <p className="text-gray-600">No risks identified. This is a positive indicator!</p>
      ) : (
        <div className="space-y-4">
          {risks.map(risk => (
            <div key={risk.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{risk.title}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(risk.impact)}`}>
                  {risk.impact} Impact
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{risk.description}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-500">Category: <span className="text-gray-900">{risk.category}</span></span>
                  <span className="text-gray-500">Likelihood: <span className="text-gray-900">{risk.likelihood}</span></span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  risk.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                  risk.status === 'Mitigating' ? 'bg-blue-100 text-blue-800' :
                  risk.status === 'Monitoring' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {risk.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ESGOpportunitiesView({ opportunities }: { opportunities: ESGOpportunity[] }) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'bg-green-100 text-green-800 border-green-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ESG Opportunities</h3>
      {opportunities.length === 0 ? (
        <p className="text-gray-600">No specific opportunities identified. Consider running a deeper analysis.</p>
      ) : (
        <div className="space-y-4">
          {opportunities.map(opportunity => (
            <div key={opportunity.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900">{opportunity.title}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getImpactColor(opportunity.potentialImpact)}`}>
                  {opportunity.potentialImpact} Impact
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-3">{opportunity.description}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-500">Category: <span className="text-gray-900">{opportunity.category}</span></span>
                  <span className="text-gray-500">Effort: <span className="text-gray-900">{opportunity.effort}</span></span>
                  <span className="text-gray-500">Timeframe: <span className="text-gray-900">{opportunity.timeframe}</span></span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  opportunity.status === 'Implemented' ? 'bg-green-100 text-green-800' :
                  opportunity.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  opportunity.status === 'Planning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {opportunity.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}