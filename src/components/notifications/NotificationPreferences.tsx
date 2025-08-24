/**
 * Notification Preferences Component
 * 
 * Enterprise notification preference management with:
 * - Category-specific settings
 * - Channel preferences (push, email, SMS, etc.)
 * - Do Not Disturb scheduling
 * - Escalation settings
 * - Device management
 * - Compliance controls
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Label } from '@/features/shared/ui/label';
import { Switch } from '@/features/shared/ui/switch';
import { Slider } from '@/features/shared/ui/slider';
import { Badge } from '@/features/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { Input } from '@/features/shared/ui/input';
import { Textarea } from '@/features/shared/ui/textarea';
import { ScrollArea } from '@/features/shared/ui/scroll-area';
import { Separator } from '@/features/shared/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/features/shared/ui/alert-dialog';
import { useToast } from '@/features/shared/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellOff,
  Smartphone,
  Mail,
  MessageSquare,
  Globe,
  Webhook,
  Clock,
  Moon,
  Sun,
  Shield,
  AlertTriangle,
  Calendar,
  Vote,
  FileText,
  Flag,
  Settings,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  Eye,
  Users,
  MapPin,
  Zap,
  Timer,
  CheckCircle
} from 'lucide-react';
import type { NotificationCategory, NotificationPriority, DeliveryChannel } from '@/lib/services/push-notification.service';
import type { DevicePreferences, PushDevice } from '@/lib/services/push-notification.service';

// Types for preferences
interface NotificationPreferencesData {
  // Global settings
  enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  
  // Channel preferences
  channels: Record<DeliveryChannel, {
    enabled: boolean;
    priority: number;
    quiet_hours_override: boolean;
    sound_enabled: boolean;
    vibration_enabled: boolean;
  }>;
  
  // Category preferences
  categories: Record<NotificationCategory, {
    enabled: boolean;
    channels: DeliveryChannel[];
    priority_threshold: NotificationPriority;
    escalation_minutes: number;
    escalation_enabled: boolean;
    escalation_channels: DeliveryChannel[];
  }>;
  
  // Advanced settings
  frequency_limits: {
    max_per_hour: number;
    max_per_day: number;
    batch_similar: boolean;
    batch_window_minutes: number;
  };
  
  // Enterprise settings
  compliance_mode: boolean;
  audit_trail_enabled: boolean;
  data_retention_days: number;
}

interface NotificationPreferencesProps {
  userId?: string;
  organizationId?: string;
  onSave?: (preferences: NotificationPreferencesData) => Promise<void>;
  onReset?: () => Promise<void>;
  className?: string;
}

// Default preferences
const defaultPreferences: NotificationPreferencesData = {
  enabled: true,
  quiet_hours_enabled: true,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  channels: {
    push: {
      enabled: true,
      priority: 1,
      quiet_hours_override: true,
      sound_enabled: true,
      vibration_enabled: true
    },
    email: {
      enabled: true,
      priority: 2,
      quiet_hours_override: false,
      sound_enabled: false,
      vibration_enabled: false
    },
    sms: {
      enabled: false,
      priority: 3,
      quiet_hours_override: true,
      sound_enabled: false,
      vibration_enabled: false
    },
    in_app: {
      enabled: true,
      priority: 4,
      quiet_hours_override: false,
      sound_enabled: true,
      vibration_enabled: false
    },
    webhook: {
      enabled: false,
      priority: 5,
      quiet_hours_override: false,
      sound_enabled: false,
      vibration_enabled: false
    }
  },
  categories: {
    emergency_board_matter: {
      enabled: true,
      channels: ['push', 'email', 'sms'],
      priority_threshold: 'medium',
      escalation_minutes: 5,
      escalation_enabled: true,
      escalation_channels: ['sms', 'email']
    },
    time_sensitive_voting: {
      enabled: true,
      channels: ['push', 'in_app'],
      priority_threshold: 'medium',
      escalation_minutes: 15,
      escalation_enabled: true,
      escalation_channels: ['email']
    },
    compliance_alert: {
      enabled: true,
      channels: ['push', 'email'],
      priority_threshold: 'low',
      escalation_minutes: 30,
      escalation_enabled: true,
      escalation_channels: ['email']
    },
    meeting_notification: {
      enabled: true,
      channels: ['push', 'in_app'],
      priority_threshold: 'low',
      escalation_minutes: 60,
      escalation_enabled: false,
      escalation_channels: []
    },
    governance_update: {
      enabled: true,
      channels: ['in_app', 'email'],
      priority_threshold: 'low',
      escalation_minutes: 240,
      escalation_enabled: false,
      escalation_channels: []
    },
    security_alert: {
      enabled: true,
      channels: ['push', 'email', 'sms'],
      priority_threshold: 'medium',
      escalation_minutes: 2,
      escalation_enabled: true,
      escalation_channels: ['sms']
    }
  },
  frequency_limits: {
    max_per_hour: 20,
    max_per_day: 100,
    batch_similar: true,
    batch_window_minutes: 15
  },
  compliance_mode: false,
  audit_trail_enabled: true,
  data_retention_days: 90
};

// Category configurations
const categoryConfig = {
  emergency_board_matter: {
    label: 'Emergency Board Matters',
    description: 'Critical board decisions requiring immediate attention',
    icon: Shield,
    color: 'text-red-500'
  },
  time_sensitive_voting: {
    label: 'Time-Sensitive Voting',
    description: 'Voting deadlines and critical resolutions',
    icon: Vote,
    color: 'text-purple-500'
  },
  compliance_alert: {
    label: 'Compliance Alerts',
    description: 'Regulatory and compliance notifications',
    icon: Flag,
    color: 'text-orange-500'
  },
  meeting_notification: {
    label: 'Meeting Notifications',
    description: 'Meeting schedules, updates, and reminders',
    icon: Calendar,
    color: 'text-blue-500'
  },
  governance_update: {
    label: 'Governance Updates',
    description: 'General governance news and updates',
    icon: FileText,
    color: 'text-green-500'
  },
  security_alert: {
    label: 'Security Alerts',
    description: 'Security incidents and threats',
    icon: AlertTriangle,
    color: 'text-red-600'
  }
};

// Channel configurations
const channelConfig = {
  push: {
    label: 'Push Notifications',
    description: 'Mobile and desktop push notifications',
    icon: Bell,
    color: 'text-blue-500'
  },
  email: {
    label: 'Email',
    description: 'Email notifications',
    icon: Mail,
    color: 'text-green-500'
  },
  sms: {
    label: 'SMS',
    description: 'Text message notifications',
    icon: MessageSquare,
    color: 'text-purple-500'
  },
  in_app: {
    label: 'In-App',
    description: 'Notifications within the application',
    icon: Globe,
    color: 'text-orange-500'
  },
  webhook: {
    label: 'Webhook',
    description: 'Integration notifications',
    icon: Webhook,
    color: 'text-gray-500'
  }
};

// Priority configurations
const priorityConfig = {
  critical: { label: 'Critical', color: 'text-red-500' },
  high: { label: 'High', color: 'text-orange-500' },
  medium: { label: 'Medium', color: 'text-blue-500' },
  low: { label: 'Low', color: 'text-gray-500' }
};

// Timezone options (simplified list)
const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' }
];

export function NotificationPreferences({
  userId,
  organizationId,
  onSave,
  onReset,
  className
}: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferencesData>(defaultPreferences);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const { toast } = useToast();

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [userId, organizationId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      // This would load from API
      // const response = await fetch(`/api/users/${userId}/notification-preferences`);
      // const data = await response.json();
      // setPreferences(data);
      
      // For now, use defaults
      setPreferences(defaultPreferences);
    } catch (error) {
      toast({
        title: 'Failed to load preferences',
        description: 'Using default settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle preference changes
  const updatePreference = useCallback((path: string, value: any) => {
    setPreferences(prev => {
      const newPrefs = { ...prev };
      const keys = path.split('.');
      let current = newPrefs as any;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newPrefs;
    });
    setHasChanges(true);
  }, []);

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(preferences);
      }
      
      setHasChanges(false);
      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated',
      });
    } catch (error) {
      toast({
        title: 'Failed to save preferences',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset preferences
  const handleReset = async () => {
    try {
      if (onReset) {
        await onReset();
      }
      setPreferences(defaultPreferences);
      setHasChanges(false);
      toast({
        title: 'Preferences reset',
        description: 'All settings have been restored to defaults',
      });
    } catch (error) {
      toast({
        title: 'Failed to reset preferences',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Render channel settings
  const renderChannelSettings = (channel: DeliveryChannel) => {
    const config = channelConfig[channel];
    const channelPrefs = preferences.channels[channel];

    return (
      <Card key={channel}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-muted"
              )}>
                <config.icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div>
                <CardTitle className="text-base">{config.label}</CardTitle>
                <CardDescription className="text-sm">
                  {config.description}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={channelPrefs.enabled}
              onCheckedChange={(checked) =>
                updatePreference(`channels.${channel}.enabled`, checked)
              }
            />
          </div>
        </CardHeader>

        {channelPrefs.enabled && (
          <CardContent>
            <div className="space-y-4">
              {/* Priority */}
              <div>
                <Label className="text-sm font-medium">Priority</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Lower numbers = higher priority
                </p>
                <Slider
                  value={[channelPrefs.priority]}
                  onValueChange={([value]) =>
                    updatePreference(`channels.${channel}.priority`, value)
                  }
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 (Highest)</span>
                  <span>5 (Lowest)</span>
                </div>
              </div>

              {/* Channel-specific options */}
              {(channel === 'push' || channel === 'in_app') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Volume2 className="h-4 w-4" />
                      <Label className="text-sm">Sound</Label>
                    </div>
                    <Switch
                      checked={channelPrefs.sound_enabled}
                      onCheckedChange={(checked) =>
                        updatePreference(`channels.${channel}.sound_enabled`, checked)
                      }
                    />
                  </div>

                  {channel === 'push' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Vibrate className="h-4 w-4" />
                        <Label className="text-sm">Vibration</Label>
                      </div>
                      <Switch
                        checked={channelPrefs.vibration_enabled}
                        onCheckedChange={(checked) =>
                          updatePreference(`channels.${channel}.vibration_enabled`, checked)
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Quiet hours override */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Moon className="h-4 w-4" />
                  <Label className="text-sm">Override Quiet Hours</Label>
                </div>
                <Switch
                  checked={channelPrefs.quiet_hours_override}
                  onCheckedChange={(checked) =>
                    updatePreference(`channels.${channel}.quiet_hours_override`, checked)
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  // Render category settings
  const renderCategorySettings = (category: NotificationCategory) => {
    const config = categoryConfig[category];
    const categoryPrefs = preferences.categories[category];

    return (
      <Card key={category}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                "bg-muted"
              )}>
                <config.icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div>
                <CardTitle className="text-base">{config.label}</CardTitle>
                <CardDescription className="text-sm">
                  {config.description}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={categoryPrefs.enabled}
              onCheckedChange={(checked) =>
                updatePreference(`categories.${category}.enabled`, checked)
              }
            />
          </div>
        </CardHeader>

        {categoryPrefs.enabled && (
          <CardContent>
            <div className="space-y-6">
              {/* Channels */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Delivery Channels</Label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(channelConfig).map(([channelKey, channelConf]) => {
                    const isSelected = categoryPrefs.channels.includes(channelKey as DeliveryChannel);
                    const isChannelEnabled = preferences.channels[channelKey as DeliveryChannel].enabled;
                    
                    return (
                      <Button
                        key={channelKey}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        disabled={!isChannelEnabled}
                        onClick={() => {
                          const currentChannels = [...categoryPrefs.channels];
                          if (isSelected) {
                            const index = currentChannels.indexOf(channelKey as DeliveryChannel);
                            currentChannels.splice(index, 1);
                          } else {
                            currentChannels.push(channelKey as DeliveryChannel);
                          }
                          updatePreference(`categories.${category}.channels`, currentChannels);
                        }}
                        className="flex items-center justify-start space-x-2"
                      >
                        <channelConf.icon className="h-4 w-4" />
                        <span>{channelConf.label}</span>
                        {isSelected && <CheckCircle className="h-3 w-3 ml-auto" />}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Priority threshold */}
              <div>
                <Label className="text-sm font-medium">Minimum Priority</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Only show notifications at or above this priority level
                </p>
                <Select
                  value={categoryPrefs.priority_threshold}
                  onValueChange={(value) =>
                    updatePreference(`categories.${category}.priority_threshold`, value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Escalation settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Enable Escalation</Label>
                  <Switch
                    checked={categoryPrefs.escalation_enabled}
                    onCheckedChange={(checked) =>
                      updatePreference(`categories.${category}.escalation_enabled`, checked)
                    }
                  />
                </div>

                {categoryPrefs.escalation_enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-muted">
                    <div>
                      <Label className="text-sm">Escalation Delay (minutes)</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <Slider
                          value={[categoryPrefs.escalation_minutes]}
                          onValueChange={([value]) =>
                            updatePreference(`categories.${category}.escalation_minutes`, value)
                          }
                          min={1}
                          max={480}
                          step={1}
                          className="flex-1"
                        />
                        <Badge variant="outline">{categoryPrefs.escalation_minutes}m</Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Escalation Channels</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(channelConfig).map(([channelKey, channelConf]) => {
                          const isSelected = categoryPrefs.escalation_channels.includes(channelKey as DeliveryChannel);
                          const isChannelEnabled = preferences.channels[channelKey as DeliveryChannel].enabled;
                          
                          return (
                            <Button
                              key={channelKey}
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              disabled={!isChannelEnabled}
                              onClick={() => {
                                const currentChannels = [...categoryPrefs.escalation_channels];
                                if (isSelected) {
                                  const index = currentChannels.indexOf(channelKey as DeliveryChannel);
                                  currentChannels.splice(index, 1);
                                } else {
                                  currentChannels.push(channelKey as DeliveryChannel);
                                }
                                updatePreference(`categories.${category}.escalation_channels`, currentChannels);
                              }}
                              className="flex items-center space-x-2 text-xs"
                            >
                              <channelConf.icon className="h-3 w-3" />
                              <span>{channelConf.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
              <CardDescription>
                Customize how and when you receive notifications
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all preferences?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will restore all notification settings to their default values. 
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                size="sm"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Global enable/disable */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              {preferences.enabled ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-base font-medium">
                  {preferences.enabled ? 'Notifications Enabled' : 'Notifications Disabled'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {preferences.enabled 
                    ? 'You will receive notifications based on your preferences below'
                    : 'All notifications are currently disabled'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => updatePreference('enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different preference sections */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Basic notification preferences and global settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Timezone */}
              <div>
                <Label className="text-sm font-medium">Timezone</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used for scheduling notifications and quiet hours
                </p>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) => updatePreference('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezoneOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frequency Limits */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Frequency Limits</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Max per hour</Label>
                    <Input
                      type="number"
                      value={preferences.frequency_limits.max_per_hour}
                      onChange={(e) =>
                        updatePreference('frequency_limits.max_per_hour', parseInt(e.target.value) || 0)
                      }
                      min={1}
                      max={100}
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Max per day</Label>
                    <Input
                      type="number"
                      value={preferences.frequency_limits.max_per_day}
                      onChange={(e) =>
                        updatePreference('frequency_limits.max_per_day', parseInt(e.target.value) || 0)
                      }
                      min={1}
                      max={1000}
                    />
                  </div>
                </div>
              </div>

              {/* Batching */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Batch Similar Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Group similar notifications together to reduce interruptions
                    </p>
                  </div>
                  <Switch
                    checked={preferences.frequency_limits.batch_similar}
                    onCheckedChange={(checked) =>
                      updatePreference('frequency_limits.batch_similar', checked)
                    }
                  />
                </div>

                {preferences.frequency_limits.batch_similar && (
                  <div>
                    <Label className="text-sm">Batch Window (minutes)</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <Slider
                        value={[preferences.frequency_limits.batch_window_minutes]}
                        onValueChange={([value]) =>
                          updatePreference('frequency_limits.batch_window_minutes', value)
                        }
                        min={1}
                        max={60}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="outline">
                        {preferences.frequency_limits.batch_window_minutes}m
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Settings */}
        <TabsContent value="channels" className="space-y-4">
          <div className="space-y-4">
            {Object.keys(channelConfig).map(channel =>
              renderChannelSettings(channel as DeliveryChannel)
            )}
          </div>
        </TabsContent>

        {/* Category Settings */}
        <TabsContent value="categories" className="space-y-4">
          <div className="space-y-4">
            {Object.keys(categoryConfig).map(category =>
              renderCategorySettings(category as NotificationCategory)
            )}
          </div>
        </TabsContent>

        {/* Schedule Settings */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when non-critical notifications should be silenced
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable Quiet Hours</Label>
                  <p className="text-xs text-muted-foreground">
                    Notifications will be silenced during these hours unless overridden
                  </p>
                </div>
                <Switch
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(checked) =>
                    updatePreference('quiet_hours_enabled', checked)
                  }
                />
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Start Time</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours_start}
                      onChange={(e) =>
                        updatePreference('quiet_hours_start', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-sm">End Time</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours_end}
                      onChange={(e) =>
                        updatePreference('quiet_hours_end', e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Enterprise and compliance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Compliance Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable additional compliance and audit features
                  </p>
                </div>
                <Switch
                  checked={preferences.compliance_mode}
                  onCheckedChange={(checked) =>
                    updatePreference('compliance_mode', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Audit Trail</Label>
                  <p className="text-xs text-muted-foreground">
                    Log all notification activities for compliance
                  </p>
                </div>
                <Switch
                  checked={preferences.audit_trail_enabled}
                  onCheckedChange={(checked) =>
                    updatePreference('audit_trail_enabled', checked)
                  }
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Data Retention (days)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  How long to keep notification data for audit purposes
                </p>
                <Input
                  type="number"
                  value={preferences.data_retention_days}
                  onChange={(e) =>
                    updatePreference('data_retention_days', parseInt(e.target.value) || 90)
                  }
                  min={1}
                  max={3650}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-primary text-primary-foreground shadow-lg">
            <CardContent className="py-3 px-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
                <span className="text-sm">Unsaved changes</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}