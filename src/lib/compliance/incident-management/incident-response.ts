/**
 * ISO 27001 Incident Response Management System
 * Comprehensive incident handling following ISO 27035:2023 standards
 */

export interface SecurityIncident {
  id: string
  organizationId?: string
  incidentNumber: string
  title: string
  description: string
  incidentType: 'security' | 'privacy' | 'operational' | 'physical' | 'personnel'
  subType: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  priority: 'urgent' | 'high' | 'normal' | 'low'
  status: 'new' | 'assigned' | 'investigating' | 'containment' | 'eradication' | 'recovery' | 'resolved' | 'closed' | 'cancelled'
  
  // Reporting details
  reportedBy: string
  reportedAt: Date
  discoveredAt: Date
  reportingSource: 'internal' | 'external' | 'automated' | 'customer' | 'third_party'
  
  // Assignment and ownership
  assignedTo?: string
  incidentManager?: string
  responseTeam: string[]
  
  // Impact assessment
  impactScope: 'single_user' | 'department' | 'organization' | 'multiple_orgs' | 'public'
  impactType: ('confidentiality' | 'integrity' | 'availability' | 'authenticity' | 'accountability')[]
  affectedAssets: string[]
  affectedUsers: number
  estimatedLoss?: number
  businessImpact: string
  
  // Technical details
  attackVector?: string
  threatActor?: string
  indicators: string[]
  evidenceCollected: string[]
  forensicAnalysis?: string
  
  // Response actions
  initialResponse: string
  containmentActions: string[]
  eradicationActions: string[]
  recoveryActions: string[]
  
  // Analysis and lessons learned
  rootCause?: string
  contributingFactors: string[]
  lessonsLearned?: string
  preventiveActions: string[]
  
  // Compliance and notification
  regulatoryNotificationRequired: boolean
  regulatoryNotifications: RegulatoryNotification[]
  customerNotificationRequired: boolean
  customerNotifications: CustomerNotification[]
  mediaAttention: boolean
  
  // Timelines (ISO 27035 requirements)
  detectionTime?: Date
  analysisTime?: Date
  containmentTime?: Date
  eradicationTime?: Date
  recoveryTime?: Date
  resolutionTime?: Date
  closureTime?: Date
  
  // Metrics
  timeToDetection?: number // minutes
  timeToContainment?: number // minutes
  timeToResolution?: number // minutes
  
  // Documentation
  incidentLog: IncidentLogEntry[]
  attachments: string[]
  relatedIncidents: string[]
  
