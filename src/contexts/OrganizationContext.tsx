'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { useUserOrganizations } from '@/hooks/useOrganizations'
import { demoOrganizations } from '@/lib/demo/demo-data-provider'
import { useDemoMode } from '@/contexts/DemoContext'

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
  
  // During build/SSR, return a dummy context to prevent errors
  // This should be before the error throw to maintain consistent hook behavior
  if (typeof window === 'undefined') {
    return {
      currentOrganization: null,
      currentVault: null,
      organizations: [],
      vaults: [],
      pendingInvitations: [],
      isLoadingOrganizations: false,
      isLoadingVaults: false,
      isLoadingInvitations: false,
      selectOrganization: () => {},
      selectVault: () => {},
      refreshOrganizations: () => {},
      refreshVaults: () => {},
      refreshInvitations: () => {},
      acceptInvitation: async () => false,
      rejectInvitation: async () => false,
      filterByOrganization: (items: any[]) => items,
      isCurrentOrganization: () => false,
      totalVaults: 0,
      totalPendingInvitations: 0
    } as OrganizationContextType
  }
  
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  
  return context
}

// Provider component
export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  // Get demo mode status from DemoContext
  const isDemoMode = useDemoMode()
  
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
  const [isTestDirector, setIsTestDirector] = useState(false)
  
  // Test director ALWAYS uses real organizations, never demo data
  // This ensures consistent behavior and proper database access
  const shouldUseDemoData = isDemoMode && !isTestDirector
  
  // Always call the hook to maintain consistent hook order
  // Pass empty string when in demo mode to skip API calls
  const { 
    data: realOrganizations = [], 
    isLoading: isLoadingRealOrganizations,
    refetch: refetchOrganizations
  } = useUserOrganizations(shouldUseDemoData ? '' : userId)
  
  // Use demo organizations ONLY in demo mode AND not test director
  // Test director ALWAYS uses real organizations from database
  const organizations = shouldUseDemoData
    ? demoOrganizations.map(org => ({
        ...org,
        userRole: 'owner' as const,
        membershipStatus: 'active' as const,
        memberCount: Math.floor(Math.random() * 20) + 5, // Random member count between 5-25
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last year
        status: 'active' as const
      }))
    : realOrganizations
    
  const isLoadingOrganizations = shouldUseDemoData ? false : isLoadingRealOrganizations

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      // Always check for real user first to detect test director
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserId(user.id)
        // Check if this is the test director account
        if (user.email === 'test.director@appboardguru.com') {
          setIsTestDirector(true)
          // Test director always uses real data, never demo
          return
        }
      }
      
      // Only use demo user if in demo mode AND not test director
      if (isDemoMode && !user) {
        setUserId('demo-user-001')
        return
      }
    }
    getUser()
  }, [isDemoMode])

  // Load user's default organization from localStorage or set first available
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      let defaultOrg: Organization | null = null
      
      // For test director, prefer Fortune 500 Companies organization
      if (isTestDirector) {
        const fortune500 = organizations.find(org => 
          org.name === 'Fortune 500 Companies' || 
          org.slug === 'fortune-500-companies'
        )
        if (fortune500) {
          console.log('Setting Fortune 500 Companies as default for test director')
          defaultOrg = fortune500
        }
      }
      
      // If no special org found, try to load saved organization
      if (!defaultOrg) {
        const savedOrgId = localStorage.getItem('boardguru_current_organization')
        const savedOrg = savedOrgId ? organizations.find(org => org.id === savedOrgId) : null
        defaultOrg = savedOrg || organizations[0]
      }
      
      if (defaultOrg) {
        setCurrentOrganization(defaultOrg)
        // Save to localStorage for persistence
        localStorage.setItem('boardguru_current_organization', defaultOrg.id)
      }
    }
  }, [organizations, currentOrganization, isTestDirector])

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
    
    // In demo mode ONLY (not for test director), provide demo vaults
    // Test director should use real vaults from database
    if (isDemoMode && !isTestDirector) {
      // Create demo vaults for the current organization
      const demoVaults: Vault[] = [
        {
          id: 'vault-001',
          name: 'Board Documents Q4 2024',
          description: 'Financial reports, meeting minutes, and strategic plans',
          meetingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          priority: 'high',
          memberCount: 8,
          assetCount: 45,
          userRole: 'owner',
          lastActivityAt: new Date().toISOString()
        },
        {
          id: 'vault-002',
          name: 'Annual Strategy Review',
          description: 'Strategic planning documents for 2025',
          meetingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          priority: 'urgent',
          memberCount: 12,
          assetCount: 23,
          userRole: 'admin',
          lastActivityAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'vault-003',
          name: 'Compliance & Risk Assessment',
          description: 'Regulatory compliance and risk management documents',
          status: 'active',
          priority: 'medium',
          memberCount: 6,
          assetCount: 67,
          userRole: 'contributor',
          lastActivityAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'vault-004',
          name: 'Financial Reports',
          description: 'Quarterly and annual financial reports including the Adidas Annual Report 2024',
          meetingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          priority: 'high',
          memberCount: 10,
          assetCount: 1,
          userRole: 'owner',
          lastActivityAt: new Date().toISOString()
        }
      ]
      
      setTimeout(() => {
        setVaults(demoVaults)
        setIsLoadingVaults(false)
      }, 500) // Simulate loading delay
      
      return
    }
    
    // Normal vault fetching for non-demo mode
    try {
      // Use the new list endpoint that actually queries the database
      const response = await fetch(`/api/vaults/list?organizationId=${currentOrganization.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
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
  }, [currentOrganization, userId, currentVault, isDemoMode, isTestDirector])

  // Load vaults when organization changes
  useEffect(() => {
    refreshVaults()
  }, [refreshVaults])

  // Load pending invitations
  const refreshInvitations = useCallback(async () => {
    if (!userId) return
    
    // Skip invitations in demo mode or for test director
    if (isDemoMode || isTestDirector) {
      setPendingInvitations([])
      setIsLoadingInvitations(false)
      return
    }

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
  }, [userId, isDemoMode, isTestDirector])

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