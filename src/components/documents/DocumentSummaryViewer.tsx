'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Brain, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckSquare,
  Target,
  DollarSign,
  BarChart3,
  Eye,
  Zap,
  RefreshCw,
  Download,
  Share2,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react'

interface KeyInsight {
  category: 'financial' | 'strategic' | 'operational' | 'compliance' | 'risk' | 'opportunity'
  insight: string
  importance: 'high' | 'medium' | 'low'
  relevantSection?: string
  pageNumber?: number
  confidence: number
}

interface SummarySection {
  title: string
  content: string
  keyPoints: string[]
  pageReferences?: number[]
  confidence: number
}

interface DocumentSummary {
  id: string
  documentId: string
  summaryType: string
  executiveSummary: string
  mainTopics: string[]
  keyInsights: KeyInsight[]
  sections: SummarySection[]
  readingTime: number
  complexityScore: number
  sentimentScore: number
  confidenceScore: number
  actionItems?: Array<{
    item: string
    priority: 'high' | 'medium' | 'low'
    deadline?: string
    assignee?: string
  }>
  decisions?: Array<{
    decision: string
    rationale: string
    impact: 'high' | 'medium' | 'low'
  }>
  risks?: Array<{
    risk: string
    severity: 'high' | 'medium' | 'low'
    mitigation?: string
  }>
  financialHighlights?: Array<{
    metric: string
    value: string
    change?: string
    significance: string
  }>
  generatedAt: string
  generatedBy: string
  processingTimeMs: number
  modelUsed: string
}

interface DocumentSummaryViewerProps {
  documentId: string
  documentName: string
  summaryType?: string
  onSummaryGenerated?: (summary: DocumentSummary) => void
}

