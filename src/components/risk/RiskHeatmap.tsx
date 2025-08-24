'use client'

import React from 'react'
import { AlertTriangle, Info } from 'lucide-react'

interface RiskItem {
  id: string
  name: string
  impact: number // 1-5 scale
  likelihood: number // 1-5 scale
  category: string
  level: 'low' | 'medium' | 'high' | 'critical'
}

interface RiskHeatmapProps {
  risks: RiskItem[]
  className?: string
}

export function RiskHeatmap({ risks, className = '' }: RiskHeatmapProps) {
  // Create 5x5 grid for heatmap
  const gridSize = 5
  const cells = Array.from({ length: gridSize }, (_, impactIndex) =>
    Array.from({ length: gridSize }, (_, likelihoodIndex) => {
      const impact = gridSize - impactIndex // Reverse so high impact is at top
      const likelihood = likelihoodIndex + 1
      
      const risksInCell = risks.filter(
        r => Math.round(r.impact) === impact && Math.round(r.likelihood) === likelihood
      )
      
      // Calculate cell risk level based on impact × likelihood
      const riskScore = impact * likelihood
      let cellLevel: 'low' | 'medium' | 'high' | 'critical'
      
      if (riskScore >= 20) cellLevel = 'critical'
      else if (riskScore >= 12) cellLevel = 'high' 
      else if (riskScore >= 6) cellLevel = 'medium'
      else cellLevel = 'low'
      
      return {
        impact,
        likelihood,
        risks: risksInCell,
        riskScore,
        level: cellLevel
      }
    })
  )

  const getCellColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-500 border-red-600'
      case 'high':
        return 'bg-orange-400 border-orange-500'
      case 'medium':
        return 'bg-yellow-300 border-yellow-400'
      case 'low':
        return 'bg-green-200 border-green-300'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const getCellTextColor = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high':
        return 'text-white'
      default:
        return 'text-gray-900'
    }
  }

  const impactLabels = ['Very High', 'High', 'Medium', 'Low', 'Very Low']
  const likelihoodLabels = ['Very Low', 'Low', 'Medium', 'High', 'Very High']

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Heat Map</h3>
        <p className="text-sm text-gray-600">
          Visual representation of risks plotted by impact vs. likelihood
        </p>
      </div>

      <div className="relative">
        {/* Y-axis label (Impact) */}
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90">
          <span className="text-sm font-medium text-gray-700">Impact</span>
        </div>

        {/* Main grid container */}
        <div className="ml-20 mb-16">
          {/* Y-axis labels */}
          <div className="flex mb-2">
            <div className="w-16"></div>
            {impactLabels.map((label, index) => (
              <div key={index} className="w-20 text-xs text-gray-600 text-center">
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Y-axis impact values */}
            <div className="w-16 flex flex-col-reverse">
              {Array.from({ length: gridSize }, (_, i) => (
                <div key={i} className="h-20 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Heat map grid */}
            <div className="grid grid-cols-5 gap-1">
              {cells.map((column, colIndex) =>
                column.map((cell, rowIndex) => (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    className={`
                      w-20 h-20 border-2 rounded-lg cursor-pointer
                      transition-all duration-200 hover:scale-105 hover:shadow-md
                      ${getCellColor(cell.level)}
                      ${getCellTextColor(cell.level)}
                      flex flex-col items-center justify-center
                    `}
                    title={`Impact: ${cell.impact}, Likelihood: ${cell.likelihood} | ${cell.risks.length} risk(s)`}
                  >
                    {cell.risks.length > 0 && (
                      <>
                        <AlertTriangle className="h-4 w-4 mb-1" />
                        <span className="text-xs font-bold">{cell.risks.length}</span>
                        <span className="text-xs">{cell.riskScore}</span>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex mt-2">
            <div className="w-16"></div>
            {Array.from({ length: gridSize }, (_, i) => (
              <div key={i} className="w-20 text-center">
                <span className="text-xs font-medium text-gray-700">{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="flex mt-1">
            <div className="w-16"></div>
            {likelihoodLabels.map((label, index) => (
              <div key={index} className="w-20 text-xs text-gray-600 text-center">
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* X-axis label (Likelihood) */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
          <span className="text-sm font-medium text-gray-700">Likelihood</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Risk Level:</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
              <span className="text-xs text-gray-600">Low (1-5)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-300 border border-yellow-400 rounded"></div>
              <span className="text-xs text-gray-600">Medium (6-11)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-400 border border-orange-500 rounded"></div>
              <span className="text-xs text-gray-600">High (12-19)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 border border-red-600 rounded"></div>
              <span className="text-xs text-gray-600">Critical (20-25)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk details tooltip info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>How to read:</strong> Each cell shows the number of risks at that impact/likelihood intersection. 
              Hover over cells to see details. Numbers inside cells show risk count and calculated risk score (impact × likelihood).
            </p>
          </div>
        </div>
      </div>

      {/* Risk list for selected area */}
      {risks.filter(r => r.level === 'critical' || r.level === 'high').length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">High Priority Risks</h4>
          <div className="space-y-2">
            {risks
              .filter(r => r.level === 'critical' || r.level === 'high')
              .map(risk => (
                <div key={risk.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${
                    risk.level === 'critical' ? 'bg-red-500' : 'bg-orange-400'
                  }`}></div>
                  <span className="text-sm text-gray-900 flex-1">{risk.name}</span>
                  <span className="text-xs text-gray-600">
                    I:{risk.impact} × L:{risk.likelihood} = {Math.round(risk.impact * risk.likelihood)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}