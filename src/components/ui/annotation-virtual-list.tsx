'use client'

import React, { useState, useCallback, useMemo, forwardRef } from 'react'
import { VirtualScrollList, VirtualScrollListRef, VirtualScrollListItem } from './virtual-scroll-list'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Card } from '@/features/shared/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import {
  MessageSquare,
  Reply,
  Edit,
  Trash2,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Link,
  Quote,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface Annotation {
  id: string
  content: string
  type: 'comment' | 'highlight' | 'note' | 'question' | 'suggestion' | 'approval' | 'rejection'
  status: 'active' | 'resolved' | 'draft' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  author: {
    id: string
    name: string
    email: string
    avatar?: string
    role?: string
  }
  targetText?: string
  targetElement?: {
    selector: string
    page?: number
    coordinates?: { x: number; y: number }
  }
  replies: Array<{
    id: string
    content: string
    author: {
      id: string
      name: string
      email: string
      avatar?: string
    }
    createdAt: string
    updatedAt?: string
    reactions?: Array<{
      type: 'like' | 'dislike' | 'helpful' | 'unclear'
      count: number
      userReacted: boolean
    }>
  }>
  reactions?: Array<{
    type: 'like' | 'dislike' | 'helpful' | 'unclear'
    count: number
    userReacted: boolean
  }>
  tags?: string[]
  isPrivate: boolean
  mentions?: string[]
  attachments?: Array<{
    id: string
    name: string
    url: string
    type: string
  }>
  createdAt: string
  updatedAt?: string
  resolvedAt?: string
  resolvedBy?: {
    id: string
    name: string
  }
}

interface AnnotationVirtualListProps {
  annotations: Annotation[]
  height?: number | string
  searchTerm?: string
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onAnnotationClick?: (annotation: Annotation) => void
  onReply?: (annotation: Annotation) => void
  onEdit?: (annotation: Annotation) => void
  onDelete?: (annotation: Annotation) => void
  onResolve?: (annotation: Annotation) => void
  onReaction?: (annotation: Annotation, reactionType: string) => void
  onFlag?: (annotation: Annotation) => void
  className?: string
  enableSelection?: boolean
  selectedAnnotations?: Set<string>
  onSelectionChange?: (selectedAnnotations: Set<string>) => void
  showResolved?: boolean
  groupByType?: boolean
  currentUserId?: string
}

// Annotation item component for virtual list
interface AnnotationItemProps {
  item: VirtualScrollListItem
  index: number
  style: React.CSSProperties
}

