'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Building2, 
  Calendar, 
  Package, 
  Users,
  ArrowRight,
  Link2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Card } from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { Input } from '@/features/shared/ui/input'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/features/shared/ui/dropdown-menu'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useIntegrationActions } from '@/lib/stores/integration-store'

interface WorkflowConnection {
  id: string
  type: 'asset-to-meeting' | 'meeting-to-asset' | 'organization-scoped' | 'vault-to-meeting'
  sourceType: 'asset' | 'meeting' | 'organization' | 'vault'
  sourceId: string
  sourceTitle: string
  targetType: 'asset' | 'meeting' | 'organization' | 'vault'
  targetId: string
  targetTitle: string
  relationship: string
  status: 'pending' | 'active' | 'completed' | 'expired'
  createdAt: string
  updatedAt: string
  metadata?: {
    dueDate?: string
    priority?: 'low' | 'medium' | 'high' | 'critical'
    assignee?: string
    notes?: string
  }
}

interface WorkflowSuggestion {
  id: string
  type: 'link-document' | 'schedule-meeting' | 'create-vault' | 'add-member'
  title: string
  description: string
  confidence: number
  entityId: string
  entityType: string
  suggestedAction: string
  actionHref: string
}

// Mock data - in real app this would come from API
const mockConnections: WorkflowConnection[] = [
  {
    id: '1',
    type: 'asset-to-meeting',
    sourceType: 'asset',
    sourceId: '1',
    sourceTitle: 'Q4 Financial Report 2024',
    targetType: 'meeting',
    targetId: '1',
    targetTitle: 'Board Meeting - January 2024',
    relationship: 'board-packet',
    status: 'active',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    metadata: {
      dueDate: '2024-01-25T09:00:00Z',
      priority: 'high',
      assignee: 'John Smith'
    }
  },
  {
    id: '2',
    type: 'vault-to-meeting',
    sourceType: 'vault',
    sourceId: '1',
    sourceTitle: 'Executive Documents',
    targetType: 'meeting',
    targetId: '1',
    targetTitle: 'Board Meeting - January 2024',
    relationship: 'secure-access',
    status: 'active',
    createdAt: '2024-01-12T11:00:00Z',
    updatedAt: '2024-01-12T11:00:00Z',
    metadata: {
      priority: 'critical'
    }
  },
  {
    id: '3',
    type: 'organization-scoped',
    sourceType: 'organization',
    sourceId: 'techvision',
    sourceTitle: 'TechVision Solutions',
    targetType: 'asset',
    targetId: '2',
    targetTitle: 'Strategic Plan 2024',
    relationship: 'organization-document',
    status: 'completed',
    createdAt: '2024-01-05T15:00:00Z',
    updatedAt: '2024-01-20T16:45:00Z',
    metadata: {
      priority: 'medium'
    }
  }
]

const mockSuggestions: WorkflowSuggestion[] = [
  {
    id: '1',
    type: 'link-document',
    title: 'Link Financial Report to Upcoming Meeting',
    description: 'The Q4 Financial Report should be linked to the January board meeting as part of the board packet.',
    confidence: 0.92,
    entityId: '1',
    entityType: 'asset',
    suggestedAction: 'Link to Meeting',
    actionHref: '/dashboard/meetings/1'
  },
  {
    id: '2',
    type: 'create-vault',
    title: 'Create Confidential Vault',
    description: 'Sensitive executive documents should be moved to a secure vault with restricted access.',
    confidence: 0.87,
    entityId: 'techvision',
    entityType: 'organization',
    suggestedAction: 'Create Vault',
    actionHref: '/dashboard/vaults/create'
  },
  {
    id: '3',
    type: 'schedule-meeting',
    title: 'Schedule Strategy Review',
    description: 'The Strategic Plan 2024 is ready and should trigger a strategy review meeting.',
    confidence: 0.78,
    entityId: '2',
    entityType: 'asset',
    suggestedAction: 'Schedule Meeting',
    actionHref: '/dashboard/meetings/create'
  }
]

interface WorkflowIntegrationProps {
  entityType?: 'asset' | 'meeting' | 'organization' | 'vault'
  entityId?: string
  showSuggestions?: boolean
  compact?: boolean
}

