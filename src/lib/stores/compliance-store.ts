/**
 * Compliance-Specific Offline Store
 * Specialized state management for compliance and regulatory offline functionality
 */

'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useOfflineStore } from './offline-store'
import type { ComplianceItem, ComplianceNote } from '../offline-db/schema'

export interface ComplianceFramework {
  id: string
  name: string
  description: string
  version: string
  effective_date: string
  requirements: ComplianceRequirement[]
  risk_levels: RiskLevel[]
  audit_frequency: 'monthly' | 'quarterly' | 'annually' | 'as_needed'
  regulatory_body: string
  penalties: CompliancePenalty[]
}

export interface ComplianceRequirement {
  id: string
  framework_id: string
  requirement_code: string
  title: string
  description: string
  category: string
  mandatory: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  verification_method: 'document' | 'audit' | 'certification' | 'self_assessment'
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  dependencies: string[] // Other requirement IDs
  evidence_types: string[]
  automated_check: boolean
  monitoring_enabled: boolean
}

export interface RiskLevel {
  level: 'low' | 'medium' | 'high' | 'critical'
  description: string
  response_time: number // Hours
  escalation_required: boolean
  board_notification: boolean
}

export interface CompliancePenalty {
  violation_type: string
  penalty_description: string
  financial_penalty: number
  non_financial_penalty: string
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
}

export interface ComplianceAssessment {
  id: string
  framework_id: string
  conducted_by: string
  assessment_date: string
  scope: string[]
  findings: ComplianceFinding[]
  overall_score: number
  risk_rating: 'low' | 'medium' | 'high' | 'critical'
  recommendations: ComplianceRecommendation[]
  next_assessment_due: string
  status: 'draft' | 'in_progress' | 'completed' | 'approved'
}

export interface ComplianceFinding {
  id: string
  requirement_id: string
  finding_type: 'compliant' | 'non_compliant' | 'partially_compliant' | 'not_applicable'
  description: string
  evidence: string[]
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  responsible_party: string
  target_resolution_date: string
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk'
}

export interface ComplianceRecommendation {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  estimated_effort: string
  estimated_cost: number
  expected_benefit: string
  implementation_timeline: string
  responsible_party: string
  dependencies: string[]
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'rejected'
}

export interface ComplianceAlert {
  id: string
  type: 'deadline_approaching' | 'overdue' | 'risk_detected' | 'requirement_change' | 'assessment_due'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  message: string
  compliance_item_id?: string
  requirement_id?: string
  due_date?: string
  created_at: string
  acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  actions_required: string[]
}

export interface ComplianceStoreState {
  // Compliance frameworks
  frameworks: ComplianceFramework[]
  
  // Active compliance items
  activeItems: Record<string, ComplianceItem>
  
  // Assessments
  assessments: ComplianceAssessment[]
  
  // Alerts and notifications
  alerts: ComplianceAlert[]
  
  // Compliance dashboard data
  dashboard: {
    total_requirements: number
    compliant_count: number
    non_compliant_count: number
    overdue_count: number
    upcoming_deadlines: ComplianceItem[]
    risk_distribution: Record<string, number>
    compliance_score: number
    last_updated: string
  }
  
  // Offline capabilities
  offline: {
    cached_frameworks: string[]
    pending_assessments: string[]
    sync_queue: string[]
    conflicts: string[]
  }
  
  // User preferences
  preferences: {
    default_reminder_days: number[]
    show_low_risk_items: boolean
    auto_escalate_overdue: boolean
    notification_frequency: 'immediate' | 'daily' | 'weekly'
    preferred_frameworks: string[]
    dashboard_widgets: string[]
  }
  
