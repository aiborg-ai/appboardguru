'use client'

import React, { useState } from 'react'
import { 
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  User,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  Edit3,
  Trash2,
  Flag,
  CheckCircle,
  Circle,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
// Simple toast implementation
const toast = {
  error: (message: string) => console.error('Toast:', message),
  success: (message: string) => console.log('Toast:', message),
  info: (message: string) => console.info('Toast:', message)
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  due_date?: string
  created_at: string
  labels?: string[]
}

interface VaultTaskBoardProps {
  vaultId: string
}

export default function VaultTaskBoard({ vaultId }: VaultTaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: 'Review Q4 Financial Report',
      description: 'Complete review and provide feedback on the Q4 financial statements',
      status: 'in_progress',
      priority: 'high',
      assignee: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      },
      due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ['Financial', 'Q4']
    },
    {
      id: '2',
      title: 'Prepare Board Meeting Agenda',
      description: 'Draft agenda for the upcoming board meeting including all key topics',
      status: 'todo',
      priority: 'medium',
      assignee: {
        id: '2',
        name: 'Alice Smith',
        email: 'alice@example.com'
      },
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ['Meeting', 'Planning']
    },
    {
      id: '3',
      title: 'Update Compliance Documentation',
      description: 'Ensure all compliance docs are up to date',
      status: 'review',
      priority: 'urgent',
      assignee: {
        id: '3',
        name: 'Bob Johnson',
        email: 'bob@example.com'
      },
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ['Compliance', 'Legal']
    },
    {
      id: '4',
      title: 'Review Strategic Plan Draft',
      status: 'done',
      priority: 'low',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      labels: ['Strategy']
    }
  ])
  
  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'review', title: 'Review', color: 'bg-yellow-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' }
  ]
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200'
      default: return 'bg-gray-100 text-gray-700'
    }
  }
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <Flag className="h-3 w-3" />
      default:
        return null
    }
  }
  
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 0) {
      return { text: 'Overdue', color: 'text-red-600' }
    } else if (diffInDays === 0) {
      return { text: 'Due today', color: 'text-orange-600' }
    } else if (diffInDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-600' }
    } else if (diffInDays <= 7) {
      return { text: `Due in ${diffInDays} days`, color: 'text-gray-600' }
    } else {
      return { text: date.toLocaleDateString(), color: 'text-gray-600' }
    }
  }
  
  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status)
  }
  
  const handleStatusChange = (taskId: string, newStatus: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus as Task['status'] } : task
    ))
    toast.success('Task status updated')
  }
  
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length
  }
  
  const completionRate = Math.round((stats.done / stats.total) * 100) || 0
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            Task Board
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage and track tasks for this vault
          </p>
        </div>
        
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">To Do</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
              </div>
              <Circle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.done}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
              <Progress value={completionRate} className="h-2" />
              <p className="text-sm font-medium text-gray-900 mt-1">{completionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTasks = getTasksByStatus(column.id)
          
          return (
            <div key={column.id} className="space-y-3">
              <div className={cn("p-3 rounded-lg", column.color)}>
                <h3 className="font-medium text-gray-900 flex items-center justify-between">
                  {column.title}
                  <Badge variant="secondary" className="text-xs">
                    {columnTasks.length}
                  </Badge>
                </h3>
              </div>
              
              <div className="space-y-2">
                {columnTasks.map(task => {
                  const dueDate = formatDueDate(task.due_date)
                  
                  return (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900 flex-1">
                            {task.title}
                          </h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Task
                              </DropdownMenuItem>
                              {column.id !== 'done' && (
                                <>
                                  <DropdownMenuSeparator />
                                  {column.id !== 'todo' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'todo')}>
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                      Move to To Do
                                    </DropdownMenuItem>
                                  )}
                                  {column.id !== 'in_progress' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'in_progress')}>
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                      Move to In Progress
                                    </DropdownMenuItem>
                                  )}
                                  {column.id !== 'review' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'review')}>
                                      <ArrowRight className="h-4 w-4 mr-2" />
                                      Move to Review
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleStatusChange(task.id, 'done')}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark as Done
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Task
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", getPriorityColor(task.priority))}
                          >
                            {getPriorityIcon(task.priority)}
                            {task.priority}
                          </Badge>
                          
                          {task.labels?.map(label => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-xs">
                                  {task.assignee.name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-gray-600">{task.assignee.name}</span>
                            </div>
                          )}
                          
                          {dueDate && (
                            <span className={cn("flex items-center gap-1", dueDate.color)}>
                              <Calendar className="h-3 w-3" />
                              {dueDate.text}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                
                {columnTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}