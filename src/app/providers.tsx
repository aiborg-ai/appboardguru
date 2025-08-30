'use client'

import { ReactNode, useEffect, useState } from 'react'
import { TooltipProvider } from '@/components/atoms/feedback/tooltip'
import { QueryProvider } from '@/lib/providers/query-provider'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { DemoProvider } from '@/contexts/DemoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/features/shared/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by rendering minimal structure during SSR
  if (!mounted) {
    return (
      <ErrorBoundary>
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthProvider>
          <DemoProvider>
            <OrganizationProvider>
              <TooltipProvider delayDuration={300}>
                {children}
                <Toaster />
              </TooltipProvider>
            </OrganizationProvider>
          </DemoProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}