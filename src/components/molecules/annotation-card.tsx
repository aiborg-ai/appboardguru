/**
 * AnnotationCard - Molecule Component
 * Individual annotation display card following Atomic Design principles
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/molecules/cards/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/display/badge'
import { 
  User, 
  Calendar, 
  MapPin, 
  MessageSquare, 
  Trash2, 
  Edit3,
  Eye,
  Lock
} from 'lucide-react'
import { AssetAnnotation } from '@/types/annotation-types'

interface AnnotationCardProps {
  annotation: AssetAnnotation
  currentPage: number
  onSelect: () => void
  onDelete: () => void
  onPageNavigate: (page: number) => void
  className?: string
}

export function AnnotationCard({
  annotation,
  currentPage,
  onSelect,
  onDelete,
  onPageNavigate,
  className
}: AnnotationCardProps) {
  const isCurrentPage = annotation.pageNumber === currentPage
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'highlight': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'comment': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'question': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'drawing': return 'bg-green-100 text-green-800 border-green-200'
      case 'stamp': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare className="h-3 w-3" />
      case 'question': return <MessageSquare className="h-3 w-3" />
      case 'drawing': return <Edit3 className="h-3 w-3" />
      default: return <Edit3 className="h-3 w-3" />
    }
  }

  return (
    <Card 
      className={cn(
        'p-3 cursor-pointer transition-all hover:shadow-md',
        isCurrentPage && 'ring-2 ring-blue-200 bg-blue-50',
        className
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {/* User avatar */}
          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            {annotation.user.avatarUrl ? (
              <img 
                src={annotation.user.avatarUrl} 
                alt={annotation.user.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-3 w-3 text-gray-600" />
            )}
          </div>
          
          {/* User name */}
          <span className="text-xs font-medium text-gray-900 truncate">
            {annotation.user.fullName}
          </span>
          
          {/* Type badge */}
          <Badge className={cn('text-xs px-1.5 py-0.5 flex items-center space-x-1', getTypeColor(annotation.annotationType))}>
            {getTypeIcon(annotation.annotationType)}
            <span className="capitalize">{annotation.annotationType}</span>
          </Badge>
          
          {/* Privacy indicator */}
          {annotation.isPrivate && (
            <Lock className="h-3 w-3 text-gray-400" />
          )}
        </div>

        {/* Page navigation button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onPageNavigate(annotation.pageNumber)
          }}
          className="h-6 px-2 text-xs flex-shrink-0"
          title={`Go to page ${annotation.pageNumber}`}
        >
          <MapPin className="h-3 w-3 mr-1" />
          p.{annotation.pageNumber}
        </Button>
      </div>

      {/* Content */}
      <div className="mb-2">
        <p className="text-sm text-gray-700 line-clamp-3">
          {annotation.commentText || annotation.content.text || 'No content'}
        </p>
        
        {/* Selected text preview */}
        {annotation.selectedText && (
          <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-300 text-xs">
            <span className="text-yellow-800">"{annotation.selectedText}"</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {/* Timestamp */}
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(annotation.createdAt)}</span>
          </div>
          
          {/* Replies count */}
          {annotation.repliesCount > 0 && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-3 w-3" />
              <span>{annotation.repliesCount} replies</span>
            </div>
          )}
          
          {/* Resolution status */}
          {annotation.isResolved && (
            <Badge variant="outline" className="text-xs">
              Resolved
            </Badge>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            title="Delete annotation"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}