'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types for dashboard data
export interface DashboardMetrics {
  board_packs: {
    count: number
    change: number
    label: string
  }
  secure_files: {
    count: number
    change: number
    label: string
    formatted: string
  }
  active_users: {
    count: number
    change: number
    label: string
  }
  ai_insights: {
    count: number
    change: number
    label: string
  }
}

export interface DashboardActivity {
  id: string
  type: string
  title: string
  description?: string
  timestamp: string
  timeAgo: string
  icon: string
  resource_type?: string
  resource_id?: string
}

export interface DashboardRecommendation {
  id: string
  type: string
  title: string
  description: string
  action_url?: string
  priority: number
  icon: string
  color: string
  is_active: boolean
  is_dismissed: boolean
  created_at: string
}

export interface DashboardInsight {
  id: string
  type: 'analysis' | 'alert' | 'opportunity'
  category: string
  title: string
  description: string
  status: 'positive' | 'neutral' | 'warning' | 'critical' | 'opportunity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  action_required: boolean
  action_url?: string
  timeAgo: string
  metadata: any
  created_at: string
}

// API functions
async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch('/api/dashboard/metrics')
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics')
  }
  const data = await response.json()
  return data.metrics
}

async function fetchDashboardActivity(limit = 10, offset = 0): Promise<{
  activities: DashboardActivity[]
  pagination: any
}> {
  const response = await fetch(`/api/dashboard/activity?limit=${limit}&offset=${offset}`)
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard activity')
  }
  return response.json()
}

async function fetchDashboardRecommendations(limit = 5, type?: string): Promise<{
  recommendations: DashboardRecommendation[]
  total_count: number
}> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (type) params.set('type', type)
  
  const response = await fetch(`/api/dashboard/recommendations?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard recommendations')
  }
  return response.json()
}

async function fetchDashboardInsights(limit = 10, type?: string): Promise<{
  insights: DashboardInsight[]
  summary: any
}> {
  const params = new URLSearchParams({ limit: limit.toString() })
  if (type) params.set('type', type)
  
  const response = await fetch(`/api/dashboard/insights?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard insights')
  }
  return response.json()
}

async function logActivity(activity: {
  type: string
  title: string
  description?: string
  resource_type?: string
  resource_id?: string
  metadata?: any
}): Promise<void> {
  const response = await fetch('/api/dashboard/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activity)
  })
  
  if (!response.ok) {
    throw new Error('Failed to log activity')
  }
}

async function updateRecommendation(
  recommendationId: string,
  action: 'dismiss' | 'undismiss' | 'deactivate'
): Promise<void> {
  const response = await fetch('/api/dashboard/recommendations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recommendation_id: recommendationId,
      action
    })
  })
  
  if (!response.ok) {
    throw new Error('Failed to update recommendation')
  }
}

// Main dashboard hook
export function useDashboard() {
  const queryClient = useQueryClient()

  // Fetch dashboard metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000 // 10 minutes
  })

  // Fetch recent activity
  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => fetchDashboardActivity(10, 0),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  })

  // Fetch recommendations
  const {
    data: recommendationsData,
    isLoading: recommendationsLoading,
    error: recommendationsError,
    refetch: refetchRecommendations
  } = useQuery({
    queryKey: ['dashboard', 'recommendations'],
    queryFn: () => fetchDashboardRecommendations(5),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 60 * 1000 // 30 minutes
  })

  // Fetch insights
  const {
    data: insightsData,
    isLoading: insightsLoading,
    error: insightsError,
    refetch: refetchInsights
  } = useQuery({
    queryKey: ['dashboard', 'insights'],
    queryFn: () => fetchDashboardInsights(10),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 15 * 60 * 1000 // 15 minutes
  })

  // Mutation for logging activity
  const logActivityMutation = useMutation({
    mutationFn: logActivity,
    onSuccess: () => {
      // Invalidate activity query to refetch
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'activity'] })
    }
  })

  // Mutation for updating recommendations
  const updateRecommendationMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'dismiss' | 'undismiss' | 'deactivate' }) =>
      updateRecommendation(id, action),
    onSuccess: () => {
      // Invalidate recommendations query to refetch
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'recommendations'] })
    }
  })

  // Convenience functions
  const dismissRecommendation = useCallback((id: string) => {
    updateRecommendationMutation.mutate({ id, action: 'dismiss' })
  }, [updateRecommendationMutation])

  const undismissRecommendation = useCallback((id: string) => {
    updateRecommendationMutation.mutate({ id, action: 'undismiss' })
  }, [updateRecommendationMutation])

  const trackActivity = useCallback((activity: {
    type: string
    title: string
    description?: string
    resource_type?: string
    resource_id?: string
    metadata?: any
  }) => {
    logActivityMutation.mutate(activity)
  }, [logActivityMutation])

  // Refresh all dashboard data
  const refreshDashboard = useCallback(async () => {
    await Promise.all([
      refetchMetrics(),
      refetchActivity(),
      refetchRecommendations(),
      refetchInsights()
    ])
  }, [refetchMetrics, refetchActivity, refetchRecommendations, refetchInsights])

  return {
    // Data
    metrics,
    activities: activityData?.activities || [],
    recommendations: recommendationsData?.recommendations || [],
    insights: insightsData?.insights || [],
    insightsSummary: insightsData?.summary,
    
    // Loading states
    isLoading: metricsLoading || activityLoading || recommendationsLoading || insightsLoading,
    metricsLoading,
    activityLoading,
    recommendationsLoading,
    insightsLoading,
    
    // Error states
    error: metricsError || activityError || recommendationsError || insightsError,
    metricsError,
    activityError,
    recommendationsError,
    insightsError,
    
    // Actions
    refreshDashboard,
    trackActivity,
    dismissRecommendation,
    undismissRecommendation,
    
    // Mutation states
    isLoggingActivity: logActivityMutation.isPending,
    isUpdatingRecommendation: updateRecommendationMutation.isPending
  }
}

// Specialized hooks for individual sections
export function useDashboardMetrics() {
  const { metrics, metricsLoading, metricsError, refreshDashboard } = useDashboard()
  return { metrics, isLoading: metricsLoading, error: metricsError, refetch: refreshDashboard }
}

export function useDashboardActivity() {
  const { activities, activityLoading, activityError, trackActivity } = useDashboard()
  return { activities, isLoading: activityLoading, error: activityError, trackActivity }
}

export function useDashboardRecommendations() {
  const { 
    recommendations, 
    recommendationsLoading, 
    recommendationsError, 
    dismissRecommendation,
    undismissRecommendation 
  } = useDashboard()
  
  return { 
    recommendations, 
    isLoading: recommendationsLoading, 
    error: recommendationsError,
    dismiss: dismissRecommendation,
    undismiss: undismissRecommendation
  }
}

export function useDashboardInsights() {
  const { insights, insightsSummary, insightsLoading, insightsError } = useDashboard()
  return { 
    insights, 
    summary: insightsSummary, 
    isLoading: insightsLoading, 
    error: insightsError 
  }
}