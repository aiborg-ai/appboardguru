'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganization } from '@/contexts/OrganizationContext'
import { 
  Folder,
  Upload,
  Grid3X3,
  List,
  Eye,
  Plus,
  Settings,
  FileText,
  LayoutGrid,
  Search,
  Filter,
  Building2
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Loader2 } from 'lucide-react'

// Import our new enhanced components
import { FolderTree, FolderNode } from '@/components/features/assets/FolderTree'
import { BulkOperationsManager, BulkOperationItem } from '@/components/features/assets/BulkOperationsManager'
import { VirtualizedAssetList, VirtualizedAsset } from '@/components/features/assets/VirtualizedAssetList'
import { AdvancedFileUpload } from '@/components/features/assets/AdvancedFileUpload'
import { AdvancedSearchPanel, SearchFilters } from '@/components/features/assets/AdvancedSearchPanel'
import { FileVersionHistory, FileVersion } from '@/components/features/assets/FileVersionHistory'

// Import existing components
import { AssetGrid } from '@/features/assets/AssetGrid'
import { AssetList } from '@/features/assets/AssetList'
import { AssetShareModal } from '@/features/assets/AssetShareModal'
import { InfoTooltip, InfoSection } from '@/components/atoms/feedback/info-tooltip'

type ViewMode = 'grid' | 'list' | 'virtualized' | 'details'
type LayoutMode = 'folders' | 'list' | 'search'

interface AssetStats {
  totalFiles: number
  totalSize: number
  categories: Record<string, number>
  recentUploads: number
  sharedFiles: number
}

