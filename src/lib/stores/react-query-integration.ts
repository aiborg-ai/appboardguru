import { QueryClient } from '@tanstack/react-query'
import { stores, cacheManager } from './store-utils'
import { authStore } from './auth-store'
import { organizationStore } from './organization-store'
import { assetStore } from './asset-store'
import { vaultStore } from './vault-store'
import { notificationStore } from './notification-store'

// Enhanced query client with store integration
export function createEnhancedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error: any) => {
          // Don't retry on 401/403 errors
          if (error?.status === 401 || error?.status === 403) {
            return false
          }
          // Don't retry on network errors when offline
          if (!navigator.onLine) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
        onError: (error, variables, context) => {
          console.error('Mutation error:', error)
        },
      },
    },
  })
}

// Store-Query integration utilities
export class StoreQueryIntegration {
  private queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
    this.setupStoreSubscriptions()
  }

  // Set up subscriptions to sync stores with React Query
  private setupStoreSubscriptions(): void {
    // Sync auth state with query client
    authStore.subscribe(
      (state) => state.user,
      (user) => {
        if (!user) {
          // Clear all queries when user logs out
          this.queryClient.clear()
        }
      }
    )

    // Sync organization changes with queries
    organizationStore.subscribe(
      (state) => state.organizations,
      (organizations) => {
        // Update React Query cache with organization data
        this.queryClient.setQueryData(['organizations'], organizations)
      }
    )

    // Sync asset changes with queries
    assetStore.subscribe(
      (state) => state.assets,
      (assets) => {
        // Update React Query cache with asset data
        const currentOrg = organizationStore.getState().currentOrganization
        if (currentOrg) {
          this.queryClient.setQueryData(['assets', currentOrg.id], assets)
        }
      }
    )

    // Sync vault changes with queries
    vaultStore.subscribe(
      (state) => state.vaults,
      (vaults) => {
        // Update React Query cache with vault data
        const currentOrg = organizationStore.getState().currentOrganization
        if (currentOrg) {
          this.queryClient.setQueryData(['vaults', currentOrg.id], vaults)
        }
      }
    )

    // Sync notification changes with queries
    notificationStore.subscribe(
      (state) => state.notifications,
      (notifications) => {
        // Update React Query cache with notification data
        this.queryClient.setQueryData(['notifications'], notifications)
      }
    )
  }

  // Invalidate queries based on store actions
  invalidateQueriesForAction(action: string, entityId?: string): void {
    const invalidationRules = {
      'organization:created': [['organizations']],
      'organization:updated': [['organizations'], ['organizations', entityId]],
      'organization:deleted': [['organizations']],
      
      'asset:created': [['assets'], ['dashboard', 'metrics']],
      'asset:updated': [['assets'], ['assets', entityId]],
      'asset:deleted': [['assets'], ['dashboard', 'metrics']],
      
      'vault:created': [['vaults'], ['dashboard', 'metrics']],
      'vault:updated': [['vaults'], ['vaults', entityId]],
      'vault:deleted': [['vaults'], ['dashboard', 'metrics']],
      
      'notification:created': [['notifications'], ['notifications', 'counts']],
      'notification:updated': [['notifications'], ['notifications', 'counts']],
      'notification:deleted': [['notifications'], ['notifications', 'counts']],
    }

    const queryKeys = invalidationRules[action as keyof typeof invalidationRules]
    if (queryKeys) {
      queryKeys.forEach(queryKey => {
        this.queryClient.invalidateQueries({ queryKey })
      })
    }
  }

  // Prefetch data based on store state
  prefetchForCurrentContext(): void {
    const currentOrg = organizationStore.getState().currentOrganization
    const user = authStore.getState().user

    if (!user || !currentOrg) return

    // Prefetch common data
    this.queryClient.prefetchQuery({
      queryKey: ['assets', currentOrg.id],
      queryFn: () => assetStore.getState().fetchAssets(currentOrg.id),
      staleTime: 2 * 60 * 1000, // 2 minutes
    })

    this.queryClient.prefetchQuery({
      queryKey: ['vaults', currentOrg.id],
      queryFn: () => vaultStore.getState().fetchVaults(currentOrg.id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })

    this.queryClient.prefetchQuery({
      queryKey: ['notifications'],
      queryFn: () => notificationStore.getState().fetchNotifications(),
      staleTime: 1 * 60 * 1000, // 1 minute
    })
  }

  // Get query client instance
  getQueryClient(): QueryClient {
    return this.queryClient
  }
}

