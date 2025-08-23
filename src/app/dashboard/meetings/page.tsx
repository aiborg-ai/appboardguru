'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { SearchInput } from '@/components/molecules/forms/SearchInput/SearchInput';
import { 
  Plus,
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRouter } from 'next/navigation';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { MeetingCardsView } from '@/features/meetings/components/views/MeetingCardsView';
import { MeetingListView } from '@/features/meetings/components/views/MeetingListView';
import { MeetingDetailsView } from '@/features/meetings/components/views/MeetingDetailsView';

// Mock meeting data
const MOCK_MEETINGS = [
  {
    id: '1',
    title: 'Q4 Board Meeting',
    description: 'Quarterly board meeting to review financial performance and strategic initiatives',
    meetingType: 'board' as const,
    status: 'scheduled' as const,
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
    meetingType: 'agm' as const,
    status: 'scheduled' as const,
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
    meetingType: 'committee' as const,
    status: 'completed' as const,
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
    meetingType: 'other' as const,
    status: 'in_progress' as const,
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

const MEETING_TYPE_LABELS = {
  agm: 'AGM',
  board: 'Board',
  committee: 'Committee',
  other: 'Other'
};

const MEETING_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  postponed: { label: 'Postponed', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle }
};

export default function MeetingsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const { currentOrganization } = useOrganization();
  const router = useRouter();

  const filteredMeetings = MOCK_MEETINGS.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    const matchesType = filterType === 'all' || meeting.meetingType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateMeeting = () => {
    router.push('/dashboard/meetings/create');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        month: 'short', 
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            Meetings
            <InfoTooltip
              content={
                <InfoSection
                  title="Meeting Management & Compliance"
                  description="Comprehensive meeting management system designed for board governance, regulatory compliance, and executive coordination."
                  features={[
                    "AGM, Board, and Committee meeting support",
                    "Automated compliance tracking and reporting",
                    "Digital agenda management with approvals",
                    "Attendee RSVP and presence tracking",
                    "Meeting minutes with digital signatures",
                    "Document distribution and version control",
                    "Action item tracking and follow-up",
                    "Regulatory reporting and audit trails",
                    "Hybrid meeting support (in-person + virtual)"
                  ]}
                  tips={[
                    "Use meeting templates for consistent agendas",
                    "Track attendance for compliance requirements",
                    "Set up automatic document distribution",
                    "Enable digital signatures for quick approvals",
                    "Use action item tracking for accountability"
                  ]}
                />
              }
              side="right"
            />
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and organize your board meetings, AGMs, and committee sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateMeeting}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Meeting</span>
          </Button>
          <InfoTooltip
            content="Create new board meetings, AGMs, committee sessions, or other governance meetings. Includes agenda templates, attendee management, and compliance tracking."
            size="sm"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold">
                  {MOCK_MEETINGS.filter(m => m.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Attendees</p>
                <p className="text-2xl font-bold">
                  {MOCK_MEETINGS.reduce((sum, m) => sum + m.attendeeCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">
                  {MOCK_MEETINGS.filter(m => m.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold">6</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onSearch={setSearchTerm}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="agm">AGM</option>
                <option value="board">Board</option>
                <option value="committee">Committee</option>
                <option value="other">Other</option>
              </select>

              <div className="flex items-center gap-2">
                <ViewToggle
                  currentView={viewMode}
                  onViewChange={setViewMode}
                />
                <InfoTooltip
                  content="Switch between Cards view for visual overview, List view for quick scanning, or Details view for comprehensive meeting information and compliance data."
                  size="sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meetings Views */}
      <div>
        {filteredMeetings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No meetings found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first meeting'
                }
              </p>
              {(!searchTerm && filterStatus === 'all' && filterType === 'all') && (
                <Button onClick={handleCreateMeeting}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'cards' && <MeetingCardsView meetings={filteredMeetings} />}
            {viewMode === 'list' && <MeetingListView meetings={filteredMeetings} />}
            {viewMode === 'details' && <MeetingDetailsView meetings={filteredMeetings} />}
          </>
        )}
      </div>

    </div>
  );
}