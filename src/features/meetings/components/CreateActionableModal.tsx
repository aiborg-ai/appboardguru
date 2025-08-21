'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { X, CheckSquare, Save, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CreateActionableRequest,
  ActionablePriority,
  ActionableCategory,
  UserId 
} from '@/types/meetings';

interface CreateActionableModalProps {
  meetingId: string;
  onSubmit: (data: CreateActionableRequest) => Promise<void>;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: ActionablePriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' }
];

const CATEGORY_OPTIONS: { value: ActionableCategory; label: string; description: string }[] = [
  { value: 'follow_up', label: 'Follow Up', description: 'Follow up on discussion points' },
  { value: 'research', label: 'Research', description: 'Research and investigation tasks' },
  { value: 'implementation', label: 'Implementation', description: 'Execute decisions or changes' },
  { value: 'compliance', label: 'Compliance', description: 'Regulatory or compliance activities' },
  { value: 'reporting', label: 'Reporting', description: 'Create reports or documentation' },
  { value: 'communication', label: 'Communication', description: 'Internal or external communication' },
  { value: 'approval', label: 'Approval', description: 'Obtain necessary approvals' },
  { value: 'review', label: 'Review', description: 'Review documents or processes' },
  { value: 'other', label: 'Other', description: 'Other type of action' }
];

const DELIVERABLE_TYPES = [
  'report', 'document', 'presentation', 'decision', 'implementation', 
  'analysis', 'recommendation', 'approval', 'communication', 'other'
];

export function CreateActionableModal({
  meetingId,
  onSubmit,
  onClose
}: CreateActionableModalProps) {
  const [formData, setFormData] = useState<Partial<CreateActionableRequest>>({
    meetingId,
    category: 'follow_up',
    priority: 'medium',
    reminderIntervals: [7, 3, 1],
    dependsOnActionableIds: [],
    requiresApproval: false,
    stakeholdersToNotify: [],
    communicationRequired: false,
    escalationPath: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof CreateActionableRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.assignedTo?.trim()) {
      newErrors.assignedTo = 'Assignee is required';
    }
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else if (new Date(formData.dueDate) < new Date()) {
      newErrors.dueDate = 'Due date cannot be in the past';
    }
    if (formData.estimatedEffortHours && formData.estimatedEffortHours < 0) {
      newErrors.estimatedEffortHours = 'Estimated effort must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData as CreateActionableRequest);
      onClose();
    } catch (error) {
      console.error('Error creating actionable:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addReminderInterval = () => {
    const newInterval = 1;
    setFormData(prev => ({
      ...prev,
      reminderIntervals: [...(prev.reminderIntervals || []), newInterval]
    }));
  };

  const removeReminderInterval = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reminderIntervals: prev.reminderIntervals?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Assign Action Item</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Assignment Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to *
                </label>
                <Input
                  value={formData.assignedTo || ''}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  placeholder="Enter user ID or email"
                  className={cn(errors.assignedTo && "border-red-500")}
                />
                {errors.assignedTo && (
                  <p className="text-red-500 text-sm mt-1">{errors.assignedTo}</p>
                )}
                <p className="text-gray-500 text-sm mt-1">
                  Note: In a full implementation, this would be a user picker component
                </p>
              </div>
            </div>

            {/* Action Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Action Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter action title"
                  className={cn(errors.title && "border-red-500")}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what needs to be done"
                  rows={3}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.description && "border-red-500"
                  )}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Requirements (Optional)
                </label>
                <textarea
                  value={formData.detailedRequirements || ''}
                  onChange={(e) => handleInputChange('detailedRequirements', e.target.value)}
                  placeholder="Specific requirements or success criteria"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Classification</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleInputChange('category', category.value)}
                      className={cn(
                        "p-3 text-left border rounded-lg transition-colors",
                        formData.category === category.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      <div className="font-medium text-sm">{category.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <select
                    value={formData.priority || 'medium'}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Effort (Hours)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.estimatedEffortHours || ''}
                    onChange={(e) => handleInputChange('estimatedEffortHours', parseFloat(e.target.value) || undefined)}
                    placeholder="e.g., 2.5"
                    className={cn(errors.estimatedEffortHours && "border-red-500")}
                  />
                  {errors.estimatedEffortHours && (
                    <p className="text-red-500 text-sm mt-1">{errors.estimatedEffortHours}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Timeline</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.dueDate || ''}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={cn(errors.dueDate && "border-red-500")}
                />
                {errors.dueDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Schedule (Days before due date)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.reminderIntervals?.map((days, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      <Input
                        type="number"
                        min="1"
                        value={days}
                        onChange={(e) => {
                          const newIntervals = [...(formData.reminderIntervals || [])];
                          newIntervals[index] = parseInt(e.target.value) || 1;
                          handleInputChange('reminderIntervals', newIntervals);
                        }}
                        className="w-16"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReminderInterval(index)}
                        className="text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addReminderInterval}
                >
                  Add Reminder
                </Button>
              </div>
            </div>

            {/* Deliverable */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Deliverable</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deliverable Type (Optional)
                  </label>
                  <select
                    value={formData.deliverableType || ''}
                    onChange={(e) => handleInputChange('deliverableType', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select deliverable type</option>
                    {DELIVERABLE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Success Metrics (Optional)
                  </label>
                  <Input
                    value={formData.successMetrics || ''}
                    onChange={(e) => handleInputChange('successMetrics', e.target.value)}
                    placeholder="How will success be measured?"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Options</h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval || false}
                    onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Requires Approval</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.communicationRequired || false}
                    onChange={(e) => handleInputChange('communicationRequired', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Communication Required</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Assigning...' : 'Assign Action'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}