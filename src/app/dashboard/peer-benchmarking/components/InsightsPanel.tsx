'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Brain, TrendingUp, AlertTriangle, Lightbulb, ChevronRight } from 'lucide-react'
import { BenchmarkingInsight } from '../hooks/usePeerBenchmarking'

interface InsightsPanelProps {
  insights?: BenchmarkingInsight[]
  organizationId?: string
}

export default function InsightsPanel({
  insights = [],
  organizationId
}: InsightsPanelProps) {
  const defaultInsights: BenchmarkingInsight[] = [
    {
      id: '1',
      type: 'opportunity',
      category: 'governance',
      title: 'Board Diversity Enhancement Opportunity',
      description: 'Your board gender diversity is below the 75th percentile of peers.',
      currentPercentile: 58,
      targetPercentile: 75,
      potentialImprovement: 17,
      recommendations: ['Engage diverse recruitment firms'],
      priority: 85,
      complexity: 'medium',
      estimatedTimeline: 180
    },
    {
      id: '2',
      type: 'best_practice',
      category: 'compensation',
      title: 'ESG-Linked Compensation Leadership',
      description: 'Your ESG compensation exceeds 85% of peers.',
      currentPercentile: 85,
      targetPercentile: 90,
      potentialImprovement: 5,
      recommendations: ['Share best practices'],
      priority: 65,
      complexity: 'low',
      estimatedTimeline: 90
    }
  ]

  const displayInsights = insights.length > 0 ? insights : defaultInsights

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />
      case 'risk': return <AlertTriangle className="h-4 w-4" />
      case 'best_practice': return <Lightbulb className="h-4 w-4" />
      default: return <Brain className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-blue-100 text-blue-700'
      case 'risk': return 'bg-red-100 text-red-700'
      case 'best_practice': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Powered Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayInsights.map((insight) => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTypeColor(insight.type)}>
                          {getTypeIcon(insight.type)}
                          <span className="ml-1 capitalize">{insight.type.replace('_', ' ')}</span>
                        </Badge>
                        <Badge variant="outline">
                          Priority: {insight.priority}
                        </Badge>
                      </div>
                      <h4 className="font-medium mb-1">{insight.title}</h4>
                      <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span>
                          Current: <strong>{insight.currentPercentile}th</strong> percentile
                        </span>
                        <span>
                          Target: <strong>{insight.targetPercentile}th</strong> percentile
                        </span>
                        <Badge className="bg-purple-100 text-purple-700">
                          +{insight.potentialImprovement}% potential
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}