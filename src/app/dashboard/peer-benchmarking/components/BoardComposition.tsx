'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'

interface BoardCompositionProps {
  organizationId?: string
  peerGroup: string
}

export default function BoardComposition({
  organizationId,
  peerGroup
}: BoardCompositionProps) {
  const boardMetrics = {
    boardSize: { value: 11, peerAvg: 12, percentile: 65 },
    independence: { value: 82, peerAvg: 80, percentile: 70 },
    genderDiversity: { value: 36, peerAvg: 33, percentile: 75 },
    averageTenure: { value: 6.5, peerAvg: 7.2, percentile: 45 }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Board Composition Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(boardMetrics).map(([key, data]) => (
            <div key={key} className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 capitalize mb-1">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <p className="text-2xl font-bold">
                {data.value}{key.includes('Diversity') || key.includes('independence') ? '%' : ''}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  Peer Avg: {data.peerAvg}
                </span>
                <Badge variant="outline" className="text-xs">
                  {data.percentile}th %ile
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}