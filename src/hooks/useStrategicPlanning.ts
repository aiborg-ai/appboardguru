/**
 * Strategic Planning Hook
 * 
 * Provides comprehensive state management for strategic planning features:
 * - Strategic initiatives management
 * - OKR cascading system
 * - Scenario planning
 * - Performance scorecards
 * - Financial integration
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { StrategicPlanningService } from '../lib/services/strategic-planning.service'
import type {
  StrategicInitiative,
  OKR,
  ScenarioPlan,
  PerformanceScorecard,
  KeyResult,
  BudgetOptimizationResult,
  ROIAnalysis,
  StrategicForecast
} from '../types/strategic-planning'

interface UseStrategicPlanningReturn {
  // Strategic Initiatives
  initiatives: StrategicInitiative[]
  initiativeAnalytics: any
  createInitiative: (data: Partial<StrategicInitiative>) => Promise<{ success: boolean; data?: StrategicInitiative; error?: string }>
  updateInitiativeProgress: (id: string, progress: any) => Promise<{ success: boolean; data?: StrategicInitiative; error?: string }>
  
  // OKRs
  okrHierarchy: any
  createOKR: (data: Partial<OKR>) => Promise<{ success: boolean; data?: OKR; error?: string }>
  updateKeyResult: (okrId: string, keyResultId: string, progress: any) => Promise<{ success: boolean; data?: OKR; error?: string }>
  
  // Scenario Planning
  scenarioPlans: ScenarioPlan[]
  createScenarioPlan: (data: Partial<ScenarioPlan>) => Promise<{ success: boolean; data?: ScenarioPlan; error?: string }>
  runMonteCarloAnalysis: (scenarioId: string) => Promise<{ success: boolean; data?: any; error?: string }>
  
  // Performance Scorecards
  scorecards: PerformanceScorecard[]
  createScorecard: (data: Partial<PerformanceScorecard>) => Promise<{ success: boolean; data?: PerformanceScorecard; error?: string }>
  getScorecardData: (scorecardId: string, timeRange?: any) => Promise<{ success: boolean; data?: any; error?: string }>
  
  // Financial Integration
  budgetOptimization: BudgetOptimizationResult | null
  optimizeBudgetAllocation: (totalBudget: number, constraints?: any[]) => Promise<{ success: boolean; data?: BudgetOptimizationResult; error?: string }>
  trackROI: (initiativeId: string, period: any) => Promise<{ success: boolean; data?: ROIAnalysis; error?: string }>
  
  // Predictive Analytics
  forecasts: StrategicForecast[]
  generateForecast: (type: string, timeHorizon: number) => Promise<{ success: boolean; data?: StrategicForecast; error?: string }>
  
  // General
  isLoading: boolean
  error: string | null
  refreshData: () => Promise<void>
  refreshOKRData: () => Promise<void>
}

export const useStrategicPlanning = (organizationId: string): UseStrategicPlanningReturn => {
  // State management
  const [initiatives, setInitiatives] = useState<StrategicInitiative[]>([])
  const [initiativeAnalytics, setInitiativeAnalytics] = useState<any>(null)
  const [okrHierarchy, setOkrHierarchy] = useState<any>(null)
  const [scenarioPlans, setScenarioPlans] = useState<ScenarioPlan[]>([])
  const [scorecards, setScorecards] = useState<PerformanceScorecard[]>([])
  const [budgetOptimization, setBudgetOptimization] = useState<BudgetOptimizationResult | null>(null)
  const [forecasts, setForecasts] = useState<StrategicForecast[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = useSupabaseClient()
  const strategicPlanningService = useRef(new StrategicPlanningService(supabase))

  // Initialize data loading
  useEffect(() => {
    if (organizationId) {
      refreshData()
    }
  }, [organizationId])

  const refreshData = useCallback(async () => {
    if (!organizationId) return

    setIsLoading(true)
    setError(null)

    try {
      // Load initiatives
      const initiativesResult = await strategicPlanningService.current.getStrategicInitiatives(organizationId)
      if (initiativesResult.success) {
        setInitiatives(initiativesResult.data.initiatives)
        setInitiativeAnalytics(initiativesResult.data.analytics)
      }

      // Load OKR hierarchy
      const okrResult = await strategicPlanningService.current.getOKRHierarchy(organizationId)
      if (okrResult.success) {
        setOkrHierarchy(okrResult.data)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load strategic planning data')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  const refreshOKRData = useCallback(async () => {
    if (!organizationId) return

    setIsLoading(true)
    try {
      const okrResult = await strategicPlanningService.current.getOKRHierarchy(organizationId)
      if (okrResult.success) {
        setOkrHierarchy(okrResult.data)
      } else {
        throw new Error(okrResult.error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load OKR data')
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  // Strategic Initiatives
  const createInitiative = useCallback(async (data: Partial<StrategicInitiative>) => {
    try {
      const result = await strategicPlanningService.current.createStrategicInitiative(organizationId, data)
      
      if (result.success) {
        setInitiatives(prev => [...prev, result.data])
        // Refresh analytics
        const analyticsResult = await strategicPlanningService.current.getStrategicInitiatives(organizationId)
        if (analyticsResult.success) {
          setInitiativeAnalytics(analyticsResult.data.analytics)
        }
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create initiative' 
      }
    }
  }, [organizationId])

  const updateInitiativeProgress = useCallback(async (id: string, progress: any) => {
    try {
      const result = await strategicPlanningService.current.updateInitiativeProgress(id, progress)
      
      if (result.success) {
        setInitiatives(prev => prev.map(init => 
          init.id === id ? { ...init, ...result.data } : init
        ))
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update initiative progress' 
      }
    }
  }, [])

  // OKRs
  const createOKR = useCallback(async (data: Partial<OKR>) => {
    try {
      const result = await strategicPlanningService.current.createOKR(organizationId, data)
      
      if (result.success) {
        // Refresh OKR hierarchy to reflect new structure
        await refreshOKRData()
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create OKR' 
      }
    }
  }, [organizationId, refreshOKRData])

  const updateKeyResult = useCallback(async (okrId: string, keyResultId: string, progress: any) => {
    try {
      const result = await strategicPlanningService.current.updateKeyResultProgress(okrId, keyResultId, progress)
      
      if (result.success) {
        // Update OKR in hierarchy
        setOkrHierarchy((prev: any) => {
          if (!prev) return prev
          
          const updateOKRInTree = (okrs: OKR[]): OKR[] => {
            return okrs.map(okr => {
              if (okr.id === okrId) {
                return { ...okr, ...result.data }
              }
              if (okr.children) {
                return { ...okr, children: updateOKRInTree(okr.children) }
              }
              return okr
            })
          }

          return {
            ...prev,
            okr_tree: updateOKRInTree(prev.okr_tree || [])
          }
        })
        
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update key result' 
      }
    }
  }, [])

  // Scenario Planning
  const createScenarioPlan = useCallback(async (data: Partial<ScenarioPlan>) => {
    try {
      const result = await strategicPlanningService.current.createScenarioPlan(organizationId, data)
      
      if (result.success) {
        setScenarioPlans(prev => [...prev, result.data])
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create scenario plan' 
      }
    }
  }, [organizationId])

  const runMonteCarloAnalysis = useCallback(async (scenarioId: string) => {
    try {
      // This would trigger a re-run of Monte Carlo simulation for an existing scenario
      const scenario = scenarioPlans.find(s => s.id === scenarioId)
      if (!scenario) {
        return { success: false, error: 'Scenario not found' }
      }

      const result = await strategicPlanningService.current.createScenarioPlan(organizationId, scenario)
      
      if (result.success) {
        setScenarioPlans(prev => prev.map(s => 
          s.id === scenarioId ? result.data : s
        ))
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to run Monte Carlo analysis' 
      }
    }
  }, [organizationId, scenarioPlans])

  // Performance Scorecards
  const createScorecard = useCallback(async (data: Partial<PerformanceScorecard>) => {
    try {
      const result = await strategicPlanningService.current.createPerformanceScorecard(organizationId, data)
      
      if (result.success) {
        setScorecards(prev => [...prev, result.data])
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create scorecard' 
      }
    }
  }, [organizationId])

  const getScorecardData = useCallback(async (scorecardId: string, timeRange?: any) => {
    try {
      const result = await strategicPlanningService.current.getScorecardData(scorecardId, timeRange)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to get scorecard data' 
      }
    }
  }, [])

  // Financial Integration
  const optimizeBudgetAllocation = useCallback(async (totalBudget: number, constraints?: any[]) => {
    try {
      const result = await strategicPlanningService.current.optimizeBudgetAllocation(
        organizationId, 
        totalBudget, 
        constraints
      )
      
      if (result.success) {
        setBudgetOptimization(result.data)
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to optimize budget allocation' 
      }
    }
  }, [organizationId])

  const trackROI = useCallback(async (initiativeId: string, period: any) => {
    try {
      const result = await strategicPlanningService.current.trackInitiativeROI(initiativeId, period)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to track ROI' 
      }
    }
  }, [])

  // Predictive Analytics
  const generateForecast = useCallback(async (type: string, timeHorizon: number) => {
    try {
      const result = await strategicPlanningService.current.generateStrategicForecast(
        organizationId, 
        type as any, 
        timeHorizon
      )
      
      if (result.success) {
        setForecasts(prev => [...prev, result.data])
        return { success: true, data: result.data }
      } else {
        return { success: false, error: result.error.message }
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to generate forecast' 
      }
    }
  }, [organizationId])

  return {
    // Strategic Initiatives
    initiatives,
    initiativeAnalytics,
    createInitiative,
    updateInitiativeProgress,
    
    // OKRs
    okrHierarchy,
    createOKR,
    updateKeyResult,
    
    // Scenario Planning
    scenarioPlans,
    createScenarioPlan,
    runMonteCarloAnalysis,
    
    // Performance Scorecards
    scorecards,
    createScorecard,
    getScorecardData,
    
    // Financial Integration
    budgetOptimization,
    optimizeBudgetAllocation,
    trackROI,
    
    // Predictive Analytics
    forecasts,
    generateForecast,
    
    // General
    isLoading,
    error,
    refreshData,
    refreshOKRData
  }
}