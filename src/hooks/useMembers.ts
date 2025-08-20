"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '@/lib/api/client'
import { useToast } from '@/features/shared/ui/use-toast'
import { Database } from '@/types/database'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// Types
type OrganizationMember = Database['public']['Tables']['organization_members']['Row']
type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
type MemberStatus = 'active' | 'suspended' | 'pending_activation'

interface MemberWithUser extends OrganizationMember {
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface UpdateMemberRolePayload {
  organizationId: string
  targetUserId: string
  newRole: MemberRole
}

interface RemoveMemberPayload {
  organizationId: string
  targetUserId: string
  reason?: string
}

interface TransferOwnershipPayload {
  organizationId: string
  targetUserId: string
}

// API functions
async function fetchOrganizationMembers(organizationId: string, userId: string): Promise<MemberWithUser[]> {
  const response = await apiClient.get<{
    success: boolean
    data: { members: MemberWithUser[] }
    message: string
  }>(`/api/organizations/${organizationId}/members?userId=${userId}`)
  
  return response.data.members
}

async function updateMemberRole(data: UpdateMemberRolePayload & { userId: string }): Promise<MemberWithUser> {
  const response = await apiClient.patch<{
    success: boolean
    data: MemberWithUser
    message: string
  }>(`/api/organizations/${data.organizationId}/members`, {
    action: 'updateRole',
    targetUserId: data.targetUserId,
    newRole: data.newRole,
    userId: data.userId,
  })
  
  return response.data
}

async function removeMember(data: RemoveMemberPayload & { userId: string }): Promise<{ targetUserId: string }> {
  const response = await apiClient.patch<{
    success: boolean
    data: { targetUserId: string }
    message: string
  }>(`/api/organizations/${data.organizationId}/members`, {
    action: 'removeMember',
    targetUserId: data.targetUserId,
    userId: data.userId,
    reason: data.reason,
  })
  
  return response.data
}

async function transferOwnership(data: TransferOwnershipPayload & { userId: string }): Promise<{
  newOwner: MemberWithUser
  previousOwner: MemberWithUser
}> {
  const response = await apiClient.patch<{
    success: boolean
    data: {
      newOwner: MemberWithUser
      previousOwner: MemberWithUser
    }
    message: string
  }>(`/api/organizations/${data.organizationId}/members`, {
    action: 'transferOwnership',
    targetUserId: data.targetUserId,
    userId: data.userId,
  })
  
  return response.data
}

// Query keys
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (organizationId: string, userId: string) => [...memberKeys.lists(), organizationId, userId] as const,
}

// Hooks
export function useOrganizationMembers(organizationId?: string, userId?: string) {
  return useQuery({
    queryKey: memberKeys.list(organizationId || '', userId || ''),
    queryFn: () => fetchOrganizationMembers(organizationId!, userId!),
    enabled: !!organizationId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (data: UpdateMemberRolePayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return updateMemberRole({
        ...data,
        userId: user.id,
      })
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: memberKeys.list(variables.organizationId, '')
      })

      // Snapshot the previous value
      const previousMembers = queryClient.getQueryData(
        memberKeys.list(variables.organizationId, '')
      )

      // Optimistically update the member role
      queryClient.setQueryData(
        memberKeys.list(variables.organizationId, ''),
        (old: MemberWithUser[] | undefined) => {
          if (!old) return old
          return old.map(member => 
            member.user_id === variables.targetUserId 
              ? { ...member, role: variables.newRole }
              : member
          )
        }
      )

      return { previousMembers }
    },
    onSuccess: (updatedMember, variables) => {
      // Update with the real data from server
      queryClient.setQueryData(
        memberKeys.list(variables.organizationId, ''),
        (old: MemberWithUser[] | undefined) => {
          if (!old) return old
          return old.map(member => 
            member.user_id === variables.targetUserId ? updatedMember : member
          )
        }
      )

      toast({
        title: 'Role updated',
        description: `${updatedMember.user.full_name || updatedMember.user.email} is now a ${variables.newRole}`,
        variant: 'success',
      })
    },
    onError: (error: ApiError, variables, context) => {
      // Rollback the optimistic update
      if (context?.previousMembers) {
        queryClient.setQueryData(
          memberKeys.list(variables.organizationId, ''),
          context.previousMembers
        )
      }

      toast({
        title: 'Failed to update role',
        description: error.message || 'There was an error updating the member role.',
        variant: 'destructive',
      })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (data: RemoveMemberPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return removeMember({
        ...data,
        userId: user.id,
      })
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: memberKeys.list(variables.organizationId, '')
      })

      // Snapshot the previous value
      const previousMembers = queryClient.getQueryData(
        memberKeys.list(variables.organizationId, '')
      )

      // Optimistically remove the member
      queryClient.setQueryData(
        memberKeys.list(variables.organizationId, ''),
        (old: MemberWithUser[] | undefined) => {
          if (!old) return old
          return old.filter(member => member.user_id !== variables.targetUserId)
        }
      )

      return { previousMembers }
    },
    onSuccess: (result, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: memberKeys.list(variables.organizationId, '') })

      toast({
        title: 'Member removed',
        description: 'The member has been removed from the organization.',
        variant: 'success',
      })
    },
    onError: (error: ApiError, variables, context) => {
      // Rollback the optimistic update
      if (context?.previousMembers) {
        queryClient.setQueryData(
          memberKeys.list(variables.organizationId, ''),
          context.previousMembers
        )
      }

      toast({
        title: 'Failed to remove member',
        description: error.message || 'There was an error removing the member.',
        variant: 'destructive',
      })
    },
  })
}

