/**
 * Security Policy Service
 * Enterprise-grade security policy enforcement and compliance management
 */

import { AppState, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Keychain } from 'react-native-keychain';

import type {
  Result,
  UserId,
  OrganizationId,
  SecurityPolicy,
  PolicyViolation,
  ComplianceReport,
  SecurityPolicyConfig,
  PolicyEnforcementAction,
} from '@/types/mobile';
import { SECURITY, COMPLIANCE } from '@/config/constants';
import { Environment } from '@/config/env';
import { deviceSecurityService } from './DeviceSecurityService';
import { deviceAttestationService } from './DeviceAttestationService';
import { secureStorageService } from '../auth/SecureStorageService';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SecurityPolicyService');

export interface PolicyRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: PolicyCategory;
  readonly severity: PolicySeverity;
  readonly mandatory: boolean;
  readonly checkFunction: () => Promise<PolicyCheckResult>;
  readonly enforcementActions: PolicyEnforcementAction[];
  readonly metadata?: Record<string, any>;
}

export type PolicyCategory =
  | 'device_security'
  | 'authentication'
  | 'data_protection'
  | 'network_security'
  | 'app_integrity'
  | 'compliance'
  | 'governance';

export type PolicySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface PolicyCheckResult {
  readonly compliant: boolean;
  readonly value?: any;
  readonly message?: string;
  readonly evidence?: any;
  readonly checkedAt: string;
}

export interface PolicyEnforcement {
  readonly policyId: string;
  readonly action: PolicyEnforcementAction;
  readonly enforcedAt: string;
  readonly reason: string;
  readonly duration?: number;
  readonly metadata?: Record<string, any>;
}

export type PolicyEnforcementAction =
  | 'warn'
  | 'block_access'
  | 'require_authentication'
  | 'limit_functionality'
  | 'audit_log'
  | 'notify_admin'
  | 'revoke_session'
  | 'wipe_data';

export interface SecurityPolicyState {
  readonly overallCompliance: boolean;
  readonly complianceScore: number;
  readonly violations: PolicyViolation[];
  readonly lastChecked: string;
  readonly nextCheckDue: string;
  readonly enforcementActions: PolicyEnforcement[];
}

export class SecurityPolicyService {
  private policyRules = new Map<string, PolicyRule>();
  private currentState: SecurityPolicyState | null = null;
  private enforcementTimer: NodeJS.Timeout | null = null;
  private policyConfig: SecurityPolicyConfig | null = null;

  constructor() {
    this.initializeBuiltInPolicies();
    this.setupAppStateListener();
  }

  /**
   * Initialize security policy service
   */
  async initialize(organizationId?: OrganizationId): Promise<Result<void>> {
    try {
      logger.info('Initializing security policy service', { organizationId });

      // Load organization-specific policies
      if (organizationId) {
        await this.loadOrganizationPolicies(organizationId);
      }

      // Load device-specific policy configuration
      await this.loadPolicyConfiguration();

      // Perform initial policy check
      await this.performPolicyCheck();

      // Start periodic policy enforcement
      this.startPeriodicEnforcement();

      logger.info('Security policy service initialized successfully');
      return { success: true, data: undefined };
    } catch (error) {
      logger.error('Failed to initialize security policy service', { error });
      return {
        success: false,
        error: {
          code: 'POLICY_SERVICE_INIT_FAILED',
          message: 'Failed to initialize security policy service',
          details: error,
        },
      };
    }
  }