export default function EnhancedAssetsPage() {
  const { currentOrganization, isLoadingOrganizations } = useOrganization()
  
  // Core state
  const [assets, setAssets] = useState<VirtualizedAsset[]>([])
  const [selectedAssets, setSelectedAssets] = useState<BulkOperationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('folders')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeTab, setActiveTab] = useState('files')
  const [showUpload, setShowUpload] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  
  // Folder management
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root')
  const [currentFolderPath, setCurrentFolderPath] = useState('/')
  
  // Search and filters
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    fileTypes: [],
    categories: [],
    folders: [],
    owners: [],
    tags: [],
    dateRange: {},
    sizeRange: {},
    contentSearch: true,
    sortBy: 'relevance',
    sortOrder: 'desc'
  })
  const [searchResults, setSearchResults] = useState<VirtualizedAsset[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [totalSearchResults, setTotalSearchResults] = useState(0)
  
  // Version history
  const [selectedAssetVersions, setSelectedAssetVersions] = useState<FileVersion[]>([])
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  
  // Statistics
  const [assetStats, setAssetStats] = useState<AssetStats | null>(null)

  // Mock data for development
  const mockFolders: FolderNode[] = [
    {
      id: 'root',
      name: 'Root',
      path: '/',
      fileCount: 45,
      totalSize: 234567890,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      permissions: { canRead: true, canWrite: true, canDelete: true, canShare: true },
      metadata: {
        description: 'Root folder for all documents',
        tags: [],
        isProtected: false,
        isArchived: false,
        owner: { id: '1', name: 'Admin', email: 'admin@boardguru.ai' }
      },
      children: [
        {
          id: 'board-meetings',
          name: 'Board Meetings',
          path: '/board-meetings',
          fileCount: 12,
          totalSize: 89456321,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          permissions: { canRead: true, canWrite: true, canDelete: false, canShare: true },
          metadata: {
            description: 'Documents from board meetings',
            tags: ['meetings', 'governance'],
            isProtected: false,
            isArchived: false,
            owner: { id: '1', name: 'Board Secretary', email: 'secretary@boardguru.ai' }
          },
          isExpanded: true
        },
        {
          id: 'financial-reports',
          name: 'Financial Reports',
          path: '/financial-reports',
          fileCount: 8,
          totalSize: 67890123,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          permissions: { canRead: true, canWrite: true, canDelete: false, canShare: true },
          metadata: {
            description: 'Quarterly and annual financial reports',
            tags: ['financial', 'reports'],
            isProtected: true,
            isArchived: false,
            owner: { id: '2', name: 'CFO', email: 'cfo@boardguru.ai' }
          }
        },
        {
          id: 'legal-documents',
          name: 'Legal Documents',
          path: '/legal-documents',
          fileCount: 15,
          totalSize: 45678901,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          permissions: { canRead: true, canWrite: false, canDelete: false, canShare: false },
          metadata: {
            description: 'Legal contracts and agreements',
            tags: ['legal', 'contracts'],
            isProtected: true,
            isArchived: false,
            owner: { id: '3', name: 'Legal Counsel', email: 'legal@boardguru.ai' }
          }
        }
      ]
    }
  ]

  const mockAssets: VirtualizedAsset[] = [
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
      sharedWith: [{ userId: '2', userName: 'Jane Doe', permission: 'view' }],
      downloadCount: 12,
      viewCount: 34,
      isShared: true,
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canDownload: true
      }
    },
    {
      id: '2',
      title: 'Board Meeting Minutes - January 2024',
      fileName: 'board-minutes-jan-2024.docx',
      fileType: 'docx',
      fileSize: 1234567,
      category: 'meetings',
      folder: '/board-meetings',
      tags: ['minutes', 'governance', 'january'],
      createdAt: '2024-01-20T14:00:00Z',
      updatedAt: '2024-01-20T14:00:00Z',
      owner: { id: '2', name: 'Board Secretary', email: 'secretary@boardguru.ai' },
      sharedWith: [],
      downloadCount: 8,
      viewCount: 25,
      isShared: false,
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canShare: true,
        canDownload: true
      }
    }
  ]

  const mockVersions: FileVersion[] = [
    {
      id: 'v1',
      versionNumber: '2.1',
      fileName: 'q4-financial-report-2024.pdf',
      fileSize: 2048576,
      mimeType: 'application/pdf',
      uploadedAt: '2024-01-15T10:30:00Z',
      uploadedBy: { id: '1', name: 'John Smith', email: 'john@boardguru.ai' },
      changeDescription: 'Updated revenue figures and added quarterly analysis',
      isCurrentVersion: true,
      isMajorVersion: true,
      tags: ['quarterly', 'financial'],
      changeType: 'update',
      checksum: 'abc123def456',
      metadata: {
        downloadCount: 12,
        processingStatus: 'completed',
        thumbnailUrl: '/thumbnails/q4-report.jpg'
      }
    },
    {
      id: 'v2',
      versionNumber: '2.0',
      fileName: 'q4-financial-report-2024.pdf',
      fileSize: 1987654,
      mimeType: 'application/pdf',
      uploadedAt: '2024-01-10T09:15:00Z',
      uploadedBy: { id: '1', name: 'John Smith', email: 'john@boardguru.ai' },
      changeDescription: 'Initial Q4 report draft',
      isCurrentVersion: false,
      isMajorVersion: true,
      tags: ['draft', 'financial'],
      changeType: 'create',
      checksum: 'def456ghi789',
      metadata: {
        downloadCount: 3,
        processingStatus: 'completed'
      },
      comparisonData: {
        linesAdded: 45,
        linesRemoved: 12,
        linesModified: 23,
        similarity: 0.87
      }
    }
  ]

  // Fetch data
  const fetchAssets = useCallback(async () => {
    if (!currentOrganization) {
      setAssets(mockAssets)
      setFolders(mockFolders)
      setAssetStats({
        totalFiles: mockAssets.length,
        totalSize: mockAssets.reduce((acc, asset) => acc + asset.fileSize, 0),
        categories: { financial: 1, meetings: 1 },
        recentUploads: 2,
        sharedFiles: 1
      })
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAssets(mockAssets)
      setFolders(mockFolders)
      setAssetStats({
        totalFiles: mockAssets.length,
        totalSize: mockAssets.reduce((acc, asset) => acc + asset.fileSize, 0),
        categories: { financial: 1, meetings: 1 },
        recentUploads: 2,
        sharedFiles: 1
      })
    } catch (error) {
      setError('Failed to load assets')
    } finally {
      setIsLoading(false)
    }
  }, [currentOrganization])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Event handlers
  const handleAssetSelect = useCallback((assetId: string) => {
    console.log('Asset selected:', assetId)
  }, [])

  const handleAssetToggleSelect = useCallback((assetId: string, selected: boolean) => {
    const asset = assets.find(a => a.id === assetId)
    if (!asset) return

    const bulkItem: BulkOperationItem = {
      id: asset.id,
      name: asset.title,
      type: 'file',
      size: asset.fileSize,
      path: asset.folder,
      permissions: {
        canMove: asset.permissions.canEdit,
        canCopy: true,
        canDelete: asset.permissions.canDelete,
        canShare: asset.permissions.canShare,
        canArchive: asset.permissions.canEdit
      }
    }

    setSelectedAssets(prev => 
      selected 
        ? [...prev, bulkItem]
        : prev.filter(item => item.id !== assetId)
    )
  }, [assets])

  const handleFolderSelect = useCallback((folderId: string) => {
    setSelectedFolderId(folderId)
    const folder = findFolderById(folders, folderId)
    if (folder) {
      setCurrentFolderPath(folder.path)
    }
  }, [folders])

  const handleSearch = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true)
    setSearchFilters(filters)
    
    try {
      // Simulate search API call
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Filter mock data based on search
      let results = [...mockAssets]
      
      if (filters.query) {
        results = results.filter(asset => 
          asset.title.toLowerCase().includes(filters.query.toLowerCase()) ||
          asset.fileName.toLowerCase().includes(filters.query.toLowerCase()) ||
          asset.tags.some(tag => tag.toLowerCase().includes(filters.query.toLowerCase()))
        )
      }
      
      if (filters.categories.length > 0) {
        results = results.filter(asset => filters.categories.includes(asset.category))
      }
      
      if (filters.fileTypes.length > 0) {
        results = results.filter(asset => filters.fileTypes.includes(asset.fileType))
      }
      
      setSearchResults(results)
      setTotalSearchResults(results.length)
      setLayoutMode('search')
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false)
    fetchAssets()
  }, [fetchAssets])

  // Bulk operations
  const handleBulkMove = useCallback(async (itemIds: string[], targetFolderId: string) => {
    console.log('Moving items:', itemIds, 'to folder:', targetFolderId)
    // Implement bulk move
  }, [])

  const handleBulkCopy = useCallback(async (itemIds: string[], targetFolderId: string) => {
    console.log('Copying items:', itemIds, 'to folder:', targetFolderId)
    // Implement bulk copy
  }, [])

  const handleBulkDelete = useCallback(async (itemIds: string[]) => {
    console.log('Deleting items:', itemIds)
    // Implement bulk delete
  }, [])

  const handleBulkArchive = useCallback(async (itemIds: string[], archive: boolean) => {
    console.log('Archiving items:', itemIds, archive)
    // Implement bulk archive
  }, [])

  const handleBulkShare = useCallback(async (itemIds: string[], shareData: any) => {
    console.log('Sharing items:', itemIds, shareData)
    // Implement bulk share
  }, [])

  const handleBulkDownload = useCallback(async (itemIds: string[]) => {
    console.log('Downloading items:', itemIds)
    // Implement bulk download
  }, [])

  const handleBulkUpdateTags = useCallback(async (itemIds: string[], tags: string[]) => {
    console.log('Updating tags for items:', itemIds, tags)
    // Implement bulk tag update
  }, [])

  const handleBulkUpdateCategory = useCallback(async (itemIds: string[], category: string) => {
    console.log('Updating category for items:', itemIds, category)
    // Implement bulk category update
  }, [])

  // Folder operations
  const handleFolderCreate = useCallback((parentId?: string, name?: string) => {
    console.log('Creating folder:', { parentId, name })
    // Implement folder creation
  }, [])

  const handleFolderUpdate = useCallback((folderId: string, updates: Partial<FolderNode>) => {
    console.log('Updating folder:', folderId, updates)
    // Implement folder update
  }, [])

  const handleFolderDelete = useCallback((folderId: string) => {
    console.log('Deleting folder:', folderId)
    // Implement folder deletion
  }, [])

  const handleFolderMove = useCallback((sourceFolderId: string, targetFolderId: string) => {
    console.log('Moving folder:', sourceFolderId, 'to:', targetFolderId)
    // Implement folder move
  }, [])

  const handleFolderToggle = useCallback((folderId: string) => {
    setFolders(prev => updateFolderExpansion(prev, folderId))
  }, [])

  // Helper functions
  const findFolderById = (folders: FolderNode[], id: string): FolderNode | null => {
    for (const folder of folders) {
      if (folder.id === id) return folder
      if (folder.children) {
        const found = findFolderById(folder.children, id)
        if (found) return found
      }
    }
    return null
  }

  const updateFolderExpansion = (folders: FolderNode[], folderId: string): FolderNode[] => {
    return folders.map(folder => {
      if (folder.id === folderId) {
        return { ...folder, isExpanded: !folder.isExpanded }
      }
      if (folder.children) {
        return { ...folder, children: updateFolderExpansion(folder.children, folderId) }
      }
      return folder
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Filter assets based on current context
  const displayedAssets = useMemo(() => {
    if (layoutMode === 'search') {
      return searchResults
    }
    
    if (selectedFolderId === 'root') {
      return assets
    }
    
    return assets.filter(asset => asset.folder === currentFolderPath)
  }, [layoutMode, searchResults, selectedFolderId, assets, currentFolderPath])

  // Loading state
  if (isLoadingOrganizations || isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading assets...</p>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // No organization selected
  if (!currentOrganization) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Alert className="mb-6">
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              Please select an organization to view and manage assets.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Folder className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Enhanced Assets
                <InfoTooltip
                  content={
                    <InfoSection
                      title="Enterprise Asset Management"
                      description="Advanced file management system with enterprise-grade features for board governance."
                      features={[
                        "Hierarchical folder organization with drag-and-drop",
                        "Advanced chunked file uploads with resumable transfers",
                        "Full-text search within document contents",
                        "Comprehensive file versioning and change tracking",
                        "Bulk operations for efficient file management",
                        "Virtual scrolling for 10,000+ files performance",
                        "Granular permissions and security controls",
                        "Real-time collaboration and annotations"
                      ]}
                      tips={[
                        "Use folders to organize documents by meeting or project",
                        "Enable content search to find text within documents",
                        "Use bulk operations to manage multiple files efficiently",
                        "Track file versions to maintain document history"
                      ]}
                    />
                  }
                  side="right"
                />
              </h1>
              <div className="flex items-center space-x-2 text-gray-600">
                <Building2 className="h-4 w-4" />
                <span>{currentOrganization.name}</span>
                {assetStats && (
                  <>
                    <span>•</span>
                    <span>{assetStats.totalFiles} files</span>
                    <span>•</span>
                    <span>{formatFileSize(assetStats.totalSize)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-4 w-4 mr-2" />
              Advanced Search
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
            
            <Button onClick={() => handleFolderCreate()}>
              <Plus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {assetStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Files</p>
                  <p className="text-2xl font-bold">{assetStats.totalFiles}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Storage Used</p>
                  <p className="text-2xl font-bold">{formatFileSize(assetStats.totalSize)}</p>
                </div>
                <Folder className="h-8 w-8 text-green-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recent Uploads</p>
                  <p className="text-2xl font-bold">{assetStats.recentUploads}</p>
                </div>
                <Upload className="h-8 w-8 text-orange-600" />
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Shared Files</p>
                  <p className="text-2xl font-bold">{assetStats.sharedFiles}</p>
                </div>
                <Share2 className="h-8 w-8 text-purple-600" />
              </div>
            </Card>
          </div>
        )}

        {/* Advanced Search Panel */}
        {showSearch && (
          <AdvancedSearchPanel
            onSearch={handleSearch}
            onClearFilters={() => setLayoutMode('folders')}
            isSearching={isSearching}
            totalResults={totalSearchResults}
            availableFilters={{
              fileTypes: [
                { value: 'pdf', label: 'PDF', icon: FileText },
                { value: 'docx', label: 'Word', icon: FileText },
                { value: 'xlsx', label: 'Excel', icon: FileText }
              ],
              categories: [
                { value: 'financial', label: 'Financial Reports' },
                { value: 'meetings', label: 'Meeting Materials' },
                { value: 'legal', label: 'Legal Documents' }
              ],
              folders: folders.flatMap(folder => 
                folder.children ? [folder, ...folder.children] : [folder]
              ).map(folder => ({
                value: folder.id,
                label: folder.name,
                path: folder.path
              })),
              owners: [
                { value: '1', label: 'John Smith', email: 'john@boardguru.ai' },
                { value: '2', label: 'Board Secretary', email: 'secretary@boardguru.ai' }
              ],
              tags: ['quarterly', 'financial', 'revenue', 'minutes', 'governance']
            }}
            className="mb-6"
          />
        )}

        {/* Enhanced File Upload */}
        {showUpload && (
          <AdvancedFileUpload
            onUploadComplete={handleUploadComplete}
            organizationId={currentOrganization.id}
            currentFolder={currentFolderPath}
            enableResumable={true}
            enableParallelUploads={true}
            className="mb-6"
          />
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Folders */}
          {layoutMode !== 'search' && (
            <div className="lg:col-span-1">
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onFolderCreate={handleFolderCreate}
                onFolderUpdate={handleFolderUpdate}
                onFolderDelete={handleFolderDelete}
                onFolderMove={handleFolderMove}
                onFolderToggle={handleFolderToggle}
                isDragEnabled={true}
              />
            </div>
          )}

          {/* Main Content */}
          <div className={layoutMode === 'search' ? 'lg:col-span-4' : 'lg:col-span-3'}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="versions" disabled={!selectedAssets.length}>
                    Versions
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center space-x-2">
                  {/* View Mode Selector */}
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
                      variant={viewMode === 'virtualized' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('virtualized')}
                      title="Virtual scrolling for large lists"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedAssets.length > 0 && (
                    <Badge variant="secondary">
                      {selectedAssets.length} selected
                    </Badge>
                  )}
                </div>
              </div>

              <TabsContent value="files" className="space-y-4">
                {/* Files Display */}
                {displayedAssets.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Folder className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {layoutMode === 'search' ? 'No search results' : 'No files in this folder'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {layoutMode === 'search' 
                        ? 'Try adjusting your search criteria or filters.'
                        : 'Upload files to get started with asset management.'
                      }
                    </p>
                    {layoutMode !== 'search' && (
                      <Button onClick={() => setShowUpload(true)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                      </Button>
                    )}
                  </Card>
                ) : (
                  <>
                    {viewMode === 'virtualized' && (
                      <VirtualizedAssetList
                        assets={displayedAssets}
                        height={600}
                        onAssetSelect={handleAssetSelect}
                        onAssetToggleSelect={handleAssetToggleSelect}
                        onAssetView={(asset) => console.log('View asset:', asset.id)}
                        onAssetShare={(asset) => console.log('Share asset:', asset.id)}
                        onAssetDownload={(asset) => console.log('Download asset:', asset.id)}
                        selectedAssetIds={selectedAssets.map(item => item.id)}
                        enableSelection={true}
                        enableVirtualization={displayedAssets.length > 50}
                        viewMode="comfortable"
                      />
                    )}
                    
                    {viewMode === 'grid' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayedAssets.map((asset) => (
                          <Card key={asset.id} className="p-4">
                            <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                              <FileText className="h-12 w-12 text-gray-400" />
                            </div>
                            <h4 className="font-medium text-gray-900 truncate mb-1">
                              {asset.title}
                            </h4>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {asset.fileName}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{formatFileSize(asset.fileSize)}</span>
                              <span>{asset.viewCount} views</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {viewMode === 'list' && (
                      <AssetList
                        assets={displayedAssets}
                        onShare={(asset) => console.log('Share asset:', asset.id)}
                        onDownload={(asset) => console.log('Download asset:', asset.id)}
                      />
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="versions">
                {selectedAssets.length === 1 ? (
                  <FileVersionHistory
                    assetId={selectedAssets[0].id}
                    versions={mockVersions}
                    onVersionView={(versionId) => console.log('View version:', versionId)}
                    onVersionDownload={(versionId) => console.log('Download version:', versionId)}
                    onVersionRestore={(versionId) => console.log('Restore version:', versionId)}
                    onVersionCompare={async (fromId, toId) => {
                      console.log('Compare versions:', fromId, toId)
                      return {
                        fromVersion: mockVersions[1],
                        toVersion: mockVersions[0],
                        changes: [],
                        summary: {
                          linesAdded: 45,
                          linesRemoved: 12,
                          linesModified: 23,
                          similarity: 0.87,
                          majorChanges: ['Updated revenue figures', 'Added quarterly analysis']
                        }
                      }
                    }}
                    onVersionDelete={(versionId) => console.log('Delete version:', versionId)}
                    onCreateVersion={async (file, description, isMajor) => {
                      console.log('Create version:', { file: file.name, description, isMajor })
                    }}
                    currentUser={{ id: '1', name: 'Current User', email: 'user@example.com' }}
                    permissions={{ canUpload: true, canDelete: true, canRestore: true }}
                  />
                ) : (
                  <Card className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Select a single file to view its version history</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bulk Operations Manager */}
        <BulkOperationsManager
          selectedItems={selectedAssets}
          availableFolders={folders.flatMap(folder => 
            folder.children ? [folder, ...folder.children] : [folder]
          ).map(folder => ({
            id: folder.id,
            name: folder.name,
            path: folder.path,
            canWrite: folder.permissions.canWrite
          }))}
          availableCategories={[
            { value: 'financial', label: 'Financial Reports' },
            { value: 'meetings', label: 'Meeting Materials' },
            { value: 'legal', label: 'Legal Documents' }
          ]}
          onMove={handleBulkMove}
          onCopy={handleBulkCopy}
          onDelete={handleBulkDelete}
          onArchive={handleBulkArchive}
          onShare={handleBulkShare}
          onDownload={handleBulkDownload}
          onUpdateTags={handleBulkUpdateTags}
          onUpdateCategory={handleBulkUpdateCategory}
          onClearSelection={() => setSelectedAssets([])}
        />
      </div>
    </DashboardLayout>
  )
}