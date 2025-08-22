# State Management Architecture

This directory contains a comprehensive state management solution built with Zustand, providing a scalable and maintainable architecture for the application.

## Overview

The state management system consists of:

- **6 Domain Stores**: Auth, Organization, Asset, Vault, Notification, and UI
- **Real-time Updates**: WebSocket integration for live data synchronization
- **Offline Support**: Sync queues for operations when offline
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **React Query Integration**: Hybrid approach combining server state and client state
- **Type Safety**: Full TypeScript support with proper type inference
- **Persistence**: Selective state persistence with migrations
- **Performance**: Optimized selectors and batch operations

## Store Structure

### Core Stores

#### AuthStore (`auth-store.ts`)
Manages user authentication, session state, and user preferences.

```typescript
// Usage examples
import { useAuth, useUser, useIsAuthenticated } from '@/lib/stores'

const { signIn, signOut, updateProfile } = useAuth()
const user = useUser()
const isAuthenticated = useIsAuthenticated()
```

**Features:**
- User authentication (sign in/up/out)
- Session management with auto-refresh
- User profile and preferences
- Password reset and account deletion

#### OrganizationStore (`organization-store.ts`)
Handles organization data, members, invitations, and settings.

```typescript
import { useOrganizations, useCurrentOrganization } from '@/lib/stores'

const organizations = useOrganizations()
const currentOrg = useCurrentOrganization()
```

**Features:**
- Organization CRUD operations
- Member management and role updates
- Invitation system
- Organization settings and preferences

#### AssetStore (`asset-store.ts`)
Manages file assets, uploads, sharing, annotations, and versions.

```typescript
import { useAssets, useAssetUploads, useAssetAnnotations } from '@/lib/stores'

const assets = useAssets()
const uploads = useAssetUploads()
const annotations = useAssetAnnotations()
```

**Features:**
- Asset management with metadata
- Multi-file upload with progress tracking
- Asset sharing with permissions
- Real-time annotations and comments
- Version control for assets

#### VaultStore (`vault-store.ts`)
Handles secure vault management and member permissions.

```typescript
import { useVaults, useCurrentVault } from '@/lib/stores'

const vaults = useVaults()
const currentVault = useCurrentVault()
```

**Features:**
- Vault creation and management
- Member invitations and permissions
- Access control and security

#### NotificationStore (`notification-store.ts`)
Manages notifications, preferences, and real-time updates.

```typescript
import { useNotifications, useNotificationCounts } from '@/lib/stores'

const notifications = useNotifications()
const counts = useNotificationCounts()
```

**Features:**
- Real-time notification system
- Bulk operations (mark all as read, etc.)
- Notification preferences and settings
- Desktop notifications support

#### UIStore (`ui-store.ts`)
Controls UI state including themes, modals, toasts, and layout.

```typescript
import { useTheme, useModals, useToasts } from '@/lib/stores'

const theme = useTheme()
const modals = useModals()
const toasts = useToasts()
```

**Features:**
- Theme management (light/dark/system)
- Modal state management
- Toast notifications
- Sidebar and layout state
- Command palette
- Loading states and overlays

## Advanced Features

### Real-time Updates

The WebSocket manager provides real-time synchronization across all connected clients:

```typescript
import { webSocketManager, useWebSocket } from '@/lib/stores/websocket-manager'

// Use WebSocket in components
const { connect, disconnect, send, getState } = useWebSocket()
```

**Features:**
- Automatic reconnection with exponential backoff
- Message queuing when offline
- Heartbeat monitoring
- Event-based message handling

### Offline Support

The offline sync manager ensures data consistency when connectivity is lost:

```typescript
import { offlineSync } from '@/lib/stores/store-utils'

// Operations are automatically queued when offline
offlineSync.enqueue('CREATE', 'asset', 'asset-123', assetData)
```

**Features:**
- Automatic operation queuing
- Retry logic with exponential backoff
- Conflict resolution
- Background sync when online

### Optimistic Updates

Immediate UI feedback with automatic rollback on errors:

```typescript
import { optimisticUpdates } from '@/lib/stores/store-utils'

// Add optimistic update
optimisticUpdates.add('action-123', 'UPDATE', 'asset', optimisticData, rollbackData)

// Confirm or rollback
optimisticUpdates.confirm('action-123') // Success
optimisticUpdates.rollback('action-123') // Error
```

### React Query Integration

Hybrid approach combining server state caching with local store management:

```typescript
import { useStoreQuery, useHybridQuery } from '@/lib/stores/react-query-integration'

// Use store data with React Query fallback
const assets = useHybridQuery(
  ['assets', orgId],
  () => fetchAssets(orgId),
  () => assetStore.getState().assets,
  { fallbackToStore: true }
)
```

## Usage Patterns

### Store Provider Setup

Wrap your app with the store provider:

```tsx
import { StoreProvider } from '@/lib/stores/store-provider'

function App() {
  return (
    <StoreProvider enableWebSocket enableDevTools>
      {/* Your app components */}
    </StoreProvider>
  )
}
```

### Custom Selectors

Create optimized selectors for better performance:

```typescript
import { useStoreSelector } from '@/lib/stores'

const filteredAssets = useStoreSelector('asset', (state) => 
  state.assets.filter(asset => asset.status === 'active')
)
```

