'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Edit, Save, Download } from 'lucide-react';
import { MeetingDetailsFull, MeetingMinute, ParticipantWithUser, AgendaItem } from '@/types/meeting-details';

interface MinutesComposerProps {
  meeting: MeetingDetailsFull;
  minutes?: MeetingMinute | null;
  participants: ParticipantWithUser[];
  agendaItems: AgendaItem[];
  onRefresh: () => void;
}

export const MinutesComposer = React.memo(function MinutesComposer({
  meeting,
  minutes,
  participants,
  agendaItems,
  onRefresh
}: MinutesComposerProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meeting Minutes
          </CardTitle>
          <div className="flex items-center gap-2">
            {minutes && (
              <Badge variant={minutes.status === 'approved' ? 'default' : 'outline'}>
                {minutes.status}
              </Badge>
            )}
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {minutes ? (
          <div className="space-y-6">
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: minutes.content }} />
            </div>
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Minutes not yet created</p>
            <Button className="mt-4">
              Create Minutes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});