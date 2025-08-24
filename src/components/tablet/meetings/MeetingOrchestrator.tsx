'use client';

import React, { useState, useCallback, useEffect, useReducer } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabletMeetingInterface } from './TabletMeetingInterface';
import { RealTimeSync } from '../sync/RealTimeSync';
import { TabletGestureHandler } from '../gestures/TabletGestureHandler';
import { IPadOptimizedContainer } from '../platform/IPadOptimizations';
import { AndroidOptimizedContainer } from '../platform/AndroidOptimizations';
import { useDeviceDetection } from '../platform/PlatformDetection';
import { 
  Play,
  Pause,
  Square,
  Clock,
  Users,
  FileText,
  Vote,
  MessageSquare,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap,
  Activity
} from 'lucide-react';

// Meeting state management
interface MeetingState {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'paused' | 'ended';
  startTime: Date;
  endTime: Date;
  currentAgendaItem: number;
  participants: Participant[];
  agenda: AgendaItem[];
  resolutions: Resolution[];
  actionables: Actionable[];
  documents: Document[];
  settings: MeetingSettings;
  stats: MeetingStats;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'present' | 'absent' | 'late';
  joinedAt?: Date;
  leftAt?: Date;
  permissions: string[];
  votingPower: number;
  deviceInfo?: {
    platform: string;
    device: string;
    browser: string;
  };
}

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  presenter?: string;
  duration: number; // minutes
  status: 'pending' | 'active' | 'completed' | 'skipped';
  startTime?: Date;
  endTime?: Date;
  documents?: string[];
  notes?: string;
}

interface Resolution {
  id: string;
  title: string;
  description: string;
  type: 'simple' | 'special' | 'unanimous';
  status: 'draft' | 'voting' | 'passed' | 'failed' | 'withdrawn';
  votingStarted?: Date;
  votingEnds?: Date;
  requiredMajority: number;
  votes: { [participantId: string]: Vote };
  result?: {
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
    passed: boolean;
    finalizedAt: Date;
  };
}

interface Vote {
  option: 'for' | 'against' | 'abstain';
  timestamp: Date;
  confidence?: number;
  proxy?: boolean;
  proxyGrantor?: string;
}

interface Actionable {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

interface Document {
  id: string;
  title: string;
  type: 'pdf' | 'word' | 'excel' | 'powerpoint' | 'image';
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  annotations?: any[];
}

interface MeetingSettings {
  allowAnonymousVoting: boolean;
  allowProxyVoting: boolean;
  autoRecording: boolean;
  transcriptionEnabled: boolean;
  allowLateJoin: boolean;
  requireAuthentication: boolean;
  maxParticipants: number;
  votingTimeout: number; // minutes
  agendaItemTimeout: number; // minutes
}

interface MeetingStats {
  totalDuration: number; // minutes
  participantCount: number;
  documentsShared: number;
  resolutionsVoted: number;
  actionablesCreated: number;
  averageParticipationRate: number;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// Meeting actions
type MeetingAction =
  | { type: 'START_MEETING' }
  | { type: 'PAUSE_MEETING' }
  | { type: 'RESUME_MEETING' }
  | { type: 'END_MEETING' }
  | { type: 'ADD_PARTICIPANT'; participant: Participant }
  | { type: 'REMOVE_PARTICIPANT'; participantId: string }
  | { type: 'UPDATE_PARTICIPANT'; participantId: string; updates: Partial<Participant> }
  | { type: 'NEXT_AGENDA_ITEM' }
  | { type: 'PREVIOUS_AGENDA_ITEM' }
  | { type: 'SET_AGENDA_ITEM'; index: number }
  | { type: 'CREATE_RESOLUTION'; resolution: Omit<Resolution, 'id'> }
  | { type: 'START_VOTING'; resolutionId: string }
  | { type: 'CAST_VOTE'; resolutionId: string; participantId: string; vote: Vote }
  | { type: 'END_VOTING'; resolutionId: string }
  | { type: 'CREATE_ACTIONABLE'; actionable: Omit<Actionable, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'UPDATE_ACTIONABLE'; actionableId: string; updates: Partial<Actionable> }
  | { type: 'SYNC_EVENT'; event: any };

// Meeting reducer
const meetingReducer = (state: MeetingState, action: MeetingAction): MeetingState => {
  switch (action.type) {
    case 'START_MEETING':
      return {
        ...state,
        status: 'live',
        startTime: new Date()
      };

    case 'PAUSE_MEETING':
      return {
        ...state,
        status: 'paused'
      };

    case 'RESUME_MEETING':
      return {
        ...state,
        status: 'live'
      };

    case 'END_MEETING':
      return {
        ...state,
        status: 'ended',
        endTime: new Date()
      };

    case 'ADD_PARTICIPANT':
      return {
        ...state,
        participants: [...state.participants, { ...action.participant, joinedAt: new Date() }],
        stats: {
          ...state.stats,
          participantCount: state.participants.length + 1
        }
      };

    case 'REMOVE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(p =>
          p.id === action.participantId
            ? { ...p, status: 'absent' as const, leftAt: new Date() }
            : p
        )
      };

    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map(p =>
          p.id === action.participantId
            ? { ...p, ...action.updates }
            : p
        )
      };

