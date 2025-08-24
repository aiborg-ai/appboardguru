'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/features/shared/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  MessageSquare,
  Vote,
  Share2,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Hand,
  Monitor,
  PauseCircle,
  PlayCircle,
  UserPlus,
  Activity
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrganizationId, UserId, MeetingId } from '@/types/branded'

interface LiveBoardSessionProps {
  sessionId: string
  organizationId: OrganizationId
  userId: UserId
  meetingId?: MeetingId
  isHost?: boolean
  className?: string
}

interface SessionParticipant {
  id: UserId
  name: string
  email: string
  avatar?: string
  role: 'host' | 'presenter' | 'participant' | 'observer'
  status: 'online' | 'away' | 'disconnected'
  joinedAt: string
  permissions: {
    canSpeak: boolean
    canVote: boolean
    canShare: boolean
    canModerate: boolean
  }
  mediaStatus: {
    video: boolean
    audio: boolean
    screenShare: boolean
  }
  raisedHand?: boolean
  lastActivity: string
}

interface LiveVote {
  id: string
  title: string
  description?: string
  options: Array<{
    id: string
    text: string
    votes: number
    voters: UserId[]
  }>
  status: 'active' | 'completed' | 'cancelled'
  createdBy: UserId
  createdAt: string
  endsAt?: string
  anonymous: boolean
  requiresUnanimity: boolean
  allowAbstain: boolean
  type: 'simple' | 'multiple_choice' | 'ranking' | 'approval'
}

interface ChatMessage {
  id: string
  userId: UserId
  userName: string
  userAvatar?: string
  content: string
  type: 'message' | 'announcement' | 'system' | 'poll' | 'reaction'
  timestamp: string
  replyTo?: string
  mentions?: UserId[]
  attachments?: Array<{
    id: string
    name: string
    type: string
    url: string
  }>
  reactions?: Array<{
    emoji: string
    users: UserId[]
    count: number
  }>
}

interface ScreenShareSession {
  id: string
  presenterId: UserId
  presenterName: string
  title?: string
  startedAt: string
  status: 'active' | 'paused' | 'ended'
  viewers: UserId[]
  hasAudio: boolean
  quality: 'high' | 'medium' | 'low'
}

