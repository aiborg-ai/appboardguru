/**
 * Mobile Security Service - Main Entry Point
 * Unified interface for all mobile security operations
 */

import { mobileSecurityOrchestrator } from './security/MobileSecurityOrchestrator';

export type {
  // Authentication Types
  MobileLoginRequest,
  MobileAuthSession,
  BiometricAuthResult,
  VoiceAuthenticationResult,
  MFAChallenge,
  MFAVerificationResult,
  
  // Security Types
  SecurityStatus,
  SecurityDashboard,
  ThreatAlert,
  ThreatResponse,
  DeviceAttestation,
  AttestationResult,
  
  // Policy & Compliance Types
  PolicyViolation,
  ComplianceReport,
  SecurityPolicyState,
  AuditReport,
  ForensicReport,
  
  // Configuration Types
  MobileSecurityConfig,
  SecurityInitializationResult,
  SecurityOperationRequest,
  SecurityResponse,
} from '@/types/mobile';

// Re-export all security services for direct access if needed
export { mobileAuthService } from './auth/MobileAuthService';
export { biometricAuthService } from './auth/BiometricAuthService';
export { multiFactorAuthService } from './auth/MultiFactorAuthService';
export { voiceAuthenticationService } from './auth/VoiceAuthenticationService';
export { secureStorageService } from './auth/SecureStorageService';
export { deviceSecurityService } from './security/DeviceSecurityService';
export { deviceAttestationService } from './security/DeviceAttestationService';
export { securityPolicyService } from './security/SecurityPolicyService';
export { threatDetectionService } from './security/ThreatDetectionService';
export { securityAuditService } from './security/SecurityAuditService';
export { mobileSecurityOrchestrator } from './security/MobileSecurityOrchestrator';

/**
 * Main Mobile Security Service
 * Provides a unified, high-level interface for all security operations
 */
export class MobileSecurityService {
  /**
   * Initialize the complete mobile security system
   */
  static async initialize(config?: any) {
    return mobileSecurityOrchestrator.initialize(config);
  }

  /**
   * Execute a coordinated security operation
   */
  static async executeSecurityOperation(request: any) {
    return mobileSecurityOrchestrator.executeSecurityOperation(request);
  }

  /**
   * Get comprehensive security status
   */
  static async getSecurityStatus() {
    return mobileSecurityOrchestrator.getSecurityStatus();
  }

  /**
   * Generate security dashboard
   */
  static async generateSecurityDashboard(timeframe?: any) {
    return mobileSecurityOrchestrator.generateSecurityDashboard(timeframe);
  }

  /**
   * Handle security emergency
   */
  static async handleSecurityEmergency(emergencyType: string, context: any, metadata?: any) {
    return mobileSecurityOrchestrator.handleSecurityEmergency(emergencyType, context, metadata);
  }
}

// Default export for convenience
export default MobileSecurityService;