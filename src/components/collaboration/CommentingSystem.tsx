/**
 * Commenting System Component
 * Real-time collaborative commenting with threading, reactions, and mentions
 * Following atomic design principles and CLAUDE.md patterns
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import {
  MessageSquare,
  Reply,
  MoreHorizontal,
  Edit3,
  Trash2,
  Check,
  X,
  AtSign,
  Paperclip,
  Send,
  Filter,
  Search,
  SortDesc,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile
} from 'lucide-react'

import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Input } from '@/features/shared/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'

import { UserPresenceIndicator } from './UserPresenceIndicator'
import { MentionAutocomplete } from '../comments/MentionAutocomplete'

import { useUser } from '../../lib/stores'
import { useRealtimeComments } from '../../hooks/useRealtimeComments'

import type {
  CollaborativeComment,
  CollaborativeCommentReply,
  CollaborativeReaction,
  CollaborativeAttachment,
  CollaborationPermissions,
  DocumentId,
  CollaborationSessionId,
  UserId,
  CommentThreadId
} from '../../types/document-collaboration'

// ================================
// Atoms
// ================================

interface EmojiReactionProps {
  emoji: string
  count: number
  isActive: boolean
  onToggle: () => void
}

const EmojiReaction = memo(function EmojiReaction({
  emoji,
  count,
  isActive,
  onToggle
}: EmojiReactionProps) {
  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onToggle}
      className={`h-6 px-2 text-xs ${isActive ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}`}
    >
      <span className="mr-1">{emoji}</span>
      <span>{count}</span>
    </Button>
  )
})

interface CommentStatusBadgeProps {
  status: 'open' | 'resolved' | 'dismissed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

const CommentStatusBadge = memo(function CommentStatusBadge({
  status,
  priority
}: CommentStatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'dismissed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = () => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="flex items-center space-x-1">
      <Badge variant="secondary" className={getStatusColor()}>
        {status === 'open' && <AlertCircle className="w-3 h-3 mr-1" />}
        {status === 'resolved' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'dismissed' && <X className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
      {priority !== 'normal' && (
        <Badge variant="secondary" className={getPriorityColor()}>
          {priority}
        </Badge>
      )}
    </div>
  )
})

// ================================
// Molecules
// ================================

interface CommentReactionBarProps {
  reactions: CollaborativeReaction[]
  currentUserId: UserId
  onReact: (emoji: string) => void
  onRemoveReaction: (emoji: string) => void
}

const CommentReactionBar = memo(function CommentReactionBar({
  reactions,
  currentUserId,
  onReact,
  onRemoveReaction
}: CommentReactionBarProps) {
  // Group reactions by emoji
  const groupedReactions = useMemo(() => {
    const groups: Record<string, { count: number; users: UserId[]; hasUserReacted: boolean }> = {}
    
    reactions.forEach(reaction => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = { count: 0, users: [], hasUserReacted: false }
      }
      groups[reaction.emoji].count++
      groups[reaction.emoji].users.push(reaction.userId)
      if (reaction.userId === currentUserId) {
        groups[reaction.emoji].hasUserReacted = true
      }
    })
    
    return groups
  }, [reactions, currentUserId])

  const quickEmojis = ['👍', '👎', '❤️', '😀', '😢', '😮']

  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t">
      <div className="flex items-center space-x-1">
        {Object.entries(groupedReactions).map(([emoji, data]) => (
          <EmojiReaction
            key={emoji}
            emoji={emoji}
            count={data.count}
            isActive={data.hasUserReacted}
            onToggle={() => 
              data.hasUserReacted ? onRemoveReaction(emoji) : onReact(emoji)
            }
          />
        ))}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2">
            <Smile className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="grid grid-cols-6 gap-1 p-2">
            {quickEmojis.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                onClick={() => onReact(emoji)}
                className="h-8 w-8 p-0"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
})

interface CommentInputProps {
  placeholder: string
  onSubmit: (content: string, mentions: UserId[]) => void
  onCancel?: () => void
  showCancel?: boolean
  initialContent?: string
  maxLength?: number
  autoFocus?: boolean
}

const CommentInput = memo(function CommentInput({
  placeholder,
  onSubmit,
  onCancel,
  showCancel = false,
  initialContent = '',
  maxLength = 1000,
  autoFocus = false
}: CommentInputProps) {
  const [content, setContent] = useState(initialContent)
  const [mentions, setMentions] = useState<UserId[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    if (content.trim()) {
      onSubmit(content.trim(), mentions)
      setContent('')
      setMentions([])
    }
  }, [content, mentions, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      e.preventDefault()
      onCancel()
    }
    if (e.key === '@') {
      setShowMentionDropdown(true)
    }
  }, [handleSubmit, onCancel])

  const handleMentionSelect = useCallback((userId: UserId, username: string) => {
    setMentions(prev => [...prev, userId])
    setShowMentionDropdown(false)
    // Replace @mention text with actual username
    const textarea = textareaRef.current
    if (textarea) {
      const cursorPos = textarea.selectionStart
      const textBefore = content.slice(0, cursorPos - 1) // Remove @
      const textAfter = content.slice(cursorPos)
      setContent(`${textBefore}@${username} ${textAfter}`)
    }
  }, [content])

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={3}
        className="resize-none pr-20"
      />
      
      {showMentionDropdown && (
        <MentionAutocomplete
          onSelect={handleMentionSelect}
          onClose={() => setShowMentionDropdown(false)}
          position={{ top: 50, left: 0 }}
        />
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-500">
          {content.length}/{maxLength} • Ctrl+Enter to send
        </span>
        
        <div className="flex items-center space-x-2">
          {showCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            <Send className="w-3 h-3 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  )
})

interface CommentReplyProps {
  reply: CollaborativeCommentReply
  permissions: CollaborationPermissions
  currentUserId: UserId
  onEdit?: (replyId: string, content: string) => void
  onDelete?: (replyId: string) => void
  onReact?: (replyId: string, emoji: string) => void
  onRemoveReaction?: (replyId: string, emoji: string) => void
}

const CommentReply = memo(function CommentReply({
  reply,
  permissions,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction
}: CommentReplyProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  const canEdit = permissions.canComment && reply.userId === currentUserId
  const canDelete = permissions.canResolveComments || reply.userId === currentUserId

  const handleEdit = useCallback((content: string) => {
    if (onEdit) {
      onEdit(reply.id, content)
      setIsEditing(false)
      toast({
        title: "Reply Updated",
        description: "Your reply has been updated successfully"
      })
    }
  }, [reply.id, onEdit, toast])

  const handleDelete = useCallback(() => {
    if (onDelete && confirm('Are you sure you want to delete this reply?')) {
      onDelete(reply.id)
      toast({
        title: "Reply Deleted",
        description: "The reply has been deleted successfully"
      })
    }
  }, [reply.id, onDelete, toast])

  return (
    <div className="flex space-x-3 py-2">
      <Avatar className="w-6 h-6 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {reply.userId.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium truncate">User {reply.userId}</span>
          <time className="text-xs text-gray-500" dateTime={reply.createdAt}>
            {new Date(reply.createdAt).toLocaleString()}
          </time>
          {reply.metadata?.isAIGenerated && (
            <Badge variant="secondary" className="text-xs">
              AI
            </Badge>
          )}
        </div>

        {isEditing ? (
          <CommentInput
            placeholder="Edit your reply..."
            initialContent={reply.content}
            onSubmit={handleEdit}
            onCancel={() => setIsEditing(false)}
            showCancel={true}
            autoFocus={true}
          />
        ) : (
          <>
            <div className="text-sm text-gray-700 mb-2">
              {reply.content}
            </div>

            {reply.reactions && reply.reactions.length > 0 && onReact && onRemoveReaction && (
              <CommentReactionBar
                reactions={reply.reactions}
                currentUserId={currentUserId}
                onReact={(emoji) => onReact(reply.id, emoji)}
                onRemoveReaction={(emoji) => onRemoveReaction(reply.id, emoji)}
              />
            )}
          </>
        )}

        {!isEditing && (canEdit || canDelete || onReact) && (
          <div className="flex items-center space-x-1 mt-1">
            {onReact && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onReact(reply.id, '👍')}
              >
                React
              </Button>
            )}
            
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
            
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ================================
// Organism
// ================================

interface CommentCardProps {
  comment: CollaborativeComment
  permissions: CollaborationPermissions
  currentUserId: UserId
  onReply?: (commentId: CommentThreadId, content: string, mentions: UserId[]) => void
  onEdit?: (commentId: CommentThreadId, content: string) => void
  onDelete?: (commentId: CommentThreadId) => void
  onResolve?: (commentId: CommentThreadId) => void
  onReopen?: (commentId: CommentThreadId) => void
  onReact?: (commentId: CommentThreadId, emoji: string) => void
  onRemoveReaction?: (commentId: CommentThreadId, emoji: string) => void
  onReplyEdit?: (commentId: CommentThreadId, replyId: string, content: string) => void
  onReplyDelete?: (commentId: CommentThreadId, replyId: string) => void
  onReplyReact?: (commentId: CommentThreadId, replyId: string, emoji: string) => void
  onReplyRemoveReaction?: (commentId: CommentThreadId, replyId: string, emoji: string) => void
}

const CommentCard = memo(function CommentCard({
  comment,
  permissions,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onReopen,
  onReact,
  onRemoveReaction,
  onReplyEdit,
  onReplyDelete,
  onReplyReact,
  onReplyRemoveReaction
}: CommentCardProps) {
  const [isReplying, setIsReplying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showReplies, setShowReplies] = useState(comment.replies.length <= 3)
  const { toast } = useToast()

  const canEdit = permissions.canComment && comment.userId === currentUserId
  const canDelete = permissions.canResolveComments || comment.userId === currentUserId
  const canResolve = permissions.canResolveComments
  const canReply = permissions.canComment && comment.status === 'open'

  const handleReply = useCallback((content: string, mentions: UserId[]) => {
    if (onReply) {
      onReply(comment.id, content, mentions)
      setIsReplying(false)
      toast({
        title: "Reply Added",
        description: "Your reply has been added successfully"
      })
    }
  }, [comment.id, onReply, toast])

  const handleEdit = useCallback((content: string) => {
    if (onEdit) {
      onEdit(comment.id, content)
      setIsEditing(false)
      toast({
        title: "Comment Updated",
        description: "Your comment has been updated successfully"
      })
    }
  }, [comment.id, onEdit, toast])

  const handleDelete = useCallback(() => {
    if (onDelete && confirm('Are you sure you want to delete this comment and all its replies?')) {
      onDelete(comment.id)
      toast({
        title: "Comment Deleted",
        description: "The comment has been deleted successfully"
      })
    }
  }, [comment.id, onDelete, toast])

  const handleResolve = useCallback(() => {
    if (onResolve) {
      onResolve(comment.id)
      toast({
        title: "Comment Resolved",
        description: "The comment has been marked as resolved"
      })
    }
  }, [comment.id, onResolve, toast])

  const handleReopen = useCallback(() => {
    if (onReopen) {
      onReopen(comment.id)
      toast({
        title: "Comment Reopened",
        description: "The comment has been reopened"
      })
    }
  }, [comment.id, onReopen, toast])

  return (
    <Card className={`p-4 ${comment.status === 'resolved' ? 'opacity-75 bg-green-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback>
              {comment.userId.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium truncate">User {comment.userId}</span>
              <time className="text-xs text-gray-500" dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleString()}
              </time>
            </div>
            
            <CommentStatusBadge
              status={comment.status}
              priority={comment.priority}
            />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            
            {canResolve && comment.status === 'open' && (
              <DropdownMenuItem onClick={handleResolve}>
                <Check className="w-4 h-4 mr-2" />
                Resolve
              </DropdownMenuItem>
            )}
            
            {canResolve && comment.status === 'resolved' && (
              <DropdownMenuItem onClick={handleReopen}>
                <AlertCircle className="w-4 h-4 mr-2" />
                Reopen
              </DropdownMenuItem>
            )}
            
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {isEditing ? (
        <CommentInput
          placeholder="Edit your comment..."
          initialContent={comment.content}
          onSubmit={handleEdit}
          onCancel={() => setIsEditing(false)}
          showCancel={true}
          autoFocus={true}
        />
      ) : (
        <>
          <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
            {comment.content}
          </div>

          {comment.metadata?.tags && comment.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {comment.metadata.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {comment.reactions && comment.reactions.length > 0 && onReact && onRemoveReaction && (
            <CommentReactionBar
              reactions={comment.reactions}
              currentUserId={currentUserId}
              onReact={(emoji) => onReact(comment.id, emoji)}
              onRemoveReaction={(emoji) => onRemoveReaction(comment.id, emoji)}
            />
          )}
        </>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center space-x-2">
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}
            
            {onReact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReact(comment.id, '👍')}
              >
                React
              </Button>
            )}
          </div>

          {comment.replies.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? 'Hide' : 'Show'} {comment.replies.length} replies
            </Button>
          )}
        </div>
      )}

      {/* Reply Input */}
      {isReplying && (
        <div className="mt-4 pt-4 border-t">
          <CommentInput
            placeholder="Write a reply..."
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            showCancel={true}
            autoFocus={true}
          />
        </div>
      )}

      {/* Replies */}
      {showReplies && comment.replies.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-2">
          {comment.replies.map(reply => (
            <CommentReply
              key={reply.id}
              reply={reply}
              permissions={permissions}
              currentUserId={currentUserId}
              onEdit={onReplyEdit ? (replyId, content) => onReplyEdit(comment.id, replyId, content) : undefined}
              onDelete={onReplyDelete ? (replyId) => onReplyDelete(comment.id, replyId) : undefined}
              onReact={onReplyReact ? (replyId, emoji) => onReplyReact(comment.id, replyId, emoji) : undefined}
              onRemoveReaction={onReplyRemoveReaction ? (replyId, emoji) => onReplyRemoveReaction(comment.id, replyId, emoji) : undefined}
            />
          ))}
        </div>
      )}
    </Card>
  )
})

