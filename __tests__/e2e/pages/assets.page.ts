import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'
import path from 'path'

/**
 * Assets Page Object Model
 * Handles asset management, upload, viewing, annotation, and collaboration
 */
export class AssetsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page URLs
  readonly assetsUrl = '/dashboard/assets'
  readonly assetViewUrl = '/dashboard/assets/[id]'

  // Main page elements
  get assetsPage(): Locator {
    return this.page.locator('[data-testid="assets-page"]')
  }

  get assetsGrid(): Locator {
    return this.page.locator('[data-testid="assets-grid"]')
  }

  get assetsList(): Locator {
    return this.page.locator('[data-testid="assets-list"]')
  }

  get assetItems(): Locator {
    return this.page.locator('[data-testid="asset-item"]')
  }

  get emptyState(): Locator {
    return this.page.locator('[data-testid="assets-empty-state"]')
  }

  // View controls
  get viewToggleGrid(): Locator {
    return this.page.locator('[data-testid="view-toggle-grid"]')
  }

  get viewToggleList(): Locator {
    return this.page.locator('[data-testid="view-toggle-list"]')
  }

  // Search and filters
  get searchInput(): Locator {
    return this.page.locator('[data-testid="assets-search"]')
  }

  get filterButton(): Locator {
    return this.page.locator('[data-testid="assets-filter-button"]')
  }

  get filterPanel(): Locator {
    return this.page.locator('[data-testid="assets-filter-panel"]')
  }

  get filterFileType(): Locator {
    return this.page.locator('[data-testid="filter-file-type"]')
  }

  get filterCategory(): Locator {
    return this.page.locator('[data-testid="filter-category"]')
  }

  get filterDateRange(): Locator {
    return this.page.locator('[data-testid="filter-date-range"]')
  }

  get sortDropdown(): Locator {
    return this.page.locator('[data-testid="assets-sort-dropdown"]')
  }

  // Upload functionality
  get uploadButton(): Locator {
    return this.page.locator('[data-testid="upload-asset-button"]')
  }

  get uploadModal(): Locator {
    return this.page.locator('[data-testid="upload-asset-modal"]')
  }

  get uploadDropzone(): Locator {
    return this.page.locator('[data-testid="upload-dropzone"]')
  }

  get uploadInput(): Locator {
    return this.page.locator('[data-testid="upload-input"]')
  }

  get uploadProgress(): Locator {
    return this.page.locator('[data-testid="upload-progress"]')
  }

  get uploadTitle(): Locator {
    return this.page.locator('[data-testid="upload-title-input"]')
  }

  get uploadDescription(): Locator {
    return this.page.locator('[data-testid="upload-description-input"]')
  }

  get uploadCategory(): Locator {
    return this.page.locator('[data-testid="upload-category-select"]')
  }

  get uploadSubmit(): Locator {
    return this.page.locator('[data-testid="upload-submit-button"]')
  }

  // Asset actions
  get assetActionMenu(): Locator {
    return this.page.locator('[data-testid="asset-action-menu"]')
  }

  get actionView(): Locator {
    return this.page.locator('[data-testid="action-view"]')
  }

  get actionDownload(): Locator {
    return this.page.locator('[data-testid="action-download"]')
  }

  get actionShare(): Locator {
    return this.page.locator('[data-testid="action-share"]')
  }

  get actionMove(): Locator {
    return this.page.locator('[data-testid="action-move"]')
  }

  get actionDelete(): Locator {
    return this.page.locator('[data-testid="action-delete"]')
  }

  // Asset viewer
  get assetViewer(): Locator {
    return this.page.locator('[data-testid="asset-viewer"]')
  }

  get pdfViewer(): Locator {
    return this.page.locator('[data-testid="pdf-viewer"]')
  }

  get documentTitle(): Locator {
    return this.page.locator('[data-testid="document-title"]')
  }

  get documentInfo(): Locator {
    return this.page.locator('[data-testid="document-info"]')
  }

  get documentTabs(): Locator {
    return this.page.locator('[data-testid="document-tabs"]')
  }

  get tabViewer(): Locator {
    return this.page.locator('[data-testid="tab-viewer"]')
  }

  get tabAnnotations(): Locator {
    return this.page.locator('[data-testid="tab-annotations"]')
  }

  get tabComments(): Locator {
    return this.page.locator('[data-testid="tab-comments"]')
  }

  // Annotations
  get annotationSidebar(): Locator {
    return this.page.locator('[data-testid="annotation-sidebar"]')
  }

  get annotationList(): Locator {
    return this.page.locator('[data-testid="annotation-list"]')
  }

  get annotationItems(): Locator {
    return this.page.locator('[data-testid="annotation-item"]')
  }

  get annotationToolbar(): Locator {
    return this.page.locator('[data-testid="annotation-toolbar"]')
  }

  get highlightTool(): Locator {
    return this.page.locator('[data-testid="highlight-tool"]')
  }

  get commentTool(): Locator {
    return this.page.locator('[data-testid="comment-tool"]')
  }

  get shapeTool(): Locator {
    return this.page.locator('[data-testid="shape-tool"]')
  }

  get textTool(): Locator {
    return this.page.locator('[data-testid="text-tool"]')
  }

  get annotationForm(): Locator {
    return this.page.locator('[data-testid="annotation-form"]')
  }

  get annotationText(): Locator {
    return this.page.locator('[data-testid="annotation-text-input"]')
  }

  get annotationColor(): Locator {
    return this.page.locator('[data-testid="annotation-color-picker"]')
  }

  get saveAnnotation(): Locator {
    return this.page.locator('[data-testid="save-annotation-button"]')
  }

  // Collaboration
  get shareModal(): Locator {
    return this.page.locator('[data-testid="share-asset-modal"]')
  }

  get shareEmailInput(): Locator {
    return this.page.locator('[data-testid="share-email-input"]')
  }

  get sharePermissionSelect(): Locator {
    return this.page.locator('[data-testid="share-permission-select"]')
  }

  get shareSubmit(): Locator {
    return this.page.locator('[data-testid="share-submit-button"]')
  }

  get collaboratorsList(): Locator {
    return this.page.locator('[data-testid="collaborators-list"]')
  }

  get collaboratorItem(): Locator {
    return this.page.locator('[data-testid="collaborator-item"]')
  }

  // Comments
  get commentsPanel(): Locator {
    return this.page.locator('[data-testid="comments-panel"]')
  }

  get commentsList(): Locator {
    return this.page.locator('[data-testid="comments-list"]')
  }

  get commentItems(): Locator {
    return this.page.locator('[data-testid="comment-item"]')
  }

  get commentForm(): Locator {
    return this.page.locator('[data-testid="comment-form"]')
  }

  get commentInput(): Locator {
    return this.page.locator('[data-testid="comment-input"]')
  }

  get commentSubmit(): Locator {
    return this.page.locator('[data-testid="comment-submit-button"]')
  }

  // Navigation methods
  async goToAssets(): Promise<void> {
    await this.page.goto(this.assetsUrl)
    await expect(this.assetsPage).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  async goToAsset(assetId: string): Promise<void> {
    await this.page.goto(`/dashboard/assets/${assetId}`)
    await expect(this.assetViewer).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  // View and display methods
  async switchToGridView(): Promise<void> {
    await this.viewToggleGrid.click()
    await expect(this.assetsGrid).toBeVisible()
  }

  async switchToListView(): Promise<void> {
    await this.viewToggleList.click()
    await expect(this.assetsList).toBeVisible()
  }

  async expectAssetsDisplayed(): Promise<void> {
    const assetCount = await this.assetItems.count()
    expect(assetCount).toBeGreaterThan(0)
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible()
    await expect(this.emptyState).toContainText('No assets found')
  }

  // Search and filter methods
  async searchAssets(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.keyboard.press('Enter')
    await this.waitForSpinnerToDisappear()
  }

  async openFilters(): Promise<void> {
    await this.filterButton.click()
    await expect(this.filterPanel).toBeVisible()
  }

  async filterByFileType(fileType: string): Promise<void> {
    await this.openFilters()
    await this.selectDropdownOption('[data-testid="filter-file-type"]', fileType)
    await this.waitForSpinnerToDisappear()
  }

  async filterByCategory(category: string): Promise<void> {
    await this.openFilters()
    await this.selectDropdownOption('[data-testid="filter-category"]', category)
    await this.waitForSpinnerToDisappear()
  }

  async sortBy(sortOption: string): Promise<void> {
    await this.selectDropdownOption('[data-testid="assets-sort-dropdown"]', sortOption)
    await this.waitForSpinnerToDisappear()
  }

  // Upload methods
  async openUploadModal(): Promise<void> {
    await this.uploadButton.click()
    await expect(this.uploadModal).toBeVisible()
  }

  async uploadFile(filePath: string, title?: string, description?: string, category?: string): Promise<void> {
    await this.openUploadModal()
    
    // Upload file
    await this.uploadInput.setInputFiles(filePath)
    
    // Wait for file to be selected
    await this.page.waitForTimeout(1000)
    
    // Fill metadata
    if (title) {
      await this.uploadTitle.fill(title)
    }
    
    if (description) {
      await this.uploadDescription.fill(description)
    }
    
    if (category) {
      await this.selectDropdownOption('[data-testid="upload-category-select"]', category)
    }
    
    // Submit upload
    await this.uploadSubmit.click()
    
    // Wait for upload to complete
    if (await this.uploadProgress.isVisible()) {
      await this.uploadProgress.waitFor({ state: 'hidden' })
    }
    
    await this.expectSuccessMessage('uploaded successfully')
  }

  async uploadViaDropzone(filePath: string): Promise<void> {
    await this.openUploadModal()
    
    // Simulate drag and drop
    const fileContent = require('fs').readFileSync(filePath)
    const fileName = path.basename(filePath)
    
    await this.uploadDropzone.setInputFiles({
      name: fileName,
      mimeType: 'application/pdf', // Adjust based on file type
      buffer: fileContent,
    })
    
    await this.uploadSubmit.click()
    await this.expectSuccessMessage('uploaded successfully')
  }

  async expectUploadProgress(): Promise<void> {
    await expect(this.uploadProgress).toBeVisible()
    // Wait for progress to complete
    await this.uploadProgress.waitFor({ state: 'hidden' })
  }

  // Asset interaction methods
  async viewAsset(index = 0): Promise<void> {
    const assetItem = this.assetItems.nth(index)
    await assetItem.click()
    await expect(this.assetViewer).toBeVisible()
  }

  async openAssetActions(index = 0): Promise<void> {
    const assetItem = this.assetItems.nth(index)
    const actionButton = assetItem.locator('[data-testid="asset-action-button"]')
    await actionButton.click()
    await expect(this.assetActionMenu).toBeVisible()
  }

  async downloadAsset(index = 0): Promise<void> {
    await this.openAssetActions(index)
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.actionDownload.click(),
    ])
    
    // Verify download started
    expect(download.suggestedFilename()).toBeTruthy()
  }

  async shareAsset(index = 0, email: string, permission = 'viewer'): Promise<void> {
    await this.openAssetActions(index)
    await this.actionShare.click()
    
    await expect(this.shareModal).toBeVisible()
    await this.shareEmailInput.fill(email)
    await this.selectDropdownOption('[data-testid="share-permission-select"]', permission)
    await this.shareSubmit.click()
    
    await this.expectSuccessMessage('shared successfully')
  }

  async deleteAsset(index = 0): Promise<void> {
    await this.openAssetActions(index)
    await this.actionDelete.click()
    await this.confirmAction()
    await this.expectSuccessMessage('deleted successfully')
  }

  // Asset viewer methods
  async openAssetViewer(assetId?: string): Promise<void> {
    if (assetId) {
      await this.goToAsset(assetId)
    } else {
      await this.viewAsset(0)
    }
    
    await expect(this.assetViewer).toBeVisible()
  }

  async expectAssetInfo(title: string, fileType?: string): Promise<void> {
    await expect(this.documentTitle).toContainText(title)
    if (fileType) {
      await expect(this.documentInfo).toContainText(fileType)
    }
  }

  async switchToAnnotationsTab(): Promise<void> {
    await this.tabAnnotations.click()
    await expect(this.annotationSidebar).toBeVisible()
  }

  async switchToCommentsTab(): Promise<void> {
    await this.tabComments.click()
    await expect(this.commentsPanel).toBeVisible()
  }

  // Annotation methods
  async createHighlightAnnotation(pageNum = 1, text = 'Test annotation'): Promise<void> {
    await this.switchToAnnotationsTab()
    await this.highlightTool.click()
    
    // Simulate highlighting text on PDF
    const pdfPage = this.page.locator(`[data-testid="pdf-page-${pageNum}"]`)
    await pdfPage.dragTo(pdfPage, {
      sourcePosition: { x: 100, y: 100 },
      targetPosition: { x: 300, y: 150 },
    })
    
    // Fill annotation form
    await expect(this.annotationForm).toBeVisible()
    await this.annotationText.fill(text)
    await this.saveAnnotation.click()
    
    await this.expectSuccessMessage('annotation saved')
  }

  async createCommentAnnotation(pageNum = 1, text = 'Test comment'): Promise<void> {
    await this.switchToAnnotationsTab()
    await this.commentTool.click()
    
    // Click on PDF to place comment
    const pdfPage = this.page.locator(`[data-testid="pdf-page-${pageNum}"]`)
    await pdfPage.click({ position: { x: 200, y: 200 } })
    
    // Fill annotation form
    await expect(this.annotationForm).toBeVisible()
    await this.annotationText.fill(text)
    await this.saveAnnotation.click()
    
    await this.expectSuccessMessage('comment added')
  }

  async expectAnnotationsVisible(): Promise<void> {
    await this.switchToAnnotationsTab()
    const annotationCount = await this.annotationItems.count()
    expect(annotationCount).toBeGreaterThan(0)
  }

  async deleteAnnotation(index = 0): Promise<void> {
    const annotation = this.annotationItems.nth(index)
    const deleteButton = annotation.locator('[data-testid="delete-annotation-button"]')
    await deleteButton.click()
    await this.confirmAction()
    await this.expectSuccessMessage('annotation deleted')
  }

  // Comment methods
  async addComment(text: string): Promise<void> {
    await this.switchToCommentsTab()
    await this.commentInput.fill(text)
    await this.commentSubmit.click()
    await this.expectSuccessMessage('comment added')
  }

  async expectCommentsVisible(): Promise<void> {
    await this.switchToCommentsTab()
    const commentCount = await this.commentItems.count()
    expect(commentCount).toBeGreaterThan(0)
  }

  async replyToComment(index = 0, replyText = 'Test reply'): Promise<void> {
    const comment = this.commentItems.nth(index)
    const replyButton = comment.locator('[data-testid="reply-button"]')
    await replyButton.click()
    
    const replyInput = comment.locator('[data-testid="reply-input"]')
    await replyInput.fill(replyText)
    
    const submitReply = comment.locator('[data-testid="submit-reply-button"]')
    await submitReply.click()
    
    await this.expectSuccessMessage('reply added')
  }

  // Collaboration methods
  async expectCollaborators(): Promise<void> {
    await expect(this.collaboratorsList).toBeVisible()
    const collaboratorCount = await this.collaboratorItem.count()
    expect(collaboratorCount).toBeGreaterThan(0)
  }

  async removeCollaborator(index = 0): Promise<void> {
    const collaborator = this.collaboratorItem.nth(index)
    const removeButton = collaborator.locator('[data-testid="remove-collaborator-button"]')
    await removeButton.click()
    await this.confirmAction()
    await this.expectSuccessMessage('collaborator removed')
  }

  // Real-time testing methods
  async testRealTimeAnnotations(): Promise<void> {
    // This would require WebSocket testing or multiple browser contexts
    // to simulate real-time collaboration
    await this.createHighlightAnnotation(1, 'Real-time test annotation')
    await this.expectAnnotationsVisible()
  }

  async testRealTimeComments(): Promise<void> {
    await this.addComment('Real-time test comment')
    await this.expectCommentsVisible()
  }

  // Performance testing
  async measureAssetLoadTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.viewAsset(0)
    })
  }

  async measureUploadTime(filePath: string): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.uploadFile(filePath, 'Performance Test File')
    })
  }
}