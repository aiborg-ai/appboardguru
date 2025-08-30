"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

// Types
interface Meeting {
  id: string
  title: string
  description?: string
  meeting_type: 'agm' | 'board' | 'committee' | 'other'
  meeting_number: string
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  scheduled_start: string
  scheduled_end: string
  timezone: string
  location?: string
  virtual_meeting_url?: string
  is_hybrid: boolean
  attendee_count: number
  rsvp_count: number
  agenda_item_count: number
  document_count: number
  organization?: {
    id: string
    name: string
    slug: string
  }
  board?: {
    id: string
    name: string
  }
  committee?: {
    id: string
    name: string
  }
  organizer?: {
    id: string
    email: string
  }
  created_at: string
  updated_at: string
}

interface MeetingsResponse {
  success: boolean
  data: Meeting[]
  pagination?: {
    limit: number
    offset: number
    total: number
  }
}

interface CreateMeetingPayload {
  organizationId: string
  boardId?: string | null
  committeeId?: string | null
  title: string
  description?: string
  meetingType: 'agm' | 'board' | 'committee' | 'other'
  scheduledStart: string
  scheduledEnd: string
  timezone: string
  location?: string
  virtualMeetingUrl?: string
  isHybrid: boolean
  agendaItems?: Array<{
    title: string
    description?: string
    type: string
    estimatedDuration: number
    presenter?: string
    order: number
  }>
  invitees?: Array<{
    userId?: string
    email: string
    name: string
    role: string
    isRequired: boolean
    canVote: boolean
  }>
  settings?: any
}

// Query keys factory
const meetingKeys = {
  all: ['meetings'] as const,
  lists: () => [...meetingKeys.all, 'list'] as const,
  list: (filters: any) => [...meetingKeys.lists(), filters] as const,
  details: () => [...meetingKeys.all, 'detail'] as const,
  detail: (id: string) => [...meetingKeys.details(), id] as const,
}

// API functions
async function fetchMeetings(filters?: {
  organizationId?: string
  status?: string
  type?: string
  limit?: number
  offset?: number
}): Promise<MeetingsResponse> {
  const params = new URLSearchParams()
  
  if (filters?.organizationId) params.append('organizationId', filters.organizationId)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.type) params.append('type', filters.type)
  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())

  const response = await fetch(`/api/meetings?${params.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch meetings')
  }

  return response.json()
}

async function fetchMeeting(id: string): Promise<Meeting> {
  const response = await fetch(`/api/meetings/${id}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch meeting')
  }

  const data = await response.json()
  return data.data
}

async function createMeeting(payload: CreateMeetingPayload): Promise<Meeting> {
  const response = await fetch('/api/meetings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create meeting')
  }

  const data = await response.json()
  return data.data
}

async function updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
  const response = await fetch(`/api/meetings/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update meeting')
  }

  const data = await response.json()
  return data.data
}

async function deleteMeeting(id: string): Promise<void> {
  const response = await fetch(`/api/meetings/${id}`, {
    method: 'DELETE'
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete meeting')
  }
}

// Hooks
export function useMeetings(filters?: {
  organizationId?: string
  status?: string
  type?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: meetingKeys.list(filters || {}),
    queryFn: () => fetchMeetings(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useMeeting(id: string) {
  return useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: () => fetchMeeting(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCreateMeeting() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: createMeeting,
    onSuccess: (meeting) => {
      // Invalidate meetings list
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() })
      
      // Add the new meeting to the cache
      queryClient.setQueryData(
        meetingKeys.list({}),
        (old: MeetingsResponse | undefined) => {
          if (!old) return old
          return {
            ...old,
            data: [meeting, ...old.data]
          }
        }
      )

      toast({
        title: 'Meeting created',
        description: `${meeting.title} has been created successfully.`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create meeting',
        description: error.message || 'There was an error creating the meeting.',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Meeting> }) =>
      updateMeeting(id, updates),
    onSuccess: (meeting) => {
      // Update the meeting in cache
      queryClient.setQueryData(meetingKeys.detail(meeting.id), meeting)
      
      // Invalidate meetings list
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() })

      toast({
        title: 'Meeting updated',
        description: 'The meeting has been updated successfully.',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update meeting',
        description: error.message || 'There was an error updating the meeting.',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      // Invalidate meetings list
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() })

      toast({
        title: 'Meeting deleted',
        description: 'The meeting has been deleted successfully.',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete meeting',
        description: error.message || 'There was an error deleting the meeting.',
        variant: 'destructive',
      })
    },
  })
}