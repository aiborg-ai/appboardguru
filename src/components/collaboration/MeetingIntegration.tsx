'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useMeetingIntegration } from '@/hooks/useMeetingIntegration'
import { VoiceNoteRecorder, VoiceNoteMessage } from './VoiceNoteMessage'
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Users,
  MessageSquare,
  FileText,
  Share2,
  Calendar,
  Clock,
  Settings,
  MoreHorizontal,
  Camera,
  CameraOff,
  Monitor,
  Square,
  Play,
  Pause,
  Volume2,
  VolumeX,
  UserPlus,
  UserMinus,
  Hand,
  Bookmark,
  Download,
  Upload,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/cards/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/atoms/display/avatar'
import { Badge } from '@/components/atoms/display/badge'
import { Input } from '@/components/atoms/form/input'
import { Textarea } from '@/components/atoms/form/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/atoms/display/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { format, formatDistanceToNow } from 'date-fns'

interface MeetingIntegrationProps {
  meetingId?: string
  boardChatId?: string
  isHost?: boolean
  className?: string
}

interface MeetingParticipant {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'host' | 'co-host' | 'member' | 'guest'
  status: 'joined' | 'waiting' | 'left' | 'kicked'
  joinedAt: Date
  permissions: {
    canShare: boolean
    canRecord: boolean
    canManageParticipants: boolean
    canMute: boolean
  }
  mediaState: {
    videoEnabled: boolean
    audioEnabled: boolean
    screenSharing: boolean
    handRaised: boolean
  }
}

interface MeetingNote {
  id: string
  type: 'text' | 'voice' | 'action_item' | 'decision' | 'bookmark'
  content: string
  transcript?: string
  audioUrl?: string
  duration?: number
  createdBy: string
  createdByName: string
  timestamp: Date
  tags?: string[]
  attachments?: {
    id: string
    name: string
    url: string
    type: string
  }[]
}

interface MeetingRecording {
  id: string
  name: string
  startTime: Date
  endTime?: Date
  duration: number
  size: number
  url?: string
  transcript?: string
  participants: string[]
  status: 'recording' | 'processing' | 'ready' | 'failed'
}

