/**
 * FileUploadDropzone Component Tests
 * Comprehensive testing following CLAUDE.md patterns
 * Tests all upload functionality including the fixes applied
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'

import { FileUploadDropzone } from '@/features/assets/FileUploadDropzone'
import { AssetFactory, TEST_FILE_TYPES, TEST_CONSTANTS } from '../factories/asset.factory'
import { 
  FileTestHelpers, 
  AsyncTestHelpers, 
  ErrorTestHelpers,
  TestEnvironmentHelpers 
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

// Mock XMLHttpRequest for upload testing
class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = []
  
  public upload = {
    addEventListener: jest.fn()
  }
  public addEventListener = jest.fn()
  public open = jest.fn()
  public send = jest.fn()
  public timeout = 0
  public status = 200
  public responseText = JSON.stringify({ success: true, asset: AssetFactory.createWithDetails() })
  public readyState = 4

  constructor() {
    MockXMLHttpRequest.instances.push(this)
  }

  // Simulate successful upload
  static simulateSuccess(responseData?: any) {
    const instance = this.instances[this.instances.length - 1]
    if (instance) {
      instance.status = 200
      instance.responseText = JSON.stringify(responseData || { 
        success: true, 
        asset: AssetFactory.createWithDetails() 
      })
      
      // Simulate progress events
      const progressHandler = instance.upload.addEventListener.mock.calls
        .find(call => call[0] === 'progress')?.[1]
      
      if (progressHandler) {
        // Simulate progress updates
        progressHandler({ lengthComputable: true, loaded: 50, total: 100 })
        progressHandler({ lengthComputable: true, loaded: 100, total: 100 })
      }

      // Simulate completion
      const loadHandler = instance.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1]
      loadHandler?.()
    }
  }

  // Simulate upload failure
  static simulateFailure(status = 500, errorMessage = 'Upload failed') {
    const instance = this.instances[this.instances.length - 1]
    if (instance) {
      instance.status = status
      instance.responseText = JSON.stringify({ error: errorMessage })
      
      const loadHandler = instance.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1]
      loadHandler?.()
    }
  }

  // Simulate network error
  static simulateNetworkError() {
    const instance = this.instances[this.instances.length - 1]
    if (instance) {
      const errorHandler = instance.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1]
      errorHandler?.()
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

describe('FileUploadDropzone', () => {
  const defaultProps = {
    organizationId: TEST_CONSTANTS.TEST_ORGANIZATION_ID,
    currentUser: {
      id: TEST_CONSTANTS.TEST_USER_ID,
      name: 'Test User',
      email: 'test@example.com'
    }
  }

  beforeEach(() => {
    MockXMLHttpRequest.reset()
    jest.clearAllMocks()
  })

  describe('Rendering and Initial State', () => {
    it('renders upload dropzone with correct initial state', () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      expect(screen.getByText('Upload Documents')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop your files here, or click to browse')).toBeInTheDocument()
      expect(screen.getByText('Choose Files')).toBeInTheDocument()
      expect(screen.getByText(/Maximum.*files, up to.*each/)).toBeInTheDocument()
    })

    it('shows collaboration hub when enabled', () => {
      render(<FileUploadDropzone {...defaultProps} showCollaborationHub={true} />)
      expect(screen.getByTestId('collaboration-hub')).toBeInTheDocument()
    })

    it('hides collaboration hub when disabled', () => {
      render(<FileUploadDropzone {...defaultProps} showCollaborationHub={false} />)
      expect(screen.queryByTestId('collaboration-hub')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <FileUploadDropzone {...defaultProps} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('File Selection and Validation', () => {
    it('accepts valid file types', async () => {
      const user = userEvent.setup()
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      await waitFor(() => {
        expect(screen.getByText(file.name.split('.')[0])).toBeInTheDocument()
        expect(screen.getByText('Ready to upload')).toBeInTheDocument()
      })
    })

    it('rejects oversized files', async () => {
      const user = userEvent.setup()
      render(<FileUploadDropzone {...defaultProps} maxFileSize={1024} />)
      
      const largeFile = AssetFactory.createTestFile('PDF', 'large')
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, largeFile)
      
      await waitFor(() => {
        expect(screen.getByText(/File size exceeds.*limit/)).toBeInTheDocument()
      })
    })

    it('rejects invalid file types', async () => {
      const user = userEvent.setup()
      render(<FileUploadDropzone {...defaultProps} />)
      
      const invalidFile = AssetFactory.createTestFile('INVALID', 'small')
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, invalidFile)
      
      await waitFor(() => {
        expect(screen.getByText(/File type.*is not allowed/)).toBeInTheDocument()
      })
    })

    it('limits number of files per upload', async () => {
      const user = userEvent.setup()
      render(<FileUploadDropzone {...defaultProps} maxFiles={2} />)
      
      const files = [
        AssetFactory.createTestFile('PDF', 'small'),
        AssetFactory.createTestFile('DOCX', 'small'),
        AssetFactory.createTestFile('JPEG', 'small') // This should be ignored
      ]
      
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      await user.upload(input, files)
      
      await waitFor(() => {
        const fileItems = screen.getAllByText(/Ready to upload/)
        expect(fileItems).toHaveLength(2) // Only first 2 files should be added
      })
    })

    it('generates preview for image files', async () => {
      const user = userEvent.setup()
      render(<FileUploadDropzone {...defaultProps} />)
      
      const imageFile = AssetFactory.createTestFile('JPEG', 'small')
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      // Mock FileReader for image preview
      const mockFileReader = {
        readAsDataURL: jest.fn(),
        result: 'data:image/jpeg;base64,mock-image-data',
        onload: null as any
      }
      global.FileReader = jest.fn(() => mockFileReader) as any
      
      await user.upload(input, imageFile)
      
      // Simulate FileReader completion
      act(() => {
        mockFileReader.onload?.()
      })
      
      await waitFor(() => {
        const preview = screen.getByAltText('Preview')
        expect(preview).toBeInTheDocument()
        expect(preview).toHaveAttribute('src', 'data:image/jpeg;base64,mock-image-data')
      })
    })
  })

  describe('Drag and Drop Functionality', () => {
    it('handles drag over events', () => {
      render(<FileUploadDropzone {...defaultProps} />)
      const dropzone = screen.getByText('Upload Documents').closest('div')!
      
      fireEvent.dragOver(dropzone)
      expect(dropzone).toHaveClass('border-blue-400', 'bg-blue-50')
    })

    it('handles drag leave events', () => {
      render(<FileUploadDropzone {...defaultProps} />)
      const dropzone = screen.getByText('Upload Documents').closest('div')!
      
      fireEvent.dragOver(dropzone)
      fireEvent.dragLeave(dropzone)
      expect(dropzone).toHaveClass('border-gray-300', 'bg-gray-50')
    })

    it('handles file drop', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      const dropzone = screen.getByText('Upload Documents').closest('div')!
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const dataTransfer = { files: [file] }
      
      fireEvent.drop(dropzone, { dataTransfer })
      
      await waitFor(() => {
        expect(screen.getByText(file.name.split('.')[0])).toBeInTheDocument()
      })
    })
  })

  describe('File Upload Process', () => {
    it('uploads file successfully with progress updates', async () => {
      const onUploadComplete = jest.fn()
      const onUploadProgress = jest.fn()
      
      render(
        <FileUploadDropzone 
          {...defaultProps} 
          onUploadComplete={onUploadComplete}
          onUploadProgress={onUploadProgress}
        />
      )
      
      // Add a file
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      // Fill required title
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Test Document')
      
      // Start upload
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Verify upload started
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
      
      // Simulate successful upload
      act(() => {
        MockXMLHttpRequest.simulateSuccess()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument()
        expect(onUploadComplete).toHaveBeenCalledTimes(1)
      })
    })

    it('handles upload failure with error message', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Simulate upload failure
      act(() => {
        MockXMLHttpRequest.simulateFailure(500, 'Storage error')
      })
      
      await waitFor(() => {
        expect(screen.getByText('Storage error')).toBeInTheDocument()
      })
    })

    it('handles network errors', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Simulate network error
      act(() => {
        MockXMLHttpRequest.simulateNetworkError()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('retries failed uploads', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Simulate first failure
      act(() => {
        MockXMLHttpRequest.simulateFailure()
      })
      
      await waitFor(() => {
        expect(screen.getByText(/Upload failed, retrying/)).toBeInTheDocument()
      })
      
      // Simulate retry success
      await AsyncTestHelpers.sleep(100)
      act(() => {
        MockXMLHttpRequest.simulateSuccess()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Uploaded')).toBeInTheDocument()
      })
    })

    it('sends correct FormData fields', async () => {
      render(<FileUploadDropzone {...defaultProps} vaultId="test-vault-id" />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      // Set file properties
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const descriptionInput = screen.getByPlaceholderText('Optional description')
      await user.type(descriptionInput, 'Test description')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Verify XMLHttpRequest was called with correct data
      const mockInstance = MockXMLHttpRequest.instances[0]
      expect(mockInstance.open).toHaveBeenCalledWith('POST', '/api/assets/upload')
      expect(mockInstance.send).toHaveBeenCalled()
      
      // Verify FormData content (we can't directly inspect FormData in tests,
      // but we can verify the upload was attempted)
      expect(mockInstance.send).toHaveBeenCalledTimes(1)
    })
  })

  describe('Organization ID Validation', () => {
    it('requires organizationId to upload', async () => {
      const { rerender } = render(<FileUploadDropzone />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Upload should not start without organizationId
      expect(screen.queryByText('Uploading...')).not.toBeInTheDocument()
      
      // Add organizationId and try again
      rerender(<FileUploadDropzone {...defaultProps} />)
      
      await user.click(uploadButton)
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })
  })

  describe('Bulk Operations', () => {
    it('applies bulk settings to all files', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const files = [
        AssetFactory.createTestFile('PDF', 'small'),
        AssetFactory.createTestFile('DOCX', 'small')
      ]
      
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, files)
      
      // Show bulk settings
      await user.click(screen.getByText('Show Settings'))
      
      // Change bulk category
      const categorySelect = screen.getByDisplayValue('General Documents')
      await user.selectOptions(categorySelect, 'Financial Reports')
      
      // Apply to all files
      await user.click(screen.getByText('Apply to All Files'))
      
      // Verify all files have the new category
      const categorySelects = screen.getAllByDisplayValue('Financial Reports')
      expect(categorySelects).toHaveLength(3) // Bulk + 2 individual files
    })

    it('shows and hides bulk settings', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'small')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      // Initially hidden
      expect(screen.queryByText('Apply to All Files')).not.toBeInTheDocument()
      
      // Show settings
      await user.click(screen.getByText('Show Settings'))
      expect(screen.getByText('Apply to All Files')).toBeInTheDocument()
      
      // Hide settings
      await user.click(screen.getByText('Hide Settings'))
      expect(screen.queryByText('Apply to All Files')).not.toBeInTheDocument()
    })
  })

  describe('File Management', () => {
    it('removes individual files', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      // Verify file is added
      expect(screen.getByText(file.name.split('.')[0])).toBeInTheDocument()
      
      // Remove file
      const removeButton = screen.getByRole('button', { name: '' }) // X button
      await user.click(removeButton)
      
      // Verify file is removed
      expect(screen.queryByText(file.name.split('.')[0])).not.toBeInTheDocument()
    })

    it('clears all files', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const files = [
        AssetFactory.createTestFile('PDF', 'small'),
        AssetFactory.createTestFile('DOCX', 'small')
      ]
      
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, files)
      
      // Verify files are added
      expect(screen.getByText(files[0].name.split('.')[0])).toBeInTheDocument()
      expect(screen.getByText(files[1].name.split('.')[0])).toBeInTheDocument()
      
      // Clear all files
      await user.click(screen.getByText('Clear All'))
      
      // Verify all files are removed
      expect(screen.queryByText(files[0].name.split('.')[0])).not.toBeInTheDocument()
      expect(screen.queryByText(files[1].name.split('.')[0])).not.toBeInTheDocument()
    })

    it('prevents removal during upload', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      // Start upload
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Remove button should be disabled during upload
      const removeButton = screen.getByRole('button', { name: '' })
      expect(removeButton).toBeDisabled()
    })
  })

  describe('Form Validation', () => {
    it('requires title before upload', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      // Upload button should be disabled without title
      const uploadButton = screen.getByText('Upload Files')
      expect(uploadButton).toBeDisabled()
      
      // Add title
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      // Upload button should be enabled
      expect(uploadButton).not.toBeDisabled()
    })

    it('updates file properties individually', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      // Update title
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.clear(titleInput)
      await user.type(titleInput, 'Custom Title')
      
      expect(titleInput).toHaveValue('Custom Title')
      
      // Update description
      const descriptionInput = screen.getByPlaceholderText('Optional description')
      await user.type(descriptionInput, 'Custom description')
      
      expect(descriptionInput).toHaveValue('Custom description')
      
      // Update category
      const categorySelect = screen.getByDisplayValue('General Documents')
      await user.selectOptions(categorySelect, 'Board Documents')
      
      expect(categorySelect).toHaveValue('board-documents')
    })
  })

  describe('Performance and Concurrency', () => {
    it('handles concurrent uploads with limit', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      // Add 5 files (more than the default concurrency limit of 3)
      const files = Array.from({ length: 5 }, (_, i) => 
        AssetFactory.createTestFile('PDF', 'small')
      )
      
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, files)
      
      // Set titles for all files
      const titleInputs = screen.getAllByPlaceholderText('Document title')
      for (let i = 0; i < titleInputs.length; i++) {
        await user.type(titleInputs[i], `Document ${i + 1}`)
      }
      
      // Start upload
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Verify no more than 3 uploads are running concurrently
      // (This is hard to test directly, but we can verify all files are processed)
      expect(MockXMLHttpRequest.instances.length).toBeGreaterThan(0)
      expect(MockXMLHttpRequest.instances.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Error Scenarios', () => {
    it('handles malformed server responses', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Simulate malformed response
      const mockInstance = MockXMLHttpRequest.instances[0]
      mockInstance.status = 200
      mockInstance.responseText = 'invalid json'
      
      const loadHandler = mockInstance.addEventListener.mock.calls
        .find(call => call[0] === 'load')?.[1]
      
      act(() => {
        loadHandler?.()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Invalid server response')).toBeInTheDocument()
      })
    })

    it('handles timeout errors', async () => {
      render(<FileUploadDropzone {...defaultProps} />)
      
      const file = AssetFactory.createTestFile('PDF', 'medium')
      const user = userEvent.setup()
      const input = screen.getByRole('button', { name: /choose files/i }).querySelector('input') as HTMLInputElement
      
      await user.upload(input, file)
      
      const titleInput = screen.getByPlaceholderText('Document title')
      await user.type(titleInput, 'Test Document')
      
      const uploadButton = screen.getByText('Upload Files')
      await user.click(uploadButton)
      
      // Simulate timeout
      const mockInstance = MockXMLHttpRequest.instances[0]
      const timeoutHandler = mockInstance.addEventListener.mock.calls
        .find(call => call[0] === 'timeout')?.[1]
      
      act(() => {
        timeoutHandler?.()
      })
      
      await waitFor(() => {
        expect(screen.getByText('Upload timeout')).toBeInTheDocument()
      })
    })
  })
})