    case 'NEXT_AGENDA_ITEM':
      const nextIndex = Math.min(state.currentAgendaItem + 1, state.agenda.length - 1);
      return {
        ...state,
        currentAgendaItem: nextIndex,
        agenda: state.agenda.map((item, index) => ({
          ...item,
          status: index === state.currentAgendaItem ? 'completed' :
                 index === nextIndex ? 'active' : item.status
        }))
      };

    case 'PREVIOUS_AGENDA_ITEM':
      const prevIndex = Math.max(state.currentAgendaItem - 1, 0);
      return {
        ...state,
        currentAgendaItem: prevIndex,
        agenda: state.agenda.map((item, index) => ({
          ...item,
          status: index === state.currentAgendaItem ? 'pending' :
                 index === prevIndex ? 'active' : item.status
        }))
      };

    case 'SET_AGENDA_ITEM':
      return {
        ...state,
        currentAgendaItem: action.index,
        agenda: state.agenda.map((item, index) => ({
          ...item,
          status: index === action.index ? 'active' :
                 index < action.index ? 'completed' : 'pending'
        }))
      };

    case 'CREATE_RESOLUTION':
      const newResolution: Resolution = {
        ...action.resolution,
        id: `res_${Date.now()}`,
        votes: {}
      };
      return {
        ...state,
        resolutions: [...state.resolutions, newResolution]
      };

    case 'START_VOTING':
      return {
        ...state,
        resolutions: state.resolutions.map(r =>
          r.id === action.resolutionId
            ? {
                ...r,
                status: 'voting' as const,
                votingStarted: new Date(),
                votingEnds: new Date(Date.now() + state.settings.votingTimeout * 60 * 1000)
              }
            : r
        )
      };

    case 'CAST_VOTE':
      return {
        ...state,
        resolutions: state.resolutions.map(r =>
          r.id === action.resolutionId
            ? {
                ...r,
                votes: {
                  ...r.votes,
                  [action.participantId]: action.vote
                }
              }
            : r
        )
      };

    case 'END_VOTING':
      const resolution = state.resolutions.find(r => r.id === action.resolutionId);
      if (!resolution) return state;

      const votes = Object.values(resolution.votes);
      const forVotes = votes.filter(v => v.option === 'for').length;
      const againstVotes = votes.filter(v => v.option === 'against').length;
      const abstainVotes = votes.filter(v => v.option === 'abstain').length;
      const totalEligible = state.participants.filter(p => p.status === 'present').length;
      const forPercentage = totalEligible > 0 ? (forVotes / totalEligible) * 100 : 0;

      return {
        ...state,
        resolutions: state.resolutions.map(r =>
          r.id === action.resolutionId
            ? {
                ...r,
                status: forPercentage >= r.requiredMajority ? 'passed' : 'failed',
                result: {
                  forVotes,
                  againstVotes,
                  abstainVotes,
                  passed: forPercentage >= r.requiredMajority,
                  finalizedAt: new Date()
                }
              }
            : r
        ),
        stats: {
          ...state.stats,
          resolutionsVoted: state.stats.resolutionsVoted + 1
        }
      };

