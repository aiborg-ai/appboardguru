import type { Asset, AssetInsert } from '@/types'

/**
 * Asset factory for creating test assets (documents, files)
 */
export const AssetFactory = {
  /**
   * Create a basic asset
   */
  build(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    const timestamp = new Date().toISOString()
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return {
      id: `asset-${randomId}`,
      title: `Board Document ${randomId}`,
      description: `Important board document for review and discussion - ${randomId}`,
      file_path: `assets/${organizationId}/board-document-${randomId}.pdf`,
      file_name: `board-document-${randomId}.pdf`,
      file_type: 'application/pdf',
      file_size: 2048000, // 2MB
      uploaded_by: uploadedBy,
      organization_id: organizationId,
      status: 'ready',
      visibility: 'organization',
      access_level: 'confidential',
      summary: 'This document contains important information for board review and decision making.',
      key_points: [
        'Financial performance metrics',
        'Strategic recommendations',
        'Risk assessment findings',
      ],
      tags: ['board', 'quarterly', 'review'],
      version: '1.0',
      document_category: 'board_materials',
      retention_policy: 'retain_7_years',
      watermark_applied: true,
      encryption_status: 'encrypted',
      download_count: 0,
      last_accessed_at: null,
      checksum: `sha256-${randomId}`,
      metadata: {
        author: 'Board Secretary',
        creation_software: 'Microsoft Word',
        page_count: 15,
        word_count: 3500,
        contains_financial_data: true,
        requires_approval: false,
      },
      created_at: timestamp,
      updated_at: timestamp,
      indexed_at: timestamp,
      processing_completed_at: timestamp,
      ...overrides,
    }
  },

  /**
   * Create a PDF document
   */
  buildPDF(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(organizationId, uploadedBy, {
      title: `Financial Report Q${Math.ceil((new Date().getMonth() + 1) / 3)} 2024`,
      file_name: `financial-report-q${Math.ceil((new Date().getMonth() + 1) / 3)}-2024.pdf`,
      file_path: `assets/${organizationId}/financial-report-q${Math.ceil((new Date().getMonth() + 1) / 3)}-2024.pdf`,
      file_type: 'application/pdf',
      file_size: 3200000, // 3.2MB
      description: 'Comprehensive quarterly financial performance report',
      document_category: 'financial_reports',
      tags: ['financial', 'quarterly', 'performance', '2024'],
      metadata: {
        author: 'CFO Office',
        page_count: 24,
        contains_financial_data: true,
        fiscal_quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        fiscal_year: '2024',
      },
      ...overrides,
    })
  },

  /**
   * Create a Word document
   */
  buildWordDoc(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(organizationId, uploadedBy, {
      title: `Strategic Plan Draft ${randomId}`,
      file_name: `strategic-plan-draft-${randomId}.docx`,
      file_path: `assets/${organizationId}/strategic-plan-draft-${randomId}.docx`,
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 1800000, // 1.8MB
      description: 'Draft strategic plan for board review and approval',
      document_category: 'strategic_planning',
      tags: ['strategic', 'planning', 'draft'],
      metadata: {
        author: 'Strategy Team',
        creation_software: 'Microsoft Word',
        word_count: 8500,
        contains_financial_data: false,
        requires_approval: true,
      },
      ...overrides,
    })
  },

  /**
   * Create a PowerPoint presentation
   */
  buildPresentation(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(organizationId, uploadedBy, {
      title: `Board Presentation ${randomId}`,
      file_name: `board-presentation-${randomId}.pptx`,
      file_path: `assets/${organizationId}/board-presentation-${randomId}.pptx`,
      file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 25600000, // 25.6MB (large due to images/charts)
      description: 'Executive presentation for board meeting',
      document_category: 'presentations',
      tags: ['presentation', 'board', 'executive'],
      metadata: {
        author: 'Executive Team',
        creation_software: 'Microsoft PowerPoint',
        slide_count: 35,
        contains_financial_data: true,
        presentation_duration_minutes: 45,
      },
      ...overrides,
    })
  },

  /**
   * Create an Excel spreadsheet
   */
  buildSpreadsheet(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return this.build(organizationId, uploadedBy, {
      title: `Financial Model ${randomId}`,
      file_name: `financial-model-${randomId}.xlsx`,
      file_path: `assets/${organizationId}/financial-model-${randomId}.xlsx`,
      file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 5400000, // 5.4MB
      description: 'Detailed financial modeling and projections',
      document_category: 'financial_models',
      access_level: 'highly_confidential',
      tags: ['financial', 'model', 'projections'],
      metadata: {
        author: 'Finance Team',
        creation_software: 'Microsoft Excel',
        sheet_count: 12,
        contains_financial_data: true,
        has_macros: true,
        calculation_complexity: 'high',
      },
      ...overrides,
    })
  },

  /**
   * Create an asset that's still processing
   */
  buildProcessing(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Processing Document',
      status: 'processing',
      summary: null,
      key_points: [],
      indexed_at: null,
      processing_completed_at: null,
      watermark_applied: false,
      encryption_status: 'pending',
      description: 'Document is currently being processed and analyzed',
      ...overrides,
    })
  },

  /**
   * Create a failed asset
   */
  buildFailed(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Failed Upload Document',
      status: 'failed',
      summary: null,
      key_points: [],
      indexed_at: null,
      processing_completed_at: null,
      watermark_applied: false,
      encryption_status: 'failed',
      description: 'Document processing failed due to technical issues',
      metadata: {
        ...this.build(organizationId, uploadedBy).metadata,
        error_code: 'PROCESSING_FAILED',
        error_message: 'Unable to parse document content',
        retry_count: 3,
      },
      ...overrides,
    })
  },

  /**
   * Create a highly sensitive asset
   */
  buildHighlySensitive(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Executive Compensation Analysis',
      description: 'Confidential analysis of executive compensation packages',
      visibility: 'restricted',
      access_level: 'highly_confidential',
      document_category: 'executive_compensation',
      retention_policy: 'retain_indefinite',
      tags: ['executive', 'compensation', 'confidential', 'board-only'],
      metadata: {
        ...this.build(organizationId, uploadedBy).metadata,
        contains_pii: true,
        requires_special_handling: true,
        access_audit_required: true,
        legal_hold: false,
      },
      ...overrides,
    })
  },

  /**
   * Create archived asset
   */
  buildArchived(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Archived Board Minutes - Q1 2023',
      description: 'Historical board meeting minutes from Q1 2023',
      status: 'archived',
      document_category: 'meeting_minutes',
      retention_policy: 'retain_7_years',
      archived_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
      tags: ['archived', 'minutes', '2023', 'q1'],
      ...overrides,
    })
  },

  /**
   * Build multiple assets with different types
   */
  buildList(organizationId: string, uploadedBy: string, count: number, overrides: Partial<AssetInsert> = {}): AssetInsert[] {
    const fileTypes = [
      { type: 'application/pdf', method: 'buildPDF' },
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', method: 'buildWordDoc' },
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', method: 'buildPresentation' },
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', method: 'buildSpreadsheet' },
    ]
    
    return Array.from({ length: count }, (_, index) => {
      const fileTypeConfig = fileTypes[index % fileTypes.length]
      return this.build(organizationId, uploadedBy, {
        title: `Asset ${index + 1}`,
        file_type: fileTypeConfig.type,
        file_name: `asset-${index + 1}${this.getFileExtension(fileTypeConfig.type)}`,
        ...overrides,
      })
    })
  },

  /**
   * Build assets with different statuses
   */
  buildWithStatuses(organizationId: string, uploadedBy: string): AssetInsert[] {
    return [
      this.build(organizationId, uploadedBy, { status: 'ready', title: 'Ready Asset' }),
      this.buildProcessing(organizationId, uploadedBy, { title: 'Processing Asset' }),
      this.buildFailed(organizationId, uploadedBy, { title: 'Failed Asset' }),
      this.buildArchived(organizationId, uploadedBy, { title: 'Archived Asset' }),
    ]
  },

  /**
   * Build assets with different access levels
   */
  buildWithAccessLevels(organizationId: string, uploadedBy: string): AssetInsert[] {
    return [
      this.build(organizationId, uploadedBy, { 
        access_level: 'public', 
        title: 'Public Document',
        visibility: 'public'
      }),
      this.build(organizationId, uploadedBy, { 
        access_level: 'internal', 
        title: 'Internal Document',
        visibility: 'organization' 
      }),
      this.build(organizationId, uploadedBy, { 
        access_level: 'confidential', 
        title: 'Confidential Document',
        visibility: 'restricted' 
      }),
      this.buildHighlySensitive(organizationId, uploadedBy, { 
        title: 'Highly Sensitive Document' 
      }),
    ]
  },

  /**
   * Helper to get file extension from MIME type
   */
  getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    }
    
    return extensions[mimeType] || '.bin'
  },
}

