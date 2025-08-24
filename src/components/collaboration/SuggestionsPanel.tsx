/**
 * Suggestions Panel Component
 * Track changes style suggestions with approval workflow and AI assistance
 * Following atomic design principles and CLAUDE.md patterns
 */

'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { memo } from 'react'
import {
  Edit3,
  Check,
  X,
  Clock,
  User,
  Bot,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Filter,
  Search,
  SortDesc,
  FileText,
  Zap,
  Lightbulb,
  Target,
  TrendingUp
} from 'lucide-react'

import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Input } from '@/features/shared/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { useToast } from '@/components/ui/use-toast'

import { UserPresenceIndicator } from './UserPresenceIndicator'
import { useUser } from '../../lib/stores'

import type {
  DocumentSuggestion,
  CollaborationPermissions,
  DocumentId,
  CollaborationSessionId,
  UserId,
  SuggestionId
} from '../../types/document-collaboration'

// ================================
// Atoms
// ================================

interface SuggestionTypeIconProps {
  type: 'insert' | 'delete' | 'replace' | 'format' | 'move'
  className?: string
}

const SuggestionTypeIcon = memo(function SuggestionTypeIcon({
  type,
  className = 'w-4 h-4'
}: SuggestionTypeIconProps) {
  const getIcon = () => {
    switch (type) {
      case 'insert': return <span className={`${className} text-green-600`}>+</span>
      case 'delete': return <span className={`${className} text-red-600`}>-</span>
      case 'replace': return <Edit3 className={`${className} text-blue-600`} />
      case 'format': return <FileText className={`${className} text-purple-600`} />
      case 'move': return <TrendingUp className={`${className} text-orange-600`} />
      default: return <Edit3 className={className} />
    }
  }

  return getIcon()
})

interface SuggestionStatusBadgeProps {
  status: 'pending' | 'accepted' | 'rejected' | 'superseded'
  aiGenerated?: boolean
  confidence?: number
}

const SuggestionStatusBadge = memo(function SuggestionStatusBadge({
  status,
  aiGenerated = false,
  confidence
}: SuggestionStatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'superseded': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />
      case 'accepted': return <CheckCircle className="w-3 h-3" />
      case 'rejected': return <XCircle className="w-3 h-3" />
      case 'superseded': return <AlertCircle className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  return (
    <div className="flex items-center space-x-1">
      <Badge variant="secondary" className={getStatusColor()}>
        {getStatusIcon()}
        <span className="ml-1 capitalize">{status}</span>
      </Badge>
      
      {aiGenerated && (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Bot className="w-3 h-3 mr-1" />
          AI
          {confidence && (
            <span className="ml-1 text-xs">
              {Math.round(confidence * 100)}%
            </span>
          )}
        </Badge>
      )}
    </div>
  )
})

interface SuggestionDiffViewProps {
  originalContent?: string
  suggestedContent: string
  type: 'insert' | 'delete' | 'replace' | 'format' | 'move'
  showInline?: boolean
}

