'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar,
  Plus,
  Filter,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Badge,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2
} from 'lucide-react'

interface ActionItem {
  id: string
  title: string
  description?: string
  assignedTo?: string
  assignedToName?: string
  dueDate?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  category: string
  estimatedHours?: number
  urgencyScore: number
  complexityScore: number
  extractionConfidence: number
  createdAt: string
  transcriptionId?: string
  contextSnippet?: string
}

interface ActionItemAnalytics {
  totalAssigned: number
  pendingCount: number
  inProgressCount: number
  completedCount: number
  overdueCount: number
  dueThisWeek: number
  avgUrgency: number
  avgComplexity: number
}

interface ActionItemsDashboardProps {
  organizationId?: string
  userId?: string
  showAnalytics?: boolean
  compactView?: boolean
}

export default function ActionItemsDashboard({
  organizationId,
  userId,
  showAnalytics = true,
  compactView = false
}: ActionItemsDashboardProps) {
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [analytics, setAnalytics] = useState<ActionItemAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    status?: string
    priority?: string
    category?: string
  }>({})
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'urgency' | 'created'>('urgency')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadActionItems()
    if (showAnalytics) {
      loadAnalytics()
    }
  }, [organizationId, userId, filter])

  const loadActionItems = async () => {
    try {
      const params = new URLSearchParams()
      if (organizationId) params.append('organizationId', organizationId)
      if (userId) params.append('assignedTo', userId)
      if (filter.status) params.append('status', filter.status)
      if (filter.priority) params.append('priority', filter.priority)

      const response = await fetch(`/api/action-items?${params}`)
      const data = await response.json()

      if (data.success) {
        setActionItems(data.data)
      }
    } catch (error) {
      console.error('Error loading action items:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams()
      if (organizationId) params.append('organizationId', organizationId)
      if (userId) params.append('userId', userId)

      const response = await fetch(`/api/action-items/analytics?${params}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics({
          totalAssigned: data.data.total_assigned || data.data.total_items || 0,
          pendingCount: data.data.pending_count || 0,
          inProgressCount: data.data.in_progress_count || 0,
          completedCount: data.data.completed_count || data.data.completed_items || 0,
          overdueCount: data.data.overdue_count || data.data.overdue_items || 0,
          dueThisWeek: data.data.due_this_week || 0,
          avgUrgency: data.data.avg_urgency || data.data.avg_urgency_score || 0,
          avgComplexity: data.data.avg_complexity || data.data.avg_complexity_score || 0
        })
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const updateActionItem = async (id: string, updates: Partial<ActionItem>) => {
    try {
      const response = await fetch(`/api/action-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        await loadActionItems()
        if (showAnalytics) await loadAnalytics()
      }
    } catch (error) {
      console.error('Error updating action item:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'in_progress': return 'text-blue-600 bg-blue-50'
      case 'pending': return 'text-gray-600 bg-gray-50'
      case 'cancelled': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getUrgencyIndicator = (urgencyScore: number) => {
    if (urgencyScore >= 80) return { color: 'bg-red-500', label: 'Critical' }
    if (urgencyScore >= 60) return { color: 'bg-orange-500', label: 'High' }
    if (urgencyScore >= 40) return { color: 'bg-yellow-500', label: 'Medium' }
    return { color: 'bg-green-500', label: 'Low' }
  }

  const sortedItems = [...actionItems].sort((a, b) => {
    switch (sortBy) {
      case 'dueDate':
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      case 'urgency':
        return b.urgencyScore - a.urgencyScore
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      default:
        return 0
    }
  })

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {showAnalytics && analytics && !compactView && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{analytics.totalAssigned}</div>
                <div className="text-sm text-gray-600">Total Assigned</div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{analytics.completedCount}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{analytics.dueThisWeek}</div>
                <div className="text-sm text-gray-600">Due This Week</div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{analytics.overdueCount}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="input-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filter.priority || ''}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value || undefined })}
            className="input-sm"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="input-sm"
        >
          <option value="urgency">Sort by Urgency</option>
          <option value="dueDate">Sort by Due Date</option>
          <option value="priority">Sort by Priority</option>
          <option value="created">Sort by Created</option>
        </select>
      </div>

      {/* Action Items List */}
      <div className="space-y-3">
        {sortedItems.length === 0 ? (
          <div className="card p-8 text-center">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Action Items</h3>
            <p className="text-gray-600">No action items found matching your filters.</p>
          </div>
        ) : (
          sortedItems.map((item) => {
            const urgencyIndicator = getUrgencyIndicator(item.urgencyScore)
            const isExpanded = expandedItems.has(item.id)
            const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed'

            return (
              <div key={item.id} className={`card p-4 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-start space-x-4">
                  {/* Urgency Indicator */}
                  <div className="flex flex-col items-center space-y-1 mt-1">
                    <div className={`w-3 h-3 rounded-full ${urgencyIndicator.color}`}></div>
                    <div className="text-xs text-gray-600 transform -rotate-90 whitespace-nowrap">
                      {urgencyIndicator.label}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                          <div className="flex space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                              {item.priority}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {item.assignedToName && (
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4" />
                              <span>{item.assignedToName}</span>
                            </div>
                          )}
                          {item.dueDate && (
                            <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : ''}`}>
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                              {isOverdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="h-4 w-4" />
                            <span>Urgency: {item.urgencyScore}/100</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            {item.description && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                                <p className="text-gray-700">{item.description}</p>
                              </div>
                            )}
                            
                            {item.contextSnippet && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-1">Context from Meeting</h4>
                                <p className="text-gray-700 italic bg-gray-50 p-3 rounded-lg">
                                  "{item.contextSnippet}"
                                </p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Category:</span> {item.category}
                              </div>
                              {item.estimatedHours && (
                                <div>
                                  <span className="font-medium">Est. Hours:</span> {item.estimatedHours}
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Complexity:</span> {item.complexityScore}/100
                              </div>
                              <div>
                                <span className="font-medium">AI Confidence:</span> {Math.round(item.extractionConfidence * 100)}%
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex space-x-2 pt-2">
                              {item.status === 'pending' && (
                                <button
                                  onClick={() => updateActionItem(item.id, { status: 'in_progress' })}
                                  className="btn-primary btn-sm"
                                >
                                  Start Work
                                </button>
                              )}
                              {item.status === 'in_progress' && (
                                <button
                                  onClick={() => updateActionItem(item.id, { status: 'completed' })}
                                  className="btn-success btn-sm"
                                >
                                  Mark Complete
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}