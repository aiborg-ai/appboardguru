/**
 * Comprehensive Unit Tests for ActionsStep
 * Tests save to vault, asset creation, sharing options, and export functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import ActionsStep from '@/features/instruments/steps/ActionsStep';

// Mock the hooks and services
jest.mock('@/hooks/useVaults', () => ({
  useVaults: () => ({
    vaults: [
      { id: '1', name: 'Board Documents', description: 'Main board vault', itemCount: 25 },
      { id: '2', name: 'Financial Reports', description: 'Financial documents', itemCount: 12 },
      { id: '3', name: 'Strategic Planning', description: 'Strategy documents', itemCount: 8 }
    ],
    isLoading: false,
    createVault: jest.fn()
  })
}));

jest.mock('@/hooks/useBoardMates', () => ({
  useBoardMates: () => ({
    boardMates: [
      { id: '1', name: 'John Smith', email: 'john@example.com', role: 'Director' },
      { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'CFO' },
      { id: '3', name: 'Michael Brown', email: 'michael@example.com', role: 'Chairman' }
    ],
    isLoading: false
  })
}));

const mockAnalysisResults = {
  insights: [
    {
      id: 'insight-1',
      type: 'summary',
      title: 'Executive Summary',
      content: 'Strong Q1 performance with 15% revenue growth.'
    }
  ],
  charts: [
    {
      id: 'chart-1',
      type: 'bar',
      title: 'Revenue Growth',
      data: { labels: ['Q1', 'Q2'], datasets: [{ data: [100, 115] }] }
    }
  ],
  recommendations: [
    {
      id: 'rec-1',
      title: 'Cash Flow Management',
      description: 'Implement monthly monitoring.',
      priority: 'high'
    }
  ]
};

const defaultProps = {
  instrumentConfig: {
    id: 'board-pack-ai',
    name: 'Board Pack AI'
  },
  analysisResults: mockAnalysisResults,
  saveOptions: {
    saveToVault: { enabled: false, vaultId: '', vaultName: '' },
    saveAsAsset: { enabled: false, assetName: '', assetCategory: '', assetTags: [] },
    shareOptions: { enabled: false, shareWithBoardMates: false, generatePublicLink: false, emailRecipients: [] },
    exportOptions: { pdf: false, excel: false, powerpoint: false, json: false }
  },
  onSaveOptionsChange: jest.fn(),
  onValidationChange: jest.fn(),
  onDataChange: jest.fn(),
  onPreviewResults: jest.fn(),
  isProcessing: false
};

describe('ActionsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Save to Vault Options', () => {
    test('renders save to vault section', () => {
      render(<ActionsStep {...defaultProps} />);
      
      expect(screen.getByText(/save to vault/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /save results to vault/i })).toBeInTheDocument();
    });

    test('enables vault selection when save to vault is checked', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      render(<ActionsStep {...defaultProps} onSaveOptionsChange={onSaveOptionsChange} />);
      
      await user.click(screen.getByRole('checkbox', { name: /save results to vault/i }));
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          saveToVault: expect.objectContaining({ enabled: true })
        })
      );
      
      await waitFor(() => {
        expect(screen.getByText(/select vault/i)).toBeInTheDocument();
      });
    });

    test('displays available vaults in dropdown', async () => {
      const user = userEvent.setup();
      
      const saveToVaultEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveToVault: { enabled: true, vaultId: '', vaultName: '' }
        }
      };
      
      render(<ActionsStep {...saveToVaultEnabled} />);
      
      await user.click(screen.getByRole('combobox', { name: /select vault/i }));
      
      expect(screen.getByText('Board Documents')).toBeInTheDocument();
      expect(screen.getByText('Financial Reports')).toBeInTheDocument();
      expect(screen.getByText('Strategic Planning')).toBeInTheDocument();
    });

    test('shows vault details when selected', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      const saveToVaultEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveToVault: { enabled: true, vaultId: '', vaultName: '' }
        },
        onSaveOptionsChange
      };
      
      render(<ActionsStep {...saveToVaultEnabled} />);
      
      await user.click(screen.getByRole('combobox', { name: /select vault/i }));
      await user.click(screen.getByText('Board Documents'));
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          saveToVault: expect.objectContaining({
            vaultId: '1',
            vaultName: 'Board Documents'
          })
        })
      );
      
      expect(screen.getByText('25 items')).toBeInTheDocument();
      expect(screen.getByText('Main board vault')).toBeInTheDocument();
    });

    test('allows creating new vault', async () => {
      const user = userEvent.setup();
      
      const saveToVaultEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveToVault: { enabled: true, vaultId: '', vaultName: '' }
        }
      };
      
      render(<ActionsStep {...saveToVaultEnabled} />);
      
      await user.click(screen.getByRole('combobox', { name: /select vault/i }));
      await user.click(screen.getByText(/create new vault/i));
      
      expect(screen.getByTestId('new-vault-form')).toBeInTheDocument();
      
      await user.type(screen.getByLabelText(/vault name/i), 'Analysis Results');
      await user.type(screen.getByLabelText(/description/i), 'Analysis outputs from instruments');
      
      await user.click(screen.getByText(/create vault/i));
      
      await waitFor(() => {
        expect(screen.getByText(/vault created successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Save as Asset Options', () => {
    test('renders save as asset section', () => {
      render(<ActionsStep {...defaultProps} />);
      
      expect(screen.getByText(/save as asset/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /save as new asset/i })).toBeInTheDocument();
    });

    test('shows asset creation form when enabled', async () => {
      const user = userEvent.setup();
      
      render(<ActionsStep {...defaultProps} />);
      
      await user.click(screen.getByRole('checkbox', { name: /save as new asset/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/asset name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
      });
    });

    test('validates asset name input', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      const saveAsAssetEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveAsAsset: { enabled: true, assetName: '', assetCategory: '', assetTags: [] }
        },
        onValidationChange
      };
      
      render(<ActionsStep {...saveAsAssetEnabled} />);
      
      // Should be invalid without asset name
      expect(onValidationChange).toHaveBeenCalledWith(false);
      
      await user.type(screen.getByLabelText(/asset name/i), 'Board Pack Analysis Results');
      
      // Should become valid with asset name
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    test('provides default asset name based on analysis', () => {
      const saveAsAssetEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveAsAsset: { enabled: true, assetName: '', assetCategory: '', assetTags: [] }
        }
      };
      
      render(<ActionsStep {...saveAsAssetEnabled} />);
      
      const assetNameInput = screen.getByLabelText(/asset name/i);
      expect(assetNameInput).toHaveValue('Board Pack AI Analysis Results');
    });

    test('allows tag management', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      const saveAsAssetEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveAsAsset: { enabled: true, assetName: 'Test Asset', assetCategory: '', assetTags: [] }
        },
        onSaveOptionsChange
      };
      
      render(<ActionsStep {...saveAsAssetEnabled} />);
      
      const tagInput = screen.getByLabelText(/tags/i);
      await user.type(tagInput, 'analysis{enter}');
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAsAsset: expect.objectContaining({
            assetTags: ['analysis']
          })
        })
      );
      
      expect(screen.getByTestId('tag-analysis')).toBeInTheDocument();
    });

    test('removes tags when clicked', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      const saveAsAssetWithTags = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveAsAsset: { enabled: true, assetName: 'Test Asset', assetCategory: '', assetTags: ['analysis', 'q1'] }
        },
        onSaveOptionsChange
      };
      
      render(<ActionsStep {...saveAsAssetWithTags} />);
      
      await user.click(screen.getByTestId('remove-tag-analysis'));
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          saveAsAsset: expect.objectContaining({
            assetTags: ['q1']
          })
        })
      );
    });
  });

  describe('Share Options', () => {
    test('renders sharing section', () => {
      render(<ActionsStep {...defaultProps} />);
      
      expect(screen.getByText(/share results/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /enable sharing/i })).toBeInTheDocument();
    });

    test('shows sharing options when enabled', async () => {
      const user = userEvent.setup();
      
      render(<ActionsStep {...defaultProps} />);
      
      await user.click(screen.getByRole('checkbox', { name: /enable sharing/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/share with board mates/i)).toBeInTheDocument();
        expect(screen.getByText(/generate public link/i)).toBeInTheDocument();
        expect(screen.getByText(/email recipients/i)).toBeInTheDocument();
      });
    });

    test('displays board mates for sharing', async () => {
      const user = userEvent.setup();
      
      const sharingEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          shareOptions: { enabled: true, shareWithBoardMates: false, generatePublicLink: false, emailRecipients: [] }
        }
      };
      
      render(<ActionsStep {...sharingEnabled} />);
      
      await user.click(screen.getByRole('checkbox', { name: /share with board mates/i }));
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Michael Brown')).toBeInTheDocument();
    });

    test('allows selecting specific board mates', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      const sharingEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          shareOptions: { enabled: true, shareWithBoardMates: true, generatePublicLink: false, emailRecipients: [] }
        },
        onSaveOptionsChange
      };
      
      render(<ActionsStep {...sharingEnabled} />);
      
      await user.click(screen.getByTestId('boardmate-checkbox-1'));
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          shareOptions: expect.objectContaining({
            selectedBoardMates: expect.arrayContaining(['1'])
          })
        })
      );
    });

    test('handles email recipient input', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      const sharingEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          shareOptions: { enabled: true, shareWithBoardMates: false, generatePublicLink: false, emailRecipients: [] }
        },
        onSaveOptionsChange
      };
      
      render(<ActionsStep {...sharingEnabled} />);
      
      const emailInput = screen.getByLabelText(/email recipients/i);
      await user.type(emailInput, 'external@example.com{enter}');
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          shareOptions: expect.objectContaining({
            emailRecipients: ['external@example.com']
          })
        })
      );
    });

    test('validates email format', async () => {
      const user = userEvent.setup();
      
      const sharingEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          shareOptions: { enabled: true, shareWithBoardMates: false, generatePublicLink: false, emailRecipients: [] }
        }
      };
      
      render(<ActionsStep {...sharingEnabled} />);
      
      const emailInput = screen.getByLabelText(/email recipients/i);
      await user.type(emailInput, 'invalid-email{enter}');
      
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });

    test('generates public link preview', async () => {
      const user = userEvent.setup();
      
      const sharingEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          shareOptions: { enabled: true, shareWithBoardMates: false, generatePublicLink: true, emailRecipients: [] }
        }
      };
      
      render(<ActionsStep {...sharingEnabled} />);
      
      expect(screen.getByText(/public link will be generated/i)).toBeInTheDocument();
      expect(screen.getByText(/example\.com\/shared\/analysis/i)).toBeInTheDocument();
    });
  });

  describe('Export Options', () => {
    test('renders export section', () => {
      render(<ActionsStep {...defaultProps} />);
      
      expect(screen.getByText(/export formats/i)).toBeInTheDocument();
      expect(screen.getByText(/pdf report/i)).toBeInTheDocument();
      expect(screen.getByText(/excel spreadsheet/i)).toBeInTheDocument();
      expect(screen.getByText(/powerpoint presentation/i)).toBeInTheDocument();
      expect(screen.getByText(/json data/i)).toBeInTheDocument();
    });

    test('toggles export format selection', async () => {
      const user = userEvent.setup();
      const onSaveOptionsChange = jest.fn();
      
      render(<ActionsStep {...defaultProps} onSaveOptionsChange={onSaveOptionsChange} />);
      
      await user.click(screen.getByRole('checkbox', { name: /pdf report/i }));
      
      expect(onSaveOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          exportOptions: expect.objectContaining({
            pdf: true
          })
        })
      );
    });

    test('shows export preview for selected formats', async () => {
      const user = userEvent.setup();
      
      const exportEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          exportOptions: { pdf: true, excel: false, powerpoint: false, json: false }
        }
      };
      
      render(<ActionsStep {...exportEnabled} />);
      
      expect(screen.getByTestId('export-preview-pdf')).toBeInTheDocument();
      expect(screen.getByText(/pdf report preview/i)).toBeInTheDocument();
    });

    test('allows custom export settings', async () => {
      const user = userEvent.setup();
      
      const exportEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          exportOptions: { pdf: true, excel: false, powerpoint: false, json: false }
        }
      };
      
      render(<ActionsStep {...exportEnabled} />);
      
      await user.click(screen.getByText(/customize pdf/i));
      
      expect(screen.getByTestId('pdf-settings-modal')).toBeInTheDocument();
      expect(screen.getByLabelText(/include charts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/include recommendations/i)).toBeInTheDocument();
    });
  });

  describe('Results Preview', () => {
    test('shows preview button', () => {
      render(<ActionsStep {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /preview results/i })).toBeInTheDocument();
    });

    test('opens preview modal', async () => {
      const user = userEvent.setup();
      const onPreviewResults = jest.fn();
      
      render(<ActionsStep {...defaultProps} onPreviewResults={onPreviewResults} />);
      
      await user.click(screen.getByRole('button', { name: /preview results/i }));
      
      expect(onPreviewResults).toHaveBeenCalled();
    });

    test('displays analysis summary in preview', () => {
      const withPreview = {
        ...defaultProps,
        showPreview: true
      };
      
      render(<ActionsStep {...withPreview} />);
      
      expect(screen.getByText(/preview: analysis results/i)).toBeInTheDocument();
      expect(screen.getByText('Executive Summary')).toBeInTheDocument();
      expect(screen.getByText('Cash Flow Management')).toBeInTheDocument();
    });
  });

  describe('Validation Logic', () => {
    test('validates that at least one action is selected', () => {
      const onValidationChange = jest.fn();
      
      render(<ActionsStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      // Should be invalid with no actions selected
      expect(onValidationChange).toHaveBeenCalledWith(false);
    });

    test('becomes valid when any action is enabled', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<ActionsStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      await user.click(screen.getByRole('checkbox', { name: /pdf report/i }));
      
      // Should become valid with export option selected
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });

    test('validates required fields for enabled actions', async () => {
      const user = userEvent.setup();
      const onValidationChange = jest.fn();
      
      render(<ActionsStep {...defaultProps} onValidationChange={onValidationChange} />);
      
      // Enable save as asset without name
      await user.click(screen.getByRole('checkbox', { name: /save as new asset/i }));
      
      // Should be invalid without asset name
      expect(onValidationChange).toHaveBeenCalledWith(false);
      
      await user.type(screen.getByLabelText(/asset name/i), 'Test Asset');
      
      // Should become valid with asset name
      expect(onValidationChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Processing State', () => {
    test('shows processing state when isProcessing is true', () => {
      render(<ActionsStep {...defaultProps} isProcessing={true} />);
      
      expect(screen.getByTestId('processing-indicator')).toBeInTheDocument();
      expect(screen.getByText(/processing your request/i)).toBeInTheDocument();
    });

    test('disables form inputs during processing', () => {
      render(<ActionsStep {...defaultProps} isProcessing={true} />);
      
      expect(screen.getByRole('checkbox', { name: /save results to vault/i })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: /save as new asset/i })).toBeDisabled();
      expect(screen.getByRole('checkbox', { name: /enable sharing/i })).toBeDisabled();
    });

    test('shows progress for different processing stages', () => {
      const processingWithStage = {
        ...defaultProps,
        isProcessing: true,
        processingStage: 'saving-to-vault'
      };
      
      render(<ActionsStep {...processingWithStage} />);
      
      expect(screen.getByText(/saving to vault/i)).toBeInTheDocument();
      expect(screen.getByTestId('processing-progress')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels and structure', () => {
      render(<ActionsStep {...defaultProps} />);
      
      expect(screen.getByRole('group', { name: /save options/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /sharing options/i })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: /export options/i })).toBeInTheDocument();
    });

    test('announces validation errors', async () => {
      const user = userEvent.setup();
      
      render(<ActionsStep {...defaultProps} />);
      
      await user.click(screen.getByRole('checkbox', { name: /save as new asset/i }));
      
      expect(screen.getByRole('alert')).toHaveTextContent(/asset name is required/i);
    });

    test('supports keyboard navigation between sections', async () => {
      const user = userEvent.setup();
      
      render(<ActionsStep {...defaultProps} />);
      
      // Tab through form sections
      await user.tab();
      expect(screen.getByRole('checkbox', { name: /save results to vault/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('checkbox', { name: /save as new asset/i })).toHaveFocus();
    });

    test('has proper ARIA attributes for dynamic content', async () => {
      const user = userEvent.setup();
      
      render(<ActionsStep {...defaultProps} />);
      
      await user.click(screen.getByRole('checkbox', { name: /save results to vault/i }));
      
      const vaultSection = screen.getByTestId('vault-selection-section');
      expect(vaultSection).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Error Handling', () => {
    test('handles vault creation errors', async () => {
      const user = userEvent.setup();
      
      // Mock failed vault creation
      const mockCreateVault = jest.fn().mockRejectedValue(new Error('Failed to create vault'));
      
      const saveToVaultEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          saveToVault: { enabled: true, vaultId: '', vaultName: '' }
        }
      };
      
      render(<ActionsStep {...saveToVaultEnabled} />);
      
      await user.click(screen.getByRole('combobox', { name: /select vault/i }));
      await user.click(screen.getByText(/create new vault/i));
      
      await user.type(screen.getByLabelText(/vault name/i), 'Test Vault');
      await user.click(screen.getByText(/create vault/i));
      
      await waitFor(() => {
        expect(screen.getByText(/failed to create vault/i)).toBeInTheDocument();
      });
    });

    test('recovers from sharing service errors', async () => {
      const user = userEvent.setup();
      
      const sharingEnabled = {
        ...defaultProps,
        saveOptions: {
          ...defaultProps.saveOptions,
          shareOptions: { enabled: true, shareWithBoardMates: false, generatePublicLink: true, emailRecipients: [] }
        }
      };
      
      render(<ActionsStep {...sharingEnabled} />);
      
      // Simulate service error
      expect(screen.getByText(/public link generation may fail/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
    });

    test('handles export format limitations', () => {
      const limitedResults = {
        ...defaultProps,
        analysisResults: {
          ...mockAnalysisResults,
          charts: [] // No charts available
        }
      };
      
      render(<ActionsStep {...limitedResults} />);
      
      const powerpointCheckbox = screen.getByRole('checkbox', { name: /powerpoint presentation/i });
      expect(powerpointCheckbox).toBeDisabled();
      expect(screen.getByText(/no charts available for powerpoint/i)).toBeInTheDocument();
    });
  });
});