  // Review and closure
  postIncidentReview?: PostIncidentReview
  closureApproval?: string
  closureReason?: string
  
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface RegulatoryNotification {
  id: string
  regulator: string
  notificationType: 'initial' | 'update' | 'final'
  deadline: Date
  notifiedAt?: Date
  referenceNumber?: string
  status: 'pending' | 'sent' | 'acknowledged' | 'closed'
  content: string
  response?: string
}

export interface CustomerNotification {
  id: string
  channel: 'email' | 'sms' | 'website' | 'letter' | 'phone'
  audience: 'all_customers' | 'affected_customers' | 'specific_customers'
  content: string
  sentAt?: Date
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed'
  recipientCount?: number
}

export interface IncidentLogEntry {
  id: string
  timestamp: Date
  author: string
  action: string
  description: string
  category: 'detection' | 'analysis' | 'containment' | 'eradication' | 'recovery' | 'communication' | 'documentation'
  attachments?: string[]
}

export interface PostIncidentReview {
  id: string
  conductedBy: string
  conductedAt: Date
  attendees: string[]
  timeline: {
    phase: string
    startTime: Date
    endTime: Date
    duration: number
    effectiveness: 'excellent' | 'good' | 'adequate' | 'poor'
    issues: string[]
  }[]
  whatWorkedWell: string[]
  areasForImprovement: string[]
  actionItems: ActionItem[]
  overallEffectiveness: number // 1-10 scale
  recommendations: string[]
}

export interface ActionItem {
  id: string
  description: string
  owner: string
  priority: 'high' | 'medium' | 'low'
  dueDate: Date
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  category: 'process' | 'technology' | 'training' | 'documentation' | 'policy'
}

export interface IncidentResponsePlan {
  id: string
  name: string
  version: string
  incidentTypes: string[]
  severityThresholds: Record<string, SeverityThreshold>
  responseTeam: ResponseTeamMember[]
  escalationMatrix: EscalationRule[]
  communicationPlan: CommunicationPlan
  procedures: ResponseProcedure[]
  tools: string[]
  contacts: EmergencyContact[]
  approvedBy: string
  effectiveDate: Date
  nextReviewDate: Date
}

export interface SeverityThreshold {
  level: 'critical' | 'high' | 'medium' | 'low' | 'informational'
  criteria: string[]
  responseTime: number // minutes
  escalationTime: number // minutes
  notificationRequired: boolean
  approvalRequired: boolean
}

export interface ResponseTeamMember {
  role: 'incident_manager' | 'technical_lead' | 'communications_lead' | 'legal_counsel' | 'executive_sponsor' | 'analyst'
  userId: string
  name: string
  email: string
  phone: string
  alternateId?: string
  availability: '24x7' | 'business_hours' | 'on_call'
}

export interface EscalationRule {
  condition: string
  timeThreshold: number // minutes
  escalateTo: string[]
  notificationMethod: 'email' | 'sms' | 'call' | 'all'
  autoEscalate: boolean
}

export interface CommunicationPlan {
  internal: {
    employees: { threshold: string; method: string; template: string }
    management: { threshold: string; method: string; template: string }
    board: { threshold: string; method: string; template: string }
  }
  external: {
    customers: { threshold: string; method: string; template: string }
    partners: { threshold: string; method: string; template: string }
    regulators: { threshold: string; method: string; template: string }
    media: { threshold: string; method: string; template: string }
  }
}

export interface ResponseProcedure {
  phase: 'detection' | 'analysis' | 'containment' | 'eradication' | 'recovery' | 'lessons_learned'
  steps: ProcedureStep[]
  timeLimit?: number // minutes
  requiredRoles: string[]
  approvalRequired: boolean
}

export interface ProcedureStep {
  order: number
  description: string
  owner: string
  timeLimit?: number // minutes
  dependencies: number[]
  checklist: string[]
  tools: string[]
}

export interface EmergencyContact {
  organization: string
  contactType: 'law_enforcement' | 'regulatory' | 'legal' | 'pr' | 'vendor' | 'other'
  name: string
  phone: string
  email: string
  availability: string
  notes?: string
}

export interface IncidentMetrics {
  period: { start: Date; end: Date }
  totalIncidents: number
  incidentsBySeverity: Record<string, number>
  incidentsByType: Record<string, number>
  incidentsByStatus: Record<string, number>
  averageDetectionTime: number
  averageContainmentTime: number
  averageResolutionTime: number
  slaCompliance: number
  trends: {
    period: string
    count: number
    severity: Record<string, number>
  }[]
  topRootCauses: { cause: string; count: number }[]
  recommendations: string[]
}

/**
 * Incident Response Management Controller
 */
export class IncidentResponseController {
  private readonly SLA_THRESHOLDS = {
    critical: { response: 15, containment: 60, resolution: 240 }, // minutes
    high: { response: 30, containment: 120, resolution: 480 },
    medium: { response: 60, containment: 240, resolution: 1440 },
    low: { response: 240, containment: 1440, resolution: 4320 }
  }

