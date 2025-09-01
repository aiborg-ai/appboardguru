'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganization } from '@/contexts/OrganizationContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/features/shared/components/views'
import { VaultShareModal } from '@/features/vaults/VaultShareModal'
import { VaultSettingsModal } from '@/features/vaults/VaultSettingsModal'
import { 
  Shield,
  Settings, 
  Users, 
  Calendar,
  Clock,
  MapPin,
  Edit,
  ArrowLeft,
  FileText,
  Crown,
  UserCheck,
  FolderOpen,
  Activity,
  TrendingUp,
  Plus,
  Share2,
  Lock,
  Unlock,
  Download,
  Upload,
  BarChart3,
  History
} from 'lucide-react'
import Link from 'next/link'

interface VaultAsset {
  id: string
  asset: {
    id: string
    title: string
    fileName: string
    fileSize: number
    fileType: string
    mimeType: string
    thumbnailUrl?: string
    createdAt: string
  }
  isFeatured: boolean
  isRequiredReading: boolean
  viewCount: number
  downloadCount: number
}

interface VaultMember {
  id: string
  role: string
  status: string
  joinedAt: string
  lastAccessedAt?: string
  accessCount: number
  user: {
    id: string
    email: string
  }
}

interface VaultActivity {
  id: string
  type: string
  description: string
  timestamp: string
  details?: any
  riskLevel?: string
  performedBy?: {
    id: string
    email: string
  }
}

interface VaultData {
  id: string
  name: string
  description?: string
  meetingDate?: string
  location?: string
  status: string
  priority: string
  createdAt: string
  updatedAt: string
  expiresAt?: string
  archivedAt?: string
  memberCount: number
  assetCount: number
  totalSizeBytes: number
  lastActivityAt?: string
  tags?: string[]
  category?: string
  organization?: {
    id: string
    name: string
    slug: string
    logo_url?: string
  }
  createdBy?: {
    id: string
    email: string
  }
  settings?: any
  isPublic: boolean
  requiresInvitation: boolean
  accessCode?: string
  userRole: string
  userJoinedAt: string
  userLastAccessed?: string
  members: VaultMember[]
  assets: VaultAsset[]
  recentActivity: VaultActivity[]
}

