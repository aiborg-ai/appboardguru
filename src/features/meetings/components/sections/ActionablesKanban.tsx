'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { CheckSquare, Plus, Calendar, User } from 'lucide-react';
import { MeetingId } from '@/types/meeting-details';

interface ActionablesKanbanProps {
  meetingId: MeetingId;
  onRefresh: () => void;
}

export const ActionablesKanban = React.memo(function ActionablesKanban({
  meetingId,
  onRefresh
}: ActionablesKanbanProps) {
  // Mock data for now
  const actionables = [
    {
      id: '1',
      title: 'Review budget proposal',
      assignee: 'John Doe',
      dueDate: '2024-03-20',
      status: 'todo'
    },
    {
      id: '2',
      title: 'Prepare board presentation',
      assignee: 'Jane Smith',
      dueDate: '2024-03-25',
      status: 'in_progress'
    },
    {
      id: '3',
      title: 'Update compliance report',
      assignee: 'Mike Johnson',
      dueDate: '2024-03-15',
      status: 'completed'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Action Items ({actionables.length})
          </CardTitle>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Action
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionables.map((item) => (
            <div key={item.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                <Badge variant="outline" className={getStatusColor(item.status)}>
                  {item.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {item.assignee}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.dueDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        {actionables.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No action items yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});