  /**
   * Create new security incident
   */
  createIncident(incidentData: Partial<SecurityIncident>): SecurityIncident {
    const now = new Date()
    const incidentNumber = this.generateIncidentNumber()

    const incident: SecurityIncident = {
      id: crypto.randomUUID(),
      incidentNumber,
      title: incidentData.title || 'Untitled Incident',
      description: incidentData.description || '',
      incidentType: incidentData.incidentType || 'security',
      subType: incidentData.subType || 'unknown',
      severity: incidentData.severity || 'medium',
      priority: this.calculatePriority(incidentData.severity || 'medium', incidentData.impactScope || 'single_user'),
      status: 'new',
      
      reportedBy: incidentData.reportedBy || 'system',
      reportedAt: now,
      discoveredAt: incidentData.discoveredAt || now,
      reportingSource: incidentData.reportingSource || 'internal',
      
      responseTeam: [],
      
      impactScope: incidentData.impactScope || 'single_user',
      impactType: incidentData.impactType || ['availability'],
      affectedAssets: incidentData.affectedAssets || [],
      affectedUsers: incidentData.affectedUsers || 0,
      businessImpact: incidentData.businessImpact || 'To be assessed',
      
      indicators: incidentData.indicators || [],
      evidenceCollected: [],
      
      initialResponse: 'Incident reported and logged',
      containmentActions: [],
      eradicationActions: [],
      recoveryActions: [],
      
      contributingFactors: [],
      preventiveActions: [],
      
      regulatoryNotificationRequired: this.requiresRegulatoryNotification(
        incidentData.incidentType || 'security',
        incidentData.severity || 'medium'
      ),
      regulatoryNotifications: [],
      customerNotificationRequired: this.requiresCustomerNotification(
        incidentData.impactScope || 'single_user',
        incidentData.incidentType || 'security'
      ),
      customerNotifications: [],
      mediaAttention: false,
      
      incidentLog: [{
        id: crypto.randomUUID(),
        timestamp: now,
        author: incidentData.reportedBy || 'system',
        action: 'incident_created',
        description: 'Incident created and assigned number ' + incidentNumber,
        category: 'documentation'
      }],
      attachments: [],
      relatedIncidents: [],
      
      createdAt: now,
      updatedAt: now,
      ...incidentData
    }

    return incident
  }

  /**
   * Update incident status and log the change
   */
  updateIncidentStatus(
    incident: SecurityIncident,
    newStatus: SecurityIncident['status'],
    userId: string,
    notes?: string
  ): SecurityIncident {
    const now = new Date()
    const previousStatus = incident.status

    // Update status-specific timestamps
    switch (newStatus) {
      case 'investigating':
        if (!incident.analysisTime) incident.analysisTime = now
        break
      case 'containment':
        if (!incident.containmentTime) {
          incident.containmentTime = now
          incident.timeToContainment = this.calculateTimeMinutes(incident.reportedAt, now)
        }
        break
      case 'eradication':
        if (!incident.eradicationTime) incident.eradicationTime = now
        break
      case 'recovery':
        if (!incident.recoveryTime) incident.recoveryTime = now
        break
      case 'resolved':
        if (!incident.resolutionTime) {
          incident.resolutionTime = now
          incident.timeToResolution = this.calculateTimeMinutes(incident.reportedAt, now)
        }
        break
      case 'closed':
        if (!incident.closureTime) incident.closureTime = now
        break
    }

    // Calculate detection time if moving from 'new'
    if (previousStatus === 'new' && !incident.timeToDetection) {
      incident.timeToDetection = this.calculateTimeMinutes(incident.discoveredAt, incident.reportedAt)
    }

    // Add log entry
    const logEntry: IncidentLogEntry = {
      id: crypto.randomUUID(),
      timestamp: now,
      author: userId,
      action: 'status_change',
      description: `Status changed from ${previousStatus} to ${newStatus}${notes ? ': ' + notes : ''}`,
      category: 'documentation'
    }

    return {
      ...incident,
      status: newStatus,
      updatedAt: now,
      incidentLog: [...incident.incidentLog, logEntry]
    }
  }

