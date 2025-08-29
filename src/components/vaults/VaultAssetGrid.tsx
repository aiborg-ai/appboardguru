'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Image, 
  Video, 
  File,
  Download,
  Eye,
  MoreVertical,
  Grid3x3,
  List,
  Search,
  Filter,
  Upload,
  Folder,
  Clock,
  User,
  ChevronRight,
  Star,
  Share2,
  Trash2,
  Edit3,
  Copy,
  Move,
  Lock,
  Loader2
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'
import { cn } from '@/lib/utils'
import { VaultRepository, createClientRepositoryFactory } from '@/lib/repositories'
import { VaultId, UserId, createVaultId, createUserId } from '@/lib/repositories/types'
import { useAuthStore } from '@/lib/stores/auth-store'

// Simple toast implementation
const toast = {
  error: (message: string) => console.error('Toast:', message),
  success: (message: string) => console.log('Toast:', message),
  info: (message: string) => console.info('Toast:', message)
}

interface Asset {
  id: string
  file_name: string
  original_file_name?: string
  file_type: string
  file_size: number
  file_path?: string
  description?: string
  tags?: string[]
  uploaded_by: string
  created_at: string
  updated_at: string
  view_count?: number
  download_count?: number
  is_featured?: boolean
  uploader?: {
    full_name?: string
    email: string
  }
}

interface VaultAssetGridProps {
  vaultId: string
  viewMode: 'grid' | 'list'
}

