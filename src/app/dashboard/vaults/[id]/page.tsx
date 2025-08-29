'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { 
  Package, 
  Users, 
  FolderOpen, 
  Activity,
  CheckSquare,
  MessageSquare,
  BarChart3,
  Settings,
  Upload,
  UserPlus,
  Share2,
  Download,
  Eye,
  Calendar,
  Clock,
  Shield,
  Star,
  AlertCircle,
  ArrowLeft,
  MoreVertical,
  Grid3x3,
  List,
  Search,
  Filter,
  ChevronRight,
  FileText,
  Image,
  Video,
  File,
  Loader2
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar'
import { Progress } from '@/features/shared/ui/progress'
import { Separator } from '@/features/shared/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase-client'

// Simple toast implementation
const toast = {
  error: (message: string) => console.error('Toast:', message),
  success: (message: string) => console.log('Toast:', message),
  info: (message: string) => console.info('Toast:', message)
}

// Component imports (to be created)
import VaultSpaceHeader from '@/components/vaults/VaultSpaceHeader'
import VaultAssetGrid from '@/components/vaults/VaultAssetGrid'
import VaultMembersList from '@/components/vaults/VaultMembersList'
import VaultActivityFeed from '@/components/vaults/VaultActivityFeed'
import VaultTaskBoard from '@/components/vaults/VaultTaskBoard'
import VaultAnalytics from '@/components/vaults/VaultAnalytics'

interface VaultData {
  id: string
  name: string
  description: string
  status: 'active' | 'draft' | 'archived' | 'expired'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  organization_id: string
  created_by: string
  is_public: boolean
  metadata: any
  organization?: {
    id: string
    name: string
    slug: string
  }
  vault_members?: Array<{
    id: string
    user_id: string
    role: string
    status: string
    joined_at: string
    user: {
      id: string
      email: string
      full_name?: string
      avatar_url?: string
    }
  }>
  assets?: Array<{
    id: string
    file_name: string
    file_type: string
    file_size: number
    created_at: string
    uploaded_by: string
  }>
  member_count?: number
  asset_count?: number
}