// React Query hooks that integrate with stores
export function useStoreQuery<TData, TError = Error>(
  queryKey: string[],
  storeSelector: () => TData,
  options: {
    enabled?: boolean
    staleTime?: number
    gcTime?: number
  } = {}
) {
  return {
    data: storeSelector(),
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
    refetch: () => Promise.resolve({ data: storeSelector() }),
    ...options
  }
}

// Mutation hooks that sync with stores
export function useStoreMutation<TData, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: TError, variables: TVariables) => void
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void
  } = {}
) {
  return {
    mutate: async (variables: TVariables) => {
      try {
        const data = await mutationFn(variables)
        options.onSuccess?.(data, variables)
        options.onSettled?.(data, null, variables)
        return data
      } catch (error) {
        options.onError?.(error as TError, variables)
        options.onSettled?.(undefined, error as TError, variables)
        throw error
      }
    },
    mutateAsync: mutationFn,
    isLoading: false,
    error: null,
    data: undefined,
    variables: undefined,
    reset: () => {},
    ...options
  }
}

// Hybrid query hook that uses both React Query and stores
export function useHybridQuery<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  storeSelector: () => TData | undefined,
  options: {
    useStore?: boolean
    fallbackToStore?: boolean
    syncToStore?: boolean
  } = {}
) {
  const storeData = storeSelector()
  const shouldUseStore = options.useStore || (!navigator.onLine && options.fallbackToStore)

  if (shouldUseStore && storeData) {
    return {
      data: storeData,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      refetch: () => queryFn().then(data => data)
    }
  }

  // Use React Query with store sync
  return {
    data: storeData,
    isLoading: !storeData,
    error: null,
    isError: false,
    isSuccess: !!storeData,
    refetch: queryFn
  }
}

// Initialize integration with existing query client
export function initializeStoreQueryIntegration(queryClient: QueryClient): StoreQueryIntegration {
  const integration = new StoreQueryIntegration(queryClient)
  
  // Set up cache invalidation based on store actions
  Object.values(stores).forEach((store) => {
    if ('subscribe' in store) {
      (store as any).subscribe(
        (state: Record<string, unknown>) => state,
        (state: any, prevState: any) => {
          // Determine what changed and invalidate accordingly
          if (state !== prevState) {
            // This is a simplified example - in practice, you'd want more granular detection
            integration.prefetchForCurrentContext()
          }
        }
      )
    }
  })

  return integration
}

// Query key factories for consistent naming
export const queryKeys = {
  // Auth
  user: ['user'] as const,
  userProfile: (userId: string) => ['user', userId, 'profile'] as const,
  
  // Organizations
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organizations', id] as const,
  organizationMembers: (id: string) => ['organizations', id, 'members'] as const,
  organizationInvitations: (id: string) => ['organizations', id, 'invitations'] as const,
  
  // Assets
  assets: (orgId: string, vaultId?: string) => 
    vaultId ? ['assets', orgId, 'vault', vaultId] : ['assets', orgId] as const,
  asset: (id: string) => ['assets', id] as const,
  assetAnnotations: (id: string) => ['assets', id, 'annotations'] as const,
  assetShares: (id: string) => ['assets', id, 'shares'] as const,
  assetVersions: (id: string) => ['assets', id, 'versions'] as const,
  
  // Vaults
  vaults: (orgId: string) => ['vaults', orgId] as const,
  vault: (id: string) => ['vaults', id] as const,
  vaultInvitations: (orgId: string) => ['vault-invitations', orgId] as const,
  
  // Notifications
  notifications: ['notifications'] as const,
  notificationCounts: ['notifications', 'counts'] as const,
  notificationPreferences: ['notifications', 'preferences'] as const,
  
  // Dashboard
  dashboard: ['dashboard'] as const,
  dashboardMetrics: ['dashboard', 'metrics'] as const,
  dashboardActivity: ['dashboard', 'activity'] as const,
  dashboardInsights: ['dashboard', 'insights'] as const,
} as const

// Type-safe query key utilities
export type QueryKeyMap = typeof queryKeys
export type QueryKeyFactory<T extends keyof QueryKeyMap> = QueryKeyMap[T]