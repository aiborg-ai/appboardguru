/**
 * @jest-environment jsdom
 */

/**
 * Advanced Business Workflows E2E Tests
 * 
 * Tests critical end-to-end business workflows that span multiple services,
 * domains, and complex user interactions. These tests ensure the system
 * works as a cohesive whole for high-value business processes.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Test data interface
interface E2ETestData {
  users: {
    admin: { id: string; email: string }
    director: { id: string; email: string }
    viewer: { id: string; email: string }
  }
  organization: { id: string; name: string; slug: string }
  vaults: {
    active: { id: string; name: string }
    draft: { id: string; name: string }
  }
  assets: {
    financial: { id: string; title: string }
    strategic: { id: string; title: string }
  }
}

// Page Object Models for Advanced Workflows
class DocumentProcessingWorkflowPage {
  constructor(private page: Page) {}

  async navigateToUpload() {
    await this.page.goto('/dashboard/assets/upload')
    await this.page.waitForSelector('[data-testid="upload-area"]')
  }

  async uploadDocument(filePath: string) {
    const uploadInput = this.page.locator('input[type="file"]')
    await uploadInput.setInputFiles(filePath)
    await this.page.click('[data-testid="start-upload"]')
  }

  async waitForProcessingComplete() {
    // Wait for AI processing to complete
    await this.page.waitForSelector('[data-testid="processing-complete"]', { timeout: 60000 })
    await expect(this.page.locator('[data-testid="processing-status"]')).toContainText('Ready')
  }

  async viewAIInsights() {
    await this.page.click('[data-testid="ai-insights-tab"]')
    await this.page.waitForSelector('[data-testid="ai-insights-panel"]')
  }

  async expectInsightsGenerated() {
    await expect(this.page.locator('[data-testid="document-summary"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="key-topics"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="action-items"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="sentiment-analysis"]')).toBeVisible()
  }

  async shareDocument(permissions: 'view' | 'edit' | 'admin') {
    await this.page.click('[data-testid="share-document"]')
    await this.page.selectOption('[data-testid="permission-level"]', permissions)
    await this.page.fill('[data-testid="share-email-input"]', 'colleague@company.com')
    await this.page.click('[data-testid="send-share-invitation"]')
  }

  async expectShareConfirmation() {
    await expect(this.page.locator('[data-testid="share-success-message"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="share-success-message"]')).toContainText('shared successfully')
  }

  async addAnnotation(text: string, pageNumber: number = 1) {
    await this.page.click('[data-testid="annotation-mode"]')
    await this.page.click(`[data-testid="document-page-${pageNumber}"]`)
    await this.page.fill('[data-testid="annotation-text"]', text)
    await this.page.click('[data-testid="save-annotation"]')
  }

  async expectAnnotationSaved(text: string) {
    await expect(this.page.locator('[data-testid="annotation-list"]')).toContainText(text)
  }
}

class ComplianceWorkflowPage {
  constructor(private page: Page) {}

  async navigateToCompliance() {
    await this.page.goto('/dashboard/compliance')
    await this.page.waitForSelector('[data-testid="compliance-dashboard"]')
  }

  async initiateComplianceCheck(vaultId: string) {
    await this.page.click(`[data-testid="vault-${vaultId}"]`)
    await this.page.click('[data-testid="run-compliance-check"]')
    await this.page.waitForSelector('[data-testid="compliance-check-running"]')
  }

  async waitForComplianceResults() {
    await this.page.waitForSelector('[data-testid="compliance-results"]', { timeout: 30000 })
  }

  async expectComplianceResults() {
    await expect(this.page.locator('[data-testid="compliance-score"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="compliance-violations"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="compliance-recommendations"]')).toBeVisible()
  }

  async generateAuditReport() {
    await this.page.click('[data-testid="generate-audit-report"]')
    await this.page.selectOption('[data-testid="report-format"]', 'pdf')
    await this.page.click('[data-testid="confirm-generate-report"]')
  }

  async expectReportGenerated() {
    await this.page.waitForSelector('[data-testid="report-download-link"]', { timeout: 30000 })
    await expect(this.page.locator('[data-testid="report-download-link"]')).toBeVisible()
  }

  async scheduleComplianceMonitoring() {
    await this.page.click('[data-testid="schedule-monitoring"]')
    await this.page.selectOption('[data-testid="monitoring-frequency"]', 'weekly')
    await this.page.click('[data-testid="save-monitoring-schedule"]')
  }

  async expectMonitoringScheduled() {
    await expect(this.page.locator('[data-testid="monitoring-status"]')).toContainText('Scheduled')
  }
}

class VoiceWorkflowPage {
  constructor(private page: Page) {}

  async navigateToVoiceCommands() {
    await this.page.goto('/dashboard/voice-commands')
    await this.page.waitForSelector('[data-testid="voice-commands-panel"]')
  }

  async enableVoiceFeatures() {
    await this.page.click('[data-testid="enable-voice"]')
    await this.page.context().grantPermissions(['microphone'])
    await this.page.waitForSelector('[data-testid="voice-ready"]')
  }

  async simulateVoiceCommand(command: string) {
    // In a real test, this would integrate with voice simulation
    // For now, we'll simulate by directly triggering the voice processing
    await this.page.click('[data-testid="voice-input-simulation"]')
    await this.page.fill('[data-testid="simulated-voice-input"]', command)
    await this.page.click('[data-testid="process-voice-command"]')
  }

  async expectVoiceCommandProcessed(expectedAction: string) {
    await this.page.waitForSelector('[data-testid="voice-command-result"]')
    await expect(this.page.locator('[data-testid="voice-command-result"]')).toContainText(expectedAction)
  }

  async expectBiometricVerification() {
    await expect(this.page.locator('[data-testid="biometric-verification-status"]')).toContainText('Verified')
  }
}

class AIRecommendationWorkflowPage {
  constructor(private page: Page) {}

  async navigateToAIDashboard() {
    await this.page.goto('/dashboard/ai-insights')
    await this.page.waitForSelector('[data-testid="ai-dashboard"]')
  }

  async requestBoardMateRecommendations(context: string) {
    await this.page.click('[data-testid="boardmate-recommendations"]')
    await this.page.fill('[data-testid="context-description"]', context)
    await this.page.click('[data-testid="generate-recommendations"]')
  }

  async expectRecommendationsGenerated() {
    await this.page.waitForSelector('[data-testid="recommendations-results"]', { timeout: 30000 })
    await expect(this.page.locator('[data-testid="recommended-members"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="recommendation-reasoning"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="confidence-score"]')).toBeVisible()
  }

  async acceptRecommendation(memberIndex: number = 0) {
    await this.page.click(`[data-testid="accept-recommendation-${memberIndex}"]`)
    await this.page.click('[data-testid="confirm-addition"]')
  }

  async expectMemberAdded() {
    await expect(this.page.locator('[data-testid="member-addition-success"]')).toBeVisible()
  }

  async requestMeetingInsights(vaultId: string) {
    await this.page.click('[data-testid="meeting-insights"]')
    await this.page.selectOption('[data-testid="vault-selector"]', vaultId)
    await this.page.click('[data-testid="analyze-meeting-preparation"]')
  }

  async expectMeetingInsights() {
    await this.page.waitForSelector('[data-testid="meeting-insights-results"]', { timeout: 30000 })
    await expect(this.page.locator('[data-testid="agenda-suggestions"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="preparation-checklist"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="risk-analysis"]')).toBeVisible()
  }
}

class CrossServiceIntegrationPage {
  constructor(private page: Page) {}

  async navigateToWorkflowOrchestrator() {
    await this.page.goto('/dashboard/workflows')
    await this.page.waitForSelector('[data-testid="workflow-orchestrator"]')
  }

  async createCustomWorkflow(name: string) {
    await this.page.click('[data-testid="create-workflow"]')
    await this.page.fill('[data-testid="workflow-name"]', name)
    await this.page.click('[data-testid="start-workflow-builder"]')
  }

  async addWorkflowStep(service: string, action: string) {
    await this.page.click('[data-testid="add-workflow-step"]')
    await this.page.selectOption('[data-testid="service-selector"]', service)
    await this.page.selectOption('[data-testid="action-selector"]', action)
    await this.page.click('[data-testid="confirm-add-step"]')
  }

  async executeWorkflow() {
    await this.page.click('[data-testid="execute-workflow"]')
    await this.page.waitForSelector('[data-testid="workflow-executing"]')
  }

  async expectWorkflowCompletion() {
    await this.page.waitForSelector('[data-testid="workflow-completed"]', { timeout: 60000 })
    await expect(this.page.locator('[data-testid="workflow-status"]')).toContainText('Completed')
  }

  async expectWorkflowResults() {
    await expect(this.page.locator('[data-testid="workflow-results"]')).toBeVisible()
    await expect(this.page.locator('[data-testid="steps-completed"]')).toBeVisible()
  }
}

// Test Suite
test.describe('Advanced Business Workflows', () => {
  let testData: E2ETestData
  let documentWorkflow: DocumentProcessingWorkflowPage
  let complianceWorkflow: ComplianceWorkflowPage
  let voiceWorkflow: VoiceWorkflowPage
  let aiRecommendationWorkflow: AIRecommendationWorkflowPage
  let crossServiceIntegration: CrossServiceIntegrationPage

  test.beforeAll(async () => {
    // Load test data created by global setup
    const testDataPath = path.resolve('test-results/test-data.json')
    if (fs.existsSync(testDataPath)) {
      testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'))
    } else {
      throw new Error('Test data not found. Please run global setup first.')
    }
  })

  test.beforeEach(async ({ page, context }) => {
    // Initialize page objects
    documentWorkflow = new DocumentProcessingWorkflowPage(page)
    complianceWorkflow = new ComplianceWorkflowPage(page)
    voiceWorkflow = new VoiceWorkflowPage(page)
    aiRecommendationWorkflow = new AIRecommendationWorkflowPage(page)
    crossServiceIntegration = new CrossServiceIntegrationPage(page)
  })

  test.describe('End-to-End Document Processing Workflow', () => {
    test.use({ storageState: 'test-results/auth/admin-user.json' })

    test('should complete full document lifecycle: upload → AI processing → insights → sharing → collaboration', async ({ page }) => {
      // Step 1: Upload Document
      await documentWorkflow.navigateToUpload()
      
      // Create a test file for upload simulation
      const testFilePath = path.resolve('test-results/sample-document.pdf')
      if (!fs.existsSync(testFilePath)) {
        // Create a minimal test file
        fs.writeFileSync(testFilePath, 'Test document content for E2E testing')
      }
      
      await documentWorkflow.uploadDocument(testFilePath)
      
      // Step 2: Wait for AI Processing
      await documentWorkflow.waitForProcessingComplete()
      
      // Step 3: Verify AI Insights Generated
      await documentWorkflow.viewAIInsights()
      await documentWorkflow.expectInsightsGenerated()
      
      // Step 4: Share Document
      await documentWorkflow.shareDocument('view')
      await documentWorkflow.expectShareConfirmation()
      
      // Step 5: Add Collaborative Annotation
      await documentWorkflow.addAnnotation('This section needs board review')
      await documentWorkflow.expectAnnotationSaved('This section needs board review')
    })

    test('should handle document processing errors gracefully', async ({ page }) => {
      await documentWorkflow.navigateToUpload()
      
      // Try to upload an invalid file type
      const invalidFilePath = path.resolve('test-results/invalid-file.exe')
      fs.writeFileSync(invalidFilePath, 'Invalid file content')
      
      await documentWorkflow.uploadDocument(invalidFilePath)
      
      // Should show error message for unsupported file type
      await expect(page.locator('[data-testid="upload-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="upload-error"]')).toContainText('Unsupported file type')
    })
  })

  test.describe('Advanced Compliance and Audit Workflows', () => {
    test.use({ storageState: 'test-results/auth/admin-user.json' })

    test('should complete full compliance workflow: check → analyze → report → schedule monitoring', async ({ page }) => {
      // Step 1: Navigate to Compliance Dashboard
      await complianceWorkflow.navigateToCompliance()
      
      // Step 2: Initiate Compliance Check
      await complianceWorkflow.initiateComplianceCheck(testData.vaults.active.id)
      
      // Step 3: Wait for and Verify Results
      await complianceWorkflow.waitForComplianceResults()
      await complianceWorkflow.expectComplianceResults()
      
      // Step 4: Generate Audit Report
      await complianceWorkflow.generateAuditReport()
      await complianceWorkflow.expectReportGenerated()
      
      // Step 5: Schedule Ongoing Monitoring
      await complianceWorkflow.scheduleComplianceMonitoring()
      await complianceWorkflow.expectMonitoringScheduled()
    })

    test('should handle compliance violations and remediation', async ({ page }) => {
      await complianceWorkflow.navigateToCompliance()
      
      // Simulate vault with compliance issues
      await complianceWorkflow.initiateComplianceCheck(testData.vaults.draft.id)
      await complianceWorkflow.waitForComplianceResults()
      
      // Should show violations if any exist
      const violationsExist = await page.locator('[data-testid="compliance-violations"]').count()
      if (violationsExist > 0) {
        await expect(page.locator('[data-testid="remediation-suggestions"]')).toBeVisible()
      }
    })
  })

  test.describe('Voice-to-Action Workflows', () => {
    test.use({ storageState: 'test-results/auth/director-user.json' })

    test('should process voice commands for complex business actions', async ({ page }) => {
      // Step 1: Enable Voice Features
      await voiceWorkflow.navigateToVoiceCommands()
      await voiceWorkflow.enableVoiceFeatures()
      
      // Step 2: Test Document Search Voice Command
      await voiceWorkflow.simulateVoiceCommand('Find all financial reports from Q3')
      await voiceWorkflow.expectVoiceCommandProcessed('Searching documents')
      
      // Step 3: Test Meeting Scheduling Voice Command
      await voiceWorkflow.simulateVoiceCommand('Schedule board meeting for next Tuesday at 2 PM')
      await voiceWorkflow.expectVoiceCommandProcessed('Meeting scheduled')
      
      // Step 4: Test Vault Creation Voice Command
      await voiceWorkflow.simulateVoiceCommand('Create new vault for annual review with high priority')
      await voiceWorkflow.expectVoiceCommandProcessed('Vault created')
      
      // Step 5: Verify Biometric Security
      await voiceWorkflow.expectBiometricVerification()
    })

    test('should handle voice command security and permissions', async ({ page }) => {
      await voiceWorkflow.navigateToVoiceCommands()
      await voiceWorkflow.enableVoiceFeatures()
      
      // Try a command that requires admin permissions
      await voiceWorkflow.simulateVoiceCommand('Delete organization data')
      
      // Should be rejected due to insufficient permissions
      await expect(page.locator('[data-testid="voice-permission-denied"]')).toBeVisible()
    })
  })

  test.describe('AI-Powered Recommendation and Analytics Workflows', () => {
    test.use({ storageState: 'test-results/auth/admin-user.json' })

    test('should complete AI recommendation workflow: analyze → recommend → validate → implement', async ({ page }) => {
      // Step 1: Navigate to AI Dashboard
      await aiRecommendationWorkflow.navigateToAIDashboard()
      
      // Step 2: Request BoardMate Recommendations
      await aiRecommendationWorkflow.requestBoardMateRecommendations(
        'We need expertise in ESG compliance for our upcoming board meeting'
      )
      
      // Step 3: Verify Recommendations Generated
      await aiRecommendationWorkflow.expectRecommendationsGenerated()
      
      // Step 4: Accept and Implement Recommendation
      await aiRecommendationWorkflow.acceptRecommendation(0)
      await aiRecommendationWorkflow.expectMemberAdded()
      
      // Step 5: Request Meeting Preparation Insights
      await aiRecommendationWorkflow.requestMeetingInsights(testData.vaults.active.id)
      await aiRecommendationWorkflow.expectMeetingInsights()
    })

    test('should provide contextual AI insights based on organizational data', async ({ page }) => {
      await aiRecommendationWorkflow.navigateToAIDashboard()
      
      // Request insights specific to the organization's domain
      await aiRecommendationWorkflow.requestBoardMateRecommendations(
        'Looking for board members with fintech experience for digital transformation initiative'
      )
      
      await aiRecommendationWorkflow.expectRecommendationsGenerated()
      
      // Verify recommendations are contextually relevant
      await expect(page.locator('[data-testid="recommendation-reasoning"]')).toContainText('fintech')
    })
  })

  test.describe('Cross-Service Integration Workflows', () => {
    test.use({ storageState: 'test-results/auth/admin-user.json' })

    test('should orchestrate complex multi-service workflows', async ({ page }) => {
      // Step 1: Navigate to Workflow Orchestrator
      await crossServiceIntegration.navigateToWorkflowOrchestrator()
      
      // Step 2: Create Custom Workflow
      await crossServiceIntegration.createCustomWorkflow('Board Meeting Preparation')
      
      // Step 3: Add Multiple Service Steps
      await crossServiceIntegration.addWorkflowStep('document-service', 'analyze-documents')
      await crossServiceIntegration.addWorkflowStep('compliance-service', 'check-compliance')
      await crossServiceIntegration.addWorkflowStep('notification-service', 'send-meeting-reminders')
      await crossServiceIntegration.addWorkflowStep('ai-service', 'generate-meeting-insights')
      
      // Step 4: Execute Workflow
      await crossServiceIntegration.executeWorkflow()
      
      // Step 5: Verify Completion and Results
      await crossServiceIntegration.expectWorkflowCompletion()
      await crossServiceIntegration.expectWorkflowResults()
    })

    test('should handle workflow failures and compensation', async ({ page }) => {
      await crossServiceIntegration.navigateToWorkflowOrchestrator()
      await crossServiceIntegration.createCustomWorkflow('Test Failure Handling')
      
      // Add steps that might fail
      await crossServiceIntegration.addWorkflowStep('external-service', 'failing-operation')
      await crossServiceIntegration.addWorkflowStep('cleanup-service', 'compensate-failure')
      
      await crossServiceIntegration.executeWorkflow()
      
      // Should handle failure gracefully
      await page.waitForSelector('[data-testid="workflow-error"]', { timeout: 30000 })
      await expect(page.locator('[data-testid="compensation-executed"]')).toBeVisible()
    })
  })

  test.describe('Performance and Scalability', () => {
    test.use({ storageState: 'test-results/auth/admin-user.json' })

    test('should handle high-volume concurrent operations', async ({ page, context }) => {
      // Create multiple browser contexts to simulate concurrent users
      const contexts = await Promise.all([
        context.browser()?.newContext({ storageState: 'test-results/auth/director-user.json' }),
        context.browser()?.newContext({ storageState: 'test-results/auth/viewer-user.json' })
      ].filter(Boolean))

      const pages = await Promise.all(contexts.map(ctx => ctx?.newPage()).filter(Boolean))

      // Simulate concurrent document uploads
      const uploadPromises = pages.map(async (testPage, index) => {
        const docWorkflow = new DocumentProcessingWorkflowPage(testPage!)
        await docWorkflow.navigateToUpload()
        
        const testFile = path.resolve(`test-results/concurrent-test-${index}.pdf`)
        fs.writeFileSync(testFile, `Concurrent test document ${index}`)
        
        await docWorkflow.uploadDocument(testFile)
        return docWorkflow.waitForProcessingComplete()
      })

      // All uploads should complete successfully
      await Promise.all(uploadPromises)

      // Cleanup
      await Promise.all(contexts.map(ctx => ctx?.close()))
    })

    test('should maintain performance under load', async ({ page }) => {
      const startTime = Date.now()
      
      // Perform multiple operations in sequence
      await documentWorkflow.navigateToUpload()
      await complianceWorkflow.navigateToCompliance()
      await aiRecommendationWorkflow.navigateToAIDashboard()
      await crossServiceIntegration.navigateToWorkflowOrchestrator()
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should complete all navigation operations within reasonable time
      expect(totalTime).toBeLessThan(10000) // 10 seconds max
    })
  })

  test.describe('Security and Data Protection', () => {
    test('should enforce role-based access across workflows', async ({ page, context }) => {
      // Test with viewer role (limited permissions)
      await context.clearCookies()
      await context.addInitScript(() => {
        localStorage.clear()
      })
      
      // Use viewer authentication
      const viewerContext = await context.browser()?.newContext({ 
        storageState: 'test-results/auth/viewer-user.json' 
      })
      
      if (viewerContext) {
        const viewerPage = await viewerContext.newPage()
        const restrictedWorkflow = new ComplianceWorkflowPage(viewerPage)
        
        await restrictedWorkflow.navigateToCompliance()
        
        // Should not be able to run compliance checks
        await expect(viewerPage.locator('[data-testid="run-compliance-check"]')).not.toBeVisible()
        
        await viewerContext.close()
      }
    })

    test('should protect sensitive data in cross-service operations', async ({ page }) => {
      await crossServiceIntegration.navigateToWorkflowOrchestrator()
      await crossServiceIntegration.createCustomWorkflow('Data Protection Test')
      
      // Verify sensitive data is not exposed in workflow logs
      await expect(page.locator('[data-testid="workflow-logs"]')).not.toContainText('password')
      await expect(page.locator('[data-testid="workflow-logs"]')).not.toContainText('token')
      await expect(page.locator('[data-testid="workflow-logs"]')).not.toContainText('secret')
    })
  })
})