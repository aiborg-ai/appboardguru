/**
 * Meeting Card Molecule Component
 * Displays a board meeting with status, details, and action buttons
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MeetingStatusBadge, type MeetingStatus } from '../atoms/MeetingStatusBadge'
import { cn } from '@/lib/utils'
import { 
  Calendar, 
  MapPin, 
  Video, 
  FileText, 
  Mic, 
  CheckSquare, 
  Clock,
  MoreHorizontal,
  Users
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BoardMeeting {
  id: string
  meeting_title: string
  meeting_type: 'regular' | 'special' | 'annual' | 'emergency'
  scheduled_date: string
  actual_start_time?: string
  actual_end_time?: string
  location?: string
  is_virtual: boolean
  virtual_meeting_url?: string
  status: MeetingStatus
  agenda_id?: string
  minutes_id?: string
  recording_url?: string
  created_by: string
}

interface MeetingCardProps {
  meeting: BoardMeeting
  onStartTranscription?: (meetingId: string) => void
  onGenerateMinutes?: (meetingId: string) => void
  onGenerateAgenda?: (meetingId: string) => void
  onExtractActionItems?: (meetingId: string) => void
  onViewDetails?: (meetingId: string) => void
  onEdit?: (meetingId: string) => void
  className?: string
  compact?: boolean
}

const meetingTypeConfig = {
  regular: { label: 'Regular', color: 'bg-blue-500' },
  special: { label: 'Special', color: 'bg-purple-500' },
  annual: { label: 'Annual', color: 'bg-green-500' },
  emergency: { label: 'Emergency', color: 'bg-red-500' }
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onStartTranscription,
  onGenerateMinutes,
  onGenerateAgenda,
  onExtractActionItems,
  onViewDetails,
  onEdit,
  className,
  compact = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = () => {
    if (!meeting.actual_start_time || !meeting.actual_end_time) return null
    
    const start = new Date(meeting.actual_start_time)
    const end = new Date(meeting.actual_end_time)
    const durationMs = end.getTime() - start.getTime()
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const typeConfig = meetingTypeConfig[meeting.meeting_type]

  return (
    <Card className={cn("hover:shadow-lg transition-all duration-200", className)}>
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", typeConfig.color)} />
              <CardTitle className={cn("text-lg font-semibold truncate", compact && "text-base")}>
                {meeting.meeting_title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeConfig.label}
              </Badge>
              <MeetingStatusBadge status={meeting.status} />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewDetails && (
                <DropdownMenuItem onClick={() => onViewDetails(meeting.id)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(meeting.id)}>
                  Edit Meeting
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onGenerateAgenda && !meeting.agenda_id && (
                <DropdownMenuItem onClick={() => onGenerateAgenda(meeting.id)}>
                  Generate Agenda
                </DropdownMenuItem>
              )}
              {onStartTranscription && meeting.status === 'completed' && (
                <DropdownMenuItem onClick={() => onStartTranscription(meeting.id)}>
                  <Mic className="mr-2 h-4 w-4" />
                  Start Transcription
                </DropdownMenuItem>
              )}
              {onGenerateMinutes && !meeting.minutes_id && (
                <DropdownMenuItem onClick={() => onGenerateMinutes(meeting.id)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Minutes
                </DropdownMenuItem>
              )}
              {onExtractActionItems && (
                <DropdownMenuItem onClick={() => onExtractActionItems(meeting.id)}>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Extract Action Items
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", compact && "space-y-2 text-sm")}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(meeting.scheduled_date)}</span>
          {formatDuration() && (
            <>
              <Clock className="h-4 w-4 ml-2" />
              <span>{formatDuration()}</span>
            </>
          )}
        </div>
        
        {(meeting.location || meeting.is_virtual) && (
          <div className="flex items-center gap-2 text-muted-foreground">
            {meeting.is_virtual ? (
              <>
                <Video className="h-4 w-4" />
                <span>Virtual Meeting</span>
                {meeting.virtual_meeting_url && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-xs"
                    onClick={() => window.open(meeting.virtual_meeting_url, '_blank')}
                  >
                    Join
                  </Button>
                )}
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4" />
                <span className="truncate">{meeting.location}</span>
              </>
            )}
          </div>
        )}
        
        {!compact && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4">
              {meeting.agenda_id && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>Agenda</span>
                </div>
              )}
              {meeting.minutes_id && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span>Minutes</span>
                </div>
              )}
              {meeting.recording_url && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mic className="h-3 w-3" />
                  <span>Recording</span>
                </div>
              )}
            </div>
            
            {meeting.status === 'scheduled' && (
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Join Meeting
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MeetingCard