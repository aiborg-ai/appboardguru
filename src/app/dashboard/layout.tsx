'use client'

import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { QueryProvider } from '@/lib/providers/query-provider'
import { Toaster } from '@/features/shared/ui/toaster'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <OrganizationProvider>
        {children}
        <Toaster />
      </OrganizationProvider>
    </QueryProvider>
  )
}