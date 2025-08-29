/**
 * Demo Data Provider
 * Provides comprehensive sample data for demo mode
 */

import { Result, success } from '../repositories/result'

// Demo Organizations
export const demoOrganizations = [
  {
    id: 'org-001',
    name: 'TechCorp Solutions',
    slug: 'techcorp',
    industry: 'Technology',
    size: 'enterprise',
    organization_size: 'enterprise',
    logo_url: '/demo/logos/techcorp.png',
    description: 'Leading technology solutions provider',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-12-01T10:00:00Z',
    is_active: true,
    website: 'https://techcorp.example.com',
    // Additional fields for organization listing
    userRole: 'owner',
    membershipStatus: 'active',
    status: 'active',
    memberCount: 25,
    role: 'owner',
    settings: {
      board_pack_auto_archive_days: 365,
      invitation_expires_hours: 72,
      max_members: 100,
      enable_audit_logs: true,
      require_2fa: false,
      allowed_file_types: ['pdf', 'docx', 'pptx', 'xlsx'],
    },
    compliance_settings: {
      sox_compliant: true,
      gdpr_compliant: true,
      hipaa_compliant: false
    },
    billing_settings: {
      plan: 'enterprise',
      billing_cycle: 'annual',
      next_billing_date: '2025-01-15'
    }
  },
  {
    id: 'org-002',
    name: 'Global Finance Group',
    slug: 'global-finance',
    industry: 'Financial Services',
    size: 'enterprise',
    organization_size: 'enterprise',
    logo_url: '/demo/logos/finance.png',
    description: 'International financial services corporation',
    created_at: '2024-01-10T10:00:00Z',
    updated_at: '2024-11-25T10:00:00Z',
    is_active: true,
    website: 'https://globalfinance.example.com',
    // Additional fields for organization listing
    userRole: 'owner',
    membershipStatus: 'active',
    status: 'active',
    memberCount: 18,
    role: 'owner',
    settings: {
      board_pack_auto_archive_days: 180,
      invitation_expires_hours: 48,
      max_members: 50,
      enable_audit_logs: true,
      require_2fa: true,
      allowed_file_types: ['pdf', 'docx', 'xlsx'],
    },
    compliance_settings: {
      sox_compliant: true,
      gdpr_compliant: true,
      hipaa_compliant: false
    },
    billing_settings: {
      plan: 'enterprise',
      billing_cycle: 'annual',
      next_billing_date: '2025-01-10'
    }
  },
  {
    id: 'org-003',
    name: 'HealthCare Innovations',
    slug: 'healthcare-inn',
    industry: 'Healthcare',
    size: 'large',
    organization_size: 'large',
    logo_url: '/demo/logos/healthcare.png',
    description: 'Pioneering healthcare technology and services',
    created_at: '2024-01-05T10:00:00Z',
    updated_at: '2024-11-20T10:00:00Z',
    is_active: true,
    website: 'https://healthcare-inn.example.com',
    // Additional fields for organization listing
    userRole: 'owner',
    membershipStatus: 'active',
    status: 'active',
    memberCount: 12,
    role: 'owner',
    settings: {
      board_pack_auto_archive_days: 90,
      invitation_expires_hours: 24,
      max_members: 30,
      enable_audit_logs: true,
      require_2fa: true,
      allowed_file_types: ['pdf', 'docx'],
    },
    compliance_settings: {
      sox_compliant: false,
      gdpr_compliant: true,
      hipaa_compliant: true
    },
    billing_settings: {
      plan: 'professional',
      billing_cycle: 'monthly',
      next_billing_date: '2025-01-05'
    }
  }
]