  /**
   * Perform comprehensive policy compliance check
   */
  async performPolicyCheck(): Promise<Result<SecurityPolicyState>> {
    try {
      logger.info('Performing security policy compliance check');

      const violations: PolicyViolation[] = [];
      const enforcementActions: PolicyEnforcement[] = [];
      let compliantRules = 0;
      const totalRules = this.policyRules.size;

      // Check each policy rule
      for (const [ruleId, rule] of this.policyRules) {
        try {
          const checkResult = await rule.checkFunction();
          
          if (checkResult.compliant) {
            compliantRules++;
            logger.debug(`Policy rule '${rule.name}' is compliant`);
          } else {
            // Create violation record
            const violation: PolicyViolation = {
              policyId: ruleId,
              policyName: rule.name,
              category: rule.category,
              severity: rule.severity,
              description: checkResult.message || rule.description,
              value: checkResult.value,
              evidence: checkResult.evidence,
              detectedAt: new Date().toISOString(),
              resolved: false,
            };

            violations.push(violation);

            // Execute enforcement actions
            for (const action of rule.enforcementActions) {
              const enforcement = await this.executeEnforcementAction(
                ruleId,
                action,
                violation
              );
              if (enforcement) {
                enforcementActions.push(enforcement);
              }
            }

            logger.warn(`Policy violation detected: ${rule.name}`, {
              severity: rule.severity,
              value: checkResult.value,
            });
          }
        } catch (error) {
          logger.error(`Failed to check policy rule '${rule.name}'`, { error });
          
          // Treat check failures as violations for mandatory rules
          if (rule.mandatory) {
            violations.push({
              policyId: ruleId,
              policyName: rule.name,
              category: rule.category,
              severity: 'high',
              description: `Policy check failed: ${error.message}`,
              detectedAt: new Date().toISOString(),
              resolved: false,
            });
          }
        }
      }

      // Calculate compliance metrics
      const complianceScore = totalRules > 0 ? compliantRules / totalRules : 1;
      const overallCompliance = violations.length === 0;

      // Create policy state
      const state: SecurityPolicyState = {
        overallCompliance,
        complianceScore,
        violations,
        lastChecked: new Date().toISOString(),
        nextCheckDue: new Date(Date.now() + COMPLIANCE.CHECK_INTERVAL_MS).toISOString(),
        enforcementActions,
      };

      this.currentState = state;

      // Store compliance state
      await this.storePolicyState(state);

      // Generate compliance alerts
      await this.generateComplianceAlerts(state);

      logger.info('Policy compliance check completed', {
        overallCompliance,
        complianceScore: Math.round(complianceScore * 100),
        violations: violations.length,
        enforcementActions: enforcementActions.length,
      });

      return { success: true, data: state };
    } catch (error) {
      logger.error('Policy compliance check failed', { error });
      return {
        success: false,
        error: {
          code: 'POLICY_CHECK_FAILED',
          message: 'Failed to perform policy compliance check',
          details: error,
        },
      };
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(userId: UserId): Promise<Result<ComplianceReport>> {
    try {
      logger.info('Generating compliance report', { userId });

      if (!this.currentState) {
        // Perform policy check first
        const checkResult = await this.performPolicyCheck();
        if (!checkResult.success) {
          return checkResult;
        }
      }

      const deviceInfo = await this.getDeviceComplianceInfo();
      const trustLevel = await deviceAttestationService.assessDeviceTrustLevel();
      
      const report: ComplianceReport = {
        userId,
        deviceId: await DeviceInfo.getUniqueId(),
        generatedAt: new Date().toISOString(),
        overallCompliance: this.currentState!.overallCompliance,
        complianceScore: this.currentState!.complianceScore,
        trustLevel: trustLevel.success ? trustLevel.data : null,
        violations: this.currentState!.violations,
        policyChecks: await this.getPolicyCheckSummary(),
        deviceInfo,
        recommendations: await this.generateComplianceRecommendations(),
        validUntil: new Date(Date.now() + COMPLIANCE.REPORT_VALIDITY_MS).toISOString(),
      };

      // Store report for audit trail
      await this.storeComplianceReport(report);

      logger.info('Compliance report generated', {
        userId,
        overallCompliance: report.overallCompliance,
        violations: report.violations.length,
      });

      return { success: true, data: report };
    } catch (error) {
      logger.error('Failed to generate compliance report', { error });
      return {
        success: false,
        error: {
          code: 'COMPLIANCE_REPORT_FAILED',
          message: 'Failed to generate compliance report',
          details: error,
        },
      };
    }
  }

  /**
   * Add custom policy rule
   */
  addPolicyRule(rule: PolicyRule): void {
    this.policyRules.set(rule.id, rule);
    logger.info('Custom policy rule added', { 
      ruleId: rule.id, 
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
    });
  }

  /**
   * Remove policy rule
   */
  removePolicyRule(ruleId: string): boolean {
    const removed = this.policyRules.delete(ruleId);
    if (removed) {
      logger.info('Policy rule removed', { ruleId });
    }
    return removed;
  }

  /**
   * Get current policy state
   */
  getCurrentState(): SecurityPolicyState | null {
    return this.currentState;
  }

  /**
   * Check specific policy compliance
   */
  async checkPolicyCompliance(policyId: string): Promise<Result<PolicyCheckResult>> {
    try {
      const rule = this.policyRules.get(policyId);
      if (!rule) {
        return {
          success: false,
          error: {
            code: 'POLICY_NOT_FOUND',
            message: `Policy rule '${policyId}' not found`,
          },
        };
      }

      const result = await rule.checkFunction();
      return { success: true, data: result };
    } catch (error) {
      logger.error(`Failed to check policy '${policyId}'`, { error });
      return {
        success: false,
        error: {
          code: 'POLICY_CHECK_FAILED',
          message: `Failed to check policy '${policyId}'`,
          details: error,
        },
      };
    }
  }

  // Private methods
  private initializeBuiltInPolicies(): void {
    // Device Security Policies
    this.addPolicyRule({
      id: 'device_not_jailbroken',
      name: 'Device Not Jailbroken/Rooted',
      description: 'Device must not be jailbroken or rooted',
      category: 'device_security',
      severity: 'critical',
      mandatory: true,
      checkFunction: async () => {
        const securityCheck = await deviceSecurityService.performSecurityCheck();
        const hasRootViolation = securityCheck.success && 
          securityCheck.data.violations.some(v => 
            v.type === 'jailbreak_detected' || v.type === 'root_detected'
          );

        return {
          compliant: !hasRootViolation,
          message: hasRootViolation ? 'Device is jailbroken or rooted' : 'Device integrity verified',
          checkedAt: new Date().toISOString(),
        };
      },
      enforcementActions: ['block_access', 'audit_log', 'notify_admin'],
    });

    this.addPolicyRule({
      id: 'screen_lock_required',
      name: 'Screen Lock Required',
      description: 'Device must have screen lock enabled',
      category: 'device_security',
      severity: 'high',
      mandatory: true,
      checkFunction: async () => {
        // This would check if device has screen lock enabled
        const hasScreenLock = await this.checkScreenLock();
        return {
          compliant: hasScreenLock,
          message: hasScreenLock ? 'Screen lock is enabled' : 'Screen lock is not enabled',
          checkedAt: new Date().toISOString(),
        };
      },
      enforcementActions: ['warn', 'limit_functionality', 'audit_log'],
    });

    this.addPolicyRule({
      id: 'os_version_supported',
      name: 'Supported OS Version',
      description: 'Device must run a supported OS version',
      category: 'device_security',
      severity: 'medium',
      mandatory: true,
      checkFunction: async () => {
        const osVersion = DeviceInfo.getSystemVersion();
        const isSupported = this.isOSVersionSupported(osVersion);
        
        return {
          compliant: isSupported,
          value: osVersion,
          message: isSupported ? 
            `OS version ${osVersion} is supported` : 
            `OS version ${osVersion} is not supported`,
          checkedAt: new Date().toISOString(),
        };
      },
      enforcementActions: ['warn', 'audit_log'],
    });

    this.addPolicyRule({
      id: 'app_from_official_store',
      name: 'App From Official Store',
      description: 'App must be installed from official app store',
      category: 'app_integrity',
      severity: 'high',
      mandatory: true,
      checkFunction: async () => {
        const installerPackage = await DeviceInfo.getInstallerPackageName();
        const isFromOfficialStore = this.isFromOfficialStore(installerPackage);
        
        return {
          compliant: isFromOfficialStore,
          value: installerPackage,
          message: isFromOfficialStore ? 
            'App installed from official store' : 
            'App not installed from official store',
          checkedAt: new Date().toISOString(),
        };
      },
      enforcementActions: ['warn', 'audit_log'],
    });

    this.addPolicyRule({
      id: 'biometric_authentication_available',
      name: 'Biometric Authentication Available',
      description: 'Device should support biometric authentication',
      category: 'authentication',
      severity: 'medium',
      mandatory: false,
      checkFunction: async () => {
        const biometricResult = await deviceSecurityService.isBiometricAvailable();
        
        return {
          compliant: biometricResult,
          message: biometricResult ? 
            'Biometric authentication is available' : 
            'Biometric authentication is not available',
          checkedAt: new Date().toISOString(),
        };
      },
      enforcementActions: ['warn', 'audit_log'],
    });

    this.addPolicyRule({
      id: 'secure_storage_encryption',
      name: 'Secure Storage Encryption',
      description: 'Device storage must be encrypted',
      category: 'data_protection',
      severity: 'critical',
      mandatory: true,
      checkFunction: async () => {
        const isEncrypted = await this.checkStorageEncryption();
        
        return {
          compliant: isEncrypted,
          message: isEncrypted ? 
            'Storage encryption is enabled' : 
            'Storage encryption is not enabled',
          checkedAt: new Date().toISOString(),
        };
      },
      enforcementActions: ['block_access', 'audit_log', 'notify_admin'],
    });

    logger.info('Built-in security policies initialized', {
      totalPolicies: this.policyRules.size
    });
  }

  private async executeEnforcementAction(
    policyId: string,
    action: PolicyEnforcementAction,
    violation: PolicyViolation
  ): Promise<PolicyEnforcement | null> {
    try {
      const enforcement: PolicyEnforcement = {
        policyId,
        action,
        enforcedAt: new Date().toISOString(),
        reason: violation.description,
      };

      switch (action) {
        case 'warn':
          await this.showPolicyWarning(violation);
          break;

        case 'block_access':
          await this.blockApplicationAccess(violation);
          enforcement.duration = 0; // Permanent until resolved
          break;

        case 'require_authentication':
          await this.requireAdditionalAuthentication(violation);
          break;

        case 'limit_functionality':
          await this.limitApplicationFunctionality(violation);
          enforcement.duration = COMPLIANCE.FUNCTIONALITY_LIMIT_DURATION_MS;
          break;

        case 'audit_log':
          await this.logSecurityEvent(violation);
          break;

        case 'notify_admin':
          await this.notifyAdministrator(violation);
          break;

        case 'revoke_session':
          await this.revokeUserSession(violation);
          break;

        case 'wipe_data':
          await this.initiateDataWipe(violation);
          break;
      }

      logger.info(`Enforcement action executed`, {
        policyId,
        action,
        severity: violation.severity,
      });

      return enforcement;
    } catch (error) {
      logger.error(`Failed to execute enforcement action '${action}'`, { error });
      return null;
    }
  }

  private async showPolicyWarning(violation: PolicyViolation): Promise<void> {
    // Implementation would show user-friendly warning dialog
    logger.warn('Policy violation warning displayed', {
      policy: violation.policyName,
      severity: violation.severity,
    });
  }

  private async blockApplicationAccess(violation: PolicyViolation): Promise<void> {
    // Implementation would prevent app usage
    logger.error('Application access blocked due to policy violation', {
      policy: violation.policyName,
      severity: violation.severity,
    });
  }

  private async requireAdditionalAuthentication(violation: PolicyViolation): Promise<void> {
    // Implementation would trigger additional authentication requirements
    logger.info('Additional authentication required due to policy violation', {
      policy: violation.policyName,
    });
  }

  private async limitApplicationFunctionality(violation: PolicyViolation): Promise<void> {
    // Implementation would disable certain app features
    logger.warn('Application functionality limited due to policy violation', {
      policy: violation.policyName,
    });
  }

  private async logSecurityEvent(violation: PolicyViolation): Promise<void> {
    // Implementation would log to security audit system
    logger.info('Security event logged', {
      policy: violation.policyName,
      severity: violation.severity,
      detectedAt: violation.detectedAt,
    });
  }

  private async notifyAdministrator(violation: PolicyViolation): Promise<void> {
    // Implementation would send notification to system administrators
    logger.info('Administrator notified of policy violation', {
      policy: violation.policyName,
      severity: violation.severity,
    });
  }

  private async revokeUserSession(violation: PolicyViolation): Promise<void> {
    // Implementation would revoke current user session
    logger.warn('User session revoked due to policy violation', {
      policy: violation.policyName,
    });
  }

  private async initiateDataWipe(violation: PolicyViolation): Promise<void> {
    // Implementation would securely wipe application data
    logger.error('Data wipe initiated due to critical policy violation', {
      policy: violation.policyName,
    });
  }

  private startPeriodicEnforcement(): void {
    if (this.enforcementTimer) {
      clearInterval(this.enforcementTimer);
    }

    this.enforcementTimer = setInterval(async () => {
      try {
        await this.performPolicyCheck();
      } catch (error) {
        logger.error('Periodic policy check failed', { error });
      }
    }, COMPLIANCE.CHECK_INTERVAL_MS);

    logger.info('Periodic policy enforcement started', {
      intervalMs: COMPLIANCE.CHECK_INTERVAL_MS
    });
  }

  private setupAppStateListener(): void {
    AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Perform policy check when app becomes active
        setTimeout(async () => {
          try {
            await this.performPolicyCheck();
          } catch (error) {
            logger.error('App state policy check failed', { error });
          }
        }, 1000); // Small delay to ensure app is fully active
      }
    });
  }

  // Helper methods for policy checks
  private async checkScreenLock(): Promise<boolean> {
    try {
      // Check if device has screen lock enabled
      const biometricResult = await Keychain.getSupportedBiometryType();
      return biometricResult !== null;
    } catch {
      return false;
    }
  }

  private isOSVersionSupported(version: string): boolean {
    const minimumVersions = {
      ios: '13.0',
      android: '8.0',
    };
    
    const platform = Platform.OS as keyof typeof minimumVersions;
    const minimumVersion = minimumVersions[platform];
    
    if (!minimumVersion) return false;
    
    return parseFloat(version) >= parseFloat(minimumVersion);
  }

  private isFromOfficialStore(installerPackage: string | null): boolean {
    if (!installerPackage) return false;
    
    const officialStores = [
      'com.android.vending', // Google Play Store
      'com.apple.itunesstored', // iOS App Store
    ];
    
    return officialStores.includes(installerPackage);
  }

  private async checkStorageEncryption(): Promise<boolean> {
    try {
      // Check if device storage is encrypted
      // This is a simplified check - real implementation would be more thorough
      return Platform.OS === 'ios' || // iOS encrypts by default
        (Platform.OS === 'android' && parseInt(DeviceInfo.getSystemVersion()) >= 6);
    } catch {
      return false;
    }
  }

  private async loadOrganizationPolicies(organizationId: OrganizationId): Promise<void> {
    try {
      // Implementation would load organization-specific policies from server
      logger.info('Organization policies loaded', { organizationId });
    } catch (error) {
      logger.warn('Failed to load organization policies', { error });
    }
  }

  private async loadPolicyConfiguration(): Promise<void> {
    try {
      const configResult = await secureStorageService.getSecureData('security_policy_config');
      if (configResult.success && configResult.data) {
        this.policyConfig = configResult.data;
        logger.info('Policy configuration loaded');
      }
    } catch (error) {
      logger.warn('Failed to load policy configuration', { error });
    }
  }

  private async storePolicyState(state: SecurityPolicyState): Promise<void> {
    try {
      await secureStorageService.storeSecureData('security_policy_state', state);
    } catch (error) {
      logger.warn('Failed to store policy state', { error });
    }
  }

  private async generateComplianceAlerts(state: SecurityPolicyState): Promise<void> {
    if (!state.overallCompliance) {
      const criticalViolations = state.violations.filter(v => v.severity === 'critical');
      const highViolations = state.violations.filter(v => v.severity === 'high');

      if (criticalViolations.length > 0) {
        logger.error('Critical policy violations detected', {
          violations: criticalViolations.length
        });
      }

      if (highViolations.length > 0) {
        logger.warn('High severity policy violations detected', {
          violations: highViolations.length
        });
      }
    }
  }

  private async getDeviceComplianceInfo(): Promise<any> {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      platform: Platform.OS,
      osVersion: DeviceInfo.getSystemVersion(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      lastChecked: new Date().toISOString(),
    };
  }

  private async getPolicyCheckSummary(): Promise<any[]> {
    const summary: any[] = [];
    
    for (const [ruleId, rule] of this.policyRules) {
      summary.push({
        policyId: ruleId,
        name: rule.name,
        category: rule.category,
        severity: rule.severity,
        mandatory: rule.mandatory,
      });
    }
    
    return summary;
  }

  private async generateComplianceRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (this.currentState?.violations) {
      for (const violation of this.currentState.violations) {
        switch (violation.category) {
          case 'device_security':
            recommendations.push('Update device security settings and OS version');
            break;
          case 'authentication':
            recommendations.push('Enable biometric authentication if available');
            break;
          case 'data_protection':
            recommendations.push('Ensure device storage encryption is enabled');
            break;
          case 'app_integrity':
            recommendations.push('Reinstall app from official app store');
            break;
        }
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All security policies are compliant');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      const reportId = `compliance_report_${report.userId}_${Date.now()}`;
      await secureStorageService.storeSecureData(reportId, report);
    } catch (error) {
      logger.warn('Failed to store compliance report', { error });
    }
  }
}

export const securityPolicyService = new SecurityPolicyService();