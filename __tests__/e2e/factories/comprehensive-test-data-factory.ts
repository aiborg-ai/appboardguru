/**
 * Comprehensive Test Data Factory
 * 
 * Generates realistic test scenarios for complete board meeting lifecycle testing.
 * Creates complex scenarios with integrated document workflows, voting systems,
 * AI analysis requirements, and compliance frameworks.
 */

export interface BoardMeetingScenario {
  meeting: {
    id: string
    title: string
    description: string
    type: 'board' | 'committee' | 'emergency' | 'agm'
    scheduledDate: string
    scheduledTime: string
    duration: number
    location?: string
    virtualMeetingUrl?: string
    timezone: string
  }
  participants: Participant[]
  roleAssignments: RoleAssignment[]
  proxyAssignments: ProxyAssignment[]
  documents: MeetingDocument[]
  agenda: AgendaItem[]
  resolutions: Resolution[]
  complianceFrameworks: string[]
  aiAnalysisRequirements: AIAnalysisRequirement[]
}

export interface Participant {
  id: string
  userId: string
  email: string
  firstName: string
  lastName: string
  title: string
  role: string
  permissions: string[]
  attendanceStatus: 'confirmed' | 'tentative' | 'declined' | 'pending'
  voiceProfileId?: string
}

export interface RoleAssignment {
  userId: string
  userEmail: string
  role: 'chair' | 'vice_chair' | 'secretary' | 'treasurer' | 'board_member' | 'observer'
  permissions: string[]
  votingWeight: number
  canStartVoting: boolean
  canCloseVoting: boolean
}

export interface ProxyAssignment {
  grantorId: string
  grantorEmail: string
  proxyHolderId: string
  proxyHolderEmail: string
  type: 'general' | 'specific' | 'instructed' | 'discretionary'
  instructions?: string
  limitations: string[]
  effectiveFrom: string
  effectiveUntil: string
}

export interface MeetingDocument {
  id: string
  title: string
  description: string
  filePath: string
  fileSize: number
  mimeType: string
  category: 'agenda' | 'supporting' | 'presentation' | 'report' | 'minutes' | 'reference'
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted'
  requiredReview: boolean
  aiAnalysisEnabled: boolean
  complianceCheckRequired: boolean
  digitalSignatureRequired: boolean
  versionHistory: DocumentVersion[]
}

export interface DocumentVersion {
  version: string
  author: string
  modifiedAt: string
  changes: string
}

export interface AgendaItem {
  id: string
  title: string
  description: string
  type: 'presentation' | 'discussion' | 'decision' | 'information' | 'break'
  estimatedDuration: number
  presenter: string
  supportingDocuments: string[]
  votingRequired: boolean
  complianceRelevant: boolean
  aiInsightsEnabled: boolean
}

export interface Resolution {
  id: string
  title: string
  description: string
  type: 'ordinary' | 'special' | 'unanimous'
  proposedBy: string
  secondedBy?: string
  votingMethod: 'voice' | 'show_of_hands' | 'secret_ballot' | 'electronic' | 'roll_call'
  passingThreshold: number
  complianceFrameworks: string[]
  proxyVotingAllowed: boolean
  expectedControversy: 'low' | 'medium' | 'high'
}

export interface AIAnalysisRequirement {
  analysisType: 'transcription' | 'sentiment' | 'topic_extraction' | 'action_items' | 'decision_tracking' | 'compliance_flagging'
  enabled: boolean
  realTime: boolean
  accuracy: number
  confidenceThreshold: number
  customInstructions?: string
}

export interface ProxyVotingScenario {
  delegationLevels: number
  proxyTypes: string[]
  conflictScenarios: boolean
  legalValidationRequired: boolean
  proxies: ProxyDelegation[]
  delegationChains: DelegationChain[]
}

export interface ProxyDelegation {
  id: string
  grantorId: string
  proxyHolderId: string
  type: string
  level: number
  parentProxyId?: string
  votingWeight: number
  restrictions: string[]
}

export interface DelegationChain {
  chainId: string
  levels: ProxyDelegation[]
  isValid: boolean
  conflicts: string[]
}

export class ComprehensiveTestDataFactory {
  private scenarioTemplates: Map<string, any> = new Map()
  private userProfiles: Participant[] = []
  private complianceFrameworks: string[] = [
    'SOX', 'SEC', 'CORPORATE_GOVERNANCE', 'GDPR', 'HIPAA', 'ISO27001'
  ]

  constructor() {
    this.initializeTemplates()
    this.generateUserProfiles()
  }

