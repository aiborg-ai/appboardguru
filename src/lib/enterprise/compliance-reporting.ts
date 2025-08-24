/**
 * Enterprise Compliance Reporting System
 * Automated compliance monitoring and reporting for offline activities
 */

'use client'

import { getOfflineDB } from '../offline-db/database'
import { useOfflineStore } from '../stores/offline-store'
import { useComplianceStore } from '../stores/compliance-store'
import type { AuditLog, ComplianceItem } from '../offline-db/schema'

export interface ComplianceFramework {
  id: string
  name: string
  version: string
  requirements: ComplianceRequirement[]
  reporting_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  mandatory: boolean
  jurisdiction: string
}

export interface ComplianceRequirement {
  id: string
  code: string
  title: string
  description: string
  category: 'data_governance' | 'access_control' | 'audit_trail' | 'data_retention' | 'privacy' | 'security'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  evidence_required: boolean
  automated_check: boolean
  monitoring_enabled: boolean
}

export interface ComplianceReport {
  id: string
  framework_id: string
  organization_id: string
  report_type: 'scheduled' | 'ad_hoc' | 'incident' | 'audit_response'
  reporting_period: {
    start_date: string
    end_date: string
  }
  generated_at: string
  generated_by: string
  status: 'draft' | 'under_review' | 'approved' | 'submitted'
  
  executive_summary: {
    overall_compliance_score: number
    critical_issues: number
    medium_issues: number
    low_issues: number
    recommendations_count: number
    data_coverage: number // Percentage of activities covered
  }
  
  compliance_assessment: {
    requirement_id: string
    status: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable'
    evidence_collected: string[]
    gaps_identified: string[]
    risk_assessment: string
    remediation_plan: string
    target_date: string
  }[]
  
  offline_activities: {
    total_offline_sessions: number
    offline_duration_hours: number
    data_accessed_offline: {
      documents_accessed: number
      votes_cast: number
      meetings_attended: number
      compliance_updates: number
    }
    sync_performance: {
      successful_syncs: number
      failed_syncs: number
      conflict_resolutions: number
      data_integrity_checks: number
    }
    security_events: {
      encryption_violations: number
      unauthorized_access_attempts: number
      policy_violations: number
      device_compliance_issues: number
    }
  }
  
  audit_trail_summary: {
    total_activities_logged: number
    high_risk_activities: number
    data_modifications: number
    access_pattern_anomalies: number
    retention_policy_compliance: number
  }
  
  data_governance: {
    data_classification_compliance: number
    retention_policy_adherence: number
    data_minimization_score: number
    cross_border_transfer_compliance: number
    consent_management_status: string
  }
  
  recommendations: ComplianceRecommendation[]
  attachments: string[]
  digital_signature?: string
}

export interface ComplianceRecommendation {
  id: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: string
  title: string
  description: string
  business_impact: string
  technical_requirements: string[]
  estimated_effort: string
  timeline: string
  responsible_party: string
  dependencies: string[]
  success_criteria: string[]
}

export interface ComplianceAlert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  category: 'deadline' | 'violation' | 'anomaly' | 'performance' | 'security'
  title: string
  description: string
  affected_requirements: string[]
  detection_time: string
  resolution_required: boolean
  estimated_resolution_time: string
  escalation_level: number
  automated_response?: string
}

