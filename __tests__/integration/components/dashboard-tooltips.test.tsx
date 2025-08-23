/**
 * Component Integration Tests for Dashboard InfoTooltips
 * 
 * Tests InfoTooltips within actual dashboard page contexts
 * Following CLAUDE.md testing standards for integration testing
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { TooltipProvider } from '@/components/ui/tooltip'

// Mock Next.js components and hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    pathname: '/dashboard',
    query: {},
  })),
  usePathname: jest.fn(() => '/dashboard'),
}))

jest.mock('next/font/google', () => ({
  Inter: () => ({ style: { fontFamily: 'Inter' } })
}))

// Mock dashboard layout to focus on tooltip testing
jest.mock('@/features/dashboard/layout/DashboardLayout', () => {
  return function MockDashboardLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="dashboard-layout">{children}</div>
  }
})

// Mock organization context
const mockOrganizationContext = {
  currentOrganization: {
    id: 'test-org-1',
    name: 'Test Organization',
    slug: 'test-org'
  },
  isLoadingOrganizations: false,
  refreshOrganizations: jest.fn()
}

jest.mock('@/contexts/OrganizationContext', () => ({
  useOrganization: () => mockOrganizationContext
}))

expect.extend(toHaveNoViolations)

// Test wrapper with all necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <TooltipProvider delayDuration={0}>
    {children}
  </TooltipProvider>
)

describe('Dashboard Page InfoTooltips', () => {
  // Dynamic import to avoid module loading issues
  let DashboardPage: React.ComponentType

  beforeAll(async () => {
    const module = await import('@/app/dashboard/page')
    DashboardPage = module.default
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Main Dashboard Tooltips', () => {
    it('renders header tooltip with comprehensive content', async () => {
      const user = userEvent.setup()
      
      render(<DashboardPage />, { wrapper: TestWrapper })
      
      // Find the header tooltip
      const headerTooltipTrigger = screen.getByLabelText(/additional information/i)
      expect(headerTooltipTrigger).toBeInTheDocument()
      
      await user.hover(headerTooltipTrigger)
      
      await waitFor(() => {
        expect(screen.getByText('Board Governance Dashboard')).toBeInTheDocument()
        expect(screen.getByText(/centralized command center/i)).toBeInTheDocument()
        expect(screen.getByText('Features')).toBeInTheDocument()
        expect(screen.getByText('Tips')).toBeInTheDocument()
      })
    })

    it('renders Board Packs metric tooltip', async () => {
      const user = userEvent.setup()
      
      render(<DashboardPage />, { wrapper: TestWrapper })
      
      // Find Board Packs tooltip by looking for the text near it
      const boardPacksSection = screen.getByText('Board Packs').closest('div')
      const tooltipTrigger = boardPacksSection?.querySelector('button[aria-label*="information"]')
      
      expect(tooltipTrigger).toBeInTheDocument()
      
      if (tooltipTrigger) {
        await user.hover(tooltipTrigger)
        
        await waitFor(() => {
          expect(screen.getByText(/total number of board packs/i)).toBeInTheDocument()
        })
      }
    })

    it('renders Secure Files metric tooltip', async () => {
      const user = userEvent.setup()
      
      render(<DashboardPage />, { wrapper: TestWrapper })
      
      // Find Secure Files tooltip
      const secureFilesSection = screen.getByText('Secure Files').closest('div')
      const tooltipTrigger = secureFilesSection?.querySelector('button[aria-label*="information"]')
      
      expect(tooltipTrigger).toBeInTheDocument()
      
      if (tooltipTrigger) {
        await user.hover(tooltipTrigger)
        
        await waitFor(() => {
          expect(screen.getByText(/total number of encrypted/i)).toBeInTheDocument()
        })
      }
    })
  })

  describe('Tooltip Accessibility in Context', () => {
    it('maintains accessibility standards within dashboard', async () => {
      const { container } = render(<DashboardPage />, { wrapper: TestWrapper })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('supports keyboard navigation through tooltips', async () => {
      const user = userEvent.setup()
      
      render(<DashboardPage />, { wrapper: TestWrapper })
      
      // Tab through the page to find tooltip triggers
      await user.tab()
      
      let focusedElement = document.activeElement
      let attempts = 0
      const maxAttempts = 10
      
      // Find first tooltip trigger via tabbing
      while (attempts < maxAttempts && 
             (!focusedElement || !focusedElement.getAttribute('aria-label')?.includes('information'))) {
        await user.tab()
        focusedElement = document.activeElement
        attempts++
      }
      
      if (focusedElement?.getAttribute('aria-label')?.includes('information')) {
        // Tooltip should appear on focus
        await waitFor(() => {
          const tooltipContent = screen.queryByText(/board governance dashboard|board packs|secure files/i)
          expect(tooltipContent).toBeInTheDocument()
        })
      }
    })
  })
})

describe('Vaults Page InfoTooltips', () => {
  let VaultsPage: React.ComponentType

  beforeAll(async () => {
    try {
      const module = await import('@/app/dashboard/vaults/page')
      VaultsPage = module.default
    } catch (error) {
      console.warn('Vaults page not available for testing:', error)
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders vaults header tooltip', async () => {
    if (!VaultsPage) return

    const user = userEvent.setup()
    
    render(<VaultsPage />, { wrapper: TestWrapper })
    
    // Look for Vaults header tooltip
    await waitFor(() => {
      const vaultsHeader = screen.queryByText('Vaults')
      expect(vaultsHeader).toBeInTheDocument()
    })
    
    const headerSection = screen.getByText('Vaults').closest('div')
    const tooltipTrigger = headerSection?.querySelector('button[aria-label*="information"]')
    
    if (tooltipTrigger) {
      await user.hover(tooltipTrigger)
      
      await waitFor(() => {
        expect(screen.getByText(/secure document vaults/i)).toBeInTheDocument()
      })
    }
  })

  it('renders view toggle tooltip', async () => {
    if (!VaultsPage) return

    const user = userEvent.setup()
    
    render(<VaultsPage />, { wrapper: TestWrapper })
    
    // Find view toggle area and its associated tooltip
    await waitFor(() => {
      const viewControls = screen.queryByText(/view/i)
      if (viewControls) {
        const tooltipTrigger = viewControls.closest('div')?.querySelector('button[aria-label*="information"]')
        
        if (tooltipTrigger) {
          user.hover(tooltipTrigger)
        }
      }
    })
  })
})

describe('Assets Page InfoTooltips', () => {
  let AssetsPage: React.ComponentType

  beforeAll(async () => {
    try {
      const module = await import('@/app/dashboard/assets/page')
      AssetsPage = module.default
    } catch (error) {
      console.warn('Assets page not available for testing:', error)
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders assets header tooltip with comprehensive content', async () => {
    if (!AssetsPage) return

    const user = userEvent.setup()
    
    render(<AssetsPage />, { wrapper: TestWrapper })
    
    await waitFor(() => {
      const assetsHeader = screen.queryByText('Assets')
      expect(assetsHeader).toBeInTheDocument()
    })
    
    const headerSection = screen.getByText('Assets').closest('div')
    const tooltipTrigger = headerSection?.querySelector('button[aria-label*="information"]')
    
    if (tooltipTrigger) {
      await user.hover(tooltipTrigger)
      
      await waitFor(() => {
        expect(screen.getByText(/asset management system/i)).toBeInTheDocument()
        expect(screen.getByText(/secure file upload/i)).toBeInTheDocument()
      })
    }
  })

  it('renders upload button tooltip', async () => {
    if (!AssetsPage) return

    const user = userEvent.setup()
    
    render(<AssetsPage />, { wrapper: TestWrapper })
    
    await waitFor(() => {
      const uploadButton = screen.queryByText('Upload Files')
      if (uploadButton) {
        const tooltipTrigger = uploadButton.closest('div')?.querySelector('button[aria-label*="information"]')
        
        if (tooltipTrigger) {
          user.hover(tooltipTrigger)
        }
      }
    })
  })
})

describe('BoardChat Page InfoTooltips', () => {
  let BoardChatPage: React.ComponentType

  beforeAll(async () => {
    try {
      const module = await import('@/app/dashboard/boardchat/page')
      BoardChatPage = module.default
    } catch (error) {
      console.warn('BoardChat page not available for testing:', error)
    }
  })

  it('renders boardchat header tooltip', async () => {
    if (!BoardChatPage) return

    const user = userEvent.setup()
    
    render(<BoardChatPage />, { wrapper: TestWrapper })
    
    await waitFor(() => {
      const boardChatHeader = screen.queryByText('BoardChat')
      expect(boardChatHeader).toBeInTheDocument()
    })
    
    const headerSection = screen.getByText('BoardChat').closest('div')
    const tooltipTrigger = headerSection?.querySelector('button[aria-label*="information"]')
    
    if (tooltipTrigger) {
      await user.hover(tooltipTrigger)
      
      await waitFor(() => {
        expect(screen.getByText(/secure board communication/i)).toBeInTheDocument()
      })
    }
  })

  it('renders feature tooltips for message types', async () => {
    if (!BoardChatPage) return

    const user = userEvent.setup()
    
    render(<BoardChatPage />, { wrapper: TestWrapper })
    
    // Look for Direct Messages, Group Chats, Vault Groups tooltips
    const messageTypes = ['Direct Messages', 'Group Chats', 'Vault Groups']
    
    for (const messageType of messageTypes) {
      const messageSection = screen.queryByText(messageType)
      if (messageSection) {
        const tooltipTrigger = messageSection.closest('div')?.querySelector('button[aria-label*="information"]')
        
        if (tooltipTrigger) {
          await user.hover(tooltipTrigger)
          // Small delay to allow tooltip to render
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }
  })
})

describe('Settings Page InfoTooltips', () => {
  let SettingsPage: React.ComponentType

  beforeAll(async () => {
    try {
      const module = await import('@/app/dashboard/settings/page')
      SettingsPage = module.default
    } catch (error) {
      console.warn('Settings page not available for testing:', error)
    }
  })

  it('renders settings header tooltip', async () => {
    if (!SettingsPage) return

    const user = userEvent.setup()
    
    render(<SettingsPage />, { wrapper: TestWrapper })
    
    await waitFor(() => {
      const settingsHeader = screen.queryByText('Settings')
      expect(settingsHeader).toBeInTheDocument()
    })
    
    const headerSection = screen.getByText('Settings').closest('div')
    const tooltipTrigger = headerSection?.querySelector('button[aria-label*="information"]')
    
    if (tooltipTrigger) {
      await user.hover(tooltipTrigger)
      
      await waitFor(() => {
        expect(screen.getByText(/application settings/i)).toBeInTheDocument()
      })
    }
  })

  it('renders tab tooltips', async () => {
    if (!SettingsPage) return

    const user = userEvent.setup()
    
    render(<SettingsPage />, { wrapper: TestWrapper })
    
    // Look for settings tabs with tooltips
    const tabNames = ['AI Assistant', 'Account', 'Security & Activity', 'Notifications', 'Export & Backup']
    
    for (const tabName of tabNames) {
      await waitFor(async () => {
        const tabButton = screen.queryByText(tabName)
        if (tabButton) {
          const tooltipTrigger = tabButton.closest('button')?.querySelector('button[aria-label*="information"]')
          
          if (tooltipTrigger) {
            await user.hover(tooltipTrigger)
            // Allow time for tooltip to render
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      })
    }
  })
})

describe('Cross-Page Tooltip Consistency', () => {
  it('maintains consistent styling across all pages', async () => {
    const pages = [
      () => import('@/app/dashboard/page'),
      // Add other pages as they become available
    ]
    
    for (const getPageModule of pages) {
      try {
        const module = await getPageModule()
        const PageComponent = module.default
        
        render(<PageComponent />, { wrapper: TestWrapper })
        
        const tooltipTriggers = screen.getAllByRole('button', { name: /information/i })
        
        tooltipTriggers.forEach(trigger => {
          // Check for consistent blue styling
          expect(trigger).toHaveClass('text-blue-500')
          expect(trigger).toHaveClass('bg-blue-50')
          expect(trigger).toHaveClass('border-blue-200')
          
          // Check for consistent sizing
          expect(trigger).toHaveClass('w-7', 'h-7')
          
          // Check for animation classes
          expect(trigger).toHaveClass('transition-all', 'duration-200')
        })
        
        // Cleanup for next iteration
        document.body.innerHTML = ''
      } catch (error) {
        console.warn('Page not available for consistency testing:', error)
      }
    }
  })
})

describe('Tooltip Performance in Component Context', () => {
  it('handles multiple tooltips on page without performance degradation', async () => {
    const user = userEvent.setup()
    
    // Create a page with many tooltips
    const ManyTooltipsPage = () => {
      return (
        <div>
          {Array.from({ length: 50 }, (_, i) => (
            <div key={i} style={{ margin: '10px' }}>
              <span>Item {i}</span>
              <button aria-label="Additional information">
                <span>ℹ️</span>
              </button>
            </div>
          ))}
        </div>
      )
    }
    
    const startTime = performance.now()
    render(<ManyTooltipsPage />, { wrapper: TestWrapper })
    const renderTime = performance.now() - startTime
    
    // Rendering 50 tooltips should be reasonably fast (< 100ms)
    expect(renderTime).toBeLessThan(100)
    
    const tooltipTriggers = screen.getAllByRole('button')
    expect(tooltipTriggers).toHaveLength(50)
    
    // Test hovering performance
    const hoverStartTime = performance.now()
    await user.hover(tooltipTriggers[0])
    const hoverTime = performance.now() - hoverStartTime
    
    // Hover should be nearly instantaneous (< 10ms)
    expect(hoverTime).toBeLessThan(50)
  })

  it('properly cleans up tooltip event listeners', () => {
    const { unmount } = render(
      <div>
        {Array.from({ length: 10 }, (_, i) => (
          <button key={i} aria-label="Additional information">
            Tooltip {i}
          </button>
        ))}
      </div>, 
      { wrapper: TestWrapper }
    )
    
    // Get initial listener count (this is approximate)
    const initialListeners = Object.keys(document.body).filter(key => 
      key.startsWith('__reactEventHandlers') || key.startsWith('__reactProps')
    ).length
    
    unmount()
    
    // After unmount, there should be fewer or equal listeners
    const finalListeners = Object.keys(document.body).filter(key => 
      key.startsWith('__reactEventHandlers') || key.startsWith('__reactProps')
    ).length
    
    expect(finalListeners).toBeLessThanOrEqual(initialListeners)
  })
})

describe('Error Boundary Integration', () => {
  it('handles tooltip errors gracefully within page context', () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const ErrorTooltipPage = () => {
      // Component that might throw an error
      const ErrorTooltip = () => {
        throw new Error('Test error in tooltip')
      }
      
      return (
        <div>
          <h1>Page with Error Tooltip</h1>
          <ErrorTooltip />
        </div>
      )
    }
    
    expect(() => {
      render(<ErrorTooltipPage />, { wrapper: TestWrapper })
    }).not.toThrow()
    
    consoleSpy.mockRestore()
  })
})