'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  FileText,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface MeetingCreatedSuccessProps {
  meeting: {
    id: string;
    title: string;
    description?: string;
    meeting_type: string;
    meeting_number: string;
    scheduled_start: string;
    scheduled_end: string;
    timezone: string;
    location?: string;
    virtual_meeting_url?: string;
    is_hybrid: boolean;
    attendee_count: number;
    agenda_item_count: number;
    organization?: {
      name: string;
      slug: string;
    };
  };
  onClose?: () => void;
  onSendInvites?: () => void;
  onCreateAnother?: () => void;
}

export default function MeetingCreatedSuccess({
  meeting,
  onClose,
  onSendInvites,
  onCreateAnother
}: MeetingCreatedSuccessProps) {
  const router = useRouter();
  const { toast } = useToast();

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
    if (minutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meeting.meeting_number);
    toast({
      title: 'Meeting ID copied',
      description: `${meeting.meeting_number} has been copied to your clipboard`,
      variant: 'success',
    });
  };

  const handleViewMeeting = () => {
    router.push(`/dashboard/meetings/${meeting.id}`);
  };

  const handleGoToMeetings = () => {
    router.push('/dashboard/meetings');
  };

  const startDateTime = formatDateTime(meeting.scheduled_start);
  const duration = getDuration(meeting.scheduled_start, meeting.scheduled_end);

  const getMeetingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      agm: 'Annual General Meeting',
      board: 'Board Meeting',
      committee: 'Committee Meeting',
      other: 'Meeting'
    };
    return labels[type] || 'Meeting';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardContent className="p-8">
          {/* Success Icon and Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Meeting Created Successfully!
            </h1>
            
            <p className="text-gray-600">
              Your {getMeetingTypeLabel(meeting.meeting_type).toLowerCase()} has been scheduled and saved.
            </p>
          </div>

          {/* Meeting Details Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {meeting.title}
                </h2>
                {meeting.description && (
                  <p className="text-gray-600 text-sm mb-3">
                    {meeting.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white">
                    {getMeetingTypeLabel(meeting.meeting_type)}
                  </Badge>
                  <Badge variant="outline" className="bg-white">
                    ID: {meeting.meeting_number}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyMeetingId}
                className="text-gray-600 hover:text-gray-900"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid gap-3 mt-4">
              {/* Date and Time */}
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm">{startDateTime.date}</span>
              </div>
              
              <div className="flex items-center gap-3 text-gray-700">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {startDateTime.time} ({duration}) - {meeting.timezone}
                </span>
              </div>

              {/* Location */}
              {meeting.location && (
                <div className="flex items-center gap-3 text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{meeting.location}</span>
                </div>
              )}

              {/* Virtual Meeting */}
              {meeting.virtual_meeting_url && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Video className="w-4 h-4 text-gray-500" />
                  <a
                    href={meeting.virtual_meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    Join virtual meeting
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Statistics */}
              <div className="flex gap-6 mt-2">
                {meeting.attendee_count > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{meeting.attendee_count} invitees</span>
                  </div>
                )}
                {meeting.agenda_item_count > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">{meeting.agenda_item_count} agenda items</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Meeting invitations will be sent to all attendees automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Reminders will be sent 7 days and 1 day before the meeting</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>You can manage agenda items and documents from the meeting page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Attendees can RSVP and access meeting materials online</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleViewMeeting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Meeting Details
            </Button>
            
            {onSendInvites && (
              <Button
                onClick={onSendInvites}
                variant="outline"
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Invitations Now
              </Button>
            )}
            
            <Button
              onClick={handleGoToMeetings}
              variant="outline"
              className="flex-1"
            >
              Go to Meetings List
            </Button>
          </div>

          {/* Create Another Link */}
          {onCreateAnother && (
            <div className="text-center mt-6">
              <button
                onClick={onCreateAnother}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Create another meeting
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}