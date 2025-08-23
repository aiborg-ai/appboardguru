'use client'

// Disable static generation for this page since it uses useOrganization context
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { FileUploadDropzone } from '@/features/assets/FileUploadDropzone'
import { AssetGrid } from '@/features/assets/AssetGrid'
import { AssetList } from '@/features/assets/AssetList'
import { AssetShareModal } from '@/features/assets/AssetShareModal'
import { useOrganization } from '@/contexts/OrganizationContext'
import { FileUploadItem } from '@/types/upload'
import { Loader2, Building2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
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
  Settings,
  FileText,
  Calendar,
  Edit,
  DollarSign,
  Shield,
  Monitor,
  File,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Card } from '@/features/shared/ui/card'
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip'
import { EmailToAssetInstructions } from '@/components/email-integration/EmailToAssetInstructions'
import { SearchInput } from '@/components/molecules/SearchInput/SearchInput'

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
  const [showEmailInstructions, setShowEmailInstructions] = useState(false)
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
    fetchAssets()
  }, [fetchAssets])

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

  const handleUploadComplete = (uploadedFiles: FileUploadItem[]) => {
    console.log('Files uploaded:', uploadedFiles)
    setShowUpload(false)
    // Refresh assets list by refetching data
    if (currentOrganization) {
      fetchAssets()
    }
  }

  const fetchAssets = useCallback(async () => {
    if (!currentOrganization) {
      // For development/testing, show mock data even without organization
      console.log('No organization selected, using mock data')
      setAssets(mockAssets)
      setIsLoadingAssets(false)
      return
    }

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
          // If no data.success field, check if assets exist directly 
          if (data.assets && Array.isArray(data.assets)) {
            const transformedAssets = data.assets.map((asset: any) => ({
              id: asset.id,
              title: asset.title,
              fileName: asset.fileName || asset.file_name,
              fileType: asset.fileType || asset.file_type,
              fileSize: asset.fileSize || asset.file_size,
              category: asset.category || 'uncategorized',
              folder: '/uploads',
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
            console.log('API response without success field or assets:', data)
            // For development/testing, show mock data if no real assets
            setAssets(mockAssets)
          }
        }
      } else {
        console.log('API call failed with status:', response.status)
        // For development/testing, show mock data if API fails
        setAssets(mockAssets)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
      // For development/testing, show mock data if there's an error
      setAssets(mockAssets)
      setAssetsError('Using mock data - API unavailable')
    } finally {
      setIsLoadingAssets(false)
    }
  }, [currentOrganization])

  const handleShareAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    setShowShareModal(true)
  }

  const handleDownloadAsset = (asset: Asset) => {
    // In real implementation, this would trigger a secure download
    console.log('Downloading asset:', asset.title)
  }

  const categories = [
    { value: 'all', label: 'All Categories', icon: Folder, color: 'text-gray-600' },
    { value: 'board_pack', label: 'Board Packs', icon: Folder, color: 'text-blue-600' },
    { value: 'meeting_notes', label: 'Meeting Notes', icon: FileText, color: 'text-green-600' },
    { value: 'agenda', label: 'Agenda', icon: Calendar, color: 'text-purple-600' },
    { value: 'notes', label: 'Notes', icon: Edit, color: 'text-orange-600' },
    { value: 'financial_report', label: 'Financial Reports', icon: DollarSign, color: 'text-emerald-600' },
    { value: 'legal_document', label: 'Legal Documents', icon: Shield, color: 'text-red-600' },
    { value: 'presentation', label: 'Presentations', icon: Monitor, color: 'text-indigo-600' },
    { value: 'other', label: 'Other', icon: File, color: 'text-gray-500' }
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
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Assets
                <InfoTooltip
                  content={
                    <InfoSection
                      title="Asset Management System"
                      description="Centralized storage and management for all your board documents with advanced organization and security features."
                      features={[
                        "Secure file upload with virus scanning",
                        "Advanced categorization and tagging system",
                        "Version control with audit trails",
                        "Granular sharing permissions and access control",
                        "Smart search and filtering capabilities",
                        "Bulk operations and folder organization"
                      ]}
                      tips={[
                        "Use descriptive filenames for better searchability",
                        "Tag documents with relevant keywords",
                        "Organize files in folders by meeting or project",
                        "Review and update access permissions regularly"
                      ]}
                    />
                  }
                  side="right"
                />
              </h1>
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUpload(!showUpload)}
                disabled={!currentOrganization}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              <InfoTooltip
                content="Upload board documents, presentations, reports, and other files. All uploads are automatically scanned for security and organized with smart categorization."
                size="sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEmailInstructions(!showEmailInstructions)}
                disabled={!currentOrganization}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Assets
                {showEmailInstructions ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
              <InfoTooltip
                content="Send documents directly via email to create assets automatically. A groundbreaking feature that bridges email workflow with platform management."
                size="sm"
              />
            </div>
            
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
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Upload Documents
                    <InfoTooltip
                      content={
                        <InfoSection
                          title="File Upload Guidelines"
                          description="Upload your board documents securely with automatic processing and organization."
                          features={[
                            "Supports PDF, DOC, PPT, XLS, and image formats",
                            "Automatic virus scanning and security checks",
                            "Smart categorization based on content analysis",
                            "Version control for document updates",
                            "Metadata extraction and indexing for search"
                          ]}
                          tips={[
                            "Files are automatically categorized by type and content",
                            "Use descriptive filenames for better organization",
                            "Maximum file size is 100MB per upload",
                            "Drag and drop multiple files for batch upload"
                          ]}
                        />
                      }
                      size="sm"
                    />
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpload(false)}
                  >
                    ✕
                  </Button>
                </div>
                <FileUploadDropzone 
                  onUploadComplete={handleUploadComplete}
                  organizationId={currentOrganization?.id}
                  currentUser={{
                    id: 'dev-user-1',
                    name: 'Development User',
                    email: 'dev@example.com'
                  }}
                  showCollaborationHub={false}
                />
              </Card>
            )}

            {/* Email to Assets Instructions */}
            {showEmailInstructions && (
              <div className="mb-6">
                <EmailToAssetInstructions />
              </div>
            )}

            {/* Filters and Search */}
            <Card className="mb-6 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <SearchInput
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onSearch={setSearchQuery}
                className="w-64"
              />
              
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="border border-gray-300 rounded-lg px-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {(() => {
                    const selectedCat = categories.find(c => c.value === selectedCategory)
                    const IconComponent = selectedCat?.icon || Folder
                    return <IconComponent className={`h-4 w-4 ${selectedCat?.color || 'text-gray-400'}`} />
                  })()}
                </div>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
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
              <div className="flex items-center gap-2">
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
              <InfoTooltip
                content="Choose your preferred view: Grid for visual thumbnails, List for compact overview, or Details for comprehensive information including file properties and sharing status."
                size="sm"
              />
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

        {/* Share Modal - Outside organization wrapper */}
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