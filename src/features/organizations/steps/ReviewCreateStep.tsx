'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Rocket, 
  Building2,
  Settings,
  Users,
  Check,
  Edit,
  Globe,
  HardDrive,
  Shield,
  Clock,
  Mail,
  Crown,
  Eye,
  FileText,
  Bot,
  Lock,
  Info,
  AlertTriangle,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OrganizationWizardData, 
  ORGANIZATION_SIZES,
  ROLE_CONFIG
} from '../types';

interface ReviewCreateStepProps {
  data: OrganizationWizardData;
  onUpdate: (updates: Partial<OrganizationWizardData>) => void;
}

const FEATURE_ICONS = {
  aiProcessing: Bot,
  autoClassification: Bot,
  watermarking: Shield,
  approvalWorkflow: Check,
  auditLogging: FileText,
  twoFactorRequired: Lock,
  dataEncryption: Shield,
  accessLogging: Eye
};

export default function ReviewCreateStep({ data, onUpdate }: ReviewCreateStepProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Handle notification settings
  const handleNotificationChange = (setting: keyof typeof data.notificationSettings, value: boolean) => {
    onUpdate({
      notificationSettings: {
        ...data.notificationSettings,
        [setting]: value
      }
    });
  };

  // Handle terms acceptance
  const handleTermsChange = (accepted: boolean) => {
    onUpdate({ termsAccepted: accepted });
  };

  const organizationSize = ORGANIZATION_SIZES.find(s => s.value === data.organizationDetails.organizationSize);
  const totalMembers = data.selectedMembers.length + data.newInvitations.length;
  const enabledFeatures = [
    data.assetSettings.aiProcessing && 'AI Processing',
    data.assetSettings.autoClassification && 'Auto Classification',
    data.assetSettings.watermarking && 'Watermarking',
    data.assetSettings.approvalWorkflow && 'Approval Workflow',
    data.complianceSettings.auditLogging && 'Audit Logging',
    data.complianceSettings.twoFactorRequired && 'Two-Factor Auth',
    data.complianceSettings.dataEncryption && 'Data Encryption',
    data.complianceSettings.accessLogging && 'Access Logging'
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-200">
          <Rocket className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Review & Create
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Review your organization settings and create your BoardGuru organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Overview */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-green-600" />
                <span>Organization Overview</span>
                <Badge className="bg-green-100 text-green-800">Ready to Create</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4">
                <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
                  <AvatarImage src={data.organizationDetails.logoUrl} />
                  <AvatarFallback className="bg-green-500 text-white text-lg">
                    {data.organizationDetails.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="text-xl font-semibold text-gray-900">{data.organizationDetails.name}</h4>
                  <p className="text-gray-600 mt-1">{data.organizationDetails.description}</p>
                  <div className="flex items-center space-x-4 mt-3">
                    <Badge variant="secondary">{data.organizationDetails.industry}</Badge>
                    <Badge variant="outline">{organizationSize?.label}</Badge>
                  </div>
                  {data.organizationDetails.website && (
                    <div className="flex items-center space-x-2 mt-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {data.organizationDetails.website.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalMembers}</div>
                  <div className="text-sm text-gray-600">Team Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.assetSettings.storageLimit} GB</div>
                  <div className="text-sm text-gray-600">Storage</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Configuration Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Asset Management */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <HardDrive className="w-4 h-4" />
                  <span>Asset Management</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>
                      {data.assetSettings.retentionDays === -1 
                        ? 'Indefinite retention' 
                        : `${Math.round(data.assetSettings.retentionDays / 365)} year retention`
                      }
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="w-3 h-3 text-gray-400" />
                    <span>{data.assetSettings.categories.length} categories</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Shield className="w-3 h-3 text-gray-400" />
                    <span>{data.assetSettings.defaultPermissions} access</span>
                  </div>
                </div>
              </div>

              {/* Enabled Features */}
              {enabledFeatures.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Star className="w-4 h-4" />
                    <span>Enabled Features</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {enabledFeatures.map((feature) => (
                      <div key={feature} className="flex items-center space-x-2 text-sm text-green-600">
                        <Check className="w-3 h-3" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Compliance Standards */}
              {data.complianceSettings.complianceStandards.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span>Compliance Standards</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.complianceSettings.complianceStandards.map((standard) => (
                      <Badge key={standard} variant="outline" className="text-xs">
                        {standard}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Team Members ({totalMembers})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Existing Members */}
                {data.selectedMembers.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Existing Users</h5>
                    <div className="space-y-2">
                      {data.selectedMembers.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={member.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {member.fullName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.fullName}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      ))}
                      {data.selectedMembers.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{data.selectedMembers.length - 3} more existing users
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* New Invitations */}
                {data.newInvitations.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">New Invitations</h5>
                    <div className="space-y-2">
                      {data.newInvitations.slice(0, 3).map((invitation) => (
                        <div key={invitation.email} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">{invitation.fullName}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {invitation.role}
                          </Badge>
                        </div>
                      ))}
                      {data.newInvitations.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{data.newInvitations.length - 3} more invitations will be sent
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Email Updates</Label>
                  <p className="text-xs text-gray-500">Receive updates about organization activity</p>
                </div>
                <Switch
                  checked={data.notificationSettings.emailUpdates}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('emailUpdates', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Security Alerts</Label>
                  <p className="text-xs text-gray-500">Important security notifications</p>
                </div>
                <Switch
                  checked={data.notificationSettings.securityAlerts}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('securityAlerts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Weekly Reports</Label>
                  <p className="text-xs text-gray-500">Weekly activity and analytics reports</p>
                </div>
                <Switch
                  checked={data.notificationSettings.weeklyReports}
                  onCheckedChange={(checked: boolean) => handleNotificationChange('weeklyReports', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          <Card className="border-2 border-blue-200 bg-blue-50">
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
                    I agree to the Terms of Service and Privacy Policy
                  </Label>
                  <p className="text-xs text-gray-600">
                    By creating this organization, you agree to BoardGuru's{' '}
                    <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                    You confirm that you have the authority to create this organization and invite the specified members.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Creation Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2 border-green-200">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="w-5 h-5 text-green-600" />
                <span className="text-green-800">Ready to Launch</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Creation Checklist */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Organization details configured</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Asset management settings applied</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Team members selected</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  {data.termsAccepted ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={data.termsAccepted ? "text-gray-700" : "text-amber-600"}>
                    Terms and conditions
                  </span>
                </div>
              </div>

              <Separator />

              {/* What happens next */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">What happens next?</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 rounded-full bg-gray-400 mt-2"></div>
                    <span>Your organization will be created instantly</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 rounded-full bg-gray-400 mt-2"></div>
                    <span>Invitation emails will be sent to new members</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 rounded-full bg-gray-400 mt-2"></div>
                    <span>You'll be redirected to your organization dashboard</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-1 h-1 rounded-full bg-gray-400 mt-2"></div>
                    <span>Start uploading and managing your board documents</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Need help */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Need help?</span>
                </div>
                <p className="text-xs text-blue-600">
                  Contact our support team or check our{' '}
                  <a href="/docs" className="underline">documentation</a>{' '}
                  for setup guidance.
                </p>
              </div>

              {/* Validation Status */}
              <div className={cn(
                "p-3 rounded-lg border text-center",
                data.termsAccepted 
                  ? "bg-green-50 border-green-200" 
                  : "bg-amber-50 border-amber-200"
              )}>
                {data.termsAccepted ? (
                  <div className="space-y-1">
                    <Check className="w-6 h-6 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-800">
                      Ready to create organization
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                    <p className="text-sm font-medium text-amber-800">
                      Please accept terms to continue
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}