export default function VaultAssetGrid({ vaultId, viewMode: initialViewMode }: VaultAssetGridProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterType, setFilterType] = useState('all')
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  
  // Get current user from auth store
  const { user } = useAuthStore()
  
  // Fetch assets
  useEffect(() => {
    const fetchAssets = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Create repository factory and get vault repository
        const repositoryFactory = createClientRepositoryFactory()
        const vaultRepository = repositoryFactory.vaults
        
        // Convert string IDs to branded types
        const vaultIdBranded = createVaultId(vaultId)
        const userIdBranded = createUserId(user.id)
        
        // Get vault assets using repository pattern
        const result = await vaultRepository.getVaultAssets(vaultIdBranded, userIdBranded)
        
        if (!result.success) {
          console.error('Error fetching assets:', result.error)
          toast.error('Failed to load assets: ' + result.error.message)
          return
        }
        
        setAssets(result.data)
      } catch (error) {
        console.error('Error:', error)
        toast.error('An error occurred while loading assets')
      } finally {
        setLoading(false)
      }
    }
    
    fetchAssets()
  }, [vaultId, user?.id])
  
  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return Image
    if (fileType.includes('video')) return Video
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText
    return File
  }
  
  // Get file icon color
  const getFileIconColor = (fileType: string) => {
    if (fileType.includes('image')) return 'text-purple-600'
    if (fileType.includes('video')) return 'text-red-600'
    if (fileType.includes('pdf')) return 'text-red-600'
    if (fileType.includes('sheet') || fileType.includes('excel')) return 'text-green-600'
    if (fileType.includes('document') || fileType.includes('word')) return 'text-blue-600'
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'text-orange-600'
    return 'text-gray-600'
  }
  
  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      if (diffInHours < 1) return 'Just now'
      return `${Math.floor(diffInHours)} hours ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }
  
  // Filter and sort assets
  const filteredAssets = assets
    .filter(asset => {
      if (searchQuery && !asset.file_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (filterType !== 'all') {
        if (filterType === 'documents' && !asset.file_type.includes('pdf') && !asset.file_type.includes('document')) return false
        if (filterType === 'images' && !asset.file_type.includes('image')) return false
        if (filterType === 'videos' && !asset.file_type.includes('video')) return false
        if (filterType === 'spreadsheets' && !asset.file_type.includes('sheet') && !asset.file_type.includes('excel')) return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.file_name.localeCompare(b.file_name)
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'size':
          return b.file_size - a.file_size
        case 'type':
          return a.file_type.localeCompare(b.file_type)
        default:
          return 0
      }
    })
  
  // Handle asset actions
  const handleDownload = async (asset: Asset) => {
    toast.info(`Downloading ${asset.file_name}...`)
    // TODO: Implement actual download
  }
  
  const handlePreview = (asset: Asset) => {
    toast.info(`Opening preview for ${asset.file_name}`)
    // TODO: Implement preview modal
  }
  
  const handleShare = (asset: Asset) => {
    toast.info(`Sharing ${asset.file_name}`)
    // TODO: Implement share functionality
  }
  
  const handleDelete = async (asset: Asset) => {
    if (confirm(`Are you sure you want to delete ${asset.file_name}?`)) {
      toast.info(`Deleting ${asset.file_name}`)
      // TODO: Implement delete functionality
    }
  }
  
  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    )
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600">Loading assets...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Files</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="videos">Videos</SelectItem>
              <SelectItem value="spreadsheets">Spreadsheets</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          {selectedAssets.length > 0 && (
            <>
              <Badge variant="secondary" className="mr-2">
                {selectedAssets.length} selected
              </Badge>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button size="sm" variant="outline" className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
            </>
          )}
          
          <div className="flex items-center border rounded-lg">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Button size="sm" className="ml-2">
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      </div>
      
      {/* Assets Display */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Upload your first file to get started'}
          </p>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => {
            const FileIcon = getFileIcon(asset.file_type)
            const isSelected = selectedAssets.includes(asset.id)
            
            return (
              <Card 
                key={asset.id} 
                className={cn(
                  "group hover:shadow-lg transition-all cursor-pointer",
                  isSelected && "ring-2 ring-blue-500"
                )}
                onClick={() => handlePreview(asset)}
              >
                <CardContent className="p-4">
                  {/* Selection Checkbox */}
                  <div className="flex items-start justify-between mb-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleAssetSelection(asset.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(asset)
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(asset)
                        }}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleShare(asset)
                        }}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit3 className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Move className="h-4 w-4 mr-2" />
                          Move
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(asset)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* File Icon */}
                  <div className="flex justify-center mb-3">
                    <FileIcon className={cn("h-12 w-12", getFileIconColor(asset.file_type))} />
                  </div>
                  
                  {/* File Name */}
                  <p className="font-medium text-sm text-gray-900 truncate mb-1" title={asset.file_name}>
                    {asset.file_name}
                  </p>
                  
                  {/* File Info */}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>{formatFileSize(asset.file_size)}</p>
                    <p>{formatDate(asset.created_at)}</p>
                  </div>
                  
                  {/* Featured Badge */}
                  {asset.is_featured && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAssets(filteredAssets.map(a => a.id))
                      } else {
                        setSelectedAssets([])
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Name</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Size</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Modified</th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">Uploaded By</th>
                <th className="text-right p-3 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset) => {
                const FileIcon = getFileIcon(asset.file_type)
                const isSelected = selectedAssets.includes(asset.id)
                
                return (
                  <tr 
                    key={asset.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handlePreview(asset)}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleAssetSelection(asset.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <FileIcon className={cn("h-5 w-5 flex-shrink-0", getFileIconColor(asset.file_type))} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{asset.file_name}</p>
                          {asset.description && (
                            <p className="text-xs text-gray-500 truncate">{asset.description}</p>
                          )}
                        </div>
                        {asset.is_featured && (
                          <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{formatFileSize(asset.file_size)}</td>
                    <td className="p-3 text-sm text-gray-600">{asset.file_type.split('/')[1] || 'Unknown'}</td>
                    <td className="p-3 text-sm text-gray-600">{formatDate(asset.updated_at || asset.created_at)}</td>
                    <td className="p-3 text-sm text-gray-600">
                      {asset.uploader?.full_name || asset.uploader?.email || 'Unknown'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(asset)
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShare(asset)
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              handlePreview(asset)
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Move className="h-4 w-4 mr-2" />
                              Move
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(asset)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}