'use client'

import React, { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import PageHeader from './PageHeader'
import CrossPageActivityStream from '../activity/CrossPageActivityStream'
import WorkflowIntegration from '../workflow/WorkflowIntegration'
import { Card } from '@/features/shared/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { useIntegrationActions } from '@/lib/stores/integration-store'
import { useOrganization } from '@/contexts/OrganizationContext'

interface IntegratedPageLayoutProps {
  // Page header props
  title: string
  subtitle?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  badges?: Array<{
    label: string
    variant?: 'default' | 'secondary' | 'outline' | 'destructive'
    color?: string
  }>
  breadcrumbs?: Array<{
    label: string
    href?: string
    icon?: React.ComponentType<{ className?: string }>
  }>
  showBackButton?: boolean
  backHref?: string
  
  // Actions
  primaryAction?: {
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    primary?: boolean
    variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  }
  secondaryActions?: Array<{
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  }>
  moreActions?: Array<{
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  }>
  
  // Integration features
  enableBookmark?: boolean
  bookmarkData?: {
    type: 'asset' | 'organization' | 'meeting' | 'vault' | 'search'
    title: string
    href: string
    description?: string
  }
  
  // Entity context for integration features
  entityType?: 'asset' | 'organization' | 'meeting' | 'vault' | 'user'
  entityId?: string
  
  // Layout options
  showRightSidebar?: boolean
  rightSidebarContent?: 'activity' | 'workflow' | 'both' | 'custom'
  rightSidebarDefaultTab?: 'activity' | 'workflow'
  customRightSidebar?: React.ReactNode
  
  // Page content
  children: React.ReactNode
  
  // Performance tracking
  trackPageView?: boolean
  pageLoadMetadata?: Record<string, any>
  
  className?: string
}

export default function IntegratedPageLayout({
  title,
  subtitle,
  description,
  icon,
  iconColor,
  badges,
  breadcrumbs,
  showBackButton,
  backHref,
  primaryAction,
  secondaryActions,
  moreActions,
  enableBookmark = true,
  bookmarkData,
  entityType,
  entityId,
  showRightSidebar = true,
  rightSidebarContent = 'both',
  rightSidebarDefaultTab = 'activity',
  customRightSidebar,
  children,
  trackPageView = true,
  pageLoadMetadata = {},
  className = ''
}: IntegratedPageLayoutProps) {
  const pathname = usePathname()
  const { currentOrganization } = useOrganization()
  const { trackActivity, updateNavigationPath, setContext } = useIntegrationActions()

  // Track page view and set context on mount
  useEffect(() => {
    if (trackPageView) {
      trackActivity({
        type: 'view',
        entityType: entityType || 'asset',
        entityId: entityId || pathname,
        entityTitle: title,
        description: `Viewed ${title} page`,
        metadata: {
          organization: currentOrganization?.name,
          pathname,
          ...pageLoadMetadata
        }
      })
    }

    // Update navigation context
    updateNavigationPath(pathname)
    
    // Set page context for cross-page communication
    setContext({
      sourcePageType: entityType ? `${entityType}s` as any : undefined,
      sourcePageId: entityId,
      referrerData: {
        title,
        entityType,
        entityId,
        organization: currentOrganization?.name
      }
    })
  }, [
    trackPageView, 
    entityType, 
    entityId, 
    pathname, 
    title, 
    currentOrganization,
    pageLoadMetadata,
    trackActivity,
    updateNavigationPath,
    setContext
  ])

  // Generate bookmark data if not provided
  const defaultBookmarkData = bookmarkData || (enableBookmark ? {
    type: (entityType || 'asset') as any,
    title,
    href: pathname,
    description: subtitle || description
  } : undefined)

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Page Header */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        description={description}
        icon={icon}
        iconColor={iconColor}
        badges={badges}
        breadcrumbs={breadcrumbs}
        showBackButton={showBackButton}
        backHref={backHref}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        moreActions={moreActions}
        enableBookmark={enableBookmark}
        bookmarkData={defaultBookmarkData}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={showRightSidebar ? 'flex gap-6' : ''}>
          {/* Main content */}
          <div className={showRightSidebar ? 'flex-1 min-w-0' : 'w-full'}>
            {children}
          </div>

          {/* Right sidebar */}
          {showRightSidebar && (
            <div className="w-80 flex-shrink-0">
              <div className="sticky top-20 space-y-6">
                {rightSidebarContent === 'custom' && customRightSidebar ? (
                  customRightSidebar
                ) : rightSidebarContent === 'activity' ? (
                  <Card className="p-6">
                    <CrossPageActivityStream
                      entityType={entityType}
                      entityId={entityId}
                      limit={10}
                      compact
                      realTime
                    />
                  </Card>
                ) : rightSidebarContent === 'workflow' ? (
                  <Card className="p-6">
                    <WorkflowIntegration
                      entityType={entityType}
                      entityId={entityId}
                      compact
                    />
                  </Card>
                ) : rightSidebarContent === 'both' ? (
                  <Card className="overflow-hidden">
                    <Tabs defaultValue={rightSidebarDefaultTab} className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                        <TabsTrigger value="workflow">Workflow</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="activity" className="p-6 pt-4">
                        <CrossPageActivityStream
                          entityType={entityType}
                          entityId={entityId}
                          limit={10}
                          compact
                          realTime
                        />
                      </TabsContent>
                      
                      <TabsContent value="workflow" className="p-6 pt-4">
                        <WorkflowIntegration
                          entityType={entityType}
                          entityId={entityId}
                          showSuggestions={false}
                          compact
                        />
                      </TabsContent>
                    </Tabs>
                  </Card>
                ) : null}
                
                {/* Additional context cards */}
                {currentOrganization && entityType !== 'organization' && (
                  <Card className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {currentOrganization.name}
                        </h4>
                        <p className="text-xs text-gray-500">Current Organization</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}