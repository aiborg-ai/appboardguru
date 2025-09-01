'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Mail, Link, Shield } from 'lucide-react'
import { ShareMembersTab } from './ShareMembersTab'
import { ShareExternalTab } from './ShareExternalTab'
import { ShareLinkTab } from './ShareLinkTab'

interface VaultShareModalProps {
  vault: {
    id: string
    name: string
    description?: string
    organization_id?: string
    is_public?: boolean
  }
  isOpen: boolean
  onClose: () => void
  onShareComplete?: () => void
}

export function VaultShareModal({ 
  vault, 
  isOpen, 
  onClose, 
  onShareComplete 
}: VaultShareModalProps) {
  const [activeTab, setActiveTab] = useState('members')
  const [isSharing, setIsSharing] = useState(false)

  const handleShareComplete = () => {
    onShareComplete?.()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Share Vault</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                {vault.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
              </TabsTrigger>
              <TabsTrigger value="external" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                External
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Share Link
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="members" className="h-full m-0">
                <ShareMembersTab
                  vaultId={vault.id}
                  organizationId={vault.organization_id}
                  onShare={handleShareComplete}
                  isSharing={isSharing}
                  setIsSharing={setIsSharing}
                />
              </TabsContent>

              <TabsContent value="external" className="h-full m-0">
                <ShareExternalTab
                  vaultId={vault.id}
                  vaultName={vault.name}
                  onShare={handleShareComplete}
                  isSharing={isSharing}
                  setIsSharing={setIsSharing}
                />
              </TabsContent>

              <TabsContent value="link" className="h-full m-0">
                <ShareLinkTab
                  vaultId={vault.id}
                  vaultName={vault.name}
                  isPublic={vault.is_public}
                  onShare={handleShareComplete}
                  isSharing={isSharing}
                  setIsSharing={setIsSharing}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}