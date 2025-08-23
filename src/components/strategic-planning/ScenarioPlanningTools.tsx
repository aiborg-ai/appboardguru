/**
 * Scenario Planning Tools Component
 * 
 * Advanced scenario planning with:
 * - Monte Carlo simulation capabilities
 * - What-if analysis with multiple variables
 * - Risk-adjusted forecasting
 * - Sensitivity analysis for key assumptions
 * - Market condition impact modeling
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Slider } from '../ui/slider'
import { Textarea } from '../ui/textarea'
import { Progress } from '../ui/progress'
import { 
  BarChart3, LineChart, TrendingUp, TrendingDown, 
  Target, AlertTriangle, Play, Settings, Plus, 
  Trash2, Copy, Download, Upload, RefreshCw,
  Zap, Brain, Calculator, PieChart 
} from 'lucide-react'
import { useStrategicPlanning } from '../../hooks/useStrategicPlanning'
import {
  ScenarioPlan,
  ScenarioVariable,
  MarketAssumption,
  InternalAssumption,
  ProjectedOutcome,
  ConfidenceInterval,
  SensitivityResult
} from '../../types/strategic-planning'

interface ScenarioPlanningToolsProps {
  organizationId: string
  userId: string
  onScenarioCreated?: (scenario: ScenarioPlan) => void
  onScenarioUpdated?: (scenario: ScenarioPlan) => void
}

interface ScenarioFormData {
  name: string
  description: string
  scenario_type: 'optimistic' | 'realistic' | 'pessimistic' | 'stress_test'
  key_variables: ScenarioVariable[]
  market_assumptions: MarketAssumption[]
  internal_assumptions: InternalAssumption[]
  monte_carlo_runs: number
}

export const ScenarioPlanningTools: React.FC<ScenarioPlanningToolsProps> = ({
  organizationId,
  userId,
  onScenarioCreated,
  onScenarioUpdated
}) => {
  const [activeTab, setActiveTab] = useState('create')
  const [isRunningSimulation, setIsRunningSimulation] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<ScenarioPlan | null>(null)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  const {
    scenarioPlans,
    createScenarioPlan,
    runMonteCarloAnalysis,
    isLoading,
    error
  } = useStrategicPlanning(organizationId)

  // Form state for creating new scenarios
  const [formData, setFormData] = useState<ScenarioFormData>({
    name: '',
    description: '',
    scenario_type: 'realistic',
    key_variables: [],
    market_assumptions: [],
    internal_assumptions: [],
    monte_carlo_runs: 10000
  })

  const [newVariable, setNewVariable] = useState<Partial<ScenarioVariable>>({
    name: '',
    type: 'market_size',
    min_value: 0,
    max_value: 100,
    most_likely_value: 50,
    distribution: 'normal',
    correlation_factors: {}
  })

  const handleAddVariable = useCallback(() => {
    if (newVariable.name) {
      const variable: ScenarioVariable = {
        name: newVariable.name!,
        type: newVariable.type!,
        min_value: newVariable.min_value || 0,
        max_value: newVariable.max_value || 100,
        most_likely_value: newVariable.most_likely_value || 50,
        distribution: newVariable.distribution || 'normal',
        correlation_factors: newVariable.correlation_factors || {}
      }

      setFormData(prev => ({
        ...prev,
        key_variables: [...prev.key_variables, variable]
      }))

      setNewVariable({
        name: '',
        type: 'market_size',
        min_value: 0,
        max_value: 100,
        most_likely_value: 50,
        distribution: 'normal',
        correlation_factors: {}
      })
    }
  }, [newVariable])

  const handleRemoveVariable = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      key_variables: prev.key_variables.filter((_, i) => i !== index)
    }))
  }, [])

  const handleCreateScenario = useCallback(async () => {
    if (!formData.name || formData.key_variables.length === 0) {
      return
    }

    setIsRunningSimulation(true)
    try {
      const result = await createScenarioPlan(formData)
      
      if (result.success && result.data) {
        setSelectedScenario(result.data)
        setActiveTab('results')
        if (onScenarioCreated) {
          onScenarioCreated(result.data)
        }
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          scenario_type: 'realistic',
          key_variables: [],
          market_assumptions: [],
          internal_assumptions: [],
          monte_carlo_runs: 10000
        })
      }
    } catch (err) {
      console.error('Failed to create scenario:', err)
    } finally {
      setIsRunningSimulation(false)
    }
  }, [formData, createScenarioPlan, onScenarioCreated])

  const handleRunAnalysis = useCallback(async (scenarioId: string) => {
    setIsRunningSimulation(true)
    try {
      const result = await runMonteCarloAnalysis(scenarioId)
      
      if (result.success && result.data) {
        setSelectedScenario(result.data)
        if (onScenarioUpdated) {
          onScenarioUpdated(result.data)
        }
      }
    } catch (err) {
      console.error('Failed to run analysis:', err)
    } finally {
      setIsRunningSimulation(false)
    }
  }, [runMonteCarloAnalysis, onScenarioUpdated])

  const getScenarioTypeColor = (type: string) => {
    switch (type) {
      case 'optimistic': return 'bg-green-500 text-white'
      case 'realistic': return 'bg-blue-500 text-white'
      case 'pessimistic': return 'bg-yellow-500 text-white'
      case 'stress_test': return 'bg-red-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getDistributionIcon = (distribution: string) => {
    switch (distribution) {
      case 'normal': return <BarChart3 className="h-4 w-4" />
      case 'uniform': return <LineChart className="h-4 w-4" />
      case 'triangular': return <TrendingUp className="h-4 w-4" />
      case 'beta': return <Target className="h-4 w-4" />
      default: return <BarChart3 className="h-4 w-4" />
    }
  }

  const renderScenarioCreation = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Scenario Definition
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="scenario-name">Scenario Name</Label>
            <Input
              id="scenario-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Economic Downturn 2024"
            />
          </div>
          
          <div>
            <Label htmlFor="scenario-type">Scenario Type</Label>
            <Select
              value={formData.scenario_type}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, scenario_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optimistic">Optimistic</SelectItem>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="pessimistic">Pessimistic</SelectItem>
                <SelectItem value="stress_test">Stress Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="scenario-description">Description</Label>
          <Textarea
            id="scenario-description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the scenario context and key assumptions..."
            rows={3}
          />
        </div>
      </Card>

      {/* Key Variables */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Key Variables
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Advanced Options
          </Button>
        </div>

        {/* Add New Variable Form */}
        <div className="p-4 bg-gray-50 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Variable Name</Label>
              <Input
                value={newVariable.name || ''}
                onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Market growth rate"
              />
            </div>
            
            <div>
              <Label>Variable Type</Label>
              <Select
                value={newVariable.type}
                onValueChange={(value: any) => setNewVariable(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market_size">Market Size</SelectItem>
                  <SelectItem value="growth_rate">Growth Rate</SelectItem>
                  <SelectItem value="competition">Competition</SelectItem>
                  <SelectItem value="regulation">Regulation</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Distribution</Label>
              <Select
                value={newVariable.distribution}
                onValueChange={(value: any) => setNewVariable(prev => ({ ...prev, distribution: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="uniform">Uniform</SelectItem>
                  <SelectItem value="triangular">Triangular</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Minimum Value</Label>
              <Input
                type="number"
                value={newVariable.min_value || 0}
                onChange={(e) => setNewVariable(prev => ({ ...prev, min_value: parseFloat(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label>Most Likely Value</Label>
              <Input
                type="number"
                value={newVariable.most_likely_value || 50}
                onChange={(e) => setNewVariable(prev => ({ ...prev, most_likely_value: parseFloat(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label>Maximum Value</Label>
              <Input
                type="number"
                value={newVariable.max_value || 100}
                onChange={(e) => setNewVariable(prev => ({ ...prev, max_value: parseFloat(e.target.value) }))}
              />
            </div>
          </div>

          <Button onClick={handleAddVariable} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Variable
          </Button>
        </div>

        {/* Variables List */}
        <div className="space-y-2">
          {formData.key_variables.map((variable, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3">
                {getDistributionIcon(variable.distribution)}
                <div>
                  <p className="font-medium">{variable.name}</p>
                  <p className="text-sm text-gray-600">
                    {variable.type} • {variable.distribution} • 
                    Range: {variable.min_value} - {variable.max_value}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Mode: {variable.most_likely_value}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveVariable(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {showAdvancedOptions && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Monte Carlo Runs</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[formData.monte_carlo_runs]}
                    onValueChange={([value]) => setFormData(prev => ({ ...prev, monte_carlo_runs: value }))}
                    min={1000}
                    max={50000}
                    step={1000}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16">{formData.monte_carlo_runs.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">More runs = higher accuracy, longer processing time</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setActiveTab('library')}>
          Save as Template
        </Button>
        <Button
          onClick={handleCreateScenario}
          disabled={!formData.name || formData.key_variables.length === 0 || isRunningSimulation}
        >
          {isRunningSimulation ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Simulation...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Monte Carlo Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  )

  const renderScenarioResults = () => {
    if (!selectedScenario) {
      return (
        <Card className="p-6 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scenario Selected</h3>
          <p className="text-gray-600">Create or select a scenario to view results</p>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Scenario Overview */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold">{selectedScenario.name}</h3>
              <p className="text-gray-600 mt-1">{selectedScenario.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getScenarioTypeColor(selectedScenario.scenario_type)}>
                {selectedScenario.scenario_type.replace('_', ' ').toUpperCase()}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRunAnalysis(selectedScenario.id)}
                disabled={isRunningSimulation}
              >
                {isRunningSimulation ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calculator className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Monte Carlo Runs</p>
                <p className="font-semibold">{selectedScenario.monte_carlo_runs.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Settings className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Variables</p>
                <p className="font-semibold">{selectedScenario.key_variables.length}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Outcomes</p>
                <p className="font-semibold">{selectedScenario.projected_outcomes.length}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Projected Outcomes */}
        {selectedScenario.projected_outcomes.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Projected Outcomes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedScenario.projected_outcomes.map((outcome, index) => {
                const impactColor = {
                  low: 'text-blue-600 bg-blue-50',
                  medium: 'text-yellow-600 bg-yellow-50',
                  high: 'text-orange-600 bg-orange-50',
                  critical: 'text-red-600 bg-red-50'
                }[outcome.impact_level]

                return (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{outcome.metric}</h4>
                      <Badge className={impactColor}>
                        {outcome.impact_level}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Baseline</p>
                        <p className="font-semibold">{outcome.baseline.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Projected</p>
                        <p className="font-semibold">{outcome.projected_value.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Probability Range</span>
                        <span>
                          {outcome.probability_range[0].toLocaleString()} - 
                          {outcome.probability_range[1].toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, 
                              ((outcome.projected_value - outcome.probability_range[0]) / 
                               (outcome.probability_range[1] - outcome.probability_range[0])) * 100
                            ))}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Confidence Intervals */}
        {selectedScenario.confidence_intervals.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Confidence Intervals
            </h3>
            <div className="space-y-4">
              {selectedScenario.confidence_intervals.map((interval, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">{interval.metric}</h4>
                  <div className="grid grid-cols-5 gap-2 text-center text-sm">
                    <div>
                      <p className="text-gray-600">10th %</p>
                      <p className="font-semibold">{interval.percentile_10.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">25th %</p>
                      <p className="font-semibold">{interval.percentile_25.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Median</p>
                      <p className="font-semibold">{interval.percentile_50.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">75th %</p>
                      <p className="font-semibold">{interval.percentile_75.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">90th %</p>
                      <p className="font-semibold">{interval.percentile_90.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Sensitivity Analysis */}
        {selectedScenario.sensitivity_analysis.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Sensitivity Analysis
            </h3>
            <div className="space-y-3">
              {selectedScenario.sensitivity_analysis
                .sort((a, b) => a.influence_rank - b.influence_rank)
                .map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 text-center">
                      #{result.influence_rank}
                    </Badge>
                    <div>
                      <p className="font-medium">{result.variable}</p>
                      <p className="text-sm text-gray-600">
                        Correlation: {result.correlation_coefficient.toFixed(3)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold">
                      {result.impact_on_outcome.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Impact Score</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  const renderScenarioLibrary = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Scenario Library</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarioPlans.map(scenario => (
          <Card
            key={scenario.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedScenario(scenario)
              setActiveTab('results')
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium truncate">{scenario.name}</h4>
              <Badge className={`${getScenarioTypeColor(scenario.scenario_type)} text-xs`}>
                {scenario.scenario_type}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {scenario.description}
            </p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Variables</p>
                <p className="font-semibold">{scenario.key_variables.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Outcomes</p>
                <p className="font-semibold">{scenario.projected_outcomes.length}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-gray-500">
                {new Date(scenario.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={(e) => {
                  e.stopPropagation()
                  handleRunAnalysis(scenario.id)
                }}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {scenarioPlans.length === 0 && (
        <Card className="p-8 text-center">
          <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Scenarios Yet</h3>
          <p className="text-gray-600 mb-4">Create your first scenario to start analyzing different futures</p>
          <Button onClick={() => setActiveTab('create')}>
            <Plus className="h-4 w-4 mr-1" />
            Create Scenario
          </Button>
        </Card>
      )}
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
          <h2 className="text-2xl font-bold text-gray-900">Scenario Planning</h2>
          <p className="text-gray-600">
            Model different futures with Monte Carlo simulation and sensitivity analysis
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Create Scenario</TabsTrigger>
          <TabsTrigger value="results">Analysis Results</TabsTrigger>
          <TabsTrigger value="library">Scenario Library</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          {renderScenarioCreation()}
        </TabsContent>

        <TabsContent value="results">
          {renderScenarioResults()}
        </TabsContent>

        <TabsContent value="library">
          {renderScenarioLibrary()}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ScenarioPlanningTools