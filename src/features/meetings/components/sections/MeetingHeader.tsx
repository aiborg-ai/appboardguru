'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  Globe,
  Phone,
  Copy,
  Share2,
  Download,
  ExternalLink,
  Play,
  Pause,
  StopCircle,
  Settings,
  Shield,
  Eye,
  EyeOff,
  Record,
  Mic,
  MicOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MeetingDetailsFull } from '@/types/meeting-details';

const MEETING_TYPE_CONFIG = {
  agm: {
    label: 'Annual General Meeting',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Globe
  },
  board: {
    label: 'Board Meeting',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Shield
  },
  committee: {
    label: 'Committee Meeting',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Users
  },
  emergency: {
    label: 'Emergency Meeting',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: Clock
  },
  special: {
    label: 'Special Meeting',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Calendar
  },
  other: {
    label: 'Other Meeting',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Calendar
  }
};

const MEETING_STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-700',
    pulseColor: '',
    canStart: false
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-100 text-blue-700',
    pulseColor: 'bg-blue-400',
    canStart: true
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-green-100 text-green-700',
    pulseColor: 'bg-green-400',
    canStart: false
  },
  completed: {
    label: 'Completed',
    color: 'bg-purple-100 text-purple-700',
    pulseColor: '',
    canStart: false
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
    pulseColor: '',
    canStart: false
  },
  postponed: {
    label: 'Postponed',
    color: 'bg-yellow-100 text-yellow-700',
    pulseColor: 'bg-yellow-400',
    canStart: false
  }
};

const CONFIDENTIALITY_CONFIG = {
  public: {
    label: 'Public',
    color: 'bg-green-100 text-green-800',
    icon: Eye
  },
  confidential: {
    label: 'Confidential',
    color: 'bg-yellow-100 text-yellow-800',
    icon: EyeOff
  },
  restricted: {
    label: 'Restricted',
    color: 'bg-orange-100 text-orange-800',
    icon: Shield
  },
  board_only: {
    label: 'Board Only',
    color: 'bg-red-100 text-red-800',
    icon: Shield
  }
};

interface MeetingHeaderProps {
  meeting: MeetingDetailsFull;
  onRefresh: () => void;
  onStartMeeting?: () => void;
  onEndMeeting?: () => void;
  onJoinMeeting?: () => void;
}