    case 'CREATE_ACTIONABLE':
      const newActionable: Actionable = {
        ...action.actionable,
        id: `act_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return {
        ...state,
        actionables: [...state.actionables, newActionable],
        stats: {
          ...state.stats,
          actionablesCreated: state.stats.actionablesCreated + 1
        }
      };

    case 'UPDATE_ACTIONABLE':
      return {
        ...state,
        actionables: state.actionables.map(a =>
          a.id === action.actionableId
            ? { ...a, ...action.updates, updatedAt: new Date() }
            : a
        )
      };

    case 'SYNC_EVENT':
      // Handle real-time sync events
      return state; // Implementation would depend on event type

    default:
      return state;
  }
};

interface MeetingOrchestratorProps {
  meetingId: string;
  currentUserId: string;
  initialMeetingState: MeetingState;
  className?: string;
}

export const MeetingOrchestrator: React.FC<MeetingOrchestratorProps> = ({
  meetingId,
  currentUserId,
  initialMeetingState,
  className
}) => {
  const [meetingState, dispatch] = useReducer(meetingReducer, initialMeetingState);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const deviceInfo = useDeviceDetection();

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem(`meeting_${meetingId}`, JSON.stringify(meetingState));
    }, 30000); // Save every 30 seconds

    return () => clearInterval(timer);
  }, [meetingId, meetingState]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`meeting_${meetingId}`);
    if (saved) {
      try {
        const savedState = JSON.parse(saved);
        // Apply saved state if it's newer
        if (new Date(savedState.updatedAt) > new Date(initialMeetingState.stats.totalDuration)) {
          // Dispatch multiple actions to restore state
          // This would need proper implementation
        }
      } catch (error) {
        console.error('Failed to load saved meeting state:', error);
      }
    }
  }, [meetingId, initialMeetingState]);

  // Meeting control handlers
  const handleMeetingAction = useCallback((action: string, data?: any) => {
    switch (action) {
      case 'start':
        dispatch({ type: 'START_MEETING' });
        break;
      case 'pause':
        dispatch({ type: 'PAUSE_MEETING' });
        break;
      case 'resume':
        dispatch({ type: 'RESUME_MEETING' });
        break;
      case 'end':
        dispatch({ type: 'END_MEETING' });
        break;
      case 'next_agenda':
        dispatch({ type: 'NEXT_AGENDA_ITEM' });
        break;
      case 'previous_agenda':
        dispatch({ type: 'PREVIOUS_AGENDA_ITEM' });
        break;
      case 'set_agenda':
        dispatch({ type: 'SET_AGENDA_ITEM', index: data });
        break;
      default:
        console.warn('Unknown meeting action:', action);
    }
  }, []);

  // Real-time sync handlers
  const handleSyncEvent = useCallback((event: any) => {
    dispatch({ type: 'SYNC_EVENT', event });
  }, []);

  const handlePresenceUpdate = useCallback((presence: Map<string, any>) => {
    // Update participant presence based on sync data
    presence.forEach((info, userId) => {
      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId: userId,
        updates: {
          status: info.status === 'online' ? 'present' : 'absent'
        }
      });
    });
  }, []);

  // Voting handlers
  const handleVoteCreate = useCallback((resolutionData: any) => {
    dispatch({
      type: 'CREATE_RESOLUTION',
      resolution: resolutionData
    });
  }, []);

  const handleVoteCast = useCallback((resolutionId: string, vote: Vote) => {
    dispatch({
      type: 'CAST_VOTE',
      resolutionId,
      participantId: currentUserId,
      vote
    });
  }, [currentUserId]);

  // Actionable handlers
  const handleActionableCreate = useCallback((actionableData: any) => {
    dispatch({
      type: 'CREATE_ACTIONABLE',
      actionable: actionableData
    });
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Gesture handlers
  const gestureHandlers = {
    onSwipe: (event: any) => {
      const { direction } = event.detail;
      switch (direction) {
        case 'left':
          handleMeetingAction('next_agenda');
          break;
        case 'right':
          handleMeetingAction('previous_agenda');
          break;
        case 'up':
          setShowDiagnostics(true);
          break;
        case 'down':
          setShowDiagnostics(false);
          break;
      }
    },
    onDoubleTap: () => {
      toggleFullscreen();
    },
    onLongPress: () => {
      setShowDiagnostics(!showDiagnostics);
    }
  };

  // Platform-specific shortcuts
  const shortcuts = [
    {
      name: 'Start Meeting',
      url: `/meeting/${meetingId}?action=start`,
      icon: Play,
      description: 'Quick start meeting'
    },
    {
      name: 'Join Meeting',
      url: `/meeting/${meetingId}?action=join`,
      icon: Users,
      description: 'Join ongoing meeting'
    },
    {
      name: 'View Agenda',
      url: `/meeting/${meetingId}?view=agenda`,
      icon: FileText,
      description: 'Show meeting agenda'
    }
  ];

  const handoffConfig = {
    activityType: 'com.boardguru.meeting',
    title: `${meetingState.title} - BoardGuru Meeting`,
    webpageURL: `${window.location.origin}/meeting/${meetingId}`,
    userInfo: {
      meetingId,
      currentUserId,
      status: meetingState.status
    }
  };

  // Main meeting interface
  const meetingInterface = (
    <TabletMeetingInterface
      meeting={meetingState}
      currentUserId={currentUserId}
      onMeetingAction={handleMeetingAction}
      className="h-full"
    />
  );

  // Diagnostics overlay
  const diagnosticsOverlay = showDiagnostics && (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <Card className="w-96 max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Meeting Diagnostics</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDiagnostics(false)}
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Meeting Stats */}
          <div>
            <h4 className="font-semibold mb-2">Meeting Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Status: <Badge>{meetingState.status}</Badge></div>
              <div>Duration: {meetingState.stats.totalDuration}m</div>
              <div>Participants: {meetingState.stats.participantCount}</div>
              <div>Resolutions: {meetingState.stats.resolutionsVoted}</div>
              <div>Action Items: {meetingState.stats.actionablesCreated}</div>
              <div>Network: <Badge variant={
                meetingState.stats.networkQuality === 'excellent' ? 'default' :
                meetingState.stats.networkQuality === 'good' ? 'secondary' :
                meetingState.stats.networkQuality === 'fair' ? 'outline' : 'destructive'
              }>{meetingState.stats.networkQuality}</Badge></div>
            </div>
          </div>

          {/* Device Info */}
          <div>
            <h4 className="font-semibold mb-2">Device Information</h4>
            <div className="text-sm space-y-1">
              <div>Platform: {deviceInfo.platform}</div>
              <div>Device: {deviceInfo.device}</div>
              <div>Browser: {deviceInfo.browser}</div>
              <div>Screen: {deviceInfo.screenSize.width}×{deviceInfo.screenSize.height}</div>
              <div>Orientation: {deviceInfo.orientation}</div>
              <div>Touch: {deviceInfo.isTouchDevice ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Real-time Sync */}
          <RealTimeSync
            meetingId={meetingId}
            currentUserId={currentUserId}
            onSyncEvent={handleSyncEvent}
            onPresenceUpdate={handlePresenceUpdate}
            onConnectionStatusChange={(status) => console.log('Connection:', status)}
          />
        </CardContent>
      </Card>
    </div>
  );

  // Platform-specific wrapper
  const PlatformContainer = deviceInfo.device === 'iPad' ? IPadOptimizedContainer : AndroidOptimizedContainer;

  return (
    <TabletGestureHandler {...gestureHandlers} className={cn("h-screen", className)}>
      <PlatformContainer
        className="h-full"
        shortcuts={shortcuts}
        handoffConfig={handoffConfig}
      >
        {meetingInterface}
        {diagnosticsOverlay}
        
        {/* Quick Controls */}
        <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-40">
          {meetingState.status === 'live' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMeetingAction('pause')}
              className="bg-white shadow-lg"
            >
              <Pause className="h-4 w-4" />
            </Button>
          ) : meetingState.status === 'paused' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMeetingAction('resume')}
              className="bg-white shadow-lg"
            >
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleMeetingAction('start')}
              className="shadow-lg"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-white shadow-lg"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="bg-white shadow-lg"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </PlatformContainer>
    </TabletGestureHandler>
  );
};

export default MeetingOrchestrator;