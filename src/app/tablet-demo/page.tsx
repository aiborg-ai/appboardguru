'use client';

import React, { useState, useCallback } from 'react';
import { 
  MeetingOrchestrator,
  TabletDocumentViewer,
  TabletVotingInterface,
  CollaborativeWhiteboard,
  RealTimeComments,
  useDeviceDetection,
  DEFAULT_TABLET_CONFIG,
  SUPPORTED_FEATURES
} from '@/components/tablet';
import { Button } from '@/features/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Badge } from '@/features/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { 
  Tablet,
  Play,
  FileText,
  Vote,
  PenTool,
  MessageSquare,
  Settings,
  Smartphone,
  Monitor,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

// Demo meeting data
const demoMeetingState = {
  id: 'demo-meeting-001',
  title: 'Q4 2024 Board Meeting',
  description: 'Quarterly review and strategic planning session',
  status: 'scheduled' as const,
  startTime: new Date(),
  endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
  currentAgendaItem: 0,
  participants: [
    {
      id: 'user-1',
      name: 'John Smith',
      role: 'Chairman',
      status: 'present' as const,
      permissions: ['vote', 'manage', 'present'],
      votingPower: 1
    },
    {
      id: 'user-2', 
      name: 'Sarah Johnson',
      role: 'CEO',
      status: 'present' as const,
      permissions: ['vote', 'present'],
      votingPower: 1
    },
    {
      id: 'user-3',
      name: 'Michael Chen',
      role: 'CFO',
      status: 'present' as const,
      permissions: ['vote'],
      votingPower: 1
    },
    {
      id: 'user-4',
      name: 'Lisa Williams',
      role: 'Board Member',
      status: 'late' as const,
      permissions: ['vote'],
      votingPower: 1
    }
  ],
  agenda: [
    {
      id: 'agenda-1',
      title: 'Q4 Financial Review',
      presenter: 'Michael Chen',
      duration: 30,
      status: 'active' as const,
      documents: ['financial-report.pdf']
    },
    {
      id: 'agenda-2',
      title: 'Strategic Initiatives Update',
      presenter: 'Sarah Johnson',
      duration: 45,
      status: 'pending' as const,
      documents: ['strategy-deck.pptx']
    },
    {
      id: 'agenda-3',
      title: 'Board Resolution: Budget Approval',
      presenter: 'John Smith',
      duration: 20,
      status: 'pending' as const
    }
  ],
  resolutions: [
    {
      id: 'res-1',
      title: 'Approve 2025 Budget',
      description: 'Approval of the proposed $50M budget for fiscal year 2025',
      type: 'simple' as const,
      status: 'draft' as const,
      requiredMajority: 50,
      votes: {}
    }
  ],
  actionables: [
    {
      id: 'act-1',
      title: 'Prepare Q1 2025 Marketing Plan',
      assignee: 'Sarah Johnson',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'open' as const,
      priority: 'high' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  documents: [
    {
      id: 'doc-1',
      title: 'Q4 Financial Report.pdf',
      type: 'pdf' as const,
      url: '/demo-document.pdf',
      size: 2048000,
      uploadedBy: 'Michael Chen',
      uploadedAt: new Date()
    }
  ],
  settings: {
    allowAnonymousVoting: false,
    allowProxyVoting: true,
    autoRecording: true,
    transcriptionEnabled: true,
    allowLateJoin: true,
    requireAuthentication: true,
    maxParticipants: 20,
    votingTimeout: 10,
    agendaItemTimeout: 60
  },
  stats: {
    totalDuration: 0,
    participantCount: 4,
    documentsShared: 1,
    resolutionsVoted: 0,
    actionablesCreated: 1,
    averageParticipationRate: 85,
    networkQuality: 'excellent' as const
  }
};

const demoResolution = {
  id: 'demo-res-1',
  title: 'Approve 2025 Budget Allocation',
  description: 'This resolution seeks approval for the proposed $50 million budget allocation for fiscal year 2025, with emphasis on digital transformation initiatives and market expansion.',
  type: 'simple' as const,
  status: 'voting' as const,
  votingStarted: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  votingEnds: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
  requiredMajority: 50,
  totalEligibleVoters: 4,
  anonymousVoting: false,
  allowProxy: true,
  votes: {
    'user-1': { option: 'for' as const, timestamp: new Date(), confidence: 5 },
    'user-2': { option: 'for' as const, timestamp: new Date(), confidence: 4 }
  },
  history: [
    { timestamp: new Date(), action: 'started' as const, participant: 'John Smith' }
  ]
};

const demoComments = [
  {
    id: 'comment-1',
    content: 'The budget allocation looks comprehensive. I particularly appreciate the focus on digital initiatives.',
    author: {
      id: 'user-2',
      name: 'Sarah Johnson',
      role: 'CEO'
    },
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    reactions: { '👍': ['user-1', 'user-3'] },
    status: 'active' as const
  },
  {
    id: 'comment-2',
    content: 'Should we consider increasing the marketing budget given the expansion plans?',
    author: {
      id: 'user-3',
      name: 'Michael Chen',
      role: 'CFO'
    },
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    mentions: ['user-2'],
    reactions: { '🤔': ['user-2'] },
    status: 'active' as const
  }
];

const demoCollaborators = [
  {
    id: 'user-1',
    name: 'John Smith',
    color: '#3B82F6',
    isActive: true
  },
  {
    id: 'user-2',
    name: 'Sarah Johnson', 
    color: '#EF4444',
    isActive: true
  },
  {
    id: 'user-3',
    name: 'Michael Chen',
    color: '#10B981',
    isActive: false
  }
];

export default function TabletDemoPage() {
  const [activeDemo, setActiveDemo] = useState<'meeting' | 'document' | 'voting' | 'whiteboard' | 'comments'>('meeting');
  const [currentUserId] = useState('user-1');
  const deviceInfo = useDeviceDetection();

  // Demo handlers
  const handleMeetingAction = useCallback((action: string, data?: any) => {
    console.log('Meeting action:', action, data);
  }, []);

  const handleVote = useCallback((resolutionId: string, vote: any) => {
    console.log('Vote cast:', resolutionId, vote);
  }, []);

  const handleManageVoting = useCallback((resolutionId: string, action: string, data?: any) => {
    console.log('Manage voting:', resolutionId, action, data);
  }, []);

  const handleAnnotationCreate = useCallback((annotation: any) => {
    console.log('Annotation created:', annotation);
  }, []);

  const handleCommentCreate = useCallback((content: string, parentId?: string, mentions?: string[]) => {
    console.log('Comment created:', content, parentId, mentions);
  }, []);

  const handleElementCreate = useCallback((element: any) => {
    console.log('Whiteboard element created:', element);
  }, []);

  const handleCursorMove = useCallback((cursor: any) => {
    console.log('Cursor moved:', cursor);
  }, []);

  const getDeviceIcon = () => {
    switch (deviceInfo.device) {
      case 'iPad':
        return <Tablet className="h-5 w-5 text-blue-600" />;
      case 'Android Tablet':
        return <Tablet className="h-5 w-5 text-green-600" />;
      case 'Surface':
        return <Tablet className="h-5 w-5 text-purple-600" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-600" />;
    }
  };

  const renderDemo = () => {
    switch (activeDemo) {
      case 'meeting':
        return (
          <MeetingOrchestrator
            meetingId={demoMeetingState.id}
            currentUserId={currentUserId}
            initialMeetingState={demoMeetingState}
            className="h-full"
          />
        );

      case 'document':
        return (
          <TabletDocumentViewer
            documentUrl="/demo-document.pdf"
            documentTitle="Q4 Financial Report"
            annotations={[]}
            collaborators={demoCollaborators}
            currentUserId={currentUserId}
            onAnnotationCreate={handleAnnotationCreate}
            onAnnotationUpdate={() => {}}
            onAnnotationDelete={() => {}}
            className="h-full"
          />
        );

      case 'voting':
        return (
          <TabletVotingInterface
            resolution={demoResolution}
            participants={demoMeetingState.participants}
            currentUserId={currentUserId}
            canManage={true}
            onVote={handleVote}
            onManageVoting={handleManageVoting}
            className="h-full"
          />
        );

      case 'whiteboard':
        return (
          <CollaborativeWhiteboard
            meetingId={demoMeetingState.id}
            currentUserId={currentUserId}
            collaborators={demoCollaborators}
            onElementCreate={handleElementCreate}
            onElementUpdate={() => {}}
            onElementDelete={() => {}}
            onCursorMove={handleCursorMove}
            className="h-full"
          />
        );

      case 'comments':
        return (
          <RealTimeComments
            meetingId={demoMeetingState.id}
            currentUserId={currentUserId}
            comments={demoComments}
            participants={demoMeetingState.participants}
            onCommentCreate={handleCommentCreate}
            onCommentUpdate={() => {}}
            onCommentDelete={() => {}}
            onCommentReact={() => {}}
            onCommentPin={() => {}}
            onCommentResolve={() => {}}
            onCommentPrivacy={() => {}}
            className="h-full"
          />
        );

      default:
        return <div>Select a demo from the tabs above</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Tablet className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Tablet Demo</h1>
              </div>
              <Badge variant="secondary">BoardGuru Meeting Interface</Badge>
            </div>
            
            {/* Device Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {getDeviceIcon()}
                <span>{deviceInfo.device} • {deviceInfo.platform}</span>
              </div>
              {deviceInfo.isTablet ? (
                <Badge variant="default">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Tablet Optimized
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Info className="h-3 w-3 mr-1" />
                  Desktop Preview
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Feature Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>Tablet-Optimized Features</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(SUPPORTED_FEATURES).map(([key, supported]) => (
                <div key={key} className="flex items-center space-x-2">
                  {supported ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Demo Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Interactive Demos</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeDemo} onValueChange={(value) => setActiveDemo(value as any)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="meeting" className="flex items-center space-x-1">
                  <Play className="h-4 w-4" />
                  <span>Meeting</span>
                </TabsTrigger>
                <TabsTrigger value="document" className="flex items-center space-x-1">
                  <FileText className="h-4 w-4" />
                  <span>Document</span>
                </TabsTrigger>
                <TabsTrigger value="voting" className="flex items-center space-x-1">
                  <Vote className="h-4 w-4" />
                  <span>Voting</span>
                </TabsTrigger>
                <TabsTrigger value="whiteboard" className="flex items-center space-x-1">
                  <PenTool className="h-4 w-4" />
                  <span>Whiteboard</span>
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>Comments</span>
                </TabsTrigger>
              </TabsList>

              {/* Demo Content */}
              <div className="mt-6 border rounded-lg overflow-hidden">
                <div className="h-[600px] bg-white">
                  <TabsContent value="meeting" className="h-full m-0">
                    {renderDemo()}
                  </TabsContent>
                  <TabsContent value="document" className="h-full m-0">
                    {renderDemo()}
                  </TabsContent>
                  <TabsContent value="voting" className="h-full m-0">
                    {renderDemo()}
                  </TabsContent>
                  <TabsContent value="whiteboard" className="h-full m-0">
                    {renderDemo()}
                  </TabsContent>
                  <TabsContent value="comments" className="h-full m-0">
                    {renderDemo()}
                  </TabsContent>
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <span>How to Use</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Touch Gestures</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Swipe left/right:</strong> Navigate agenda items</li>
                  <li>• <strong>Double tap:</strong> Toggle fullscreen</li>
                  <li>• <strong>Long press:</strong> Show diagnostics</li>
                  <li>• <strong>Pinch to zoom:</strong> Scale document viewer</li>
                  <li>• <strong>Two-finger tap:</strong> Context menu</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Platform Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>iPad:</strong> Stage Manager, Split View, Apple Pencil</li>
                  <li>• <strong>Android:</strong> Multi-window, DeX mode, Material Design</li>
                  <li>• <strong>All platforms:</strong> Real-time sync, offline mode</li>
                  <li>• <strong>Enterprise:</strong> MDM integration, compliance tracking</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Best experienced on tablets:</strong> This demo is optimized for iPad, Android tablets, and Surface devices. 
                Touch interactions, gesture recognition, and platform-specific features work best on actual tablet hardware.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}