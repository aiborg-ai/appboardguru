'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendDataPoint {
  date: string
  overallRisk: number
  highRisks: number
  mediumRisks: number
  lowRisks: number
  criticalRisks: number
}

interface RiskTrendChartProps {
  data: TrendDataPoint[]
  className?: string
}

export function RiskTrendChart({ data, className = '' }: RiskTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Trends</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No trend data available
        </div>
      </div>
    )
  }

  // Calculate chart dimensions
  const chartWidth = 600
  const chartHeight = 200
  const padding = { top: 20, right: 40, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Find min/max values for scaling
  const maxRisk = Math.max(...data.map(d => d.overallRisk))
  const minRisk = Math.min(...data.map(d => d.overallRisk))
  const maxCount = Math.max(...data.map(d => Math.max(d.highRisks, d.mediumRisks, d.lowRisks, d.criticalRisks)))

  // Create scales
  const xScale = (index: number) => (index / (data.length - 1)) * innerWidth
  const yScale = (value: number) => innerHeight - ((value - minRisk) / (maxRisk - minRisk)) * innerHeight
  const countScale = (value: number) => innerHeight - (value / maxCount) * innerHeight

  // Generate path for overall risk trend
  const riskPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.overallRisk)}`)
    .join(' ')

  // Current vs previous comparison
  const currentRisk = data[data.length - 1]?.overallRisk || 0
  const previousRisk = data[data.length - 2]?.overallRisk || 0
  const riskChange = currentRisk - previousRisk
  const riskTrend = riskChange > 0.1 ? 'up' : riskChange < -0.1 ? 'down' : 'stable'

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Risk Trends</h3>
          <p className="text-sm text-gray-600">30-day risk evolution and category breakdown</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">Overall Risk</div>
            <div className="flex items-center space-x-1">
              <span className="text-lg font-bold text-gray-900">{currentRisk.toFixed(1)}</span>
              {riskTrend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
              {riskTrend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
              {riskTrend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        <svg 
          width={chartWidth} 
          height={chartHeight} 
          className="border border-gray-200 rounded-lg bg-gray-50"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5"/>

          {/* Chart area */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {/* Y-axis */}
            <line 
              x1={0} 
              y1={0} 
              x2={0} 
              y2={innerHeight} 
              stroke="#6b7280" 
              strokeWidth="1"
            />
            
            {/* X-axis */}
            <line 
              x1={0} 
              y1={innerHeight} 
              x2={innerWidth} 
              y2={innerHeight} 
              stroke="#6b7280" 
              strokeWidth="1"
            />

            {/* Risk trend line */}
            <path
              d={riskPath}
              fill="none"
              stroke="#f97316"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {data.map((d, i) => (
              <g key={i}>
                {/* Main risk point */}
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.overallRisk)}
                  r="4"
                  fill="#f97316"
                  stroke="white"
                  strokeWidth="2"
                />
                
                {/* Risk category bars (mini bar chart) */}
                <g transform={`translate(${xScale(i) - 6}, ${innerHeight - 5})`}>
                  {/* Critical risks */}
                  <rect
                    x="0"
                    y={-d.criticalRisks * 2}
                    width="3"
                    height={d.criticalRisks * 2}
                    fill="#dc2626"
                  />
                  {/* High risks */}
                  <rect
                    x="3"
                    y={-d.highRisks * 2}
                    width="3"
                    height={d.highRisks * 2}
                    fill="#f97316"
                  />
                  {/* Medium risks */}
                  <rect
                    x="6"
                    y={-d.mediumRisks * 2}
                    width="3"
                    height={d.mediumRisks * 2}
                    fill="#fbbf24"
                  />
                  {/* Low risks */}
                  <rect
                    x="9"
                    y={-d.lowRisks * 2}
                    width="3"
                    height={d.lowRisks * 2}
                    fill="#22c55e"
                  />
                </g>
              </g>
            ))}

            {/* Y-axis labels */}
            <g>
              {Array.from({ length: 6 }, (_, i) => {
                const value = minRisk + ((maxRisk - minRisk) * i) / 5
                const y = yScale(value)
                return (
                  <g key={i}>
                    <line
                      x1={-5}
                      y1={y}
                      x2={0}
                      y2={y}
                      stroke="#6b7280"
                    />
                    <text
                      x={-10}
                      y={y}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize="10"
                      fill="#6b7280"
                    >
                      {value.toFixed(1)}
                    </text>
                  </g>
                )
              })}
            </g>

            {/* X-axis labels */}
            <g>
              {data.map((d, i) => {
                // Show every 5th label to avoid crowding
                if (i % 5 === 0 || i === data.length - 1) {
                  return (
                    <g key={i}>
                      <line
                        x1={xScale(i)}
                        y1={innerHeight}
                        x2={xScale(i)}
                        y2={innerHeight + 5}
                        stroke="#6b7280"
                      />
                      <text
                        x={xScale(i)}
                        y={innerHeight + 15}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#6b7280"
                      >
                        {new Date(d.date).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </text>
                    </g>
                  )
                }
                return null
              })}
            </g>
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-orange-500"></div>
            <span className="text-xs text-gray-600">Overall Risk Score</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-xs text-gray-600">Risk Categories:</div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-3 bg-red-600"></div>
              <span className="text-xs text-gray-600">Critical</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-3 bg-orange-500"></div>
              <span className="text-xs text-gray-600">High</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-3 bg-yellow-400"></div>
              <span className="text-xs text-gray-600">Medium</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-3 bg-green-500"></div>
              <span className="text-xs text-gray-600">Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{currentRisk && data.length > 0 ? data[data.length - 1].criticalRisks : 0}</div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{currentRisk && data.length > 0 ? data[data.length - 1].highRisks : 0}</div>
            <div className="text-xs text-gray-600">High</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{currentRisk && data.length > 0 ? data[data.length - 1].mediumRisks : 0}</div>
            <div className="text-xs text-gray-600">Medium</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{currentRisk && data.length > 0 ? data[data.length - 1].lowRisks : 0}</div>
            <div className="text-xs text-gray-600">Low</div>
          </div>
        </div>
      </div>
    </div>
  )
}