'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { OrganizationSettings } from '@/features/organizations/OrganizationSettings'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  ViewToggle,
  ItemCard,
  ItemList,
  ItemDetails,
  EmptyState,
  useViewPreferences
} from '@/features/shared/components/views'
import type {
  ViewMode,
  ItemCardAction,
  ListColumn,
  ListAction,
  DetailAction
} from '@/features/shared/components/views'

// Enhanced components
import EnhancedSearchBar from '@/components/features/organizations/EnhancedSearchBar'
import FilterPanel, { FilterPreset } from '@/components/features/organizations/FilterPanel'
import { useOrganizationFilters } from '@/hooks/useOrganizationFilters'

import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  Crown,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Share2,
  Globe,
  Activity,
  X,
  Filter,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  Zap
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'

// Custom presets for this organization page
const customPresets: FilterPreset[] = [
  {
    id: 'board-ready',
    name: 'Board Ready',
    description: 'Organizations ready for board meetings',
    icon: Star,
    filters: {
      statuses: ['active'],
      memberCountRange: [5, 1000],
      roles: ['owner', 'admin']
    }
  },
  {
    id: 'new-startups',
    name: 'New Startups',
    description: 'Recently created startup organizations',
    icon: Zap,
    filters: {
      sizes: ['startup', 'small'],
      lastActivityDays: 60
    }
  }
]

