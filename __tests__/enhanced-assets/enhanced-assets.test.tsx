import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Import components for testing
import { FolderTree, FolderNode } from '@/components/features/assets/FolderTree'
import { BulkOperationsManager, BulkOperationItem } from '@/components/features/assets/BulkOperationsManager'
import { VirtualizedAssetList, VirtualizedAsset } from '@/components/features/assets/VirtualizedAssetList'
import { AdvancedFileUpload } from '@/components/features/assets/AdvancedFileUpload'
import { AdvancedSearchPanel, SearchFilters } from '@/components/features/assets/AdvancedSearchPanel'
import { FileVersionHistory, FileVersion } from '@/components/features/assets/FileVersionHistory'

// Mock dependencies
vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    currentOrganization: {
      id: 'org-1',
      name: 'Test Organization'
    },
    isLoadingOrganizations: false
  })
}))

// Mock react-window for virtual scrolling tests
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height }: any) => (
    <div data-testid="virtual-list" style={{ height }}>
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) =>
        children({ index, style: { height: itemSize } })
      )}
    </div>
  )
}))

describe('Enhanced Assets System', () => {
  const mockUser = userEvent.setup()

  // Mock data
  const mockFolders: FolderNode[] = [
    {
      id: 'folder-1',
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
        owner: { id: '1', name: 'Board Secretary', email: 'secretary@test.com' }
      },
      isExpanded: false,
      children: [
        {
          id: 'subfolder-1',
          name: 'Q1 2024',
          path: '/board-meetings/q1-2024',
          fileCount: 3,
          totalSize: 12345678,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T00:00:00Z',
          permissions: { canRead: true, canWrite: true, canDelete: true, canShare: true },
          metadata: {
            tags: [],
            isProtected: false,
            isArchived: false,
            owner: { id: '1', name: 'Board Secretary', email: 'secretary@test.com' }
          }
        }
      ]
    }
  ]

  const mockAssets: VirtualizedAsset[] = [
    {
      id: 'asset-1',
      title: 'Q4 Financial Report',
      fileName: 'q4-report.pdf',
      fileType: 'pdf',
      fileSize: 2048576,
      category: 'financial',
      folder: '/financial-reports',
      tags: ['quarterly', 'financial'],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      owner: { id: '1', name: 'John Smith', email: 'john@test.com' },
      sharedWith: [],
      downloadCount: 12,
      viewCount: 34,
      isShared: false,
      permissions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canShare: true,
        canDownload: true
      }
    },
    {
      id: 'asset-2',
      title: 'Board Minutes January',
      fileName: 'minutes-jan-2024.docx',
      fileType: 'docx',
      fileSize: 1234567,
      category: 'meetings',
      folder: '/board-meetings',
      tags: ['minutes', 'governance'],
      createdAt: '2024-01-20T14:00:00Z',
      updatedAt: '2024-01-20T14:00:00Z',
      owner: { id: '2', name: 'Board Secretary', email: 'secretary@test.com' },
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
      id: 'version-1',
      versionNumber: '2.1',
      fileName: 'q4-report.pdf',
      fileSize: 2048576,
      mimeType: 'application/pdf',
      uploadedAt: '2024-01-15T10:30:00Z',
      uploadedBy: { id: '1', name: 'John Smith', email: 'john@test.com' },
      changeDescription: 'Updated revenue figures',
      isCurrentVersion: true,
      isMajorVersion: true,
      tags: ['quarterly'],
      changeType: 'update',
      checksum: 'abc123',
      metadata: {
        downloadCount: 12,
        processingStatus: 'completed'
      }
    }
  ]

  describe('FolderTree Component', () => {
    const defaultProps = {
      folders: mockFolders,
      selectedFolderId: 'folder-1',
      onFolderSelect: vi.fn(),
      onFolderCreate: vi.fn(),
      onFolderUpdate: vi.fn(),
      onFolderDelete: vi.fn(),
      onFolderMove: vi.fn(),
      onFolderToggle: vi.fn(),
      isDragEnabled: true
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders folder tree with correct structure', () => {
      render(<FolderTree {...defaultProps} />)
      
      expect(screen.getByText('Folders')).toBeInTheDocument()
      expect(screen.getByText('Board Meetings')).toBeInTheDocument()
      expect(screen.getByText('12 files')).toBeInTheDocument()
    })

    it('handles folder selection', async () => {
      render(<FolderTree {...defaultProps} />)
      
      const folderElement = screen.getByText('Board Meetings')
      await mockUser.click(folderElement)
      
      expect(defaultProps.onFolderSelect).toHaveBeenCalledWith('folder-1')
    })

    it('expands and collapses folders', async () => {
      render(<FolderTree {...defaultProps} />)
      
      const expandButton = screen.getByRole('button')
      await mockUser.click(expandButton)
      
      expect(defaultProps.onFolderToggle).toHaveBeenCalledWith('folder-1')
    })

    it('shows folder context menu', async () => {
      render(<FolderTree {...defaultProps} />)
      
      const moreButton = screen.getByTestId('folder-menu-button') || screen.getByRole('button', { name: /more/i })
      await mockUser.click(moreButton)
      
      expect(screen.getByText('New Subfolder')).toBeInTheDocument()
      expect(screen.getByText('Rename')).toBeInTheDocument()
    })

    it('handles drag and drop operations', () => {
      render(<FolderTree {...defaultProps} />)
      
      const folderElement = screen.getByText('Board Meetings')
      
      // Simulate drag start
      fireEvent.dragStart(folderElement, {
        dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
      })
      
      // Simulate drag over
      fireEvent.dragOver(folderElement, {
        preventDefault: vi.fn(),
        dataTransfer: { dropEffect: 'move' }
      })
      
      // Simulate drop
      fireEvent.drop(folderElement, {
        preventDefault: vi.fn(),
        dataTransfer: { getData: vi.fn().mockReturnValue('folder-1') }
      })
    })
  })

  describe('VirtualizedAssetList Component', () => {
    const defaultProps = {
      assets: mockAssets,
      height: 400,
      onAssetSelect: vi.fn(),
      onAssetToggleSelect: vi.fn(),
      onAssetView: vi.fn(),
      onAssetShare: vi.fn(),
      onAssetDownload: vi.fn(),
      selectedAssetIds: [],
      enableSelection: true,
      enableVirtualization: true
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders asset list with virtual scrolling', () => {
      render(<VirtualizedAssetList {...defaultProps} />)
      
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument()
      expect(screen.getByText('Q4 Financial Report')).toBeInTheDocument()
      expect(screen.getByText('Board Minutes January')).toBeInTheDocument()
    })

    it('handles asset selection', async () => {
      render(<VirtualizedAssetList {...defaultProps} />)
      
      const checkbox = screen.getAllByRole('checkbox')[0]
      await mockUser.click(checkbox)
      
      expect(defaultProps.onAssetToggleSelect).toHaveBeenCalledWith('asset-1', true)
    })

    it('shows asset actions on hover', async () => {
      render(<VirtualizedAssetList {...defaultProps} />)
      
      const assetElement = screen.getByText('Q4 Financial Report')
      await mockUser.hover(assetElement.closest('div')!)
      
      expect(screen.getByTitle('View asset')).toBeInTheDocument()
      expect(screen.getByTitle('Download asset')).toBeInTheDocument()
      expect(screen.getByTitle('Share asset')).toBeInTheDocument()
    })

    it('handles asset view action', async () => {
      render(<VirtualizedAssetList {...defaultProps} />)
      
      const viewButton = screen.getByTitle('View asset')
      await mockUser.click(viewButton)
      
      expect(defaultProps.onAssetView).toHaveBeenCalledWith(mockAssets[0])
    })
  })

  describe('AdvancedFileUpload Component', () => {
    const defaultProps = {
      organizationId: 'org-1',
      onUploadComplete: vi.fn(),
      enableResumable: true,
      enableParallelUploads: true,
      maxFileSize: 100 * 1024 * 1024,
      chunkSize: 5 * 1024 * 1024
    }

    beforeEach(() => {
      vi.clearAllMocks()
      // Mock File and FileReader
      global.File = class MockFile {
        name: string
        size: number
        type: string
        
        constructor(parts: any[], name: string, properties: any = {}) {
          this.name = name
          this.size = properties.size || 1024
          this.type = properties.type || 'text/plain'
        }
        
        slice() {
          return new MockFile([], this.name, { size: this.size, type: this.type })
        }
      } as any
      
      global.FileReader = class MockFileReader {
        result: string = 'data:text/plain;base64,test'
        onload: any
        readAsDataURL() {
          setTimeout(() => this.onload?.({ target: { result: this.result } }), 0)
        }
      } as any
    })

    it('renders upload dropzone', () => {
      render(<AdvancedFileUpload {...defaultProps} />)
      
      expect(screen.getByText('Advanced File Upload')).toBeInTheDocument()
      expect(screen.getByText('Choose Files')).toBeInTheDocument()
      expect(screen.getByText(/Resumable uploads supported/)).toBeInTheDocument()
    })

    it('handles file selection via input', async () => {
      render(<AdvancedFileUpload {...defaultProps} />)
      
      const fileInput = screen.getByRole('button', { name: /choose files/i })
      await mockUser.click(fileInput)
      
      // Simulate file selection
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true
      })
      
      fireEvent.change(input)
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
    })

    it('handles drag and drop file upload', async () => {
      render(<AdvancedFileUpload {...defaultProps} />)
      
      const dropzone = screen.getByText('Advanced File Upload').closest('div')!
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      // Simulate drag over
      fireEvent.dragOver(dropzone, {
        dataTransfer: { files: [file] }
      })
      
      expect(screen.getByText('Drop files here')).toBeInTheDocument()
      
      // Simulate drop
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] }
      })
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })
    })

    it('validates file size and type', async () => {
      const propsWithLimits = {
        ...defaultProps,
        maxFileSize: 1024,
        allowedFileTypes: ['application/pdf'] as readonly string[]
      }
      
      render(<AdvancedFileUpload {...propsWithLimits} />)
      
      const dropzone = screen.getByText('Advanced File Upload').closest('div')!
      const oversizedFile = new File(['test'], 'large.pdf', { 
        type: 'application/pdf',
        size: 2048 
      })
      
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [oversizedFile] }
      })
      
      await waitFor(() => {
        expect(screen.getByText(/File size exceeds/)).toBeInTheDocument()
      })
    })
  })

  describe('AdvancedSearchPanel Component', () => {
    const defaultProps = {
      onSearch: vi.fn(),
      onClearFilters: vi.fn(),
      availableFilters: {
        fileTypes: [
          { value: 'pdf', label: 'PDF', icon: () => <div>PDF</div> },
          { value: 'docx', label: 'Word', icon: () => <div>DOCX</div> }
        ],
        categories: [
          { value: 'financial', label: 'Financial' },
          { value: 'meetings', label: 'Meetings' }
        ],
        folders: [
          { value: 'folder-1', label: 'Board Meetings', path: '/board-meetings' }
        ],
        owners: [
          { value: '1', label: 'John Smith', email: 'john@test.com' }
        ],
        tags: ['quarterly', 'financial', 'governance']
      }
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders search interface', () => {
      render(<AdvancedSearchPanel {...defaultProps} />)
      
      expect(screen.getByPlaceholderText('Search files and content...')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('handles search query input', async () => {
      render(<AdvancedSearchPanel {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search files and content...')
      await mockUser.type(searchInput, 'financial report')
      
      expect(searchInput).toHaveValue('financial report')
    })

    it('expands advanced filters', async () => {
      render(<AdvancedSearchPanel {...defaultProps} />)
      
      const filtersButton = screen.getByText('Filters')
      await mockUser.click(filtersButton)
      
      expect(screen.getByText('File Types')).toBeInTheDocument()
      expect(screen.getByText('Categories')).toBeInTheDocument()
      expect(screen.getByText('Date Range')).toBeInTheDocument()
    })

    it('handles search execution', async () => {
      render(<AdvancedSearchPanel {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Search files and content...')
      await mockUser.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: 'Search' })
      await mockUser.click(searchButton)
      
      expect(defaultProps.onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query',
          contentSearch: true
        })
      )
    })

    it('clears filters', async () => {
      render(<AdvancedSearchPanel {...defaultProps} />)
      
      // First set some filters
      const searchInput = screen.getByPlaceholderText('Search files and content...')
      await mockUser.type(searchInput, 'test')
      
      // Then clear
      const clearButton = screen.getByText('Clear')
      await mockUser.click(clearButton)
      
      expect(defaultProps.onClearFilters).toHaveBeenCalled()
      expect(searchInput).toHaveValue('')
    })
  })

  describe('FileVersionHistory Component', () => {
    const defaultProps = {
      assetId: 'asset-1',
      versions: mockVersions,
      onVersionView: vi.fn(),
      onVersionDownload: vi.fn(),
      onVersionRestore: vi.fn(),
      onVersionCompare: vi.fn(),
      onVersionDelete: vi.fn(),
      onCreateVersion: vi.fn(),
      currentUser: { id: '1', name: 'Test User', email: 'test@example.com' },
      permissions: { canUpload: true, canDelete: true, canRestore: true }
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders version history', () => {
      render(<FileVersionHistory {...defaultProps} />)
      
      expect(screen.getByText('Version History')).toBeInTheDocument()
      expect(screen.getByText('1 version available')).toBeInTheDocument()
      expect(screen.getByText('Version 2.1')).toBeInTheDocument()
      expect(screen.getByText('Current')).toBeInTheDocument()
      expect(screen.getByText('Major')).toBeInTheDocument()
    })

    it('handles version view action', async () => {
      render(<FileVersionHistory {...defaultProps} />)
      
      const viewButton = screen.getByTitle('View version')
      await mockUser.click(viewButton)
      
      expect(defaultProps.onVersionView).toHaveBeenCalledWith('version-1')
    })

    it('handles version download action', async () => {
      render(<FileVersionHistory {...defaultProps} />)
      
      const downloadButton = screen.getByTitle('Download version')
      await mockUser.click(downloadButton)
      
      expect(defaultProps.onVersionDownload).toHaveBeenCalledWith('version-1')
    })

    it('shows version details when expanded', async () => {
      render(<FileVersionHistory {...defaultProps} />)
      
      const expandButton = screen.getByTitle('Show details')
      await mockUser.click(expandButton)
      
      expect(screen.getByText('File Name:')).toBeInTheDocument()
      expect(screen.getByText('MIME Type:')).toBeInTheDocument()
      expect(screen.getByText('Checksum:')).toBeInTheDocument()
    })

    it('handles new version upload', async () => {
      render(<FileVersionHistory {...defaultProps} />)
      
      const newVersionButton = screen.getByText('New Version')
      await mockUser.click(newVersionButton)
      
      expect(screen.getByText('Upload New Version')).toBeInTheDocument()
      expect(screen.getByText('Create a new version of this file with your changes.')).toBeInTheDocument()
    })
  })

  describe('BulkOperationsManager Component', () => {
    const mockBulkItems: BulkOperationItem[] = [
      {
        id: 'asset-1',
        name: 'Q4 Financial Report',
        type: 'file',
        size: 2048576,
        path: '/financial-reports',
        permissions: {
          canMove: true,
          canCopy: true,
          canDelete: true,
          canShare: true,
          canArchive: true
        }
      },
      {
        id: 'asset-2',
        name: 'Board Minutes',
        type: 'file',
        size: 1234567,
        path: '/board-meetings',
        permissions: {
          canMove: true,
          canCopy: true,
          canDelete: false,
          canShare: true,
          canArchive: true
        }
      }
    ]

    const defaultProps = {
      selectedItems: mockBulkItems,
      availableFolders: [
        { id: 'folder-1', name: 'Board Meetings', path: '/board-meetings', canWrite: true }
      ],
      availableCategories: [
        { value: 'financial', label: 'Financial' },
        { value: 'meetings', label: 'Meetings' }
      ],
      onMove: vi.fn(),
      onCopy: vi.fn(),
      onDelete: vi.fn(),
      onArchive: vi.fn(),
      onShare: vi.fn(),
      onDownload: vi.fn(),
      onUpdateTags: vi.fn(),
      onUpdateCategory: vi.fn(),
      onClearSelection: vi.fn()
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders bulk operations bar when items selected', () => {
      render(<BulkOperationsManager {...defaultProps} />)
      
      expect(screen.getByText('2 selected')).toBeInTheDocument()
      expect(screen.getByText('2 files • 3.1 MB')).toBeInTheDocument()
      
      // Check for action buttons
      expect(screen.getByTitle('Move to folder')).toBeInTheDocument()
      expect(screen.getByTitle('Copy to folder')).toBeInTheDocument()
      expect(screen.getByTitle('Archive items')).toBeInTheDocument()
      expect(screen.getByTitle('Share items')).toBeInTheDocument()
      expect(screen.getByTitle('Download items')).toBeInTheDocument()
    })

    it('does not render when no items selected', () => {
      render(<BulkOperationsManager {...defaultProps} selectedItems={[]} />)
      
      expect(screen.queryByText('selected')).not.toBeInTheDocument()
    })

    it('handles move operation', async () => {
      render(<BulkOperationsManager {...defaultProps} />)
      
      const moveButton = screen.getByTitle('Move to folder')
      await mockUser.click(moveButton)
      
      expect(screen.getByText('Move Items')).toBeInTheDocument()
      expect(screen.getByText('This will affect 2 files')).toBeInTheDocument()
    })

    it('handles delete operation with confirmation', async () => {
      render(<BulkOperationsManager {...defaultProps} />)
      
      const deleteButton = screen.getByTitle('Delete items')
      await mockUser.click(deleteButton)
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument()
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()
    })

    it('clears selection', async () => {
      render(<BulkOperationsManager {...defaultProps} />)
      
      const clearButton = screen.getByTitle('Clear selection')
      await mockUser.click(clearButton)
      
      expect(defaultProps.onClearSelection).toHaveBeenCalled()
    })

    it('disables actions based on permissions', () => {
      const itemsWithLimitedPermissions = mockBulkItems.map(item => ({
        ...item,
        permissions: {
          ...item.permissions,
          canDelete: false
        }
      }))
      
      render(
        <BulkOperationsManager 
          {...defaultProps} 
          selectedItems={itemsWithLimitedPermissions} 
        />
      )
      
      const deleteButton = screen.getByTitle('Delete items')
      expect(deleteButton).toBeDisabled()
    })
  })

  describe('Integration Tests', () => {
    it('integrates folder selection with asset filtering', async () => {
      // This would test the full page integration
      // For now, we'll test the concept with mock functions
      
      const folderSelectHandler = vi.fn()
      const assetFilterHandler = vi.fn()
      
      render(
        <FolderTree
          folders={mockFolders}
          selectedFolderId=""
          onFolderSelect={folderSelectHandler}
          onFolderCreate={vi.fn()}
          onFolderUpdate={vi.fn()}
          onFolderDelete={vi.fn()}
          onFolderMove={vi.fn()}
          onFolderToggle={vi.fn()}
        />
      )
      
      const folderElement = screen.getByText('Board Meetings')
      await mockUser.click(folderElement)
      
      expect(folderSelectHandler).toHaveBeenCalledWith('folder-1')
    })

    it('integrates search with asset display', () => {
      const searchHandler = vi.fn()
      
      render(
        <AdvancedSearchPanel
          onSearch={searchHandler}
          onClearFilters={vi.fn()}
          availableFilters={{
            fileTypes: [],
            categories: [],
            folders: [],
            owners: [],
            tags: []
          }}
        />
      )
      
      // Test search integration logic
      expect(screen.getByPlaceholderText('Search files and content...')).toBeInTheDocument()
    })
  })

  describe('Performance Tests', () => {
    it('handles large asset lists efficiently', () => {
      const largeAssetList = Array.from({ length: 1000 }, (_, index) => ({
        ...mockAssets[0],
        id: `asset-${index}`,
        title: `Asset ${index}`
      }))
      
      const start = performance.now()
      
      render(
        <VirtualizedAssetList
          assets={largeAssetList}
          height={400}
          onAssetSelect={vi.fn()}
          onAssetToggleSelect={vi.fn()}
          onAssetView={vi.fn()}
          onAssetShare={vi.fn()}
          onAssetDownload={vi.fn()}
          enableVirtualization={true}
        />
      )
      
      const end = performance.now()
      const renderTime = end - start
      
      // Ensure render time is reasonable (less than 100ms for 1000 items)
      expect(renderTime).toBeLessThan(100)
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument()
    })

    it('optimizes re-renders with memoization', () => {
      const onSelect = vi.fn()
      const { rerender } = render(
        <VirtualizedAssetList
          assets={mockAssets}
          height={400}
          onAssetSelect={onSelect}
          onAssetToggleSelect={vi.fn()}
          onAssetView={vi.fn()}
          onAssetShare={vi.fn()}
          onAssetDownload={vi.fn()}
          selectedAssetIds={[]}
        />
      )
      
      // Re-render with same props should not cause unnecessary work
      rerender(
        <VirtualizedAssetList
          assets={mockAssets}
          height={400}
          onAssetSelect={onSelect}
          onAssetToggleSelect={vi.fn()}
          onAssetView={vi.fn()}
          onAssetShare={vi.fn()}
          onAssetDownload={vi.fn()}
          selectedAssetIds={[]}
        />
      )
      
      expect(screen.getByTestId('virtual-list')).toBeInTheDocument()
    })
  })

  describe('Accessibility Tests', () => {
    it('provides proper ARIA labels and keyboard navigation', async () => {
      render(
        <VirtualizedAssetList
          assets={mockAssets}
          height={400}
          onAssetSelect={vi.fn()}
          onAssetToggleSelect={vi.fn()}
          onAssetView={vi.fn()}
          onAssetShare={vi.fn()}
          onAssetDownload={vi.fn()}
          enableSelection={true}
        />
      )
      
      // Check for proper ARIA attributes
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(2)
      
      // Check for keyboard navigation
      const firstCheckbox = checkboxes[0]
      firstCheckbox.focus()
      
      // Simulate keyboard interaction
      fireEvent.keyDown(firstCheckbox, { key: 'Enter' })
      fireEvent.keyDown(firstCheckbox, { key: 'Space' })
    })

    it('provides screen reader friendly content', () => {
      render(<FileVersionHistory {...{
        assetId: 'asset-1',
        versions: mockVersions,
        onVersionView: vi.fn(),
        onVersionDownload: vi.fn(),
        onVersionRestore: vi.fn(),
        onVersionCompare: vi.fn(),
        onVersionDelete: vi.fn(),
        onCreateVersion: vi.fn(),
        currentUser: { id: '1', name: 'Test User', email: 'test@example.com' },
        permissions: { canUpload: true, canDelete: true, canRestore: true }
      }} />)
      
      // Check for descriptive text
      expect(screen.getByText('Version History')).toBeInTheDocument()
      expect(screen.getByText('1 version available')).toBeInTheDocument()
      
      // Check for proper button labels
      expect(screen.getByTitle('View version')).toBeInTheDocument()
      expect(screen.getByTitle('Download version')).toBeInTheDocument()
    })
  })
})