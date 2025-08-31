'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  FileText,
  Quote,
  ExternalLink,
  Brain,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Evidence {
  id: string
  quote: string
  pageNumber: number
  startChar?: number
  endChar?: number
  confidence: number
  reasoning: string
}

interface InsightWithEvidence {
  id: string
  type: 'positive' | 'warning' | 'negative'
  title: string
  description: string
  confidence: number
  evidences: Evidence[]
  impact?: 'high' | 'medium' | 'low'
  category?: string
}

interface EvidenceCardProps {
  insight: InsightWithEvidence
  isActive?: boolean
  onEvidenceClick?: (evidenceId: string) => void
  onViewInDocument?: (evidenceId: string) => void
  className?: string
}

export function EvidenceCard({
  insight,
  isActive,
  onEvidenceClick,
  onViewInDocument,
  className
}: EvidenceCardProps) {
  const getIcon = () => {
    switch (insight.type) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'negative':
        return <TrendingDown className="w-5 h-5 text-red-600" />
    }
  }

  const getBorderColor = () => {
    switch (insight.type) {
      case 'positive':
        return 'border-green-200 bg-green-50/50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/50'
      case 'negative':
        return 'border-red-200 bg-red-50/50'
    }
  }

  const getImpactBadgeColor = (impact?: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card 
      className={cn(
        "transition-all duration-200 border-2",
        getBorderColor(),
        isActive && "ring-2 ring-blue-500 ring-offset-2",
        className
      )}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              {insight.impact && (
                <Badge className={cn("text-xs", getImpactBadgeColor(insight.impact))}>
                  {insight.impact} impact
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
            
            {/* Confidence Score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">AI Confidence:</span>
              <Progress value={insight.confidence * 100} className="w-20 h-2" />
              <span className="text-xs font-medium">{Math.round(insight.confidence * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Evidence Section */}
        {insight.evidences.length > 0 && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Supporting Evidence</span>
              <Badge variant="outline" className="text-xs">
                {insight.evidences.length} source{insight.evidences.length > 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Evidence Items */}
            <div className="space-y-2">
              {insight.evidences.map((evidence, index) => (
                <div
                  key={evidence.id}
                  className="group bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => onEvidenceClick?.(evidence.id)}
                >
                  {/* Quote */}
                  <div className="flex items-start gap-2 mb-2">
                    <Quote className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 italic line-clamp-2">
                        "{evidence.quote}"
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Page {evidence.pageNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        Confidence: {Math.round(evidence.confidence * 100)}%
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewInDocument?.(evidence.id)
                      }}
                    >
                      View <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>

                  {/* AI Reasoning */}
                  {evidence.reasoning && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">Why this matters:</span> {evidence.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Show More Button */}
            {insight.evidences.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
              >
                Show all {insight.evidences.length} evidences
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Category Tag */}
        {insight.category && (
          <div className="pt-2">
            <Badge variant="outline" className="text-xs">
              {insight.category}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}