'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { useOrganization } from '@/contexts/OrganizationContext'
import { 
  Package, 
  Plus, 
  Settings, 
  Users, 
  Star,
  Clock,
  Archive,
  AlertTriangle,
  MoreVertical,
  Building2,
  FolderOpen,
  Search,
  Filter,
  Calendar,
  Shield,
  Zap
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import ViewToggle, { useViewPreferences } from '@/features/shared/components/views/ViewToggle'
import ItemCard from '@/features/shared/components/views/ItemCard'
import ItemList from '@/features/shared/components/views/ItemList'
import ItemDetails from '@/features/shared/components/views/ItemDetails'
import EmptyState from '@/features/shared/components/views/EmptyState'
import FilterBar from '@/features/shared/components/views/FilterBar'
import { cn } from '@/lib/utils'

type ViewMode = 'card' | 'list' | 'details'

export default function VaultsPage() {
  const { 
    vaults, 
    currentVault,
    currentOrganization,
    selectVault,
    isLoadingVaults 
  } = useOrganization()

  const { viewMode, setViewMode } = useViewPreferences('card', 'vaults-view')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedVault, setSelectedVault] = useState<any>(null)

  const getVaultStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600'
      case 'draft': return 'text-gray-600'
      case 'archived': return 'text-gray-400'
      case 'expired': return 'text-red-600'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-600'
    }
  }

  const getVaultStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Star
      case 'draft': return Clock
      case 'archived': return Archive
      case 'expired': return AlertTriangle
      case 'cancelled': return AlertTriangle
      default: return Package
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleVaultSelect = (vault: any) => {
    selectVault(vault)
    if (viewMode === 'details') {
      setSelectedVault(vault)
    } else {
      window.location.href = `/dashboard/vaults/${vault.id}`
    }
  }

  const filteredAndSortedVaults = useMemo(() => {
    let filtered = vaults || []

    if (searchQuery) {
      filtered = filtered.filter(vault => 
        vault.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vault.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter(vault => statusFilter.includes(vault.status))
    }

    if (priorityFilter.length > 0) {
      filtered = filtered.filter(vault => priorityFilter.includes(vault.priority))
    }

    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'priority':
          aValue = a.priority
          bValue = b.priority
          break
        case 'lastActivity':
          aValue = new Date(a.lastActivityAt || '1970-01-01')
          bValue = new Date(b.lastActivityAt || '1970-01-01')
          break
        case 'members':
          aValue = a.memberCount || 0
          bValue = b.memberCount || 0
          break
        case 'assets':
          aValue = a.assetCount || 0
          bValue = b.assetCount || 0
          break
        default:
          aValue = a.name
          bValue = b.name
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [vaults, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder])

  const filterConfigs = [
    {
      key: 'status',
      label: 'Status',
      type: 'multiselect' as const,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      selectedValues: statusFilter,
      onChange: setStatusFilter
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'multiselect' as const,
      options: [
        { value: 'urgent', label: 'Urgent' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ],
      selectedValues: priorityFilter,
      onChange: setPriorityFilter
    }
  ]

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'lastActivity', label: 'Last Activity' },
    { value: 'members', label: 'Members' },
    { value: 'assets', label: 'Assets' }
  ]

  const renderVaultCard = (vault: any) => {
    const StatusIcon = getVaultStatusIcon(vault.status)
    const isSelected = currentVault?.id === vault.id
    
    return (
      <ItemCard
        key={vault.id}
        id={vault.id}
        title={vault.name}
        subtitle={vault.description}
        icon={StatusIcon}
        iconColor={getVaultStatusColor(vault.status)}
        isSelected={isSelected}
        onClick={() => handleVaultSelect(vault)}
        className="group hover:shadow-xl transition-all duration-300"
      >
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge 
            variant="secondary" 
            className={cn("text-xs", 
              vault.status === 'active' ? 'bg-green-100 text-green-800' :
              vault.status === 'draft' ? 'bg-gray-100 text-gray-800' :
              vault.status === 'archived' ? 'bg-gray-100 text-gray-600' :
              'bg-red-100 text-red-800'
            )}
          >
            {vault.status}
          </Badge>
          {vault.priority !== 'medium' && (
            <Badge 
              variant="outline" 
              className={cn("text-xs", getPriorityColor(vault.priority))}
            >
              {vault.priority}
            </Badge>
          )}
          {isSelected && (
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Current
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {vault.memberCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4" />
              {vault.assetCount || 0}
            </span>
          </div>
        </div>
        
        {vault.lastActivityAt && (
          <div className="text-xs text-gray-400">
            Last activity: {new Date(vault.lastActivityAt).toLocaleDateString()}
          </div>
        )}
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Secure</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                window.location.href = `/dashboard/vaults/${vault.id}/settings`
              }}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                window.location.href = `/dashboard/vaults/${vault.id}`
              }}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Open Vault
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ItemCard>
    )
  }


  if (isLoadingVaults) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-10 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-7 w-7 text-blue-600" />
              Vaults
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your secure document vaults and collaborate with team members
            </p>
            {currentOrganization && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                <Building2 className="h-4 w-4" />
                <span>Organization: {currentOrganization.name}</span>
              </div>
            )}
          </div>
          <Link href="/dashboard/vaults/create">
            <Button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="h-4 w-4" />
              Create Vault
            </Button>
          </Link>
        </div>

        {/* View Controls */}
        <div className="flex flex-col lg:flex-row gap-4">
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search vaults..."
            filters={filterConfigs}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(sort, order) => {
              setSortBy(sort)
              setSortOrder(order)
            }}
            sortOptions={sortOptions}
          />
        </div>

        {/* Content Area */}
        {filteredAndSortedVaults.length === 0 ? (
          <EmptyState
            icon={vaults.length === 0 ? Package : Search}
            title={vaults.length === 0 ? "No Vaults Yet" : "No Vaults Found"}
            description={
              vaults.length === 0
                ? (currentOrganization 
                    ? `Create your first vault in ${currentOrganization.name} to securely store and share documents`
                    : 'Select an organization first, then create your first vault to get started')
                : "Try adjusting your search or filters to find the vaults you're looking for"
            }
            actions={
              vaults.length === 0 ? (
                currentOrganization ? [
                  {
                    id: 'create-vault',
                    label: 'Create Vault',
                    icon: Plus,
                    onClick: () => window.location.href = '/dashboard/vaults/create',
                    primary: true
                  }
                ] : [
                  {
                    id: 'go-to-organizations',
                    label: 'Go to Organizations',
                    icon: Building2,
                    onClick: () => window.location.href = '/dashboard/organizations',
                    variant: 'outline' as const
                  }
                ]
              ) : [
                {
                  id: 'clear-filters',
                  label: 'Clear Filters',
                  icon: AlertTriangle,
                  onClick: () => {
                    setSearchQuery('')
                    setStatusFilter([])
                    setPriorityFilter([])
                  },
                  variant: 'outline' as const
                }
              ]
            }
          />
        ) : (
          <>
            {viewMode === 'details' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
                <div className="lg:col-span-1 space-y-2 overflow-y-auto">
                  {filteredAndSortedVaults.map((vault) => {
                    const StatusIcon = getVaultStatusIcon(vault.status)
                    const isSelected = selectedVault?.id === vault.id || (!selectedVault && currentVault?.id === vault.id)
                    
                    return (
                      <div
                        key={vault.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all duration-200",
                          isSelected 
                            ? "border-blue-500 bg-blue-50 shadow-md" 
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                        onClick={() => {
                          setSelectedVault(vault)
                          selectVault(vault)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={cn(
                            "h-5 w-5 flex-shrink-0",
                            getVaultStatusColor(vault.status)
                          )} />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">{vault.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                variant="secondary" 
                                className={cn("text-xs", 
                                  vault.status === 'active' ? 'bg-green-100 text-green-800' :
                                  vault.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                  vault.status === 'archived' ? 'bg-gray-100 text-gray-600' :
                                  'bg-red-100 text-red-800'
                                )}
                              >
                                {vault.status}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {vault.assetCount || 0} assets
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="lg:col-span-2">
                  <ItemDetails
                    item={selectedVault || (currentVault && filteredAndSortedVaults.find(v => v.id === currentVault.id)) || filteredAndSortedVaults[0]}
                    isOpen={true}
                    onClose={() => setSelectedVault(null)}
                    title="Vault Details"
                    icon={Package}
                  >
                    {(() => {
                      const vault = selectedVault || (currentVault && filteredAndSortedVaults.find(v => v.id === currentVault.id)) || filteredAndSortedVaults[0];
                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Name</label>
                                <p className="mt-1 text-gray-900">{vault?.name}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <p className="mt-1 text-gray-600">{vault?.description || 'No description provided'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Status</label>
                                <div className="mt-1">
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      vault?.status === 'active' ? 'bg-green-100 text-green-800' :
                                      vault?.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                      vault?.status === 'archived' ? 'bg-gray-100 text-gray-600' :
                                      'bg-red-100 text-red-800'
                                    )}
                                  >
                                    {vault?.status}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Priority</label>
                                <div className="mt-1">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(getPriorityColor(vault?.priority))}
                                  >
                                    {vault?.priority}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Statistics</label>
                                <div className="mt-2 grid grid-cols-2 gap-4">
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <Users className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                                    <p className="text-lg font-semibold text-gray-900">{vault?.memberCount || 0}</p>
                                    <p className="text-xs text-gray-600">Members</p>
                                  </div>
                                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <FolderOpen className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                                    <p className="text-lg font-semibold text-gray-900">{vault?.assetCount || 0}</p>
                                    <p className="text-xs text-gray-600">Assets</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-gray-700">Activity</label>
                                <div className="mt-2 space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-500" />
                                    <span className="text-gray-600">Created:</span>
                                    <span className="text-gray-900">{vault?.created_at ? new Date(vault.created_at).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  {vault?.lastActivityAt && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Zap className="h-4 w-4 text-gray-500" />
                                      <span className="text-gray-600">Last activity:</span>
                                      <span className="text-gray-900">{new Date(vault.lastActivityAt).toLocaleDateString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="pt-4 space-y-2">
                                <Link href={`/dashboard/vaults/${vault?.id}`}>
                                  <Button className="w-full flex items-center gap-2">
                                    <FolderOpen className="h-4 w-4" />
                                    Open Vault
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/vaults/${vault?.id}/settings`}>
                                  <Button variant="outline" className="w-full flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Vault Settings
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </ItemDetails>
                </div>
              </div>
            ) : (
              <div className={cn(
                viewMode === 'card' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                  : "space-y-2"
              )}>
                {viewMode === 'card' 
                  ? filteredAndSortedVaults.map((vault) => renderVaultCard(vault))
                  : (
                    <ItemList
                      items={filteredAndSortedVaults}
                      columns={[
                        { key: 'name', label: 'Name', sortable: true },
                        { key: 'description', label: 'Description' },
                        { key: 'status', label: 'Status', sortable: true },
                        { key: 'priority', label: 'Priority', sortable: true },
                        { key: 'memberCount', label: 'Members', sortable: true },
                        { key: 'assetCount', label: 'Assets', sortable: true },
                        { key: 'lastActivityAt', label: 'Last Activity', sortable: true }
                      ]}
                      actions={[
                        {
                          id: 'open',
                          label: 'Open Vault',
                          icon: FolderOpen,
                          onClick: (vault) => {
                            window.location.href = `/dashboard/vaults/${vault.id}`
                          }
                        },
                        {
                          id: 'settings',
                          label: 'Settings',
                          icon: Settings,
                          onClick: (vault) => {
                            window.location.href = `/dashboard/vaults/${vault.id}/settings`
                          }
                        }
                      ]}
                      onItemClick={handleVaultSelect}
                      selectedIds={currentVault ? [currentVault.id] : []}
                    />
                  )
                }
              </div>
            )}
          </>
        )}

        {/* Current Vault Info */}
        {currentVault && viewMode !== 'details' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Currently working in vault: {currentVault.name}
                </p>
                <p className="text-xs text-blue-700">
                  All your document activities will be associated with this vault
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}