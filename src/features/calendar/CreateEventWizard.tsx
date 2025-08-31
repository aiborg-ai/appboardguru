'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  X,
  Loader2,
  CalendarDays,
  Video
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';

// Step definitions
const STEPS = [
  {
    id: 'basic',
    title: 'Event Details',
    description: 'Set the event title and type',
    icon: Calendar,
  },
  {
    id: 'datetime',
    title: 'Date & Time',
    description: 'Choose when the event will occur',
    icon: Clock,
  },
  {
    id: 'location',
    title: 'Location & Meeting',
    description: 'Set location or virtual meeting details',
    icon: MapPin,
  },
  {
    id: 'attendees',
    title: 'Attendees & Reminders',
    description: 'Invite participants and set reminders',
    icon: Users,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Review your event details',
    icon: Check,
  },
] as const;

export type EventWizardStep = typeof STEPS[number]['id'];

// Event types configuration
const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting', color: '#3B82F6', icon: Users },
  { value: 'personal', label: 'Personal', color: '#10B981', icon: Calendar },
  { value: 'reminder', label: 'Reminder', color: '#F59E0B', icon: Bell },
  { value: 'deadline', label: 'Deadline', color: '#EF4444', icon: Clock },
  { value: 'holiday', label: 'Holiday', color: '#8B5CF6', icon: CalendarDays }
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' }
];

// Wizard data structure
export interface EventWizardData {
  title: string;
  description: string;
  event_type: 'meeting' | 'personal' | 'reminder' | 'deadline' | 'holiday';
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string;
  virtual_meeting_url: string;
  attendees: string[];
  reminder_minutes: number;
}

