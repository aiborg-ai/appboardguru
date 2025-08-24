'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Mic, 
  Plus, 
  Edit3, 
  Trash2, 
  Share2, 
  Reply, 
  MoreVertical,
  User,
  Clock,
  Volume2,
  Pause,
  Play,
  Filter,
  Search,
  Tag,
  Users
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/cards/card'
import { Badge } from '@/components/atoms/display/badge'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Textarea } from '@/components/atoms/form/textarea'
import { Input } from '@/components/atoms/form/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/features/shared/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/features/shared/ui/dialog'
import { VoiceInputButton } from '@/components/ui/VoiceInputButton'
import { 
  useDocumentContext, 
  useDocumentActions, 
  DocumentAnnotation 
} from './DocumentContextProvider'
import { TabContentWrapper, TabEmptyState } from './DocumentTabs'

interface NewAnnotationFormProps {
  onSubmit: (annotation: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  currentPage: number
}

function NewAnnotationForm({ onSubmit, onCancel, currentPage }: NewAnnotationFormProps) {
  const [type, setType] = useState<DocumentAnnotation['type']>('note')
  const [content, setContent] = useState('')
  const [voiceUrl, setVoiceUrl] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleVoiceTranscription = (text: string) => {
    setContent(prev => prev ? `${prev}\n\n[Voice Note]: ${text}` : `[Voice Note]: ${text}`)
    setType('voice')
  }

  const handleSubmit = async () => {
    if (!content.trim()) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        type,
        content: content.trim(),
        voiceUrl,
        sectionReference: {
          page: currentPage,
          coordinates: { x: 100, y: 100, width: 200, height: 50 },
          text: `Page ${currentPage} annotation`
        },
        userId: 'current-user',
        userName: 'Current User',
        isShared: false,
        sharedWith: []
      })
      setContent('')
      setVoiceUrl(undefined)
      setType('note')
      onCancel()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="p-4 border-blue-200 bg-blue-50">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">New Annotation</h4>
          <div className="flex items-center space-x-2">
            <select 
              value={type} 
              onChange={(e) => setType(e.target.value as DocumentAnnotation['type'])}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="note">Note</option>
              <option value="comment">Comment</option>
              <option value="question">Question</option>
              <option value="voice">Voice Note</option>
            </select>
            <Badge variant="outline" className="text-xs">
              Page {currentPage}
            </Badge>
          </div>
        </div>

