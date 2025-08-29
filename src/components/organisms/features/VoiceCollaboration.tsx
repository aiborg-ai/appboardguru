'use client';

/**
 * Voice Collaboration Component
 * Immersive voice collaboration spaces with spatial audio and real-time interaction
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/atoms/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/cards/card';
import { Badge } from '@/components/atoms/display/badge';
import { Alert, AlertDescription } from '@/components/atoms/feedback/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/atoms/display/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/atoms/form/slider';
import { Switch } from '@/components/atoms/form/switch';
import { 
  Mic, 
  MicOff,
  Volume2,
  VolumeX,
  Users,
  Settings,
  Monitor,
  MessageSquare,
  Headphones,
  Radio,
  Zap,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  Volume,
  MapPin,
  Layers3,
  Workflow,
  FileAudio,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

import { 
  VoiceCollaborationSession,
  VoiceParticipant,
  SpatialPosition,
  VoiceAnnotation,
  VoiceWorkflowTrigger,
  VoiceCollaborationEvent,
  ParticipantAudioSettings,
  SpatialAudioConfig,
  VoiceScreenShare,
  ConnectionStatistics
} from '@/types/voice-collaboration';

import {
  calculateSpatialAudioParams,
  applySpatialAudioProcessing,
  VoiceActivityDetector,
  AudioLevelMeter,
  calculateOptimalArrangement,
  createPositionTransition,
  createWebRTCConfiguration,
  createAudioConstraints,
  monitorConnectionQuality
} from '@/lib/voice/collaboration-utils';

interface VoiceCollaborationProps {
  userId: string;
  organizationId: string;
  sessionId?: string;
  documentId?: string;
  onSessionUpdate?: (session: VoiceCollaborationSession) => void;
  onAnnotationCreated?: (annotation: VoiceAnnotation) => void;
  onWorkflowTriggered?: (workflow: VoiceWorkflowTrigger) => void;
  className?: string;
  embedded?: boolean;
}

interface CollaborationState {
  session: VoiceCollaborationSession | null;
  participants: Map<string, VoiceParticipant>;
  currentParticipant: VoiceParticipant | null;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  isRecording: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  spatialAudioEnabled: boolean;
  currentView: 'overview' | 'spatial' | 'participants' | 'annotations' | 'workflows';
  screenShare: VoiceScreenShare | null;
  voiceLevel: number;
  connectionStats: ConnectionStatistics | null;
}

export default function VoiceCollaboration({
  userId,
  organizationId,
  sessionId,
  documentId,
  onSessionUpdate,
  onAnnotationCreated,
  onWorkflowTriggered,
  className = '',
  embedded = false
}: VoiceCollaborationProps) {
  const [state, setState] = useState<CollaborationState>({
    session: null,
    participants: new Map(),
    currentParticipant: null,
    connectionState: 'disconnected',
    isRecording: false,
    isMuted: false,
    isDeafened: false,
    spatialAudioEnabled: true,
    currentView: 'overview',
    screenShare: null,
    voiceLevel: 0,
    connectionStats: null
  });

  const [audioSettings, setAudioSettings] = useState<ParticipantAudioSettings>({
    volume: 100,
    isMuted: false,
    isDeafened: false,
    echoCancellation: true,
    noiseSuppression: true,
    spatialAudioEnabled: true,
    voiceActivation: true,
    voiceThreshold: -30
  });

  const [spatialConfig, setSpatialConfig] = useState<Partial<SpatialAudioConfig>>({
    roomSize: 'medium',
    ambientSounds: { 
      enabled: true, 
      volume: 20,
      soundscape: 'meeting_room',
      spatializedAmbient: true
    }
  });

  const [annotations, setAnnotations] = useState<VoiceAnnotation[]>([]);
  const [workflows, setWorkflows] = useState<VoiceWorkflowTrigger[]>([]);
  const [events, setEvents] = useState<VoiceCollaborationEvent[]>([]);

  // Refs for WebRTC and audio processing
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const spatialProcessorsRef = useRef<Map<string, AudioNode>>(new Map());
  const voiceDetectorRef = useRef<VoiceActivityDetector | null>(null);
  const levelMeterRef = useRef<AudioLevelMeter | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initialize collaboration session
  useEffect(() => {
    if (sessionId) {
      joinExistingSession(sessionId);
    }
    
    return () => {
      cleanup();
    };
  }, [sessionId]);

  // Initialize audio context and spatial processing
  useEffect(() => {
    if (state.connectionState === 'connected' && state.spatialAudioEnabled) {
      initializeSpatialAudio();
    }
  }, [state.connectionState, state.spatialAudioEnabled]);

  // Update spatial positioning when participants change
  useEffect(() => {
    if (state.session && state.participants.size > 0) {
      updateSpatialPositioning();
    }
  }, [state.participants, state.session?.collaborationType]);

  const initializeSpatialAudio = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Initialize local audio stream
      const constraints = createAudioConstraints(state.spatialAudioEnabled, {
        echoCancellation: audioSettings.echoCancellation,
        noiseSuppression: audioSettings.noiseSuppression,
        autoGainControl: true,
        highpassFilter: true,
        spatialProcessing: state.spatialAudioEnabled,
        voiceEnhancement: true,
        backgroundNoiseReduction: 70
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
      localStreamRef.current = stream;

      // Set up voice activity detection
      const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
      voiceDetectorRef.current = new VoiceActivityDetector(
        audioContextRef.current,
        sourceNode,
        audioSettings.voiceThreshold,
        handleVoiceActivity
      );

      // Set up audio level meter
      levelMeterRef.current = new AudioLevelMeter(
        audioContextRef.current,
        sourceNode,
        (level) => setState(prev => ({ ...prev, voiceLevel: level }))
      );

      console.log('Spatial audio initialized successfully');

    } catch (error) {
      console.error('Failed to initialize spatial audio:', error);
      setState(prev => ({ ...prev, connectionState: 'error' }));
    }
  };

  const joinExistingSession = async (sessionId: string) => {
    setState(prev => ({ ...prev, connectionState: 'connecting' }));

    try {
      const response = await fetch('/api/voice/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_session',
          sessionId,
          userId,
          audioSettings,
          spatialPosition: { x: 0, y: 0, z: 0, orientation: 0, zone: 'center' }
        })
      });

      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          session: result.session,
          currentParticipant: result.participant,
          connectionState: 'connected'
        }));

        // Update participants map
        const participantsMap = new Map();
        result.session.participants?.forEach((p: VoiceParticipant) => {
          participantsMap.set(p.id, p);
        });
        setState(prev => ({ ...prev, participants: participantsMap }));

        // Initialize WebRTC connections for existing participants
        await initializeWebRTCConnections(result.session.participants || []);

        // Set up real-time event listening
        setupEventSource(sessionId);

        onSessionUpdate?.(result.session);
        
      } else {
        throw new Error(result.error || 'Failed to join session');
      }

    } catch (error) {
      console.error('Join session error:', error);
      setState(prev => ({ ...prev, connectionState: 'error' }));
    }
  };

  const createNewSession = async (sessionConfig: {
    name: string;
    type: VoiceCollaborationSession['collaborationType'];
    description?: string;
  }) => {
    setState(prev => ({ ...prev, connectionState: 'connecting' }));

    try {
      const response = await fetch('/api/voice/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          name: sessionConfig.name,
          description: sessionConfig.description,
          collaborationType: sessionConfig.type,
          hostUserId: userId,
          organizationId,
          permissions: {
            isPublic: false,
            allowRecording: true,
            allowTranscription: true,
            allowScreenSharing: true,
            allowAnnotations: true,
            allowVoiceCommands: true,
            maxParticipants: 12,
            requireApproval: false
          },
          spatialAudioConfig: {
            enabled: true,
            roomSize: spatialConfig.roomSize || 'medium',
            ambientSounds: spatialConfig.ambientSounds || { enabled: true, volume: 20 },
            acoustics: {
              reverberation: 30,
              absorption: 70,
              reflection: 40,
              distanceAttenuation: true,
              dopplerEffect: false
            },
            mixing: {
              maxSimultaneousSpeakers: 4,
              priorityMode: 'role_based',
              duckingEnabled: true,
              crossfadeTime: 200,
              compressionEnabled: true
            },
            fallbackMode: 'stereo'
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setState(prev => ({
          ...prev,
          session: result.session,
          connectionState: 'connected'
        }));

        // Auto-join the created session
        await joinExistingSession(result.session.id);

      } else {
        throw new Error(result.error || 'Failed to create session');
      }

    } catch (error) {
      console.error('Create session error:', error);
      setState(prev => ({ ...prev, connectionState: 'error' }));
    }
  };

  const initializeWebRTCConnections = async (participants: VoiceParticipant[]) => {
    const config = createWebRTCConfiguration(state.spatialAudioEnabled);

    for (const participant of participants) {
      if (participant.userId === userId) continue; // Skip self

      const peerConnection = new RTCPeerConnection(config);
      peerConnectionsRef.current.set(participant.id, peerConnection);

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (event.streams[0]) {
          handleRemoteStream(participant.id, event.streams[0]);
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Peer connection state for ${participant.displayName}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          // Start monitoring connection quality
          monitorConnectionQuality(peerConnection, (stats) => {
            setState(prev => ({ ...prev, connectionStats: stats }));
          });
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to signaling server
          sendSignalingMessage(participant.id, {
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      };
    }
  };

  const handleRemoteStream = (participantId: string, stream: MediaStream) => {
    if (!audioContextRef.current) return;

    const participant = state.participants.get(participantId);
    if (!participant) return;

    // Create spatial audio processing for remote stream
    const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
    
    if (state.currentParticipant && state.spatialAudioEnabled) {
      const spatialParams = calculateSpatialAudioParams(
        state.currentParticipant.spatialPosition,
        participant.spatialPosition,
        state.session?.spatialAudioConfig!
      );

      const spatialProcessor = applySpatialAudioProcessing(
        audioContextRef.current,
        sourceNode,
        spatialParams
      );

      spatialProcessorsRef.current.set(participantId, spatialProcessor);
    } else {
      // Direct connection for non-spatial audio
      sourceNode.connect(audioContextRef.current.destination);
    }
  };

  const handleVoiceActivity = (isActive: boolean, volume: number) => {
    if (state.currentParticipant) {
      // Update participant's voice activity
      setState(prev => {
        const updatedParticipants = new Map(prev.participants);
        const participant = updatedParticipants.get(prev.currentParticipant!.id);
        
        if (participant) {
          participant.connectionStatus = isActive ? 'speaking' : 'connected';
          participant.voiceStats.averageVolume = 
            (participant.voiceStats.averageVolume + Math.abs(volume)) / 2;
          updatedParticipants.set(participant.id, participant);
        }
        
        return { ...prev, participants: updatedParticipants };
      });

      // Broadcast voice activity to other participants
      broadcastVoiceActivity(isActive, volume);
    }
  };

  const broadcastVoiceActivity = async (isActive: boolean, volume: number) => {
    if (!state.session || !state.currentParticipant) return;

    try {
      await fetch('/api/voice/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'voice_activity',
          sessionId: state.session.id,
          participantId: state.currentParticipant.id,
          isActive,
          volume
        })
      });
    } catch (error) {
      console.error('Failed to broadcast voice activity:', error);
    }
  };

  const updateSpatialPositioning = () => {
    if (!state.session || !state.currentParticipant) return;

    const participants = Array.from(state.participants.values());
    const optimalPositions = calculateOptimalArrangement(
      participants,
      state.session.collaborationType
    );

    // Apply optimal positions with smooth transitions
    participants.forEach(participant => {
      const newPosition = optimalPositions[participant.id];
      if (newPosition && participant.id !== state.currentParticipant!.id) {
        // Animate to new position
        createPositionTransition(
          participant.spatialPosition,
          newPosition,
          1500,
          (position) => updateParticipantPosition(participant.id, position)
        );
      }
    });
  };

  const updateParticipantPosition = async (participantId: string, position: SpatialPosition) => {
    setState(prev => {
      const updatedParticipants = new Map(prev.participants);
      const participant = updatedParticipants.get(participantId);
      
      if (participant) {
        participant.spatialPosition = position;
        updatedParticipants.set(participantId, participant);
        
        // Update spatial audio processing
        updateSpatialAudioProcessing(participantId, position);
      }
      
      return { ...prev, participants: updatedParticipants };
    });

    // Send position update to server if this is the current participant
    if (participantId === state.currentParticipant?.id) {
      try {
        await fetch('/api/voice/collaboration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_spatial_position',
            sessionId: state.session!.id,
            participantId,
            spatialPosition: position
          })
        });
      } catch (error) {
        console.error('Failed to update spatial position:', error);
      }
    }
  };

  const updateSpatialAudioProcessing = (participantId: string, position: SpatialPosition) => {
    if (!audioContextRef.current || !state.currentParticipant || !state.spatialAudioEnabled) return;

    const spatialProcessor = spatialProcessorsRef.current.get(participantId);
    if (!spatialProcessor || !state.session) return;

    const spatialParams = calculateSpatialAudioParams(
      state.currentParticipant.spatialPosition,
      position,
      state.session.spatialAudioConfig
    );

    // Update spatial audio parameters
    // This would involve updating gain, panner, and delay nodes
    // Implementation details depend on the specific audio processing setup
  };

  const setupEventSource = (sessionId: string) => {
    const eventSource = new EventSource(`/api/voice/collaboration/events?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const collaborationEvent: VoiceCollaborationEvent = JSON.parse(event.data);
        handleCollaborationEvent(collaborationEvent);
      } catch (error) {
        console.error('Failed to parse collaboration event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
    };
  };

  const handleCollaborationEvent = (event: VoiceCollaborationEvent) => {
    setEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events

    switch (event.type) {
      case 'participant_joined':
        handleParticipantJoined(event.data);
        break;
        
      case 'participant_left':
        handleParticipantLeft(event.participantId!);
        break;
        
      case 'spatial_position_changed':
        updateParticipantPosition(event.participantId!, event.data.spatialPosition);
        break;
        
      case 'annotation_created':
        handleAnnotationCreated(event.data);
        break;
        
      case 'workflow_triggered':
        handleWorkflowTriggered(event.data);
        break;
        
      case 'screen_share_started':
        setState(prev => ({ ...prev, screenShare: event.data.screenShare }));
        break;
        
      case 'screen_share_stopped':
        setState(prev => ({ ...prev, screenShare: null }));
        break;
    }
  };

  const handleParticipantJoined = (participantData: any) => {
    setState(prev => {
      const updatedParticipants = new Map(prev.participants);
      updatedParticipants.set(participantData.id, participantData);
      return { ...prev, participants: updatedParticipants };
    });
    
    // Initialize WebRTC connection for new participant
    initializeWebRTCConnections([participantData]);
  };

  const handleParticipantLeft = (participantId: string) => {
    setState(prev => {
      const updatedParticipants = new Map(prev.participants);
      updatedParticipants.delete(participantId);
      return { ...prev, participants: updatedParticipants };
    });
    
    // Clean up WebRTC connection
    const peerConnection = peerConnectionsRef.current.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      peerConnectionsRef.current.delete(participantId);
    }
    
    // Clean up spatial audio processing
    const spatialProcessor = spatialProcessorsRef.current.get(participantId);
    if (spatialProcessor) {
      spatialProcessor.disconnect();
      spatialProcessorsRef.current.delete(participantId);
    }
  };

  const handleAnnotationCreated = (annotation: VoiceAnnotation) => {
    setAnnotations(prev => [annotation, ...prev]);
    onAnnotationCreated?.(annotation);
  };

  const handleWorkflowTriggered = (workflow: VoiceWorkflowTrigger) => {
    setWorkflows(prev => [workflow, ...prev.slice(0, 19)]); // Keep last 20
    onWorkflowTriggered?.(workflow);
  };

  const toggleMute = async () => {
    const newMutedState = !state.isMuted;
    
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
      });
    }

    setState(prev => ({ ...prev, isMuted: newMutedState }));
    
    // Update audio settings on server
    await updateAudioSettings({ isMuted: newMutedState });
  };

  const toggleDeafen = async () => {
    const newDeafenedState = !state.isDeafened;
    
    // Mute all remote audio
    spatialProcessorsRef.current.forEach(processor => {
      // This would involve muting the output of spatial processors
      // Implementation depends on the specific audio processing setup
    });

    setState(prev => ({ ...prev, isDeafened: newDeafenedState }));
    
    await updateAudioSettings({ isDeafened: newDeafenedState });
  };

  const updateAudioSettings = async (updates: Partial<ParticipantAudioSettings>) => {
    const newSettings = { ...audioSettings, ...updates };
    setAudioSettings(newSettings);

    if (state.session && state.currentParticipant) {
      try {
        await fetch('/api/voice/collaboration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_audio_settings',
            sessionId: state.session.id,
            participantId: state.currentParticipant.id,
            audioSettings: updates
          })
        });
      } catch (error) {
        console.error('Failed to update audio settings:', error);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Add screen share track to peer connections
      peerConnectionsRef.current.forEach(peerConnection => {
        stream.getVideoTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      });

      // Notify server about screen share start
      await fetch('/api/voice/collaboration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_screen_share',
          sessionId: state.session!.id,
          participantId: state.currentParticipant!.id,
          shareType: 'full_screen'
        })
      });

    } catch (error) {
      console.error('Screen share failed:', error);
    }
  };

  const sendSignalingMessage = async (recipientId: string, message: any) => {
    // This would send WebRTC signaling messages through the server
    // Implementation depends on the signaling server setup
    console.log('Sending signaling message:', message);
  };

  const cleanup = () => {
    // Clean up WebRTC connections
    peerConnectionsRef.current.forEach(peerConnection => {
      peerConnection.close();
    });
    peerConnectionsRef.current.clear();

    // Clean up audio processing
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (voiceDetectorRef.current) {
      voiceDetectorRef.current.stop();
    }

    if (levelMeterRef.current) {
      levelMeterRef.current.stop();
    }

    spatialProcessorsRef.current.forEach(processor => {
      processor.disconnect();
    });
    spatialProcessorsRef.current.clear();

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  };

  // Render methods for different views
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Session Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{state.session?.name || 'Voice Collaboration'}</CardTitle>
              <CardDescription>
                {state.session?.description || 'Immersive voice collaboration session'}
              </CardDescription>
            </div>
            <Badge variant={
              state.connectionState === 'connected' ? 'default' :
              state.connectionState === 'connecting' ? 'secondary' :
              'destructive'
            }>
              {state.connectionState}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <div className="font-medium">{state.participants.size}</div>
              <div className="text-gray-500">Participants</div>
            </div>
            <div className="text-center">
              <Activity className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="font-medium">{Math.round(state.voiceLevel * 100)}%</div>
              <div className="text-gray-500">Voice Level</div>
            </div>
            <div className="text-center">
              <Radio className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <div className="font-medium">{state.spatialAudioEnabled ? 'On' : 'Off'}</div>
              <div className="text-gray-500">Spatial Audio</div>
            </div>
            <div className="text-center">
              <FileAudio className="h-5 w-5 mx-auto mb-1 text-orange-600" />
              <div className="font-medium">{annotations.length}</div>
              <div className="text-gray-500">Annotations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={toggleMute}
          variant={state.isMuted ? "destructive" : "default"}
          size="sm"
        >
          {state.isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
          {state.isMuted ? 'Unmute' : 'Mute'}
        </Button>
        
        <Button
          onClick={toggleDeafen}
          variant={state.isDeafened ? "destructive" : "outline"}
          size="sm"
        >
          {state.isDeafened ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
          {state.isDeafened ? 'Undeafen' : 'Deafen'}
        </Button>
        
        <Button onClick={startScreenShare} variant="outline" size="sm">
          <Monitor className="h-4 w-4 mr-2" />
          Share Screen
        </Button>
        
        <Button
          onClick={() => setState(prev => ({ ...prev, spatialAudioEnabled: !prev.spatialAudioEnabled }))}
          variant="outline"
          size="sm"
        >
          <Headphones className="h-4 w-4 mr-2" />
          {state.spatialAudioEnabled ? 'Disable' : 'Enable'} Spatial
        </Button>
      </div>

      {/* Connection Quality */}
      {state.connectionStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Connection Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Quality Score</span>
                <Badge variant={
                  state.connectionStats.qualityScore > 80 ? 'default' :
                  state.connectionStats.qualityScore > 60 ? 'secondary' :
                  'destructive'
                }>
                  {Math.round(state.connectionStats.qualityScore)}%
                </Badge>
              </div>
              <Progress value={state.connectionStats.qualityScore} className="h-2" />
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                <div>Latency: {Math.round(state.connectionStats.roundTripTime)}ms</div>
                <div>Packets Lost: {state.connectionStats.packetsLost}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderSpatialView = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spatial Audio Room</CardTitle>
          <CardDescription>3D positioning of participants in the virtual space</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Spatial positioning visualization would go here */}
          <div className="relative w-full h-64 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg border">
            <div className="absolute inset-4">
              {/* Render participants as positioned dots */}
              {Array.from(state.participants.values()).map(participant => {
                const x = ((participant.spatialPosition.x + 1) / 2) * 100; // Convert -1,1 to 0,100%
                const y = ((participant.spatialPosition.y + 1) / 2) * 100;
                
                return (
                  <div
                    key={participant.id}
                    className={`absolute w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      participant.connectionStatus === 'speaking' ? 'bg-green-500 border-green-600 animate-pulse' :
                      participant.connectionStatus === 'connected' ? 'bg-blue-500 border-blue-600' :
                      'bg-gray-400 border-gray-500'
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    title={participant.displayName}
                  >
                    {participant.displayName.charAt(0).toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Spatial audio controls */}
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Room Size</label>
              <select
                value={spatialConfig.roomSize}
                onChange={(e) => setSpatialConfig(prev => ({ ...prev, roomSize: e.target.value as any }))}
                className="w-full p-2 border rounded"
              >
                <option value="intimate">Intimate (2-4 people)</option>
                <option value="small">Small (4-6 people)</option>
                <option value="medium">Medium (6-10 people)</option>
                <option value="large">Large (10-15 people)</option>
              </select>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Ambient Volume</label>
                <span className="text-sm text-gray-500">{spatialConfig.ambientSounds?.volume}%</span>
              </div>
              <Slider
                value={[spatialConfig.ambientSounds?.volume || 20]}
                onValueChange={([value]) => setSpatialConfig(prev => {
                  const newConfig = { ...prev };
                  newConfig.ambientSounds = { 
                    enabled: prev.ambientSounds?.enabled ?? true,
                    volume: value ?? 20,
                    soundscape: prev.ambientSounds?.soundscape ?? 'meeting_room',
                    spatializedAmbient: prev.ambientSounds?.spatializedAmbient ?? true
                  };
                  return newConfig;
                })}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderParticipants = () => (
    <div className="space-y-3">
      {Array.from(state.participants.values()).map(participant => (
        <Card key={participant.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                  participant.connectionStatus === 'speaking' ? 'bg-green-500 animate-pulse' :
                  participant.connectionStatus === 'connected' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`}>
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{participant.displayName}</div>
                  <div className="text-sm text-gray-500 capitalize">{participant.role}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={
                  participant.connectionStatus === 'speaking' ? 'default' :
                  participant.connectionStatus === 'connected' ? 'secondary' :
                  'destructive'
                }>
                  {participant.connectionStatus}
                </Badge>
                
                {participant.audioSettings.isMuted && <MicOff className="h-4 w-4 text-red-500" />}
                {participant.audioSettings.isDeafened && <VolumeX className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            
            {/* Voice stats */}
            <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-gray-600">
              <div>
                <div>Speaking Time</div>
                <div className="font-medium">{Math.round(participant.voiceStats.totalSpeakingTime)}s</div>
              </div>
              <div>
                <div>Word Count</div>
                <div className="font-medium">{participant.voiceStats.wordCount}</div>
              </div>
              <div>
                <div>Engagement</div>
                <div className="font-medium">{participant.voiceStats.engagementScore}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderAnnotations = () => (
    <div className="space-y-3">
      {annotations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileAudio className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No voice annotations yet</p>
          <p className="text-sm">Start speaking to create annotations</p>
        </div>
      ) : (
        annotations.map(annotation => (
          <Card key={annotation.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">{annotation.type}</Badge>
                    <Badge variant={
                      annotation.priority === 'critical' ? 'destructive' :
                      annotation.priority === 'high' ? 'default' :
                      'secondary'
                    }>
                      {annotation.priority}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(annotation.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="font-medium mb-1">{annotation.authorName}</div>
                  <div className="text-sm text-gray-600 mb-2">{annotation.content.transcript}</div>
                  
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Play className="h-3 w-3 mr-1" />
                      Play
                    </Button>
                    <span className="text-xs text-gray-500">
                      {annotation.duration}s • {Math.round(annotation.content.transcriptConfidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderWorkflows = () => (
    <div className="space-y-3">
      {workflows.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Workflow className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No workflow triggers</p>
          <p className="text-sm">Voice commands will appear here</p>
        </div>
      ) : (
        workflows.map(workflow => (
          <Card key={workflow.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{workflow.name}</div>
                <Badge variant={workflow.enabled ? 'default' : 'secondary'}>
                  {workflow.enabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">{workflow.description}</div>
              <div className="text-xs text-gray-500">
                Triggered {workflow.usage.totalTriggers} times
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (state.connectionState === 'disconnected') {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">Start Voice Collaboration</h3>
          <p className="text-gray-600 mb-4">
            Create or join an immersive voice collaboration session
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => createNewSession({ 
                name: 'Board Meeting', 
                type: 'meeting' 
              })}
              className="w-full"
            >
              Create Meeting Session
            </Button>
            <Button 
              onClick={() => createNewSession({ 
                name: 'Document Review', 
                type: 'document_review' 
              })}
              variant="outline" 
              className="w-full"
            >
              Create Review Session
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="h-5 w-5 text-blue-600" />
            <span>Voice Collaboration</span>
          </div>
          <div className="flex items-center space-x-2">
            {!embedded && (
              <Button variant="ghost" size="sm">
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={state.currentView} onValueChange={(value: string) => setState(prev => ({ ...prev, currentView: value as any }))}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Eye className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="spatial">
              <MapPin className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Spatial</span>
            </TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">People</span>
            </TabsTrigger>
            <TabsTrigger value="annotations">
              <FileAudio className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <Workflow className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Flows</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="overview">{renderOverview()}</TabsContent>
            <TabsContent value="spatial">{renderSpatialView()}</TabsContent>
            <TabsContent value="participants">{renderParticipants()}</TabsContent>
            <TabsContent value="annotations">{renderAnnotations()}</TabsContent>
            <TabsContent value="workflows">{renderWorkflows()}</TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}