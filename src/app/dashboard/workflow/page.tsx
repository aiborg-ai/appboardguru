'use client'

import React from 'react'
import IntegratedPageLayout from '@/components/shared/IntegratedPageLayout'
import WorkflowIntegration from '@/components/workflow/WorkflowIntegration'
import { Link2, Plus, Filter, Settings } from 'lucide-react'

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
      <WorkflowIntegration 
        showSuggestions={true}
      />
    </IntegratedPageLayout>
  )
}