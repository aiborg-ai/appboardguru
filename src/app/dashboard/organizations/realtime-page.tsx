/**
 * Enhanced Organizations Page with Real-time Capabilities
 * Demonstrates complete real-time data updates, pull-to-refresh, and connection management
 */

'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/features/dashboard/layout/DashboardLayout'
import { OrganizationSettings } from '@/features/organizations/OrganizationSettings'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useUserOrganizations } from '@/hooks/useOrganizations'
import { useOrganizationSubscription } from '@/hooks/useOrganizationSubscription'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import {
  ViewToggle,
  ItemCard,
  ItemList,
  ItemDetails,
  EmptyState,
  FilterBar,
  useViewPreferences
} from '@/features/shared/components/views'
import {
  RefreshIndicator,
  ConnectionStatus,
  NewDataBanner,
  PullToRefreshIndicator,
  AutoRefreshControls,
  StatusBar
} from '@/components/organizations/RefreshIndicator'
import { useUser } from '@/lib/stores'
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
  X,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function RealtimeOrganizationsPage() {
  const user = useUser()
  const { toast } = useToast()
  
  // Page state
  const [showSettings, setShowSettings] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Organization data
  const { 
    organizations: contextOrganizations, 
    currentOrganization,
    selectOrganization,
    isLoadingOrganizations 
  } = useOrganization()

  // Fetch user organizations with React Query
  const { 
    data: organizations = [], 
    isLoading, 
    error,
    refetch 
  } = useUserOrganizations(user?.id)

  // Use context organizations as fallback
  const allOrganizations = organizations.length > 0 ? organizations : contextOrganizations

  // Real-time subscription
  const realtime = useOrganizationSubscription({
    organizationIds: allOrganizations.map(org => org.id),
    autoRefresh: true,
    refreshInterval: 30000,
    backgroundRefresh: true,
    enablePresence: true,
    enableOfflineQueue: true,
    onDataUpdate: (event) => {
      // Show toast notification for important events
      switch (event.type) {
        case 'organization_created':
          toast({
            title: 'New organization created',
            description: `${event.data.name} has been added`,
            variant: 'success'
          })
          break
        case 'member_added':
          if (event.userId !== user?.id) {
            toast({
              title: 'New member joined',
              description: 'A new member has joined the organization',
              variant: 'success'
            })
          }
          break
        case 'organization_updated':
          toast({
            title: 'Organization updated',
            description: 'Organization details have been modified',
            variant: 'default'
          })
          break
      }
    },
    onError: (error) => {
      toast({
        title: 'Connection error',
        description: error,
        variant: 'destructive'
      })
    }
  })

  // Pull-to-refresh functionality
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await Promise.all([
        refetch(),
        realtime.refreshData()
      ])
    },
    threshold: 70,
    enabled: true
  })

  // View preferences
  const {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  } = useViewPreferences('card', 'organizations')

  // Event handlers
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
    let filtered = allOrganizations.filter(org => {
      const matchesSearch = !searchQuery || 
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = filterRole === 'all' || (org as any).userRole === filterRole
      const matchesStatus = filterStatus === 'all' || (org as any).membershipStatus === filterStatus
      
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
          aValue = new Date(a.created_at || Date.now()).getTime()
          bValue = new Date(b.created_at || Date.now()).getTime()
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
  }, [allOrganizations, searchQuery, filterRole, filterStatus, sortBy, sortOrder])

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetch(),
        realtime.refreshData()
      ])
      toast({
        title: 'Data refreshed',
        description: 'Organizations data has been updated',
        variant: 'success'
      })
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: 'Unable to refresh data. Please try again.',
        variant: 'destructive'
      })
    }
  }, [refetch, realtime, toast])

  // Set up touch events for pull-to-refresh
  useEffect(() => {
    const element = document.documentElement

    const handleTouchStart = (e: TouchEvent) => pullToRefresh.bind.onTouchStart(e)
    const handleTouchMove = (e: TouchEvent) => pullToRefresh.bind.onTouchMove(e)
    const handleTouchEnd = (e: TouchEvent) => pullToRefresh.bind.onTouchEnd(e)

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullToRefresh.bind])

  // Auto-acknowledge new data after 30 seconds
  useEffect(() => {
    if (realtime.hasNewData) {
      const timer = setTimeout(() => {
        realtime.acknowledgeNewData()
      }, 30000)

      return () => clearTimeout(timer)
    }
  }, [realtime.hasNewData, realtime.acknowledgeNewData])

  if (isLoadingOrganizations || isLoading) {
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
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        isVisible={pullToRefresh.state.isPulling || pullToRefresh.state.isRefreshing}
        isPulling={pullToRefresh.state.isPulling}
        pullDistance={pullToRefresh.state.pullDistance}
        threshold={70}
        onRefresh={async () => {}}
      />

      {/* New data banner */}
      <NewDataBanner
        hasNewData={realtime.hasNewData}
        newDataCount={realtime.newDataCount}
        onRefresh={() => {
          handleRefresh()
          realtime.acknowledgeNewData()
        }}
        onDismiss={realtime.acknowledgeNewData}
      />

      <div className="p-6 space-y-6">
        {/* Status bar */}
        <StatusBar
          connection={realtime.connection}
          refresh={realtime.refresh}
          autoRefreshInterval={30000}
          onRefresh={handleRefresh}
          onReconnect={realtime.reconnect}
          onToggleAutoRefresh={realtime.setAutoRefresh}
          onChangeRefreshInterval={realtime.setRefreshInterval}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Organizations
              {realtime.connection.status === 'connected' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 font-medium">Live</span>
                </div>
              )}
            </h1>
            <p className="text-gray-600 mt-2 flex items-center gap-2">
              Manage your organizations with real-time updates
              {realtime.presence.users.length > 1 && (
                <span className="text-sm text-blue-600">
                  • {realtime.presence.users.length - 1} others online
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ConnectionStatus
                status={realtime.connection.status}
                isOnline={realtime.connection.isOnline}
                lastConnected={realtime.connection.lastConnected}
                reconnectAttempts={realtime.connection.reconnectAttempts}
                latency={realtime.connection.latency}
                onReconnect={realtime.reconnect}
              />
              
              <RefreshIndicator
                isRefreshing={realtime.refresh.isRefreshing || pullToRefresh.state.isRefreshing}
                lastRefresh={realtime.refresh.lastRefresh}
                error={realtime.refresh.error}
                onRefresh={handleRefresh}
              />
            </div>

            <div className="w-px h-6 bg-gray-300" />

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
          filters={[
            {
              key: 'role',
              label: 'Role',
              type: 'select',
              icon: Users,
              options: [
                { value: 'owner', label: 'Owner', count: allOrganizations.filter(o => (o as any).userRole === 'owner').length },
                { value: 'admin', label: 'Admin', count: allOrganizations.filter(o => (o as any).userRole === 'admin').length },
                { value: 'member', label: 'Member', count: allOrganizations.filter(o => (o as any).userRole === 'member').length },
                { value: 'viewer', label: 'Viewer', count: allOrganizations.filter(o => (o as any).userRole === 'viewer').length }
              ]
            },
            {
              key: 'status',
              label: 'Status', 
              type: 'select',
              icon: Activity,
              options: [
                { value: 'active', label: 'Active', count: allOrganizations.filter(o => (o as any).membershipStatus === 'active').length },
                { value: 'pending_activation', label: 'Pending', count: allOrganizations.filter(o => (o as any).membershipStatus === 'pending_activation').length },
                { value: 'suspended', label: 'Suspended', count: allOrganizations.filter(o => (o as any).membershipStatus === 'suspended').length }
              ]
            }
          ]}
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
          totalCount={allOrganizations.length}
        />

        {/* Connection metrics */}
        {realtime.connection.status === 'connected' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Wifi className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-900 font-medium">Real-time active</span>
                </div>
                
                {realtime.metrics.averageLatency > 0 && (
                  <div className="text-blue-700">
                    Latency: {Math.round(realtime.metrics.averageLatency)}ms
                  </div>
                )}
                
                <div className="text-blue-700">
                  Uptime: {Math.round(realtime.metrics.uptime / 1000)}s
                </div>
              </div>

              <AutoRefreshControls
                isEnabled={realtime.refresh.auto}
                interval={30000}
                onToggle={realtime.setAutoRefresh}
                onIntervalChange={realtime.setRefreshInterval}
                lastRefresh={realtime.refresh.lastRefresh}
              />
            </div>
          </div>
        )}

        {/* Content with loading overlay */}
        <div className="relative">
          {/* Loading overlay */}
          <AnimatePresence>
            {(realtime.refresh.isRefreshing && !pullToRefresh.state.isRefreshing) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center"
              >
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-4 py-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Refreshing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Organizations content */}
          {filteredOrganizations.length === 0 ? (
            allOrganizations.length === 0 ? (
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
            <div className={cn(
              'transition-opacity duration-200',
              (realtime.refresh.isRefreshing && !pullToRefresh.state.isRefreshing) ? 'opacity-50' : 'opacity-100'
            )}>
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
                    const RoleIcon = getRoleIcon((org as any).userRole)
                    return (
                      <motion.div 
                        key={org.id} 
                        className="relative group"
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-6 transition-all duration-300 hover:shadow-lg cursor-pointer relative overflow-hidden">
                          {/* Real-time indicator */}
                          {realtime.connection.status === 'connected' && (
                            <div className="absolute top-3 right-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            </div>
                          )}

                          <div onClick={() => selectOrganization(org)}>
                            {/* Organization Header */}
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
                                  <h3 className="text-lg font-semibold text-gray-900 truncate">{org.name}</h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {org.industry && (
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {org.industry}
                                      </span>
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
                                  getRoleColor((org as any).userRole)
                                }`}>
                                  <RoleIcon className="h-3 w-3 mr-1" />
                                  {(org as any).userRole}
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {org.description || 'No description available'}
                            </p>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">{(org as any).memberCount || '1'}</div>
                                <div className="text-xs text-gray-500">Members</div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-semibold text-gray-900">
                                  {new Date(org.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-xs text-gray-500">Created</div>
                              </div>
                            </div>

                            {/* Current Organization Indicator */}
                            {currentOrganization?.id === org.id && (
                              <div className="absolute top-2 left-2">
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
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {viewMode === 'list' && (
                <ItemList
                  items={filteredOrganizations}
                  columns={[
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
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              {org.name}
                              {realtime.connection.status === 'connected' && (
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              )}
                            </div>
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
                        const RoleIcon = getRoleIcon((org as any).userRole)
                        return (
                          <div className="flex items-center space-x-2">
                            <RoleIcon className="h-4 w-4 text-gray-500" />
                            <span className="capitalize text-sm">{(org as any).userRole}</span>
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
                          (org as any).membershipStatus === 'active' ? 'bg-green-100 text-green-800' :
                          (org as any).membershipStatus === 'pending_activation' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {(org as any).membershipStatus}
                        </span>
                      )
                    },
                    {
                      key: 'created_at',
                      label: 'Created',
                      sortable: true,
                      render: (org) => (
                        <div className="text-sm text-gray-500">
                          {new Date(org.created_at || Date.now()).toLocaleDateString()}
                        </div>
                      )
                    }
                  ]}
                  actions={[
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
                  ]}
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
            </div>
          )}
        </div>

        {/* Current Organization Info */}
        {currentOrganization && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Currently working in: {currentOrganization.name}
                </p>
                <p className="text-xs text-blue-700">
                  All your activities and data will be associated with this organization
                </p>
              </div>
              {realtime.connection.status === 'connected' && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Wifi className="h-3 w-3" />
                  <span>Live updates</span>
                </div>
              )}
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
          subtitle={`${(selectedOrg as any)?.userRole} in organization`}
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
              value: (selectedOrg as any).userRole,
              type: 'badge',
              icon: Users
            },
            {
              label: 'Status',
              value: (selectedOrg as any).membershipStatus,
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
              value: selectedOrg.created_at,
              type: 'date',
              icon: CalendarIcon
            }
          ] : []}
        />
      </div>
    </DashboardLayout>
  )
}