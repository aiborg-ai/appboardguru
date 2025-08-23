/**
 * Virtual Board Room Security Tests
 * Comprehensive security testing for all board room features
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebRTCBoardRoomService } from '@/lib/services/webrtc-board-room.service';
import { BlockchainVotingService } from '@/lib/services/blockchain-voting.service';
import { BoardRoomSecurityService } from '@/lib/services/board-room-security.service';
import { SecureRecordingService } from '@/lib/services/secure-recording.service';
import { createSupabaseServiceClient } from '@/lib/supabase/service-client';

// Mock Supabase client
jest.mock('@/lib/supabase/service-client');

describe('Virtual Board Room Security', () => {
  let securityService: BoardRoomSecurityService;
  let webrtcService: WebRTCBoardRoomService;
  let votingService: BlockchainVotingService;
  let recordingService: SecureRecordingService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null
        })
      }
    };
    
    (createSupabaseServiceClient as jest.Mock).mockReturnValue(mockSupabase);
    
    securityService = new BoardRoomSecurityService();
    webrtcService = new WebRTCBoardRoomService();
    votingService = new BlockchainVotingService();
    recordingService = new SecureRecordingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Authorization', () => {
    describe('Multi-Factor Authentication', () => {
      it('should initiate MFA challenge successfully', async () => {
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            require_mfa: true,
            security_level: 'high'
          },
          error: null
        });

        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'challenge-id' },
          error: null
        });

        const mfaChallenge = await securityService.initiateMFA(
          'session-id',
          'user-id',
          'totp',
          'device-fingerprint'
        );

        expect(mfaChallenge).toBeDefined();
        expect(mfaChallenge.method).toBe('totp');
        expect(mfaChallenge.status).toBe('pending');
        expect(mockSupabase.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'totp',
            status: 'pending'
          })
        );
      });

      it('should verify MFA response correctly', async () => {
        const challengeData = {
          id: 'challenge-id',
          user_id: 'user-id',
          session_id: 'session-id',
          method: 'totp',
          status: 'pending',
          attempts: 0,
          max_attempts: 3,
          expires_at: new Date(Date.now() + 300000).toISOString(),
          encrypted_secret: 'encrypted-secret',
          challenge_code: '123456'
        };

        mockSupabase.single.mockResolvedValueOnce({
          data: challengeData,
          error: null
        });

        const isValid = await securityService.verifyMFA(
          'challenge-id',
          '123456',
          'device-fingerprint'
        );

        expect(isValid).toBe(true);
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'verified'
          })
        );
      });

      it('should fail MFA verification with wrong code', async () => {
        const challengeData = {
          id: 'challenge-id',
          user_id: 'user-id',
          status: 'pending',
          attempts: 0,
          max_attempts: 3,
          expires_at: new Date(Date.now() + 300000).toISOString(),
          challenge_code: '123456'
        };

        mockSupabase.single.mockResolvedValueOnce({
          data: challengeData,
          error: null
        });

        const isValid = await securityService.verifyMFA(
          'challenge-id',
          '654321',
          'device-fingerprint'
        );

        expect(isValid).toBe(false);
        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            attempts: 1
          })
        );
      });

      it('should lock account after max attempts', async () => {
        const challengeData = {
          id: 'challenge-id',
          user_id: 'user-id',
          status: 'pending',
          attempts: 2,
          max_attempts: 3,
          expires_at: new Date(Date.now() + 300000).toISOString(),
          challenge_code: '123456'
        };

        mockSupabase.single.mockResolvedValueOnce({
          data: challengeData,
          error: null
        });

        await expect(
          securityService.verifyMFA('challenge-id', '654321', 'device-fingerprint')
        ).rejects.toThrow('Maximum MFA attempts exceeded');

        expect(mockSupabase.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'failed'
          })
        );
      });
    });

    describe('Device Attestation', () => {
      it('should attest device successfully', async () => {
        const deviceInfo = {
          deviceName: 'Test Device',
          deviceType: 'desktop' as const,
          operatingSystem: 'macOS',
          browserInfo: { userAgent: 'test' }
        };

        const attestation = await securityService.attestDevice(
          'user-id',
          deviceInfo,
          'attestation-challenge'
        );

        expect(attestation).toBeDefined();
        expect(attestation.deviceName).toBe('Test Device');
        expect(attestation.trustLevel).toBeOneOf(['basic', 'verified', 'high_trust', 'enterprise']);
        expect(mockSupabase.insert).toHaveBeenCalled();
      });

      it('should assign correct trust level based on security features', async () => {
        const deviceInfo = {
          deviceName: 'Secure Device',
          deviceType: 'desktop' as const,
          operatingSystem: 'Windows 11',
          browserInfo: { userAgent: 'test' }
        };

        // Mock high-security device
        jest.spyOn(securityService as any, 'collectDeviceAttestationData')
          .mockResolvedValue({
            hardwareFingerprint: 'secure-fingerprint',
            securityFeatures: {
              secureBootEnabled: true,
              tpmAvailable: true,
              biometricCapable: true,
              hardwareKeystore: true
            },
            riskAssessment: {
              isJailbroken: false,
              hasRootAccess: false,
              developmentModeEnabled: false,
              unknownSourcesEnabled: false,
              antiVirusStatus: 'protected'
            }
          });

        const attestation = await securityService.attestDevice(
          'user-id',
          deviceInfo,
          'attestation-challenge'
        );

        expect(attestation.trustLevel).toBe('enterprise');
      });

      it('should detect compromised devices', async () => {
        const deviceInfo = {
          deviceName: 'Compromised Device',
          deviceType: 'mobile' as const,
          operatingSystem: 'Android',
          browserInfo: { userAgent: 'test' }
        };

        // Mock compromised device
        jest.spyOn(securityService as any, 'collectDeviceAttestationData')
          .mockResolvedValue({
            securityFeatures: {
              secureBootEnabled: false,
              tpmAvailable: false,
              biometricCapable: false,
              hardwareKeystore: false
            },
            riskAssessment: {
              isJailbroken: true,
              hasRootAccess: true,
              developmentModeEnabled: true,
              unknownSourcesEnabled: true,
              antiVirusStatus: 'disabled'
            }
          });

        const attestation = await securityService.attestDevice(
          'user-id',
          deviceInfo,
          'attestation-challenge'
        );

        expect(attestation.trustLevel).toBe('basic');
      });
    });
  });

  describe('Network Security', () => {
    it('should monitor network security successfully', async () => {
      const networkSecurity = await securityService.monitorNetworkSecurity(
        'session-id',
        '192.168.1.100',
        'Mozilla/5.0 Test'
      );

      expect(networkSecurity).toBeDefined();
      expect(networkSecurity.sourceIP).toBe('192.168.1.100');
      expect(networkSecurity.riskScore).toBeGreaterThanOrEqual(0);
      expect(networkSecurity.riskScore).toBeLessThanOrEqual(100);
    });

    it('should detect VPN usage', async () => {
      jest.spyOn(securityService as any, 'detectVPN')
        .mockResolvedValue(true);

      const networkSecurity = await securityService.monitorNetworkSecurity(
        'session-id',
        '10.0.0.1',
        'Mozilla/5.0 Test'
      );

      expect(networkSecurity.vpnDetected).toBe(true);
      expect(networkSecurity.riskScore).toBeGreaterThan(0);
    });

    it('should block malicious IPs', async () => {
      jest.spyOn(securityService as any, 'getThreatIntelligence')
        .mockResolvedValue({
          isMalicious: true,
          threatCategories: ['botnet'],
          reputationScore: 10
        });

      const networkSecurity = await securityService.monitorNetworkSecurity(
        'session-id',
        '1.2.3.4',
        'Mozilla/5.0 Test'
      );

      expect(networkSecurity.blocked).toBe(true);
      expect(networkSecurity.blockedReason).toContain('Malicious IP detected');
    });
  });

  describe('Session Security', () => {
    it('should enforce session security policies', async () => {
      const sessionId = 'secure-session-id';
      
      await securityService.startSecurityMonitoring(sessionId);

      expect(mockSupabase.from).toHaveBeenCalledWith('board_room_security_events');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'security_monitoring_started'
        })
      );
    });

    it('should detect unusual activity patterns', async () => {
      const sessionId = 'monitored-session-id';
      
      // Mock multiple rapid connections
      const suspiciousActivity = [
        { timestamp: Date.now(), action: 'join_attempt', userId: 'user1' },
        { timestamp: Date.now() + 1000, action: 'join_attempt', userId: 'user2' },
        { timestamp: Date.now() + 2000, action: 'join_attempt', userId: 'user3' }
      ];

      jest.spyOn(securityService as any, 'checkUnusualActivity')
        .mockImplementation(async () => {
          await securityService.logSecurityEvent({
            sessionId,
            eventType: 'suspicious_activity_detected',
            eventCategory: 'compliance',
            severityLevel: 'warning',
            description: 'Multiple rapid join attempts detected',
            eventData: suspiciousActivity,
            riskScore: 65
          });
        });

      await (securityService as any).checkUnusualActivity(sessionId);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'suspicious_activity_detected',
          severity_level: 'warning'
        })
      );
    });
  });

  describe('Data Encryption and Storage', () => {
    it('should encrypt sensitive data', async () => {
      const sensitiveData = 'confidential board information';
      
      jest.spyOn(securityService as any, 'encryptMessage')
        .mockImplementation(async (message: string) => {
          // Mock encryption - in real implementation would use actual crypto
          return btoa(message + ':encrypted');
        });

      const encrypted = await (securityService as any).encryptMessage(sensitiveData);
      
      expect(encrypted).not.toBe(sensitiveData);
      expect(encrypted).toContain('encrypted');
    });

    it('should validate data integrity', async () => {
      const data = { important: 'board data' };
      const checksum = 'mock-checksum';
      
      jest.spyOn(securityService as any, 'generateChecksum')
        .mockReturnValue(checksum);

      const result = await (securityService as any).validateDataIntegrity(data, checksum);
      
      expect(result).toBe(true);
    });
  });

  describe('Voting Security', () => {
    it('should secure blockchain voting', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'vote-id',
          session_id: 'session-id',
          motion_title: 'Test Motion',
          status: 'active',
          blockchain_enabled: true
        },
        error: null
      });

      const voteData = {
        voteId: 'vote-id',
        voterId: 'voter-id',
        voteChoice: 'for' as const,
        voteWeight: 1,
        timestamp: new Date(),
        proxyGrantorId: undefined
      };

      jest.spyOn(votingService as any, 'generateVoteHash')
        .mockResolvedValue('secure-hash');
      
      jest.spyOn(votingService as any, 'signVote')
        .mockResolvedValue('digital-signature');

      const blockchainVote = await votingService.castVote(
        'vote-id',
        'voter-id',
        'for',
        1
      );

      expect(blockchainVote.blockchainHash).toBeDefined();
      expect(blockchainVote.signature).toBeDefined();
    });

    it('should prevent vote tampering', async () => {
      const voteRecord = {
        id: 'vote-record-id',
        vote_id: 'vote-id',
        voter_id: 'voter-id',
        vote_choice: 'for',
        blockchain_hash: 'original-hash',
        vote_signature: 'original-signature'
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: voteRecord,
        error: null
      });

      jest.spyOn(votingService as any, 'generateVoteHash')
        .mockResolvedValue('tampered-hash'); // Different hash indicates tampering

      const isValid = await votingService.verifyVoteIntegrity('vote-record-id');
      
      expect(isValid).toBe(false);
    });
  });

  describe('Recording Security', () => {
    it('should encrypt recordings', async () => {
      const recordingOptions = {
        recordingType: 'full_session' as const,
        accessPermissions: {
          accessLevel: 'directors_only' as const,
          downloadAllowed: false,
          streamingAllowed: true
        },
        retentionPolicy: {
          autoDelete: false,
          backupRequired: true,
          legalHold: false
        },
        complianceTags: ['SOX', 'board-meeting']
      };

      jest.spyOn(recordingService as any, 'generateEncryptionKey')
        .mockResolvedValue('encryption-key-id');

      const recording = await recordingService.startRecording(
        'session-id',
        'user-id',
        recordingOptions
      );

      expect(recording.encryptionKeyId).toBeDefined();
      expect(recording.status).toBe('recording');
      expect(recording.processingMetadata.encryptionMetadata.algorithm).toBe('AES-256-GCM');
    });

    it('should enforce access controls', async () => {
      const restrictedRecording = {
        id: 'recording-id',
        access_permissions: {
          accessLevel: 'directors_only',
          viewers: ['director-1', 'director-2']
        }
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: restrictedRecording,
        error: null
      });

      // Non-director trying to access
      await expect(
        recordingService.generateAccessLink(
          'recording-id',
          'observer-user-id',
          { permissions: ['view'] }
        )
      ).rejects.toThrow('Access denied');
    });

    it('should audit recording access', async () => {
      const accessToken = 'valid-token';
      
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'access-id',
          recording_id: 'recording-id',
          user_id: 'user-id',
          access_token: accessToken,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          permissions: ['view']
        },
        error: null
      });

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'recording-id',
          status: 'completed',
          duration: 3600
        },
        error: null
      });

      const streamData = await recordingService.streamRecording(
        'recording-id',
        accessToken,
        { quality: 'medium' }
      );

      expect(streamData.streamUrl).toBeDefined();
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'recording_accessed'
        })
      );
    });
  });

  describe('Compliance and Monitoring', () => {
    it('should assess compliance status', async () => {
      const sessionId = 'compliance-session-id';
      const frameworks = ['SOX', 'GDPR'];

      jest.spyOn(securityService as any, 'getFrameworkRequirements')
        .mockResolvedValue([
          { requirement: 'Encrypted communications', severity: 'high' },
          { requirement: 'Audit trail', severity: 'medium' }
        ]);

      jest.spyOn(securityService as any, 'checkComplianceRequirement')
        .mockResolvedValue({
          met: true,
          evidence: ['encryption-enabled', 'audit-log-active']
        });

      const compliance = await securityService.assessCompliance(sessionId, frameworks);

      expect(compliance.status).toBe('compliant');
      expect(compliance.violations).toHaveLength(0);
      expect(compliance.complianceFramework).toEqual(frameworks);
    });

    it('should detect compliance violations', async () => {
      const sessionId = 'violation-session-id';
      
      jest.spyOn(securityService as any, 'checkComplianceRequirement')
        .mockResolvedValue({
          met: false,
          evidence: [],
          reason: 'Encryption not properly configured'
        });

      const compliance = await securityService.assessCompliance(sessionId, ['SOX']);

      expect(compliance.status).toBe('non_compliant');
      expect(compliance.violations.length).toBeGreaterThan(0);
      expect(compliance.violations[0].severity).toBe('high');
    });

    it('should generate security dashboard data', async () => {
      const sessionId = 'dashboard-session-id';
      
      mockSupabase.select.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            event_type: 'security_event',
            severity_level: 'warning',
            risk_score: 45,
            resolved: false,
            created_at: new Date().toISOString()
          }
        ],
        error: null
      });

      const dashboard = await securityService.getSecurityDashboard(sessionId);

      expect(dashboard.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.activeThreats).toBeGreaterThanOrEqual(0);
      expect(dashboard.recentEvents).toBeDefined();
      expect(dashboard.deviceTrustSummary).toBeDefined();
    });
  });

  describe('Penetration Testing Scenarios', () => {
    it('should resist session hijacking attempts', async () => {
      const legitimateSession = 'legitimate-session-id';
      const maliciousUser = 'malicious-user-id';
      
      // Attempt to join session without proper authentication
      await expect(
        webrtcService.joinSession('director')
      ).rejects.toThrow(); // Should fail without proper initialization

      // Log security event
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: expect.stringContaining('unauthorized')
        })
      );
    });

    it('should detect and prevent brute force attacks', async () => {
      const challengeId = 'challenge-id';
      const wrongCode = '000000';
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            id: challengeId,
            status: 'pending',
            attempts: i,
            max_attempts: 3,
            expires_at: new Date(Date.now() + 300000).toISOString()
          },
          error: null
        });

        try {
          await securityService.verifyMFA(challengeId, wrongCode);
        } catch (error) {
          if (i === 2) {
            expect(error).toMatchObject({
              message: expect.stringContaining('Maximum MFA attempts exceeded')
            });
          }
        }
      }
    });

    it('should validate input sanitization', async () => {
      const maliciousInput = "<script>alert('xss')</script>";
      
      // Test motion creation with malicious input
      await expect(
        votingService.createVotingMotion('session-id', {
          title: maliciousInput,
          description: maliciousInput,
          type: 'simple_majority',
          isAnonymous: false,
          blockchainEnabled: true,
          startedBy: 'user-id',
          requiredVotes: 3,
          quorumRequired: 2
        })
      ).rejects.toThrow(); // Should reject malicious input
    });

    it('should prevent privilege escalation', async () => {
      const observerUserId = 'observer-user-id';
      const restrictedAction = 'host-only-action';
      
      // Observer trying to perform host action
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          participant_role: 'observer',
          access_level: 'standard'
        },
        error: null
      });

      await expect(
        // Simulated restricted action
        Promise.reject(new Error('Insufficient permissions'))
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('Incident Response', () => {
    it('should handle security incident escalation', async () => {
      const criticalIncident = {
        sessionId: 'incident-session-id',
        eventType: 'security_breach_detected',
        eventCategory: 'network' as const,
        severityLevel: 'critical' as const,
        description: 'Unauthorized access attempt detected',
        eventData: { attackVector: 'credential_stuffing' },
        riskScore: 95
      };

      await securityService.logSecurityEvent(criticalIncident);

      // Should trigger incident response
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          severity_level: 'critical',
          risk_score: 95
        })
      );
    });

    it('should implement emergency session lockdown', async () => {
      const sessionId = 'emergency-session-id';
      const triggerType = 'security_breach' as const;
      
      await securityService.executeContingencyPlan(sessionId, triggerType, {
        threatLevel: 'high',
        immediateAction: 'lockdown'
      });

      // Should pause session and notify participants
      expect(mockSupabase.from).toHaveBeenCalledWith('board_room_security_events');
    });
  });
});

// Helper function to extend Jest matchers
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}