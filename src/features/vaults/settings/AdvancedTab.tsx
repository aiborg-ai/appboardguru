'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Archive,
  Download,
  UserPlus,
  Trash2,
  AlertTriangle,
  Shield,
  Loader2,
  AlertCircle,
  FileDown,
  Users,
  ChevronRight
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface AdvancedTabProps {
  vault: {
    id: string
    name: string
    status: string
  }
  canEdit: boolean
  isOwner: boolean
  onUpdate: (updates: any) => Promise<void>
  isSaving: boolean
  onClose: () => void
}

export function AdvancedTab({
  vault,
  canEdit,
  isOwner,
  onUpdate,
  isSaving,
  onClose
}: AdvancedTabProps) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const isArchived = vault.status === 'archived'

  // Handle archive vault
  const handleArchive = async () => {
    setIsProcessing(true)
    try {
      await onUpdate({ status: isArchived ? 'active' : 'archived' })
      toast({
        title: isArchived ? 'Vault Restored' : 'Vault Archived',
        description: isArchived 
          ? 'The vault has been restored and is now active.'
          : 'The vault has been archived. It is now read-only.',
      })
      setShowArchiveDialog(false)
    } catch (error) {
      toast({
        title: 'Action Failed',
        description: 'Failed to update vault status. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle export vault
  const handleExport = async () => {
    setIsProcessing(true)
    try {
      // TODO: Implement actual export functionality
      const response = await fetch(`/api/vaults/${vault.id}/export`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      // Download the exported file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vault-${vault.name.replace(/\s+/g, '-')}-export.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Export Complete',
        description: 'Vault data has been exported successfully.',
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export vault data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle transfer ownership
  const handleTransfer = async () => {
    if (!newOwnerEmail.trim()) return
    
    setIsProcessing(true)
    try {
      // TODO: Implement actual transfer functionality
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: 'Transfer Initiated',
        description: `Ownership transfer request sent to ${newOwnerEmail}`,
      })
      setShowTransferDialog(false)
      setNewOwnerEmail('')
    } catch (error) {
      toast({
        title: 'Transfer Failed',
        description: 'Failed to transfer ownership. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle delete vault
  const handleDelete = async () => {
    if (deleteConfirmation !== vault.name) return
    
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/vaults/${vault.id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Delete failed')
      }
      
      toast({
        title: 'Vault Deleted',
        description: 'The vault has been permanently deleted.',
      })
      
      // Close modals and redirect
      setShowDeleteDialog(false)
      onClose()
      window.location.href = '/dashboard/vaults'
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete vault. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Archive Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Archive Vault
        </h3>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isArchived 
              ? 'This vault is currently archived. Restore it to allow modifications.'
              : 'Archiving makes the vault read-only. Members can still view content but cannot make changes.'}
          </AlertDescription>
        </Alert>

        <Button
          variant={isArchived ? "default" : "outline"}
          className="w-full"
          onClick={() => setShowArchiveDialog(true)}
          disabled={!canEdit}
        >
          <Archive className="mr-2 h-4 w-4" />
          {isArchived ? 'Restore Vault' : 'Archive Vault'}
        </Button>
      </div>

      <Separator />

      {/* Export Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          Export Vault Data
        </h3>
        
        <p className="text-sm text-gray-600">
          Download all vault content including assets, member list, and activity logs.
        </p>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleExport}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Vault
            </>
          )}
        </Button>
      </div>

      {isOwner && (
        <>
          <Separator />

          {/* Transfer Ownership Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Transfer Ownership
            </h3>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Transfer vault ownership to another member. You will become an admin after transfer.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTransferDialog(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Transfer Ownership
            </Button>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4 p-4 border-2 border-red-200 rounded-lg bg-red-50">
            <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </h3>
            
            <Alert className="border-red-200 bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Deleting a vault is permanent and cannot be undone. All assets and data will be lost.
              </AlertDescription>
            </Alert>

            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Vault Permanently
            </Button>
          </div>
        </>
      )}

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArchived ? 'Restore Vault' : 'Archive Vault'}
            </DialogTitle>
            <DialogDescription>
              {isArchived 
                ? 'Restoring this vault will make it active again. Members will be able to modify content.'
                : 'Archiving this vault will make it read-only. Members can still view but not modify content.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  {isArchived ? 'Restore' : 'Archive'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Vault Ownership</DialogTitle>
            <DialogDescription>
              Enter the email address of the member you want to transfer ownership to.
              They must be an existing vault member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-owner">New Owner Email</Label>
              <Input
                id="new-owner"
                type="email"
                placeholder="member@example.com"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransferDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={isProcessing || !newOwnerEmail.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vault Permanently</DialogTitle>
            <DialogDescription className="text-red-600">
              This action cannot be undone. All vault data, assets, and member access will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Type <strong>{vault.name}</strong> to confirm deletion.
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Type vault name to confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation('')
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isProcessing || deleteConfirmation !== vault.name}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}