// Demo Board Packs with AI Summaries
export const demoBoardPacks = [
  {
    id: 'pack-001',
    title: 'Q4 2024 Financial Report',
    organization_id: 'org-001',
    status: 'processed',
    file_size: 15728640, // 15MB
    created_at: '2024-12-15T14:30:00Z',
    processed_at: '2024-12-15T14:35:00Z',
    summary: 'Strong Q4 performance with 23% YoY revenue growth. Key highlights include successful product launches in Asian markets, improved operational efficiency resulting in 15% margin expansion, and strategic acquisition of CloudTech for $450M.',
    ai_insights: {
      risks: [
        'Supply chain dependencies in Southeast Asia',
        'Increasing competition in cloud services segment',
        'Currency fluctuation exposure (15% of revenue)'
      ],
      opportunities: [
        'Untapped market potential in Latin America',
        'AI integration could reduce operational costs by 20%',
        'Strategic partnership opportunities with major enterprises'
      ],
      action_items: [
        'Review and approve Q1 2025 budget allocation',
        'Discuss expansion strategy for Latin American markets',
        'Evaluate cybersecurity infrastructure upgrade proposal'
      ],
      sentiment: 'positive',
      confidence_score: 0.92
    },
    documents: [
      {
        id: 'doc-001',
        name: 'Financial_Statements_Q4_2024.pdf',
        type: 'financial_report',
        pages: 45,
        key_topics: ['Revenue', 'EBITDA', 'Cash Flow', 'Market Share']
      },
      {
        id: 'doc-002',
        name: 'Management_Discussion_Analysis.pdf',
        type: 'analysis',
        pages: 28,
        key_topics: ['Strategy', 'Market Conditions', 'Future Outlook']
      }
    ]
  },
  {
    id: 'pack-002',
    title: 'Annual Strategy Review 2025',
    organization_id: 'org-001',
    status: 'processed',
    file_size: 20971520, // 20MB
    created_at: '2024-12-10T09:00:00Z',
    processed_at: '2024-12-10T09:08:00Z',
    summary: 'Comprehensive strategic plan focusing on digital transformation, market expansion, and sustainability initiatives. Projected 30% revenue growth through new product lines and geographic expansion.',
    ai_insights: {
      risks: [
        'Aggressive growth targets may strain resources',
        'Regulatory changes in key markets',
        'Talent acquisition challenges in competitive market'
      ],
      opportunities: [
        'First-mover advantage in emerging technologies',
        'ESG initiatives attracting institutional investors',
        'Platform consolidation reducing operational complexity'
      ],
      action_items: [
        'Approve $50M innovation fund allocation',
        'Review and finalize succession planning',
        'Establish ESG committee and charter'
      ],
      sentiment: 'optimistic',
      confidence_score: 0.88
    }
  },
  {
    id: 'pack-003',
    title: 'Risk Assessment & Compliance Report',
    organization_id: 'org-001',
    status: 'processed',
    file_size: 12582912, // 12MB
    created_at: '2024-12-08T11:00:00Z',
    processed_at: '2024-12-08T11:05:00Z',
    summary: 'Comprehensive risk assessment identifying 15 high-priority risks with mitigation strategies. Overall risk posture improved by 18% YoY. Full compliance achieved across all regulatory frameworks.',
    ai_insights: {
      risks: [
        'Cybersecurity threats increasing 40% YoY',
        'Third-party vendor risk concentration',
        'Climate change impact on operations'
      ],
      opportunities: [
        'Risk management automation could reduce costs 25%',
        'Proactive compliance positioning for new regulations',
        'Insurance optimization through improved risk metrics'
      ],
      action_items: [
        'Approve cybersecurity enhancement budget',
        'Review vendor diversification strategy',
        'Implement quarterly risk assessment reviews'
      ],
      sentiment: 'cautious',
      confidence_score: 0.95
    }
  },
  {
    id: 'pack-004',
    title: 'ESG Impact Report 2024',
    organization_id: 'org-002',
    status: 'processed',
    file_size: 18874368, // 18MB
    created_at: '2024-12-05T13:00:00Z',
    processed_at: '2024-12-05T13:07:00Z',
    summary: 'Significant progress on ESG targets with 35% reduction in carbon emissions, 42% increase in workforce diversity, and implementation of comprehensive governance framework achieving top-quartile industry ranking.',
    ai_insights: {
      risks: [
        'Scope 3 emissions tracking gaps',
        'Supply chain sustainability verification',
        'ESG reporting standardization challenges'
      ],
      opportunities: [
        'Green bond issuance potential ($500M)',
        'Sustainability-linked loan benefits',
        'Enhanced brand value through ESG leadership'
      ],
      action_items: [
        'Set Science-Based Targets initiative commitment',
        'Approve supplier sustainability audit program',
        'Establish diversity & inclusion board committee'
      ],
      sentiment: 'positive',
      confidence_score: 0.91
    }
  },
  {
    id: 'pack-005',
    title: 'M&A Proposal - CloudTech Acquisition',
    organization_id: 'org-001',
    status: 'processing',
    file_size: 25165824, // 24MB
    created_at: '2024-12-20T10:00:00Z',
    processing_progress: 65,
    estimated_completion: '2024-12-20T10:15:00Z',
    partial_summary: 'Strategic acquisition target with strong synergies in cloud infrastructure. Preliminary valuation at $450M representing 3.2x revenue multiple...',
    documents: [
      {
        id: 'doc-010',
        name: 'Due_Diligence_Report.pdf',
        type: 'due_diligence',
        pages: 120,
        processing_status: 'completed'
      },
      {
        id: 'doc-011',
        name: 'Financial_Model.xlsx',
        type: 'financial_model',
        pages: 45,
        processing_status: 'in_progress'
      }
    ]
  }
]

