/**
 * Threat Detection System
 * Advanced anomaly detection and threat intelligence for security monitoring
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { logSecurityEvent, logSuspiciousActivity } from './audit'
import { createRateLimiter } from './rate-limiter'

/**
 * Threat detection configuration
 */
interface ThreatDetectionConfig {
  bruteForce: {
    maxAttempts: number
    timeWindowMs: number
    blockDurationMs: number
  }
  anomalousAccess: {
    maxLocations: number
    maxDevices: number
    timeWindowMs: number
    velocityThreshold: number // km/h
  }
  dataExfiltration: {
    maxDownloads: number
    maxDataSize: number // bytes
    timeWindowMs: number
    suspiciousPatterns: string[]
  }
  riskScoring: {
    baseScore: number
    timeDecay: number
    factors: Record<string, number>
  }
}

const DEFAULT_CONFIG: ThreatDetectionConfig = {
  bruteForce: {
    maxAttempts: 5,
    timeWindowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  },
  anomalousAccess: {
    maxLocations: 3,
    maxDevices: 5,
    timeWindowMs: 24 * 60 * 60 * 1000, // 24 hours
    velocityThreshold: 500 // 500 km/h (impossible travel)
  },
  dataExfiltration: {
    maxDownloads: 50,
    maxDataSize: 1024 * 1024 * 1024, // 1GB
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    suspiciousPatterns: [
      'bulk_download',
      'automated_access',
      'off_hours_access',
      'unusual_volume'
    ]
  },
  riskScoring: {
    baseScore: 10,
    timeDecay: 0.95, // 5% decay per time unit
    factors: {
      newLocation: 2.0,
      newDevice: 1.5,
      offHours: 1.3,
      weekend: 1.2,
      multipleFailures: 2.5,
      adminAction: 1.8,
      bulkOperation: 2.0,
      sensitiveData: 2.5
    }
  }
}

/**
 * Geolocation utility
 */
class GeoLocation {
  /**
   * Calculate distance between two coordinates in kilometers
   */
  static calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get approximate location from IP (mock implementation)
   * In production, integrate with MaxMind GeoIP2 or similar service
   */
  static async getLocationFromIP(ip: string): Promise<{
    country?: string
    region?: string
    city?: string
    lat?: number
    lon?: number
  } | null> {
    // Mock implementation - in production use real geolocation service
    const mockLocations: Record<string, {
      country: string;
      region: string;
      city: string;
      lat: number;
      lon: number;
    }> = {
      '127.0.0.1': { country: 'US', region: 'CA', city: 'San Francisco', lat: 37.7749, lon: -122.4194 },
      'localhost': { country: 'US', region: 'CA', city: 'San Francisco', lat: 37.7749, lon: -122.4194 }
    }

    return mockLocations[ip] || null
  }
}

/**
 * Device fingerprinting utility
 */
class DeviceFingerprinting {
  /**
   * Generate device fingerprint from request headers
   */
  static generateFingerprint(userAgent: string, additionalHeaders: Record<string, string> = {}): string {
    const components = [
      userAgent,
      additionalHeaders['accept-language'] || '',
      additionalHeaders['accept-encoding'] || '',
      additionalHeaders['sec-ch-ua'] || '',
      additionalHeaders['sec-ch-ua-platform'] || ''
    ]

    // Simple hash (in production, use more sophisticated fingerprinting)
    const combined = components.join('|')
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16)
  }

  /**
   * Analyze device characteristics for anomalies
   */
  static analyzeDevice(fingerprint: string, userAgent: string): {
    riskScore: number
    flags: string[]
  } {
    const flags: string[] = []
    let riskScore = 0

    const ua = userAgent.toLowerCase()

    // Check for headless browsers
    if (ua.includes('headless') || ua.includes('phantom') || ua.includes('selenium')) {
      flags.push('automated_browser')
      riskScore += 30
    }

    // Check for suspicious user agents
    const suspiciousPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java'
    ]
    
    if (suspiciousPatterns.some(pattern => ua.includes(pattern))) {
      flags.push('suspicious_user_agent')
      riskScore += 20
    }

    // Check for very old or very new browser versions (potential spoofing)
    const chromeMatch = ua.match(/chrome\/(\d+)/)
    if (chromeMatch && chromeMatch[1]) {
      const version = parseInt(chromeMatch[1], 10)
      if (version < 70 || version > 120) {
        flags.push('unusual_browser_version')
        riskScore += 10
      }
    }

    // Check fingerprint entropy (too simple might be spoofed)
    if (fingerprint.length < 6) {
      flags.push('low_entropy_fingerprint')
      riskScore += 15
    }

    return { riskScore, flags }
  }
}

