/**
 * Meeting-Specific Offline Store
 * Specialized state management for meeting-related offline functionality
 */

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useOfflineStore } from './offline-store'
import type { Meeting, AgendaItem, ActionItem, AttendanceRecord } from '../offline-db/schema'

export interface MeetingParticipant {
  user_id: string
  name: string
  role: string
  status: 'invited' | 'accepted' | 'declined' | 'present' | 'absent'
  joined_at?: string
  left_at?: string
  camera_enabled: boolean
  microphone_enabled: boolean
  screen_sharing: boolean
  speaking: boolean
}

export interface MeetingSession {
  meeting_id: string
  is_active: boolean
  current_agenda_item?: string
  start_time?: string
  participants: MeetingParticipant[]
  notes: string
  action_items: ActionItem[]
  recordings: {
    audio?: string
    video?: string
    transcript?: string
  }
  chat_messages: ChatMessage[]
  votes_in_progress: string[]
}

export interface ChatMessage {
  id: string
  user_id: string
  user_name: string
  message: string
  timestamp: string
  type: 'text' | 'system' | 'vote' | 'file'
  metadata?: Record<string, any>
}

export interface MeetingStoreState {
  // Current meeting session
  currentSession: MeetingSession | null
  
  // Meeting templates for quick creation
  templates: Meeting[]
  
  // Recent meetings for quick access
  recentMeetings: Meeting[]
  
  // Upcoming meetings
  upcomingMeetings: Meeting[]
  
  // Meeting preferences
  preferences: {
    default_duration: number
    auto_record: boolean
    mute_on_join: boolean
    camera_on_join: boolean
    notification_reminders: number[] // Minutes before meeting
    preferred_timezone: string
  }
  
  // Offline meeting capabilities
  offline: {
    cached_meetings: string[] // Meeting IDs available offline
    sync_queue: string[] // Meetings pending sync
    conflicts: string[] // Meetings with sync conflicts
  }
  