/**
 * Asset factory with relationships
 */
export const AssetFactoryWithRelations = {
  /**
   * Build asset with annotations
   */
  buildWithAnnotations(
    organizationId: string, 
    uploadedBy: string, 
    annotationCount: number = 3,
    overrides: Partial<AssetInsert> = {}
  ): {
    asset: AssetInsert
    annotations: Array<{
      id: string
      asset_id: string
      page_number: number
      x_coordinate: number
      y_coordinate: number
      width: number
      height: number
      content: string
      created_by: string
      created_at: string
      annotation_type: string
    }>
  } {
    const asset = AssetFactory.build(organizationId, uploadedBy, overrides)
    
    const annotations = Array.from({ length: annotationCount }, (_, index) => ({
      id: `annotation-${Date.now()}-${index}`,
      asset_id: asset.id!,
      page_number: Math.floor(index / 2) + 1, // Distribute across pages
      x_coordinate: 100 + (index * 50),
      y_coordinate: 200 + (index * 30),
      width: 150,
      height: 25,
      content: `Annotation ${index + 1}: Important note for review`,
      created_by: uploadedBy,
      created_at: new Date().toISOString(),
      annotation_type: index % 2 === 0 ? 'highlight' : 'comment',
    }))

    return { asset, annotations }
  },

  /**
   * Build asset with collaboration history
   */
  buildWithCollaboration(
    organizationId: string, 
    uploadedBy: string, 
    collaboratorIds: string[],
    overrides: Partial<AssetInsert> = {}
  ): {
    asset: AssetInsert
    collaborations: Array<{
      asset_id: string
      user_id: string
      permission_level: string
      added_by: string
      added_at: string
    }>
  } {
    const asset = AssetFactory.build(organizationId, uploadedBy, overrides)
    
    const collaborations = collaboratorIds.map((userId, index) => ({
      asset_id: asset.id!,
      user_id: userId,
      permission_level: index === 0 ? 'edit' : 'view',
      added_by: uploadedBy,
      added_at: new Date().toISOString(),
    }))

    return { asset, collaborations }
  },
}

