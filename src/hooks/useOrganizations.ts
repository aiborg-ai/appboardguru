"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '@/lib/api/client'
import { useToast } from '@/components/ui/use-toast'
import { Database } from '@/types/database'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'

// Types
type Organization = Database['public']['Tables']['organizations']['Row']
type CreateOrganizationData = Database['public']['Tables']['organizations']['Insert']
type UpdateOrganizationData = Partial<Pick<Organization, 'name' | 'description' | 'website' | 'industry' | 'organization_size' | 'logo_url'>>

interface OrganizationWithRole extends Organization {
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  membershipStatus: 'active' | 'suspended' | 'pending_activation'
}

interface CreateOrganizationPayload {
  name: string
  slug: string
  description?: string
  website?: string
  industry?: string
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
}

interface UpdateOrganizationPayload {
  organizationId: string
  name?: string
  description?: string
  website?: string
  industry?: string
  organizationSize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  logoUrl?: string
}

// API functions
async function fetchUserOrganizations(userId: string): Promise<OrganizationWithRole[]> {
  try {
    // Try the enhanced API first
    const response = await apiClient.get<{
      success: boolean
      data: { organizations: OrganizationWithRole[] }
      message: string
    }>(`/api/organizations?userId=${userId}`)
    
    return response.data.organizations
  } catch (error) {
    // Fallback to simple API if enhanced fails
    console.log('Falling back to simple organizations API');
    const response = await apiClient.get<OrganizationWithRole[]>('/api/organizations/simple')
    return response
  }
}

async function fetchOrganization(id: string, userId: string): Promise<OrganizationWithRole> {
  const response = await apiClient.get<{
    success: boolean
    data: OrganizationWithRole
    message: string
  }>(`/api/organizations?id=${id}&userId=${userId}`)
  
  return response.data
}

async function createOrganization(data: CreateOrganizationPayload & { createdBy: string }): Promise<Organization> {
  const response = await apiClient.post<{
    success: boolean
    data: Organization
    message: string
  }>('/api/organizations', data)
  
  return response.data
}

async function updateOrganization(data: UpdateOrganizationPayload & { userId: string }): Promise<Organization> {
  const response = await apiClient.put<{
    success: boolean
    data: Organization
    message: string
  }>('/api/organizations', data)
  
  return response.data
}

async function deleteOrganization(organizationId: string, userId: string, immediate = false): Promise<{ organizationId: string; scheduledDeletion: boolean; deletionDate?: string }> {
  const response = await apiClient.delete<{
    success: boolean
    data: { organizationId: string; scheduledDeletion: boolean; deletionDate?: string }
    message: string
  }>(`/api/organizations?id=${organizationId}&userId=${userId}&immediate=${immediate}`)
  
  return response.data
}

// Query keys
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (userId: string) => [...organizationKeys.lists(), userId] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string, userId: string) => [...organizationKeys.details(), id, userId] as const,
}

// Hooks
export function useUserOrganizations(userId?: string) {
  return useQuery({
    queryKey: organizationKeys.list(userId || ''),
    queryFn: () => fetchUserOrganizations(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useOrganization(id?: string, userId?: string) {
  return useQuery({
    queryKey: organizationKeys.detail(id || '', userId || ''),
    queryFn: () => fetchOrganization(id!, userId!),
    enabled: !!id && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateOrganizationPayload) => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return createOrganization({
        ...data,
        createdBy: user.id,
      })
    },
    onSuccess: (organization, variables) => {
      // Invalidate user organizations list
      queryClient.invalidateQueries({ queryKey: organizationKeys.lists() })
      
      // Add the new organization to the cache
      queryClient.setQueryData(
        organizationKeys.list(organization.created_by),
        (old: OrganizationWithRole[] | undefined) => {
          const newOrg: OrganizationWithRole = {
            ...organization,
            userRole: 'owner',
            membershipStatus: 'active'
          }
          return old ? [newOrg, ...old] : [newOrg]
        }
      )

      toast({
        title: 'Organization created',
        description: `${organization.name} has been created successfully.`,
        variant: 'success',
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to create organization',
        description: error.message || 'There was an error creating the organization.',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: UpdateOrganizationPayload) => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return updateOrganization({
        ...data,
        userId: user.id,
      })
    },
    onSuccess: (organization, variables) => {
      const { organizationId } = variables

      // Update the organization in all relevant queries
      queryClient.setQueryData(
        organizationKeys.detail(organizationId, organization.created_by),
        (old: OrganizationWithRole | undefined) => {
          if (!old) return old
          return { ...old, ...organization }
        }
      )

      // Update in user organizations list
      queryClient.setQueryData(
        organizationKeys.list(organization.created_by),
        (old: OrganizationWithRole[] | undefined) => {
          if (!old) return old
          return old.map(org => 
            org.id === organizationId 
              ? { ...org, ...organization }
              : org
          )
        }
      )

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId, organization.created_by) })

      toast({
        title: 'Organization updated',
        description: `${organization.name} has been updated successfully.`,
        variant: 'success',
      })
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to update organization',
        description: error.message || 'There was an error updating the organization.',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ organizationId, immediate = false }: { organizationId: string; immediate?: boolean }) => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      return deleteOrganization(organizationId, user.id, immediate)
    },
    onSuccess: (result, variables) => {
      const { organizationId } = variables

      if (result.scheduledDeletion) {
        // For scheduled deletion, just show message
        toast({
          title: 'Organization deletion scheduled',
          description: `The organization will be deleted on ${result.deletionDate}.`,
          variant: 'success',
        })
      } else {
        // For immediate deletion, remove from cache
        queryClient.removeQueries({ queryKey: organizationKeys.detail(organizationId, '') })
        queryClient.setQueryData(
          organizationKeys.lists(),
          (old: OrganizationWithRole[] | undefined) => {
            if (!old) return old
            return old.filter(org => org.id !== organizationId)
          }
        )

        toast({
          title: 'Organization deleted',
          description: 'The organization has been permanently deleted.',
          variant: 'success',
        })
      }

      // Invalidate all organization queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: organizationKeys.all })
    },
    onError: (error: ApiError) => {
      toast({
        title: 'Failed to delete organization',
        description: error.message || 'There was an error deleting the organization.',
        variant: 'destructive',
      })
    },
  })
}

// Utility function to generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

// Validation schemas for forms
export const organizationValidation = {
  name: {
    required: 'Organization name is required',
    minLength: { value: 2, message: 'Name must be at least 2 characters' },
    maxLength: { value: 100, message: 'Name must be less than 100 characters' },
  },
  slug: {
    required: 'Organization slug is required',
    pattern: {
      value: /^[a-z0-9-]+$/,
      message: 'Slug can only contain lowercase letters, numbers, and hyphens'
    },
    minLength: { value: 2, message: 'Slug must be at least 2 characters' },
    maxLength: { value: 50, message: 'Slug must be less than 50 characters' },
  },
  description: {
    maxLength: { value: 500, message: 'Description must be less than 500 characters' },
  },
  website: {
    pattern: {
      value: /^https?:\/\/.+/,
      message: 'Please enter a valid URL starting with http:// or https://'
    }
  }
}