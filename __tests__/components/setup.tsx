/**
 * Test setup utilities for React component testing
 */
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrganizationContext } from '@/contexts/OrganizationContext'
import { UserFactory, OrganizationFactory } from '../factories'

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  reload: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  route: '/',
  isReady: true,
  events: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

// Mock Next.js image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  subscribe: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
  })),
}

jest.mock('@/lib/supabase-client', () => mockSupabase)

// Create test query client
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

// Test providers wrapper
interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
  user?: any
  organization?: any
}

export const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  queryClient = createTestQueryClient(),
  user = UserFactory.build(),
  organization = OrganizationFactory.build(user.id),
}) => {
  const organizationValue = {
    currentOrganization: organization,
    organizations: [organization],
    setCurrentOrganization: jest.fn(),
    refreshOrganizations: jest.fn(),
    isLoading: false,
    error: null,
  }

  return (
    <QueryClientProvider client={queryClient}>
      <OrganizationContext.Provider value={organizationValue}>
        {children}
      </OrganizationContext.Provider>
    </QueryClientProvider>
  )
}

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  user?: any
  organization?: any
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { queryClient, user, organization, ...renderOptions } = options

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProviders queryClient={queryClient} user={user} organization={organization}>
      {children}
    </TestProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Helper to wait for loading states
export const waitForElementToBeRemoved = async (element: () => HTMLElement | null) => {
  const { waitForElementToBeRemoved: originalWait } = await import('@testing-library/react')
  return originalWait(element)
}

// Mock API responses helper
export const mockApiResponse = (endpoint: string, response: any, status = 200) => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes(endpoint)) {
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
      })
    }
    return Promise.reject(new Error(`Unhandled request: ${url}`))
  })
}

// Mock user authentication
export const mockAuthenticatedUser = (user: any) => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  })

  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: { user } },
    error: null,
  })
}

// Mock unauthenticated state
export const mockUnauthenticatedUser = () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  })

  mockSupabase.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })
}

// Cleanup function
export const cleanupTests = () => {
  jest.clearAllMocks()
  mockRouter.push.mockClear()
  mockRouter.replace.mockClear()
}

// Export testing library utilities
export * from '@testing-library/react'
export { renderWithProviders as render }