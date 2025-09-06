/**
 * Smart Document Summary Component
 * AI-powered document summarization with priority scoring and insights
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  Lightbulb,
  BookOpen,
  Star,
  Download,
  Share,
  Bookmark,
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react'

interface DocumentSummary {
  id: string
  documentId: string
  summaryType: 'executive' | 'detailed' | 'key-insights' | 'action-items' | 'risk-assessment'
  content: string
  keyInsights: string[]
  actionItems: ActionItem[]
  riskFactors: RiskFactor[]
  generatedAt: string
  metadata: {
    wordCount: number
    readingTime: number
    complexity: number
    confidence: number
  }
  priorityScore?: number
}

interface ActionItem {
  id: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate?: string
  assignedTo?: string
  status: 'pending' | 'in-progress' | 'completed'
  source: {
    page?: number
    section?: string
    quote?: string
  }
}

interface RiskFactor {
  id: string
  category: 'financial' | 'legal' | 'operational' | 'compliance' | 'strategic'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  likelihood: 'unlikely' | 'possible' | 'likely' | 'very-likely'
  impact: string
  mitigation?: string
  source: {
    page?: number
    section?: string
    quote?: string
  }
}

interface SmartDocumentSummaryProps {
  documentId: string
  documentTitle?: string
  autoGenerate?: boolean
  summaryTypes?: Array<'executive' | 'detailed' | 'key-insights' | 'action-items' | 'risk-assessment'>
  targetAudience?: 'board' | 'executives' | 'managers' | 'analysts'
  className?: string
}

export default function SmartDocumentSummary({ 
  documentId,
  documentTitle = 'Document',
  autoGenerate = false,
  summaryTypes = ['executive', 'key-insights'],
  targetAudience = 'board',
  className 
}: SmartDocumentSummaryProps) {
  const [summaries, setSummaries] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('executive')
  const [selectedTypes, setSelectedTypes] = useState(summaryTypes)
  const [generationOptions, setGenerationOptions] = useState({
    priorityScoring: true,
    maxLength: 'medium' as 'short' | 'medium' | 'long',
    targetAudience,
    includeMetrics: true
  })

  useEffect(() => {
    loadExistingSummaries()
    if (autoGenerate && summaries.length === 0) {
      generateSummaries()
    }
  }, [documentId, autoGenerate])

  const loadExistingSummaries = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/document-intelligence/summarize?documentId=${documentId}`)
      const result = await response.json()
      
      if (result.success) {
        setSummaries(result.data.summaries || [])
      }
    } catch (err) {
      console.error('Failed to load summaries:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateSummaries = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch('/api/document-intelligence/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          summaryTypes: selectedTypes,
          options: generationOptions
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSummaries(result.data.summaries)
        
        // Set active tab to the first generated summary type
        if (result.data.summaries.length > 0) {
          setActiveTab(result.data.summaries[0].summaryType)
        }
      } else {
        setError(result.error || 'Failed to generate summaries')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summaries')
    } finally {
      setGenerating(false)
    }
  }

  const getSummaryByType = (type: string) => {
    return summaries.find(s => s.summaryType === type)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getComplexityLabel = (complexity: number) => {
    if (complexity >= 8) return 'Very High'
    if (complexity >= 6) return 'High'
    if (complexity >= 4) return 'Medium'
    if (complexity >= 2) return 'Low'
    return 'Very Low'
  }

  const exportSummary = (summary: DocumentSummary) => {
    const content = `
# ${documentTitle} - ${summary.summaryType.toUpperCase()} Summary

Generated: ${new Date(summary.generatedAt).toLocaleString()}
Priority Score: ${summary.priorityScore || 'N/A'}
Confidence: ${(summary.metadata.confidence * 100).toFixed(1)}%

## Summary
${summary.content}

## Key Insights
${summary.keyInsights.map(insight => `• ${insight}`).join('\n')}

## Action Items
${summary.actionItems.map(item => `• [${item.priority.toUpperCase()}] ${item.description}`).join('\n')}

## Risk Factors
${summary.riskFactors.map(risk => `• [${risk.severity.toUpperCase()}] ${risk.description}`).join('\n')}
`

    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${documentTitle}-${summary.summaryType}-summary.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading && summaries.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading summaries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Document Summary
          </h2>
          <p className="text-gray-600 mt-1">AI-powered insights for {documentTitle}</p>
        </div>
        
        <div className="flex items-center gap-2">
          {summaries.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadExistingSummaries}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          )}
          
          <Button 
            onClick={generateSummaries}
            disabled={generating}
            size="sm"
          >
            {generating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {summaries.length === 0 && !generating && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No summaries yet</h3>
            <p className="text-gray-600 mb-4">Generate AI-powered summaries to get key insights from your document.</p>
            <Button onClick={generateSummaries}>
              <Zap className="h-4 w-4 mr-2" />
              Generate Summaries
            </Button>
          </CardContent>
        </Card>
      )}

      {summaries.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              {summaries.map(summary => (
                <TabsTrigger 
                  key={summary.summaryType} 
                  value={summary.summaryType}
                  className="capitalize"
                >
                  {summary.summaryType.replace('-', ' ')}
                </TabsTrigger>
              ))}
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          {summaries.map(summary => (
            <TabsContent key={summary.summaryType} value={summary.summaryType} className="space-y-6">
              {/* Summary Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {summary.priorityScore && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {summary.priorityScore}/10
                      </div>
                      <div className="text-xs text-gray-500">Priority</div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {(summary.metadata.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Confidence</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {summary.metadata.readingTime}min
                    </div>
                    <div className="text-xs text-gray-500">Read Time</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportSummary(summary)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Word Count</div>
                      <div className="font-semibold">{summary.metadata.wordCount.toLocaleString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Complexity</div>
                      <div className="font-semibold">{getComplexityLabel(summary.metadata.complexity)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Generated</div>
                      <div className="font-semibold">{new Date(summary.generatedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Type</div>
                      <div className="font-semibold capitalize">{summary.summaryType.replace('-', ' ')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Main Summary Content */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Summary Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed">{summary.content}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Key Insights */}
              {summary.keyInsights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Key Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {summary.keyInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                          <Star className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Items */}
              {summary.actionItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Action Items ({summary.actionItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {summary.actionItems.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium">{item.description}</p>
                              {item.source.quote && (
                                <blockquote className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-2">
                                  "{item.source.quote}"
                                </blockquote>
                              )}
                            </div>
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                              {item.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(item.dueDate).toLocaleDateString()}
                                </div>
                              )}
                              {item.source.page && (
                                <div>Page {item.source.page}</div>
                              )}
                            </div>
                            <Badge variant="outline">
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Factors */}
              {summary.riskFactors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Risk Factors ({summary.riskFactors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {summary.riskFactors.map((risk) => (
                        <div key={risk.id} className={`border rounded-lg p-4 ${getSeverityColor(risk.severity)}`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {risk.category}
                                </Badge>
                                <Badge className={getSeverityColor(risk.severity)}>
                                  {risk.severity}
                                </Badge>
                              </div>
                              <p className="font-medium">{risk.description}</p>
                              <p className="text-sm text-gray-600 mt-1">{risk.impact}</p>
                              
                              {risk.mitigation && (
                                <div className="mt-2 p-2 bg-green-50 rounded border-l-2 border-green-200">
                                  <p className="text-sm"><strong>Mitigation:</strong> {risk.mitigation}</p>
                                </div>
                              )}
                              
                              {risk.source.quote && (
                                <blockquote className="mt-2 text-sm text-gray-600 italic border-l-2 border-gray-200 pl-2">
                                  "{risk.source.quote}"
                                </blockquote>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center gap-4">
                              <div>Likelihood: {risk.likelihood}</div>
                              {risk.source.page && (
                                <div>Page {risk.source.page}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary Generation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Summary Types</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['executive', 'detailed', 'key-insights', 'action-items', 'risk-assessment'].map(type => (
                      <label key={type} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type as any)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTypes([...selectedTypes, type as any])
                            } else {
                              setSelectedTypes(selectedTypes.filter(t => t !== type))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{type.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Target Audience</label>
                  <Select 
                    value={generationOptions.targetAudience} 
                    onValueChange={(value: any) => setGenerationOptions({...generationOptions, targetAudience: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="board">Board Members</SelectItem>
                      <SelectItem value="executives">Executives</SelectItem>
                      <SelectItem value="managers">Managers</SelectItem>
                      <SelectItem value="analysts">Analysts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Summary Length</label>
                  <Select 
                    value={generationOptions.maxLength} 
                    onValueChange={(value: any) => setGenerationOptions({...generationOptions, maxLength: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (Up to 200 words)</SelectItem>
                      <SelectItem value="medium">Medium (Up to 500 words)</SelectItem>
                      <SelectItem value="long">Long (Up to 1000 words)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="priority-scoring"
                    checked={generationOptions.priorityScoring}
                    onChange={(e) => setGenerationOptions({...generationOptions, priorityScoring: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="priority-scoring" className="text-sm">Enable priority scoring</label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include-metrics"
                    checked={generationOptions.includeMetrics}
                    onChange={(e) => setGenerationOptions({...generationOptions, includeMetrics: e.target.checked})}
                    className="rounded"
                  />
                  <label htmlFor="include-metrics" className="text-sm">Include detailed metrics</label>
                </div>
                
                <Button 
                  onClick={generateSummaries}
                  disabled={generating || selectedTypes.length === 0}
                  className="w-full"
                >
                  {generating ? 'Generating...' : 'Regenerate Summaries'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}