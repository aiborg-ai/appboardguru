#!/usr/bin/env node

/**
 * BoardGuru Instrument Workflow Smoke Tests
 * Comprehensive tests for the harmonized 4-step instrument workflow
 */

import { test, expect } from '@playwright/test';

// Test configuration
const CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3005',
  timeout: 30000,
  instruments: [
    'board-pack-ai',
    'annual-report-ai',
    'calendar',
    'board-effectiveness',
    'risk-dashboard',
    'esg-scorecard',
    'compliance-tracker',
    'performance-analytics',
    'peer-benchmarking'
  ]
};

// Test data for workflow validation
const TEST_DATA = {
  validAsset: {
    name: 'test-document.pdf',
    type: 'pdf',
    size: 1024000
  },
  mockAnalysisResult: {
    insights: ['Test insight 1', 'Test insight 2'],
    charts: [{ type: 'bar', data: {} }],
    recommendations: ['Test recommendation']
  }
};

test.describe('Instrument Workflow Smoke Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for these tests
    test.setTimeout(CONFIG.timeout);
    
    // Navigate to instruments page
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments`);
    await page.waitForLoadState('networkidle');
  });

  test('Instruments page loads successfully', async ({ page }) => {
    // Check page title and main heading
    await expect(page).toHaveTitle(/AppBoardGuru/);
    await expect(page.locator('h1')).toContainText('All Instruments');
    
    // Verify all 9 instruments are displayed
    const instrumentCards = page.locator('[data-testid="instrument-card"]');
    await expect(instrumentCards).toHaveCount(9);
    
    // Check that play buttons are present
    const playButtons = page.locator('button:has-text("Launch Instrument")');
    await expect(playButtons).toHaveCount(9);
  });

  test('Instrument workflow routing works', async ({ page }) => {
    // Click on the first instrument (Board Pack AI)
    const firstInstrument = page.locator('[data-testid="instrument-card"]').first();
    await firstInstrument.locator('button:has-text("Launch Instrument")').click();
    
    // Should navigate to the workflow page
    await expect(page).toHaveURL(/\/dashboard\/instruments\/play\/board-pack-ai/);
    
    // Wait for wizard to load
    await page.waitForSelector('[data-testid="instrument-play-wizard"]', { timeout: 10000 });
  });

  test('Step 1: Goal Selection works correctly', async ({ page }) => {
    // Navigate to workflow
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/board-pack-ai`);
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    
    // Should be on goal selection step
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Select Goal');
    
    // Check that goals are displayed
    const goalOptions = page.locator('[data-testid="goal-option"]');
    await expect(goalOptions).toHaveCount.greaterThan(0);
    
    // Select a goal
    await goalOptions.first().click();
    
    // Continue button should be enabled
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
    
    // Progress should show step 1
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('1');
  });

  test('Step 2: Asset Selection works correctly', async ({ page }) => {
    // Navigate and complete step 1
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/board-pack-ai`);
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    
    // Complete goal selection
    await page.locator('[data-testid="goal-option"]').first().click();
    await page.locator('button:has-text("Continue")').click();
    
    // Should be on asset selection step
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Select Assets');
    
    // Check asset selection interface
    await expect(page.locator('[data-testid="asset-selection-area"]')).toBeVisible();
    
    // Should show minimum asset requirement
    await expect(page.locator('[data-testid="asset-requirement"]')).toBeVisible();
    
    // Progress should show step 2
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('2');
  });

  test('Step 3: Dashboard Analysis displays correctly', async ({ page }) => {
    // Navigate and complete steps 1-2
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/board-pack-ai`);
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    
    // Complete goal selection
    await page.locator('[data-testid="goal-option"]').first().click();
    await page.locator('button:has-text("Continue")').click();
    
    // Mock asset selection (assume assets are pre-selected for test)
    await page.locator('button:has-text("Continue")').click();
    
    // Should be on dashboard step
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Analysis Dashboard');
    
    // Should show loading state initially
    await expect(page.locator('[data-testid="analysis-loading"]')).toBeVisible();
    
    // Should eventually show results
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({ timeout: 15000 });
    
    // Progress should show step 3
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('3');
  });

  test('Step 4: Save & Share options work correctly', async ({ page }) => {
    // Navigate through all steps to reach step 4
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/board-pack-ai`);
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    
    // Complete all previous steps quickly for testing
    await page.locator('[data-testid="goal-option"]').first().click();
    await page.locator('button:has-text("Continue")').click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForSelector('[data-testid="analysis-results"]', { timeout: 15000 });
    await page.locator('button:has-text("Continue")').click();
    
    // Should be on save & share step
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Save & Share');
    
    // Check save options are present
    await expect(page.locator('[data-testid="save-to-vault-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-as-asset-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-options"]')).toBeVisible();
    
    // Check export options
    await expect(page.locator('[data-testid="export-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-excel"]')).toBeVisible();
    
    // Progress should show step 4
    await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('4');
  });

  test('API endpoint responds correctly', async ({ page }) => {
    // Test the analysis API endpoint directly
    const response = await page.request.post(`${CONFIG.baseUrl}/api/instruments/analyze`, {
      data: {
        instrumentId: 'board-pack-ai',
        goal: {
          id: 'test-goal',
          title: 'Test Goal',
          description: 'Test goal description'
        },
        assets: [TEST_DATA.validAsset],
        saveOptions: {
          saveToVault: { enabled: false },
          saveAsAsset: { enabled: false },
          shareOptions: { enabled: false },
          exportOptions: {}
        },
        results: TEST_DATA.mockAnalysisResult
      }
    });
    
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData).toHaveProperty('success', true);
    expect(responseData).toHaveProperty('analysisId');
    expect(responseData).toHaveProperty('instrumentId', 'board-pack-ai');
  });

  test('Navigation between steps works', async ({ page }) => {
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/board-pack-ai`);
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    
    // Complete step 1
    await page.locator('[data-testid="goal-option"]').first().click();
    await page.locator('button:has-text("Continue")').click();
    
    // Go back to step 1
    await page.locator('button:has-text("Back")').click();
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Select Goal');
    
    // Go forward again
    await page.locator('button:has-text("Continue")').click();
    await expect(page.locator('[data-testid="current-step"]')).toContainText('Select Assets');
  });

  test('Error handling works correctly', async ({ page }) => {
    // Test invalid instrument ID
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/invalid-instrument`);
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Instrument Not Found');
    
    // Should have back to instruments button
    await expect(page.locator('button:has-text("Back to Instruments")')).toBeVisible();
  });

  test('Wizard completion flow works end-to-end', async ({ page }) => {
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/board-pack-ai`);
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    
    // Step 1: Select goal
    await page.locator('[data-testid="goal-option"]').first().click();
    await page.locator('button:has-text("Continue")').click();
    
    // Step 2: Select assets (mock selection)
    await page.locator('button:has-text("Continue")').click();
    
    // Step 3: Wait for analysis
    await page.waitForSelector('[data-testid="analysis-results"]', { timeout: 15000 });
    await page.locator('button:has-text("Continue")').click();
    
    // Step 4: Complete workflow
    await page.locator('[data-testid="save-to-vault-option"] input[type="checkbox"]').check();
    await page.locator('button:has-text("Complete Analysis")').click();
    
    // Should show completion message
    await expect(page.locator('[data-testid="completion-message"]')).toContainText('Analysis Complete');
    
    // Should redirect back to instruments page
    await page.waitForURL(/\/dashboard\/instruments/, { timeout: 10000 });
  });

  test('All 9 instruments can be launched', async ({ page }) => {
    for (const instrumentId of CONFIG.instruments) {
      console.log(`Testing instrument: ${instrumentId}`);
      
      // Navigate to the specific instrument workflow
      await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/${instrumentId}`);
      
      // Should load the wizard without errors
      await expect(page.locator('[data-testid="instrument-play-wizard"]')).toBeVisible({ timeout: 10000 });
      
      // Should show the correct step 1
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Select Goal');
      
      // Should have at least one goal option
      await expect(page.locator('[data-testid="goal-option"]')).toHaveCount.greaterThan(0);
    }
  });

  test('Responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments`);
    
    // Instruments should still be visible on mobile
    await expect(page.locator('[data-testid="instrument-card"]')).toHaveCount(9);
    
    // Launch workflow on mobile
    await page.locator('[data-testid="instrument-card"]').first()
      .locator('button:has-text("Launch Instrument")').click();
    
    // Wizard should work on mobile
    await expect(page.locator('[data-testid="instrument-play-wizard"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
  });

  test('Performance benchmarks meet requirements', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${CONFIG.baseUrl}/dashboard/instruments`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Start workflow
    const workflowStartTime = Date.now();
    await page.locator('[data-testid="instrument-card"]').first()
      .locator('button:has-text("Launch Instrument")').click();
    
    await page.waitForSelector('[data-testid="instrument-play-wizard"]');
    const workflowLoadTime = Date.now() - workflowStartTime;
    
    // Workflow should start within 2 seconds
    expect(workflowLoadTime).toBeLessThan(2000);
  });
});

// Individual instrument-specific tests
test.describe('Individual Instrument Tests', () => {
  
  CONFIG.instruments.forEach(instrumentId => {
    test(`${instrumentId} workflow completes successfully`, async ({ page }) => {
      await page.goto(`${CONFIG.baseUrl}/dashboard/instruments/play/${instrumentId}`);
      await page.waitForSelector('[data-testid="instrument-play-wizard"]');
      
      // Should have instrument-specific goals
      const goals = page.locator('[data-testid="goal-option"]');
      await expect(goals).toHaveCount.greaterThan(0);
      
      // Goals should be relevant to the instrument
      const firstGoal = goals.first();
      await expect(firstGoal).toBeVisible();
      
      // Should be able to select and continue
      await firstGoal.click();
      await expect(page.locator('button:has-text("Continue")')).toBeEnabled();
    });
  });
});