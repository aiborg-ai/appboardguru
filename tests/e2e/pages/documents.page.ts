import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Documents Page Object Model
 */
export class DocumentsPage extends BasePage {
  // Page elements
  private readonly pageTitle: Locator
  private readonly uploadButton: Locator
  private readonly documentsTable: Locator
  private readonly searchInput: Locator
  private readonly filterDropdown: Locator
  private readonly sortDropdown: Locator
  
  // Document list elements
  private readonly documentRows: Locator
  private readonly documentCheckboxes: Locator
  private readonly bulkActionDropdown: Locator
  private readonly deleteButton: Locator
  private readonly downloadButton: Locator
  private readonly shareButton: Locator
  
  // Upload modal elements
  private readonly uploadModal: Locator
  private readonly fileInput: Locator
  private readonly dragDropArea: Locator
  private readonly uploadSubmitButton: Locator
  private readonly uploadCancelButton: Locator
  private readonly uploadProgressBar: Locator
  
  // Document details
  private readonly documentTitle: Locator
  private readonly documentDescription: Locator
  private readonly documentTags: Locator
  private readonly documentCategory: Locator
  
  // Pagination
  private readonly paginationNext: Locator
  private readonly paginationPrev: Locator
  private readonly paginationInfo: Locator

  constructor(page: Page) {
    super(page, '/documents')
    
    // Initialize page elements
    this.pageTitle = page.locator('h1, [data-testid="page-title"]')
    this.uploadButton = page.locator('button:has-text("Upload"), [data-testid="upload-document"]')
    this.documentsTable = page.locator('[data-testid="documents-table"], table')
    this.searchInput = page.locator('input[type="search"], input[placeholder*="Search"]')
    this.filterDropdown = page.locator('[data-testid="filter-dropdown"], select[name="filter"]')
    this.sortDropdown = page.locator('[data-testid="sort-dropdown"], select[name="sort"]')
    
    // Initialize document list elements
    this.documentRows = page.locator('[data-testid="document-row"], tbody tr')
    this.documentCheckboxes = page.locator('input[type="checkbox"][name="document"]')
    this.bulkActionDropdown = page.locator('[data-testid="bulk-actions"], select[name="bulk-action"]')
    this.deleteButton = page.locator('button:has-text("Delete"), [data-testid="delete-document"]')
    this.downloadButton = page.locator('button:has-text("Download"), [data-testid="download-document"]')
    this.shareButton = page.locator('button:has-text("Share"), [data-testid="share-document"]')
    
    // Initialize upload modal elements
    this.uploadModal = page.locator('[data-testid="upload-modal"], .upload-modal')
    this.fileInput = page.locator('input[type="file"]')
    this.dragDropArea = page.locator('[data-testid="drag-drop-area"], .drag-drop-area')
    this.uploadSubmitButton = page.locator('button:has-text("Upload"), button:has-text("Submit")')
    this.uploadCancelButton = page.locator('button:has-text("Cancel")')
    this.uploadProgressBar = page.locator('[data-testid="upload-progress"], .progress-bar')
    
    // Initialize document details
    this.documentTitle = page.locator('input[name="title"], input[placeholder*="Title"]')
    this.documentDescription = page.locator('textarea[name="description"], textarea[placeholder*="Description"]')
    this.documentTags = page.locator('input[name="tags"], input[placeholder*="Tags"]')
    this.documentCategory = page.locator('select[name="category"], [data-testid="category-select"]')
    
    // Initialize pagination
    this.paginationNext = page.locator('button:has-text("Next"), [data-testid="pagination-next"]')
    this.paginationPrev = page.locator('button:has-text("Previous"), [data-testid="pagination-prev"]')
    this.paginationInfo = page.locator('[data-testid="pagination-info"], .pagination-info')
  }

