'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DollarSign, TrendingUp, Users, Award } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface CompensationBenchmarkProps {
  organizationId?: string
  peerGroup: string
  timePeriod: string
}

export default function CompensationBenchmark({
  organizationId,
  peerGroup,
  timePeriod
}: CompensationBenchmarkProps) {
  // Mock compensation data
  const executiveCompData = [
    { position: 'CEO', yourComp: 13000000, peerMedian: 14500000, percentile: 68 },
    { position: 'CFO', yourComp: 5550000, peerMedian: 5200000, percentile: 70 },
    { position: 'COO', yourComp: 4800000, peerMedian: 4500000, percentile: 72 },
    { position: 'CTO', yourComp: 4200000, peerMedian: 4800000, percentile: 45 },
    { position: 'Board Chair', yourComp: 850000, peerMedian: 780000, percentile: 75 }
  ]

  const compensationBreakdown = [
    { component: 'Base Salary', amount: 1500000, percentage: 11.5 },
    { component: 'Cash Bonus', amount: 3000000, percentage: 23.1 },
    { component: 'Stock Awards', amount: 5500000, percentage: 42.3 },
    { component: 'Option Awards', amount: 2500000, percentage: 19.2 },
    { component: 'Other', amount: 500000, percentage: 3.9 }
  ]

  const formatCurrency = (value: number) => {
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`
    return `$${value}`
  }

  return (
    <div className="space-y-6">
      {/* Executive Compensation Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Executive Compensation vs Peers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={executiveCompData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="position" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="yourComp" name="Your Organization" fill="#3b82f6" />
              <Bar dataKey="peerMedian" name="Peer Median" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* CEO Compensation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>CEO Compensation Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {compensationBreakdown.map((item) => (
                <div key={item.component}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">{item.component}</span>
                    <span className="text-sm font-medium">
                      {formatCurrency(item.amount)} ({item.percentage}%)
                    </span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
              <div className="pt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Total Compensation</span>
                  <span className="font-bold text-lg">$13.0M</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Compensation Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">CEO Pay Ratio</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">287:1</p>
                  <Badge className="text-xs">65th percentile</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">Pay-Performance Alignment</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">82%</p>
                  <Badge className="bg-green-100 text-green-700 text-xs">Strong</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">ESG-Linked Compensation</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">25%</p>
                  <Badge className="text-xs">85th percentile</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}