/**
 * Behavioral analysis patterns
 */
interface UserBehaviorProfile {
  userId: string
  averageSessionDuration: number
  commonAccessTimes: number[] // Hours of day (0-23)
  commonLocations: Array<{ lat: number; lon: number; count: number }>
  commonDevices: Array<{ fingerprint: string; count: number }>
  typicalActions: Record<string, number>
  lastUpdated: Date
}

/**
 * Threat detection engine
 */
export class ThreatDetectionEngine {
  private config: ThreatDetectionConfig
  private rateLimiter = createRateLimiter({
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
    algorithm: 'sliding_window'
  })

  constructor(config: Partial<ThreatDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Detect brute force attacks
   */
  async detectBruteForce(
    userId: string,
    ip: string,
    context: {
      action: 'login' | 'password_reset' | 'api_access'
      success: boolean
      userAgent?: string
    }
  ): Promise<{
    isBruteForce: boolean
    riskScore: number
    recommendation: 'allow' | 'block' | 'captcha' | 'delay'
    details: Record<string, unknown>
  }> {
    try {
      const timeWindow = this.config.bruteForce.timeWindowMs
      const maxAttempts = this.config.bruteForce.maxAttempts
      const since = new Date(Date.now() - timeWindow).toISOString()

      // Count recent failed attempts for this user/IP combination
      const { data: recentAttempts, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .or(`user_id.eq.${userId},ip_address.eq.${ip}`)
        .eq('outcome', 'failure')
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const attempts = recentAttempts?.length || 0
      const userAttempts = recentAttempts?.filter((a: any) => a.user_id === userId).length || 0
      const ipAttempts = recentAttempts?.filter((a: any) => a.ip_address === ip).length || 0

      // Calculate risk score
      let riskScore = this.config.riskScoring.baseScore
      
      if (attempts > maxAttempts) {
        riskScore += 40
      }
      
      if (userAttempts > 3) {
        riskScore += 30
      }
      
      if (ipAttempts > 5) {
        riskScore += 35
      }

      // Check for distributed attacks (same user, multiple IPs)
      const uniqueIPs = new Set(recentAttempts?.map((a: any) => a.ip_address) || [])
      if (uniqueIPs.size > 3) {
        riskScore += 25
      }

      const isBruteForce = attempts > maxAttempts || riskScore > 70

      // Determine recommendation
      let recommendation: 'allow' | 'block' | 'captcha' | 'delay' = 'allow'
      
      if (isBruteForce || riskScore > 80) {
        recommendation = 'block'
      } else if (riskScore > 60) {
        recommendation = 'captcha'
      } else if (riskScore > 40) {
        recommendation = 'delay'
      }

      // Log if brute force detected
      if (isBruteForce) {
        await logSuspiciousActivity('Brute force attack detected', {
          userId,
          ip,
          attempts,
          userAttempts,
          ipAttempts,
          uniqueIPs: uniqueIPs.size,
          riskScore,
          action: context.action,
          blocked: recommendation === 'block'
        })
      }

      return {
        isBruteForce,
        riskScore,
        recommendation,
        details: {
          totalAttempts: attempts,
          userAttempts,
          ipAttempts,
          uniqueIPs: uniqueIPs.size,
          timeWindow: timeWindow / 1000 / 60 // minutes
        }
      }

    } catch (error) {
      console.error('Error detecting brute force:', error)
      return {
        isBruteForce: false,
        riskScore: 0,
        recommendation: 'allow',
        details: { error: 'Detection failed' }
      }
    }
  }

  /**
   * Detect anomalous access patterns
   */
  async detectAnomalousAccess(
    userId: string,
    context: {
      ip: string
      userAgent: string
      location?: { lat: number; lon: number; country?: string; city?: string }
      timestamp?: Date
    }
  ): Promise<{
    isAnomalous: boolean
    riskScore: number
    anomalies: string[]
    details: Record<string, unknown>
  }> {
    try {
      const timeWindow = this.config.anomalousAccess.timeWindowMs
      const since = new Date(Date.now() - timeWindow).toISOString()
      const anomalies: string[] = []
      let riskScore = this.config.riskScoring.baseScore

      // Get recent access history
      const { data: recentAccess, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('outcome', 'success')
        .gte('created_at', since)
        .order('created_at', { ascending: false })

      if (error) throw error

      const accessHistory: any[] = recentAccess || []

      // Get recent locations for analysis
      const recentLocations = accessHistory
        .filter((a: any) => a.geolocation?.lat && a.geolocation?.lon)
        .map((a: any) => ({
          lat: a.geolocation.lat,
          lon: a.geolocation.lon,
          timestamp: new Date(a.created_at)
        }))

      // Analyze location anomalies
      if (context.location) {

        // Check for impossible travel
        if (recentLocations.length > 0) {
          const lastLocation = recentLocations[0]
          if (lastLocation) {
            const timeDiff = (Date.now() - lastLocation.timestamp.getTime()) / 1000 / 3600 // hours
            const distance = GeoLocation.calculateDistance(
              lastLocation.lat, lastLocation.lon,
              context.location.lat, context.location.lon
            )
          
            const velocity = timeDiff > 0 ? distance / timeDiff : 0
            
            if (velocity > this.config.anomalousAccess.velocityThreshold) {
              anomalies.push('impossible_travel')
              riskScore += 50
            }
          }
        }

        // Check for new location
        const knownLocations = recentLocations.filter(loc => {
          const distance = GeoLocation.calculateDistance(
            loc.lat, loc.lon,
            context.location!.lat, context.location!.lon
          )
          return distance < 50 // Within 50km is considered same location
        })

        if (knownLocations.length === 0 && context.location) {
          anomalies.push('new_location')
          riskScore += 20
        }

        // Check for too many locations
        const uniqueLocations = new Set(
          recentLocations.map(loc => `${Math.round(loc?.lat || 0)},${Math.round(loc?.lon || 0)}`)
        )
        
        if (uniqueLocations.size > this.config.anomalousAccess.maxLocations) {
          anomalies.push('multiple_locations')
          riskScore += 30
        }
      }

      // Analyze device anomalies
      const deviceFingerprint = DeviceFingerprinting.generateFingerprint(context.userAgent)
      const deviceAnalysis = DeviceFingerprinting.analyzeDevice(deviceFingerprint, context.userAgent)
      
      riskScore += deviceAnalysis.riskScore
      anomalies.push(...deviceAnalysis.flags)

      // Check for new device
      const recentDevices = accessHistory.map((a: any) => a.device_fingerprint).filter(Boolean)
      if (!recentDevices.includes(deviceFingerprint)) {
        anomalies.push('new_device')
        riskScore += 15
      }

      // Check for too many devices
      const uniqueDevices = new Set(recentDevices)
      if (uniqueDevices.size > this.config.anomalousAccess.maxDevices) {
        anomalies.push('multiple_devices')
        riskScore += 25
      }

      // Time-based anomalies
      const hour = (context.timestamp || new Date()).getHours()
      const isWeekend = [0, 6].includes((context.timestamp || new Date()).getDay())
      
      // Check typical access times
      const accessHours = accessHistory.map((a: any) => new Date(a.created_at).getHours())
      const hourFreq = accessHours.reduce((acc: Record<number, number>, h: number) => {
        acc[h] = (acc[h] || 0) + 1
        return acc
      }, {} as Record<number, number>)

      if (accessHours.length > 10 && (hourFreq[hour] || 0) < 2) {
        anomalies.push('unusual_time')
        riskScore += 10
      }

      // Off-hours access (assuming 9 AM - 6 PM are business hours)
      if (hour < 9 || hour > 18) {
        anomalies.push('off_hours_access')
        riskScore += (this.config.riskScoring.factors.offHours || 1.0) * 10
      }

      // Weekend access
      if (isWeekend) {
        anomalies.push('weekend_access')
        riskScore += (this.config.riskScoring.factors.weekend || 1.0) * 10
      }

      const isAnomalous = anomalies.length > 2 || riskScore > 60

      // Log if anomalous
      if (isAnomalous) {
        await logSuspiciousActivity('Anomalous access pattern detected', {
          userId,
          ip: context.ip,
          anomalies,
          riskScore,
          location: context.location,
          deviceFingerprint,
          hour,
          isWeekend
        })
      }

      return {
        isAnomalous,
        riskScore,
        anomalies,
        details: {
          deviceFingerprint,
          recentLocations: recentLocations.length,
          recentDevices: uniqueDevices.size,
          accessPatterns: {
            hourlyDistribution: hourFreq,
            weekendAccess: accessHistory.filter((a: any) => 
              [0, 6].includes(new Date(a.created_at).getDay())
            ).length
          }
        }
      }

    } catch (error) {
      console.error('Error detecting anomalous access:', error)
      return {
        isAnomalous: false,
        riskScore: 0,
        anomalies: [],
        details: { error: 'Detection failed' }
      }
    }
  }

  /**
   * Detect data exfiltration attempts
   */
  async detectDataExfiltration(
    userId: string,
    actions: Array<{
      action: 'download' | 'view' | 'export' | 'copy'
      resourceType: string
      resourceId: string
      dataSize?: number
      timestamp: Date
    }>
  ): Promise<{
    isSuspicious: boolean
    riskScore: number
    indicators: string[]
    details: Record<string, unknown>
  }> {
    try {
      const timeWindow = this.config.dataExfiltration.timeWindowMs
      const indicators: string[] = []
      let riskScore = this.config.riskScoring.baseScore

      // Analyze volume patterns
      const downloadActions = actions.filter(a => a.action === 'download')
      const totalDownloads = downloadActions.length
      const totalDataSize = downloadActions.reduce((sum, a) => sum + (a.dataSize || 0), 0)

      // Check download volume
      if (totalDownloads > this.config.dataExfiltration.maxDownloads) {
        indicators.push('excessive_downloads')
        riskScore += 40
      }

      // Check data size
      if (totalDataSize > this.config.dataExfiltration.maxDataSize) {
        indicators.push('excessive_data_volume')
        riskScore += 50
      }

      // Analyze timing patterns
      const timestamps = actions.map(a => a.timestamp.getTime())
      const intervals = timestamps.slice(1).map((t, i) => t - (timestamps[i] || 0))
      const avgInterval = intervals.length > 0 ? intervals.reduce((sum, i) => sum + i, 0) / intervals.length : 0

      // Very short intervals suggest automated access
      if (avgInterval < 1000 && actions.length > 5) { // Less than 1 second between actions
        indicators.push('automated_pattern')
        riskScore += 35
      }

      // Analyze resource diversity
      const uniqueResources = new Set(actions.map(a => a.resourceId))
      const resourceTypes = new Set(actions.map(a => a.resourceType))

      if (uniqueResources.size > 20 && actions.length / uniqueResources.size < 2) {
        indicators.push('broad_access_pattern')
        riskScore += 30
      }

      // Check for sensitive resource types
      const sensitiveTypes = ['financial_data', 'personal_data', 'confidential', 'admin_data']
      const sensitiveAccess = actions.filter(a => sensitiveTypes.includes(a.resourceType))
      
      if (sensitiveAccess.length > 0) {
        indicators.push('sensitive_data_access')
        riskScore += sensitiveAccess.length * 15
      }

      // Time-based analysis
      const hours = actions.map(a => a.timestamp.getHours())
      const offHoursActions = hours.filter(h => h < 6 || h > 22).length
      
      if (offHoursActions / actions.length > 0.5) {
        indicators.push('off_hours_bulk_access')
        riskScore += 25
      }

      // Sequential access pattern (might indicate scraping)
      if (actions.length > 10) {
        const sortedActions = [...actions].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        let sequentialCount = 0
        
        for (let i = 1; i < sortedActions.length; i++) {
          const current = sortedActions[i]
          const previous = sortedActions[i-1]
          if (current && previous) {
            const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime()
            if (timeDiff < 5000) { // Less than 5 seconds apart
              sequentialCount++
            }
          }
        }
        
        if (actions.length > 0 && sequentialCount > actions.length * 0.7) {
          indicators.push('sequential_access_pattern')
          riskScore += 30
        }
      }

      const isSuspicious = indicators.length > 1 || riskScore > 70

      // Log suspicious activity
      if (isSuspicious) {
        await logSuspiciousActivity('Potential data exfiltration detected', {
          userId,
          indicators,
          riskScore,
          totalDownloads,
          totalDataSize,
          timeSpan: Math.max(...timestamps) - Math.min(...timestamps),
          uniqueResources: uniqueResources.size,
          resourceTypes: Array.from(resourceTypes),
          avgInterval
        })
      }

      return {
        isSuspicious,
        riskScore,
        indicators,
        details: {
          totalActions: actions.length,
          totalDownloads,
          totalDataSize,
          uniqueResources: uniqueResources.size,
          resourceTypes: Array.from(resourceTypes),
          timeSpanMs: timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : 0,
          avgIntervalMs: avgInterval || 0,
          patterns: {
            automated: avgInterval < 1000,
            offHours: offHoursActions / actions.length,
            sequential: indicators.includes('sequential_access_pattern')
          }
        }
      }

    } catch (error) {
      console.error('Error detecting data exfiltration:', error)
      return {
        isSuspicious: false,
        riskScore: 0,
        indicators: [],
        details: { error: 'Detection failed' }
      }
    }
  }

  /**
   * Generate comprehensive user risk score
   */
  async generateRiskScore(
    userId: string,
    context: {
      ip: string
      userAgent: string
      location?: { lat: number; lon: number }
      action: string
      resourceType?: string
      timestamp?: Date
    }
  ): Promise<{
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    factors: Array<{ factor: string; score: number; weight: number }>
    recommendations: string[]
  }> {
    try {
      const factors: Array<{ factor: string; score: number; weight: number }> = []
      let totalScore = this.config.riskScoring.baseScore

      // Run all detection methods
      const [bruteForceResult, anomalousAccessResult] = await Promise.all([
        this.detectBruteForce(userId, context.ip, {
          action: 'login', // Default action
          success: true,
          userAgent: context.userAgent
        }),
        this.detectAnomalousAccess(userId, context)
      ])

      // Brute force factor
      if (bruteForceResult.isBruteForce) {
        factors.push({
          factor: 'brute_force_detected',
          score: bruteForceResult.riskScore,
          weight: 2.0
        })
        totalScore += bruteForceResult.riskScore * 2.0
      }

      // Anomalous access factor
      if (anomalousAccessResult.isAnomalous) {
        factors.push({
          factor: 'anomalous_access',
          score: anomalousAccessResult.riskScore,
          weight: 1.5
        })
        totalScore += anomalousAccessResult.riskScore * 1.5
      }

      // Add individual anomaly factors
      anomalousAccessResult.anomalies.forEach(anomaly => {
        const weight = this.config.riskScoring.factors[anomaly] || 1.0
        factors.push({
          factor: anomaly,
          score: 10,
          weight
        })
        totalScore += 10 * weight
      })

      // Time-based factors
      const hour = (context.timestamp || new Date()).getHours()
      const isWeekend = [0, 6].includes((context.timestamp || new Date()).getDay())

      if (hour < 6 || hour > 22) {
        const weight = this.config.riskScoring.factors.offHours || 1.0
        factors.push({
          factor: 'off_hours_access',
          score: 15,
          weight
        })
        totalScore += 15 * weight
      }

      if (isWeekend) {
        const weight = this.config.riskScoring.factors.weekend || 1.0
        factors.push({
          factor: 'weekend_access',
          score: 10,
          weight
        })
        totalScore += 10 * weight
      }

      // Action-based factors
      if (context.action.includes('admin')) {
        const weight = this.config.riskScoring.factors.adminAction || 1.0
        factors.push({
          factor: 'admin_action',
          score: 20,
          weight
        })
        totalScore += 20 * weight
      }

      if (context.resourceType === 'sensitive_data') {
        const weight = this.config.riskScoring.factors.sensitiveData || 1.0
        factors.push({
          factor: 'sensitive_data_access',
          score: 25,
          weight
        })
        totalScore += 25 * weight
      }

      // Cap the risk score at 100
      const finalScore = Math.min(Math.round(totalScore), 100)

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical'
      if (finalScore >= 80) {
        riskLevel = 'critical'
      } else if (finalScore >= 60) {
        riskLevel = 'high'
      } else if (finalScore >= 40) {
        riskLevel = 'medium'
      } else {
        riskLevel = 'low'
      }

      // Generate recommendations
      const recommendations: string[] = []
      
      if (riskLevel === 'critical') {
        recommendations.push('Block user access immediately')
        recommendations.push('Trigger security alert')
        recommendations.push('Require manual review')
      } else if (riskLevel === 'high') {
        recommendations.push('Require additional authentication')
        recommendations.push('Increase monitoring')
        recommendations.push('Limit access to sensitive resources')
      } else if (riskLevel === 'medium') {
        recommendations.push('Enable additional logging')
        recommendations.push('Consider CAPTCHA verification')
      }

      // Log high-risk scores
      if (finalScore > 60) {
        await logSecurityEvent('high_risk_score_calculated', {
          userId,
          riskScore: finalScore,
          riskLevel,
          factors: factors.map(f => f.factor),
          ip: context.ip,
          action: context.action
        }, riskLevel === 'critical' ? 'critical' : 'high')
      }

      return {
        riskScore: finalScore,
        riskLevel,
        factors,
        recommendations
      }

    } catch (error) {
      console.error('Error generating risk score:', error)
      return {
        riskScore: 50, // Default medium risk on error
        riskLevel: 'medium',
        factors: [{ factor: 'calculation_error', score: 50, weight: 1.0 }],
        recommendations: ['Manual review required due to calculation error']
      }
    }
  }
}

// Export singleton instance
export const threatDetection = new ThreatDetectionEngine()

// Convenience functions
export const detectBruteForce = threatDetection.detectBruteForce.bind(threatDetection)
export const detectAnomalousAccess = threatDetection.detectAnomalousAccess.bind(threatDetection)  
export const detectDataExfiltration = threatDetection.detectDataExfiltration.bind(threatDetection)
export const generateRiskScore = threatDetection.generateRiskScore.bind(threatDetection)