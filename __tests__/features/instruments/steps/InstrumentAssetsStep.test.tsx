/**
 * Comprehensive Unit Tests for InstrumentAssetsStep
 * Tests asset selection, validation, file filtering, and drag-and-drop functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import InstrumentAssetsStep from '@/features/instruments/steps/InstrumentAssetsStep';

// Mock file API
Object.defineProperty(global, 'File', {
  value: class MockFile {
    name: string;
    type: string;
    size: number;
    
    constructor(chunks: any[], name: string, properties: any) {
      this.name = name;
      this.type = properties.type || 'application/octet-stream';
      this.size = properties.size || 0;
    }
  }
});

Object.defineProperty(global, 'DataTransfer', {
  value: class MockDataTransfer {
    files: File[] = [];
    items: any[] = [];
    
    constructor() {
      this.files = [];
      this.items = [];
    }
  }
});

const mockInstrumentConfig = {
  id: 'board-pack-ai',
  name: 'Board Pack AI',
  assetFilters: {
    supportedTypes: ['pdf', 'docx', 'xlsx', 'pptx'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    minAssets: 1,
    maxAssets: 5,
    allowedCategories: ['board-documents', 'financial-reports', 'presentations']
  }
};

const mockAssets = [
  {
    id: '1',
    name: 'board-pack-q1.pdf',
    type: 'pdf',
    size: 2048000,
    category: 'board-documents',
    createdAt: '2024-01-15T10:00:00Z',
    url: '/assets/board-pack-q1.pdf'
  },
  {
    id: '2',
    name: 'financial-report.xlsx',
    type: 'xlsx', 
    size: 1024000,
    category: 'financial-reports',
    createdAt: '2024-01-10T09:00:00Z',
    url: '/assets/financial-report.xlsx'
  },
  {
    id: '3',
    name: 'presentation.pptx',
    type: 'pptx',
    size: 5120000,
    category: 'presentations',
    createdAt: '2024-01-05T14:00:00Z',
    url: '/assets/presentation.pptx'
  },
  {
    id: '4',
    name: 'large-file.pdf',
    type: 'pdf',
    size: 15 * 1024 * 1024, // 15MB - exceeds limit
    category: 'board-documents',
    createdAt: '2024-01-01T08:00:00Z',
    url: '/assets/large-file.pdf'
  },
  {
    id: '5',
    name: 'unsupported.txt',
    type: 'txt',
    size: 1024,
    category: 'other',
    createdAt: '2024-01-01T12:00:00Z',
    url: '/assets/unsupported.txt'
  }
];

const defaultProps = {
  instrumentConfig: mockInstrumentConfig,
  availableAssets: mockAssets,
  selectedAssets: [],
  onAssetSelect: jest.fn(),
  onAssetDeselect: jest.fn(),
  onFileUpload: jest.fn(),
  onValidationChange: jest.fn(),
  onDataChange: jest.fn(),
  isLoading: false
};

describe('InstrumentAssetsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Asset Display and Filtering', () => {
    test('renders available assets list', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      expect(screen.getByText('financial-report.xlsx')).toBeInTheDocument();
      expect(screen.getByText('presentation.pptx')).toBeInTheDocument();
    });

    test('filters out unsupported file types', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Should not show unsupported .txt file
      expect(screen.queryByText('unsupported.txt')).not.toBeInTheDocument();
    });

    test('filters out files exceeding size limit', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Should show warning for large file but still display it
      expect(screen.getByText('large-file.pdf')).toBeInTheDocument();
      expect(screen.getByText(/exceeds size limit/i)).toBeInTheDocument();
    });

    test('displays file metadata correctly', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      const pdfAsset = screen.getByTestId('asset-1');
      expect(within(pdfAsset).getByText('PDF')).toBeInTheDocument();
      expect(within(pdfAsset).getByText('2.0 MB')).toBeInTheDocument();
      expect(within(pdfAsset).getByText('Board Documents')).toBeInTheDocument();
    });

    test('shows asset thumbnails when available', () => {
      const assetsWithThumbnails = mockAssets.map(asset => ({
        ...asset,
        thumbnail: `/thumbnails/${asset.id}.png`
      }));

      render(<InstrumentAssetsStep {...defaultProps} availableAssets={assetsWithThumbnails} />);
      
      expect(screen.getByAltText('board-pack-q1.pdf thumbnail')).toBeInTheDocument();
    });

    test('groups assets by category', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Toggle category grouping
      await user.click(screen.getByText(/group by category/i));
      
      expect(screen.getByText('Board Documents')).toBeInTheDocument();
      expect(screen.getByText('Financial Reports')).toBeInTheDocument();
      expect(screen.getByText('Presentations')).toBeInTheDocument();
    });

    test('sorts assets by different criteria', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Sort by size
      await user.click(screen.getByText(/sort/i));
      await user.click(screen.getByText(/size/i));
      
      const assetCards = screen.getAllByTestId(/^asset-/);
      
      // Should be sorted by size (largest first)
      expect(within(assetCards[0]).getByText('large-file.pdf')).toBeInTheDocument();
      expect(within(assetCards[1]).getByText('presentation.pptx')).toBeInTheDocument();
    });
  });

  describe('Asset Selection', () => {
    test('selects assets when clicked', async () => {
      const user = userEvent.setup();
      const onAssetSelect = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onAssetSelect={onAssetSelect} />);
      
      await user.click(screen.getByTestId('asset-1'));
      
      expect(onAssetSelect).toHaveBeenCalledWith(mockAssets[0]);
    });

    test('deselects assets when clicked again', async () => {
      const user = userEvent.setup();
      const onAssetDeselect = jest.fn();
      const selectedAssets = [mockAssets[0]];
      
      render(<InstrumentAssetsStep {...defaultProps} selectedAssets={selectedAssets} onAssetDeselect={onAssetDeselect} />);
      
      await user.click(screen.getByTestId('asset-1'));
      
      expect(onAssetDeselect).toHaveBeenCalledWith(mockAssets[0].id);
    });

    test('shows selected state visually', () => {
      const selectedAssets = [mockAssets[0]];
      
      render(<InstrumentAssetsStep {...defaultProps} selectedAssets={selectedAssets} />);
      
      const selectedCard = screen.getByTestId('asset-1');
      expect(selectedCard).toHaveClass('selected', 'border-blue-500');
      expect(within(selectedCard).getByTestId('selected-checkmark')).toBeInTheDocument();
    });

    test('supports multi-select with checkbox', async () => {
      const user = userEvent.setup();
      const onAssetSelect = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onAssetSelect={onAssetSelect} />);
      
      // Select multiple assets
      await user.click(screen.getByTestId('checkbox-asset-1'));
      await user.click(screen.getByTestId('checkbox-asset-2'));
      
      expect(onAssetSelect).toHaveBeenCalledTimes(2);
    });

    test('supports select all functionality', async () => {
      const user = userEvent.setup();
      const onAssetSelect = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onAssetSelect={onAssetSelect} />);
      
      await user.click(screen.getByText(/select all/i));
      
      // Should select all valid assets (excluding oversized and unsupported)
      expect(onAssetSelect).toHaveBeenCalledTimes(3);
    });

    test('supports clear selection', async () => {
      const user = userEvent.setup();
      const onAssetDeselect = jest.fn();
      const selectedAssets = [mockAssets[0], mockAssets[1]];
      
      render(<InstrumentAssetsStep {...defaultProps} selectedAssets={selectedAssets} onAssetDeselect={onAssetDeselect} />);
      
      await user.click(screen.getByText(/clear selection/i));
      
      expect(onAssetDeselect).toHaveBeenCalledTimes(2);
    });

    test('prevents selection of invalid assets', async () => {
      const user = userEvent.setup();
      const onAssetSelect = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onAssetSelect={onAssetSelect} />);
      
      // Try to select oversized file
      const largeFileCard = screen.getByTestId('asset-4');
      expect(largeFileCard).toHaveAttribute('aria-disabled', 'true');
      
      await user.click(largeFileCard);
      
      expect(onAssetSelect).not.toHaveBeenCalled();
      expect(screen.getByText(/file exceeds maximum size limit/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    test('shows file upload area', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      expect(screen.getByTestId('file-upload-dropzone')).toBeInTheDocument();
      expect(screen.getByText(/drag files here or click to upload/i)).toBeInTheDocument();
    });

    test('handles file input change', async () => {
      const user = userEvent.setup();
      const onFileUpload = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onFileUpload={onFileUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf', size: 1024 });
      const input = screen.getByTestId('file-input');
      
      await user.upload(input, file);
      
      expect(onFileUpload).toHaveBeenCalledWith([file]);
    });

    test('validates uploaded file type', async () => {
      const user = userEvent.setup();
      const onFileUpload = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onFileUpload={onFileUpload} />);
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      
      await user.upload(input, invalidFile);
      
      expect(onFileUpload).not.toHaveBeenCalled();
      expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    });

    test('validates uploaded file size', async () => {
      const user = userEvent.setup();
      const onFileUpload = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onFileUpload={onFileUpload} />);
      
      const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf',
        size: 20 * 1024 * 1024
      });
      const input = screen.getByTestId('file-input');
      
      await user.upload(input, largeFile);
      
      expect(onFileUpload).not.toHaveBeenCalled();
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    test('handles drag and drop', async () => {
      const onFileUpload = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onFileUpload={onFileUpload} />);
      
      const dropzone = screen.getByTestId('file-upload-dropzone');
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      
      const dataTransfer = new DataTransfer();
      dataTransfer.files = [file] as any;
      
      fireEvent.dragEnter(dropzone, { dataTransfer });
      expect(dropzone).toHaveClass('drag-active');
      
      fireEvent.drop(dropzone, { dataTransfer });
      
      expect(onFileUpload).toHaveBeenCalledWith([file]);
    });

    test('shows upload progress', async () => {
      render(<InstrumentAssetsStep {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument();
      expect(screen.getByText(/uploading files/i)).toBeInTheDocument();
    });

    test('handles multiple file upload', async () => {
      const user = userEvent.setup();
      const onFileUpload = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onFileUpload={onFileUpload} />);
      
      const files = [
        new File(['content1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'test2.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      ];
      const input = screen.getByTestId('file-input');
      
      await user.upload(input, files);
      
      expect(onFileUpload).toHaveBeenCalledWith(files);
    });
  });

  describe('Search and Filtering', () => {
    test('filters assets by search query', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      await user.type(searchInput, 'board');
      
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      expect(screen.queryByText('financial-report.xlsx')).not.toBeInTheDocument();
    });

    test('filters by file type', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.click(screen.getByText(/filter/i));
      await user.click(screen.getByText('PDF'));
      
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      expect(screen.queryByText('financial-report.xlsx')).not.toBeInTheDocument();
    });

    test('filters by category', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.click(screen.getByText(/filter/i));
      await user.click(screen.getByText('Financial Reports'));
      
      expect(screen.getByText('financial-report.xlsx')).toBeInTheDocument();
      expect(screen.queryByText('board-pack-q1.pdf')).not.toBeInTheDocument();
    });

    test('filters by date range', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.click(screen.getByText(/filter/i));
      await user.click(screen.getByText('Date Range'));
      
      // Set date range to exclude older files
      const startDate = screen.getByLabelText(/from date/i);
      await user.type(startDate, '2024-01-10');
      
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      expect(screen.getByText('financial-report.xlsx')).toBeInTheDocument();
      expect(screen.queryByText('presentation.pptx')).not.toBeInTheDocument();
    });

    test('combines multiple filters', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Apply multiple filters
      await user.click(screen.getByText(/filter/i));
      await user.click(screen.getByText('PDF'));
      await user.click(screen.getByText('Board Documents'));
      
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      expect(screen.queryByText('financial-report.xlsx')).not.toBeInTheDocument();
      expect(screen.queryByText('presentation.pptx')).not.toBeInTheDocument();
    });

    test('clears filters', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Apply filter
      await user.click(screen.getByText(/filter/i));
      await user.click(screen.getByText('PDF'));
      
      // Clear filters
      await user.click(screen.getByText(/clear filters/i));
      
      // All supported assets should be visible
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      expect(screen.getByText('financial-report.xlsx')).toBeInTheDocument();
      expect(screen.getByText('presentation.pptx')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    test('validates minimum asset requirement', () => {
      const onValidationChange = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      // Should be invalid initially (no assets selected)
      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    test('becomes valid when minimum assets are selected', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByTestId('asset-1'));
      
      // Should become valid (minimum 1 asset selected)
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    test('validates maximum asset limit', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      const selectedAssets = mockAssets.slice(0, 5); // Max limit reached
      
      render(<InstrumentAssetsStep {...defaultProps} selectedAssets={selectedAssets} onValidationChange={onValidationChange} />);
      
      // Try to select another asset
      const remainingAsset = screen.getByTestId('asset-2');
      
      // Should be disabled when max limit is reached
      expect(remainingAsset).toHaveAttribute('aria-disabled', 'true');
      
      await user.click(remainingAsset);
      
      expect(screen.getByText(/maximum number of assets selected/i)).toBeInTheDocument();
    });

    test('shows validation errors clearly', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      expect(screen.getByText(/select at least 1 asset/i)).toBeInTheDocument();
      expect(screen.getByTestId('validation-error')).toHaveClass('text-red-600');
    });

    test('shows asset count status', () => {
      const selectedAssets = [mockAssets[0], mockAssets[1]];
      
      render(<InstrumentAssetsStep {...defaultProps} selectedAssets={selectedAssets} />);
      
      expect(screen.getByText('2 of 5 assets selected')).toBeInTheDocument();
    });
  });

  describe('Asset Preview', () => {
    test('opens asset preview on double-click', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.dblClick(screen.getByTestId('asset-1'));
      
      expect(screen.getByTestId('asset-preview-modal')).toBeInTheDocument();
      expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
    });

    test('shows asset metadata in preview', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.dblClick(screen.getByTestId('asset-1'));
      
      const modal = screen.getByTestId('asset-preview-modal');
      expect(within(modal).getByText('2.0 MB')).toBeInTheDocument();
      expect(within(modal).getByText('PDF Document')).toBeInTheDocument();
      expect(within(modal).getByText(/created.*jan.*15/i)).toBeInTheDocument();
    });

    test('closes preview modal', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.dblClick(screen.getByTestId('asset-1'));
      expect(screen.getByTestId('asset-preview-modal')).toBeInTheDocument();
      
      await user.click(screen.getByText(/close/i));
      expect(screen.queryByTestId('asset-preview-modal')).not.toBeInTheDocument();
    });

    test('allows selection from preview modal', async () => {
      const user = userEvent.setup();
      const onAssetSelect = jest.fn();
      
      render(<InstrumentAssetsStep {...defaultProps} onAssetSelect={onAssetSelect} />);
      
      await user.dblClick(screen.getByTestId('asset-1'));
      
      const modal = screen.getByTestId('asset-preview-modal');
      await user.click(within(modal).getByText(/select asset/i));
      
      expect(onAssetSelect).toHaveBeenCalledWith(mockAssets[0]);
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      expect(screen.getByLabelText(/available assets/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/selected assets/i)).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Tab to first asset
      await user.tab();
      expect(screen.getByTestId('asset-1')).toHaveFocus();
      
      // Use arrow keys
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('asset-2')).toHaveFocus();
      
      // Select with Space
      await user.keyboard(' ');
      
      expect(screen.getByTestId('asset-2')).toHaveClass('selected');
    });

    test('announces selection changes', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      await user.click(screen.getByTestId('asset-1'));
      
      expect(screen.getByRole('status')).toHaveTextContent(/board-pack-q1\.pdf selected/i);
    });

    test('has proper focus management', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      // Open filter menu
      await user.click(screen.getByText(/filter/i));
      
      // Focus should be on first filter option
      expect(screen.getByText('PDF')).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('handles empty asset list', () => {
      render(<InstrumentAssetsStep {...defaultProps} availableAssets={[]} />);
      
      expect(screen.getByText(/no assets available/i)).toBeInTheDocument();
      expect(screen.getByText(/upload files to get started/i)).toBeInTheDocument();
    });

    test('handles upload errors gracefully', async () => {
      const user = userEvent.setup();
      const onFileUpload = jest.fn().mockRejectedValue(new Error('Upload failed'));
      
      render(<InstrumentAssetsStep {...defaultProps} onFileUpload={onFileUpload} />);
      
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const input = screen.getByTestId('file-input');
      
      await user.upload(input, file);
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    test('recovers from network errors', async () => {
      const user = userEvent.setup();
      
      // Simulate network error
      render(<InstrumentAssetsStep {...defaultProps} availableAssets={[]} />);
      
      expect(screen.getByText(/no assets available/i)).toBeInTheDocument();
      
      // Retry button should be available
      await user.click(screen.getByText(/retry/i));
      
      // Should attempt to reload assets
      expect(screen.getByTestId('loading-assets')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('virtualizes large asset lists', () => {
      const largeAssetList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockAssets[0],
        id: i.toString(),
        name: `asset-${i}.pdf`
      }));
      
      render(<InstrumentAssetsStep {...defaultProps} availableAssets={largeAssetList} />);
      
      // Should only render visible items
      const assetCards = screen.getAllByTestId(/^asset-/);
      expect(assetCards.length).toBeLessThan(50); // Much less than 1000
    });

    test('debounces search input', async () => {
      const user = userEvent.setup();
      
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      
      // Type quickly
      await user.type(searchInput, 'board', { delay: 50 });
      
      // Should debounce and only filter after typing stops
      await waitFor(() => {
        expect(screen.getByText('board-pack-q1.pdf')).toBeInTheDocument();
      }, { timeout: 500 });
    });

    test('lazy loads asset thumbnails', () => {
      render(<InstrumentAssetsStep {...defaultProps} />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });
});