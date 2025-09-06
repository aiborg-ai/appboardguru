/**
 * Action Item Card Molecule Component
 * Displays an action item with priority, status, and progress tracking
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { ActionItemPriorityBadge, type ActionItemPriority } from '../atoms/ActionItemPriorityBadge'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Calendar, 
  MessageSquare, 
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Play,
  Pause,
  X,
  Tag,
  Link
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'

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

interface ActionItemCardProps {
  actionItem: ActionItem
  assignedUserName?: string
  assignedUserAvatar?: string
  onUpdateStatus?: (actionItemId: string, status: ActionItemStatus) => void
  onUpdateProgress?: (actionItemId: string, progress: number, notes?: string) => void
  onEdit?: (actionItemId: string) => void
  onDelete?: (actionItemId: string) => void
  onViewContext?: (actionItemId: string) => void
  className?: string
  compact?: boolean
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-500', textColor: 'text-gray-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500', textColor: 'text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-500', textColor: 'text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', textColor: 'text-red-700' },
  overdue: { label: 'Overdue', color: 'bg-orange-500', textColor: 'text-orange-700' }
}

export const ActionItemCard: React.FC<ActionItemCardProps> = ({
  actionItem,
  assignedUserName,
  assignedUserAvatar,
  onUpdateStatus,
  onUpdateProgress,
  onEdit,
  onDelete,
  onViewContext,
  className,
  compact = false
}) => {
  const [showNotes, setShowNotes] = useState(false)
  const [progressNotes, setProgressNotes] = useState('')
  const [tempProgress, setTempProgress] = useState(actionItem.completion_percentage)

  const isOverdue = actionItem.due_date && 
    new Date(actionItem.due_date) < new Date() && 
    actionItem.status !== 'completed' && 
    actionItem.status !== 'cancelled'

  const actualStatus = isOverdue ? 'overdue' : actionItem.status
  const statusConfig_ = statusConfig[actualStatus]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDaysUntilDue = () => {
    if (!actionItem.due_date) return null
    
    const today = new Date()
    const dueDate = new Date(actionItem.due_date)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`
    } else if (diffDays === 0) {
      return 'Due today'
    } else if (diffDays === 1) {
      return 'Due tomorrow'
    } else {
      return `Due in ${diffDays} days`
    }
  }

  const handleStatusChange = (newStatus: ActionItemStatus) => {
    if (onUpdateStatus) {
      onUpdateStatus(actionItem.id, newStatus)
    }
  }

  const handleProgressUpdate = () => {
    if (onUpdateProgress) {
      onUpdateProgress(actionItem.id, tempProgress, progressNotes || undefined)
      setProgressNotes('')
      setShowNotes(false)
    }
  }

  return (
    <Card className={cn(
      "hover:shadow-md transition-all duration-200",
      isOverdue && "border-l-4 border-l-orange-500",
      actionItem.status === 'completed' && "opacity-75",
      className
    )}>
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-semibold truncate",
                compact ? "text-sm" : "text-base"
              )}>
                {actionItem.title}
              </h3>
              {actionItem.ai_extracted && (
                <Badge variant="outline" className="text-xs">
                  AI
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <ActionItemPriorityBadge priority={actionItem.priority} />
              <Badge 
                variant="secondary" 
                className={cn("text-xs", statusConfig_.textColor)}
              >
                {statusConfig_.label}
              </Badge>
              
              {actionItem.tags.length > 0 && !compact && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {actionItem.tags.slice(0, 2).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {actionItem.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{actionItem.tags.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowNotes(!showNotes)}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Progress Note
              </DropdownMenuItem>
              {onViewContext && actionItem.context_reference && (
                <DropdownMenuItem onClick={() => onViewContext(actionItem.id)}>
                  <Link className="mr-2 h-4 w-4" />
                  View Context
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(actionItem.id)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(actionItem.id)}
                  className="text-red-600"
                >
                  <X className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", compact && "space-y-2")}>
        {actionItem.description && !compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {actionItem.description}
          </p>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{actionItem.completion_percentage}%</span>
          </div>
          <Progress 
            value={actionItem.completion_percentage} 
            className="h-2"
          />
          
          {actionItem.status !== 'completed' && !compact && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={tempProgress}
                onChange={(e) => setTempProgress(parseInt(e.target.value))}
                className="flex-1 h-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleProgressUpdate}
                disabled={tempProgress === actionItem.completion_percentage}
              >
                Update
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {assignedUserName && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={assignedUserAvatar} />
                  <AvatarFallback className="text-xs">
                    {assignedUserName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {assignedUserName}
                </span>
              </div>
            )}
            
            {actionItem.due_date && (
              <div className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-orange-600" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                <span>{formatDate(actionItem.due_date)}</span>
                {formatDaysUntilDue() && (
                  <span className={cn(
                    "ml-1",
                    isOverdue && "font-medium"
                  )}>
                    ({formatDaysUntilDue()})
                  </span>
                )}
              </div>
            )}
          </div>
          
          {!compact && actionItem.status !== 'completed' && (
            <Select value={actionItem.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {showNotes && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder="Add progress notes..."
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleProgressUpdate}>
                Save Note
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setShowNotes(false)
                  setProgressNotes('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {actionItem.progress_notes.length > 0 && !compact && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Recent Notes:
            </div>
            <div className="space-y-1">
              {actionItem.progress_notes.slice(-2).map((note: any, index: number) => (
                <div key={index} className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{note.added_by}</span>
                    <span>{formatDate(note.added_at)}</span>
                  </div>
                  <p>{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActionItemCard