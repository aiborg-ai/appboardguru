'use client';

import React from 'react';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
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
  Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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

interface MeetingListViewProps {
  meetings: Meeting[];
}

export const MeetingListView = React.memo(function MeetingListView({
  meetings
}: MeetingListViewProps) {
  const router = useRouter();
  
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
    <>
      <div className="space-y-3">
        {meetings.map((meeting) => {
        const statusConfig = MEETING_STATUS_CONFIG[meeting.status];
        const StatusIcon = statusConfig.icon;
        const dateTime = formatDateTime(meeting.scheduledStart);
        const duration = getDuration(meeting.scheduledStart, meeting.scheduledEnd);
        
        return (
          <Card key={meeting.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {/* Left content */}
                <div className="flex items-center space-x-4 flex-1">
                  {/* Status indicator */}
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      meeting.status === 'scheduled' && 'bg-blue-500',
                      meeting.status === 'in_progress' && 'bg-green-500',
                      meeting.status === 'completed' && 'bg-purple-500',
                      meeting.status === 'cancelled' && 'bg-red-500',
                      meeting.status === 'postponed' && 'bg-yellow-500',
                      meeting.status === 'draft' && 'bg-gray-400'
                    )} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {meeting.title}
                      </h3>
                      <Badge className={cn("text-xs", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {MEETING_TYPE_LABELS[meeting.meetingType]}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {meeting.description}
                    </p>
                  </div>

                  {/* Date & Time */}
                  <div className="hidden md:flex items-center space-x-2 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{dateTime.date}</span>
                      <br />
                      <span className="text-gray-500">{dateTime.time}</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{duration}</span>
                  </div>

                  {/* Location */}
                  <div className="hidden lg:flex items-center space-x-2 flex-shrink-0">
                    {meeting.location && meeting.virtualMeetingUrl ? (
                      <>
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Hybrid</span>
                      </>
                    ) : meeting.location ? (
                      <>
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">In-person</span>
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Virtual</span>
                      </>
                    )}
                  </div>

                  {/* Attendees */}
                  <div className="hidden xl:flex items-center space-x-2 flex-shrink-0">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {meeting.rsvpCount}/{meeting.attendeeCount}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="hidden xl:flex items-center space-x-3 text-xs text-gray-500 flex-shrink-0">
                    <span>{meeting.agendaItemCount} agenda</span>
                    <span>{meeting.documentCount} docs</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">View Details</span>
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile info */}
              <div className="md:hidden mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{dateTime.date} • {dateTime.time}</span>
                    <span>{duration}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span>{meeting.rsvpCount}/{meeting.attendeeCount} attending</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </>
  );
});