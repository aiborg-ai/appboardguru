'use client'

import React from 'react'
import { Card } from '@/features/shared/ui/card'

interface ComplianceMetricsChartProps {
  frameworkScores: Record<string, number>
  trends: Array<{
    period: string
    score: number
    totalRequirements: number
    compliantRequirements: number
  }>
}

export function ComplianceMetricsChart({ frameworkScores, trends }: ComplianceMetricsChartProps) {
  return (
    <div className="space-y-4">
      {/* Framework Scores */}
      <div>
        <h4 className="font-medium mb-3">Framework Compliance Scores</h4>
        <div className="space-y-3">
          {Object.entries(frameworkScores).map(([framework, score]) => (
            <div key={framework} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{framework}</span>
                <span className="text-gray-600">{score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    score >= 90 ? 'bg-green-500' :
                    score >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
          {Object.keys(frameworkScores).length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No framework data available
            </div>
          )}
        </div>
      </div>

      {/* Trends placeholder */}
      {trends.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Compliance Trends</h4>
          <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500 text-sm">Trend chart would be implemented here</p>
          </div>
        </div>
      )}
    </div>
  )
}