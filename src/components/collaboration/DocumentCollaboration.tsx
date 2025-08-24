'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration'
import {
  FileText,
  Users,
  Edit,
  Comment,
  Share2,
  Eye,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Lock,
  Unlock,
  Download,
  Upload,
  History,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Plus
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/display/avatar'
import { Badge } from '@/components/atoms/display/badge'
import { Input } from '@/components/atoms/form/input'
import { Textarea } from '@/components/atoms/form/textarea'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Separator } from '@/components/atoms/display/separator'
import { formatDistanceToNow } from 'date-fns'

interface DocumentCollaborationProps {
  documentId: string
  documentName: string
  documentType: 'pdf' | 'word' | 'excel' | 'powerpoint' | 'text'
  isOwner: boolean
  className?: string
}

interface CollaborationUser {
  id: string
  name: string
  avatar?: string
  status: 'viewing' | 'editing' | 'commenting' | 'offline'
  cursor?: { x: number; y: number; selection?: string }
  lastSeen: Date
  role: 'owner' | 'editor' | 'reviewer' | 'viewer'
}

interface DocumentComment {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  position: { page?: number; x?: number; y?: number; selection?: string }
  type: 'comment' | 'suggestion' | 'approval' | 'question'
  status: 'open' | 'resolved' | 'acknowledged'
  replies: DocumentComment[]
  createdAt: Date
  updatedAt?: Date
}

interface DocumentVersion {
  id: string
  version: string
  createdBy: string
  createdByName: string
  createdAt: Date
  changes: string[]
  size: number
  downloadUrl?: string
}