  /**
   * Navigate to documents page
   */
  async navigateToDocuments(): Promise<void> {
    await this.goto()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Upload a document
   */
  async uploadDocument(
    filePath: string,
    title?: string,
    description?: string,
    tags?: string[],
    category?: string
  ): Promise<void> {
    await this.uploadButton.click()
    await this.uploadModal.waitFor({ state: 'visible' })
    
    await this.fileInput.setInputFiles(filePath)
    
    if (title) {
      await this.documentTitle.fill(title)
    }
    
    if (description) {
      await this.documentDescription.fill(description)
    }
    
    if (tags && tags.length > 0) {
      await this.documentTags.fill(tags.join(', '))
    }
    
    if (category) {
      await this.documentCategory.selectOption(category)
    }
    
    await this.uploadSubmitButton.click()
    await this.waitForUploadComplete()
  }

  /**
   * Wait for upload to complete
   */
  async waitForUploadComplete(): Promise<void> {
    await this.uploadProgressBar.waitFor({ state: 'hidden', timeout: 30000 })
  }

  /**
   * Search for documents
   */
  async searchDocuments(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.searchInput.press('Enter')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Filter documents
   */
  async filterDocuments(filterType: string): Promise<void> {
    await this.filterDropdown.selectOption(filterType)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Sort documents
   */
  async sortDocuments(sortType: string): Promise<void> {
    await this.sortDropdown.selectOption(sortType)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get document count
   */
  async getDocumentCount(): Promise<number> {
    return await this.documentRows.count()
  }

  /**
   * Select document by index
   */
  async selectDocument(index: number): Promise<void> {
    const checkbox = this.documentCheckboxes.nth(index)
    await checkbox.check()
  }

  /**
   * Select all documents
   */
  async selectAllDocuments(): Promise<void> {
    const selectAllCheckbox = this.page.locator('input[type="checkbox"][data-testid="select-all"]')
    await selectAllCheckbox.check()
  }

  /**
   * Delete document by index
   */
  async deleteDocument(index: number): Promise<void> {
    const row = this.documentRows.nth(index)
    const deleteButton = row.locator('button:has-text("Delete")')
    await deleteButton.click()
    
    // Confirm deletion
    const confirmButton = this.page.locator('button:has-text("Confirm")')
    await confirmButton.click()
    
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Download document by index
   */
  async downloadDocument(index: number): Promise<void> {
    const row = this.documentRows.nth(index)
    const downloadButton = row.locator('button:has-text("Download")')
    
    const downloadPromise = this.page.waitForEvent('download')
    await downloadButton.click()
    await downloadPromise
  }

  /**
   * Share document by index
   */
  async shareDocument(index: number, email: string): Promise<void> {
    const row = this.documentRows.nth(index)
    const shareButton = row.locator('button:has-text("Share")')
    await shareButton.click()
    
    // Fill share modal
    const emailInput = this.page.locator('input[type="email"][placeholder*="Email"]')
    await emailInput.fill(email)
    
    const sendButton = this.page.locator('button:has-text("Send")')
    await sendButton.click()
    
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Perform bulk action
   */
  async performBulkAction(action: string): Promise<void> {
    await this.bulkActionDropdown.selectOption(action)
    
    const applyButton = this.page.locator('button:has-text("Apply")')
    await applyButton.click()
    
    // Confirm action if needed
    const confirmButton = this.page.locator('button:has-text("Confirm")')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }
    
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Navigate to next page
   */
  async goToNextPage(): Promise<void> {
    await this.paginationNext.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Navigate to previous page
   */
  async goToPreviousPage(): Promise<void> {
    await this.paginationPrev.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get pagination info
   */
  async getPaginationInfo(): Promise<string | null> {
    return await this.paginationInfo.textContent()
  }

  /**
   * Check if document exists
   */
  async documentExists(title: string): Promise<boolean> {
    const document = this.page.locator(`text="${title}"`)
    return await document.isVisible()
  }

  /**
   * Open document preview
   */
  async openDocumentPreview(index: number): Promise<void> {
    const row = this.documentRows.nth(index)
    const previewButton = row.locator('button:has-text("Preview"), [data-testid="preview-document"]')
    await previewButton.click()
    
    const previewModal = this.page.locator('[data-testid="preview-modal"], .preview-modal')
    await previewModal.waitFor({ state: 'visible' })
  }

  /**
   * Close document preview
   */
  async closeDocumentPreview(): Promise<void> {
    const closeButton = this.page.locator('button:has-text("Close"), [data-testid="close-preview"]')
    await closeButton.click()
  }

  /**
   * Get document details by index
   */
  async getDocumentDetails(index: number): Promise<{
    title: string | null
    uploadedBy: string | null
    uploadDate: string | null
    size: string | null
  }> {
    const row = this.documentRows.nth(index)
    
    return {
      title: await row.locator('[data-testid="document-title"]').textContent(),
      uploadedBy: await row.locator('[data-testid="uploaded-by"]').textContent(),
      uploadDate: await row.locator('[data-testid="upload-date"]').textContent(),
      size: await row.locator('[data-testid="document-size"]').textContent()
    }
  }

  /**
   * Wait for documents to load
   */
  async waitForDocumentsLoad(): Promise<void> {
    await this.documentsTable.waitFor({ state: 'visible', timeout: 10000 })
    await this.page.waitForLoadState('networkidle')
  }
}