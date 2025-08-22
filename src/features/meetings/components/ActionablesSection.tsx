'use client'

import React, { useState, useMemo } from 'react'
import { ActionableBoard } from './atomic/organisms'
import { CreateActionableModal } from './CreateActionableModal'
import { ActionableDetailsModal } from './ActionableDetailsModal'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'
import { 
  MeetingActionable, 
  ActionableStatus, 
  ActionablePriority,
  ActionableCategory,
  CreateActionableRequest 
} from '@/types/meetings'

interface ActionablesSectionProps {
  meetingId: string
  actionables: MeetingActionable[]
  canManage: boolean // true for superusers and meeting organizers
  onCreateActionable: (data: CreateActionableRequest) => Promise<void>
  onUpdateActionable: (id: string, data: Partial<MeetingActionable>) => Promise<void>
  onDeleteActionable: (id: string) => Promise<void>
}

/**
 * ActionablesSection - Refactored to use atomic design components
 * 
 * This component now uses the atomic design pattern with:
 * - ActionableBoard organism for kanban-style management
 * - Built-in filtering, sorting, and statistics
 * - Multiple view modes (board, list)
 * - Consistent styling and accessibility
 */
export function ActionablesSection({
  meetingId,
  actionables,
  canManage,
  onCreateActionable,
  onUpdateActionable,
  onDeleteActionable
}: ActionablesSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedActionable, setSelectedActionable] = useState<MeetingActionable | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [filters, setFilters] = useState<{
    status: ActionableStatus | 'all'
    priority: ActionablePriority | 'all'
    assignee: 'all' | 'me'
    search: string
  }>({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    search: ''
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Convert MeetingActionable to ActionableItemProps format and group by status
  const actionableData = useMemo(() => {
    const filtered = actionables
      .filter(actionable => {
        const matchesStatus = filters.status === 'all' || actionable.status === filters.status
        const matchesPriority = filters.priority === 'all' || actionable.priority === filters.priority
        const matchesAssignee = filters.assignee === 'all' // Simplified for now
        const matchesSearch = filters.search === '' || 
          actionable.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          actionable.description.toLowerCase().includes(filters.search.toLowerCase())
        
        return matchesStatus && matchesPriority && matchesAssignee && matchesSearch
      })

    const converted = filtered.map(actionable => {
      const daysUntilDue = getDaysUntilDue(actionable.dueDate)
      const isOverdue = daysUntilDue < 0

      return {
        id: actionable.id,
        actionNumber: actionable.actionNumber,
        title: actionable.title,
        description: actionable.description,
        status: actionable.status,
        priority: actionable.priority,
        category: actionable.category,
        dueDate: actionable.dueDate,
        progress: actionable.progressPercentage,
        assignee: {
          id: actionable.assignedTo,
          name: 'Team Member', // This would be resolved from user data
          avatar: undefined
        },
        effort: {
          estimated: actionable.estimatedEffortHours,
          actual: actionable.actualEffortHours
        },
        dependencies: {
          dependsOn: actionable.dependsOnActionableIds.length,
          blocks: actionable.blocksActionableIds.length
        },
        actions: {
          onView: () => setSelectedActionable(actionable),
          onEdit: canManage ? () => {
            console.log('Edit actionable:', actionable.id)
          } : undefined,
          onDelete: canManage ? () => onDeleteActionable(actionable.id) : undefined,
          onUpdateProgress: canManage ? (progress: number) => {
            onUpdateActionable(actionable.id, { progressPercentage: progress })
          } : undefined
        },
        canManage
      }
    })

    // Group by status for board view
    const grouped: Record<ActionableStatus, typeof converted> = {
      assigned: [],
      in_progress: [],
      blocked: [],
      under_review: [],
      completed: [],
      cancelled: [],
      overdue: []
    }

    converted.forEach(item => {
      grouped[item.status].push(item)
    })

    return grouped
  }, [actionables, filters, canManage, onUpdateActionable, onDeleteActionable])

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleCreateActionable = () => {
    setShowCreateModal(true)
  }

  const handleStatusChange = (actionableId: string, newStatus: ActionableStatus) => {
    onUpdateActionable(actionableId, { status: newStatus })
  }

  // Statistics cards
  const renderStatistics = () => {
    const stats = {
      total: actionables.length,
      completed: actionables.filter(a => a.status === 'completed').length,
      inProgress: actionables.filter(a => a.status === 'in_progress').length,
      overdue: actionables.filter(a => 
        a.status === 'overdue' || 
        (a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.dueDate) < new Date())
      ).length,
      assignedToMe: 0 // Simplified for now without currentUser context
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-blue-600">☑️</div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-green-600">✅</div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-yellow-600">🔄</div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-red-600">⚠️</div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 text-purple-600">👤</div>
              <div>
                <p className="text-sm text-gray-600">Assigned to Me</p>
                <p className="text-2xl font-bold">{stats.assignedToMe}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filters component
  const renderFilters = () => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search actionables..."
              value={filters.search}
              onChange={(e) => handleFiltersChange({ search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFiltersChange({ status: e.target.value as ActionableStatus | 'all' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          
          <select
            value={filters.priority}
            onChange={(e) => handleFiltersChange({ priority: e.target.value as ActionablePriority | 'all' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <select
            value={filters.assignee}
            onChange={(e) => handleFiltersChange({ assignee: e.target.value as 'all' | 'me' })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Assignees</option>
            <option value="me">Assigned to Me</option>
          </select>
        </div>
      </CardContent>
    </Card>
  )

  // View mode tabs
  const renderViewTabs = () => (
    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'board' | 'list')} className="mb-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="board">Board View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>
        
        {canManage && (
          <Button onClick={handleCreateActionable}>
            Add Actionable
          </Button>
        )}
      </div>
      
      <TabsContent value="board" className="mt-6">
        <ActionableBoard
          actionables={actionableData}
          loading={false}
          actions={{
            onCreate: canManage ? handleCreateActionable : undefined,
            onStatusChange: canManage ? handleStatusChange : undefined
          }}
          dragEnabled={canManage}
          layout="horizontal"
        />
      </TabsContent>
      
      <TabsContent value="list" className="mt-6">
        {/* List view would use a different organism or the same board with different layout */}
        <ActionableBoard
          actionables={actionableData}
          loading={false}
          actions={{
            onCreate: canManage ? handleCreateActionable : undefined,
            onStatusChange: canManage ? handleStatusChange : undefined
          }}
          dragEnabled={false}
          layout="vertical"
          columns={{
            visible: ['assigned', 'in_progress', 'under_review', 'completed']
          }}
        />
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {renderStatistics()}

      {/* Filters */}
      {renderFilters()}

      {/* View Tabs and Content */}
      {renderViewTabs()}

      {/* Modals */}
      {showCreateModal && (
        <CreateActionableModal
          meetingId={meetingId}
          onSubmit={onCreateActionable}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      
      {selectedActionable && (
        <ActionableDetailsModal
          actionable={selectedActionable}
          canManage={canManage}
          onUpdate={onUpdateActionable}
          onClose={() => setSelectedActionable(null)}
        />
      )}
    </div>
  )
}