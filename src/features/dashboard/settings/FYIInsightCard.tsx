'use client'

import React from 'react'
import { 
  ExternalLink,
  Calendar,
  Tag,
  Building2,
  TrendingUp,
  Globe,
  AlertCircle,
  FileText
} from 'lucide-react'

interface FYIInsight {
  id: string
  type: 'news' | 'competitor' | 'industry' | 'regulation' | 'market'
  title: string
  summary: string
  source: string
  url: string
  relevanceScore: number
  contextEntity?: string
  publishedAt: string
  tags: string[]
}

interface FYIInsightCardProps {
  insight: FYIInsight
  priority: 'high' | 'medium' | 'low'
}

export function FYIInsightCard({ insight, priority }: FYIInsightCardProps) {
  const getTypeIcon = () => {
    switch (insight.type) {
      case 'news':
        return FileText
      case 'competitor':
        return Building2
      case 'industry':
        return TrendingUp
      case 'regulation':
        return AlertCircle
      case 'market':
        return Globe
      default:
        return FileText
    }
  }

  const getTypeColor = () => {
    switch (insight.type) {
      case 'news':
        return 'text-blue-600 bg-blue-50'
      case 'competitor':
        return 'text-purple-600 bg-purple-50'
      case 'industry':
        return 'text-green-600 bg-green-50'
      case 'regulation':
        return 'text-red-600 bg-red-50'
      case 'market':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityBorder = () => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50/30'
      case 'medium':
        return 'border-l-orange-500 bg-orange-50/30'
      case 'low':
        return 'border-l-gray-500 bg-gray-50/30'
      default:
        return 'border-l-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffHours < 48) return 'Yesterday'
    
    return date.toLocaleDateString()
  }

  const TypeIcon = getTypeIcon()

  return (
    <div className={`bg-white rounded-lg border border-l-4 ${getPriorityBorder()} p-4 hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${getTypeColor()}`}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {insight.type}
          </span>
        </div>
        
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(insight.publishedAt)}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 leading-tight">
        {insight.title}
      </h4>

      {/* Summary */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-3">
        {insight.summary}
      </p>

      {/* Context Entity */}
      {insight.contextEntity && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
            Related to: {insight.contextEntity}
          </span>
        </div>
      )}

      {/* Tags */}
      {insight.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {insight.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
          {insight.tags.length > 3 && (
            <span className="text-xs text-gray-500 px-2 py-0.5">
              +{insight.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Source:</span>
          <span className="text-xs font-medium text-gray-700 truncate max-w-32">
            {insight.source}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-1"></div>
            <span className="text-xs text-gray-600">
              {Math.round(insight.relevanceScore * 100)}%
            </span>
          </div>
          
          <a
            href={insight.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Read
          </a>
        </div>
      </div>
    </div>
  )
}