  // Actions
  actions: {
    // Meeting lifecycle
    createMeeting: (template?: Partial<Meeting>) => Promise<Meeting>
    scheduleMeeting: (meeting: Meeting, sendInvites?: boolean) => Promise<void>
    startMeeting: (meetingId: string) => Promise<void>
    endMeeting: (meetingId: string) => Promise<void>
    joinMeeting: (meetingId: string) => Promise<void>
    leaveMeeting: () => Promise<void>
    
    // Agenda management
    addAgendaItem: (meetingId: string, item: Omit<AgendaItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
    updateAgendaItem: (meetingId: string, itemId: string, updates: Partial<AgendaItem>) => Promise<void>
    reorderAgendaItems: (meetingId: string, itemIds: string[]) => Promise<void>
    setCurrentAgendaItem: (itemId?: string) => void
    
    // Participation management
    inviteParticipant: (meetingId: string, userId: string) => Promise<void>
    updateParticipantStatus: (userId: string, status: MeetingParticipant['status']) => void
    toggleCamera: (userId?: string) => void
    toggleMicrophone: (userId?: string) => void
    startScreenShare: (userId?: string) => Promise<void>
    stopScreenShare: (userId?: string) => void
    
    // Note-taking
    addNote: (content: string, agendaItemId?: string) => void
    updateNotes: (notes: string) => void
    exportNotes: (format: 'txt' | 'md' | 'pdf') => Promise<Blob>
    
    // Action items
    addActionItem: (item: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
    updateActionItem: (itemId: string, updates: Partial<ActionItem>) => Promise<void>
    assignActionItem: (itemId: string, userId: string) => Promise<void>
    completeActionItem: (itemId: string) => Promise<void>
    
    // Chat functionality
    sendChatMessage: (message: string, type?: ChatMessage['type']) => Promise<void>
    loadChatHistory: (meetingId: string) => Promise<ChatMessage[]>
    
    // Recording
    startRecording: (options: { audio: boolean; video: boolean; transcript: boolean }) => Promise<void>
    stopRecording: () => Promise<void>
    
    // Offline capabilities
    cacheMeetingForOffline: (meetingId: string) => Promise<void>
    syncMeetingChanges: (meetingId: string) => Promise<void>
    getMeetingOfflineStatus: (meetingId: string) => 'cached' | 'partial' | 'not_cached'
    
    // Templates
    saveAsTemplate: (meetingId: string, templateName: string) => Promise<void>
    loadTemplate: (templateId: string) => Promise<Meeting>
    deleteTemplate: (templateId: string) => Promise<void>
    
    // Preferences
    updatePreferences: (updates: Partial<MeetingStoreState['preferences']>) => void
    
    // Utilities
    getMeetingDuration: (meetingId: string) => number
    getMeetingStatistics: (meetingId: string) => Promise<MeetingStatistics>
    exportMeetingData: (meetingId: string, format: 'json' | 'pdf' | 'docx') => Promise<Blob>
  }
}

export interface MeetingStatistics {
  duration: number
  participants_count: number
  agenda_items_completed: number
  agenda_items_total: number
  action_items_created: number
  notes_length: number
  votes_conducted: number
  attendance_rate: number
}

export const useMeetingStore = create<MeetingStoreState>()(
  persist(
    immer((set, get) => ({
      currentSession: null,
      templates: [],
      recentMeetings: [],
      upcomingMeetings: [],
      
      preferences: {
        default_duration: 60, // minutes
        auto_record: false,
        mute_on_join: true,
        camera_on_join: false,
        notification_reminders: [15, 5], // 15 and 5 minutes before
        preferred_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      
      offline: {
        cached_meetings: [],
        sync_queue: [],
        conflicts: []
      },
      
      actions: {
        createMeeting: async (template?: Partial<Meeting>): Promise<Meeting> => {
          const offlineStore = useOfflineStore.getState()
          
          const meetingData: Partial<Meeting> = {
            title: template?.title || 'New Meeting',
            description: template?.description || '',
            meeting_date: template?.meeting_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            start_time: template?.start_time || new Date().toISOString(),
            end_time: template?.end_time || new Date(Date.now() + get().preferences.default_duration * 60 * 1000).toISOString(),
            status: 'draft',
            is_virtual: true,
            agenda_items: template?.agenda_items || [],
            participants: template?.participants || [],
            ...template
          }
          
          const meeting = await offlineStore.actions.createMeeting(meetingData)
          
          // Update recent meetings
          set(state => {
            state.recentMeetings = [meeting, ...state.recentMeetings.slice(0, 9)]
          })
          
          return meeting
        },
        
        scheduleMeeting: async (meeting: Meeting, sendInvites = true): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          
          // Update meeting status
          await offlineStore.actions.updateMeeting(meeting.id, {
            status: 'scheduled'
          })
          
          // Add to upcoming meetings
          set(state => {
            const existing = state.upcomingMeetings.findIndex(m => m.id === meeting.id)
            if (existing >= 0) {
              state.upcomingMeetings[existing] = meeting
            } else {
              state.upcomingMeetings.push(meeting)
            }
            
            // Sort by meeting date
            state.upcomingMeetings.sort((a, b) => 
              new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
            )
          })
          
          if (sendInvites) {
            // TODO: Send meeting invitations
            console.log('Sending meeting invitations for:', meeting.title)
          }
        },
        
        startMeeting: async (meetingId: string): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) {
            throw new Error('Meeting not found')
          }
          
          // Update meeting status
          await offlineStore.actions.updateMeeting(meetingId, {
            status: 'in_progress'
          })
          
          // Create session
          const session: MeetingSession = {
            meeting_id: meetingId,
            is_active: true,
            start_time: new Date().toISOString(),
            participants: meeting.participants.map(userId => ({
              user_id: userId,
              name: `User ${userId}`, // TODO: Get actual names
              role: 'participant',
              status: 'present',
              camera_enabled: get().preferences.camera_on_join,
              microphone_enabled: !get().preferences.mute_on_join,
              screen_sharing: false,
              speaking: false
            })),
            notes: meeting.meeting_notes || '',
            action_items: meeting.action_items || [],
            recordings: {},
            chat_messages: [],
            votes_in_progress: []
          }
          
          set(state => {
            state.currentSession = session
          })
          
          // Auto-start recording if enabled
          if (get().preferences.auto_record) {
            await get().actions.startRecording({
              audio: true,
              video: false,
              transcript: true
            })
          }
        },
        
        endMeeting: async (meetingId: string): Promise<void> => {
          const session = get().currentSession
          if (!session || session.meeting_id !== meetingId) {
            throw new Error('No active session for this meeting')
          }
          
          const offlineStore = useOfflineStore.getState()
          
          // Stop recording if active
          if (session.recordings.audio || session.recordings.video) {
            await get().actions.stopRecording()
          }
          
          // Calculate meeting duration and attendance
          const duration = session.start_time 
            ? Date.now() - new Date(session.start_time).getTime()
            : 0
          
          const attendance: AttendanceRecord[] = session.participants.map(p => ({
            user_id: p.user_id,
            status: p.status === 'present' ? 'present' : 'absent',
            joined_at: p.joined_at,
            left_at: p.left_at
          }))
          
          // Update meeting with final data
          await offlineStore.actions.updateMeeting(meetingId, {
            status: 'completed',
            meeting_notes: session.notes,
            action_items: session.action_items,
            attendance,
            transcript: session.recordings.transcript
          })
          
          // Clear session
          set(state => {
            state.currentSession = null
          })
          
          // Move from upcoming to recent
          set(state => {
            state.upcomingMeetings = state.upcomingMeetings.filter(m => m.id !== meetingId)
            // Recent meetings will be updated when we reload the meeting data
          })
        },
        
        joinMeeting: async (meetingId: string): Promise<void> => {
          const currentUserId = 'current_user' // TODO: Get from auth context
          
          set(state => {
            if (state.currentSession?.meeting_id === meetingId) {
              const participant = state.currentSession.participants.find(p => p.user_id === currentUserId)
              if (participant) {
                participant.status = 'present'
                participant.joined_at = new Date().toISOString()
              }
            }
          })
        },
        
        leaveMeeting: async (): Promise<void> => {
          const session = get().currentSession
          if (!session) return
          
          const currentUserId = 'current_user' // TODO: Get from auth context
          
          set(state => {
            if (state.currentSession) {
              const participant = state.currentSession.participants.find(p => p.user_id === currentUserId)
              if (participant) {
                participant.status = 'absent'
                participant.left_at = new Date().toISOString()
                participant.camera_enabled = false
                participant.microphone_enabled = false
                participant.screen_sharing = false
              }
            }
          })
        },
        
        addAgendaItem: async (
          meetingId: string, 
          item: Omit<AgendaItem, 'id' | 'created_at' | 'updated_at'>
        ): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) throw new Error('Meeting not found')
          
          const newItem: AgendaItem = {
            id: `agenda_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...item,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          const updatedAgendaItems = [...meeting.agenda_items, newItem]
          
          await offlineStore.actions.updateMeeting(meetingId, {
            agenda_items: updatedAgendaItems
          })
        },
        
        updateAgendaItem: async (
          meetingId: string, 
          itemId: string, 
          updates: Partial<AgendaItem>
        ): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) throw new Error('Meeting not found')
          
          const updatedAgendaItems = meeting.agenda_items.map(item =>
            item.id === itemId 
              ? { ...item, ...updates, updated_at: new Date().toISOString() }
              : item
          )
          
          await offlineStore.actions.updateMeeting(meetingId, {
            agenda_items: updatedAgendaItems
          })
        },
        
        reorderAgendaItems: async (meetingId: string, itemIds: string[]): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) throw new Error('Meeting not found')
          
          // Reorder items based on provided IDs
          const reorderedItems = itemIds.map((id, index) => {
            const item = meeting.agenda_items.find(item => item.id === id)
            return item ? { ...item, order_index: index } : null
          }).filter(Boolean) as AgendaItem[]
          
          await offlineStore.actions.updateMeeting(meetingId, {
            agenda_items: reorderedItems
          })
        },
        
        setCurrentAgendaItem: (itemId?: string): void => {
          set(state => {
            if (state.currentSession) {
              state.currentSession.current_agenda_item = itemId
            }
          })
        },
        
        inviteParticipant: async (meetingId: string, userId: string): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) throw new Error('Meeting not found')
          
          if (!meeting.participants.includes(userId)) {
            const updatedParticipants = [...meeting.participants, userId]
            
            await offlineStore.actions.updateMeeting(meetingId, {
              participants: updatedParticipants
            })
          }
        },
        
        updateParticipantStatus: (userId: string, status: MeetingParticipant['status']): void => {
          set(state => {
            if (state.currentSession) {
              const participant = state.currentSession.participants.find(p => p.user_id === userId)
              if (participant) {
                participant.status = status
              }
            }
          })
        },
        
        toggleCamera: (userId?: string): void => {
          const targetUserId = userId || 'current_user'
          
          set(state => {
            if (state.currentSession) {
              const participant = state.currentSession.participants.find(p => p.user_id === targetUserId)
              if (participant) {
                participant.camera_enabled = !participant.camera_enabled
              }
            }
          })
        },
        
        toggleMicrophone: (userId?: string): void => {
          const targetUserId = userId || 'current_user'
          
          set(state => {
            if (state.currentSession) {
              const participant = state.currentSession.participants.find(p => p.user_id === targetUserId)
              if (participant) {
                participant.microphone_enabled = !participant.microphone_enabled
              }
            }
          })
        },
        
        startScreenShare: async (userId?: string): Promise<void> => {
          const targetUserId = userId || 'current_user'
          
          set(state => {
            if (state.currentSession) {
              // Only one person can share screen at a time
              state.currentSession.participants.forEach(p => {
                p.screen_sharing = p.user_id === targetUserId
              })
            }
          })
        },
        
        stopScreenShare: (userId?: string): void => {
          const targetUserId = userId || 'current_user'
          
          set(state => {
            if (state.currentSession) {
              const participant = state.currentSession.participants.find(p => p.user_id === targetUserId)
              if (participant) {
                participant.screen_sharing = false
              }
            }
          })
        },
        
        addNote: (content: string, agendaItemId?: string): void => {
          const timestamp = new Date().toLocaleTimeString()
          const note = agendaItemId 
            ? `[${timestamp}] [Agenda Item] ${content}`
            : `[${timestamp}] ${content}`
          
          set(state => {
            if (state.currentSession) {
              state.currentSession.notes += '\n' + note
            }
          })
        },
        
        updateNotes: (notes: string): void => {
          set(state => {
            if (state.currentSession) {
              state.currentSession.notes = notes
            }
          })
        },
        
        exportNotes: async (format: 'txt' | 'md' | 'pdf'): Promise<Blob> => {
          const session = get().currentSession
          if (!session) throw new Error('No active session')
          
          let content = session.notes
          let mimeType = 'text/plain'
          
          if (format === 'md') {
            content = `# Meeting Notes\n\n${content.replace(/\n/g, '\n\n')}`
            mimeType = 'text/markdown'
          } else if (format === 'pdf') {
            // Would use a PDF generation library in production
            mimeType = 'application/pdf'
          }
          
          return new Blob([content], { type: mimeType })
        },
        
        addActionItem: async (
          item: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>
        ): Promise<void> => {
          const session = get().currentSession
          if (!session) throw new Error('No active session')
          
          const newItem: ActionItem = {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...item,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          set(state => {
            if (state.currentSession) {
              state.currentSession.action_items.push(newItem)
            }
          })
        },
        
        updateActionItem: async (itemId: string, updates: Partial<ActionItem>): Promise<void> => {
          set(state => {
            if (state.currentSession) {
              const index = state.currentSession.action_items.findIndex(item => item.id === itemId)
              if (index >= 0) {
                state.currentSession.action_items[index] = {
                  ...state.currentSession.action_items[index],
                  ...updates,
                  updated_at: new Date().toISOString()
                }
              }
            }
          })
        },
        
        assignActionItem: async (itemId: string, userId: string): Promise<void> => {
          await get().actions.updateActionItem(itemId, { assigned_to: userId })
        },
        
        completeActionItem: async (itemId: string): Promise<void> => {
          await get().actions.updateActionItem(itemId, { 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
        },
        
        sendChatMessage: async (message: string, type: ChatMessage['type'] = 'text'): Promise<void> => {
          const chatMessage: ChatMessage = {
            id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: 'current_user', // TODO: Get from auth context
            user_name: 'Current User', // TODO: Get actual name
            message,
            timestamp: new Date().toISOString(),
            type
          }
          
          set(state => {
            if (state.currentSession) {
              state.currentSession.chat_messages.push(chatMessage)
            }
          })
        },
        
        loadChatHistory: async (meetingId: string): Promise<ChatMessage[]> => {
          // Would load from database in production
          return []
        },
        
        startRecording: async (options: { audio: boolean; video: boolean; transcript: boolean }): Promise<void> => {
          set(state => {
            if (state.currentSession) {
              if (options.audio) state.currentSession.recordings.audio = 'recording...'
              if (options.video) state.currentSession.recordings.video = 'recording...'
              if (options.transcript) state.currentSession.recordings.transcript = 'transcribing...'
            }
          })
          
          console.log('Started recording with options:', options)
        },
        
        stopRecording: async (): Promise<void> => {
          set(state => {
            if (state.currentSession) {
              // In production, this would stop actual recording and save files
              if (state.currentSession.recordings.audio) {
                state.currentSession.recordings.audio = 'audio_recording_url'
              }
              if (state.currentSession.recordings.video) {
                state.currentSession.recordings.video = 'video_recording_url'
              }
              if (state.currentSession.recordings.transcript) {
                state.currentSession.recordings.transcript = 'Transcript would be here...'
              }
            }
          })
          
          console.log('Stopped recording')
        },
        
        cacheMeetingForOffline: async (meetingId: string): Promise<void> => {
          // Cache meeting and related data for offline access
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (meeting) {
            // Cache meeting documents
            for (const docId of meeting.documents) {
              // Would download document content for offline access
              console.log(`Caching document ${docId} for offline access`)
            }
            
            set(state => {
              if (!state.offline.cached_meetings.includes(meetingId)) {
                state.offline.cached_meetings.push(meetingId)
              }
            })
          }
        },
        
        syncMeetingChanges: async (meetingId: string): Promise<void> => {
          // Sync specific meeting changes
          console.log(`Syncing changes for meeting ${meetingId}`)
          
          set(state => {
            state.offline.sync_queue = state.offline.sync_queue.filter(id => id !== meetingId)
          })
        },
        
        getMeetingOfflineStatus: (meetingId: string): 'cached' | 'partial' | 'not_cached' => {
          const { cached_meetings } = get().offline
          
          if (cached_meetings.includes(meetingId)) {
            return 'cached'
          }
          
          // Check if partially cached (meeting data but not documents)
          // This would be more sophisticated in production
          return 'not_cached'
        },
        
        saveAsTemplate: async (meetingId: string, templateName: string): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (meeting) {
            const template: Meeting = {
              ...meeting,
              id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: templateName,
              status: 'draft',
              meeting_date: '',
              start_time: '',
              end_time: '',
              participants: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            
            set(state => {
              state.templates.push(template)
            })
          }
        },
        
        loadTemplate: async (templateId: string): Promise<Meeting> => {
          const template = get().templates.find(t => t.id === templateId)
          if (!template) throw new Error('Template not found')
          
          return template
        },
        
        deleteTemplate: async (templateId: string): Promise<void> => {
          set(state => {
            state.templates = state.templates.filter(t => t.id !== templateId)
          })
        },
        
        updatePreferences: (updates: Partial<MeetingStoreState['preferences']>): void => {
          set(state => {
            state.preferences = { ...state.preferences, ...updates }
          })
        },
        
        getMeetingDuration: (meetingId: string): number => {
          const session = get().currentSession
          if (session?.meeting_id === meetingId && session.start_time) {
            return Date.now() - new Date(session.start_time).getTime()
          }
          return 0
        },
        
        getMeetingStatistics: async (meetingId: string): Promise<MeetingStatistics> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) throw new Error('Meeting not found')
          
          const duration = meeting.start_time && meeting.end_time
            ? new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()
            : 0
          
          const completedAgendaItems = meeting.agenda_items.filter(item => item.status === 'completed').length
          const presentParticipants = meeting.attendance.filter(a => a.status === 'present').length
          
          return {
            duration,
            participants_count: meeting.participants.length,
            agenda_items_completed: completedAgendaItems,
            agenda_items_total: meeting.agenda_items.length,
            action_items_created: meeting.action_items.length,
            notes_length: meeting.meeting_notes.length,
            votes_conducted: meeting.votes.length,
            attendance_rate: meeting.participants.length > 0 
              ? (presentParticipants / meeting.participants.length) * 100 
              : 0
          }
        },
        
        exportMeetingData: async (meetingId: string, format: 'json' | 'pdf' | 'docx'): Promise<Blob> => {
          const offlineStore = useOfflineStore.getState()
          const meeting = await offlineStore.actions.loadEntity<Meeting>('meetings', meetingId)
          
          if (!meeting) throw new Error('Meeting not found')
          
          if (format === 'json') {
            return new Blob([JSON.stringify(meeting, null, 2)], { 
              type: 'application/json' 
            })
          }
          
          // For PDF/DOCX, would use appropriate libraries in production
          const textContent = `
Meeting: ${meeting.title}
Date: ${new Date(meeting.meeting_date).toLocaleDateString()}
Duration: ${meeting.start_time} - ${meeting.end_time}

Agenda Items:
${meeting.agenda_items.map(item => `- ${item.title}: ${item.status}`).join('\n')}

Notes:
${meeting.meeting_notes}

Action Items:
${meeting.action_items.map(item => `- ${item.description} (${item.status})`).join('\n')}
          `.trim()
          
          return new Blob([textContent], { 
            type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          })
        }
      }
    })),
    {
      name: 'meeting-store',
      partialize: (state) => ({
        templates: state.templates,
        preferences: state.preferences,
        offline: state.offline
      })
    }
  )
)