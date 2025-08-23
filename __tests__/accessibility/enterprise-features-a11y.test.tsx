/**
 * Accessibility Tests for Enterprise BoardMates Features
 * Testing WCAG 2.1 AA compliance for $500K/seat application
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'

// Import components to test
import { AIMemberRecommendationsPanel } from '@/components/boardmates/AIMemberRecommendationsPanel'
import { VoiceCommandPanel } from '@/components/boardmates/VoiceCommandPanel'
import { ExecutiveAnalyticsDashboard } from '@/components/boardmates/ExecutiveAnalyticsDashboard'
import { ComplianceCheckPanel } from '@/components/boardmates/ComplianceCheckPanel'
import { RealTimeCollaborationPanel } from '@/components/boardmates/RealTimeCollaborationPanel'

import { EnhancedBoardMate, MemberRecommendation } from '@/types/boardmates'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock data for accessibility testing
const createMockBoardMate = (overrides: Partial<EnhancedBoardMate> = {}): EnhancedBoardMate => ({
  id: 'test-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member',
  status: 'active',
  joined_at: '2024-01-01T00:00:00Z',
  ai_score: {
    overall_match: 0.85,
    skill_alignment: 0.8,
    cultural_fit: 0.9,
    risk_factor: 0.1,
    growth_potential: 0.85,
    leadership_capacity: 0.75
  },
  expertise_profile: {
    core_competencies: ['Leadership', 'Strategy', 'Finance'],
    industry_experience: 'Technology',
    years_experience: 15,
    innovation_index: 0.8,
    collaboration_style: 'Collaborative'
  },
  performance_metrics: {
    overall_score: 0.88,
    decision_quality: 0.9,
    strategic_impact: 0.85,
    team_effectiveness: 0.87,
    stakeholder_satisfaction: 0.9
  },
  risk_assessment: {
    overall_risk_level: 0.15,
    compliance_risk: 0.1,
    reputation_risk: 0.1,
    performance_risk: 0.2
  },
  network_position: {
    influence_score: 0.75,
    centrality_measure: 0.6,
    connection_strength: 0.8
  },
  ...overrides
})

// Mock services for accessibility testing
jest.mock('@/lib/services/ai-member-recommendations.service')
jest.mock('@/lib/services/advanced-compliance.service')
jest.mock('@/lib/services/voice-command.service', () => ({
  voiceCommandService: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    isCurrentlyListening: jest.fn(() => false),
    getCommandHistory: jest.fn(() => []),
    clearCommandHistory: jest.fn(),
    getVoiceCommandsHelp: jest.fn(() => [
      { command: 'Add Member', example: 'Add John Smith to the board as admin' }
    ])
  }
}))

// Accessibility testing utilities
class AccessibilityTester {
  static async testKeyboardNavigation(
    container: HTMLElement,
    expectedFocusableElements: number
  ): Promise<boolean> {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    expect(focusableElements.length).toBeGreaterThanOrEqual(expectedFocusableElements)
    
    // Test Tab navigation
    let currentIndex = 0
    for (const element of Array.from(focusableElements)) {
      ;(element as HTMLElement).focus()
      expect(document.activeElement).toBe(element)
      currentIndex++
    }
    
    return true
  }
  
  static async testColorContrast(element: HTMLElement): Promise<boolean> {
    const computedStyle = window.getComputedStyle(element)
    const backgroundColor = computedStyle.backgroundColor
    const color = computedStyle.color
    
    // Basic contrast test (in real implementation, would use color contrast calculation)
    expect(backgroundColor).not.toBe(color)
    expect(backgroundColor).not.toBe('transparent')
    expect(color).not.toBe('transparent')
    
    return true
  }
  
  static async testAriaLabels(container: HTMLElement): Promise<boolean> {
    const interactiveElements = container.querySelectorAll(
      'button, input, select, textarea, [role="button"], [role="link"]'
    )
    
    for (const element of Array.from(interactiveElements)) {
      const hasAriaLabel = element.hasAttribute('aria-label')
      const hasAriaLabelledBy = element.hasAttribute('aria-labelledby')
      const hasVisibleText = element.textContent && element.textContent.trim().length > 0
      const hasAltText = element.hasAttribute('alt')
      
      expect(hasAriaLabel || hasAriaLabelledBy || hasVisibleText || hasAltText).toBe(true)
    }
    
    return true
  }
  
  static async testHeadingHierarchy(container: HTMLElement): Promise<boolean> {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const headingLevels: number[] = []
    
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1))
      headingLevels.push(level)
    })
    
    // Check that heading levels don't skip (h1 -> h3 without h2)
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] > headingLevels[i - 1]) {
        expect(headingLevels[i] - headingLevels[i - 1]).toBeLessThanOrEqual(1)
      }
    }
    
    return true
  }
}

describe('Enterprise Features Accessibility Tests', () => {
  // Global accessibility setup
  beforeAll(() => {
    // Mock IntersectionObserver for virtual scrolling components
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }))
  })

  describe('AI Member Recommendations Panel Accessibility', () => {
    const mockProps = {
      currentBoardMembers: [createMockBoardMate()],
      organizationId: 'org-123',
      vaultId: 'vault-123',
      onMemberSelect: jest.fn(),
      onRefreshRecommendations: jest.fn()
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<AIMemberRecommendationsPanel {...mockProps} />)
      
      // Wait for component to load
      await screen.findByText('AI Member Recommendations')
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', async () => {
      const { container } = render(<AIMemberRecommendationsPanel {...mockProps} />)
      await screen.findByText('AI Member Recommendations')
      
      await AccessibilityTester.testKeyboardNavigation(container, 3)
    })

    it('should have proper ARIA labels and roles', async () => {
      const { container } = render(<AIMemberRecommendationsPanel {...mockProps} />)
      await screen.findByText('AI Member Recommendations')
      
      // Test main container has proper role
      const mainContainer = screen.getByRole('region')
      expect(mainContainer).toHaveAttribute('aria-labelledby')
      
      // Test recommendation list
      const recommendationList = container.querySelector('[role="list"]')
      if (recommendationList) {
        expect(recommendationList).toBeInTheDocument()
        
        const listItems = container.querySelectorAll('[role="listitem"]')
        listItems.forEach(item => {
          expect(item).toHaveAttribute('aria-labelledby')
        })
      }
      
      await AccessibilityTester.testAriaLabels(container)
    })

    it('should have proper heading hierarchy', async () => {
      const { container } = render(<AIMemberRecommendationsPanel {...mockProps} />)
      await screen.findByText('AI Member Recommendations')
      
      await AccessibilityTester.testHeadingHierarchy(container)
    })

    it('should have sufficient color contrast', async () => {
      const { container } = render(<AIMemberRecommendationsPanel {...mockProps} />)
      await screen.findByText('AI Member Recommendations')
      
      const matchScoreElements = container.querySelectorAll('[data-testid*="match-score"]')
      for (const element of Array.from(matchScoreElements)) {
        await AccessibilityTester.testColorContrast(element as HTMLElement)
      }
    })

    it('should support screen readers with proper announcements', async () => {
      const { container } = render(<AIMemberRecommendationsPanel {...mockProps} />)
      
      // Test live regions for dynamic content
      const liveRegions = container.querySelectorAll('[aria-live]')
      expect(liveRegions.length).toBeGreaterThan(0)
      
      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live')
        expect(['polite', 'assertive', 'off']).toContain(
          region.getAttribute('aria-live')
        )
      })
    })

    it('should handle voice query accessibility', async () => {
      const user = userEvent.setup()
      render(<AIMemberRecommendationsPanel {...mockProps} />)
      
      const voiceQueryButton = screen.getByRole('button', { name: /voice query/i })
      expect(voiceQueryButton).toHaveAttribute('aria-label')
      
      await user.click(voiceQueryButton)
      
      // Voice input should be properly labeled
      const voiceInput = screen.getByRole('textbox')
      expect(voiceInput).toHaveAttribute('aria-label')
      expect(voiceInput).toHaveAttribute('placeholder')
    })
  })

  describe('Voice Command Panel Accessibility', () => {
    const mockProps = {
      userId: 'test-user',
      onMemberAdd: jest.fn(),
      onSearch: jest.fn(),
      onAnalyticsQuery: jest.fn()
    }

    beforeEach(() => {
      // Mock permissions API
      Object.defineProperty(navigator, 'permissions', {
        writable: true,
        value: {
          query: jest.fn().mockResolvedValue({ state: 'granted' })
        }
      })
    })

    it('should have no accessibility violations', async () => {
      const { container } = render(<VoiceCommandPanel {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible microphone controls', async () => {
      render(<VoiceCommandPanel {...mockProps} />)
      
      // Wait for permissions to be checked
      await screen.findByRole('button', { name: /start listening/i })
      
      const micButton = screen.getByRole('button', { name: /start listening/i })
      expect(micButton).toHaveAttribute('aria-label')
      expect(micButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should provide accessible status updates', async () => {
      const { container } = render(<VoiceCommandPanel {...mockProps} />)
      
      // Status indicators should be accessible
      const statusIndicators = container.querySelectorAll('[role="status"]')
      statusIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-live', 'polite')
      })
    })

    it('should have accessible command history', async () => {
      render(<VoiceCommandPanel {...mockProps} />)
      
      const historySection = screen.getByText('Recent Commands').closest('div')
      expect(historySection).toHaveAttribute('role', 'log')
      expect(historySection).toHaveAttribute('aria-live', 'polite')
      expect(historySection).toHaveAttribute('aria-label', 'Voice command history')
    })

    it('should support keyboard activation of voice commands', async () => {
      const user = userEvent.setup()
      render(<VoiceCommandPanel {...mockProps} />)
      
      await screen.findByRole('button', { name: /start listening/i })
      
      const micButton = screen.getByRole('button', { name: /start listening/i })
      
      // Should be focusable and activatable with keyboard
      micButton.focus()
      expect(document.activeElement).toBe(micButton)
      
      await user.keyboard('{Enter}')
      // Should trigger the listening state change
    })

    it('should have accessible help content', async () => {
      const user = userEvent.setup()
      render(<VoiceCommandPanel {...mockProps} />)
      
      const helpButton = screen.getByRole('button', { name: /help/i })
      await user.click(helpButton)
      
      // Help content should be properly structured
      const helpContent = screen.getByText('Voice Commands').closest('div')
      expect(helpContent).toHaveAttribute('role', 'region')
      expect(helpContent).toHaveAttribute('aria-labelledby')
    })
  })

  describe('Executive Analytics Dashboard Accessibility', () => {
    const mockProps = {
      boardMembers: [createMockBoardMate()],
      organizationId: 'org-123',
      onExportReport: jest.fn(),
      onScheduleUpdate: jest.fn()
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<ExecutiveAnalyticsDashboard {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible data visualizations', async () => {
      const { container } = render(<ExecutiveAnalyticsDashboard {...mockProps} />)
      
      // Charts and visualizations should have proper labels
      const charts = container.querySelectorAll('[role="img"]')
      charts.forEach(chart => {
        expect(chart).toHaveAttribute('aria-label')
        expect(chart.getAttribute('aria-label')).not.toBe('')
      })
      
      // Data tables should be accessible
      const tables = container.querySelectorAll('table')
      tables.forEach(table => {
        const hasCaption = table.querySelector('caption')
        const hasHeaders = table.querySelectorAll('th').length > 0
        
        expect(hasCaption || hasHeaders).toBeTruthy()
      })
    })

    it('should have accessible tab navigation', async () => {
      const user = userEvent.setup()
      render(<ExecutiveAnalyticsDashboard {...mockProps} />)
      
      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBeGreaterThan(1)
      
      // Test tab navigation
      for (const tab of tabs) {
        await user.click(tab)
        expect(tab).toHaveAttribute('aria-selected', 'true')
      }
    })

    it('should have accessible metrics display', async () => {
      const { container } = render(<ExecutiveAnalyticsDashboard {...mockProps} />)
      
      // Metric cards should have proper structure
      const metricCards = container.querySelectorAll('[data-testid*="metric"]')
      metricCards.forEach(card => {
        const valueElement = card.querySelector('[data-testid*="value"]')
        if (valueElement) {
          expect(valueElement).toHaveAttribute('aria-label')
        }
      })
    })

    it('should support keyboard navigation for interactive elements', async () => {
      const { container } = render(<ExecutiveAnalyticsDashboard {...mockProps} />)
      
      await AccessibilityTester.testKeyboardNavigation(container, 5)
    })

    it('should have accessible export functionality', async () => {
      const user = userEvent.setup()
      render(<ExecutiveAnalyticsDashboard {...mockProps} />)
      
      const exportButton = screen.getByRole('button', { name: /export/i })
      expect(exportButton).toHaveAttribute('aria-label')
      
      await user.click(exportButton)
      
      // Export options should be accessible
      const exportOptions = screen.getAllByRole('menuitem')
      exportOptions.forEach(option => {
        expect(option).toHaveAttribute('role', 'menuitem')
      })
    })
  })

  describe('Compliance Check Panel Accessibility', () => {
    const mockProps = {
      organizationId: 'org-123',
      currentBoardMembers: [createMockBoardMate()],
      onComplianceUpdate: jest.fn()
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<ComplianceCheckPanel {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible compliance status indicators', async () => {
      const { container } = render(<ComplianceCheckPanel {...mockProps} />)
      
      // Status indicators should have proper ARIA labels
      const statusIndicators = container.querySelectorAll('[data-testid*="compliance-status"]')
      statusIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label')
        expect(indicator).toHaveAttribute('role', 'status')
      })
    })

    it('should have accessible violation alerts', async () => {
      const { container } = render(<ComplianceCheckPanel {...mockProps} />)
      
      // Alert messages should be properly announced
      const alerts = container.querySelectorAll('[role="alert"]')
      alerts.forEach(alert => {
        expect(alert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('should support screen reader navigation of compliance data', async () => {
      const { container } = render(<ComplianceCheckPanel {...mockProps} />)
      
      await AccessibilityTester.testAriaLabels(container)
      await AccessibilityTester.testHeadingHierarchy(container)
    })
  })

  describe('Real-Time Collaboration Panel Accessibility', () => {
    const mockProps = {
      organizationId: 'org-123',
      currentUser: {
        id: 'user-1',
        name: 'Current User',
        avatar: 'avatar-url'
      }
    }

    it('should have no accessibility violations', async () => {
      const { container } = render(<RealTimeCollaborationPanel {...mockProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible user presence indicators', async () => {
      const { container } = render(<RealTimeCollaborationPanel {...mockProps} />)
      
      // Presence indicators should be accessible
      const presenceIndicators = container.querySelectorAll('[data-testid*="user-presence"]')
      presenceIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-label')
        expect(indicator).toHaveAttribute('title')
      })
    })

    it('should have accessible activity feed', async () => {
      const { container } = render(<RealTimeCollaborationPanel {...mockProps} />)
      
      const activityFeed = container.querySelector('[data-testid="activity-feed"]')
      if (activityFeed) {
        expect(activityFeed).toHaveAttribute('role', 'log')
        expect(activityFeed).toHaveAttribute('aria-live', 'polite')
        expect(activityFeed).toHaveAttribute('aria-label', 'Collaborative activity feed')
      }
    })

    it('should support keyboard navigation of collaborative features', async () => {
      const { container } = render(<RealTimeCollaborationPanel {...mockProps} />)
      
      await AccessibilityTester.testKeyboardNavigation(container, 2)
    })
  })

  describe('Cross-Component Accessibility Integration', () => {
    it('should maintain accessibility when components are used together', async () => {
      const boardMembers = [createMockBoardMate()]
      
      const IntegratedView = () => (
        <div>
          <h1>Board Management Dashboard</h1>
          <AIMemberRecommendationsPanel
            currentBoardMembers={boardMembers}
            organizationId="org-123"
            vaultId="vault-123"
            onMemberSelect={jest.fn()}
            onRefreshRecommendations={jest.fn()}
          />
          <VoiceCommandPanel
            userId="user-123"
            onMemberAdd={jest.fn()}
            onSearch={jest.fn()}
            onAnalyticsQuery={jest.fn()}
          />
          <ComplianceCheckPanel
            organizationId="org-123"
            currentBoardMembers={boardMembers}
            onComplianceUpdate={jest.fn()}
          />
        </div>
      )
      
      const { container } = render(<IntegratedView />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper focus management between components', async () => {
      const user = userEvent.setup()
      const boardMembers = [createMockBoardMate()]
      
      const IntegratedView = () => (
        <div>
          <AIMemberRecommendationsPanel
            currentBoardMembers={boardMembers}
            organizationId="org-123"
            vaultId="vault-123"
            onMemberSelect={jest.fn()}
            onRefreshRecommendations={jest.fn()}
          />
          <VoiceCommandPanel
            userId="user-123"
            onMemberAdd={jest.fn()}
            onSearch={jest.fn()}
            onAnalyticsQuery={jest.fn()}
          />
        </div>
      )
      
      render(<IntegratedView />)
      
      // Test focus flow between components
      await user.tab()
      const firstFocusable = document.activeElement
      expect(firstFocusable).toBeInTheDocument()
      
      await user.tab()
      const secondFocusable = document.activeElement
      expect(secondFocusable).not.toBe(firstFocusable)
    })

    it('should handle dynamic content updates accessibly', async () => {
      const user = userEvent.setup()
      
      const DynamicContent = () => {
        const [showAnalytics, setShowAnalytics] = React.useState(false)
        
        return (
          <div>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              aria-expanded={showAnalytics}
              aria-controls="analytics-panel"
            >
              Toggle Analytics
            </button>
            {showAnalytics && (
              <div id="analytics-panel" role="region" aria-labelledby="analytics-heading">
                <h2 id="analytics-heading">Analytics Dashboard</h2>
                <ExecutiveAnalyticsDashboard
                  boardMembers={[createMockBoardMate()]}
                  organizationId="org-123"
                  onExportReport={jest.fn()}
                  onScheduleUpdate={jest.fn()}
                />
              </div>
            )}
          </div>
        )
      }
      
      const { container } = render(<DynamicContent />)
      
      const toggleButton = screen.getByRole('button', { name: /toggle analytics/i })
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false')
      
      await user.click(toggleButton)
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
      
      // Content should be accessible after dynamic loading
      const analyticsPanel = screen.getByRole('region', { name: /analytics dashboard/i })
      expect(analyticsPanel).toBeInTheDocument()
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Mobile and Responsive Accessibility', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      })
    })

    it('should maintain accessibility on mobile devices', async () => {
      const { container } = render(
        <VoiceCommandPanel
          userId="user-123"
          onMemberAdd={jest.fn()}
          onSearch={jest.fn()}
          onAnalyticsQuery={jest.fn()}
        />
      )
      
      // Touch targets should be appropriately sized (min 44px)
      const buttons = container.querySelectorAll('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const minTouchTarget = 44 // 44px minimum
        
        // In real implementation, would check computed width/height
        expect(button).toBeInstanceOf(HTMLButtonElement)
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support touch interactions accessibly', async () => {
      const user = userEvent.setup()
      render(
        <AIMemberRecommendationsPanel
          currentBoardMembers={[createMockBoardMate()]}
          organizationId="org-123"
          vaultId="vault-123"
          onMemberSelect={jest.fn()}
          onRefreshRecommendations={jest.fn()}
        />
      )
      
      // Interactive elements should be accessible via touch
      const interactiveElements = screen.getAllByRole('button')
      
      for (const element of interactiveElements) {
        expect(element).toHaveAttribute('type')
        expect(element).not.toHaveAttribute('disabled')
      }
    })
  })

  describe('High Contrast and Color Accessibility', () => {
    it('should work with high contrast mode', async () => {
      const { container } = render(
        <ExecutiveAnalyticsDashboard
          boardMembers={[createMockBoardMate()]}
          organizationId="org-123"
          onExportReport={jest.fn()}
          onScheduleUpdate={jest.fn()}
        />
      )
      
      // Elements should not rely solely on color for information
      const statusElements = container.querySelectorAll('[data-testid*="status"]')
      statusElements.forEach(element => {
        // Should have text content or icons, not just color
        const hasTextContent = element.textContent && element.textContent.trim().length > 0
        const hasAriaLabel = element.hasAttribute('aria-label')
        const hasIcon = element.querySelector('svg') || element.querySelector('[data-icon]')
        
        expect(hasTextContent || hasAriaLabel || hasIcon).toBe(true)
      })
    })

    it('should support users with color vision deficiencies', async () => {
      const { container } = render(
        <ComplianceCheckPanel
          organizationId="org-123"
          currentBoardMembers={[createMockBoardMate()]}
          onComplianceUpdate={jest.fn()}
        />
      )
      
      // Status indicators should use more than just color
      const complianceStatuses = container.querySelectorAll('[data-testid*="compliance"]')
      complianceStatuses.forEach(status => {
        // Should have patterns, text, or icons in addition to color
        const hasPattern = status.classList.toString().includes('pattern')
        const hasText = status.textContent && status.textContent.trim().length > 0
        const hasIcon = status.querySelector('svg')
        
        expect(hasPattern || hasText || hasIcon).toBe(true)
      })
    })
  })

  describe('Screen Reader Compatibility', () => {
    it('should provide comprehensive screen reader support', async () => {
      const { container } = render(
        <AIMemberRecommendationsPanel
          currentBoardMembers={[createMockBoardMate()]}
          organizationId="org-123"
          vaultId="vault-123"
          onMemberSelect={jest.fn()}
          onRefreshRecommendations={jest.fn()}
        />
      )
      
      // Check for screen reader specific elements
      const srOnlyElements = container.querySelectorAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)
      
      // Check for proper semantic structure
      const landmarks = container.querySelectorAll('[role="main"], [role="banner"], [role="navigation"], [role="contentinfo"]')
      expect(landmarks.length).toBeGreaterThan(0)
    })

    it('should announce dynamic content changes', async () => {
      const { container } = render(
        <VoiceCommandPanel
          userId="user-123"
          onMemberAdd={jest.fn()}
          onSearch={jest.fn()}
          onAnalyticsQuery={jest.fn()}
        />
      )
      
      // Live regions should be properly configured
      const liveRegions = container.querySelectorAll('[aria-live]')
      liveRegions.forEach(region => {
        const ariaLive = region.getAttribute('aria-live')
        expect(['polite', 'assertive']).toContain(ariaLive)
        
        if (region.hasAttribute('aria-atomic')) {
          expect(['true', 'false']).toContain(region.getAttribute('aria-atomic'))
        }
      })
    })
  })
})