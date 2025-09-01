'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Shield, 
  Bell, 
  Sliders,
  AlertCircle,
  Lock
} from 'lucide-react'
import { GeneralSettingsTab } from './settings/GeneralSettingsTab'
import { AccessSecurityTab } from './settings/AccessSecurityTab'
import { NotificationsTab } from './settings/NotificationsTab'
import { AdvancedTab } from './settings/AdvancedTab'
import { useToast } from '@/components/ui/use-toast'

interface VaultSettingsModalProps {
  vault: {
    id: string
    name: string
    description?: string
    meetingDate?: string
    location?: string
    status: string
    priority: string
    category?: string
    tags?: string[]
    isPublic: boolean
    requiresInvitation: boolean
    accessCode?: string
    expiresAt?: string
    settings?: any
    organization_id?: string
    userRole: string
  }
  isOpen: boolean
  onClose: () => void
  onUpdate?: (updatedVault: any) => void
}

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case 'owner': return 'bg-yellow-100 text-yellow-800'
    case 'admin': return 'bg-purple-100 text-purple-800'
    case 'moderator': return 'bg-blue-100 text-blue-800'
    case 'member': return 'bg-green-100 text-green-800'
    case 'viewer': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function VaultSettingsModal({ 
  vault, 
  isOpen, 
  onClose, 
  onUpdate 
}: VaultSettingsModalProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [vaultData, setVaultData] = useState(vault)
  const { toast } = useToast()

  // Check if user can edit settings
  const canEdit = ['owner', 'admin', 'moderator'].includes(vault.userRole)
  const isOwner = vault.userRole === 'owner'

  // Reset vault data when modal opens
  useEffect(() => {
    setVaultData(vault)
    setHasUnsavedChanges(false)
  }, [vault, isOpen])

  // Handle vault update
  const handleUpdate = async (updates: Partial<typeof vault>) => {
    if (!canEdit) return

    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/vaults/${vault.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update vault settings')
      }

      const data = await response.json()
      
      // Update local state
      setVaultData({ ...vaultData, ...updates })
      setHasUnsavedChanges(false)
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(data.vault)
      }

      toast({
        title: 'Settings Updated',
        description: 'Vault settings have been successfully updated.',
      })
      
    } catch (error) {
      console.error('Failed to update vault settings:', error)
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update vault settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle close with unsaved changes warning
  const handleClose = () => {
    if (hasUnsavedChanges && canEdit) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to close?')
      if (!confirm) return
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Vault Settings</DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  {vault.name}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getRoleBadgeColor(vault.userRole)}>
                {vault.userRole}
              </Badge>
              {!canEdit && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="w-3 h-3" />
                  View Only
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {!canEdit && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have view-only access to these settings. Contact a vault admin or owner to make changes.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Access & Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="general" className="h-full m-0">
                <GeneralSettingsTab
                  vault={vaultData}
                  canEdit={canEdit}
                  onUpdate={handleUpdate}
                  isSaving={isSaving}
                  onChangeDetected={() => setHasUnsavedChanges(true)}
                />
              </TabsContent>

              <TabsContent value="access" className="h-full m-0">
                <AccessSecurityTab
                  vault={vaultData}
                  canEdit={canEdit}
                  onUpdate={handleUpdate}
                  isSaving={isSaving}
                  onChangeDetected={() => setHasUnsavedChanges(true)}
                />
              </TabsContent>

              <TabsContent value="notifications" className="h-full m-0">
                <NotificationsTab
                  vault={vaultData}
                  canEdit={canEdit}
                  onUpdate={handleUpdate}
                  isSaving={isSaving}
                  onChangeDetected={() => setHasUnsavedChanges(true)}
                />
              </TabsContent>

              <TabsContent value="advanced" className="h-full m-0">
                <AdvancedTab
                  vault={vaultData}
                  canEdit={canEdit}
                  isOwner={isOwner}
                  onUpdate={handleUpdate}
                  isSaving={isSaving}
                  onClose={onClose}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}