export function DocumentCollaboration({ 
  documentId, 
  documentName, 
  documentType, 
  isOwner,
  className = '' 
}: DocumentCollaborationProps) {
  const {
    activeUsers,
    comments,
    versions,
    isConnected,
    addComment,
    resolveComment,
    startEditing,
    stopEditing,
    shareDocument,
    lockDocument,
    unlockDocument
  } = useRealTimeCollaboration(documentId)

  const [selectedTool, setSelectedTool] = useState<'view' | 'edit' | 'comment' | 'review'>('view')
  const [showComments, setShowComments] = useState(true)
  const [showUsers, setShowUsers] = useState(true)
  const [showVersions, setShowVersions] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentType, setCommentType] = useState<'comment' | 'suggestion' | 'approval' | 'question'>('comment')
  const [selectedComment, setSelectedComment] = useState<string | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [isVideoCall, setIsVideoCall] = useState(false)
  const [isAudioCall, setIsAudioCall] = useState(false)

  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // Mock data for demonstration
  const mockUsers: CollaborationUser[] = [
    {
      id: '1',
      name: 'John Smith',
      avatar: '/avatars/john.jpg',
      status: 'editing',
      cursor: { x: 250, y: 300, selection: 'Q3 Revenue Analysis' },
      lastSeen: new Date(),
      role: 'owner'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      avatar: '/avatars/sarah.jpg',
      status: 'commenting',
      cursor: { x: 400, y: 150 },
      lastSeen: new Date(Date.now() - 2 * 60 * 1000),
      role: 'editor'
    },
    {
      id: '3',
      name: 'Michael Chen',
      avatar: '/avatars/michael.jpg',
      status: 'viewing',
      lastSeen: new Date(Date.now() - 5 * 60 * 1000),
      role: 'reviewer'
    },
    {
      id: '4',
      name: 'Emily Davis',
      status: 'offline',
      lastSeen: new Date(Date.now() - 30 * 60 * 1000),
      role: 'viewer'
    }
  ]

  const mockComments: DocumentComment[] = [
    {
      id: '1',
      userId: '2',
      userName: 'Sarah Johnson',
      userAvatar: '/avatars/sarah.jpg',
      content: 'The revenue projections for Q4 seem optimistic. Do we have supporting data for the 15% growth assumption?',
      position: { page: 1, x: 300, y: 400, selection: 'Q4 Revenue Projections' },
      type: 'question',
      status: 'open',
      replies: [
        {
          id: '1-1',
          userId: '1',
          userName: 'John Smith',
          content: 'Good point. I\'ll include the market analysis data that supports this projection.',
          position: {},
          type: 'comment',
          status: 'open',
          replies: [],
          createdAt: new Date(Date.now() - 10 * 60 * 1000)
        }
      ],
      createdAt: new Date(Date.now() - 20 * 60 * 1000)
    },
    {
      id: '2',
      userId: '3',
      userName: 'Michael Chen',
      content: 'This section looks good to present to the board. I approve the financial summary.',
      position: { page: 2, x: 200, y: 500, selection: 'Financial Summary' },
      type: 'approval',
      status: 'acknowledged',
      replies: [],
      createdAt: new Date(Date.now() - 45 * 60 * 1000)
    }
  ]

  const mockVersions: DocumentVersion[] = [
    {
      id: 'v3',
      version: '3.0',
      createdBy: '1',
      createdByName: 'John Smith',
      createdAt: new Date(),
      changes: ['Updated revenue projections', 'Added risk analysis section', 'Fixed formatting issues'],
      size: 2.4 * 1024 * 1024
    },
    {
      id: 'v2',
      version: '2.1',
      createdBy: '2',
      createdByName: 'Sarah Johnson',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      changes: ['Reviewed financial data', 'Added comments and suggestions'],
      size: 2.3 * 1024 * 1024
    },
    {
      id: 'v1',
      version: '2.0',
      createdBy: '1',
      createdByName: 'John Smith',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      changes: ['Initial draft for board review'],
      size: 2.1 * 1024 * 1024
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'editing': return <Edit className="h-3 w-3 text-orange-600" />
      case 'commenting': return <MessageCircle className="h-3 w-3 text-blue-600" />
      case 'viewing': return <Eye className="h-3 w-3 text-green-600" />
      default: return <Clock className="h-3 w-3 text-gray-400" />
    }
  }

  const getCommentTypeIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Edit className="h-4 w-4 text-blue-600" />
      case 'approval': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'question': return <AlertCircle className="h-4 w-4 text-orange-600" />
      default: return <MessageCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getCommentTypeColor = (type: string) => {
    switch (type) {
      case 'suggestion': return 'border-l-blue-400 bg-blue-50'
      case 'approval': return 'border-l-green-400 bg-green-50'
      case 'question': return 'border-l-orange-400 bg-orange-50'
      default: return 'border-l-gray-400 bg-gray-50'
    }
  }

  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return

    const comment: Omit<DocumentComment, 'id'> = {
      userId: 'current-user',
      userName: 'Current User',
      content: newComment.trim(),
      position: { page: 1, x: 200, y: 200 },
      type: commentType,
      status: 'open',
      replies: [],
      createdAt: new Date()
    }

    addComment(comment)
    setNewComment('')
    setCommentType('comment')
  }, [newComment, commentType, addComment])

  const handleStartVoiceCall = useCallback(() => {
    setIsAudioCall(true)
    // In real implementation, this would initiate a voice call
  }, [])

  const handleStartVideoCall = useCallback(() => {
    setIsVideoCall(true)
    // In real implementation, this would initiate a video call
  }, [])

  const handleStartEditing = useCallback(() => {
    setSelectedTool('edit')
    startEditing()
  }, [startEditing])

  const handleStopEditing = useCallback(() => {
    setSelectedTool('view')
    stopEditing()
  }, [stopEditing])

  return (
    <div className={`flex h-full bg-gray-50 ${className}`}>
      {/* Main Document Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">{documentName}</h1>
                <Badge variant="outline" className="ml-2">
                  {documentType.toUpperCase()}
                </Badge>
                {!isConnected && (
                  <Badge variant="destructive">
                    Offline
                  </Badge>
                )}
              </div>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                {isConnected && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-gray-500">Live</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Collaboration Tools */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={selectedTool === 'view' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTool('view')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedTool === 'edit' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={selectedTool === 'edit' ? handleStopEditing : handleStartEditing}
                  disabled={!isOwner && selectedTool !== 'edit'}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedTool === 'comment' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTool('comment')}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant={selectedTool === 'review' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTool('review')}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Communication Tools */}
              <Button
                variant={isAudioCall ? 'default' : 'outline'}
                size="sm"
                onClick={isAudioCall ? () => setIsAudioCall(false) : handleStartVoiceCall}
              >
                {isAudioCall ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              </Button>
              <Button
                variant={isVideoCall ? 'default' : 'outline'}
                size="sm"
                onClick={isVideoCall ? () => setIsVideoCall(false) : handleStartVideoCall}
              >
                {isVideoCall ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>

              <Separator orientation="vertical" className="h-6" />

              {/* Document Actions */}
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Active Users Bar */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Active now:</span>
              <div className="flex items-center -space-x-2">
                {mockUsers.filter(u => u.status !== 'offline').map((user) => (
                  <div key={user.id} className="relative">
                    <Avatar className="h-6 w-6 border-2 border-white">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {getStatusIcon(user.status)}
                    </div>
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {mockUsers.filter(u => u.status !== 'offline').length} online
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUsers(!showUsers)}
              >
                <Users className="h-4 w-4 mr-1" />
                Users
                {showUsers ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Comments
                <Badge variant="secondary" className="ml-1 h-5 w-5 text-xs">
                  {mockComments.length}
                </Badge>
                {showComments ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowVersions(!showVersions)}
              >
                <History className="h-4 w-4 mr-1" />
                Versions
                {showVersions ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Document Viewer Area */}
        <div className="flex-1 bg-gray-100 p-4">
          <div className="bg-white rounded-lg shadow-sm h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Document Viewer</h3>
              <p className="text-gray-600 mb-4">
                {selectedTool === 'edit' ? 'Editing mode active' : 'Document collaboration interface'}
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Real-time collaborative editing</p>
                <p>• Live cursor tracking and user presence</p>
                <p>• Comment threads and annotations</p>
                <p>• Version history and change tracking</p>
                <p>• Integrated voice and video calls</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {/* Users Panel */}
        {showUsers && (
          <Card className="m-4 mb-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Collaborators ({mockUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {getStatusIcon(user.status)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {user.status === 'offline' 
                        ? `Last seen ${formatDistanceToNow(user.lastSeen)} ago`
                        : user.status === 'editing' && user.cursor?.selection
                          ? `Editing "${user.cursor.selection}"`
                          : user.status.charAt(0).toUpperCase() + user.status.slice(1)
                      }
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Comments Panel */}
        {showComments && (
          <Card className="mx-4 mb-2 flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comments & Reviews
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Add Comment */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={commentType}
                    onChange={(e) => setCommentType(e.target.value as any)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="comment">Comment</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="question">Question</option>
                    <option value="approval">Approval</option>
                  </select>
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <Textarea
                  ref={commentInputRef}
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>

              <Separator />

              {/* Comments List */}
              <ScrollArea className="flex-1 -mx-4 px-4">
                <div className="space-y-3">
                  {mockComments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={`p-3 rounded-lg border-l-4 ${getCommentTypeColor(comment.type)}`}
                    >
                      <div className="flex items-start space-x-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={comment.userAvatar} />
                          <AvatarFallback className="text-xs">
                            {comment.userName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {comment.userName}
                            </p>
                            {getCommentTypeIcon(comment.type)}
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(comment.createdAt)} ago
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {comment.position.selection && `"${comment.position.selection}"`}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-800 mb-2">{comment.content}</p>
                      
                      {comment.replies.length > 0 && (
                        <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="text-xs font-medium text-gray-700">
                                  {reply.userName}
                                </p>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(reply.createdAt)} ago
                                </span>
                              </div>
                              <p className="text-xs text-gray-600">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            Reply
                          </Button>
                          {comment.status === 'open' && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                              Resolve
                            </Button>
                          )}
                        </div>
                        <Badge 
                          variant={comment.status === 'open' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {comment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Versions Panel */}
        {showVersions && (
          <Card className="mx-4 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockVersions.map((version, index) => (
                <div key={version.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        v{version.version}
                        {index === 0 && <Badge variant="default" className="ml-2 text-xs">Current</Badge>}
                      </p>
                      <p className="text-xs text-gray-500">
                        by {version.createdByName} • {formatDistanceToNow(version.createdAt)} ago
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    {version.changes.map((change, idx) => (
                      <p key={idx}>• {change}</p>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {(version.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  {index < mockVersions.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}