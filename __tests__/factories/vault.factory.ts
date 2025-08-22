import type { Vault, VaultInsert } from '@/types'

/**
 * Vault factory for creating test vaults (board meeting materials)
 */
export const VaultFactory = {
  /**
   * Create a basic vault
   */
  build(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    const timestamp = new Date().toISOString()
    const randomId = Math.random().toString(36).substr(2, 9)
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    
    return {
      id: `vault-${randomId}`,
      name: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()} Board Meeting`,
      description: `Quarterly board meeting materials and documentation - ${randomId}`,
      organization_id: organizationId,
      created_by: createdBy,
      status: 'draft',
      priority: 'medium',
      meeting_date: futureDate,
      agenda_items: [
        'Financial Performance Review',
        'Strategic Initiatives Update',
        'Risk Assessment',
        'New Business',
      ],
      location: 'Conference Room A / Virtual',
      meeting_type: 'quarterly_board',
      expected_duration: 180, // 3 hours in minutes
      preparation_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      access_level: 'confidential',
      tags: ['quarterly', 'board-meeting', 'governance'],
      metadata: {
        meeting_series: 'board_meetings',
        fiscal_quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        requires_approval: true,
        voting_items: [],
      },
      created_at: timestamp,
      updated_at: timestamp,
      version: 1,
      is_template: false,
      template_id: null,
      ...overrides,
    }
  },

  /**
   * Create an active vault (ready for meeting)
   */
  buildActive(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    return this.build(organizationId, createdBy, {
      status: 'active',
      priority: 'high',
      name: 'Active Board Meeting - Ready for Review',
      description: 'All materials are prepared and ready for board review',
      preparation_deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
      ...overrides,
    })
  },

  /**
   * Create a draft vault (in preparation)
   */
  buildDraft(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    return this.build(organizationId, createdBy, {
      status: 'draft',
      priority: 'medium',
      name: 'Draft Board Materials - In Preparation',
      description: 'Board meeting materials currently being prepared',
      agenda_items: ['TBD - Agenda being finalized'],
      ...overrides,
    })
  },

  /**
   * Create an archived vault (past meeting)
   */
  buildArchived(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    const pastDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ago
    
    return this.build(organizationId, createdBy, {
      status: 'archived',
      priority: 'low',
      name: 'Archived Q1 2024 Board Meeting',
      description: 'Completed board meeting materials and minutes',
      meeting_date: pastDate,
      archived_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      tags: ['archived', 'completed', 'q1-2024'],
      metadata: {
        meeting_series: 'board_meetings',
        fiscal_quarter: 'Q1',
        meeting_completed: true,
        minutes_approved: true,
        actions_tracked: true,
      },
      ...overrides,
    })
  },

  /**
   * Create an emergency meeting vault
   */
  buildEmergency(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    const urgentDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
    
    return this.build(organizationId, createdBy, {
      status: 'active',
      priority: 'critical',
      name: 'Emergency Board Meeting - Urgent Decision Required',
      description: 'Emergency board session to address critical business matters',
      meeting_date: urgentDate,
      preparation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      meeting_type: 'emergency',
      expected_duration: 90, // 1.5 hours
      access_level: 'highly_confidential',
      agenda_items: [
        'Crisis Management Response',
        'Emergency Decision Items',
        'Risk Mitigation Actions',
      ],
      tags: ['emergency', 'critical', 'urgent'],
      metadata: {
        meeting_series: 'emergency_meetings',
        requires_immediate_attention: true,
        requires_approval: true,
        escalation_reason: 'Critical business decision required',
      },
      ...overrides,
    })
  },

  /**
   * Create an annual meeting vault
   */
  buildAnnual(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    const annualDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 days from now
    
    return this.build(organizationId, createdBy, {
      status: 'draft',
      priority: 'high',
      name: 'Annual Shareholders Meeting 2024',
      description: 'Annual shareholders meeting with board elections and major decisions',
      meeting_date: annualDate,
      meeting_type: 'annual_meeting',
      expected_duration: 240, // 4 hours
      location: 'Corporate Headquarters Auditorium',
      agenda_items: [
        'Annual Report Presentation',
        'Financial Results Review',
        'Board Member Elections',
        'Executive Compensation',
        'Strategic Plan 2025',
        'Shareholder Proposals',
      ],
      tags: ['annual', 'shareholders', 'elections', 'strategic'],
      metadata: {
        meeting_series: 'annual_meetings',
        fiscal_year: new Date().getFullYear().toString(),
        requires_approval: true,
        public_notice_required: true,
        voting_items: ['board_elections', 'executive_compensation', 'strategic_plan'],
      },
      ...overrides,
    })
  },

  /**
   * Create a committee meeting vault
   */
  buildCommittee(organizationId: string, createdBy: string, committee: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    return this.build(organizationId, createdBy, {
      name: `${committee} Committee Meeting`,
      description: `${committee} committee session with focused agenda items`,
      meeting_type: 'committee',
      expected_duration: 120, // 2 hours
      access_level: 'restricted',
      agenda_items: [
        `${committee} Review`,
        'Committee Recommendations',
        'Action Items Follow-up',
      ],
      tags: ['committee', committee.toLowerCase().replace(' ', '-')],
      metadata: {
        meeting_series: 'committee_meetings',
        committee_name: committee,
        parent_board_meeting: null,
      },
      ...overrides,
    })
  },

  /**
   * Build multiple vaults with different statuses
   */
  buildList(organizationId: string, createdBy: string, count: number, overrides: Partial<VaultInsert> = {}): VaultInsert[] {
    return Array.from({ length: count }, (_, index) => {
      const statuses: Array<'draft' | 'active' | 'archived'> = ['draft', 'active', 'archived']
      const status = statuses[index % statuses.length]
      
      return this.build(organizationId, createdBy, {
        name: `Board Meeting ${index + 1}`,
        status,
        priority: index % 2 === 0 ? 'high' : 'medium',
        ...overrides,
      })
    })
  },

  /**
   * Build vaults for different meeting types
   */
  buildWithMeetingTypes(organizationId: string, createdBy: string): VaultInsert[] {
    const meetingTypes = [
      { type: 'quarterly_board', name: 'Quarterly Board Meeting' },
      { type: 'emergency', name: 'Emergency Session' },
      { type: 'annual_meeting', name: 'Annual Shareholders Meeting' },
      { type: 'committee', name: 'Audit Committee Meeting' },
      { type: 'strategic_planning', name: 'Strategic Planning Session' },
    ]
    
    return meetingTypes.map((meeting, index) => 
      this.build(organizationId, createdBy, {
        name: meeting.name,
        meeting_type: meeting.type,
        priority: meeting.type === 'emergency' ? 'critical' : 'medium',
        access_level: meeting.type === 'emergency' ? 'highly_confidential' : 'confidential',
      })
    )
  },

  /**
   * Create vault from template
   */
  buildFromTemplate(organizationId: string, createdBy: string, templateId: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    return this.build(organizationId, createdBy, {
      template_id: templateId,
      name: 'Meeting from Template',
      description: 'Board meeting created from predefined template',
      metadata: {
        ...this.build(organizationId, createdBy).metadata,
        created_from_template: templateId,
        template_version: '1.0',
      },
      ...overrides,
    })
  },

  /**
   * Create vault template
   */
  buildTemplate(organizationId: string, createdBy: string, overrides: Partial<VaultInsert> = {}): VaultInsert {
    return this.build(organizationId, createdBy, {
      name: 'Board Meeting Template',
      description: 'Template for creating new board meetings with standard agenda',
      is_template: true,
      status: 'draft',
      meeting_date: null, // Templates don't have dates
      agenda_items: [
        '[TEMPLATE] Call to Order',
        '[TEMPLATE] Approval of Previous Minutes',
        '[TEMPLATE] Financial Report',
        '[TEMPLATE] Committee Reports',
        '[TEMPLATE] New Business',
        '[TEMPLATE] Executive Session',
        '[TEMPLATE] Adjournment',
      ],
      tags: ['template', 'standard-agenda'],
      metadata: {
        template_category: 'board_meetings',
        template_version: '1.0',
        usage_count: 0,
      },
      ...overrides,
    })
  },
}

/**
 * Vault factory with asset relationships
 */
export const VaultFactoryWithAssets = {
  /**
   * Build vault with associated assets
   */
  buildWithAssets(
    organizationId: string, 
    createdBy: string, 
    assetIds: string[], 
    overrides: Partial<VaultInsert> = {}
  ): {
    vault: VaultInsert
    vaultAssets: Array<{
      vault_id: string
      asset_id: string
      added_by: string
      added_at: string
      asset_order: number
    }>
  } {
    const vault = VaultFactory.build(organizationId, createdBy, overrides)
    
    const vaultAssets = assetIds.map((assetId, index) => ({
      vault_id: vault.id!,
      asset_id: assetId,
      added_by: createdBy,
      added_at: new Date().toISOString(),
      asset_order: index + 1,
    }))

    return { vault, vaultAssets }
  },
}

/**
 * Pre-defined vault templates for common scenarios
 */
export const VaultTemplates = {
  // Standard quarterly board meeting
  quarterlyBoard: (organizationId: string, createdBy: string) => VaultFactory.build(organizationId, createdBy, {
    name: 'Q4 2024 Board Meeting',
    meeting_type: 'quarterly_board',
    expected_duration: 180,
    agenda_items: [
      'Call to Order & Attendance',
      'Approval of Previous Minutes',
      'CEO Report & Strategic Update',
      'CFO Report & Financial Performance',
      'Risk Management Review',
      'Committee Reports',
      'New Business & Resolutions',
      'Executive Session',
      'Next Meeting & Adjournment',
    ],
  }),

  // Audit committee meeting
  auditCommittee: (organizationId: string, createdBy: string) => VaultFactory.buildCommittee(organizationId, createdBy, 'Audit', {
    expected_duration: 90,
    access_level: 'restricted',
    agenda_items: [
      'Financial Statements Review',
      'Internal Audit Report',
      'External Auditor Communications',
      'Compliance Update',
      'Risk Assessment',
      'Recommendations to Board',
    ],
  }),

  // Strategic planning session
  strategicPlanning: (organizationId: string, createdBy: string) => VaultFactory.build(organizationId, createdBy, {
    name: '2025 Strategic Planning Retreat',
    meeting_type: 'strategic_planning',
    expected_duration: 480, // Full day - 8 hours
    location: 'Executive Retreat Center',
    priority: 'high',
    agenda_items: [
      'Market Analysis & Competitive Landscape',
      '2024 Performance Review',
      'Strategic Objectives for 2025',
      'Budget Planning & Resource Allocation',
      'Technology Roadmap',
      'Organizational Development',
      'Risk Management Strategy',
      'Implementation Timeline',
    ],
    tags: ['strategic', 'planning', 'retreat', '2025'],
  }),

  // Crisis management session
  crisisManagement: (organizationId: string, createdBy: string) => VaultFactory.buildEmergency(organizationId, createdBy, {
    name: 'Crisis Response Emergency Session',
    agenda_items: [
      'Situation Assessment',
      'Immediate Response Actions',
      'Stakeholder Communications',
      'Financial Impact Analysis',
      'Legal & Regulatory Considerations',
      'Recovery Plan Development',
    ],
    access_level: 'highly_confidential',
    tags: ['crisis', 'emergency', 'response'],
  }),
}