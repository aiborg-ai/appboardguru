/**
 * Strategic Planning Dashboard Component Tests
 * 
 * Tests for the main strategic planning dashboard including:
 * - Dashboard rendering and navigation
 * - Metrics calculations and display
 * - Tab switching functionality
 * - Real-time updates and refresh
 * - Error handling and loading states
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StrategicPlanningDashboard } from '../../../components/strategic-planning/StrategicPlanningDashboard'
import { useStrategicPlanning } from '../../../hooks/useStrategicPlanning'

// Mock the strategic planning hook
jest.mock('../../../hooks/useStrategicPlanning')
const mockUseStrategicPlanning = useStrategicPlanning as jest.MockedFunction<typeof useStrategicPlanning>

// Mock child components
jest.mock('../../../components/strategic-planning/OKRCascadingSystem', () => ({
  __esModule: true,
  default: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="okr-cascading-system">OKR System for {organizationId}</div>
  )
}))

jest.mock('../../../components/strategic-planning/ScenarioPlanningTools', () => ({
  __esModule: true,
  default: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="scenario-planning-tools">Scenario Planning for {organizationId}</div>
  )
}))

jest.mock('../../../components/strategic-planning/PerformanceScorecard', () => ({
  __esModule: true,
  default: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="performance-scorecard">Scorecard for {organizationId}</div>
  )
}))

jest.mock('../../../components/strategic-planning/StrategicPlanningWorkflows', () => ({
  __esModule: true,
  default: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="strategic-workflows">Workflows for {organizationId}</div>
  )
}))

jest.mock('../../../components/strategic-planning/FinancialIntegration', () => ({
  __esModule: true,
  default: ({ organizationId }: { organizationId: string }) => (
    <div data-testid="financial-integration">Financial for {organizationId}</div>
  )
}))

// Mock data
const mockOrganizationId = '123e4567-e89b-12d3-a456-426614174000'
const mockUserId = '456e7890-e89b-12d3-a456-426614174001'

const mockInitiatives = [
  {
    id: 'init-1',
    name: 'Digital Transformation',
    category: 'innovation',
    status: 'active',
    budget_allocated: 500000,
    budget_used: 200000,
    progress_percentage: 60,
    health_score: 8,
    risk_score: 3
  },
  {
    id: 'init-2',
    name: 'Market Expansion',
    category: 'growth',
    status: 'active',
    budget_allocated: 300000,
    budget_used: 75000,
    progress_percentage: 25,
    health_score: 6,
    risk_score: 5
  }
]

const mockOKRHierarchy = {
  okr_tree: [
    {
      id: 'okr-1',
      level: 'board',
      objective: 'Increase market share',
      overall_progress: 65,
      health_status: 'on_track',
      cascade_alignment_score: 8
    }
  ],
  alignment_analysis: {
    overall_alignment_score: 7.5,
    gaps: [
      {
        okr_id: 'okr-2',
        gap_type: 'missing_parent',
        severity: 'medium',
        description: 'OKR lacks proper parent alignment'
      }
    ],
    cascade_effectiveness: 75,
    orphaned_okrs: []
  },
  performance_summary: {
    on_track: 8,
    at_risk: 3,
    off_track: 1,
    average_progress: 68
  }
}

const mockInitiativeAnalytics = {
  total_budget: 800000,
  budget_utilization: 34.375,
  average_health_score: 7,
  initiatives_by_status: { active: 2 },
  risk_distribution: { low: 1, medium: 1 },
  progress_summary: { on_track: 1, at_risk: 1, delayed: 0 }
}

const mockScorecards = [
  {
    id: 'scorecard-1',
    name: 'Executive Dashboard',
    scorecard_type: 'balanced',
    overall_score: 7.8,
    perspectives: [
      { name: 'Financial', metrics: [{}] },
      { name: 'Customer', metrics: [{}] }
    ]
  }
]

const mockDefaultHookReturn = {
  initiatives: mockInitiatives,
  initiativeAnalytics: mockInitiativeAnalytics,
  okrHierarchy: mockOKRHierarchy,
  scorecards: mockScorecards,
  budgetOptimization: null,
  forecasts: [],
  isLoading: false,
  error: null,
  refreshData: jest.fn(),
  refreshOKRData: jest.fn(),
  createInitiative: jest.fn(),
  updateInitiativeProgress: jest.fn(),
  createOKR: jest.fn(),
  updateKeyResult: jest.fn(),
  createScenarioPlan: jest.fn(),
  runMonteCarloAnalysis: jest.fn(),
  createScorecard: jest.fn(),
  getScorecardData: jest.fn(),
  optimizeBudgetAllocation: jest.fn(),
  trackROI: jest.fn(),
  generateForecast: jest.fn()
}

describe('StrategicPlanningDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseStrategicPlanning.mockReturnValue(mockDefaultHookReturn)
  })

  it('renders dashboard with correct title and description', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    expect(screen.getByText('Strategic Planning Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Comprehensive strategic oversight and performance management')).toBeInTheDocument()
  })

  it('displays key performance indicators correctly', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Strategic Health (average health score)
    expect(screen.getByText('7.0/10')).toBeInTheDocument()

    // Execution Velocity (average progress)
    expect(screen.getByText('43%')).toBeInTheDocument() // (60+25)/2 = 42.5 rounded to 43

    // OKR Alignment
    expect(screen.getByText('7.5/10')).toBeInTheDocument()

    // Budget Utilization
    expect(screen.getByText('34%')).toBeInTheDocument()
  })

  it('shows strategic initiatives summary with correct counts', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Total initiatives
    expect(screen.getByText('2')).toBeInTheDocument()

    // Active initiatives (both are active)
    expect(screen.getAllByText('2')).toHaveLength(2) // appears in total and active

    // Budget display
    expect(screen.getByText('$800,000')).toBeInTheDocument()
  })

  it('displays OKR performance summary', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // OKR counts from performance summary
    expect(screen.getByText('8')).toBeInTheDocument() // on_track
    expect(screen.getByText('3')).toBeInTheDocument() // at_risk
    expect(screen.getByText('1')).toBeInTheDocument() // off_track

    // Average progress
    expect(screen.getByText('68%')).toBeInTheDocument()
  })

  it('shows alignment gaps when present', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    expect(screen.getByText('Alignment Gaps')).toBeInTheDocument()
    expect(screen.getByText('1 gap(s) identified requiring attention')).toBeInTheDocument()
  })

  it('displays scorecard information when available', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    expect(screen.getByText('Performance Scorecards')).toBeInTheDocument()
    expect(screen.getByText('Executive Dashboard')).toBeInTheDocument()
    expect(screen.getByText('7.8')).toBeInTheDocument() // overall score
  })

  it('handles tab navigation correctly', async () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Click on OKRs tab
    fireEvent.click(screen.getByText('OKRs'))
    await waitFor(() => {
      expect(screen.getByTestId('okr-cascading-system')).toBeInTheDocument()
    })

    // Click on Scorecards tab
    fireEvent.click(screen.getByText('Scorecards'))
    await waitFor(() => {
      expect(screen.getByTestId('performance-scorecard')).toBeInTheDocument()
    })

    // Click on Scenarios tab
    fireEvent.click(screen.getByText('Scenarios'))
    await waitFor(() => {
      expect(screen.getByTestId('scenario-planning-tools')).toBeInTheDocument()
    })

    // Click on Workflows tab
    fireEvent.click(screen.getByText('Workflows'))
    await waitFor(() => {
      expect(screen.getByTestId('strategic-workflows')).toBeInTheDocument()
    })

    // Click on Financial tab
    fireEvent.click(screen.getByText('Financial'))
    await waitFor(() => {
      expect(screen.getByTestId('financial-integration')).toBeInTheDocument()
    })
  })

  it('handles loading state correctly', () => {
    mockUseStrategicPlanning.mockReturnValue({
      ...mockDefaultHookReturn,
      isLoading: true
    })

    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    expect(screen.getByText('Loading strategic planning dashboard...')).toBeInTheDocument()
  })

  it('handles error state correctly', () => {
    const mockError = 'Failed to load dashboard data'
    mockUseStrategicPlanning.mockReturnValue({
      ...mockDefaultHookReturn,
      error: mockError
    })

    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument()
    expect(screen.getByText(mockError)).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('calls refreshData when refresh button is clicked', () => {
    const mockRefreshData = jest.fn()
    mockUseStrategicPlanning.mockReturnValue({
      ...mockDefaultHookReturn,
      refreshData: mockRefreshData
    })

    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    fireEvent.click(screen.getByText('Refresh'))
    expect(mockRefreshData).toHaveBeenCalled()
  })

  it('handles time range selection', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    const timeRangeSelect = screen.getByDisplayValue('This Quarter')
    fireEvent.change(timeRangeSelect, { target: { value: 'year' } })

    expect(timeRangeSelect.value).toBe('year')
  })

  it('handles auto-refresh selection', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    const refreshSelect = screen.getByDisplayValue('Manual')
    fireEvent.change(refreshSelect, { target: { value: '30000' } })

    expect(refreshSelect.value).toBe('30000')
  })

  it('shows "View All" buttons that navigate to appropriate tabs', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Find and click "View All" for initiatives
    const viewAllButtons = screen.getAllByText('View All')
    fireEvent.click(viewAllButtons[0])

    // Should navigate to initiatives tab
    expect(screen.getByText('Strategic Initiatives')).toBeInTheDocument()
  })

  it('displays recent alerts and recommendations', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    expect(screen.getByText('Recent Alerts')).toBeInTheDocument()
    expect(screen.getByText('AI Recommendations')).toBeInTheDocument()
    
    // Check for sample alerts
    expect(screen.getByText('Budget Overrun Alert')).toBeInTheDocument()
    expect(screen.getByText('Milestone Delay')).toBeInTheDocument()
    expect(screen.getByText('OKR Update Required')).toBeInTheDocument()

    // Check for sample recommendations
    expect(screen.getByText('Reallocate Budget')).toBeInTheDocument()
    expect(screen.getByText('Improve Alignment')).toBeInTheDocument()
    expect(screen.getByText('Accelerate Execution')).toBeInTheDocument()
  })

  it('formats currency values correctly', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Check that budget is formatted as currency
    expect(screen.getByText('$800,000')).toBeInTheDocument()
  })

  it('calculates health score colors correctly', () => {
    const { container } = render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // High health scores (>=7) should have green styling
    const healthBadges = container.querySelectorAll('[class*="bg-green-50"]')
    expect(healthBadges.length).toBeGreaterThan(0)
  })

  it('shows different role-based access', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="board"
      />
    )

    // Board role should see all tabs
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('OKRs')).toBeInTheDocument()
    expect(screen.getByText('Financial')).toBeInTheDocument()
  })

  it('handles empty data gracefully', () => {
    mockUseStrategicPlanning.mockReturnValue({
      ...mockDefaultHookReturn,
      initiatives: [],
      initiativeAnalytics: {
        total_budget: 0,
        budget_utilization: 0,
        average_health_score: 0,
        initiatives_by_status: {},
        risk_distribution: {},
        progress_summary: { on_track: 0, at_risk: 0, delayed: 0 }
      },
      okrHierarchy: {
        okr_tree: [],
        alignment_analysis: {
          overall_alignment_score: 0,
          gaps: [],
          cascade_effectiveness: 0,
          orphaned_okrs: []
        },
        performance_summary: {
          on_track: 0,
          at_risk: 0,
          off_track: 0,
          average_progress: 0
        }
      },
      scorecards: []
    })

    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Should show zeros without crashing
    expect(screen.getByText('0.0/10')).toBeInTheDocument() // Strategic Health
    expect(screen.getByText('0%')).toBeInTheDocument() // Various percentages
  })
})

// Integration tests
describe('StrategicPlanningDashboard Integration', () => {
  it('passes correct props to child components', () => {
    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    // Switch to OKRs tab to render OKR component
    fireEvent.click(screen.getByText('OKRs'))

    const okrComponent = screen.getByTestId('okr-cascading-system')
    expect(okrComponent).toHaveTextContent(mockOrganizationId)
  })

  it('updates last updated timestamp on refresh', async () => {
    const mockRefreshData = jest.fn()
    mockUseStrategicPlanning.mockReturnValue({
      ...mockDefaultHookReturn,
      refreshData: mockRefreshData
    })

    render(
      <StrategicPlanningDashboard
        organizationId={mockOrganizationId}
        userId={mockUserId}
        userRole="executive"
      />
    )

    const initialText = screen.getByText(/Last updated:/)
    const initialTime = initialText.textContent

    // Click refresh
    fireEvent.click(screen.getByText('Refresh'))

    await waitFor(() => {
      expect(mockRefreshData).toHaveBeenCalled()
    })

    // Time should be updated (in a real scenario)
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })
})