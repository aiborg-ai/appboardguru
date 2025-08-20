"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '@/lib/api/client'
import { useToast } from '@/features/shared/ui/use-toast'
import { Database } from '@/types/database'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// Types
type Invitation = Database['public']['Tables']['organization_invitations']['Row']
type InvitationRole = 'owner' | 'admin' | 'member' | 'viewer'
type InvitationStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked'

interface InvitationWithDetails extends Invitation {
  inviter?: {
    email: string
    fullName: string | null
  }
  organization?: {
    name: string
    slug: string
  }
}

interface CreateInvitationPayload {
  organizationId: string
  email: string
  role: InvitationRole
  personalMessage?: string
  expiresIn?: number // Hours
}

interface InvitationActionPayload {
  invitationId: string
  action: 'resend' | 'revoke'
  reason?: string
}

interface AcceptInvitationPayload {
  token: string
}

// API functions
async function fetchInvitations(organizationId: string, userId: string): Promise<InvitationWithDetails[]> {
  const response = await apiClient.get<{
    success: boolean
    data: { invitations: InvitationWithDetails[] }
    message: string
  }>(`/api/invitations?organizationId=${organizationId}&userId=${userId}`)
  
  return response.data.invitations
}

async function createInvitation(data: CreateInvitationPayload & { invitedBy: string }): Promise<InvitationWithDetails> {
  const response = await apiClient.post<{
    success: boolean
    data: InvitationWithDetails
    message: string
  }>('/api/invitations', data)
  
  return response.data
}

async function resendInvitation(data: { invitationId: string; userId: string }): Promise<InvitationWithDetails> {
  const response = await apiClient.patch<{
    success: boolean
    data: InvitationWithDetails
    message: string
  }>('/api/invitations', {
    action: 'resend',
    invitationId: data.invitationId,
    userId: data.userId,
  })
  
  return response.data
}

async function revokeInvitation(data: { invitationId: string; userId: string; reason?: string }): Promise<{ invitationId: string; action: string }> {
  const response = await apiClient.patch<{
    success: boolean
    data: { invitationId: string; action: string }
    message: string
  }>('/api/invitations', {
    action: 'revoke',
    invitationId: data.invitationId,
    userId: data.userId,
    reason: data.reason,
  })
  
  return response.data
}

async function acceptInvitation(token: string): Promise<{ 
  invitation: InvitationWithDetails
  organization: any
  member: any 
}> {
  const response = await apiClient.post<{
    success: boolean
    data: { invitation: InvitationWithDetails; organization: any; member: any }
    message: string
  }>('/api/invitations/accept', { token })
  
  return response.data
}

async function rejectInvitation(token: string, reason?: string): Promise<{ invitationId: string }> {
  const response = await apiClient.post<{
    success: boolean
    data: { invitationId: string }
    message: string
  }>('/api/invitations/reject', { token, reason })
  
  return response.data
}

async function validateInvitation(token: string): Promise<{
  invitation: InvitationWithDetails
  organization: any
  isValid: boolean
  canAccept: boolean
  errorMessage?: string
}> {
  const response = await apiClient.get<{
    success: boolean
    data: {
      invitation: InvitationWithDetails
      organization: any
      isValid: boolean
      canAccept: boolean
      errorMessage?: string
    }
    message: string
  }>(`/api/invitations/validate?token=${token}`)
  
  return response.data
}

// Query keys
export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (organizationId: string, userId: string) => [...invitationKeys.lists(), organizationId, userId] as const,
  validate: (token: string) => [...invitationKeys.all, 'validate', token] as const,
}

