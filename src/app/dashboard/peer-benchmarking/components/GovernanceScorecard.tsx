'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import { GovernanceScore } from '../hooks/usePeerBenchmarking'

interface GovernanceScorecardProps {
  organizationId?: string
  peerGroup: string
  score: GovernanceScore | null
}

export default function GovernanceScorecard({
  organizationId,
  peerGroup,
  score
}: GovernanceScorecardProps) {
  const defaultScore: GovernanceScore = {
    overall: 82,
    boardEffectiveness: 88,
    riskManagement: 85,
    compliance: 91,
    transparency: 78,
    stakeholderEngagement: 76,
    ethicsAndCulture: 84,
    strategicOversight: 79
  }

  const displayScore = score || defaultScore

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600'
    if (value >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Governance Maturity Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(displayScore).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`font-bold ${getScoreColor(value)}`}>
                    {value}
                  </span>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}