// Demo Meeting Data
export const demoMeetings = [
  {
    id: 'meeting-001',
    title: 'Q4 2024 Board Meeting',
    date: '2024-12-20T14:00:00Z',
    duration: 180, // minutes
    status: 'scheduled',
    attendees: 12,
    agenda_items: [
      'Q4 Financial Review',
      'Strategy 2025 Approval',
      'Risk & Compliance Update',
      'CEO Performance Review',
      'M&A Opportunity Discussion'
    ],
    documents: ['pack-001', 'pack-002', 'pack-003', 'pack-005']
  },
  {
    id: 'meeting-002',
    title: 'Emergency Risk Committee',
    date: '2024-12-18T09:00:00Z',
    duration: 90,
    status: 'completed',
    attendees: 8,
    minutes_available: true,
    recording_available: true,
    key_decisions: [
      'Approved enhanced cybersecurity measures',
      'Established crisis response team',
      'Allocated $5M emergency fund'
    ]
  },
  {
    id: 'meeting-003',
    title: 'Annual General Meeting 2025',
    date: '2025-01-15T10:00:00Z',
    duration: 240,
    status: 'scheduled',
    attendees: 150,
    agenda_items: [
      'Annual Report Presentation',
      'Board Elections',
      'Shareholder Resolutions',
      'Q&A Session'
    ]
  }
]

// Demo Analytics Data
export const demoAnalytics = {
  boardEffectiveness: {
    score: 87,
    trend: 'up',
    components: {
      attendance: 92,
      preparation: 88,
      participation: 85,
      decision_quality: 86
    }
  },
  riskMetrics: {
    high_risks: 3,
    medium_risks: 12,
    low_risks: 28,
    mitigated_this_quarter: 7,
    heat_map: [
      { category: 'Cyber', level: 'high', score: 8.5 },
      { category: 'Financial', level: 'medium', score: 5.2 },
      { category: 'Operational', level: 'low', score: 3.1 },
      { category: 'Regulatory', level: 'medium', score: 4.8 },
      { category: 'Reputation', level: 'low', score: 2.9 }
    ]
  },
  compliance: {
    overall_score: 94,
    frameworks: [
      { name: 'SOX', compliance: 100, last_audit: '2024-11-15' },
      { name: 'GDPR', compliance: 96, last_audit: '2024-10-20' },
      { name: 'ISO 27001', compliance: 92, last_audit: '2024-09-10' },
      { name: 'HIPAA', compliance: 88, last_audit: '2024-11-01' }
    ]
  },
  esg: {
    environmental: 72,
    social: 81,
    governance: 89,
    overall_rating: 'A-',
    carbon_footprint: {
      current: 45000, // tons CO2
      target: 30000,
      reduction_ytd: 18
    }
  }
}

// Demo Board Members
export const demoBoardMembers = [
  {
    id: 'member-001',
    name: 'Sarah Johnson',
    role: 'Board Chair',
    email: 'sarah.johnson@demo.boardguru.ai',
    tenure_years: 5,
    committees: ['Executive', 'Governance'],
    attendance_rate: 96,
    avatar: '/demo/avatars/sarah.jpg'
  },
  {
    id: 'member-002',
    name: 'Michael Chen',
    role: 'Independent Director',
    email: 'michael.chen@demo.boardguru.ai',
    tenure_years: 3,
    committees: ['Audit', 'Risk'],
    attendance_rate: 92,
    avatar: '/demo/avatars/michael.jpg'
  },
  {
    id: 'member-003',
    name: 'Emma Williams',
    role: 'CEO',
    email: 'emma.williams@demo.boardguru.ai',
    tenure_years: 7,
    committees: ['Executive'],
    attendance_rate: 100,
    avatar: '/demo/avatars/emma.jpg'
  },
  {
    id: 'member-004',
    name: 'Robert Davis',
    role: 'CFO',
    email: 'robert.davis@demo.boardguru.ai',
    tenure_years: 4,
    committees: ['Audit', 'Finance'],
    attendance_rate: 98,
    avatar: '/demo/avatars/robert.jpg'
  }
]

