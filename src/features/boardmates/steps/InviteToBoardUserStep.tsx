'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Clock,
  FileText,
  Calendar,
  Eye,
  Download,
  MessageSquare,
  BarChart3,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BoardMatesWizardData, 
  InviteSettings,
  ACCESS_LEVELS
} from '../types';

interface InviteToBoardUserStepProps {
  data: BoardMatesWizardData;
  onUpdate: (updates: Partial<BoardMatesWizardData>) => void;
}

export default function InviteToBoardUserStep({ data, onUpdate }: InviteToBoardUserStepProps) {

  // Handle invite settings changes
  const handleInviteSettingChange = <K extends keyof InviteSettings>(
    field: K,
    value: InviteSettings[K]
  ) => {
    onUpdate({
      inviteSettings: {
        ...data.inviteSettings,
        [field]: value,
      },
    });
  };

  const selectedAccessLevel = ACCESS_LEVELS.find(level => level.value === data.inviteSettings.accessLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserPlus className="w-8 h-8 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Invite to BoardUser
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Configure access permissions and invitation settings for this BoardMate
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invitation Toggle */}
          <Card className={cn(
            "border-2 transition-all duration-200",
            data.inviteSettings.inviteToBoardUser ? "border-green-200 bg-green-50" : "border-gray-200"
          )}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5" />
                  <span>Send BoardGuru Invitation</span>
                </div>
                <Switch
                  checked={data.inviteSettings.inviteToBoardUser}
                  onCheckedChange={(checked: boolean) => handleInviteSettingChange('inviteToBoardUser', checked)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={cn(
                  "p-4 rounded-lg border",
                  data.inviteSettings.inviteToBoardUser ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                )}>
                  <div className="flex items-start space-x-3">
                    {data.inviteSettings.inviteToBoardUser ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-gray-400 mt-0.5" />
                    )}
                    <div>
                      <p className={cn(
                        "font-medium text-sm",
                        data.inviteSettings.inviteToBoardUser ? "text-green-800" : "text-gray-600"
                      )}>
                        {data.inviteSettings.inviteToBoardUser 
                          ? "BoardMate will receive an invitation to join BoardGuru"
                          : "BoardMate will be added to your contacts only"
                        }
                      </p>
                      <p className={cn(
                        "text-xs mt-1",
                        data.inviteSettings.inviteToBoardUser ? "text-green-700" : "text-gray-500"
                      )}>
                        {data.inviteSettings.inviteToBoardUser 
                          ? "They will be able to create a BoardGuru account and access board materials"
                          : "They won't receive an invitation email or have access to the platform"
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Email Settings */}
                {data.inviteSettings.inviteToBoardUser && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>Send Welcome Email</span>
                        </Label>
                        <p className="text-sm text-gray-500">
                          Automatically send invitation email with setup instructions
                        </p>
                      </div>
                      <Switch
                        checked={data.inviteSettings.sendWelcomeEmail}
                        onCheckedChange={(checked: boolean) => handleInviteSettingChange('sendWelcomeEmail', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Grant Immediate Access</span>
                        </Label>
                        <p className="text-sm text-gray-500">
                          Allow access before they complete account setup
                        </p>
                      </div>
                      <Switch
                        checked={data.inviteSettings.grantImmediateAccess}
                        onCheckedChange={(checked: boolean) => handleInviteSettingChange('grantImmediateAccess', checked)}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Access Level Configuration */}
          {data.inviteSettings.inviteToBoardUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Access Level Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Access Level</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {ACCESS_LEVELS.map((level) => (
                      <div
                        key={level.value}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all duration-200",
                          data.inviteSettings.accessLevel === level.value
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        onClick={() => handleInviteSettingChange('accessLevel', level.value)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{level.label}</h4>
                            {data.inviteSettings.accessLevel === level.value && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{level.description}</p>
                          <ul className="text-xs text-gray-500 space-y-1">
                            {level.permissions.map((permission, index) => (
                              <li key={index} className="flex items-center space-x-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                <span>{permission}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Specific Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Specific Permissions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Board Pack Access</span>
                        </Label>
                        <p className="text-sm text-gray-500">Access to board documents and materials</p>
                      </div>
                      <Switch
                        checked={data.inviteSettings.boardPackAccess}
                        onCheckedChange={(checked: boolean) => handleInviteSettingChange('boardPackAccess', checked)}
                        disabled={data.inviteSettings.accessLevel === 'view_only'}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Meeting Access</span>
                        </Label>
                        <p className="text-sm text-gray-500">Participate in board meetings and discussions</p>
                      </div>
                      <Switch
                        checked={data.inviteSettings.meetingAccess}
                        onCheckedChange={(checked: boolean) => handleInviteSettingChange('meetingAccess', checked)}
                        disabled={data.inviteSettings.accessLevel === 'view_only'}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center space-x-2">
                          <Download className="w-4 h-4" />
                          <span>Document Access</span>
                        </Label>
                        <p className="text-sm text-gray-500">Download and share documents</p>
                      </div>
                      <Switch
                        checked={data.inviteSettings.documentAccess}
                        onCheckedChange={(checked: boolean) => handleInviteSettingChange('documentAccess', checked)}
                        disabled={data.inviteSettings.accessLevel !== 'full'}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Custom Welcome Message</span>
                    <Badge variant="secondary">Optional</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="customMessage">Personal Message</Label>
                    <Textarea
                      id="customMessage"
                      placeholder="Add a personal welcome message to include in the invitation email..."
                      value={data.inviteSettings.customMessage || ''}
                      onChange={(e) => handleInviteSettingChange('customMessage', e.target.value)}
                      className="bg-white"
                      rows={4}
                    />
                    <p className="text-xs text-gray-500">
                      This message will be included in the invitation email to personalize the experience.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="w-5 h-5" />
                <span>Invitation Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invitation Status */}
              <div className={cn(
                "p-4 rounded-lg border",
                data.inviteSettings.inviteToBoardUser ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center space-x-2 mb-2">
                  {data.inviteSettings.inviteToBoardUser ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className={cn(
                    "font-medium",
                    data.inviteSettings.inviteToBoardUser ? "text-green-800" : "text-gray-600"
                  )}>
                    {data.inviteSettings.inviteToBoardUser ? "Will be invited" : "Contact only"}
                  </span>
                </div>
                <p className={cn(
                  "text-sm",
                  data.inviteSettings.inviteToBoardUser ? "text-green-700" : "text-gray-500"
                )}>
                  {data.inviteSettings.inviteToBoardUser 
                    ? "BoardMate will receive full invitation to join BoardGuru"
                    : "BoardMate will be added to your contacts without platform access"
                  }
                </p>
              </div>

              {data.inviteSettings.inviteToBoardUser && (
                <>
                  {/* Access Level Summary */}
                  {selectedAccessLevel && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Access Level</h4>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">{selectedAccessLevel.label}</span>
                        </div>
                        <p className="text-sm text-blue-700 mb-2">{selectedAccessLevel.description}</p>
                        <ul className="text-xs text-blue-600 space-y-1">
                          {selectedAccessLevel.permissions.map((permission, index) => (
                            <li key={index} className="flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{permission}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Permission Summary */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Permissions</h4>
                    <div className="space-y-2">
                      {[
                        { key: 'boardPackAccess', label: 'Board Packs', icon: FileText },
                        { key: 'meetingAccess', label: 'Meetings', icon: Calendar },
                        { key: 'documentAccess', label: 'Downloads', icon: Download },
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4 text-gray-400" />
                            <span>{label}</span>
                          </div>
                          <Badge 
                            variant={data.inviteSettings[key as keyof InviteSettings] ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {data.inviteSettings[key as keyof InviteSettings] ? "Allowed" : "Denied"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email Settings Summary */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Email Settings</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>Welcome Email</span>
                        </div>
                        <Badge 
                          variant={data.inviteSettings.sendWelcomeEmail ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {data.inviteSettings.sendWelcomeEmail ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>Immediate Access</span>
                        </div>
                        <Badge 
                          variant={data.inviteSettings.grantImmediateAccess ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {data.inviteSettings.grantImmediateAccess ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Custom Message Preview */}
                  {data.inviteSettings.customMessage && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Custom Message</h4>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700 italic">
                          "{data.inviteSettings.customMessage}"
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}