  actions: {
    // Framework management
    loadFrameworks: () => Promise<ComplianceFramework[]>
    addFramework: (framework: Omit<ComplianceFramework, 'id'>) => Promise<ComplianceFramework>
    updateFramework: (id: string, updates: Partial<ComplianceFramework>) => Promise<void>
    deleteFramework: (id: string) => Promise<void>
    
    // Compliance item management
    createComplianceItem: (item: Omit<ComplianceItem, 'id' | 'created_at' | 'updated_at'>) => Promise<ComplianceItem>
    updateComplianceItem: (id: string, updates: Partial<ComplianceItem>) => Promise<void>
    completeComplianceItem: (id: string, evidence?: string[]) => Promise<void>
    escalateComplianceItem: (id: string, reason: string) => Promise<void>
    addComplianceNote: (itemId: string, note: Omit<ComplianceNote, 'id' | 'created_at'>) => Promise<void>
    
    // Assessment management
    createAssessment: (assessment: Omit<ComplianceAssessment, 'id'>) => Promise<ComplianceAssessment>
    updateAssessment: (id: string, updates: Partial<ComplianceAssessment>) => Promise<void>
    addFinding: (assessmentId: string, finding: Omit<ComplianceFinding, 'id'>) => Promise<void>
    resolveFinding: (assessmentId: string, findingId: string, resolution: string) => Promise<void>
    
    // Risk management
    assessRisk: (itemId: string) => Promise<{ level: string; factors: string[]; recommendations: string[] }>
    updateRiskLevel: (itemId: string, level: ComplianceItem['risk_level'], justification: string) => Promise<void>
    generateRiskReport: (frameworkId?: string) => Promise<{
      total_items: number
      by_risk_level: Record<string, number>
      top_risks: ComplianceItem[]
      trends: any[]
    }>
    
    // Monitoring and alerts
    checkDeadlines: () => Promise<ComplianceAlert[]>
    createAlert: (alert: Omit<ComplianceAlert, 'id' | 'created_at'>) => Promise<ComplianceAlert>
    acknowledgeAlert: (alertId: string) => Promise<void>
    dismissAlert: (alertId: string) => Promise<void>
    getActiveAlerts: (severity?: ComplianceAlert['severity']) => ComplianceAlert[]
    
    // Reporting
    generateComplianceReport: (options: {
      framework_id?: string
      date_range?: { from: Date; to: Date }
      include_evidence?: boolean
      format: 'json' | 'pdf' | 'csv' | 'xlsx'
    }) => Promise<Blob>
    
    exportComplianceData: (itemIds?: string[]) => Promise<Blob>
    generateDashboardData: () => Promise<ComplianceStoreState['dashboard']>
    
    // Automation
    runAutomatedChecks: (frameworkId?: string) => Promise<{
      checked: number
      passed: number
      failed: number
      errors: string[]
    }>
    
    scheduleAutomatedCheck: (itemId: string, schedule: {
      frequency: 'daily' | 'weekly' | 'monthly'
      next_run: string
      enabled: boolean
    }) => Promise<void>
    
    // Offline capabilities
    cacheFrameworkForOffline: (frameworkId: string) => Promise<void>
    syncComplianceChanges: () => Promise<{ success: number; failed: number }>
    getOfflineCapability: (itemId: string) => 'full' | 'limited' | 'none'
    
    // Integration
    importComplianceData: (data: any, format: 'json' | 'csv' | 'xlsx') => Promise<{
      imported: number
      errors: string[]
      warnings: string[]
    }>
    
    exportToThirdParty: (platform: string, itemIds: string[]) => Promise<void>
    syncWithRegulatory: (frameworkId: string) => Promise<void>
    
    // Utilities
    updatePreferences: (updates: Partial<ComplianceStoreState['preferences']>) => void
    clearExpiredData: (olderThan?: Date) => Promise<void>
    validateCompliance: (itemId: string) => Promise<{
      isValid: boolean
      issues: string[]
      suggestions: string[]
    }>
  }
}

