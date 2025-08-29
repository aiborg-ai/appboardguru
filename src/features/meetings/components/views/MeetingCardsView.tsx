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

interface MeetingCardsViewProps {
  meetings: Meeting[];
}

export const MeetingCardsView = React.memo(function MeetingCardsView({
  meetings
}: MeetingCardsViewProps) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.map((meeting) => {
        const statusConfig = MEETING_STATUS_CONFIG[meeting.status];
        const StatusIcon = statusConfig.icon;
        const dateTime = formatDateTime(meeting.scheduledStart);
        const duration = getDuration(meeting.scheduledStart, meeting.scheduledEnd);
        
        return (
          <Card key={meeting.id} className="hover:shadow-lg transition-all duration-200 group">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge className={cn("text-xs", statusConfig.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {MEETING_TYPE_LABELS[meeting.meetingType]}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {meeting.title}
                  </h3>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {meeting.description}
              </p>

              {/* Date & Time */}
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div className="text-sm">
                  <span className="font-medium text-gray-900">{dateTime.date}</span>
                  <span className="text-gray-500 ml-2">{dateTime.time}</span>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-900">{duration}</span>
              </div>

              {/* Location */}
              <div className="flex items-center space-x-2 mb-4">
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {meeting.rsvpCount}/{meeting.attendeeCount} attending
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {[...Array(Math.min(3, meeting.rsvpCount))].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-xs text-white font-medium"
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  {meeting.rsvpCount > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs text-gray-600 font-medium">
                      +{meeting.rsvpCount - 3}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                <span>{meeting.agendaItemCount} agenda items</span>
                <span>{meeting.documentCount} documents</span>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => router.push(`/dashboard/meetings/${meeting.id}`)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
        })}
      </div>
    </>
  );
});