export function MeetingIntegration({
  meetingId = 'meeting-1',
  boardChatId = 'chat-1',
  isHost = false,
  className = ''
}: MeetingIntegrationProps) {
  const {
    meeting,
    participants,
    notes,
    recordings,
    isInMeeting,
    mediaState,
    joinMeeting,
    leaveMeeting,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    raiseHand,
    lowerHand,
    addNote,
    startRecording,
    stopRecording,
    inviteParticipant,
    removeParticipant,
    muteParticipant,
    unmuteParticipant
  } = useMeetingIntegration(meetingId)

  const [activeTab, setActiveTab] = useState<'chat' | 'notes' | 'participants' | 'recordings'>('chat')
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState<'text' | 'voice' | 'action_item' | 'decision' | 'bookmark'>('text')
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  // Mock data for demonstration
  const mockParticipants: MeetingParticipant[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@company.com',
      avatar: '/avatars/john.jpg',
      role: 'host',
      status: 'joined',
      joinedAt: new Date(Date.now() - 15 * 60 * 1000),
      permissions: {
        canShare: true,
        canRecord: true,
        canManageParticipants: true,
        canMute: true
      },
      mediaState: {
        videoEnabled: true,
        audioEnabled: true,
        screenSharing: false,
        handRaised: false
      }
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah@company.com',
      avatar: '/avatars/sarah.jpg',
      role: 'member',
      status: 'joined',
      joinedAt: new Date(Date.now() - 10 * 60 * 1000),
      permissions: {
        canShare: true,
        canRecord: false,
        canManageParticipants: false,
        canMute: false
      },
      mediaState: {
        videoEnabled: true,
        audioEnabled: true,
        screenSharing: false,
        handRaised: true
      }
    },
    {
      id: '3',
      name: 'Michael Chen',
      email: 'michael@company.com',
      role: 'member',
      status: 'joined',
      joinedAt: new Date(Date.now() - 5 * 60 * 1000),
      permissions: {
        canShare: false,
        canRecord: false,
        canManageParticipants: false,
        canMute: false
      },
      mediaState: {
        videoEnabled: false,
        audioEnabled: true,
        screenSharing: false,
        handRaised: false
      }
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily@company.com',
      role: 'guest',
      status: 'waiting',
      joinedAt: new Date(),
      permissions: {
        canShare: false,
        canRecord: false,
        canManageParticipants: false,
        canMute: false
      },
      mediaState: {
        videoEnabled: false,
        audioEnabled: false,
        screenSharing: false,
        handRaised: false
      }
    }
  ]

  const mockNotes: MeetingNote[] = [
    {
      id: '1',
      type: 'decision',
      content: 'Approved Q4 budget allocation with 15% increase for technology investments',
      createdBy: '1',
      createdByName: 'John Smith',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      tags: ['budget', 'q4', 'technology']
    },
    {
      id: '2',
      type: 'action_item',
      content: 'Sarah to prepare risk assessment report by next Friday',
      createdBy: '2',
      createdByName: 'Sarah Johnson',
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
      tags: ['action-item', 'risk-assessment']
    },
    {
      id: '3',
      type: 'voice',
      content: 'Discussion about market expansion strategy',
      transcript: 'We need to consider the European market carefully, especially given the regulatory challenges...',
      audioUrl: '/audio/meeting-note-3.webm',
      duration: 45,
      createdBy: '3',
      createdByName: 'Michael Chen',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      tags: ['strategy', 'europe']
    }
  ]

  const mockRecordings: MeetingRecording[] = [
    {
      id: '1',
      name: 'Board Meeting - Q4 Planning',
      startTime: new Date(Date.now() - 60 * 60 * 1000),
      endTime: new Date(Date.now() - 15 * 60 * 1000),
      duration: 45 * 60,
      size: 128 * 1024 * 1024,
      url: '/recordings/meeting-1.mp4',
      participants: ['1', '2', '3'],
      status: 'ready'
    },
    {
      id: '2',
      name: 'Current Session',
      startTime: new Date(Date.now() - 15 * 60 * 1000),
      duration: 15 * 60,
      size: 45 * 1024 * 1024,
      participants: ['1', '2', '3'],
      status: 'recording'
    }
  ]

  const handleJoinMeeting = useCallback(() => {
    joinMeeting()
  }, [joinMeeting])

  const handleLeaveMeeting = useCallback(() => {
    leaveMeeting()
  }, [leaveMeeting])

  const handleAddNote = useCallback(() => {
    if (!newNote.trim()) return

    const note: Omit<MeetingNote, 'id' | 'timestamp'> = {
      type: noteType,
      content: newNote.trim(),
      createdBy: 'current-user',
      createdByName: 'Current User',
      tags: []
    }

    addNote(note)
    setNewNote('')
  }, [newNote, noteType, addNote])

  const handleVoiceNoteSend = useCallback((audioBlob: Blob, duration: number, transcript?: string) => {
    const audioUrl = URL.createObjectURL(audioBlob)
    
    const note: Omit<MeetingNote, 'id' | 'timestamp'> = {
      type: 'voice',
      content: transcript || 'Voice note',
      transcript,
      audioUrl,
      duration,
      createdBy: 'current-user',
      createdByName: 'Current User',
      tags: []
    }

    addNote(note)
    setShowVoiceRecorder(false)
  }, [addNote])

  const handleInviteParticipant = useCallback(() => {
    if (inviteEmail.trim()) {
      inviteParticipant(inviteEmail.trim())
      setInviteEmail('')
    }
  }, [inviteEmail, inviteParticipant])

  const getNoteTypeIcon = (type: string) => {
    switch (type) {
      case 'action_item': return <Calendar className="h-4 w-4 text-orange-600" />
      case 'decision': return <Bookmark className="h-4 w-4 text-green-600" />
      case 'voice': return <Mic className="h-4 w-4 text-blue-600" />
      case 'bookmark': return <Bookmark className="h-4 w-4 text-purple-600" />
      default: return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'action_item': return 'border-l-orange-400 bg-orange-50'
      case 'decision': return 'border-l-green-400 bg-green-50'
      case 'voice': return 'border-l-blue-400 bg-blue-50'
      case 'bookmark': return 'border-l-purple-400 bg-purple-50'
      default: return 'border-l-gray-400 bg-gray-50'
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Main Meeting Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Meeting Controls */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Video className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Board Meeting</h2>
                {isInMeeting && (
                  <Badge variant="default" className="bg-green-600">
                    Live
                  </Badge>
                )}
              </div>
              
              {isInMeeting && (
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(15 * 60)}</span> {/* Mock duration */}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {!isInMeeting ? (
                <Button onClick={handleJoinMeeting}>
                  <Video className="h-4 w-4 mr-2" />
                  Join Meeting
                </Button>
              ) : (
                <>
                  <Button
                    variant={mediaState.audioEnabled ? 'default' : 'destructive'}
                    size="sm"
                    onClick={toggleAudio}
                  >
                    {mediaState.audioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant={mediaState.videoEnabled ? 'default' : 'destructive'}
                    size="sm"
                    onClick={toggleVideo}
                  >
                    {mediaState.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={mediaState.screenSharing ? stopScreenShare : startScreenShare}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={raiseHand}>
                    <Hand className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleLeaveMeeting}>
                    <PhoneOff className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 bg-gray-900 p-4">
          <div className="grid grid-cols-2 gap-4 h-full">
            {mockParticipants
              .filter(p => p.status === 'joined')
              .slice(0, 4)
              .map((participant) => (
                <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
                  {participant.mediaState.videoEnabled ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
                      <div className="text-center">
                        <Avatar className="h-16 w-16 mx-auto mb-2">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback>
                            {participant.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-white text-sm font-medium">{participant.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <Avatar className="h-20 w-20 mx-auto mb-3">
                          <AvatarImage src={participant.avatar} />
                          <AvatarFallback className="text-xl">
                            {participant.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-white text-lg font-medium">{participant.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Participant Status Indicators */}
                  <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                    {!participant.mediaState.audioEnabled && (
                      <div className="p-1 bg-red-600 rounded-full">
                        <MicOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {!participant.mediaState.videoEnabled && (
                      <div className="p-1 bg-red-600 rounded-full">
                        <VideoOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {participant.mediaState.screenSharing && (
                      <div className="p-1 bg-green-600 rounded-full">
                        <Monitor className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {participant.mediaState.handRaised && (
                      <div className="p-1 bg-yellow-600 rounded-full">
                        <Hand className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Host Controls */}
                  {isHost && participant.id !== '1' && (
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 bg-black/50 text-white hover:bg-black/70"
                        onClick={() => muteParticipant(participant.id)}
                      >
                        <MicOff className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 bg-black/50 text-white hover:bg-black/70"
                        onClick={() => removeParticipant(participant.id)}
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab as any} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 m-4 mb-2">
            <TabsTrigger value="chat" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="participants" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              People
              <Badge variant="secondary" className="ml-1 h-4 w-4 text-xs">
                {mockParticipants.filter(p => p.status === 'joined').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recordings" className="text-xs">
              <Video className="h-3 w-3 mr-1" />
              Rec
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-4 mt-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Meeting Chat</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3 min-h-0">
                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Chat messages will appear here</p>
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="border-t pt-3">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Type a message..."
                      className="flex-1 text-sm"
                    />
                    <Button size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="flex-1 flex flex-col m-4 mt-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Meeting Notes</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3 min-h-0">
                {/* Add Note Controls */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="text">Note</option>
                      <option value="action_item">Action Item</option>
                      <option value="decision">Decision</option>
                      <option value="bookmark">Bookmark</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {showVoiceRecorder ? (
                    <VoiceNoteRecorder
                      onSend={handleVoiceNoteSend}
                      onCancel={() => setShowVoiceRecorder(false)}
                      className="w-full"
                    />
                  ) : (
                    <Textarea
                      placeholder="Add a meeting note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                  )}
                </div>

                <Separator />

                {/* Notes List */}
                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {mockNotes.map((note) => (
                      <div key={note.id} className={`p-3 rounded-lg border-l-4 ${getNoteTypeColor(note.type)}`}>
                        <div className="flex items-start space-x-2 mb-2">
                          {getNoteTypeIcon(note.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-gray-700">{note.createdByName}</p>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(note.timestamp)} ago
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {note.type === 'voice' ? (
                          <VoiceNoteMessage
                            messageId={note.id}
                            audioUrl={note.audioUrl}
                            duration={note.duration}
                            transcript={note.transcript}
                            sender={{
                              id: note.createdBy,
                              name: note.createdByName
                            }}
                            createdAt={note.timestamp}
                            className="mt-2"
                          />
                        ) : (
                          <p className="text-sm text-gray-800">{note.content}</p>
                        )}
                        
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="flex-1 flex flex-col m-4 mt-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Participants</CardTitle>
                  {isHost && (
                    <Button variant="outline" size="sm">
                      <UserPlus className="h-3 w-3 mr-1" />
                      Invite
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-3 min-h-0">
                {isHost && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Enter email to invite..."
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={handleInviteParticipant}>
                        <UserPlus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Separator />
                  </>
                )}

                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {mockParticipants.map((participant) => (
                      <div key={participant.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={participant.avatar} />
                            <AvatarFallback className="text-xs">
                              {participant.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            participant.status === 'joined' ? 'bg-green-500' :
                            participant.status === 'waiting' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {participant.name}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {participant.role}
                            </Badge>
                            {participant.mediaState.handRaised && (
                              <Hand className="h-3 w-3 text-yellow-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{participant.email}</p>
                        </div>

                        <div className="flex items-center space-x-1">
                          {!participant.mediaState.audioEnabled && (
                            <MicOff className="h-3 w-3 text-red-600" />
                          )}
                          {!participant.mediaState.videoEnabled && (
                            <VideoOff className="h-3 w-3 text-red-600" />
                          )}
                          {participant.mediaState.screenSharing && (
                            <Monitor className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings" className="flex-1 flex flex-col m-4 mt-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recordings</CardTitle>
                  {isInMeeting && isHost && (
                    <Button
                      size="sm"
                      variant={mockRecordings.some(r => r.status === 'recording') ? 'destructive' : 'default'}
                      onClick={mockRecordings.some(r => r.status === 'recording') ? stopRecording : startRecording}
                    >
                      {mockRecordings.some(r => r.status === 'recording') ? (
                        <Square className="h-3 w-3 mr-1" />
                      ) : (
                        <Video className="h-3 w-3 mr-1" />
                      )}
                      {mockRecordings.some(r => r.status === 'recording') ? 'Stop' : 'Record'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockRecordings.map((recording) => (
                  <div key={recording.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{recording.name}</h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <span>{format(recording.startTime, 'MMM d, HH:mm')}</span>
                          <span>•</span>
                          <span>{formatDuration(recording.duration)}</span>
                          <span>•</span>
                          <span>{(recording.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                      <Badge
                        variant={recording.status === 'recording' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {recording.status}
                      </Badge>
                    </div>

                    {recording.status === 'ready' && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          Play
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Share
                        </Button>
                      </div>
                    )}

                    {recording.status === 'recording' && (
                      <div className="flex items-center space-x-2 text-xs text-red-600">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span>Recording in progress...</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}