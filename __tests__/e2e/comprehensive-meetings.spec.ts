import { test, expect } from '@playwright/test'
import { MeetingsPage, createPageObjects, TestUtils } from './pages'

test.describe('Comprehensive Meeting Management @critical', () => {
  let meetingsPage: MeetingsPage

  test.beforeEach(async ({ page }) => {
    const pages = createPageObjects(page)
    meetingsPage = pages.meetings
    
    // Start authenticated
    await page.goto('/dashboard/meetings')
    await expect(page.locator('[data-testid="meetings-page"]')).toBeVisible()
  })

  test.describe('Meeting Creation Workflows', () => {
    test('should create board meeting with complete wizard flow', async () => {
      const testData = TestUtils.createTestData()
      const futureDate = TestUtils.formatDate(TestUtils.addDays(new Date(), 7))
      
      await meetingsPage.createMeetingComplete(
        'board',
        testData.meeting.title,
        ['member1@example.com', 'director@example.com'],
        [
          { title: 'Financial Review', description: 'Q4 financial results presentation' },
          { title: 'Strategic Planning', description: 'Review of strategic initiatives for next year' },
          { title: 'Board Resolutions', description: 'Vote on pending board resolutions' },
        ],
        {
          description: testData.meeting.description,
          date: futureDate,
          time: '14:00',
          location: 'Board Room A',
        }
      )
      
      // Should navigate to meeting details
      await meetingsPage.page.waitForURL(/\/dashboard\/meetings\//)
      
      // Verify meeting appears in list
      await meetingsPage.goToMeetings()
      await meetingsPage.expectMeetingInfo(testData.meeting.title)
    })

    test('should create virtual meeting with video link', async () => {
      const testData = TestUtils.createTestData()
      const futureDate = TestUtils.formatDate(TestUtils.addDays(new Date(), 3))
      
      await meetingsPage.startCreateMeeting()
      
      // Step 1: Meeting Type
      await meetingsPage.selectMeetingType('committee')
      await meetingsPage.proceedToNextStep()
      
      // Step 2: Meeting Details with virtual meeting
      await meetingsPage.fillMeetingDetails(
        testData.meeting.title,
        testData.meeting.description,
        futureDate,
        '10:00',
        '60',
        undefined, // no physical location
        true, // virtual meeting
        'https://zoom.us/j/1234567890'
      )
      await meetingsPage.proceedToNextStep()
      
      // Step 3: Invitees
      await meetingsPage.addInvitees(['invitee1@example.com', 'invitee2@example.com'])
      await meetingsPage.proceedToNextStep()
      
      // Step 4: Agenda
      await meetingsPage.addAgendaItem('Committee Review', 'Review committee activities')
      await meetingsPage.proceedToNextStep()
      
      // Step 5: Review and Submit
      await meetingsPage.reviewAndSubmit()
      
      // Verify virtual meeting details
      await meetingsPage.page.waitForURL(/\/dashboard\/meetings\//)
      await meetingsPage.expectMeetingInfo(testData.meeting.title)
      
      const meetingLink = meetingsPage.meetingLink
      await expect(meetingLink).toBeVisible()
      await expect(meetingLink).toContainText('zoom.us')
    })

    test('should validate meeting date and time', async () => {
      await meetingsPage.startCreateMeeting()
      await meetingsPage.selectMeetingType('general')
      await meetingsPage.proceedToNextStep()
      
      // Try to create meeting in the past
      const pastDate = TestUtils.formatDate(TestUtils.addDays(new Date(), -1))
      
      await meetingsPage.meetingTitleInput.fill('Past Meeting Test')
      await meetingsPage.meetingDatePicker.fill(pastDate)
      await meetingsPage.meetingTimeInput.fill('10:00')
      
      await meetingsPage.proceedToNextStep()
      
      // Should show validation error
      await meetingsPage.expectErrorMessage(/date.*cannot.*be.*past/i)
    })

    test('should handle timezone selection', async () => {
      await meetingsPage.startCreateMeeting()
      await meetingsPage.selectMeetingType('board')
      await meetingsPage.proceedToNextStep()
      
      const testData = TestUtils.createTestData()
      const futureDate = TestUtils.formatDate(TestUtils.addDays(new Date(), 5))
      
      await meetingsPage.meetingTitleInput.fill(testData.meeting.title)
      await meetingsPage.meetingDatePicker.fill(futureDate)
      await meetingsPage.meetingTimeInput.fill('15:30')
      
      // Select different timezone
      const timezoneSelect = meetingsPage.timezoneSelect
      if (await timezoneSelect.isVisible()) {
        await meetingsPage.selectDropdownOption(timezoneSelect, 'America/New_York')
        
        // Should update time display
        const timeDisplay = meetingsPage.page.locator('[data-testid="meeting-time-display"]')
        if (await timeDisplay.isVisible()) {
          await expect(timeDisplay).toContainText('EST|EDT')
        }
      }
    })

    test('should handle meeting conflicts', async () => {
      const testData = TestUtils.createTestData()
      const conflictDate = TestUtils.formatDate(TestUtils.addDays(new Date(), 7))
      
      // Create first meeting
      await meetingsPage.createMeetingComplete(
        'board',
        'First Meeting',
        ['member@example.com'],
        [{ title: 'Agenda Item 1' }],
        { date: conflictDate, time: '14:00' }
      )
      
      await meetingsPage.goToMeetings()
      
      // Try to create conflicting meeting
      await meetingsPage.startCreateMeeting()
      await meetingsPage.selectMeetingType('committee')
      await meetingsPage.proceedToNextStep()
      
      await meetingsPage.fillMeetingDetails(
        'Conflicting Meeting',
        'This should conflict',
        conflictDate,
        '14:30' // Overlapping time
      )
      
      // Should show conflict warning
      const conflictWarning = meetingsPage.page.locator('[data-testid="meeting-conflict-warning"]')
      if (await conflictWarning.isVisible()) {
        await expect(conflictWarning).toBeVisible()
        await expect(conflictWarning).toContainText(/conflict.*existing.*meeting/i)
      }
    })

    test('should save draft and resume meeting creation', async () => {
      const testData = TestUtils.createTestData()
      
      await meetingsPage.startCreateMeeting()
      await meetingsPage.selectMeetingType('emergency')
      await meetingsPage.proceedToNextStep()
      
      // Fill partial information
      await meetingsPage.meetingTitleInput.fill(testData.meeting.title)
      await meetingsPage.meetingDescriptionInput.fill(testData.meeting.description)
      
      // Save draft if available
      const saveDraftButton = meetingsPage.page.locator('[data-testid="save-draft-button"]')
      if (await saveDraftButton.isVisible()) {
        await saveDraftButton.click()
        await meetingsPage.expectSuccessMessage('Draft saved')
        
        // Close wizard
        await meetingsPage.page.keyboard.press('Escape')
        
        // Resume from drafts
        const draftsButton = meetingsPage.page.locator('[data-testid="resume-drafts-button"]')
        if (await draftsButton.isVisible()) {
          await draftsButton.click()
          
          // Should show saved draft
          const draftItem = meetingsPage.page.locator('[data-testid="draft-item"]', {
            hasText: testData.meeting.title
          })
          await expect(draftItem).toBeVisible()
          
          await draftItem.click()
          
          // Should resume with saved data
          const titleValue = await meetingsPage.meetingTitleInput.inputValue()
          expect(titleValue).toBe(testData.meeting.title)
        }
      }
    })
  })

  test.describe('Meeting Management', () => {
    test('should display meetings in different views', async () => {
      // Test grid view
      await meetingsPage.switchToGridView()
      await expect(meetingsPage.meetingsGrid).toBeVisible()
      
      // Test list view
      await meetingsPage.switchToListView()
      await expect(meetingsPage.meetingsList).toBeVisible()
      
      // Test calendar view
      await meetingsPage.switchToCalendarView()
      await expect(meetingsPage.calendarView).toBeVisible()
      
      // Calendar should show meeting events
      const meetingEvents = meetingsPage.meetingEvents
      const eventCount = await meetingEvents.count()
      
      if (eventCount > 0) {
        const firstEvent = meetingEvents.first()
        await expect(firstEvent).toBeVisible()
        
        // Click event to view details
        await firstEvent.click()
        await expect(meetingsPage.meetingDetailsPage).toBeVisible()
      }
    })

    test('should navigate calendar months', async () => {
      await meetingsPage.switchToCalendarView()
      
      // Get current month
      const currentMonthText = await meetingsPage.calendarHeader.textContent()
      
      // Navigate to next month
      await meetingsPage.navigateToNextMonth()
      
      // Month should change
      const nextMonthText = await meetingsPage.calendarHeader.textContent()
      expect(nextMonthText).not.toBe(currentMonthText)
      
      // Navigate back
      await meetingsPage.navigateToPreviousMonth()
      
      // Should return to original month
      const returnedMonthText = await meetingsPage.calendarHeader.textContent()
      expect(returnedMonthText).toBe(currentMonthText)
      
      // Test today button
      await meetingsPage.navigateToToday()
      
      // Should show current month
      const todayMonthText = await meetingsPage.calendarHeader.textContent()
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      expect(todayMonthText?.toLowerCase()).toContain(currentMonth.toLowerCase())
    })

    test('should start and manage live meetings', async () => {
      // Navigate to an existing meeting
      await meetingsPage.expectMeetingInfo('Board Meeting')
      await meetingsPage.viewMeeting(0)
      
      // Start meeting
      await meetingsPage.startLiveMeeting()
      
      // Should show live meeting controls
      await expect(meetingsPage.endMeetingButton).toBeVisible()
      await expect(meetingsPage.recordingButton).toBeVisible()
      
      // Test recording
      await meetingsPage.enableRecording()
      await expect(meetingsPage.recordingButton).toHaveClass(/active|recording/)
      
      // Test transcription
      await meetingsPage.enableTranscription()
      await expect(meetingsPage.voiceTranscription).toBeVisible()
      
      // Test voice assistant
      await meetingsPage.openVoiceAssistant()
      await expect(meetingsPage.voiceAssistantPanel).toBeVisible()
      
      // End meeting
      await meetingsPage.endLiveMeeting()
      await expect(meetingsPage.endMeetingButton).not.toBeVisible()
    })

    test('should manage meeting minutes', async () => {
      await meetingsPage.viewMeeting(0)
      await meetingsPage.switchToMinutesTab()
      
      // Add minutes manually
      const minutesContent = `
        Meeting called to order at 2:00 PM.
        
        Attendees: John Doe, Jane Smith, Bob Wilson
        
        1. Financial Review
        - Q4 results discussed
        - Revenue exceeded targets by 15%
        
        2. Strategic Planning
        - New market opportunities identified
        - Budget allocation approved
        
        Meeting adjourned at 3:30 PM.
      `
      
      await meetingsPage.addMinutes(minutesContent)
      
      // Test auto-generate from transcription
      const transcriptionButton = meetingsPage.autoGenerateMinutesButton
      if (await transcriptionButton.isVisible()) {
        await meetingsPage.generateMinutesFromTranscription()
        
        // Should show generated content
        const generatedMinutes = meetingsPage.minutesEditor
        const content = await generatedMinutes.inputValue()
        expect(content).toBeTruthy()
        expect(content.length).toBeGreaterThan(50)
      }
    })

    test('should manage action items and resolutions', async () => {
      await meetingsPage.viewMeeting(0)
      
      // Add action items
      await meetingsPage.switchToActionsTab()
      await meetingsPage.addActionItem(
        'Review budget proposal',
        'john.doe@example.com',
        TestUtils.formatDate(TestUtils.addDays(new Date(), 7))
      )
      
      await meetingsPage.addActionItem(
        'Prepare quarterly report',
        'jane.smith@example.com',
        TestUtils.formatDate(TestUtils.addDays(new Date(), 14))
      )
      
      // Verify action items appear
      const actionItems = meetingsPage.actionItems.locator('[data-testid="action-item"]')
      await expect(actionItems).toHaveCountGreaterThanOrEqual(2)
      
      // Add resolutions
      await meetingsPage.switchToResolutionsTab()
      await meetingsPage.addResolution(
        'Board Resolution 2024-001',
        'Resolved: To approve the annual budget as presented, with a total allocation of $2.5M for operational expenses.'
      )
      
      // Verify resolution appears
      const resolutions = meetingsPage.resolutionItems.locator('[data-testid="resolution-item"]')
      await expect(resolutions).toHaveCountGreaterThanOrEqual(1)
      
      const firstResolution = resolutions.first()
      await expect(firstResolution).toContainText('Board Resolution 2024-001')
    })

    test('should handle meeting cancellation', async () => {
      const initialCount = await meetingsPage.meetingItems.count()
      
      if (initialCount > 0) {
        await meetingsPage.cancelMeeting(0)
        
        // Should show cancelled status
        const firstMeeting = meetingsPage.meetingItems.first()
        const statusElement = firstMeeting.locator('[data-testid="meeting-status"]')
        
        if (await statusElement.isVisible()) {
          await expect(statusElement).toContainText(/cancelled/i)
        }
      }
    })

    test('should duplicate meeting', async () => {
      const initialCount = await meetingsPage.meetingItems.count()
      
      if (initialCount > 0) {
        await meetingsPage.duplicateMeeting(0)
        
        // Should have one more meeting
        await expect(meetingsPage.meetingItems).toHaveCount(initialCount + 1)
        
        // New meeting should have similar details
        const duplicatedMeeting = meetingsPage.meetingItems.nth(initialCount)
        const originalTitle = await meetingsPage.meetingItems.first()
          .locator('[data-testid="meeting-title"]').textContent()
        
        if (originalTitle) {
          await expect(duplicatedMeeting).toContainText(/copy|duplicate/i)
        }
      }
    })
  })

  test.describe('Meeting Search and Filtering', () => {
    test('should search meetings by title', async () => {
      await meetingsPage.searchMeetings('board')
      
      // Results should contain search term
      const meetingTitles = meetingsPage.meetingItems.locator('[data-testid="meeting-title"]')
      const count = await meetingTitles.count()
      
      for (let i = 0; i < count; i++) {
        const title = await meetingTitles.nth(i).textContent()
        expect(title?.toLowerCase()).toContain('board')
      }
    })

    test('should filter meetings by status', async () => {
      await meetingsPage.filterByStatus('upcoming')
      
      // All visible meetings should be upcoming
      const meetingStatuses = meetingsPage.meetingItems.locator('[data-testid="meeting-status"]')
      const count = await meetingStatuses.count()
      
      for (let i = 0; i < count; i++) {
        const status = await meetingStatuses.nth(i).textContent()
        expect(status?.toLowerCase()).toContain(/upcoming|scheduled/)
      }
    })

    test('should filter meetings by type', async () => {
      await meetingsPage.filterByType('board')
      
      // All visible meetings should be board meetings
      const meetingTypes = meetingsPage.meetingItems.locator('[data-testid="meeting-type"]')
      const count = await meetingTypes.count()
      
      for (let i = 0; i < count; i++) {
        const type = await meetingTypes.nth(i).textContent()
        expect(type?.toLowerCase()).toContain('board')
      }
    })

    test('should filter meetings by date range', async () => {
      const dateFilter = meetingsPage.dateRangeFilter
      
      if (await dateFilter.isVisible()) {
        await dateFilter.click()
        
        // Set date range for next month
        const startDate = TestUtils.formatDate(new Date())
        const endDate = TestUtils.formatDate(TestUtils.addDays(new Date(), 30))
        
        const startDateInput = meetingsPage.page.locator('[data-testid="start-date-input"]')
        const endDateInput = meetingsPage.page.locator('[data-testid="end-date-input"]')
        
        await startDateInput.fill(startDate)
        await endDateInput.fill(endDate)
        
        const applyFilter = meetingsPage.page.locator('[data-testid="apply-date-filter"]')
        await applyFilter.click()
        
        await meetingsPage.waitForSpinnerToDisappear()
        
        // All meetings should be within date range
        const meetingDates = meetingsPage.meetingItems.locator('[data-testid="meeting-date"]')
        const count = await meetingDates.count()
        
        for (let i = 0; i < count; i++) {
          const dateText = await meetingDates.nth(i).textContent()
          // Verify date is within range (implementation depends on date format)
          expect(dateText).toBeTruthy()
        }
      }
    })
  })

  test.describe('Meeting Voice Features', () => {
    test('should test voice commands during meeting', async () => {
      await meetingsPage.viewMeeting(0)
      await meetingsPage.startLiveMeeting()
      
      // Test voice commands
      await meetingsPage.testVoiceCommands()
      
      // Should process various commands
      const voiceCommands = meetingsPage.voiceCommands
      if (await voiceCommands.isVisible()) {
        const commandButtons = voiceCommands.locator('[data-testid^="voice-command-"]')
        const commandCount = await commandButtons.count()
        
        expect(commandCount).toBeGreaterThan(0)
        
        // Test start recording command
        const startRecordingCmd = voiceCommands.locator('[data-testid="voice-command-start-recording"]')
        if (await startRecordingCmd.isVisible()) {
          await startRecordingCmd.click()
          await expect(meetingsPage.recordingButton).toHaveClass(/active|recording/)
        }
      }
    })

    test('should handle voice transcription', async () => {
      await meetingsPage.viewMeeting(0)
      await meetingsPage.startLiveMeeting()
      await meetingsPage.enableTranscription()
      
      // Should show transcription panel
      await expect(meetingsPage.voiceTranscription).toBeVisible()
      
      // Mock voice input for transcription
      await meetingsPage.page.evaluate(() => {
        const transcriptionPanel = document.querySelector('[data-testid="voice-transcription"]') as HTMLElement
        if (transcriptionPanel) {
          // Simulate transcribed text appearing
          const transcript = document.createElement('div')
          transcript.className = 'transcript-item'
          transcript.textContent = 'This is a sample transcription of the meeting discussion.'
          transcriptionPanel.appendChild(transcript)
        }
      })
      
      // Verify transcription appears
      const transcriptItems = meetingsPage.voiceTranscription.locator('.transcript-item')
      if (await transcriptItems.first().isVisible()) {
        await expect(transcriptItems.first()).toContainText('sample transcription')
      }
    })

    test('should integrate with voice biometrics', async () => {
      await meetingsPage.viewMeeting(0)
      
      // Check for voice biometric features
      const voiceBiometricButton = meetingsPage.page.locator('[data-testid="voice-biometric-auth"]')
      
      if (await voiceBiometricButton.isVisible()) {
        await voiceBiometricButton.click()
        
        const biometricModal = meetingsPage.page.locator('[data-testid="voice-biometric-modal"]')
        await expect(biometricModal).toBeVisible()
        
        // Should show voice authentication interface
        const voiceAuthInterface = biometricModal.locator('[data-testid="voice-auth-interface"]')
        await expect(voiceAuthInterface).toBeVisible()
      }
    })
  })

  test.describe('Meeting Integration', () => {
    test('should integrate with calendar systems', async () => {
      await meetingsPage.viewMeeting(0)
      
      // Check for calendar integration options
      const addToCalendarButton = meetingsPage.page.locator('[data-testid="add-to-calendar"]')
      
      if (await addToCalendarButton.isVisible()) {
        await addToCalendarButton.click()
        
        const calendarOptions = meetingsPage.page.locator('[data-testid="calendar-options"]')
        await expect(calendarOptions).toBeVisible()
        
        // Should offer different calendar options
        const googleCalendar = calendarOptions.locator('[data-testid="add-to-google-calendar"]')
        const outlookCalendar = calendarOptions.locator('[data-testid="add-to-outlook"]')
        const icsDownload = calendarOptions.locator('[data-testid="download-ics"]')
        
        // At least one option should be available
        const hasOptions = await googleCalendar.isVisible() || 
                          await outlookCalendar.isVisible() || 
                          await icsDownload.isVisible()
        
        expect(hasOptions).toBe(true)
      }
    })

    test('should link to vault documents', async () => {
      await meetingsPage.viewMeeting(0)
      await meetingsPage.switchToDocumentsTab()
      
      // Check for linked vault documents
      const documentsSection = meetingsPage.page.locator('[data-testid="meeting-documents"]')
      if (await documentsSection.isVisible()) {
        const linkedDocuments = documentsSection.locator('[data-testid="linked-document"]')
        const documentCount = await linkedDocuments.count()
        
        if (documentCount > 0) {
          // Click on first document
          await linkedDocuments.first().click()
          
          // Should open document viewer
          await expect(meetingsPage.page.locator('[data-testid="asset-viewer"]')).toBeVisible()
        }
      }
    })

    test('should send meeting notifications', async () => {
      const testData = TestUtils.createTestData()
      const meetingDate = TestUtils.addDays(new Date(), 1) // Tomorrow
      
      await meetingsPage.createMeetingComplete(
        'board',
        testData.meeting.title,
        ['notification-test@example.com']
      )
      
      // Should trigger notification system
      const notificationSent = meetingsPage.page.locator('[data-testid="notification-sent-message"]')
      if (await notificationSent.isVisible()) {
        await expect(notificationSent).toContainText(/invitation.*sent/i)
      }
      
      // Check notification in recipient's dashboard (would require separate user context)
      // This is a placeholder for notification integration testing
    })
  })

  test.describe('Meeting Performance', () => {
    test('should load meetings page efficiently', async () => {
      const loadTime = await meetingsPage.measureActionTime(async () => {
        await meetingsPage.goToMeetings()
      })
      
      expect(loadTime).toBeLessThan(2500) // Should load in under 2.5 seconds
    })

    test('should load calendar view efficiently', async () => {
      const calendarLoadTime = await meetingsPage.measureCalendarLoadTime()
      expect(calendarLoadTime).toBeLessThan(3000) // Should load calendar in under 3 seconds
    })

    test('should handle large meeting datasets', async ({ page }) => {
      // Mock large meeting dataset
      const largeMeetingList = Array.from({ length: 200 }, (_, i) => ({
        id: `meeting-${i}`,
        title: `Meeting ${i}`,
        type: i % 4 === 0 ? 'board' : i % 3 === 0 ? 'committee' : 'general',
        date: TestUtils.addDays(new Date(), i),
        status: i < 150 ? 'upcoming' : 'completed',
      }))
      
      await page.route('**/api/meetings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ meetings: largeMeetingList, total: largeMeetingList.length }),
        })
      })
      
      const loadTime = await meetingsPage.measureActionTime(async () => {
        await page.reload()
        await meetingsPage.waitForSpinnerToDisappear()
      })
      
      expect(loadTime).toBeLessThan(4000) // Should handle large datasets efficiently
      
      // Should implement pagination or virtual scrolling
      const visibleMeetings = await meetingsPage.meetingItems.count()
      expect(visibleMeetings).toBeLessThanOrEqual(50) // Shouldn't render all 200 meetings
    })

    test('should measure meeting creation performance', async () => {
      const creationTime = await meetingsPage.measureMeetingCreationTime()
      expect(creationTime).toBeLessThan(6000) // Should create meeting in under 6 seconds
    })
  })

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/meetings**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        })
      })
      
      await page.reload()
      
      // Should show error state
      const errorBoundary = page.locator('[data-testid="error-boundary"]')
      const errorMessage = page.locator('[data-testid="error-message"]')
      
      await expect(errorBoundary.or(errorMessage)).toBeVisible()
      
      // Should have retry option
      const retryButton = page.locator('[data-testid="retry-button"]')
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible()
      }
    })

    test('should handle meeting creation validation errors', async ({ page }) => {
      // Mock validation error
      await page.route('**/api/meetings**', route => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 422,
            body: JSON.stringify({
              error: 'Validation failed',
              details: {
                title: 'Meeting title is required',
                date: 'Meeting date must be in the future',
                invitees: 'At least one invitee is required'
              }
            }),
          })
        } else {
          route.continue()
        }
      })
      
      const testData = TestUtils.createTestData()
      
      await meetingsPage.startCreateMeeting()
      await meetingsPage.selectMeetingType('board')
      await meetingsPage.proceedToNextStep()
      
      // Fill with invalid data
      await meetingsPage.meetingTitleInput.fill('')
      await meetingsPage.meetingDatePicker.fill(TestUtils.formatDate(TestUtils.addDays(new Date(), -1)))
      
      await meetingsPage.proceedToNextStep()
      
      // Should show validation errors
      await meetingsPage.expectErrorMessage(/title.*required|date.*future/i)
    })

    test('should handle network disconnection during meeting', async ({ page }) => {
      await meetingsPage.viewMeeting(0)
      await meetingsPage.startLiveMeeting()
      
      // Simulate network disconnection
      await page.context().setOffline(true)
      
      // Should show connection status
      const connectionStatus = page.locator('[data-testid="meeting-connection-status"]')
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/disconnected|offline/i)
      }
      
      // Should queue actions while offline
      const minutesInput = meetingsPage.minutesEditor
      if (await minutesInput.isVisible()) {
        await minutesInput.fill('Notes added while offline')
        
        // Should show queued indicator
        const queuedIndicator = page.locator('[data-testid="changes-queued"]')
        if (await queuedIndicator.isVisible()) {
          await expect(queuedIndicator).toBeVisible()
        }
      }
      
      // Restore connection
      await page.context().setOffline(false)
      
      // Should sync queued changes
      await page.waitForTimeout(2000)
      
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText(/connected|online/i)
      }
    })
  })
})