'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { OrganizationSettings } from '@/features/organizations/OrganizationSettings'
import { useOrganization } from '@/contexts/OrganizationContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { EmptyState } from '@/features/shared/components/views'
import { 
  Building2, 
  Settings, 
  Users, 
  Calendar,
  Globe,
  Mail,
  Phone,
  MapPin,
  Edit,
  ArrowLeft,
  BarChart3,
  FileText,
  Crown,
  Shield,
  Activity,
  TrendingUp,
  Plus
} from 'lucide-react'
import Link from 'next/link'
import type { Organization } from '@/types'

interface OrganizationDetailPageProps {}

export default function OrganizationDetailPage({}: OrganizationDetailPageProps) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  
  const { 
    organizations, 
    currentOrganization,
    selectOrganization,
    isLoadingOrganizations 
  } = useOrganization()

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/signin')
        return
      }
      
      setCurrentUser({ id: user.id })
    }

    getUser()
  }, [router])

  // Find organization by slug
  useEffect(() => {
    if (!slug || isLoadingOrganizations) return

    setIsLoading(true)
    setError(null)

    // First try to find in loaded organizations
    const foundOrg = organizations.find(org => org.slug === slug)
    
    if (foundOrg) {
      setOrganization(foundOrg)
      // Set as current organization if not already
      if (!currentOrganization || currentOrganization.id !== foundOrg.id) {
        selectOrganization(foundOrg)
      }
      setIsLoading(false)
    } else if (organizations.length > 0) {
      // Organizations loaded but slug not found
      setError(`Organization with slug "${slug}" not found`)
      setIsLoading(false)
    }
    // If organizations not loaded yet, wait for them
  }, [slug, organizations, isLoadingOrganizations, currentOrganization, selectOrganization])

  // Loading state
  if (isLoading || isLoadingOrganizations) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            variant="loading"
            title="Loading Organization"
            description="Please wait while we fetch the organization details..."
          />
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
            title="Organization Not Found"
            description={error || `The organization "${slug}" could not be found or you don't have access to it.`}
            actions={[
              {
                id: 'back',
                label: 'Back to Organizations',
                icon: ArrowLeft,
                onClick: () => router.push('/dashboard/organizations'),
                primary: true
              }
            ]}
          />
        </div>
      </DashboardLayout>
    )
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Shield
      default: return Users
    }
  }

  const userRole = (organization as any).userRole || 'member'
  const memberCount = (organization as any).memberCount || 0
  const RoleIcon = getRoleIcon(userRole)

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/organizations"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Organizations</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Organization Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {organization.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {organization.description || 'No description available'}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getRoleColor(userRole)}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {userRole}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {organization.slug}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium">
                  {new Date((organization as any).created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Organization Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Organization Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization.industry && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Industry</div>
                  <div className="text-gray-900">{organization.industry}</div>
                </div>
              )}
              
              {(organization as any).organization_size && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Size</div>
                  <div className="text-gray-900 capitalize">{(organization as any).organization_size}</div>
                </div>
              )}
              
              {organization.website && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Website</div>
                  <a 
                    href={organization.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" />
                    {organization.website}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {memberCount}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Active members in organization
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Invite Members
              </Button>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Organization created</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600">Settings configured</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <span className="text-gray-400">Waiting for board packs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <FileText className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Board Packs</h3>
              <p className="text-sm text-gray-500">Upload and manage board documents</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-500">View organization insights</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Members</h3>
              <p className="text-sm text-gray-500">Manage team access</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Settings className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
              <p className="text-sm text-gray-500">Configure organization</p>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message for New Organizations */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Welcome to {organization.name}!
                </h3>
                <p className="text-blue-700 mb-4">
                  Your organization is ready to go. Here are some recommended next steps to get the most out of BoardGuru:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Set up your organization profile</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Invite team members</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Upload your first board pack</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">Configure governance settings</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Settings Modal */}
        {showSettings && (
          <OrganizationSettings
            organizationId={organization.id}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}