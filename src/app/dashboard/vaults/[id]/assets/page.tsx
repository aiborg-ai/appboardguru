'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { createSupabaseBrowserClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { DocumentUploader } from '@/components/documents/DocumentUploader'
import { 
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Star,
  StarOff,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Shield,
  Lock,
  Clock,
  CheckCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface VaultAsset {
  id: string
  vault_id: string
  asset_id: string
  added_by: string
  added_at: string
  is_featured: boolean
  is_required_reading: boolean
  view_count: number
  download_count: number
  asset: {
    id: string
    title: string
    file_name: string
    file_size: number
    file_type: string
    mime_type: string
    file_url?: string
    thumbnail_url?: string
    created_at: string
    description?: string
    tags?: string[]
  }
}

interface VaultInfo {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  is_public: boolean
}

export default function VaultAssetsPage() {
  const router = useRouter()
  const params = useParams()
  const vaultId = params.id as string
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [assets, setAssets] = useState<VaultAsset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (vaultId) {
      fetchVaultData()
      fetchVaultAssets()
    }
  }, [vaultId])

  const fetchVaultData = async () => {
    try {
      const { data, error } = await supabase
        .from('vaults')
        .select('id, name, description, status, priority, is_public')
        .eq('id', vaultId)
        .single()

      if (error) throw error
      setVault(data)
    } catch (error) {
      console.error('Error fetching vault:', error)
      toast({
        title: 'Error',
        description: 'Failed to load vault information',
        variant: 'destructive'
      })
    }
  }

  const fetchVaultAssets = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('vault_assets')
        .select(`
          *,
          asset:assets (
            id,
            title,
            file_name,
            file_size,
            file_type,
            mime_type,
            file_url,
            thumbnail_url,
            created_at,
            description,
            tags
          )
        `)
        .eq('vault_id', vaultId)
        .order('added_at', { ascending: false })

      if (error) throw error
      setAssets(data || [])
    } catch (error) {
      console.error('Error fetching vault assets:', error)
      toast({
        title: 'Error',
        description: 'Failed to load vault assets',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUploadComplete = async (uploadedAsset: any) => {
    try {
      // Link the uploaded asset to the vault
      const { error } = await supabase
        .from('vault_assets')
        .insert({
          vault_id: vaultId,
          asset_id: uploadedAsset.id,
          added_by: (await supabase.auth.getUser()).data.user?.id,
          is_featured: false,
          is_required_reading: false,
          view_count: 0,
          download_count: 0
        })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Asset uploaded and added to vault successfully',
      })

      // Refresh the assets list
      fetchVaultAssets()
      setActiveTab('library')
    } catch (error) {
      console.error('Error adding asset to vault:', error)
      toast({
        title: 'Error',
        description: 'Failed to add asset to vault',
        variant: 'destructive'
      })
    }
  }

  const toggleFeatured = async (assetId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('vault_assets')
        .update({ is_featured: !currentStatus })
        .eq('vault_id', vaultId)
        .eq('asset_id', assetId)

      if (error) throw error
      
      toast({
        title: currentStatus ? 'Removed from featured' : 'Added to featured',
        description: 'Asset status updated successfully',
      })
      
      fetchVaultAssets()
    } catch (error) {
      console.error('Error updating asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to update asset',
        variant: 'destructive'
      })
    }
  }

  const toggleRequiredReading = async (assetId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('vault_assets')
        .update({ is_required_reading: !currentStatus })
        .eq('vault_id', vaultId)
        .eq('asset_id', assetId)

      if (error) throw error
      
      toast({
        title: currentStatus ? 'Removed from required reading' : 'Set as required reading',
        description: 'Asset status updated successfully',
      })
      
      fetchVaultAssets()
    } catch (error) {
      console.error('Error updating asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to update asset',
        variant: 'destructive'
      })
    }
  }

  const removeAsset = async (assetId: string) => {
    try {
      const { error } = await supabase
        .from('vault_assets')
        .delete()
        .eq('vault_id', vaultId)
        .eq('asset_id', assetId)

      if (error) throw error
      
      toast({
        title: 'Asset removed',
        description: 'Asset has been removed from the vault',
      })
      
      fetchVaultAssets()
    } catch (error) {
      console.error('Error removing asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove asset',
        variant: 'destructive'
      })
    }
  }

  const downloadAsset = async (asset: VaultAsset) => {
    try {
      // Update download count
      await supabase
        .from('vault_assets')
        .update({ download_count: asset.download_count + 1 })
        .eq('vault_id', vaultId)
        .eq('asset_id', asset.asset_id)

      // Download the file
      if (asset.asset.file_url) {
        window.open(asset.asset.file_url, '_blank')
      }
    } catch (error) {
      console.error('Error downloading asset:', error)
      toast({
        title: 'Error',
        description: 'Failed to download asset',
        variant: 'destructive'
      })
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const filteredAssets = assets.filter(asset =>
    asset.asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.asset.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/vaults/${vaultId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Vault
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-indigo-600" />
                {vault?.name || 'Loading...'} - Assets
              </h1>
              <p className="text-gray-500 mt-1">
                Manage documents and files in this vault
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-2xl font-bold">{assets.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Featured</p>
                  <p className="text-2xl font-bold">
                    {assets.filter(a => a.is_featured).length}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Required Reading</p>
                  <p className="text-2xl font-bold">
                    {assets.filter(a => a.is_required_reading).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Size</p>
                  <p className="text-2xl font-bold">
                    {formatFileSize(assets.reduce((sum, a) => sum + (a.asset.file_size || 0), 0))}
                  </p>
                </div>
                <Download className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <div className="flex justify-between items-center mb-6">
                <TabsList>
                  <TabsTrigger value="library">Asset Library</TabsTrigger>
                  <TabsTrigger value="upload">Upload New</TabsTrigger>
                </TabsList>
                
                {activeTab === 'library' && (
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="w-4 h-4" />
                    </Button>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <TabsContent value="library">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Loading assets...</p>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery ? 'Try adjusting your search' : 'Upload your first asset to get started'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setActiveTab('upload')}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Asset
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 
                    'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 
                    'space-y-2'
                  }>
                    {filteredAssets.map((vaultAsset) => (
                      <Card key={vaultAsset.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start gap-3">
                                <FileText className="w-10 h-10 text-blue-500 mt-1" />
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 line-clamp-1">
                                    {vaultAsset.asset.title}
                                  </h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {vaultAsset.asset.file_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-gray-400">
                                      {formatFileSize(vaultAsset.asset.file_size)}
                                    </span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-400">
                                      {new Date(vaultAsset.added_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    {vaultAsset.is_featured && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Star className="w-3 h-3 mr-1" />
                                        Featured
                                      </Badge>
                                    )}
                                    {vaultAsset.is_required_reading && (
                                      <Badge variant="secondary" className="text-xs">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => downloadAsset(vaultAsset)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => toggleFeatured(vaultAsset.asset_id, vaultAsset.is_featured)}
                                >
                                  {vaultAsset.is_featured ? (
                                    <>
                                      <StarOff className="w-4 h-4 mr-2" />
                                      Remove from Featured
                                    </>
                                  ) : (
                                    <>
                                      <Star className="w-4 h-4 mr-2" />
                                      Mark as Featured
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => toggleRequiredReading(vaultAsset.asset_id, vaultAsset.is_required_reading)}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  {vaultAsset.is_required_reading ? 'Remove from' : 'Set as'} Required Reading
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => removeAsset(vaultAsset.asset_id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove from Vault
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload">
                <DocumentUploader 
                  onUploadComplete={handleUploadComplete}
                  currentOrganization={null}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}