/**
 * Pre-defined asset templates
 */
export const AssetTemplates = {
  // Financial quarterly report
  quarterlyFinancialReport: (organizationId: string, uploadedBy: string) => AssetFactory.buildPDF(organizationId, uploadedBy, {
    title: 'Q4 2024 Financial Performance Report',
    description: 'Comprehensive quarterly financial analysis with key metrics and insights',
    document_category: 'financial_reports',
    tags: ['financial', 'quarterly', 'performance', 'metrics'],
    metadata: {
      author: 'CFO Office',
      page_count: 28,
      contains_financial_data: true,
      fiscal_quarter: 'Q4',
      fiscal_year: '2024',
      key_metrics: ['revenue', 'profit', 'cash_flow', 'expenses'],
    },
  }),

  // Board meeting minutes
  boardMeetingMinutes: (organizationId: string, uploadedBy: string) => AssetFactory.buildWordDoc(organizationId, uploadedBy, {
    title: 'Board Meeting Minutes - December 2024',
    description: 'Official minutes from the December board meeting including decisions and action items',
    document_category: 'meeting_minutes',
    access_level: 'confidential',
    tags: ['minutes', 'board', 'december', '2024'],
    metadata: {
      author: 'Board Secretary',
      meeting_date: '2024-12-15',
      attendees_count: 8,
      resolutions_count: 3,
      action_items_count: 5,
    },
  }),

  // Strategic plan
  strategicPlan: (organizationId: string, uploadedBy: string) => AssetFactory.buildWordDoc(organizationId, uploadedBy, {
    title: '2025-2027 Strategic Plan',
    description: 'Three-year strategic plan outlining vision, objectives, and key initiatives',
    document_category: 'strategic_planning',
    access_level: 'confidential',
    tags: ['strategic', 'plan', '2025', '2027', 'vision'],
    metadata: {
      author: 'Strategy Committee',
      planning_horizon_years: 3,
      strategic_pillars: 4,
      key_initiatives: 12,
      requires_board_approval: true,
    },
  }),

  // Risk assessment report
  riskAssessment: (organizationId: string, uploadedBy: string) => AssetFactory.buildPDF(organizationId, uploadedBy, {
    title: 'Enterprise Risk Assessment 2024',
    description: 'Comprehensive risk analysis and mitigation strategies for all business areas',
    document_category: 'risk_management',
    access_level: 'highly_confidential',
    tags: ['risk', 'assessment', 'mitigation', 'enterprise'],
    metadata: {
      author: 'Risk Management Team',
      risk_categories_assessed: 8,
      high_priority_risks: 3,
      mitigation_strategies: 15,
      last_assessment_date: '2023-12-01',
    },
  }),
}