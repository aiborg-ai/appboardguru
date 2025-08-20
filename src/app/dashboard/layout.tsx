'use client'

import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { QueryProvider } from '@/lib/providers/query-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <QueryProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </QueryProvider>
  )
}