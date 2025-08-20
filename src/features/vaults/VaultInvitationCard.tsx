'use client'

import React, { useState } from 'react'
import { 
  Calendar, 
  Users, 
  FileText, 
  Clock, 
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  Star,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useOrganization } from '@/contexts/OrganizationContext'

interface VaultInvitation {
  id: string
  permissionLevel: 'viewer' | 'contributor' | 'moderator' | 'admin'
  personalMessage?: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
  expiresAt: string
  vault: {
    id: string
    name: string
    description?: string
    meetingDate?: string
    status: 'draft' | 'active' | 'archived' | 'expired' | 'cancelled'
    priority: 'low' | 'medium' | 'high' | 'urgent'
    memberCount: number
    assetCount: number
    organization: {
      id: string
      name: string
      logo_url?: string
    }
  }
  invitedBy: {
    id: string
    email: string
  }
  isExpired?: boolean
  daysUntilExpiry?: number
}

interface VaultInvitationCardProps {
  invitation: VaultInvitation
  onAccept?: (invitationId: string) => Promise<void>
  onReject?: (invitationId: string) => Promise<void>
  onView?: (invitationId: string) => void
  compact?: boolean
  showActions?: boolean
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-50 text-red-700 border-red-200'
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200'
    case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    case 'low': return 'bg-gray-50 text-gray-700 border-gray-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

const getPermissionLevelColor = (level: string) => {
  switch (level) {
    case 'admin': return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'moderator': return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'contributor': return 'bg-green-50 text-green-700 border-green-200'
    case 'viewer': return 'bg-gray-50 text-gray-700 border-gray-200'
    default: return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

const formatTimeUntilExpiry = (daysUntilExpiry: number) => {
  if (daysUntilExpiry < 0) return 'Expired'
  if (daysUntilExpiry === 0) return 'Expires today'
  if (daysUntilExpiry === 1) return 'Expires tomorrow'
  return `${daysUntilExpiry} days left`
}

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function VaultInvitationCard({
  invitation,
  onAccept,
  onReject,
  onView,
  compact = false,
  showActions = true
}: VaultInvitationCardProps) {
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const { acceptInvitation, rejectInvitation } = useOrganization()

  const isExpired = invitation.isExpired || (invitation.daysUntilExpiry !== undefined && invitation.daysUntilExpiry < 0)
  const isUrgent = invitation.daysUntilExpiry !== undefined && invitation.daysUntilExpiry <= 1 && !isExpired

  const handleAccept = async () => {
    setIsAccepting(true)
    try {
      if (onAccept) {
        await onAccept(invitation.id)
      } else {
        await acceptInvitation(invitation.id)
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error)
    } finally {
      setIsAccepting(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      if (onReject) {
        await onReject(invitation.id)
      } else {
        await rejectInvitation(invitation.id)
      }
    } catch (error) {
      console.error('Failed to reject invitation:', error)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleView = () => {
    if (onView) {
      onView(invitation.id)
    } else {
      window.location.href = `/dashboard/invitations/${invitation.id}`
    }
  }

  if (compact) {
    return (
      <Card className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isExpired && "opacity-60 bg-gray-50",
        isUrgent && "ring-2 ring-orange-200 bg-orange-50"
      )} onClick={handleView}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={invitation.vault.organization.logo_url} 
                alt={invitation.vault.organization.name}
              />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(invitation.vault.organization.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 truncate">
                  {invitation.vault.name}
                </h3>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-600 truncate">
                  from {invitation.vault.organization.name}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getPermissionLevelColor(invitation.permissionLevel))}
                >
                  {invitation.permissionLevel}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {invitation.vault.memberCount}
                </div>
                <div className="flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  {invitation.vault.assetCount}
                </div>
                {invitation.daysUntilExpiry !== undefined && (
                  <div className={cn(
                    "flex items-center",
                    isExpired && "text-red-600",
                    isUrgent && "text-orange-600"
                  )}>
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeUntilExpiry(invitation.daysUntilExpiry)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      isExpired && "opacity-75 bg-gray-50 border-gray-300",
      isUrgent && "ring-2 ring-orange-200 bg-orange-50"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage 
                src={invitation.vault.organization.logo_url} 
                alt={invitation.vault.organization.name}
              />
              <AvatarFallback className="bg-blue-100 text-blue-700">
                {getInitials(invitation.vault.organization.name)}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {invitation.vault.name}
              </h3>
              <p className="text-sm text-gray-600">
                from <span className="font-medium">{invitation.vault.organization.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {invitation.vault.priority !== 'medium' && (
              <Badge 
                variant="outline" 
                className={cn("text-xs", getPriorityColor(invitation.vault.priority))}
              >
                {invitation.vault.priority}
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn("text-xs", getPermissionLevelColor(invitation.permissionLevel))}
            >
              {invitation.permissionLevel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {invitation.vault.description && (
          <p className="text-gray-700 mb-3 line-clamp-2">
            {invitation.vault.description}
          </p>
        )}

        {invitation.personalMessage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 italic">
              "{invitation.personalMessage}"
            </p>
            <p className="text-xs text-blue-600 mt-1">
              — {invitation.invitedBy.email}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            {invitation.vault.meetingDate && (
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>
                  {new Date(invitation.vault.meetingDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            <div className="flex items-center text-gray-600">
              <Users className="h-4 w-4 mr-2" />
              <span>{invitation.vault.memberCount} members</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center text-gray-600">
              <FileText className="h-4 w-4 mr-2" />
              <span>{invitation.vault.assetCount} assets</span>
            </div>
            
            <div className={cn(
              "flex items-center",
              isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-gray-600"
            )}>
              {isExpired ? (
                <AlertTriangle className="h-4 w-4 mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              <span>
                {invitation.daysUntilExpiry !== undefined 
                  ? formatTimeUntilExpiry(invitation.daysUntilExpiry)
                  : 'No expiry'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Invited {new Date(invitation.createdAt).toLocaleDateString()} by {invitation.invitedBy.email}
        </div>
      </CardContent>

      {showActions && !isExpired && (
        <CardFooter className="flex justify-between space-x-3 pt-0">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isRejecting || isAccepting}
            className="flex-1"
          >
            {isRejecting ? (
              <>
                <XCircle className="h-4 w-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </>
            )}
          </Button>
          
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting}
            className="flex-1"
          >
            {isAccepting ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Accept & Join
              </>
            )}
          </Button>
        </CardFooter>
      )}

      {(isExpired || !showActions) && (
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            onClick={handleView}
            className="w-full"
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}