'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar, Clock, MapPin, Video, Users, Bell, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useOrganization } from '@/contexts/OrganizationContext'

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface EventFormData {
  title: string
  description: string
  start_datetime: string
  end_datetime: string
  event_type: 'meeting' | 'personal' | 'reminder' | 'deadline' | 'holiday'
  location: string
  virtual_meeting_url: string
  all_day: boolean
  attendees: string[]
  reminder_minutes: number
}

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting', color: '#3B82F6' },
  { value: 'personal', label: 'Personal', color: '#10B981' },
  { value: 'reminder', label: 'Reminder', color: '#F59E0B' },
  { value: 'deadline', label: 'Deadline', color: '#EF4444' },
  { value: 'holiday', label: 'Holiday', color: '#8B5CF6' }
]

const REMINDER_OPTIONS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' }
]

export default function CreateEventModal({ isOpen, onClose, onSuccess }: CreateEventModalProps) {
  const { toast } = useToast()
  const { currentOrganization } = useOrganization()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    start_datetime: '',
    end_datetime: '',
    event_type: 'meeting',
    location: '',
    virtual_meeting_url: '',
    all_day: false,
    attendees: [],
    reminder_minutes: 15
  })

  const [attendeeInput, setAttendeeInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.start_datetime || !formData.end_datetime) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare the request payload
      const eventColor = EVENT_TYPES.find(t => t.value === formData.event_type)?.color || '#3B82F6'
      
      const payload = {
        title: formData.title,
        description: formData.description,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        event_type: formData.event_type,
        location: formData.location,
        virtual_meeting_url: formData.virtual_meeting_url,
        all_day: formData.all_day,
        color: eventColor,
        organization_id: currentOrganization?.id,
        attendees: formData.attendees.map(email => ({
          email,
          role: 'participant'
        })),
        reminders: formData.reminder_minutes > 0 ? [{
          reminder_type: 'email',
          minutes_before: formData.reminder_minutes
        }] : []
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast({
            title: 'Scheduling conflict',
            description: 'This time slot conflicts with another event',
            variant: 'destructive'
          })
        } else {
          throw new Error(result.error || 'Failed to create event')
        }
        return
      }

      toast({
        title: 'Event created successfully',
        description: `${formData.title} has been added to your calendar`,
        variant: 'success'
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        start_datetime: '',
        end_datetime: '',
        event_type: 'meeting',
        location: '',
        virtual_meeting_url: '',
        all_day: false,
        attendees: [],
        reminder_minutes: 15
      })
      setAttendeeInput('')

      // Call success callback and close
      onSuccess?.()
      onClose()

    } catch (error) {
      console.error('Failed to create event:', error)
      toast({
        title: 'Failed to create event',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAttendee = () => {
    if (attendeeInput && attendeeInput.includes('@')) {
      setFormData(prev => ({
        ...prev,
        attendees: [...prev.attendees, attendeeInput]
      }))
      setAttendeeInput('')
    }
  }

  const handleRemoveAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== email)
    }))
  }

  const handleAllDayToggle = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      all_day: checked
    }))
  }

  // Auto-update end time when start time changes
  const handleStartTimeChange = (value: string) => {
    setFormData(prev => {
      const newData = { ...prev, start_datetime: value }
      
      // If end time is not set or is before start time, set it to 1 hour after start
      if (!prev.end_datetime || new Date(value) >= new Date(prev.end_datetime)) {
        const startDate = new Date(value)
        startDate.setHours(startDate.getHours() + 1)
        newData.end_datetime = startDate.toISOString().slice(0, 16)
      }
      
      return newData
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Create New Event
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter event title"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event_type">Event Type</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, event_type: value }))}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <Label>Date & Time</Label>
            </div>
            
            <div className="flex items-center gap-4">
              <Switch
                id="all_day"
                checked={formData.all_day}
                onCheckedChange={handleAllDayToggle}
                disabled={isSubmitting}
              />
              <Label htmlFor="all_day">All day event</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_datetime">Start *</Label>
                <Input
                  id="start_datetime"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.start_datetime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_datetime">End *</Label>
                <Input
                  id="end_datetime"
                  type={formData.all_day ? "date" : "datetime-local"}
                  value={formData.end_datetime}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_datetime: e.target.value }))}
                  min={formData.start_datetime}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add event description..."
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Location */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                Location
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Enter location (optional)"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="virtual_meeting_url" className="flex items-center gap-2">
                <Video className="h-4 w-4 text-gray-500" />
                Virtual Meeting URL
              </Label>
              <Input
                id="virtual_meeting_url"
                type="url"
                value={formData.virtual_meeting_url}
                onChange={(e) => setFormData(prev => ({ ...prev, virtual_meeting_url: e.target.value }))}
                placeholder="https://zoom.us/j/..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              Attendees
            </Label>
            <div className="flex gap-2">
              <Input
                value={attendeeInput}
                onChange={(e) => setAttendeeInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                placeholder="Enter email address"
                type="email"
                disabled={isSubmitting}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddAttendee}
                disabled={isSubmitting}
              >
                Add
              </Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.attendees.map(email => (
                  <div key={email} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttendee(email)}
                      className="text-gray-500 hover:text-red-500"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reminder */}
          <div className="space-y-2">
            <Label htmlFor="reminder" className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              Reminder
            </Label>
            <Select
              value={formData.reminder_minutes.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, reminder_minutes: parseInt(value) }))}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}