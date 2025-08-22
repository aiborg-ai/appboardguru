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
      summary: 'This document contains important information for board review and decision making.',
      watermark_applied: true,
      ...overrides,
    }
  },

  /**
   * Create a financial report
   */
  buildFinancialReport(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} 2024 Financial Report`,
      description: 'Comprehensive quarterly financial performance report',
      file_name: `financial-report-q${Math.ceil((new Date().getMonth() + 1) / 3)}-2024.pdf`,
      file_path: `assets/${organizationId}/financial-report-q${Math.ceil((new Date().getMonth() + 1) / 3)}-2024.pdf`,
      file_type: 'application/pdf',
      file_size: 3200000, // 3.2MB
      ...overrides,
    })
  },

  /**
   * Create a Word document
   */
  buildWordDoc(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Strategic Planning Document',
      description: 'Strategic planning document outlining goals and initiatives for the next fiscal year',
      file_name: 'strategic-plan-2024.docx',
      file_path: `assets/${organizationId}/strategic-plan-2024.docx`,
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 512000, // 512KB
      ...overrides,
    })
  },

  /**
   * Create a presentation
   */
  buildPresentation(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Board Meeting Presentation',
      description: 'Quarterly board meeting presentation covering key performance indicators and strategic updates',
      file_name: 'board-presentation-q1-2024.pptx',
      file_path: `assets/${organizationId}/board-presentation-q1-2024.pptx`,
      file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 4800000, // 4.8MB
      ...overrides,
    })
  },

  /**
   * Create a spreadsheet
   */
  buildSpreadsheet(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Financial Model & Analysis',
      description: 'Detailed financial modeling spreadsheet with projections and analysis for strategic decision making',
      file_name: 'financial-model-2024.xlsx',
      file_path: `assets/${organizationId}/financial-model-2024.xlsx`,
      file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 1024000, // 1MB
      ...overrides,
    })
  },

  /**
   * Create processing asset
   */
  buildProcessing(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Processing Document',
      description: 'Document currently being processed and analyzed',
      status: 'processing',
      summary: null,
      ...overrides,
    })
  },

  /**
   * Create failed asset
   */
  buildFailed(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Failed Processing Document',
      description: 'Document that failed during processing',
      status: 'failed',
      summary: null,
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
      status: 'ready', // 'archived' is not a valid status, using 'ready' instead
      ...overrides,
    })
  },

  /**
   * Create executive compensation report
   */
  buildExecutiveCompensation(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Executive Compensation Report 2024',
      description: 'Annual executive compensation analysis and benchmarking report',
      file_name: 'executive-compensation-2024.pdf',
      file_path: `assets/${organizationId}/executive-compensation-2024.pdf`,
      file_size: 2560000, // 2.56MB
      ...overrides,
    })
  },

  /**
   * Create meeting minutes
   */
  buildMeetingMinutes(organizationId: string, uploadedBy: string, overrides: Partial<AssetInsert> = {}): AssetInsert {
    return this.build(organizationId, uploadedBy, {
      title: 'Board Meeting Minutes - March 2024',
      description: 'Official minutes from the March 2024 board meeting',
      file_name: 'board-minutes-march-2024.pdf',
      file_path: `assets/${organizationId}/board-minutes-march-2024.pdf`,
      file_size: 768000, // 768KB
      ...overrides,
    })
  },

  /**
   * Build multiple assets
   */
  buildMany(organizationId: string, uploadedBy: string, count: number, overrides: Partial<AssetInsert> = {}): AssetInsert[] {
    const fileTypes = [
      { type: 'application/pdf', method: 'buildPDF' },
      { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', method: 'buildWordDoc' },
      { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', method: 'buildPresentation' },
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', method: 'buildSpreadsheet' },
    ]
    
    return Array.from({ length: count }, (_, index) => {
      const fileTypeConfig = fileTypes[index % fileTypes.length]!
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
    const statuses: ('processing' | 'ready' | 'failed')[] = ['processing', 'ready', 'failed']
    
    return statuses.map((status, index) => 
      this.build(organizationId, uploadedBy, {
        title: `Asset with ${status} status`,
        status,
        file_name: `${status}-asset-${index + 1}.pdf`,
        file_path: `assets/${organizationId}/${status}-asset-${index + 1}.pdf`,
      })
    )
  },

  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt',
      'image/jpeg': '.jpg',
      'image/png': '.png',
    }
    return extensions[mimeType] || '.pdf'
  }
}

// Predefined scenarios for common use cases
export const AssetScenarios = {
  // Financial quarterly report
  financialReport: {
    title: 'Q1 2024 Financial Report',
    description: 'Comprehensive quarterly financial performance analysis including revenue, expenses, and key metrics',
    file_name: 'q1-2024-financial-report.pdf',
    file_type: 'application/pdf',
    file_size: 2048000,
    summary: 'Strong Q1 performance with 15% revenue growth year-over-year',
  },

  // Meeting minutes
  meetingMinutes: {
    title: 'Board Meeting Minutes - March 15, 2024',
    description: 'Official minutes from the quarterly board meeting covering strategic decisions and governance matters',
    file_name: 'board-minutes-2024-03-15.pdf',
    file_type: 'application/pdf',
    file_size: 512000,
    summary: 'Board approved annual budget and discussed expansion strategy',
  },

  // Strategic planning document
  strategicPlan: {
    title: '2024-2026 Strategic Plan',
    description: 'Three-year strategic plan outlining organizational goals, initiatives, and resource allocation',
    file_name: 'strategic-plan-2024-2026.docx',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 1024000,
    summary: 'Focus on digital transformation and market expansion over next three years',
  },

  // Risk assessment report
  riskAssessment: {
    title: 'Enterprise Risk Assessment 2024',
    description: 'Comprehensive risk analysis covering operational, financial, and strategic risks with mitigation strategies',
    file_name: 'risk-assessment-2024.pdf',
    file_type: 'application/pdf',
    file_size: 1536000,
    summary: 'Identified key risks in cybersecurity and supply chain management with recommended actions',
  }
}

export default AssetFactory