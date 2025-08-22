'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Progress } from '@/features/shared/ui/progress';
import { 
  CheckSquare,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  Timer,
  Target,
  Users,
  FileText,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  MeetingActionable, 
  ActionableStatus, 
  ActionablePriority,
  ActionableCategory,
  CreateActionableRequest 
} from '@/types/meetings';
import { CreateActionableModal } from './CreateActionableModal';
import { ActionableDetailsModal } from './ActionableDetailsModal';
import { useOrganization } from '@/contexts/OrganizationContext';

interface ActionablesSectionProps {
  meetingId: string;
  actionables: MeetingActionable[];
  canManage: boolean; // true for superusers and meeting organizers
  onCreateActionable: (data: CreateActionableRequest) => Promise<void>;
  onUpdateActionable: (id: string, data: Partial<MeetingActionable>) => Promise<void>;
  onDeleteActionable: (id: string) => Promise<void>;
}

const ACTIONABLE_STATUS_CONFIG = {
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', icon: User },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Play },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700', icon: Pause },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-700', icon: Eye },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700', icon: ArrowUp },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: ArrowUp },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
  low: { label: 'Low', color: 'bg-green-100 text-green-700', icon: ArrowDown }
};

const CATEGORY_LABELS = {
  follow_up: 'Follow Up',
  research: 'Research',
  implementation: 'Implementation',
  compliance: 'Compliance',
  reporting: 'Reporting',
  communication: 'Communication',
  approval: 'Approval',
  review: 'Review',
  other: 'Other'
};

export function ActionablesSection({
  meetingId,
  actionables,
  canManage,
  onCreateActionable,
  onUpdateActionable,
  onDeleteActionable
}: ActionablesSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActionable, setSelectedActionable] = useState<MeetingActionable | null>(null);
  const [filterStatus, setFilterStatus] = useState<ActionableStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<ActionablePriority | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<'all' | 'me'>('all');
  
  const filteredActionables = actionables.filter(actionable => {
    const matchesStatus = filterStatus === 'all' || actionable.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || actionable.priority === filterPriority;
    const matchesAssignee = filterAssignee === 'all' || 
      (filterAssignee === 'me' && actionable.assignedTo); // Simplified for now
    return matchesStatus && matchesPriority && matchesAssignee;
  });

  const actionableStats = {
    total: actionables.length,
    completed: actionables.filter(a => a.status === 'completed').length,
    inProgress: actionables.filter(a => a.status === 'in_progress').length,
    overdue: actionables.filter(a => 
      a.status === 'overdue' || 
      (a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.dueDate) < new Date())
    ).length,
    assignedToMe: actionables.filter(a => a.assignedTo === currentUser?.id).length
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressColor = (progress: number, status: ActionableStatus) => {
    if (status === 'completed') return 'bg-green-500';
    if (status === 'overdue' || status === 'blocked') return 'bg-red-500';
    if (progress >= 75) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <CheckSquare className="h-6 w-6" />
            <span>Actionables</span>
          </h2>
          <p className="text-gray-600 mt-1">
            Tasks and action items assigned to team members
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Action</span>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{actionableStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{actionableStats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold">{actionableStats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{actionableStats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Assigned to Me</p>
                <p className="text-2xl font-bold">{actionableStats.assignedToMe}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ActionableStatus | 'all')}
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
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as ActionablePriority | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value as 'all' | 'me')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Assignees</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Actionables List */}
      <div className="space-y-4">
        {filteredActionables.map((actionable) => {
          const statusConfig = ACTIONABLE_STATUS_CONFIG[actionable.status];
          const priorityConfig = PRIORITY_CONFIG[actionable.priority];
          const StatusIcon = statusConfig.icon;
          const PriorityIcon = priorityConfig.icon;
          const daysUntilDue = getDaysUntilDue(actionable.dueDate);
          const isOverdue = daysUntilDue < 0;
          const isDueSoon = daysUntilDue <= 3 && daysUntilDue >= 0;
          
          return (
            <Card key={actionable.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {actionable.actionNumber && (
                        <Badge variant="outline" className="text-xs font-mono">
                          {actionable.actionNumber}
                        </Badge>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {actionable.title}
                      </h3>
                      <Badge className={cn("text-xs", statusConfig.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      <Badge className={cn("text-xs", priorityConfig.color)}>
                        <PriorityIcon className="h-3 w-3 mr-1" />
                        {priorityConfig.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[actionable.category]}
                      </Badge>
                      {(isOverdue || isDueSoon) && (
                        <Badge className={cn("text-xs", 
                          isOverdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          <Clock className="h-3 w-3 mr-1" />
                          {isOverdue ? 'Overdue' : 'Due Soon'}
                        </Badge>
                      )}
                      {actionable.requiresApproval && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Approval Required
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {actionable.description}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">{actionable.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn("h-2 rounded-full transition-all", 
                            getProgressColor(actionable.progressPercentage, actionable.status)
                          )}
                          style={{ width: `${actionable.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Assigned to</p>
                          <p className="text-gray-500">
                            {actionable.assignedTo === currentUser?.id ? 'You' : 'Team Member'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">Due Date</p>
                          <p className={cn("text-gray-500", {
                            "text-red-600 font-medium": isOverdue,
                            "text-yellow-600 font-medium": isDueSoon
                          })}>
                            {formatDate(actionable.dueDate)}
                          </p>
                        </div>
                      </div>
                      
                      {actionable.estimatedEffortHours && (
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Estimated</p>
                            <p className="text-gray-500">{actionable.estimatedEffortHours}h</p>
                          </div>
                        </div>
                      )}
                      
                      {actionable.actualEffortHours && (
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">Actual</p>
                            <p className="text-gray-500">{actionable.actualEffortHours}h</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Dependencies and Deliverables */}
                    <div className="flex items-center space-x-4 mt-4 text-xs text-gray-500">
                      {actionable.dependsOnActionableIds.length > 0 && (
                        <>
                          <span>Depends on {actionable.dependsOnActionableIds.length} action(s)</span>
                          <span>•</span>
                        </>
                      )}
                      {actionable.blocksActionableIds.length > 0 && (
                        <>
                          <span>Blocks {actionable.blocksActionableIds.length} action(s)</span>
                          <span>•</span>
                        </>
                      )}
                      {actionable.deliverableType && (
                        <>
                          <span>Deliverable: {actionable.deliverableType}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>Assigned {formatDate(actionable.assignedAt)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedActionable(actionable)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {(canManage || actionable.assignedTo === currentUser?.id) && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onDeleteActionable(actionable.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredActionables.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckSquare className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No actionables found
              </h3>
              <p className="text-gray-500 mb-4">
                {filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No action items have been assigned for this meeting yet'
                }
              </p>
              {canManage && filterStatus === 'all' && filterPriority === 'all' && filterAssignee === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Action
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
          canManage={canManage || selectedActionable.assignedTo === currentUser?.id}
          onUpdate={onUpdateActionable}
          onClose={() => setSelectedActionable(null)}
        />
      )}
    </div>
  );
}