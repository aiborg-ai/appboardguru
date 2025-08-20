'use client'

import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { FileUploadDropzone } from '@/components/assets/FileUploadDropzone'
import { AssetGrid } from '@/components/assets/AssetGrid'
import { AssetList } from '@/components/assets/AssetList'
import { AssetShareModal } from '@/components/assets/AssetShareModal'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Loader2, Building2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Folder,
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Eye,
  Plus,
  Share2,
  Download,
  MoreHorizontal,
  SortAsc,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type ViewMode = 'grid' | 'list' | 'details'
type SortOption = 'name' | 'date' | 'size' | 'type'

interface Asset {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  folder: string
  tags: string[]
  thumbnail?: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
  }
  sharedWith: Array<{
    userId: string
    userName: string
    permission: 'view' | 'download' | 'edit' | 'admin'
  }>
  downloadCount: number
  viewCount: number
  isShared: boolean
}

// Mock data for demonstration
const mockAssets: Asset[] = [
  {
    id: '1',
    title: 'Q4 Financial Report 2024',
    fileName: 'q4-financial-report-2024.pdf',
    fileType: 'pdf',
    fileSize: 2048576,
    category: 'financial',
    folder: '/financial-reports',
    tags: ['quarterly', 'financial', 'revenue'],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    owner: { id: '1', name: 'John Smith', email: 'john@boardguru.ai' },
    sharedWith: [
      { userId: '2', userName: 'Jane Doe', permission: 'view' }
    ],
    downloadCount: 12,
    viewCount: 34,
    isShared: true
  },
  {
    id: '2',
    title: 'Board Meeting Presentation',
    fileName: 'board-meeting-jan-2024.pptx',
    fileType: 'pptx',
    fileSize: 5242880,
    category: 'presentations',
    folder: '/board-meetings',
    tags: ['presentation', 'board', 'strategy'],
    createdAt: '2024-01-10T14:15:00Z',
    updatedAt: '2024-01-10T14:15:00Z',
    owner: { id: '1', name: 'John Smith', email: 'john@boardguru.ai' },
    sharedWith: [],
    downloadCount: 5,
    viewCount: 18,
    isShared: false
  }
]

