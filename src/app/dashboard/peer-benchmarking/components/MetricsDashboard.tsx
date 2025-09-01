'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Activity,
  DollarSign,
  Users,
  Shield,
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { BenchmarkingMetric } from '../hooks/usePeerBenchmarking'

interface MetricsDashboardProps {
  metrics?: BenchmarkingMetric[]
  peerGroup: string
  timePeriod: string
}

// Category configurations
const categoryConfig = {
  governance: { icon: Shield, color: 'blue', label: 'Governance' },
  financial: { icon: DollarSign, color: 'green', label: 'Financial' },
  operational: { icon: Activity, color: 'purple', label: 'Operational' },
  board: { icon: Users, color: 'orange', label: 'Board' },
  risk: { icon: Target, color: 'red', label: 'Risk' }
}

const formatValue = (value: number, unit: string): string => {
  switch (unit) {
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'days':
      return `${value.toFixed(0)} days`
    case 'score':
      return value.toFixed(0)
    case 'ratio':
      return value.toFixed(2)
    case 'currency':
      return `$${(value / 1e6).toFixed(1)}M`
    default:
      return value.toFixed(1)
  }
}

const getQuartileLabel = (quartile: number): string => {
  switch (quartile) {
    case 1: return 'Bottom Quartile'
    case 2: return 'Third Quartile'
    case 3: return 'Second Quartile'
    case 4: return 'Top Quartile'
    default: return 'Unknown'
  }
}

const getQuartileColor = (quartile: number): string => {
  switch (quartile) {
    case 4: return 'text-green-600 bg-green-50 border-green-200'
    case 3: return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 2: return 'text-orange-600 bg-orange-50 border-orange-200'
    case 1: return 'text-red-600 bg-red-50 border-red-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <ArrowUpRight className="h-4 w-4 text-green-600" />
    case 'down': return <ArrowDownRight className="h-4 w-4 text-red-600" />
    default: return <Minus className="h-4 w-4 text-gray-600" />
  }
}

