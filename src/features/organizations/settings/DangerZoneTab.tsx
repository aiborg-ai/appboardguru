"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { 
  AlertTriangle, 
  Trash2, 
  ShieldX,
  ArrowRightLeft,
  Calendar,
  ExternalLink
} from "lucide-react"
import { useDeleteOrganization } from "@/hooks/useOrganizations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/ui/card"
import { Button } from "@/features/shared/ui/button"
import { Input } from "@/features/shared/ui/input"
import { Label } from "@/features/shared/ui/label"
import { Checkbox } from "@/features/shared/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/shared/ui/select"
import { useToast } from "@/features/shared/ui/use-toast"
import { cn } from "@/lib/utils"
import { Database } from "@/types/database"

type Organization = Database['public']['Tables']['organizations']['Row']

interface DangerZoneTabProps {
  organization: Organization
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  userId: string
  onClose?: () => void
}

export function DangerZoneTab({ 
  organization, 
  userRole, 
  userId,
  onClose 
}: DangerZoneTabProps) {
  const { toast } = useToast()
  const deleteOrganizationMutation = useDeleteOrganization()

  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('')
  const [deleteImmediately, setDeleteImmediately] = React.useState(false)
  const [deleteUnderstood, setDeleteUnderstood] = React.useState(false)

  const canDeleteOrganization = userRole === 'owner'
  const expectedConfirmation = organization.name

  const handleDeleteOrganization = async () => {
    if (!canDeleteOrganization) return
    if (deleteConfirmation !== expectedConfirmation) {
      toast({
        title: 'Confirmation failed',
        description: 'Please type the organization name exactly as shown.',
        variant: 'destructive',
      })
      return
    }

    try {
      await deleteOrganizationMutation.mutateAsync({
        organizationId: organization.id,
        immediate: deleteImmediately,
      })

      setShowDeleteDialog(false)
      onClose?.()
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const resetDeleteForm = () => {
    setDeleteConfirmation('')
    setDeleteImmediately(false)
    setDeleteUnderstood(false)
  }

  if (userRole !== 'owner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <ShieldX className="h-5 w-5" />
            <span>Access Restricted</span>
          </CardTitle>
          <CardDescription>
            Only organization owners can access these settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ShieldX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">
              You don't have permission to view danger zone settings.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Danger Zone</h3>
              <p className="text-sm text-red-600 mt-1">
                These actions are irreversible and will permanently affect your organization. 
                Please proceed with extreme caution.
              </p>
            </div>
          </div>
        </div>

        {/* Transfer Ownership */}
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-700">
              <ArrowRightLeft className="h-5 w-5" />
              <span>Transfer Ownership</span>
            </CardTitle>
            <CardDescription>
              Transfer ownership of this organization to another member. You will become an admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This action cannot be undone. The new owner will have full control 
                  over the organization and can remove you or change your role.
                </p>
              </div>
              <Button variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transfer Ownership
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Organization */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              <span>Delete Organization</span>
            </CardTitle>
            <CardDescription>
              Permanently delete this organization and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">This action will:</h4>
                <ul className="text-sm text-red-700 space-y-1 ml-4">
                  <li>• Delete all board packs and documents</li>
                  <li>• Remove all members and their access</li>
                  <li>• Cancel any active subscriptions</li>
                  <li>• Permanently delete all organization data</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              {organization.deletion_scheduled_for ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-orange-800 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Deletion Scheduled</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    This organization is scheduled for deletion on{' '}
                    <strong>
                      {new Date(organization.deletion_scheduled_for).toLocaleDateString()}
                    </strong>
                    . You can cancel this or delete immediately.
                  </p>
                  <div className="flex space-x-2 mt-3">
                    <Button variant="outline" size="sm">
                      Cancel Deletion
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      Delete Now
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Organization
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-600">
              <ExternalLink className="h-5 w-5" />
              <span>Data Export</span>
            </CardTitle>
            <CardDescription>
              Export your organization's data before deleting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We recommend exporting your data before deleting your organization. 
                This includes all documents, member lists, and audit logs.
              </p>
              <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                <ExternalLink className="mr-2 h-4 w-4" />
                Export Organization Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={showDeleteDialog} 
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) resetDeleteForm()
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Delete Organization</span>
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please confirm you want to delete this organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will permanently delete the organization "{organization.name}" 
                and all associated data including board packs, members, and settings.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type <strong>{expectedConfirmation}</strong> to confirm deletion:
              </Label>
              <Input
                id="confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Enter organization name"
                className={
                  deleteConfirmation && deleteConfirmation !== expectedConfirmation
                    ? 'border-red-500'
                    : ''
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="understand"
                  checked={deleteUnderstood}
                  onCheckedChange={(checked) => setDeleteUnderstood(checked as boolean)}
                />
                <Label htmlFor="understand" className="text-sm">
                  I understand this action cannot be undone
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immediate"
                  checked={deleteImmediately}
                  onCheckedChange={(checked) => setDeleteImmediately(checked as boolean)}
                />
                <Label htmlFor="immediate" className="text-sm">
                  Delete immediately (otherwise scheduled for 30 days)
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteOrganization}
              disabled={
                deleteConfirmation !== expectedConfirmation ||
                !deleteUnderstood ||
                deleteOrganizationMutation.isPending
              }
            >
              {deleteOrganizationMutation.isPending ? (
                'Deleting...'
              ) : deleteImmediately ? (
                'Delete Immediately'
              ) : (
                'Schedule Deletion'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}