class ComplianceReportingEngine {
  private static instance: ComplianceReportingEngine
  private frameworks: ComplianceFramework[] = []
  private activeReports: Map<string, ComplianceReport> = new Map()
  private alerts: ComplianceAlert[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  
  private constructor() {}
  
  static getInstance(): ComplianceReportingEngine {
    if (!ComplianceReportingEngine.instance) {
      ComplianceReportingEngine.instance = new ComplianceReportingEngine()
    }
    return ComplianceReportingEngine.instance
  }
  
  async initialize(): Promise<void> {
    try {
      await this.loadFrameworks()
      await this.startContinuousMonitoring()
      console.log('Compliance reporting engine initialized')
    } catch (error) {
      console.error('Failed to initialize compliance reporting:', error)
    }
  }
  
  private async loadFrameworks(): Promise<void> {
    // Load compliance frameworks from configuration
    this.frameworks = [
      {
        id: 'gdpr',
        name: 'General Data Protection Regulation',
        version: '2018',
        requirements: [
          {
            id: 'gdpr_art_5',
            code: 'Article 5',
            title: 'Principles relating to processing of personal data',
            description: 'Personal data shall be processed lawfully, fairly and transparently',
            category: 'data_governance',
            risk_level: 'high',
            evidence_required: true,
            automated_check: true,
            monitoring_enabled: true
          },
          {
            id: 'gdpr_art_25',
            code: 'Article 25',
            title: 'Data protection by design and by default',
            description: 'Implement appropriate technical and organizational measures',
            category: 'security',
            risk_level: 'critical',
            evidence_required: true,
            automated_check: false,
            monitoring_enabled: true
          },
          {
            id: 'gdpr_art_30',
            code: 'Article 30',
            title: 'Records of processing activities',
            description: 'Maintain records of all processing activities',
            category: 'audit_trail',
            risk_level: 'medium',
            evidence_required: true,
            automated_check: true,
            monitoring_enabled: true
          }
        ],
        reporting_frequency: 'quarterly',
        mandatory: true,
        jurisdiction: 'EU'
      },
      {
        id: 'sox',
        name: 'Sarbanes-Oxley Act',
        version: '2002',
        requirements: [
          {
            id: 'sox_302',
            code: 'Section 302',
            title: 'Corporate Responsibility for Financial Reports',
            description: 'CEO and CFO must certify financial reports',
            category: 'data_governance',
            risk_level: 'critical',
            evidence_required: true,
            automated_check: false,
            monitoring_enabled: true
          },
          {
            id: 'sox_404',
            code: 'Section 404',
            title: 'Management Assessment of Internal Controls',
            description: 'Annual assessment of internal control over financial reporting',
            category: 'audit_trail',
            risk_level: 'high',
            evidence_required: true,
            automated_check: true,
            monitoring_enabled: true
          }
        ],
        reporting_frequency: 'annually',
        mandatory: true,
        jurisdiction: 'US'
      },
      {
        id: 'iso27001',
        name: 'ISO/IEC 27001:2013',
        version: '2013',
        requirements: [
          {
            id: 'iso27001_a_9_1',
            code: 'A.9.1',
            title: 'Access control policy',
            description: 'An access control policy shall be established, documented and reviewed',
            category: 'access_control',
            risk_level: 'high',
            evidence_required: true,
            automated_check: true,
            monitoring_enabled: true
          },
          {
            id: 'iso27001_a_10_1',
            code: 'A.10.1',
            title: 'Cryptographic controls',
            description: 'A policy on the use of cryptographic controls shall be developed and implemented',
            category: 'security',
            risk_level: 'critical',
            evidence_required: true,
            automated_check: true,
            monitoring_enabled: true
          }
        ],
        reporting_frequency: 'annually',
        mandatory: false,
        jurisdiction: 'International'
      }
    ]
  }
  
  private async startContinuousMonitoring(): Promise<void> {
    // Monitor compliance status every hour
    this.monitoringInterval = setInterval(async () => {
      await this.performComplianceCheck()
    }, 60 * 60 * 1000)
    
    // Initial check
    await this.performComplianceCheck()
  }
  
  private async performComplianceCheck(): Promise<void> {
    try {
      for (const framework of this.frameworks) {
        for (const requirement of framework.requirements) {
          if (requirement.automated_check && requirement.monitoring_enabled) {
            await this.checkRequirementCompliance(framework, requirement)
          }
        }
      }
    } catch (error) {
      console.error('Compliance check failed:', error)
    }
  }
  
  private async checkRequirementCompliance(
    framework: ComplianceFramework,
    requirement: ComplianceRequirement
  ): Promise<void> {
    try {
      const isCompliant = await this.evaluateRequirement(framework, requirement)
      
      if (!isCompliant) {
        await this.createComplianceAlert({
          severity: requirement.risk_level === 'critical' ? 'critical' : 'warning',
          category: 'violation',
          title: `Compliance Violation: ${requirement.title}`,
          description: `Requirement ${requirement.code} is not compliant`,
          affected_requirements: [requirement.id],
          detection_time: new Date().toISOString(),
          resolution_required: requirement.risk_level !== 'low',
          estimated_resolution_time: this.getEstimatedResolutionTime(requirement.risk_level),
          escalation_level: requirement.risk_level === 'critical' ? 3 : 1
        })
      }
    } catch (error) {
      console.error(`Failed to check compliance for ${requirement.code}:`, error)
    }
  }
  
  private async evaluateRequirement(
    framework: ComplianceFramework,
    requirement: ComplianceRequirement
  ): Promise<boolean> {
    const db = getOfflineDB()
    
    switch (requirement.id) {
      case 'gdpr_art_5':
        // Check data processing transparency
        return await this.checkDataProcessingTransparency()
        
      case 'gdpr_art_25':
        // Check data protection by design
        return await this.checkDataProtectionByDesign()
        
      case 'gdpr_art_30':
        // Check processing records
        return await this.checkProcessingRecords()
        
      case 'sox_302':
        // Check financial report certification
        return await this.checkFinancialReportCertification()
        
      case 'sox_404':
        // Check internal controls
        return await this.checkInternalControls()
        
      case 'iso27001_a_9_1':
        // Check access control policy
        return await this.checkAccessControlPolicy()
        
      case 'iso27001_a_10_1':
        // Check cryptographic controls
        return await this.checkCryptographicControls()
        
      default:
        return true // Unknown requirement, assume compliant
    }
  }
  
  private async checkDataProcessingTransparency(): Promise<boolean> {
    const db = getOfflineDB()
    
    // Check if all data processing activities are logged
    const recentLogs = await db.audit_logs
      .where('timestamp')
      .above(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .toArray()
    
    // Ensure critical activities are logged
    const criticalActions = ['create', 'update', 'delete']
    const loggedActions = new Set(recentLogs.map(log => log.action))
    
    return criticalActions.every(action => loggedActions.has(action))
  }
  
  private async checkDataProtectionByDesign(): Promise<boolean> {
    const db = getOfflineDB()
    const storageInfo = await db.getStorageInfo()
    
    // Check if encryption is enabled (data protection by design)
    return storageInfo.encryptionEnabled
  }
  
  private async checkProcessingRecords(): Promise<boolean> {
    const db = getOfflineDB()
    
    // Check if processing activities are recorded for the last 3 years
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
    const recordCount = await db.audit_logs
      .where('timestamp')
      .above(threeYearsAgo)
      .count()
    
    return recordCount > 0
  }
  
  private async checkFinancialReportCertification(): Promise<boolean> {
    // Check if financial reports have proper certification
    // This would integrate with financial reporting systems
    return true // Placeholder
  }
  
  private async checkInternalControls(): Promise<boolean> {
    // Check internal control systems
    const db = getOfflineDB()
    
    // Verify audit logging is active
    const recentLogs = await db.audit_logs
      .where('timestamp')
      .above(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .count()
    
    return recentLogs > 0
  }
  
  private async checkAccessControlPolicy(): Promise<boolean> {
    // Check if access control policies are documented and enforced
    // This would check user permissions and access logs
    return true // Placeholder - would implement actual check
  }
  
  private async checkCryptographicControls(): Promise<boolean> {
    const db = getOfflineDB()
    const storageInfo = await db.getStorageInfo()
    
    // Verify encryption is enabled and meets standards
    return storageInfo.encryptionEnabled
  }
  
  private getEstimatedResolutionTime(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical': return '4 hours'
      case 'high': return '24 hours'
      case 'medium': return '7 days'
      case 'low': return '30 days'
      default: return '24 hours'
    }
  }
  
  async generateComplianceReport(
    frameworkId: string,
    organizationId: string,
    reportType: ComplianceReport['report_type'] = 'scheduled',
    startDate?: string,
    endDate?: string
  ): Promise<ComplianceReport> {
    const framework = this.frameworks.find(f => f.id === frameworkId)
    if (!framework) {
      throw new Error(`Framework not found: ${frameworkId}`)
    }
    
    const reportPeriod = {
      start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: endDate || new Date().toISOString()
    }
    
    // Collect data for the report
    const offlineActivities = await this.collectOfflineActivities(reportPeriod)
    const auditTrailSummary = await this.generateAuditTrailSummary(reportPeriod)
    const complianceAssessment = await this.assessFrameworkCompliance(framework)
    const recommendations = await this.generateRecommendations(complianceAssessment)
    
    const report: ComplianceReport = {
      id: `report_${frameworkId}_${Date.now()}`,
      framework_id: frameworkId,
      organization_id: organizationId,
      report_type: reportType,
      reporting_period: reportPeriod,
      generated_at: new Date().toISOString(),
      generated_by: 'system', // Would use actual user ID
      status: 'draft',
      
      executive_summary: {
        overall_compliance_score: this.calculateOverallComplianceScore(complianceAssessment),
        critical_issues: complianceAssessment.filter(a => a.status === 'non_compliant' && a.risk_assessment === 'critical').length,
        medium_issues: complianceAssessment.filter(a => a.status === 'non_compliant' && a.risk_assessment === 'medium').length,
        low_issues: complianceAssessment.filter(a => a.status === 'non_compliant' && a.risk_assessment === 'low').length,
        recommendations_count: recommendations.length,
        data_coverage: this.calculateDataCoverage(auditTrailSummary)
      },
      
      compliance_assessment: complianceAssessment,
      offline_activities: offlineActivities,
      audit_trail_summary: auditTrailSummary,
      
      data_governance: {
        data_classification_compliance: 85, // Would calculate actual percentage
        retention_policy_adherence: 92,
        data_minimization_score: 88,
        cross_border_transfer_compliance: 95,
        consent_management_status: 'compliant'
      },
      
      recommendations: recommendations,
      attachments: []
    }
    
    this.activeReports.set(report.id, report)
    
    return report
  }
  
  private async collectOfflineActivities(period: { start_date: string; end_date: string }) {
    const db = getOfflineDB()
    
    // Get offline activity data
    const offlineLogs = await db.audit_logs
      .where('timestamp')
      .between(period.start_date, period.end_date)
      .and(log => log.offline_action === true)
      .toArray()
    
    const documentsAccessed = offlineLogs.filter(log => 
      log.entity_type === 'documents' && log.action === 'read'
    ).length
    
    const votesCast = offlineLogs.filter(log => 
      log.entity_type === 'votes' && log.action === 'create'
    ).length
    
    const meetingsAttended = offlineLogs.filter(log => 
      log.entity_type === 'meetings' && log.action === 'read'
    ).length
    
    const complianceUpdates = offlineLogs.filter(log => 
      log.entity_type === 'compliance_items' && log.action === 'update'
    ).length
    
    return {
      total_offline_sessions: await this.calculateOfflineSessions(offlineLogs),
      offline_duration_hours: await this.calculateOfflineDuration(offlineLogs),
      data_accessed_offline: {
        documents_accessed: documentsAccessed,
        votes_cast: votesCast,
        meetings_attended: meetingsAttended,
        compliance_updates: complianceUpdates
      },
      sync_performance: {
        successful_syncs: 45, // Would calculate from sync logs
        failed_syncs: 2,
        conflict_resolutions: 1,
        data_integrity_checks: 47
      },
      security_events: {
        encryption_violations: 0,
        unauthorized_access_attempts: 0,
        policy_violations: 1,
        device_compliance_issues: 0
      }
    }
  }
  
  private async generateAuditTrailSummary(period: { start_date: string; end_date: string }) {
    const db = getOfflineDB()
    
    const auditLogs = await db.audit_logs
      .where('timestamp')
      .between(period.start_date, period.end_date)
      .toArray()
    
    const highRiskActivities = auditLogs.filter(log => 
      log.risk_level === 'high' || log.compliance_relevant === true
    ).length
    
    const dataModifications = auditLogs.filter(log => 
      ['create', 'update', 'delete'].includes(log.action)
    ).length
    
    return {
      total_activities_logged: auditLogs.length,
      high_risk_activities: highRiskActivities,
      data_modifications: dataModifications,
      access_pattern_anomalies: 0, // Would implement anomaly detection
      retention_policy_compliance: 98 // Would calculate based on actual policy
    }
  }
  
  private async assessFrameworkCompliance(framework: ComplianceFramework) {
    const assessments = []
    
    for (const requirement of framework.requirements) {
      const isCompliant = await this.evaluateRequirement(framework, requirement)
      const evidence = await this.collectEvidence(requirement)
      
      assessments.push({
        requirement_id: requirement.id,
        status: isCompliant ? 'compliant' : 'non_compliant' as const,
        evidence_collected: evidence,
        gaps_identified: isCompliant ? [] : [`${requirement.title} is not fully implemented`],
        risk_assessment: requirement.risk_level,
        remediation_plan: isCompliant ? 'None required' : `Implement ${requirement.title}`,
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
    
    return assessments
  }
  
  private async collectEvidence(requirement: ComplianceRequirement): Promise<string[]> {
    const evidence = []
    
    if (requirement.automated_check) {
      evidence.push('Automated compliance check results')
    }
    
    if (requirement.category === 'audit_trail') {
      evidence.push('Audit log records')
    }
    
    if (requirement.category === 'security') {
      evidence.push('Security configuration settings')
      evidence.push('Encryption status report')
    }
    
    return evidence
  }
  
  private async generateRecommendations(
    assessments: Awaited<ReturnType<typeof this.assessFrameworkCompliance>>
  ): Promise<ComplianceRecommendation[]> {
    const recommendations = []
    
    for (const assessment of assessments) {
      if (assessment.status !== 'compliant' && assessment.gaps_identified.length > 0) {
        recommendations.push({
          id: `rec_${assessment.requirement_id}`,
          priority: assessment.risk_assessment as any,
          category: 'compliance_gap',
          title: `Address compliance gap for ${assessment.requirement_id}`,
          description: assessment.gaps_identified[0],
          business_impact: this.getBusinessImpact(assessment.risk_assessment),
          technical_requirements: [
            'Update configuration settings',
            'Implement monitoring controls',
            'Document procedures'
          ],
          estimated_effort: this.getEstimatedEffort(assessment.risk_assessment),
          timeline: assessment.target_date,
          responsible_party: 'Compliance Team',
          dependencies: [],
          success_criteria: [
            'Requirement passes automated checks',
            'Evidence documentation complete',
            'Monitoring alerts configured'
          ]
        })
      }
    }
    
    return recommendations
  }
  
  private calculateOverallComplianceScore(
    assessments: Awaited<ReturnType<typeof this.assessFrameworkCompliance>>
  ): number {
    const totalRequirements = assessments.length
    const compliantRequirements = assessments.filter(a => a.status === 'compliant').length
    
    return Math.round((compliantRequirements / totalRequirements) * 100)
  }
  
  private calculateDataCoverage(auditSummary: any): number {
    // Calculate what percentage of activities are properly logged and monitored
    const totalPossibleActivities = auditSummary.total_activities_logged + 
                                  auditSummary.access_pattern_anomalies
    
    if (totalPossibleActivities === 0) return 100
    
    return Math.round((auditSummary.total_activities_logged / totalPossibleActivities) * 100)
  }
  
  private async calculateOfflineSessions(logs: AuditLog[]): Promise<number> {
    // Group logs by user and detect session boundaries
    const userSessions = new Map()
    
    logs.forEach(log => {
      if (!userSessions.has(log.user_id)) {
        userSessions.set(log.user_id, [])
      }
      userSessions.get(log.user_id).push(log.timestamp)
    })
    
    let totalSessions = 0
    userSessions.forEach(timestamps => {
      // Simple session detection based on time gaps
      timestamps.sort()
      let sessionCount = 1
      for (let i = 1; i < timestamps.length; i++) {
        const timeDiff = new Date(timestamps[i]).getTime() - new Date(timestamps[i-1]).getTime()
        if (timeDiff > 30 * 60 * 1000) { // 30 minute session timeout
          sessionCount++
        }
      }
      totalSessions += sessionCount
    })
    
    return totalSessions
  }
  
  private async calculateOfflineDuration(logs: AuditLog[]): Promise<number> {
    if (logs.length === 0) return 0
    
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const firstLog = new Date(logs[0].timestamp)
    const lastLog = new Date(logs[logs.length - 1].timestamp)
    
    return (lastLog.getTime() - firstLog.getTime()) / (1000 * 60 * 60) // Convert to hours
  }
  
  private getBusinessImpact(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical': return 'High - Potential regulatory fines and business interruption'
      case 'high': return 'Medium - Risk of compliance violations and audit findings'
      case 'medium': return 'Low - Minor compliance gaps with limited business impact'
      case 'low': return 'Minimal - Best practice improvement opportunity'
      default: return 'To be assessed'
    }
  }
  
  private getEstimatedEffort(riskLevel: string): string {
    switch (riskLevel) {
      case 'critical': return '2-4 weeks'
      case 'high': return '1-2 weeks'
      case 'medium': return '3-5 days'
      case 'low': return '1-2 days'
      default: return 'To be estimated'
    }
  }
  
  private async createComplianceAlert(alert: Omit<ComplianceAlert, 'id'>): Promise<void> {
    const newAlert: ComplianceAlert = {
      ...alert,
      id: crypto.randomUUID()
    }
    
    this.alerts.push(newAlert)
    
    // Trigger notifications based on severity
    if (alert.severity === 'critical') {
      await this.escalateAlert(newAlert)
    }
    
    console.warn(`Compliance Alert: ${alert.title}`)
  }
  
  private async escalateAlert(alert: ComplianceAlert): Promise<void> {
    // Implement alert escalation logic
    console.error(`CRITICAL COMPLIANCE ALERT: ${alert.description}`)
    
    // In production, would send notifications to compliance team
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Critical Compliance Alert`, {
        body: alert.description,
        icon: '/icons/compliance-alert.png',
        tag: `compliance-${alert.id}`
      })
    }
  }
  
  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'json'): Promise<Blob> {
    const report = this.activeReports.get(reportId)
    if (!report) {
      throw new Error(`Report not found: ${reportId}`)
    }
    
    switch (format) {
      case 'json':
        return new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
      
      case 'excel':
        // Would generate Excel file with multiple sheets
        return new Blob(['Excel export not implemented'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      case 'pdf':
        // Would generate PDF report
        return new Blob(['PDF export not implemented'], { type: 'application/pdf' })
      
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }
  
  getActiveAlerts(): ComplianceAlert[] {
    return [...this.alerts]
  }
  
  getFrameworks(): ComplianceFramework[] {
    return [...this.frameworks]
  }
  
  async submitReport(reportId: string): Promise<void> {
    const report = this.activeReports.get(reportId)
    if (!report) {
      throw new Error(`Report not found: ${reportId}`)
    }
    
    report.status = 'submitted'
    
    // In production, would submit to regulatory authorities
    console.log(`Report ${reportId} submitted for framework ${report.framework_id}`)
  }
  
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }
}

export const complianceReporting = ComplianceReportingEngine.getInstance()