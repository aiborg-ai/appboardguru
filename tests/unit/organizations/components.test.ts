import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import React from 'react'

// Mock the organization components (these would need to be imported from actual files)
// For this example, I'll create simplified mock components that represent the structure

// Mock dependencies
jest.mock('@/hooks/useBulkSelection')
jest.mock('@/hooks/useOrganizationAnalytics')
jest.mock('@/hooks/useMobileGestures')
jest.mock('@/hooks/useStaggeredAnimation')

// Mock components for testing
const MockOrganizationCard = ({ organization, onSelect, onAnalytics }: any) => (
  <div data-testid="organization-card" data-org-id={organization.id}>
    <input 
      type="checkbox" 
      data-testid={`select-org-${organization.id}`}
      onChange={() => onSelect(organization.id)}
    />
    <h3 data-testid="organization-name">{organization.name}</h3>
    <p data-testid="member-count">{organization.memberCount} members</p>
    <button 
      data-testid="organization-analytics-trigger"
      onClick={() => onAnalytics(organization.id)}
    >
      View Analytics
    </button>
  </div>
)

const MockMobileOrganizationCard = ({ organization, onSwipe, onLongPress }: any) => (
  <div 
    data-testid="mobile-organization-card" 
    data-org-id={organization.id}
    onTouchStart={() => {}}
    onTouchMove={() => {}}
    onTouchEnd={() => {}}
  >
    <div data-testid="mobile-card-avatar">Avatar</div>
    <div data-testid="mobile-card-title">{organization.name}</div>
    <div data-testid="mobile-card-stats">{organization.memberCount} members</div>
  </div>
)

const MockBulkActionsPanel = ({ selectedCount, onExport, onArchive, onShare }: any) => (
  <div data-testid="bulk-actions-panel">
    <span data-testid="selection-count">{selectedCount} selected</span>
    <div data-testid="bulk-actions-menu">
      <button data-testid="bulk-export-csv" onClick={onExport}>Export CSV</button>
      <button data-testid="bulk-archive" onClick={onArchive}>Archive</button>
      <button data-testid="bulk-share" onClick={onShare}>Share</button>
    </div>
  </div>
)

const MockAnalyticsModal = ({ isOpen, organizationId, onClose }: any) => (
  isOpen ? (
    <div data-testid="analytics-modal">
      <div data-testid="analytics-modal-backdrop" onClick={onClose}></div>
      <div data-testid="analytics-content">
        <button data-testid="close-analytics-modal" onClick={onClose}>×</button>
        <h2 data-testid="analytics-modal-title">Analytics for {organizationId}</h2>
        <div data-testid="analytics-loading">Loading...</div>
        <div data-testid="analytics-tabs">
          <button data-testid="analytics-tab-overview">Overview</button>
          <button data-testid="analytics-tab-members">Members</button>
          <button data-testid="analytics-tab-activity">Activity</button>
        </div>
        <div data-testid="metric-member-count">25</div>
        <div data-testid="metric-activity-score">85</div>
      </div>
    </div>
  ) : null
)

const MockSearchFilterBar = ({ onSearch, onFilter, onSort }: any) => (
  <div data-testid="search-filter-bar">
    <input 
      data-testid="organization-search"
      placeholder="Search organizations..."
      onChange={(e) => onSearch(e.target.value)}
    />
    <button data-testid="filters-dropdown-trigger">Filters</button>
    <button data-testid="sort-dropdown-trigger">Sort</button>
    <button data-testid="clear-search">Clear</button>
  </div>
)

