'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Meeting {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  status: 'scheduled' | 'active' | 'ended' | 'cancelled'
  hostId: string
  organizationId: string
  boardChatId?: string
  settings: {
    requiresPassword: boolean
    allowRecording: boolean
    allowScreenShare: boolean
    maxParticipants: number
    waitingRoomEnabled: boolean
    muteOnJoin: boolean
    videoOnJoin: boolean
  }
  metadata?: Record<string, any>
}

export interface MeetingParticipant {
  id: string
  meetingId: string
  userId: string
  name: string
  email: string
  avatar?: string
  role: 'host' | 'co-host' | 'member' | 'guest'
  status: 'invited' | 'joined' | 'waiting' | 'left' | 'kicked' | 'declined'
  joinedAt?: Date
  leftAt?: Date
  permissions: {
    canShare: boolean
    canRecord: boolean
    canManageParticipants: boolean
    canMute: boolean
    canChat: boolean
  }
  mediaState: {
    videoEnabled: boolean
    audioEnabled: boolean
    screenSharing: boolean
    handRaised: boolean
  }
  connection: {
    quality: 'excellent' | 'good' | 'fair' | 'poor'
    latency: number
    bandwidth: number
  }
}

export interface MeetingNote {
  id: string
  meetingId: string
  type: 'text' | 'voice' | 'action_item' | 'decision' | 'bookmark' | 'poll' | 'annotation'
  content: string
  transcript?: string
  audioUrl?: string
  duration?: number
  position?: { timestamp: number; page?: number; x?: number; y?: number }
  createdBy: string
  createdByName: string
  createdAt: Date
  updatedAt?: Date
  tags?: string[]
  priority?: 'low' | 'medium' | 'high' | 'critical'
  assignedTo?: string[]
  dueDate?: Date
  completed?: boolean
  attachments?: {
    id: string
    name: string
    url: string
    type: string
    size: number
  }[]
  reactions?: {
    emoji: string
    users: string[]
    count: number
  }[]
  replies?: MeetingNote[]
}

export interface MeetingRecording {
  id: string
  meetingId: string
  name: string
  startTime: Date
  endTime?: Date
  duration: number
  size: number
  format: 'mp4' | 'webm' | 'mp3'
  quality: 'low' | 'medium' | 'high' | 'hd'
  url?: string
  thumbnailUrl?: string
  transcript?: string
  chapters?: {
    id: string
    title: string
    startTime: number
    endTime: number
    description?: string
  }[]
  participants: string[]
  status: 'recording' | 'processing' | 'ready' | 'failed' | 'deleted'
  visibility: 'private' | 'organization' | 'public'
  downloadUrl?: string
  streamUrl?: string
  metadata?: Record<string, any>
}

export interface MeetingAnalytics {
  meetingId: string
  duration: number
  participantCount: number
  peakParticipants: number
  averageParticipants: number
  totalNotes: number
  totalDecisions: number
  totalActionItems: number
  engagementScore: number
  audioQualityScore: number
  videoQualityScore: number
  participantSatisfaction?: number
  keyMoments: {
    timestamp: number
    type: 'peak_engagement' | 'decision_point' | 'action_item' | 'question'
    description: string
    participants: string[]
  }[]
}

export interface MediaState {
  videoEnabled: boolean
  audioEnabled: boolean
  screenSharing: boolean
  handRaised: boolean
  speaking: boolean
  muted: boolean
}

export interface ConnectionState {
  isConnected: boolean
  quality: 'excellent' | 'good' | 'fair' | 'poor'
  latency: number
  bandwidth: number
  reconnecting: boolean
}

