"use client"

import * as React from "react"
import { format } from "date-fns"
import { 
  Mail, 
  MoreHorizontal, 
  Send, 
  X,
  Clock,
  UserPlus,
  RefreshCw,
  Trash2
} from "lucide-react"
import {
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "@/hooks/useInvitations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
// Import the invite modal component we'll create next
import { InviteMemberModal } from "@/features/organizations/invitations/InviteMemberModal"

interface InvitationsTabProps {
  organizationId: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  userId: string
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'accepted':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'expired':
      return 'bg-gray-100 text-gray-800'
    case 'revoked':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'owner':
      return "text-purple-600"
    case 'admin':
      return "text-red-600"
    case 'member':
      return "text-blue-600"
    case 'viewer':
      return "text-gray-600"
    default:
      return "text-gray-600"
  }
}

export function InvitationsTab({ organizationId, userRole, userId }: InvitationsTabProps) {
  const { toast } = useToast()
  const { data: invitations = [], isLoading, error } = useInvitations(organizationId, userId)
  const resendInvitationMutation = useResendInvitation()
  const revokeInvitationMutation = useRevokeInvitation()

  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [selectedInvitation, setSelectedInvitation] = React.useState<any>(null)
  const [showRevokeDialog, setShowRevokeDialog] = React.useState(false)

  const canInvite = userRole === 'owner' || userRole === 'admin'
  const canManageInvitations = canInvite

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const completedInvitations = invitations.filter(inv => inv.status !== 'pending')

  const handleResendInvitation = async (invitation: any) => {
    try {
      await resendInvitationMutation.mutateAsync({
        invitationId: invitation.id,
        organizationId,
      })
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleRevokeInvitation = async () => {
    if (!selectedInvitation) return

    try {
      await revokeInvitationMutation.mutateAsync({
        invitationId: selectedInvitation.id,
        organizationId,
        reason: 'Revoked by administrator',
      })
      setShowRevokeDialog(false)
      setSelectedInvitation(null)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600">Failed to load invitations.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Pending Invitations</span>
                  <Badge variant="secondary">{pendingInvitations.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Invitations that have been sent but not yet responded to.
                </CardDescription>
              </div>
              {canInvite && (
                <Button onClick={() => setShowInviteModal(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pendingInvitations.length > 0 ? (
              <div className="space-y-4">
                {pendingInvitations.map((invitation) => {
                  const expired = isExpired(invitation.token_expires_at)
                  
                  return (
                    <div
                      key={invitation.id}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-lg",
                        expired && "border-red-200 bg-red-50"
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <p className="font-medium">{invitation.email}</p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Badge 
                                variant="outline" 
                                className={cn("capitalize", getRoleColor(invitation.role))}
                              >
                                {invitation.role}
                              </Badge>
                              <span>•</span>
                              <span>
                                Invited {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                              </span>
                              <span>•</span>
                              <span className={expired ? "text-red-600" : ""}>
                                {expired ? 'Expired' : 'Expires'} {format(new Date(invitation.token_expires_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                            {invitation.personal_message && (
                              <p className="text-sm text-muted-foreground mt-1">
                                "{invitation.personal_message}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={cn(getStatusColor(invitation.status), expired && "bg-red-100 text-red-800")}
                        >
                          {expired ? 'Expired' : invitation.status}
                        </Badge>

                        {canManageInvitations && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Invitation Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={() => handleResendInvitation(invitation)}
                                disabled={resendInvitationMutation.isPending}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {expired ? 'Resend Invitation' : 'Resend'}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedInvitation(invitation)
                                  setShowRevokeDialog(true)
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Revoke Invitation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending invitations</p>
                {canInvite && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Your First Member
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Invitations */}
        {completedInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Invitation History</span>
                <Badge variant="secondary">{completedInvitations.length}</Badge>
              </CardTitle>
              <CardDescription>
                Previous invitations that have been accepted, rejected, or expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge 
                              variant="outline" 
                              className={cn("capitalize", getRoleColor(invitation.role))}
                            >
                              {invitation.role}
                            </Badge>
                            <span>•</span>
                            <span>
                              Invited {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                            </span>
                            {invitation.accepted_at && (
                              <>
                                <span>•</span>
                                <span>
                                  Accepted {format(new Date(invitation.accepted_at), 'MMM d, yyyy')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Badge className={getStatusColor(invitation.status)}>
                      {invitation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          organizationId={organizationId}
        />
      )}

      {/* Revoke Invitation Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the invitation for {selectedInvitation?.email}? 
              This will prevent them from accepting the invitation.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRevokeDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeInvitation}
              disabled={revokeInvitationMutation.isPending}
            >
              {revokeInvitationMutation.isPending ? 'Revoking...' : 'Revoke Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}