// Hooks
export function useInvitations(organizationId?: string, userId?: string) {
  return useQuery({
    queryKey: invitationKeys.list(organizationId || '', userId || ''),
    queryFn: () => fetchInvitations(organizationId!, userId!),
    enabled: !!organizationId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  return useMutation({
    mutationFn: async (data: CreateInvitationPayload) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return createInvitation({
        ...data,
        invitedBy: user.id,
      })
    },
    onMutate: async (newInvitation) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: invitationKeys.list(newInvitation.organizationId, '')
      })

      // Snapshot the previous value
      const previousInvitations = queryClient.getQueryData(
        invitationKeys.list(newInvitation.organizationId, '')
      )

      // Optimistically update to the new value
      const optimisticInvitation: InvitationWithDetails = {
        id: `temp-${Date.now()}`,
        organization_id: newInvitation.organizationId,
        email: newInvitation.email,
        role: newInvitation.role,
        invitation_token: 'temp-token',
        email_verification_code: 'temp-code',
        created_at: new Date().toISOString(),
        token_expires_at: new Date(Date.now() + (newInvitation.expiresIn || 72) * 60 * 60 * 1000).toISOString(),
        accepted_at: null,
        invited_by: '',
        accepted_by: null,
        personal_message: newInvitation.personalMessage || null,
        status: 'pending' as const,
        attempt_count: 0,
        max_attempts: 5,
        created_ip: null,
        accepted_ip: null,
        device_fingerprint: null,
      }

      queryClient.setQueryData(
        invitationKeys.list(newInvitation.organizationId, ''),
        (old: InvitationWithDetails[] | undefined) => 
          old ? [optimisticInvitation, ...old] : [optimisticInvitation]
      )

      // Return a context object with the snapshotted value
      return { previousInvitations, optimisticInvitation }
    },
    onSuccess: (invitation, variables, context) => {
      // Update the cache with the real invitation
      queryClient.setQueryData(
        invitationKeys.list(variables.organizationId, ''),
        (old: InvitationWithDetails[] | undefined) => {
          if (!old) return [invitation]
          return old.map(inv => 
            inv.id === context?.optimisticInvitation.id ? invitation : inv
          )
        }
      )

      toast({
        title: 'Invitation sent',
        description: `Invitation sent to ${invitation.email}`,
        variant: 'success',
      })
    },
    onError: (error: ApiError, variables, context) => {
      // Rollback the optimistic update
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          invitationKeys.list(variables.organizationId, ''),
          context.previousInvitations
        )
      }

      toast({
        title: 'Failed to send invitation',
        description: error.message || 'There was an error sending the invitation.',
        variant: 'destructive',
      })
    },
  })
}

export function useResendInvitation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  return useMutation({
    mutationFn: async ({ invitationId, organizationId }: { invitationId: string; organizationId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return resendInvitation({ invitationId, userId: user.id })
    },
    onSuccess: (invitation, variables) => {
      const { organizationId } = variables

      // Update the invitation in cache with new expiry
      queryClient.setQueryData(
        invitationKeys.list(organizationId, ''),
        (old: InvitationWithDetails[] | undefined) => {
          if (!old) return old
          return old.map(inv => 
            inv.id === invitation.id ? invitation : inv
          )
        }
      )

      toast({
        title: 'Invitation resent',
        description: `Invitation resent to ${invitation.email}`,
        variant: 'success',
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to resend invitation',
        description: error.message || 'There was an error resending the invitation.',
        variant: 'destructive',
      })
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  return useMutation({
    mutationFn: async ({ invitationId, organizationId, reason }: { invitationId: string; organizationId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return revokeInvitation({ invitationId, userId: user.id, reason })
    },
    onMutate: async ({ invitationId, organizationId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: invitationKeys.list(organizationId, '')
      })

      // Snapshot the previous value
      const previousInvitations = queryClient.getQueryData(
        invitationKeys.list(organizationId, '')
      )

      // Optimistically update by removing the invitation
      queryClient.setQueryData(
        invitationKeys.list(organizationId, ''),
        (old: InvitationWithDetails[] | undefined) => 
          old ? old.filter(inv => inv.id !== invitationId) : []
      )

      return { previousInvitations }
    },
    onSuccess: (result, variables) => {
      toast({
        title: 'Invitation revoked',
        description: 'The invitation has been revoked successfully.',
        variant: 'success',
      })
    },
    onError: (error: ApiError, variables, context) => {
      // Rollback the optimistic update
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          invitationKeys.list(variables.organizationId, ''),
          context.previousInvitations
        )
      }

      toast({
        title: 'Failed to revoke invitation',
        description: error.message || 'There was an error revoking the invitation.',
        variant: 'destructive',
      })
    },
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: (result) => {
      // Invalidate all organization-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })

      toast({
        title: 'Invitation accepted',
        description: `Welcome to ${result.organization.name}!`,
        variant: 'success',
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to accept invitation',
        description: error.message || 'There was an error accepting the invitation.',
        variant: 'destructive',
      })
    },
  })
}

export function useRejectInvitation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ token, reason }: { token: string; reason?: string }) => 
      rejectInvitation(token, reason),
    onSuccess: () => {
      toast({
        title: 'Invitation declined',
        description: 'You have declined the invitation.',
        variant: 'success',
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to decline invitation',
        description: error.message || 'There was an error declining the invitation.',
        variant: 'destructive',
      })
    },
  })
}

export function useValidateInvitation(token?: string) {
  return useQuery({
    queryKey: invitationKeys.validate(token || ''),
    queryFn: () => validateInvitation(token!),
    enabled: !!token,
    staleTime: 0, // Always refetch to check current validity
    gcTime: 0, // Don't cache validation results
    retry: false, // Don't retry failed validations
  })
}

// Legacy validation - replaced by lightweight form validators
// This export is kept for backward compatibility but should be migrated
export const invitationValidation = {
  email: {
    required: 'Email address is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    }
  },
  role: {
    required: 'Please select a role'
  },
  personalMessage: {
    maxLength: { 
      value: 500, 
      message: 'Personal message must be less than 500 characters' 
    }
  }
}