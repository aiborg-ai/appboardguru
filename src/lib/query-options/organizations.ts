/**
 * Query options for organizations
 * Using TanStack Query v5 queryOptions pattern for type-safe queries
 */

import { queryOptions } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { Database } from '@/types/database'

// Types
type Organization = Database['public']['Tables']['organizations']['Row']

export interface OrganizationWithRole extends Organization {
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  membershipStatus: 'active' | 'suspended' | 'pending_activation'
}

// Query keys factory
export const organizationKeys = {
  all: ['organizations'] as const,
  lists: () => [...organizationKeys.all, 'list'] as const,
  list: (userId: string) => [...organizationKeys.lists(), userId] as const,
  details: () => [...organizationKeys.all, 'detail'] as const,
  detail: (id: string, userId: string) => [...organizationKeys.details(), id, userId] as const,
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
    console.warn('[fetchUserOrganizations] Main endpoint failed, using safe fallback')
    // Fallback to safe API that always returns an array
    try {
      const response = await apiClient.get<OrganizationWithRole[]>('/api/organizations/safe')
      return response
    } catch (fallbackError) {
      console.error('[fetchUserOrganizations] All endpoints failed, returning empty array')
      // Return empty array as last resort
      return []
    }
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

// Query options
export const organizationOptions = {
  list: (userId: string) =>
    queryOptions({
      queryKey: organizationKeys.list(userId),
      queryFn: () => fetchUserOrganizations(userId),
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }),

  detail: (id: string, userId: string) =>
    queryOptions({
      queryKey: organizationKeys.detail(id, userId),
      queryFn: () => fetchOrganization(id, userId),
      enabled: !!id && !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    }),
}

// Prefetch helpers for server components
export async function prefetchOrganizations(queryClient: any, userId: string) {
  await queryClient.prefetchQuery(organizationOptions.list(userId))
}

export async function prefetchOrganization(queryClient: any, id: string, userId: string) {
  await queryClient.prefetchQuery(organizationOptions.detail(id, userId))
}