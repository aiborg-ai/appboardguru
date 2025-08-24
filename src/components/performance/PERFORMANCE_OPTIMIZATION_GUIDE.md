# React Performance Optimization Guide

## Overview

This guide covers advanced performance optimization strategies for React components in the AppBoardGuru application, including intelligent memoization, render optimization, and performance monitoring.

## Table of Contents

1. [Advanced Memoization Patterns](#advanced-memoization-patterns)
2. [Enhanced React.memo](#enhanced-reactmemo)
3. [Performance Monitoring](#performance-monitoring)
4. [Component Optimization Strategies](#component-optimization-strategies)
5. [Memory Management](#memory-management)
6. [Virtualization](#virtualization)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Advanced Memoization Patterns

### useSmartMemo Hook

The `useSmartMemo` hook provides intelligent memoization with TTL, size limits, and performance tracking:

```typescript
import { useSmartMemo } from '@/hooks/useAdvancedMemoization'

function ExpensiveComponent({ data, filters }) {
  // Smart memo with TTL and performance tracking
  const processedData = useSmartMemo(
    () => heavyProcessing(data, filters),
    [data, filters],
    {
      ttl: 300000, // 5 minutes
      trackMetrics: true,
      debugName: 'ExpensiveComponent.processedData'
    }
  )

  return <div>{/* Render processed data */}</div>
}
```

### Deep Comparison Memoization

For complex objects that need deep comparison:

```typescript
import { useDeepMemo } from '@/hooks/useAdvancedMemoization'

function ConfigurableComponent({ settings }) {
  const normalizedSettings = useDeepMemo(
    () => normalizeSettings(settings),
    [settings],
    {
      maxDepth: 5,
      ignoreKeys: ['timestamp', 'tempData'],
      customComparers: {
        date: (a, b) => a.getTime() === b.getTime()
      }
    }
  )

  return <div>{/* Use normalized settings */}</div>
}
```

### Stable Callbacks

Prevent unnecessary re-renders with stable callback references:

```typescript
import { useStableCallback } from '@/hooks/useAdvancedMemoization'

function InteractiveComponent({ onAction, onUpdate }) {
  const handleClick = useStableCallback(
    (id: string) => {
      onAction(id)
      onUpdate({ timestamp: Date.now() })
    },
    [onAction, onUpdate],
    {
      debounce: 300, // Debounce rapid clicks
      debugName: 'InteractiveComponent.handleClick'
    }
  )

  return (
    <button onClick={() => handleClick('item-1')}>
      Click me
    </button>
  )
}
```

## Enhanced React.memo

### Smart Memoization Strategy

The enhanced memo provides intelligent comparison strategies:

```typescript
import { enhancedMemo, callbackMemo, deepMemo } from '@/components/performance/EnhancedMemo'

// Smart comparison with performance tracking
const SmartComponent = enhancedMemo(
  ({ data, onAction }) => {
    return <div>{/* Component JSX */}</div>
  },
  {
    strategy: 'smart', // Intelligent comparison
    trackRenders: true,
    debugName: 'SmartComponent',
    maxRenderTime: 16, // 60fps budget
    memoizeCallbacks: true,
    stableKeys: ['id', 'type'] // Keys that should never change
  }
)

// Deep comparison for complex props
const ComplexComponent = deepMemo(
  ({ complexData }) => {
    return <div>{/* Complex component */}</div>
  },
  {
    deepCompareKeys: ['complexData'],
    debugName: 'ComplexComponent'
  }
)

// Optimized for components with many callbacks
const CallbackHeavyComponent = callbackMemo(
  ({ onSave, onCancel, onValidate }) => {
    return <form>{/* Form with callbacks */}</form>
  },
  {
    stableKeys: ['formId'],
    debugName: 'CallbackHeavyComponent'
  }
)
```

### Performance Budget Monitoring

Set performance budgets and get notified when exceeded:

```typescript
const BudgetedComponent = enhancedMemo(
  MyComponent,
  {
    maxRenderTime: 16, // 60fps budget
    trackRenders: true,
    onRenderTimeExceeded: (renderTime) => {
      console.warn(`Component exceeded budget: ${renderTime}ms`)
      // Send to analytics service
      analytics.track('performance_budget_exceeded', {
        component: 'BudgetedComponent',
        renderTime
      })
    }
  }
)
```

## Performance Monitoring

### Component Performance Tracking

Monitor component performance with detailed metrics:

```typescript
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization'

function MonitoredComponent({ data }) {
  const { metrics, getPerformanceReport } = usePerformanceOptimization(
    'MonitoredComponent',
    {
      trackRenders: true,
      trackMemory: true,
      detectMemoryLeaks: true,
      performanceBudget: {
        maxRenderTime: 16,
        maxMemoryUsage: 5 * 1024 * 1024, // 5MB
        maxReRenders: 30
      },
      onBudgetExceeded: (metric, value, budget) => {
        console.warn(`Budget exceeded: ${metric} = ${value} > ${budget}`)
      }
    }
  )

  // Use metrics for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metrics:', metrics)
    }
  }, [metrics])

  return <div>{/* Component content */}</div>
}
```

### Render Optimization Analysis

Detect and analyze unnecessary re-renders:

```typescript
import { useRenderOptimization } from '@/hooks/usePerformanceOptimization'

function OptimizedComponent(props) {
  const {
    unnecessaryRenders,
    propChanges,
    hasUnnecessaryRender,
    getRenderProfile
  } = useRenderOptimization('OptimizedComponent', props, {
    ignoreProps: ['timestamp', 'debugInfo'],
    warnOnUnnecessaryRenders: true,
    trackPropChanges: true
  })

  // Log render analysis in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && unnecessaryRenders > 0) {
      const profile = getRenderProfile()
      console.group('Render Analysis')
      console.log('Unnecessary renders:', unnecessaryRenders)
      console.log('Recent prop changes:', propChanges)
      console.log('Render profile:', profile.slice(-5)) // Last 5 renders
      console.groupEnd()
    }
  }, [unnecessaryRenders, propChanges])

  return <div>{/* Component content */}</div>
}
```

## Component Optimization Strategies

### Optimized Event Handlers

Prevent re-renders caused by inline functions:

```typescript
import { useOptimizedHandlers } from '@/hooks/usePerformanceOptimization'

function FormComponent({ onSubmit, onValidate }) {
  const [values, setValues] = useState({})

  // Optimize handlers to prevent child re-renders
  const handlers = useOptimizedHandlers({
    handleChange: (field: string, value: any) => {
      setValues(prev => ({ ...prev, [field]: value }))
    },
    handleSubmit: () => {
      onSubmit(values)
    },
    handleValidate: (field: string) => {
      return onValidate(field, values[field])
    }
  }, [values, onSubmit, onValidate])

  return (
    <form onSubmit={handlers.handleSubmit}>
      {/* Form fields use stable handlers */}
      <input
        onChange={(e) => handlers.handleChange('name', e.target.value)}
        onBlur={() => handlers.handleValidate('name')}
      />
    </form>
  )
}
```

### Intersection Observer Optimization

Lazy load components and track visibility efficiently:

```typescript
import { useIntersectionOptimization } from '@/hooks/usePerformanceOptimization'

function LazyComponent({ content }) {
  const ref = useRef<HTMLDivElement>(null)
  
  const { isIntersecting, wasVisible } = useIntersectionOptimization(
    ref,
    {
      threshold: 0.1,
      rootMargin: '50px',
      freezeOnceVisible: true, // Stop observing after first visibility
      debugName: 'LazyComponent'
    }
  )

  return (
    <div ref={ref}>
      {(isIntersecting || wasVisible) && (
        <ExpensiveComponent content={content} />
      )}
      {!isIntersecting && !wasVisible && (
        <div className="placeholder h-32 bg-gray-100" />
      )}
    </div>
  )
}
```

### Virtual Scrolling

Handle large lists efficiently:

```typescript
import { useVirtualization } from '@/hooks/usePerformanceOptimization'

function VirtualizedList({ items, itemHeight = 50 }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(400)

  const {
    visibleItems,
    totalHeight,
    handleScroll,
    getItemOffset
  } = useVirtualization(
    items.length,
    itemHeight,
    containerHeight,
    {
      overscan: 5, // Render 5 extra items
      debugName: 'VirtualizedList'
    }
  )

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(index => (
          <div
            key={items[index].id}
            style={{
              position: 'absolute',
              top: getItemOffset(index),
              height: itemHeight,
              width: '100%'
            }}
          >
            <ListItem item={items[index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Memory Management

### Automatic Memory Leak Detection

Components can automatically detect potential memory leaks:

```typescript
function ComponentWithCleanup() {
  usePerformanceOptimization('ComponentWithCleanup', {
    detectMemoryLeaks: true,
    trackMemory: true
  })

  useEffect(() => {
    // Timers, intervals, and event listeners are automatically tracked
    const timer = setTimeout(() => {}, 1000)
    const interval = setInterval(() => {}, 5000)
    
    const handleResize = () => {}
    window.addEventListener('resize', handleResize)

    return () => {
      // Cleanup is automatically verified
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <div>Component content</div>
}
```

### LRU Cache for Computed Values

Use LRU caching for frequently computed values:

```typescript
import { useLRUMemo } from '@/hooks/useAdvancedMemoization'

function CachedComponent({ queries }) {
  // LRU cache with size limit
  const processedQueries = useLRUMemo(
    () => queries.map(query => processQuery(query)),
    [queries],
    50, // Cache up to 50 different query sets
    'CachedComponent.processedQueries'
  )

  return <div>{/* Use processed queries */}</div>
}
```

## Best Practices

### 1. Component Design Patterns

#### Atomic Components with Memo
```typescript
// Atomic components should always be memoized
const Button = enhancedMemo(
  ({ children, onClick, variant }) => (
    <button 
      className={`btn btn-${variant}`} 
      onClick={onClick}
    >
      {children}
    </button>
  ),
  {
    strategy: 'shallow',
    trackRenders: false, // Atomic components don't need tracking
    debugName: 'Button'
  }
)

// Complex components benefit from smart memoization
const DataTable = enhancedMemo(
  ({ data, columns, filters, onSort }) => {
    // Complex rendering logic
    return <table>{/* Table content */}</table>
  },
  {
    strategy: 'smart',
    trackRenders: true,
    memoizeCallbacks: true,
    debugName: 'DataTable'
  }
)
```

#### Container vs Presentational Components

```typescript
// Container component - handles logic and state
const UserListContainer = () => {
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({})

  // Optimize handlers
  const handlers = useOptimizedHandlers({
    handleFilter: (newFilters) => setFilters(newFilters),
    handleUserSelect: (userId) => {
      // Handle selection
    }
  }, [setFilters])

  return (
    <UserListPresentation
      users={users}
      filters={filters}
      onFilter={handlers.handleFilter}
      onUserSelect={handlers.handleUserSelect}
    />
  )
}

// Presentational component - memoized for performance
const UserListPresentation = enhancedMemo(
  ({ users, filters, onFilter, onUserSelect }) => (
    <div>
      <FilterPanel filters={filters} onChange={onFilter} />
      <UserGrid users={users} onSelect={onUserSelect} />
    </div>
  ),
  {
    strategy: 'smart',
    stableKeys: ['onFilter', 'onUserSelect'],
    debugName: 'UserListPresentation'
  }
)
```

### 2. State Management Optimization

#### Selective State Updates
```typescript
// Instead of updating entire objects
const [user, setUser] = useState({ name: '', email: '', preferences: {} })

// Use specific updates to prevent unnecessary re-renders
const updateUserName = useStableCallback(
  (name) => setUser(prev => ({ ...prev, name })),
  []
)

const updateUserEmail = useStableCallback(
  (email) => setUser(prev => ({ ...prev, email })),
  []
)
```

#### State Colocation
```typescript
// Colocate state with components that use it
function UserProfile() {
  return (
    <div>
      <UserBasicInfo /> {/* Has its own state */}
      <UserPreferences /> {/* Has its own state */}
      <UserActivity />   {/* Has its own state */}
    </div>
  )
}
```

### 3. Async Operations

#### Memoized Async Operations
```typescript
function AsyncDataComponent({ userId }) {
  const {
    value: userData,
    loading,
    error,
    retry
  } = useAsyncMemo(
    () => fetchUserData(userId),
    [userId],
    {
      debounce: 300, // Debounce rapid changes
      retryCount: 3,
      onError: (error) => {
        console.error('Failed to fetch user data:', error)
      }
    }
  )

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorDisplay error={error} onRetry={retry} />
  
  return <UserData data={userData} />
}
```

## Performance Metrics and Monitoring

### Development Debugging

In development, use the browser console to access performance metrics:

```javascript
// In browser console
window.__enhancedMemoDebug.generatePerformanceReport()
// Returns detailed performance analysis

window.__enhancedMemoDebug.getAllRenderMetrics()
// Returns all component render metrics
```

### Production Monitoring

Set up performance monitoring for production:

```typescript
import { PerformanceUtils } from '@/hooks/usePerformanceOptimization'

// Periodic performance reporting
useEffect(() => {
  const interval = setInterval(() => {
    const report = PerformanceUtils.getGlobalReport()
    
    // Send to analytics service
    analytics.track('performance_report', {
      ...report,
      timestamp: Date.now()
    })
  }, 300000) // Every 5 minutes

  return () => clearInterval(interval)
}, [])
```

## Troubleshooting

### Common Performance Issues

#### 1. Unnecessary Re-renders
```typescript
// Problem: Inline objects/arrays cause re-renders
function BadComponent({ onUpdate }) {
  return (
    <ChildComponent 
      config={{ theme: 'dark' }} // ❌ New object every render
      items={[1, 2, 3]}          // ❌ New array every render
      onSave={() => onUpdate()}  // ❌ New function every render
    />
  )
}

// Solution: Memoize stable values
function GoodComponent({ onUpdate }) {
  const config = useMemo(() => ({ theme: 'dark' }), [])
  const items = useMemo(() => [1, 2, 3], [])
  const handleSave = useStableCallback(() => onUpdate(), [onUpdate])

  return (
    <ChildComponent 
      config={config}
      items={items}
      onSave={handleSave}
    />
  )
}
```

#### 2. Memory Leaks
```typescript
// Problem: Missing cleanup
function LeakyComponent() {
  useEffect(() => {
    const timer = setInterval(() => {}, 1000)
    // ❌ Missing cleanup - memory leak
  }, [])

  return <div>Component</div>
}

// Solution: Proper cleanup
function CleanComponent() {
  usePerformanceOptimization('CleanComponent', {
    detectMemoryLeaks: true // Automatic leak detection
  })

  useEffect(() => {
    const timer = setInterval(() => {}, 1000)
    
    return () => {
      clearInterval(timer) // ✅ Proper cleanup
    }
  }, [])

  return <div>Component</div>
}
```

#### 3. Expensive Computations
```typescript
// Problem: Expensive computation on every render
function SlowComponent({ data }) {
  const processed = expensiveComputation(data) // ❌ Runs every render
  return <div>{processed}</div>
}

// Solution: Smart memoization
function FastComponent({ data }) {
  const processed = useSmartMemo(
    () => expensiveComputation(data),
    [data],
    {
      trackMetrics: true,
      debugName: 'FastComponent.expensiveComputation'
    }
  )
  
  return <div>{processed}</div>
}
```

### Performance Debugging Tools

1. **React DevTools Profiler**: Identify slow components
2. **Enhanced Memo Debug Tools**: Analyze memoization effectiveness
3. **Performance Optimization Hooks**: Track metrics and budgets
4. **Browser Performance Tab**: Monitor memory usage and render times

### Performance Checklist

- [ ] All presentational components use `enhancedMemo`
- [ ] Event handlers are stable (using `useStableCallback` or `useOptimizedHandlers`)
- [ ] Expensive computations are memoized
- [ ] Large lists use virtualization
- [ ] Components have performance budgets set
- [ ] Memory leak detection is enabled in development
- [ ] State is colocated and properly structured
- [ ] Async operations are debounced and cached
- [ ] Performance metrics are monitored in production

---

This guide provides a comprehensive approach to React performance optimization using advanced patterns and monitoring tools. Regular performance audits and proper implementation of these patterns will ensure your application remains fast and responsive as it scales.