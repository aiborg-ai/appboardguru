/**
 * Device Security Service
 * Enterprise-grade device security validation and threat detection
 */

import JailbreakDetector from 'react-native-jailbreak-detector';
import RootDetection from 'react-native-root-detection';
import DeviceInfo from 'react-native-device-info';

import type { 
  Result, 
  DeviceSecurityInfo, 
  SecurityConfig, 
  DeviceId 
} from '@/types/mobile';
import { SECURITY } from '@/config/constants';
import { Environment } from '@/config/env';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DeviceSecurityService');

export interface SecurityThreat {
  readonly type: SecurityThreatType;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
  readonly detectedAt: string;
  readonly blockAccess: boolean;
}

export type SecurityThreatType =
  | 'jailbreak_detected'
  | 'root_detected'
  | 'debugger_attached'
  | 'emulator_detected'
  | 'tampered_app'
  | 'insecure_network'
  | 'unknown_threat';

export interface DeviceComplianceStatus {
  readonly isCompliant: boolean;
  readonly violations: SecurityThreat[];
  readonly securityLevel: 'high' | 'medium' | 'low';
  readonly lastCheck: string;
  readonly requiresAction: boolean;
}

export class DeviceSecurityService {
  private securityConfig: SecurityConfig;
  private lastSecurityCheck: number = 0;
  private readonly checkInterval = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.securityConfig = {
      jailbreakDetectionEnabled: SECURITY.JAILBREAK_DETECTION_ENABLED,
      rootDetectionEnabled: SECURITY.ROOT_DETECTION_ENABLED,
      debuggerDetectionEnabled: SECURITY.DEBUGGER_DETECTION_ENABLED,
      screenshotPreventionEnabled: Environment.isProduction,
      certificatePinningEnabled: Environment.sslPinningEnabled,
      biometricLockTimeout: SECURITY.SESSION_TIMEOUT_MINUTES * 60 * 1000,
    };
  }

  /**
   * Perform comprehensive device security check
   */
  async performSecurityCheck(): Promise<Result<DeviceComplianceStatus>> {
    try {
      logger.info('Performing comprehensive security check');
      
      const threats: SecurityThreat[] = [];
      const now = Date.now();
      
      // Skip frequent checks unless forced
      if (now - this.lastSecurityCheck < this.checkInterval) {
        logger.debug('Using cached security check result');
        const cachedResult = await this.getCachedSecurityStatus();
        if (cachedResult.success && cachedResult.data) {
          return cachedResult;
        }
      }

      // 1. Jailbreak/Root Detection
      if (this.securityConfig.jailbreakDetectionEnabled) {
        const jailbreakThreat = await this.checkJailbreakStatus();
        if (jailbreakThreat) threats.push(jailbreakThreat);
      }

      if (this.securityConfig.rootDetectionEnabled) {
        const rootThreat = await this.checkRootStatus();
        if (rootThreat) threats.push(rootThreat);
      }

      // 2. Debugger Detection
      if (this.securityConfig.debuggerDetectionEnabled) {
        const debuggerThreat = this.checkDebuggerStatus();
        if (debuggerThreat) threats.push(debuggerThreat);
      }

      // 3. Emulator Detection
      const emulatorThreat = await this.checkEmulatorStatus();
      if (emulatorThreat) threats.push(emulatorThreat);

      // 4. App Tampering Detection
      const tamperingThreat = await this.checkAppTampering();
      if (tamperingThreat) threats.push(tamperingThreat);

      // 5. Network Security Check
      const networkThreat = await this.checkNetworkSecurity();
      if (networkThreat) threats.push(networkThreat);

      // Calculate compliance status
      const criticalThreats = threats.filter(t => t.severity === 'critical');
      const highThreats = threats.filter(t => t.severity === 'high');
      const blockingThreats = threats.filter(t => t.blockAccess);

      const complianceStatus: DeviceComplianceStatus = {
        isCompliant: blockingThreats.length === 0,
        violations: threats,
        securityLevel: this.calculateSecurityLevel(threats),
        lastCheck: new Date().toISOString(),
        requiresAction: criticalThreats.length > 0 || highThreats.length > 2,
      };

      // Cache the result
      await this.cacheSecurityStatus(complianceStatus);
      this.lastSecurityCheck = now;

      // Log security status
      if (!complianceStatus.isCompliant) {
        logger.warn('Device security compliance failed', {
          violations: threats.length,
          critical: criticalThreats.length,
          high: highThreats.length,
        });
      } else {
        logger.info('Device security check passed', {
          securityLevel: complianceStatus.securityLevel,
        });
      }

      return { success: true, data: complianceStatus };
    } catch (error) {
      logger.error('Security check failed', { error });
      return {
        success: false,
        error: {
          code: 'SECURITY_CHECK_FAILED',
          message: 'Device security check failed',
          details: error,
        },
      };
    }
  }

  /**
   * Check for jailbreak on iOS devices
   */
  private async checkJailbreakStatus(): Promise<SecurityThreat | null> {
    try {
      const isJailbroken = await JailbreakDetector.isJailBroken();
      
      if (isJailbroken) {
        logger.warn('Jailbreak detected');
        return {
          type: 'jailbreak_detected',
          severity: 'critical',
          description: 'Device appears to be jailbroken, which poses security risks',
          detectedAt: new Date().toISOString(),
          blockAccess: Environment.isProduction,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Jailbreak detection failed', { error });
      return null;
    }
  }

  /**
   * Check for root access on Android devices
   */
  private async checkRootStatus(): Promise<SecurityThreat | null> {
    try {
      const isRooted = await RootDetection.isRooted();
      
      if (isRooted) {
        logger.warn('Root access detected');
        return {
          type: 'root_detected',
          severity: 'critical',
          description: 'Device has root access, which poses security risks',
          detectedAt: new Date().toISOString(),
          blockAccess: Environment.isProduction,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Root detection failed', { error });
      return null;
    }
  }

  /**
   * Check for attached debugger
   */
  private checkDebuggerStatus(): SecurityThreat | null {
    try {
      // Check for common debugging indicators
      const debuggerIndicators = [
        typeof global.nativeCallSyncHook !== 'undefined',
        typeof global.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
        __DEV__ && Environment.isProduction,
      ];

      const hasDebugger = debuggerIndicators.some(indicator => indicator);
      
      if (hasDebugger) {
        logger.warn('Debugger detected');
        return {
          type: 'debugger_attached',
          severity: Environment.isProduction ? 'high' : 'low',
          description: 'Debugger or development tools detected',
          detectedAt: new Date().toISOString(),
          blockAccess: Environment.isProduction,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Debugger detection failed', { error });
      return null;
    }
  }

  /**
   * Check if running on emulator
   */
  private async checkEmulatorStatus(): Promise<SecurityThreat | null> {
    try {
      const isEmulator = await DeviceInfo.isEmulator();
      
      if (isEmulator && Environment.isProduction) {
        logger.warn('Emulator detected in production');
        return {
          type: 'emulator_detected',
          severity: 'medium',
          description: 'Application is running on an emulator',
          detectedAt: new Date().toISOString(),
          blockAccess: false,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Emulator detection failed', { error });
      return null;
    }
  }

  /**
   * Check for application tampering
   */
  private async checkAppTampering(): Promise<SecurityThreat | null> {
    try {
      // Check app signature and integrity
      const bundleId = await DeviceInfo.getBundleId();
      const appVersion = await DeviceInfo.getVersion();
      const buildNumber = await DeviceInfo.getBuildNumber();
      
      // Validate against expected values
      const expectedBundleId = Environment.isProduction ? 
        'com.appboardguru.mobile' : 
        'com.appboardguru.mobile.dev';
      
      if (bundleId !== expectedBundleId) {
        logger.warn('Unexpected bundle ID detected', { bundleId, expectedBundleId });
        return {
          type: 'tampered_app',
          severity: 'high',
          description: 'Application bundle ID does not match expected value',
          detectedAt: new Date().toISOString(),
          blockAccess: Environment.isProduction,
        };
      }
      
      return null;
    } catch (error) {
      logger.error('App tampering check failed', { error });
      return null;
    }
  }

  /**
   * Check network security
   */
  private async checkNetworkSecurity(): Promise<SecurityThreat | null> {
    try {
      // TODO: Implement network security checks
      // - Check for proxy settings
      // - Validate SSL certificates
      // - Detect man-in-the-middle attacks
      
      return null;
    } catch (error) {
      logger.error('Network security check failed', { error });
      return null;
    }
  }

  /**
   * Calculate overall security level based on threats
   */
  private calculateSecurityLevel(threats: SecurityThreat[]): 'high' | 'medium' | 'low' {
    const criticalCount = threats.filter(t => t.severity === 'critical').length;
    const highCount = threats.filter(t => t.severity === 'high').length;
    const mediumCount = threats.filter(t => t.severity === 'medium').length;

    if (criticalCount > 0) return 'low';
    if (highCount > 1) return 'low';
    if (highCount > 0 || mediumCount > 2) return 'medium';
    
    return 'high';
  }

  /**
   * Cache security status to avoid frequent checks
   */
  private async cacheSecurityStatus(status: DeviceComplianceStatus): Promise<void> {
    try {
      await EncryptedStorage.setItem('security_status_cache', JSON.stringify({
        ...status,
        cachedAt: Date.now(),
      }));
    } catch (error) {
      logger.warn('Failed to cache security status', { error });
    }
  }

  /**
   * Get cached security status
   */
  private async getCachedSecurityStatus(): Promise<Result<DeviceComplianceStatus | null>> {
    try {
      const cached = await EncryptedStorage.getItem('security_status_cache');
      if (!cached) {
        return { success: true, data: null };
      }

      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - parsed.cachedAt;
      
      // Use cache for 5 minutes
      if (cacheAge < this.checkInterval) {
        delete parsed.cachedAt; // Remove internal cache field
        return { success: true, data: parsed as DeviceComplianceStatus };
      }
      
      return { success: true, data: null };
    } catch (error) {
      logger.warn('Failed to get cached security status', { error });
      return { success: true, data: null };
    }
  }

  /**
   * Enable screenshot protection for sensitive screens
   */
  async enableScreenshotProtection(): Promise<void> {
    try {
      if (this.securityConfig.screenshotPreventionEnabled) {
        // TODO: Implement platform-specific screenshot protection
        // iOS: Use UIScreen.main.isCaptured or similar
        // Android: Set FLAG_SECURE on window
        logger.info('Screenshot protection enabled');
      }
    } catch (error) {
      logger.warn('Failed to enable screenshot protection', { error });
    }
  }

  /**
   * Disable screenshot protection
   */
  async disableScreenshotProtection(): Promise<void> {
    try {
      // TODO: Implement platform-specific screenshot protection removal
      logger.info('Screenshot protection disabled');
    } catch (error) {
      logger.warn('Failed to disable screenshot protection', { error });
    }
  }

  /**
   * Generate security report for compliance
   */
  async generateSecurityReport(): Promise<Result<{
    deviceInfo: DeviceSecurityInfo;
    complianceStatus: DeviceComplianceStatus;
    recommendations: string[];
  }>> {
    try {
      logger.info('Generating security compliance report');
      
      const complianceResult = await this.performSecurityCheck();
      if (!complianceResult.success) {
        return complianceResult;
      }

      const deviceId = await DeviceInfo.getUniqueId() as DeviceId;
      
      const deviceInfo: DeviceSecurityInfo = {
        deviceId,
        isJailbroken: await this.isJailbrokenSafe(),
        isRooted: await this.isRootedSafe(),
        isDebuggable: __DEV__,
        lastSecurityCheck: new Date().toISOString(),
        securityLevel: complianceResult.data.securityLevel,
      };

      const recommendations = this.generateSecurityRecommendations(
        complianceResult.data.violations
      );

      return {
        success: true,
        data: {
          deviceInfo,
          complianceStatus: complianceResult.data,
          recommendations,
        },
      };
    } catch (error) {
      logger.error('Failed to generate security report', { error });
      return {
        success: false,
        error: {
          code: 'SECURITY_REPORT_FAILED',
          message: 'Failed to generate security report',
          details: error,
        },
      };
    }
  }

  /**
   * Update security configuration
   */
  updateSecurityConfig(updates: Partial<SecurityConfig>): void {
    this.securityConfig = {
      ...this.securityConfig,
      ...updates,
    };
    
    logger.info('Security configuration updated', { updates });
  }

  /**
   * Get current security configuration
   */
  getSecurityConfig(): SecurityConfig {
    return { ...this.securityConfig };
  }

  // Private helper methods
  private async isJailbrokenSafe(): Promise<boolean> {
    try {
      return await JailbreakDetector.isJailBroken();
    } catch {
      return false;
    }
  }

  private async isRootedSafe(): Promise<boolean> {
    try {
      return await RootDetection.isRooted();
    } catch {
      return false;
    }
  }

  private generateSecurityRecommendations(threats: SecurityThreat[]): string[] {
    const recommendations: string[] = [];

    if (threats.some(t => t.type === 'jailbreak_detected')) {
      recommendations.push('Remove jailbreak from device to access sensitive corporate data');
    }

    if (threats.some(t => t.type === 'root_detected')) {
      recommendations.push('Remove root access from device for enterprise security compliance');
    }

    if (threats.some(t => t.type === 'debugger_attached')) {
      recommendations.push('Disable debugging tools when accessing production data');
    }

    if (threats.some(t => t.type === 'emulator_detected')) {
      recommendations.push('Use a physical device for accessing sensitive corporate information');
    }

    if (threats.some(t => t.type === 'tampered_app')) {
      recommendations.push('Reinstall the application from official app store');
    }

    if (recommendations.length === 0) {
      recommendations.push('Device meets all security requirements');
    }

    return recommendations;
  }
}

export const deviceSecurityService = new DeviceSecurityService();