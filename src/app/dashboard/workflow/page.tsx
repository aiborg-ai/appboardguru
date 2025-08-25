'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React from 'react'
import dynamicImport from 'next/dynamic'
import IntegratedPageLayout from '@/components/shared/IntegratedPageLayout'
import { Link2, Plus, Filter, Settings } from 'lucide-react'

const WorkflowIntegration = dynamicImport(
  () => import('@/components/workflow/WorkflowIntegration'),
  {
    ssr: false,
    loading: () => <div className="animate-pulse p-8 text-center">Loading workflow integration...</div>
  }
)

// Simple fallback component for server-side rendering
const WorkflowPlaceholder = () => (
  <div className="p-8">
    <div className="text-center text-gray-500">
      <div className="animate-pulse mb-4">
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
      </div>
      <p>Workflow integration loading...</p>
    </div>
  </div>
)

export default function WorkflowPage() {
  const handleCreateConnection = () => {
    console.log('Create new workflow connection')
  }

  const handleManageSettings = () => {
    console.log('Manage workflow settings')
  }

  const handleFilterWorkflows = () => {
    console.log('Filter workflows')
  }

  return (
    <IntegratedPageLayout
      title="Workflow Connections"
      subtitle="Cross-page workflow integration"
      description="Manage relationships between documents, meetings, organizations, and vaults. Create automated workflows and track dependencies across your board governance platform."
      icon={Link2}
      iconColor="text-purple-600"
      badges={[
        { label: 'Beta', variant: 'secondary' },
        { label: '12 Active', variant: 'outline' }
      ]}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Workflow' }
      ]}
      primaryAction={{
        id: 'create',
        label: 'Create Connection',
        icon: Plus,
        onClick: handleCreateConnection
      }}
      secondaryActions={[
        {
          id: 'filter',
          label: 'Filter',
          icon: Filter,
          onClick: handleFilterWorkflows,
          variant: 'outline'
        }
      ]}
      moreActions={[
        {
          id: 'settings',
          label: 'Workflow Settings',
          icon: Settings,
          onClick: handleManageSettings
        }
      ]}
      enableBookmark={true}
      bookmarkData={{
        type: 'asset',
        title: 'Workflow Connections',
        href: '/dashboard/workflow',
        description: 'Cross-page workflow integration dashboard'
      }}
      showRightSidebar={true}
      rightSidebarContent="both"
      rightSidebarDefaultTab="activity"
      trackPageView={true}
      pageLoadMetadata={{
        feature: 'workflow-integration',
        version: 'beta'
      }}
    >
      {/* Main workflow content */}
      {typeof window !== 'undefined' ? (
        <WorkflowIntegration 
          showSuggestions={true}
        />
      ) : (
        <WorkflowPlaceholder />
      )}
    </IntegratedPageLayout>
  )
}