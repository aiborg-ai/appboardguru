'use client'

import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  User, 
  Clock, 
  Reply, 
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase'

interface AnnotationSidebarProps {
  assetId: string
  onAnnotationSelect?: (annotation: any) => void
}

interface Annotation {
  id: string
  content: string
  pageNumber: number
  annotationType: 'highlight' | 'comment' | 'area'
  position: any
  style: any
  createdAt: string
  createdBy: string
  isResolved: boolean
  author: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  replies: AnnotationReply[]
}

interface AnnotationReply {
  id: string
  content: string
  createdAt: string
  createdBy: string
  author: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
}

export function AnnotationSidebar({ assetId, onAnnotationSelect }: AnnotationSidebarProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set())
  const supabase = createSupabaseBrowserClient()

  // Fetch annotations with replies
  const fetchAnnotations = async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations?includeReplies=true`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch annotations')
      }
      
      setAnnotations(result.data || [])
    } catch (error) {
      console.error('Error fetching annotations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle reply submission
  const handleReplySubmit = async (annotationId: string) => {
    if (!replyContent.trim()) return

    try {
      const response = await fetch(`/api/assets/${assetId}/annotations/${annotationId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: replyContent.trim()
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create reply')
      }

      setReplyContent('')
      setReplyingTo(null)
      fetchAnnotations() // Refresh to show new reply
    } catch (error) {
      console.error('Error creating reply:', error)
    }
  }

  // Handle annotation resolution
  const handleResolveAnnotation = async (annotationId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations/${annotationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isResolved: resolved
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to update annotation')
      }

      fetchAnnotations() // Refresh annotations
    } catch (error) {
      console.error('Error updating annotation:', error)
    }
  }

  // Toggle annotation expansion
  const toggleAnnotation = (annotationId: string) => {
    const newExpanded = new Set(expandedAnnotations)
    if (newExpanded.has(annotationId)) {
      newExpanded.delete(annotationId)
    } else {
      newExpanded.add(annotationId)
    }
    setExpandedAnnotations(newExpanded)
  }

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`annotation-sidebar:${assetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `asset_id=eq.${assetId}`
        },
        () => {
          fetchAnnotations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_replies'
        },
        () => {
          fetchAnnotations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [assetId, supabase])

  // Load annotations on mount
  useEffect(() => {
    fetchAnnotations()
  }, [assetId])

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-4 h-24"></div>
          ))}
        </div>
      </div>
    )
  }

  const resolvedCount = annotations.filter(a => a.isResolved).length
  const totalCount = annotations.length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Annotations</h3>
          <span className="text-sm text-gray-500">
            {totalCount} total • {resolvedCount} resolved
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MessageSquare className="h-4 w-4" />
          <span>Collaborative comments and highlights</span>
        </div>
      </div>

      {/* Annotations List */}
      <div className="flex-1 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Annotations Yet</h4>
            <p className="text-gray-600 text-sm">
              Start by selecting text or areas to highlight and comment on this document.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {annotations.map((annotation) => {
              const isExpanded = expandedAnnotations.has(annotation.id)
              const hasReplies = annotation.replies && annotation.replies.length > 0
              
              return (
                <div key={annotation.id} className="p-4 hover:bg-gray-50">
                  {/* Annotation Header */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {annotation.author.avatarUrl ? (
                        <img
                          src={annotation.author.avatarUrl}
                          alt={annotation.author.fullName}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {annotation.author.fullName}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDistanceToNow(new Date(annotation.createdAt))} ago</span>
                            <span>•</span>
                            <span>Page {annotation.pageNumber}</span>
                            <span>•</span>
                            <span className="capitalize">{annotation.annotationType}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {annotation.isResolved ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </span>
                          ) : (
                            <button
                              onClick={() => handleResolveAnnotation(annotation.id, true)}
                              className="p-1 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50"
                              title="Mark as resolved"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => onAnnotationSelect?.(annotation)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            title="Jump to annotation"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Annotation Content */}
                      <div className="mt-2">
                        <p className="text-sm text-gray-700">{annotation.content}</p>
                      </div>

                      {/* Replies Section */}
                      {hasReplies && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleAnnotation(annotation.id)}
                            className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <span>{annotation.replies.length} replies</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                              {annotation.replies.map((reply) => (
                                <div key={reply.id} className="flex items-start space-x-2">
                                  <div className="flex-shrink-0">
                                    {reply.author.avatarUrl ? (
                                      <img
                                        src={reply.author.avatarUrl}
                                        alt={reply.author.fullName}
                                        className="h-6 w-6 rounded-full"
                                      />
                                    ) : (
                                      <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <User className="h-3 w-3 text-gray-500" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-xs font-medium text-gray-900">
                                        {reply.author.fullName}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(reply.createdAt))} ago
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-700 mt-1">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reply Input */}
                      {replyingTo === annotation.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleReplySubmit(annotation.id)}
                              disabled={!replyContent.trim()}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <Reply className="h-3 w-3 mr-1" />
                              Reply
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyContent('')
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(annotation.id)}
                          className="mt-2 inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600"
                        >
                          <Reply className="h-3 w-3" />
                          <span>Reply</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{annotations.length} annotations</span>
          <span>{annotations.filter(a => !a.isResolved).length} unresolved</span>
        </div>
      </div>
    </div>
  )
}