"use client"

import * as React from "react"
import { 
  MoreHorizontal, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  Eye,
  Trash2,
  UserMinus
} from "lucide-react"
import {
  useOrganizationMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useTransferOwnership,
  getMemberDisplayName,
  getRoleColor,
  getRoleDescription,
  canModifyRole,
  canRemoveMember,
  canTransferOwnership,
  availableRoles
} from "@/hooks/useMembers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/ui/card"
import { Button } from "@/features/shared/ui/button"
import { Badge } from "@/features/shared/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/features/shared/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/shared/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface MembersTabProps {
  organizationId: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  userId: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'owner':
      return <Crown className="h-4 w-4" />
    case 'admin':
      return <Shield className="h-4 w-4" />
    case 'member':
      return <User className="h-4 w-4" />
    case 'viewer':
      return <Eye className="h-4 w-4" />
    default:
      return <User className="h-4 w-4" />
  }
}

export function MembersTab({ organizationId, userRole, userId }: MembersTabProps) {
  const { toast } = useToast()
  const { data: members = [], isLoading, error } = useOrganizationMembers(organizationId, userId)
  const updateRoleMutation = useUpdateMemberRole()
  const removeMemberMutation = useRemoveMember()
  const transferOwnershipMutation = useTransferOwnership()

  const [selectedMember, setSelectedMember] = React.useState<any>(null)
  const [showRoleDialog, setShowRoleDialog] = React.useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false)
  const [showTransferDialog, setShowTransferDialog] = React.useState(false)
  const [newRole, setNewRole] = React.useState<string>('')

  const handleUpdateRole = async () => {
    if (!selectedMember || !newRole) return

    try {
      await updateRoleMutation.mutateAsync({
        organizationId,
        targetUserId: selectedMember.user_id,
        newRole: newRole as any,
      })
      setShowRoleDialog(false)
      setSelectedMember(null)
      setNewRole('')
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return

    try {
      await removeMemberMutation.mutateAsync({
        organizationId,
        targetUserId: selectedMember.user_id,
        reason: `Removed by ${userRole}`,
      })
      setShowRemoveDialog(false)
      setSelectedMember(null)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleTransferOwnership = async () => {
    if (!selectedMember) return

    try {
      await transferOwnershipMutation.mutateAsync({
        organizationId,
        targetUserId: selectedMember.user_id,
      })
      setShowTransferDialog(false)
      setSelectedMember(null)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                </div>
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
          <p className="text-red-600">Failed to load organization members.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Organization Members
            <Badge variant="secondary">{members.length} members</Badge>
          </CardTitle>
          <CardDescription>
            Manage members and their roles in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member) => {
            const canModify = canModifyRole(userRole, member.role)
            const canRemove = canRemoveMember(userRole, member.role)
            const canTransfer = canTransferOwnership(userRole) && member.role !== 'owner'
            const isCurrentUser = member.user_id === userId

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={member.user.avatar_url || undefined} />
                    <AvatarFallback>
                      {getInitials(getMemberDisplayName(member))}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{getMemberDisplayName(member)}</p>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{member.user.email}</span>
                      {member.status !== 'active' && (
                        <Badge variant="destructive" className="text-xs">
                          {member.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(member.role)}
                    <Badge 
                      variant="secondary"
                      className={cn("capitalize", getRoleColor(member.role))}
                    >
                      {member.role}
                    </Badge>
                  </div>

                  {(canModify || canRemove || canTransfer) && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {canModify && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(member)
                              setNewRole(member.role)
                              setShowRoleDialog(true)
                            }}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                        )}

                        {canTransfer && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(member)
                              setShowTransferDialog(true)
                            }}
                          >
                            <Crown className="mr-2 h-4 w-4" />
                            Transfer Ownership
                          </DropdownMenuItem>
                        )}

                        {canRemove && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedMember(member)
                                setShowRemoveDialog(true)
                              }}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove Member
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember && getMemberDisplayName(selectedMember)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(role.value)}
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={!newRole || updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedMember && getMemberDisplayName(selectedMember)} from this organization? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Ownership</DialogTitle>
            <DialogDescription>
              Are you sure you want to transfer ownership to {selectedMember && getMemberDisplayName(selectedMember)}? You will become an admin and they will become the new owner.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> This action cannot be undone. The new owner will have full control over the organization, including the ability to remove you.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTransferDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleTransferOwnership}
              disabled={transferOwnershipMutation.isPending}
            >
              {transferOwnershipMutation.isPending ? 'Transferring...' : 'Transfer Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}