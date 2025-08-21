'use client'

import React, { useState, useMemo } from 'react'
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
  FilterBar,
  useViewPreferences
} from '@/features/shared/components/views'
import type {
  ViewMode,
  ItemCardAction,
  ItemCardBadge,
  ItemCardMetric,
  ListColumn,
  ListAction,
  DetailTab,
  DetailAction,
  FilterConfig
} from '@/features/shared/components/views'
import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  Crown,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Share2,
  Copy,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar as CalendarIcon,
  Activity,
  FileText,
  X
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'

export default function OrganizationsPage() {
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

  // Configuration for list columns
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
            <div className="font-medium text-gray-900">{org.name}</div>
            {org.description && (
              <div className="text-sm text-gray-500 truncate max-w-xs">{org.description}</div>
            )}
          </div>
        </div>
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
      <div className="p-6 space-y-6">
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

        {/* Filter Bar */}
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
        />

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
                {filteredOrganizations.map((org) => {
                  const RoleIcon = getRoleIcon((org as any).role)
                  return (
                    <ItemCard
                      key={org.id}
                      id={org.id}
                      title={org.name}
                      description={org.description}
                      icon={Building2}
                      iconColor="text-blue-600"
                      badges={[
                        {
                          label: (org as any).role,
                          color: getRoleColor((org as any).role)
                        },
                        ...(currentOrganization?.id === org.id ? [{ label: 'Current', variant: 'outline' as const }] : [])
                      ]}
                      metrics={[
                        {
                          label: 'Members',
                          value: (org as any).memberCount || 0,
                          icon: Users,
                          color: 'text-gray-500'
                        },
                        {
                          label: 'Created',
                          value: new Date((org as any).created_at || Date.now()).toLocaleDateString(),
                          icon: CalendarIcon,
                          color: 'text-gray-500'
                        }
                      ]}
                      actions={getCardActions(org)}
                      onClick={() => selectOrganization(org)}
                      isSelected={currentOrganization?.id === org.id}
                      status={(org as any).status}
                      createdAt={(org as any).created_at}
                      lastActivity="2 hours ago"
                    />
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
                  setSortBy(column)
                  setSortOrder(order)
                }}
                selectedIds={currentOrganization ? [currentOrganization.id] : []}
                hover
                striped
              />
            )}

            {viewMode === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <ItemList
                    items={filteredOrganizations}
                    columns={listColumns.slice(0, 3)}
                    onItemClick={(org) => {
                      selectOrganization(org)
                      handleViewDetails(org)
                    }}
                    selectedIds={selectedOrg ? [selectedOrg.id] : []}
                    compact
                    hover
                  />
                </div>
                <div className="lg:sticky lg:top-6">
                  {selectedOrg ? (
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Organization Details</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="text-gray-900">{selectedOrg.name}</p>
                        </div>
                        {selectedOrg.description && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Description</label>
                            <p className="text-gray-900">{selectedOrg.description}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-gray-500">Your Role</label>
                          <p className="text-gray-900 capitalize">{(selectedOrg as any).role}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedOrg.status === 'active' ? 'bg-green-100 text-green-800' :
                            selectedOrg.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedOrg.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-dashed rounded-lg p-8 text-center">
                      <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Select an organization to view details</p>
                    </div>
                  )}
                </div>
              </div>
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
              icon: CalendarIcon
            }
          ] : []}
        />
      </div>
    </DashboardLayout>
  )
}