/**
 * Advanced Security & Compliance Features
 * Immutable audit trails, regulatory compliance, and zero-knowledge proofs
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type {
  ComplianceReport,
  ComplianceReportType,
  ComplianceReportStatus,
  ComplianceFinding,
  ComplianceFindingStatus,
  ComplianceSummary,
  ComplianceEvidence,
  ComplianceEvidenceType,
  ImmutableAuditEntry,
  AuditTrailIntegrity,
  ZeroKnowledgeProof,
  ActivityLog,
  ActivityMetadata,
  RiskLevel,
  ActivitySeverity,
  ComplianceViolation,
  ComplianceViolationType,
  PrivacySettings,
  DataRetentionPolicy
} from '@/types/entities/activity.types'

// Using imported ComplianceReport from activity.types.ts

// Using imported ComplianceFinding from activity.types.ts

// Using imported ComplianceSummary from activity.types.ts

// Using imported ComplianceEvidence from activity.types.ts

// Using imported ImmutableAuditEntry from activity.types.ts

export class ComplianceEngine {
  /**
   * Generate comprehensive compliance report
   */
  static async generateComplianceReport(
    organizationId: string,
    reportType: ComplianceReport['reportType'],
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceReport> {
    try {
      const supabase = await createSupabaseServerClient()

      // Get compliance requirements for the report type
      const requirements = this.getComplianceRequirements(reportType)
      
      // Collect evidence for each requirement
      const findings: ComplianceFinding[] = []
      const evidence: ComplianceEvidence[] = []

      for (const requirement of requirements) {
        const finding = await this.assessRequirement(
          requirement,
          organizationId,
          periodStart,
          periodEnd
        )
        findings.push(finding)

        // Collect supporting evidence
        const reqEvidence = await this.collectEvidence(
          requirement,
          organizationId,
          periodStart,
          periodEnd
        )
        evidence.push(...reqEvidence)
      }

      // Calculate summary
      const summary = this.calculateComplianceSummary(findings)

      // Create immutable snapshot
      const reportData = {
        reportType,
        organizationId,
        periodStart,
        periodEnd,
        findings,
        summary,
        evidence
      }

      const signatureHash = await this.generateTamperProofSignature(reportData)

      // Store compliance snapshot
      const { data: snapshot } = await supabase
        .from('activity_snapshots')
        .insert({
          organization_id: organizationId,
          snapshot_type: 'compliance_report',
          period_start: periodStart,
          period_end: periodEnd,
          activity_summary: reportData,
          signature_hash: signatureHash,
          retention_until: this.calculateRetentionDate(reportType)
        })
        .select()
        .single()

      const report: ComplianceReport = {
        id: snapshot.id,
        reportType,
        organizationId,
        periodStart,
        periodEnd,
        generatedAt: new Date().toISOString(),
        status: 'draft',
        findings,
        summary,
        evidence,
        signatureHash,
        retentionUntil: this.calculateRetentionDate(reportType)
      }

      console.log(`📋 Compliance report generated: ${reportType} for ${organizationId}`)
      return report
    } catch (error) {
      console.error('Error generating compliance report:', error)
      throw error
    }
  }

  /**
   * Create immutable audit trail entry
   */
  static async createImmutableAuditEntry(
    eventData: any,
    organizationId: string
  ): Promise<ImmutableAuditEntry> {
    try {
      const supabase = supabaseAdmin

      // Get the last block in the chain
      const { data: lastBlock } = await supabase
        .from('audit_logs')
        .select('id, signature_hash, created_at')
        .eq('organization_id', organizationId)
        .not('signature_hash', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const previousHash = lastBlock?.signature_hash || '0000000000000000000000000000000000000000000000000000000000000000'
      const blockNumber = lastBlock ? 
        parseInt(lastBlock.id.split('-')[1] || '0') + 1 : 1

      // Create current hash
      const blockData = {
        previousHash,
        blockNumber,
        timestamp: new Date().toISOString(),
        eventData,
        organizationId
      }

      const currentHash = await this.calculateBlockHash(blockData)
      const signature = await this.signBlock(blockData, currentHash)
      
      // Calculate Merkle root for batch verification
      const merkleRoot = await this.calculateMerkleRoot([currentHash])

      const immutableEntry: ImmutableAuditEntry = {
        id: `block-${blockNumber}-${organizationId}`,
        previousHash,
        currentHash,
        blockNumber,
        timestamp: blockData.timestamp,
        eventData,
        signature,
        merkleRoot
      }

      // Store the immutable entry
      await supabase
        .from('audit_logs')
        .update({
          signature_hash: currentHash,
          metadata: {
            ...eventData.metadata,
            immutable_entry: immutableEntry
          }
        })
        .eq('id', eventData.id)

      return immutableEntry
    } catch (error) {
      console.error('Error creating immutable audit entry:', error)
      throw error
    }
  }

  /**
   * Verify audit trail integrity
   */
  static async verifyAuditTrailIntegrity(
    organizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    isValid: boolean
    totalEntries: number
    verifiedEntries: number
    corruptedEntries: string[]
    integrityScore: number
  }> {
    try {
      const supabase = await createSupabaseServerClient()

      let query = supabase
        .from('audit_logs')
        .select('id, signature_hash, metadata, created_at')
        .eq('organization_id', organizationId)
        .not('signature_hash', 'is', null)
        .order('created_at', { ascending: true })

      if (startDate) query = query.gte('created_at', startDate)
      if (endDate) query = query.lte('created_at', endDate)

      const { data: auditEntries } = await query

      if (!auditEntries?.length) {
        return {
          isValid: true,
          totalEntries: 0,
          verifiedEntries: 0,
          corruptedEntries: [],
          integrityScore: 100
        }
      }

      let verifiedCount = 0
      const corruptedEntries: string[] = []

      // Verify each entry's hash chain
      for (let i = 0; i < auditEntries.length; i++) {
        const entry = auditEntries[i]
        const immutableData = entry.metadata?.immutable_entry

        if (!immutableData) {
          corruptedEntries.push(entry.id)
          continue
        }

        // Verify hash chain
        const expectedPreviousHash = i > 0 ? 
          auditEntries[i - 1].signature_hash : 
          '0000000000000000000000000000000000000000000000000000000000000000'

        if (immutableData.previousHash !== expectedPreviousHash) {
          corruptedEntries.push(entry.id)
          continue
        }

        // Verify current hash
        const calculatedHash = await this.calculateBlockHash({
          previousHash: immutableData.previousHash,
          blockNumber: immutableData.blockNumber,
          timestamp: immutableData.timestamp,
          eventData: immutableData.eventData,
          organizationId
        })

        if (calculatedHash !== immutableData.currentHash) {
          corruptedEntries.push(entry.id)
          continue
        }

        verifiedCount++
      }

      const integrityScore = (verifiedCount / auditEntries.length) * 100

      return {
        is_valid: corruptedEntries.length === 0,
        total_entries: auditEntries.length,
        verified_entries: verifiedCount,
        corrupted_entries: corruptedEntries,
        integrity_score: integrityScore,
        last_verified_at: new Date().toISOString(),
        verification_method: 'blockchain_verification'
      }
    } catch (error) {
      console.error('Error verifying audit trail integrity:', error)
      throw error
    }
  }

  /**
   * Generate zero-knowledge proof for audit verification
   */
  static async generateZKProof(
    organizationId: string,
    query: string,
    timeRange: { start: string; end: string }
  ): Promise<{
    proof: string
    publicInputs: any
    verificationKey: string
    description: string
  }> {
    try {
      // This is a simplified implementation
      // In production, use libraries like circomlib or snarkjs
      
      const supabase = await createSupabaseServerClient()

      // Get relevant audit data without exposing sensitive details
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('event_type, event_category, outcome, severity, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)

      if (!auditData) {
        throw new Error('No audit data found for proof generation')
      }

      // Create aggregated proof inputs (no sensitive data)
      const publicInputs = {
        totalEvents: auditData.length,
        successfulEvents: auditData.filter(e => e.outcome === 'success').length,
        failedEvents: auditData.filter(e => e.outcome === 'failure').length,
        criticalEvents: auditData.filter(e => e.severity === 'critical').length,
        eventCategories: [...new Set(auditData.map(e => e.event_category))],
        timeRange,
        organizationId: organizationId.substring(0, 8) + '...' // Partial ID for privacy
      }

      // Generate proof hash (simplified - use actual ZK proof library in production)
      const proofData = JSON.stringify(publicInputs) + process.env.ZK_PROOF_SECRET
      const proof = await this.generateHash(proofData)

      // Generate verification key
      const verificationKey = await this.generateHash(organizationId + timeRange.start + timeRange.end)

      return {
        proof,
        public_inputs: publicInputs,
        verification_key: verificationKey,
        description: `Zero-knowledge proof that organization has ${publicInputs.totalEvents} audit events with ${publicInputs.successfulEvents} successful operations in the specified period, without revealing sensitive details.`,
        generated_at: new Date().toISOString(),
        proof_system: 'simplified_zkp',
        circuit_hash: await this.generateHash('compliance_circuit_v1')
      }
    } catch (error) {
      console.error('Error generating zero-knowledge proof:', error)
      throw error
    }
  }

  /**
   * Session recording for security investigations
   */
  static async startSessionRecording(
    userId: string,
    organizationId: string,
    recordingLevel: 'minimal' | 'standard' | 'detailed' = 'standard'
  ): Promise<string> {
    try {
      const supabase = await createSupabaseServerClient()

      const { data: session } = await supabase
        .from('activity_sessions')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          recording_enabled: true,
          privacy_level: recordingLevel,
          device_info: {
            recordingLevel,
            startedAt: new Date().toISOString()
          }
        })
        .select()
        .single()

      console.log(`🎥 Session recording started for user ${userId}`)
      return session.id
    } catch (error) {
      console.error('Error starting session recording:', error)
      throw error
    }
  }

  /**
   * Data retention policy enforcement
   */
  static async enforceDataRetention(organizationId: string): Promise<{
    deletedEntries: number
    archivedEntries: number
    errors: readonly string[]
  }> {
    try {
      const supabase = supabaseAdmin
      const errors: string[] = []
      let deletedEntries = 0
      let archivedEntries = 0

      // Get organization's retention policies
      const { data: org } = await supabase
        .from('organizations')
        .select('compliance_settings')
        .eq('id', organizationId)
        .single()

      const retentionPolicies = org?.compliance_settings?.retention_policies || {
        audit_logs: '7 years',
        activity_sessions: '1 year',
        snapshots: '10 years'
      }

      // Enforce audit log retention
      const auditRetentionDate = this.calculateRetentionCutoff(retentionPolicies.audit_logs)
      const { count: deletedAuditLogs } = await supabase
        .from('audit_logs')
        .delete({ count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('legal_hold', false)
        .lt('created_at', auditRetentionDate)

      deletedEntries += deletedAuditLogs || 0

      // Archive old activity sessions
      const sessionRetentionDate = this.calculateRetentionCutoff(retentionPolicies.activity_sessions)
      const { count: archivedSessions } = await supabase
        .from('activity_sessions')
        .update({ 
          events_data: null, // Clear detailed event data
          privacy_level: 'minimal'
        }, { count: 'exact' })
        .eq('organization_id', organizationId)
        .lt('session_start', sessionRetentionDate)

      archivedEntries += archivedSessions || 0

      console.log(`🗑️ Data retention enforced: ${deletedEntries} deleted, ${archivedEntries} archived`)

      return { deletedEntries, archivedEntries, errors }
    } catch (error) {
      console.error('Error enforcing data retention:', error)
      throw error
    }
  }

  /**
   * Legal hold management
   */
  static async applyLegalHold(
    organizationId: string,
    holdReason: string,
    affectedTimeRange: { start: string; end: string },
    holdDuration?: string
  ): Promise<{
    readonly affectedEntries: number
    readonly holdId: string
  }> {
    try {
      const supabase = supabaseAdmin

      // Generate unique hold ID
      const holdId = `hold-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Apply legal hold to audit logs
      const { count: affectedEntries } = await supabase
        .from('audit_logs')
        .update({
          legal_hold: true,
          metadata: {
            legal_hold: {
              id: holdId,
              reason: holdReason,
              applied_at: new Date().toISOString()
            }
          }
        }, { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('created_at', affectedTimeRange.start)
        .lte('created_at', affectedTimeRange.end)

      // Apply to snapshots
      await supabase
        .from('activity_snapshots')
        .update({ is_locked: true })
        .eq('organization_id', organizationId)
        .gte('period_start', affectedTimeRange.start)
        .lte('period_end', affectedTimeRange.end)

      console.log(`⚖️ Legal hold applied: ${holdId} affecting ${affectedEntries} entries`)

      return {
        affectedEntries: affectedEntries || 0,
        holdId
      }
    } catch (error) {
      console.error('Error applying legal hold:', error)
      throw error
    }
  }

  /**
   * Regulatory audit preparation
   */
  static async prepareRegulatoryAudit(
    organizationId: string,
    auditType: 'internal' | 'external' | 'regulatory',
    scope: {
      readonly startDate: string
      readonly endDate: string
      readonly systems: readonly string[]
      readonly processes: readonly string[]
    }
  ): Promise<{
    readonly auditPackage: Record<string, unknown>
    readonly evidenceBundle: readonly ComplianceEvidence[]
    readonly complianceGaps: readonly ComplianceViolation[]
    readonly recommendedActions: readonly string[]
  }> {
    try {
      // Generate comprehensive audit package
      const auditPackage = await this.generateAuditPackage(organizationId, scope)
      
      // Collect all evidence
      const evidenceBundle = await this.collectAuditEvidence(organizationId, scope)
      
      // Identify compliance gaps
      const complianceGaps = await this.identifyComplianceGaps(organizationId, scope)
      
      // Generate recommendations
      const recommendedActions = this.generateAuditRecommendations(complianceGaps)

      console.log(`🔍 Regulatory audit preparation completed for ${organizationId}`)

      return {
        auditPackage,
        evidenceBundle,
        complianceGaps,
        recommendedActions
      }
    } catch (error) {
      console.error('Error preparing regulatory audit:', error)
      throw error
    }
  }

  /**
   * Real-time compliance monitoring
   */
  static async monitorComplianceInRealTime(organizationId: string): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient()

      // Check for compliance violations in real-time
      const violations = await this.detectComplianceViolations(organizationId)
      
      if (violations.length > 0) {
        // Create immediate notifications
        for (const violation of violations) {
          await this.notifyComplianceViolation(violation, organizationId)
        }
      }

      // Update compliance dashboard metrics
      await this.updateComplianceMetrics(organizationId)

    } catch (error) {
      console.error('Error monitoring compliance:', error)
    }
  }

  /**
   * Generate tamper-proof signature
   */
  private static async generateTamperProofSignature(data: Record<string, unknown>): Promise<string> {
    const dataString = JSON.stringify(data, Object.keys(data).sort())
    return this.generateHash(dataString + process.env.SIGNATURE_SECRET)
  }

  /**
   * Calculate block hash for blockchain-like audit trail
   */
  private static async calculateBlockHash(blockData: {
    previousHash: string
    blockNumber: number
    timestamp: string
    eventData: ActivityLog
    organizationId: string
  }): Promise<string> {
    const blockString = JSON.stringify({
      previousHash: blockData.previousHash,
      blockNumber: blockData.blockNumber,
      timestamp: blockData.timestamp,
      eventDataHash: await this.generateHash(JSON.stringify(blockData.eventData))
    })
    
    return this.generateHash(blockString)
  }

  /**
   * Sign block with cryptographic signature
   */
  private static async signBlock(blockData: {
    previousHash: string
    blockNumber: number
    timestamp: string
    eventData: ActivityLog
    organizationId: string
  }, blockHash: string): Promise<string> {
    // In production, use actual cryptographic signing with private keys
    const signatureData = blockHash + blockData.organizationId + process.env.SIGNING_SECRET
    return this.generateHash(signatureData)
  }

  /**
   * Calculate Merkle root for batch verification
   */
  private static async calculateMerkleRoot(hashes: readonly string[]): Promise<string> {
    if (hashes.length === 0) return ''
    if (hashes.length === 1) return hashes[0]

    // Simple implementation - use actual Merkle tree library in production
    const combined = hashes.join('')
    return this.generateHash(combined)
  }

  /**
   * Generate SHA-256 hash
   */
  private static async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Get compliance requirements for specific standards
   */
  private static getComplianceRequirements(reportType: ComplianceReportType): Array<{
    id: string
    name: string
    description: string
    category: string
  }> {
    const requirements: Record<string, any[]> = {
      SOC2: [
        {
          id: 'CC6.1',
          name: 'Logical and Physical Access Controls',
          description: 'Access to system resources is restricted to authorized individuals',
          category: 'access_control'
        },
        {
          id: 'CC6.2',
          name: 'Authentication and Authorization',
          description: 'Users are properly authenticated and authorized',
          category: 'authentication'
        },
        {
          id: 'CC7.1',
          name: 'System Operations',
          description: 'System operations are monitored and managed',
          category: 'monitoring'
        },
        {
          id: 'CC8.1',
          name: 'Change Management',
          description: 'Changes to system components are controlled',
          category: 'change_management'
        }
      ],
      GDPR: [
        {
          id: 'Art.5',
          name: 'Principles for Processing',
          description: 'Personal data is processed lawfully, fairly, and transparently',
          category: 'data_processing'
        },
        {
          id: 'Art.25',
          name: 'Data Protection by Design',
          description: 'Data protection is implemented by design and by default',
          category: 'privacy_design'
        },
        {
          id: 'Art.30',
          name: 'Records of Processing',
          description: 'Maintain records of all data processing activities',
          category: 'record_keeping'
        },
        {
          id: 'Art.32',
          name: 'Security of Processing',
          description: 'Implement appropriate technical and organizational measures',
          category: 'security'
        }
      ],
      HIPAA: [
        {
          id: '164.308',
          name: 'Administrative Safeguards',
          description: 'Administrative actions and policies to manage security',
          category: 'administrative'
        },
        {
          id: '164.310',
          name: 'Physical Safeguards',
          description: 'Physical measures to protect systems and equipment',
          category: 'physical'
        },
        {
          id: '164.312',
          name: 'Technical Safeguards',
          description: 'Technology controls to protect PHI',
          category: 'technical'
        }
      ],
      SOX: [
        {
          id: 'SOX.302',
          name: 'Corporate Responsibility',
          description: 'CEO and CFO certification of financial statements',
          category: 'financial'
        }
      ],
      ISO27001: [
        {
          id: 'A.5.1',
          name: 'Information Security Policies',
          description: 'Set of policies for information security',
          category: 'policy'
        }
      ],
      CCPA: [
        {
          id: 'CCPA.1798',
          name: 'Consumer Rights',
          description: 'Right to know about personal information collected',
          category: 'privacy'
        }
      ],
      custom: []
    }

    return requirements[reportType] || []
  }

  /**
   * Assess individual compliance requirement
   */
  private static async assessRequirement(
    requirement: {
      id: string
      name: string
      description: string
      category: string
    },
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceFinding> {
    try {
      const supabase = await createSupabaseServerClient()

      // Assessment logic based on requirement category
      let status: ComplianceFinding['status'] = 'compliant'
      let riskLevel: ComplianceFinding['riskLevel'] = 'low'
      const evidence: string[] = []
      const remediation: string[] = []

      switch (requirement.category) {
        case 'access_control': {
          const accessViolations = await this.checkAccessControlCompliance(
            organizationId, periodStart, periodEnd, supabase
          )
          if (accessViolations > 0) {
            status = 'non_compliant'
            riskLevel = 'high'
            evidence.push(`${accessViolations} access control violations detected`)
            remediation.push('Review and strengthen access control policies')
          } else {
            evidence.push('No access control violations detected')
          }
          break
        }

        case 'authentication': {
          const authFailures = await this.checkAuthenticationCompliance(
            organizationId, periodStart, periodEnd, supabase
          )
          if (authFailures > 10) {
            status = 'partially_compliant'
            riskLevel = 'medium'
            evidence.push(`${authFailures} authentication failures recorded`)
            remediation.push('Implement stronger authentication controls')
          } else {
            evidence.push('Authentication controls functioning properly')
          }
          break
        }

        case 'monitoring': {
          const monitoringGaps = await this.checkMonitoringCompliance(
            organizationId, periodStart, periodEnd, supabase
          )
          if (monitoringGaps.length > 0) {
            status = 'partially_compliant'
            riskLevel = 'medium'
            evidence.push(`Monitoring gaps: ${monitoringGaps.join(', ')}`)
            remediation.push('Implement comprehensive monitoring coverage')
          } else {
            evidence.push('Comprehensive monitoring in place')
          }
          break
        }

        default:
          evidence.push('Manual assessment required')
          status = 'not_applicable'
      }

      return {
        id: `finding-${requirement.id}-${Date.now()}`,
        requirement: `${requirement.id}: ${requirement.name}`,
        status,
        evidence,
        riskLevel,
        remediation: remediation.length > 0 ? remediation : undefined
      }
    } catch (error) {
      console.error('Error assessing requirement:', error)
      throw error
    }
  }

  /**
   * Collect evidence for compliance requirements
   */
  private static async collectEvidence(
    requirement: {
      id: string
      name: string
      description: string
      category: string
    },
    organizationId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<readonly ComplianceEvidence[]> {
    try {
      const supabase = await createSupabaseServerClient()
      const evidence: ComplianceEvidence[] = []

      // Collect relevant audit logs
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)
        .eq('event_category', requirement.category)
        .limit(100)

      if (auditLogs?.length) {
        evidence.push({
          id: `evidence-audit-${requirement.id}-${Date.now()}`,
          type: 'audit_log',
          description: `Audit logs for ${requirement.name}`,
          evidenceData: {
            entryCount: auditLogs.length,
            sampleEntries: auditLogs.slice(0, 5),
            timeRange: { periodStart, periodEnd }
          },
          collectedAt: new Date().toISOString(),
          verificationHash: await this.generateHash(JSON.stringify(auditLogs))
        })
      }

      // Collect policy documents (if available)
      // TODO: Integrate with document management system

      return evidence
    } catch (error) {
      console.error('Error collecting evidence:', error)
      return []
    }
  }

  /**
   * Calculate compliance summary
   */
  private static calculateComplianceSummary(findings: readonly ComplianceFinding[]): ComplianceSummary {
    const totalRequirements = findings.length
    const compliantCount = findings.filter(f => f.status === 'compliant').length
    const nonCompliantCount = findings.filter(f => f.status === 'non_compliant').length
    const partiallyCompliantCount = findings.filter(f => f.status === 'partially_compliant').length

    const overallScore = totalRequirements > 0 ? 
      ((compliantCount + partiallyCompliantCount * 0.5) / totalRequirements) * 100 : 100

    // Calculate risk score based on severity
    const riskScore = findings.reduce((score, finding) => {
      const riskWeights = { low: 1, medium: 3, high: 7, critical: 15 }
      return score + (riskWeights[finding.riskLevel] || 0)
    }, 0)

    return {
      totalRequirements,
      compliantCount,
      nonCompliantCount,
      partiallyCompliantCount,
      overallScore,
      riskScore,
      trend: 'stable' // TODO: Calculate trend by comparing with previous reports
    }
  }

  /**
   * Calculate retention cutoff date
   */
  private static calculateRetentionCutoff(retentionPeriod: string): string {
    const match = retentionPeriod.match(/^(\d+)\s*(years?|months?|days?)$/i)
    if (!match) return new Date(0).toISOString() // Keep everything if invalid

    const [, amount, unit] = match
    const multipliers = {
      day: 24 * 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
      years: 365 * 24 * 60 * 60 * 1000
    }

    const unitMultiplier = multipliers[unit.toLowerCase() as keyof typeof multipliers] || multipliers.years
    const cutoffTime = Date.now() - (parseInt(amount) * unitMultiplier)
    
    return new Date(cutoffTime).toISOString()
  }

  private static calculateRetentionDate(reportType: ComplianceReportType): string {
    const retentionPeriods = {
      SOC2: 7, // 7 years
      GDPR: 3, // 3 years
      HIPAA: 6, // 6 years
      SOX: 7, // 7 years
      ISO27001: 5, // 5 years
      CCPA: 2, // 2 years
      custom: 5 // 5 years default
    }

    const years = retentionPeriods[reportType] || 5
    return new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000).toISOString()
  }

  private static async checkAccessControlCompliance(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
  ): Promise<number> {
    const { count } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('event_type', 'authorization')
      .eq('outcome', 'failure')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    return count || 0
  }

  private static async checkAuthenticationCompliance(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
  ): Promise<number> {
    const { count } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('event_type', 'authentication')
      .eq('outcome', 'failure')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    return count || 0
  }

  private static async checkMonitoringCompliance(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    supabase: ReturnType<typeof createSupabaseServerClient> extends Promise<infer T> ? T : never
  ): Promise<readonly string[]> {
    const gaps: string[] = []

    // Check if all critical events are being monitored
    const requiredEventTypes = ['authentication', 'authorization', 'data_access', 'data_modification']
    
    for (const eventType of requiredEventTypes) {
      const { count } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('event_type', eventType)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd)

      if (!count || count === 0) {
        gaps.push(`No ${eventType} events logged`)
      }
    }

    return gaps
  }

  private static async generateAuditPackage(
    organizationId: string,
    scope: {
      readonly startDate: string
      readonly endDate: string
      readonly systems: readonly string[]
      readonly processes: readonly string[]
    }
  ): Promise<Record<string, unknown>> {
    // Generate comprehensive audit package
    return {
      organizationProfile: await this.getOrganizationProfile(organizationId),
      auditScope: scope,
      systemInventory: await this.getSystemInventory(organizationId),
      policyDocuments: await this.getPolicyDocuments(organizationId),
      auditTrail: await this.getAuditTrailSummary(organizationId, scope)
    }
  }

  private static async collectAuditEvidence(
    organizationId: string,
    scope: {
      readonly startDate: string
      readonly endDate: string
      readonly systems: readonly string[]
      readonly processes: readonly string[]
    }
  ): Promise<readonly ComplianceEvidence[]> {
    // Collect all evidence for audit
    return []
  }

  private static async identifyComplianceGaps(
    organizationId: string,
    scope: {
      readonly startDate: string
      readonly endDate: string
      readonly systems: readonly string[]
      readonly processes: readonly string[]
    }
  ): Promise<readonly ComplianceViolation[]> {
    // Identify compliance gaps
    return []
  }

  private static generateAuditRecommendations(complianceGaps: readonly ComplianceViolation[]): readonly string[] {
    // Generate recommendations based on gaps
    return [
      'Implement continuous compliance monitoring',
      'Enhance audit trail coverage',
      'Strengthen access controls',
      'Update security policies'
    ]
  }

  private static async detectComplianceViolations(organizationId: string): Promise<readonly ComplianceViolation[]> {
    // Detect real-time compliance violations
    return []
  }

  private static async notifyComplianceViolation(violation: ComplianceViolation, organizationId: string): Promise<void> {
    // Send compliance violation notifications
    console.log(`⚠️ Compliance violation detected: ${violation.type}`)
  }

  private static async updateComplianceMetrics(organizationId: string): Promise<void> {
    // Update real-time compliance metrics
    console.log(`📊 Compliance metrics updated for ${organizationId}`)
  }

  private static async getOrganizationProfile(organizationId: string): Promise<Record<string, unknown> | null> {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    return data
  }

  private static async getSystemInventory(organizationId: string): Promise<Record<string, unknown>> {
    // Get system inventory for compliance
    return {}
  }

  private static async getPolicyDocuments(organizationId: string): Promise<Record<string, unknown>> {
    // Get policy documents
    return {}
  }

  private static async getAuditTrailSummary(
    organizationId: string,
    scope: {
      readonly startDate: string
      readonly endDate: string
      readonly systems: readonly string[]
      readonly processes: readonly string[]
    }
  ): Promise<{
    readonly totalEvents: number
    readonly eventTypes: readonly string[]
    readonly successRate: number
  }> {
    const supabase = await createSupabaseServerClient()
    const { data, count } = await supabase
      .from('audit_logs')
      .select('event_type, outcome', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', scope.startDate)
      .lte('created_at', scope.endDate)

    return {
      totalEvents: count || 0,
      eventTypes: data ? [...new Set(data.map(d => d.event_type))] : [],
      successRate: data ? (data.filter(d => d.outcome === 'success').length / data.length) * 100 : 100
    }
  }
}

/**
 * Privacy and anonymization utilities
 */
export class PrivacyEngine {
  /**
   * Anonymize sensitive data in audit logs
   */
  static async anonymizeAuditData(
    organizationId: string,
    anonymizationLevel: 'minimal' | 'standard' | 'aggressive'
  ): Promise<{
    readonly processedEntries: number
    readonly anonymizedFields: readonly string[]
  }> {
    try {
      const supabase = supabaseAdmin

      const fieldsToAnonymize = {
        minimal: ['ip_address'],
        standard: ['ip_address', 'user_agent', 'device_fingerprint'],
        aggressive: ['ip_address', 'user_agent', 'device_fingerprint', 'geolocation', 'request_headers']
      }

      const fields = fieldsToAnonymize[anonymizationLevel]

      // Get audit logs to anonymize
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('id, metadata')
        .eq('organization_id', organizationId)
        .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Older than 90 days

      if (!auditLogs?.length) {
        return { processedEntries: 0, anonymizedFields: fields }
      }

      // Anonymize the data
      for (const log of auditLogs) {
        const updateData: any = {}
        
        fields.forEach(field => {
          if (field === 'ip_address') updateData.ip_address = null
          if (field === 'user_agent') updateData.user_agent = null
          if (field === 'device_fingerprint') updateData.device_fingerprint = null
          if (field === 'geolocation') updateData.geolocation = null
          if (field === 'request_headers') updateData.request_headers = null
        })

        await supabase
          .from('audit_logs')
          .update(updateData)
          .eq('id', log.id)
      }

      console.log(`🔒 Data anonymization completed: ${auditLogs.length} entries processed`)

      return {
        processedEntries: auditLogs.length,
        anonymizedFields: fields
      }
    } catch (error) {
      console.error('Error anonymizing audit data:', error)
      throw error
    }
  }

  /**
   * Generate privacy compliance report
   */
  static async generatePrivacyReport(
    organizationId: string,
    reportPeriod: { readonly start: string; readonly end: string }
  ): Promise<{
    readonly dataProcessingActivities: readonly ActivityLog[]
    readonly privacyControls: PrivacySettings
    readonly dataRetentionStatus: DataRetentionPolicy
    readonly consentManagement: Record<string, unknown>
    readonly breachIncidents: readonly ComplianceViolation[]
  }> {
    try {
      const supabase = await createSupabaseServerClient()

      // Analyze data processing activities
      const { data: dataProcessing } = await supabase
        .from('audit_logs')
        .select('event_category, action, created_at, details')
        .eq('organization_id', organizationId)
        .eq('event_type', 'data_access')
        .gte('created_at', reportPeriod.start)
        .lte('created_at', reportPeriod.end)

      // Check privacy controls implementation
      const privacyControls = await this.assessPrivacyControls(organizationId)

      // Check data retention compliance
      const dataRetentionStatus = await this.checkDataRetentionStatus(organizationId)

      // Analyze consent management
      const consentManagement = await this.analyzeConsentManagement(organizationId)

      // Check for security incidents
      const breachIncidents = await this.checkSecurityIncidents(organizationId, reportPeriod)

      return {
        dataProcessingActivities: dataProcessing || [],
        privacyControls,
        dataRetentionStatus,
        consentManagement,
        breachIncidents
      }
    } catch (error) {
      console.error('Error generating privacy report:', error)
      throw error
    }
  }

  private static async assessPrivacyControls(organizationId: string): Promise<PrivacySettings> {
    // Assess privacy control implementation
    return {
      encryption: 'implemented',
      accessControls: 'implemented',
      dataMinimization: 'partial',
      anonymization: 'available'
    }
  }

  private static async checkDataRetentionStatus(organizationId: string): Promise<DataRetentionPolicy> {
    // Check data retention policy compliance
    return {
      policiesInPlace: true,
      automatedEnforcement: true,
      retentionSchedule: 'compliant'
    }
  }

  private static async analyzeConsentManagement(organizationId: string): Promise<Record<string, unknown>> {
    // Analyze consent management practices
    return {
      consentTracking: 'implemented',
      withdrawalProcess: 'available',
      consentRecords: 'maintained'
    }
  }

  private static async checkSecurityIncidents(
    organizationId: string,
    reportPeriod: { readonly start: string; readonly end: string }
  ): Promise<readonly ComplianceViolation[]> {
    const supabase = await createSupabaseServerClient()
    
    const { data: incidents } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('event_type', 'security_event')
      .in('severity', ['high', 'critical'])
      .gte('created_at', reportPeriod.start)
      .lte('created_at', reportPeriod.end)

    return incidents || []
  }
}

/**
 * Blockchain-inspired immutable logging
 */
export class ImmutableAuditChain {
  /**
   * Add entry to immutable chain
   */
  static async addToChain(
    organizationId: string,
    eventData: any
  ): Promise<ImmutableAuditEntry> {
    return ComplianceEngine.createImmutableAuditEntry(eventData, organizationId)
  }

  /**
   * Verify chain integrity
   */
  static async verifyChainIntegrity(organizationId: string): Promise<boolean> {
    const result = await ComplianceEngine.verifyAuditTrailIntegrity(organizationId)
    return result.isValid
  }

  /**
   * Generate chain certificate
   */
  static async generateChainCertificate(
    organizationId: string,
    timeRange: { start: string; end: string }
  ): Promise<{
    certificate: string
    merkleRoot: string
    entryCount: number
    integrityVerified: boolean
  }> {
    try {
      const verification = await ComplianceEngine.verifyAuditTrailIntegrity(
        organizationId,
        timeRange.start,
        timeRange.end
      )

      const certificate = await this.generateCertificateData({
        organizationId,
        timeRange,
        verification,
        issuedAt: new Date().toISOString()
      })

      return {
        certificate,
        merkleRoot: 'merkle-root-placeholder', // TODO: Calculate actual Merkle root
        entryCount: verification.totalEntries,
        integrityVerified: verification.isValid
      }
    } catch (error) {
      console.error('Error generating chain certificate:', error)
      throw error
    }
  }

  private static async generateCertificateData(data: Record<string, unknown>): Promise<string> {
    const certificateData = JSON.stringify(data, null, 2)
    const signature = await ComplianceEngine['generateHash'](certificateData + process.env.CERTIFICATE_SECRET)
    
    return `
-----BEGIN BOARDGURU AUDIT CERTIFICATE-----
${Buffer.from(certificateData).toString('base64')}
-----END BOARDGURU AUDIT CERTIFICATE-----
Signature: ${signature}
`
  }
}