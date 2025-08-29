'use client'

import { ReactNode, useEffect, useState } from 'react'
import { QueryProvider } from '@/lib/providers/query-provider'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { Toaster } from '@/features/shared/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'

interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <OrganizationProvider>
          {children}
          <Toaster />
        </OrganizationProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}