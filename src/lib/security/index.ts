/**
 * Advanced Security & Compliance System
 * Comprehensive security framework for AppBoardGuru
 */

// ABAC (Attribute-Based Access Control)
export * from './abac/types'
export * from './abac/policy-engine'
export * from './abac/permission-evaluator'

// Enhanced Audit System
export * from '../audit/enhanced-audit-logger'

// Security Middleware
export * from './middleware/csrf-protection'
export * from './middleware/xss-protection'
export * from './middleware/sql-injection-protection'

// Encryption Services
export * from './encryption'

// Compliance
export * from '../compliance/gdpr-compliance'

// Security Testing
export * from './testing/security-test-suite'

// Legacy Security Components (backward compatibility)
export * from './audit'
export * from './auth-guard'
export * from './rate-limiter'
export * from './threat-detection'
export * from './validation'

// Main Security Manager Class
import { PolicyEngine } from './abac/policy-engine'
import { PermissionEvaluator } from './abac/permission-evaluator'
import { enhancedAuditLogger } from '../audit/enhanced-audit-logger'
import { csrfProtection } from './middleware/csrf-protection'
import { xssProtection } from './middleware/xss-protection'
import { sqlInjectionProtection } from './middleware/sql-injection-protection'
import { encryptionService } from './encryption'
import { gdprComplianceManager } from '../compliance/gdpr-compliance'
import { securityTestRunner } from './testing/security-test-suite'
import type { 
  ABACPolicy, 
  AccessRequest, 
  AccessDecision,
  FieldEncryptionRule,
  SecurityTestSuite 
} from './abac/types'

/**
 * Main Security Manager that orchestrates all security components
 */
export class SecurityManager {
  private policyEngine: PolicyEngine
  private permissionEvaluator: PermissionEvaluator
  private initialized = false

  constructor() {
    this.policyEngine = new PolicyEngine()
    this.permissionEvaluator = new PermissionEvaluator(this.policyEngine)
  }

  /**
   * Initialize the security system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Load default security policies
      await this.loadDefaultPolicies()

      // Initialize encryption keys
      await encryptionService.generateKey('default', 'system')

      // Set up default ABAC attribute resolvers
      this.setupDefaultAttributeResolvers()

      // Set up default obligation handlers
      this.setupDefaultObligationHandlers()

      this.initialized = true

      await enhancedAuditLogger.logEvent({
        eventType: 'system_admin',
        eventCategory: 'security_initialization',
        action: 'initialize_security_system',
        outcome: 'success',
        severity: 'low',
        resourceType: 'security_system',
        eventDescription: 'Advanced security system initialized successfully'
      })

    } catch (error) {
      await enhancedAuditLogger.logEvent({
        eventType: 'system_error',
        eventCategory: 'security_initialization',
        action: 'initialize_security_system',
        outcome: 'failure',
        severity: 'critical',
        resourceType: 'security_system',
        eventDescription: 'Failed to initialize security system',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Check permissions using ABAC
   */
  async checkPermission(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    context?: any
  ): Promise<AccessDecision> {
    this.ensureInitialized()
    return this.permissionEvaluator.checkPermission(userId, resourceType, resourceId, action, context)
  }

  /**
   * Register a new security policy
   */
  registerPolicy(policy: ABACPolicy): void {
    this.ensureInitialized()
    this.policyEngine.registerPolicy(policy)
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string | Buffer, keyId?: string): Promise<any> {
    return encryptionService.encrypt(data, keyId)
  }

  /**
   * Decrypt data
   */
  async decryptData(encryptedData: any): Promise<string | Buffer> {
    return encryptionService.decrypt(encryptedData)
  }

