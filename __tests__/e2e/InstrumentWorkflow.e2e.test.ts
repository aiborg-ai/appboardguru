/**
 * Comprehensive End-to-End Tests for Instrument Workflow
 * Tests complete user journeys through the browser using Playwright
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3004';

// Page Object Model for better maintainability
class InstrumentsPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}/dashboard/instruments`);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForInstrumentsToLoad() {
    await this.page.waitForSelector('[data-testid="instrument-card"]', { timeout: 10000 });
  }

  async getInstrumentCard(instrumentId: string) {
    return this.page.locator(`[data-testid="instrument-card-${instrumentId}"]`);
  }

  async launchInstrument(instrumentId: string) {
    const card = this.getInstrumentCard(instrumentId);
    await card.locator('button:has-text("Launch Instrument")').click();
  }

  async getInstrumentCount() {
    const cards = this.page.locator('[data-testid="instrument-card"]');
    return await cards.count();
  }

  async searchInstruments(query: string) {
    await this.page.fill('[data-testid="instrument-search"]', query);
  }

  async filterByCategory(category: string) {
    await this.page.click('[data-testid="category-filter"]');
    await this.page.click(`text="${category}"`);
  }
}

class InstrumentWorkflowPage {
  constructor(private page: Page) {}

  async waitForWizardToLoad() {
    await this.page.waitForSelector('[data-testid="instrument-play-wizard"]', { timeout: 10000 });
  }

  // Step 1: Goal Selection
  async selectGoal(goalId: string) {
    await this.page.click(`[data-testid="goal-option-${goalId}"]`);
  }

  async configureParameter(paramId: string, value: string) {
    const paramInput = this.page.locator(`[data-testid="param-${paramId}"]`);
    const inputType = await paramInput.getAttribute('type') || await paramInput.evaluate(el => el.tagName.toLowerCase());
    
    if (inputType === 'select' || inputType === 'SELECT') {
      await paramInput.selectOption(value);
    } else if (inputType === 'checkbox') {
      if (value === 'true') await paramInput.check();
      else await paramInput.uncheck();
    } else if (inputType === 'range') {
      await paramInput.fill(value);
    } else {
      await paramInput.fill(value);
    }
  }

  async isStepValid() {
    const continueButton = this.page.locator('button:has-text("Continue")');
    return await continueButton.isEnabled();
  }

  async continueToNextStep() {
    await this.page.click('button:has-text("Continue")');
    await this.page.waitForTimeout(500); // Wait for transition
  }

  async goToPreviousStep() {
    await this.page.click('button:has-text("Back")');
    await this.page.waitForTimeout(500); // Wait for transition
  }

  // Step 2: Asset Selection
  async selectAsset(assetId: string) {
    await this.page.click(`[data-testid="asset-${assetId}"]`);
  }

  async uploadFile(filePath: string) {
    const fileInput = this.page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(filePath);
  }

  async getSelectedAssetCount() {
    const selectedAssets = this.page.locator('[data-testid^="asset-"].selected');
    return await selectedAssets.count();
  }

  async searchAssets(query: string) {
    await this.page.fill('[data-testid="asset-search"]', query);
  }

  async filterAssetsByType(type: string) {
    await this.page.click('[data-testid="asset-type-filter"]');
    await this.page.click(`text="${type}"`);
  }

  // Step 3: Analysis Dashboard
  async startAnalysis() {
    await this.page.click('[data-testid="start-analysis-btn"]');
  }

  async waitForAnalysisToComplete() {
    // Wait for analysis to start
    await this.page.waitForSelector('[data-testid="analysis-progress"]', { timeout: 5000 });
    
    // Wait for completion
    await this.page.waitForSelector('[data-testid="analysis-results"]', { timeout: 30000 });
  }

  async getAnalysisResults() {
    const insights = await this.page.locator('[data-testid="insight-card"]').count();
    const charts = await this.page.locator('[data-testid^="chart-"]').count();
    const recommendations = await this.page.locator('[data-testid="recommendation-card"]').count();
    
    return { insights, charts, recommendations };
  }

  async exportChart(chartId: string, format: string) {
    await this.page.click(`[data-testid="export-chart-${chartId}"]`);
    await this.page.click(`text="${format}"`);
  }

  async regenerateInsight(insightId: string) {
    await this.page.click(`[data-testid="regenerate-insight-${insightId}"]`);
  }

  // Step 4: Save & Share Actions
  async enableSaveToVault(vaultId?: string) {
    await this.page.check('[data-testid="save-to-vault-checkbox"]');
    
    if (vaultId) {
      await this.page.click('[data-testid="vault-selector"]');
      await this.page.click(`[data-testid="vault-option-${vaultId}"]`);
    }
  }

  async enableSaveAsAsset(assetName: string, category?: string) {
    await this.page.check('[data-testid="save-as-asset-checkbox"]');
    await this.page.fill('[data-testid="asset-name-input"]', assetName);
    
    if (category) {
      await this.page.selectOption('[data-testid="asset-category-select"]', category);
    }
  }

  async addAssetTag(tag: string) {
    await this.page.fill('[data-testid="asset-tags-input"]', tag);
    await this.page.press('[data-testid="asset-tags-input"]', 'Enter');
  }

  async enableSharing() {
    await this.page.check('[data-testid="enable-sharing-checkbox"]');
  }

  async shareWithBoardMate(boardMateId: string) {
    await this.page.check(`[data-testid="boardmate-${boardMateId}"]`);
  }

  async addEmailRecipient(email: string) {
    await this.page.fill('[data-testid="email-recipients-input"]', email);
    await this.page.press('[data-testid="email-recipients-input"]', 'Enter');
  }

  async enablePublicLink() {
    await this.page.check('[data-testid="generate-public-link-checkbox"]');
  }

  async selectExportFormat(format: string) {
    await this.page.check(`[data-testid="export-${format}"]`);
  }

  async completeWorkflow() {
    await this.page.click('button:has-text("Complete Analysis")');
  }

  // Progress and Navigation
  async getCurrentStep() {
    const progressText = await this.page.locator('[data-testid="current-step"]').textContent();
    return progressText?.match(/Step (\d+)/)?.[1] || '1';
  }

  async getProgressPercentage() {
    const progressBar = this.page.locator('[data-testid="progress-bar"]');
    return await progressBar.getAttribute('aria-valuenow');
  }

  // Utility methods
  async closeWizard() {
    await this.page.click('[data-testid="close-wizard-btn"]');
  }

  async confirmClose() {
    await this.page.click('button:has-text("Yes, close")');
  }

  async previewResults() {
    await this.page.click('[data-testid="preview-results-btn"]');
  }

  async waitForCompletionMessage() {
    await this.page.waitForSelector('[data-testid="completion-message"]', { timeout: 10000 });
  }
}

// Helper function to create test files
async function createTestFile(page: Page, name: string, content: string, type: string) {
  return await page.evaluateHandle(([name, content, type]) => {
    const file = new File([content], name, { type });
    return file;
  }, [name, content, type]);
}

test.describe('Instrument Workflow E2E Tests', () => {
  let instrumentsPage: InstrumentsPage;
  let workflowPage: InstrumentWorkflowPage;

  test.beforeEach(async ({ page }) => {
    instrumentsPage = new InstrumentsPage(page);
    workflowPage = new InstrumentWorkflowPage(page);
    
    // Setup page with proper viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.describe('Instruments Page Navigation', () => {
    test('loads instruments page successfully', async ({ page }) => {
      await instrumentsPage.goto();
      
      // Verify page loads
      await expect(page).toHaveTitle(/AppBoardGuru/);
      await expect(page.locator('h1')).toContainText('All Instruments');
      
      // Verify instruments are displayed
      await instrumentsPage.waitForInstrumentsToLoad();
      const instrumentCount = await instrumentsPage.getInstrumentCount();
      expect(instrumentCount).toBe(9);
    });

    test('launches instrument workflow correctly', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      
      // Launch Board Pack AI instrument
      await instrumentsPage.launchInstrument('board-pack-ai');
      
      // Verify navigation to workflow page
      await expect(page).toHaveURL(/\/dashboard\/instruments\/play\/board-pack-ai/);
      await workflowPage.waitForWizardToLoad();
      
      // Verify wizard initialization
      await expect(page.locator('[data-testid="instrument-play-wizard"]')).toBeVisible();
      await expect(page.locator('h2')).toContainText('Board Pack AI');
    });

    test('filters instruments by category', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      
      await instrumentsPage.filterByCategory('AI & Analytics');
      
      // Should show only AI instruments
      const visibleInstruments = page.locator('[data-testid="instrument-card"]:visible');
      await expect(visibleInstruments).toHaveCount(2); // Board Pack AI and Annual Report AI
    });

    test('searches instruments by name', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      
      await instrumentsPage.searchInstruments('board');
      
      // Should show instruments with "board" in the name
      const visibleInstruments = page.locator('[data-testid="instrument-card"]:visible');
      await expect(visibleInstruments).toHaveCount(1); // Board Pack AI
    });
  });

  test.describe('Complete Workflow Journeys', () => {
    test('completes workflow with comprehensive analysis goal', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Step 1: Select goal with parameters
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 1');
      await workflowPage.selectGoal('comprehensive-analysis');
      
      // Configure required parameters
      await workflowPage.configureParameter('analysis-depth', 'deep');
      await workflowPage.configureParameter('include-sentiment', 'true');
      await workflowPage.configureParameter('confidence-threshold', '85');
      
      // Verify step validation
      expect(await workflowPage.isStepValid()).toBe(true);
      await workflowPage.continueToNextStep();

      // Step 2: Select assets
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 2');
      await workflowPage.selectAsset('1');
      await workflowPage.selectAsset('2');
      
      // Verify assets are selected
      expect(await workflowPage.getSelectedAssetCount()).toBe(2);
      await workflowPage.continueToNextStep();

      // Step 3: Run analysis
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 3');
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      
      // Verify analysis results
      const results = await workflowPage.getAnalysisResults();
      expect(results.insights).toBeGreaterThan(0);
      expect(results.charts).toBeGreaterThan(0);
      expect(results.recommendations).toBeGreaterThan(0);
      
      await workflowPage.continueToNextStep();

      // Step 4: Configure save options
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 4');
      await workflowPage.enableSaveToVault('vault-1');
      await workflowPage.enableSaveAsAsset('Board Pack Analysis Results', 'analysis-reports');
      await workflowPage.addAssetTag('q1-2024');
      await workflowPage.addAssetTag('board-pack');
      await workflowPage.selectExportFormat('pdf');
      await workflowPage.selectExportFormat('excel');

      // Complete workflow
      await workflowPage.completeWorkflow();
      await workflowPage.waitForCompletionMessage();
      
      // Verify completion
      await expect(page.locator('[data-testid="completion-message"]'))
        .toContainText('Analysis Complete');
      
      // Should redirect back to instruments page
      await page.waitForURL(/\/dashboard\/instruments/, { timeout: 10000 });
    });

    test('completes quick workflow with minimal configuration', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Step 1: Select simple goal (no parameters)
      await workflowPage.selectGoal('quick-summary');
      expect(await workflowPage.isStepValid()).toBe(true);
      await workflowPage.continueToNextStep();

      // Step 2: Select single asset
      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();

      // Step 3: Run analysis
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      await workflowPage.continueToNextStep();

      // Step 4: Simple export only
      await workflowPage.selectExportFormat('pdf');
      await workflowPage.completeWorkflow();
      
      await workflowPage.waitForCompletionMessage();
      await expect(page.locator('[data-testid="completion-message"]'))
        .toContainText('Analysis Complete');
    });

    test('handles workflow with file upload', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Step 1: Select goal
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();

      // Step 2: Upload new file instead of selecting existing assets
      const testFile = await createTestFile(page, 'test-board-pack.pdf', 'Test PDF content', 'application/pdf');
      await workflowPage.uploadFile(testFile as any);
      
      // Wait for upload to complete
      await page.waitForSelector('[data-testid="uploaded-file-test-board-pack.pdf"]', { timeout: 10000 });
      
      await workflowPage.continueToNextStep();

      // Continue with analysis
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      await workflowPage.continueToNextStep();

      // Complete with export
      await workflowPage.selectExportFormat('pdf');
      await workflowPage.completeWorkflow();
      
      await workflowPage.waitForCompletionMessage();
    });

    test('completes workflow with comprehensive sharing options', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Quick progression to sharing step
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();
      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      await workflowPage.continueToNextStep();

      // Configure comprehensive sharing
      await workflowPage.enableSharing();
      await workflowPage.shareWithBoardMate('boardmate-1');
      await workflowPage.shareWithBoardMate('boardmate-2');
      await workflowPage.addEmailRecipient('external1@example.com');
      await workflowPage.addEmailRecipient('external2@example.com');
      await workflowPage.enablePublicLink();
      
      // Also save to vault and export
      await workflowPage.enableSaveToVault('vault-2');
      await workflowPage.selectExportFormat('powerpoint');
      
      await workflowPage.completeWorkflow();
      await workflowPage.waitForCompletionMessage();
    });
  });

  test.describe('Navigation and Data Persistence', () => {
    test('maintains data when navigating back and forth', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Step 1: Configure goal
      await workflowPage.selectGoal('comprehensive-analysis');
      await workflowPage.configureParameter('analysis-depth', 'deep');
      await workflowPage.continueToNextStep();

      // Step 2: Select assets
      await workflowPage.selectAsset('1');
      await workflowPage.selectAsset('2');
      await workflowPage.continueToNextStep();

      // Go back to step 1
      await workflowPage.goToPreviousStep();
      await workflowPage.goToPreviousStep();

      // Verify goal selection is preserved
      await expect(page.locator('[data-testid="goal-option-comprehensive-analysis"]'))
        .toHaveClass(/selected/);
      await expect(page.locator('[data-testid="param-analysis-depth"]'))
        .toHaveValue('deep');

      // Go forward to step 2
      await workflowPage.continueToNextStep();

      // Verify asset selection is preserved
      expect(await workflowPage.getSelectedAssetCount()).toBe(2);
    });

    test('handles progress indicator correctly', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Step 1 - 25%
      expect(await workflowPage.getProgressPercentage()).toBe('25');
      expect(await workflowPage.getCurrentStep()).toBe('1');

      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();

      // Step 2 - 50%
      expect(await workflowPage.getProgressPercentage()).toBe('50');
      expect(await workflowPage.getCurrentStep()).toBe('2');

      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();

      // Step 3 - 75%
      expect(await workflowPage.getProgressPercentage()).toBe('75');
      expect(await workflowPage.getCurrentStep()).toBe('3');

      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      await workflowPage.continueToNextStep();

      // Step 4 - 100%
      expect(await workflowPage.getProgressPercentage()).toBe('100');
      expect(await workflowPage.getCurrentStep()).toBe('4');
    });
  });

  test.describe('Interactive Features', () => {
    test('supports chart interactions and exports', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Quick progression to analysis results
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();
      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();

      // Test chart interactions
      const chartCount = await page.locator('[data-testid^="chart-"]').count();
      if (chartCount > 0) {
        // Export first chart
        await workflowPage.exportChart('chart-1', 'PNG');
        
        // Verify download starts
        const downloadPromise = page.waitForEvent('download');
        await downloadPromise;
      }

      // Test insight regeneration
      const insightCount = await page.locator('[data-testid="insight-card"]').count();
      if (insightCount > 0) {
        await workflowPage.regenerateInsight('insight-1');
        
        // Wait for regeneration to complete
        await page.waitForSelector('[data-testid="regenerating-insight-1"]', { timeout: 5000 });
        await page.waitForSelector('[data-testid="regenerating-insight-1"]', { state: 'hidden', timeout: 10000 });
      }
    });

    test('supports result preview functionality', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Progress to actions step
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();
      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      await workflowPage.continueToNextStep();

      // Test preview functionality
      await workflowPage.previewResults();
      
      // Verify preview modal opens
      await expect(page.locator('[data-testid="results-preview-modal"]')).toBeVisible();
      
      // Close preview
      await page.click('[data-testid="close-preview"]');
      await expect(page.locator('[data-testid="results-preview-modal"]')).toBeHidden();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('handles workflow cancellation gracefully', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Configure workflow partially
      await workflowPage.selectGoal('comprehensive-analysis');
      await workflowPage.configureParameter('analysis-depth', 'deep');
      await workflowPage.continueToNextStep();
      await workflowPage.selectAsset('1');

      // Attempt to close workflow
      await workflowPage.closeWizard();
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="close-confirmation-dialog"]')).toBeVisible();
      await expect(page.locator('text=unsaved changes will be lost')).toBeVisible();

      // Confirm close
      await workflowPage.confirmClose();
      
      // Should return to instruments page
      await page.waitForURL(/\/dashboard\/instruments/);
    });

    test('handles validation errors appropriately', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Try to continue without selecting goal
      await expect(page.locator('button:has-text("Continue")')).toBeDisabled();

      // Select goal with required parameters but don't configure them
      await workflowPage.selectGoal('comprehensive-analysis');
      
      // Continue should still be disabled
      await expect(page.locator('button:has-text("Continue")')).toBeDisabled();
      
      // Configure required parameter
      await workflowPage.configureParameter('analysis-depth', 'deep');
      
      // Now continue should be enabled
      await expect(page.locator('button:has-text("Continue")')).toBeEnabled();
    });

    test('handles network errors during analysis', async ({ page }) => {
      // Intercept and fail the analysis API call
      await page.route('/api/instruments/analyze', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Quick progression to completion
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();
      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();
      await workflowPage.startAnalysis();
      await workflowPage.waitForAnalysisToComplete();
      await workflowPage.continueToNextStep();
      await workflowPage.selectExportFormat('pdf');
      
      // Attempt to complete (should fail)
      await workflowPage.completeWorkflow();
      
      // Should show error message
      await expect(page.locator('[data-testid="completion-error"]')).toBeVisible();
      await expect(page.locator('text=An error occurred')).toBeVisible();
      
      // Should offer retry option
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });

    test('handles maximum asset selection limits', async ({ page }) => {
      // Mock instrument config with low asset limit
      await page.addInitScript(() => {
        window.__MOCK_INSTRUMENT_CONFIG__ = {
          assetFilters: { maxAssets: 2 }
        };
      });

      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();

      // Select maximum allowed assets
      await workflowPage.selectAsset('1');
      await workflowPage.selectAsset('2');
      
      // Third asset should be disabled or show warning
      const thirdAsset = page.locator('[data-testid="asset-3"]');
      if (await thirdAsset.count() > 0) {
        await expect(thirdAsset).toHaveClass(/disabled/);
      }
      
      // Should display limit message
      await expect(page.locator('text=Maximum 2 assets selected')).toBeVisible();
    });
  });

  test.describe('Different Instrument Types', () => {
    const instruments = [
      { id: 'board-pack-ai', name: 'Board Pack AI' },
      { id: 'annual-report-ai', name: 'Annual Report AI' },
      { id: 'risk-dashboard', name: 'Risk Dashboard' },
      { id: 'esg-scorecard', name: 'ESG Scorecard' }
    ];

    instruments.forEach(({ id, name }) => {
      test(`completes workflow for ${name}`, async ({ page }) => {
        await instrumentsPage.goto();
        await instrumentsPage.waitForInstrumentsToLoad();
        await instrumentsPage.launchInstrument(id);
        await workflowPage.waitForWizardToLoad();

        // Verify instrument-specific title
        await expect(page.locator('h2')).toContainText(name);

        // Complete basic workflow
        await workflowPage.selectGoal('quick-summary'); // Assuming all have this goal
        await workflowPage.continueToNextStep();
        await workflowPage.selectAsset('1');
        await workflowPage.continueToNextStep();
        await workflowPage.startAnalysis();
        await workflowPage.waitForAnalysisToComplete();
        await workflowPage.continueToNextStep();
        await workflowPage.selectExportFormat('pdf');
        await workflowPage.completeWorkflow();
        
        await workflowPage.waitForCompletionMessage();
        await expect(page.locator('[data-testid="completion-message"]'))
          .toContainText('Analysis Complete');
      });
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('supports keyboard navigation through workflow', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Navigate using keyboard
      await page.keyboard.press('Tab'); // Focus first goal
      await expect(page.locator('[data-testid="goal-option-comprehensive-analysis"]')).toBeFocused();
      
      await page.keyboard.press('ArrowDown'); // Move to next goal
      await expect(page.locator('[data-testid="goal-option-quick-summary"]')).toBeFocused();
      
      await page.keyboard.press('Enter'); // Select goal
      await expect(page.locator('[data-testid="goal-option-quick-summary"]')).toHaveClass(/selected/);
      
      // Tab to continue button and activate
      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Continue")')).toBeFocused();
      await page.keyboard.press('Enter');
      
      // Should advance to next step
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 2');
    });

    test('has proper ARIA labels and roles', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Check wizard has proper dialog role
      await expect(page.locator('[data-testid="instrument-play-wizard"]'))
        .toHaveAttribute('role', 'dialog');
      
      // Check progress bar has proper attributes
      const progressBar = page.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toHaveAttribute('role', 'progressbar');
      await expect(progressBar).toHaveAttribute('aria-valuenow', '25');
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      
      // Check step navigation has proper labels
      await expect(page.locator('[data-testid="step-navigation"]'))
        .toHaveAttribute('aria-label', /step navigation/i);
    });

    test('announces step changes to screen readers', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Select goal and advance
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();

      // Check for screen reader announcement
      await expect(page.locator('[role="status"]'))
        .toContainText(/step 2 of 4/i);
    });
  });

  test.describe('Performance and Loading States', () => {
    test('shows appropriate loading states', async ({ page }) => {
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();

      // Progress through to analysis
      await workflowPage.selectGoal('quick-summary');
      await workflowPage.continueToNextStep();
      await workflowPage.selectAsset('1');
      await workflowPage.continueToNextStep();
      
      // Start analysis and verify loading state
      await workflowPage.startAnalysis();
      
      // Should show progress indicators
      await expect(page.locator('[data-testid="analysis-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-stage"]')).toBeVisible();
      await expect(page.locator('[data-testid="estimated-time"]')).toBeVisible();
      
      // Wait for completion
      await workflowPage.waitForAnalysisToComplete();
      
      // Loading indicators should be hidden
      await expect(page.locator('[data-testid="analysis-progress"]')).toBeHidden();
    });

    test('loads within performance budgets', async ({ page }) => {
      const startTime = Date.now();
      
      await instrumentsPage.goto();
      await instrumentsPage.waitForInstrumentsToLoad();
      
      const loadTime = Date.now() - startTime;
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Launch workflow
      const workflowStartTime = Date.now();
      await instrumentsPage.launchInstrument('board-pack-ai');
      await workflowPage.waitForWizardToLoad();
      
      const workflowLoadTime = Date.now() - workflowStartTime;
      
      // Workflow should start within 2 seconds
      expect(workflowLoadTime).toBeLessThan(2000);
    });
  });
});