export default function DocumentSummaryViewer({
  documentId,
  documentName,
  summaryType = 'executive',
  onSummaryGenerated
}: DocumentSummaryViewerProps) {
  const [summary, setSummary] = useState<DocumentSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'sections' | 'elements'>('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSummary()
  }, [documentId, summaryType])

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/documents/${documentId}/summarize?type=${summaryType}`)
      const data = await response.json()

      if (data.success && data.data.length > 0) {
        setSummary(data.data[0])
      } else {
        setSummary(null)
      }
    } catch (error) {
      console.error('Error loading summary:', error)
      setError('Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch(`/api/documents/${documentId}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summaryType,
          documentType: 'pdf',
          forceRegenerate: true
        })
      })

      const data = await response.json()

      if (data.success) {
        setSummary(data.data)
        if (onSummaryGenerated) {
          onSummaryGenerated(data.data)
        }
      } else {
        throw new Error(data.error || 'Failed to generate summary')
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      setError(error.message || 'Failed to generate summary')
    } finally {
      setGenerating(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return DollarSign
      case 'strategic': return Target
      case 'operational': return BarChart3
      case 'compliance': return CheckSquare
      case 'risk': return AlertTriangle
      case 'opportunity': return TrendingUp
      default: return FileText
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'financial': return 'text-green-600 bg-green-50'
      case 'strategic': return 'text-blue-600 bg-blue-50'
      case 'operational': return 'text-purple-600 bg-purple-50'
      case 'compliance': return 'text-orange-600 bg-orange-50'
      case 'risk': return 'text-red-600 bg-red-50'
      case 'opportunity': return 'text-emerald-600 bg-emerald-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600'
    if (score < -0.3) return 'text-red-600'
    return 'text-gray-600'
  }

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle)
    } else {
      newExpanded.add(sectionTitle)
    }
    setExpandedSections(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document summary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Document Summary</h2>
            <p className="text-gray-600">{documentName}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {summary && (
            <>
              <button
                onClick={() => {/* Export functionality */}}
                className="btn-secondary btn-sm flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={() => {/* Share functionality */}}
                className="btn-secondary btn-sm flex items-center space-x-1"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
            </>
          )}
          
          <button
            onClick={generateSummary}
            disabled={generating}
            className="btn-primary flex items-center space-x-2"
          >
            {generating ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span>{generating ? 'Generating...' : summary ? 'Regenerate' : 'Generate Summary'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!summary && !error && (
        <div className="card p-8 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Summary Available</h3>
          <p className="text-gray-600 mb-4">
            Generate an AI-powered summary to extract key insights, action items, and strategic information from this document.
          </p>
          <button
            onClick={generateSummary}
            disabled={generating}
            className="btn-primary flex items-center space-x-2 mx-auto"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate AI Summary</span>
          </button>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-4 text-center">
              <Clock className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.readingTime}</div>
              <div className="text-sm text-gray-600">min read</div>
            </div>

            <div className="card p-4 text-center">
              <BarChart3 className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.complexityScore}</div>
              <div className="text-sm text-gray-600">complexity</div>
            </div>

            <div className="card p-4 text-center">
              <TrendingUp className={`h-6 w-6 mx-auto mb-2 ${getSentimentColor(summary.sentimentScore)}`} />
              <div className={`text-2xl font-bold ${getSentimentColor(summary.sentimentScore)}`}>
                {summary.sentimentScore > 0 ? '+' : ''}{(summary.sentimentScore * 100).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">sentiment</div>
            </div>

            <div className="card p-4 text-center">
              <Eye className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{Math.round(summary.confidenceScore * 100)}%</div>
              <div className="text-sm text-gray-600">confidence</div>
            </div>

            <div className="card p-4 text-center">
              <Zap className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{summary.processingTimeMs}ms</div>
              <div className="text-sm text-gray-600">processed</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: FileText },
                { key: 'insights', label: `Insights (${summary.keyInsights.length})`, icon: Brain },
                { key: 'sections', label: `Sections (${summary.sections.length})`, icon: BarChart3 },
                { key: 'elements', label: 'Elements', icon: Target }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Executive Summary */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{summary.executiveSummary}</p>
                </div>

                {/* Main Topics */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Main Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {summary.mainTopics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-4">
                {summary.keyInsights.map((insight, index) => {
                  const CategoryIcon = getCategoryIcon(insight.category)
                  return (
                    <div key={index} className="card p-6">
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-lg ${getCategoryColor(insight.category)}`}>
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900 capitalize">{insight.category}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(insight.importance)}`}>
                              {insight.importance}
                            </span>
                            <span className="text-sm text-gray-500">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                          <p className="text-gray-700">{insight.insight}</p>
                          {insight.relevantSection && (
                            <p className="text-sm text-gray-500 mt-2">
                              From: {insight.relevantSection}
                              {insight.pageNumber && ` (Page ${insight.pageNumber})`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'sections' && (
              <div className="space-y-4">
                {summary.sections.map((section, index) => {
                  const isExpanded = expandedSections.has(section.title)
                  return (
                    <div key={index} className="card">
                      <div
                        className="flex items-center justify-between p-6 cursor-pointer"
                        onClick={() => toggleSection(section.title)}
                      >
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                          <span className="text-sm text-gray-500">
                            {Math.round(section.confidence * 100)}% confidence
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-6 border-t border-gray-200 pt-6">
                          <p className="text-gray-700 mb-4">{section.content}</p>
                          
                          {section.keyPoints.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Key Points:</h4>
                              <ul className="space-y-1">
                                {section.keyPoints.map((point, pointIndex) => (
                                  <li key={pointIndex} className="flex items-start space-x-2">
                                    <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                                    <span className="text-sm text-gray-600">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {section.pageReferences && section.pageReferences.length > 0 && (
                            <div className="mt-4">
                              <span className="text-sm text-gray-500">
                                Pages: {section.pageReferences.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'elements' && (
              <div className="space-y-6">
                {/* Action Items */}
                {summary.actionItems && summary.actionItems.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <CheckSquare className="h-5 w-5" />
                      <span>Action Items</span>
                    </h3>
                    <div className="space-y-3">
                      {summary.actionItems.map((item, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-900">{item.item}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                          {(item.deadline || item.assignee) && (
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              {item.assignee && <span>Assigned to: {item.assignee}</span>}
                              {item.deadline && <span>Due: {item.deadline}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {summary.risks && summary.risks.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Risks</span>
                    </h3>
                    <div className="space-y-3">
                      {summary.risks.map((risk, index) => (
                        <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-900">{risk.risk}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              risk.severity === 'high' ? 'bg-red-100 text-red-800' :
                              risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {risk.severity}
                            </span>
                          </div>
                          {risk.mitigation && (
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Mitigation:</span> {risk.mitigation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial Highlights */}
                {summary.financialHighlights && summary.financialHighlights.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <DollarSign className="h-5 w-5" />
                      <span>Financial Highlights</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {summary.financialHighlights.map((highlight, index) => (
                        <div key={index} className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{highlight.metric}</span>
                            <span className="text-lg font-bold text-green-700">{highlight.value}</span>
                          </div>
                          {highlight.change && (
                            <div className="text-sm text-green-600 mb-1">{highlight.change}</div>
                          )}
                          <p className="text-sm text-gray-600">{highlight.significance}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {summary.decisions && summary.decisions.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <Target className="h-5 w-5" />
                      <span>Decisions</span>
                    </h3>
                    <div className="space-y-3">
                      {summary.decisions.map((decision, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-900 font-medium">{decision.decision}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImportanceColor(decision.impact)}`}>
                              {decision.impact} impact
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">{decision.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="card p-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                Generated on {new Date(summary.generatedAt).toLocaleString()}
              </div>
              <div>
                Model: {summary.modelUsed} • Processing time: {summary.processingTimeMs}ms
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}