export function LiveBoardSession({
  sessionId,
  organizationId,
  userId,
  meetingId,
  isHost = false,
  className = ''
}: LiveBoardSessionProps) {
  const queryClient = useQueryClient()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState('participants')
  const [chatMessage, setChatMessage] = useState('')
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [raisedHand, setRaisedHand] = useState(false)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [activeVotes, setActiveVotes] = useState<LiveVote[]>([])
  const [screenShare, setScreenShare] = useState<ScreenShareSession | null>(null)
  const [sessionStats, setSessionStats] = useState({
    duration: '00:00:00',
    messageCount: 0,
    voteCount: 0,
    participantCount: 0,
    engagementScore: 0
  })

  // WebSocket connection
  const {
    socket,
    isConnected,
    sendMessage,
    onMessage,
    joinRoom,
    leaveRoom
  } = useWebSocket()

  // Fetch session data
  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch session')
      return response.json()
    },
    refetchInterval: 30000
  })

  // Join/leave session mutations
  const joinSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('Failed to join session')
      return response.json()
    }
  })

  const leaveSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!response.ok) throw new Error('Failed to leave session')
      return response.json()
    }
  })

  // Initialize session
  useEffect(() => {
    if (sessionId && isConnected) {
      joinRoom(`session_${sessionId}`)
      joinSessionMutation.mutate()

      // Set up WebSocket listeners
      const unsubscribeParticipant = onMessage('participant_joined', handleParticipantJoined)
      const unsubscribeParticipantLeft = onMessage('participant_left', handleParticipantLeft)
      const unsubscribeChat = onMessage('chat_message', handleChatMessage)
      const unsubscribeVote = onMessage('vote_created', handleVoteCreated)
      const unsubscribeVoteUpdate = onMessage('vote_updated', handleVoteUpdated)
      const unsubscribeScreenShare = onMessage('screen_share', handleScreenShare)
      const unsubscribeMediaUpdate = onMessage('media_status_update', handleMediaStatusUpdate)
      const unsubscribeHandRaise = onMessage('hand_raised', handleHandRaised)

      return () => {
        unsubscribeParticipant()
        unsubscribeParticipantLeft()
        unsubscribeChat()
        unsubscribeVote()
        unsubscribeVoteUpdate()
        unsubscribeScreenShare()
        unsubscribeMediaUpdate()
        unsubscribeHandRaise()
        leaveRoom(`session_${sessionId}`)
        leaveSessionMutation.mutate()
      }
    }
  }, [sessionId, isConnected])

  // WebSocket event handlers
  const handleParticipantJoined = useCallback((data: any) => {
    const participant: SessionParticipant = {
      id: data.userId,
      name: data.userName,
      email: data.userEmail,
      avatar: data.userAvatar,
      role: data.role || 'participant',
      status: 'online',
      joinedAt: new Date().toISOString(),
      permissions: data.permissions || {
        canSpeak: true,
        canVote: true,
        canShare: false,
        canModerate: false
      },
      mediaStatus: {
        video: false,
        audio: false,
        screenShare: false
      },
      lastActivity: new Date().toISOString()
    }

    setParticipants(prev => {
      const existing = prev.find(p => p.id === participant.id)
      if (existing) {
        return prev.map(p => p.id === participant.id ? { ...p, ...participant, status: 'online' } : p)
      }
      return [...prev, participant]
    })

    // Add system message
    const systemMessage: ChatMessage = {
      id: `system_${Date.now()}`,
      userId: '' as UserId,
      userName: 'System',
      content: `${participant.name} joined the session`,
      type: 'system',
      timestamp: new Date().toISOString()
    }
    setChatMessages(prev => [...prev, systemMessage])
  }, [])

  const handleParticipantLeft = useCallback((data: any) => {
    setParticipants(prev => 
      prev.map(p => 
        p.id === data.userId 
          ? { ...p, status: 'disconnected' as const }
          : p
      )
    )

    const participant = participants.find(p => p.id === data.userId)
    if (participant) {
      const systemMessage: ChatMessage = {
        id: `system_${Date.now()}`,
        userId: '' as UserId,
        userName: 'System',
        content: `${participant.name} left the session`,
        type: 'system',
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => [...prev, systemMessage])
    }
  }, [participants])

  const handleChatMessage = useCallback((data: any) => {
    const message: ChatMessage = {
      id: data.messageId,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      content: data.content,
      type: data.type || 'message',
      timestamp: data.timestamp,
      replyTo: data.replyTo,
      mentions: data.mentions,
      attachments: data.attachments,
      reactions: data.reactions || []
    }

    setChatMessages(prev => [...prev, message])
    setSessionStats(prev => ({ ...prev, messageCount: prev.messageCount + 1 }))
  }, [])

  const handleVoteCreated = useCallback((data: any) => {
    const vote: LiveVote = {
      id: data.voteId,
      title: data.title,
      description: data.description,
      options: data.options.map((opt: any) => ({
        id: opt.id,
        text: opt.text,
        votes: 0,
        voters: []
      })),
      status: 'active',
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      endsAt: data.endsAt,
      anonymous: data.anonymous || false,
      requiresUnanimity: data.requiresUnanimity || false,
      allowAbstain: data.allowAbstain || false,
      type: data.type || 'simple'
    }

    setActiveVotes(prev => [...prev, vote])
    setSessionStats(prev => ({ ...prev, voteCount: prev.voteCount + 1 }))
  }, [])

  const handleVoteUpdated = useCallback((data: any) => {
    setActiveVotes(prev =>
      prev.map(vote =>
        vote.id === data.voteId
          ? {
              ...vote,
              options: data.options || vote.options,
              status: data.status || vote.status
            }
          : vote
      )
    )
  }, [])

  const handleScreenShare = useCallback((data: any) => {
    if (data.action === 'start') {
      const session: ScreenShareSession = {
        id: data.sessionId,
        presenterId: data.presenterId,
        presenterName: data.presenterName,
        title: data.title,
        startedAt: new Date().toISOString(),
        status: 'active',
        viewers: data.viewers || [],
        hasAudio: data.hasAudio || false,
        quality: data.quality || 'medium'
      }
      setScreenShare(session)
    } else if (data.action === 'end') {
      setScreenShare(null)
    } else if (data.action === 'pause') {
      setScreenShare(prev => prev ? { ...prev, status: 'paused' } : null)
    }
  }, [])

  const handleMediaStatusUpdate = useCallback((data: any) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === data.userId
          ? {
              ...p,
              mediaStatus: {
                ...p.mediaStatus,
                video: data.video !== undefined ? data.video : p.mediaStatus.video,
                audio: data.audio !== undefined ? data.audio : p.mediaStatus.audio,
                screenShare: data.screenShare !== undefined ? data.screenShare : p.mediaStatus.screenShare
              }
            }
          : p
      )
    )
  }, [])

  const handleHandRaised = useCallback((data: any) => {
    setParticipants(prev =>
      prev.map(p =>
        p.id === data.userId
          ? { ...p, raisedHand: data.raised, lastActivity: new Date().toISOString() }
          : p
      )
    )
  }, [])

  // Send chat message
  const sendChatMessage = useCallback(() => {
    if (!chatMessage.trim()) return

    const message = {
      messageId: `${userId}_${Date.now()}`,
      userId,
      userName: participants.find(p => p.id === userId)?.name || 'You',
      content: chatMessage.trim(),
      type: 'message',
      timestamp: new Date().toISOString()
    }

    sendMessage('chat_message', message, `session_${sessionId}`)
    setChatMessage('')
  }, [chatMessage, userId, participants, sendMessage, sessionId])

  // Toggle media
  const toggleVideo = useCallback(() => {
    const newStatus = !isVideoEnabled
    setIsVideoEnabled(newStatus)
    sendMessage('media_status_update', { video: newStatus }, `session_${sessionId}`)
  }, [isVideoEnabled, sendMessage, sessionId])

  const toggleAudio = useCallback(() => {
    const newStatus = !isAudioEnabled
    setIsAudioEnabled(newStatus)
    sendMessage('media_status_update', { audio: newStatus }, `session_${sessionId}`)
  }, [isAudioEnabled, sendMessage, sessionId])

  // Toggle hand raise
  const toggleHandRaise = useCallback(() => {
    const newStatus = !raisedHand
    setRaisedHand(newStatus)
    sendMessage('hand_raised', { userId, raised: newStatus }, `session_${sessionId}`)
  }, [raisedHand, userId, sendMessage, sessionId])

  // Cast vote
  const castVote = useCallback(async (voteId: string, optionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/votes/${voteId}/cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, optionId })
      })
      
      if (!response.ok) throw new Error('Failed to cast vote')
      
      const result = await response.json()
      sendMessage('vote_cast', { voteId, optionId, userId }, `session_${sessionId}`)
    } catch (error) {
      console.error('Vote casting error:', error)
    }
  }, [sessionId, userId, sendMessage])

  // Start screen share
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      const session = {
        sessionId: `share_${Date.now()}`,
        presenterId: userId,
        presenterName: participants.find(p => p.id === userId)?.name || 'You',
        title: 'Screen Share',
        hasAudio: stream.getAudioTracks().length > 0,
        quality: 'high'
      }

      sendMessage('screen_share', { action: 'start', ...session }, `session_${sessionId}`)
      
      // Handle stream end
      stream.getVideoTracks()[0].onended = () => {
        sendMessage('screen_share', { action: 'end', sessionId: session.sessionId }, `session_${sessionId}`)
      }
    } catch (error) {
      console.error('Screen share error:', error)
    }
  }, [userId, participants, sendMessage, sessionId])

  // Get sorted participants
  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.raisedHand && !b.raisedHand) return -1
      if (!a.raisedHand && b.raisedHand) return 1
      if (a.role === 'host' && b.role !== 'host') return -1
      if (a.role !== 'host' && b.role === 'host') return 1
      if (a.status === 'online' && b.status !== 'online') return -1
      if (a.status !== 'online' && b.status === 'online') return 1
      return a.name.localeCompare(b.name)
    })
  }, [participants])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading session...</div>
  }

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
      {/* Main content area */}
      <div className="lg:col-span-2 space-y-6">
        {/* Session header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Board Session
                {!isConnected && (
                  <Badge variant="destructive">Disconnected</Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <Badge variant={sessionData?.status === 'active' ? 'default' : 'secondary'}>
                  {sessionData?.status || 'Unknown'}
                </Badge>
                <div className="text-sm text-gray-500">
                  Duration: {sessionStats.duration}
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {/* Media controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isVideoEnabled ? 'default' : 'outline'}
                  onClick={toggleVideo}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  size="sm"
                  variant={isAudioEnabled ? 'default' : 'outline'}
                  onClick={toggleAudio}
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Session controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={raisedHand ? 'default' : 'outline'}
                  onClick={toggleHandRaise}
                  className="gap-1"
                >
                  <Hand className="h-4 w-4" />
                  {raisedHand ? 'Lower Hand' : 'Raise Hand'}
                </Button>
                
                <Button size="sm" variant="outline" onClick={startScreenShare} className="gap-1">
                  <Monitor className="h-4 w-4" />
                  Share Screen
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Session stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {participants.filter(p => p.status === 'online').length}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {sessionStats.messageCount}
                </span>
                <span className="flex items-center gap-1">
                  <Vote className="h-4 w-4" />
                  {sessionStats.voteCount}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Screen share display */}
        {screenShare && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  {screenShare.presenterName} is sharing
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={screenShare.status === 'active' ? 'default' : 'secondary'}>
                    {screenShare.status}
                  </Badge>
                  {screenShare.hasAudio && (
                    <Badge variant="outline">Audio</Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Screen share content would display here</p>
                  <p className="text-sm text-gray-500">{screenShare.viewers.length} viewers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active votes */}
        {activeVotes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5" />
                Active Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeVotes.map(vote => (
                  <div key={vote.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{vote.title}</h4>
                        {vote.description && (
                          <p className="text-sm text-gray-600 mt-1">{vote.description}</p>
                        )}
                      </div>
                      <Badge variant={vote.status === 'active' ? 'default' : 'secondary'}>
                        {vote.status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {vote.options.map(option => (
                        <div key={option.id} className="flex items-center justify-between">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => castVote(vote.id, option.id)}
                            disabled={vote.status !== 'active'}
                            className="flex-1 justify-start mr-4"
                          >
                            {option.text}
                          </Button>
                          <div className="flex items-center gap-2 min-w-16">
                            <div className="text-sm text-gray-600">{option.votes}</div>
                            <Progress 
                              value={vote.options.reduce((sum, opt) => sum + opt.votes, 0) > 0 
                                ? (option.votes / vote.options.reduce((sum, opt) => sum + opt.votes, 0)) * 100
                                : 0
                              } 
                              className="w-16 h-2" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {vote.endsAt && (
                      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ends at {new Date(vote.endsAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participants" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants ({sortedParticipants.length})
                  </span>
                  <Button size="sm" variant="outline" className="gap-1">
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedParticipants.map(participant => (
                    <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.avatar} alt={participant.name} />
                            <AvatarFallback>
                              {participant.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {participant.raisedHand && (
                            <div className="absolute -top-1 -right-1">
                              <Hand className="h-3 w-3 text-yellow-500" />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{participant.name}</span>
                            {participant.role === 'host' && (
                              <Badge variant="default" className="text-xs">Host</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <div className={`h-2 w-2 rounded-full ${
                              participant.status === 'online' ? 'bg-green-500' :
                              participant.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-xs text-gray-500 capitalize">
                              {participant.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {participant.mediaStatus.video && (
                          <Video className="h-3 w-3 text-green-600" />
                        )}
                        {participant.mediaStatus.audio ? (
                          <Mic className="h-3 w-3 text-green-600" />
                        ) : (
                          <MicOff className="h-3 w-3 text-red-500" />
                        )}
                        {participant.mediaStatus.screenShare && (
                          <Monitor className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Chat messages */}
                <div className="h-64 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map(message => (
                    <div key={message.id} className={`flex gap-3 ${
                      message.type === 'system' ? 'justify-center' : ''
                    }`}>
                      {message.type === 'system' ? (
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {message.content}
                        </div>
                      ) : (
                        <>
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={message.userAvatar} alt={message.userName} />
                            <AvatarFallback className="text-xs">
                              {message.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{message.userName}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {message.reactions.map((reaction, idx) => (
                                  <span key={idx} className="text-xs bg-gray-100 px-1 rounded">
                                    {reaction.emoji} {reaction.count}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          sendChatMessage()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button onClick={sendChatMessage} disabled={!chatMessage.trim()}>
                      Send
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}