  /**
   * Encrypt object fields
   */
  async encryptObjectFields(
    obj: Record<string, any>,
    rules: FieldEncryptionRule[]
  ): Promise<{ encrypted: Record<string, any>; metadata: Record<string, any> }> {
    return encryptionService.encryptFields(obj, rules)
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event: any): Promise<string> {
    return enhancedAuditLogger.logEvent(event)
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: string,
    organizationId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<any> {
    return enhancedAuditLogger.generateComplianceReport(reportType, organizationId, timeRange)
  }

  /**
   * Process GDPR data subject rights request
   */
  async processDataSubjectRights(
    dataSubjectId: string,
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
    requestorEmail: string,
    organizationId?: string
  ): Promise<any> {
    switch (requestType) {
      case 'access':
        return gdprComplianceManager.processAccessRequest(dataSubjectId, requestorEmail, organizationId)
      case 'portability':
        return gdprComplianceManager.processPortabilityRequest(dataSubjectId, requestorEmail, 'json', organizationId)
      case 'erasure':
        return gdprComplianceManager.processErasureRequest(dataSubjectId, requestorEmail, organizationId)
      default:
        throw new Error(`Request type ${requestType} not implemented`)
    }
  }

  /**
   * Validate request for security threats
   */
  async validateRequest(request: any): Promise<{
    safe: boolean
    violations: any[]
    riskScore: number
  }> {
    // Check for XSS
    const xssResult = await xssProtection.scanRequest(request)
    
    // Check for SQL injection
    const sqlResult = await sqlInjectionProtection.analyzeRequest(request)
    
    // Check CSRF if applicable
    let csrfValid = true
    if (request.method !== 'GET') {
      const csrfResult = await csrfProtection.validateToken(request)
      csrfValid = csrfResult.valid
    }

    const allViolations = [
      ...xssResult.violations,
      ...sqlResult.violations
    ]

    const maxRiskScore = Math.max(
      xssResult.riskScore,
      sqlResult.riskScore,
      csrfValid ? 0 : 80
    )

    return {
      safe: xssResult.safe && sqlResult.safe && csrfValid,
      violations: allViolations,
      riskScore: maxRiskScore
    }
  }

  /**
   * Run security test suite
   */
  async runSecurityTests(): Promise<SecurityTestSuite> {
    return securityTestRunner.runSecurityTests()
  }

  /**
   * Get security system status
   */
  getSystemStatus(): {
    initialized: boolean
    components: {
      abac: boolean
      audit: boolean
      encryption: boolean
      compliance: boolean
      middleware: boolean
    }
    metrics: {
      totalPolicies: number
      encryptionKeys: any
      auditEvents: number
    }
  } {
    return {
      initialized: this.initialized,
      components: {
        abac: !!this.policyEngine,
        audit: !!enhancedAuditLogger,
        encryption: !!encryptionService,
        compliance: !!gdprComplianceManager,
        middleware: !!(csrfProtection && xssProtection && sqlInjectionProtection)
      },
      metrics: {
        totalPolicies: this.policyEngine?.getPolicies().length || 0,
        encryptionKeys: encryptionService?.getStats() || {},
        auditEvents: 0 // Would need to implement counter
      }
    }
  }

  /**
   * Private helper methods
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Security system not initialized. Call initialize() first.')
    }
  }

  private async loadDefaultPolicies(): Promise<void> {
    // Load default security policies
    const defaultPolicies: ABACPolicy[] = [
      {
        id: 'system-admin-policy',
        name: 'System Administrator Policy',
        description: 'Full access for system administrators',
        version: '1.0.0',
        status: 'active',
        priority: 1000,
        target: {
          subjects: [{
            attribute: 'subject.attributes.role',
            operator: 'equals',
            value: 'admin'
          }]
        },
        rules: [{
          id: 'admin-full-access',
          effect: 'permit',
          description: 'Allow admin full access'
        }],
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          tags: ['admin', 'system']
        }
      },
      {
        id: 'organization-member-policy',
        name: 'Organization Member Policy',
        description: 'Access control for organization members',
        version: '1.0.0',
        status: 'active',
        priority: 500,
        target: {
          subjects: [{
            attribute: 'subject.attributes.organizationRole',
            operator: 'in',
            value: ['member', 'admin', 'owner']
          }]
        },
        rules: [{
          id: 'member-organization-access',
          effect: 'permit',
          description: 'Allow organization members to access organization resources',
          condition: {
            operator: 'and',
            operands: [{
              attribute: 'resource.attributes.organizationId',
              operator: 'equals',
              value: 'subject.attributes.organizationId'
            }]
          }
        }],
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          tags: ['organization', 'member']
        }
      }
    ]

    defaultPolicies.forEach(policy => {
      this.policyEngine.registerPolicy(policy)
    })
  }

  private setupDefaultAttributeResolvers(): void {
    // Set up attribute resolvers for dynamic attribute resolution
    this.policyEngine.registerAttributeResolver('environment.current_time', async () => new Date())
    this.policyEngine.registerAttributeResolver('environment.business_hours', async () => {
      const hour = new Date().getHours()
      return hour >= 9 && hour <= 17
    })
  }

  private setupDefaultObligationHandlers(): void {
    // Set up obligation handlers
    this.policyEngine.registerObligationHandler('audit', async (obligation, context) => {
      await enhancedAuditLogger.logEvent({
        eventType: 'user_action',
        eventCategory: 'obligation_fulfillment',
        action: 'audit_obligation',
        outcome: 'success',
        severity: 'low',
        resourceType: context.resource.type,
        resourceId: context.resource.id,
        eventDescription: `Audit obligation fulfilled: ${obligation.id}`,
        details: {
          obligationId: obligation.id,
          obligationType: obligation.type,
          userId: context.subject.id
        }
      })
    })
  }
}

// Export singleton instance
export const securityManager = new SecurityManager()

// Initialize security system on import
securityManager.initialize().catch(console.error)

// Default export
export default SecurityManager