  /**
   * Assign incident to response team member
   */
  assignIncident(
    incident: SecurityIncident,
    assigneeId: string,
    assignedBy: string,
    role?: string
  ): SecurityIncident {
    const now = new Date()

    // Add to response team if not already there
    const responseTeam = incident.responseTeam.includes(assigneeId) 
      ? incident.responseTeam 
      : [...incident.responseTeam, assigneeId]

    // Update assigned to
    const updates: Partial<SecurityIncident> = {
      assignedTo: assigneeId,
      responseTeam,
      updatedAt: now,
      incidentLog: [...incident.incidentLog, {
        id: crypto.randomUUID(),
        timestamp: now,
        author: assignedBy,
        action: 'assignment',
        description: `Incident assigned to ${assigneeId}${role ? ' as ' + role : ''}`,
        category: 'documentation'
      }]
    }

    // Set incident manager if role specified
    if (role === 'incident_manager') {
      updates.incidentManager = assigneeId
    }

    // Auto-update status if still new
    if (incident.status === 'new') {
      updates.status = 'assigned'
    }

    return { ...incident, ...updates }
  }

  /**
   * Add response action to incident
   */
  addResponseAction(
    incident: SecurityIncident,
    phase: 'containment' | 'eradication' | 'recovery',
    action: string,
    userId: string
  ): SecurityIncident {
    const now = new Date()
    
    let updatedActions: string[]
    let logCategory: IncidentLogEntry['category']

    switch (phase) {
      case 'containment':
        updatedActions = [...incident.containmentActions, action]
        logCategory = 'containment'
        break
      case 'eradication':
        updatedActions = [...incident.eradicationActions, action]
        logCategory = 'eradication'
        break
      case 'recovery':
        updatedActions = [...incident.recoveryActions, action]
        logCategory = 'recovery'
        break
    }

    const logEntry: IncidentLogEntry = {
      id: crypto.randomUUID(),
      timestamp: now,
      author: userId,
      action: `${phase}_action_added`,
      description: action,
      category: logCategory
    }

    return {
      ...incident,
      [phase + 'Actions']: updatedActions,
      updatedAt: now,
      incidentLog: [...incident.incidentLog, logEntry]
    }
  }

  /**
   * Escalate incident based on rules
   */
  escalateIncident(
    incident: SecurityIncident,
    escalationRules: EscalationRule[],
    userId: string,
    manualReason?: string
  ): {
    incident: SecurityIncident
    escalations: { rule: EscalationRule; triggered: boolean; reason: string }[]
  } {
    const now = new Date()
    const escalations: { rule: EscalationRule; triggered: boolean; reason: string }[] = []

    for (const rule of escalationRules) {
      let shouldEscalate = false
      let reason = ''

      if (manualReason) {
        shouldEscalate = true
        reason = manualReason
      } else {
        // Check time-based escalation
        const timeElapsed = this.calculateTimeMinutes(incident.reportedAt, now)
        if (timeElapsed >= rule.timeThreshold) {
          shouldEscalate = true
          reason = `Time threshold exceeded (${rule.timeThreshold} minutes)`
        }

        // Check condition-based escalation
        if (rule.condition && this.evaluateEscalationCondition(incident, rule.condition)) {
          shouldEscalate = true
          reason = reason ? reason + '; ' + rule.condition : rule.condition
        }
      }

      escalations.push({ rule, triggered: shouldEscalate, reason })

      if (shouldEscalate) {
        // Add escalation log entry
        const logEntry: IncidentLogEntry = {
          id: crypto.randomUUID(),
          timestamp: now,
          author: userId,
          action: 'escalation',
          description: `Incident escalated to ${rule.escalateTo.join(', ')}: ${reason}`,
          category: 'communication'
        }

        incident = {
          ...incident,
          responseTeam: [...new Set([...incident.responseTeam, ...rule.escalateTo])],
          updatedAt: now,
          incidentLog: [...incident.incidentLog, logEntry]
        }
      }
    }

    return { incident, escalations }
  }

