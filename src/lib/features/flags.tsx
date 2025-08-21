/**
 * Feature Flag System
 * Enables gradual rollout of new features and safe migrations
 */
'use client'

import React, { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export interface FeatureFlags {
  // API Layer Flags
  USE_NEW_API_LAYER: boolean
  USE_UNIFIED_ERROR_HANDLING: boolean
  USE_API_RATE_LIMITING: boolean
  USE_API_CACHING: boolean
  
  // Database Layer Flags
  USE_REPOSITORY_PATTERN: boolean
  USE_QUERY_OPTIMIZATION: boolean
  USE_CONNECTION_POOLING: boolean
  
  // UI/Component Flags
  USE_COMPONENT_SYSTEM_V2: boolean
  USE_NEW_DASHBOARD_LAYOUT: boolean
  USE_ENHANCED_FORMS: boolean
  
  // Performance Flags
  USE_LAZY_LOADING: boolean
  USE_VIRTUAL_SCROLLING: boolean
  USE_IMAGE_OPTIMIZATION: boolean
  
  // Business Logic Flags
  USE_NEW_ORGANIZATION_WORKFLOW: boolean
  USE_ENHANCED_PERMISSIONS: boolean
  USE_ADVANCED_SEARCH: boolean
  
  // Monitoring Flags
  USE_PERFORMANCE_MONITORING: boolean
  USE_ERROR_TRACKING: boolean
  USE_ANALYTICS: boolean
  
  // Experimental Flags
  ENABLE_AI_SUGGESTIONS: boolean
  ENABLE_REAL_TIME_COLLABORATION: boolean
  ENABLE_OFFLINE_MODE: boolean
}

interface FeatureFlagConfig {
  flag: keyof FeatureFlags
  enabled: boolean
  rolloutPercentage?: number
  enabledForUsers?: string[]
  enabledForOrganizations?: string[]
  startDate?: Date
  endDate?: Date
  description?: string
}

interface UserContext {
  id: string
  organizationId?: string
  role?: string
  email?: string
}

class FeatureManager {
  private static instance: FeatureManager
  private cache = new Map<string, boolean>()
  private cacheExpiry = new Map<string, number>()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  
  // Default flag states (for fallback)
  private defaults: FeatureFlags = {
    USE_NEW_API_LAYER: false,
    USE_UNIFIED_ERROR_HANDLING: true,
    USE_API_RATE_LIMITING: true,
    USE_API_CACHING: true,
    USE_REPOSITORY_PATTERN: false,
    USE_QUERY_OPTIMIZATION: true,
    USE_CONNECTION_POOLING: true,
    USE_COMPONENT_SYSTEM_V2: false,
    USE_NEW_DASHBOARD_LAYOUT: false,
    USE_ENHANCED_FORMS: false,
    USE_LAZY_LOADING: true,
    USE_VIRTUAL_SCROLLING: false,
    USE_IMAGE_OPTIMIZATION: true,
    USE_NEW_ORGANIZATION_WORKFLOW: false,
    USE_ENHANCED_PERMISSIONS: false,
    USE_ADVANCED_SEARCH: false,
    USE_PERFORMANCE_MONITORING: true,
    USE_ERROR_TRACKING: true,
    USE_ANALYTICS: false,
    ENABLE_AI_SUGGESTIONS: false,
    ENABLE_REAL_TIME_COLLABORATION: false,
    ENABLE_OFFLINE_MODE: false
  }

  static getInstance(): FeatureManager {
    if (!FeatureManager.instance) {
      FeatureManager.instance = new FeatureManager()
    }
    return FeatureManager.instance
  }

  /**
   * Check if a feature flag is enabled for the current user
   */
  async isEnabled(
    flag: keyof FeatureFlags, 
    userContext?: UserContext
  ): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(flag, userContext)
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey) || false
      }

      // Fetch from database or config
      const config = await this.getFlagConfig(flag)
      if (!config) {
        // Return default if no config found
        const result = this.defaults[flag]
        this.updateCache(cacheKey, result)
        return result
      }

      const isEnabled = this.evaluateFlag(config, userContext)
      this.updateCache(cacheKey, isEnabled)
      
      return isEnabled
    } catch (error) {
      console.error(`Error checking feature flag ${flag}:`, error)
      return this.defaults[flag]
    }
  }

  /**
   * Enable a feature flag for a specific user
   */
  async enableForUser(flag: keyof FeatureFlags, userId: string): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      await supabase
        .from('feature_flags')
        .upsert({
          flag_name: flag,
          enabled: true,
          enabled_for_users: [userId],
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'flag_name'
        })

      // Clear relevant cache
      this.clearCacheForFlag(flag)
    } catch (error) {
      console.error(`Error enabling flag ${flag} for user ${userId}:`, error)
    }
  }

  /**
   * Enable a feature flag for a percentage of users
   */
  async enablePercentage(flag: keyof FeatureFlags, percentage: number): Promise<void> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      await supabase
        .from('feature_flags')
        .upsert({
          flag_name: flag,
          enabled: percentage > 0,
          rollout_percentage: Math.max(0, Math.min(100, percentage)),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'flag_name'
        })

      this.clearCacheForFlag(flag)
    } catch (error) {
      console.error(`Error setting percentage for flag ${flag}:`, error)
    }
  }

  /**
   * Get all feature flags for a user
   */
  async getAllFlags(userContext?: UserContext): Promise<Partial<FeatureFlags>> {
    const flags: Partial<FeatureFlags> = {}
    
    for (const flag of Object.keys(this.defaults) as (keyof FeatureFlags)[]) {
      flags[flag] = await this.isEnabled(flag, userContext)
    }
    
    return flags
  }

  /**
   * Get confidence level for a flag (useful for gradual migration)
   */
  async getConfidence(flag: keyof FeatureFlags): Promise<number> {
    try {
      const config = await this.getFlagConfig(flag)
      if (!config) return 0
      
      return (config.rolloutPercentage || 0) / 100
    } catch (error) {
      return 0
    }
  }

  private async getFlagConfig(flag: keyof FeatureFlags): Promise<FeatureFlagConfig | null> {
    try {
      const supabase = createSupabaseBrowserClient()
      
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('flag_name', flag)
        .single()

      if (error || !data) return null

      return {
        flag,
        enabled: data.enabled,
        rolloutPercentage: data.rollout_percentage,
        enabledForUsers: data.enabled_for_users || [],
        enabledForOrganizations: data.enabled_for_organizations || [],
        startDate: data.start_date ? new Date(data.start_date) : undefined,
        endDate: data.end_date ? new Date(data.end_date) : undefined,
        description: data.description
      }
    } catch (error) {
      console.error(`Error fetching config for flag ${flag}:`, error)
      return null
    }
  }

  private evaluateFlag(config: FeatureFlagConfig, userContext?: UserContext): boolean {
    // Check if flag is globally disabled
    if (!config.enabled) return false
    
    // Check date range
    const now = new Date()
    if (config.startDate && now < config.startDate) return false
    if (config.endDate && now > config.endDate) return false
    
    // Check user-specific enablement
    if (userContext?.id && config.enabledForUsers?.includes(userContext.id)) {
      return true
    }
    
    // Check organization-specific enablement
    if (userContext?.organizationId && config.enabledForOrganizations?.includes(userContext.organizationId)) {
      return true
    }
    
    // Check percentage rollout
    if (config.rolloutPercentage && userContext?.id) {
      const hash = this.hashUserId(userContext.id)
      const userPercentile = hash % 100
      return userPercentile < config.rolloutPercentage
    }
    
    return config.enabled && (config.rolloutPercentage || 0) >= 100
  }

  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private getCacheKey(flag: keyof FeatureFlags, userContext?: UserContext): string {
    return `${flag}:${userContext?.id || 'anonymous'}:${userContext?.organizationId || 'none'}`
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey)
    return expiry ? Date.now() < expiry : false
  }

  private updateCache(cacheKey: string, value: boolean): void {
    this.cache.set(cacheKey, value)
    this.cacheExpiry.set(cacheKey, Date.now() + this.cacheTTL)
  }

  private clearCacheForFlag(flag: keyof FeatureFlags): void {
    const keysToDelete: string[] = []
    
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${flag}:`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.cacheExpiry.delete(key)
    })
  }
}

// Global feature manager instance
export const featureFlags = FeatureManager.getInstance()

/**
 * React hook for using feature flags
 */
export function useFeatureFlag(flag: keyof FeatureFlags) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkFlag() {
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        const userContext = user ? {
          id: user.id,
          email: user.email || undefined
        } : undefined

        const enabled = await featureFlags.isEnabled(flag, userContext)
        setIsEnabled(enabled)
      } catch (error) {
        console.error(`Error checking feature flag ${flag}:`, error)
        setIsEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    checkFlag()
  }, [flag])

  return { isEnabled, loading }
}

/**
 * HOC for conditionally rendering components based on feature flags
 */
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  flag: keyof FeatureFlags,
  fallback?: React.ComponentType<P>
) {
  return function FeatureFlagWrapper(props: P) {
    const { isEnabled, loading } = useFeatureFlag(flag)

    if (loading) {
      return <div>Loading...</div> // or a proper loading component
    }

    if (isEnabled) {
      return <Component {...props} />
    }

    if (fallback) {
      const FallbackComponent = fallback
      return <FallbackComponent {...props} />
    }

    return null
  }
}

/**
 * Component for conditionally rendering children based on feature flags
 */
interface FeatureFlagProps {
  flag: keyof FeatureFlags
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureFlag({ flag, children, fallback }: FeatureFlagProps) {
  const { isEnabled, loading } = useFeatureFlag(flag)

  if (loading) {
    return <div>Loading...</div>
  }

  return isEnabled ? <>{children}</> : <>{fallback || null}</>
}