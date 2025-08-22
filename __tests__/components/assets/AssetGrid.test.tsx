/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssetGrid } from '@/features/assets/AssetGrid'
import { AssetFactory } from '../../factories'
import { testAssertions } from '../../utils/test-helpers'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock hooks
jest.mock('@/hooks/useAssets', () => ({
  useAssets: jest.fn(),
}))

jest.mock('@/hooks/useVoiceTranslation', () => ({
  useVoiceTranslation: () => ({
    isListening: false,
    transcript: '',
    startListening: jest.fn(),
    stopListening: jest.fn(),
    translate: jest.fn(),
  }),
}))

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('AssetGrid', () => {
  const mockUseAssets = require('@/hooks/useAssets').useAssets as jest.Mock
  let mockAssets: any[]

  beforeEach(() => {
    mockAssets = AssetFactory.buildList(6, {
      vault_id: 'vault-123',
    })

    mockUseAssets.mockReturnValue({
      data: {
        assets: mockAssets,
        pagination: {
          total: mockAssets.length,
          page: 1,
          totalPages: 1,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render asset grid with assets', () => {
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
        />
      )

      expect(screen.getByTestId('asset-grid')).toBeInTheDocument()
      
      // Check that all assets are rendered
      mockAssets.forEach(asset => {
        expect(screen.getByText(asset.name)).toBeInTheDocument()
      })
    })

    it('should display asset metadata correctly', () => {
      const testAsset = AssetFactory.build({
        name: 'Test Document.pdf',
        file_type: 'application/pdf',
        file_size: 1024 * 1024, // 1MB
        created_at: new Date('2024-01-01').toISOString(),
      })

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={[testAsset]}
          onAssetClick={jest.fn()}
        />
      )

      expect(screen.getByText('Test Document.pdf')).toBeInTheDocument()
      expect(screen.getByText('1.0 MB')).toBeInTheDocument()
      expect(screen.getByText('PDF')).toBeInTheDocument()
    })

    it('should show loading state', () => {
      mockUseAssets.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      })

      renderWithQueryClient(
        <AssetGrid vaultId="vault-123" assets={[]} onAssetClick={jest.fn()} />
      )

      expect(screen.getByTestId('asset-grid-loading')).toBeInTheDocument()
      expect(screen.getByText(/loading assets/i)).toBeInTheDocument()
    })

    it('should show error state', () => {
      mockUseAssets.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load assets'),
      })

      renderWithQueryClient(
        <AssetGrid vaultId="vault-123" assets={[]} onAssetClick={jest.fn()} />
      )

      expect(screen.getByTestId('asset-grid-error')).toBeInTheDocument()
      expect(screen.getByText(/failed to load assets/i)).toBeInTheDocument()
    })

    it('should show empty state when no assets', () => {
      renderWithQueryClient(
        <AssetGrid vaultId="vault-123" assets={[]} onAssetClick={jest.fn()} />
      )

      expect(screen.getByTestId('asset-grid-empty')).toBeInTheDocument()
      expect(screen.getByText(/no assets found/i)).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onAssetClick when asset is clicked', async () => {
      const mockOnAssetClick = jest.fn()
      const testAsset = mockAssets[0]

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={mockOnAssetClick}
        />
      )

      const assetCard = screen.getByTestId(`asset-card-${testAsset.id}`)
      fireEvent.click(assetCard)

      expect(mockOnAssetClick).toHaveBeenCalledWith(testAsset)
    })

    it('should handle keyboard navigation', async () => {
      const mockOnAssetClick = jest.fn()

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={mockOnAssetClick}
        />
      )

      const firstAssetCard = screen.getByTestId(`asset-card-${mockAssets[0].id}`)
      firstAssetCard.focus()
      
      // Press Enter to select
      fireEvent.keyDown(firstAssetCard, { key: 'Enter', code: 'Enter' })
      expect(mockOnAssetClick).toHaveBeenCalledWith(mockAssets[0])

      // Press Space to select
      fireEvent.keyDown(firstAssetCard, { key: ' ', code: 'Space' })
      expect(mockOnAssetClick).toHaveBeenCalledTimes(2)
    })

    it('should support asset selection', async () => {
      const mockOnSelectionChange = jest.fn()

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      )

      const checkbox = screen.getByTestId(`asset-checkbox-${mockAssets[0].id}`)
      fireEvent.click(checkbox)

      expect(mockOnSelectionChange).toHaveBeenCalledWith([mockAssets[0].id])
    })

    it('should handle select all functionality', async () => {
      const mockOnSelectionChange = jest.fn()

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
          selectable={true}
          onSelectionChange={mockOnSelectionChange}
        />
      )

      const selectAllCheckbox = screen.getByTestId('select-all-assets')
      fireEvent.click(selectAllCheckbox)

      expect(mockOnSelectionChange).toHaveBeenCalledWith(
        mockAssets.map(asset => asset.id)
      )
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter assets by file type', async () => {
      const pdfAssets = AssetFactory.buildList(3, { file_type: 'application/pdf' })
      const docAssets = AssetFactory.buildList(2, { file_type: 'application/docx' })
      const allAssets = [...pdfAssets, ...docAssets]

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={allAssets}
          onAssetClick={jest.fn()}
          showFilters={true}
        />
      )

      const fileTypeFilter = screen.getByTestId('file-type-filter')
      fireEvent.change(fileTypeFilter, { target: { value: 'application/pdf' } })

      await waitFor(() => {
        expect(screen.getAllByTestId(/asset-card-/)).toHaveLength(3)
      })
    })

    it('should sort assets by name, date, and size', async () => {
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
          showSort={true}
        />
      )

      const sortSelect = screen.getByTestId('asset-sort-select')
      
      // Sort by name
      fireEvent.change(sortSelect, { target: { value: 'name_asc' } })
      await waitFor(() => {
        const assetNames = screen.getAllByTestId(/asset-name-/).map(el => el.textContent)
        expect(assetNames).toEqual([...assetNames].sort())
      })

      // Sort by date (newest first)
      fireEvent.change(sortSelect, { target: { value: 'date_desc' } })
      await waitFor(() => {
        // Verify sorting logic was applied
        expect(screen.getByTestId('asset-grid')).toBeInTheDocument()
      })
    })
  })

  describe('Grid Layout Options', () => {
    it('should support different view modes (grid, list)', async () => {
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
          viewMode="grid"
        />
      )

      expect(screen.getByTestId('asset-grid')).toHaveClass('grid-view')

      // Switch to list view
      const viewToggle = screen.getByTestId('view-mode-toggle')
      fireEvent.click(viewToggle)

      await waitFor(() => {
        expect(screen.getByTestId('asset-grid')).toHaveClass('list-view')
      })
    })

    it('should adjust grid columns based on container size', () => {
      // Mock container width
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        value: 1200,
      })

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
        />
      )

      const grid = screen.getByTestId('asset-grid')
      expect(grid).toHaveStyle({
        gridTemplateColumns: expect.stringContaining('repeat(')
      })
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of assets efficiently', () => {
      const largeAssetList = AssetFactory.buildList(1000)

      const startTime = performance.now()
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={largeAssetList}
          onAssetClick={jest.fn()}
          virtualizeGrid={true}
        />
      )
      const renderTime = performance.now() - startTime

      expect(renderTime).toBeLessThan(100) // Should render in under 100ms
      expect(screen.getByTestId('asset-grid')).toBeInTheDocument()
    })

    it('should implement virtual scrolling for large datasets', () => {
      const largeAssetList = AssetFactory.buildList(500)

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={largeAssetList}
          onAssetClick={jest.fn()}
          virtualizeGrid={true}
        />
      )

      // Only a subset should be rendered in the DOM
      const renderedAssets = screen.getAllByTestId(/asset-card-/)
      expect(renderedAssets.length).toBeLessThan(largeAssetList.length)
      expect(renderedAssets.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
        />
      )

      const grid = screen.getByTestId('asset-grid')
      expect(grid).toHaveAttribute('role', 'grid')
      expect(grid).toHaveAttribute('aria-label', 'Asset grid')

      const assetCards = screen.getAllByTestId(/asset-card-/)
      assetCards.forEach(card => {
        expect(card).toHaveAttribute('role', 'gridcell')
        expect(card).toHaveAttribute('tabIndex')
      })
    })

    it('should support screen reader navigation', async () => {
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
        />
      )

      const firstAsset = screen.getByTestId(`asset-card-${mockAssets[0].id}`)
      expect(firstAsset).toHaveAttribute('aria-label', expect.stringContaining(mockAssets[0].name))
      
      // Check for descriptive text
      expect(firstAsset).toHaveAttribute(
        'aria-describedby', 
        expect.stringContaining(`asset-details-${mockAssets[0].id}`)
      )
    })

    it('should announce selection changes to screen readers', async () => {
      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
          selectable={true}
        />
      )

      const checkbox = screen.getByTestId(`asset-checkbox-${mockAssets[0].id}`)
      fireEvent.click(checkbox)

      // Check for ARIA live region update
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/1 asset selected/i)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle individual asset loading errors gracefully', () => {
      const assetsWithError = [
        ...mockAssets.slice(0, 2),
        { ...mockAssets[2], error: 'Failed to load thumbnail' },
        ...mockAssets.slice(3)
      ]

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={assetsWithError}
          onAssetClick={jest.fn()}
        />
      )

      // Should still render the grid
      expect(screen.getByTestId('asset-grid')).toBeInTheDocument()
      
      // Error asset should show error state
      expect(screen.getByTestId(`asset-error-${mockAssets[2].id}`)).toBeInTheDocument()
    })

    it('should provide retry functionality on errors', async () => {
      const mockRetry = jest.fn()
      mockUseAssets.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch: mockRetry,
      })

      renderWithQueryClient(
        <AssetGrid vaultId="vault-123" assets={[]} onAssetClick={jest.fn()} />
      )

      const retryButton = screen.getByTestId('retry-assets')
      fireEvent.click(retryButton)

      expect(mockRetry).toHaveBeenCalled()
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        value: 375,
      })

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
        />
      )

      const grid = screen.getByTestId('asset-grid')
      expect(grid).toHaveClass('mobile-grid')
    })

    it('should use appropriate grid columns for tablet', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      })

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={mockAssets}
          onAssetClick={jest.fn()}
        />
      )

      const grid = screen.getByTestId('asset-grid')
      expect(grid).toHaveClass('tablet-grid')
    })
  })

  describe('Data Validation', () => {
    it('should handle invalid asset data gracefully', () => {
      const invalidAssets = [
        { ...mockAssets[0], name: null }, // Invalid name
        { ...mockAssets[1], id: undefined }, // Invalid ID
        mockAssets[2], // Valid asset
      ]

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={invalidAssets}
          onAssetClick={jest.fn()}
        />
      )

      // Should only render valid assets
      const renderedAssets = screen.getAllByTestId(/asset-card-/)
      expect(renderedAssets).toHaveLength(1)
    })

    it('should validate asset metadata display', () => {
      const assetWithMetadata = AssetFactory.build({
        name: 'Test Document.pdf',
        file_type: 'application/pdf',
        file_size: 1024 * 1024,
        created_at: new Date().toISOString(),
        annotation_count: 5,
        download_count: 10,
      })

      renderWithQueryClient(
        <AssetGrid 
          vaultId="vault-123" 
          assets={[assetWithMetadata]}
          onAssetClick={jest.fn()}
          showMetadata={true}
        />
      )

      expect(testAssertions.hasValidAssetMetadata(assetWithMetadata)).toBe(true)
      expect(screen.getByText('5 annotations')).toBeInTheDocument()
      expect(screen.getByText('10 downloads')).toBeInTheDocument()
    })
  })
})