export default function AssetsPage() {
  const { currentOrganization, isLoadingOrganizations } = useOrganization()
  const [assets, setAssets] = useState<Asset[]>([])
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showUpload, setShowUpload] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedFolder, setSelectedFolder] = useState('all')
  const [sortBy, setSortBy] = useState<SortOption>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoadingAssets, setIsLoadingAssets] = useState(true)
  const [assetsError, setAssetsError] = useState<string | null>(null)

  // Fetch assets for current organization
  useEffect(() => {
    if (!currentOrganization) {
      setAssets([])
      setIsLoadingAssets(false)
      return
    }

    const fetchAssets = async () => {
      setIsLoadingAssets(true)
      setAssetsError(null)
      
      try {
        const response = await fetch('/api/assets', {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Transform API response to match component Asset interface
            const transformedAssets = data.assets.map((asset: any) => ({
              id: asset.id,
              title: asset.title,
              fileName: asset.fileName || asset.file_name,
              fileType: asset.fileType || asset.file_type,
              fileSize: asset.fileSize || asset.file_size,
              category: asset.category || 'uncategorized',
              folder: '/uploads', // Default folder
              tags: asset.tags || [],
              thumbnail: asset.thumbnailUrl || asset.thumbnail_url,
              createdAt: asset.createdAt || asset.created_at,
              updatedAt: asset.updatedAt || asset.updated_at,
              owner: {
                id: asset.owner?.id || asset.owner_id,
                name: asset.owner?.email?.split('@')[0] || 'Unknown',
                email: asset.owner?.email || 'unknown@email.com'
              },
              sharedWith: [],
              downloadCount: asset.downloadCount || 0,
              viewCount: asset.viewCount || 0,
              isShared: false
            }))
            setAssets(transformedAssets)
          } else {
            setAssetsError(data.error || 'Failed to load assets')
          }
        } else {
          setAssetsError('Failed to load assets')
        }
      } catch (error) {
        console.error('Error fetching assets:', error)
        setAssetsError('Error loading assets')
      } finally {
        setIsLoadingAssets(false)
      }
    }

    fetchAssets()
  }, [currentOrganization])

  // Filter and search logic
  useEffect(() => {
    let filtered = assets

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(asset =>
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory)
    }

    // Folder filter
    if (selectedFolder && selectedFolder !== 'all') {
      filtered = filtered.filter(asset => asset.folder === selectedFolder)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'date':
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case 'size':
          aValue = a.fileSize
          bValue = b.fileSize
          break
        case 'type':
          aValue = a.fileType
          bValue = b.fileType
          break
        default:
          return 0
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    setFilteredAssets(filtered)
  }, [assets, searchQuery, selectedCategory, selectedFolder, sortBy, sortOrder])

  const handleUploadComplete = (uploadedFiles: any[]) => {
    // In real implementation, this would call an API
    console.log('Files uploaded:', uploadedFiles)
    setShowUpload(false)
    // Refresh assets list
  }

  const handleShareAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setShowShareModal(true)
  }

  const handleDownloadAsset = (asset: Asset) => {
    // In real implementation, this would trigger a secure download
    console.log('Downloading asset:', asset.title)
  }

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'board-documents', label: 'Board Documents' },
    { value: 'financial', label: 'Financial Reports' },
    { value: 'legal', label: 'Legal Documents' },
    { value: 'presentations', label: 'Presentations' },
    { value: 'policies', label: 'Policies & Procedures' },
    { value: 'meeting-materials', label: 'Meeting Materials' }
  ]

  const folders = [
    { value: 'all', label: 'All Folders' },
    { value: '/', label: 'Root Folder' },
    { value: '/board-meetings', label: 'Board Meetings' },
    { value: '/financial-reports', label: 'Financial Reports' },
    { value: '/legal-documents', label: 'Legal Documents' }
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Folder className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
              <div className="flex items-center space-x-2">
                {currentOrganization ? (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{currentOrganization.name}</span>
                  </div>
                ) : (
                  <p className="text-gray-600">Select an organization to view assets</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowUpload(!showUpload)}
              disabled={!currentOrganization}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            <Button disabled={!currentOrganization}>
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Organization Selection Message */}
        {!currentOrganization && !isLoadingOrganizations && (
          <Alert className="mb-6">
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              Please select an organization from the sidebar to view and manage assets.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {(isLoadingOrganizations || isLoadingAssets) && (
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">
              {isLoadingOrganizations ? 'Loading organizations...' : 'Loading assets...'}
            </p>
          </Card>
        )}

        {/* Error State */}
        {assetsError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {assetsError}
            </AlertDescription>
          </Alert>
        )}

        {/* Show content only when organization is selected and not loading */}
        {currentOrganization && !isLoadingOrganizations && !isLoadingAssets && (
          <>
            {/* Upload Section */}
            {showUpload && (
              <Card className="mb-6 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Upload Documents</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpload(false)}
                  >
                    ✕
                  </Button>
                </div>
                <FileUploadDropzone onUploadComplete={handleUploadComplete} />
              </Card>
            )}

            {/* Filters and Search */}
            <Card className="mb-6 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {folders.map(folder => (
                  <option key={folder.value} value={folder.value}>{folder.label}</option>
                ))}
              </select>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-3">
              {/* Sort Controls */}
              <div className="flex items-center space-x-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="size">Sort by Size</option>
                  <option value="type">Sort by Type</option>
                </select>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <SortAsc className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-300 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'details' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('details')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Assets Display */}
        <div className="mb-6">
          {filteredAssets.length === 0 ? (
            <Card className="p-12 text-center">
              <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedCategory !== 'all' || selectedFolder !== 'all' 
                  ? 'No assets match your filters' 
                  : 'No assets yet'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedCategory !== 'all' || selectedFolder !== 'all'
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'Upload your first document to get started with asset management.'
                }
              </p>
              {!searchQuery && selectedCategory === 'all' && selectedFolder === 'all' && (
                <Button onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              )}
            </Card>
          ) : (
            <>
              {viewMode === 'grid' && (
                <AssetGrid
                  assets={filteredAssets}
                  onShare={handleShareAsset}
                  onDownload={handleDownloadAsset}
                />
              )}
              {viewMode === 'list' && (
                <AssetList
                  assets={filteredAssets}
                  onShare={handleShareAsset}
                  onDownload={handleDownloadAsset}
                />
              )}
              {viewMode === 'details' && (
                <AssetList
                  assets={filteredAssets}
                  onShare={handleShareAsset}
                  onDownload={handleDownloadAsset}
                  showDetails={true}
                />
              )}
            </>
          )}
            </div>

            {/* Assets Summary */}
            {filteredAssets.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {filteredAssets.length} of {assets.length} assets
                  </span>
                  <span>
                    Total size: {(filteredAssets.reduce((acc, asset) => acc + asset.fileSize, 0) / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Share Modal */}
        {showShareModal && selectedAsset && (
          <AssetShareModal
            asset={selectedAsset}
            onClose={() => {
              setShowShareModal(false)
              setSelectedAsset(null)
            }}
            onShare={(shareData) => {
              console.log('Sharing asset:', selectedAsset.title, 'with:', shareData)
              setShowShareModal(false)
              setSelectedAsset(null)
            }}
          />
        )}
      </div>
    </DashboardLayout>
  )
}