// ================================
// Main Component
// ================================

export interface CommentingSystemProps {
  documentId: DocumentId
  sessionId?: CollaborationSessionId
  comments: CollaborativeComment[]
  permissions: CollaborationPermissions
  onAddComment: (content: string, position: { line: number; column: number }, mentions: UserId[]) => void
  onUpdateComment: (commentId: CommentThreadId, content: string) => void
  onDeleteComment: (commentId: CommentThreadId) => void
  onClose?: () => void
  className?: string
}

export const CommentingSystem = memo(function CommentingSystem({
  documentId,
  sessionId,
  comments,
  permissions,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onClose,
  className = ''
}: CommentingSystemProps) {
  const user = useUser()
  const { toast } = useToast()

  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)

  const {
    addReply,
    addReaction,
    removeReaction,
    resolveComment,
    reopenComment
  } = useRealtimeComments({
    documentId,
    sessionId,
    enabled: true
  })

  // Filter and sort comments
  const filteredComments = useMemo(() => {
    let filtered = comments

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(comment => comment.status === filter)
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(comment =>
        comment.content.toLowerCase().includes(searchLower) ||
        comment.replies.some(reply =>
          reply.content.toLowerCase().includes(searchLower)
        )
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        default:
          return 0
      }
    })

    return filtered
  }, [comments, filter, searchTerm, sortBy])

  const handleAddComment = useCallback((content: string, mentions: UserId[]) => {
    // For now, add comment at document start - in a real implementation,
    // this would be based on current cursor position
    onAddComment(content, { line: 0, column: 0 }, mentions)
    setIsAddingComment(false)
    toast({
      title: "Comment Added",
      description: "Your comment has been added successfully"
    })
  }, [onAddComment, toast])

  if (!user) {
    return null
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Comments</h3>
          <Badge variant="secondary">{comments.length}</Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-b space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search comments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-3 h-3 mr-1" />
                  {filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Resolved'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter('all')}>
                  All Comments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('open')}>
                  Open Comments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter('resolved')}>
                  Resolved Comments
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SortDesc className="w-3 h-3 mr-1" />
                  {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Priority'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('newest')}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                  Oldest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('priority')}>
                  By Priority
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {permissions.canComment && (
            <Button
              size="sm"
              onClick={() => setIsAddingComment(true)}
              disabled={isAddingComment}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Add Comment
            </Button>
          )}
        </div>
      </div>

      {/* Add Comment */}
      {isAddingComment && (
        <div className="p-4 border-b bg-gray-50">
          <CommentInput
            placeholder="Add a comment..."
            onSubmit={handleAddComment}
            onCancel={() => setIsAddingComment(false)}
            showCancel={true}
            autoFocus={true}
          />
        </div>
      )}

      {/* Comments List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {filteredComments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm || filter !== 'all'
                  ? 'No comments match your filters'
                  : 'No comments yet. Be the first to add one!'
                }
              </p>
            </div>
          ) : (
            filteredComments.map(comment => (
              <CommentCard
                key={comment.id}
                comment={comment}
                permissions={permissions}
                currentUserId={user.id as UserId}
                onReply={addReply}
                onEdit={onUpdateComment}
                onDelete={onDeleteComment}
                onResolve={resolveComment}
                onReopen={reopenComment}
                onReact={addReaction}
                onRemoveReaction={removeReaction}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          {filteredComments.length} of {comments.length} comments shown
        </div>
      </div>
    </Card>
  )
})

export default CommentingSystem