'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Switch } from '@/features/shared/ui/switch';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar';
import { Separator } from '@/features/shared/ui/separator';
import { Label } from '@/features/shared/ui/label';
import { 
  Send, 
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  Clock,
  FileText,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Bell,
  MessageSquare,
  Linkedin,
  Globe,
  Info,
  Rocket,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  BoardMatesWizardData, 
  BOARD_ROLES,
  ACCESS_LEVELS
} from '../types';

interface ReviewCreateBroadcastStepProps {
  data: BoardMatesWizardData;
  onUpdate: (updates: Partial<BoardMatesWizardData>) => void;
}

export default function ReviewCreateBroadcastStep({ data, onUpdate }: ReviewCreateBroadcastStepProps) {

  // Handle notification preferences
  const handleNotificationChange = (setting: keyof typeof data.notificationPreferences, value: boolean) => {
    onUpdate({
      notificationPreferences: {
        ...data.notificationPreferences,
        [setting]: value
      }
    });
  };

  // Handle terms acceptance
  const handleTermsChange = (accepted: boolean) => {
    onUpdate({ termsAccepted: accepted });
  };

  const selectedRole = BOARD_ROLES.find(role => role.value === data.personalInfo.role);
  const selectedAccessLevel = ACCESS_LEVELS.find(level => level.value === data.inviteSettings.accessLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-200">
          <Send className="w-8 h-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Review & Broadcast
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Review BoardMate details and send invitation to join your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Personal Information</span>
                <Badge variant="outline" className="ml-auto">Step 1</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <Avatar className="w-16 h-16 border-2 border-gray-200">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                    {data.personalInfo.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'BM'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{data.personalInfo.fullName}</h4>
                    {data.personalInfo.title && (
                      <p className="text-gray-600">{data.personalInfo.title}</p>
                    )}
                    {selectedRole && (
                      <Badge variant="secondary" className="mt-1">
                        {selectedRole.label}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      {data.personalInfo.organization && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Building className="w-4 h-4" />
                          <span>{data.personalInfo.organization}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{data.personalInfo.email}</span>
                      </div>
                      
                      {data.personalInfo.phoneNumber && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          <span>{data.personalInfo.phoneNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(data.personalInfo.address.city || data.personalInfo.address.country) && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {[data.personalInfo.address.city, data.personalInfo.address.country]
                              .filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      
                      {data.personalInfo.department && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Briefcase className="w-4 h-4" />
                          <span>{data.personalInfo.department}</span>
                        </div>
                      )}

                      {data.personalInfo.linkedinProfile && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Linkedin className="w-4 h-4" />
                          <a 
                            href={data.personalInfo.linkedinProfile} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            LinkedIn Profile
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {data.personalInfo.bio && (
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {data.personalInfo.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitation Settings Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5" />
                <span>Invitation Settings</span>
                <Badge variant="outline" className="ml-auto">Step 2</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invitation Status */}
              <div className={cn(
                "p-4 rounded-lg border",
                data.inviteSettings.inviteToBoardUser ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center space-x-3">
                  {data.inviteSettings.inviteToBoardUser ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <h5 className={cn(
                      "font-medium",
                      data.inviteSettings.inviteToBoardUser ? "text-green-800" : "text-gray-600"
                    )}>
                      {data.inviteSettings.inviteToBoardUser ? "Will receive BoardGuru invitation" : "Contact only"}
                    </h5>
                    <p className={cn(
                      "text-sm",
                      data.inviteSettings.inviteToBoardUser ? "text-green-700" : "text-gray-500"
                    )}>
                      {data.inviteSettings.inviteToBoardUser 
                        ? "Full platform access with configured permissions"
                        : "Added to contacts without platform access"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {data.inviteSettings.inviteToBoardUser && (
                <div className="space-y-4">
                  {/* Access Level */}
                  {selectedAccessLevel && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>Access Level</span>
                      </h5>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-800">{selectedAccessLevel.label}</span>
                          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                            {selectedAccessLevel.value}
                          </Badge>
                        </div>
                        <p className="text-sm text-blue-700 mb-2">{selectedAccessLevel.description}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {selectedAccessLevel.permissions.map((permission, index) => (
                            <div key={index} className="flex items-center space-x-1 text-xs text-blue-600">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{permission}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Specific Permissions */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Specific Permissions</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { key: 'boardPackAccess', label: 'Board Packs', icon: FileText },
                        { key: 'meetingAccess', label: 'Meetings', icon: Calendar },
                        { key: 'documentAccess', label: 'Downloads', icon: Download },
                      ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <Badge 
                            variant={data.inviteSettings[key as keyof typeof data.inviteSettings] ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {data.inviteSettings[key as keyof typeof data.inviteSettings] ? "✓" : "✗"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email Settings */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>Email Configuration</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Welcome Email</span>
                        <Badge 
                          variant={data.inviteSettings.sendWelcomeEmail ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {data.inviteSettings.sendWelcomeEmail ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Immediate Access</span>
                        <Badge 
                          variant={data.inviteSettings.grantImmediateAccess ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {data.inviteSettings.grantImmediateAccess ? "Yes" : "No"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Custom Message */}
                  {data.inviteSettings.customMessage && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Custom Welcome Message</span>
                      </h5>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-700 italic">
                          "{data.inviteSettings.customMessage}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Email Updates</Label>
                  <p className="text-xs text-gray-500">Receive updates about BoardMate activity</p>
                </div>
                <Switch
                  checked={data.notificationPreferences.emailUpdates}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('emailUpdates', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">SMS Notifications</Label>
                  <p className="text-xs text-gray-500">Important alerts via text message</p>
                </div>
                <Switch
                  checked={data.notificationPreferences.smsNotifications}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('smsNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Meeting Reminders</Label>
                  <p className="text-xs text-gray-500">Automated meeting and deadline reminders</p>
                </div>
                <Switch
                  checked={data.notificationPreferences.meetingReminders}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('meetingReminders', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Document Alerts</Label>
                  <p className="text-xs text-gray-500">Notifications for new documents and updates</p>
                </div>
                <Switch
                  checked={data.notificationPreferences.documentAlerts}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('documentAlerts', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={data.termsAccepted}
                  onCheckedChange={handleTermsChange}
                  className="mt-1"
                />
                <div className="space-y-2">
                  <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                    I confirm the accuracy of the information and agree to the terms
                  </Label>
                  <p className="text-xs text-gray-600">
                    By creating this BoardMate profile, you confirm that all information is accurate and you have 
                    permission to invite this person to BoardGuru. You agree to our{' '}
                    <a href="/terms" className="text-purple-600 hover:underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Radio className="w-5 h-5" />
                <span>Broadcast Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* What will happen */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">What will happen:</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-semibold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">BoardMate Profile Created</p>
                      <p className="text-xs text-gray-600">Contact information saved to your organization</p>
                    </div>
                  </div>

                  {data.inviteSettings.inviteToBoardUser ? (
                    <>
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs font-semibold text-green-600">2</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Invitation Email Sent</p>
                          <p className="text-xs text-gray-600">
                            {data.inviteSettings.sendWelcomeEmail 
                              ? "Welcome email with setup instructions"
                              : "Basic invitation without welcome email"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs font-semibold text-purple-600">3</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Organization Access</p>
                          <p className="text-xs text-gray-600">
                            Added to your organization with {selectedAccessLevel?.label.toLowerCase()} permissions
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-xs font-semibold text-orange-600">4</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Account Setup</p>
                          <p className="text-xs text-gray-600">
                            {data.inviteSettings.grantImmediateAccess 
                              ? "Can access immediately, creates account later"
                              : "Must create account before accessing"
                            }
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-semibold text-gray-600">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">No Invitation Sent</p>
                        <p className="text-xs text-gray-600">Contact saved without platform access</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Key Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Key Details:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">BoardMate:</span>
                    <span className="font-medium text-right">{data.personalInfo.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <span className="font-medium text-right">{selectedRole?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Organization:</span>
                    <span className="font-medium text-right">{data.personalInfo.organization}</span>
                  </div>
                  {data.inviteSettings.inviteToBoardUser && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Access Level:</span>
                        <span className="font-medium text-right">{selectedAccessLevel?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Welcome Email:</span>
                        <span className="font-medium text-right">
                          {data.inviteSettings.sendWelcomeEmail ? "Yes" : "No"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Ready to broadcast */}
              <div className={cn(
                "p-3 rounded-lg border text-center",
                data.termsAccepted ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              )}>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  {data.termsAccepted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className={cn(
                    "font-medium",
                    data.termsAccepted ? "text-green-800" : "text-amber-800"
                  )}>
                    {data.termsAccepted ? "Ready to broadcast!" : "Terms acceptance required"}
                  </span>
                </div>
                <p className={cn(
                  "text-xs",
                  data.termsAccepted ? "text-green-700" : "text-amber-700"
                )}>
                  {data.termsAccepted 
                    ? "All information verified and ready to create BoardMate"
                    : "Please accept the terms and conditions to proceed"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}