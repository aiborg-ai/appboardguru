'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ProgressTrackerProps } from '../types'
import { ProgressUpdate, AssignmentBadge } from '../molecules'
import { ProgressBar, StatusBadge, PriorityIndicator } from '../atoms'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { 
  Target, 
  Calendar, 
  Clock, 
  History, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  MessageSquare
} from 'lucide-react'

/**
 * ProgressTracker - Organism component for comprehensive actionable progress tracking
 * 
 * Features:
 * - Complete progress visualization and management
 * - Historical progress tracking with timeline
 * - Status and priority management
 * - Assignee information and updates
 * - Progress notes and comments
 * - Accessible progress controls
 */
export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  actionable,
  history = [],
  actions,
  canUpdate = true,
  showHistory = true,
  layout = 'vertical',
  className,
  'data-testid': testId,
  ...props
}) => {
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'updates'>('overview')
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getDaysUntilDue = (dueDateString: string) => {
    const due = new Date(dueDateString)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }
  
  const daysUntilDue = getDaysUntilDue(actionable.dueDate)
  const isOverdue = daysUntilDue < 0
  const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0
  
  const renderHeader = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-5 w-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                {actionable.title}
              </h2>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              {actionable.description}
            </p>
            
            <div className="flex items-center flex-wrap gap-2">
              <StatusBadge status={actionable.status} size="sm" />
              <PriorityIndicator priority={actionable.priority} size="sm" />
              
              {(isOverdue || isDueSoon) && (
                <Badge className={cn(
                  'text-xs',
                  isOverdue ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                )}>
                  <Clock className="h-3 w-3 mr-1" />
                  {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `Due in ${daysUntilDue} days`}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {actionable.progress}%
            </div>
            <div className="text-sm text-gray-500">Complete</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium">Due Date</p>
              <p className={cn(
                'text-gray-500',
                isOverdue && 'text-red-600 font-medium',
                isDueSoon && 'text-yellow-600 font-medium'
              )}>
                {formatDate(actionable.dueDate)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="font-medium">Assigned to</div>
            <AssignmentBadge
              assignee={actionable.assignee}
              size="sm"
              showDetails
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <div>
              <p className="font-medium">Status</p>
              <p className="text-gray-500 capitalize">{actionable.status.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  
  const renderProgressSection = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Progress Management</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <ProgressUpdate
          value={actionable.progress}
          editable={canUpdate}
          onUpdate={actions.onUpdateProgress}
          status={actionable.status}
          showControls={canUpdate}
        />
        
        {canUpdate && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Update Status
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.onUpdateStatus('in_progress')}
                  disabled={actionable.status === 'in_progress'}
                >
                  Start
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.onUpdateStatus('under_review')}
                  disabled={actionable.status === 'under_review'}
                >
                  Review
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => actions.onUpdateStatus('completed')}
                  disabled={actionable.status === 'completed' || actionable.progress < 100}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
  
  const renderHistoryItem = (item: any, index: number) => (
    <div key={item.id} className="flex items-start space-x-3 pb-4">
      <div className="flex-shrink-0">
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
        {index < history.length - 1 && (
          <div className="w-px h-full bg-gray-200 ml-0.5 mt-1" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            Progress updated to {item.progress}%
          </span>
          <span className="text-xs text-gray-500">
            {formatDate(item.updatedAt)}
          </span>
        </div>
        
        <div className="mb-2">
          <ProgressBar
            value={item.progress}
            size="sm"
            showLabel={false}
            animated={false}
          />
        </div>
        
        {item.notes && (
          <div className="bg-gray-50 rounded p-2 text-sm text-gray-700">
            {item.notes}
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-1">
          Updated by {item.updatedBy}
        </div>
      </div>
    </div>
  )
  
  const renderHistory = () => {
    if (!showHistory || history.length === 0) return null
    
    const displayHistory = showFullHistory ? history : history.slice(0, 3)
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Progress History</span>
            </div>
            {history.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullHistory(!showFullHistory)}
              >
                {showFullHistory ? 'Show less' : `Show all ${history.length}`}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {displayHistory.map(renderHistoryItem)}
          </div>
          
          {history.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <History className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No progress updates yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
  
  const renderTabs = () => (
    <div className="flex items-center space-x-1 mb-6 border-b">
      {[
        { id: 'overview', label: 'Overview', icon: Target },
        { id: 'history', label: 'History', icon: History },
        { id: 'updates', label: 'Updates', icon: MessageSquare }
      ].map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant={activeTab === id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab(id as any)}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
        >
          <Icon className="h-4 w-4 mr-2" />
          {label}
        </Button>
      ))}
    </div>
  )
  
  if (layout === 'horizontal') {
    return (
      <div
        className={cn('grid grid-cols-1 lg:grid-cols-2 gap-6', className)}
        data-testid={testId || 'progress-tracker'}
        {...props}
      >
        <div className="space-y-6">
          {renderHeader()}
          {renderProgressSection()}
        </div>
        <div>
          {renderHistory()}
        </div>
      </div>
    )
  }
  
  return (
    <div
      className={cn('space-y-6', className)}
      data-testid={testId || 'progress-tracker'}
      {...props}
    >
      {renderHeader()}
      
      {showHistory && renderTabs()}
      
      {activeTab === 'overview' && renderProgressSection()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'updates' && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">Updates and comments coming soon</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

ProgressTracker.displayName = 'ProgressTracker'