export const MeetingHeader = React.memo(function MeetingHeader({
  meeting,
  onRefresh,
  onStartMeeting,
  onEndMeeting,
  onJoinMeeting
}: MeetingHeaderProps) {
  const [copied, setCopied] = useState(false);

  // Computed values
  const typeConfig = MEETING_TYPE_CONFIG[meeting.meetingType];
  const statusConfig = MEETING_STATUS_CONFIG[meeting.status];
  const confidentialityConfig = CONFIDENTIALITY_CONFIG[meeting.confidentiality];
  const TypeIcon = typeConfig.icon;
  const ConfidentialityIcon = confidentialityConfig.icon;

  const formatDateTime = useCallback((dateString: string) => {
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
        hour12: true,
        timeZoneName: 'short'
      })
    };
  }, []);

  const getDuration = useCallback(() => {
    const start = new Date(meeting.scheduledStart);
    const end = new Date(meeting.scheduledEnd);
    const durationMs = end.getTime() - start.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${hours}h ${minutes}m`;
  }, [meeting.scheduledStart, meeting.scheduledEnd]);

  const getTimeUntilMeeting = useCallback(() => {
    const now = new Date();
    const start = new Date(meeting.scheduledStart);
    const diffMs = start.getTime() - now.getTime();
    
    if (diffMs <= 0) return null;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days} ${days === 1 ? 'day' : 'days'}`;
    if (hours > 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }, [meeting.scheduledStart]);

  const startDateTime = formatDateTime(meeting.scheduledStart);
  const endDateTime = formatDateTime(meeting.scheduledEnd);
  const duration = getDuration();
  const timeUntil = getTimeUntilMeeting();

  // Actions
  const copyMeetingLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  }, []);

  const joinVirtualMeeting = useCallback(() => {
    if (meeting.virtualMeetingUrl) {
      window.open(meeting.virtualMeetingUrl, '_blank');
    }
    onJoinMeeting?.();
  }, [meeting.virtualMeetingUrl, onJoinMeeting]);

  const shareMeeting = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: meeting.title,
        text: meeting.description,
        url: window.location.href
      });
    } else {
      copyMeetingLink();
    }
  }, [meeting.title, meeting.description, copyMeetingLink]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden bg-gradient-to-r from-white via-blue-50 to-indigo-50 border-0 shadow-xl">
        <CardContent className="p-0">
          {/* Hero Banner */}
          <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-black/10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30" />
            </div>

            <div className="relative px-8 py-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Meeting Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className={cn("text-sm font-medium", typeConfig.color)}>
                      <TypeIcon className="h-4 w-4 mr-1" />
                      {typeConfig.label}
                    </Badge>
                    
                    <div className="relative">
                      <Badge className={cn("text-sm font-medium", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                      {statusConfig.pulseColor && (
                        <div className={cn(
                          "absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse",
                          statusConfig.pulseColor
                        )} />
                      )}
                    </div>

                    <Badge className={cn("text-sm font-medium", confidentialityConfig.color)}>
                      <ConfidentialityIcon className="h-4 w-4 mr-1" />
                      {confidentialityConfig.label}
                    </Badge>

                    {meeting.isRecorded && (
                      <Badge className="bg-red-100 text-red-800 text-sm font-medium">
                        <Record className="h-4 w-4 mr-1" />
                        Recording
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                    {meeting.title}
                  </h1>
                  
                  <p className="text-blue-100 text-lg leading-relaxed max-w-3xl">
                    {meeting.description}
                  </p>

                  {timeUntil && meeting.status === 'scheduled' && (
                    <div className="mt-4 flex items-center gap-2 text-yellow-200">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Starts in {timeUntil}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col lg:flex-row gap-3">
                  {meeting.virtualMeetingUrl && (
                    <Button
                      onClick={joinVirtualMeeting}
                      size="lg"
                      className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
                    >
                      <Video className="h-5 w-5 mr-2" />
                      Join Meeting
                    </Button>
                  )}

                  {statusConfig.canStart && onStartMeeting && (
                    <Button
                      onClick={onStartMeeting}
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Meeting
                    </Button>
                  )}

                  {meeting.status === 'in_progress' && onEndMeeting && (
                    <Button
                      onClick={onEndMeeting}
                      size="lg"
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                    >
                      <StopCircle className="h-5 w-5 mr-2" />
                      End Meeting
                    </Button>
                  )}

                  <Button
                    onClick={shareMeeting}
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Meeting Details Grid */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date & Time */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100"
              >
                <div className="p-2 rounded-lg bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Date & Time</h3>
                  <p className="text-sm text-gray-700 mb-1">{startDateTime.date}</p>
                  <p className="text-sm text-blue-600 font-medium">{startDateTime.time}</p>
                  <p className="text-xs text-gray-500 mt-1">Duration: {duration}</p>
                </div>
              </motion.div>

              {/* Location */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-green-50 border border-green-100"
              >
                <div className="p-2 rounded-lg bg-green-100">
                  {meeting.isHybrid ? (
                    <Globe className="h-5 w-5 text-green-600" />
                  ) : meeting.venue ? (
                    <MapPin className="h-5 w-5 text-green-600" />
                  ) : (
                    <Video className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                  {meeting.isHybrid ? (
                    <div>
                      <p className="text-sm text-gray-700">Hybrid Meeting</p>
                      <p className="text-xs text-green-600 font-medium">In-person + Virtual</p>
                    </div>
                  ) : meeting.venue ? (
                    <div>
                      <p className="text-sm text-gray-700">In-Person</p>
                      <p className="text-xs text-green-600 font-medium">{meeting.venue.name}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700">Virtual Only</p>
                      <p className="text-xs text-green-600 font-medium">Online Meeting</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Quorum Status */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-purple-50 border border-purple-100"
              >
                <div className="p-2 rounded-lg bg-purple-100">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Quorum</h3>
                  {meeting.requiresQuorum ? (
                    <div>
                      <p className="text-sm text-gray-700">Required</p>
                      <p className="text-xs text-purple-600 font-medium">
                        {Math.round(meeting.quorumThreshold * 100)}% threshold
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-700">Not Required</p>
                      <p className="text-xs text-purple-600 font-medium">Open attendance</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Meeting Controls */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 border border-orange-100"
              >
                <div className="p-2 rounded-lg bg-orange-100">
                  <Settings className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Quick Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={copyMeetingLink}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      {copied ? (
                        <>✓ Copied</>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});