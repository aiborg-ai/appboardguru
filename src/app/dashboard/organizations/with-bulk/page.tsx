'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { OrganizationSettings } from '@/features/organizations/OrganizationSettings'
import { useOrganization } from '@/contexts/OrganizationContext'

// Standard view components
import {
  ViewToggle,
  ItemList,
  ItemDetails,
  EmptyState,
  FilterBar,
  useViewPreferences
} from '@/features/shared/components/views'
import type {
  ViewMode,
  ItemCardAction,
  ListColumn,
  ListAction,
  FilterConfig
} from '@/features/shared/components/views'

// Bulk components
import { BulkActionBar } from '@/components/features/organizations/BulkActionBar'
import { SelectableOrganizationCard } from '@/components/molecules/cards/SelectableOrganizationCard'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import type { BulkOperation, BulkSelectionItem } from '@/hooks/useBulkSelection'

import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  Crown,
  Calendar,
  Edit,
  Eye,
  Share2,
  Copy,
  Globe,
  Activity,
  X,
  CheckSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/atoms/form/checkbox'

export default function OrganizationsWithBulkPage() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const { 
    organizations, 
    currentOrganization,
    selectOrganization,
    isLoadingOrganizations 
  } = useOrganization()

  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  } = useViewPreferences('card', 'organizations')

  // Filter and sort organizations
  const filteredOrganizations = useMemo(() => {
    let filtered = organizations.filter(org => {
      const matchesSearch = !searchQuery || 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = filterRole === 'all' || (org as any).role === filterRole
      const matchesStatus = filterStatus === 'all' || (org as any).status === filterStatus
      
      return matchesSearch && matchesRole && matchesStatus
    })

    // Sort organizations
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'created_at':
          aValue = new Date((a as any).created_at || Date.now()).getTime()
          bValue = new Date((b as any).created_at || Date.now()).getTime()
          break
        case 'member_count':
          aValue = (a as any).memberCount || 0
          bValue = (b as any).memberCount || 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [organizations, searchQuery, filterRole, filterStatus, sortBy, sortOrder])

  // Transform organizations to bulk selection items
  const bulkItems: BulkSelectionItem[] = filteredOrganizations.map(org => ({
    id: org.id,
    name: org.name,
    ...org
  }))

  // Define bulk operations
  const bulkOperations: BulkOperation[] = [
    {
      id: 'export-csv',
      label: 'Export CSV',
      icon: 'Download',
      variant: 'default',
      description: 'Export selected organizations to CSV file',
      execute: async (items: BulkSelectionItem[]) => {
        try {
          const response = await fetch('/api/organizations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'export-csv',
              organizationIds: items.map(item => item.id)
            })
          })

          const result = await response.json()
          
          if (result.success && result.data?.content) {
            // Create download link
            const blob = new Blob([result.data.content], { type: 'text/csv' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.data.filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
          }

          return result
        } catch (error) {
          return {
            success: false,
            message: 'Failed to export CSV',
            errors: [error]
          }
        }
      }
    },
    {
      id: 'bulk-share',
      label: 'Bulk Share',
      icon: 'Share2',
      variant: 'default',
      description: 'Share access to selected organizations',
      execute: async (items: BulkSelectionItem[]) => {
        const emails = prompt('Enter email addresses (comma-separated):')
        if (!emails) {
          return { success: false, message: 'Operation cancelled' }
        }

        try {
          const response = await fetch('/api/organizations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'share',
              organizationIds: items.map(item => item.id),
              options: {
                emails: emails.split(',').map(e => e.trim()).filter(e => e),
                role: 'viewer',
                message: 'You have been invited to join this organization.'
              }
            })
          })

          return await response.json()
        } catch (error) {
          return {
            success: false,
            message: 'Failed to share organizations',
            errors: [error]
          }
        }
      }
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: 'Archive',
      variant: 'destructive',
      description: 'Archive selected organizations (30-day recovery)',
      requiresConfirmation: true,
      confirmationTitle: 'Archive Organizations',
      confirmationMessage: 'Are you sure you want to archive the selected organizations? They can be recovered within 30 days.',
      execute: async (items: BulkSelectionItem[]) => {
        try {
          const response = await fetch('/api/organizations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'archive',
              organizationIds: items.map(item => item.id)
            })
          })

          return await response.json()
        } catch (error) {
          return {
            success: false,
            message: 'Failed to archive organizations',
            errors: [error]
          }
        }
      }
    }
  ]

  // Initialize bulk selection
  const {
    selectedIds,
    selectedItems,
    isAllSelected,
    isPartialSelected,
    selectionCount,
    selectAll,
    deselectAll,
    toggleItem,
    executeOperation,
    isExecuting,
    executingOperation,
    operationResults,
    clearResults,
    getSelectAllCheckboxProps
  } = useBulkSelection({
    items: bulkItems,
    operations: bulkOperations,
    keyboardShortcuts: true
  })

  // Event handlers
  const handleSettingsOpen = useCallback((orgId: string) => {
    setSelectedOrgId(orgId)
    setShowSettings(true)
  }, [])

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false)
    setSelectedOrgId(null)
  }, [])

  const handleViewDetails = useCallback((org: any) => {
    setSelectedOrg(org)
    setShowDetails(true)
  }, [])

  const handleSelectOrganization = useCallback((org: any) => {
    selectOrganization(org)
  }, [selectOrganization])

  // Utility functions
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown
      case 'admin': return Settings
      default: return Users
    }
  }

  // Configuration for filters
  const filterConfigs: FilterConfig[] = [
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      icon: Users,
      options: [
        { value: 'owner', label: 'Owner', count: organizations.filter(o => (o as any).role === 'owner').length },
        { value: 'admin', label: 'Admin', count: organizations.filter(o => (o as any).role === 'admin').length },
        { value: 'member', label: 'Member', count: organizations.filter(o => (o as any).role === 'member').length },
        { value: 'viewer', label: 'Viewer', count: organizations.filter(o => (o as any).role === 'viewer').length }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      icon: Activity,
      options: [
        { value: 'active', label: 'Active', count: organizations.filter(o => (o as any).status === 'active').length },
        { value: 'pending', label: 'Pending', count: organizations.filter(o => (o as any).status === 'pending').length },
        { value: 'suspended', label: 'Suspended', count: organizations.filter(o => (o as any).status === 'suspended').length }
      ]
    }
  ]

  if (isLoadingOrganizations) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <EmptyState
            variant="loading"
            title="Loading Organizations"
            description="Please wait while we fetch your organizations..."
          />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Organizations with Bulk Actions
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your organizations with powerful bulk operations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle
              currentView={viewMode}
              onViewChange={setViewMode}
              size="md"
            />
            <Link href="/dashboard/organizations/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Organization
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Bar with Bulk Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <FilterBar
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search organizations..."
                filters={filterConfigs}
                activeFilters={{ role: filterRole, status: filterStatus }}
                onFilterChange={(key, value) => {
                  if (key === 'role') setFilterRole(value)
                  if (key === 'status') setFilterStatus(value)
                }}
                sortOptions={[
                  { value: 'name', label: 'Name' },
                  { value: 'created_at', label: 'Created Date' },
                  { value: 'member_count', label: 'Member Count' }
                ]}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={(sortBy, order) => {
                  setSortBy(sortBy)
                  setSortOrder(order)
                }}
                onClearAll={() => {
                  setSearchQuery('')
                  setFilterRole('all')
                  setFilterStatus('all')
                }}
                resultCount={filteredOrganizations.length}
                totalCount={organizations.length}
                className="flex-1"
              />

              <div className="flex items-center gap-3">
                {/* Select All Checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    {...getSelectAllCheckboxProps()}
                    id="select-all"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    {isAllSelected ? 'Deselect All' : isPartialSelected ? 'Select All' : 'Select All'}
                  </label>
                </div>

                {/* Selection Count */}
                {selectionCount > 0 && (
                  <Badge variant="default" className="bg-blue-600">
                    {selectionCount} selected
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {filteredOrganizations.length === 0 ? (
          organizations.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No Organizations Yet"
              description="Create your first organization to get started with BoardGuru's enterprise board management platform."
              actions={[
                {
                  id: 'create',
                  label: 'Create Organization',
                  icon: Plus,
                  onClick: () => window.location.href = '/dashboard/organizations/create',
                  primary: true
                }
              ]}
            />
          ) : (
            <EmptyState
              variant="filtered"
              icon={Building2}
              title="No Organizations Match Filters"
              description="Try adjusting your search terms or filters to find organizations."
              actions={[
                {
                  id: 'clear',
                  label: 'Clear Filters',
                  icon: X,
                  onClick: () => {
                    setSearchQuery('')
                    setFilterRole('all')
                    setFilterStatus('all')
                  },
                  primary: true
                }
              ]}
            />
          )
        ) : (
          <>
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Organization Card - Always First */}
                <div className="relative group">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer">
                    <Link href="/dashboard/organizations/create" className="block h-full">
                      <div className="flex flex-col items-center justify-center h-40 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                          <Plus className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Create Organization</h3>
                        <p className="text-sm text-gray-600">Start a new organization and invite your team members</p>
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Selectable Organization Cards */}
                {filteredOrganizations.map((org, index) => (
                  <SelectableOrganizationCard
                    key={org.id}
                    organization={org}
                    isSelected={selectedIds.has(org.id)}
                    isCurrentOrg={currentOrganization?.id === org.id}
                    onToggleSelect={toggleItem}
                    onViewDetails={handleViewDetails}
                    onOpenSettings={handleSettingsOpen}
                    onSelectOrganization={handleSelectOrganization}
                    index={index}
                    showAnalytics={true}
                  />
                ))}
              </div>
            )}

            {/* Note: List view would need similar integration with SelectableOrganizationListItem component */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-center">
                  List view with bulk selection coming soon. 
                  <br />
                  Switch to card view to use bulk selection features.
                </p>
              </div>
            )}
          </>
        )}

        {/* Selection Status */}
        {selectionCount > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      {selectionCount} organization{selectionCount !== 1 ? 's' : ''} selected
                    </p>
                    <p className="text-xs text-blue-700">
                      Use keyboard shortcuts: Ctrl+A (select all), Delete (archive), Escape (clear)
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Organization Info */}
        {currentOrganization && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Currently working in: {currentOrganization.name}
                </p>
                <p className="text-xs text-blue-700">
                  All your activities and data will be associated with this organization
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Organization Settings Modal */}
        {showSettings && selectedOrgId && (
          <OrganizationSettings
            organizationId={selectedOrgId}
            onClose={handleSettingsClose}
          />
        )}

        {/* Details Panel */}
        <ItemDetails
          item={selectedOrg}
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          title={selectedOrg?.name || ''}
          subtitle={`${(selectedOrg as any)?.role} in organization`}
          description={selectedOrg?.description}
          icon={Building2}
          iconColor="text-blue-600"
          actions={[
            {
              id: 'edit',
              label: 'Edit',
              icon: Edit,
              onClick: () => {
                setShowDetails(false)
                handleSettingsOpen(selectedOrg.id)
              },
              primary: true
            },
            {
              id: 'share',
              label: 'Share',
              icon: Share2,
              onClick: () => console.log('Share organization')
            }
          ]}
          fields={selectedOrg ? [
            {
              label: 'Organization Name',
              value: selectedOrg.name,
              icon: Building2,
              copyable: true
            },
            {
              label: 'Your Role',
              value: (selectedOrg as any).role,
              type: 'badge',
              icon: Users
            },
            {
              label: 'Status',
              value: selectedOrg.status,
              type: 'badge',
              icon: Activity
            },
            {
              label: 'Member Count',
              value: `${(selectedOrg as any).memberCount || 0} members`,
              icon: Users
            },
            {
              label: 'Created Date',
              value: (selectedOrg as any).created_at,
              type: 'date',
              icon: Calendar
            }
          ] : []}
        />

        {/* Bulk Action Bar */}
        <BulkActionBar
          selectedItems={selectedItems}
          operations={bulkOperations}
          onExecuteOperation={executeOperation}
          onDeselectAll={deselectAll}
          isExecuting={isExecuting}
          executingOperation={executingOperation}
          operationResults={operationResults}
          onClearResults={clearResults}
        />
      </div>
    </DashboardLayout>
  )
}