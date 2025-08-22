import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Vaults Page Object Model
 * Handles vault management, creation, member management, and asset organization
 */
export class VaultsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page URLs
  readonly vaultsUrl = '/dashboard/vaults'
  readonly createVaultUrl = '/dashboard/vaults/create'
  readonly vaultViewUrl = '/dashboard/vaults/[id]'

  // Main page elements
  get vaultsPage(): Locator {
    return this.page.locator('[data-testid="vaults-page"]')
  }

  get vaultsGrid(): Locator {
    return this.page.locator('[data-testid="vaults-grid"]')
  }

  get vaultItems(): Locator {
    return this.page.locator('[data-testid="vault-item"]')
  }

  get emptyState(): Locator {
    return this.page.locator('[data-testid="vaults-empty-state"]')
  }

  // View controls
  get viewToggleGrid(): Locator {
    return this.page.locator('[data-testid="vaults-view-grid"]')
  }

  get viewToggleList(): Locator {
    return this.page.locator('[data-testid="vaults-view-list"]')
  }

  get viewToggleKanban(): Locator {
    return this.page.locator('[data-testid="vaults-view-kanban"]')
  }

  // Filters and search
  get searchInput(): Locator {
    return this.page.locator('[data-testid="vaults-search"]')
  }

  get statusFilter(): Locator {
    return this.page.locator('[data-testid="vaults-filter-status"]')
  }

  get priorityFilter(): Locator {
    return this.page.locator('[data-testid="vaults-filter-priority"]')
  }

  get dateRangeFilter(): Locator {
    return this.page.locator('[data-testid="vaults-filter-date-range"]')
  }

  get sortDropdown(): Locator {
    return this.page.locator('[data-testid="vaults-sort-dropdown"]')
  }

  // Create vault elements
  get createButton(): Locator {
    return this.page.locator('[data-testid="create-vault-button"]')
  }

  get createWizard(): Locator {
    return this.page.locator('[data-testid="create-vault-wizard"]')
  }

  // Step 1: Organization Selection
  get organizationStep(): Locator {
    return this.page.locator('[data-testid="organization-step"]')
  }

  get organizationSelect(): Locator {
    return this.page.locator('[data-testid="vault-organization-select"]')
  }

  get organizationCards(): Locator {
    return this.page.locator('[data-testid="organization-card"]')
  }

  // Step 2: Vault Details
  get detailsStep(): Locator {
    return this.page.locator('[data-testid="vault-details-step"]')
  }

  get vaultNameInput(): Locator {
    return this.page.locator('[data-testid="vault-name-input"]')
  }

  get vaultDescriptionInput(): Locator {
    return this.page.locator('[data-testid="vault-description-input"]')
  }

  get vaultStatusSelect(): Locator {
    return this.page.locator('[data-testid="vault-status-select"]')
  }

  get vaultPrioritySelect(): Locator {
    return this.page.locator('[data-testid="vault-priority-select"]')
  }

  get meetingDatePicker(): Locator {
    return this.page.locator('[data-testid="meeting-date-picker"]')
  }

  get meetingTimeInput(): Locator {
    return this.page.locator('[data-testid="meeting-time-input"]')
  }

  get vaultTagsInput(): Locator {
    return this.page.locator('[data-testid="vault-tags-input"]')
  }

  // Step 3: Board Members
  get boardMembersStep(): Locator {
    return this.page.locator('[data-testid="board-members-step"]')
  }

  get memberSearchInput(): Locator {
    return this.page.locator('[data-testid="member-search-input"]')
  }

  get availableMembersList(): Locator {
    return this.page.locator('[data-testid="available-members-list"]')
  }

  get selectedMembersList(): Locator {
    return this.page.locator('[data-testid="selected-members-list"]')
  }

  get memberItem(): Locator {
    return this.page.locator('[data-testid="member-item"]')
  }

  get addMemberButton(): Locator {
    return this.page.locator('[data-testid="add-member-button"]')
  }

  get removeMemberButton(): Locator {
    return this.page.locator('[data-testid="remove-member-button"]')
  }

  // Step 4: Assets
  get assetsStep(): Locator {
    return this.page.locator('[data-testid="assets-step"]')
  }

  get availableAssetsList(): Locator {
    return this.page.locator('[data-testid="available-assets-list"]')
  }

  get selectedAssetsList(): Locator {
    return this.page.locator('[data-testid="selected-assets-list"]')
  }

  get assetItem(): Locator {
    return this.page.locator('[data-testid="asset-item"]')
  }

  get addAssetButton(): Locator {
    return this.page.locator('[data-testid="add-asset-button"]')
  }

  get removeAssetButton(): Locator {
    return this.page.locator('[data-testid="remove-asset-button"]')
  }

  get uploadNewAssetButton(): Locator {
    return this.page.locator('[data-testid="upload-new-asset-button"]')
  }

  // Step 5: Review
  get reviewStep(): Locator {
    return this.page.locator('[data-testid="review-step"]')
  }

  get reviewVaultName(): Locator {
    return this.page.locator('[data-testid="review-vault-name"]')
  }

  get reviewOrganization(): Locator {
    return this.page.locator('[data-testid="review-organization"]')
  }

  get reviewMembersCount(): Locator {
    return this.page.locator('[data-testid="review-members-count"]')
  }

  get reviewAssetsCount(): Locator {
    return this.page.locator('[data-testid="review-assets-count"]')
  }

  // Wizard navigation
  get nextButton(): Locator {
    return this.page.locator('[data-testid="wizard-next-button"]')
  }

  get backButton(): Locator {
    return this.page.locator('[data-testid="wizard-back-button"]')
  }

  get createVaultSubmitButton(): Locator {
    return this.page.locator('[data-testid="create-vault-submit-button"]')
  }

  get wizardProgress(): Locator {
    return this.page.locator('[data-testid="wizard-progress"]')
  }

  // Vault actions
  get vaultActionMenu(): Locator {
    return this.page.locator('[data-testid="vault-action-menu"]')
  }

  get actionView(): Locator {
    return this.page.locator('[data-testid="action-view"]')
  }

  get actionEdit(): Locator {
    return this.page.locator('[data-testid="action-edit"]')
  }

  get actionShare(): Locator {
    return this.page.locator('[data-testid="action-share"]')
  }

  get actionArchive(): Locator {
    return this.page.locator('[data-testid="action-archive"]')
  }

  get actionDelete(): Locator {
    return this.page.locator('[data-testid="action-delete"]')
  }

  get actionDuplicate(): Locator {
    return this.page.locator('[data-testid="action-duplicate"]')
  }

  // Vault details page
  get vaultDetailsPage(): Locator {
    return this.page.locator('[data-testid="vault-details-page"]')
  }

  get vaultHeader(): Locator {
    return this.page.locator('[data-testid="vault-header"]')
  }

  get vaultTitle(): Locator {
    return this.page.locator('[data-testid="vault-title"]')
  }

  get vaultStatus(): Locator {
    return this.page.locator('[data-testid="vault-status"]')
  }

  get vaultPriority(): Locator {
    return this.page.locator('[data-testid="vault-priority"]')
  }

  get vaultMeetingDate(): Locator {
    return this.page.locator('[data-testid="vault-meeting-date"]')
  }

  get vaultProgress(): Locator {
    return this.page.locator('[data-testid="vault-progress"]')
  }

  // Vault tabs
  get vaultTabs(): Locator {
    return this.page.locator('[data-testid="vault-tabs"]')
  }

  get tabAssets(): Locator {
    return this.page.locator('[data-testid="tab-assets"]')
  }

  get tabMembers(): Locator {
    return this.page.locator('[data-testid="tab-members"]')
  }

  get tabActivity(): Locator {
    return this.page.locator('[data-testid="tab-activity"]')
  }

  get tabComments(): Locator {
    return this.page.locator('[data-testid="tab-comments"]')
  }

  get tabSettings(): Locator {
    return this.page.locator('[data-testid="tab-settings"]')
  }

  // Assets tab content
  get vaultAssetsList(): Locator {
    return this.page.locator('[data-testid="vault-assets-list"]')
  }

  get vaultAssetItems(): Locator {
    return this.page.locator('[data-testid="vault-asset-item"]')
  }

  get addAssetsButton(): Locator {
    return this.page.locator('[data-testid="add-assets-button"]')
  }

  get addAssetsModal(): Locator {
    return this.page.locator('[data-testid="add-assets-modal"]')
  }

  // Members tab content
  get vaultMembersList(): Locator {
    return this.page.locator('[data-testid="vault-members-list"]')
  }

  get vaultMemberItems(): Locator {
    return this.page.locator('[data-testid="vault-member-item"]')
  }

  get inviteMembersButton(): Locator {
    return this.page.locator('[data-testid="invite-members-button"]')
  }

  get inviteMembersModal(): Locator {
    return this.page.locator('[data-testid="invite-members-modal"]')
  }

  // Activity tab content
  get activityFeed(): Locator {
    return this.page.locator('[data-testid="vault-activity-feed"]')
  }

  get activityItems(): Locator {
    return this.page.locator('[data-testid="vault-activity-item"]')
  }

  // Comments tab content
  get commentsSection(): Locator {
    return this.page.locator('[data-testid="vault-comments-section"]')
  }

  get commentsList(): Locator {
    return this.page.locator('[data-testid="vault-comments-list"]')
  }

  get commentItems(): Locator {
    return this.page.locator('[data-testid="vault-comment-item"]')
  }

  get commentForm(): Locator {
    return this.page.locator('[data-testid="vault-comment-form"]')
  }

  get commentInput(): Locator {
    return this.page.locator('[data-testid="vault-comment-input"]')
  }

  get commentSubmitButton(): Locator {
    return this.page.locator('[data-testid="vault-comment-submit"]')
  }

  // Board chat integration
  get boardChatButton(): Locator {
    return this.page.locator('[data-testid="vault-board-chat-button"]')
  }

  get boardChatPanel(): Locator {
    return this.page.locator('[data-testid="vault-board-chat-panel"]')
  }

  // Navigation methods
  async goToVaults(): Promise<void> {
    await this.page.goto(this.vaultsUrl)
    await expect(this.vaultsPage).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  async goToCreateVault(): Promise<void> {
    await this.page.goto(this.createVaultUrl)
    await expect(this.createWizard).toBeVisible()
  }

  async goToVault(vaultId: string): Promise<void> {
    await this.page.goto(`/dashboard/vaults/${vaultId}`)
    await expect(this.vaultDetailsPage).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  // Vault listing methods
  async expectVaultsDisplayed(): Promise<void> {
    const vaultCount = await this.vaultItems.count()
    expect(vaultCount).toBeGreaterThan(0)
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible()
    await expect(this.emptyState).toContainText('No vaults found')
  }

  async switchToGridView(): Promise<void> {
    await this.viewToggleGrid.click()
    await expect(this.vaultsGrid).toBeVisible()
  }

  async switchToListView(): Promise<void> {
    await this.viewToggleList.click()
    await expect(this.page.locator('[data-testid="vaults-list"]')).toBeVisible()
  }

  async switchToKanbanView(): Promise<void> {
    await this.viewToggleKanban.click()
    await expect(this.page.locator('[data-testid="vaults-kanban"]')).toBeVisible()
  }

  // Search and filter methods
  async searchVaults(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.keyboard.press('Enter')
    await this.waitForSpinnerToDisappear()
  }

  async filterByStatus(status: string): Promise<void> {
    await this.selectDropdownOption('[data-testid="vaults-filter-status"]', status)
    await this.waitForSpinnerToDisappear()
  }

  async filterByPriority(priority: string): Promise<void> {
    await this.selectDropdownOption('[data-testid="vaults-filter-priority"]', priority)
    await this.waitForSpinnerToDisappear()
  }

  async sortBy(sortOption: string): Promise<void> {
    await this.selectDropdownOption('[data-testid="vaults-sort-dropdown"]', sortOption)
    await this.waitForSpinnerToDisappear()
  }

  // Create vault wizard methods
  async startCreateVault(): Promise<void> {
    await this.createButton.click()
    await expect(this.createWizard).toBeVisible()
  }

  async selectOrganization(orgId: string): Promise<void> {
    await expect(this.organizationStep).toBeVisible()
    
    const orgCard = this.organizationCards.filter({ hasText: orgId })
    await orgCard.click()
    
    await expect(orgCard).toHaveClass(/selected/)
  }

  async fillVaultDetails(
    name: string,
    description?: string,
    status = 'processing',
    priority = 'medium',
    meetingDate?: string,
    tags: string[] = []
  ): Promise<void> {
    await expect(this.detailsStep).toBeVisible()
    
    await this.vaultNameInput.fill(name)
    
    if (description) {
      await this.vaultDescriptionInput.fill(description)
    }
    
    await this.selectDropdownOption('[data-testid="vault-status-select"]', status)
    await this.selectDropdownOption('[data-testid="vault-priority-select"]', priority)
    
    if (meetingDate) {
      await this.meetingDatePicker.fill(meetingDate)
    }
    
    for (const tag of tags) {
      await this.vaultTagsInput.fill(tag)
      await this.page.keyboard.press('Enter')
    }
  }

  async addBoardMembers(memberEmails: string[]): Promise<void> {
    await expect(this.boardMembersStep).toBeVisible()
    
    for (const email of memberEmails) {
      // Search for member
      await this.memberSearchInput.fill(email)
      await this.page.waitForTimeout(500) // Wait for search results
      
      // Select member from available list
      const memberItem = this.availableMembersList.locator(`[data-email="${email}"]`)
      if (await memberItem.isVisible()) {
        await memberItem.locator('[data-testid="add-member-button"]').click()
      }
    }
    
    // Verify members were added
    const selectedCount = await this.selectedMembersList.locator('[data-testid="member-item"]').count()
    expect(selectedCount).toBeGreaterThanOrEqual(memberEmails.length)
  }

  async addAssets(assetIds: string[]): Promise<void> {
    await expect(this.assetsStep).toBeVisible()
    
    for (const assetId of assetIds) {
      const assetItem = this.availableAssetsList.locator(`[data-asset-id="${assetId}"]`)
      if (await assetItem.isVisible()) {
        await assetItem.locator('[data-testid="add-asset-button"]').click()
      }
    }
    
    // Verify assets were added
    const selectedCount = await this.selectedAssetsList.locator('[data-testid="asset-item"]').count()
    expect(selectedCount).toBeGreaterThanOrEqual(assetIds.length)
  }

  async reviewAndSubmit(): Promise<void> {
    await expect(this.reviewStep).toBeVisible()
    
    // Verify review information
    await expect(this.reviewVaultName).toBeVisible()
    await expect(this.reviewOrganization).toBeVisible()
    
    await this.createVaultSubmitButton.click()
    await this.expectSuccessMessage('Vault created successfully')
  }

  async proceedToNextStep(): Promise<void> {
    await this.nextButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async goBackToPreviousStep(): Promise<void> {
    await this.backButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async createVaultComplete(
    organizationId: string,
    vaultName: string,
    members: string[] = [],
    assets: string[] = [],
    details: {
      description?: string
      status?: string
      priority?: string
      meetingDate?: string
      tags?: string[]
    } = {}
  ): Promise<void> {
    await this.startCreateVault()
    
    // Step 1: Select Organization
    await this.selectOrganization(organizationId)
    await this.proceedToNextStep()
    
    // Step 2: Vault Details
    await this.fillVaultDetails(
      vaultName,
      details.description,
      details.status,
      details.priority,
      details.meetingDate,
      details.tags
    )
    await this.proceedToNextStep()
    
    // Step 3: Add Board Members
    if (members.length > 0) {
      await this.addBoardMembers(members)
    }
    await this.proceedToNextStep()
    
    // Step 4: Add Assets
    if (assets.length > 0) {
      await this.addAssets(assets)
    }
    await this.proceedToNextStep()
    
    // Step 5: Review and Submit
    await this.reviewAndSubmit()
    
    // Should redirect to vault details
    await this.page.waitForURL(/\/dashboard\/vaults\//)
  }

  // Vault management methods
  async openVaultActions(index = 0): Promise<void> {
    const vaultItem = this.vaultItems.nth(index)
    const actionButton = vaultItem.locator('[data-testid="vault-action-button"]')
    await actionButton.click()
    await expect(this.vaultActionMenu).toBeVisible()
  }

  async viewVault(index = 0): Promise<void> {
    await this.openVaultActions(index)
    await this.actionView.click()
    await expect(this.vaultDetailsPage).toBeVisible()
  }

  async editVault(index = 0): Promise<void> {
    await this.openVaultActions(index)
    await this.actionEdit.click()
    // Should open edit modal or navigate to edit page
  }

  async shareVault(index = 0): Promise<void> {
    await this.openVaultActions(index)
    await this.actionShare.click()
    await expect(this.page.locator('[data-testid="share-vault-modal"]')).toBeVisible()
  }

  async duplicateVault(index = 0): Promise<void> {
    await this.openVaultActions(index)
    await this.actionDuplicate.click()
    await this.expectSuccessMessage('Vault duplicated')
  }

  async archiveVault(index = 0): Promise<void> {
    await this.openVaultActions(index)
    await this.actionArchive.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Vault archived')
  }

  async deleteVault(index = 0): Promise<void> {
    await this.openVaultActions(index)
    await this.actionDelete.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Vault deleted')
  }

  // Vault details methods
  async expectVaultInfo(name: string, status?: string, priority?: string): Promise<void> {
    await expect(this.vaultTitle).toContainText(name)
    if (status) {
      await expect(this.vaultStatus).toContainText(status)
    }
    if (priority) {
      await expect(this.vaultPriority).toContainText(priority)
    }
  }

  async switchToAssetsTab(): Promise<void> {
    await this.tabAssets.click()
    await expect(this.vaultAssetsList).toBeVisible()
  }

  async switchToMembersTab(): Promise<void> {
    await this.tabMembers.click()
    await expect(this.vaultMembersList).toBeVisible()
  }

  async switchToActivityTab(): Promise<void> {
    await this.tabActivity.click()
    await expect(this.activityFeed).toBeVisible()
  }

  async switchToCommentsTab(): Promise<void> {
    await this.tabComments.click()
    await expect(this.commentsSection).toBeVisible()
  }

  async addAssetToVault(assetId: string): Promise<void> {
    await this.switchToAssetsTab()
    await this.addAssetsButton.click()
    
    await expect(this.addAssetsModal).toBeVisible()
    const assetItem = this.page.locator(`[data-testid="asset-${assetId}"]`)
    await assetItem.click()
    
    const addButton = this.page.locator('[data-testid="add-selected-assets-button"]')
    await addButton.click()
    
    await this.expectSuccessMessage('Assets added to vault')
  }

  async removeAssetFromVault(index = 0): Promise<void> {
    await this.switchToAssetsTab()
    const assetItem = this.vaultAssetItems.nth(index)
    const removeButton = assetItem.locator('[data-testid="remove-asset-button"]')
    await removeButton.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Asset removed from vault')
  }

  async inviteMemberToVault(email: string): Promise<void> {
    await this.switchToMembersTab()
    await this.inviteMembersButton.click()
    
    await expect(this.inviteMembersModal).toBeVisible()
    const emailInput = this.page.locator('[data-testid="invite-email-input"]')
    await emailInput.fill(email)
    
    const inviteButton = this.page.locator('[data-testid="send-invite-button"]')
    await inviteButton.click()
    
    await this.expectSuccessMessage('Member invited to vault')
  }

  async removeMemberFromVault(index = 0): Promise<void> {
    await this.switchToMembersTab()
    const memberItem = this.vaultMemberItems.nth(index)
    const removeButton = memberItem.locator('[data-testid="remove-member-button"]')
    await removeButton.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Member removed from vault')
  }

  async addVaultComment(text: string): Promise<void> {
    await this.switchToCommentsTab()
    await this.commentInput.fill(text)
    await this.commentSubmitButton.click()
    await this.expectSuccessMessage('Comment added')
  }

  async expectVaultActivity(): Promise<void> {
    await this.switchToActivityTab()
    const activityCount = await this.activityItems.count()
    expect(activityCount).toBeGreaterThan(0)
  }

  async expectVaultComments(): Promise<void> {
    await this.switchToCommentsTab()
    const commentCount = await this.commentItems.count()
    expect(commentCount).toBeGreaterThan(0)
  }

  // Board chat integration
  async openVaultBoardChat(): Promise<void> {
    await this.boardChatButton.click()
    await expect(this.boardChatPanel).toBeVisible()
  }

  // Performance testing
  async measureVaultCreationTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.createVaultComplete(
        'test-org-id',
        'Performance Test Vault',
        ['member@example.com'],
        ['asset-id-1']
      )
    })
  }

  async measureVaultLoadTime(vaultId: string): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.goToVault(vaultId)
    })
  }
}