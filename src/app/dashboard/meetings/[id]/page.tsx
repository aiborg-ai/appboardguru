'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { 
  Calendar,
  Clock,
  Users,
  FileText,
  Scale,
  CheckSquare,
  ArrowLeft,
  MapPin,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ResolutionsSection } from '@/features/meetings/components/ResolutionsSection';
import { ActionablesSection } from '@/features/meetings/components/ActionablesSection';
import { 
  MeetingResolution, 
  MeetingActionable,
  CreateResolutionRequest,
  CreateActionableRequest 
} from '@/types/meetings';
import Link from 'next/link';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  location?: string;
  virtualMeetingUrl?: string;
  createdBy?: string;
  organizationId?: string;
  attendeeCount?: number;
  rsvpCount?: number;
  agendaItemCount?: number;
  documentCount?: number;
  organizer?: {
    name: string;
    email: string;
  };
}

// Meeting configuration
const MEETING_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  postponed: { label: 'Postponed', color: 'bg-yellow-100 text-yellow-700' }
};

const MEETING_TYPE_LABELS = {
  agm: 'Annual General Meeting',
  board: 'Board Meeting',
  committee: 'Committee Meeting',
  other: 'Other Meeting'
};

// Mock meeting data - same as in the meetings list page
const MOCK_MEETINGS: Meeting[] = [
  {
    id: '1',
    title: 'Q4 Board Meeting',
    description: 'Quarterly board meeting to review financial performance and strategic initiatives',
    meetingType: 'board',
    status: 'scheduled',
    scheduledStart: '2024-03-15T10:00:00Z',
    scheduledEnd: '2024-03-15T12:00:00Z',
    location: 'Conference Room A',
    virtualMeetingUrl: 'https://zoom.us/j/123456789',
    attendeeCount: 8,
    rsvpCount: 6,
    agendaItemCount: 7,
    documentCount: 12,
    organizer: {
      name: 'John Doe',
      email: 'john.doe@company.com'
    }
  },
  {
    id: '2',
    title: '2024 Annual General Meeting',
    description: 'Annual shareholder meeting with board elections and annual report presentation',
    meetingType: 'agm',
    status: 'scheduled',
    scheduledStart: '2024-04-20T14:00:00Z',
    scheduledEnd: '2024-04-20T17:00:00Z',
    location: 'Grand Ballroom, Hotel Convention Center',
    virtualMeetingUrl: 'https://teams.microsoft.com/l/meetup-join/123',
    attendeeCount: 45,
    rsvpCount: 32,
    agendaItemCount: 9,
    documentCount: 8,
    organizer: {
      name: 'Jane Smith',
      email: 'jane.smith@company.com'
    }
  },
  {
    id: '3',
    title: 'Audit Committee Review',
    description: 'Monthly audit committee meeting to review financial controls and compliance',
    meetingType: 'committee',
    status: 'completed',
    scheduledStart: '2024-02-15T09:00:00Z',
    scheduledEnd: '2024-02-15T10:30:00Z',
    location: null,
    virtualMeetingUrl: 'https://zoom.us/j/987654321',
    attendeeCount: 5,
    rsvpCount: 5,
    agendaItemCount: 4,
    documentCount: 6,
    organizer: {
      name: 'Mike Wilson',
      email: 'mike.wilson@company.com'
    }
  },
  {
    id: '4',
    title: 'Strategic Planning Session',
    description: 'Quarterly strategic planning and goal setting session',
    meetingType: 'other',
    status: 'in_progress',
    scheduledStart: '2024-03-10T13:00:00Z',
    scheduledEnd: '2024-03-10T16:00:00Z',
    location: 'Executive Boardroom',
    virtualMeetingUrl: null,
    attendeeCount: 12,
    rsvpCount: 10,
    agendaItemCount: 5,
    documentCount: 15,
    organizer: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com'
    }
  }
];

