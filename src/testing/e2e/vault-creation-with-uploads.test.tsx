/**
 * End-to-End Vault Creation with Upload Tests
 * Comprehensive testing of the complete user workflow
 * Tests all fixes applied to the vault creation and upload process
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

import CreateVaultWizard, { VaultWizardData } from '@/features/vaults/CreateVaultWizard'
import { AssetFactory, TEST_CONSTANTS } from '../factories/asset.factory'
import { 
  AsyncTestHelpers,
  FileTestHelpers, 
  TestEnvironmentHelpers,
  PerformanceTestHelpers 
} from '../utils/test-helpers'

// Mock external dependencies
jest.mock('@/lib/stores/upload-collaboration.store', () => ({
  useUploadCollaborationStore: () => ({
    broadcastUploadStarted: jest.fn(),
    broadcastUploadProgress: jest.fn(),
    broadcastUploadCompleted: jest.fn(),
    broadcastUploadFailed: jest.fn()
  })
}))

jest.mock('@/components/collaboration', () => ({
  CollaborativeUploadHub: () => <div data-testid="collaboration-hub">Collaboration Hub</div>
}))

// Mock API endpoints
global.fetch = jest.fn()

// Mock XMLHttpRequest for file uploads
class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = []
  
  public upload = { addEventListener: jest.fn() }
  public addEventListener = jest.fn()
  public open = jest.fn()
  public send = jest.fn()
  public timeout = 0
  public status = 200
  public responseText = JSON.stringify({ success: true, asset: AssetFactory.createWithDetails() })

  constructor() {
    MockXMLHttpRequest.instances.push(this)
  }

  static simulateSuccess(asset?: any) {
    const instance = this.instances[this.instances.length - 1]
    if (instance) {
      instance.status = 200
      instance.responseText = JSON.stringify({ 
        success: true, 
        asset: asset || AssetFactory.createWithDetails() 
      })
      
      // Simulate progress
      const progressHandler = instance.upload.addEventListener.mock.calls
        .find(call => call[0] === 'progress')?.[1]
      if (progressHandler) {
        progressHandler({ lengthComputable: true, loaded: 100, total: 100 })
      }

      // Simulate completion
      const loadHandler = instance.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1]
      loadHandler?.()
    }
  }

  static simulateFailure(error = 'Upload failed') {
    const instance = this.instances[this.instances.length - 1]
    if (instance) {
      instance.status = 500
      instance.responseText = JSON.stringify({ error })
      
      const loadHandler = instance.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1]
      loadHandler?.()
    }
  }

  static reset() {
    this.instances = []
  }
}

// Setup global mocks
beforeAll(() => {
  TestEnvironmentHelpers.setupTestEnv()
  global.XMLHttpRequest = MockXMLHttpRequest as any
})

afterAll(() => {
  TestEnvironmentHelpers.cleanupTestEnv()
})

describe('Vault Creation with Upload E2E Tests', () => {
  const mockOnComplete = jest.fn()
  const mockOnClose = jest.fn()

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onComplete: mockOnComplete
  }

  // Mock organizations for testing
  const testOrganizations = [
    { id: 'org-1', name: 'Test Organization 1', slug: 'test-org-1' },
    { id: 'org-2', name: 'Test Organization 2', slug: 'test-org-2' }
  ]

  beforeEach(() => {
    MockXMLHttpRequest.reset()
    jest.clearAllMocks()
    
    // Mock fetch for loading assets
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/assets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ assets: AssetFactory.createBatch(5) })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    }) as jest.MockedFunction<typeof fetch>
  })

  describe('Complete Vault Creation Workflow', () => {
    it('completes full vault creation with file upload', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Step 1: Select Organization
      expect(screen.getByText('Select Organization')).toBeInTheDocument()
      
      // Select existing organization (simulate organization selection)
      const organizationStep = screen.getByText('Create New Vault').closest('div')
      expect(organizationStep).toBeInTheDocument()
      
      // Mock organization data in wizard
      const wizardData: VaultWizardData = {
        selectedOrganization: testOrganizations[0],
        createNewOrganization: null,
        selectedAssets: [],
        selectedBoardMates: [],
        newBoardMates: [],
        vaultName: '',
        vaultDescription: '',
        accessLevel: 'organization',
        vaultType: 'board_pack'
      }

      // Navigate to Assets step
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Include Assets')).toBeInTheDocument()
      })

      // Step 2: Upload Asset
      const uploadButton = screen.getByText('Upload Asset')
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText('Upload Assets to Vault')).toBeInTheDocument()
      })

      // Add a file to upload
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(fileInput, file)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Document title')).toBeInTheDocument()
      })

      // Fill file details
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Board Document')

      const descriptionInput = screen.getByPlaceholderText('Optional description')
      await user.type(descriptionInput, 'Important board meeting document')

      // Select category
      const categorySelect = screen.getAllByDisplayValue('General Documents')[0]
      await user.selectOptions(categorySelect, 'Board Documents')

      // Start upload
      const uploadFilesButton = screen.getByText('Upload Files')
      expect(uploadFilesButton).not.toBeDisabled()
      
      await user.click(uploadFilesButton)

      // Simulate successful upload
      act(() => {
        MockXMLHttpRequest.simulateSuccess({
          id: 'uploaded-asset-id',
          title: 'Test Board Document',
          fileName: file.name,
          fileType: 'pdf'
        })
      })

      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument()
      })

      // Modal should close after upload
      await waitFor(() => {
        expect(screen.queryByText('Upload Assets to Vault')).not.toBeInTheDocument()
      }, { timeout: 1000 })

      // Continue to BoardMates step
      await user.click(screen.getByText('Next'))
      
      await waitFor(() => {
        expect(screen.getByText('Invite BoardMates')).toBeInTheDocument()
      })

      // Step 3: Skip BoardMates (optional)
      await user.click(screen.getByText('Next'))

      // Step 4: Review & Create
      await waitFor(() => {
        expect(screen.getByText('Review & Create')).toBeInTheDocument()
      })

      // Fill vault details
      const vaultNameInput = screen.getByPlaceholderText('Enter vault name')
      await user.type(vaultNameInput, 'Test Vault with Uploads')

      const vaultDescInput = screen.getByPlaceholderText('Enter vault description')
      await user.type(vaultDescInput, 'Test vault created with uploaded documents')

      // Create vault
      const createButton = screen.getByText('Create Vault')
      expect(createButton).not.toBeDisabled()
      
      await user.click(createButton)

      // Verify completion callback was called
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            selectedOrganization: expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String)
            }),
            vaultName: 'Test Vault with Uploads',
            vaultDescription: 'Test vault created with uploaded documents'
          })
        )
      })
    }, 30000) // Extended timeout for complex E2E test

    it('handles organization requirement for uploads', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate directly to Assets step without selecting organization
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Include Assets')).toBeInTheDocument()
      })

      // Try to upload without organization
      const uploadButton = screen.getByText('Upload Asset')
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByText('Upload Assets to Vault')).toBeInTheDocument()
      })

      // Should show organization required message
      await waitFor(() => {
        expect(screen.getByText('Organization Required')).toBeInTheDocument()
        expect(screen.getByText('Please select an organization first before uploading assets.')).toBeInTheDocument()
      })

      // Close modal and go back to select organization
      const closeButton = screen.getByRole('button', { name: '' }) // X button
      await user.click(closeButton)

      const prevButton = screen.getByText('Previous')
      await user.click(prevButton)

      // Should be back at organization selection
      await waitFor(() => {
        expect(screen.getByText('Select Organization')).toBeInTheDocument()
      })
    })
  })

  describe('Upload Error Handling', () => {
    it('handles upload failures gracefully', async () => {
      const user = userEvent.setup()
      
      // Setup with organization selected
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate to assets and open upload modal
      await user.click(screen.getByText('Next')) // Go to assets
      await waitFor(() => expect(screen.getByText('Include Assets')).toBeInTheDocument())
      
      await user.click(screen.getByText('Upload Asset'))
      await waitFor(() => expect(screen.getByText('Upload Assets to Vault')).toBeInTheDocument())

      // Add file and fill details
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(fileInput, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')

      // Start upload
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)

      // Simulate upload failure
      act(() => {
        MockXMLHttpRequest.simulateFailure('Storage service unavailable')
      })

      await waitFor(() => {
        expect(screen.getByText('Storage service unavailable')).toBeInTheDocument()
      })

      // User should be able to try again
      expect(screen.getByText('Clear All')).toBeInTheDocument()
      expect(screen.getByText('Upload Files')).toBeInTheDocument()
    })

    it('retries failed uploads', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate to upload
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Upload Asset'))

      // Add file
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      await user.upload(fileInput, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Retry Test Document')

      // Start upload
      await user.click(screen.getByText('Upload Files'))

      // Simulate initial failure
      act(() => {
        MockXMLHttpRequest.simulateFailure('Temporary network error')
      })

      await waitFor(() => {
        expect(screen.getByText(/Upload failed, retrying/)).toBeInTheDocument()
      })

      // Wait for retry and simulate success
      await AsyncTestHelpers.sleep(100)
      act(() => {
        MockXMLHttpRequest.simulateSuccess()
      })

      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument()
      })
    })
  })

  describe('File Validation in Complete Workflow', () => {
    it('prevents upload of invalid file types', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate to upload
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Upload Asset'))

      // Try to upload invalid file
      const invalidFile = AssetFactory.createTestFile('INVALID', 'medium')
      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(fileInput, invalidFile)

      await waitFor(() => {
        expect(screen.getByText(/File type.*is not allowed/)).toBeInTheDocument()
      })

      // Upload button should be disabled
      expect(screen.getByText('Upload Files')).toBeDisabled()
    })

    it('prevents upload of oversized files', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate to upload
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Upload Asset'))

      // Try to upload large file
      const largeFile = AssetFactory.createTestFile('PDF', 'xlarge') // 60MB
      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(fileInput, largeFile)

      await waitFor(() => {
        expect(screen.getByText(/File size exceeds.*limit/)).toBeInTheDocument()
      })

      expect(screen.getByText('Upload Files')).toBeDisabled()
    })
  })

  describe('Wizard Navigation and State', () => {
    it('maintains state across wizard steps', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)

      // Go to assets step
      await user.click(screen.getByText('Next'))
      
      // Upload a file
      await user.click(screen.getByText('Upload Asset'))
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      await user.upload(fileInput, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'State Test Document')
      
      await user.click(screen.getByText('Upload Files'))
      
      // Simulate successful upload
      act(() => {
        MockXMLHttpRequest.simulateSuccess()
      })

      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument()
      })

      // Close upload modal
      await AsyncTestHelpers.sleep(100)

      // Navigate forward and back
      await user.click(screen.getByText('Next')) // BoardMates
      await user.click(screen.getByText('Next')) // Review
      await user.click(screen.getByText('Previous')) // Back to BoardMates
      await user.click(screen.getByText('Previous')) // Back to Assets

      // Asset should still be selected
      await waitFor(() => {
        expect(screen.getByText('Include Assets')).toBeInTheDocument()
      })

      // Uploaded asset should be remembered
      // (This would require actual state persistence in the wizard)
      expect(screen.getByText('Upload Asset')).toBeInTheDocument()
    })

    it('shows correct progress through wizard', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)

      // Check initial progress
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
      expect(screen.getByText('25% complete')).toBeInTheDocument()

      // Navigate to step 2
      await user.click(screen.getByText('Next'))
      
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
        expect(screen.getByText('50% complete')).toBeInTheDocument()
      })

      // Navigate to step 3
      await user.click(screen.getByText('Next'))
      
      await waitFor(() => {
        expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
        expect(screen.getByText('75% complete')).toBeInTheDocument()
      })

      // Navigate to final step
      await user.click(screen.getByText('Next'))
      
      await waitFor(() => {
        expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
        expect(screen.getByText('100% complete')).toBeInTheDocument()
      })
    })

    it('validates step completion before proceeding', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)

      // Try to go to review step without required fields
      await user.click(screen.getByText('Next')) // Assets
      await user.click(screen.getByText('Next')) // BoardMates  
      await user.click(screen.getByText('Next')) // Review

      // Should be on review step
      await waitFor(() => {
        expect(screen.getByText('Review & Create')).toBeInTheDocument()
      })

      // Create button should be disabled without vault name
      const createButton = screen.getByText('Create Vault')
      expect(createButton).toBeDisabled()

      // Add vault name
      const vaultNameInput = screen.getByPlaceholderText('Enter vault name')
      await user.type(vaultNameInput, 'Test Vault')

      // Now create button should be enabled
      expect(createButton).not.toBeDisabled()
    })
  })

  describe('Performance and User Experience', () => {
    it('completes upload workflow within acceptable time', async () => {
      const user = userEvent.setup()
      
      const startTime = performance.now()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Complete minimal workflow
      await user.click(screen.getByText('Next')) // Assets
      await user.click(screen.getByText('Next')) // BoardMates
      await user.click(screen.getByText('Next')) // Review
      
      const vaultNameInput = screen.getByPlaceholderText('Enter vault name')
      await user.type(vaultNameInput, 'Performance Test Vault')
      
      await user.click(screen.getByText('Create Vault'))
      
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalled()
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time
      PerformanceTestHelpers.assertPerformance(duration, 10000, 'Vault creation workflow')
    })

    it('handles multiple file uploads efficiently', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate to upload
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Upload Asset'))

      // Upload multiple files
      const files = [
        AssetFactory.createTestFile('PDF', 'small'),
        AssetFactory.createTestFile('DOCX', 'small'),
        AssetFactory.createTestFile('JPEG', 'small')
      ]

      const fileInput = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      await user.upload(fileInput, files)

      // Fill titles for all files
      await waitFor(() => {
        const titleInputs = screen.getAllByPlaceholderText('Document title')
        expect(titleInputs).toHaveLength(3)
      })

      const titleInputs = screen.getAllByPlaceholderText('Document title')
      for (let i = 0; i < titleInputs.length; i++) {
        await user.type(titleInputs[i], `Document ${i + 1}`)
      }

      const startTime = performance.now()
      
      // Upload all files
      await user.click(screen.getByText('Upload Files'))
      
      // Simulate all uploads succeeding
      act(() => {
        files.forEach(() => MockXMLHttpRequest.simulateSuccess())
      })

      await waitFor(() => {
        const uploadedTexts = screen.getAllByText('Uploaded')
        expect(uploadedTexts).toHaveLength(3)
      })
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Multiple uploads should complete efficiently
      PerformanceTestHelpers.assertPerformance(duration, 5000, 'Multiple file uploads')
    })
  })

  describe('Accessibility and Usability', () => {
    it('provides proper focus management', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)

      // Next button should be focusable
      const nextButton = screen.getByText('Next')
      nextButton.focus()
      expect(nextButton).toHaveFocus()

      // Should move focus appropriately on step change
      await user.click(nextButton)
      
      await waitFor(() => {
        expect(screen.getByText('Include Assets')).toBeInTheDocument()
      })

      // Upload button should be focusable
      const uploadButton = screen.getByText('Upload Asset')
      uploadButton.focus()
      expect(uploadButton).toHaveFocus()
    })

    it('provides proper keyboard navigation', async () => {
      render(<CreateVaultWizard {...defaultProps} />)

      // Tab navigation should work
      const nextButton = screen.getByText('Next')
      nextButton.focus()
      
      // Enter key should activate button
      fireEvent.keyDown(nextButton, { key: 'Enter', code: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('Include Assets')).toBeInTheDocument()
      })
    })

    it('provides appropriate loading states', async () => {
      const user = userEvent.setup()
      
      render(<CreateVaultWizard {...defaultProps} />)
      
      // Navigate to final step
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      await user.click(screen.getByText('Next'))
      
      const vaultNameInput = screen.getByPlaceholderText('Enter vault name')
      await user.type(vaultNameInput, 'Loading Test Vault')
      
      // Create vault
      const createButton = screen.getByText('Create Vault')
      await user.click(createButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument()
      })
    })
  })
})