export function useMeetingIntegration(meetingId: string) {
  const queryClient = useQueryClient()
  const [isInMeeting, setIsInMeeting] = useState(false)
  const [mediaState, setMediaState] = useState<MediaState>({
    videoEnabled: false,
    audioEnabled: false,
    screenSharing: false,
    handRaised: false,
    speaking: false,
    muted: false
  })
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    quality: 'excellent',
    latency: 0,
    bandwidth: 0,
    reconnecting: false
  })

  const streamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch meeting details
  const {
    data: meeting,
    isLoading: meetingLoading,
    error: meetingError
  } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}`)
      if (!response.ok) throw new Error('Failed to fetch meeting')
      return response.json()
    },
    enabled: !!meetingId
  })

  // Fetch participants
  const {
    data: participants = [],
    isLoading: participantsLoading
  } = useQuery({
    queryKey: ['meeting', meetingId, 'participants'],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/participants`)
      if (!response.ok) throw new Error('Failed to fetch participants')
      return response.json()
    },
    enabled: !!meetingId,
    refetchInterval: isInMeeting ? 5000 : undefined
  })

  // Fetch notes
  const {
    data: notes = [],
    isLoading: notesLoading
  } = useQuery({
    queryKey: ['meeting', meetingId, 'notes'],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/notes`)
      if (!response.ok) throw new Error('Failed to fetch notes')
      return response.json()
    },
    enabled: !!meetingId,
    refetchInterval: isInMeeting ? 3000 : undefined
  })

  // Fetch recordings
  const {
    data: recordings = [],
    isLoading: recordingsLoading
  } = useQuery({
    queryKey: ['meeting', meetingId, 'recordings'],
    queryFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/recordings`)
      if (!response.ok) throw new Error('Failed to fetch recordings')
      return response.json()
    },
    enabled: !!meetingId
  })

  // Join meeting mutation
  const joinMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to join meeting')
      return response.json()
    },
    onSuccess: (data) => {
      setIsInMeeting(true)
      setConnectionState(prev => ({ ...prev, isConnected: true }))
      
      // Initialize WebRTC and WebSocket connections
      initializeConnections(data.sessionToken)
      
      // Invalidate participants to refresh the list
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
    }
  })

  // Leave meeting mutation
  const leaveMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/leave`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to leave meeting')
      return response.json()
    },
    onSuccess: () => {
      setIsInMeeting(false)
      setConnectionState(prev => ({ ...prev, isConnected: false }))
      
      // Clean up connections
      cleanupConnections()
      
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
    }
  })

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (noteData: Omit<MeetingNote, 'id' | 'createdAt' | 'replies'>) => {
      const response = await fetch(`/api/meetings/${meetingId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData)
      })
      if (!response.ok) throw new Error('Failed to add note')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'notes'] })
    }
  })

  // Start recording mutation
  const startRecordingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/recording/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to start recording')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'recordings'] })
    }
  })

  // Stop recording mutation
  const stopRecordingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/meetings/${meetingId}/recording/stop`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to stop recording')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'recordings'] })
    }
  })

  // Invite participant mutation
  const inviteParticipantMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/meetings/${meetingId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!response.ok) throw new Error('Failed to invite participant')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
    }
  })

  // Initialize WebRTC and WebSocket connections
  const initializeConnections = useCallback(async (sessionToken: string) => {
    try {
      // Initialize WebSocket for signaling
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/meetings/${meetingId}`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('Meeting WebSocket connected')
        // Send join message with session token
        wsRef.current?.send(JSON.stringify({
          type: 'join',
          payload: { sessionToken }
        }))
      }

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      }

      wsRef.current.onerror = (error) => {
        console.error('Meeting WebSocket error:', error)
        setConnectionState(prev => ({ ...prev, reconnecting: true }))
      }

      // Initialize WebRTC peer connection
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // Add TURN servers for production
        ]
      }

      peerConnectionRef.current = new RTCPeerConnection(config)

      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'ice-candidate',
            payload: event.candidate
          }))
        }
      }

      peerConnectionRef.current.ontrack = (event) => {
        console.log('Received remote stream:', event.streams[0])
        // Handle incoming streams from other participants
      }

      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current?.connectionState
        console.log('Connection state:', state)
        
        if (state === 'connected') {
          setConnectionState(prev => ({ ...prev, isConnected: true, reconnecting: false }))
        } else if (state === 'disconnected' || state === 'failed') {
          setConnectionState(prev => ({ ...prev, isConnected: false }))
        }
      }

      // Get user media
      if (meeting?.settings?.videoOnJoin || meeting?.settings?.muteOnJoin === false) {
        await requestUserMedia()
      }

    } catch (error) {
      console.error('Failed to initialize connections:', error)
    }
  }, [meetingId, meeting])

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'participant-joined':
        queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
        break
      
      case 'participant-left':
        queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
        break
      
      case 'media-state-changed':
        // Update participant media state
        queryClient.setQueryData(
          ['meeting', meetingId, 'participants'],
          (old: MeetingParticipant[] = []) => old.map(p => 
            p.userId === message.payload.userId 
              ? { ...p, mediaState: { ...p.mediaState, ...message.payload.mediaState } }
              : p
          )
        )
        break
      
      case 'note-added':
        queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'notes'] })
        break
      
      case 'ice-candidate':
        if (peerConnectionRef.current) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.payload))
        }
        break
      
      case 'offer':
        handleOffer(message.payload)
        break
      
      case 'answer':
        handleAnswer(message.payload)
        break
      
      default:
        console.log('Unhandled WebSocket message:', message)
    }
  }, [meetingId, queryClient])

  // Request user media (camera/microphone)
  const requestUserMedia = useCallback(async (constraints?: MediaStreamConstraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        constraints || {
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }
      )

      streamRef.current = stream

      // Add stream to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream)
        })
      }

      setMediaState(prev => ({
        ...prev,
        videoEnabled: stream.getVideoTracks().length > 0,
        audioEnabled: stream.getAudioTracks().length > 0
      }))

      return stream
    } catch (error) {
      console.error('Failed to get user media:', error)
      throw error
    }
  }, [])

  // Handle WebRTC offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return

    await peerConnectionRef.current.setRemoteDescription(offer)
    const answer = await peerConnectionRef.current.createAnswer()
    await peerConnectionRef.current.setLocalDescription(answer)

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        payload: answer
      }))
    }
  }, [])

  // Handle WebRTC answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return
    await peerConnectionRef.current.setRemoteDescription(answer)
  }, [])

  // Clean up connections
  const cleanupConnections = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Stop media streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setMediaState({
      videoEnabled: false,
      audioEnabled: false,
      screenSharing: false,
      handRaised: false,
      speaking: false,
      muted: false
    })
  }, [])

  // Media control functions
  const toggleVideo = useCallback(async () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks()
      const enabled = !mediaState.videoEnabled

      videoTracks.forEach(track => {
        track.enabled = enabled
      })

      setMediaState(prev => ({ ...prev, videoEnabled: enabled }))

      // Notify other participants
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'media-state-change',
          payload: { videoEnabled: enabled }
        }))
      }
    }
  }, [mediaState.videoEnabled])

  const toggleAudio = useCallback(async () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks()
      const enabled = !mediaState.audioEnabled

      audioTracks.forEach(track => {
        track.enabled = enabled
      })

      setMediaState(prev => ({ ...prev, audioEnabled: enabled, muted: !enabled }))

      // Notify other participants
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'media-state-change',
          payload: { audioEnabled: enabled, muted: !enabled }
        }))
      }
    }
  }, [mediaState.audioEnabled])

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      // Replace video track with screen share
      if (peerConnectionRef.current && streamRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0]
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track?.kind === 'video'
        )

        if (sender) {
          await sender.replaceTrack(videoTrack)
        }

        // Handle screen share end
        videoTrack.onended = () => {
          stopScreenShare()
        }
      }

      setMediaState(prev => ({ ...prev, screenSharing: true }))

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'media-state-change',
          payload: { screenSharing: true }
        }))
      }
    } catch (error) {
      console.error('Failed to start screen share:', error)
    }
  }, [])

  const stopScreenShare = useCallback(async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const videoTrack = cameraStream.getVideoTracks()[0]

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track?.kind === 'video'
        )

        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      }

      setMediaState(prev => ({ ...prev, screenSharing: false }))

      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'media-state-change',
          payload: { screenSharing: false }
        }))
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error)
    }
  }, [])

  const raiseHand = useCallback(() => {
    const handRaised = !mediaState.handRaised
    setMediaState(prev => ({ ...prev, handRaised }))

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'media-state-change',
        payload: { handRaised }
      }))
    }
  }, [mediaState.handRaised])

  const lowerHand = useCallback(() => {
    setMediaState(prev => ({ ...prev, handRaised: false }))

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'media-state-change',
        payload: { handRaised: false }
      }))
    }
  }, [])

  // Participant management functions
  const muteParticipant = useCallback(async (participantId: string) => {
    const response = await fetch(`/api/meetings/${meetingId}/participants/${participantId}/mute`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to mute participant')

    queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
  }, [meetingId, queryClient])

  const unmuteParticipant = useCallback(async (participantId: string) => {
    const response = await fetch(`/api/meetings/${meetingId}/participants/${participantId}/unmute`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to unmute participant')

    queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
  }, [meetingId, queryClient])

  const removeParticipant = useCallback(async (participantId: string) => {
    const response = await fetch(`/api/meetings/${meetingId}/participants/${participantId}/remove`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to remove participant')

    queryClient.invalidateQueries({ queryKey: ['meeting', meetingId, 'participants'] })
  }, [meetingId, queryClient])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupConnections()
    }
  }, [cleanupConnections])

  // Convenience functions
  const joinMeeting = useCallback(() => {
    joinMeetingMutation.mutate()
  }, [joinMeetingMutation])

  const leaveMeeting = useCallback(() => {
    leaveMeetingMutation.mutate()
  }, [leaveMeetingMutation])

  const addNote = useCallback((noteData: Omit<MeetingNote, 'id' | 'createdAt' | 'replies'>) => {
    addNoteMutation.mutate(noteData)
  }, [addNoteMutation])

  const startRecording = useCallback(() => {
    startRecordingMutation.mutate()
  }, [startRecordingMutation])

  const stopRecording = useCallback(() => {
    stopRecordingMutation.mutate()
  }, [stopRecordingMutation])

  const inviteParticipant = useCallback((email: string) => {
    inviteParticipantMutation.mutate(email)
  }, [inviteParticipantMutation])

  return {
    // Data
    meeting,
    participants,
    notes,
    recordings,
    
    // State
    isInMeeting,
    mediaState,
    connectionState,
    
    // Loading states
    isLoading: meetingLoading || participantsLoading || notesLoading || recordingsLoading,
    meetingLoading,
    participantsLoading,
    notesLoading,
    recordingsLoading,
    
    // Actions
    joinMeeting,
    leaveMeeting,
    addNote,
    startRecording,
    stopRecording,
    inviteParticipant,
    removeParticipant,
    muteParticipant,
    unmuteParticipant,
    
    // Media controls
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    raiseHand,
    lowerHand,
    
    // Mutation states
    isJoining: joinMeetingMutation.isPending,
    isLeaving: leaveMeetingMutation.isPending,
    isAddingNote: addNoteMutation.isPending,
    isStartingRecording: startRecordingMutation.isPending,
    isStoppingRecording: stopRecordingMutation.isPending,
    isInviting: inviteParticipantMutation.isPending
  }
}