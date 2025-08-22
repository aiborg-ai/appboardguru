import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Meetings Page Object Model
 * Handles meeting management, creation, calendar integration, and voice features
 */
export class MeetingsPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page URLs
  readonly meetingsUrl = '/dashboard/meetings'
  readonly createMeetingUrl = '/dashboard/meetings/create'
  readonly meetingViewUrl = '/dashboard/meetings/[id]'

  // Main page elements
  get meetingsPage(): Locator {
    return this.page.locator('[data-testid="meetings-page"]')
  }

  get meetingsGrid(): Locator {
    return this.page.locator('[data-testid="meetings-grid"]')
  }

  get meetingsList(): Locator {
    return this.page.locator('[data-testid="meetings-list"]')
  }

  get meetingItems(): Locator {
    return this.page.locator('[data-testid="meeting-item"]')
  }

  get emptyState(): Locator {
    return this.page.locator('[data-testid="meetings-empty-state"]')
  }

  // View controls
  get viewToggleGrid(): Locator {
    return this.page.locator('[data-testid="meetings-view-grid"]')
  }

  get viewToggleList(): Locator {
    return this.page.locator('[data-testid="meetings-view-list"]')
  }

  get viewToggleCalendar(): Locator {
    return this.page.locator('[data-testid="meetings-view-calendar"]')
  }

  // Calendar view
  get calendarView(): Locator {
    return this.page.locator('[data-testid="meetings-calendar"]')
  }

  get calendarHeader(): Locator {
    return this.page.locator('[data-testid="calendar-header"]')
  }

  get prevMonthButton(): Locator {
    return this.page.locator('[data-testid="calendar-prev-month"]')
  }

  get nextMonthButton(): Locator {
    return this.page.locator('[data-testid="calendar-next-month"]')
  }

  get todayButton(): Locator {
    return this.page.locator('[data-testid="calendar-today"]')
  }

  get calendarDays(): Locator {
    return this.page.locator('[data-testid="calendar-day"]')
  }

  get meetingEvents(): Locator {
    return this.page.locator('[data-testid="calendar-meeting-event"]')
  }

  // Filters and search
  get searchInput(): Locator {
    return this.page.locator('[data-testid="meetings-search"]')
  }

  get statusFilter(): Locator {
    return this.page.locator('[data-testid="meetings-filter-status"]')
  }

  get typeFilter(): Locator {
    return this.page.locator('[data-testid="meetings-filter-type"]')
  }

  get dateRangeFilter(): Locator {
    return this.page.locator('[data-testid="meetings-filter-date-range"]')
  }

  get sortDropdown(): Locator {
    return this.page.locator('[data-testid="meetings-sort-dropdown"]')
  }

  // Create meeting elements
  get createButton(): Locator {
    return this.page.locator('[data-testid="create-meeting-button"]')
  }

  get createWizard(): Locator {
    return this.page.locator('[data-testid="create-meeting-wizard"]')
  }

  // Step 1: Meeting Type
  get meetingTypeStep(): Locator {
    return this.page.locator('[data-testid="meeting-type-step"]')
  }

  get boardMeetingType(): Locator {
    return this.page.locator('[data-testid="meeting-type-board"]')
  }

  get committeeMeetingType(): Locator {
    return this.page.locator('[data-testid="meeting-type-committee"]')
  }

  get generalMeetingType(): Locator {
    return this.page.locator('[data-testid="meeting-type-general"]')
  }

  get emergencyMeetingType(): Locator {
    return this.page.locator('[data-testid="meeting-type-emergency"]')
  }

  // Step 2: Calendar & Scheduling
  get calendarStep(): Locator {
    return this.page.locator('[data-testid="calendar-step"]')
  }

  get meetingTitleInput(): Locator {
    return this.page.locator('[data-testid="meeting-title-input"]')
  }

  get meetingDescriptionInput(): Locator {
    return this.page.locator('[data-testid="meeting-description-input"]')
  }

  get meetingDatePicker(): Locator {
    return this.page.locator('[data-testid="meeting-date-picker"]')
  }

  get meetingTimeInput(): Locator {
    return this.page.locator('[data-testid="meeting-time-input"]')
  }

  get meetingDurationSelect(): Locator {
    return this.page.locator('[data-testid="meeting-duration-select"]')
  }

  get meetingLocationInput(): Locator {
    return this.page.locator('[data-testid="meeting-location-input"]')
  }

  get virtualMeetingToggle(): Locator {
    return this.page.locator('[data-testid="virtual-meeting-toggle"]')
  }

  get meetingLinkInput(): Locator {
    return this.page.locator('[data-testid="meeting-link-input"]')
  }

  get timezoneSelect(): Locator {
    return this.page.locator('[data-testid="timezone-select"]')
  }

  // Step 3: Invitees
  get inviteesStep(): Locator {
    return this.page.locator('[data-testid="invitees-step"]')
  }

  get inviteeSearchInput(): Locator {
    return this.page.locator('[data-testid="invitee-search-input"]')
  }

  get availableInviteesList(): Locator {
    return this.page.locator('[data-testid="available-invitees-list"]')
  }

  get selectedInviteesList(): Locator {
    return this.page.locator('[data-testid="selected-invitees-list"]')
  }

  get inviteeItem(): Locator {
    return this.page.locator('[data-testid="invitee-item"]')
  }

  get addInviteeButton(): Locator {
    return this.page.locator('[data-testid="add-invitee-button"]')
  }

  get removeInviteeButton(): Locator {
    return this.page.locator('[data-testid="remove-invitee-button"]')
  }

  get inviteExternalButton(): Locator {
    return this.page.locator('[data-testid="invite-external-button"]')
  }

  get externalEmailInput(): Locator {
    return this.page.locator('[data-testid="external-email-input"]')
  }

  // Step 4: Agenda
  get agendaStep(): Locator {
    return this.page.locator('[data-testid="agenda-step"]')
  }

  get agendaItems(): Locator {
    return this.page.locator('[data-testid="agenda-items"]')
  }

  get agendaItem(): Locator {
    return this.page.locator('[data-testid="agenda-item"]')
  }

  get addAgendaItemButton(): Locator {
    return this.page.locator('[data-testid="add-agenda-item-button"]')
  }

  get agendaItemTitleInput(): Locator {
    return this.page.locator('[data-testid="agenda-item-title-input"]')
  }

  get agendaItemDescriptionInput(): Locator {
    return this.page.locator('[data-testid="agenda-item-description-input"]')
  }

  get agendaItemDurationInput(): Locator {
    return this.page.locator('[data-testid="agenda-item-duration-input"]')
  }

  get agendaItemPresenterSelect(): Locator {
    return this.page.locator('[data-testid="agenda-item-presenter-select"]')
  }

  get agendaItemTypeSelect(): Locator {
    return this.page.locator('[data-testid="agenda-item-type-select"]')
  }

  // Step 5: Review
  get reviewStep(): Locator {
    return this.page.locator('[data-testid="review-step"]')
  }

  get reviewTitle(): Locator {
    return this.page.locator('[data-testid="review-title"]')
  }

  get reviewDateTime(): Locator {
    return this.page.locator('[data-testid="review-date-time"]')
  }

  get reviewInviteesCount(): Locator {
    return this.page.locator('[data-testid="review-invitees-count"]')
  }

  get reviewAgendaCount(): Locator {
    return this.page.locator('[data-testid="review-agenda-count"]')
  }

  // Wizard navigation
  get nextButton(): Locator {
    return this.page.locator('[data-testid="wizard-next-button"]')
  }

  get backButton(): Locator {
    return this.page.locator('[data-testid="wizard-back-button"]')
  }

  get createMeetingSubmitButton(): Locator {
    return this.page.locator('[data-testid="create-meeting-submit-button"]')
  }

  get wizardProgress(): Locator {
    return this.page.locator('[data-testid="wizard-progress"]')
  }

  // Meeting actions
  get meetingActionMenu(): Locator {
    return this.page.locator('[data-testid="meeting-action-menu"]')
  }

  get actionView(): Locator {
    return this.page.locator('[data-testid="action-view"]')
  }

  get actionEdit(): Locator {
    return this.page.locator('[data-testid="action-edit"]')
  }

  get actionCancel(): Locator {
    return this.page.locator('[data-testid="action-cancel"]')
  }

  get actionDuplicate(): Locator {
    return this.page.locator('[data-testid="action-duplicate"]')
  }

  get actionStartMeeting(): Locator {
    return this.page.locator('[data-testid="action-start-meeting"]')
  }

  get actionJoinMeeting(): Locator {
    return this.page.locator('[data-testid="action-join-meeting"]')
  }

  // Meeting details page
  get meetingDetailsPage(): Locator {
    return this.page.locator('[data-testid="meeting-details-page"]')
  }

  get meetingHeader(): Locator {
    return this.page.locator('[data-testid="meeting-header"]')
  }

  get meetingTitle(): Locator {
    return this.page.locator('[data-testid="meeting-title"]')
  }

  get meetingStatus(): Locator {
    return this.page.locator('[data-testid="meeting-status"]')
  }

  get meetingDateTime(): Locator {
    return this.page.locator('[data-testid="meeting-date-time"]')
  }

  get meetingLocation(): Locator {
    return this.page.locator('[data-testid="meeting-location"]')
  }

  get meetingLink(): Locator {
    return this.page.locator('[data-testid="meeting-link"]')
  }

  // Meeting tabs
  get meetingTabs(): Locator {
    return this.page.locator('[data-testid="meeting-tabs"]')
  }

  get tabAgenda(): Locator {
    return this.page.locator('[data-testid="tab-agenda"]')
  }

  get tabInvitees(): Locator {
    return this.page.locator('[data-testid="tab-invitees"]')
  }

  get tabDocuments(): Locator {
    return this.page.locator('[data-testid="tab-documents"]')
  }

  get tabMinutes(): Locator {
    return this.page.locator('[data-testid="tab-minutes"]')
  }

  get tabActions(): Locator {
    return this.page.locator('[data-testid="tab-actions"]')
  }

  get tabResolutions(): Locator {
    return this.page.locator('[data-testid="tab-resolutions"]')
  }

  // Live meeting controls
  get startMeetingButton(): Locator {
    return this.page.locator('[data-testid="start-meeting-button"]')
  }

  get endMeetingButton(): Locator {
    return this.page.locator('[data-testid="end-meeting-button"]')
  }

  get recordingButton(): Locator {
    return this.page.locator('[data-testid="recording-button"]')
  }

  get transcriptionButton(): Locator {
    return this.page.locator('[data-testid="transcription-button"]')
  }

  get voiceCommandsButton(): Locator {
    return this.page.locator('[data-testid="voice-commands-button"]')
  }

  // Voice integration
  get voiceAssistantButton(): Locator {
    return this.page.locator('[data-testid="voice-assistant-button"]')
  }

  get voiceAssistantPanel(): Locator {
    return this.page.locator('[data-testid="voice-assistant-panel"]')
  }

  get voiceTranscription(): Locator {
    return this.page.locator('[data-testid="voice-transcription"]')
  }

  get voiceCommands(): Locator {
    return this.page.locator('[data-testid="voice-commands"]')
  }

  // Minutes and notes
  get minutesSection(): Locator {
    return this.page.locator('[data-testid="minutes-section"]')
  }

  get minutesEditor(): Locator {
    return this.page.locator('[data-testid="minutes-editor"]')
  }

  get autoGenerateMinutesButton(): Locator {
    return this.page.locator('[data-testid="auto-generate-minutes-button"]')
  }

  get saveMinutesButton(): Locator {
    return this.page.locator('[data-testid="save-minutes-button"]')
  }

  // Actions and resolutions
  get actionsSection(): Locator {
    return this.page.locator('[data-testid="actions-section"]')
  }

  get actionItems(): Locator {
    return this.page.locator('[data-testid="action-items"]')
  }

  get addActionButton(): Locator {
    return this.page.locator('[data-testid="add-action-button"]')
  }

  get resolutionsSection(): Locator {
    return this.page.locator('[data-testid="resolutions-section"]')
  }

  get resolutionItems(): Locator {
    return this.page.locator('[data-testid="resolution-items"]')
  }

  get addResolutionButton(): Locator {
    return this.page.locator('[data-testid="add-resolution-button"]')
  }

  // Navigation methods
  async goToMeetings(): Promise<void> {
    await this.page.goto(this.meetingsUrl)
    await expect(this.meetingsPage).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  async goToCreateMeeting(): Promise<void> {
    await this.page.goto(this.createMeetingUrl)
    await expect(this.createWizard).toBeVisible()
  }

  async goToMeeting(meetingId: string): Promise<void> {
    await this.page.goto(`/dashboard/meetings/${meetingId}`)
    await expect(this.meetingDetailsPage).toBeVisible()
    await this.waitForSpinnerToDisappear()
  }

  // View methods
  async switchToGridView(): Promise<void> {
    await this.viewToggleGrid.click()
    await expect(this.meetingsGrid).toBeVisible()
  }

  async switchToListView(): Promise<void> {
    await this.viewToggleList.click()
    await expect(this.meetingsList).toBeVisible()
  }

  async switchToCalendarView(): Promise<void> {
    await this.viewToggleCalendar.click()
    await expect(this.calendarView).toBeVisible()
  }

  // Calendar navigation
  async navigateToPreviousMonth(): Promise<void> {
    await this.prevMonthButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async navigateToNextMonth(): Promise<void> {
    await this.nextMonthButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async navigateToToday(): Promise<void> {
    await this.todayButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async clickCalendarDay(day: number): Promise<void> {
    const dayElement = this.calendarDays.filter({ hasText: String(day) }).first()
    await dayElement.click()
  }

  async clickMeetingEvent(index = 0): Promise<void> {
    const event = this.meetingEvents.nth(index)
    await event.click()
    await expect(this.meetingDetailsPage).toBeVisible()
  }

  // Search and filter methods
  async searchMeetings(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.keyboard.press('Enter')
    await this.waitForSpinnerToDisappear()
  }

  async filterByStatus(status: string): Promise<void> {
    await this.selectDropdownOption('[data-testid="meetings-filter-status"]', status)
    await this.waitForSpinnerToDisappear()
  }

  async filterByType(type: string): Promise<void> {
    await this.selectDropdownOption('[data-testid="meetings-filter-type"]', type)
    await this.waitForSpinnerToDisappear()
  }

  // Create meeting wizard methods
  async startCreateMeeting(): Promise<void> {
    await this.createButton.click()
    await expect(this.createWizard).toBeVisible()
  }

  async selectMeetingType(type: 'board' | 'committee' | 'general' | 'emergency'): Promise<void> {
    await expect(this.meetingTypeStep).toBeVisible()
    
    const typeMap = {
      board: this.boardMeetingType,
      committee: this.committeeMeetingType,
      general: this.generalMeetingType,
      emergency: this.emergencyMeetingType,
    }
    
    await typeMap[type].click()
    await expect(typeMap[type]).toHaveClass(/selected/)
  }

  async fillMeetingDetails(
    title: string,
    description?: string,
    date?: string,
    time?: string,
    duration?: string,
    location?: string,
    isVirtual = false,
    meetingLink?: string
  ): Promise<void> {
    await expect(this.calendarStep).toBeVisible()
    
    await this.meetingTitleInput.fill(title)
    
    if (description) {
      await this.meetingDescriptionInput.fill(description)
    }
    
    if (date) {
      await this.meetingDatePicker.fill(date)
    }
    
    if (time) {
      await this.meetingTimeInput.fill(time)
    }
    
    if (duration) {
      await this.selectDropdownOption('[data-testid="meeting-duration-select"]', duration)
    }
    
    if (isVirtual) {
      await this.virtualMeetingToggle.check()
      if (meetingLink) {
        await this.meetingLinkInput.fill(meetingLink)
      }
    } else if (location) {
      await this.meetingLocationInput.fill(location)
    }
  }

  async addInvitees(emails: string[]): Promise<void> {
    await expect(this.inviteesStep).toBeVisible()
    
    for (const email of emails) {
      // Search for internal member
      await this.inviteeSearchInput.fill(email)
      await this.page.waitForTimeout(500)
      
      const memberItem = this.availableInviteesList.locator(`[data-email="${email}"]`)
      if (await memberItem.isVisible()) {
        await memberItem.locator('[data-testid="add-invitee-button"]').click()
      } else {
        // Add as external invitee
        await this.inviteExternalButton.click()
        await this.externalEmailInput.fill(email)
        await this.page.keyboard.press('Enter')
      }
    }
    
    // Verify invitees were added
    const selectedCount = await this.selectedInviteesList.locator('[data-testid="invitee-item"]').count()
    expect(selectedCount).toBeGreaterThanOrEqual(emails.length)
  }

  async addAgendaItem(
    title: string,
    description?: string,
    duration?: number,
    presenter?: string,
    type?: string
  ): Promise<void> {
    await expect(this.agendaStep).toBeVisible()
    
    await this.addAgendaItemButton.click()
    
    const newItem = this.agendaItems.locator('[data-testid="agenda-item"]').last()
    
    await newItem.locator('[data-testid="agenda-item-title-input"]').fill(title)
    
    if (description) {
      await newItem.locator('[data-testid="agenda-item-description-input"]').fill(description)
    }
    
    if (duration) {
      await newItem.locator('[data-testid="agenda-item-duration-input"]').fill(String(duration))
    }
    
    if (presenter) {
      await this.selectDropdownOption(
        newItem.locator('[data-testid="agenda-item-presenter-select"]'),
        presenter
      )
    }
    
    if (type) {
      await this.selectDropdownOption(
        newItem.locator('[data-testid="agenda-item-type-select"]'),
        type
      )
    }
  }

  async reviewAndSubmit(): Promise<void> {
    await expect(this.reviewStep).toBeVisible()
    
    // Verify review information
    await expect(this.reviewTitle).toBeVisible()
    await expect(this.reviewDateTime).toBeVisible()
    
    await this.createMeetingSubmitButton.click()
    await this.expectSuccessMessage('Meeting created successfully')
  }

  async proceedToNextStep(): Promise<void> {
    await this.nextButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async goBackToPreviousStep(): Promise<void> {
    await this.backButton.click()
    await this.waitForSpinnerToDisappear()
  }

  async createMeetingComplete(
    type: 'board' | 'committee' | 'general' | 'emergency',
    title: string,
    invitees: string[] = [],
    agendaItems: Array<{ title: string; description?: string }> = [],
    details: {
      description?: string
      date?: string
      time?: string
      location?: string
      isVirtual?: boolean
    } = {}
  ): Promise<void> {
    await this.startCreateMeeting()
    
    // Step 1: Meeting Type
    await this.selectMeetingType(type)
    await this.proceedToNextStep()
    
    // Step 2: Calendar & Scheduling
    await this.fillMeetingDetails(
      title,
      details.description,
      details.date,
      details.time,
      undefined,
      details.location,
      details.isVirtual
    )
    await this.proceedToNextStep()
    
    // Step 3: Invitees
    if (invitees.length > 0) {
      await this.addInvitees(invitees)
    }
    await this.proceedToNextStep()
    
    // Step 4: Agenda
    for (const item of agendaItems) {
      await this.addAgendaItem(item.title, item.description)
    }
    await this.proceedToNextStep()
    
    // Step 5: Review and Submit
    await this.reviewAndSubmit()
    
    // Should redirect to meeting details
    await this.page.waitForURL(/\/dashboard\/meetings\//)
  }

  // Meeting management methods
  async openMeetingActions(index = 0): Promise<void> {
    const meetingItem = this.meetingItems.nth(index)
    const actionButton = meetingItem.locator('[data-testid="meeting-action-button"]')
    await actionButton.click()
    await expect(this.meetingActionMenu).toBeVisible()
  }

  async viewMeeting(index = 0): Promise<void> {
    await this.openMeetingActions(index)
    await this.actionView.click()
    await expect(this.meetingDetailsPage).toBeVisible()
  }

  async startMeeting(index = 0): Promise<void> {
    await this.openMeetingActions(index)
    await this.actionStartMeeting.click()
    // Should transition to live meeting mode
  }

  async joinMeeting(index = 0): Promise<void> {
    await this.openMeetingActions(index)
    await this.actionJoinMeeting.click()
    // Should open meeting link or navigate to meeting room
  }

  async duplicateMeeting(index = 0): Promise<void> {
    await this.openMeetingActions(index)
    await this.actionDuplicate.click()
    await this.expectSuccessMessage('Meeting duplicated')
  }

  async cancelMeeting(index = 0): Promise<void> {
    await this.openMeetingActions(index)
    await this.actionCancel.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Meeting cancelled')
  }

  // Meeting details methods
  async expectMeetingInfo(title: string, status?: string): Promise<void> {
    await expect(this.meetingTitle).toContainText(title)
    if (status) {
      await expect(this.meetingStatus).toContainText(status)
    }
  }

  async switchToAgendaTab(): Promise<void> {
    await this.tabAgenda.click()
    await expect(this.page.locator('[data-testid="agenda-content"]')).toBeVisible()
  }

  async switchToInviteesTab(): Promise<void> {
    await this.tabInvitees.click()
    await expect(this.page.locator('[data-testid="invitees-content"]')).toBeVisible()
  }

  async switchToDocumentsTab(): Promise<void> {
    await this.tabDocuments.click()
    await expect(this.page.locator('[data-testid="documents-content"]')).toBeVisible()
  }

  async switchToMinutesTab(): Promise<void> {
    await this.tabMinutes.click()
    await expect(this.minutesSection).toBeVisible()
  }

  async switchToActionsTab(): Promise<void> {
    await this.tabActions.click()
    await expect(this.actionsSection).toBeVisible()
  }

  async switchToResolutionsTab(): Promise<void> {
    await this.tabResolutions.click()
    await expect(this.resolutionsSection).toBeVisible()
  }

  // Live meeting methods
  async startLiveMeeting(): Promise<void> {
    await this.startMeetingButton.click()
    await this.expectSuccessMessage('Meeting started')
    
    // Should show live meeting controls
    await expect(this.endMeetingButton).toBeVisible()
    await expect(this.recordingButton).toBeVisible()
  }

  async enableRecording(): Promise<void> {
    await this.recordingButton.click()
    await expect(this.recordingButton).toHaveClass(/active|recording/)
  }

  async enableTranscription(): Promise<void> {
    await this.transcriptionButton.click()
    await expect(this.voiceTranscription).toBeVisible()
  }

  async openVoiceAssistant(): Promise<void> {
    await this.voiceAssistantButton.click()
    await expect(this.voiceAssistantPanel).toBeVisible()
  }

  async endLiveMeeting(): Promise<void> {
    await this.endMeetingButton.click()
    await this.confirmAction()
    await this.expectSuccessMessage('Meeting ended')
  }

  // Minutes and actions methods
  async addMinutes(content: string): Promise<void> {
    await this.switchToMinutesTab()
    await this.minutesEditor.fill(content)
    await this.saveMinutesButton.click()
    await this.expectSuccessMessage('Minutes saved')
  }

  async generateMinutesFromTranscription(): Promise<void> {
    await this.switchToMinutesTab()
    await this.autoGenerateMinutesButton.click()
    await this.waitForSpinnerToDisappear()
    await this.expectSuccessMessage('Minutes generated')
  }

  async addActionItem(title: string, assignee: string, dueDate?: string): Promise<void> {
    await this.switchToActionsTab()
    await this.addActionButton.click()
    
    const form = this.page.locator('[data-testid="action-item-form"]')
    await form.locator('[data-testid="action-title-input"]').fill(title)
    await this.selectDropdownOption(form.locator('[data-testid="action-assignee-select"]'), assignee)
    
    if (dueDate) {
      await form.locator('[data-testid="action-due-date-input"]').fill(dueDate)
    }
    
    await form.locator('[data-testid="save-action-button"]').click()
    await this.expectSuccessMessage('Action item added')
  }

  async addResolution(title: string, description: string): Promise<void> {
    await this.switchToResolutionsTab()
    await this.addResolutionButton.click()
    
    const form = this.page.locator('[data-testid="resolution-form"]')
    await form.locator('[data-testid="resolution-title-input"]').fill(title)
    await form.locator('[data-testid="resolution-description-input"]').fill(description)
    
    await form.locator('[data-testid="save-resolution-button"]').click()
    await this.expectSuccessMessage('Resolution added')
  }

  // Voice features testing
  async testVoiceCommands(): Promise<void> {
    await this.openVoiceAssistant()
    await expect(this.voiceCommands).toBeVisible()
    
    // Test common voice commands
    const commands = [
      'Start recording',
      'Take minutes',
      'Add action item',
      'Show agenda',
    ]
    
    for (const command of commands) {
      const commandButton = this.page.locator(`[data-testid="voice-command-${command.toLowerCase().replace(/\s+/g, '-')}"]`)
      if (await commandButton.isVisible()) {
        await commandButton.click()
        await this.page.waitForTimeout(1000) // Wait for command processing
      }
    }
  }

  // Performance testing
  async measureMeetingCreationTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.createMeetingComplete(
        'board',
        'Performance Test Meeting',
        ['member@example.com'],
        [{ title: 'Test Agenda Item' }]
      )
    })
  }

  async measureCalendarLoadTime(): Promise<number> {
    return await this.measureActionTime(async () => {
      await this.switchToCalendarView()
    })
  }
}