'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Bell,
  Mail,
  FileText,
  Users,
  Activity,
  AlertCircle,
  Save,
  Loader2,
  BellOff,
  Clock,
  Download,
  Upload
} from 'lucide-react'

interface NotificationsTabProps {
  vault: {
    id: string
    settings?: any
  }
  canEdit: boolean
  onUpdate: (updates: any) => Promise<void>
  isSaving: boolean
  onChangeDetected: () => void
}

interface NotificationSettings {
  emailNotifications: boolean
  newAssets: boolean
  memberJoins: boolean
  memberLeaves: boolean
  assetDownloads: boolean
  vaultExpiring: boolean
  digestFrequency: 'instant' | 'daily' | 'weekly' | 'never'
  activityAlerts: boolean
  mentionAlerts: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  newAssets: true,
  memberJoins: true,
  memberLeaves: false,
  assetDownloads: false,
  vaultExpiring: true,
  digestFrequency: 'daily',
  activityAlerts: true,
  mentionAlerts: true
}

export function NotificationsTab({
  vault,
  canEdit,
  onUpdate,
  isSaving,
  onChangeDetected
}: NotificationsTabProps) {
  const [formData, setFormData] = useState<NotificationSettings>(() => {
    const savedSettings = vault.settings?.notifications
    return savedSettings || DEFAULT_SETTINGS
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Detect changes
  useEffect(() => {
    const savedSettings = vault.settings?.notifications || DEFAULT_SETTINGS
    const changed = JSON.stringify(formData) !== JSON.stringify(savedSettings)
    
    if (changed && !hasChanges) {
      setHasChanges(true)
      onChangeDetected()
    }
  }, [formData, vault.settings, hasChanges, onChangeDetected])

  const handleToggle = (field: keyof NotificationSettings, value: boolean) => {
    if (!canEdit) return
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSelectChange = (field: keyof NotificationSettings, value: string) => {
    if (!canEdit) return
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!canEdit || !hasChanges) return

    const updates = {
      settings: {
        ...vault.settings,
        notifications: formData
      }
    }

    await onUpdate(updates)
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications Master Toggle */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </h3>

        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {formData.emailNotifications ? (
                <Bell className="h-4 w-4 text-blue-600" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
              <Label className="text-base font-medium">Enable Email Notifications</Label>
            </div>
            <p className="text-sm text-gray-500">
              Receive email updates about vault activity
            </p>
          </div>
          <Switch
            checked={formData.emailNotifications}
            onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
            disabled={!canEdit}
          />
        </div>

        {!formData.emailNotifications && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Email notifications are disabled. You won't receive any email updates about this vault.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      {/* Notification Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Types</h3>

        <div className="space-y-3">
          {/* New Assets */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">New Assets</Label>
                <p className="text-xs text-gray-500">When new files are added to the vault</p>
              </div>
            </div>
            <Switch
              checked={formData.newAssets}
              onCheckedChange={(checked) => handleToggle('newAssets', checked)}
              disabled={!canEdit || !formData.emailNotifications}
            />
          </div>

          {/* Member Joins */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Member Joins</Label>
                <p className="text-xs text-gray-500">When someone joins the vault</p>
              </div>
            </div>
            <Switch
              checked={formData.memberJoins}
              onCheckedChange={(checked) => handleToggle('memberJoins', checked)}
              disabled={!canEdit || !formData.emailNotifications}
            />
          </div>

          {/* Member Leaves */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Member Leaves</Label>
                <p className="text-xs text-gray-500">When someone leaves the vault</p>
              </div>
            </div>
            <Switch
              checked={formData.memberLeaves}
              onCheckedChange={(checked) => handleToggle('memberLeaves', checked)}
              disabled={!canEdit || !formData.emailNotifications}
            />
          </div>

          {/* Asset Downloads */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Asset Downloads</Label>
                <p className="text-xs text-gray-500">When someone downloads a file</p>
              </div>
            </div>
            <Switch
              checked={formData.assetDownloads}
              onCheckedChange={(checked) => handleToggle('assetDownloads', checked)}
              disabled={!canEdit || !formData.emailNotifications}
            />
          </div>

          {/* Vault Expiring */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Vault Expiring</Label>
                <p className="text-xs text-gray-500">Reminder before vault expires</p>
              </div>
            </div>
            <Switch
              checked={formData.vaultExpiring}
              onCheckedChange={(checked) => handleToggle('vaultExpiring', checked)}
              disabled={!canEdit || !formData.emailNotifications}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Digest Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Digest
        </h3>

        <div className="space-y-2">
          <Label>Email Frequency</Label>
          <Select
            value={formData.digestFrequency}
            onValueChange={(value) => handleSelectChange('digestFrequency', value)}
            disabled={!canEdit || !formData.emailNotifications}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="daily">Daily Summary</SelectItem>
              <SelectItem value="weekly">Weekly Summary</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            How often you receive activity summaries for this vault
          </p>
        </div>
      </div>

      <Separator />

      {/* In-App Alerts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">In-App Alerts</h3>

        <div className="space-y-3">
          {/* Activity Alerts */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Activity Alerts</Label>
                <p className="text-xs text-gray-500">Show notifications for vault activity</p>
              </div>
            </div>
            <Switch
              checked={formData.activityAlerts}
              onCheckedChange={(checked) => handleToggle('activityAlerts', checked)}
              disabled={!canEdit}
            />
          </div>

          {/* Mention Alerts */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-gray-500" />
              <div>
                <Label className="text-sm font-medium">Mention Alerts</Label>
                <p className="text-xs text-gray-500">When someone mentions you in the vault</p>
              </div>
            </div>
            <Switch
              checked={formData.mentionAlerts}
              onCheckedChange={(checked) => handleToggle('mentionAlerts', checked)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      {canEdit && hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}