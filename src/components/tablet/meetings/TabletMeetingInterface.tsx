'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TabletMeetingLayout } from '../layout/TabletMeetingLayout';
import { SplitViewContainer } from '../layout/SplitViewContainer';
import { FloatingActionPanel } from '../layout/FloatingActionPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock,
  Users,
  FileText,
  Scale,
  CheckSquare,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share,
  HandMetal,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Square,
  MoreHorizontal
} from 'lucide-react';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'ended';
  startTime: Date;
  endTime: Date;
  participants: Participant[];
  agenda: AgendaItem[];
  resolutions: Resolution[];
  actionables: Actionable[];
}

interface Participant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: 'present' | 'absent' | 'late';
  videoEnabled: boolean;
  micEnabled: boolean;
  handRaised: boolean;
}

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  status: 'pending' | 'active' | 'completed';
  presenter?: string;
  documents?: string[];
}

interface Resolution {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'voting' | 'passed' | 'failed';
  votes: { [participantId: string]: 'for' | 'against' | 'abstain' };
  requiredMajority: number;
}

interface Actionable {
  id: string;
  title: string;
  assignee: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
}

interface TabletMeetingInterfaceProps {
  meeting: Meeting;
  currentUserId: string;
  onMeetingAction: (action: string, data?: any) => void;
  className?: string;
}

