/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import OrganizationDetailPage from '@/app/dashboard/organizations/[slug]/page'
import { useOrganization } from '@/lib/hooks/useOrganization'
import { useApiClient } from '@/lib/hooks/useApiClient'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

jest.mock('@/lib/hooks/useOrganization', () => ({
  useOrganization: jest.fn(),
}))

jest.mock('@/lib/hooks/useApiClient', () => ({
  useApiClient: jest.fn(),
}))

jest.mock('@/components/layout/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
}

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}

const mockUseOrganization = {
  currentOrganization: null,
  setCurrentOrganization: jest.fn(),
  refreshOrganizations: jest.fn(),
  isLoading: false,
  error: null,
}

const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'A test organization for unit testing',
  industry: 'Technology',
  organization_size: 'small',
  website: 'https://test-org.example.com',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
  member_count: 5,
  vault_count: 3,
  is_active: true,
  subscription_tier: 'professional',
  features: ['vault-management', 'board-chat', 'document-annotations'],
  created_by: 'user-456',
}

const mockMembers = [
  {
    id: 'member-1',
    user_id: 'user-456',
    email: 'owner@test-org.com',
    full_name: 'Test Owner',
    role: 'owner',
    joined_at: '2024-01-01T00:00:00Z',
    is_active: true,
  },
  {
    id: 'member-2',
    user_id: 'user-789',
    email: 'director@test-org.com',
    full_name: 'Test Director',
    role: 'director',
    joined_at: '2024-01-02T00:00:00Z',
    is_active: true,
  },
]

const mockStats = {
  total_vaults: 3,
  active_members: 5,
  storage_used: 1024 * 1024 * 512, // 512MB
  documents_processed: 45,
  monthly_activity: 127,
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('OrganizationDetailPage', () => {
  const originalUseParams = require('next/navigation').useParams

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup mocks
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useOrganization as jest.Mock).mockReturnValue(mockUseOrganization)
    ;(useApiClient as jest.Mock).mockReturnValue(mockApiClient)
    
    // Mock useParams to return slug
    require('next/navigation').useParams = jest.fn().mockReturnValue({
      slug: 'test-org',
    })
  })

  afterEach(() => {
    require('next/navigation').useParams = originalUseParams
  })

  describe('Component Rendering', () => {
    it('should render loading state initially', async () => {
      mockApiClient.get.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText(/loading organization/i)).toBeInTheDocument()
    })

    it('should render organization details when loaded', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      expect(screen.getByText('A test organization for unit testing')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('Professional')).toBeInTheDocument()
      expect(screen.getByText('5 Members')).toBeInTheDocument()
      expect(screen.getByText('3 Vaults')).toBeInTheDocument()
    })

    it('should render organization stats correctly', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      // Check stats display
      expect(screen.getByText('3')).toBeInTheDocument() // Total vaults
      expect(screen.getByText('5')).toBeInTheDocument() // Active members
      expect(screen.getByText('512 MB')).toBeInTheDocument() // Storage used
      expect(screen.getByText('45')).toBeInTheDocument() // Documents processed
      expect(screen.getByText('127')).toBeInTheDocument() // Monthly activity
    })

    it('should render members list correctly', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      // Check members are displayed
      expect(screen.getByText('Test Owner')).toBeInTheDocument()
      expect(screen.getByText('owner@test-org.com')).toBeInTheDocument()
      expect(screen.getByText('Test Director')).toBeInTheDocument()
      expect(screen.getByText('director@test-org.com')).toBeInTheDocument()
      
      // Check roles are displayed
      expect(screen.getByText('Owner')).toBeInTheDocument()
      expect(screen.getByText('Director')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should render error state when organization not found', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 404 },
        message: 'Organization not found',
      })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/organization not found/i)).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByText(/go back to organizations/i)).toBeInTheDocument()
    })

    it('should render error state for API failures', async () => {
      mockApiClient.get.mockRejectedValueOnce({
        response: { status: 500 },
        message: 'Internal server error',
      })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByText(/try again/i)).toBeInTheDocument()
    })

    it('should handle retry functionality', async () => {
      mockApiClient.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })

      const retryButton = screen.getByText(/try again/i)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate back to organizations list', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      const backButton = screen.getByText(/back to organizations/i)
      fireEvent.click(backButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/organizations')
    })

    it('should navigate to settings when clicking settings button', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      const settingsButton = screen.getByTestId('org-settings-button')
      fireEvent.click(settingsButton)

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/organizations/test-org/settings')
    })
  })

  describe('Features Display', () => {
    it('should display enabled features correctly', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      // Check features are displayed
      expect(screen.getByText('Vault Management')).toBeInTheDocument()
      expect(screen.getByText('Board Chat')).toBeInTheDocument()
      expect(screen.getByText('Document Annotations')).toBeInTheDocument()
    })

    it('should handle organization with no features', async () => {
      const orgWithNoFeatures = { ...mockOrganization, features: [] }
      
      mockApiClient.get
        .mockResolvedValueOnce({ organization: orgWithNoFeatures })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      expect(screen.getByText(/no features enabled/i)).toBeInTheDocument()
    })
  })

  describe('Context Updates', () => {
    it('should update organization context when loaded', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      expect(mockUseOrganization.setCurrentOrganization).toHaveBeenCalledWith(mockOrganization)
    })
  })

  describe('Responsive Behavior', () => {
    it('should handle mobile viewport correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      // Check mobile-specific elements
      const mobileLayout = screen.getByTestId('mobile-org-layout')
      expect(mobileLayout).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('should make correct API calls on mount', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockApiClient.get).toHaveBeenCalledTimes(3)
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/organizations/test-org')
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/organizations/test-org/members')
      expect(mockApiClient.get).toHaveBeenCalledWith('/api/organizations/test-org/stats')
    })

    it('should handle stale data correctly', async () => {
      mockApiClient.get
        .mockResolvedValueOnce({ organization: mockOrganization })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      const { rerender } = render(<OrganizationDetailPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument()
      })

      // Change slug and rerender
      require('next/navigation').useParams.mockReturnValue({
        slug: 'different-org',
      })

      const differentOrg = { ...mockOrganization, name: 'Different Organization', slug: 'different-org' }
      
      mockApiClient.get
        .mockResolvedValueOnce({ organization: differentOrg })
        .mockResolvedValueOnce({ members: mockMembers })
        .mockResolvedValueOnce({ stats: mockStats })

      rerender(<OrganizationDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Different Organization')).toBeInTheDocument()
      })

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/organizations/different-org')
    })
  })
})