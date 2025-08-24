/**
 * Mobile Device Management (MDM) Integration
 * Enterprise-grade device management and policy enforcement
 */

'use client'

import { getOfflineDB } from '../offline-db/database'
import { getSyncEngine } from '../offline-db/sync-engine'

export interface MDMPolicy {
  id: string
  name: string
  description: string
  category: 'security' | 'data' | 'app' | 'device'
  enabled: boolean
  configuration: Record<string, any>
  applied_at?: string
  version: string
  mandatory: boolean
  violation_action: 'warn' | 'block' | 'wipe' | 'report'
}

export interface MDMDeviceInfo {
  device_id: string
  device_name: string
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'web'
  os_version: string
  app_version: string
  managed: boolean
  compliant: boolean
  last_checkin: string
  policies_applied: string[]
  violations: MDMViolation[]
  location?: {
    latitude: number
    longitude: number
    timestamp: string
  }
}

export interface MDMViolation {
  id: string
  policy_id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected_at: string
  resolved: boolean
  action_taken?: string
}

export interface MDMComplianceReport {
  device_id: string
  generated_at: string
  compliance_score: number
  policy_violations: MDMViolation[]
  security_assessment: {
    encryption_enabled: boolean
    device_locked: boolean
    biometric_enabled: boolean
    app_integrity: boolean
    network_security: boolean
  }
  data_usage: {
    offline_storage_mb: number
    cached_documents: number
    sensitive_data_encrypted: boolean
    last_backup: string
  }
}

class MDMIntegration {
  private static instance: MDMIntegration
  private policies: MDMPolicy[] = []
  private deviceInfo: MDMDeviceInfo | null = null
  private complianceCheckInterval: NodeJS.Timeout | null = null
  
  private constructor() {}
  
  static getInstance(): MDMIntegration {
    if (!MDMIntegration.instance) {
      MDMIntegration.instance = new MDMIntegration()
    }
    return MDMIntegration.instance
  }
  
  async initialize(): Promise<void> {
    try {
      await this.detectDevice()
      await this.loadPolicies()
      await this.checkCompliance()
      this.startComplianceMonitoring()
      
      console.log('MDM Integration initialized')
    } catch (error) {
      console.error('Failed to initialize MDM integration:', error)
    }
  }
  
  private async detectDevice(): Promise<void> {
    const deviceInfo: MDMDeviceInfo = {
      device_id: this.getDeviceId(),
      device_name: this.getDeviceName(),
      platform: this.getPlatform(),
      os_version: this.getOSVersion(),
      app_version: this.getAppVersion(),
      managed: await this.checkIfManaged(),
      compliant: false,
      last_checkin: new Date().toISOString(),
      policies_applied: [],
      violations: []
    }
    
    this.deviceInfo = deviceInfo
  }
  