export default function MeetingDetailsPage() {
  const params = useParams();
  const meetingId = params.id as string;
  const { currentOrganization } = useOrganization();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [resolutions, setResolutions] = useState<MeetingResolution[]>([]);
  const [actionables, setActionables] = useState<MeetingActionable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if current user can manage (is superuser or meeting organizer)
  const canManage = meeting && true; // Simplified for now - would need proper auth context

  useEffect(() => {
    if (meetingId) {
      loadMeetingData();
    }
  }, [meetingId]);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find meeting from mock data
      const foundMeeting = MOCK_MEETINGS.find(m => m.id === meetingId);
      
      if (!foundMeeting) {
        throw new Error('Meeting not found');
      }

      setMeeting(foundMeeting);
      
      // Set mock resolutions and actionables
      setResolutions([
        {
          id: '1',
          meetingId: meetingId,
          resolutionNumber: 'RES-2024-001',
          title: 'Approval of Q4 Financial Statements',
          description: 'Resolution to approve the Q4 2023 financial statements as presented by the CFO',
          proposedBy: 'John Doe',
          secondedBy: 'Jane Smith',
          status: 'draft',
          votingType: 'simple_majority',
          votesFor: 0,
          votesAgainst: 0,
          votesAbstain: 0,
          quorumRequired: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          meetingId: meetingId,
          resolutionNumber: 'RES-2024-002',
          title: 'Appointment of External Auditors',
          description: 'Resolution to appoint KPMG as external auditors for the fiscal year 2024',
          proposedBy: 'Mike Wilson',
          secondedBy: 'Sarah Johnson',
          status: 'passed',
          votingType: 'simple_majority',
          votesFor: 7,
          votesAgainst: 1,
          votesAbstain: 0,
          quorumRequired: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ] as MeetingResolution[]);
      
      setActionables([
        {
          id: '1',
          meetingId: meetingId,
          title: 'Prepare Q1 2024 Budget Forecast',
          description: 'Create detailed budget forecast for Q1 2024 including all departments',
          assignedTo: 'finance@company.com',
          assignedToName: 'Finance Team',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          status: 'pending',
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          meetingId: meetingId,
          title: 'Review and Update Risk Register',
          description: 'Comprehensive review of corporate risk register with updated mitigation strategies',
          assignedTo: 'compliance@company.com',
          assignedToName: 'Compliance Team',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          status: 'in_progress',
          completedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ] as MeetingActionable[]);

    } catch (err) {
      console.error('Error loading meeting data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResolution = async (data: CreateResolutionRequest) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/resolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create resolution');
      }

      // Reload resolutions
      const resolutionsRes = await fetch(`/api/meetings/${meetingId}/resolutions`);
      if (resolutionsRes.ok) {
        const resolutionsData = await resolutionsRes.json();
        setResolutions(resolutionsData.resolutions || []);
      }
    } catch (err) {
      console.error('Error creating resolution:', err);
      throw err;
    }
  };

  const handleUpdateResolution = async (id: string, data: Partial<MeetingResolution>) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/resolutions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update resolution');
      }

      // Update local state
      setResolutions(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (err) {
      console.error('Error updating resolution:', err);
      throw err;
    }
  };

  const handleDeleteResolution = async (id: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/resolutions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete resolution');
      }

      // Remove from local state
      setResolutions(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Error deleting resolution:', err);
      throw err;
    }
  };

  const handleCreateActionable = async (data: CreateActionableRequest) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/actionables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create actionable');
      }

      // Reload actionables
      const actionablesRes = await fetch(`/api/meetings/${meetingId}/actionables`);
      if (actionablesRes.ok) {
        const actionablesData = await actionablesRes.json();
        setActionables(actionablesData.actionables || []);
      }
    } catch (err) {
      console.error('Error creating actionable:', err);
      throw err;
    }
  };

  const handleUpdateActionable = async (id: string, data: Partial<MeetingActionable>) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/actionables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to update actionable');
      }

      // Update local state
      setActionables(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    } catch (err) {
      console.error('Error updating actionable:', err);
      throw err;
    }
  };

  const handleDeleteActionable = async (id: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/actionables/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete actionable');
      }

      // Remove from local state
      setActionables(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting actionable:', err);
      throw err;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadMeetingData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-gray-600">Meeting not found</p>
        </div>
      </div>
    );
  }

  const startDateTime = formatDateTime(meeting.scheduledStart);
  const duration = getDuration(meeting.scheduledStart, meeting.scheduledEnd);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/meetings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Meetings
          </Button>
        </Link>
      </div>

      {/* Meeting Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  className={cn(
                    "text-sm",
                    MEETING_STATUS_CONFIG[meeting.status as keyof typeof MEETING_STATUS_CONFIG]?.color || 'bg-gray-100 text-gray-700'
                  )}
                >
                  {MEETING_STATUS_CONFIG[meeting.status as keyof typeof MEETING_STATUS_CONFIG]?.label || meeting.status}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {MEETING_TYPE_LABELS[meeting.meetingType as keyof typeof MEETING_TYPE_LABELS] || meeting.meetingType}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{meeting.title}</CardTitle>
              {meeting.description && (
                <p className="text-gray-600 mt-2">{meeting.description}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{startDateTime.date}</p>
                <p className="text-sm text-gray-500">{startDateTime.time}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">{duration}</p>
                <p className="text-sm text-gray-500">Duration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {meeting.location && meeting.virtualMeetingUrl ? (
                <>
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Hybrid</p>
                    <p className="text-sm text-gray-500">In-person + Virtual</p>
                  </div>
                </>
              ) : meeting.location ? (
                <>
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">In-person</p>
                    <p className="text-sm text-gray-500">{meeting.location}</p>
                  </div>
                </>
              ) : (
                <>
                  <Video className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Virtual</p>
                    <p className="text-sm text-gray-500">Online meeting</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Additional Meeting Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            {meeting.attendeeCount && (
              <div className="text-center">
                <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold">{meeting.rsvpCount || 0}/{meeting.attendeeCount}</p>
                <p className="text-xs text-gray-500">Confirmed Attendees</p>
              </div>
            )}
            {meeting.agendaItemCount !== undefined && (
              <div className="text-center">
                <CheckSquare className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold">{meeting.agendaItemCount}</p>
                <p className="text-xs text-gray-500">Agenda Items</p>
              </div>
            )}
            {meeting.documentCount !== undefined && (
              <div className="text-center">
                <FileText className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold">{meeting.documentCount}</p>
                <p className="text-xs text-gray-500">Documents</p>
              </div>
            )}
            {meeting.organizer && (
              <div className="text-center">
                <Users className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                <p className="text-sm font-medium">{meeting.organizer.name}</p>
                <p className="text-xs text-gray-500">Organizer</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Resolutions and Actionables */}
      <Tabs defaultValue="resolutions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resolutions" className="flex items-center space-x-2">
            <Scale className="h-4 w-4" />
            <span>Resolutions ({resolutions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="actionables" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>Actionables ({actionables.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="resolutions" className="mt-6">
          <ResolutionsSection
            meetingId={meetingId}
            resolutions={resolutions}
            canManage={canManage || false}
            onCreateResolution={handleCreateResolution}
            onUpdateResolution={handleUpdateResolution}
            onDeleteResolution={handleDeleteResolution}
          />
        </TabsContent>
        
        <TabsContent value="actionables" className="mt-6">
          <ActionablesSection
            meetingId={meetingId}
            actionables={actionables}
            canManage={canManage || false}
            onCreateActionable={handleCreateActionable}
            onUpdateActionable={handleUpdateActionable}
            onDeleteActionable={handleDeleteActionable}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}