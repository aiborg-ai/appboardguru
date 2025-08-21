'use client';

import React from 'react';
import { Button } from '@/features/shared/ui/button';
import { X, Scale } from 'lucide-react';
import { MeetingResolution } from '@/types/meetings';

interface ResolutionDetailsModalProps {
  resolution: MeetingResolution;
  canManage: boolean;
  onUpdate: (id: string, data: Partial<MeetingResolution>) => Promise<void>;
  onClose: () => void;
}

export function ResolutionDetailsModal({
  resolution,
  canManage,
  onUpdate,
  onClose
}: ResolutionDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <Scale className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Resolution Details</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{resolution.title}</h3>
              <p className="text-gray-600 mt-2">{resolution.description}</p>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Resolution Text</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{resolution.resolutionText}</p>
              </div>
            </div>

            {/* Voting Results */}
            {resolution.votedAt && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Voting Results</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-700">{resolution.votesFor}</div>
                    <div className="text-sm text-green-600">For</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-700">{resolution.votesAgainst}</div>
                    <div className="text-sm text-red-600">Against</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-700">{resolution.votesAbstain}</div>
                    <div className="text-sm text-yellow-600">Abstain</div>
                  </div>
                </div>
              </div>
            )}

            {/* Implementation Details */}
            {(resolution.effectiveDate || resolution.implementationDeadline) && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-2">Implementation</h4>
                <div className="space-y-2">
                  {resolution.effectiveDate && (
                    <p><span className="font-medium">Effective Date:</span> {new Date(resolution.effectiveDate).toLocaleDateString()}</p>
                  )}
                  {resolution.implementationDeadline && (
                    <p><span className="font-medium">Implementation Deadline:</span> {new Date(resolution.implementationDeadline).toLocaleDateString()}</p>
                  )}
                  {resolution.implementationNotes && (
                    <p><span className="font-medium">Notes:</span> {resolution.implementationNotes}</p>
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
            <Button>
              Edit Resolution
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}