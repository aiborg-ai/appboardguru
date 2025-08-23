/**
 * Virtual Board Room Interface
 * Mobile-responsive interface for enterprise board room sessions
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, 
  Users, MessageSquare, FileText, Vote, Shield, 
  Settings, MoreVertical, Phone, PhoneOff, Camera,
  Volume2, VolumeX, Hand, Maximize, Minimize,
  Record, StopCircle, Lock, Unlock, AlertTriangle,
  CheckCircle, XCircle, Clock, User, Crown,
  Grid3X3, Grid, PanelTop, PanelBottom, PanelLeft,
  PanelRight, Laptop, Smartphone
} from 'lucide-react';

interface Participant {
  id: string;
  userId: string;
  name: string;
  role: 'host' | 'co_host' | 'director' | 'observer' | 'secretary' | 'legal_counsel';
  isPresent: boolean;
  isSpeaking: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  deviceType: 'desktop' | 'laptop' | 'tablet' | 'mobile';
  joinedAt: Date;
}

interface VotingMotion {
  id: string;
  title: string;
  description?: string;
  type: 'simple_majority' | 'two_thirds_majority' | 'unanimous' | 'special_resolution';
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  totalVotes: number;
  requiredVotes: number;
  userVote?: 'for' | 'against' | 'abstain';
  timeRemaining?: number;
}

interface SessionInfo {
  id: string;
  name: string;
  type: 'board_meeting' | 'committee_meeting' | 'executive_session' | 'special_meeting';
  status: 'scheduled' | 'active' | 'paused' | 'ended' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  securityLevel: 'standard' | 'high' | 'maximum';
  participants: Participant[];
  activeVotes: VotingMotion[];
  recordingStatus: 'not_recording' | 'recording' | 'paused';
  currentPhase?: string;
}

interface VirtualBoardRoomInterfaceProps {
  sessionId: string;
  userId: string;
  userRole: Participant['role'];
  onLeaveSession: () => void;
}

const VirtualBoardRoomInterface: React.FC<VirtualBoardRoomInterfaceProps> = ({
  sessionId,
  userId,
  userRole,
  onLeaveSession
}) => {
  // State management
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<'grid' | 'speaker' | 'presentation'>('grid');
  const [activePanel, setActivePanel] = useState<'participants' | 'chat' | 'documents' | 'voting' | null>('participants');
  const [isMobileView, setIsMobileView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState<Array<{ id: string; type: string; message: string; severity: 'info' | 'warning' | 'critical' }>>([]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Device detection
  useEffect(() => {
    const checkDevice = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Initialize media streams
  useEffect(() => {
    initializeMedia();
    loadSessionData();
  }, [sessionId]);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobileView ? 640 : 1280 },
          height: { ideal: isMobileView ? 480 : 720 },
          frameRate: { ideal: 30 },
          facingMode: isMobileView ? 'user' : undefined
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to initialize media:', error);
      // Show error to user
    }
  };

  const loadSessionData = async () => {
    try {
      const response = await fetch(`/api/virtual-board-room/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionInfo(data.session);
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  // Media controls
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(prev => !prev);
    }
  }, [localStream]);

  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(prev => !prev);
    }
  }, [localStream]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track
      const videoTrack = screenStream.getVideoTracks()[0];
      if (localStream && videoTrack) {
        const sender = localStream.getVideoTracks()[0];
        // WebRTC peer connection would replace track here
        setIsScreenSharing(true);

        videoTrack.onended = () => {
          setIsScreenSharing(false);
          // Restore camera
        };
      }
    } catch (error) {
      console.error('Screen share failed:', error);
    }
  }, [localStream]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleVote = useCallback(async (voteId: string, choice: 'for' | 'against' | 'abstain') => {
    try {
      const response = await fetch(`/api/virtual-board-room/${sessionId}/voting/${voteId}/cast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          voteChoice: choice,
          deviceFingerprint: await generateDeviceFingerprint()
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Update vote status
        loadSessionData();
      }
    } catch (error) {
      console.error('Vote failed:', error);
    }
  }, [sessionId]);

  const generateDeviceFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('Device fingerprint', 10, 50);
    
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvas.toDataURL()
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fingerprint));
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Render components
  const renderParticipantGrid = () => {
    if (!sessionInfo) return null;

    const participants = sessionInfo.participants.filter(p => p.isPresent);
    const gridCols = Math.min(participants.length, isMobileView ? 2 : 4);

    return (
      <div className={`grid gap-2 h-full ${
        selectedLayout === 'grid' 
          ? `grid-cols-${gridCols}` 
          : 'grid-cols-1'
      }`}>
        {/* Local video */}
        <motion.div 
          className="relative bg-gray-900 rounded-lg overflow-hidden"
          layoutId="local-video"
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          <div className="absolute bottom-2 left-2 flex items-center space-x-2">
            <div className="bg-black bg-opacity-50 rounded-full p-1">
              <Crown className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
              You ({userRole})
            </span>
          </div>

          <div className="absolute bottom-2 right-2 flex space-x-1">
            {!isAudioEnabled && (
              <div className="bg-red-500 rounded-full p-1">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
            {!isVideoEnabled && (
              <div className="bg-red-500 rounded-full p-1">
                <VideoOff className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Remote participants */}
        {participants.map(participant => (
          <motion.div
            key={participant.id}
            className="relative bg-gray-800 rounded-lg overflow-hidden"
            layoutId={`participant-${participant.id}`}
          >
            <div className="w-full h-full flex items-center justify-center">
              {participant.videoEnabled ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <span className="text-white text-sm">{participant.name}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-2 left-2">
              <span className="text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                {participant.name}
              </span>
            </div>

            <div className="absolute top-2 left-2 flex space-x-1">
              {getRoleIcon(participant.role)}
              {getConnectionQualityIcon(participant.connectionQuality)}
            </div>

            <div className="absolute bottom-2 right-2 flex space-x-1">
              {!participant.audioEnabled && (
                <MicOff className="h-3 w-3 text-red-400" />
              )}
              {participant.isScreenSharing && (
                <Monitor className="h-3 w-3 text-green-400" />
              )}
              {participant.isSpeaking && (
                <div className="animate-pulse bg-green-500 rounded-full p-1">
                  <Volume2 className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  const renderControlBar = () => (
    <motion.div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 
                 bg-gray-900 bg-opacity-95 backdrop-blur-sm rounded-full p-2 
                 flex items-center space-x-2 z-50 ${
                   isMobileView ? 'scale-90' : ''
                 }`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      {/* Audio toggle */}
      <button
        onClick={toggleAudio}
        className={`p-3 rounded-full transition-colors ${
          isAudioEnabled 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      {/* Video toggle */}
      <button
        onClick={toggleVideo}
        className={`p-3 rounded-full transition-colors ${
          isVideoEnabled 
            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>

      {/* Screen share */}
      {['host', 'co_host', 'director'].includes(userRole) && (
        <button
          onClick={startScreenShare}
          className={`p-3 rounded-full transition-colors ${
            isScreenSharing 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          <Monitor className="h-5 w-5" />
        </button>
      )}

      {/* Recording status */}
      {sessionInfo?.recordingStatus === 'recording' && (
        <div className="flex items-center space-x-2 px-3 py-2 bg-red-500 rounded-full">
          <Record className="h-4 w-4 text-white animate-pulse" />
          <span className="text-white text-sm font-medium">REC</span>
        </div>
      )}

      {/* Layout toggle */}
      <button
        onClick={() => setSelectedLayout(prev => 
          prev === 'grid' ? 'speaker' : prev === 'speaker' ? 'presentation' : 'grid'
        )}
        className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
      >
        {selectedLayout === 'grid' && <Grid3X3 className="h-5 w-5" />}
        {selectedLayout === 'speaker' && <User className="h-5 w-5" />}
        {selectedLayout === 'presentation' && <Monitor className="h-5 w-5" />}
      </button>

      {/* Participants panel */}
      <button
        onClick={() => setActivePanel(activePanel === 'participants' ? null : 'participants')}
        className={`p-3 rounded-full transition-colors ${
          activePanel === 'participants'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        <Users className="h-5 w-5" />
      </button>

      {/* Chat panel */}
      <button
        onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
        className={`p-3 rounded-full transition-colors ${
          activePanel === 'chat'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        <MessageSquare className="h-5 w-5" />
      </button>

      {/* Voting panel */}
      {sessionInfo?.activeVotes && sessionInfo.activeVotes.length > 0 && (
        <button
          onClick={() => setActivePanel(activePanel === 'voting' ? null : 'voting')}
          className={`p-3 rounded-full transition-colors relative ${
            activePanel === 'voting'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          <Vote className="h-5 w-5" />
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {sessionInfo.activeVotes.length}
          </div>
        </button>
      )}

      {/* Leave session */}
      <button
        onClick={onLeaveSession}
        className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors ml-2"
      >
        <PhoneOff className="h-5 w-5" />
      </button>

      {/* Fullscreen toggle */}
      {!isMobileView && (
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
        >
          {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
        </button>
      )}
    </motion.div>
  );

  const renderSidePanel = () => {
    if (!activePanel) return null;

    return (
      <AnimatePresence>
        <motion.div
          className={`fixed right-0 top-0 h-full bg-white shadow-2xl z-40 ${
            isMobileView ? 'w-full' : 'w-80'
          }`}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          <div className="h-full flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900 capitalize">
                {activePanel}
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto">
              {activePanel === 'participants' && renderParticipantsPanel()}
              {activePanel === 'chat' && renderChatPanel()}
              {activePanel === 'voting' && renderVotingPanel()}
              {activePanel === 'documents' && renderDocumentsPanel()}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderParticipantsPanel = () => (
    <div className="p-4 space-y-4">
      {sessionInfo?.participants.map(participant => (
        <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              participant.isPresent ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {getRoleIcon(participant.role)}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              participant.isPresent ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{participant.name}</span>
              {participant.userId === userId && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="capitalize">{participant.role.replace('_', ' ')}</span>
              {getDeviceIcon(participant.deviceType)}
              {getConnectionQualityIcon(participant.connectionQuality)}
            </div>
          </div>

          <div className="flex space-x-1">
            {!participant.audioEnabled && (
              <MicOff className="h-4 w-4 text-red-400" />
            )}
            {!participant.videoEnabled && (
              <VideoOff className="h-4 w-4 text-red-400" />
            )}
            {participant.isScreenSharing && (
              <Monitor className="h-4 w-4 text-green-400" />
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderChatPanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        <div className="text-center text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2" />
          <p>Chat feature coming soon</p>
        </div>
      </div>
    </div>
  );

  const renderVotingPanel = () => (
    <div className="p-4 space-y-4">
      {sessionInfo?.activeVotes.map(vote => (
        <motion.div
          key={vote.id}
          className="border border-gray-200 rounded-lg p-4 bg-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-3">
            <h4 className="font-semibold text-gray-900 mb-1">{vote.title}</h4>
            {vote.description && (
              <p className="text-sm text-gray-600">{vote.description}</p>
            )}
          </div>

          {vote.status === 'active' && (
            <>
              {vote.timeRemaining && (
                <div className="flex items-center space-x-2 mb-3 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{Math.ceil(vote.timeRemaining / 60)} minutes remaining</span>
                </div>
              )}

              {!vote.userVote && (
                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={() => handleVote(vote.id, 'for')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    For
                  </button>
                  <button
                    onClick={() => handleVote(vote.id, 'against')}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Against
                  </button>
                  <button
                    onClick={() => handleVote(vote.id, 'abstain')}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    Abstain
                  </button>
                </div>
              )}

              {vote.userVote && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    You voted: <span className="font-medium capitalize">{vote.userVote}</span>
                  </p>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="bg-green-50 p-2 rounded">
              <div className="font-semibold text-green-800">{vote.votesFor}</div>
              <div className="text-green-600">For</div>
            </div>
            <div className="bg-red-50 p-2 rounded">
              <div className="font-semibold text-red-800">{vote.votesAgainst}</div>
              <div className="text-red-600">Against</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-semibold text-gray-800">{vote.abstentions}</div>
              <div className="text-gray-600">Abstain</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{vote.totalVotes} / {vote.requiredVotes} votes</span>
              <span className={`capitalize ${
                vote.status === 'active' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {vote.status}
              </span>
            </div>
          </div>
        </motion.div>
      ))}

      {(!sessionInfo?.activeVotes || sessionInfo.activeVotes.length === 0) && (
        <div className="text-center text-gray-500 py-8">
          <Vote className="h-8 w-8 mx-auto mb-2" />
          <p>No active votes</p>
        </div>
      )}
    </div>
  );

  const renderDocumentsPanel = () => (
    <div className="p-4">
      <div className="text-center text-gray-500 py-8">
        <FileText className="h-8 w-8 mx-auto mb-2" />
        <p>Documents feature coming soon</p>
      </div>
    </div>
  );

  // Helper functions
  const getRoleIcon = (role: Participant['role']) => {
    switch (role) {
      case 'host':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'co_host':
        return <Crown className="h-4 w-4 text-orange-500" />;
      case 'director':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'secretary':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'legal_counsel':
        return <Shield className="h-4 w-4 text-purple-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConnectionQualityIcon = (quality: Participant['connectionQuality']) => {
    switch (quality) {
      case 'excellent':
        return <div className="flex space-x-0.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-green-500 rounded-full" />
          ))}
        </div>;
      case 'good':
        return <div className="flex space-x-0.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-green-500 rounded-full" />
          ))}
          <div className="w-1 h-3 bg-gray-300 rounded-full" />
        </div>;
      case 'fair':
        return <div className="flex space-x-0.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-yellow-500 rounded-full" />
          ))}
          {[...Array(2)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-gray-300 rounded-full" />
          ))}
        </div>;
      case 'poor':
        return <div className="flex space-x-0.5">
          <div className="w-1 h-3 bg-red-500 rounded-full" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-3 bg-gray-300 rounded-full" />
          ))}
        </div>;
    }
  };

  const getDeviceIcon = (deviceType: Participant['deviceType']) => {
    switch (deviceType) {
      case 'desktop':
      case 'laptop':
        return <Laptop className="h-4 w-4 text-gray-500" />;
      case 'tablet':
      case 'mobile':
        return <Smartphone className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  if (!sessionInfo) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to board room...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 bg-gray-900 overflow-hidden">
      {/* Security alerts */}
      <AnimatePresence>
        {securityAlerts.map(alert => (
          <motion.div
            key={alert.id}
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
              alert.severity === 'critical' ? 'bg-red-100 border border-red-400 text-red-800' :
              alert.severity === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-800' :
              'bg-blue-100 border border-blue-400 text-blue-800'
            }`}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
          >
            <div className="flex items-start space-x-2">
              {alert.severity === 'critical' && <AlertTriangle className="h-5 w-5 mt-0.5" />}
              {alert.severity === 'warning' && <AlertTriangle className="h-5 w-5 mt-0.5" />}
              {alert.severity === 'info' && <CheckCircle className="h-5 w-5 mt-0.5" />}
              <div>
                <p className="font-medium">{alert.type}</p>
                <p className="text-sm">{alert.message}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main video area */}
      <div className={`h-full ${activePanel && !isMobileView ? 'pr-80' : ''} transition-all duration-300`}>
        <div className="h-full p-4">
          {renderParticipantGrid()}
        </div>
      </div>

      {/* Control bar */}
      {renderControlBar()}

      {/* Side panel */}
      {renderSidePanel()}

      {/* Session info overlay */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            sessionInfo.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`} />
          <span className="text-sm font-medium">{sessionInfo.name}</span>
          {sessionInfo.securityLevel === 'maximum' && (
            <Lock className="h-4 w-4 text-yellow-400" />
          )}
        </div>
      </div>
    </div>
  );
};

export default VirtualBoardRoomInterface;