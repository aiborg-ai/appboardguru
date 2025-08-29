'use client'

import { ReactNode, useEffect, useState } from 'react'
import { QueryProvider } from '@/lib/providers/query-provider'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { DemoProvider } from '@/contexts/DemoContext'
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

  // During SSR/initial render, render minimal structure to prevent hydration mismatch
  if (!mounted) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <DemoProvider>
          <OrganizationProvider>
            {children}
            <Toaster />
          </OrganizationProvider>
        </DemoProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}