export default function VaultDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const vaultId = params.id as string
  
  const [vault, setVault] = useState<VaultData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null)
  
  const { currentOrganization } = useOrganization()

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/auth/signin')
        return
      }
      
      setCurrentUser({ id: user.id, email: user.email || '' })
    }

    getUser()
  }, [router])

  // Fetch vault details using API endpoint
  useEffect(() => {
    if (!vaultId || !currentUser) return

    const fetchVault = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/vaults/${vaultId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch vault')
        }

        setVault(data.vault)
      } catch (err) {
        console.error('Error fetching vault:', err)
        setError(err instanceof Error ? err.message : 'Failed to load vault')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVault()
  }, [vaultId, currentUser])

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            variant="loading"
            title="Loading Vault"
            description="Please wait while we fetch the vault details..."
          />
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (error || !vault) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            icon={Shield}
            title="Vault Not Found"
            description={error || `The vault could not be found or you don't have access to it.`}
            actions={[
              {
                id: 'back',
                label: 'Back to Vaults',
                icon: ArrowLeft,
                onClick: () => router.push('/dashboard/vaults'),
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
      case 'moderator': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Shield
      case 'moderator': return UserCheck
      default: return Users
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const RoleIcon = getRoleIcon(vault.userRole)

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/vaults"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Vaults</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Button 
              size="sm"
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Vault
            </Button>
          </div>
        </div>

        {/* Vault Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {vault.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {vault.description || 'No description available'}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getRoleColor(vault.userRole)}>
                      <RoleIcon className="w-3 h-3 mr-1" />
                      {vault.userRole}
                    </Badge>
                    <Badge className={getStatusColor(vault.status)}>
                      {vault.status}
                    </Badge>
                    <Badge className={getPriorityColor(vault.priority)}>
                      Priority: {vault.priority}
                    </Badge>
                    {vault.isPublic ? (
                      <Badge variant="outline" className="text-xs">
                        <Unlock className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                {vault.meetingDate && (
                  <>
                    <div className="text-sm text-gray-500">Meeting Date</div>
                    <div className="font-medium flex items-center justify-end gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(vault.meetingDate).toLocaleDateString()}
                    </div>
                  </>
                )}
                {vault.location && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-500">Location</div>
                    <div className="font-medium flex items-center justify-end gap-1">
                      <MapPin className="w-4 h-4" />
                      {vault.location}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Assets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-600" />
                Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {vault.assetCount || 0}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Total Size: {formatFileSize(vault.totalSizeBytes || 0)}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/dashboard/vaults/${vaultId}/assets`)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Assets
              </Button>
            </CardContent>
          </Card>

          {/* Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {vault.memberCount || vault.members?.length || 0}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Active members with access
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/dashboard/vaults/${vaultId}/members`)}
              >
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
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {vault.recentActivity?.length || 0}
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Actions in last 7 days
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => router.push(`/dashboard/vaults/${vaultId}/activity`)}
              >
                <History className="w-4 h-4 mr-2" />
                View Activity Log
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/vaults/${vaultId}/assets`)}
          >
            <CardContent className="p-6 text-center">
              <FolderOpen className="w-8 h-8 text-amber-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Assets</h3>
              <p className="text-sm text-gray-500">Manage documents</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/vaults/${vaultId}/members`)}
          >
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Members</h3>
              <p className="text-sm text-gray-500">Manage access</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/vaults/${vaultId}/activity`)}
          >
            <CardContent className="p-6 text-center">
              <Activity className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Activity Log</h3>
              <p className="text-sm text-gray-500">Track changes</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setShowSettings(true)}
          >
            <CardContent className="p-6 text-center">
              <Settings className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Settings</h3>
              <p className="text-sm text-gray-500">Configure vault</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {/* Handle share */}}
          >
            <CardContent className="p-6 text-center">
              <Share2 className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Share</h3>
              <p className="text-sm text-gray-500">Share vault</p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/dashboard/vaults/${vaultId}/analytics`)}
          >
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-500">View insights</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Assets */}
        {vault.assets && vault.assets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Recent Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vault.assets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900">{asset.asset.title || asset.asset.fileName}</div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(asset.asset.fileSize)} • {asset.asset.fileType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {asset.isFeatured && (
                        <Badge variant="outline" className="text-xs">Featured</Badge>
                      )}
                      {asset.isRequiredReading && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {vault.recentActivity && vault.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vault.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{activity.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {activity.performedBy?.email} • {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Message for New Vaults */}
        {vault.assetCount === 0 && (
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                    Welcome to your new vault!
                  </h3>
                  <p className="text-indigo-700 mb-4">
                    Your secure vault is ready. Get started by adding assets and inviting members to collaborate.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-indigo-700">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm">Upload your first assets</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-700">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm">Invite team members</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-700">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm">Configure access settings</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-700">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm">Set up notifications</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share Modal */}
      {vault && (
        <VaultShareModal
          vault={{
            id: vault.id,
            name: vault.name,
            description: vault.description,
            organization_id: vault.organization?.id,
            is_public: vault.isPublic
          }}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShareComplete={() => {
            setShowShareModal(false)
            // Optionally refresh vault data
            window.location.reload()
          }}
        />
      )}

      {/* Settings Modal */}
      {vault && (
        <VaultSettingsModal
          vault={{
            id: vault.id,
            name: vault.name,
            description: vault.description,
            meetingDate: vault.meetingDate,
            location: vault.location,
            status: vault.status,
            priority: vault.priority,
            category: vault.category,
            tags: vault.tags,
            isPublic: vault.isPublic,
            requiresInvitation: vault.requiresInvitation,
            accessCode: vault.accessCode,
            expiresAt: vault.expiresAt,
            settings: vault.settings,
            organization_id: vault.organization?.id,
            userRole: vault.userRole
          }}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onUpdate={(updatedVault) => {
            // Update local vault data
            setVault({ ...vault, ...updatedVault })
          }}
        />
      )}
    </DashboardLayout>
  )
}