  /**
   * Generate incident metrics for reporting
   */
  generateIncidentMetrics(
    incidents: SecurityIncident[],
    period: { start: Date; end: Date }
  ): IncidentMetrics {
    const filteredIncidents = incidents.filter(
      incident => incident.createdAt >= period.start && incident.createdAt <= period.end
    )

    const incidentsBySeverity = this.groupBy(filteredIncidents, 'severity')
    const incidentsByType = this.groupBy(filteredIncidents, 'incidentType')
    const incidentsByStatus = this.groupBy(filteredIncidents, 'status')

    // Calculate average times
    const averageDetectionTime = this.calculateAverage(
      filteredIncidents.map(i => i.timeToDetection).filter(t => t !== undefined) as number[]
    )

    const averageContainmentTime = this.calculateAverage(
      filteredIncidents.map(i => i.timeToContainment).filter(t => t !== undefined) as number[]
    )

    const averageResolutionTime = this.calculateAverage(
      filteredIncidents.map(i => i.timeToResolution).filter(t => t !== undefined) as number[]
    )

    // Calculate SLA compliance
    const slaCompliance = this.calculateSLACompliance(filteredIncidents)

    // Generate trends (monthly buckets)
    const trends = this.generateTrends(filteredIncidents, period)

    // Top root causes
    const rootCauses = filteredIncidents
      .filter(i => i.rootCause)
      .reduce((acc, i) => {
        const cause = i.rootCause!
        acc[cause] = (acc[cause] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const topRootCauses = Object.entries(rootCauses)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cause, count]) => ({ cause, count }))

    // Generate recommendations
    const recommendations = this.generateRecommendations(filteredIncidents, slaCompliance)

    return {
      period,
      totalIncidents: filteredIncidents.length,
      incidentsBySeverity,
      incidentsByType,
      incidentsByStatus,
      averageDetectionTime,
      averageContainmentTime,
      averageResolutionTime,
      slaCompliance,
      trends,
      topRootCauses,
      recommendations
    }
  }

  /**
   * Conduct post-incident review
   */
  conductPostIncidentReview(
    incident: SecurityIncident,
    reviewData: Partial<PostIncidentReview>
  ): PostIncidentReview {
    const timeline = this.buildIncidentTimeline(incident)
    
    const review: PostIncidentReview = {
      id: crypto.randomUUID(),
      conductedBy: reviewData.conductedBy || 'unknown',
      conductedAt: reviewData.conductedAt || new Date(),
      attendees: reviewData.attendees || [],
      timeline,
      whatWorkedWell: reviewData.whatWorkedWell || [],
      areasForImprovement: reviewData.areasForImprovement || [],
      actionItems: reviewData.actionItems || [],
      overallEffectiveness: reviewData.overallEffectiveness || 5,
      recommendations: reviewData.recommendations || []
    }

    return review
  }

  // Private helper methods

  private generateIncidentNumber(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const time = now.getTime().toString().slice(-4)
    
    return `INC-${year}${month}${day}-${time}`
  }

  private calculatePriority(
    severity: SecurityIncident['severity'],
    impactScope: SecurityIncident['impactScope']
  ): SecurityIncident['priority'] {
    if (severity === 'critical') return 'urgent'
    if (severity === 'high' && ['organization', 'multiple_orgs', 'public'].includes(impactScope)) return 'urgent'
    if (severity === 'high') return 'high'
    if (severity === 'medium') return 'normal'
    return 'low'
  }

  private requiresRegulatoryNotification(incidentType: string, severity: string): boolean {
    // GDPR requires notification within 72 hours for personal data breaches
    if (incidentType === 'privacy' && ['critical', 'high'].includes(severity)) return true
    
    // Financial regulations may require notification for security incidents
    if (incidentType === 'security' && severity === 'critical') return true
    
    return false
  }

  private requiresCustomerNotification(impactScope: string, incidentType: string): boolean {
    return ['organization', 'multiple_orgs', 'public'].includes(impactScope) ||
           (incidentType === 'privacy' && impactScope !== 'single_user')
  }

  private calculateTimeMinutes(start: Date, end: Date): number {
    return Math.round((end.getTime() - start.getTime()) / 60000)
  }

