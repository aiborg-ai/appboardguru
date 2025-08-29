'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Play, CheckCircle } from 'lucide-react';
import { AgendaItem } from '@/types/meeting-details';

interface AgendaTimelineProps {
  agendaItems: AgendaItem[];
  onRefresh: () => void;
  isFullView?: boolean;
}

export const AgendaTimeline = React.memo(function AgendaTimeline({
  agendaItems,
  onRefresh,
  isFullView = false
}: AgendaTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agenda Timeline ({agendaItems.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {agendaItems.map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={item.status === 'completed' ? 'default' : 'outline'}>
                    {item.status === 'completed' ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : item.status === 'in_progress' ? (
                      <Play className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {item.status}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    {item.estimatedDurationMinutes} min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});