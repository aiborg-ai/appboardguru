"use client"

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/features/shared/ui/use-toast'
import { createInvitationsAction, updateInvitationAction, bulkInvitationAction } from '@/lib/actions/invitation-actions'

// Modern types for React 19
interface InvitationData {
  email: string
  role: 'admin' | 'member' | 'viewer'
}

interface CreateInvitationsPayload {
  organizationId: string
  invitations: InvitationData[]
  personalMessage?: string
  expiresIn: number
}

interface OptimisticInvitation {
  readonly id: string
  readonly email: string
  readonly role: 'admin' | 'member' | 'viewer'
  readonly status: 'pending' | 'sending'
  readonly createdAt: string
  readonly optimistic?: boolean
}

// Type-safe optimistic action types
type OptimisticAction = 
  | { readonly type: 'add-optimistic'; readonly payload: { readonly invitations: readonly InvitationData[] } }
  | { readonly type: 'remove-optimistic'; readonly payload: Record<string, never> }
  | { readonly type: 'update-status'; readonly payload: { readonly id: string; readonly status: 'pending' | 'sending' } };

// Type-safe invitation list for React Query cache
type InvitationList = readonly OptimisticInvitation[];

// Type-safe form state actions for useOptimistic
type FormStateAction = 
  | { readonly type: 'add' }
  | { readonly type: 'remove'; readonly index: number }
  | { readonly type: 'update'; readonly index: number; readonly field: 'email' | 'role'; readonly value: string }
  | { readonly type: 'reset' };

// Type-safe form state
interface InvitationFormState {
  readonly invitations: readonly { readonly email: string; readonly role: 'admin' | 'member' | 'viewer' }[];
}

// Query keys following React Query v5 best practices
export const modernInvitationKeys = {
  all: ['modern-invitations'] as const,
  lists: () => [...modernInvitationKeys.all, 'list'] as const,
  list: (organizationId: string) => [...modernInvitationKeys.lists(), organizationId] as const,
  details: () => [...modernInvitationKeys.all, 'detail'] as const,
  detail: (id: string) => [...modernInvitationKeys.details(), id] as const,
}

/**
 * Modern hook for creating invitations with React 19 patterns
 * Features:
 * - useOptimistic integration
 * - React Query v5 mutations
 * - Server Actions
 * - Automatic error recovery
 */