  private evaluateEscalationCondition(incident: SecurityIncident, condition: string): boolean {
    // Simplified condition evaluation - would be more sophisticated in practice
    if (condition.includes('severity:critical')) return incident.severity === 'critical'
    if (condition.includes('no_progress')) return incident.status === incident.status // Simplified
    return false
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key])
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length)
  }

  private calculateSLACompliance(incidents: SecurityIncident[]): number {
    if (incidents.length === 0) return 100

    const compliantIncidents = incidents.filter(incident => {
      const sla = this.SLA_THRESHOLDS[incident.severity]
      
      // Check response time (time to assignment)
      if (incident.assignedTo && incident.timeToDetection && incident.timeToDetection > sla.response) {
        return false
      }

      // Check containment time
      if (incident.timeToContainment && incident.timeToContainment > sla.containment) {
        return false
      }

      // Check resolution time
      if (incident.timeToResolution && incident.timeToResolution > sla.resolution) {
        return false
      }

      return true
    })

    return Math.round((compliantIncidents.length / incidents.length) * 100)
  }

  private generateTrends(
    incidents: SecurityIncident[],
    period: { start: Date; end: Date }
  ): IncidentMetrics['trends'] {
    // Generate monthly trends
    const trends: IncidentMetrics['trends'] = []
    const current = new Date(period.start)

    while (current <= period.end) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      
      const monthIncidents = incidents.filter(
        i => i.createdAt >= monthStart && i.createdAt <= monthEnd
      )

      const severity = this.groupBy(monthIncidents, 'severity')

      trends.push({
        period: monthStart.toISOString().slice(0, 7), // YYYY-MM format
        count: monthIncidents.length,
        severity
      })

      current.setMonth(current.getMonth() + 1)
    }

    return trends
  }

  private generateRecommendations(incidents: SecurityIncident[], slaCompliance: number): string[] {
    const recommendations: string[] = []

    if (slaCompliance < 80) {
      recommendations.push('Improve incident response times to meet SLA targets')
    }

    const criticalIncidents = incidents.filter(i => i.severity === 'critical')
    if (criticalIncidents.length > 0) {
      recommendations.push(`Review and address ${criticalIncidents.length} critical incidents`)
    }

    const unresolvedIncidents = incidents.filter(i => !['resolved', 'closed'].includes(i.status))
    if (unresolvedIncidents.length > 0) {
      recommendations.push(`Focus on resolving ${unresolvedIncidents.length} open incidents`)
    }

    return recommendations
  }

  private buildIncidentTimeline(incident: SecurityIncident): PostIncidentReview['timeline'] {
    const timeline: PostIncidentReview['timeline'] = []

    if (incident.discoveredAt && incident.reportedAt) {
      timeline.push({
        phase: 'detection',
        startTime: incident.discoveredAt,
        endTime: incident.reportedAt,
        duration: this.calculateTimeMinutes(incident.discoveredAt, incident.reportedAt),
        effectiveness: incident.timeToDetection! < 60 ? 'excellent' : 'adequate',
        issues: incident.timeToDetection! > 120 ? ['Late detection'] : []
      })
    }

    // Add other phases based on timestamps...

    return timeline
  }
}

// Export singleton instance
export const incidentResponseController = new IncidentResponseController()

// Convenience functions
export function createSecurityIncident(incidentData: Partial<SecurityIncident>): SecurityIncident {
  return incidentResponseController.createIncident(incidentData)
}

export function updateIncidentStatus(
  incident: SecurityIncident,
  status: SecurityIncident['status'],
  userId: string,
  notes?: string
): SecurityIncident {
  return incidentResponseController.updateIncidentStatus(incident, status, userId, notes)
}

export function generateIncidentReport(
  incidents: SecurityIncident[],
  period: { start: Date; end: Date }
): IncidentMetrics {
  return incidentResponseController.generateIncidentMetrics(incidents, period)
}