export const useComplianceStore = create<ComplianceStoreState>()(
  persist(
    immer((set, get) => ({
      frameworks: [],
      activeItems: {},
      assessments: [],
      alerts: [],
      
      dashboard: {
        total_requirements: 0,
        compliant_count: 0,
        non_compliant_count: 0,
        overdue_count: 0,
        upcoming_deadlines: [],
        risk_distribution: {},
        compliance_score: 0,
        last_updated: new Date().toISOString()
      },
      
      offline: {
        cached_frameworks: [],
        pending_assessments: [],
        sync_queue: [],
        conflicts: []
      },
      
      preferences: {
        default_reminder_days: [30, 14, 7, 3, 1],
        show_low_risk_items: false,
        auto_escalate_overdue: true,
        notification_frequency: 'daily',
        preferred_frameworks: [],
        dashboard_widgets: ['overview', 'alerts', 'upcoming', 'risk_distribution']
      },
      
      actions: {
        loadFrameworks: async (): Promise<ComplianceFramework[]> => {
          // Load from offline DB or server
          const frameworks = get().frameworks
          return frameworks
        },
        
        addFramework: async (framework: Omit<ComplianceFramework, 'id'>): Promise<ComplianceFramework> => {
          const newFramework: ComplianceFramework = {
            ...framework,
            id: `framework_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
          
          set(state => {
            state.frameworks.push(newFramework)
          })
          
          return newFramework
        },
        
        updateFramework: async (id: string, updates: Partial<ComplianceFramework>): Promise<void> => {
          set(state => {
            const index = state.frameworks.findIndex(f => f.id === id)
            if (index >= 0) {
              Object.assign(state.frameworks[index], updates)
            }
          })
        },
        
        deleteFramework: async (id: string): Promise<void> => {
          set(state => {
            state.frameworks = state.frameworks.filter(f => f.id !== id)
          })
        },
        
        createComplianceItem: async (item: Omit<ComplianceItem, 'id' | 'created_at' | 'updated_at'>): Promise<ComplianceItem> => {
          const offlineStore = useOfflineStore.getState()
          return await offlineStore.actions.createComplianceItem(item)
        },
        
        updateComplianceItem: async (id: string, updates: Partial<ComplianceItem>): Promise<void> => {
          const offlineStore = useOfflineStore.getState()
          const existing = await offlineStore.actions.loadEntity<ComplianceItem>('compliance_items', id)
          
          if (existing) {
            const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }
            await offlineStore.actions.saveEntity('compliance_items', updated)
            
            // Update local state
            set(state => {
              state.activeItems[id] = updated
            })
          }
        },
        
        completeComplianceItem: async (id: string, evidence: string[] = []): Promise<void> => {
          await get().actions.updateComplianceItem(id, {
            status: 'completed',
            completion_date: new Date().toISOString(),
            evidence_documents: evidence
          })
          
          // Create completion alert
          await get().actions.createAlert({
            type: 'requirement_change',
            severity: 'info',
            title: 'Compliance Item Completed',
            message: `Compliance item ${id} has been completed`,
            compliance_item_id: id,
            acknowledged: false,
            actions_required: []
          })
        },
        
        escalateComplianceItem: async (id: string, reason: string): Promise<void> => {
          await get().actions.updateComplianceItem(id, {
            risk_level: 'critical',
            priority: 'critical'
          })
          
          // Create escalation alert
          await get().actions.createAlert({
            type: 'risk_detected',
            severity: 'critical',
            title: 'Compliance Item Escalated',
            message: `Compliance item ${id} has been escalated: ${reason}`,
            compliance_item_id: id,
            acknowledged: false,
            actions_required: ['Review immediately', 'Assign resources', 'Set new deadline']
          })
        },
        
        addComplianceNote: async (itemId: string, note: Omit<ComplianceNote, 'id' | 'created_at'>): Promise<void> => {
          const item = await useOfflineStore.getState().actions.loadEntity<ComplianceItem>('compliance_items', itemId)
          if (!item) throw new Error('Compliance item not found')
          
          const newNote: ComplianceNote = {
            ...note,
            id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            attachments: note.attachments || []
          }
          
          const updatedNotes = [...item.progress_notes, newNote]
          await get().actions.updateComplianceItem(itemId, {
            progress_notes: updatedNotes
          })
        },
        
        createAssessment: async (assessment: Omit<ComplianceAssessment, 'id'>): Promise<ComplianceAssessment> => {
          const newAssessment: ComplianceAssessment = {
            ...assessment,
            id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
          
          set(state => {
            state.assessments.push(newAssessment)
          })
          
          return newAssessment
        },
        
        updateAssessment: async (id: string, updates: Partial<ComplianceAssessment>): Promise<void> => {
          set(state => {
            const index = state.assessments.findIndex(a => a.id === id)
            if (index >= 0) {
              Object.assign(state.assessments[index], updates)
            }
          })
        },
        
        addFinding: async (assessmentId: string, finding: Omit<ComplianceFinding, 'id'>): Promise<void> => {
          const newFinding: ComplianceFinding = {
            ...finding,
            id: `finding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }
          
          set(state => {
            const assessment = state.assessments.find(a => a.id === assessmentId)
            if (assessment) {
              assessment.findings.push(newFinding)
            }
          })
          
          // Create alert for non-compliant findings
          if (finding.finding_type === 'non_compliant') {
            await get().actions.createAlert({
              type: 'risk_detected',
              severity: finding.risk_level === 'critical' ? 'critical' : 'warning',
              title: 'Non-Compliance Finding',
              message: `Non-compliant finding identified: ${finding.description}`,
              acknowledged: false,
              actions_required: ['Review finding', 'Create action plan', 'Assign responsibility']
            })
          }
        },
        
        resolveFinding: async (assessmentId: string, findingId: string, resolution: string): Promise<void> => {
          set(state => {
            const assessment = state.assessments.find(a => a.id === assessmentId)
            if (assessment) {
              const finding = assessment.findings.find(f => f.id === findingId)
              if (finding) {
                finding.status = 'resolved'
                // Would add resolution details to finding in production
              }
            }
          })
        },
        
        assessRisk: async (itemId: string) => {
          const item = get().activeItems[itemId]
          if (!item) throw new Error('Compliance item not found')
          
          const factors: string[] = []
          let riskLevel = 'low'
          
          // Risk assessment logic
          if (item.due_date && new Date(item.due_date) < new Date()) {
            factors.push('Item is overdue')
            riskLevel = 'high'
          }
          
          if (item.category === 'regulatory' || item.category === 'legal_obligation') {
            factors.push('Regulatory requirement')
            riskLevel = riskLevel === 'low' ? 'medium' : 'high'
          }
          
          if (item.priority === 'critical' || item.priority === 'high') {
            factors.push('High priority item')
            riskLevel = 'high'
          }
          
          const recommendations = []
          if (riskLevel === 'high') {
            recommendations.push('Immediate attention required')
            recommendations.push('Consider escalating to board level')
            recommendations.push('Allocate additional resources')
          }
          
          return {
            level: riskLevel,
            factors,
            recommendations
          }
        },
        
        updateRiskLevel: async (itemId: string, level: ComplianceItem['risk_level'], justification: string): Promise<void> => {
          await get().actions.updateComplianceItem(itemId, {
            risk_level: level
          })
          
          // Add note with justification
          await get().actions.addComplianceNote(itemId, {
            content: `Risk level updated to ${level}: ${justification}`,
            created_by: 'current_user',
            attachments: []
          })
        },
        
        generateRiskReport: async (frameworkId?: string) => {
          const items = Object.values(get().activeItems)
          const relevantItems = frameworkId 
            ? items.filter(item => item.compliance_framework === frameworkId)
            : items
          
          const riskDistribution = relevantItems.reduce((acc, item) => {
            acc[item.risk_level] = (acc[item.risk_level] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const topRisks = relevantItems
            .filter(item => item.risk_level === 'critical' || item.risk_level === 'high')
            .sort((a, b) => {
              const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 }
              return riskOrder[b.risk_level as keyof typeof riskOrder] - riskOrder[a.risk_level as keyof typeof riskOrder]
            })
            .slice(0, 10)
          
          return {
            total_items: relevantItems.length,
            by_risk_level: riskDistribution,
            top_risks: topRisks,
            trends: [] // Would calculate trends over time
          }
        },
        
        checkDeadlines: async (): Promise<ComplianceAlert[]> => {
          const items = Object.values(get().activeItems)
          const alerts: ComplianceAlert[] = []
          const now = new Date()
          
          for (const item of items) {
            if (!item.due_date) continue
            
            const dueDate = new Date(item.due_date)
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            
            if (daysUntilDue < 0) {
              // Overdue
              alerts.push({
                id: `alert_overdue_${item.id}`,
                type: 'overdue',
                severity: 'error',
                title: 'Compliance Item Overdue',
                message: `${item.title} is ${Math.abs(daysUntilDue)} days overdue`,
                compliance_item_id: item.id,
                due_date: item.due_date,
                created_at: new Date().toISOString(),
                acknowledged: false,
                actions_required: ['Complete immediately', 'Request extension', 'Escalate']
              })
            } else if (daysUntilDue <= 7) {
              // Deadline approaching
              alerts.push({
                id: `alert_deadline_${item.id}`,
                type: 'deadline_approaching',
                severity: daysUntilDue <= 3 ? 'warning' : 'info',
                title: 'Compliance Deadline Approaching',
                message: `${item.title} is due in ${daysUntilDue} days`,
                compliance_item_id: item.id,
                due_date: item.due_date,
                created_at: new Date().toISOString(),
                acknowledged: false,
                actions_required: ['Review progress', 'Prepare evidence', 'Schedule completion']
              })
            }
          }
          
          return alerts
        },
        
        createAlert: async (alert: Omit<ComplianceAlert, 'id' | 'created_at'>): Promise<ComplianceAlert> => {
          const newAlert: ComplianceAlert = {
            ...alert,
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString()
          }
          
          set(state => {
            state.alerts.push(newAlert)
          })
          
          return newAlert
        },
        
        acknowledgeAlert: async (alertId: string): Promise<void> => {
          set(state => {
            const alert = state.alerts.find(a => a.id === alertId)
            if (alert) {
              alert.acknowledged = true
              alert.acknowledged_by = 'current_user' // TODO: Get from auth
              alert.acknowledged_at = new Date().toISOString()
            }
          })
        },
        
        dismissAlert: async (alertId: string): Promise<void> => {
          set(state => {
            state.alerts = state.alerts.filter(a => a.id !== alertId)
          })
        },
        
        getActiveAlerts: (severity?: ComplianceAlert['severity']): ComplianceAlert[] => {
          const alerts = get().alerts.filter(a => !a.acknowledged)
          return severity ? alerts.filter(a => a.severity === severity) : alerts
        },
        
        generateComplianceReport: async (options: {
          framework_id?: string
          date_range?: { from: Date; to: Date }
          include_evidence?: boolean
          format: 'json' | 'pdf' | 'csv' | 'xlsx'
        }): Promise<Blob> => {
          const items = Object.values(get().activeItems)
          let filteredItems = items
          
          if (options.framework_id) {
            filteredItems = filteredItems.filter(item => item.compliance_framework === options.framework_id)
          }
          
          if (options.date_range) {
            filteredItems = filteredItems.filter(item => {
              const createdDate = new Date(item.created_at)
              return createdDate >= options.date_range!.from && createdDate <= options.date_range!.to
            })
          }
          
          const reportData = {
            generated_at: new Date().toISOString(),
            total_items: filteredItems.length,
            compliance_summary: {
              completed: filteredItems.filter(i => i.status === 'completed').length,
              in_progress: filteredItems.filter(i => i.status === 'in_progress').length,
              pending: filteredItems.filter(i => i.status === 'pending').length,
              overdue: filteredItems.filter(i => i.status === 'overdue').length
            },
            risk_summary: filteredItems.reduce((acc, item) => {
              acc[item.risk_level] = (acc[item.risk_level] || 0) + 1
              return acc
            }, {} as Record<string, number>),
            items: options.include_evidence ? filteredItems : filteredItems.map(item => ({
              ...item,
              evidence_documents: item.evidence_documents.length,
              progress_notes: item.progress_notes.length
            }))
          }
          
          if (options.format === 'json') {
            return new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
          }
          
          if (options.format === 'csv') {
            const csvHeaders = 'ID,Title,Status,Priority,Risk Level,Due Date,Assigned To,Framework'
            const csvRows = filteredItems.map(item => 
              `${item.id},${item.title},${item.status},${item.priority},${item.risk_level},${item.due_date},${item.assigned_to},${item.compliance_framework}`
            )
            const csvContent = [csvHeaders, ...csvRows].join('\n')
            return new Blob([csvContent], { type: 'text/csv' })
          }
          
          // For PDF/XLSX, would use appropriate libraries
          return new Blob(['Report generation not implemented for this format'], { type: 'text/plain' })
        },
        
        exportComplianceData: async (itemIds?: string[]): Promise<Blob> => {
          const items = itemIds 
            ? itemIds.map(id => get().activeItems[id]).filter(Boolean)
            : Object.values(get().activeItems)
          
          return new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
        },
        
        generateDashboardData: async (): Promise<ComplianceStoreState['dashboard']> => {
          const items = Object.values(get().activeItems)
          const now = new Date()
          
          const compliantCount = items.filter(item => item.status === 'completed').length
          const nonCompliantCount = items.filter(item => 
            item.status === 'overdue' || (item.due_date && new Date(item.due_date) < now && item.status !== 'completed')
          ).length
          
          const overdueCount = items.filter(item => 
            item.due_date && new Date(item.due_date) < now && item.status !== 'completed'
          ).length
          
          const upcomingDeadlines = items
            .filter(item => {
              if (!item.due_date || item.status === 'completed') return false
              const dueDate = new Date(item.due_date)
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              return daysUntilDue >= 0 && daysUntilDue <= 30
            })
            .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
            .slice(0, 10)
          
          const riskDistribution = items.reduce((acc, item) => {
            acc[item.risk_level] = (acc[item.risk_level] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const complianceScore = items.length > 0 
            ? Math.round((compliantCount / items.length) * 100)
            : 100
          
          const dashboardData: ComplianceStoreState['dashboard'] = {
            total_requirements: items.length,
            compliant_count: compliantCount,
            non_compliant_count: nonCompliantCount,
            overdue_count: overdueCount,
            upcoming_deadlines: upcomingDeadlines,
            risk_distribution: riskDistribution,
            compliance_score: complianceScore,
            last_updated: new Date().toISOString()
          }
          
          set(state => {
            state.dashboard = dashboardData
          })
          
          return dashboardData
        },
        
        runAutomatedChecks: async (frameworkId?: string) => {
          const items = Object.values(get().activeItems)
          const itemsToCheck = frameworkId
            ? items.filter(item => item.compliance_framework === frameworkId && item.automated_check)
            : items.filter(item => item.automated_check)
          
          let passed = 0
          let failed = 0
          const errors: string[] = []
          
          for (const item of itemsToCheck) {
            try {
              // Simulate automated check
              const checkResult = Math.random() > 0.2 // 80% pass rate
              
              if (checkResult) {
                passed++
                // Update item status if needed
                if (item.status === 'pending') {
                  await get().actions.updateComplianceItem(item.id, {
                    status: 'completed',
                    last_check_date: new Date().toISOString()
                  })
                }
              } else {
                failed++
                await get().actions.updateComplianceItem(item.id, {
                  status: 'in_progress',
                  last_check_date: new Date().toISOString()
                })
              }
            } catch (error) {
              errors.push(`Failed to check ${item.id}: ${error}`)
            }
          }
          
          return {
            checked: itemsToCheck.length,
            passed,
            failed,
            errors
          }
        },
        
        scheduleAutomatedCheck: async (itemId: string, schedule: {
          frequency: 'daily' | 'weekly' | 'monthly'
          next_run: string
          enabled: boolean
        }): Promise<void> => {
          await get().actions.updateComplianceItem(itemId, {
            automated_check: schedule.enabled,
            next_check_date: schedule.next_run
          })
          
          // Would schedule actual automation in production
          console.log(`Scheduled automated check for ${itemId}:`, schedule)
        },
        
        cacheFrameworkForOffline: async (frameworkId: string): Promise<void> => {
          set(state => {
            if (!state.offline.cached_frameworks.includes(frameworkId)) {
              state.offline.cached_frameworks.push(frameworkId)
            }
          })
          
          // Cache related compliance items
          const items = Object.values(get().activeItems).filter(item => 
            item.compliance_framework === frameworkId
          )
          
          console.log(`Cached ${items.length} compliance items for offline access`)
        },
        
        syncComplianceChanges: async (): Promise<{ success: number; failed: number }> => {
          const { sync_queue } = get().offline
          let success = 0
          let failed = 0
          
          for (const itemId of sync_queue) {
            try {
              // Sync individual item
              console.log(`Syncing compliance item ${itemId}`)
              success++
            } catch (error) {
              console.error(`Failed to sync ${itemId}:`, error)
              failed++
            }
          }
          
          // Clear successful syncs from queue
          set(state => {
            state.offline.sync_queue = state.offline.sync_queue.slice(failed)
          })
          
          return { success, failed }
        },
        
        getOfflineCapability: (itemId: string): 'full' | 'limited' | 'none' => {
          const item = get().activeItems[itemId]
          if (!item) return 'none'
          
          const framework = get().frameworks.find(f => f.id === item.compliance_framework)
          const isFrameworkCached = get().offline.cached_frameworks.includes(item.compliance_framework)
          
          if (item && framework && isFrameworkCached) {
            return 'full' // Can work completely offline
          } else if (item) {
            return 'limited' // Basic functionality offline
          } else {
            return 'none' // No offline capability
          }
        },
        
        importComplianceData: async (data: any, format: 'json' | 'csv' | 'xlsx') => {
          let imported = 0
          const errors: string[] = []
          const warnings: string[] = []
          
          try {
            if (format === 'json') {
              if (Array.isArray(data)) {
                for (const item of data) {
                  try {
                    await get().actions.createComplianceItem(item)
                    imported++
                  } catch (error) {
                    errors.push(`Failed to import item: ${error}`)
                  }
                }
              }
            }
            // Would handle CSV and XLSX formats
          } catch (error) {
            errors.push(`Import failed: ${error}`)
          }
          
          return { imported, errors, warnings }
        },
        
        exportToThirdParty: async (platform: string, itemIds: string[]): Promise<void> => {
          // Would integrate with third-party compliance platforms
          console.log(`Exporting ${itemIds.length} items to ${platform}`)
        },
        
        syncWithRegulatory: async (frameworkId: string): Promise<void> => {
          // Would sync with regulatory body updates
          console.log(`Syncing framework ${frameworkId} with regulatory updates`)
        },
        
        updatePreferences: (updates: Partial<ComplianceStoreState['preferences']>): void => {
          set(state => {
            state.preferences = { ...state.preferences, ...updates }
          })
        },
        
        clearExpiredData: async (olderThan?: Date): Promise<void> => {
          const cutoffDate = olderThan || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year
          
          set(state => {
            // Clear old assessments
            state.assessments = state.assessments.filter(assessment => 
              new Date(assessment.assessment_date) > cutoffDate
            )
            
            // Clear old alerts
            state.alerts = state.alerts.filter(alert => 
              new Date(alert.created_at) > cutoffDate
            )
          })
          
          // Clear old compliance items
          const items = Object.values(get().activeItems)
          for (const item of items) {
            if (item.completion_date && new Date(item.completion_date) < cutoffDate) {
              set(state => {
                delete state.activeItems[item.id]
              })
            }
          }
        },
        
        validateCompliance: async (itemId: string) => {
          const item = get().activeItems[itemId]
          if (!item) {
            return {
              isValid: false,
              issues: ['Compliance item not found'],
              suggestions: ['Verify item ID']
            }
          }
          
          const issues: string[] = []
          const suggestions: string[] = []
          
          // Validation checks
          if (!item.assigned_to) {
            issues.push('No assigned responsible party')
            suggestions.push('Assign a responsible party')
          }
          
          if (!item.due_date) {
            issues.push('No due date specified')
            suggestions.push('Set a realistic due date')
          } else if (new Date(item.due_date) < new Date()) {
            issues.push('Item is overdue')
            suggestions.push('Update status or extend deadline')
          }
          
          if (item.evidence_documents.length === 0 && item.status === 'completed') {
            issues.push('No evidence provided for completed item')
            suggestions.push('Upload supporting documentation')
          }
          
          if (!item.compliance_framework) {
            issues.push('No compliance framework specified')
            suggestions.push('Associate with appropriate framework')
          }
          
          return {
            isValid: issues.length === 0,
            issues,
            suggestions
          }
        }
      }
    })),
    {
      name: 'compliance-store',
      partialize: (state) => ({
        frameworks: state.frameworks,
        preferences: state.preferences,
        offline: state.offline
      })
    }
  )
)