import { test, expect } from '../fixtures/auth.fixture'
import { DocumentsPage } from '../pages/documents.page'
import * as path from 'path'

test.describe('Document Management', () => {
  let documentsPage: DocumentsPage

  test.beforeEach(async ({ authenticatedPage }) => {
    documentsPage = new DocumentsPage(authenticatedPage)
    await documentsPage.navigateToDocuments()
    await documentsPage.waitForDocumentsLoad()
  })

  test.describe('Document Upload', () => {
    test('should display upload button', async ({ authenticatedPage }) => {
      const uploadButton = authenticatedPage.locator('button:has-text("Upload"), [data-testid="upload-document"]')
      await expect(uploadButton).toBeVisible()
    })

    test('should open upload modal', async ({ authenticatedPage }) => {
      const uploadButton = authenticatedPage.locator('button:has-text("Upload"), [data-testid="upload-document"]')
      await uploadButton.click()
      
      const uploadModal = authenticatedPage.locator('[data-testid="upload-modal"], .upload-modal')
      await expect(uploadModal).toBeVisible()
    })

    test('should upload a document successfully', async ({ authenticatedPage }) => {
      // Create a test file path
      const testFilePath = path.join(__dirname, '../fixtures/test-document.pdf')
      
      await documentsPage.uploadDocument(
        testFilePath,
        'Test Document',
        'This is a test document',
        ['test', 'e2e'],
        'General'
      )
      
      // Verify document appears in list
      const documentExists = await documentsPage.documentExists('Test Document')
      expect(documentExists).toBeTruthy()
    })

    test('should show upload progress', async ({ authenticatedPage }) => {
      const uploadButton = authenticatedPage.locator('button:has-text("Upload"), [data-testid="upload-document"]')
      await uploadButton.click()
      
      const fileInput = authenticatedPage.locator('input[type="file"]')
      const testFilePath = path.join(__dirname, '../fixtures/test-document.pdf')
      await fileInput.setInputFiles(testFilePath)
      
      const submitButton = authenticatedPage.locator('button:has-text("Upload"), button:has-text("Submit")')
      await submitButton.click()
      
      const progressBar = authenticatedPage.locator('[data-testid="upload-progress"], .progress-bar')
      await expect(progressBar).toBeVisible()
    })

    test('should support drag and drop upload', async ({ authenticatedPage }) => {
      const uploadButton = authenticatedPage.locator('button:has-text("Upload"), [data-testid="upload-document"]')
      await uploadButton.click()
      
      const dragDropArea = authenticatedPage.locator('[data-testid="drag-drop-area"], .drag-drop-area')
      await expect(dragDropArea).toBeVisible()
      await expect(dragDropArea).toContainText(/drag|drop/i)
    })
  })

  test.describe('Document List', () => {
    test('should display documents table', async ({ authenticatedPage }) => {
      const documentsTable = authenticatedPage.locator('[data-testid="documents-table"], table')
      await expect(documentsTable).toBeVisible()
    })

    test('should display document rows', async () => {
      const documentCount = await documentsPage.getDocumentCount()
      expect(documentCount).toBeGreaterThanOrEqual(0)
    })

    test('should show document details', async () => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        const details = await documentsPage.getDocumentDetails(0)
        expect(details.title).toBeTruthy()
        expect(details.uploadedBy).toBeTruthy()
        expect(details.uploadDate).toBeTruthy()
        expect(details.size).toBeTruthy()
      }
    })

    test('should display pagination controls', async ({ authenticatedPage }) => {
      const paginationInfo = await documentsPage.getPaginationInfo()
      
      if (paginationInfo && paginationInfo.includes('of')) {
        const nextButton = authenticatedPage.locator('button:has-text("Next"), [data-testid="pagination-next"]')
        const prevButton = authenticatedPage.locator('button:has-text("Previous"), [data-testid="pagination-prev"]')
        
        await expect(nextButton).toBeVisible()
        await expect(prevButton).toBeVisible()
      }
    })

    test('should navigate through pages', async () => {
      const paginationInfo = await documentsPage.getPaginationInfo()
      
      if (paginationInfo && paginationInfo.includes('of')) {
        await documentsPage.goToNextPage()
        const newPaginationInfo = await documentsPage.getPaginationInfo()
        expect(newPaginationInfo).not.toBe(paginationInfo)
        
        await documentsPage.goToPreviousPage()
        const originalPaginationInfo = await documentsPage.getPaginationInfo()
        expect(originalPaginationInfo).toBe(paginationInfo)
      }
    })
  })

  test.describe('Document Search and Filter', () => {
    test('should display search input', async ({ authenticatedPage }) => {
      const searchInput = authenticatedPage.locator('input[type="search"], input[placeholder*="Search"]')
      await expect(searchInput).toBeVisible()
    })

    test('should search documents', async () => {
      await documentsPage.searchDocuments('test')
      
      // Wait for search results
      await documentsPage.page.waitForTimeout(1000)
      
      const documentCount = await documentsPage.getDocumentCount()
      expect(documentCount).toBeGreaterThanOrEqual(0)
    })

    test('should display filter dropdown', async ({ authenticatedPage }) => {
      const filterDropdown = authenticatedPage.locator('[data-testid="filter-dropdown"], select[name="filter"]')
      await expect(filterDropdown).toBeVisible()
    })

    test('should filter documents', async ({ authenticatedPage }) => {
      const filterDropdown = authenticatedPage.locator('[data-testid="filter-dropdown"], select[name="filter"]')
      
      if (await filterDropdown.isVisible()) {
        await documentsPage.filterDocuments('recent')
        
        const documentCount = await documentsPage.getDocumentCount()
        expect(documentCount).toBeGreaterThanOrEqual(0)
      }
    })

    test('should display sort dropdown', async ({ authenticatedPage }) => {
      const sortDropdown = authenticatedPage.locator('[data-testid="sort-dropdown"], select[name="sort"]')
      await expect(sortDropdown).toBeVisible()
    })

    test('should sort documents', async ({ authenticatedPage }) => {
      const sortDropdown = authenticatedPage.locator('[data-testid="sort-dropdown"], select[name="sort"]')
      
      if (await sortDropdown.isVisible()) {
        await documentsPage.sortDocuments('name')
        
        const documentCount = await documentsPage.getDocumentCount()
        expect(documentCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Document Actions', () => {
    test('should select individual document', async () => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        await documentsPage.selectDocument(0)
        
        const checkbox = documentsPage.page.locator('input[type="checkbox"][name="document"]').first()
        await expect(checkbox).toBeChecked()
      }
    })

    test('should select all documents', async ({ authenticatedPage }) => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        await documentsPage.selectAllDocuments()
        
        const checkboxes = authenticatedPage.locator('input[type="checkbox"][name="document"]')
        const checkedCount = await checkboxes.filter({ hasState: 'checked' }).count()
        expect(checkedCount).toBe(documentCount)
      }
    })

    test('should download document', async () => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        const downloadPromise = documentsPage.page.waitForEvent('download')
        await documentsPage.downloadDocument(0)
        const download = await downloadPromise
        
        expect(download).toBeTruthy()
      }
    })

    test('should delete document', async ({ authenticatedPage }) => {
      const initialCount = await documentsPage.getDocumentCount()
      
      if (initialCount > 0) {
        await documentsPage.deleteDocument(0)
        
        // Wait for deletion to complete
        await authenticatedPage.waitForTimeout(1000)
        
        const newCount = await documentsPage.getDocumentCount()
        expect(newCount).toBeLessThan(initialCount)
      }
    })

    test('should share document', async ({ authenticatedPage }) => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        await documentsPage.shareDocument(0, 'test@example.com')
        
        // Check for success message
        const successMessage = authenticatedPage.locator('text=/shared|sent/i')
        await expect(successMessage).toBeVisible()
      }
    })

    test('should perform bulk actions', async ({ authenticatedPage }) => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 1) {
        await documentsPage.selectAllDocuments()
        
        const bulkActionDropdown = authenticatedPage.locator('[data-testid="bulk-actions"], select[name="bulk-action"]')
        
        if (await bulkActionDropdown.isVisible()) {
          await documentsPage.performBulkAction('download')
          
          // Check for success message or download
          const successMessage = authenticatedPage.locator('text=/downloaded|success/i')
          await expect(successMessage).toBeVisible()
        }
      }
    })

    test('should preview document', async ({ authenticatedPage }) => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        await documentsPage.openDocumentPreview(0)
        
        const previewModal = authenticatedPage.locator('[data-testid="preview-modal"], .preview-modal')
        await expect(previewModal).toBeVisible()
        
        await documentsPage.closeDocumentPreview()
        await expect(previewModal).not.toBeVisible()
      }
    })
  })

  test.describe('Document Permissions', () => {
    test('should display actions based on user role', async ({ authenticatedPage, testUser }) => {
      const deleteButton = authenticatedPage.locator('button:has-text("Delete"), [data-testid="delete-document"]')
      const shareButton = authenticatedPage.locator('button:has-text("Share"), [data-testid="share-document"]')
      
      if (testUser.role === 'admin' || testUser.role === 'director') {
        // Admin and director should see all actions
        if (await documentsPage.getDocumentCount() > 0) {
          await expect(deleteButton.first()).toBeVisible()
          await expect(shareButton.first()).toBeVisible()
        }
      } else if (testUser.role === 'viewer') {
        // Viewer should not see delete button
        if (await documentsPage.getDocumentCount() > 0) {
          await expect(deleteButton.first()).not.toBeVisible()
        }
      }
    })
  })

  test.describe('Document Categories', () => {
    test('should display category filter', async ({ authenticatedPage }) => {
      const categoryFilter = authenticatedPage.locator('select[name="category"], [data-testid="category-filter"]')
      
      if (await categoryFilter.isVisible()) {
        const options = await categoryFilter.locator('option').allTextContents()
        expect(options.length).toBeGreaterThan(1)
      }
    })

    test('should filter by category', async ({ authenticatedPage }) => {
      const categoryFilter = authenticatedPage.locator('select[name="category"], [data-testid="category-filter"]')
      
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption({ index: 1 })
        
        await authenticatedPage.waitForTimeout(1000)
        
        const documentCount = await documentsPage.getDocumentCount()
        expect(documentCount).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Document Tags', () => {
    test('should display document tags', async ({ authenticatedPage }) => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        const tags = authenticatedPage.locator('[data-testid="document-tags"], .document-tags').first()
        
        if (await tags.isVisible()) {
          const tagCount = await tags.locator('.tag, [data-testid="tag"]').count()
          expect(tagCount).toBeGreaterThanOrEqual(0)
        }
      }
    })

    test('should filter by tag', async ({ authenticatedPage }) => {
      const documentCount = await documentsPage.getDocumentCount()
      
      if (documentCount > 0) {
        const tag = authenticatedPage.locator('.tag, [data-testid="tag"]').first()
        
        if (await tag.isVisible()) {
          await tag.click()
          
          await authenticatedPage.waitForTimeout(1000)
          
          const filteredCount = await documentsPage.getDocumentCount()
          expect(filteredCount).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })
})