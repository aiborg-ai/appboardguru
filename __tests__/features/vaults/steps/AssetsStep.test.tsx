/**
 * AssetsStep Component Unit Tests
 * Comprehensive testing for vault creation assets step with upload functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import AssetsStep from '@/features/vaults/steps/AssetsStep';
import { VaultWizardData } from '@/features/vaults/CreateVaultWizard';
import * as uploadModule from '@/types/upload';

// Mock dependencies
vi.mock('@/features/assets/FileUploadDropzone', () => ({
  FileUploadDropzone: ({ onUploadComplete, organizationId, currentUser }: any) => (
    <div data-testid="file-upload-dropzone">
      <div>Organization ID: {organizationId}</div>
      <div>User: {currentUser?.name}</div>
      <button 
        onClick={() => onUploadComplete([
          {
            id: 'test-file-1',
            title: 'Test Document.pdf',
            file: { type: 'application/pdf', size: 1024000, name: 'Test Document.pdf' },
            category: 'board-documents'
          }
        ])}
        data-testid="mock-upload-complete"
      >
        Complete Upload
      </button>
    </div>
  )
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AssetsStep', () => {
  let mockOnUpdate: Mock;
  let defaultData: VaultWizardData;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnUpdate = vi.fn();
    defaultData = {
      selectedOrganization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org'
      },
      createNewOrganization: null,
      selectedAssets: [],
      selectedBoardMates: [],
      newBoardMates: [],
      vaultName: '',
      vaultDescription: '',
      accessLevel: 'organization',
      vaultType: 'board_pack'
    };

    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        assets: [
          {
            id: 'asset-1',
            name: 'Financial Report Q4.pdf',
            file_type: 'pdf',
            file_size: 2048576,
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
            upload_status: 'completed',
            owner: {
              id: 'user-1',
              full_name: 'John Smith',
              avatar_url: null
            },
            vault: null
          },
          {
            id: 'asset-2',
            name: 'Board Meeting Slides.pptx',
            file_type: 'pptx',
            file_size: 5242880,
            created_at: '2024-01-10T14:15:00Z',
            updated_at: '2024-01-10T14:15:00Z',
            upload_status: 'completed',
            owner: {
              id: 'user-2',
              full_name: 'Jane Doe',
              avatar_url: 'https://example.com/avatar.jpg'
            },
            vault: {
              id: 'vault-1',
              name: 'Shared Vault'
            }
          }
        ]
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the assets step with correct title and description', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('Include Assets')).toBeInTheDocument();
      expect(screen.getByText('Select documents and files to include in your vault')).toBeInTheDocument();
    });

    it('renders search input and filter controls', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue('All Assets')).toBeInTheDocument();
      expect(screen.getByText('Upload New')).toBeInTheDocument();
    });

    it('shows loading state while fetching assets', () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      // Should show skeleton loading cards initially
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(6);
    });

    it('renders assets list after loading', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
        expect(screen.getByText('Board Meeting Slides.pptx')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Loading and Display', () => {
    it('fetches assets from API on mount', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/assets');
      });
    });

    it('handles API error gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('No assets yet')).toBeInTheDocument();
      });
    });

    it('displays correct file type icons and badges', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('PDF')).toBeInTheDocument();
        expect(screen.getByText('PPTX')).toBeInTheDocument();
      });
    });

    it('shows file sizes in readable format', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('2.0 MB')).toBeInTheDocument();
        expect(screen.getByText('5.0 MB')).toBeInTheDocument();
      });
    });

    it('displays owner information correctly', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });
    });

    it('shows vault info for shared assets', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('From vault: Shared Vault')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Selection', () => {
    it('allows selecting individual assets', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[1]; // First asset checkbox (second overall)
      await user.click(checkbox);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        selectedAssets: [{
          id: 'asset-1',
          name: 'Financial Report Q4.pdf',
          file_type: 'pdf',
          file_size: 2048576,
          created_at: '2024-01-15T10:30:00Z'
        }]
      });
    });

    it('allows deselecting assets', async () => {
      const dataWithSelection = {
        ...defaultData,
        selectedAssets: [{
          id: 'asset-1',
          name: 'Financial Report Q4.pdf',
          file_type: 'pdf',
          file_size: 2048576,
          created_at: '2024-01-15T10:30:00Z'
        }]
      };

      render(<AssetsStep data={dataWithSelection} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const checkbox = screen.getAllByRole('checkbox')[1];
      await user.click(checkbox);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        selectedAssets: []
      });
    });

    it('shows select all checkbox and functionality', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Select all/)).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getByLabelText(/Select all/);
      await user.click(selectAllCheckbox);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        selectedAssets: [
          {
            id: 'asset-1',
            name: 'Financial Report Q4.pdf',
            file_type: 'pdf',
            file_size: 2048576,
            created_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 'asset-2',
            name: 'Board Meeting Slides.pptx',
            file_type: 'pptx',
            file_size: 5242880,
            created_at: '2024-01-10T14:15:00Z'
          }
        ]
      });
    });

    it('shows selection summary when assets are selected', async () => {
      const dataWithSelection = {
        ...defaultData,
        selectedAssets: [{
          id: 'asset-1',
          name: 'Financial Report Q4.pdf',
          file_type: 'pdf',
          file_size: 2048576,
          created_at: '2024-01-15T10:30:00Z'
        }]
      };

      render(<AssetsStep data={dataWithSelection} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('1 asset selected')).toBeInTheDocument();
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('allows clearing all selections', async () => {
      const dataWithSelection = {
        ...defaultData,
        selectedAssets: [
          {
            id: 'asset-1',
            name: 'Financial Report Q4.pdf',
            file_type: 'pdf',
            file_size: 2048576,
            created_at: '2024-01-15T10:30:00Z'
          }
        ]
      };

      render(<AssetsStep data={dataWithSelection} onUpdate={mockOnUpdate} />);

      const clearButton = screen.getByText('Clear all');
      await user.click(clearButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        selectedAssets: []
      });
    });
  });

  describe('Search and Filtering', () => {
    it('filters assets based on search term', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search assets...');
      await user.type(searchInput, 'Financial');

      expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      expect(screen.queryByText('Board Meeting Slides.pptx')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search assets...');
      await user.type(searchInput, 'NonExistentFile');

      expect(screen.getByText('No assets found')).toBeInTheDocument();
      expect(screen.getByText('No assets match "NonExistentFile"')).toBeInTheDocument();
    });

    it('filters by asset type (My Assets, Shared with Me)', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const filterSelect = screen.getByDisplayValue('All Assets');
      await user.selectOptions(filterSelect, 'shared');

      // Should show only shared assets (those with vault info)
      expect(screen.getByText('Board Meeting Slides.pptx')).toBeInTheDocument();
    });
  });

  describe('Upload Modal', () => {
    it('opens upload modal when Upload New button is clicked', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      const uploadButton = screen.getByText('Upload New');
      await user.click(uploadButton);

      expect(screen.getByText('Upload Assets to Vault')).toBeInTheDocument();
      expect(screen.getByTestId('file-upload-dropzone')).toBeInTheDocument();
    });

    it('shows upload modal with correct organization context', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      const uploadButton = screen.getByText('Upload New');
      await user.click(uploadButton);

      expect(screen.getByText('Organization ID: org-1')).toBeInTheDocument();
      expect(screen.getByText('User: Current User')).toBeInTheDocument();
    });

    it('shows organization required message when no organization selected', async () => {
      const dataWithoutOrg = { ...defaultData, selectedOrganization: null };
      render(<AssetsStep data={dataWithoutOrg} onUpdate={mockOnUpdate} />);

      const uploadButton = screen.getByText('Upload New');
      await user.click(uploadButton);

      expect(screen.getByText('Organization Required')).toBeInTheDocument();
      expect(screen.getByText('Please select an organization first before uploading assets.')).toBeInTheDocument();
    });

    it('closes upload modal when X button is clicked', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      const uploadButton = screen.getByText('Upload New');
      await user.click(uploadButton);

      expect(screen.getByText('Upload Assets to Vault')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(closeButton);

      expect(screen.queryByText('Upload Assets to Vault')).not.toBeInTheDocument();
    });

    it('handles upload completion correctly', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      const uploadButton = screen.getByText('Upload New');
      await user.click(uploadButton);

      const completeButton = screen.getByTestId('mock-upload-complete');
      await user.click(completeButton);

      // Should close modal
      expect(screen.queryByText('Upload Assets to Vault')).not.toBeInTheDocument();
      
      // Should refresh assets (new API call)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial load + refresh
      });
    });
  });

  describe('Selected Assets Preview', () => {
    it('shows selected assets preview section', () => {
      const dataWithSelection = {
        ...defaultData,
        selectedAssets: [
          {
            id: 'asset-1',
            name: 'Financial Report Q4.pdf',
            file_type: 'pdf',
            file_size: 2048576,
            created_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 'asset-2',
            name: 'Board Meeting Slides.pptx',
            file_type: 'pptx',
            file_size: 5242880,
            created_at: '2024-01-10T14:15:00Z'
          }
        ]
      };

      render(<AssetsStep data={dataWithSelection} onUpdate={mockOnUpdate} />);

      expect(screen.getByText('Selected Assets (2)')).toBeInTheDocument();
      expect(screen.getByText('Total size: 7.0 MB')).toBeInTheDocument();
      expect(screen.getByText('2 assets ready for vault')).toBeInTheDocument();
    });

    it('allows removing assets from selected preview', async () => {
      const dataWithSelection = {
        ...defaultData,
        selectedAssets: [
          {
            id: 'asset-1',
            name: 'Financial Report Q4.pdf',
            file_type: 'pdf',
            file_size: 2048576,
            created_at: '2024-01-15T10:30:00Z'
          }
        ]
      };

      render(<AssetsStep data={dataWithSelection} onUpdate={mockOnUpdate} />);

      const removeButton = screen.getAllByRole('button').find(
        button => button.querySelector('svg') // X icon button
      );
      
      if (removeButton) {
        await user.click(removeButton);
      }

      expect(mockOnUpdate).toHaveBeenCalledWith({
        selectedAssets: []
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state when no assets exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          assets: []
        })
      });

      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('No assets yet')).toBeInTheDocument();
        expect(screen.getByText('Upload your first document to get started')).toBeInTheDocument();
      });

      // Should have Upload Asset button in empty state
      expect(screen.getByText('Upload Asset')).toBeInTheDocument();
    });

    it('shows filtered empty state when search has no results', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search assets...');
      await user.type(searchInput, 'NonExistent');

      expect(screen.getByText('No assets found')).toBeInTheDocument();
      expect(screen.getByText('No assets match "NonExistent"')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for checkboxes', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Select all/)).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('has proper keyboard navigation', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      const uploadButton = screen.getByText('Upload New');
      uploadButton.focus();
      expect(document.activeElement).toBe(uploadButton);

      fireEvent.keyDown(uploadButton, { key: 'Enter' });
      expect(screen.getByText('Upload Assets to Vault')).toBeInTheDocument();
    });

    it('has proper form labels and descriptions', () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('All Assets')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('debounces search input to prevent excessive API calls', async () => {
      render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Financial Report Q4.pdf')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search assets...');
      
      // Type multiple characters quickly
      await user.type(searchInput, 'Financial', { delay: 10 });

      // Should only trigger once after typing stops
      expect(searchInput).toHaveValue('Financial');
    });

    it('handles large numbers of assets efficiently', async () => {
      const manyAssets = Array.from({ length: 100 }, (_, i) => ({
        id: `asset-${i}`,
        name: `Document ${i}.pdf`,
        file_type: 'pdf',
        file_size: 1024 * i,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        upload_status: 'completed',
        owner: {
          id: 'user-1',
          full_name: 'Test User',
          avatar_url: null
        },
        vault: null
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          assets: manyAssets
        })
      });

      const { container } = render(<AssetsStep data={defaultData} onUpdate={mockOnUpdate} />);

      await waitFor(() => {
        expect(screen.getByText('Document 0.pdf')).toBeInTheDocument();
      });

      // Should render efficiently without performance issues
      expect(container.querySelectorAll('[class*="grid"]')).toHaveLength(1);
    });
  });
});