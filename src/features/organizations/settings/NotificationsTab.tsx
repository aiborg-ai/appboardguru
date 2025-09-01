'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import { 
  Bell, 
  Save, 
  Loader2,
  Mail,
  MessageSquare,
  Calendar,
  Shield,
  Activity,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react'

interface NotificationSettings {
  emailUpdates: boolean
  securityAlerts: boolean
  weeklyReports: boolean
  monthlyDigest: boolean
  activityAlerts: boolean
  memberUpdates: boolean
  documentNotifications: boolean
  meetingReminders: boolean
  complianceAlerts: boolean
  systemUpdates: boolean
  notificationFrequency: 'realtime' | 'daily' | 'weekly'
  quietHours: {
    enabled: boolean
    startTime: string
    endTime: string
  }
}

interface NotificationsTabProps {
  settings: NotificationSettings
  canEdit: boolean
  onUpdate: (settings: { notificationSettings: NotificationSettings }) => Promise<void>
}

export function NotificationsTab({ settings, canEdit, onUpdate }: NotificationsTabProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [localSettings, setLocalSettings] = React.useState<NotificationSettings>({
    ...settings,
    memberUpdates: settings.memberUpdates ?? true,
    documentNotifications: settings.documentNotifications ?? true,
    meetingReminders: settings.meetingReminders ?? true,
    complianceAlerts: settings.complianceAlerts ?? true,
    systemUpdates: settings.systemUpdates ?? false,
    notificationFrequency: settings.notificationFrequency || 'daily',
    quietHours: settings.quietHours || {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    }
  })
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    setLocalSettings({
      ...settings,
      memberUpdates: settings.memberUpdates ?? true,
      documentNotifications: settings.documentNotifications ?? true,
      meetingReminders: settings.meetingReminders ?? true,
      complianceAlerts: settings.complianceAlerts ?? true,
      systemUpdates: settings.systemUpdates ?? false,
      notificationFrequency: settings.notificationFrequency || 'daily',
      quietHours: settings.quietHours || {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00'
      }
    })
  }, [settings])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onUpdate({ notificationSettings: localSettings })
      setIsDirty(false)
      toast({
        title: 'Notification preferences updated',
        description: 'Your notification settings have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const updateQuietHours = (key: keyof NotificationSettings['quietHours'], value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value
      }
    }))
    setIsDirty(true)
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Updates</Label>
              <p className="text-sm text-muted-foreground">
                General updates and announcements
              </p>
            </div>
            <Switch
              checked={localSettings.emailUpdates}
              onCheckedChange={(checked) => updateSetting('emailUpdates', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Important security notifications and breach alerts
              </p>
            </div>
            <Switch
              checked={localSettings.securityAlerts}
              onCheckedChange={(checked) => updateSetting('securityAlerts', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Alerts
              </Label>
              <p className="text-sm text-muted-foreground">
                Notifications about organization activity
              </p>
            </div>
            <Switch
              checked={localSettings.activityAlerts}
              onCheckedChange={(checked) => updateSetting('activityAlerts', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Member Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                New members, role changes, and departures
              </p>
            </div>
            <Switch
              checked={localSettings.memberUpdates}
              onCheckedChange={(checked) => updateSetting('memberUpdates', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                New documents, updates, and sharing notifications
              </p>
            </div>
            <Switch
              checked={localSettings.documentNotifications}
              onCheckedChange={(checked) => updateSetting('documentNotifications', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Meeting Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Upcoming meetings and schedule changes
              </p>
            </div>
            <Switch
              checked={localSettings.meetingReminders}
              onCheckedChange={(checked) => updateSetting('meetingReminders', checked)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports & Digests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Reports & Digests
          </CardTitle>
          <CardDescription>
            Configure periodic reports and activity summaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">
                Weekly summary of organization activity
              </p>
            </div>
            <Switch
              checked={localSettings.weeklyReports}
              onCheckedChange={(checked) => updateSetting('weeklyReports', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Monthly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Comprehensive monthly activity report
              </p>
            </div>
            <Switch
              checked={localSettings.monthlyDigest}
              onCheckedChange={(checked) => updateSetting('monthlyDigest', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Compliance Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Compliance deadlines and requirement updates
              </p>
            </div>
            <Switch
              checked={localSettings.complianceAlerts}
              onCheckedChange={(checked) => updateSetting('complianceAlerts', checked)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Frequency
          </CardTitle>
          <CardDescription>
            How often do you want to receive notifications?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={localSettings.notificationFrequency}
            onValueChange={(value: 'realtime' | 'daily' | 'weekly') => 
              updateSetting('notificationFrequency', value)
            }
            disabled={!canEdit}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="realtime" id="realtime" />
              <label htmlFor="realtime" className="flex-1 cursor-pointer">
                <div className="font-medium">Real-time</div>
                <div className="text-sm text-muted-foreground">
                  Get notified immediately when something happens
                </div>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" />
              <label htmlFor="daily" className="flex-1 cursor-pointer">
                <div className="font-medium">Daily Summary</div>
                <div className="text-sm text-muted-foreground">
                  Receive a daily digest of all notifications
                </div>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="weekly" />
              <label htmlFor="weekly" className="flex-1 cursor-pointer">
                <div className="font-medium">Weekly Summary</div>
                <div className="text-sm text-muted-foreground">
                  Receive a weekly digest of all notifications
                </div>
              </label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause non-urgent notifications during specific hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Only urgent notifications will be sent during quiet hours
              </p>
            </div>
            <Switch
              checked={localSettings.quietHours.enabled}
              onCheckedChange={(checked) => updateQuietHours('enabled', checked)}
              disabled={!canEdit}
            />
          </div>

          {localSettings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time</Label>
                <input
                  id="start-time"
                  type="time"
                  value={localSettings.quietHours.startTime}
                  onChange={(e) => updateQuietHours('startTime', e.target.value)}
                  disabled={!canEdit}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time</Label>
                <input
                  id="end-time"
                  type="time"
                  value={localSettings.quietHours.endTime}
                  onChange={(e) => updateQuietHours('endTime', e.target.value)}
                  disabled={!canEdit}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {canEdit && isDirty && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Notification Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}