export default function EnhancedOrganizationsPage() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)

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

  // Enhanced filtering and search
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    sortConfig,
    setSortConfig,
    filteredOrganizations,
    totalCount,
    recentSearches,
    addRecentSearch,
    filterPresets,
    savePreset,
    deletePreset,
    getHighlightedText
  } = useOrganizationFilters({
    organizations,
    enableUrlSync: true,
    customPresets,
    defaultSort: { field: sortBy as any, order: sortOrder }
  })

  // Sync sort config with legacy sort state
  React.useEffect(() => {
    setSortBy(sortConfig.field as any)
    setSortOrder(sortConfig.order)
  }, [sortConfig, setSortBy, setSortOrder])

  const handleSettingsOpen = (orgId: string) => {
    setSelectedOrgId(orgId)
    setShowSettings(true)
  }

  const handleSettingsClose = () => {
    setShowSettings(false)
    setSelectedOrgId(null)
  }

  const handleViewDetails = (org: any) => {
    setSelectedOrg(org)
    setShowDetails(true)
  }

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

  // Configuration for list columns with highlighting
  const listColumns: ListColumn[] = [
    {
      key: 'name',
      label: 'Organization',
      sortable: true,
      render: (org) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div 
              className="font-medium text-gray-900"
              dangerouslySetInnerHTML={{ __html: getHighlightedText(org.name) }}
            />
            {org.description && (
              <div 
                className="text-sm text-gray-500 truncate max-w-xs"
                dangerouslySetInnerHTML={{ __html: getHighlightedText(org.description) }}
              />
            )}
          </div>
        </div>
      )
    },
    {
      key: 'industry',
      label: 'Industry',
      sortable: true,
      render: (org) => org.industry ? (
        <Badge variant="outline" className="text-xs">
          <span dangerouslySetInnerHTML={{ __html: getHighlightedText(org.industry) }} />
        </Badge>
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      )
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (org) => {
        const RoleIcon = getRoleIcon((org as any).role)
        return (
          <div className="flex items-center space-x-2">
            <RoleIcon className="h-4 w-4 text-gray-500" />
            <span className="capitalize text-sm">{(org as any).role}</span>
          </div>
        )
      }
    },
    {
      key: 'memberCount',
      label: 'Members',
      sortable: true,
      align: 'center' as const,
      render: (org) => (
        <div className="text-sm text-gray-900">{(org as any).memberCount || 0}</div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (org) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          (org as any).status === 'active' ? 'bg-green-100 text-green-800' :
          (org as any).status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {(org as any).status}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (org) => (
        <div className="text-sm text-gray-500">
          {new Date((org as any).created_at || Date.now()).toLocaleDateString()}
        </div>
      )
    }
  ]

  // Actions configuration
  const getCardActions = (org: any): ItemCardAction[] => [
    {
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: () => handleViewDetails(org)
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: () => handleSettingsOpen(org.id)
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: () => console.log('Share organization:', org.name)
    }
  ]

  const listActions: ListAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: Eye,
      onClick: (org) => handleViewDetails(org)
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: (org) => handleSettingsOpen(org.id)
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      onClick: (org) => console.log('Share organization:', org.name)
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
      <div className="flex h-full">
        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                Organizations
              </h1>
              <p className="text-gray-600 mt-2">
                Manage your organizations and switch between different workspaces
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
                  {/* Result Count */}
                  <div className="text-sm text-gray-600 whitespace-nowrap">
                    {filteredOrganizations.length === totalCount ? (
                      `${totalCount} organizations`
                    ) : (
                      `${filteredOrganizations.length} of ${totalCount} organizations`
                    )}
                  </div>

                  {/* Sort Options */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortConfig({
                        field: sortConfig.field,
                        order: sortConfig.order === 'asc' ? 'desc' : 'asc'
                      })}
                      className="text-xs"
                    >
                      {sortConfig.order === 'asc' ? '↑' : '↓'} 
                      {sortConfig.field.replace('_', ' ').toUpperCase()}
                    </Button>
                  </div>

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

              {/* Active Filter Tags */}
              {(activeFilterCount > 0 || searchQuery) && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                  {searchQuery && (
                    <Badge 
                      variant="secondary" 
                      className="flex items-center gap-1 bg-blue-100 text-blue-700"
                    >
                      Search: "{searchQuery}"
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {filters.industries.map(industry => (
                    <Badge 
                      key={`industry-${industry}`}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Industry: {industry}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilters({
                          ...filters,
                          industries: filters.industries.filter(i => i !== industry)
                        })}
                      />
                    </Badge>
                  ))}
                  {filters.roles.map(role => (
                    <Badge 
                      key={`role-${role}`}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      Role: {role}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setFilters({
                          ...filters,
                          roles: filters.roles.filter(r => r !== role)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              )}
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
                      clearFilters()
                      setSearchQuery('')
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

                  {/* Organization Cards */}
                  {filteredOrganizations.map((org) => {
                    const RoleIcon = getRoleIcon((org as any).userRole || (org as any).role)
                    return (
                      <div key={org.id} className="relative group">
                        <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer">
                          <div onClick={() => selectOrganization(org)}>
                            {/* Organization Header with highlighting */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                                  {org.logo_url ? (
                                    <img 
                                      src={org.logo_url} 
                                      alt={`${org.name} logo`} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.nextElementSibling!.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <Building2 className={`h-6 w-6 text-blue-600 ${org.logo_url ? 'hidden' : ''}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 
                                    className="text-lg font-semibold text-gray-900 truncate"
                                    dangerouslySetInnerHTML={{ __html: getHighlightedText(org.name) }}
                                  />
                                  <div className="flex items-center space-x-2 mt-1">
                                    {org.industry && (
                                      <span 
                                        className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"
                                        dangerouslySetInnerHTML={{ __html: getHighlightedText(org.industry) }}
                                      />
                                    )}
                                    {org.organization_size && (
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded capitalize">
                                        {org.organization_size}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Role Badge */}
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  getRoleColor((org as any).userRole || (org as any).role)
                                }`}>
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {(org as any).userRole || (org as any).role}
                                </span>
                              </div>
                            </div>

                            {/* Description with highlighting */}
                            <div 
                              className="text-sm text-gray-600 mb-4 line-clamp-2"
                              dangerouslySetInnerHTML={{ 
                                __html: getHighlightedText(org.description || 'No description available') 
                              }}
                            />

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">{(org as any).memberCount || '1'}</div>
                                <div className="text-xs text-gray-500">Members</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">
                                  {new Date((org as any).created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-xs text-gray-500">Created</div>
                              </div>
                            </div>

                            {/* Current Organization Indicator */}
                            {currentOrganization?.id === org.id && (
                              <div className="absolute top-2 right-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewDetails(org)
                                }}
                                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                <Eye className="h-4 w-4 inline mr-1" />
                                View
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSettingsOpen(org.id)
                                }}
                                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                <Settings className="h-4 w-4 inline mr-1" />
                                Settings
                              </button>
                            </div>
                            {org.website && (
                              <a
                                href={org.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                <Globe className="h-4 w-4 inline mr-1" />
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {viewMode === 'list' && (
                <ItemList
                  items={filteredOrganizations}
                  columns={listColumns}
                  actions={listActions}
                  onItemClick={(org) => selectOrganization(org)}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={(column, order) => {
                    setSortConfig({ field: column as any, order })
                  }}
                  selectedIds={currentOrganization ? [currentOrganization.id] : []}
                  hover
                  striped
                />
              )}
            </>
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
                  onPresetSave={savePreset}
                  onPresetDelete={deletePreset}
                />
              </div>
            </div>
          </>
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
      </div>
    </DashboardLayout>
  )
}