export default function WorkflowIntegration({ 
  entityType, 
  entityId, 
  showSuggestions = true,
  compact = false
}: WorkflowIntegrationProps) {
  const router = useRouter()
  const { currentOrganization } = useOrganization()
  const { trackActivity, setSharedData } = useIntegrationActions() || {}
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  // Filter connections based on entity
  const filteredConnections = useMemo(() => {
    let connections = mockConnections

    // Filter by entity if specified
    if (entityType && entityId) {
      connections = connections.filter(conn => 
        (conn.sourceType === entityType && conn.sourceId === entityId) ||
        (conn.targetType === entityType && conn.targetId === entityId)
      )
    }

    // Filter by organization if available
    if (currentOrganization) {
      // In a real app, you'd filter by organization scope
      // connections = connections.filter(conn => conn.organizationId === currentOrganization.id)
    }

    // Apply search filter
    if (searchQuery) {
      connections = connections.filter(conn =>
        conn.sourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.targetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.relationship.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      connections = connections.filter(conn => conn.status === filterStatus)
    }

    // Apply type filter
    if (filterType !== 'all') {
      connections = connections.filter(conn => conn.type === filterType)
    }

    return connections
  }, [entityType, entityId, currentOrganization, searchQuery, filterStatus, filterType])

  const handleConnectionClick = useCallback((connection: WorkflowConnection) => {
    // Track activity
    if (trackActivity) {
      trackActivity({
        type: 'view',
        entityType: connection.targetType,
        entityId: connection.targetId,
        entityTitle: connection.targetTitle,
        description: `Viewed via workflow connection from ${connection.sourceTitle}`
      })
    }

    // Set context for cross-page navigation
    if (setSharedData) {
      setSharedData('workflowContext', {
        fromConnection: connection.id,
        sourceEntity: {
          type: connection.sourceType,
          id: connection.sourceId,
          title: connection.sourceTitle
        }
      })
    }

    // Navigate to target
    const targetPath = connection.targetType === 'organization' 
      ? `/dashboard/organizations/${connection.targetId}`
      : `/dashboard/${connection.targetType}s/${connection.targetId}`
      
    router.push(targetPath)
  }, [trackActivity, setSharedData, router])

  const handleSuggestionAction = useCallback((suggestion: WorkflowSuggestion) => {
    // Track activity
    if (trackActivity) {
      trackActivity({
        type: 'create',
        entityType: suggestion.entityType as any,
        entityId: suggestion.entityId,
        entityTitle: suggestion.title,
        description: `Applied workflow suggestion: ${suggestion.suggestedAction}`
      })
    }

    router.push(suggestion.actionHref)
  }, [trackActivity, router])

  const getStatusColor = (status: WorkflowConnection['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'asset': return FileText
      case 'meeting': return Calendar
      case 'organization': return Building2
      case 'vault': return Package
      case 'user': return Users
      default: return FileText
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Related Items</h3>
          <Badge variant="secondary">{filteredConnections.length}</Badge>
        </div>
        <div className="space-y-2">
          {filteredConnections.slice(0, 3).map((connection) => {
            const TargetIcon = getTypeIcon(connection.targetType)
            return (
              <button
                key={connection.id}
                onClick={() => handleConnectionClick(connection)}
                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <TargetIcon className="h-4 w-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {connection.targetTitle}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {connection.relationship.replace('-', ' ')}
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="h-6 w-6 text-blue-600" />
            Workflow Connections
          </h2>
          <p className="text-gray-600 mt-1">
            Manage relationships between documents, meetings, and organizational activities
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Connection
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Status: {filterStatus === 'all' ? 'All' : filterStatus}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('pending')}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('completed')}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('expired')}>
                Expired
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Type: {filterType === 'all' ? 'All' : filterType.replace('-', ' ')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('asset-to-meeting')}>
                Asset to Meeting
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('meeting-to-asset')}>
                Meeting to Asset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('organization-scoped')}>
                Organization Scoped
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('vault-to-meeting')}>
                Vault to Meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Connections List */}
      {filteredConnections.length === 0 ? (
        <div className="text-center py-12">
          <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || filterStatus !== 'all' || filterType !== 'all'
              ? 'Try adjusting your filters to find connections.'
              : 'Create your first workflow connection to link related items.'
            }
          </p>
          <Button>Create Connection</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConnections.map((connection) => {
            const SourceIcon = getTypeIcon(connection.sourceType)
            const TargetIcon = getTypeIcon(connection.targetType)
            
            return (
              <Card key={connection.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Badge 
                      className={`${getStatusColor(connection.status)} border-none`}
                    >
                      {connection.status}
                    </Badge>
                    {connection.metadata?.priority && (
                      <div className={`text-sm font-medium ${getPriorityColor(connection.metadata.priority)}`}>
                        {connection.metadata.priority.toUpperCase()} PRIORITY
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit Connection</DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        Remove Connection
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    {/* Source */}
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <SourceIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {connection.sourceTitle}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {connection.sourceType}
                        </div>
                      </div>
                    </div>

                    {/* Connection */}
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {connection.relationship.replace('-', ' ')}
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>

                    {/* Target */}
                    <button
                      onClick={() => handleConnectionClick(connection)}
                      className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <TargetIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {connection.targetTitle}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {connection.targetType}
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="text-right text-xs text-gray-500">
                    {connection.metadata?.dueDate && (
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock className="h-3 w-3" />
                        <span>Due: {new Date(connection.metadata.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div>Updated: {new Date(connection.updatedAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {connection.metadata?.notes && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">{connection.metadata.notes}</div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Workflow Suggestions */}
      {showSuggestions && mockSuggestions.length > 0 && (
        <div className="mt-8">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Workflow Suggestions
            </h3>
            <p className="text-sm text-gray-600">
              AI-powered suggestions to improve your workflow connections
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(suggestion.confidence * 100)}% match
                    </Badge>
                  </div>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2">
                  {suggestion.title}
                </h4>
                
                <p className="text-sm text-gray-600 mb-4">
                  {suggestion.description}
                </p>
                
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleSuggestionAction(suggestion)}
                >
                  {suggestion.suggestedAction}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}