export default function VaultSpacePage() {
  const params = useParams()
  const router = useRouter()
  const vaultId = params?.id as string
  
  const [vault, setVault] = useState<VaultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Fetch vault data
  useEffect(() => {
    if (!vaultId) return
    
    const fetchVaultData = async () => {
      try {
        setLoading(true)
        const supabase = createClient()
        
        // Fetch vault with relations
        const { data: vaultData, error: vaultError } = await supabase
          .from('vaults')
          .select(`
            *,
            organization:organizations(id, name, slug),
            vault_members(
              id, user_id, role, status, joined_at,
              user:users(id, email, full_name, avatar_url)
            )
          `)
          .eq('id', vaultId)
          .single()
        
        if (vaultError) {
          console.error('Error fetching vault:', vaultError)
          toast.error('Failed to load vault')
          router.push('/dashboard/vaults')
          return
        }
        
        // Fetch asset count
        const { count: assetCount } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('vault_id', vaultId)
        
        setVault({
          ...vaultData,
          member_count: vaultData.vault_members?.length || 0,
          asset_count: assetCount || 0
        })
      } catch (error) {
        console.error('Error:', error)
        toast.error('An error occurred while loading the vault')
      } finally {
        setLoading(false)
      }
    }
    
    fetchVaultData()
  }, [vaultId, router])
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'archived': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'expired': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-gray-600">Loading vault...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (!vault) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold">Vault Not Found</h2>
            <p className="text-gray-600">The vault you're looking for doesn't exist or you don't have access.</p>
            <Button onClick={() => router.push('/dashboard/vaults')}>
              Back to Vaults
            </Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header Section */}
        <div className="bg-white border-b">
          <div className="p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <button
                onClick={() => router.push('/dashboard/vaults')}
                className="hover:text-blue-600 flex items-center gap-1"
              >
                <Package className="h-4 w-4" />
                Vaults
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900 font-medium">{vault.name}</span>
            </div>
            
            {/* Vault Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{vault.name}</h1>
                  <Badge className={cn("text-xs", getStatusColor(vault.status))}>
                    {vault.status}
                  </Badge>
                  {vault.priority !== 'medium' && (
                    <Badge variant="outline" className={cn("text-xs", getPriorityColor(vault.priority))}>
                      {vault.priority} priority
                    </Badge>
                  )}
                  {vault.is_public && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  )}
                </div>
                
                {vault.description && (
                  <p className="text-gray-600 mb-4 max-w-3xl">{vault.description}</p>
                )}
                
                {/* Quick Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      <strong>{vault.member_count}</strong> Members
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      <strong>{vault.asset_count}</strong> Assets
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-700">
                      Created {new Date(vault.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {vault.organization && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-700">{vault.organization.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    // TODO: Implement upload
                    toast.info('Upload feature coming soon')
                  }}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    // TODO: Implement invite
                    toast.info('Invite feature coming soon')
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => {
                    // TODO: Implement share
                    toast.info('Share feature coming soon')
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/vaults/${vaultId}/settings`)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="h-4 w-4 mr-2" />
                      Export Vault
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                      Archive Vault
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full max-w-3xl grid-cols-6 h-12 bg-transparent border-b-0">
                <TabsTrigger 
                  value="overview" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="assets"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Assets
                </TabsTrigger>
                <TabsTrigger 
                  value="members"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Members
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="activity"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Featured Assets */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          Featured Assets
                        </span>
                        <Button variant="ghost" size="sm">View All</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Placeholder for featured assets */}
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-start gap-3">
                            <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">Annual Strategy Review.pdf</p>
                              <p className="text-sm text-gray-500">2.4 MB • Updated 2 days ago</p>
                            </div>
                          </div>
                        </div>
                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                          <div className="flex items-start gap-3">
                            <FileText className="h-8 w-8 text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">Q4 Financial Report.xlsx</p>
                              <p className="text-sm text-gray-500">1.8 MB • Updated 5 days ago</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Placeholder activities */}
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>JD</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">John Doe</span> uploaded 
                              <span className="font-medium"> Annual Strategy Review.pdf</span>
                            </p>
                            <p className="text-xs text-gray-500">2 hours ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>AS</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">Alice Smith</span> commented on 
                              <span className="font-medium"> Q4 Financial Report</span>
                            </p>
                            <p className="text-xs text-gray-500">5 hours ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>BJ</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm">
                              <span className="font-medium">Bob Johnson</span> joined the vault
                            </p>
                            <p className="text-xs text-gray-500">1 day ago</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Upcoming Tasks */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckSquare className="h-5 w-5 text-green-600" />
                          Upcoming Tasks
                        </span>
                        <Button variant="ghost" size="sm">View All</Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Review Q4 Financial Report</p>
                            <p className="text-sm text-gray-500">Due tomorrow • Assigned to John Doe</p>
                          </div>
                          <Badge variant="outline" className="text-xs">High</Badge>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Prepare board meeting agenda</p>
                            <p className="text-sm text-gray-500">Due in 3 days • Assigned to Alice Smith</p>
                          </div>
                          <Badge variant="outline" className="text-xs">Medium</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Vault Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Vault Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Owner</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback>TD</AvatarFallback>
                          </Avatar>
                          <p className="text-sm font-medium">Test Director</p>
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500">Organization</p>
                        <p className="text-sm font-medium">{vault.organization?.name || 'N/A'}</p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="text-sm font-medium">
                          {new Date(vault.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="text-sm font-medium">
                          {new Date(vault.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Active Members */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        Active Members
                        <Badge variant="secondary" className="text-xs">{vault.member_count}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {vault.vault_members?.slice(0, 5).map((member) => (
                          <div key={member.id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {member.user.avatar_url ? (
                                <AvatarImage src={member.user.avatar_url} />
                              ) : (
                                <AvatarFallback>
                                  {member.user.full_name?.[0] || member.user.email[0].toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {member.user.full_name || member.user.email}
                              </p>
                              <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                            </div>
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                          </div>
                        ))}
                      </div>
                      {vault.member_count! > 5 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={() => setActiveTab('members')}
                        >
                          View all {vault.member_count} members
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Quick Upload */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Quick Upload</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          Drop files here or click to browse
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum file size: 50MB
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            {/* Assets Tab */}
            <TabsContent value="assets" className="mt-0">
              <VaultAssetGrid vaultId={vaultId} viewMode={viewMode} />
            </TabsContent>
            
            {/* Members Tab */}
            <TabsContent value="members" className="mt-0">
              <VaultMembersList vaultId={vaultId} members={vault.vault_members || []} />
            </TabsContent>
            
            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-0">
              <VaultTaskBoard vaultId={vaultId} />
            </TabsContent>
            
            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-0">
              <VaultActivityFeed vaultId={vaultId} />
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-0">
              <VaultAnalytics vaultId={vaultId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}