interface CreateEventWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateEventWizard({
  isOpen,
  onClose,
  onSuccess
}: CreateEventWizardProps) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendeeInput, setAttendeeInput] = useState('');
  
  const [wizardData, setWizardData] = useState<EventWizardData>({
    title: '',
    description: '',
    event_type: 'meeting',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    location: '',
    virtual_meeting_url: '',
    attendees: [],
    reminder_minutes: 15
  });

  const currentStepData = STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === STEPS.length - 1;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = useCallback(() => {
    // Validate current step before proceeding
    if (currentStep === 0 && !wizardData.title.trim()) {
      toast({
        title: 'Event title is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (currentStep === 1 && !wizardData.date) {
      toast({
        title: 'Event date is required',
        variant: 'destructive'
      });
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, wizardData, toast]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((index: number) => {
    // Allow navigation to previous steps or current step
    if (index <= currentStep) {
      setCurrentStep(index);
    }
  }, [currentStep]);

  const handleAddAttendee = () => {
    if (attendeeInput && attendeeInput.includes('@')) {
      setWizardData(prev => ({
        ...prev,
        attendees: [...prev.attendees, attendeeInput]
      }));
      setAttendeeInput('');
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setWizardData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a !== email)
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Combine date and time for API
      const start_datetime = wizardData.all_day 
        ? `${wizardData.date}T00:00:00`
        : `${wizardData.date}T${wizardData.start_time}:00`;
      
      const end_datetime = wizardData.all_day 
        ? `${wizardData.date}T23:59:59`
        : `${wizardData.date}T${wizardData.end_time}:00`;

      const eventColor = EVENT_TYPES.find(t => t.value === wizardData.event_type)?.color || '#3B82F6';
      
      const payload = {
        title: wizardData.title,
        description: wizardData.description,
        start_datetime,
        end_datetime,
        event_type: wizardData.event_type,
        location: wizardData.location,
        virtual_meeting_url: wizardData.virtual_meeting_url,
        all_day: wizardData.all_day,
        color: eventColor,
        organization_id: currentOrganization?.id,
        attendees: wizardData.attendees.map(email => ({
          email,
          role: 'participant'
        })),
        reminders: wizardData.reminder_minutes > 0 ? [{
          reminder_type: 'email',
          minutes_before: wizardData.reminder_minutes
        }] : []
      };

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create event');
      }

      toast({
        title: 'Event created successfully',
        description: `${wizardData.title} has been added to your calendar`,
        variant: 'success'
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        title: 'Failed to create event',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white">
        <CardHeader className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <div>
                <CardTitle className="text-xl font-semibold">Create New Event</CardTitle>
                <p className="text-sm text-gray-500 mt-1">{currentStepData.description}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between mt-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={index > currentStep}
                    className={cn(
                      "flex flex-col items-center gap-2 flex-1 transition-all",
                      index <= currentStep ? "cursor-pointer" : "cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isActive && "bg-indigo-600 text-white ring-4 ring-indigo-100",
                      isCompleted && "bg-green-600 text-white",
                      !isActive && !isCompleted && "bg-gray-200 text-gray-500"
                    )}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-xs font-medium",
                      isActive && "text-indigo-600",
                      isCompleted && "text-green-600",
                      !isActive && !isCompleted && "text-gray-500"
                    )}>
                      {step.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          {/* Step 1: Basic Details */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">
                  Event Title *
                </Label>
                <Input
                  id="title"
                  value={wizardData.title}
                  onChange={(e) => setWizardData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                  className="mt-2"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">Give your event a clear, descriptive title</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Event Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {EVENT_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = wizardData.event_type === type.value;
                    
                    return (
                      <button
                        key={type.value}
                        onClick={() => setWizardData(prev => ({ ...prev, event_type: type.value as any }))}
                        className={cn(
                          "p-4 rounded-lg border-2 transition-all",
                          isSelected 
                            ? "border-indigo-600 bg-indigo-50" 
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: type.color + '20' }}
                          >
                            <Icon className="h-6 w-6" style={{ color: type.color }} />
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-indigo-600" : "text-gray-700"
                          )}>
                            {type.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={wizardData.description}
                  onChange={(e) => setWizardData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add event description..."
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Add more details about the event</p>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Switch
                  id="all_day"
                  checked={wizardData.all_day}
                  onCheckedChange={(checked) => setWizardData(prev => ({ ...prev, all_day: checked }))}
                />
                <Label htmlFor="all_day" className="cursor-pointer">
                  All day event
                </Label>
              </div>

              <div>
                <Label htmlFor="date" className="text-sm font-medium">
                  Event Date *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={wizardData.date}
                  onChange={(e) => setWizardData(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-2"
                />
              </div>

              {!wizardData.all_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_time" className="text-sm font-medium">
                      Start Time *
                    </Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={wizardData.start_time}
                      onChange={(e) => setWizardData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time" className="text-sm font-medium">
                      End Time *
                    </Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={wizardData.end_time}
                      onChange={(e) => setWizardData(prev => ({ ...prev, end_time: e.target.value }))}
                      min={wizardData.start_time}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900">Event Duration</p>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  {wizardData.all_day ? (
                    'All day event'
                  ) : (
                    `${wizardData.start_time} - ${wizardData.end_time}`
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Location & Meeting */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Physical Location
                </Label>
                <Input
                  id="location"
                  value={wizardData.location}
                  onChange={(e) => setWizardData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location address"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Add a physical meeting location</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or</span>
                </div>
              </div>

              <div>
                <Label htmlFor="virtual_meeting_url" className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-gray-500" />
                  Virtual Meeting URL
                </Label>
                <Input
                  id="virtual_meeting_url"
                  type="url"
                  value={wizardData.virtual_meeting_url}
                  onChange={(e) => setWizardData(prev => ({ ...prev, virtual_meeting_url: e.target.value }))}
                  placeholder="https://zoom.us/j/..."
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">Optional: Add a video conference link</p>
              </div>

              {(wizardData.location || wizardData.virtual_meeting_url) && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">Meeting Location Set</p>
                  {wizardData.location && (
                    <p className="text-sm text-green-700 mt-1">📍 {wizardData.location}</p>
                  )}
                  {wizardData.virtual_meeting_url && (
                    <p className="text-sm text-green-700 mt-1">🎥 Virtual meeting link added</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Attendees & Reminders */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  Invite Attendees
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
                    placeholder="Enter email address"
                    type="email"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddAttendee}
                  >
                    Add
                  </Button>
                </div>
                {wizardData.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {wizardData.attendees.map(email => (
                      <Badge key={email} variant="secondary" className="py-1 px-3">
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(email)}
                          className="ml-2 text-gray-500 hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reminder" className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-500" />
                  Set Reminder
                </Label>
                <Select
                  value={wizardData.reminder_minutes.toString()}
                  onValueChange={(value) => setWizardData(prev => ({ ...prev, reminder_minutes: parseInt(value) }))}
                >
                  <SelectTrigger className="mt-2">
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
                <p className="text-xs text-gray-500 mt-1">Get notified before the event starts</p>
              </div>

              {wizardData.attendees.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    {wizardData.attendees.length} attendee{wizardData.attendees.length !== 1 ? 's' : ''} will be invited
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    They will receive an email invitation with event details
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4">Review Event Details</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Title:</span>
                    <span className="text-sm font-medium">{wizardData.title || 'Not set'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <Badge variant="outline">
                      {EVENT_TYPES.find(t => t.value === wizardData.event_type)?.label}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(wizardData.date).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {!wizardData.all_day && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Time:</span>
                      <span className="text-sm font-medium">
                        {wizardData.start_time} - {wizardData.end_time}
                      </span>
                    </div>
                  )}
                  
                  {wizardData.location && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm font-medium">{wizardData.location}</span>
                    </div>
                  )}
                  
                  {wizardData.virtual_meeting_url && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Virtual Meeting:</span>
                      <span className="text-sm font-medium">Yes</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Attendees:</span>
                    <span className="text-sm font-medium">
                      {wizardData.attendees.length} invited
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Reminder:</span>
                    <span className="text-sm font-medium">
                      {REMINDER_OPTIONS.find(r => r.value === wizardData.reminder_minutes)?.label}
                    </span>
                  </div>
                </div>
              </div>

              {wizardData.description && (
                <div className="p-4 bg-white border rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Description</p>
                  <p className="text-sm text-gray-600">{wizardData.description}</p>
                </div>
              )}

              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-green-900">Ready to create event</p>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Click "Create Event" to add this event to your calendar
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer with navigation buttons */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep || isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Event
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}