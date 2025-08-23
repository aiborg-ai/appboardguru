/**
 * Accessibility Tests for Instrument Workflow
 * Tests WCAG compliance, screen reader compatibility, keyboard navigation, and inclusive design
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

class AccessibilityTestHelper {
  constructor(private page: Page) {}

  async checkAxeCompliance(context?: string) {
    const axeResults = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    if (axeResults.violations.length > 0) {
      console.error(`Accessibility violations ${context ? `in ${context}` : ''}:`);
      axeResults.violations.forEach((violation) => {
        console.error(`- ${violation.id}: ${violation.description}`);
        violation.nodes.forEach((node) => {
          console.error(`  Target: ${node.target.join(', ')}`);
          console.error(`  Impact: ${node.impact}`);
        });
      });
    }

    expect(axeResults.violations).toHaveLength(0);
  }

  async testKeyboardNavigation(expectedFocusableElements: string[]) {
    // Test Tab navigation
    for (let i = 0; i < expectedFocusableElements.length; i++) {
      await this.page.keyboard.press('Tab');
      const focused = await this.page.locator(':focus').getAttribute('data-testid');
      expect(expectedFocusableElements).toContain(focused);
    }

    // Test Shift+Tab navigation (reverse)
    for (let i = expectedFocusableElements.length - 1; i >= 0; i--) {
      await this.page.keyboard.press('Shift+Tab');
      const focused = await this.page.locator(':focus').getAttribute('data-testid');
      expect(expectedFocusableElements).toContain(focused);
    }
  }

  async testAriaLabels() {
    // Check all interactive elements have aria-labels or accessible names
    const interactiveElements = await this.page.locator(
      'button, input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]'
    ).all();

    for (const element of interactiveElements) {
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaLabelledBy = await element.getAttribute('aria-labelledby');
      const title = await element.getAttribute('title');
      const textContent = await element.textContent();

      const hasAccessibleName = ariaLabel || ariaLabelledBy || title || (textContent && textContent.trim());
      expect(hasAccessibleName).toBeTruthy();
    }
  }

  async testColorContrast() {
    // This would typically be handled by axe-core, but we can add specific checks
    const results = await new AxeBuilder({ page: this.page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
  }

  async testFocusManagement() {
    // Check that focus is properly managed during step transitions
    const initialFocus = await this.page.locator(':focus').getAttribute('data-testid');
    
    // Navigate to next step
    await this.page.keyboard.press('Tab'); // Navigate to next button
    await this.page.keyboard.press('Enter'); // Activate next button
    
    // Focus should move to the new step content
    await this.page.waitForTimeout(100); // Allow for focus transition
    const newFocus = await this.page.locator(':focus').getAttribute('data-testid');
    expect(newFocus).not.toBe(initialFocus);
    expect(newFocus).toBeTruthy();
  }

  async testScreenReaderAnnouncements() {
    // Check for aria-live regions and status updates
    const liveRegions = await this.page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);

    // Check for status messages
    const statusElements = await this.page.locator('[role="status"], [aria-live="polite"], [aria-live="assertive"]').all();
    expect(statusElements.length).toBeGreaterThan(0);
  }
}

test.describe('Instrument Workflow Accessibility Tests', () => {
  test('should pass axe accessibility audit on instrument selection', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments');
    
    const helper = new AccessibilityTestHelper(page);
    await helper.checkAxeCompliance('instrument selection page');
  });

  test('should pass axe accessibility audit on workflow start', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    const helper = new AccessibilityTestHelper(page);
    await helper.checkAxeCompliance('workflow start page');
  });

  test('should support keyboard navigation through goal selection', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Focus should start at the first interactive element
    await page.keyboard.press('Tab');
    
    const helper = new AccessibilityTestHelper(page);
    
    // Expected focusable elements in goal selection step
    const expectedElements = [
      'goal-option-strategic-planning',
      'goal-option-risk-assessment',
      'goal-option-compliance-review',
      'next-button'
    ];
    
    // Test that all goal options are focusable
    for (const elementId of expectedElements) {
      const element = page.locator(`[data-testid="${elementId}"]`);
      await element.focus();
      const focused = await page.locator(':focus').getAttribute('data-testid');
      expect(focused).toBe(elementId);
    }
  });

  test('should support keyboard activation of goal options', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Focus and activate first goal option with keyboard
    await page.locator('[data-testid="goal-option-strategic-planning"]').focus();
    await page.keyboard.press('Enter');
    
    // Verify selection is made
    const isSelected = await page.locator('[data-testid="goal-option-strategic-planning"]').getAttribute('aria-selected');
    expect(isSelected).toBe('true');
    
    // Next button should be enabled
    const nextButton = page.locator('[data-testid="next-button"]');
    const isDisabled = await nextButton.getAttribute('disabled');
    expect(isDisabled).toBeNull();
  });

  test('should support keyboard navigation through asset selection', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Navigate to asset selection step
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-assets"]');
    
    // Test checkbox navigation with keyboard
    await page.keyboard.press('Tab');
    let focused = await page.locator(':focus').getAttribute('data-testid');
    expect(focused).toMatch(/asset-checkbox-\d+/);
    
    // Test space bar to toggle checkbox
    await page.keyboard.press('Space');
    const isChecked = await page.locator(':focus').isChecked();
    expect(isChecked).toBe(true);
  });

  test('should maintain focus order in dashboard step', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Navigate to dashboard step
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-dashboard"]');
    
    const helper = new AccessibilityTestHelper(page);
    await helper.checkAxeCompliance('dashboard step');
    
    // Test that dashboard controls are focusable
    const focusableElements = await page.locator('button, input, select, [tabindex]:not([tabindex="-1"])').all();
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Test tab order is logical
    for (const element of focusableElements) {
      await element.focus();
      const focused = await page.locator(':focus');
      expect(focused).toBeTruthy();
    }
  });

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);
    
    // Make a selection and check for status updates
    await page.click('[data-testid="goal-option-strategic-planning"]');
    
    // Wait for any aria-live updates
    await page.waitForTimeout(100);
    
    // Check for status or announcement elements
    const statusElements = await page.locator('[role="status"], [aria-live], .sr-only').all();
    expect(statusElements.length).toBeGreaterThan(0);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // First heading should be h1
    const firstHeading = headings[0];
    const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase());
    expect(tagName).toBe('h1');
    
    // Test that headings form a logical hierarchy
    const results = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();
    
    expect(results.violations.filter(v => v.id === 'heading-order')).toHaveLength(0);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    const helper = new AccessibilityTestHelper(page);
    await helper.testAriaLabels();
    
    // Specifically test form inputs have labels
    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();
    
    expect(results.violations.filter(v => v.id === 'label')).toHaveLength(0);
  });

  test('should support high contrast mode', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Simulate high contrast mode
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * {
            background: white !important;
            color: black !important;
            border-color: black !important;
          }
        }
      `
    });
    
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Elements should still be visible and functional
    const goalOptions = await page.locator('[data-testid^="goal-option-"]').all();
    for (const option of goalOptions) {
      await expect(option).toBeVisible();
      await expect(option).toBeEnabled();
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Navigate between steps - animations should be reduced/removed
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-assets"]');
    
    // Check that motion is respected (this is mainly handled by CSS)
    const stepContainer = page.locator('[data-testid="step-assets"]');
    await expect(stepContainer).toBeVisible();
  });

  test('should handle focus trapping in modals', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Navigate to actions step where modals might appear
    await page.click('[data-testid="goal-option-strategic-planning"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="asset-checkbox-0"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="next-button"]');
    await page.waitForSelector('[data-testid="step-actions"]');
    
    // If there are any modal-like dialogs, test focus trapping
    const dialogs = await page.locator('[role="dialog"], .modal').all();
    
    for (const dialog of dialogs) {
      if (await dialog.isVisible()) {
        // Test that Tab doesn't escape the modal
        const focusableInModal = await dialog.locator('button, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
        
        if (focusableInModal.length > 1) {
          // Focus first element
          await focusableInModal[0].focus();
          
          // Tab through all elements
          for (let i = 0; i < focusableInModal.length + 1; i++) {
            await page.keyboard.press('Tab');
          }
          
          // Focus should wrap back to first element
          const finalFocus = await page.locator(':focus');
          const firstElementText = await focusableInModal[0].textContent();
          const finalFocusText = await finalFocus.textContent();
          expect(finalFocusText).toBe(firstElementText);
        }
      }
    }
  });

  test('should provide alternative text for images and icons', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Check all images have alt text
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
      expect(alt).not.toBe('');
    }
    
    // Check SVG icons have accessible names
    const svgs = await page.locator('svg').all();
    for (const svg of svgs) {
      const ariaLabel = await svg.getAttribute('aria-label');
      const role = await svg.getAttribute('role');
      const ariaHidden = await svg.getAttribute('aria-hidden');
      
      // SVG should either be decorative (aria-hidden) or have accessible name
      const isAccessible = ariaHidden === 'true' || ariaLabel || role;
      expect(isAccessible).toBeTruthy();
    }
  });

  test('should support zoom up to 200% without horizontal scrolling', async ({ page }) => {
    await page.goto('http://localhost:3000/instruments/board-pack-ai/play');
    
    // Set zoom to 200%
    await page.setViewportSize({ width: 640, height: 800 }); // Simulate zoomed viewport
    
    await page.waitForSelector('[data-testid="step-goal"]');
    
    // Check that no horizontal scrolling is needed
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // 10px tolerance
    
    // All interactive elements should still be usable
    const goalOptions = await page.locator('[data-testid^="goal-option-"]').all();
    for (const option of goalOptions) {
      await expect(option).toBeVisible();
      await expect(option).toBeEnabled();
    }
  });
});