// Demo Chat Messages for AI Assistant
export const demoAIChatResponses = {
  'financial_summary': 'Based on the Q4 2024 financial report, revenue grew 23% YoY to $458M, with particularly strong performance in the Asia-Pacific region (32% growth). EBITDA margin expanded by 150 basis points to 28.5%, driven by operational efficiencies and favorable product mix.',
  'risk_assessment': 'The current risk profile shows 3 high-priority risks: 1) Cybersecurity threats (score: 8.5/10), 2) Supply chain disruption (score: 7.2/10), and 3) Regulatory compliance in new markets (score: 6.8/10). Mitigation strategies are in place for all identified risks.',
  'next_meeting': 'The next board meeting is scheduled for December 20, 2024, at 2:00 PM. Key agenda items include Q4 financial review, 2025 strategy approval, and the CloudTech acquisition proposal. All board packs have been distributed.',
  'esg_performance': 'ESG performance is strong with an overall A- rating. Carbon emissions reduced by 18% YTD, on track to meet the 35% reduction target by 2025. Diversity initiatives have increased representation by 42%, exceeding industry benchmarks.'
}

// Demo Document Summaries
export const demoDocumentSummaries = {
  'financial_report': {
    executive_summary: 'Strong financial performance with revenue exceeding guidance by 5%. Gross margins improved due to product mix shift toward higher-margin software solutions.',
    key_metrics: [
      'Revenue: $458M (+23% YoY)',
      'EBITDA: $130M (+28% YoY)',
      'Free Cash Flow: $95M (+31% YoY)',
      'Customer Retention: 94% (+2pp YoY)'
    ],
    risks_identified: [
      'Foreign exchange exposure',
      'Customer concentration risk',
      'Working capital management'
    ],
    recommendations: [
      'Implement hedging strategy for FX exposure',
      'Diversify customer base in enterprise segment',
      'Optimize inventory turnover ratios'
    ]
  }
}

// Demo Notification Messages
export const demoNotifications = [
  {
    id: 'notif-001',
    type: 'board_pack',
    title: 'New Board Pack Available',
    message: 'Q4 2024 Financial Report has been processed and is ready for review',
    timestamp: '2024-12-15T14:35:00Z',
    read: false,
    priority: 'high'
  },
  {
    id: 'notif-002',
    type: 'meeting',
    title: 'Meeting Reminder',
    message: 'Q4 Board Meeting starts in 2 days',
    timestamp: '2024-12-18T10:00:00Z',
    read: false,
    priority: 'medium'
  },
  {
    id: 'notif-003',
    type: 'action_item',
    title: 'Action Item Due',
    message: 'Review and approve cybersecurity budget - Due tomorrow',
    timestamp: '2024-12-19T09:00:00Z',
    read: true,
    priority: 'high'
  }
]

// Helper function to get demo data based on entity type
export function getDemoData<T>(entityType: string, id?: string): Result<T> {
  let data: any = null

  switch (entityType) {
    case 'organizations':
      data = id ? demoOrganizations.find(org => org.id === id) : demoOrganizations
      break
    case 'board_packs':
      data = id ? demoBoardPacks.find(pack => pack.id === id) : demoBoardPacks
      break
    case 'meetings':
      data = id ? demoMeetings.find(meeting => meeting.id === id) : demoMeetings
      break
    case 'analytics':
      data = demoAnalytics
      break
    case 'members':
      data = id ? demoBoardMembers.find(member => member.id === id) : demoBoardMembers
      break
    case 'notifications':
      data = demoNotifications
      break
    case 'ai_chat':
      data = demoAIChatResponses
      break
    case 'document_summaries':
      data = demoDocumentSummaries
      break
    default:
      data = null
  }

  return success(data as T)
}

// Demo mode detector
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  
  const urlParams = new URLSearchParams(window.location.search)
  const demoParam = urlParams.get('demo')
  const storedDemoMode = localStorage.getItem('boardguru_demo_mode')
  const pathname = window.location.pathname
  
  return demoParam === 'true' || 
         storedDemoMode === 'true' || 
         pathname.startsWith('/demo')
}

export default {
  getDemoData,
  isDemoMode,
  demoOrganizations,
  demoBoardPacks,
  demoMeetings,
  demoAnalytics,
  demoBoardMembers,
  demoNotifications,
  demoAIChatResponses,
  demoDocumentSummaries
}