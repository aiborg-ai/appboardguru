'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { MeetingId } from '@/types/meeting-details';

interface ResolutionsTrackerProps {
  meetingId: MeetingId;
  onRefresh: () => void;
}

export const ResolutionsTracker = React.memo(function ResolutionsTracker({
  meetingId,
  onRefresh
}: ResolutionsTrackerProps) {
  // Mock data for now
  const resolutions = [
    {
      id: '1',
      title: 'Approve Q4 Budget Allocation',
      status: 'passed',
      votesFor: 8,
      votesAgainst: 2,
      votesAbstain: 0
    },
    {
      id: '2', 
      title: 'Board Member Appointment',
      status: 'in_progress',
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Resolutions ({resolutions.length})
          </CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Resolution
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {resolutions.map((resolution) => (
            <div key={resolution.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-medium text-gray-900">{resolution.title}</h4>
                <div className="flex items-center gap-2">
                  {resolution.status === 'passed' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  {resolution.status === 'rejected' && (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  {resolution.status === 'in_progress' && (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-semibold text-green-600">{resolution.votesFor}</div>
                  <div className="text-green-600">For</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="font-semibold text-red-600">{resolution.votesAgainst}</div>
                  <div className="text-red-600">Against</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-semibold text-gray-600">{resolution.votesAbstain}</div>
                  <div className="text-gray-600">Abstain</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});