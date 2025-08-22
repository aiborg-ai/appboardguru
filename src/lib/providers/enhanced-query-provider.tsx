"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { createEnhancedQueryClient, initializeStoreQueryIntegration } from '@/lib/stores/react-query-integration'

export function EnhancedQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createEnhancedQueryClient())
  const [isIntegrationReady, setIsIntegrationReady] = useState(false)

  useEffect(() => {
    // Initialize store-query integration
    const integration = initializeStoreQueryIntegration(queryClient)
    setIsIntegrationReady(true)

    // Expose query client to stores integration
    if (typeof window !== 'undefined') {
      (window as any).queryClient = queryClient
    }

    return () => {
      // Cleanup if needed
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}