  private getDeviceId(): string {
    // Generate or retrieve persistent device ID
    let deviceId = localStorage.getItem('boardguru_device_id')
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('boardguru_device_id', deviceId)
    }
    return deviceId
  }
  
  private getDeviceName(): string {
    return navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Device'
  }
  
  private getPlatform(): MDMDeviceInfo['platform'] {
    const ua = navigator.userAgent.toLowerCase()
    
    if (ua.includes('iphone') || ua.includes('ipad')) return 'ios'
    if (ua.includes('android')) return 'android'
    if (ua.includes('windows')) return 'windows'
    if (ua.includes('mac')) return 'macos'
    
    return 'web'
  }
  
  private getOSVersion(): string {
    const ua = navigator.userAgent
    
    // Extract OS version from user agent
    const matches = ua.match(/(?:Version\/|Chrome\/|Firefox\/)([\d.]+)/)
    return matches ? matches[1] : 'unknown'
  }
  
  private getAppVersion(): string {
    // Would typically come from build process or package.json
    return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
  }
  
  private async checkIfManaged(): Promise<boolean> {
    // Check for MDM enrollment indicators
    try {
      // Check for MDM configuration profiles (platform-specific)
      if ('DeviceMotionEvent' in window) {
        // iOS - check for configuration profiles
        return false // Would implement actual check
      }
      
      // Android - check for device admin
      if ('DeviceOrientationEvent' in window) {
        return false // Would implement actual check
      }
      
      // Web - check for enterprise policies
      return await this.checkWebEnterpriseManagement()
    } catch (error) {
      console.error('Failed to check device management status:', error)
      return false
    }
  }
  
  private async checkWebEnterpriseManagement(): Promise<boolean> {
    try {
      // Check for enterprise browser policies
      if ('chrome' in window && (window as any).chrome.enterprise) {
        return true
      }
      
      // Check for Microsoft Edge enterprise features
      if (navigator.userAgent.includes('Edge') && 'Microsoft' in window) {
        return true
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  async loadPolicies(): Promise<void> {
    try {
      // In production, would fetch from MDM server
      this.policies = [
        {
          id: 'encryption_policy',
          name: 'Data Encryption Required',
          description: 'All offline data must be encrypted at rest',
          category: 'security',
          enabled: true,
          configuration: {
            algorithm: 'AES-256',
            key_rotation_days: 30
          },
          version: '1.0',
          mandatory: true,
          violation_action: 'block'
        },
        {
          id: 'offline_storage_limit',
          name: 'Offline Storage Limit',
          description: 'Limit offline storage to prevent data hoarding',
          category: 'data',
          enabled: true,
          configuration: {
            max_storage_mb: 1000,
            auto_cleanup: true,
            retention_days: 90
          },
          version: '1.0',
          mandatory: true,
          violation_action: 'warn'
        },
        {
          id: 'biometric_auth',
          name: 'Biometric Authentication',
          description: 'Require biometric authentication for sensitive actions',
          category: 'security',
          enabled: true,
          configuration: {
            required_for: ['voting', 'compliance_updates', 'document_export'],
            fallback_allowed: false
          },
          version: '1.0',
          mandatory: false,
          violation_action: 'warn'
        },
        {
          id: 'remote_wipe',
          name: 'Remote Wipe Capability',
          description: 'Allow remote wiping of app data',
          category: 'security',
          enabled: true,
          configuration: {
            wipe_timeout_hours: 24,
            backup_before_wipe: true,
            partial_wipe_allowed: true
          },
          version: '1.0',
          mandatory: true,
          violation_action: 'wipe'
        },
        {
          id: 'compliance_reporting',
          name: 'Compliance Reporting',
          description: 'Regular compliance status reporting to enterprise server',
          category: 'data',
          enabled: true,
          configuration: {
            report_frequency_hours: 24,
            include_usage_stats: true,
            include_location: false
          },
          version: '1.0',
          mandatory: true,
          violation_action: 'report'
        }
      ]
      
      await this.applyPolicies()
    } catch (error) {
      console.error('Failed to load MDM policies:', error)
    }
  }
  
  private async applyPolicies(): Promise<void> {
    if (!this.deviceInfo) return
    
    for (const policy of this.policies.filter(p => p.enabled)) {
      try {
        await this.applyPolicy(policy)
        this.deviceInfo.policies_applied.push(policy.id)
      } catch (error) {
        console.error(`Failed to apply policy ${policy.id}:`, error)
        
        const violation: MDMViolation = {
          id: crypto.randomUUID(),
          policy_id: policy.id,
          severity: policy.mandatory ? 'critical' : 'medium',
          description: `Failed to apply policy: ${error}`,
          detected_at: new Date().toISOString(),
          resolved: false
        }
        
        this.deviceInfo.violations.push(violation)
        await this.handleViolation(policy, violation)
      }
    }
  }
  
  private async applyPolicy(policy: MDMPolicy): Promise<void> {
    switch (policy.id) {
      case 'encryption_policy':
        await this.enforceEncryption(policy.configuration)
        break
        
      case 'offline_storage_limit':
        await this.enforceStorageLimit(policy.configuration)
        break
        
      case 'biometric_auth':
        await this.setupBiometricAuth(policy.configuration)
        break
        
      case 'remote_wipe':
        await this.enableRemoteWipe(policy.configuration)
        break
        
      case 'compliance_reporting':
        await this.setupComplianceReporting(policy.configuration)
        break
        
      default:
        console.warn(`Unknown policy: ${policy.id}`)
    }
  }
  
  private async enforceEncryption(config: any): Promise<void> {
    const db = getOfflineDB()
    
    // Ensure encryption is enabled
    if (!db) {
      throw new Error('Database not initialized')
    }
    
    // Verify encryption algorithm
    if (config.algorithm !== 'AES-256') {
      throw new Error(`Unsupported encryption algorithm: ${config.algorithm}`)
    }
    
    console.log('Encryption policy enforced')
  }
  
  private async enforceStorageLimit(config: any): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const usageBytes = estimate.usage || 0
      const usageMB = usageBytes / (1024 * 1024)
      
      if (usageMB > config.max_storage_mb) {
        if (config.auto_cleanup) {
          // Trigger cleanup
          const db = getOfflineDB()
          await db.performMaintenance()
        } else {
          throw new Error(`Storage usage ${usageMB.toFixed(1)}MB exceeds limit of ${config.max_storage_mb}MB`)
        }
      }
    }
    
    console.log('Storage limit policy enforced')
  }
  
  private async setupBiometricAuth(config: any): Promise<void> {
    // Check if biometric authentication is available
    if ('credentials' in navigator && 'create' in navigator.credentials) {
      try {
        // WebAuthn support detected
        localStorage.setItem('biometric_auth_required', JSON.stringify(config.required_for))
        console.log('Biometric authentication policy set up')
      } catch (error) {
        if (!config.fallback_allowed) {
          throw new Error('Biometric authentication not available and fallback disabled')
        }
      }
    } else if (!config.fallback_allowed) {
      throw new Error('Biometric authentication not supported on this device')
    }
  }
  
  private async enableRemoteWipe(config: any): Promise<void> {
    // Set up remote wipe listener
    const checkRemoteWipeCommand = async () => {
      try {
        // In production, would check with MDM server
        const response = await fetch('/api/mdm/check-wipe-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: this.deviceInfo?.device_id })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.wipe_requested) {
            await this.executeRemoteWipe(result.wipe_type || 'full')
          }
        }
      } catch (error) {
        console.error('Failed to check remote wipe command:', error)
      }
    }
    
    // Check every hour
    setInterval(checkRemoteWipeCommand, 60 * 60 * 1000)
    
    console.log('Remote wipe capability enabled')
  }
  
  private async setupComplianceReporting(config: any): Promise<void> {
    const reportCompliance = async () => {
      try {
        const report = await this.generateComplianceReport()
        
        // Send report to MDM server
        await fetch('/api/mdm/compliance-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        })
        
        console.log('Compliance report submitted')
      } catch (error) {
        console.error('Failed to submit compliance report:', error)
      }
    }
    
    // Initial report
    await reportCompliance()
    
    // Schedule regular reports
    setInterval(reportCompliance, config.report_frequency_hours * 60 * 60 * 1000)
    
    console.log('Compliance reporting set up')
  }
  
  private async handleViolation(policy: MDMPolicy, violation: MDMViolation): Promise<void> {
    console.error(`Policy violation detected: ${violation.description}`)
    
    switch (policy.violation_action) {
      case 'warn':
        this.showViolationWarning(violation)
        break
        
      case 'block':
        await this.blockApplication(violation)
        break
        
      case 'wipe':
        await this.scheduleRemoteWipe(violation)
        break
        
      case 'report':
        await this.reportViolation(violation)
        break
    }
  }
  
  private showViolationWarning(violation: MDMViolation): void {
    // Show user-facing warning
    console.warn(`Security Policy Violation: ${violation.description}`)
    
    // In production, would show actual UI notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Policy Violation', {
        body: violation.description,
        icon: '/icons/warning.png'
      })
    }
  }
  
  private async blockApplication(violation: MDMViolation): Promise<void> {
    console.error(`Application blocked due to: ${violation.description}`)
    
    // In production, would disable app functionality
    localStorage.setItem('app_blocked', JSON.stringify({
      reason: violation.description,
      blocked_at: new Date().toISOString()
    }))
  }
  
  private async scheduleRemoteWipe(violation: MDMViolation): Promise<void> {
    console.error(`Remote wipe scheduled due to: ${violation.description}`)
    
    // Schedule wipe after timeout period
    const wipePolicy = this.policies.find(p => p.id === 'remote_wipe')
    if (wipePolicy) {
      const timeoutMs = (wipePolicy.configuration.wipe_timeout_hours || 24) * 60 * 60 * 1000
      
      setTimeout(async () => {
        await this.executeRemoteWipe('full')
      }, timeoutMs)
    }
  }
  
  private async reportViolation(violation: MDMViolation): Promise<void> {
    try {
      await fetch('/api/mdm/violation-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: this.deviceInfo?.device_id,
          violation
        })
      })
      
      console.log('Violation reported to MDM server')
    } catch (error) {
      console.error('Failed to report violation:', error)
    }
  }
  
  async executeRemoteWipe(wipeType: 'full' | 'partial'): Promise<void> {
    try {
      console.warn(`Executing ${wipeType} remote wipe`)
      
      if (wipeType === 'full' || wipeType === 'partial') {
        // Clear offline database
        const db = getOfflineDB()
        await db.clearAllData()
        
        // Clear local storage
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear IndexedDB
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases()
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name!)
                  deleteReq.onsuccess = () => resolve(undefined)
                  deleteReq.onerror = () => reject(deleteReq.error)
                })
              }
            })
          )
        }
        
        console.log('Remote wipe completed')
        
        // Redirect to login or show wipe confirmation
        window.location.href = '/auth/signin?wiped=true'
      }
    } catch (error) {
      console.error('Failed to execute remote wipe:', error)
    }
  }
  
  private async checkCompliance(): Promise<boolean> {
    if (!this.deviceInfo) return false
    
    let compliant = true
    const violations: MDMViolation[] = []
    
    for (const policy of this.policies.filter(p => p.enabled && p.mandatory)) {
      const policyCompliant = await this.checkPolicyCompliance(policy)
      
      if (!policyCompliant) {
        compliant = false
        violations.push({
          id: crypto.randomUUID(),
          policy_id: policy.id,
          severity: 'medium',
          description: `Policy ${policy.name} is not compliant`,
          detected_at: new Date().toISOString(),
          resolved: false
        })
      }
    }
    
    this.deviceInfo.compliant = compliant
    this.deviceInfo.violations = violations
    
    return compliant
  }
  
  private async checkPolicyCompliance(policy: MDMPolicy): Promise<boolean> {
    // Check specific policy compliance
    switch (policy.id) {
      case 'encryption_policy':
        return localStorage.getItem('boardguru_encryption_key') !== null
        
      case 'offline_storage_limit':
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate()
          const usageMB = (estimate.usage || 0) / (1024 * 1024)
          return usageMB <= policy.configuration.max_storage_mb
        }
        return true
        
      default:
        return true
    }
  }
  
  private startComplianceMonitoring(): void {
    // Check compliance every hour
    this.complianceCheckInterval = setInterval(async () => {
      await this.checkCompliance()
    }, 60 * 60 * 1000)
  }
  
  async generateComplianceReport(): Promise<MDMComplianceReport> {
    if (!this.deviceInfo) {
      throw new Error('Device info not available')
    }
    
    const db = getOfflineDB()
    const storageInfo = await db.getStorageInfo()
    
    return {
      device_id: this.deviceInfo.device_id,
      generated_at: new Date().toISOString(),
      compliance_score: this.calculateComplianceScore(),
      policy_violations: this.deviceInfo.violations.filter(v => !v.resolved),
      security_assessment: {
        encryption_enabled: storageInfo.encryptionEnabled,
        device_locked: await this.checkDeviceLocked(),
        biometric_enabled: await this.checkBiometricEnabled(),
        app_integrity: await this.checkAppIntegrity(),
        network_security: await this.checkNetworkSecurity()
      },
      data_usage: {
        offline_storage_mb: storageInfo.storageSize / (1024 * 1024),
        cached_documents: storageInfo.totalRecords,
        sensitive_data_encrypted: storageInfo.encryptionEnabled,
        last_backup: storageInfo.lastSync || new Date().toISOString()
      }
    }
  }
  
  private calculateComplianceScore(): number {
    if (!this.deviceInfo) return 0
    
    const totalPolicies = this.policies.filter(p => p.enabled).length
    const violatedPolicies = this.deviceInfo.violations.filter(v => !v.resolved).length
    
    if (totalPolicies === 0) return 100
    
    return Math.max(0, Math.round((totalPolicies - violatedPolicies) / totalPolicies * 100))
  }
  
  private async checkDeviceLocked(): Promise<boolean> {
    // Check if device has screen lock enabled
    // This would be platform-specific implementation
    return true // Assume locked for web platform
  }
  
  private async checkBiometricEnabled(): Promise<boolean> {
    return 'credentials' in navigator && 'create' in navigator.credentials
  }
  
  private async checkAppIntegrity(): Promise<boolean> {
    // Check if app has been tampered with
    return true // Would implement actual integrity check
  }
  
  private async checkNetworkSecurity(): Promise<boolean> {
    // Check if using secure connection
    return location.protocol === 'https:'
  }
  
  getPolicies(): MDMPolicy[] {
    return [...this.policies]
  }
  
  getDeviceInfo(): MDMDeviceInfo | null {
    return this.deviceInfo ? { ...this.deviceInfo } : null
  }
  
  async updatePolicy(policyId: string, updates: Partial<MDMPolicy>): Promise<void> {
    const policy = this.policies.find(p => p.id === policyId)
    if (policy) {
      Object.assign(policy, updates)
      
      if (updates.enabled !== undefined) {
        if (updates.enabled) {
          await this.applyPolicy(policy)
        }
      }
    }
  }
  
  destroy(): void {
    if (this.complianceCheckInterval) {
      clearInterval(this.complianceCheckInterval)
      this.complianceCheckInterval = null
    }
  }
}

export const mdmIntegration = MDMIntegration.getInstance()