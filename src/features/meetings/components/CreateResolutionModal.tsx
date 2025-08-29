'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Scale, Save, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  CreateResolutionRequest,
  ResolutionType
} from '@/types/meetings';
import type { UserId } from '@/types/database';

interface CreateResolutionModalProps {
  meetingId: string;
  onSubmit: (data: CreateResolutionRequest) => Promise<void>;
  onClose: () => void;
}

const RESOLUTION_TYPES: { value: ResolutionType; label: string; description: string }[] = [
  { value: 'motion', label: 'Motion', description: 'General motion requiring approval' },
  { value: 'amendment', label: 'Amendment', description: 'Change to existing policy or resolution' },
  { value: 'policy', label: 'Policy', description: 'New or updated organizational policy' },
  { value: 'directive', label: 'Directive', description: 'Direct instruction or mandate' },
  { value: 'appointment', label: 'Appointment', description: 'Personnel appointment or assignment' },
  { value: 'financial', label: 'Financial', description: 'Budget, expenditure, or financial decision' },
  { value: 'strategic', label: 'Strategic', description: 'Strategic planning or direction' },
  { value: 'other', label: 'Other', description: 'Other type of resolution' }
];

const PRIORITY_LEVELS = [
  { value: 1, label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 2, label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 3, label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  { value: 4, label: 'Low', color: 'bg-green-100 text-green-700' },
  { value: 5, label: 'Lowest', color: 'bg-gray-100 text-gray-700' }
];

export function CreateResolutionModal({
  meetingId,
  onSubmit,
  onClose
}: CreateResolutionModalProps) {
  const [formData, setFormData] = useState<Partial<CreateResolutionRequest>>({
    meetingId,
    resolutionType: 'motion',
    priorityLevel: 3,
    requiresBoardApproval: false,
    requiresShareholderApproval: false,
    legalReviewRequired: false,
    supportingDocuments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof CreateResolutionRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.resolutionText?.trim()) {
      newErrors.resolutionText = 'Resolution text is required';
    }
    if (formData.effectiveDate && new Date(formData.effectiveDate) < new Date()) {
      newErrors.effectiveDate = 'Effective date cannot be in the past';
    }
    if (formData.implementationDeadline && formData.effectiveDate && 
        new Date(formData.implementationDeadline) < new Date(formData.effectiveDate)) {
      newErrors.implementationDeadline = 'Implementation deadline must be after effective date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData as CreateResolutionRequest);
      onClose();
    } catch (error) {
      console.error('Error creating resolution:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Scale className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Create Resolution</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter resolution title"
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
                  placeholder="Brief description of the resolution"
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
                  Resolution Text *
                </label>
                <textarea
                  value={formData.resolutionText || ''}
                  onChange={(e) => handleInputChange('resolutionText', e.target.value)}
                  placeholder="Full formal text of the resolution as it will be recorded"
                  rows={5}
                  className={cn(
                    "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.resolutionText && "border-red-500"
                  )}
                />
                {errors.resolutionText && (
                  <p className="text-red-500 text-sm mt-1">{errors.resolutionText}</p>
                )}
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Classification</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Type *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {RESOLUTION_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleInputChange('resolutionType', type.value)}
                      className={cn(
                        "p-3 text-left border rounded-lg transition-colors",
                        formData.resolutionType === type.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formData.priorityLevel || 3}
                    onChange={(e) => handleInputChange('priorityLevel', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_LEVELS.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category (Optional)
                  </label>
                  <Input
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g., Governance, Finance, Operations"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Timeline</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Effective Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formData.effectiveDate || ''}
                    onChange={(e) => handleInputChange('effectiveDate', e.target.value)}
                    className={cn(errors.effectiveDate && "border-red-500")}
                  />
                  {errors.effectiveDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.effectiveDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Implementation Deadline (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formData.implementationDeadline || ''}
                    onChange={(e) => handleInputChange('implementationDeadline', e.target.value)}
                    className={cn(errors.implementationDeadline && "border-red-500")}
                  />
                  {errors.implementationDeadline && (
                    <p className="text-red-500 text-sm mt-1">{errors.implementationDeadline}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Approval Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Approval Requirements</h3>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.requiresBoardApproval || false}
                    onChange={(e) => handleInputChange('requiresBoardApproval', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Requires Board Approval</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.requiresShareholderApproval || false}
                    onChange={(e) => handleInputChange('requiresShareholderApproval', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Requires Shareholder Approval</span>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.legalReviewRequired || false}
                    onChange={(e) => handleInputChange('legalReviewRequired', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Legal Review Required</span>
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
                <span>{isSubmitting ? 'Creating...' : 'Create Resolution'}</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}