  private initializeTemplates(): void {
    this.scenarioTemplates.set('quarterly_board_meeting', {
      meetingType: 'board',
      participantCount: 8,
      documentCount: 12,
      resolutionCount: 5,
      agendaItems: 9,
      estimatedDuration: 180,
      complexityFactors: ['financial_reporting', 'strategic_planning', 'governance_review']
    })

    this.scenarioTemplates.set('emergency_board_meeting', {
      meetingType: 'emergency',
      participantCount: 6,
      documentCount: 4,
      resolutionCount: 2,
      agendaItems: 4,
      estimatedDuration: 90,
      complexityFactors: ['urgent_decision', 'crisis_management']
    })

    this.scenarioTemplates.set('annual_general_meeting', {
      meetingType: 'agm',
      participantCount: 15,
      documentCount: 20,
      resolutionCount: 8,
      agendaItems: 12,
      estimatedDuration: 240,
      complexityFactors: ['director_elections', 'financial_statements', 'shareholder_proposals']
    })
  }

  private generateUserProfiles(): void {
    const profiles = [
      {
        id: 'user_001', userId: 'user_001', email: 'chair@boardguru.test', 
        firstName: 'Sarah', lastName: 'Mitchell', title: 'Board Chair', role: 'chair',
        permissions: ['start_meeting', 'end_meeting', 'assign_roles', 'start_voting'],
        attendanceStatus: 'confirmed' as const
      },
      {
        id: 'user_002', userId: 'user_002', email: 'vice.chair@boardguru.test',
        firstName: 'Michael', lastName: 'Chen', title: 'Vice Chair', role: 'vice_chair',
        permissions: ['start_voting', 'manage_agenda'],
        attendanceStatus: 'confirmed' as const
      },
      {
        id: 'user_003', userId: 'user_003', email: 'secretary@boardguru.test',
        firstName: 'Emily', lastName: 'Rodriguez', title: 'Corporate Secretary', role: 'secretary',
        permissions: ['manage_documents', 'take_minutes', 'manage_compliance'],
        attendanceStatus: 'confirmed' as const
      },
      {
        id: 'user_004', userId: 'user_004', email: 'member1@boardguru.test',
        firstName: 'David', lastName: 'Thompson', title: 'Independent Director', role: 'board_member',
        permissions: ['vote', 'review_documents'],
        attendanceStatus: 'confirmed' as const
      },
      {
        id: 'user_005', userId: 'user_005', email: 'member2@boardguru.test',
        firstName: 'Lisa', lastName: 'Park', title: 'Executive Director', role: 'board_member',
        permissions: ['vote', 'review_documents'],
        attendanceStatus: 'tentative' as const
      },
      {
        id: 'user_006', userId: 'user_006', email: 'member3@boardguru.test',
        firstName: 'Robert', lastName: 'Williams', title: 'Audit Committee Chair', role: 'board_member',
        permissions: ['vote', 'review_documents', 'compliance_review'],
        attendanceStatus: 'confirmed' as const
      },
      {
        id: 'user_007', userId: 'user_007', email: 'member4@boardguru.test',
        firstName: 'Jennifer', lastName: 'Davis', title: 'Compensation Committee Chair', role: 'board_member',
        permissions: ['vote', 'review_documents'],
        attendanceStatus: 'declined' as const
      },
      {
        id: 'user_008', userId: 'user_008', email: 'member5@boardguru.test',
        firstName: 'Thomas', lastName: 'Anderson', title: 'Independent Director', role: 'board_member',
        permissions: ['vote', 'review_documents'],
        attendanceStatus: 'pending' as const
      }
    ]

    this.userProfiles = profiles
  }

  async createBoardMeetingScenario(options: {
    type: string
    complexity: 'low' | 'medium' | 'high'
    participantCount: number
    documentCount: number
    complianceFrameworks: string[]
    aiAnalysisEnabled: boolean
    proxiesEnabled: boolean
  }): Promise<BoardMeetingScenario> {
    
    const template = this.scenarioTemplates.get(options.type) || this.scenarioTemplates.get('quarterly_board_meeting')!
    const meetingDate = this.generateFutureMeetingDate()

    const scenario: BoardMeetingScenario = {
      meeting: {
        id: `meeting_${Date.now()}`,
        title: this.generateMeetingTitle(options.type, options.complexity),
        description: this.generateMeetingDescription(options.type),
        type: template.meetingType,
        scheduledDate: meetingDate.toISOString().split('T')[0],
        scheduledTime: '14:00',
        duration: template.estimatedDuration,
        timezone: 'America/New_York'
      },
      participants: this.generateParticipants(options.participantCount),
      roleAssignments: this.generateRoleAssignments(options.participantCount),
      proxyAssignments: options.proxiesEnabled ? this.generateProxyAssignments() : [],
      documents: await this.generateMeetingDocuments(options.documentCount, options.complexity),
      agenda: this.generateAgendaItems(template.agendaItems, options.aiAnalysisEnabled),
      resolutions: this.generateResolutions(template.resolutionCount, options.complexity),
      complianceFrameworks: options.complianceFrameworks,
      aiAnalysisRequirements: this.generateAIAnalysisRequirements(options.aiAnalysisEnabled)
    }

    return scenario
  }