export const TabletMeetingInterface: React.FC<TabletMeetingInterfaceProps> = ({
  meeting,
  currentUserId,
  onMeetingAction,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'agenda' | 'participants' | 'documents' | 'notes'>('agenda');
  const [meetingState, setMeetingState] = useState({
    currentAgendaItem: 0,
    meetingTimer: 0,
    userActions: {
      micEnabled: true,
      videoEnabled: true,
      handRaised: false,
      screenSharing: false
    }
  });
  const [floatingPanels, setFloatingPanels] = useState<Array<{
    id: string;
    type: string;
    visible: boolean;
    position?: { x: number; y: number };
  }>>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Meeting timer effect
  useEffect(() => {
    if (meeting.status === 'live') {
      timerRef.current = setInterval(() => {
        setMeetingState(prev => ({
          ...prev,
          meetingTimer: prev.meetingTimer + 1
        }));
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [meeting.status]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFloatingPanel = useCallback((panelId: string, type: string) => {
    setFloatingPanels(prev => {
      const existing = prev.find(p => p.id === panelId);
      if (existing) {
        return prev.map(p => p.id === panelId ? { ...p, visible: !p.visible } : p);
      }
      return [...prev, { id: panelId, type, visible: true }];
    });
  }, []);

  const handleUserAction = useCallback((action: string, data?: any) => {
    setMeetingState(prev => ({
      ...prev,
      userActions: {
        ...prev.userActions,
        [action]: data
      }
    }));
    onMeetingAction(action, data);
  }, [onMeetingAction]);

  // Sidebar content - Participant list and controls
  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-sm mb-3">Meeting Controls</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={meetingState.userActions.micEnabled ? "default" : "destructive"}
            size="sm"
            onClick={() => handleUserAction('micEnabled', !meetingState.userActions.micEnabled)}
            className="flex items-center space-x-1"
          >
            {meetingState.userActions.micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Button
            variant={meetingState.userActions.videoEnabled ? "default" : "destructive"}
            size="sm"
            onClick={() => handleUserAction('videoEnabled', !meetingState.userActions.videoEnabled)}
            className="flex items-center space-x-1"
          >
            {meetingState.userActions.videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button
            variant={meetingState.userActions.handRaised ? "default" : "outline"}
            size="sm"
            onClick={() => handleUserAction('handRaised', !meetingState.userActions.handRaised)}
            className="flex items-center space-x-1"
          >
            <HandMetal className="h-4 w-4" />
          </Button>
          <Button
            variant={meetingState.userActions.screenSharing ? "default" : "outline"}
            size="sm"
            onClick={() => handleUserAction('screenSharing', !meetingState.userActions.screenSharing)}
            className="flex items-center space-x-1"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <h3 className="font-semibold text-sm mb-3">Participants ({meeting.participants.length})</h3>
        <div className="space-y-2">
          {meeting.participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
            >
              <div className="relative">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  participant.status === 'present' ? "bg-green-100 text-green-700" : 
                  participant.status === 'late' ? "bg-yellow-100 text-yellow-700" : 
                  "bg-gray-100 text-gray-500"
                )}>
                  {participant.name.split(' ').map(n => n[0]).join('')}
                </div>
                {participant.handRaised && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                    <HandMetal className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{participant.name}</p>
                <p className="text-xs text-gray-500">{participant.role}</p>
              </div>
              <div className="flex space-x-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  participant.micEnabled ? "bg-green-500" : "bg-gray-300"
                )} />
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  participant.videoEnabled ? "bg-blue-500" : "bg-gray-300"
                )} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Left panel content - Agenda and Navigation
  const leftPanelContent = (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
          <TabsTrigger value="agenda" className="text-xs">Agenda</TabsTrigger>
          <TabsTrigger value="participants" className="text-xs">People</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Docs</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="agenda" className="h-full p-4 m-0">
            <div className="space-y-3">
              {meeting.agenda.map((item, index) => (
                <Card 
                  key={item.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    index === meetingState.currentAgendaItem && "ring-2 ring-blue-500 bg-blue-50",
                    item.status === 'completed' && "opacity-60"
                  )}
                  onClick={() => setMeetingState(prev => ({ ...prev, currentAgendaItem: index }))}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        item.status === 'completed' ? "bg-green-100 text-green-700" :
                        item.status === 'active' ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-500"
                      )}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {item.duration}min
                          </Badge>
                          {item.presenter && (
                            <span className="text-xs text-gray-500">{item.presenter}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="h-full p-4 m-0">
            <div className="space-y-2">
              {meeting.participants.map((participant) => (
                <Card key={participant.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                        participant.status === 'present' ? "bg-green-100 text-green-700" : 
                        "bg-gray-100 text-gray-500"
                      )}>
                        {participant.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{participant.name}</h4>
                        <p className="text-xs text-gray-500">{participant.role}</p>
                      </div>
                      <Badge variant={participant.status === 'present' ? "default" : "secondary"}>
                        {participant.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="h-full p-4 m-0">
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => toggleFloatingPanel('documents', 'document-viewer')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Open Document Viewer
              </Button>
              {meeting.agenda[meetingState.currentAgendaItem]?.documents?.map((doc, index) => (
                <Card key={index} className="cursor-pointer hover:bg-gray-50">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="text-sm truncate">{doc}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="h-full p-4 m-0">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toggleFloatingPanel('notes', 'meeting-notes')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Open Notes Panel
            </Button>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );

  // Right panel content - Voting and Resolutions
  const rightPanelContent = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-sm">Resolutions & Voting</h3>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {meeting.resolutions.map((resolution) => (
          <Card key={resolution.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm">{resolution.title}</h4>
                <Badge variant={
                  resolution.status === 'passed' ? 'default' : 
                  resolution.status === 'failed' ? 'destructive' : 
                  resolution.status === 'voting' ? 'secondary' : 'outline'
                }>
                  {resolution.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mb-3">{resolution.description}</p>
              
              {resolution.status === 'voting' && (
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    For
                  </Button>
                  <Button size="sm" variant="destructive">
                    Against
                  </Button>
                  <Button size="sm" variant="outline">
                    Abstain
                  </Button>
                </div>
              )}
              
              {resolution.status !== 'draft' && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Votes: {Object.keys(resolution.votes).length}</span>
                    <span>Required: {resolution.requiredMajority}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(Object.keys(resolution.votes).length / meeting.participants.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Bottom panel content - Action items and controls
  const bottomPanelContent = (
    <div className="h-full flex">
      <div className="flex-1 p-4">
        <h3 className="font-semibold text-sm mb-3">Action Items</h3>
        <div className="space-y-2">
          {meeting.actionables.map((actionable) => (
            <div key={actionable.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50">
              <CheckSquare className={cn(
                "h-4 w-4",
                actionable.status === 'completed' ? "text-green-500" : "text-gray-400"
              )} />
              <div className="flex-1">
                <p className="text-sm font-medium">{actionable.title}</p>
                <p className="text-xs text-gray-500">{actionable.assignee} • Due: {actionable.dueDate.toLocaleDateString()}</p>
              </div>
              <Badge variant={actionable.priority === 'high' ? 'destructive' : actionable.priority === 'medium' ? 'secondary' : 'outline'}>
                {actionable.priority}
              </Badge>
            </div>
          ))}
        </div>
      </div>
      
      <div className="w-px bg-gray-200" />
      
      <div className="w-64 p-4">
        <h3 className="font-semibold text-sm mb-3">Meeting Timeline</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="font-mono">{formatDuration(meetingState.meetingTimer)}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <Badge variant={meeting.status === 'live' ? 'default' : 'secondary'}>
              {meeting.status}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Current:</span>
            <span className="text-xs truncate max-w-20">
              {meeting.agenda[meetingState.currentAgendaItem]?.title}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2 mt-4">
          {meeting.status === 'live' ? (
            <Button size="sm" variant="outline" onClick={() => onMeetingAction('pause')}>
              <Pause className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => onMeetingAction('start')}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={() => onMeetingAction('end')}>
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Main content area
  const mainContent = (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Meeting Header */}
      <div className="bg-gray-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{meeting.title}</h1>
            <p className="text-sm text-gray-300">{meeting.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant={meeting.status === 'live' ? 'default' : 'secondary'}>
              {meeting.status.toUpperCase()}
            </Badge>
            <div className="text-right">
              <div className="text-sm font-mono">{formatDuration(meetingState.meetingTimer)}</div>
              <div className="text-xs text-gray-400">
                {meeting.startTime.toLocaleTimeString()} - {meeting.endTime.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video/Presentation Area */}
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        {meetingState.userActions.screenSharing ? (
          <div className="text-center text-white">
            <Share className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Screen sharing active</p>
          </div>
        ) : (
          <div className="text-center text-white">
            <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Meeting video will appear here</p>
            <p className="text-sm text-gray-400 mt-2">
              Current agenda item: {meeting.agenda[meetingState.currentAgendaItem]?.title}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("h-screen", className)}>
      <TabletMeetingLayout
        sidebar={sidebarContent}
        leftPanel={leftPanelContent}
        rightPanel={rightPanelContent}
        bottomPanel={bottomPanelContent}
      >
        {mainContent}
      </TabletMeetingLayout>

      {/* Floating Panels */}
      {floatingPanels.map((panel) => 
        panel.visible && (
          <FloatingActionPanel
            key={panel.id}
            title={panel.type === 'document-viewer' ? 'Document Viewer' : 'Meeting Notes'}
            onClose={() => setFloatingPanels(prev => prev.filter(p => p.id !== panel.id))}
            defaultPosition={panel.position || { x: 200, y: 200 }}
            defaultSize={{ width: 500, height: 400 }}
          >
            {panel.type === 'document-viewer' ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p>Document viewer interface</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p>Meeting notes interface</p>
              </div>
            )}
          </FloatingActionPanel>
        )
      )}
    </div>
  );
};

export default TabletMeetingInterface;