const AnnotationItem: React.FC<AnnotationItemProps> = ({ item }) => {
  const annotation = item.data as Annotation
  const [showReplies, setShowReplies] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const getTypeConfig = (type: string) => {
    const configs = {
      'comment': { 
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: MessageSquare,
        label: 'Comment'
      },
      'highlight': { 
        color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: Quote,
        label: 'Highlight'
      },
      'note': { 
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: Edit,
        label: 'Note'
      },
      'question': { 
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: AlertCircle,
        label: 'Question'
      },
      'suggestion': { 
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: Edit,
        label: 'Suggestion'
      },
      'approval': { 
        color: 'bg-green-50 text-green-700 border-green-200',
        icon: CheckCircle,
        label: 'Approval'
      },
      'rejection': { 
        color: 'bg-red-50 text-red-700 border-red-200',
        icon: AlertCircle,
        label: 'Rejection'
      }
    }
    return configs[type as keyof typeof configs] || configs.comment
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      'active': { color: 'bg-blue-100 text-blue-800', label: 'Active' },
      'resolved': { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      'draft': { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      'archived': { color: 'bg-yellow-100 text-yellow-800', label: 'Archived' }
    }
    return configs[status as keyof typeof configs] || configs.active
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'text-gray-500',
      'medium': 'text-blue-500',
      'high': 'text-orange-500',
      'urgent': 'text-red-500'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const typeConfig = getTypeConfig(annotation.type)
  const statusConfig = getStatusConfig(annotation.status)
  const TypeIcon = typeConfig.icon

  const handleReply = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onReply from props
  }, [])

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onEdit from props
  }, [])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onDelete from props
  }, [])

  const handleResolve = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onResolve from props
  }, [])

  const handleReaction = useCallback((type: string) => {
    // Would call onReaction from props
  }, [])

  const handleFlag = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // Would call onFlag from props
  }, [])

  return (
    <Card className={cn(
      'mb-3 hover:shadow-md transition-all duration-200',
      annotation.status === 'resolved' && 'opacity-75',
      annotation.priority === 'urgent' && 'ring-2 ring-red-200',
      annotation.isPrivate && 'bg-gray-50'
    )}>
      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Author Avatar */}
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={annotation.author.avatar} alt={annotation.author.name} />
            <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {getInitials(annotation.author.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {annotation.author.name}
                  </span>
                  
                  {annotation.author.role && (
                    <span className="text-xs text-gray-500">
                      ({annotation.author.role})
                    </span>
                  )}
                  
                  <Badge className={cn('text-xs px-2 py-0.5 border', typeConfig.color)}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {typeConfig.label}
                  </Badge>
                  
                  <Badge className={cn('text-xs px-2 py-0.5', statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>

                  {annotation.priority !== 'medium' && (
                    <div className={cn('h-2 w-2 rounded-full', {
                      'bg-gray-400': annotation.priority === 'low',
                      'bg-orange-400': annotation.priority === 'high',
                      'bg-red-500': annotation.priority === 'urgent'
                    })} />
                  )}

                  {annotation.isPrivate && (
                    <EyeOff className="h-3 w-3 text-gray-400" />
                  )}
                </div>

                <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(annotation.createdAt), { addSuffix: true })}
                  </span>
                  
                  {annotation.updatedAt && annotation.updatedAt !== annotation.createdAt && (
                    <span>(edited)</span>
                  )}
                  
                  {annotation.targetElement?.page && (
                    <span>Page {annotation.targetElement.page}</span>
                  )}
                </div>

                {/* Target Text (if highlighting) */}
                {annotation.targetText && (
                  <div className="mb-2 p-2 bg-yellow-50 border-l-3 border-yellow-400 text-sm italic">
                    "{annotation.targetText}"
                  </div>
                )}

                {/* Content */}
                <div className="text-sm text-gray-900 mb-2">
                  {isExpanded || annotation.content.length <= 200 ? (
                    <div dangerouslySetInnerHTML={{ __html: annotation.content }} />
                  ) : (
                    <div>
                      <div dangerouslySetInnerHTML={{ __html: annotation.content.slice(0, 200) + '...' }} />
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-blue-600 text-xs"
                        onClick={() => setIsExpanded(true)}
                      >
                        Show more
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {annotation.tags && annotation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {annotation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {annotation.attachments && annotation.attachments.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <Link className="h-3 w-3" />
                    <span>{annotation.attachments.length} attachment{annotation.attachments.length !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Reactions */}
                {annotation.reactions && annotation.reactions.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    {annotation.reactions.map((reaction) => (
                      <Button
                        key={reaction.type}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-6 px-2 text-xs border',
                          reaction.userReacted 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        )}
                        onClick={() => handleReaction(reaction.type)}
                      >
                        {reaction.type === 'like' && <ThumbsUp className="h-3 w-3 mr-1" />}
                        {reaction.type === 'dislike' && <ThumbsDown className="h-3 w-3 mr-1" />}
                        {reaction.count}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Resolved Info */}
                {annotation.status === 'resolved' && annotation.resolvedBy && (
                  <div className="text-xs text-green-600 bg-green-50 rounded p-2 mb-2">
                    Resolved by {annotation.resolvedBy.name}
                    {annotation.resolvedAt && (
                      <span className="ml-1">
                        {formatDistanceToNow(new Date(annotation.resolvedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                )}

                {/* Replies */}
                {annotation.replies.length > 0 && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReplies(!showReplies)}
                      className="text-xs h-6 px-2 text-blue-600"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      {showReplies ? 'Hide' : 'Show'} {annotation.replies.length} repl{annotation.replies.length === 1 ? 'y' : 'ies'}
                    </Button>

                    {showReplies && (
                      <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                        {annotation.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                              <AvatarFallback className="text-xs">
                                {getInitials(reply.author.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-900">
                                  {reply.author.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                              <div className="text-xs text-gray-700">
                                {reply.content}
                              </div>
                              {reply.reactions && reply.reactions.length > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  {reply.reactions.map((reaction) => (
                                    <Button
                                      key={reaction.type}
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 px-1 text-xs"
                                      onClick={() => handleReaction(reaction.type)}
                                    >
                                      {reaction.type === 'like' && <ThumbsUp className="h-2 w-2 mr-1" />}
                                      {reaction.count}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                  onClick={handleReply}
                >
                  <Reply className="h-3 w-3" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-gray-50"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleReply}>
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </DropdownMenuItem>
                    {annotation.status !== 'resolved' && (
                      <DropdownMenuItem onClick={handleResolve}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Resolved
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleFlag}>
                      <Flag className="h-4 w-4 mr-2" />
                      Flag
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Main AnnotationVirtualList component
export const AnnotationVirtualList = forwardRef<VirtualScrollListRef, AnnotationVirtualListProps>(
  ({
    annotations,
    height = 600,
    searchTerm,
    loading = false,
    hasMore = false,
    onLoadMore,
    onAnnotationClick,
    onReply,
    onEdit,
    onDelete,
    onResolve,
    onReaction,
    onFlag,
    className,
    enableSelection = false,
    selectedAnnotations,
    onSelectionChange,
    showResolved = true,
    groupByType = false,
    currentUserId
  }, ref) => {

    // Filter annotations based on showResolved
    const filteredAnnotations = useMemo(() => {
      let filtered = annotations
      
      if (!showResolved) {
        filtered = filtered.filter(annotation => annotation.status !== 'resolved')
      }
      
      return filtered
    }, [annotations, showResolved])

    // Group annotations by type if enabled
    const processedAnnotations = useMemo(() => {
      if (!groupByType) return filteredAnnotations

      const grouped = filteredAnnotations.reduce((acc, annotation) => {
        if (!acc[annotation.type]) acc[annotation.type] = []
        acc[annotation.type].push(annotation)
        return acc
      }, {} as Record<string, Annotation[]>)

      // Flatten back to array with type headers
      const flattened: Annotation[] = []
      Object.entries(grouped).forEach(([type, typeAnnotations]) => {
        // Add a synthetic header item
        flattened.push({
          id: `header-${type}`,
          content: `${typeAnnotations.length} ${type}(s)`,
          type: 'header' as any,
          status: 'active',
          priority: 'medium',
          author: { id: '', name: '', email: '' },
          replies: [],
          isPrivate: false,
          createdAt: ''
        })
        flattened.push(...typeAnnotations)
      })

      return flattened
    }, [filteredAnnotations, groupByType])

    // Convert annotations to virtual list items
    const virtualItems = useMemo((): VirtualScrollListItem[] => {
      return processedAnnotations.map(annotation => ({
        id: annotation.id,
        data: annotation
      }))
    }, [processedAnnotations])

    // Dynamic height calculation based on content
    const getItemHeight = useCallback((index: number, item: VirtualScrollListItem) => {
      const annotation = item.data as Annotation
      
      if (annotation.type === 'header') {
        return 40
      }
      
      // Base height
      let height = 120
      
      // Add height for target text
      if (annotation.targetText) {
        height += 40
      }
      
      // Add height for longer content
      if (annotation.content.length > 200) {
        height += 20
      }
      
      // Add height for tags
      if (annotation.tags && annotation.tags.length > 0) {
        height += 24
      }
      
      // Add height for attachments
      if (annotation.attachments && annotation.attachments.length > 0) {
        height += 20
      }
      
      // Add height for reactions
      if (annotation.reactions && annotation.reactions.length > 0) {
        height += 28
      }
      
      // Add height for replies (when expanded)
      if (annotation.replies.length > 0) {
        height += 24 + (annotation.replies.length * 40)
      }
      
      // Add height for resolved info
      if (annotation.status === 'resolved' && annotation.resolvedBy) {
        height += 32
      }
      
      // Add padding
      height += 24
      
      return height
    }, [])

    const handleItemClick = useCallback((item: VirtualScrollListItem, index: number) => {
      const annotation = item.data as Annotation
      if (annotation.type !== 'header') {
        onAnnotationClick?.(annotation)
      }
    }, [onAnnotationClick])

    return (
      <div className={cn('annotation-virtual-list', className)}>
        <VirtualScrollList
          ref={ref}
          items={virtualItems}
          itemComponent={AnnotationItem}
          itemHeight={getItemHeight}
          height={height}
          estimatedItemHeight={150}
          searchTerm={searchTerm}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          enableSelection={enableSelection}
          selectedItems={selectedAnnotations}
          onSelectionChange={onSelectionChange}
          onItemClick={handleItemClick}
          enableKeyboardNavigation={true}
          overscan={3}
          loadMoreThreshold={5}
        />
      </div>
    )
  }
)

AnnotationVirtualList.displayName = 'AnnotationVirtualList'

export default AnnotationVirtualList