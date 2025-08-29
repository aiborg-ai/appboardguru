import { ClientProviders } from '@/components/providers/ClientProviders'

// Force dynamic rendering for all dashboard pages
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientProviders>{children}</ClientProviders>
}