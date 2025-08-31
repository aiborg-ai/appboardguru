import { test, expect } from '@playwright/test';

test.describe('Meeting Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/meetings');
    await page.waitForLoadState('networkidle');
  });

  test('should display meetings page', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: /meetings/i })).toBeVisible();
    
    // Check for schedule/calendar view
    const calendarView = page.locator('.calendar-view, [data-testid="meeting-calendar"], .meeting-schedule');
    const listView = page.locator('.meeting-list, [data-testid="meeting-list"]');
    
    await expect(calendarView.or(listView).first()).toBeVisible();
  });

  test('should create a new meeting', async ({ page }) => {
    // Click create meeting button
    await page.click('button:has-text(/schedule.*meeting|new.*meeting|create.*meeting/i)');
    
    // Fill meeting details
    await page.fill('input[name="title"], input[placeholder*="meeting title" i]', 'Q1 Board Meeting');
    
    // Set date and time
    const dateInput = page.locator('input[type="date"], input[name="date"]');
    if (await dateInput.count() > 0) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await dateInput.fill(futureDate.toISOString().split('T')[0]);
    }
    
    const timeInput = page.locator('input[type="time"], input[name="time"]');
    if (await timeInput.count() > 0) {
      await timeInput.fill('14:00');
    }
    
    // Set duration
    const durationSelect = page.locator('select[name="duration"], [data-testid="duration"]');
    if (await durationSelect.count() > 0) {
      await durationSelect.selectOption({ value: '120' }); // 2 hours
    }
    
    // Set location
    await page.fill('input[name="location"], input[placeholder*="location" i]', 'Board Room A');
    
    // Add description
    await page.fill('textarea[name="description"], textarea[placeholder*="description" i]', 
      'Quarterly board meeting to review financial performance and strategic initiatives');
    
    // Select meeting type
    const typeSelect = page.locator('select[name="type"], [data-testid="meeting-type"]');
    if (await typeSelect.count() > 0) {
      await typeSelect.selectOption({ value: 'board_meeting' });
    }
    
    // Add attendees
    const attendeeInput = page.locator('input[placeholder*="add attendee" i], input[placeholder*="email" i]');
    if (await attendeeInput.count() > 0) {
      await attendeeInput.fill('board.member@example.com');
      await page.keyboard.press('Enter');
    }
    
    // Create meeting
    await page.click('button:has-text(/create|schedule|save/i)');
    
    // Check success
    await expect(page.locator('text=/meeting.*created|scheduled.*successfully/i')).toBeVisible({ timeout: 15000 });
  });

  test('should view meeting details', async ({ page }) => {
    // Click on first meeting
    const firstMeeting = page.locator('.meeting-card, [data-testid="meeting-item"], .calendar-event').first();
    
    if (await firstMeeting.count() > 0) {
      await firstMeeting.click();
      
      // Check meeting details modal/page
      await expect(page.locator('text=/meeting.*details|agenda/i')).toBeVisible();
      
      // Check for key sections
      await expect(page.locator('text=/attendees|participants/i')).toBeVisible();
      await expect(page.locator('text=/documents|attachments/i')).toBeVisible();
    }
  });

  test('should add agenda items to meeting', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Go to agenda section
      await page.click('text=/agenda|topics/i');
      
      // Add agenda item
      await page.click('button:has-text(/add.*agenda|add.*item|add.*topic/i)');
      
      // Fill agenda item details
      await page.fill('input[name="topic"], input[placeholder*="topic" i]', 'Financial Review Q1');
      await page.fill('input[name="duration"], input[placeholder*="minutes" i]', '30');
      await page.fill('input[name="presenter"], input[placeholder*="presenter" i]', 'CFO');
      await page.fill('textarea[name="notes"], textarea[placeholder*="notes" i]', 'Review revenue, expenses, and profit margins');
      
      // Save agenda item
      await page.click('button:has-text(/add|save/i)');
      
      // Check success
      await expect(page.locator('text="Financial Review Q1"')).toBeVisible();
    }
  });

  test('should upload meeting documents', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Go to documents section
      await page.click('text=/documents|materials|attachments/i');
      
      // Click upload button
      await page.click('button:has-text(/upload|add.*document/i)');
      
      // Set test file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        {
          name: 'meeting-agenda.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Test meeting agenda content')
        }
      ]);
      
      // Upload
      await page.click('button:has-text(/upload|confirm/i)');
      
      // Check success
      await expect(page.locator('text=/uploaded.*successfully|document.*added/i')).toBeVisible();
    }
  });

  test('should manage meeting attendees', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Go to attendees section
      await page.click('text=/attendees|participants/i');
      
      // Add attendee
      await page.click('button:has-text(/add.*attendee|invite/i)');
      await page.fill('input[type="email"], input[placeholder*="email" i]', 'new.attendee@example.com');
      
      // Set role
      const roleSelect = page.locator('select[name="role"], [data-testid="attendee-role"]');
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption({ value: 'participant' });
      }
      
      // Send invitation
      await page.click('button:has-text(/add|invite|send/i)');
      
      // Check success
      await expect(page.locator('text=/invitation.*sent|attendee.*added/i')).toBeVisible();
    }
  });

  test('should edit meeting details', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Click edit button
      await page.click('button:has-text(/edit|modify/i)');
      
      // Update meeting details
      const titleInput = page.locator('input[name="title"]');
      if (await titleInput.count() > 0) {
        await titleInput.clear();
        await titleInput.fill('Updated Board Meeting Title');
      }
      
      // Update location
      const locationInput = page.locator('input[name="location"]');
      if (await locationInput.count() > 0) {
        await locationInput.clear();
        await locationInput.fill('Virtual - Zoom');
      }
      
      // Save changes
      await page.click('button:has-text(/save|update/i)');
      
      // Check success
      await expect(page.locator('text=/updated.*successfully|changes.*saved/i')).toBeVisible();
    }
  });

  test('should cancel a meeting', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Click cancel meeting button
      await page.click('button:has-text(/cancel.*meeting/i)');
      
      // Confirm cancellation
      await expect(page.locator('text=/confirm.*cancel|are.*you.*sure/i')).toBeVisible();
      
      // Add cancellation reason
      const reasonInput = page.locator('textarea[name="reason"], textarea[placeholder*="reason" i]');
      if (await reasonInput.count() > 0) {
        await reasonInput.fill('Meeting rescheduled due to conflicts');
      }
      
      // Confirm
      await page.click('button:has-text(/confirm|yes.*cancel/i)');
      
      // Check success
      await expect(page.locator('text=/cancelled.*successfully|meeting.*cancelled/i')).toBeVisible();
    }
  });

  test('should record meeting minutes', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Go to minutes section
      await page.click('text=/minutes|notes/i');
      
      // Start recording minutes
      await page.click('button:has-text(/record.*minutes|take.*notes|start.*minutes/i)');
      
      // Add minutes content
      const minutesEditor = page.locator('textarea[name="minutes"], [contenteditable="true"]').first();
      if (await minutesEditor.count() > 0) {
        await minutesEditor.fill(`
Meeting Minutes - Q1 Board Meeting

Attendees: 
- John Smith (Chairman)
- Jane Doe (CEO)
- Bob Johnson (CFO)

Key Discussions:
1. Financial performance review
2. Strategic initiatives update
3. Risk assessment

Action Items:
- CFO to prepare detailed Q2 forecast
- CEO to present market expansion plan
        `);
      }
      
      // Save minutes
      await page.click('button:has-text(/save.*minutes|save.*notes/i)');
      
      // Check success
      await expect(page.locator('text=/minutes.*saved|notes.*saved/i')).toBeVisible();
    }
  });

  test('should manage meeting recordings', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Go to recordings section
      await page.click('text=/recordings|video/i');
      
      // Upload recording link
      await page.click('button:has-text(/add.*recording|upload.*recording/i)');
      
      // Enter recording details
      await page.fill('input[name="recordingUrl"], input[placeholder*="url" i]', 
        'https://zoom.us/rec/example-recording');
      await page.fill('input[name="passcode"], input[placeholder*="passcode" i]', 'abc123');
      
      // Save recording
      await page.click('button:has-text(/add|save/i)');
      
      // Check success
      await expect(page.locator('text=/recording.*added|saved.*successfully/i')).toBeVisible();
    }
  });

  test('should view meeting calendar', async ({ page }) => {
    // Switch to calendar view
    const calendarButton = page.locator('button:has-text(/calendar|month.*view/i)');
    if (await calendarButton.count() > 0) {
      await calendarButton.click();
      
      // Check calendar is displayed
      await expect(page.locator('.calendar-grid, [data-testid="calendar-view"]')).toBeVisible();
      
      // Navigate months
      const nextButton = page.locator('button[aria-label*="next" i], button:has-text("›")');
      if (await nextButton.count() > 0) {
        await nextButton.click();
        await page.waitForTimeout(500);
      }
      
      // Click on a date with meeting
      const meetingDate = page.locator('.calendar-day:has(.meeting-indicator), .has-meeting').first();
      if (await meetingDate.count() > 0) {
        await meetingDate.click();
        
        // Check day view or meeting list
        await expect(page.locator('text=/meetings.*on|scheduled.*for/i')).toBeVisible();
      }
    }
  });

  test('should filter meetings', async ({ page }) => {
    // Filter by type
    const typeFilter = page.locator('select[name="type"], button:has-text(/all.*types|filter.*by.*type/i)');
    if (await typeFilter.count() > 0) {
      if (await typeFilter.evaluate(el => el.tagName) === 'SELECT') {
        await typeFilter.selectOption({ value: 'board_meeting' });
      } else {
        await typeFilter.click();
        await page.click('text=/board.*meeting/i');
      }
      
      await page.waitForTimeout(1000);
    }
    
    // Filter by date range
    const dateFilter = page.locator('button:has-text(/date.*range|filter.*by.*date/i)');
    if (await dateFilter.count() > 0) {
      await dateFilter.click();
      await page.click('text=/this.*month|upcoming/i');
      await page.waitForTimeout(1000);
    }
  });

  test('should export meeting details', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Click export button
      const exportButton = page.locator('button:has-text(/export|download/i)');
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Select export format
        await page.click('text=/pdf|calendar.*file/i');
        
        // Download
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text(/export|download/i)');
        
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('meeting');
      }
    }
  });

  test('should send meeting reminders', async ({ page }) => {
    // Navigate to a meeting
    const meeting = page.locator('.meeting-card, [data-testid="meeting-item"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Click send reminder button
      await page.click('button:has-text(/send.*reminder|notify.*attendees/i)');
      
      // Customize reminder message
      const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]');
      if (await messageInput.count() > 0) {
        await messageInput.fill('Reminder: Board meeting tomorrow at 2 PM. Please review the attached documents.');
      }
      
      // Send reminder
      await page.click('button:has-text(/send|notify/i)');
      
      // Check success
      await expect(page.locator('text=/reminder.*sent|notified.*successfully/i')).toBeVisible();
    }
  });

  test('should mark attendance', async ({ page }) => {
    // Navigate to a past meeting
    const meeting = page.locator('.meeting-card:has-text(/past|completed/i), [data-testid="past-meeting"]').first();
    
    if (await meeting.count() > 0) {
      await meeting.click();
      
      // Go to attendance section
      await page.click('text=/attendance|attendees/i');
      
      // Mark attendance
      const attendeeRows = page.locator('.attendee-row, [data-testid="attendee-item"]');
      const firstAttendee = attendeeRows.first();
      
      if (await firstAttendee.count() > 0) {
        const checkbox = firstAttendee.locator('input[type="checkbox"]');
        if (await checkbox.count() > 0) {
          await checkbox.check();
        }
      }
      
      // Save attendance
      await page.click('button:has-text(/save.*attendance|update/i)');
      
      // Check success
      await expect(page.locator('text=/attendance.*saved|updated/i')).toBeVisible();
    }
  });
});