  async createProxyVotingScenario(options: {
    delegationLevels: number
    proxyTypes: string[]
    conflictScenarios: boolean
    legalValidationRequired: boolean
  }): Promise<ProxyVotingScenario> {
    
    const proxies: ProxyDelegation[] = []
    const delegationChains: DelegationChain[] = []

    // Generate proxy delegations with specified levels
    for (let level = 1; level <= options.delegationLevels; level++) {
      const levelProxies = this.generateProxyDelegationsForLevel(level, options.proxyTypes)
      proxies.push(...levelProxies)
    }

    // Build delegation chains
    for (const proxy of proxies.filter(p => p.level === 1)) {
      const chain = this.buildDelegationChain(proxy, proxies)
      delegationChains.push(chain)
    }

    // Introduce conflicts if requested
    if (options.conflictScenarios) {
      this.introduceProxyConflicts(proxies, delegationChains)
    }

    return {
      delegationLevels: options.delegationLevels,
      proxyTypes: options.proxyTypes,
      conflictScenarios: options.conflictScenarios,
      legalValidationRequired: options.legalValidationRequired,
      proxies,
      delegationChains
    }
  }

  private generateFutureMeetingDate(): Date {
    const date = new Date()
    date.setDate(date.getDate() + Math.floor(Math.random() * 30) + 7) // 7-37 days in future
    return date
  }