### Batch Operations

Batch multiple store updates for better performance:

```typescript
import { batchStoreUpdates } from '@/lib/stores/store-utils'

batchStoreUpdates([
  () => assetStore.getState().setSelectedAssets([]),
  () => assetStore.getState().setFilters({ search: '' }),
  () => assetStore.getState().fetchAssets()
])
```

### Error Handling

Global error handling with user-friendly messages:

```typescript
import { handleStoreError } from '@/lib/stores/store-utils'

try {
  await assetStore.getState().createAsset(data)
} catch (error) {
  handleStoreError(error, { store: 'asset', action: 'createAsset' })
}
```

## Development Tools

### Store Debugging

In development mode, stores are exposed on the window object:

```javascript
// Available in browser console
window.authStore.getState()
window.assetStore.getState()
// ... etc
```

### Performance Monitoring

Monitor store performance in development:

```typescript
import { monitorStorePerformance } from '@/lib/stores/store-utils'

// Enable performance monitoring
monitorStorePerformance()
```

### Store Status Component

Visual store status indicator (development only):

```tsx
import { StoreStatus } from '@/lib/stores/store-provider'

function App() {
  return (
    <>
      {/* Your app */}
      <StoreStatus /> {/* Shows store status in dev mode */}
    </>
  )
}
```

## Migration and Persistence

### State Persistence

Stores automatically persist relevant data:

```typescript
// Persisted data (varies by store):
// - User preferences
// - Theme settings
// - UI layout state
// - Current selections
// - Filters and sort preferences
```

### Migration System

Handle store version upgrades:

```typescript
import { createMigrations } from '@/lib/stores/store-config'

const migrations = createMigrations([
  {
    version: 2,
    migrate: (state) => ({
      ...state,
      newField: 'defaultValue'
    })
  }
])
```

## Best Practices

### 1. Use Specific Selectors

```typescript
// Good - only re-renders when user changes
const user = useUser()

// Avoid - re-renders on any auth state change
const authState = useAuth()
```

### 2. Batch Related Updates

```typescript
// Good - single state update
store.getState().updateMultipleFields({
  name: 'new name',
  description: 'new description'
})

// Avoid - multiple state updates
store.getState().setName('new name')
store.getState().setDescription('new description')
```

### 3. Handle Loading States

```typescript
const { assets, loading } = useAssets()

if (loading.fetchAssets) {
  return <Spinner />
}
```

### 4. Use Optimistic Updates for Better UX

```typescript
// Immediately update UI, rollback on error
const handleLikeAsset = async (assetId: string) => {
  const actionId = uuidv4()
  
  // Optimistic update
  optimisticUpdates.add(actionId, 'LIKE', 'asset', { liked: true })
  
  try {
    await likeAsset(assetId)
    optimisticUpdates.confirm(actionId)
  } catch (error) {
    optimisticUpdates.rollback(actionId)
  }
}
```

### 5. Clean Up Subscriptions

```typescript
useEffect(() => {
  const unsubscribe = store.subscribe(selector, callback)
  return unsubscribe
}, [])
```

## Type Safety

All stores provide full TypeScript support:

```typescript
// Strong typing for store state
interface AssetState extends StoreSlice {
  assets: AssetWithMetadata[]
  loading: LoadingState
  // ... etc
}

// Type-safe selectors
const assets = useStoreSelector('asset', (state: AssetState) => state.assets)

// Type-safe actions
const { createAsset } = useAsset() // All methods are typed
```

## Performance Considerations

- **Selective Re-rendering**: Use specific selectors to minimize re-renders
- **Batch Updates**: Group related state changes together
- **Memoization**: Stores use Immer for efficient immutable updates
- **Subscription Management**: Automatic cleanup of subscriptions
- **Code Splitting**: Stores can be loaded independently
- **Memory Management**: Automatic garbage collection of unused data

## Testing

Test store logic in isolation:

```typescript
import { assetStore } from '@/lib/stores'

describe('AssetStore', () => {
  beforeEach(() => {
    assetStore.getState().reset()
  })

  it('should create asset', async () => {
    const assetData = { name: 'test.pdf' }
    const assetId = await assetStore.getState().createAsset(assetData)
    
    expect(assetId).toBeDefined()
    expect(assetStore.getState().assets).toHaveLength(1)
  })
})
```

## Troubleshooting

### Common Issues

1. **Hydration Mismatch**: Ensure stores are hydrated before rendering
2. **Memory Leaks**: Always clean up subscriptions
3. **Performance**: Use specific selectors instead of full store state
4. **Persistence**: Check browser storage limits
5. **WebSocket**: Verify connection URL and authentication

### Debug Tools

- Browser DevTools: Stores exposed on window object
- React DevTools: Query cache inspection
- Store Status: Visual connection status
- Performance Monitor: Track store operation times
- Logger: Comprehensive action logging

## Architecture Benefits

1. **Scalability**: Modular store structure
2. **Performance**: Optimized selectors and batch updates
3. **Developer Experience**: Full TypeScript support and debugging tools
4. **Reliability**: Offline support and error handling
5. **Maintainability**: Clear separation of concerns
6. **User Experience**: Real-time updates and optimistic UI
7. **Flexibility**: Easy to extend and customize