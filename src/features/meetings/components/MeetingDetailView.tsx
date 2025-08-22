'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { 
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
  Maximize2,
  Minimize2,
  Users,
  Calendar,
  FileText,
  BarChart3,
  MapPin,
  Settings,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { 
  MeetingId,
  MeetingDetailsResponse,
  createMeetingId 
} from '@/types/meeting-details';
import { MeetingDetailService } from '@/lib/services/meeting-detail.service';

// Component imports (to be created)
import { MeetingHeader } from './sections/MeetingHeader';
import { ParticipantsPanel } from './sections/ParticipantsPanel';
import { AgendaTimeline } from './sections/AgendaTimeline';
import { DocumentHub } from './sections/DocumentHub';
import { MinutesComposer } from './sections/MinutesComposer';
import { ResolutionsTracker } from './sections/ResolutionsTracker';
import { ActionablesKanban } from './sections/ActionablesKanban';
import { MeetingInsights } from './sections/MeetingInsights';
import { VenueLogistics } from './sections/VenueLogistics';

interface MeetingDetailViewProps {
  meetingId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const MeetingDetailView = React.memo(function MeetingDetailView({
  meetingId: propMeetingId,
  isModal = false,
  onClose
}: MeetingDetailViewProps) {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useOrganization();
  
  // Get meeting ID from props or URL params
  const meetingId = propMeetingId || (params?.id as string);
  
  // State management
  const [meetingData, setMeetingData] = useState<MeetingDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(!isModal);
  const [refreshKey, setRefreshKey] = useState(0);

  // Services (in real implementation, these would be injected via context or DI)
  const meetingDetailService = useMemo(() => {
    // This would typically be injected
    return new MeetingDetailService(null as any);
  }, []);

  // Load meeting data
  const loadMeetingData = useCallback(async () => {
    if (!meetingId || !currentOrganization) return;

    try {
      setLoading(true);
      setError(null);

      // For now, using mock data since service needs repository setup
      const mockData: MeetingDetailsResponse = {
        meeting: {
          id: createMeetingId(meetingId),
          organizationId: currentOrganization.id,
          title: 'Q4 Board Strategic Review',
          description: 'Comprehensive quarterly review of strategic initiatives, financial performance, and forward planning for the next fiscal year.',
          meetingType: 'board',
          status: 'in_progress',
          confidentiality: 'confidential',
          scheduledStart: '2024-03-15T10:00:00Z',
          scheduledEnd: '2024-03-15T14:00:00Z',
          actualStart: '2024-03-15T10:05:00Z',
          timezone: 'America/New_York',
          venue: {
            id: 'venue-1' as any,
            name: 'Executive Boardroom',
            address: '123 Corporate Plaza, Suite 4000',
            city: 'New York',
            country: 'United States',
            capacity: 20,
            facilities: ['Video Conferencing', 'Catering', 'Parking'],
            parkingAvailable: true,
            accessibilityFeatures: ['Wheelchair Access', 'Hearing Loop']
          },
          virtualMeetingUrl: 'https://zoom.us/j/123456789',
          isHybrid: true,
          organizerId: 'user-1' as any,
          chairpersonId: 'user-2' as any,
          secretaryId: 'user-3' as any,
          isRecorded: true,
          allowsAnonymousVoting: false,
          requiresQuorum: true,
          quorumThreshold: 0.6,
          createdAt: '2024-03-01T10:00:00Z',
          updatedAt: '2024-03-15T09:00:00Z',
          lastModifiedBy: 'user-1' as any
        },
        participants: [
          {
            id: 'participant-1' as any,
            userId: 'user-1' as any,
            meetingId: createMeetingId(meetingId),
            role: 'chairperson',
            attendanceStatus: 'accepted',
            presence: 'present',
            checkInTime: '2024-03-15T09:55:00Z',
            isVotingEligible: true,
            hasConflictOfInterest: false,
            notificationPreferences: {
              emailReminders: true,
              smsReminders: false,
              pushNotifications: true,
              documentUpdates: true,
              agendaChanges: true,
              reminderTiming: [60, 15]
            },
            invitedAt: '2024-03-01T10:00:00Z',
            respondedAt: '2024-03-01T12:30:00Z',
            user: {
              name: 'Sarah Johnson',
              email: 'sarah.johnson@company.com',
              avatarUrl: '/api/placeholder/40/40',
              title: 'Chief Executive Officer',
              organization: 'TechCorp Inc.'
            }
          },
          {
            id: 'participant-2' as any,
            userId: 'user-2' as any,
            meetingId: createMeetingId(meetingId),
            role: 'director',
            attendanceStatus: 'accepted',
            presence: 'virtual',
            checkInTime: '2024-03-15T10:02:00Z',
            isVotingEligible: true,
            hasConflictOfInterest: false,
            notificationPreferences: {
              emailReminders: true,
              smsReminders: true,
              pushNotifications: true,
              documentUpdates: true,
              agendaChanges: true,
              reminderTiming: [60, 30, 15]
            },
            invitedAt: '2024-03-01T10:00:00Z',
            respondedAt: '2024-03-01T11:15:00Z',
            user: {
              name: 'Michael Chen',
              email: 'michael.chen@company.com',
              avatarUrl: '/api/placeholder/40/40',
              title: 'Chief Financial Officer',
              organization: 'TechCorp Inc.'
            }
          }
          // Add more participants as needed
        ],
        agendaItems: [
          {
            id: 'agenda-1' as any,
            meetingId: createMeetingId(meetingId),
            orderIndex: 1,
            title: 'Opening Remarks & Attendance',
            description: 'Welcome, introductions, and confirmation of quorum',
            type: 'presentation',
            status: 'completed',
            presenterId: 'user-1' as any,
            estimatedDurationMinutes: 10,
            actualDurationMinutes: 8,
            startTime: '2024-03-15T10:05:00Z',
            endTime: '2024-03-15T10:13:00Z',
            attachments: [],
            hasMotion: false,
            createdAt: '2024-03-01T10:00:00Z',
            updatedAt: '2024-03-15T10:13:00Z'
          },
          {
            id: 'agenda-2' as any,
            meetingId: createMeetingId(meetingId),
            orderIndex: 2,
            title: 'Q4 Financial Review',
            description: 'Comprehensive review of Q4 financial performance and year-end results',
            type: 'presentation',
            status: 'in_progress',
            presenterId: 'user-2' as any,
            estimatedDurationMinutes: 45,
            actualDurationMinutes: undefined,
            startTime: '2024-03-15T10:13:00Z',
            attachments: ['doc-1', 'doc-2'] as any[],
            hasMotion: false,
            createdAt: '2024-03-01T10:00:00Z',
            updatedAt: '2024-03-15T10:13:00Z'
          }
        ],
        documents: [
          {
            id: 'doc-1' as any,
            meetingId: createMeetingId(meetingId),
            agendaItemId: 'agenda-2' as any,
            category: 'financial',
            title: 'Q4 Financial Report',
            description: 'Comprehensive financial analysis and performance metrics',
            fileName: 'Q4_Financial_Report.pdf',
            fileSize: 2048000,
            mimeType: 'application/pdf',
            version: 1,
            isConfidential: true,
            requiresSignature: false,
            downloadUrl: '/api/documents/doc-1/download',
            previewUrl: '/api/documents/doc-1/preview',
            thumbnailUrl: '/api/documents/doc-1/thumbnail',
            uploadedBy: 'user-2' as any,
            uploadedAt: '2024-03-10T15:30:00Z',
            lastModifiedAt: '2024-03-10T15:30:00Z'
          }
        ],
        analytics: {
          meetingId: createMeetingId(meetingId),
          duration: {
            scheduled: 240,
            actual: 0, // Still in progress
            efficiency: 0
          },
          participation: {
            totalInvited: 8,
            totalAttended: 6,
            attendanceRate: 0.75,
            averageSpeakingTime: 0,
            participationScore: 0.85
          },
          engagement: {
            questionsAsked: 3,
            documentsViewed: 12,
            commentsPosted: 2,
            sentimentScore: 0.78
          },
          decisions: {
            totalResolutions: 0,
            resolutionsPassed: 0,
            averageVotingTime: 0,
            consensusScore: 0
          },
          productivity: {
            agendaItemsCompleted: 1,
            actionItemsCreated: 0,
            followUpTasks: 0,
            productivityScore: 0.2
          }
        }
      };

      setMeetingData(mockData);
    } catch (err) {
      console.error('Error loading meeting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meeting data');
    } finally {
      setLoading(false);
    }
  }, [meetingId, currentOrganization, meetingDetailService]);

  // Load data on mount and when refreshKey changes
  useEffect(() => {
    loadMeetingData();
  }, [loadMeetingData, refreshKey]);

  // Refresh data
  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.push('/dashboard/meetings');
    }
  }, [onClose, router]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Loader2 className="h-12 w-12 mx-auto text-blue-600 animate-spin" />
            <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-ping" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading meeting details...</p>
          <p className="text-sm text-gray-500">Gathering all the essential information</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto p-6"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Meeting</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={refreshData} variant="outline">
              Try Again
            </Button>
            <Button onClick={handleBack}>
              Back to Meetings
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // No data state
  if (!meetingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Meeting not found</p>
          <Button onClick={handleBack} className="mt-4">
            Back to Meetings
          </Button>
        </div>
      </div>
    );
  }

  const containerClasses = cn(
    "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50",
    isModal && !isFullscreen && "min-h-[80vh]",
    isFullscreen && "fixed inset-0 z-50"
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={containerClasses}
    >
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center gap-2 hover:bg-white/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              className="bg-white/70 hover:bg-white/90"
            >
              <Eye className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            
            {isModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="bg-white/70 hover:bg-white/90"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="hover:bg-white/70"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Meeting Header */}
        <MeetingHeader meeting={meetingData.meeting} onRefresh={refreshData} />

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="grid w-full grid-cols-7 bg-white/70 backdrop-blur-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Participants</span>
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="minutes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Minutes</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="venue" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Venue</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <AgendaTimeline 
                    agendaItems={meetingData.agendaItems || []} 
                    onRefresh={refreshData}
                  />
                  <ResolutionsTracker 
                    meetingId={meetingData.meeting.id}
                    onRefresh={refreshData}
                  />
                </div>
                <div className="space-y-6">
                  <ParticipantsPanel 
                    participants={meetingData.participants || []}
                    onRefresh={refreshData}
                  />
                  <ActionablesKanban 
                    meetingId={meetingData.meeting.id}
                    onRefresh={refreshData}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="participants">
              <ParticipantsPanel 
                participants={meetingData.participants || []}
                onRefresh={refreshData}
                isFullView={true}
              />
            </TabsContent>

            <TabsContent value="agenda">
              <AgendaTimeline 
                agendaItems={meetingData.agendaItems || []}
                onRefresh={refreshData}
                isFullView={true}
              />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentHub 
                documents={meetingData.documents || []}
                meetingId={meetingData.meeting.id}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="minutes">
              <MinutesComposer 
                meeting={meetingData.meeting}
                minutes={meetingData.minutes}
                participants={meetingData.participants || []}
                agendaItems={meetingData.agendaItems || []}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="insights">
              <MeetingInsights 
                analytics={meetingData.analytics}
                meeting={meetingData.meeting}
                onRefresh={refreshData}
              />
            </TabsContent>

            <TabsContent value="venue">
              <VenueLogistics 
                meeting={meetingData.meeting}
                venue={meetingData.venue}
                onRefresh={refreshData}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </motion.div>
  );
});