/**
 * Meetings Overview Organism Component
 * Displays a comprehensive overview of board meetings with filtering and actions
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import { MeetingCard } from '../molecules/MeetingCard'
import { MeetingStatusBadge, type MeetingStatus } from '../atoms/MeetingStatusBadge'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  FileText,
  Mic,
  CheckSquare,
  TrendingUp,
  Clock
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/features/shared/ui/tabs'
import { Skeleton } from '@/features/shared/ui/skeleton'

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

interface MeetingsOverviewProps {
  meetings: BoardMeeting[]
  loading?: boolean
  onCreateMeeting?: () => void
  onStartTranscription?: (meetingId: string) => void
  onGenerateMinutes?: (meetingId: string) => void
  onGenerateAgenda?: (meetingId: string) => void
  onExtractActionItems?: (meetingId: string) => void
  onViewMeeting?: (meetingId: string) => void
  onEditMeeting?: (meetingId: string) => void
  className?: string
}

export const MeetingsOverview: React.FC<MeetingsOverviewProps> = ({
  meetings,
  loading = false,
  onCreateMeeting,
  onStartTranscription,
  onGenerateMinutes,
  onGenerateAgenda,
  onExtractActionItems,
  onViewMeeting,
  onEditMeeting,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  // Filter and search meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      // Search filter
      if (searchQuery && !meeting.meeting_title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && meeting.status !== statusFilter) {
        return false
      }

      // Type filter
      if (typeFilter !== 'all' && meeting.meeting_type !== typeFilter) {
        return false
      }

      // Date filter
      const meetingDate = new Date(meeting.scheduled_date)
      const today = new Date()
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)

      switch (dateFilter) {
        case 'upcoming':
          return meetingDate >= today
        case 'past':
          return meetingDate < today
        case 'this_month':
          return meetingDate >= currentMonth && meetingDate < nextMonth
        default:
          return true
      }
    })
  }, [meetings, searchQuery, statusFilter, typeFilter, dateFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = meetings.length
    const scheduled = meetings.filter(m => m.status === 'scheduled').length
    const completed = meetings.filter(m => m.status === 'completed').length
    const withMinutes = meetings.filter(m => m.minutes_id).length
    const withAgendas = meetings.filter(m => m.agenda_id).length
    
    return { total, scheduled, completed, withMinutes, withAgendas }
  }, [meetings])

  // Group meetings by status for tabs
  const meetingsByStatus = useMemo(() => {
    const grouped = {
      all: filteredMeetings,
      scheduled: filteredMeetings.filter(m => m.status === 'scheduled'),
      in_progress: filteredMeetings.filter(m => m.status === 'in_progress'),
      completed: filteredMeetings.filter(m => m.status === 'completed'),
    }
    return grouped
  }, [filteredMeetings])

  const MeetingCardSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Board Meetings</h2>
          <p className="text-muted-foreground">
            Manage and track your board meetings with AI assistance
          </p>
        </div>
        {onCreateMeeting && (
          <Button onClick={onCreateMeeting}>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Minutes</p>
                <p className="text-2xl font-bold text-purple-600">{stats.withMinutes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">With Agendas</p>
                <p className="text-2xl font-bold text-orange-600">{stats.withAgendas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="special">Special</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Meetings List with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary" className="ml-2">
              {meetingsByStatus.all.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            Scheduled
            <Badge variant="secondary" className="ml-2">
              {meetingsByStatus.scheduled.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center gap-2">
            In Progress
            <Badge variant="secondary" className="ml-2">
              {meetingsByStatus.in_progress.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            <Badge variant="secondary" className="ml-2">
              {meetingsByStatus.completed.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {Object.entries(meetingsByStatus).map(([status, statusMeetings]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <MeetingCardSkeleton key={index} />
                ))}
              </div>
            ) : statusMeetings.length > 0 ? (
              <div className="space-y-4">
                {statusMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onStartTranscription={onStartTranscription}
                    onGenerateMinutes={onGenerateMinutes}
                    onGenerateAgenda={onGenerateAgenda}
                    onExtractActionItems={onExtractActionItems}
                    onViewDetails={onViewMeeting}
                    onEdit={onEditMeeting}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No meetings found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all'
                      ? "No meetings match your current filters."
                      : "Get started by creating your first board meeting."
                    }
                  </p>
                  {onCreateMeeting && (
                    <Button onClick={onCreateMeeting}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Meeting
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default MeetingsOverview