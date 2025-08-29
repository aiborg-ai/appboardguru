'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, CheckSquare, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MeetingActionable } from '@/types/meetings';

interface ActionableDetailsModalProps {
  actionable: MeetingActionable;
  canManage: boolean;
  onUpdate: (id: string, data: Partial<MeetingActionable>) => Promise<void>;
  onClose: () => void;
}

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Low', color: 'bg-green-100 text-green-700' }
};

const STATUS_CONFIG = {
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
  under_review: { label: 'Under Review', color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-700' }
};

export function ActionableDetailsModal({
  actionable,
  canManage,
  onUpdate,
  onClose
}: ActionableDetailsModalProps) {
  const priorityConfig = PRIORITY_CONFIG[actionable.priority];
  const statusConfig = STATUS_CONFIG[actionable.status];
  const daysUntilDue = Math.ceil((new Date(actionable.dueDate).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
  const isOverdue = daysUntilDue < 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Action Item Details</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="space-y-6">
            {/* Header Info */}
            <div>
              <div className="flex items-center space-x-3 mb-2">
                {actionable.actionNumber && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {actionable.actionNumber}
                  </Badge>
                )}
                <Badge className={cn("text-xs", statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
                <Badge className={cn("text-xs", priorityConfig.color)}>
                  {priorityConfig.label}
                </Badge>
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-700 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Overdue by {Math.abs(daysUntilDue)} days
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900">{actionable.title}</h3>
              <p className="text-gray-600 mt-2">{actionable.description}</p>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-md font-medium text-gray-900">Progress</h4>
                <span className="text-sm text-gray-500">{actionable.progressPercentage}%</span>
              </div>
              <Progress value={actionable.progressPercentage} className="w-full" />
            </div>

            {/* Assignment & Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Assignment</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Assigned to:</span> {actionable.assignedTo}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Assigned by:</span> {actionable.assignedBy}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Assigned:</span> {new Date(actionable.assignedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">Due Date:</span> 
                      <span className={cn("ml-1", isOverdue && "text-red-600 font-medium")}>
                        {new Date(actionable.dueDate).toLocaleDateString()}
                      </span>
                    </span>
                  </div>
                  {actionable.estimatedEffortHours && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">Estimated:</span> {actionable.estimatedEffortHours}h
                      </span>
                    </div>
                  )}
                  {actionable.actualEffortHours && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">
                        <span className="font-medium">Actual:</span> {actionable.actualEffortHours}h
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Requirements */}
            {actionable.detailedRequirements && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Detailed Requirements</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{actionable.detailedRequirements}</p>
                </div>
              </div>
            )}

            {/* Dependencies */}
            {(actionable.dependsOnActionableIds.length > 0 || actionable.blocksActionableIds.length > 0) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Dependencies</h4>
                <div className="space-y-2">
                  {actionable.dependsOnActionableIds.length > 0 && (
                    <p className="text-sm">
                      <span className="font-medium">Depends on:</span> {actionable.dependsOnActionableIds.length} action(s)
                    </p>
                  )}
                  {actionable.blocksActionableIds.length > 0 && (
                    <p className="text-sm">
                      <span className="font-medium">Blocks:</span> {actionable.blocksActionableIds.length} action(s)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Deliverable */}
            {(actionable.deliverableType || actionable.successMetrics) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Deliverable</h4>
                <div className="space-y-2">
                  {actionable.deliverableType && (
                    <p className="text-sm">
                      <span className="font-medium">Type:</span> {actionable.deliverableType}
                    </p>
                  )}
                  {actionable.successMetrics && (
                    <p className="text-sm">
                      <span className="font-medium">Success Metrics:</span> {actionable.successMetrics}
                    </p>
                  )}
                  {actionable.deliverableLocation && (
                    <p className="text-sm">
                      <span className="font-medium">Location:</span> {actionable.deliverableLocation}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {(actionable.completionNotes || actionable.actualResults) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Results</h4>
                <div className="space-y-3">
                  {actionable.completionNotes && (
                    <div>
                      <span className="text-sm font-medium">Completion Notes:</span>
                      <div className="bg-gray-50 p-3 rounded-lg mt-1">
                        <p className="text-gray-700 text-sm">{actionable.completionNotes}</p>
                      </div>
                    </div>
                  )}
                  {actionable.actualResults && (
                    <div>
                      <span className="text-sm font-medium">Actual Results:</span>
                      <div className="bg-gray-50 p-3 rounded-lg mt-1">
                        <p className="text-gray-700 text-sm">{actionable.actualResults}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Approval */}
            {actionable.requiresApproval && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Approval</h4>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Status:</span> 
                    {actionable.approvedBy ? ' Approved' : ' Pending Approval'}
                  </p>
                  {actionable.approvedBy && actionable.approvedAt && (
                    <>
                      <p className="text-sm">
                        <span className="font-medium">Approved by:</span> {actionable.approvedBy}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Approved on:</span> {new Date(actionable.approvedAt).toLocaleDateString()}
                      </p>
                    </>
                  )}
                  {actionable.approvalNotes && (
                    <div>
                      <span className="text-sm font-medium">Approval Notes:</span>
                      <div className="bg-gray-50 p-3 rounded-lg mt-1">
                        <p className="text-gray-700 text-sm">{actionable.approvalNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canManage && (
            <>
              <Button variant="outline">
                Update Progress
              </Button>
              <Button>
                Edit Action
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}