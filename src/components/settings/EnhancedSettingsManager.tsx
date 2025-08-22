/**
 * Enhanced Settings Manager
 * Comprehensive settings management component with validation, error handling, and service integration
 * Follows CLAUDE.md patterns with complete integration of the settings system
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Download, 
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  RefreshCw,
  Info
} from 'lucide-react'
import { useSettings, useNotificationSettings, useSecuritySettings, useExportSettings } from '../../hooks/useSettings'
import { SettingsValidationProvider, useValidation } from './SettingsValidationProvider'
import {
  UserSettings,
  UserSettingsUpdate,
  AccountType,
  NotificationPreference,
  ExportConfiguration,
  CorporateProfileSettings,
  SecuritySettings,
  NotificationGeneralSettings
} from '../../types/settings-validation'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Alert } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Progress } from '../ui/progress'
import { Separator } from '../ui/separator'

// ==== Main Settings Manager Component ====

interface EnhancedSettingsManagerProps {
  userId: string
  organizationId: string
  accountType: AccountType
  initialTab?: string
  onSettingsChange?: (settings: UserSettings) => void
  onError?: (error: any) => void
}

export function EnhancedSettingsManager({
  userId,
  organizationId,
  accountType,
  initialTab = 'profile',
  onSettingsChange,
  onError
}: EnhancedSettingsManagerProps) {
  // Get organization policies (placeholder - would come from actual data)
  const organizationPolicies = {
    requireMFA: accountType === 'Superuser',
    allowDelegation: true,
    dataRetentionDays: 2555,
    allowPersonalExports: true,
    requireApprovalForExports: false
  }

  return (
    <SettingsValidationProvider
      accountType={accountType}
      organizationPolicies={organizationPolicies}
      onValidationChange={(validationState) => {
        console.log('Validation state changed:', validationState)
      }}
    >
      <SettingsManagerContent
        userId={userId}
        organizationId={organizationId}
        accountType={accountType}
        initialTab={initialTab}
        onSettingsChange={onSettingsChange}
        onError={onError}
      />
    </SettingsValidationProvider>
  )
}

// ==== Settings Manager Content ====

function SettingsManagerContent({
  userId,
  organizationId,
  accountType,
  initialTab,
  onSettingsChange,
  onError
}: Omit<EnhancedSettingsManagerProps, 'initialTab'> & { initialTab: string }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<UserSettingsUpdate>({})
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Hooks
  const settings = useSettings({
    autoLoad: true,
    enableValidation: true,
    enablePermissionChecks: true,
    onSettingsChange,
    onError
  })

  const validation = useValidation()

  // Handle form changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev }
      
      // Handle nested field updates
      const fieldParts = field.split('.')
      let current = newChanges
      
      for (let i = 0; i < fieldParts.length - 1; i++) {
        const part = fieldParts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
      
      current[fieldParts[fieldParts.length - 1]] = value
      return newChanges
    })

    // Validate field
    validation.validateField(field, value, {
      accountType,
      currentSettings: settings.state.userSettings
    })
  }, [validation, accountType, settings.state.userSettings])

  // Save changes
  const handleSave = useCallback(async () => {
    try {
      // Validate entire form first
      const validationResult = await validation.validateForm(
        { ...settings.state.userSettings, ...pendingChanges },
        'user'
      )

      if (!validationResult.canSubmit) {
        return
      }

      const result = await settings.actions.updateUserSettings(
        {
          userId: userId as any,
          organizationId: organizationId as any,
          ...pendingChanges
        },
        'User settings update'
      )

      if (result.success) {
        setPendingChanges({})
        validation.clearValidation()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [settings, pendingChanges, userId, organizationId, validation])

  // Reset to defaults
  const handleReset = useCallback(async () => {
    try {
      await settings.actions.resetUserSettings()
      setPendingChanges({})
      validation.clearValidation()
      setShowResetConfirm(false)
    } catch (error) {
      console.error('Failed to reset settings:', error)
    }
  }, [settings, validation])

  // Calculate save progress
  const saveProgress = settings.state.loading ? 
    (Object.keys(pendingChanges).length / Math.max(Object.keys(settings.state.userSettings || {}).length, 1)) * 100 :
    0

  if (!settings.state.userSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">
              Manage your account preferences and security settings
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSensitiveData(!showSensitiveData)}
          >
            {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
          </Button>
          
          <Badge variant={settings.hasUnsavedChanges ? 'destructive' : 'secondary'}>
            {settings.hasUnsavedChanges ? 'Unsaved Changes' : 'Saved'}
          </Badge>
        </div>
      </div>

      {/* Global Validation Summary */}
      {validation.validationState.summary.totalErrors > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Validation Errors</h4>
            <p className="text-sm">
              {validation.validationState.summary.totalErrors} error(s) found. 
              Please review the highlighted fields below.
            </p>
          </div>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              {[
                { id: 'profile', label: 'Profile', icon: User, description: 'Personal information' },
                { id: 'security', label: 'Security', icon: Shield, description: 'Authentication & access' },
                { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Communication preferences' },
                { id: 'exports', label: 'Data Export', icon: Download, description: 'Backup & export settings' }
              ].map(tab => {
                const isActive = activeTab === tab.id
                const hasErrors = Object.keys(validation.validationState.fields)
                  .some(field => field.startsWith(tab.id) && validation.validationState.fields[field].hasErrors)
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <tab.icon className={`h-5 w-5 mt-0.5 ${
                        isActive ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className={`font-medium flex items-center ${
                          isActive ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {tab.label}
                          {hasErrors && (
                            <AlertTriangle className="h-3 w-3 text-red-500 ml-1" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {tab.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <ProfileSettings
              settings={settings.state.userSettings}
              onChange={handleFieldChange}
              validation={validation}
              showSensitive={showSensitiveData}
              accountType={accountType}
            />
          )}

          {activeTab === 'security' && (
            <SecuritySettingsTab
              settings={settings.state.userSettings}
              onChange={handleFieldChange}
              validation={validation}
              showSensitive={showSensitiveData}
              accountType={accountType}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettingsTab
              settings={settings.state.userSettings}
              onChange={handleFieldChange}
              validation={validation}
              accountType={accountType}
            />
          )}

          {activeTab === 'exports' && (
            <ExportSettingsTab
              settings={settings.state.userSettings}
              onChange={handleFieldChange}
              validation={validation}
              accountType={accountType}
              onCreateExport={settings.actions.createExport}
            />
          )}

          {/* Action Bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {validation.validationState.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-sm text-gray-600">
                    {validation.validationState.isValid 
                      ? 'All settings are valid' 
                      : `${validation.validationState.summary.totalErrors} validation error(s)`
                    }
                  </span>
                </div>

                {settings.state.loading && (
                  <div className="flex items-center space-x-2">
                    <Progress value={saveProgress} className="w-24" />
                    <span className="text-sm text-gray-500">Saving...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={settings.state.loading}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={!settings.hasUnsavedChanges || !validation.validationState.canSubmit || settings.state.loading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>

            {settings.state.lastUpdateTimestamp && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last saved: {new Date(settings.state.lastUpdateTimestamp).toLocaleString()}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Settings to Defaults</DialogTitle>
            <DialogDescription>
              This will reset all your settings to the organization defaults. 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Error Display */}
      {settings.state.error && (
        <Alert variant="destructive" className="fixed bottom-4 right-4 max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Error</h4>
            <p className="text-sm">{settings.state.error}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={settings.actions.clearError}
            >
              Dismiss
            </Button>
          </div>
        </Alert>
      )}
    </div>
  )
}

// ==== Profile Settings Component ====

interface ProfileSettingsProps {
  settings: UserSettings
  onChange: (field: string, value: any) => void
  validation: any
  showSensitive: boolean
  accountType: AccountType
}

function ProfileSettings({ settings, onChange, validation, showSensitive, accountType }: ProfileSettingsProps) {
  const profile = settings.corporateProfile || {}

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
          <p className="text-sm text-gray-600">
            Update your professional profile and contact information
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={profile.firstName || ''}
              onChange={(e) => onChange('corporateProfile.firstName', e.target.value)}
              data-validation-error={validation.getFieldStatus('corporateProfile.firstName') === 'invalid'}
            />
            <ValidationMessage field="corporateProfile.firstName" validation={validation} />
          </div>

          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={profile.lastName || ''}
              onChange={(e) => onChange('corporateProfile.lastName', e.target.value)}
              data-validation-error={validation.getFieldStatus('corporateProfile.lastName') === 'invalid'}
            />
            <ValidationMessage field="corporateProfile.lastName" validation={validation} />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={showSensitive ? (profile.email || '') : '***@***.com'}
              onChange={(e) => onChange('corporateProfile.email', e.target.value)}
              disabled={!showSensitive}
              data-validation-error={validation.getFieldStatus('corporateProfile.email') === 'invalid'}
            />
            <ValidationMessage field="corporateProfile.email" validation={validation} />
          </div>

          <div>
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={profile.title || ''}
              onChange={(e) => onChange('corporateProfile.title', e.target.value)}
              data-validation-error={validation.getFieldStatus('corporateProfile.title') === 'invalid'}
            />
            <ValidationMessage field="corporateProfile.title" validation={validation} />
          </div>

          <div>
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              value={profile.department || ''}
              onChange={(e) => onChange('corporateProfile.department', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={showSensitive ? (profile.phoneNumber || '') : '***-***-****'}
              onChange={(e) => onChange('corporateProfile.phoneNumber', e.target.value)}
              disabled={!showSensitive}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={profile.bio || ''}
            onChange={(e) => onChange('corporateProfile.bio', e.target.value)}
            placeholder="Brief professional bio..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            value={profile.timezone || 'America/New_York'}
            onValueChange={(value) => onChange('corporateProfile.timezone', value)}
          >
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">GMT/BST</option>
            <option value="Europe/Berlin">CET/CEST</option>
          </Select>
        </div>
      </div>
    </Card>
  )
}

// ==== Security Settings Component ====

function SecuritySettingsTab({ settings, onChange, validation, showSensitive, accountType }: ProfileSettingsProps) {
  const security = settings.security || {}
  const advancedSecurity = settings.advancedSecurity || {}

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Authentication & Security</h3>
            <p className="text-sm text-gray-600">
              Configure your security preferences and access controls
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mfaEnabled">Multi-Factor Authentication</Label>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              id="mfaEnabled"
              checked={security.mfaEnabled || false}
              onCheckedChange={(checked) => onChange('security.mfaEnabled', checked)}
            />
          </div>

          {security.mfaEnabled && (
            <div>
              <Label htmlFor="mfaMethod">MFA Method</Label>
              <Select
                value={security.mfaMethod || 'totp'}
                onValueChange={(value) => onChange('security.mfaMethod', value)}
              >
                <option value="totp">Authenticator App</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              min="5"
              max="480"
              value={security.sessionTimeoutMinutes || 60}
              onChange={(e) => onChange('security.sessionTimeoutMinutes', parseInt(e.target.value))}
              data-validation-error={validation.getFieldStatus('security.sessionTimeoutMinutes') === 'invalid'}
            />
            <ValidationMessage field="security.sessionTimeoutMinutes" validation={validation} />
          </div>

          {accountType === 'Superuser' && (
            <div>
              <Label htmlFor="allowedIPs">Allowed IP Addresses</Label>
              <Textarea
                id="allowedIPs"
                value={showSensitive ? (security.allowedLoginIPs?.join('\n') || '') : '***.***.***.***.***'}
                onChange={(e) => onChange('security.allowedLoginIPs', e.target.value.split('\n').filter(Boolean))}
                disabled={!showSensitive}
                placeholder="Enter IP addresses, one per line"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to allow access from any IP address
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ==== Notification Settings Component ====

function NotificationSettingsTab({ settings, onChange, validation, accountType }: ProfileSettingsProps) {
  const notifications = settings.notifications?.general || {}

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
          <p className="text-sm text-gray-600">
            Control how and when you receive notifications
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="globalEnabled">Global Notifications</Label>
            <p className="text-sm text-gray-600">
              Enable or disable all notifications
            </p>
          </div>
          <Switch
            id="globalEnabled"
            checked={notifications.globalEnabled ?? true}
            onCheckedChange={(checked) => onChange('notifications.general.globalEnabled', checked)}
          />
        </div>

        {notifications.globalEnabled && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="maxNotifications">Max Notifications per Hour</Label>
              <Input
                id="maxNotifications"
                type="number"
                min="1"
                max="100"
                value={notifications.maxNotificationsPerHour || 25}
                onChange={(e) => onChange('notifications.general.maxNotificationsPerHour', parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="bundleSimilar">Bundle Similar Notifications</Label>
                <p className="text-sm text-gray-600">
                  Group related notifications together
                </p>
              </div>
              <Switch
                id="bundleSimilar"
                checked={notifications.bundleSimilar ?? true}
                onCheckedChange={(checked) => onChange('notifications.general.bundleSimilar', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="smartBatching">Smart Batching</Label>
                <p className="text-sm text-gray-600">
                  Deliver notifications at optimal times
                </p>
              </div>
              <Switch
                id="smartBatching"
                checked={notifications.smartBatching ?? true}
                onCheckedChange={(checked) => onChange('notifications.general.smartBatching', checked)}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

// ==== Export Settings Component ====

interface ExportSettingsTabProps extends ProfileSettingsProps {
  onCreateExport: (config: ExportConfiguration) => Promise<any>
}

function ExportSettingsTab({ settings, onChange, validation, accountType, onCreateExport }: ExportSettingsTabProps) {
  const exports = settings.exports || {}

  const handleQuickExport = useCallback(async () => {
    const config: ExportConfiguration = {
      categories: ['board_governance', 'documents'],
      format: 'json',
      includeFiles: true,
      includeMetadata: true,
      anonymizePersonalData: false,
      encryption: 'none',
      dateRange: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        endDate: new Date().toISOString()
      }
    }

    try {
      await onCreateExport(config)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [onCreateExport])

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Data Export & Backup</h3>
            <p className="text-sm text-gray-600">
              Export your data and configure automated backups
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="font-medium text-blue-900">Quick Export</h4>
              <p className="text-sm text-blue-700">
                Export recent board data and documents
              </p>
            </div>
            <Button onClick={handleQuickExport}>
              <Download className="h-4 w-4 mr-2" />
              Start Export
            </Button>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Scheduled Exports</h4>
            {exports.scheduled && exports.scheduled.length > 0 ? (
              <div className="space-y-3">
                {exports.scheduled.map((scheduledExport, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{scheduledExport.name}</p>
                      <p className="text-sm text-gray-600">
                        {scheduledExport.frequency} • Next: {new Date(scheduledExport.nextRun).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={scheduledExport.enabled ? 'default' : 'secondary'}>
                      {scheduledExport.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Download className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No scheduled exports configured</p>
                <p className="text-sm">Set up automated data exports for regular backups</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ==== Validation Message Component ====

interface ValidationMessageProps {
  field: string
  validation: any
}

function ValidationMessage({ field, validation }: ValidationMessageProps) {
  const status = validation.getFieldStatus(field)
  const message = validation.getFieldMessage(field)
  const icon = validation.getFieldIcon(field)

  if (!message) return null

  const colorClass = {
    valid: 'text-green-600',
    invalid: 'text-red-600',
    warning: 'text-yellow-600',
    pending: 'text-blue-600'
  }[status]

  return (
    <div className={`flex items-center space-x-1 mt-1 text-sm ${colorClass}`}>
      {icon}
      <span>{message}</span>
    </div>
  )
}

export default EnhancedSettingsManager