'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Textarea } from '@/features/shared/ui/textarea';
import { Label } from '@/features/shared/ui/label';
import { Badge } from '@/features/shared/ui/badge';
import { Switch } from '@/features/shared/ui/switch';
import { 
  Calendar,
  Clock,
  Users,
  FileText,
  MapPin,
  Video,
  Mail,
  Bell,
  Settings,
  CheckCircle,
  Send,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MeetingWizardData, AttendeeRole } from '../CreateMeetingWizard';

interface ReviewStepProps {
  data: MeetingWizardData;
  onUpdate: (updates: Partial<MeetingWizardData>) => void;
}

const ATTENDEE_ROLE_LABELS: Record<AttendeeRole, string> = {
  board_member: 'Board Member',
  guest: 'Guest',
  presenter: 'Presenter',
  observer: 'Observer',
  secretary: 'Secretary',
  facilitator: 'Facilitator',
};

export default function ReviewStep({ data, onUpdate }: ReviewStepProps) {
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

  const agendaDuration = data.agendaItems.reduce((sum, item) => sum + item.estimatedDuration, 0);
  const timeOverrun = agendaDuration > duration;

  const roleStats = data.invitees.reduce((acc, invitee) => {
    acc[invitee.role] = (acc[invitee.role] || 0) + 1;
    return acc;
  }, {} as Record<AttendeeRole, number>);

  const requiredAttendees = data.invitees.filter(inv => inv.isRequired).length;
  const optionalAttendees = data.invitees.filter(inv => !inv.isRequired).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Review & Broadcast Meeting
        </h3>
        <p className="text-gray-600">
          Review all meeting details and configure broadcast settings before sending invitations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Overview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Meeting Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{data.title}</h4>
                {data.description && (
                  <p className="text-gray-600 text-sm mt-1">{data.description}</p>
                )}
                <Badge className="mt-2 capitalize">
                  {data.meetingType.replace('_', ' ')}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Date:</span>
                  <div className="text-gray-900">
                    {data.scheduledStart 
                      ? new Date(data.scheduledStart).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Not set'
                    }
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Time:</span>
                  <div className="text-gray-900">
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
                    }
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-900">{formatDuration(duration)}</span>
                    {timeOverrun && (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>

                <div>
                  <span className="font-medium text-gray-700">Timezone:</span>
                  <div className="text-gray-900">{data.timezone.replace(/_/g, ' ')}</div>
                </div>

                <div className="col-span-2">
                  <span className="font-medium text-gray-700">Location:</span>
                  <div className="text-gray-900">
                    {data.location && data.virtualMeetingUrl 
                      ? `${data.location} + Virtual`
                      : data.location 
                        ? data.location
                        : data.virtualMeetingUrl 
                          ? 'Virtual Meeting'
                          : 'To be determined'
                    }
                  </div>
                </div>

                {data.isRecurring && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Recurrence:</span>
                    <div className="text-gray-900">
                      {data.recurrenceType} 
                      {data.recurrenceInterval && data.recurrenceInterval > 1 && 
                        ` (every ${data.recurrenceInterval})`
                      }
                      {data.recurrenceEndDate && ` until ${new Date(data.recurrenceEndDate).toLocaleDateString()}`}
                    </div>
                  </div>
                )}
              </div>

              {timeOverrun && (
                <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Schedule Warning</p>
                    <p>
                      Agenda duration ({formatDuration(agendaDuration)}) exceeds meeting time ({formatDuration(duration)}).
                      Consider adjusting agenda items or extending the meeting.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Agenda Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.agendaItems.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">{index + 1}.</span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.estimatedDuration}m
                    </Badge>
                  </div>
                ))}
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between font-medium text-sm">
                    <span>Total Agenda Time:</span>
                    <span className={cn(timeOverrun && "text-amber-600")}>
                      {formatDuration(agendaDuration)}
                    </span>
                  </div>
                </div>

                {data.documents.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Documents:</span>
                      <Badge variant="outline">{data.documents.length} files</Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendees & Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Attendees ({data.invitees.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Required:</span>
                  <div className="text-gray-900">{requiredAttendees}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Optional:</span>
                  <div className="text-gray-900">{optionalAttendees}</div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-sm mb-2">By Role:</h5>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(roleStats).map(([role, count]) => (
                    <div key={role} className="flex justify-between">
                      <span>{ATTENDEE_ROLE_LABELS[role as AttendeeRole]}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {data.invitees.length > 5 && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  <Info className="h-3 w-3 inline mr-1" />
                  Large meeting with {data.invitees.length} attendees. Consider using breakout sessions.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Meeting Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-virtual">Allow Virtual Attendance</Label>
                  <Switch
                    id="allow-virtual"
                    checked={data.settings.allowVirtualAttendance}
                    onCheckedChange={(checked) => 
                      onUpdate({ 
                        settings: { ...data.settings, allowVirtualAttendance: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="require-rsvp">Require RSVP</Label>
                  <Switch
                    id="require-rsvp"
                    checked={data.settings.requireRSVP}
                    onCheckedChange={(checked) => 
                      onUpdate({ 
                        settings: { ...data.settings, requireRSVP: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="send-reminders">Send Reminders</Label>
                  <Switch
                    id="send-reminders"
                    checked={data.settings.sendReminders}
                    onCheckedChange={(checked) => 
                      onUpdate({ 
                        settings: { ...data.settings, sendReminders: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-record">Auto Record</Label>
                  <Switch
                    id="auto-record"
                    checked={data.settings.autoRecord}
                    onCheckedChange={(checked) => 
                      onUpdate({ 
                        settings: { ...data.settings, autoRecord: checked }
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="agenda-suggestions">Allow Agenda Suggestions</Label>
                  <Switch
                    id="agenda-suggestions"
                    checked={data.settings.allowAgendaSuggestions}
                    onCheckedChange={(checked) => 
                      onUpdate({ 
                        settings: { ...data.settings, allowAgendaSuggestions: checked }
                      })
                    }
                  />
                </div>
              </div>

              {data.settings.sendReminders && (
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  <Bell className="h-3 w-3 inline mr-1" />
                  Reminders will be sent {data.settings.reminderIntervals.join(', ')} day(s) before the meeting.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Broadcast Message</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="broadcast-message">Custom Message (Optional)</Label>
                <Textarea
                  id="broadcast-message"
                  placeholder="Add a personal message to include with the meeting invitation..."
                  value={data.broadcastMessage || ''}
                  onChange={(e) => onUpdate({ broadcastMessage: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be included in all meeting invitations sent to attendees.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>Ready to Create & Broadcast</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">{data.invitees.length}</div>
              <div className="text-green-600">Attendees to Invite</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{data.agendaItems.length}</div>
              <div className="text-blue-600">Agenda Items</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{data.documents.length}</div>
              <div className="text-purple-600">Documents Attached</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white rounded border text-sm">
            <p className="font-medium text-gray-800 mb-1">What happens next:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Meeting will be created and saved to your organization</li>
              <li>• Calendar invitations will be sent to all attendees</li>
              <li>• Attendees will receive email notifications with meeting details</li>
              {data.settings.requireRSVP && <li>• RSVP responses will be tracked automatically</li>}
              {data.settings.sendReminders && <li>• Reminder emails will be sent based on your settings</li>}
              <li>• Meeting will appear in attendees' BoardGuru dashboards</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}