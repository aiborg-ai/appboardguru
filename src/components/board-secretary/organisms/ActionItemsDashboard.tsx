/**
 * Action Items Dashboard Organism Component
 * Comprehensive dashboard for managing and tracking action items
 */

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Badge } from '@/features/shared/ui/badge'
import { ActionItemCard, type ActionItemStatus } from '../molecules/ActionItemCard'
import { ActionItemPriorityBadge, type ActionItemPriority } from '../atoms/ActionItemPriorityBadge'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Search, 
  Filter, 
  AlertCircle,
  CheckSquare,
  Clock,
  TrendingUp,
  Users,
  Calendar,
  Target
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/shared/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/features/shared/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/features/shared/ui/skeleton'

interface ActionItem {
  id: string
  meeting_id?: string
  title: string
  description?: string
  assigned_to?: string
  assigned_by?: string
  due_date?: string
  priority: ActionItemPriority
  status: ActionItemStatus
  completion_percentage: number
  ai_extracted: boolean
  ai_confidence_score?: number
  context_reference?: string
  dependencies: string[]
  progress_notes: any[]
  completion_date?: string
  escalation_level: number
  reminders_sent: number
  tags: string[]
  created_by: string
  created_at: string
  updated_at: string
}

interface ActionItemsDashboardProps {
  actionItems: ActionItem[]
  loading?: boolean
  onCreateActionItem?: () => void
  onUpdateStatus?: (actionItemId: string, status: ActionItemStatus) => void
  onUpdateProgress?: (actionItemId: string, progress: number, notes?: string) => void
  onEditActionItem?: (actionItemId: string) => void
  onDeleteActionItem?: (actionItemId: string) => void
  onViewContext?: (actionItemId: string) => void
  onAssignUser?: (actionItemId: string) => void
  className?: string
}

export const ActionItemsDashboard: React.FC<ActionItemsDashboardProps> = ({
  actionItems,
  loading = false,
  onCreateActionItem,
  onUpdateStatus,
  onUpdateProgress,
  onEditActionItem,
  onDeleteActionItem,
  onViewContext,
  onAssignUser,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [dueDateFilter, setDueDateFilter] = useState<string>('all')

  // Filter and search action items
  const filteredActionItems = useMemo(() => {
    return actionItems.filter(item => {
      // Search filter
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          const isOverdue = item.due_date && 
            new Date(item.due_date) < new Date() && 
            item.status !== 'completed' && 
            item.status !== 'cancelled'
          if (!isOverdue) return false
        } else if (item.status !== statusFilter) {
          return false
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false
      }

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if (assigneeFilter === 'unassigned' && item.assigned_to) {
          return false
        } else if (assigneeFilter !== 'unassigned' && item.assigned_to !== assigneeFilter) {
          return false
        }
      }

      // Due date filter
      if (dueDateFilter !== 'all' && item.due_date) {
        const dueDate = new Date(item.due_date)
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)

        switch (dueDateFilter) {
          case 'today':
            if (dueDate.toDateString() !== today.toDateString()) return false
            break
          case 'tomorrow':
            if (dueDate.toDateString() !== tomorrow.toDateString()) return false
            break
          case 'this_week':
            if (dueDate < today || dueDate > nextWeek) return false
            break
          case 'overdue':
            if (dueDate >= today) return false
            break
        }
      }

      return true
    })
  }, [actionItems, searchQuery, statusFilter, priorityFilter, assigneeFilter, dueDateFilter])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = actionItems.length
    const pending = actionItems.filter(item => item.status === 'pending').length
    const inProgress = actionItems.filter(item => item.status === 'in_progress').length
    const completed = actionItems.filter(item => item.status === 'completed').length
    const overdue = actionItems.filter(item => {
      return item.due_date && 
        new Date(item.due_date) < new Date() && 
        item.status !== 'completed' && 
        item.status !== 'cancelled'
    }).length

    const highPriority = actionItems.filter(item => 
      ['high', 'urgent'].includes(item.priority) && 
      item.status !== 'completed'
    ).length

    const avgProgress = total > 0 
      ? actionItems.reduce((sum, item) => sum + item.completion_percentage, 0) / total 
      : 0

    return { total, pending, inProgress, completed, overdue, highPriority, avgProgress }
  }, [actionItems])

  // Group action items by status for tabs
  const itemsByStatus = useMemo(() => {
    const overdue = filteredActionItems.filter(item => {
      return item.due_date && 
        new Date(item.due_date) < new Date() && 
        item.status !== 'completed' && 
        item.status !== 'cancelled'
    })

    return {
      all: filteredActionItems,
      pending: filteredActionItems.filter(item => item.status === 'pending'),
      in_progress: filteredActionItems.filter(item => item.status === 'in_progress'),
      completed: filteredActionItems.filter(item => item.status === 'completed'),
      overdue
    }
  }, [filteredActionItems])

  const ActionItemCardSkeleton = () => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Action Items</h2>
          <p className="text-muted-foreground">
            Track and manage action items with AI assistance
          </p>
        </div>
        {onCreateActionItem && (
          <Button onClick={onCreateActionItem}>
            <Plus className="mr-2 h-4 w-4" />
            New Action Item
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(stats.avgProgress)}%
                </p>
                <Progress value={stats.avgProgress} className="h-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Alert */}
      {stats.highPriority > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  {stats.highPriority} high priority action items need attention
                </p>
                <p className="text-sm text-orange-600">
                  Review urgent and high priority items to prevent delays
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search action items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Due Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="today">Due Today</SelectItem>
                <SelectItem value="tomorrow">Due Tomorrow</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Items List with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            <Badge variant="secondary" className="ml-2">
              {itemsByStatus.all.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending
            <Badge variant="secondary" className="ml-2">
              {itemsByStatus.pending.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="flex items-center gap-2">
            In Progress
            <Badge variant="secondary" className="ml-2">
              {itemsByStatus.in_progress.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            Completed
            <Badge variant="secondary" className="ml-2">
              {itemsByStatus.completed.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            Overdue
            <Badge variant="destructive" className="ml-2">
              {itemsByStatus.overdue.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {Object.entries(itemsByStatus).map(([status, statusItems]) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, index) => (
                  <ActionItemCardSkeleton key={index} />
                ))}
              </div>
            ) : statusItems.length > 0 ? (
              <div className="space-y-4">
                {statusItems.map((item) => (
                  <ActionItemCard
                    key={item.id}
                    actionItem={item}
                    onUpdateStatus={onUpdateStatus}
                    onUpdateProgress={onUpdateProgress}
                    onEdit={onEditActionItem}
                    onDelete={onDeleteActionItem}
                    onViewContext={onViewContext}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No action items found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || dueDateFilter !== 'all'
                      ? "No action items match your current filters."
                      : "Get started by creating your first action item."
                    }
                  </p>
                  {onCreateActionItem && (
                    <Button onClick={onCreateActionItem}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Action Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

export default ActionItemsDashboard