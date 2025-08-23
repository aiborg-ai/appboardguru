# Enhanced Organizations Search & Filtering Components

## Quick Start

### Basic Usage

```tsx
import { useOrganizationFilters } from '@/hooks/useOrganizationFilters'
import EnhancedSearchBar from '@/components/organizations/EnhancedSearchBar'
import FilterPanel from '@/components/organizations/FilterPanel'

function OrganizationsPage() {
  const { organizations } = useOrganization()
  
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    filteredOrganizations,
    recentSearches,
    addRecentSearch,
    filterPresets,
    savePreset,
    deletePreset
  } = useOrganizationFilters({
    organizations,
    enableUrlSync: true
  })

  return (
    <div className="space-y-6">
      {/* Enhanced Search */}
      <EnhancedSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        organizations={organizations}
        recentSearches={recentSearches}
        onRecentSearchAdd={addRecentSearch}
      />

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          {filteredOrganizations.map(org => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>

        {/* Filter Panel */}
        <FilterPanel
          organizations={organizations}
          filters={filters}
          onFiltersChange={setFilters}
          presets={filterPresets}
          onPresetSave={savePreset}
          onPresetDelete={deletePreset}
        />
      </div>
    </div>
  )
}
```

### Custom Presets

```tsx
const customPresets = [
  {
    id: 'my-companies',
    name: 'My Companies',
    description: 'Companies where I have admin access',
    icon: Crown,
    filters: {
      roles: ['owner', 'admin'],
      statuses: ['active']
    }
  },
  {
    id: 'tech-startups',
    name: 'Tech Startups',
    description: 'Technology startups under 50 people',
    icon: Zap,
    filters: {
      industries: ['Technology'],
      sizes: ['startup', 'small'],
      memberCountRange: [1, 50]
    }
  }
]

// Use in component
const filterHook = useOrganizationFilters({
  organizations,
  customPresets,
  defaultSort: { field: 'name', order: 'asc' }
})
```

### Search Highlighting

```tsx
// Get highlighted text for display
const { getHighlightedText } = useOrganizationFilters({ organizations })

// In your component
<div 
  dangerouslySetInnerHTML={{ 
    __html: getHighlightedText(organization.name) 
  }} 
/>
```

### URL Synchronization

The hook automatically manages URL parameters:
- `?search=technology` - Search term
- `?industries=Technology,Healthcare` - Selected industries
- `?roles=owner,admin` - User roles
- `?memberCount=10-100` - Member count range
- `?sort=created_at:desc` - Sort configuration

### Mobile Responsive

```tsx
const [showFilters, setShowFilters] = useState(false)

return (
  <div className="relative">
    {/* Toggle button for mobile */}
    <Button 
      className="lg:hidden"
      onClick={() => setShowFilters(true)}
    >
      <Filter /> Filters
    </Button>

    {/* Slide-out filter panel */}
    {showFilters && (
      <>
        <div 
          className="fixed inset-0 bg-black/25 lg:hidden"
          onClick={() => setShowFilters(false)}
        />
        <div className="fixed right-0 top-0 h-full lg:relative lg:w-80">
          <FilterPanel {...filterProps} />
        </div>
      </>
    )}
  </div>
)
```

## Component APIs

### EnhancedSearchBar Props
```tsx
interface EnhancedSearchBarProps {
  value: string
  onChange: (value: string) => void
  organizations: Organization[]
  placeholder?: string
  recentSearches?: string[]
  onRecentSearchAdd?: (search: string) => void
  onSuggestionClick?: (suggestion: SearchSuggestion) => void
  showSuggestions?: boolean
  disabled?: boolean
}
```

### FilterPanel Props
```tsx
interface FilterPanelProps {
  organizations: Organization[]
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  presets?: FilterPreset[]
  onPresetSave?: (name: string, filters: FilterState) => void
  onPresetDelete?: (presetId: string) => void
  compact?: boolean
}
```

### useOrganizationFilters Options
```tsx
interface UseOrganizationFiltersOptions {
  organizations: Organization[]
  enableUrlSync?: boolean
  defaultFilters?: Partial<FilterState>
  defaultSort?: SortConfig
  customPresets?: FilterPreset[]
}
```

## Advanced Features

### Custom Filter Types
Extend the FilterState interface for additional filter types:

```tsx
interface CustomFilterState extends FilterState {
  tags: string[]
  rating: [number, number]
  lastUpdated: Date | null
}
```

### Performance Optimization
For large datasets, consider:

```tsx
const { filteredOrganizations } = useOrganizationFilters({
  organizations: useMemo(() => organizations, [organizations]),
  enableUrlSync: false, // Disable for better performance
})
```

### Integration with Existing FilterBar
The components work alongside the existing FilterBar:

```tsx
<div className="space-y-4">
  {/* Legacy filter bar */}
  <FilterBar
    searchValue={searchQuery}
    onSearchChange={setSearchQuery}
    // ... other props
  />
  
  {/* Enhanced search */}
  <EnhancedSearchBar
    value={searchQuery}
    onChange={setSearchQuery}
    // ... other props
  />
</div>
```

## Styling & Customization

### Theme Integration
All components use existing design tokens:
- Colors: `blue-*`, `gray-*`, `green-*`, etc.
- Spacing: Tailwind spacing scale
- Typography: Existing font classes
- Animations: Framer Motion for smooth transitions

### Custom Styles
```tsx
<FilterPanel
  className="w-96 bg-gray-50 rounded-lg shadow-lg"
  compact={true}
/>

<EnhancedSearchBar
  className="max-w-lg"
  placeholder="Search your organizations..."
/>
```

## Testing

### Unit Tests
```tsx
import { renderHook } from '@testing-library/react'
import { useOrganizationFilters } from '@/hooks/useOrganizationFilters'

test('filters organizations by industry', () => {
  const { result } = renderHook(() => 
    useOrganizationFilters({ organizations: mockOrganizations })
  )
  
  act(() => {
    result.current.setFilters({ 
      ...result.current.filters,
      industries: ['Technology'] 
    })
  })
  
  expect(result.current.filteredOrganizations).toHaveLength(3)
})
```

### Integration Tests
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import EnhancedSearchBar from '@/components/organizations/EnhancedSearchBar'

test('shows search suggestions on input', async () => {
  render(
    <EnhancedSearchBar
      value=""
      onChange={mockOnChange}
      organizations={mockOrganizations}
    />
  )
  
  fireEvent.change(screen.getByRole('textbox'), { 
    target: { value: 'tech' } 
  })
  
  expect(await screen.findByText('Technology Company')).toBeInTheDocument()
})
```

## Troubleshooting

### Common Issues

1. **Suggestions not showing**: Check that organizations array is populated
2. **URL sync not working**: Ensure Next.js router is available
3. **Performance issues**: Use React.memo for organization list items
4. **Mobile layout**: Test responsive design with FilterPanel slide-out

### Debug Tools

```tsx
// Enable debug logging
const filterHook = useOrganizationFilters({
  organizations,
  // Add debug flag in development
  debug: process.env.NODE_ENV === 'development'
})

// Log filter state
console.log('Active filters:', filterHook.filters)
console.log('Filtered count:', filterHook.filteredOrganizations.length)
```

## Migration from Legacy FilterBar

1. **Install new components** alongside existing FilterBar
2. **Test functionality** with both implementations
3. **Gradually replace** FilterBar usage with enhanced components
4. **Update existing tests** to use new component APIs
5. **Remove legacy code** once migration is complete

The enhanced components maintain backward compatibility and can be introduced incrementally without breaking existing functionality.