  private generateMeetingTitle(type: string, complexity: string): string {
    const titles = {
      quarterly_board_meeting: [
        `Q${Math.ceil(Math.random() * 4)} ${new Date().getFullYear()} Board Meeting`,
        `Quarterly Strategic Review - Q${Math.ceil(Math.random() * 4)}`,
        `Board Meeting: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      ],
      emergency_board_meeting: [
        'Emergency Board Meeting - Urgent Matters',
        'Special Board Session - Crisis Response',
        'Emergency Strategic Decision Meeting'
      ],
      annual_general_meeting: [
        `${new Date().getFullYear()} Annual General Meeting`,
        `Annual Shareholders Meeting ${new Date().getFullYear()}`,
        `AGM ${new Date().getFullYear()} - Strategic Review`
      ]
    }

    const typeArray = titles[type as keyof typeof titles] || titles.quarterly_board_meeting
    return typeArray[Math.floor(Math.random() * typeArray.length)]
  }

  private generateMeetingDescription(type: string): string {
    const descriptions = {
      quarterly_board_meeting: 'Comprehensive quarterly review of company performance, strategic initiatives, and governance matters.',
      emergency_board_meeting: 'Emergency session to address urgent strategic and operational matters requiring immediate board attention.',
      annual_general_meeting: 'Annual meeting of shareholders to review company performance, elect directors, and vote on key proposals.'
    }

    return descriptions[type as keyof typeof descriptions] || descriptions.quarterly_board_meeting
  }

  private generateParticipants(count: number): Participant[] {
    return this.userProfiles.slice(0, Math.min(count, this.userProfiles.length))
  }

  private generateRoleAssignments(participantCount: number): RoleAssignment[] {
    const participants = this.generateParticipants(participantCount)
    
    return participants.map((participant, index) => ({
      userId: participant.userId,
      userEmail: participant.email,
      role: participant.role as any,
      permissions: participant.permissions,
      votingWeight: participant.role === 'chair' ? 1.5 : 1.0,
      canStartVoting: participant.role === 'chair',
      canCloseVoting: participant.role === 'chair'
    }))
  }

  private generateProxyAssignments(): ProxyAssignment[] {
    // Generate realistic proxy scenarios
    const proxies: ProxyAssignment[] = []

    // User 007 (declined) delegates to User 008
    proxies.push({
      grantorId: 'user_007',
      grantorEmail: 'member4@boardguru.test',
      proxyHolderId: 'user_008',
      proxyHolderEmail: 'member5@boardguru.test',
      type: 'general',
      limitations: [],
      effectiveFrom: new Date().toISOString(),
      effectiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    })

    // User 005 (tentative) provides instructed proxy to chair
    proxies.push({
      grantorId: 'user_005',
      grantorEmail: 'member2@boardguru.test',
      proxyHolderId: 'user_001',
      proxyHolderEmail: 'chair@boardguru.test',
      type: 'instructed',
      instructions: 'Vote FOR all resolutions except compensation-related matters',
      limitations: ['compensation_committee_matters'],
      effectiveFrom: new Date().toISOString(),
      effectiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })

    return proxies
  }

  private async generateMeetingDocuments(count: number, complexity: string): Promise<MeetingDocument[]> {
    const documents: MeetingDocument[] = []
    const documentTypes = [
      { category: 'agenda', title: 'Meeting Agenda', required: true },
      { category: 'supporting', title: 'Board Pack Summary', required: true },
      { category: 'report', title: 'CEO Report', required: true },
      { category: 'report', title: 'CFO Financial Report', required: true },
      { category: 'presentation', title: 'Strategic Initiative Update', required: false },
      { category: 'supporting', title: 'Risk Management Review', required: false },
      { category: 'report', title: 'Audit Committee Report', required: false },
      { category: 'presentation', title: 'Market Analysis', required: false },
      { category: 'supporting', title: 'Regulatory Update', required: false },
      { category: 'reference', title: 'Industry Benchmarks', required: false }
    ]

    for (let i = 0; i < Math.min(count, documentTypes.length); i++) {
      const docType = documentTypes[i]
      
      documents.push({
        id: `doc_${Date.now()}_${i}`,
        title: docType.title,
        description: `${docType.title} for board meeting review`,
        filePath: `/test-documents/${docType.title.replace(/\s+/g, '_').toLowerCase()}.pdf`,
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB to 5MB
        mimeType: 'application/pdf',
        category: docType.category as any,
        confidentialityLevel: i < 3 ? 'internal' : 'confidential',
        requiredReview: docType.required,
        aiAnalysisEnabled: complexity !== 'low',
        complianceCheckRequired: ['report', 'supporting'].includes(docType.category),
        digitalSignatureRequired: docType.required,
        versionHistory: [
          {
            version: '1.0',
            author: this.userProfiles[Math.floor(Math.random() * 3)].email,
            modifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            changes: 'Initial version'
          }
        ]
      })
    }

    return documents
  }

  private generateAgendaItems(count: number, aiEnabled: boolean): AgendaItem[] {
    const items = [
      { title: 'Call to Order', type: 'information', duration: 5, presenter: 'chair' },
      { title: 'Approval of Previous Minutes', type: 'decision', duration: 10, presenter: 'secretary' },
      { title: 'CEO Report', type: 'presentation', duration: 20, presenter: 'ceo' },
      { title: 'Financial Report', type: 'presentation', duration: 15, presenter: 'cfo' },
      { title: 'Strategic Initiatives Update', type: 'discussion', duration: 30, presenter: 'chair' },
      { title: 'Risk Management Review', type: 'discussion', duration: 20, presenter: 'risk_committee' },
      { title: 'Compensation Committee Report', type: 'presentation', duration: 15, presenter: 'comp_committee' },
      { title: 'New Business', type: 'discussion', duration: 15, presenter: 'chair' },
      { title: 'Executive Session', type: 'discussion', duration: 15, presenter: 'chair' },
      { title: 'Adjournment', type: 'information', duration: 5, presenter: 'chair' }
    ]

    return items.slice(0, count).map((item, index) => ({
      id: `agenda_${index + 1}`,
      title: item.title,
      description: `${item.title} discussion and review`,
      type: item.type as any,
      estimatedDuration: item.duration,
      presenter: item.presenter,
      supportingDocuments: index < 6 ? [`doc_${Date.now()}_${index}`] : [],
      votingRequired: item.type === 'decision',
      complianceRelevant: ['Financial Report', 'Risk Management Review'].includes(item.title),
      aiInsightsEnabled: aiEnabled
    }))
  }

  private generateResolutions(count: number, complexity: string): Resolution[] {
    const resolutions = [
      {
        title: 'Approval of Financial Statements',
        type: 'ordinary',
        votingMethod: 'electronic',
        controversy: 'low'
      },
      {
        title: 'Authorization of Stock Buyback Program',
        type: 'ordinary',
        votingMethod: 'roll_call',
        controversy: 'medium'
      },
      {
        title: 'Executive Compensation Plan Approval',
        type: 'ordinary',
        votingMethod: 'secret_ballot',
        controversy: 'high'
      },
      {
        title: 'Board Size Modification',
        type: 'special',
        votingMethod: 'roll_call',
        controversy: 'medium'
      },
      {
        title: 'Merger and Acquisition Authorization',
        type: 'special',
        votingMethod: 'roll_call',
        controversy: 'high'
      }
    ]

    return resolutions.slice(0, count).map((res, index) => ({
      id: `resolution_${index + 1}`,
      title: res.title,
      description: `Resolution regarding ${res.title.toLowerCase()}`,
      type: res.type as any,
      proposedBy: 'user_001',
      votingMethod: res.votingMethod as any,
      passingThreshold: res.type === 'special' ? 0.67 : 0.5,
      complianceFrameworks: ['SOX', 'SEC'],
      proxyVotingAllowed: true,
      expectedControversy: res.controversy as any
    }))
  }

  private generateAIAnalysisRequirements(enabled: boolean): AIAnalysisRequirement[] {
    if (!enabled) return []

    return [
      {
        analysisType: 'transcription',
        enabled: true,
        realTime: true,
        accuracy: 0.95,
        confidenceThreshold: 0.9
      },
      {
        analysisType: 'sentiment',
        enabled: true,
        realTime: true,
        accuracy: 0.88,
        confidenceThreshold: 0.8
      },
      {
        analysisType: 'action_items',
        enabled: true,
        realTime: false,
        accuracy: 0.92,
        confidenceThreshold: 0.85
      },
      {
        analysisType: 'decision_tracking',
        enabled: true,
        realTime: false,
        accuracy: 0.90,
        confidenceThreshold: 0.8
      },
      {
        analysisType: 'compliance_flagging',
        enabled: true,
        realTime: true,
        accuracy: 0.94,
        confidenceThreshold: 0.9
      }
    ]
  }

  private generateProxyDelegationsForLevel(level: number, proxyTypes: string[]): ProxyDelegation[] {
    const delegations: ProxyDelegation[] = []
    const proxiesPerLevel = Math.max(1, Math.floor(4 / level))

    for (let i = 0; i < proxiesPerLevel; i++) {
      delegations.push({
        id: `proxy_${level}_${i}`,
        grantorId: `user_${level * 100 + i + 10}`,
        proxyHolderId: `user_${level * 100 + i + 20}`,
        type: proxyTypes[i % proxyTypes.length],
        level,
        votingWeight: 1.0,
        restrictions: level > 1 ? ['high_risk_decisions'] : []
      })
    }

    return delegations
  }

  private buildDelegationChain(rootProxy: ProxyDelegation, allProxies: ProxyDelegation[]): DelegationChain {
    const chain: ProxyDelegation[] = [rootProxy]
    let currentProxy = rootProxy

    // Build chain by following proxy holders who also have granted proxies
    while (currentProxy && currentProxy.level < 5) {
      const nextProxy = allProxies.find(p => 
        p.grantorId === currentProxy.proxyHolderId && 
        p.level === currentProxy.level + 1
      )
      
      if (nextProxy) {
        nextProxy.parentProxyId = currentProxy.id
        chain.push(nextProxy)
        currentProxy = nextProxy
      } else {
        break
      }
    }

    return {
      chainId: `chain_${rootProxy.id}`,
      levels: chain,
      isValid: this.validateDelegationChain(chain),
      conflicts: this.detectChainConflicts(chain)
    }
  }

  private validateDelegationChain(chain: ProxyDelegation[]): boolean {
    // Check for circular references
    const seen = new Set<string>()
    for (const proxy of chain) {
      if (seen.has(proxy.proxyHolderId)) {
        return false // Circular reference
      }
      seen.add(proxy.grantorId)
    }

    // Check delegation level limits
    return chain.length <= 5
  }

  private detectChainConflicts(chain: ProxyDelegation[]): string[] {
    const conflicts: string[] = []

    // Check for conflicting voting instructions
    const instructedProxies = chain.filter(p => p.type === 'instructed')
    if (instructedProxies.length > 1) {
      conflicts.push('conflicting_voting_instructions')
    }

    // Check for restriction conflicts
    const restrictedProxies = chain.filter(p => p.restrictions.length > 0)
    if (restrictedProxies.length > 0) {
      conflicts.push('cascading_restrictions')
    }

    return conflicts
  }

  private introduceProxyConflicts(proxies: ProxyDelegation[], chains: DelegationChain[]): void {
    // Introduce some realistic conflicts
    if (proxies.length > 2) {
      // Create a circular reference conflict
      proxies[0].proxyHolderId = proxies[1].grantorId
      proxies[1].proxyHolderId = proxies[0].grantorId
    }

    // Mark chains as invalid due to conflicts
    chains.forEach(chain => {
      if (Math.random() < 0.3) { // 30% chance of conflict
        chain.isValid = false
        chain.conflicts.push('validation_conflict')
      }
    })
  }
}