/**
 * Financial Integration Component
 * 
 * Budget allocation optimization and ROI tracking with:
 * - Budget optimization algorithms
 * - ROI tracking and analysis
 * - Cost-benefit analysis automation
 * - Resource utilization monitoring
 * - Financial milestone tracking
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { 
  DollarSign, TrendingUp, TrendingDown, Target, PieChart,
  BarChart3, Calculator, Zap, AlertTriangle, CheckCircle,
  ArrowUp, ArrowDown, Minus, RefreshCw, Download, Upload,
  Settings, Optimize, Award, Activity, Clock, Users
} from 'lucide-react'
import { useStrategicPlanning } from '../../hooks/useStrategicPlanning'
import {
  BudgetOptimizationResult,
  BudgetAllocation,
  BudgetConstraint,
  ROIAnalysis,
  FinancialMetric,
  StrategicInitiative
} from '../../types/strategic-planning'

interface FinancialIntegrationProps {
  organizationId: string
  userId: string
  userRole: 'board' | 'executive' | 'manager' | 'member'
  onBudgetOptimized?: (result: BudgetOptimizationResult) => void
  onROIUpdated?: (analysis: ROIAnalysis) => void
}

interface BudgetOptimizationForm {
  total_budget: number
  optimization_method: 'maximize_roi' | 'minimize_risk' | 'balanced' | 'strategic_priority'
  constraints: BudgetConstraint[]
  risk_tolerance: number // 1-10 scale
}

export const FinancialIntegration: React.FC<FinancialIntegrationProps> = ({
  organizationId,
  userId,
  userRole,
  onBudgetOptimized,
  onROIUpdated
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [selectedInitiative, setSelectedInitiative] = useState<string>('')
  const [roiAnalysisResults, setRoiAnalysisResults] = useState<Record<string, ROIAnalysis>>({})

  const {
    initiatives,
    budgetOptimization,
    optimizeBudgetAllocation,
    trackROI,
    isLoading,
    error
  } = useStrategicPlanning(organizationId)

  const [optimizationForm, setOptimizationForm] = useState<BudgetOptimizationForm>({
    total_budget: 1000000,
    optimization_method: 'balanced',
    constraints: [],
    risk_tolerance: 5
  })

  // Mock financial data - in real implementation this would come from the service
  const mockFinancialMetrics: FinancialMetric[] = [
    {
      id: '1',
      initiative_id: 'init-1',
      metric_type: 'investment',
      value: 250000,
      currency: 'USD',
      period_start: new Date('2024-01-01'),
      period_end: new Date('2024-12-31'),
      confidence_level: 9,
      source: 'Budget Planning',
      notes: 'Initial investment for digital transformation'
    },
    {
      id: '2',
      initiative_id: 'init-1',
      metric_type: 'return',
      value: 450000,
      currency: 'USD',
      period_start: new Date('2024-06-01'),
      period_end: new Date('2025-12-31'),
      confidence_level: 7,
      source: 'Financial Forecast',
      notes: 'Expected revenue increase from automation'
    }
  ]

  const calculateTotalBudgetUsage = useMemo(() => {
    if (!initiatives) return { allocated: 0, used: 0, utilization: 0 }
    
    const allocated = initiatives.reduce((sum, init) => sum + init.budget_allocated, 0)
    const used = initiatives.reduce((sum, init) => sum + init.budget_used, 0)
    const utilization = allocated > 0 ? (used / allocated) * 100 : 0

    return { allocated, used, utilization }
  }, [initiatives])

  const handleOptimizeBudget = useCallback(async () => {
    setIsOptimizing(true)
    try {
      const result = await optimizeBudgetAllocation(
        optimizationForm.total_budget,
        optimizationForm.constraints
      )
      
      if (result.success && onBudgetOptimized) {
        onBudgetOptimized(result.data!)
      }
    } catch (err) {
      console.error('Failed to optimize budget:', err)
    } finally {
      setIsOptimizing(false)
    }
  }, [optimizationForm, optimizeBudgetAllocation, onBudgetOptimized])

  const handleTrackROI = useCallback(async (initiativeId: string) => {
    try {
      const result = await trackROI(initiativeId, {
        start: new Date('2024-01-01'),
        end: new Date('2024-12-31')
      })
      
      if (result.success) {
        setRoiAnalysisResults(prev => ({
          ...prev,
          [initiativeId]: result.data!
        }))
        
        if (onROIUpdated) {
          onROIUpdated(result.data!)
        }
      }
    } catch (err) {
      console.error('Failed to track ROI:', err)
    }
  }, [trackROI, onROIUpdated])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getROIColor = (roi: number) => {
    if (roi >= 20) return 'text-green-600 bg-green-50'
    if (roi >= 10) return 'text-blue-600 bg-blue-50'
    if (roi >= 0) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const renderFinancialOverview = () => (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(calculateTotalBudgetUsage.allocated)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Budget Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(calculateTotalBudgetUsage.used)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Target className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculateTotalBudgetUsage.utilization.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg ROI</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(roiAnalysisResults).length > 0 
                  ? formatPercentage(
                      Object.values(roiAnalysisResults).reduce((sum, roi) => sum + roi.roi_percentage, 0) / 
                      Object.values(roiAnalysisResults).length
                    )
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Utilization Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Budget Allocation by Initiative</h3>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>

        <div className="space-y-4">
          {initiatives?.map(initiative => {
            const allocation = initiative.budget_allocated
            const used = initiative.budget_used
            const utilization = allocation > 0 ? (used / allocation) * 100 : 0
            const remaining = allocation - used

            return (
              <div key={initiative.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{initiative.name}</h4>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {initiative.category}
                    </Badge>
                    <Badge variant={utilization > 90 ? 'destructive' : utilization > 70 ? 'secondary' : 'default'}>
                      {utilization.toFixed(0)}% used
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div>
                    <p className="text-gray-600">Allocated</p>
                    <p className="font-semibold">{formatCurrency(allocation)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Used</p>
                    <p className="font-semibold">{formatCurrency(used)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining</p>
                    <p className="font-semibold">{formatCurrency(remaining)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Progress</p>
                    <p className="font-semibold">{initiative.progress_percentage}%</p>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Budget Utilization</span>
                    <span>{utilization.toFixed(1)}%</span>
                  </div>
                  <Progress value={utilization} className="h-2" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Activity className="h-3 w-3" />
                    <span>Health: {initiative.health_score}/10</span>
                    <span>Risk: {initiative.risk_score}/10</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTrackROI(initiative.id)}
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    Calculate ROI
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ROI Analysis Summary */}
      {Object.keys(roiAnalysisResults).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ROI Analysis Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(roiAnalysisResults).map(([initiativeId, roi]) => {
              const initiative = initiatives?.find(i => i.id === initiativeId)
              if (!initiative) return null

              return (
                <div key={initiativeId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">{initiative.name}</h4>
                    <Badge className={getROIColor(roi.roi_percentage)}>
                      {formatPercentage(roi.roi_percentage)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">Investment</p>
                      <p className="font-semibold">{formatCurrency(roi.total_investment)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Return</p>
                      <p className="font-semibold">{formatCurrency(roi.total_return)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Payback</p>
                      <p className="font-semibold">{roi.payback_period.toFixed(1)} months</p>
                    </div>
                    <div>
                      <p className="text-gray-600">NPV</p>
                      <p className="font-semibold">{formatCurrency(roi.npv)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Optimization Recommendations */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Optimization Recommendations
        </h3>
        
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Reallocate Underutilized Budget</p>
                <p className="text-sm text-blue-700">
                  Initiative "Market Research" has only used 45% of allocated budget. 
                  Consider reallocating {formatCurrency(125000)} to higher-performing initiatives.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Increase Investment in High-ROI Initiatives</p>
                <p className="text-sm text-green-700">
                  "Digital Transformation" shows 28% ROI. Consider increasing budget allocation 
                  to accelerate implementation and maximize returns.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Monitor Over-Budget Initiatives</p>
                <p className="text-sm text-yellow-700">
                  "Product Development" is at 95% budget utilization with 70% completion. 
                  Review scope or request additional funding.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  const renderBudgetOptimization = () => (
    <div className="space-y-6">
      {/* Optimization Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Optimization Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="total-budget">Total Budget</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <Input
                id="total-budget"
                type="number"
                value={optimizationForm.total_budget}
                onChange={(e) => setOptimizationForm(prev => ({
                  ...prev,
                  total_budget: parseFloat(e.target.value) || 0
                }))}
                placeholder="1,000,000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="optimization-method">Optimization Method</Label>
            <Select
              value={optimizationForm.optimization_method}
              onValueChange={(value: any) => setOptimizationForm(prev => ({
                ...prev,
                optimization_method: value
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maximize_roi">Maximize ROI</SelectItem>
                <SelectItem value="minimize_risk">Minimize Risk</SelectItem>
                <SelectItem value="balanced">Balanced Approach</SelectItem>
                <SelectItem value="strategic_priority">Strategic Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <Label>Risk Tolerance: {optimizationForm.risk_tolerance}/10</Label>
          <input
            type="range"
            min="1"
            max="10"
            value={optimizationForm.risk_tolerance}
            onChange={(e) => setOptimizationForm(prev => ({
              ...prev,
              risk_tolerance: parseInt(e.target.value)
            }))}
            className="w-full mt-2"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleOptimizeBudget}
            disabled={isOptimizing}
            className="flex items-center gap-2"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Optimize className="h-4 w-4" />
                Optimize Budget
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Optimization Results */}
      {budgetOptimization && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Optimization Results
            </h3>
            <Badge className="bg-green-500 text-white">
              Score: {budgetOptimization.optimization_score.toFixed(1)}/10
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(budgetOptimization.total_budget)}
              </p>
              <p className="text-sm text-blue-700">Total Budget</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">
                {budgetOptimization.allocations.reduce((sum, a) => sum + a.expected_roi, 0).toFixed(1)}%
              </p>
              <p className="text-sm text-green-700">Expected ROI</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {budgetOptimization.allocations.length}
              </p>
              <p className="text-sm text-purple-700">Initiatives</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Recommended Allocations</h4>
            {budgetOptimization.allocations.map((allocation, index) => {
              const initiative = initiatives?.find(i => i.id === allocation.initiative_id)
              if (!initiative) return null

              return (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{initiative.name}</h5>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {allocation.percentage_of_total.toFixed(1)}%
                      </Badge>
                      <Badge className={getROIColor(allocation.expected_roi)}>
                        {formatPercentage(allocation.expected_roi)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Recommended</p>
                      <p className="font-semibold">{formatCurrency(allocation.allocated_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Current</p>
                      <p className="font-semibold">{formatCurrency(initiative.budget_allocated)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Difference</p>
                      <p className={`font-semibold ${
                        allocation.allocated_amount > initiative.budget_allocated 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {allocation.allocated_amount > initiative.budget_allocated ? '+' : ''}
                        {formatCurrency(allocation.allocated_amount - initiative.budget_allocated)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Risk Score</p>
                      <p className="font-semibold">{allocation.risk_score.toFixed(1)}/10</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Confidence</span>
                      <span>{(allocation.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={allocation.confidence * 100} className="h-2" />
                  </div>
                </div>
              )
            })}
          </div>

          {budgetOptimization.improvement_recommendations.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">Improvement Recommendations</h4>
              <ul className="text-sm space-y-1">
                {budgetOptimization.improvement_recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )

  const renderROITracking = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">ROI Tracking</h3>
          <div className="flex items-center gap-2">
            <Select value={selectedInitiative} onValueChange={setSelectedInitiative}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select initiative" />
              </SelectTrigger>
              <SelectContent>
                {initiatives?.map(initiative => (
                  <SelectItem key={initiative.id} value={initiative.id}>
                    {initiative.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => selectedInitiative && handleTrackROI(selectedInitiative)}
              disabled={!selectedInitiative}
            >
              <Calculator className="h-4 w-4 mr-1" />
              Calculate ROI
            </Button>
          </div>
        </div>

        {Object.keys(roiAnalysisResults).length === 0 && (
          <div className="text-center py-8">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-semibold text-gray-900 mb-2">No ROI Analysis Available</h4>
            <p className="text-gray-600">Select an initiative and calculate ROI to view detailed analysis</p>
          </div>
        )}

        {Object.entries(roiAnalysisResults).map(([initiativeId, roi]) => {
          const initiative = initiatives?.find(i => i.id === initiativeId)
          if (!initiative) return null

          return (
            <div key={initiativeId} className="border rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xl font-semibold">{initiative.name}</h4>
                <Badge className={`${getROIColor(roi.roi_percentage)} text-lg px-3 py-1`}>
                  ROI: {formatPercentage(roi.roi_percentage)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(roi.total_investment)}
                  </p>
                  <p className="text-sm text-blue-700">Total Investment</p>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(roi.total_return)}
                  </p>
                  <p className="text-sm text-green-700">Total Return</p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {roi.payback_period.toFixed(1)}
                  </p>
                  <p className="text-sm text-purple-700">Payback (months)</p>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(roi.npv)}
                  </p>
                  <p className="text-sm text-yellow-700">Net Present Value</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold mb-3">Financial Metrics</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Internal Rate of Return (IRR):</span>
                      <span className="font-semibold">{formatPercentage(roi.irr)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk-Adjusted ROI:</span>
                      <span className="font-semibold">{formatPercentage(roi.risk_adjusted_roi)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Break-even Point:</span>
                      <span className="font-semibold">{roi.payback_period.toFixed(1)} months</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-3">Performance Indicators</h5>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>ROI Performance</span>
                        <span>{Math.min(100, Math.max(0, roi.roi_percentage * 2)).toFixed(0)}%</span>
                      </div>
                      <Progress value={Math.min(100, Math.max(0, roi.roi_percentage * 2))} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Level</span>
                        <span>{initiative.risk_score * 10}%</span>
                      </div>
                      <Progress 
                        value={initiative.risk_score * 10} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Integration</h2>
          <p className="text-gray-600">
            Budget optimization, ROI tracking, and financial performance analysis
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Financial Overview</TabsTrigger>
          <TabsTrigger value="optimization">Budget Optimization</TabsTrigger>
          <TabsTrigger value="roi">ROI Tracking</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderFinancialOverview()}
        </TabsContent>

        <TabsContent value="optimization">
          {renderBudgetOptimization()}
        </TabsContent>

        <TabsContent value="roi">
          {renderROITracking()}
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Reports</h3>
            <p className="text-gray-600">Comprehensive financial reporting and analytics coming soon</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FinancialIntegration