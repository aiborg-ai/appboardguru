'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  Shield, 
  Save, 
  Loader2,
  Lock,
  FileCheck,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react'

interface ComplianceSettings {
  auditLogging: boolean
  twoFactorRequired: boolean
  dataEncryption: boolean
  accessLogging: boolean
  complianceStandards: string[]
  ipRestriction: boolean
  sessionTimeout: number
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    expirationDays: number
  }
}

interface ComplianceTabProps {
  settings: ComplianceSettings
  canEdit: boolean
  onUpdate: (settings: { complianceSettings: ComplianceSettings }) => Promise<void>
}

const COMPLIANCE_STANDARDS = [
  { id: 'sox', name: 'SOX', description: 'Sarbanes-Oxley Act' },
  { id: 'gdpr', name: 'GDPR', description: 'General Data Protection Regulation' },
  { id: 'hipaa', name: 'HIPAA', description: 'Health Insurance Portability and Accountability Act' },
  { id: 'pci-dss', name: 'PCI DSS', description: 'Payment Card Industry Data Security Standard' },
  { id: 'iso27001', name: 'ISO 27001', description: 'Information Security Management' },
  { id: 'ccpa', name: 'CCPA', description: 'California Consumer Privacy Act' },
  { id: 'ferpa', name: 'FERPA', description: 'Family Educational Rights and Privacy Act' },
  { id: 'fisma', name: 'FISMA', description: 'Federal Information Security Management Act' }
]

export function ComplianceTab({ settings, canEdit, onUpdate }: ComplianceTabProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [localSettings, setLocalSettings] = React.useState<ComplianceSettings>({
    ...settings,
    ipRestriction: settings.ipRestriction || false,
    sessionTimeout: settings.sessionTimeout || 30,
    passwordPolicy: settings.passwordPolicy || {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expirationDays: 90
    }
  })
  const [isDirty, setIsDirty] = React.useState(false)

  React.useEffect(() => {
    setLocalSettings({
      ...settings,
      ipRestriction: settings.ipRestriction || false,
      sessionTimeout: settings.sessionTimeout || 30,
      passwordPolicy: settings.passwordPolicy || {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expirationDays: 90
      }
    })
  }, [settings])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onUpdate({ complianceSettings: localSettings })
      setIsDirty(false)
      toast({
        title: 'Compliance settings updated',
        description: 'Your compliance and security settings have been saved successfully.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update compliance settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSetting = (key: keyof ComplianceSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const toggleComplianceStandard = (standardId: string) => {
    const current = localSettings.complianceStandards || []
    const updated = current.includes(standardId)
      ? current.filter(s => s !== standardId)
      : [...current, standardId]
    updateSetting('complianceStandards', updated)
  }

  const getComplianceScore = () => {
    let score = 0
    if (localSettings.auditLogging) score += 20
    if (localSettings.twoFactorRequired) score += 20
    if (localSettings.dataEncryption) score += 20
    if (localSettings.accessLogging) score += 20
    if (localSettings.complianceStandards.length > 0) score += 20
    return score
  }

  const complianceScore = getComplianceScore()

  return (
    <div className="space-y-6">
      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{complianceScore}%</span>
              <Badge 
                variant={complianceScore >= 80 ? 'default' : complianceScore >= 60 ? 'secondary' : 'destructive'}
              >
                {complianceScore >= 80 ? 'Excellent' : complianceScore >= 60 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  complianceScore >= 80 ? 'bg-green-600' : 
                  complianceScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                }`}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Configure security features to protect your organization's data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Audit Logging
              </Label>
              <p className="text-sm text-muted-foreground">
                Track all user activities and system changes
              </p>
            </div>
            <Switch
              checked={localSettings.auditLogging}
              onCheckedChange={(checked) => updateSetting('auditLogging', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require 2FA for all users
              </p>
            </div>
            <Switch
              checked={localSettings.twoFactorRequired}
              onCheckedChange={(checked) => updateSetting('twoFactorRequired', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Data Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Encrypt all data at rest and in transit
              </p>
            </div>
            <Switch
              checked={localSettings.dataEncryption}
              onCheckedChange={(checked) => updateSetting('dataEncryption', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Access Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all data access and modifications
              </p>
            </div>
            <Switch
              checked={localSettings.accessLogging}
              onCheckedChange={(checked) => updateSetting('accessLogging', checked)}
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>IP Restriction</Label>
              <p className="text-sm text-muted-foreground">
                Restrict access to specific IP addresses
              </p>
            </div>
            <Switch
              checked={localSettings.ipRestriction}
              onCheckedChange={(checked) => updateSetting('ipRestriction', checked)}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compliance Standards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Compliance Standards
          </CardTitle>
          <CardDescription>
            Select the compliance standards your organization follows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {COMPLIANCE_STANDARDS.map((standard) => (
              <div key={standard.id} className="flex items-start space-x-3">
                <Checkbox
                  id={standard.id}
                  checked={localSettings.complianceStandards.includes(standard.id)}
                  onCheckedChange={() => toggleComplianceStandard(standard.id)}
                  disabled={!canEdit}
                />
                <label
                  htmlFor={standard.id}
                  className="space-y-1 cursor-pointer flex-1"
                >
                  <div className="font-medium text-sm">{standard.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {standard.description}
                  </div>
                </label>
                {localSettings.complianceStandards.includes(standard.id) && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Alert */}
      {localSettings.complianceStandards.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Compliance Requirements Active</AlertTitle>
          <AlertDescription>
            You have selected {localSettings.complianceStandards.length} compliance standard(s). 
            Ensure all necessary policies and procedures are in place to maintain compliance.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning for High Security */}
      {localSettings.twoFactorRequired && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Two-Factor Authentication Required</AlertTitle>
          <AlertDescription>
            All users will be required to enable 2FA on their next login. 
            Make sure to communicate this change to your team.
          </AlertDescription>
        </Alert>
      )}

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
                Save Compliance Settings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}