export default function MetricsDashboard({
  metrics = [],
  peerGroup,
  timePeriod
}: MetricsDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  
  // Mock data for demonstration
  const defaultMetrics: BenchmarkingMetric[] = [
    {
      id: '1',
      category: 'governance',
      subcategory: 'board',
      name: 'Board Independence',
      value: 85,
      unit: 'percentage',
      percentile: 78,
      quartile: 4,
      trend: 'up',
      peerAverage: 82,
      peerMedian: 83,
      industryBenchmark: 80,
      deviationFromMedian: 2.4,
      zScore: 0.8
    },
    {
      id: '2',
      category: 'governance',
      subcategory: 'meetings',
      name: 'Meeting Attendance',
      value: 94,
      unit: 'percentage',
      percentile: 85,
      quartile: 4,
      trend: 'stable',
      peerAverage: 91,
      peerMedian: 92,
      industryBenchmark: 90,
      deviationFromMedian: 2.2,
      zScore: 1.2
    },
    {
      id: '3',
      category: 'financial',
      name: 'Revenue Growth',
      value: 18.5,
      unit: 'percentage',
      percentile: 72,
      quartile: 3,
      trend: 'up',
      peerAverage: 15.2,
      peerMedian: 14.8,
      industryBenchmark: 12.5,
      deviationFromMedian: 25,
      zScore: 1.5
    },
    {
      id: '4',
      category: 'operational',
      name: 'Operating Margin',
      value: 22.3,
      unit: 'percentage',
      percentile: 68,
      quartile: 3,
      trend: 'down',
      peerAverage: 21.5,
      peerMedian: 20.8,
      industryBenchmark: 19.2,
      deviationFromMedian: 7.2,
      zScore: 0.6
    },
    {
      id: '5',
      category: 'board',
      name: 'Director Tenure',
      value: 6.5,
      unit: 'years',
      percentile: 45,
      quartile: 2,
      trend: 'stable',
      peerAverage: 7.2,
      peerMedian: 7.0,
      industryBenchmark: 7.5,
      deviationFromMedian: -7.1,
      zScore: -0.4
    },
    {
      id: '6',
      category: 'risk',
      name: 'Risk Score',
      value: 72,
      unit: 'score',
      percentile: 82,
      quartile: 4,
      trend: 'up',
      peerAverage: 68,
      peerMedian: 67,
      industryBenchmark: 65,
      deviationFromMedian: 7.5,
      zScore: 1.1
    }
  ]
  
  const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics
  const filteredMetrics = selectedCategory === 'all' 
    ? displayMetrics 
    : displayMetrics.filter(m => m.category === selectedCategory)
  
  // Group metrics by category
  const metricsByCategory = displayMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = []
    }
    acc[metric.category].push(metric)
    return acc
  }, {} as Record<string, BenchmarkingMetric[]>)
  
  // Prepare data for radar chart
  const radarData = Object.entries(metricsByCategory).map(([category, categoryMetrics]) => {
    const avgPercentile = categoryMetrics.reduce((sum, m) => sum + m.percentile, 0) / categoryMetrics.length
    return {
      category: categoryConfig[category as keyof typeof categoryConfig]?.label || category,
      score: avgPercentile,
      fullMark: 100
    }
  })
  
  const toggleMetricExpansion = (metricId: string) => {
    const newExpanded = new Set(expandedMetrics)
    if (newExpanded.has(metricId)) {
      newExpanded.delete(metricId)
    } else {
      newExpanded.add(metricId)
    }
    setExpandedMetrics(newExpanded)
  }
  
  const renderMetricCard = (metric: BenchmarkingMetric) => {
    const isExpanded = expandedMetrics.has(metric.id)
    const CategoryIcon = categoryConfig[metric.category as keyof typeof categoryConfig]?.icon || BarChart3
    const categoryColor = categoryConfig[metric.category as keyof typeof categoryConfig]?.color || 'gray'
    
    return (
      <Card key={metric.id} className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 bg-${categoryColor}-100 rounded`}>
                <CategoryIcon className={`h-4 w-4 text-${categoryColor}-600`} />
              </div>
              <div>
                <CardTitle className="text-base">{metric.name}</CardTitle>
                {metric.subcategory && (
                  <p className="text-xs text-gray-500 mt-0.5">{metric.subcategory}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(metric.trend)}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => toggleMetricExpansion(metric.id)}
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {formatValue(metric.value, metric.unit)}
              </span>
              <Badge className={getQuartileColor(metric.quartile)}>
                {metric.percentile}th percentile
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Position vs Peers</span>
                <span>{getQuartileLabel(metric.quartile)}</span>
              </div>
              <Progress value={metric.percentile} className="h-2" />
            </div>
            
            {isExpanded && (
              <div className="pt-3 border-t space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Your Value</p>
                    <p className="font-medium">{formatValue(metric.value, metric.unit)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Peer Average</p>
                    <p className="font-medium">{formatValue(metric.peerAverage, metric.unit)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Peer Median</p>
                    <p className="font-medium">{formatValue(metric.peerMedian, metric.unit)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Industry Benchmark</p>
                    <p className="font-medium">{formatValue(metric.industryBenchmark, metric.unit)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Deviation:</span>
                    <span className={`font-medium ${metric.deviationFromMedian > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.deviationFromMedian > 0 ? '+' : ''}{metric.deviationFromMedian.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Z-Score:</span>
                    <span className="font-medium">{metric.zScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="governance">Governance</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="operational">Operational</SelectItem>
              <SelectItem value="board">Board</SelectItem>
              <SelectItem value="risk">Risk</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid View
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table View
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Overall Performance Radar */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Your Organization"
                dataKey="score"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Metrics Grid/Table */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map(renderMetricCard)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4">Metric</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-right p-4">Value</th>
                  <th className="text-right p-4">Percentile</th>
                  <th className="text-right p-4">Peer Avg</th>
                  <th className="text-center p-4">Trend</th>
                </tr>
              </thead>
              <tbody>
                {filteredMetrics.map((metric) => (
                  <tr key={metric.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{metric.name}</td>
                    <td className="p-4">
                      <Badge variant="outline">
                        {categoryConfig[metric.category as keyof typeof categoryConfig]?.label}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {formatValue(metric.value, metric.unit)}
                    </td>
                    <td className="p-4 text-right">
                      <Badge className={getQuartileColor(metric.quartile)}>
                        {metric.percentile}th
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      {formatValue(metric.peerAverage, metric.unit)}
                    </td>
                    <td className="p-4 text-center">
                      {getTrendIcon(metric.trend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}