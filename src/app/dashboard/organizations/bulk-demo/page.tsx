'use client'

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'

import React, { useState, useCallback, Suspense } from 'react'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganization } from '@/contexts/OrganizationContext'

// Bulk components
import { BulkActionBar } from '@/components/features/organizations/BulkActionBar'
import { SelectableOrganizationCard } from '@/components/molecules/cards/SelectableOrganizationCard'
import { useBulkSelection, createBulkOperations } from '@/hooks/useBulkSelection'
import type { BulkOperation, BulkSelectionItem } from '@/hooks/useBulkSelection'

// Enhanced components
import EnhancedSearchBar from '@/components/features/organizations/EnhancedSearchBar'
import FilterPanel from '@/components/features/organizations/FilterPanel'
import { useOrganizationFilters } from '@/hooks/useOrganizationFilters'

import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  Crown,
  Eye,
  Share2,
  Globe,
  Activity,
  X,
  Filter,
  CheckSquare,
  Square,
  Download,
  Archive,
  UserPlus,
  BarChart3,
  Copy,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/atoms/form/checkbox'
import { cn } from '@/lib/utils'
import Link from 'next/link'

function BulkDemoContent() {
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const { 
    organizations, 
    currentOrganization,
    selectOrganization,
    isLoadingOrganizations 
  } = useOrganization()

  // Enhanced filtering and search
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    filteredOrganizations,
    totalCount,
    recentSearches,
    addRecentSearch,
    filterPresets
  } = useOrganizationFilters({
    organizations,
    enableUrlSync: false // Disable for demo
  })

  // Transform organizations to bulk selection items
  const bulkItems: BulkSelectionItem[] = filteredOrganizations.map(org => ({
    id: org.id,
    name: org.name,
    ...org
  }))

  // Define bulk operations with API integration
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
    },
    {
      id: 'update-settings',
      label: 'Update Settings',
      icon: 'Settings',
      variant: 'default',
      description: 'Update common settings across organizations',
      execute: async (items: BulkSelectionItem[]) => {
        const newDescription = prompt('Enter new description (or leave empty to skip):')
        const newWebsite = prompt('Enter new website (or leave empty to skip):')
        
        const settings: any = {}
        if (newDescription) settings.description = newDescription
        if (newWebsite) settings.website = newWebsite

        if (Object.keys(settings).length === 0) {
          return { success: false, message: 'No settings provided' }
        }

        try {
          const response = await fetch('/api/organizations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'update-settings',
              organizationIds: items.map(item => item.id),
              options: { settings }
            })
          })

          return await response.json()
        } catch (error) {
          return {
            success: false,
            message: 'Failed to update settings',
            errors: [error]
          }
        }
      }
    },
    {
      id: 'generate-reports',
      label: 'Generate Reports',
      icon: 'BarChart3',
      variant: 'default',
      description: 'Create analytics reports for selected organizations',
      execute: async (items: BulkSelectionItem[]) => {
        const includeMembers = confirm('Include member details in reports?')

        try {
          const response = await fetch('/api/organizations/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'generate-reports',
              organizationIds: items.map(item => item.id),
              options: { 
                reportType: 'summary',
                includeMembers
              }
            })
          })

          const result = await response.json()
          
          if (result.success && result.data?.reports) {
            // Create downloadable report
            const reportJson = JSON.stringify(result.data, null, 2)
            const blob = new Blob([reportJson], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `organization-reports-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
          }

          return result
        } catch (error) {
          return {
            success: false,
            message: 'Failed to generate reports',
            errors: [error]
          }
        }
      }
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: 'Copy',
      variant: 'default',
      description: 'Create copies of selected organizations',
      execute: async (items: BulkSelectionItem[]) => {
        // This would be a more complex operation requiring backend support
        return {
          success: false,
          message: 'Duplicate feature coming soon!'
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
    totalCount: bulkTotalCount,
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
  const handleViewDetails = useCallback((org: any) => {
    console.log('View details for:', org.name)
  }, [])

  const handleOpenSettings = useCallback((orgId: string) => {
    console.log('Open settings for org:', orgId)
  }, [])

  const handleSelectOrganization = useCallback((org: any) => {
    selectOrganization(org)
  }, [selectOrganization])

  if (isLoadingOrganizations) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading organizations...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                Bulk Actions Demo
              </h1>
              <p className="text-gray-600 mt-2">
                Demonstration of bulk selection and operations for organization management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={cn(
                  "flex items-center gap-2",
                  showFilterPanel && "bg-blue-50 border-blue-200 text-blue-700"
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <Link href="/dashboard/organizations/create">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                How to Use Bulk Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Selection:</strong> Hover over organization cards to see checkboxes. Click to select/deselect.</p>
              <p><strong>Keyboard Shortcuts:</strong> Ctrl+A (select all), Ctrl+I (invert selection), Escape (clear selection), Delete (archive selected)</p>
              <p><strong>Bulk Operations:</strong> Select organizations to see the floating action bar with available operations.</p>
              <p><strong>Operations Available:</strong> Export CSV, Bulk Share, Archive, Update Settings, Generate Reports</p>
            </CardContent>
          </Card>

          {/* Enhanced Search Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <EnhancedSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search organizations by name, description, or industry..."
                  organizations={organizations}
                  recentSearches={recentSearches}
                  onRecentSearchAdd={addRecentSearch}
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

                  {/* Result Count */}
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    {filteredOrganizations.length === totalCount ? (
                      `${totalCount} organizations`
                    ) : (
                      `${filteredOrganizations.length} of ${totalCount} organizations`
                    )}
                  </div>

                  {/* Selection Count */}
                  {selectionCount > 0 && (
                    <Badge variant="default" className="bg-blue-600">
                      {selectionCount} selected
                    </Badge>
                  )}

                  {/* Clear All Filters */}
                  {(activeFilterCount > 0 || searchQuery) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        clearFilters()
                        setSearchQuery('')
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Organizations Grid */}
          {filteredOrganizations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Found</h3>
                <p className="text-gray-600 mb-4">
                  {organizations.length === 0 
                    ? "Create your first organization to get started."
                    : "Try adjusting your search or filters."
                  }
                </p>
                <Link href="/dashboard/organizations/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Organization
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
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
                  onOpenSettings={handleOpenSettings}
                  onSelectOrganization={handleSelectOrganization}
                  index={index}
                  showAnalytics={true}
                />
              ))}
            </div>
          )}

          {/* Demo Info Panel */}
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
                        The bulk action bar should appear at the bottom of the screen
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
        </div>

        {/* Filter Panel - Slide out from right */}
        {showFilterPanel && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
              onClick={() => setShowFilterPanel(false)}
            />
            
            {/* Filter Panel */}
            <div className={cn(
              "fixed right-0 top-0 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto",
              "lg:relative lg:shadow-none lg:transform-none lg:transition-none",
              showFilterPanel ? "translate-x-0" : "translate-x-full"
            )}>
              <div className="p-4 lg:p-0">
                <div className="flex items-center justify-between mb-4 lg:hidden">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowFilterPanel(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <FilterPanel
                  organizations={organizations}
                  filters={filters}
                  onFiltersChange={setFilters}
                  presets={filterPresets}
                  onPresetSave={() => {}} // Disabled for demo
                  onPresetDelete={() => {}} // Disabled for demo
                />
              </div>
            </div>
          </>
        )}

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

export default function BulkDemoPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading bulk demo...</p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <BulkDemoContent />
    </Suspense>
  )
}