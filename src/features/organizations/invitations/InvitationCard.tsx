"use client"

import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  User,
  Calendar,
  RefreshCw,
  Trash2,
  ExternalLink
} from "lucide-react"
import {
  useAcceptInvitation,
  useRejectInvitation,
  useValidateInvitation
} from "@/hooks/useInvitations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/shared/ui/card"
import { Button } from "@/features/shared/ui/button"
import { Badge } from "@/features/shared/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/features/shared/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/ui/dialog"
import { Textarea } from "@/features/shared/ui/textarea"
import { Label } from "@/features/shared/ui/label"
import { Separator } from "@/features/shared/ui/separator"
import { useToast } from "@/features/shared/ui/use-toast"
import { cn } from "@/lib/utils"

interface InvitationCardProps {
  token?: string
  invitation?: {
    id: string
    email: string
    role: 'owner' | 'admin' | 'member' | 'viewer'
    status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'
    created_at: string
    token_expires_at: string
    personal_message?: string | null
    inviter?: {
      email: string
      fullName: string | null
    }
    organization?: {
      name: string
      slug: string
      logo_url?: string | null
    }
  }
  showActions?: boolean
  showAdminActions?: boolean
  onResend?: () => void
  onRevoke?: () => void
  className?: string
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'accepted':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'expired':
      return <AlertCircle className="h-4 w-4 text-gray-500" />
    case 'revoked':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function InvitationCard({
  token,
  invitation: propInvitation,
  showActions = false,
  showAdminActions = false,
  onResend,
  onRevoke,
  className
}: InvitationCardProps) {
  const { toast } = useToast()
  const acceptInvitationMutation = useAcceptInvitation()
  const rejectInvitationMutation = useRejectInvitation()
  
  // If token is provided, validate and fetch invitation details
  const { data: validationData, isLoading: isValidating, error: validationError } = 
    useValidateInvitation(token)

  const [showRejectDialog, setShowRejectDialog] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')

  // Use validated invitation data if available, otherwise use prop
  const invitation = validationData?.invitation || propInvitation
  const organization = validationData?.organization || invitation?.organization

  if (isValidating) {
    return (
      <Card className={cn("w-full max-w-2xl", className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (validationError || !invitation) {
    return (
      <Card className={cn("w-full max-w-2xl border-red-200", className)}>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Invalid Invitation
          </h3>
          <p className="text-gray-600">
            This invitation link is invalid or has expired.
          </p>
        </CardContent>
      </Card>
    )
  }

  const isExpired = new Date(invitation.token_expires_at) < new Date()
  const canAccept = showActions && invitation.status === 'pending' && !isExpired
  const canReject = showActions && invitation.status === 'pending'

  const handleAcceptInvitation = async () => {
    if (!token) return
    
    try {
      await acceptInvitationMutation.mutateAsync(token)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  const handleRejectInvitation = async () => {
    if (!token) return
    
    try {
      await rejectInvitationMutation.mutateAsync({ 
        token, 
        reason: rejectReason || undefined 
      })
      setShowRejectDialog(false)
    } catch (error) {
      // Error handling is done in the mutation
    }
  }

  return (
    <>
      <Card className={cn("w-full max-w-2xl", className)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={organization?.logo_url || undefined} 
                  alt={organization?.name || 'Organization'}
                />
                <AvatarFallback>
                  {organization?.name ? getInitials(organization.name) : <Building2 className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <span>Organization Invitation</span>
                </CardTitle>
                <CardDescription>
                  {organization?.name && (
                    <>You've been invited to join <strong>{organization.name}</strong></>
                  )}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {getStatusIcon(invitation.status)}
              <Badge className={getStatusColor(invitation.status)}>
                {isExpired && invitation.status === 'pending' ? 'Expired' : invitation.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Invited Email
              </Label>
              <p className="font-medium">{invitation.email}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Role
              </Label>
              <Badge variant="outline" className={cn("capitalize", getRoleColor(invitation.role))}>
                {invitation.role}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Invited By
              </Label>
              <p className="font-medium">
                {invitation.inviter?.fullName || invitation.inviter?.email || 'Unknown'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                {isExpired ? 'Expired' : 'Expires'}
              </Label>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className={cn("text-sm", isExpired && "text-red-600")}>
                  {format(new Date(invitation.token_expires_at), 'PPP')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isExpired 
                  ? `Expired ${formatDistanceToNow(new Date(invitation.token_expires_at))} ago`
                  : `Expires in ${formatDistanceToNow(new Date(invitation.token_expires_at))}`
                }
              </p>
            </div>
          </div>

          {/* Personal Message */}
          {invitation.personal_message && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Personal Message
                </Label>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm italic">"{invitation.personal_message}"</p>
                </div>
              </div>
            </>
          )}

          {/* Organization Information */}
          {organization && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Organization
                </Label>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={organization.logo_url || undefined} />
                      <AvatarFallback>
                        {getInitials(organization.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{organization.name}</p>
                      <p className="text-sm text-muted-foreground">
                        boardguru.com/{organization.slug}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Invitation Status Messages */}
          {invitation.status === 'accepted' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Invitation Accepted</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                You are now a member of this organization.
              </p>
            </div>
          )}

          {invitation.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Invitation Declined</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                This invitation has been declined.
              </p>
            </div>
          )}

          {(isExpired || invitation.status === 'expired') && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-gray-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Invitation Expired</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                This invitation has expired. Contact the organization admin for a new invitation.
              </p>
            </div>
          )}

          {invitation.status === 'revoked' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Invitation Revoked</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                This invitation has been revoked by the organization admin.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {(canAccept || canReject || showAdminActions) && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-3">
                {canAccept && (
                  <Button
                    onClick={handleAcceptInvitation}
                    disabled={acceptInvitationMutation.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    {acceptInvitationMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                )}

                {canReject && (
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={rejectInvitationMutation.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                )}

                {showAdminActions && onResend && invitation.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onResend}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend
                  </Button>
                )}

                {showAdminActions && onRevoke && invitation.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRevoke}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this invitation to join {organization?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let them know why you're declining..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shared with the person who invited you.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectInvitation}
              disabled={rejectInvitationMutation.isPending}
            >
              {rejectInvitationMutation.isPending ? 'Declining...' : 'Decline Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}