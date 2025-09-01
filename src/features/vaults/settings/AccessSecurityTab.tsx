'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { 
  Shield,
  Lock,
  Unlock,
  Globe,
  Key,
  Calendar as CalendarIcon,
  AlertCircle,
  Users,
  UserCheck,
  Save,
  Loader2,
  Copy,
  RefreshCw
} from 'lucide-react'

interface AccessSecurityTabProps {
  vault: {
    id: string
    isPublic: boolean
    requiresInvitation: boolean
    accessCode?: string
    expiresAt?: string
  }
  canEdit: boolean
  onUpdate: (updates: any) => Promise<void>
  isSaving: boolean
  onChangeDetected: () => void
}

export function AccessSecurityTab({
  vault,
  canEdit,
  onUpdate,
  isSaving,
  onChangeDetected
}: AccessSecurityTabProps) {
  const [formData, setFormData] = useState({
    isPublic: vault.isPublic || false,
    requiresInvitation: vault.requiresInvitation || false,
    accessCode: vault.accessCode || '',
    expiresAt: vault.expiresAt ? new Date(vault.expiresAt) : undefined
  })
  const [showAccessCode, setShowAccessCode] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  // Detect changes
  useEffect(() => {
    const changed = 
      formData.isPublic !== vault.isPublic ||
      formData.requiresInvitation !== vault.requiresInvitation ||
      formData.accessCode !== (vault.accessCode || '') ||
      (formData.expiresAt?.toISOString() !== vault.expiresAt && 
       !(formData.expiresAt === undefined && !vault.expiresAt))
    
    if (changed && !hasChanges) {
      setHasChanges(true)
      onChangeDetected()
    }
  }, [formData, vault, hasChanges, onChangeDetected])

  const handleInputChange = (field: string, value: any) => {
    if (!canEdit) return
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const generateAccessCode = () => {
    if (!canEdit) return
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    handleInputChange('accessCode', code)
  }

  const copyAccessCode = () => {
    if (!formData.accessCode) return
    navigator.clipboard.writeText(formData.accessCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleSave = async () => {
    if (!canEdit || !hasChanges) return

    const updates: any = {}
    
    if (formData.isPublic !== vault.isPublic) updates.isPublic = formData.isPublic
    if (formData.requiresInvitation !== vault.requiresInvitation) updates.requiresInvitation = formData.requiresInvitation
    if (formData.accessCode !== vault.accessCode) updates.accessCode = formData.accessCode
    if (formData.expiresAt?.toISOString() !== vault.expiresAt) {
      updates.expiresAt = formData.expiresAt?.toISOString()
    }

    await onUpdate(updates)
    setHasChanges(false)
  }

  return (
    <div className="space-y-6">
      {/* Vault Access */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Vault Access
        </h3>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access settings control who can view and interact with this vault. 
            Changes take effect immediately.
          </AlertDescription>
        </Alert>

        {/* Public Access */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {formData.isPublic ? (
                <Globe className="h-4 w-4 text-blue-600" />
              ) : (
                <Lock className="h-4 w-4 text-gray-600" />
              )}
              <Label className="text-base font-medium">Public Access</Label>
            </div>
            <p className="text-sm text-gray-500">
              {formData.isPublic 
                ? 'Anyone in your organization can view this vault'
                : 'Only invited members can access this vault'}
            </p>
          </div>
          <Switch
            checked={formData.isPublic}
            onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
            disabled={!canEdit}
          />
        </div>

        {/* Require Invitation */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-600" />
              <Label className="text-base font-medium">Require Invitation</Label>
            </div>
            <p className="text-sm text-gray-500">
              New members must be explicitly invited to join
            </p>
          </div>
          <Switch
            checked={formData.requiresInvitation}
            onCheckedChange={(checked) => handleInputChange('requiresInvitation', checked)}
            disabled={!canEdit || formData.isPublic}
          />
        </div>
      </div>

      <Separator />

      {/* Access Code */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5" />
          Access Code
        </h3>

        <div className="space-y-2">
          <Label>Vault Access Code</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showAccessCode ? 'text' : 'password'}
                value={formData.accessCode}
                onChange={(e) => handleInputChange('accessCode', e.target.value)}
                disabled={!canEdit}
                placeholder="Enter access code (optional)"
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowAccessCode(!showAccessCode)}
                >
                  {showAccessCode ? (
                    <Unlock className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                </Button>
                {formData.accessCode && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={copyAccessCode}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={generateAccessCode}
              disabled={!canEdit}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
          {copiedCode && (
            <p className="text-sm text-green-600">Access code copied to clipboard!</p>
          )}
          <p className="text-xs text-gray-500">
            Users will need this code to access the vault if set
          </p>
        </div>
      </div>

      <Separator />

      {/* Expiration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Vault Expiration
        </h3>

        <div className="space-y-2">
          <Label>Expiration Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.expiresAt && "text-muted-foreground"
                )}
                disabled={!canEdit}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expiresAt ? format(formData.expiresAt, "PPP") : "No expiration"}
              </Button>
            </PopoverTrigger>
            {canEdit && (
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expiresAt}
                  onSelect={(date) => handleInputChange('expiresAt', date)}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            )}
          </Popover>
          <p className="text-xs text-gray-500">
            Vault will become read-only after this date
          </p>
        </div>
      </div>

      <Separator />

      {/* Member Statistics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Access Statistics
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">0</div>
            <div className="text-sm text-gray-500">Active Members</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">0</div>
            <div className="text-sm text-gray-500">Pending Invites</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-500">Total Accesses</div>
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