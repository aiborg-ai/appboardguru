'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { useUserOrganizations } from '@/hooks/useOrganizations'

// Types
export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  website?: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  membershipStatus: 'active' | 'suspended' | 'pending_activation'
}

export interface Vault {
  id: string
  name: string
  description?: string
  meetingDate?: string
  status: 'draft' | 'active' | 'archived' | 'expired' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  memberCount: number
  assetCount: number
  userRole: 'owner' | 'admin' | 'moderator' | 'contributor' | 'viewer'
  lastActivityAt: string
}

export interface VaultInvitation {
  id: string
  permissionLevel: 'viewer' | 'contributor' | 'moderator' | 'admin'
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  vault: {
    id: string
    name: string
    organization: {
      id: string
      name: string
    }
  }
  expiresAt: string
  createdAt: string
}

export interface OrganizationContextType {
  // Current selection state
  currentOrganization: Organization | null
  currentVault: Vault | null
  
  // Data
  organizations: Organization[]
  vaults: Vault[]
  pendingInvitations: VaultInvitation[]
  
  // Loading states
  isLoadingOrganizations: boolean
  isLoadingVaults: boolean
  isLoadingInvitations: boolean
  
  // Actions
  selectOrganization: (org: Organization | null) => void
  selectVault: (vault: Vault | null) => void
  refreshOrganizations: () => void
  refreshVaults: () => void
  refreshInvitations: () => void
  acceptInvitation: (invitationId: string) => Promise<boolean>
  rejectInvitation: (invitationId: string) => Promise<boolean>
  
  // Filtering helpers
  filterByOrganization: <T extends { organization?: { id: string } }>(items: T[]) => T[]
  isCurrentOrganization: (orgId: string) => boolean
  
  // Stats
  totalVaults: number
  totalPendingInvitations: number
}

const OrganizationContext = createContext<OrganizationContextType | null>(null)

// Custom hook to use the organization context
export const useOrganization = () => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

// Provider component
export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // State
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [currentVault, setCurrentVault] = useState<Vault | null>(null)
  const [vaults, setVaults] = useState<Vault[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<VaultInvitation[]>([])
  
  // Loading states
  const [isLoadingVaults, setIsLoadingVaults] = useState(false)
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false)
  
  // User and organizations
  const [userId, setUserId] = useState<string>('')
  const { 
    data: organizations = [], 
    isLoading: isLoadingOrganizations,
    refetch: refetchOrganizations
  } = useUserOrganizations(userId)

  // Supabase client
  const supabase = createSupabaseBrowserClient()

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [supabase])

  // Load user's default organization from localStorage or set first available
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      // Try to load saved organization
      const savedOrgId = localStorage.getItem('boardguru_current_organization')
      const savedOrg = savedOrgId ? organizations.find(org => org.id === savedOrgId) : null
      
      // Use saved org if found, otherwise use the first organization
      const defaultOrg = savedOrg || organizations[0]
      setCurrentOrganization(defaultOrg)
    }
  }, [organizations, currentOrganization])

  // Save current organization to localStorage
  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('boardguru_current_organization', currentOrganization.id)
    }
  }, [currentOrganization])

  // Load vaults when organization changes
  const refreshVaults = useCallback(async () => {
    if (!currentOrganization || !userId) return

    setIsLoadingVaults(true)
    try {
      const response = await fetch(`/api/vaults?organizationId=${currentOrganization.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setVaults(data.vaults || [])
        
        // Clear current vault if it doesn't belong to selected organization
        if (currentVault && !data.vaults?.find((v: Vault) => v.id === currentVault.id)) {
          setCurrentVault(null)
        }
      } else {
        console.error('Failed to fetch vaults:', response.statusText)
        setVaults([])
      }
    } catch (error) {
      console.error('Error fetching vaults:', error)
      setVaults([])
    } finally {
      setIsLoadingVaults(false)
    }
  }, [currentOrganization, userId, currentVault])

  // Load vaults when organization changes
  useEffect(() => {
    refreshVaults()
  }, [refreshVaults])

  // Load pending invitations
  const refreshInvitations = useCallback(async () => {
    if (!userId) return

    setIsLoadingInvitations(true)
    try {
      const response = await fetch('/api/vault-invitations?status=pending', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPendingInvitations(data.invitations || [])
      } else {
        console.error('Failed to fetch invitations:', response.statusText)
        setPendingInvitations([])
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setPendingInvitations([])
    } finally {
      setIsLoadingInvitations(false)
    }
  }, [userId])

  // Load invitations on mount and when user changes
  useEffect(() => {
    refreshInvitations()
  }, [refreshInvitations])

  // Actions
  const selectOrganization = useCallback((org: Organization | null) => {
    setCurrentOrganization(org)
    setCurrentVault(null) // Clear vault when changing organizations
  }, [])

  const selectVault = useCallback((vault: Vault | null) => {
    setCurrentVault(vault)
  }, [])

  const refreshOrganizations = useCallback(() => {
    refetchOrganizations()
  }, [refetchOrganizations])

  const acceptInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/vault-invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'accept' })
      })

      if (response.ok) {
        // Refresh invitations and vaults
        await Promise.all([
          refreshInvitations(),
          refreshVaults()
        ])
        return true
      } else {
        const error = await response.json()
        console.error('Failed to accept invitation:', error.error)
        return false
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      return false
    }
  }, [refreshInvitations, refreshVaults])

  const rejectInvitation = useCallback(async (invitationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/vault-invitations/${invitationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reject' })
      })

      if (response.ok) {
        // Refresh invitations
        await refreshInvitations()
        return true
      } else {
        const error = await response.json()
        console.error('Failed to reject invitation:', error.error)
        return false
      }
    } catch (error) {
      console.error('Error rejecting invitation:', error)
      return false
    }
  }, [refreshInvitations])

  // Filtering helpers
  const filterByOrganization = useCallback(<T extends { organization?: { id: string } }>(items: T[]): T[] => {
    if (!currentOrganization) return items
    return items.filter(item => item.organization?.id === currentOrganization.id)
  }, [currentOrganization])

  const isCurrentOrganization = useCallback((orgId: string): boolean => {
    return currentOrganization?.id === orgId
  }, [currentOrganization])

  // Computed values
  const totalVaults = vaults.length
  const totalPendingInvitations = pendingInvitations.length

  // Context value
  const contextValue: OrganizationContextType = {
    // Current selection state
    currentOrganization,
    currentVault,
    
    // Data
    organizations,
    vaults,
    pendingInvitations,
    
    // Loading states
    isLoadingOrganizations,
    isLoadingVaults,
    isLoadingInvitations,
    
    // Actions
    selectOrganization,
    selectVault,
    refreshOrganizations,
    refreshVaults,
    refreshInvitations,
    acceptInvitation,
    rejectInvitation,
    
    // Filtering helpers
    filterByOrganization,
    isCurrentOrganization,
    
    // Stats
    totalVaults,
    totalPendingInvitations
  }

  return (
    <OrganizationContext.Provider value={contextValue}>
      {children}
    </OrganizationContext.Provider>
  )
}

// Higher-order component for easier usage
export const withOrganization = <P extends object>(
  Component: React.ComponentType<P & { organizationContext: OrganizationContextType }>
) => {
  return (props: P) => {
    const organizationContext = useOrganization()
    return <Component {...props} organizationContext={organizationContext} />
  }
}