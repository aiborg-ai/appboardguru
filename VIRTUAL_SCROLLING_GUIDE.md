# Virtual Scrolling Implementation Guide

## Overview

This guide covers the virtual scrolling system implemented for AppBoardGuru to improve performance with large lists. The system includes a core `VirtualScrollList` component and specialized components for different data types.

## Table of Contents

1. [Core Components](#core-components)
2. [Specialized List Components](#specialized-list-components)
3. [Performance Monitoring](#performance-monitoring)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

## Core Components

### VirtualScrollList

The foundation component that provides virtual scrolling functionality with dynamic heights, infinite scrolling, and accessibility features.

**Key Features:**
- Dynamic item heights
- Horizontal and vertical scrolling
- Infinite scrolling with data fetching
- Keyboard navigation
- Accessibility support (ARIA)
- Search and filtering
- Selection support
- Performance optimizations

**Location:** `/src/components/ui/virtual-scroll-list.tsx`

## Specialized List Components

### 1. AssetVirtualList
Optimized for displaying file assets with thumbnails, metadata, and actions.

**Features:**
- File type icons and thumbnails
- Expandable details
- Category badges
- File size and date formatting
- Share, download, and view actions

**Location:** `/src/components/ui/asset-virtual-list.tsx`

### 2. NotificationVirtualList
Designed for notification feeds with different types and priorities.

**Features:**
- Type-specific icons
- Priority indicators
- Status badges
- Action buttons (mark read, archive, delete)
- Time formatting

**Location:** `/src/components/ui/notification-virtual-list.tsx`

### 3. BoardMateVirtualList
Tailored for displaying board member profiles and information.

**Features:**
- Avatar display
- Role badges
- Contact information
- Board associations
- Status indicators
- Quick actions (message, call, edit)

**Location:** `/src/components/ui/boardmate-virtual-list.tsx`

### 4. SearchResultsVirtualList
Optimized for search results with relevance scoring and highlighting.

**Features:**
- Relevance scoring
- Search highlighting
- Type grouping
- Metadata display
- Bookmark and share actions

**Location:** `/src/components/ui/search-results-virtual-list.tsx`

### 5. CalendarEventsVirtualList
Designed for calendar events with attendees and meeting information.

**Features:**
- Event type indicators
- Attendee avatars
- RSVP controls
- Virtual meeting links
- Recurrence information
- Date grouping

**Location:** `/src/components/ui/calendar-events-virtual-list.tsx`

### 6. AnnotationVirtualList
Built for document annotations and comments with threading.

**Features:**
- Threaded replies
- Reaction support
- Status indicators (resolved, active)
- Target text highlighting
- Tag support
- Privacy indicators

**Location:** `/src/components/ui/annotation-virtual-list.tsx`

## Performance Monitoring

### VirtualListPerformanceMonitor

A comprehensive performance monitoring component that tracks rendering metrics.

**Metrics Tracked:**
- Render time
- Scroll FPS
- Memory usage
- Virtualization efficiency
- Visible vs total items

**Features:**
- Real-time monitoring
- Performance alerts
- Export capabilities
- Expandable detailed view

**Location:** `/src/components/ui/virtual-list-performance-monitor.tsx`

## Usage Examples

### Basic Virtual List

```tsx
import { VirtualScrollList } from '@/components/ui/virtual-scroll-list'

const MyItemComponent = ({ item, index, style }) => (
  <div style={style} className="p-4 border-b">
    {item.data.name}
  </div>
)

const MyList = () => {
  const items = data.map(item => ({ id: item.id, data: item }))
  
  return (
    <VirtualScrollList
      items={items}
      itemComponent={MyItemComponent}
      itemHeight={60}
      height={400}
    />
  )
}
```

### Asset List with Loading

```tsx
import { AssetVirtualList } from '@/components/ui/asset-virtual-list'

const AssetPage = () => {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = async () => {
    setLoading(true)
    const newAssets = await fetchAssets(assets.length)
    setAssets(prev => [...prev, ...newAssets])
    setHasMore(newAssets.length === 20) // Assuming page size of 20
    setLoading(false)
  }

  return (
    <AssetVirtualList
      assets={assets}
      height={600}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={loadMore}
      onView={handleViewAsset}
      onDownload={handleDownloadAsset}
      onShare={handleShareAsset}
    />
  )
}
```

### Search Results with Performance Monitoring

```tsx
import { SearchResultsVirtualList } from '@/components/ui/search-results-virtual-list'
import { VirtualListPerformanceMonitor, useVirtualListPerformance } from '@/components/ui/virtual-list-performance-monitor'

const SearchPage = () => {
  const [results, setResults] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const { enabled, setEnabled, exportMetrics } = useVirtualListPerformance()

  return (
    <div>
      {/* Performance Monitor */}
      <VirtualListPerformanceMonitor
        enabled={enabled}
        onExport={exportMetrics}
        position="top-right"
        showDetailedMetrics={true}
      />
      
      {/* Toggle Performance Monitoring */}
      <button onClick={() => setEnabled(!enabled)}>
        {enabled ? 'Disable' : 'Enable'} Performance Monitoring
      </button>

      {/* Search Results */}
      <SearchResultsVirtualList
        results={results}
        searchTerm={searchTerm}
        height={700}
        groupByType={true}
        onResultClick={handleResultClick}
      />
    </div>
  )
}
```

### Calendar Events with Selection

```tsx
import { CalendarEventsVirtualList } from '@/components/ui/calendar-events-virtual-list'

const CalendarPage = () => {
  const [events, setEvents] = useState([])
  const [selectedEvents, setSelectedEvents] = useState(new Set())

  return (
    <CalendarEventsVirtualList
      events={events}
      height={800}
      groupByDate={true}
      enableSelection={true}
      selectedEvents={selectedEvents}
      onSelectionChange={setSelectedEvents}
      onEventClick={handleEventClick}
      onRSVP={handleRSVP}
      onJoinMeeting={handleJoinMeeting}
    />
  )
}
```

## Best Practices

### Performance Optimization

1. **Use Consistent Item Heights When Possible**
   ```tsx
   // Preferred - fixed height
   <VirtualScrollList itemHeight={60} />
   
   // When dynamic heights are needed
   <VirtualScrollList 
     itemHeight={(index, item) => calculateHeight(item)}
     estimatedItemHeight={80}
   />
   ```

2. **Optimize Item Components**
   ```tsx
   // Use React.memo for item components
   const MyItem = React.memo(({ item, index, style }) => {
     // Component implementation
   })
   
   // Avoid expensive operations in render
   const expensiveValue = useMemo(() => 
     calculateExpensiveValue(item), [item.id]
   )
   ```

3. **Implement Efficient Data Loading**
   ```tsx
   const loadMore = useCallback(async () => {
     if (loading || !hasMore) return
     
     setLoading(true)
     try {
       const newItems = await fetchItems(items.length, 20)
       setItems(prev => [...prev, ...newItems])
       setHasMore(newItems.length === 20)
     } finally {
       setLoading(false)
     }
   }, [loading, hasMore, items.length])
   ```

### Accessibility

1. **Use Proper ARIA Attributes**
   ```tsx
   <VirtualScrollList
     role="listbox"
     aria-label="Search results"
     enableKeyboardNavigation={true}
   />
   ```

2. **Implement Keyboard Navigation**
   - Arrow keys for navigation
   - Enter/Space for selection
   - Home/End for first/last item

3. **Screen Reader Support**
   - Proper item labeling
   - Status announcements
   - Loading state announcements

### Memory Management

1. **Clean Up Resources**
   ```tsx
   useEffect(() => {
     return () => {
       // Clean up any subscriptions or timers
     }
   }, [])
   ```

2. **Use Virtualization Effectively**
   - Set appropriate overscan values (3-5 items)
   - Use proper load more thresholds
   - Implement item caching when needed

## API Reference

### VirtualScrollList Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `VirtualScrollListItem[]` | Required | Array of items to display |
| `itemComponent` | `React.ComponentType` | Required | Component to render each item |
| `itemHeight` | `number \| function` | `50` | Height of each item or function to calculate |
| `height` | `number \| string` | `400` | Container height |
| `width` | `number \| string` | `"100%"` | Container width |
| `overscan` | `number` | `5` | Number of items to render outside visible area |
| `onLoadMore` | `function` | - | Callback for loading more items |
| `hasMore` | `boolean` | `false` | Whether more items can be loaded |
| `loading` | `boolean` | `false` | Loading state |
| `enableSelection` | `boolean` | `false` | Enable item selection |
| `enableKeyboardNavigation` | `boolean` | `true` | Enable keyboard navigation |
| `searchTerm` | `string` | - | Search term for filtering |

### VirtualScrollList Methods (via ref)

| Method | Parameters | Description |
|--------|------------|-------------|
| `scrollToIndex` | `index, align?` | Scroll to specific item |
| `scrollToItem` | `itemId, align?` | Scroll to item by ID |
| `getVisibleRange` | - | Get currently visible item range |
| `invalidateCache` | - | Clear height cache |

## Troubleshooting

### Common Issues

1. **Items Not Rendering**
   - Check that items array is properly formatted
   - Ensure itemComponent is receiving correct props
   - Verify container has valid height

2. **Performance Issues**
   - Use performance monitor to identify bottlenecks
   - Optimize item component rendering
   - Reduce overscan value if memory is limited

3. **Scroll Position Issues**
   - Use `scrollToIndex` or `scrollToItem` methods
   - Ensure item heights are calculated correctly
   - Check for CSS conflicts affecting container

4. **Memory Leaks**
   - Clean up event listeners and subscriptions
   - Use React.memo for item components
   - Implement proper item cleanup

### Debug Mode

Enable debug logging:

```tsx
// Add to development environment
window.virtualScrollDebug = true
```

This will log performance metrics and render information to the console.

## Migration Guide

### From Regular Lists

1. **Identify Large Lists**
   - Lists with >100 items
   - Lists with complex item rendering
   - Lists causing scroll performance issues

2. **Convert to Virtual Scrolling**
   ```tsx
   // Before
   {items.map(item => <ItemComponent key={item.id} item={item} />)}
   
   // After
   <VirtualScrollList
     items={items.map(item => ({ id: item.id, data: item }))}
     itemComponent={ItemComponent}
     itemHeight={calculateHeight}
   />
   ```

3. **Update Item Components**
   ```tsx
   // Update component signature
   const ItemComponent = ({ item, index, style }) => (
     <div style={style}>
       {/* Use item.data for actual data */}
       {item.data.name}
     </div>
   )
   ```

### Performance Testing

Use the performance monitor to validate improvements:

1. Enable monitoring in development
2. Test with large datasets (1000+ items)
3. Compare before/after metrics
4. Optimize based on findings

## Conclusion

The virtual scrolling system provides significant performance improvements for large lists while maintaining accessibility and user experience. Use the specialized components for common use cases, and fall back to the core VirtualScrollList for custom implementations.

For questions or issues, refer to the troubleshooting section or check the component source code for implementation details.