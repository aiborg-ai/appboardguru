'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Separator } from '@/features/shared/ui/separator';
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Eye,
  MoreVertical,
  CheckCircle,
  Edit,
  XCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Building,
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

const MEETING_TYPE_LABELS = {
  agm: 'Annual General Meeting',
  board: 'Board Meeting',
  committee: 'Committee Meeting',
  other: 'Other Meeting'
};

const MEETING_STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Edit },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar },
  in_progress: { label: 'In Progress', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  postponed: { label: 'Postponed', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle }
};

interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingType: 'agm' | 'board' | 'committee' | 'other';
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
  scheduledStart: string;
  scheduledEnd: string;
  location: string | null;
  virtualMeetingUrl: string | null;
  attendeeCount: number;
  rsvpCount: number;
  agendaItemCount: number;
  documentCount: number;
  organizer: {
    name: string;
    email: string;
  };
}

interface MeetingDetailsViewProps {
  meetings: Meeting[];
}

export const MeetingDetailsView = React.memo(function MeetingDetailsView({
  meetings
}: MeetingDetailsViewProps) {
  const router = useRouter();
  
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }),
      shortDate: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    };
  };

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate.getTime() - startDate.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} minutes`;
  };

  const getAttendanceRate = (rsvp: number, total: number) => {
    return Math.round((rsvp / total) * 100);
  };

  return (
    <>
      <div className="space-y-6">
        {meetings.map((meeting) => {
        const statusConfig = MEETING_STATUS_CONFIG[meeting.status];
        const StatusIcon = statusConfig.icon;
        const dateTime = formatDateTime(meeting.scheduledStart);
        const endDateTime = formatDateTime(meeting.scheduledEnd);
        const duration = getDuration(meeting.scheduledStart, meeting.scheduledEnd);
        const attendanceRate = getAttendanceRate(meeting.rsvpCount, meeting.attendeeCount);
        
        return (
          <Card key={meeting.id} className="overflow-hidden">
            {/* Header */}
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge className={cn("text-sm", statusConfig.color)}>
                      <StatusIcon className="h-4 w-4 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {MEETING_TYPE_LABELS[meeting.meetingType]}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-gray-900">{meeting.title}</CardTitle>
                  <p className="text-gray-600 mt-2">{meeting.description}</p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Core Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Schedule Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Details
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Start Time</p>
                          <p className="font-medium text-gray-900">{dateTime.date}</p>
                          <p className="text-sm text-blue-600">{dateTime.time}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">End Time</p>
                          <p className="font-medium text-gray-900">{endDateTime.shortDate}</p>
                          <p className="text-sm text-blue-600">{endDateTime.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-gray-700">Duration: <strong>{duration}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Location Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location & Access
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {meeting.location && meeting.virtualMeetingUrl ? (
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-900">Physical Location</p>
                              <p className="text-sm text-gray-600">{meeting.location}</p>
                            </div>
                          </div>
                          <Separator />
                          <div className="flex items-start space-x-3">
                            <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-900">Virtual Meeting</p>
                              <p className="text-sm text-blue-600 cursor-pointer hover:underline">
                                Join virtual meeting
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : meeting.location ? (
                        <div className="flex items-start space-x-3">
                          <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">In-Person Meeting</p>
                            <p className="text-sm text-gray-600">{meeting.location}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start space-x-3">
                          <Video className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Virtual Meeting Only</p>
                            <p className="text-sm text-blue-600 cursor-pointer hover:underline">
                              Join virtual meeting
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Organizer Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Meeting Organizer
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {meeting.organizer.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{meeting.organizer.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{meeting.organizer.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Statistics */}
                <div className="space-y-6">
                  {/* Attendance */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Attendance</h4>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-center mb-3">
                        <div className="text-2xl font-bold text-green-600">
                          {meeting.rsvpCount}/{meeting.attendeeCount}
                        </div>
                        <p className="text-sm text-gray-600">Confirmed Attendees</p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${attendanceRate}%` }}
                        />
                      </div>
                      <p className="text-center text-sm text-gray-600">{attendanceRate}% attendance rate</p>
                    </div>
                  </div>

                  {/* Content Summary */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Content Overview</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-700">Agenda Items</span>
                        </div>
                        <span className="font-semibold text-blue-600">{meeting.agendaItemCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-gray-700">Documents</span>
                        </div>
                        <span className="font-semibold text-purple-600">{meeting.documentCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setSelectedMeetingId(meeting.id)}
                      >
                        <Maximize2 className="h-4 w-4 mr-2" />
                        Open Full View
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        View Agenda
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Attendees
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Meeting Notes
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeetingId && (
        <MeetingDetailView
          meetingId={selectedMeetingId}
          isModal={true}
          onClose={() => setSelectedMeetingId(null)}
        />
      )}
    </>
  );
});