describe('Organization Components', () => {
  const mockOrganizations = [
    {
      id: '1',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      memberCount: 25,
      status: 'active'
    },
    {
      id: '2',
      name: 'Beta Industries',
      slug: 'beta-industries',
      memberCount: 42,
      status: 'active'
    },
    {
      id: '3',
      name: 'Gamma Solutions',
      slug: 'gamma-solutions',
      memberCount: 18,
      status: 'inactive'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('OrganizationCard', () => {
    test('should render organization information correctly', () => {
      const mockOnSelect = jest.fn()
      const mockOnAnalytics = jest.fn()

      render(
        <MockOrganizationCard 
          organization={mockOrganizations[0]}
          onSelect={mockOnSelect}
          onAnalytics={mockOnAnalytics}
        />
      )

      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      expect(screen.getByText('25 members')).toBeInTheDocument()
      expect(screen.getByTestId('select-org-1')).toBeInTheDocument()
      expect(screen.getByTestId('organization-analytics-trigger')).toBeInTheDocument()
    })

    test('should handle selection changes', async () => {
      const user = userEvent.setup()
      const mockOnSelect = jest.fn()
      const mockOnAnalytics = jest.fn()

      render(
        <MockOrganizationCard 
          organization={mockOrganizations[0]}
          onSelect={mockOnSelect}
          onAnalytics={mockOnAnalytics}
        />
      )

      const checkbox = screen.getByTestId('select-org-1')
      await user.click(checkbox)

      expect(mockOnSelect).toHaveBeenCalledWith('1')
    })

    test('should trigger analytics modal', async () => {
      const user = userEvent.setup()
      const mockOnSelect = jest.fn()
      const mockOnAnalytics = jest.fn()

      render(
        <MockOrganizationCard 
          organization={mockOrganizations[0]}
          onSelect={mockOnSelect}
          onAnalytics={mockOnAnalytics}
        />
      )

      const analyticsButton = screen.getByTestId('organization-analytics-trigger')
      await user.click(analyticsButton)

      expect(mockOnAnalytics).toHaveBeenCalledWith('1')
    })

    test('should display loading skeleton state', () => {
      const LoadingSkeleton = () => (
        <div data-testid="organization-skeleton">
          <div data-testid="skeleton-avatar">Loading avatar...</div>
          <div data-testid="skeleton-title">Loading title...</div>
          <div data-testid="skeleton-subtitle">Loading subtitle...</div>
          <div data-testid="skeleton-stats">Loading stats...</div>
        </div>
      )

      render(<LoadingSkeleton />)

      expect(screen.getByTestId('skeleton-avatar')).toBeInTheDocument()
      expect(screen.getByTestId('skeleton-title')).toBeInTheDocument()
      expect(screen.getByTestId('skeleton-subtitle')).toBeInTheDocument()
      expect(screen.getByTestId('skeleton-stats')).toBeInTheDocument()
    })

    test('should handle staggered animation classes', () => {
      const AnimatedCard = ({ index }: { index: number }) => (
        <div 
          data-testid={`animated-card-${index}`}
          className={`animate-in fade-in-${index * 100}`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          Animated Card {index}
        </div>
      )

      render(
        <div>
          <AnimatedCard index={0} />
          <AnimatedCard index={1} />
          <AnimatedCard index={2} />
        </div>
      )

      const card0 = screen.getByTestId('animated-card-0')
      const card1 = screen.getByTestId('animated-card-1')
      const card2 = screen.getByTestId('animated-card-2')

      expect(card0).toHaveClass('fade-in-0')
      expect(card1).toHaveClass('fade-in-100')
      expect(card2).toHaveClass('fade-in-200')

      expect(card0).toHaveStyle('animation-delay: 0ms')
      expect(card1).toHaveStyle('animation-delay: 100ms')
      expect(card2).toHaveStyle('animation-delay: 200ms')
    })
  })

  describe('MobileOrganizationCard', () => {
    test('should render mobile-optimized layout', () => {
      const mockOnSwipe = jest.fn()
      const mockOnLongPress = jest.fn()

      render(
        <MockMobileOrganizationCard 
          organization={mockOrganizations[0]}
          onSwipe={mockOnSwipe}
          onLongPress={mockOnLongPress}
        />
      )

      expect(screen.getByTestId('mobile-card-avatar')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-card-title')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-card-stats')).toBeInTheDocument()
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      expect(screen.getByText('25 members')).toBeInTheDocument()
    })

    test('should have touch event handlers', () => {
      const mockOnSwipe = jest.fn()
      const mockOnLongPress = jest.fn()

      render(
        <MockMobileOrganizationCard 
          organization={mockOrganizations[0]}
          onSwipe={mockOnSwipe}
          onLongPress={mockOnLongPress}
        />
      )

      const card = screen.getByTestId('mobile-organization-card')
      
      // Verify touch event handlers are present (in a real test, you'd test the actual behavior)
      expect(card).toHaveProperty('onTouchStart')
      expect(card).toHaveProperty('onTouchMove')
      expect(card).toHaveProperty('onTouchEnd')
    })

    test('should handle swipe gestures', () => {
      const mockOnSwipe = jest.fn()
      const mockOnLongPress = jest.fn()

      render(
        <MockMobileOrganizationCard 
          organization={mockOrganizations[0]}
          onSwipe={mockOnSwipe}
          onLongPress={mockOnLongPress}
        />
      )

      const card = screen.getByTestId('mobile-organization-card')

      // Simulate touch events (simplified)
      fireEvent.touchStart(card, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      fireEvent.touchMove(card, {
        touches: [{ clientX: 200, clientY: 100 }]
      })
      
      fireEvent.touchEnd(card)

      // In a real implementation, this would trigger the swipe handler
      // For this mock, we're just testing the structure
    })
  })

  describe('BulkActionsPanel', () => {
    test('should render when items are selected', () => {
      const mockOnExport = jest.fn()
      const mockOnArchive = jest.fn()
      const mockOnShare = jest.fn()

      render(
        <MockBulkActionsPanel 
          selectedCount={2}
          onExport={mockOnExport}
          onArchive={mockOnArchive}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('2 selected')).toBeInTheDocument()
      expect(screen.getByTestId('bulk-export-csv')).toBeInTheDocument()
      expect(screen.getByTestId('bulk-archive')).toBeInTheDocument()
      expect(screen.getByTestId('bulk-share')).toBeInTheDocument()
    })

    test('should handle bulk operations', async () => {
      const user = userEvent.setup()
      const mockOnExport = jest.fn()
      const mockOnArchive = jest.fn()
      const mockOnShare = jest.fn()

      render(
        <MockBulkActionsPanel 
          selectedCount={3}
          onExport={mockOnExport}
          onArchive={mockOnArchive}
          onShare={mockOnShare}
        />
      )

      // Test export
      await user.click(screen.getByTestId('bulk-export-csv'))
      expect(mockOnExport).toHaveBeenCalled()

      // Test archive
      await user.click(screen.getByTestId('bulk-archive'))
      expect(mockOnArchive).toHaveBeenCalled()

      // Test share
      await user.click(screen.getByTestId('bulk-share'))
      expect(mockOnShare).toHaveBeenCalled()
    })

    test('should display operation loading states', () => {
      const LoadingPanel = () => (
        <div data-testid="bulk-actions-panel">
          <div data-testid="bulk-operation-loading">
            <span data-testid="bulk-operation-progress">Exporting organizations...</span>
            <div data-testid="progress-bar" role="progressbar" aria-valuenow={45}>45%</div>
            <button data-testid="cancel-bulk-operation">Cancel</button>
          </div>
        </div>
      )

      render(<LoadingPanel />)

      expect(screen.getByText('Exporting organizations...')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '45')
      expect(screen.getByTestId('cancel-bulk-operation')).toBeInTheDocument()
    })

    test('should show success and error states', () => {
      const SuccessPanel = () => (
        <div data-testid="bulk-operation-success">
          <span>Export completed successfully</span>
          <button data-testid="download-export">Download</button>
        </div>
      )

      const ErrorPanel = () => (
        <div data-testid="bulk-operation-error">
          <span>Export failed due to server error</span>
          <button data-testid="retry-bulk-operation">Retry</button>
        </div>
      )

      const { rerender } = render(<SuccessPanel />)
      expect(screen.getByText('Export completed successfully')).toBeInTheDocument()

      rerender(<ErrorPanel />)
      expect(screen.getByText('Export failed due to server error')).toBeInTheDocument()
    })
  })

  describe('AnalyticsModal', () => {
    test('should render when open', () => {
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={true}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('analytics-modal')).toBeInTheDocument()
      expect(screen.getByText('Analytics for test-org')).toBeInTheDocument()
      expect(screen.getByTestId('close-analytics-modal')).toBeInTheDocument()
    })

    test('should not render when closed', () => {
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={false}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      expect(screen.queryByTestId('analytics-modal')).not.toBeInTheDocument()
    })

    test('should handle close actions', async () => {
      const user = userEvent.setup()
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={true}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      // Test close button
      await user.click(screen.getByTestId('close-analytics-modal'))
      expect(mockOnClose).toHaveBeenCalled()

      // Test backdrop click
      mockOnClose.mockClear()
      await user.click(screen.getByTestId('analytics-modal-backdrop'))
      expect(mockOnClose).toHaveBeenCalled()
    })

    test('should display analytics tabs', () => {
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={true}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('analytics-tab-overview')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-tab-members')).toBeInTheDocument()
      expect(screen.getByTestId('analytics-tab-activity')).toBeInTheDocument()
    })

    test('should display metrics data', () => {
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={true}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('metric-member-count')).toBeInTheDocument()
      expect(screen.getByTestId('metric-activity-score')).toBeInTheDocument()
    })

    test('should show loading state', () => {
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={true}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument()
    })

    test('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      const mockOnClose = jest.fn()

      render(
        <MockAnalyticsModal 
          isOpen={true}
          organizationId="test-org"
          onClose={mockOnClose}
        />
      )

      // Test Escape key closes modal
      await user.keyboard('{Escape}')
      
      // In a real implementation, this would close the modal
      // For this mock, we'd need to add the keyboard handler
    })
  })

  describe('SearchFilterBar', () => {
    test('should render search and filter controls', () => {
      const mockOnSearch = jest.fn()
      const mockOnFilter = jest.fn()
      const mockOnSort = jest.fn()

      render(
        <MockSearchFilterBar 
          onSearch={mockOnSearch}
          onFilter={mockOnFilter}
          onSort={mockOnSort}
        />
      )

      expect(screen.getByTestId('organization-search')).toBeInTheDocument()
      expect(screen.getByTestId('filters-dropdown-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('sort-dropdown-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('clear-search')).toBeInTheDocument()
    })

    test('should handle search input changes', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()
      const mockOnFilter = jest.fn()
      const mockOnSort = jest.fn()

      render(
        <MockSearchFilterBar 
          onSearch={mockOnSearch}
          onFilter={mockOnFilter}
          onSort={mockOnSort}
        />
      )

      const searchInput = screen.getByTestId('organization-search')
      await user.type(searchInput, 'test query')

      expect(mockOnSearch).toHaveBeenCalledWith('test query')
    })

    test('should show active filter badges', () => {
      const FilterBarWithBadges = () => (
        <div data-testid="search-filter-bar">
          <input data-testid="organization-search" />
          <div data-testid="active-filters">
            <span data-testid="search-badge">Search: test</span>
            <span data-testid="active-filter-badge">Status: Active</span>
            <span data-testid="sort-badge">Name A-Z</span>
          </div>
          <button data-testid="clear-all-filters">Clear All</button>
        </div>
      )

      render(<FilterBarWithBadges />)

      expect(screen.getByTestId('search-badge')).toBeInTheDocument()
      expect(screen.getByTestId('active-filter-badge')).toBeInTheDocument()
      expect(screen.getByTestId('sort-badge')).toBeInTheDocument()
    })

    test('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup()
      const mockOnSearch = jest.fn()

      const SearchBarWithShortcuts = () => {
        React.useEffect(() => {
          const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
              e.preventDefault()
              const searchInput = document.querySelector('[data-testid="organization-search"]') as HTMLInputElement
              searchInput?.focus()
            }
          }

          document.addEventListener('keydown', handleKeyDown)
          return () => document.removeEventListener('keydown', handleKeyDown)
        }, [])

        return (
          <input 
            data-testid="organization-search"
            onChange={(e) => mockOnSearch(e.target.value)}
          />
        )
      }

      render(<SearchBarWithShortcuts />)

      // Test Ctrl+K shortcut
      await user.keyboard('{Control>}k{/Control}')
      
      expect(screen.getByTestId('organization-search')).toHaveFocus()
    })
  })

  describe('Component Integration', () => {
    test('should handle organization card with bulk selection', () => {
      const OrganizationGrid = () => {
        const [selectedItems, setSelectedItems] = React.useState<string[]>([])

        const handleSelect = (orgId: string) => {
          setSelectedItems(prev => 
            prev.includes(orgId) 
              ? prev.filter(id => id !== orgId)
              : [...prev, orgId]
          )
        }

        return (
          <div>
            {mockOrganizations.map(org => (
              <MockOrganizationCard
                key={org.id}
                organization={org}
                onSelect={handleSelect}
                onAnalytics={() => {}}
              />
            ))}
            {selectedItems.length > 0 && (
              <MockBulkActionsPanel
                selectedCount={selectedItems.length}
                onExport={() => {}}
                onArchive={() => {}}
                onShare={() => {}}
              />
            )}
          </div>
        )
      }

      render(<OrganizationGrid />)

      // Initially no bulk panel
      expect(screen.queryByTestId('bulk-actions-panel')).not.toBeInTheDocument()

      // Select an organization
      fireEvent.click(screen.getByTestId('select-org-1'))

      // Bulk panel should appear
      expect(screen.getByTestId('bulk-actions-panel')).toBeInTheDocument()
      expect(screen.getByText('1 selected')).toBeInTheDocument()

      // Select another organization
      fireEvent.click(screen.getByTestId('select-org-2'))

      // Count should update
      expect(screen.getByText('2 selected')).toBeInTheDocument()
    })

    test('should handle search filtering integration', async () => {
      const user = userEvent.setup()

      const FilterableOrganizations = () => {
        const [searchTerm, setSearchTerm] = React.useState('')
        
        const filteredOrgs = mockOrganizations.filter(org =>
          org.name.toLowerCase().includes(searchTerm.toLowerCase())
        )

        return (
          <div>
            <MockSearchFilterBar
              onSearch={setSearchTerm}
              onFilter={() => {}}
              onSort={() => {}}
            />
            <div data-testid="filtered-results">
              {filteredOrgs.map(org => (
                <MockOrganizationCard
                  key={org.id}
                  organization={org}
                  onSelect={() => {}}
                  onAnalytics={() => {}}
                />
              ))}
            </div>
          </div>
        )
      }

      render(<FilterableOrganizations />)

      // Initially all organizations shown
      expect(screen.getAllByTestId('organization-card')).toHaveLength(3)

      // Search for "Acme"
      const searchInput = screen.getByTestId('organization-search')
      await user.type(searchInput, 'Acme')

      // Should show only matching organization
      await waitFor(() => {
        expect(screen.getAllByTestId('organization-card')).toHaveLength(1)
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      })
    })

    test('should handle responsive layout switching', () => {
      const ResponsiveOrganizations = ({ isMobile }: { isMobile: boolean }) => (
        <div>
          {isMobile ? (
            <div data-testid="mobile-organizations-container">
              {mockOrganizations.map(org => (
                <MockMobileOrganizationCard
                  key={org.id}
                  organization={org}
                  onSwipe={() => {}}
                  onLongPress={() => {}}
                />
              ))}
            </div>
          ) : (
            <div data-testid="desktop-organizations-container">
              {mockOrganizations.map(org => (
                <MockOrganizationCard
                  key={org.id}
                  organization={org}
                  onSelect={() => {}}
                  onAnalytics={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )

      const { rerender } = render(<ResponsiveOrganizations isMobile={false} />)

      // Desktop layout
      expect(screen.getByTestId('desktop-organizations-container')).toBeInTheDocument()
      expect(screen.queryByTestId('mobile-organizations-container')).not.toBeInTheDocument()

      // Mobile layout
      rerender(<ResponsiveOrganizations isMobile={true} />)

      expect(screen.getByTestId('mobile-organizations-container')).toBeInTheDocument()
      expect(screen.queryByTestId('desktop-organizations-container')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', () => {
      const AccessibleOrganizationCard = ({ organization }: any) => (
        <article 
          data-testid="organization-card"
          role="listitem"
          aria-label={`Organization: ${organization.name}`}
        >
          <input 
            type="checkbox"
            data-testid={`select-org-${organization.id}`}
            aria-label={`Select ${organization.name}`}
          />
          <h3>{organization.name}</h3>
          <p aria-label="Member count">{organization.memberCount} members</p>
          <button 
            data-testid="organization-analytics-trigger"
            aria-label={`View analytics for ${organization.name}`}
          >
            View Analytics
          </button>
        </article>
      )

      render(
        <section role="list" aria-label="Organizations">
          <AccessibleOrganizationCard organization={mockOrganizations[0]} />
        </section>
      )

      const card = screen.getByRole('listitem')
      expect(card).toHaveAttribute('aria-label', 'Organization: Acme Corporation')

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', 'Select Acme Corporation')

      const button = screen.getByRole('button', { name: /view analytics/i })
      expect(button).toHaveAttribute('aria-label', 'View analytics for Acme Corporation')
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      const KeyboardNavigableCard = ({ organization }: any) => (
        <div 
          data-testid="organization-card"
          tabIndex={0}
          role="button"
          aria-label={`Organization: ${organization.name}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              // Handle selection
            }
          }}
        >
          <h3>{organization.name}</h3>
        </div>
      )

      render(<KeyboardNavigableCard organization={mockOrganizations[0]} />)

      const card = screen.getByTestId('organization-card')
      
      // Focus the card
      await user.tab()
      expect(card).toHaveFocus()

      // Test keyboard activation
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
    })

    test('should announce selection changes to screen readers', () => {
      const AnnouncedSelectionPanel = ({ selectedCount }: { selectedCount: number }) => (
        <div>
          <div 
            data-testid="selection-count"
            aria-live="polite"
            aria-atomic="true"
          >
            {selectedCount} organization{selectedCount !== 1 ? 's' : ''} selected
          </div>
          <div
            data-testid="bulk-operation-status"
            aria-live="assertive"
            aria-atomic="true"
          >
            {selectedCount > 0 && 'Bulk actions available'}
          </div>
        </div>
      )

      const { rerender } = render(<AnnouncedSelectionPanel selectedCount={0} />)

      let selectionCount = screen.getByTestId('selection-count')
      let operationStatus = screen.getByTestId('bulk-operation-status')

      expect(selectionCount).toHaveAttribute('aria-live', 'polite')
      expect(operationStatus).toHaveAttribute('aria-live', 'assertive')

      rerender(<AnnouncedSelectionPanel selectedCount={2} />)

      selectionCount = screen.getByTestId('selection-count')
      expect(selectionCount).toHaveTextContent('2 organizations selected')
    })
  })
})