export function useCreateModernInvitations(organizationId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // React 19: useOptimistic for instant UI updates
  const [optimisticInvitations, setOptimisticInvitations] = React.useOptimistic(
    [] as OptimisticInvitation[],
    (state: OptimisticInvitation[], action: OptimisticAction) => {
      switch (action.type) {
        case 'add-optimistic':
          return [
            ...state,
            ...action.payload.invitations.map((inv: InvitationData, index: number) => ({
              id: `optimistic-${Date.now()}-${index}`,
              email: inv.email,
              role: inv.role,
              status: 'sending' as const,
              createdAt: new Date().toISOString(),
              optimistic: true,
            }))
          ]
        case 'remove-optimistic':
          return state.filter(inv => !inv.optimistic)
        case 'update-status':
          return state.map(inv => 
            inv.id === action.payload.id 
              ? { ...inv, status: action.payload.status }
              : inv
          )
        default:
          return state
      }
    }
  )

  // React Query v5 mutation with enhanced error handling
  const mutation = useMutation({
    mutationFn: async (payload: CreateInvitationsPayload) => {
      // Create FormData for server action
      const formData = new FormData()
      formData.append('organizationId', payload.organizationId)
      formData.append('invitations', JSON.stringify(payload.invitations))
      formData.append('personalMessage', payload.personalMessage || '')
      formData.append('expiresIn', payload.expiresIn.toString())

      return createInvitationsAction(null, formData)
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: modernInvitationKeys.list(organizationId)
      })

      // Snapshot previous value
      const previousInvitations = queryClient.getQueryData(
        modernInvitationKeys.list(organizationId)
      )

      // Optimistically update the cache
      queryClient.setQueryData(
        modernInvitationKeys.list(organizationId),
        (old: InvitationList = []) => [
          ...variables.invitations.map((inv, index) => ({
            id: `temp-${Date.now()}-${index}`,
            email: inv.email,
            role: inv.role,
            status: 'pending',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + variables.expiresIn * 60 * 60 * 1000).toISOString(),
            personalMessage: variables.personalMessage,
            organizationId: variables.organizationId,
            optimistic: true,
          })),
          ...old
        ] as InvitationList
      )

      // Update optimistic state
      React.startTransition(() => {
        setOptimisticInvitations({
          type: 'add-optimistic',
          payload: { invitations: variables.invitations }
        })
      })

      return { previousInvitations, variables }
    },
    onSuccess: (result, variables, context) => {
      if (result.success && result.data) {
        // Replace optimistic data with real data
        queryClient.setQueryData(
          modernInvitationKeys.list(organizationId),
          (old: InvitationList = []) => {
            const withoutOptimistic = old.filter(inv => !inv.optimistic);
            return [...(result.data || []), ...withoutOptimistic] as InvitationList;
          }
        )

        // Clear optimistic state
        React.startTransition(() => {
          setOptimisticInvitations({ type: 'remove-optimistic', payload: {} })
        })

        toast({
          title: 'Invitations sent successfully',
          description: `${result.data.length} invitation(s) sent${result.error ? ` (${result.error})` : ''}`,
          variant: result.error ? 'default' : 'success',
        })
      } else {
        throw new Error(result.error || 'Failed to send invitations')
      }
    },
    onError: (error: Error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          modernInvitationKeys.list(organizationId),
          context.previousInvitations
        )
      }

      React.startTransition(() => {
        setOptimisticInvitations({ type: 'remove-optimistic', payload: {} })
      })

      toast({
        title: 'Failed to send invitations',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
    // React Query v5: Enhanced retry logic
    retry: (failureCount, error: Error | unknown) => {
      // Don't retry validation errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('validation') || errorMessage?.includes('permission')) {
        return false
      }
      // Retry network errors up to 2 times
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  return {
    ...mutation,
    optimisticInvitations,
    createInvitations: mutation.mutate,
    createInvitationsAsync: mutation.mutateAsync,
  }
}

/**
 * Modern hook for invitation operations (resend, revoke)
 */
export function useInvitationOperations(organizationId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateMutation = useMutation({
    mutationFn: async ({ 
      invitationId, 
      action, 
      reason 
    }: { 
      invitationId: string
      action: 'resend' | 'revoke'
      reason?: string 
    }) => {
      return updateInvitationAction(invitationId, action, reason)
    },
    onMutate: async ({ invitationId, action }) => {
      await queryClient.cancelQueries({
        queryKey: modernInvitationKeys.list(organizationId)
      })

      const previousInvitations = queryClient.getQueryData(
        modernInvitationKeys.list(organizationId)
      )

      // Optimistic update
      queryClient.setQueryData(
        modernInvitationKeys.list(organizationId),
        (old: InvitationList = []) => {
          if (action === 'revoke') {
            return old.filter(inv => inv.id !== invitationId) as InvitationList;
          } else {
            return old.map(inv => 
              inv.id === invitationId 
                ? { ...inv, status: 'pending' as const, updatedAt: new Date().toISOString() }
                : inv
            ) as InvitationList;
          }
        }
      )

      return { previousInvitations }
    },
    onSuccess: (result, { action, invitationId }) => {
      if (result.success) {
        // Update with real data if available
        if (result.data && action === 'resend') {
          queryClient.setQueryData(
            modernInvitationKeys.list(organizationId),
            (old: InvitationList = []) => old.map(inv => 
              inv.id === invitationId ? { ...inv, ...result.data } : inv
            ) as InvitationList
          )
        }

        toast({
          title: `Invitation ${action === 'resend' ? 'resent' : 'revoked'}`,
          description: `The invitation has been ${action === 'resend' ? 'resent' : 'revoked'} successfully.`,
          variant: 'success',
        })
      } else {
        throw new Error(result.error || `Failed to ${action} invitation`)
      }
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousInvitations) {
        queryClient.setQueryData(
          modernInvitationKeys.list(organizationId),
          context.previousInvitations
        )
      }

      toast({
        title: `Failed to ${variables.action} invitation`,
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: async ({
      action,
      invitationIds
    }: {
      action: 'resend-all' | 'revoke-all'
      invitationIds: string[]
    }) => {
      return bulkInvitationAction(organizationId, action, invitationIds)
    },
    onSuccess: (result, { action }) => {
      if (result.success) {
        // Invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: modernInvitationKeys.list(organizationId)
        })

        toast({
          title: `Bulk ${action} completed`,
          description: `${result.data?.length || 0} invitation(s) processed${result.error ? ` (${result.error})` : ''}`,
          variant: result.error ? 'default' : 'success',
        })
      } else {
        throw new Error(result.error || `Failed to ${action}`)
      }
    },
    onError: (error: Error, { action }) => {
      toast({
        title: `Failed to ${action}`,
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })

  return {
    resendInvitation: (invitationId: string) => 
      updateMutation.mutate({ invitationId, action: 'resend' }),
    revokeInvitation: (invitationId: string, reason?: string) => 
      updateMutation.mutate({ invitationId, action: 'revoke', reason }),
    bulkResend: (invitationIds: string[]) => 
      bulkMutation.mutate({ action: 'resend-all', invitationIds }),
    bulkRevoke: (invitationIds: string[]) => 
      bulkMutation.mutate({ action: 'revoke-all', invitationIds }),
    isUpdating: updateMutation.isPending || bulkMutation.isPending,
  }
}

/**
 * Modern hook for listing invitations with React Query v5
 */
export function useModernInvitations(organizationId?: string, userId?: string) {
  return useQuery({
    queryKey: modernInvitationKeys.list(organizationId || ''),
    queryFn: async () => {
      if (!organizationId || !userId) {
        throw new Error('Organization ID and User ID are required')
      }

      const response = await fetch(
        `/api/invitations?organizationId=${organizationId}&userId=${userId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }

      const result = await response.json()
      return result.data?.invitations || []
    },
    enabled: !!organizationId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    // React Query v5: Enhanced error retry
    retry: (failureCount, error: Error | unknown) => {
      const errorStatus = (error as { status?: number })?.status;
      if (errorStatus === 403 || errorStatus === 404) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * React 19: Custom hook for managing form state with useActionState
 */
export function useInvitationFormState() {
  const [optimisticState, setOptimisticState] = React.useOptimistic(
    { invitations: [{ email: '', role: 'member' as const }] } as InvitationFormState,
    (state: InvitationFormState, action: FormStateAction) => {
      switch (action.type) {
        case 'add':
          return {
            ...state,
            invitations: [...state.invitations, { email: '', role: 'member' }]
          }
        case 'remove':
          return {
            ...state,
            invitations: state.invitations.filter((_, i: number) => i !== action.index)
          }
        case 'update':
          return {
            ...state,
            invitations: state.invitations.map((inv, i: number) => 
              i === action.index 
                ? { ...inv, [action.field]: action.value }
                : inv
            )
          }
        case 'reset':
          return { invitations: [{ email: '', role: 'member' }] }
        default:
          return state
      }
    }
  )

  const dispatch = React.useCallback((action: FormStateAction) => {
    React.startTransition(() => {
      setOptimisticState(action)
    })
  }, [setOptimisticState])

  return [optimisticState, dispatch] as const
}