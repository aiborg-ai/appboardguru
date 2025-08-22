/**
 * Compliance factory for creating test compliance-related data
 */
export const ComplianceFactory = {
  /**
   * Create a compliance requirement
   */
  buildRequirement(organizationId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `compliance-req-${randomId}`,
      organization_id: organizationId,
      title: 'Board Meeting Frequency Compliance',
      description: 'Ensure board meetings are held at least quarterly as required by governance standards',
      requirement_type: 'governance',
      regulatory_framework: 'sox',
      compliance_category: 'board_governance',
      priority: 'high',
      status: 'active',
      due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      created_at: timestamp,
      updated_at: timestamp,
      assigned_to: null,
      evidence_required: true,
      auto_check_enabled: true,
      check_frequency: 'monthly',
      last_check_at: null,
      next_check_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        regulation_section: '404',
        penalty_amount: 50000,
        audit_trail_required: true,
        external_validation: false,
      },
      ...overrides,
    }
  },

  /**
   * Create a compliance workflow
   */
  buildWorkflow(organizationId: string, requirementId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `compliance-workflow-${randomId}`,
      organization_id: organizationId,
      requirement_id: requirementId,
      name: 'Board Meeting Documentation Workflow',
      description: 'Workflow to ensure proper documentation of board meetings',
      status: 'active',
      current_step: 1,
      total_steps: 4,
      steps: [
        {
          step: 1,
          title: 'Schedule Meeting',
          description: 'Create board meeting calendar entry',
          status: 'completed',
          assigned_to: 'board-secretary',
          due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          step: 2,
          title: 'Prepare Materials',
          description: 'Gather and upload all meeting materials',
          status: 'in_progress',
          assigned_to: 'board-secretary',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
        },
        {
          step: 3,
          title: 'Conduct Meeting',
          description: 'Hold the board meeting',
          status: 'pending',
          assigned_to: 'board-chair',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
        },
        {
          step: 4,
          title: 'File Minutes',
          description: 'Prepare and file meeting minutes',
          status: 'pending',
          assigned_to: 'board-secretary',
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
        },
      ],
      created_at: timestamp,
      updated_at: timestamp,
      started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expected_completion: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      actual_completion: null,
      ...overrides,
    }
  },

  /**
   * Create a compliance check result
   */
  buildCheckResult(organizationId: string, requirementId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `compliance-check-${randomId}`,
      organization_id: organizationId,
      requirement_id: requirementId,
      check_type: 'automated',
      status: 'passed',
      score: 95,
      max_score: 100,
      checked_at: timestamp,
      checked_by: 'system',
      findings: [
        {
          category: 'documentation',
          status: 'passed',
          message: 'All required documents are present',
          evidence_count: 8,
        },
        {
          category: 'timing',
          status: 'passed',
          message: 'Meeting frequency meets requirements',
          last_meeting_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      recommendations: [
        'Consider implementing automated reminders for upcoming deadlines',
        'Review board member attendance rates',
      ],
      evidence_links: [
        '/documents/board-minutes-q4-2024.pdf',
        '/documents/attendance-records-2024.xlsx',
      ],
      next_check_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        check_duration_seconds: 15,
        automated_score: 95,
        manual_review_required: false,
      },
      ...overrides,
    }
  },

  /**
   * Create a failed compliance check
   */
  buildFailedCheck(organizationId: string, requirementId: string, overrides: any = {}): any {
    return this.buildCheckResult(organizationId, requirementId, {
      status: 'failed',
      score: 65,
      findings: [
        {
          category: 'documentation',
          status: 'failed',
          message: 'Missing board minutes for Q3 2024',
          evidence_count: 2,
          missing_items: ['q3-board-minutes.pdf', 'q3-action-items.pdf'],
        },
        {
          category: 'timing',
          status: 'warning',
          message: 'Board meeting frequency below recommended level',
          last_meeting_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          days_since_last_meeting: 120,
        },
      ],
      recommendations: [
        'URGENT: Upload missing Q3 2024 board meeting minutes',
        'Schedule next board meeting within 30 days',
        'Review board meeting calendar for compliance',
      ],
      ...overrides,
    })
  },

  /**
   * Create compliance notification/alert
   */
  buildAlert(organizationId: string, requirementId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `compliance-alert-${randomId}`,
      organization_id: organizationId,
      requirement_id: requirementId,
      alert_type: 'deadline_approaching',
      severity: 'high',
      title: 'Compliance Deadline Approaching',
      message: 'Board meeting documentation deadline is in 7 days',
      status: 'active',
      acknowledged: false,
      acknowledged_by: null,
      acknowledged_at: null,
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      created_at: timestamp,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      action_required: true,
      action_url: '/compliance/requirements/board-meeting-docs',
      escalation_level: 1,
      max_escalation_level: 3,
      next_escalation_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      recipients: ['board-secretary@example.com', 'compliance-officer@example.com'],
      metadata: {
        days_until_deadline: 7,
        requirement_type: 'governance',
        auto_generated: true,
      },
      ...overrides,
    }
  },

  /**
   * Create compliance training record
   */
  buildTrainingRecord(userId: string, organizationId: string, overrides: any = {}): any {
    const randomId = Math.random().toString(36).substr(2, 9)
    const timestamp = new Date().toISOString()
    
    return {
      id: `training-record-${randomId}`,
      user_id: userId,
      organization_id: organizationId,
      training_type: 'annual_compliance',
      training_title: 'Annual Board Governance Training 2024',
      status: 'completed',
      started_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(), // 2 hours ago
      completed_at: timestamp,
      score: 92,
      passing_score: 80,
      duration_minutes: 90,
      certificate_issued: true,
      certificate_url: `/certificates/compliance-${userId}-2024.pdf`,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      created_at: timestamp,
      updated_at: timestamp,
      metadata: {
        training_version: '2024.1',
        completion_attempts: 1,
        modules_completed: 8,
        total_modules: 8,
      },
      ...overrides,
    }
  },

  /**
   * Create multiple compliance requirements for organization
   */
  buildRequirementSet(organizationId: string, framework: string = 'sox'): any[] {
    const requirements = [
      {
        title: 'Board Meeting Frequency',
        description: 'Hold board meetings at least quarterly',
        requirement_type: 'governance',
        priority: 'high',
      },
      {
        title: 'Financial Reporting',
        description: 'Prepare and review quarterly financial reports',
        requirement_type: 'financial',
        priority: 'critical',
      },
      {
        title: 'Risk Assessment',
        description: 'Conduct annual enterprise risk assessment',
        requirement_type: 'risk_management',
        priority: 'high',
      },
      {
        title: 'Code of Conduct',
        description: 'Annual acknowledgment of code of conduct by all board members',
        requirement_type: 'ethics',
        priority: 'medium',
      },
      {
        title: 'Conflict of Interest',
        description: 'Annual disclosure of potential conflicts of interest',
        requirement_type: 'ethics',
        priority: 'high',
      },
    ]
    
    return requirements.map(req =>
      this.buildRequirement(organizationId, {
        ...req,
        regulatory_framework: framework,
      })
    )
  },

  /**
   * Create compliance dashboard summary
   */
  buildDashboardSummary(organizationId: string): any {
    return {
      organization_id: organizationId,
      overall_compliance_score: 87,
      total_requirements: 15,
      compliant_requirements: 13,
      non_compliant_requirements: 2,
      requirements_due_soon: 3,
      active_alerts: 2,
      overdue_items: 1,
      last_updated: new Date().toISOString(),
      frameworks: {
        sox: { score: 92, requirements: 8, status: 'compliant' },
        gdpr: { score: 85, requirements: 4, status: 'mostly_compliant' },
        hipaa: { score: 78, requirements: 3, status: 'needs_attention' },
      },
      recent_activity: [
        {
          type: 'check_completed',
          requirement: 'Board Meeting Frequency',
          status: 'passed',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          type: 'workflow_started',
          requirement: 'Financial Reporting Q4',
          status: 'in_progress',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    }
  },
}

/**
 * Pre-defined compliance templates
 */
export const ComplianceTemplates = {
  // SOX compliance for board governance
  soxBoardCompliance: (organizationId: string) => ({
    requirements: ComplianceFactory.buildRequirementSet(organizationId, 'sox'),
    workflows: [
      ComplianceFactory.buildWorkflow(organizationId, 'req-board-meetings', {
        name: 'Quarterly Board Meeting Compliance',
        description: 'Ensure quarterly board meetings meet SOX requirements',
      }),
    ],
  }),

  // GDPR compliance for data handling
  gdprCompliance: (organizationId: string) => ComplianceFactory.buildRequirement(organizationId, {
    title: 'Data Protection Impact Assessment',
    description: 'Regular assessment of data processing activities for GDPR compliance',
    regulatory_framework: 'gdpr',
    requirement_type: 'data_protection',
    priority: 'critical',
    metadata: {
      regulation_section: 'Article 35',
      data_categories: ['personal_data', 'sensitive_data'],
      processing_activities: 5,
    },
  }),

  // Annual compliance cycle
  annualComplianceCycle: (organizationId: string) => [
    ComplianceFactory.buildRequirement(organizationId, {
      title: 'Annual Code of Conduct Acknowledgment',
      due_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      check_frequency: 'annually',
    }),
    ComplianceFactory.buildTrainingRecord('user-1', organizationId, {
      training_type: 'annual_ethics',
      training_title: 'Annual Ethics Training 2024',
    }),
  ],
}

export default ComplianceFactory