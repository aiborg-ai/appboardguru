import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Organizations Page Object Model
 * Handles organization management, creation, member invitation, and settings
 */
export class OrganizationsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page URLs
  readonly organizationsUrl = '/dashboard/organizations'
  readonly createOrganizationUrl = '/dashboard/organizations/create'

  // Main page elements
  get organizationsPage(): Locator {
    return this.page.locator('[data-testid="organizations-page"]')
  }

  get organizationsGrid(): Locator {
    return this.page.locator('[data-testid="organizations-grid"]')
  }

  get organizationItems(): Locator {
    return this.page.locator('[data-testid="organization-item"]')
  }

  get emptyState(): Locator {
    return this.page.locator('[data-testid="organizations-empty-state"]')
  }

  // Create organization elements
  get createButton(): Locator {
    return this.page.locator('[data-testid="create-organization-button"]')
  }

  get createModal(): Locator {
    return this.page.locator('[data-testid="create-organization-modal"]')
  }

  get createWizard(): Locator {
    return this.page.locator('[data-testid="create-organization-wizard"]')
  }

  // Step 1: Basic Information
  get orgNameInput(): Locator {
    return this.page.locator('[data-testid="org-name-input"]')
  }

  get orgSlugInput(): Locator {
    return this.page.locator('[data-testid="org-slug-input"]')
  }

  get orgDescriptionInput(): Locator {
    return this.page.locator('[data-testid="org-description-input"]')
  }

  get orgIndustrySelect(): Locator {
    return this.page.locator('[data-testid="org-industry-select"]')
  }

  get orgSizeSelect(): Locator {
    return this.page.locator('[data-testid="org-size-select"]')
  }

  get orgTypeSelect(): Locator {
    return this.page.locator('[data-testid="org-type-select"]')
  }

  // Step 2: Members and Roles
  get membersStep(): Locator {
    return this.page.locator('[data-testid="members-step"]')
  }

  get inviteEmailInput(): Locator {
    return this.page.locator('[data-testid="invite-email-input"]')
  }

  get inviteRoleSelect(): Locator {
    return this.page.locator('[data-testid="invite-role-select"]')
  }

  get addMemberButton(): Locator {
    return this.page.locator('[data-testid="add-member-button"]')
  }

  get pendingInvitesList(): Locator {
    return this.page.locator('[data-testid="pending-invites-list"]')
  }

  get inviteItem(): Locator {
    return this.page.locator('[data-testid="invite-item"]')
  }

  // Step 3: Features and Settings
  get featuresStep(): Locator {
    return this.page.locator('[data-testid="features-step"]')
  }

  get enableVaultManagement(): Locator {
    return this.page.locator('[data-testid="enable-vault-management"]')
  }

  get enableBoardChat(): Locator {
    return this.page.locator('[data-testid="enable-board-chat"]')
  }

  get enableDocumentAnnotations(): Locator {
    return this.page.locator('[data-testid="enable-document-annotations"]')
  }

  get enableVoiceAssistant(): Locator {
    return this.page.locator('[data-testid="enable-voice-assistant"]')
  }

  get enableCalendarIntegration(): Locator {
    return this.page.locator('[data-testid="enable-calendar-integration"]')
  }

  // Step 4: Review and Create
  get reviewStep(): Locator {
    return this.page.locator('[data-testid="review-step"]')
  }

  get reviewOrgName(): Locator {
    return this.page.locator('[data-testid="review-org-name"]')
  }

  get reviewOrgSlug(): Locator {
    return this.page.locator('[data-testid="review-org-slug"]')
  }

  get reviewMembersCount(): Locator {
    return this.page.locator('[data-testid="review-members-count"]')
  }

  get reviewFeaturesCount(): Locator {
    return this.page.locator('[data-testid="review-features-count"]')
  }

  // Wizard navigation
  get nextButton(): Locator {
    return this.page.locator('[data-testid="wizard-next-button"]')
  }

  get backButton(): Locator {
    return this.page.locator('[data-testid="wizard-back-button"]')
  }

  get createOrgSubmitButton(): Locator {
    return this.page.locator('[data-testid="create-org-submit-button"]')
  }

  get wizardProgress(): Locator {
    return this.page.locator('[data-testid="wizard-progress"]')
  }

  // Organization management
  get orgActionMenu(): Locator {
    return this.page.locator('[data-testid="org-action-menu"]')
  }

  get actionViewDetails(): Locator {
    return this.page.locator('[data-testid="action-view-details"]')
  }

  get actionManageMembers(): Locator {
    return this.page.locator('[data-testid="action-manage-members"]')
  }

  get actionSettings(): Locator {
    return this.page.locator('[data-testid="action-settings"]')
  }

  get actionArchive(): Locator {
    return this.page.locator('[data-testid="action-archive"]')
  }

  get actionDelete(): Locator {
    return this.page.locator('[data-testid="action-delete"]')
  }

  // Organization details page
  get orgDetailsPage(): Locator {
    return this.page.locator('[data-testid="org-details-page"]')
  }

  get orgHeader(): Locator {
    return this.page.locator('[data-testid="org-header"]')
  }

  get orgStats(): Locator {
    return this.page.locator('[data-testid="org-stats"]')
  }

  get orgMembersList(): Locator {
    return this.page.locator('[data-testid="org-members-list"]')
  }

  get orgVaultsList(): Locator {
    return this.page.locator('[data-testid="org-vaults-list"]')
  }

  get orgAssetsList(): Locator {
    return this.page.locator('[data-testid="org-assets-list"]')
  }

  // Member management modal
  get membersModal(): Locator {
    return this.page.locator('[data-testid="members-modal"]')
  }

  get currentMembersList(): Locator {
    return this.page.locator('[data-testid="current-members-list"]')
  }

  get memberItem(): Locator {
    return this.page.locator('[data-testid="member-item"]')
  }

  get inviteMemberButton(): Locator {
    return this.page.locator('[data-testid="invite-member-button"]')
  }

  get inviteForm(): Locator {
    return this.page.locator('[data-testid="invite-form"]')
  }

  get inviteEmailField(): Locator {
    return this.page.locator('[data-testid="invite-email-field"]')
  }

  get inviteRoleField(): Locator {
    return this.page.locator('[data-testid="invite-role-field"]')
  }

  get inviteMessageField(): Locator {
    return this.page.locator('[data-testid="invite-message-field"]')
  }

  get sendInviteButton(): Locator {
    return this.page.locator('[data-testid="send-invite-button"]')
  }

  // Settings modal
  get settingsModal(): Locator {
    return this.page.locator('[data-testid="org-settings-modal"]')
  }

  get settingsTabs(): Locator {
    return this.page.locator('[data-testid="settings-tabs"]')
  }

  get generalTab(): Locator {
    return this.page.locator('[data-testid="settings-tab-general"]')
  }

  get featuresTab(): Locator {
    return this.page.locator('[data-testid="settings-tab-features"]')
  }

  get securityTab(): Locator {
    return this.page.locator('[data-testid="settings-tab-security"]')
  }

  get dangerZoneTab(): Locator {
    return this.page.locator('[data-testid="settings-tab-danger-zone"]')
  }

  // Navigation methods
  async goToOrganizations(): Promise<void> {
    await this.page.goto(this.organizationsUrl)
    await expect(this.organizationsPage).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  async goToCreateOrganization(): Promise<void> {
    await this.page.goto(this.createOrganizationUrl)
    await expect(this.createWizard).toBeVisible()
  }

  // Organization listing methods
  async expectOrganizationsDisplayed(): Promise<void> {
    const orgCount = await this.organizationItems.count()
    expect(orgCount).toBeGreaterThan(0)
  }

  async expectEmptyState(): Promise<void> {
    await expect(this.emptyState).toBeVisible()
    await expect(this.emptyState).toContainText('No organizations found')
  }

  async selectOrganization(index = 0): Promise<void> {
    const orgItem = this.organizationItems.nth(index)
    await orgItem.click()
    await expect(this.orgDetailsPage).toBeVisible()
  }

  // Create organization wizard methods
  async startCreateOrganization(): Promise<void> {
    await this.createButton.click()
    await expect(this.createWizard).toBeVisible()
  }

  async fillBasicInformation(
    name: string,
    slug?: string,
    description?: string,
    industry?: string,
    size?: string,
    type?: string
  ): Promise<void> {
    await this.orgNameInput.fill(name)
    
    if (slug) {
      // Clear auto-generated slug if needed
      await this.orgSlugInput.clear()
      await this.orgSlugInput.fill(slug)
    }
    
    if (description) {
      await this.orgDescriptionInput.fill(description)
    }
    
    if (industry) {
      await this.selectDropdownOption('[data-testid="org-industry-select"]', industry)
    }
    
    if (size) {
      await this.selectDropdownOption('[data-testid="org-size-select"]', size)
    }
    
    if (type) {
      await this.selectDropdownOption('[data-testid="org-type-select"]', type)
    }
  }

  async proceedToNextStep(): Promise<void> {
    await this.nextButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async goBackToPreviousStep(): Promise<void> {
    await this.backButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async addMemberInvitation(email: string, role = 'member', message?: string): Promise<void> {
    await expect(this.membersStep).toBeVisible()
    
    await this.inviteEmailInput.fill(email)
    await this.selectDropdownOption('[data-testid="invite-role-select"]', role)
    
    if (message) {
      const messageField = this.page.locator('[data-testid="invite-message-input"]')
      if (await messageField.isVisible()) {
        await messageField.fill(message)
      }
    }
    
    await this.addMemberButton.click()
    
    // Verify invite was added to list
    await expect(this.inviteItem.filter({ hasText: email })).toBeVisible()
  }

  async removePendingInvite(email: string): Promise<void> {
    const inviteItem = this.inviteItem.filter({ hasText: email })
    const removeButton = inviteItem.locator('[data-testid="remove-invite-button"]')
    await removeButton.click()
    
    // Verify invite was removed
    await expect(inviteItem).not.toBeVisible()
  }

  async configureFeatures(features: string[]): Promise<void> {
    await expect(this.featuresStep).toBeVisible()
    
    const featureMap: Record<string, Locator> = {
      'vault-management': this.enableVaultManagement,
      'board-chat': this.enableBoardChat,
      'document-annotations': this.enableDocumentAnnotations,
      'voice-assistant': this.enableVoiceAssistant,
      'calendar-integration': this.enableCalendarIntegration,
    }
    
    for (const feature of features) {
      const featureToggle = featureMap[feature]
      if (featureToggle) {
        await featureToggle.check()
      }
    }
  }

  async reviewAndSubmit(): Promise<void> {
    await expect(this.reviewStep).toBeVisible()
    
    // Verify review information is displayed
    await expect(this.reviewOrgName).toBeVisible()
    await expect(this.reviewOrgSlug).toBeVisible()
    
    await this.createOrgSubmitButton.click()
    await this.expectSuccessMessage('Organization created successfully')
  }

  async createOrganizationComplete(
    name: string,
    members: Array<{ email: string; role: string }> = [],
    features: string[] = [],
    slug?: string,
    description?: string
  ): Promise<void> {
    await this.startCreateOrganization()
    
    // Step 1: Basic Information
    await this.fillBasicInformation(name, slug, description)
    await this.proceedToNextStep()
    
    // Step 2: Add Members
    for (const member of members) {
      await this.addMemberInvitation(member.email, member.role)
    }
    await this.proceedToNextStep()
    
    // Step 3: Configure Features
    await this.configureFeatures(features)
    await this.proceedToNextStep()
    
    // Step 4: Review and Submit
    await this.reviewAndSubmit()
    
    // Should redirect to organization details or organizations list
    await this.page.waitForURL(/\/dashboard\/organizations/)
  }

  // Organization management methods
  async openOrganizationActions(index = 0): Promise<void> {
    const orgItem = this.organizationItems.nth(index)
    const actionButton = orgItem.locator('[data-testid="org-action-button"]')
    await actionButton.click()
    await expect(this.orgActionMenu).toBeVisible()
  }

  async viewOrganizationDetails(index = 0): Promise<void> {
    await this.openOrganizationActions(index)
    await this.actionViewDetails.click()
    await expect(this.orgDetailsPage).toBeVisible()
  }

  async openMembersManagement(index = 0): Promise<void> {
    await this.openOrganizationActions(index)
    await this.actionManageMembers.click()
    await expect(this.membersModal).toBeVisible()
  }

  async openOrganizationSettings(index = 0): Promise<void> {
    await this.openOrganizationActions(index)
    await this.actionSettings.click()
    await expect(this.settingsModal).toBeVisible()
  }

  async archiveOrganization(index = 0): Promise<void> {
    await this.openOrganizationActions(index)
    await this.actionArchive.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Organization archived')
  }

  async deleteOrganization(index = 0): Promise<void> {
    await this.openOrganizationActions(index)
    await this.actionDelete.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Organization deleted')
  }

  // Member management methods
  async inviteNewMember(email: string, role = 'member', message?: string): Promise<void> {
    await expect(this.membersModal).toBeVisible()
    await this.inviteMemberButton.click()
    
    await expect(this.inviteForm).toBeVisible()
    await this.inviteEmailField.fill(email)
    await this.selectDropdownOption('[data-testid="invite-role-field"]', role)
    
    if (message) {
      await this.inviteMessageField.fill(message)
    }
    
    await this.sendInviteButton.click()
    await this.expectSuccessMessage('Invitation sent')
  }

  async removeMember(memberEmail: string): Promise<void> {
    const memberItem = this.memberItem.filter({ hasText: memberEmail })
    const removeButton = memberItem.locator('[data-testid="remove-member-button"]')
    await removeButton.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Member removed')
  }

  async changeMemberRole(memberEmail: string, newRole: string): Promise<void> {
    const memberItem = this.memberItem.filter({ hasText: memberEmail })
    const roleSelect = memberItem.locator('[data-testid="member-role-select"]')
    await this.selectDropdownOption(roleSelect, newRole)
    await this.expectSuccessMessage('Role updated')
  }

  async expectMembersDisplayed(): Promise<void> {
    await expect(this.currentMembersList).toBeVisible()
    const memberCount = await this.memberItem.count()
    expect(memberCount).toBeGreaterThan(0)
  }

  // Settings methods
  async updateGeneralSettings(updates: Record<string, string>): Promise<void> {
    await expect(this.settingsModal).toBeVisible()
    await this.generalTab.click()
    
    for (const [field, value] of Object.entries(updates)) {
      const input = this.page.locator(`[data-testid="settings-${field}"]`)
      await input.clear()
      await input.fill(value)
    }
    
    const saveButton = this.page.locator('[data-testid="save-settings-button"]')
    await saveButton.click()
    await this.expectSuccessMessage('Settings updated')
  }

  async toggleFeature(featureName: string, enabled: boolean): Promise<void> {
    await this.featuresTab.click()
    
    const featureToggle = this.page.locator(`[data-testid="feature-${featureName}"]`)
    if (enabled) {
      await featureToggle.check()
    } else {
      await featureToggle.uncheck()
    }
    
    const saveButton = this.page.locator('[data-testid="save-features-button"]')
    await saveButton.click()
    await this.expectSuccessMessage('Features updated')
  }

  async updateSecuritySettings(settings: Record<string, any>): Promise<void> {
    await this.securityTab.click()
    
    for (const [setting, value] of Object.entries(settings)) {
      const control = this.page.locator(`[data-testid="security-${setting}"]`)
      
      if (typeof value === 'boolean') {
        if (value) {
          await control.check()
        } else {
          await control.uncheck()
        }
      } else {
        await control.fill(String(value))
      }
    }
    
    const saveButton = this.page.locator('[data-testid="save-security-button"]')
    await saveButton.click()
    await this.expectSuccessMessage('Security settings updated')
  }

  // Organization details methods
  async expectOrganizationStats(): Promise<void> {
    await expect(this.orgStats).toBeVisible()
    
    const stats = ['members', 'vaults', 'assets', 'meetings']
    for (const stat of stats) {
      const statElement = this.page.locator(`[data-testid="stat-${stat}"]`)
      await expect(statElement).toBeVisible()
      await expect(statElement.locator('[data-testid="stat-value"]')).toContainText(/\d+/)
    }
  }

  async expectOrganizationMembers(): Promise<void> {
    await expect(this.orgMembersList).toBeVisible()
    const memberCount = await this.orgMembersList.locator('[data-testid="member-card"]').count()
    expect(memberCount).toBeGreaterThan(0)
  }

  async expectOrganizationVaults(): Promise<void> {
    await expect(this.orgVaultsList).toBeVisible()
    // Vaults list might be empty for new organizations
  }

  async expectOrganizationAssets(): Promise<void> {
    await expect(this.orgAssetsList).toBeVisible()
    // Assets list might be empty for new organizations
  }

  // Search and filter methods
  async searchOrganizations(query: string): Promise<void> {
    const searchInput = this.page.locator('[data-testid="organizations-search"]')
    await searchInput.fill(query)
    await this.page.keyboard.press('Enter')
    await this.waitForSpinnerToDisappear()
  }

  async filterByStatus(status: string): Promise<void> {
    const filterDropdown = this.page.locator('[data-testid="organizations-filter-status"]')
    await this.selectDropdownOption(filterDropdown, status)
    await this.waitForSpinnerToDisappear()
  }

  // Performance testing
  async measureOrganizationCreationTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.createOrganizationComplete(
        'Performance Test Organization',
        [{ email: 'test@example.com', role: 'member' }],
        ['vault-management', 'board-chat']
      )
    })
  }

  async measureMemberInvitationTime(): Promise<number> {
    await this.openMembersManagement(0)
    
    return await this.measureActionTime(async () => {
      await this.inviteNewMember('performance-test@example.com', 'member')
    })
  }
}