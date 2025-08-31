'use client'

import { ReactNode } from 'react'
import { TooltipProvider } from '@/components/atoms/feedback/tooltip'
import { QueryProvider } from '@/lib/providers/query-provider'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { DemoProvider } from '@/contexts/DemoContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/features/shared/ui/toaster'
import { ErrorBoundary } from '@/components/error-boundary'

export function Providers({ children }: { children: ReactNode }) {
  // Render the full provider tree consistently for both SSR and client
  // This prevents hydration mismatches
  return (
    <ErrorBoundary level="section" resetOnPropsChange>
      <QueryProvider>
        <ErrorBoundary level="component">
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
        </ErrorBoundary>
      </QueryProvider>
    </ErrorBoundary>
  )
}