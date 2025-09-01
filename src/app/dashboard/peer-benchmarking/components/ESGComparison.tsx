'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Leaf } from 'lucide-react'

interface ESGComparisonProps {
  organizationId?: string
  peerGroup: string
  timePeriod: string
}

export default function ESGComparison({
  organizationId,
  peerGroup,
  timePeriod
}: ESGComparisonProps) {
  const esgScores = {
    environmental: { score: 72, peerAvg: 68, percentile: 65 },
    social: { score: 78, peerAvg: 75, percentile: 70 },
    governance: { score: 82, peerAvg: 80, percentile: 75 }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5" />
          ESG Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(esgScores).map(([key, data]) => (
            <div key={key}>
              <div className="flex justify-between mb-2">
                <span className="capitalize font-medium">{key}</span>
                <span className="text-sm text-gray-500">
                  Score: {data.score} | Peer Avg: {data.peerAvg}
                </span>
              </div>
              <Progress value={data.percentile} className="h-3" />
              <p className="text-xs text-gray-500 mt-1">
                {data.percentile}th percentile
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}