const SuggestionDiffView = memo(function SuggestionDiffView({
  originalContent = '',
  suggestedContent,
  type,
  showInline = true
}: SuggestionDiffViewProps) {
  if (showInline) {
    return (
      <div className="font-mono text-sm bg-gray-50 p-3 rounded border">
        {type === 'delete' && (
          <div className="bg-red-100 text-red-800 px-2 py-1 rounded inline-block">
            <span className="line-through">{originalContent}</span>
          </div>
        )}
        {type === 'insert' && (
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
            <span>{suggestedContent}</span>
          </div>
        )}
        {type === 'replace' && (
          <>
            <div className="bg-red-100 text-red-800 px-2 py-1 rounded inline-block mr-2">
              <span className="line-through">{originalContent}</span>
            </div>
            <div className="bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
              <span>{suggestedContent}</span>
            </div>
          </>
        )}
        {type === 'format' && (
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
            <span>Format: {suggestedContent}</span>
          </div>
        )}
        {type === 'move' && (
          <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded inline-block">
            <span>Move: {suggestedContent}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {originalContent && (
        <div>
          <div className="text-xs font-medium text-red-600 mb-1">- Original</div>
          <div className="font-mono text-sm bg-red-50 border border-red-200 p-2 rounded">
            {originalContent}
          </div>
        </div>
      )}
      <div>
        <div className="text-xs font-medium text-green-600 mb-1">+ Suggested</div>
        <div className="font-mono text-sm bg-green-50 border border-green-200 p-2 rounded">
          {suggestedContent}
        </div>
      </div>
    </div>
  )
})

// ================================
// Molecules
// ================================

interface SuggestionActionsProps {
  suggestion: DocumentSuggestion
  permissions: CollaborationPermissions
  currentUserId: UserId
  onAccept?: (suggestionId: SuggestionId) => void
  onReject?: (suggestionId: SuggestionId, reason?: string) => void
  onEdit?: (suggestionId: SuggestionId, content: string) => void
  onDelete?: (suggestionId: SuggestionId) => void
  disabled?: boolean
}

const SuggestionActions = memo(function SuggestionActions({
  suggestion,
  permissions,
  currentUserId,
  onAccept,
  onReject,
  onEdit,
  onDelete,
  disabled = false
}: SuggestionActionsProps) {
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const canEdit = permissions.canSuggest && suggestion.userId === currentUserId
  const canReview = permissions.canApprove || permissions.canManageVersions
  const canDelete = permissions.canManageVersions || suggestion.userId === currentUserId

  const handleReject = useCallback(() => {
    if (onReject) {
      onReject(suggestion.id, rejectReason.trim() || undefined)
      setShowRejectReason(false)
      setRejectReason('')
    }
  }, [suggestion.id, onReject, rejectReason])

  if (suggestion.status !== 'pending') {
    return (
      <div className="flex items-center justify-between">
        <SuggestionStatusBadge
          status={suggestion.status}
          aiGenerated={suggestion.metadata?.aiGenerated}
          confidence={suggestion.metadata?.confidence}
        />
        
        {suggestion.reviewedBy && suggestion.reviewedAt && (
          <div className="text-xs text-gray-500">
            Reviewed by User {suggestion.reviewedBy} on{' '}
            {new Date(suggestion.reviewedAt).toLocaleDateString()}
          </div>
        )}
      </div>
    )
  }

  if (showRejectReason) {
    return (
      <div className="space-y-2">
        <Textarea
          placeholder="Reason for rejection (optional)..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={2}
          maxLength={500}
        />
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRejectReason(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <SuggestionStatusBadge
        status={suggestion.status}
        aiGenerated={suggestion.metadata?.aiGenerated}
        confidence={suggestion.metadata?.confidence}
      />

      <div className="flex items-center space-x-1">
        {canReview && onAccept && (
          <Button
            variant="default"
            size="sm"
            onClick={() => onAccept(suggestion.id)}
            disabled={disabled}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-3 h-3 mr-1" />
            Accept
          </Button>
        )}

        {canReview && onReject && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRejectReason(true)}
            disabled={disabled}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <X className="w-3 h-3 mr-1" />
            Reject
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            
            {canEdit && onEdit && (
              <DropdownMenuItem onClick={() => {}}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Suggestion
              </DropdownMenuItem>
            )}
            
            {canDelete && onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(suggestion.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
})

// ================================
// Organism
// ================================

interface SuggestionCardProps {
  suggestion: DocumentSuggestion
  permissions: CollaborationPermissions
  currentUserId: UserId
  onAccept?: (suggestionId: SuggestionId) => void
  onReject?: (suggestionId: SuggestionId, reason?: string) => void
  onEdit?: (suggestionId: SuggestionId, content: string) => void
  onDelete?: (suggestionId: SuggestionId) => void
  className?: string
}

const SuggestionCard = memo(function SuggestionCard({
  suggestion,
  permissions,
  currentUserId,
  onAccept,
  onReject,
  onEdit,
  onDelete,
  className = ''
}: SuggestionCardProps) {
  const [showFullDiff, setShowFullDiff] = useState(false)

  const impactColor = useMemo(() => {
    if (!suggestion.metadata?.impact) return 'bg-gray-100'
    
    switch (suggestion.metadata.impact) {
      case 'minor': return 'bg-blue-100'
      case 'moderate': return 'bg-yellow-100'
      case 'major': return 'bg-red-100'
      default: return 'bg-gray-100'
    }
  }, [suggestion.metadata?.impact])

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full flex-shrink-0">
            <SuggestionTypeIcon type={suggestion.type} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium">
                {suggestion.metadata?.aiGenerated ? (
                  <div className="flex items-center">
                    <Bot className="w-4 h-4 mr-1 text-blue-600" />
                    AI Suggestion
                  </div>
                ) : (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1 text-gray-600" />
                    User {suggestion.userId}
                  </div>
                )}
              </span>
              <time className="text-xs text-gray-500" dateTime={suggestion.createdAt}>
                {new Date(suggestion.createdAt).toLocaleString()}
              </time>
            </div>
            
            <div className="text-sm text-gray-600 capitalize">
              {suggestion.type} • Position {suggestion.position.line}:{suggestion.position.column}
            </div>
            
            {suggestion.metadata?.categories && suggestion.metadata.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestion.metadata.categories.map(category => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {suggestion.metadata?.impact && (
          <Badge variant="secondary" className={impactColor}>
            {suggestion.metadata.impact} impact
          </Badge>
        )}
      </div>

      {/* Reason */}
      {suggestion.reason && (
        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-200 rounded-r">
          <div className="text-sm font-medium text-blue-800 mb-1">Suggestion Reason</div>
          <div className="text-sm text-blue-700">{suggestion.reason}</div>
        </div>
      )}

      {/* Content Diff */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Proposed Changes</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDiff(!showFullDiff)}
            className="text-xs"
          >
            {showFullDiff ? 'Show Inline' : 'Show Full Diff'}
          </Button>
        </div>
        
        <SuggestionDiffView
          originalContent={suggestion.originalContent}
          suggestedContent={suggestion.suggestedContent}
          type={suggestion.type}
          showInline={!showFullDiff}
        />
      </div>

      {/* AI Confidence */}
      {suggestion.metadata?.aiGenerated && suggestion.metadata.confidence && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">AI Confidence</span>
            <span>{Math.round(suggestion.metadata.confidence * 100)}%</span>
          </div>
          <Progress
            value={suggestion.metadata.confidence * 100}
            className="h-1"
          />
        </div>
      )}

      {/* Actions */}
      <SuggestionActions
        suggestion={suggestion}
        permissions={permissions}
        currentUserId={currentUserId}
        onAccept={onAccept}
        onReject={onReject}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Card>
  )
})

interface AISuggestionsGeneratorProps {
  documentId: DocumentId
  sessionId?: CollaborationSessionId
  onGenerateSuggestions: (type: string) => void
  isGenerating: boolean
  className?: string
}

const AISuggestionsGenerator = memo(function AISuggestionsGenerator({
  documentId,
  sessionId,
  onGenerateSuggestions,
  isGenerating,
  className = ''
}: AISuggestionsGeneratorProps) {
  const suggestionTypes = [
    {
      id: 'grammar',
      title: 'Grammar & Spelling',
      description: 'Fix grammatical errors and spelling mistakes',
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 'style',
      title: 'Writing Style',
      description: 'Improve clarity and readability',
      icon: <Edit3 className="w-4 h-4" />
    },
    {
      id: 'structure',
      title: 'Document Structure',
      description: 'Optimize organization and flow',
      icon: <Target className="w-4 h-4" />
    },
    {
      id: 'conciseness',
      title: 'Conciseness',
      description: 'Remove redundancy and wordiness',
      icon: <Zap className="w-4 h-4" />
    }
  ]

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Bot className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">AI Suggestions</h3>
        <Badge variant="secondary">Powered by AI</Badge>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {suggestionTypes.map(type => (
          <Button
            key={type.id}
            variant="outline"
            onClick={() => onGenerateSuggestions(type.id)}
            disabled={isGenerating}
            className="justify-start p-3 h-auto"
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                {type.icon}
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{type.title}</div>
                <div className="text-xs text-gray-500">{type.description}</div>
              </div>
            </div>
            {isGenerating && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </Button>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <strong>Pro Tip:</strong> AI suggestions are based on best practices and can help improve document quality. Review each suggestion carefully before accepting.
          </div>
        </div>
      </div>
    </Card>
  )
})

// ================================
// Main Component
// ================================

export interface SuggestionsPanelProps {
  documentId: DocumentId
  sessionId?: CollaborationSessionId
  permissions: CollaborationPermissions
  onClose?: () => void
  className?: string
}

export const SuggestionsPanel = memo(function SuggestionsPanel({
  documentId,
  sessionId,
  permissions,
  onClose,
  className = ''
}: SuggestionsPanelProps) {
  const user = useUser()
  const { toast } = useToast()

  const [suggestions, setSuggestions] = useState<DocumentSuggestion[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'impact'>('newest')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  // Mock data - in real implementation, this would come from a hook
  const mockSuggestions: DocumentSuggestion[] = [
    {
      id: 'suggestion-1' as SuggestionId,
      documentId,
      userId: 'ai-assistant' as UserId,
      sessionId: sessionId!,
      type: 'replace',
      position: { line: 5, column: 10, offset: 120 },
      originalContent: 'very unique',
      suggestedContent: 'unique',
      status: 'pending',
      reason: 'Redundant modifier: "very" is unnecessary with "unique"',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      metadata: {
        aiGenerated: true,
        confidence: 0.95,
        impact: 'minor',
        category: ['grammar', 'style']
      }
    },
    {
      id: 'suggestion-2' as SuggestionId,
      documentId,
      userId: user?.id as UserId || 'user-1' as UserId,
      sessionId: sessionId!,
      type: 'insert',
      position: { line: 12, column: 0, offset: 350 },
      suggestedContent: 'However, it is important to consider that ',
      status: 'pending',
      reason: 'Add transition to improve flow between paragraphs',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      metadata: {
        aiGenerated: false,
        impact: 'moderate',
        category: ['structure']
      }
    },
    {
      id: 'suggestion-3' as SuggestionId,
      documentId,
      userId: 'ai-assistant' as UserId,
      sessionId: sessionId!,
      type: 'delete',
      position: { line: 20, column: 5, offset: 500 },
      originalContent: 'in my opinion, I think that ',
      suggestedContent: '',
      status: 'accepted',
      reason: 'Remove redundant phrase',
      createdAt: new Date(Date.now() - 10800000).toISOString(),
      reviewedAt: new Date(Date.now() - 3600000).toISOString(),
      reviewedBy: user?.id as UserId,
      metadata: {
        aiGenerated: true,
        confidence: 0.88,
        impact: 'minor',
        category: ['conciseness']
      }
    }
  ]

  useEffect(() => {
    setSuggestions(mockSuggestions)
  }, [])

  // Filter and sort suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = suggestions

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.status === filter)
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(suggestion =>
        suggestion.suggestedContent.toLowerCase().includes(searchLower) ||
        suggestion.originalContent?.toLowerCase().includes(searchLower) ||
        suggestion.reason?.toLowerCase().includes(searchLower)
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
          const priorityOrder = { major: 3, moderate: 2, minor: 1 }
          const aImpact = a.metadata?.impact || 'minor'
          const bImpact = b.metadata?.impact || 'minor'
          return priorityOrder[bImpact as keyof typeof priorityOrder] - 
                 priorityOrder[aImpact as keyof typeof priorityOrder]
        case 'impact':
          return (b.metadata?.confidence || 0) - (a.metadata?.confidence || 0)
        default:
          return 0
      }
    })

    return filtered
  }, [suggestions, filter, searchTerm, sortBy])

  const handleAccept = useCallback((suggestionId: SuggestionId) => {
    setSuggestions(prev => prev.map(suggestion => 
      suggestion.id === suggestionId 
        ? {
            ...suggestion, 
            status: 'accepted' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.id as UserId
          }
        : suggestion
    ))
    toast({
      title: "Suggestion Accepted",
      description: "The suggestion has been applied to the document"
    })
  }, [user?.id, toast])

  const handleReject = useCallback((suggestionId: SuggestionId, reason?: string) => {
    setSuggestions(prev => prev.map(suggestion => 
      suggestion.id === suggestionId 
        ? {
            ...suggestion, 
            status: 'rejected' as const,
            reviewedAt: new Date().toISOString(),
            reviewedBy: user?.id as UserId,
            reason: reason || suggestion.reason
          }
        : suggestion
    ))
    toast({
      title: "Suggestion Rejected",
      description: reason || "The suggestion has been rejected"
    })
  }, [user?.id, toast])

  const handleDelete = useCallback((suggestionId: SuggestionId) => {
    setSuggestions(prev => prev.filter(suggestion => suggestion.id !== suggestionId))
    toast({
      title: "Suggestion Deleted",
      description: "The suggestion has been removed"
    })
  }, [toast])

  const handleGenerateAISuggestions = useCallback(async (type: string) => {
    setIsGeneratingAI(true)
    try {
      // Simulate AI suggestion generation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      toast({
        title: "AI Suggestions Generated",
        description: `Generated suggestions for ${type} improvements`
      })
      
      // In real implementation, this would call the AI service
      console.log(`Generating AI suggestions for: ${type}`)
      
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI suggestions",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingAI(false)
    }
  }, [toast])

  const pendingCount = suggestions.filter(s => s.status === 'pending').length
  const acceptedCount = suggestions.filter(s => s.status === 'accepted').length
  const rejectedCount = suggestions.filter(s => s.status === 'rejected').length

  if (!user) {
    return null
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Edit3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Suggestions</h3>
          <Badge variant="secondary">{suggestions.length}</Badge>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Tabs defaultValue="suggestions" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="suggestions">
            Suggestions
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai-generate">AI Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="flex-1 flex flex-col mt-0">
          {/* Controls */}
          <div className="p-4 border-b space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search suggestions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-3 h-3 mr-1" />
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilter('all')}>
                    All Suggestions ({suggestions.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('pending')}>
                    Pending ({pendingCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('accepted')}>
                    Accepted ({acceptedCount})
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter('rejected')}>
                    Rejected ({rejectedCount})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SortDesc className="w-3 h-3 mr-1" />
                    {sortBy === 'newest' ? 'Newest' : 
                     sortBy === 'oldest' ? 'Oldest' :
                     sortBy === 'priority' ? 'Priority' : 'Impact'}
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
                    By Impact
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('impact')}>
                    By Confidence
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{filteredSuggestions.length} suggestions shown</span>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">{pendingCount} pending</span>
                <span className="text-green-600">{acceptedCount} accepted</span>
                <span className="text-red-600">{rejectedCount} rejected</span>
              </div>
            </div>
          </div>

          {/* Suggestions List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Edit3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchTerm || filter !== 'all'
                      ? 'No suggestions match your filters'
                      : 'No suggestions yet. Generate AI suggestions or create manual ones!'
                    }
                  </p>
                </div>
              ) : (
                filteredSuggestions.map(suggestion => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    permissions={permissions}
                    currentUserId={user.id as UserId}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="ai-generate" className="flex-1 p-4">
          <AISuggestionsGenerator
            documentId={documentId}
            sessionId={sessionId}
            onGenerateSuggestions={handleGenerateAISuggestions}
            isGenerating={isGeneratingAI}
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
})

export default SuggestionsPanel