export function useTransferOwnership() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (data: TransferOwnershipPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return transferOwnership({
        ...data,
        userId: user.id,
      })
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: memberKeys.list(variables.organizationId, '')
      })

      // Snapshot the previous value
      const previousMembers = queryClient.getQueryData(
        memberKeys.list(variables.organizationId, '')
      )

      // Optimistically update roles
      queryClient.setQueryData(
        memberKeys.list(variables.organizationId, ''),
        (old: MemberWithUser[] | undefined) => {
          if (!old) return old
          return old.map(member => {
            if (member.user_id === variables.targetUserId) {
              return { ...member, role: 'owner' as const }
            }
            if (member.role === 'owner') {
              return { ...member, role: 'admin' as const }
            }
            return member
          })
        }
      )

      return { previousMembers }
    },
    onSuccess: (result, variables) => {
      // Update with the real data from server
      queryClient.setQueryData(
        memberKeys.list(variables.organizationId, ''),
        (old: MemberWithUser[] | undefined) => {
          if (!old) return old
          return old.map(member => {
            if (member.user_id === result.newOwner.user_id) {
              return result.newOwner
            }
            if (member.user_id === result.previousOwner.user_id) {
              return result.previousOwner
            }
            return member
          })
        }
      )

      // Invalidate organization queries as ownership affects permissions
      queryClient.invalidateQueries({ queryKey: ['organizations'] })

      toast({
        title: 'Ownership transferred',
        description: `${result.newOwner.user.full_name || result.newOwner.user.email} is now the owner of this organization.`,
        variant: 'success',
      })
    },
    onError: (error: ApiError, variables, context) => {
      // Rollback the optimistic update
      if (context?.previousMembers) {
        queryClient.setQueryData(
          memberKeys.list(variables.organizationId, ''),
          context.previousMembers
        )
      }

      toast({
        title: 'Failed to transfer ownership',
        description: error.message || 'There was an error transferring ownership.',
        variant: 'destructive',
      })
    },
  })
}

// Utility functions
export function getMemberDisplayName(member: MemberWithUser): string {
  return member.user.full_name || member.user.email
}

export function getRoleColor(role: MemberRole): string {
  switch (role) {
    case 'owner':
      return 'bg-purple-100 text-purple-800'
    case 'admin':
      return 'bg-red-100 text-red-800'
    case 'member':
      return 'bg-blue-100 text-blue-800'
    case 'viewer':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getRoleDescription(role: MemberRole): string {
  switch (role) {
    case 'owner':
      return 'Full access to organization settings, billing, and member management'
    case 'admin':
      return 'Manage members, invitations, and organization content'
    case 'member':
      return 'Access organization content and create board packs'
    case 'viewer':
      return 'View organization content only'
    default:
      return 'Unknown role'
  }
}

export function canModifyRole(currentUserRole: MemberRole, targetRole: MemberRole): boolean {
  // Owner can modify any role except other owners
  if (currentUserRole === 'owner') {
    return targetRole !== 'owner'
  }
  
  // Admin can modify member and viewer roles only
  if (currentUserRole === 'admin') {
    return targetRole === 'member' || targetRole === 'viewer'
  }
  
  // Members and viewers cannot modify roles
  return false
}

export function canRemoveMember(currentUserRole: MemberRole, targetRole: MemberRole): boolean {
  // Owner can remove anyone except other owners
  if (currentUserRole === 'owner') {
    return targetRole !== 'owner'
  }
  
  // Admin can remove members and viewers
  if (currentUserRole === 'admin') {
    return targetRole === 'member' || targetRole === 'viewer'
  }
  
  // Members and viewers cannot remove members
  return false
}

export function canTransferOwnership(currentUserRole: MemberRole): boolean {
  return currentUserRole === 'owner'
}

// Available roles for selection
export const availableRoles: { value: MemberRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage members and organization content'
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Access and create organization content'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'View organization content only'
  }
]