'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { OrganizationSettings } from '@/features/organizations/OrganizationSettings'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/features/shared/components/views'
import { ArrowLeft, Building2, Settings, Shield, Loader2 } from 'lucide-react'
import { useOrganization } from '@/contexts/OrganizationContext'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string | null
  industry?: string | null
  organization_size?: string | null
  website?: string | null
  logo_url?: string | null
  settings?: any
  compliance_settings?: any
  billing_settings?: any
  created_at?: string
  userRole?: string
  memberCount?: number
}

export default function OrganizationSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string>('viewer')
  
  const { currentOrganization, selectOrganization, organizations, isLoading: isLoadingOrganizations } = useOrganization()

  useEffect(() => {
    fetchOrganization()
  }, [slug])

  const fetchOrganization = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createSupabaseBrowserClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('You must be logged in to view organization settings')
        return
      }

      // Fetch organization by slug with user's role
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members!inner(
            role,
            user_id
          )
        `)
        .eq('slug', slug)
        .eq('organization_members.user_id', user.id)
        .single()

      if (orgError || !orgData) {
        console.error('Error fetching organization:', orgError)
        setError('Organization not found or you do not have access')
        return
      }

      // Get member count
      const { count: memberCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgData.id)

      const orgWithDetails: Organization = {
        ...orgData,
        userRole: orgData.organization_members[0]?.role || 'viewer',
        memberCount: memberCount || 0
      }

      setOrganization(orgWithDetails)
      setUserRole(orgWithDetails.userRole || 'viewer')
      
      // Update organization context if needed
      if (currentOrganization?.id !== orgData.id) {
        selectOrganization(orgData.id)
      }
    } catch (err) {
      console.error('Error in fetchOrganization:', err)
      setError('Failed to load organization settings')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (isLoading || isLoadingOrganizations) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading organization settings...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error || !organization) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            icon={Building2}
            title="Unable to Load Settings"
            description={error || 'The organization settings could not be loaded.'}
            actions={[
              {
                id: 'back',
                label: 'Back to Organization',
                icon: ArrowLeft,
                onClick: () => router.push(`/dashboard/organizations/${slug}`),
                primary: true
              }
            ]}
          />
        </div>
      </DashboardLayout>
    )
  }

  // Check permissions
  const canViewSettings = userRole === 'owner' || userRole === 'admin' || userRole === 'member'
  const canEditSettings = userRole === 'owner' || userRole === 'admin'

  if (!canViewSettings) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            icon={Shield}
            title="Access Denied"
            description="You do not have permission to view organization settings."
            actions={[
              {
                id: 'back',
                label: 'Back to Organization',
                icon: ArrowLeft,
                onClick: () => router.push(`/dashboard/organizations/${slug}`),
                primary: true
              }
            ]}
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href={`/dashboard/organizations/${slug}`}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {organization.name}</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Settings className="h-8 w-8 text-gray-600" />
                Organization Settings
              </h1>
              <p className="text-gray-600 mt-2">
                Manage settings and preferences for {organization.name}
              </p>
            </div>
            
            {!canEditSettings && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                <p className="text-sm text-yellow-800">
                  View-only access. Contact an admin to make changes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Settings Component */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <OrganizationSettings
              organizationId={organization.id}
              userRole={userRole as 'owner' | 'admin' | 'member' | 'viewer'}
              onClose={() => router.push(`/dashboard/organizations/${slug}`)}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}