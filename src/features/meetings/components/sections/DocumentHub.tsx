'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Badge } from '@/features/shared/ui/badge';
import { FileText, Download, Eye } from 'lucide-react';
import { MeetingDocument, MeetingId } from '@/types/meeting-details';
import { Button } from '@/features/shared/ui/button';

interface DocumentHubProps {
  documents: MeetingDocument[];
  meetingId: MeetingId;
  onRefresh: () => void;
}

export const DocumentHub = React.memo(function DocumentHub({
  documents,
  meetingId,
  onRefresh
}: DocumentHubProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <Badge variant="outline" className="text-xs">
                  {doc.category}
                </Badge>
              </div>
              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{doc.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{doc.fileName}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
        {documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No documents available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});