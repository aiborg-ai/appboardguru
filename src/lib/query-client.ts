/**
 * Centralized QueryClient configuration for TanStack Query
 * Follows Next.js 14 App Router SSR best practices
 */

import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 60 seconds
        
        // Increase garbage collection time
        gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
        
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Network mode
        networkMode: 'online',
        
        // Refetch on window focus (disabled in production for better UX)
        refetchOnWindowFocus: process.env.NODE_ENV === 'development',
        
        // Refetch on reconnect
        refetchOnReconnect: 'always',
      },
      mutations: {
        // Mutation defaults
        retry: false, // Don't retry mutations by default
        networkMode: 'online',
      },
      dehydrate: {
        // Include pending queries in dehydration for streaming SSR
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
        
        // Don't redact errors in Next.js - it handles this automatically
        shouldRedactErrors: () => false,
      },
    },
  })
}

// Browser-only: ensure singleton instance
let browserQueryClient: QueryClient | undefined = undefined

/**
 * Get or create QueryClient instance
 * - Server: Always create a new client for each request
 * - Browser: Create singleton to prevent re-creation during React suspense
 */
export function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Default query function for consistent error handling
 */
export async function defaultQueryFn({ queryKey }: { queryKey: readonly unknown[] }): Promise<any> {
  const response = await fetch(queryKey[0] as string, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new ApiError(
      `${response.status}: ${response.statusText}`,
      response.status,
      await response.json().catch(() => null)
    )
  }

  return response.json()
}

/**
 * Helper to prefetch queries on the server
 */
export async function prefetchQuery(
  queryClient: QueryClient,
  options: Parameters<typeof queryClient.prefetchQuery>[0]
) {
  try {
    await queryClient.prefetchQuery(options)
  } catch (error) {
    // Log error but don't throw - allows page to render with loading state
    console.error('Prefetch error:', error)
  }
}

/**
 * Helper for invalidating queries with proper error handling
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  filters: Parameters<typeof queryClient.invalidateQueries>[0]
) {
  try {
    await queryClient.invalidateQueries(filters)
  } catch (error) {
    console.error('Invalidation error:', error)
  }
}