        <Textarea
          placeholder="Add your annotation..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] resize-none"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <VoiceInputButton
              onTranscription={handleVoiceTranscription}
              size="sm"
              variant="outline"
            />
            <Button variant="ghost" size="sm" title="Add attachment">
              <Tag className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface AnnotationCardProps {
  annotation: DocumentAnnotation
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onReply: (id: string) => void
  onShare: (id: string) => void
  onNavigate: (page: number) => void
  currentPage: number
}

function AnnotationCard({ 
  annotation, 
  onEdit, 
  onDelete, 
  onReply, 
  onShare, 
  onNavigate,
  currentPage 
}: AnnotationCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const isCurrentPage = annotation.sectionReference.page === currentPage

  const handlePlayVoice = () => {
    if (!annotation.voiceUrl || !audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getTypeIcon = () => {
    switch (annotation.type) {
      case 'voice': return <Mic className="h-3 w-3" />
      case 'question': return <MessageSquare className="h-3 w-3" />
      case 'comment': return <MessageSquare className="h-3 w-3" />
      default: return <Edit3 className="h-3 w-3" />
    }
  }

  const getTypeColor = () => {
    switch (annotation.type) {
      case 'voice': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'question': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'comment': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <Card className={`p-3 transition-all ${isCurrentPage ? 'ring-2 ring-blue-200 bg-blue-50' : ''}`}>
      {/* Voice audio element */}
      {annotation.voiceUrl && (
        <audio
          ref={audioRef}
          src={annotation.voiceUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-3 w-3 text-gray-600" />
              </div>
              <span className="text-xs font-medium text-gray-900">{annotation.userName}</span>
            </div>
            
            <Badge className={`text-xs px-1.5 py-0.5 ${getTypeColor()}`}>
              <div className="flex items-center space-x-1">
                {getTypeIcon()}
                <span>{annotation.type}</span>
              </div>
            </Badge>

            {annotation.isShared && (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Shared
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(annotation.sectionReference.page)}
              className="h-6 px-2 text-xs"
              title={`Go to page ${annotation.sectionReference.page}`}
            >
              p.{annotation.sectionReference.page}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(annotation.id)}>
                  <Edit3 className="h-3 w-3 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReply(annotation.id)}>
                  <Reply className="h-3 w-3 mr-2" />
                  Reply
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShare(annotation.id)}>
                  <Share2 className="h-3 w-3 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(annotation.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {annotation.voiceUrl && (
            <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayVoice}
                className="h-6 w-6 p-0"
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </Button>
              <div className="flex-1 h-1 bg-purple-200 rounded-full">
                <div className="h-full bg-purple-500 rounded-full w-1/3"></div>
              </div>
              <span className="text-xs text-purple-700">Voice Note</span>
            </div>
          )}

          <div className="text-sm text-gray-700">
            {isExpanded || annotation.content.length <= 150 ? (
              annotation.content
            ) : (
              <>
                {annotation.content.substring(0, 150)}...
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="text-blue-600 hover:text-blue-700 ml-1"
                >
                  Read more
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3" />
            <span>{formatDate(annotation.createdAt)}</span>
          </div>
          
          {annotation.replies && annotation.replies.length > 0 && (
            <div className="flex items-center space-x-1">
              <Reply className="h-3 w-3" />
              <span>{annotation.replies.length} replies</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function EnhancedAnnotations() {
  const { state } = useDocumentContext()
  const actions = useDocumentActions()
  const [showNewForm, setShowNewForm] = useState(false)
  const [filterType, setFilterType] = useState<DocumentAnnotation['type'] | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'page'>('date')

  const handleAddAnnotation = async (annotation: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>) => {
    await actions.addAnnotation(annotation as any)
  }

  const handleEditAnnotation = (id: string) => {
    // Implementation for editing
    console.log('Edit annotation:', id)
  }

  const handleDeleteAnnotation = async (id: string) => {
    await actions.deleteAnnotation(id)
  }

  const handleReplyToAnnotation = (id: string) => {
    // Implementation for replies
    console.log('Reply to annotation:', id)
  }

  const handleShareAnnotation = (id: string) => {
    // Implementation for sharing
    console.log('Share annotation:', id)
  }

  const handleNavigateToPage = (page: number) => {
    actions.goToPage(page)
  }

  // Filter and sort annotations
  const filteredAnnotations = state.annotations
    .filter(annotation => {
      if (filterType !== 'all' && annotation.type !== filterType) return false
      if (searchQuery && !annotation.content.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        return a.sectionReference.page - b.sectionReference.page
      }
    })

  if (state.annotations.length === 0 && !showNewForm) {
    return (
      <TabContentWrapper>
        <TabEmptyState
          icon={MessageSquare}
          title="No Annotations Yet"
          description="Start adding notes, comments, questions, or voice annotations to this document."
          action={
            <Button onClick={() => setShowNewForm(true)} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add First Note
            </Button>
          }
        />
      </TabContentWrapper>
    )
  }

  return (
    <TabContentWrapper>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Annotations</h3>
            {state.annotations.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {state.annotations.length}
              </Badge>
            )}
          </div>
          
          <Button 
            size="sm" 
            onClick={() => setShowNewForm(!showNewForm)}
            disabled={state.isGeneratingAnnotation}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>

        {/* Search and filters */}
        {state.annotations.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <Input
                placeholder="Search annotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="note">Notes</option>
                <option value="comment">Comments</option>
                <option value="question">Questions</option>
                <option value="voice">Voice Notes</option>
              </select>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="date">Sort by Date</option>
                <option value="page">Sort by Page</option>
              </select>
              
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                <Filter className="h-3 w-3 mr-1" />
                Page {state.currentPage}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {/* New annotation form */}
            {showNewForm && (
              <NewAnnotationForm
                onSubmit={handleAddAnnotation}
                onCancel={() => setShowNewForm(false)}
                currentPage={state.currentPage}
              />
            )}

            {/* Annotations list */}
            {filteredAnnotations.map((annotation) => (
              <AnnotationCard
                key={annotation.id}
                annotation={annotation}
                onEdit={handleEditAnnotation}
                onDelete={handleDeleteAnnotation}
                onReply={handleReplyToAnnotation}
                onShare={handleShareAnnotation}
                onNavigate={handleNavigateToPage}
                currentPage={state.currentPage}
              />
            ))}

            {/* Empty state for filtered results */}
            {state.annotations.length > 0 && filteredAnnotations.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">
                  No annotations match your current filters.
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setFilterType('all')
                    setSearchQuery('')
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      {state.annotations.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 text-center">
            {filteredAnnotations.length} of {state.annotations.length} annotations • Page {state.currentPage} of {state.totalPages}
          </div>
        </div>
      )}
    </TabContentWrapper>
  )
}