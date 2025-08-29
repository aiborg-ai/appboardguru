'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar,
  Clock,
  MapPin,
  Repeat,
  Globe,
  AlertCircle
} from 'lucide-react';
import type { MeetingWizardData } from '../CreateMeetingWizard';

interface CalendarStepProps {
  data: MeetingWizardData;
  onUpdate: (_updates: Partial<MeetingWizardData>) => void;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const RECURRENCE_TYPES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function CalendarStep({ data, onUpdate }: CalendarStepProps) {
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // Default to next week at 10 AM if no date is set
  const defaultStart = React.useMemo(() => {
    if (data.scheduledStart) return data.scheduledStart;
    
    nextWeek.setHours(10, 0, 0, 0);
    return nextWeek.toISOString().slice(0, 16);
  }, [data.scheduledStart, nextWeek]);

  const defaultEnd = React.useMemo(() => {
    if (data.scheduledEnd) return data.scheduledEnd;
    
    const endTime = new Date(defaultStart);
    endTime.setHours(endTime.getHours() + 2); // Default 2 hour duration
    return endTime.toISOString().slice(0, 16);
  }, [data.scheduledEnd, defaultStart]);

  // Initialize dates if empty
  React.useEffect(() => {
    if (!data.scheduledStart || !data.scheduledEnd) {
      onUpdate({
        scheduledStart: defaultStart,
        scheduledEnd: defaultEnd,
      });
    }
  }, [data.scheduledStart, data.scheduledEnd, defaultStart, defaultEnd, onUpdate]);

  const handleStartTimeChange = (value: string) => {
    const startDate = new Date(value);
    let endDate = new Date(data.scheduledEnd || defaultEnd);
    
    // If end time is before start time, adjust end time to be 2 hours after start
    if (endDate <= startDate) {
      endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    }
    
    onUpdate({
      scheduledStart: value,
      scheduledEnd: endDate.toISOString().slice(0, 16),
    });
  };

  const handleEndTimeChange = (value: string) => {
    const endDate = new Date(value);
    const startDate = new Date(data.scheduledStart || defaultStart);
    
    // Ensure end time is after start time
    if (endDate <= startDate) {
      return; // Don't update if end is before start
    }
    
    onUpdate({ scheduledEnd: value });
  };

  const duration = React.useMemo(() => {
    if (!data.scheduledStart || !data.scheduledEnd) return 0;
    
    const start = new Date(data.scheduledStart);
    const end = new Date(data.scheduledEnd);
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60)); // duration in minutes
  }, [data.scheduledStart, data.scheduledEnd]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Schedule Your Meeting
        </h3>
        <p className="text-gray-600">
          Set the date, time, and location details for your meeting.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Date & Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="start-time">Start Date & Time *</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={data.scheduledStart || defaultStart}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  min={today.toISOString().slice(0, 16)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="end-time">End Date & Time *</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={data.scheduledEnd || defaultEnd}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  min={data.scheduledStart || defaultStart}
                  className="mt-1"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Duration: {formatDuration(duration)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={data.timezone}
                  onChange={(e) => onUpdate({ timezone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="location">Physical Location</Label>
              <Input
                id="location"
                placeholder="Conference room, address, or venue"
                value={data.location || ''}
                onChange={(e) => onUpdate({ location: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional - Leave blank for virtual-only meetings
              </p>
            </div>

            <div>
              <Label htmlFor="virtual-url">Virtual Meeting Link</Label>
              <Input
                id="virtual-url"
                placeholder="Zoom, Teams, or other meeting link"
                value={data.virtualMeetingUrl || ''}
                onChange={(e) => onUpdate({ virtualMeetingUrl: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional - Will be included in meeting invitations
              </p>
            </div>

            {!data.location && !data.virtualMeetingUrl && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">No location specified</p>
                  <p>Consider adding either a physical location or virtual meeting link.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recurrence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Repeat className="h-5 w-5" />
            <span>Recurrence</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="recurring"
              checked={data.isRecurring}
              onCheckedChange={(checked) => onUpdate({ isRecurring: checked })}
            />
            <Label htmlFor="recurring">This is a recurring meeting</Label>
          </div>

          {data.isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="recurrence-type">Repeat</Label>
                <select
                  id="recurrence-type"
                  value={data.recurrenceType || 'monthly'}
                  onChange={(e) => onUpdate({ recurrenceType: e.target.value as any })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {RECURRENCE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="recurrence-interval">Every</Label>
                <Input
                  id="recurrence-interval"
                  type="number"
                  min="1"
                  max="12"
                  value={data.recurrenceInterval || 1}
                  onChange={(e) => onUpdate({ recurrenceInterval: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="recurrence-end">End Date</Label>
                <Input
                  id="recurrence-end"
                  type="date"
                  value={data.recurrenceEndDate || ''}
                  onChange={(e) => onUpdate({ recurrenceEndDate: e.target.value })}
                  min={new Date(data.scheduledStart || defaultStart).toISOString().split('T')[0]}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-3">
                <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                  <Globe className="h-4 w-4 inline mr-2" />
                  <strong>Recurrence Summary:</strong> This meeting will repeat{' '}
                  {data.recurrenceType}{' '}
                  {data.recurrenceInterval && data.recurrenceInterval > 1 && 
                    `every ${data.recurrenceInterval} ${data.recurrenceType?.slice(0, -2)}s`
                  }
                  {data.recurrenceEndDate && ` until ${new Date(data.recurrenceEndDate).toLocaleDateString()}`}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Preview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Meeting Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Date:</span>
              <div className="text-blue-800">
                {data.scheduledStart 
                  ? new Date(data.scheduledStart).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not set'
                }
              </div>
            </div>
            
            <div>
              <span className="font-medium text-blue-900">Time:</span>
              <div className="text-blue-800">
                {data.scheduledStart && data.scheduledEnd
                  ? `${new Date(data.scheduledStart).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })} - ${new Date(data.scheduledEnd).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}`
                  : 'Not set'
                } ({data.timezone.replace(/_/g, ' ')})
              </div>
            </div>

            <div>
              <span className="font-medium text-blue-900">Duration:</span>
              <div className="text-blue-800">{formatDuration(duration)}</div>
            </div>

            <div>
              <span className="font-medium text-blue-900">Location:</span>
              <div className="text-blue-800">
                {data.location && data.virtualMeetingUrl 
                  ? 'Hybrid (In-person & Virtual)'
                  : data.location 
                    ? 'In-person'
                    : data.virtualMeetingUrl 
                      ? 'Virtual'
                      : 'To be determined'
                }
              </div>
            </div>

            {data.isRecurring && (
              <div className="md:col-span-2">
                <span className="font-medium text-blue-900">Recurrence:</span>
                <div className="text-blue-800">
                  Repeats {data.recurrenceType} 
                  {data.recurrenceInterval && data.recurrenceInterval > 1 && 
                    ` (every ${data.recurrenceInterval})`
                  }
                  {data.recurrenceEndDate && ` until ${new Date(data.recurrenceEndDate).toLocaleDateString()}`}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}