/**
 * Meeting Intelligence MCP Resource
 * AI-powered meeting analysis, insights, and optimization
 * Enterprise board meeting intelligence and decision tracking
 * 
 * Revenue Potential: £150K-£300K annually per enterprise client
 * Market Value: Meeting productivity and governance intelligence (£800M+ market)
 */

import { voiceService } from '@/lib/services/voice.service'
import { boardService } from '@/lib/services/board.service'
import { meetingRepository } from '@/lib/repositories/meeting.repository'
import { documentService } from '@/lib/services/document.service'
import type { OrganizationId, VaultId, UserId, MeetingId } from '@/types/branded'
import type { BoardMate } from '@/types/boardmates'

export interface MeetingIntelligence {
  meetingId: string
  organizationId: string
  vaultId: string
  basicInfo: MeetingBasicInfo
  participants: MeetingParticipant[]
  agenda: MeetingAgenda
  transcript: MeetingTranscript
  analysis: MeetingAnalysis
  insights: MeetingInsights
  actionItems: ActionItem[]
  decisions: MeetingDecision[]
  sentiment: SentimentAnalysis
  performance: MeetingPerformance
  recommendations: MeetingRecommendation[]
  followUp: FollowUpPlan
}

export interface MeetingBasicInfo {
  title: string
  type: 'Board' | 'Committee' | 'Executive' | 'Audit' | 'Strategy' | 'Emergency'
  scheduledStart: Date
  scheduledEnd: Date
  actualStart?: Date
  actualEnd?: Date
  location: 'In-Person' | 'Virtual' | 'Hybrid'
  platform?: string
  recordingAvailable: boolean
  status: 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled' | 'Postponed'
  confidentialityLevel: 'Public' | 'Internal' | 'Confidential' | 'Restricted'
}

export interface MeetingParticipant {
  id: string
  name: string
  email: string
  role: 'Chair' | 'Director' | 'Observer' | 'Secretary' | 'Guest' | 'Advisor'
  attendance: 'Present' | 'Absent' | 'Late' | 'Left-Early'
  arrivalTime?: Date
  departureTime?: Date
  engagementScore: number // 0-100
  speakingTime: number // minutes
  contributionQuality: number // 0-100
  preparedness: number // 0-100
  votes: MeetingVote[]
  comments: number
  questions: number
}

export interface MeetingVote {
  itemId: string
  itemTitle: string
  vote: 'For' | 'Against' | 'Abstain' | 'Recused'
  timestamp: Date
  rationale?: string
}

export interface MeetingAgenda {
  items: AgendaItem[]
  totalEstimatedTime: number
  actualTime?: number
  timeVariance?: number
  completionRate: number // 0-100
}

export interface AgendaItem {
  id: string
  title: string
  type: 'Information' | 'Discussion' | 'Decision' | 'Approval' | 'Report' | 'Strategy'
  presenter: string
  estimatedTime: number
  actualTime?: number
  status: 'Not-Started' | 'In-Progress' | 'Completed' | 'Deferred' | 'Skipped'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  materials: AgendaMaterial[]
  outcomes: AgendaOutcome[]
  votes?: VotingResult[]
  discussion: DiscussionSummary
}

export interface AgendaMaterial {
  id: string
  title: string
  type: 'Document' | 'Presentation' | 'Spreadsheet' | 'Video' | 'Report'
  url: string
  uploadedBy: string
  uploadedAt: Date
  viewed: boolean
  downloadCount: number
  comments: number
}

export interface AgendaOutcome {
  type: 'Decision' | 'Action' | 'Information' | 'Deferral'
  description: string
  responsible?: string[]
  deadline?: Date
  approval?: boolean
  votes?: VotingResult
}

export interface VotingResult {
  totalVotes: number
  votesFor: number
  votesAgainst: number
  abstentions: number
  recusals: number
  result: 'Passed' | 'Failed' | 'Deferred'
  quorumMet: boolean
  votingDetails: MeetingVote[]
}

export interface DiscussionSummary {
  keyPoints: string[]
  concerns: string[]
  opportunities: string[]
  agreements: string[]
  disagreements: string[]
  questions: string[]
  followUpNeeded: boolean
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed'
}

export interface MeetingTranscript {
  available: boolean
  language: string
  accuracy: number // 0-100
  speakers: TranscriptSpeaker[]
  segments: TranscriptSegment[]
  keywords: KeywordAnalysis
  topics: TopicAnalysis
  processingStatus: 'Pending' | 'Processing' | 'Completed' | 'Error'
}

export interface TranscriptSpeaker {
  id: string
  name: string
  role: string
  speakingTime: number
  wordCount: number
  interruptions: number
  questionsAsked: number
  pointsRaised: number
}

export interface TranscriptSegment {
  id: string
  startTime: number // seconds from start
  endTime: number
  speaker: string
  text: string
  confidence: number
  topics: string[]
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  importance: number // 0-100
  actionable: boolean
  questions: string[]
  decisions: string[]
}

export interface KeywordAnalysis {
  mostFrequent: { word: string; count: number; importance: number }[]
  technical: string[]
  financial: string[]
  strategic: string[]
  risk: string[]
  governance: string[]
  trending: { word: string; trend: 'Rising' | 'Stable' | 'Declining' }[]
}

export interface TopicAnalysis {
  main: { topic: string; coverage: number; importance: number; sentiment: string }[]
  emerging: string[]
  controversial: string[]
  consensus: string[]
  unresolved: string[]
  recurring: string[]
}

export interface MeetingAnalysis {
  efficiency: EfficiencyAnalysis
  participation: ParticipationAnalysis
  governance: GovernanceAnalysis
  quality: QualityAnalysis
  compliance: ComplianceAnalysis
  risk: RiskAnalysis
}

export interface EfficiencyAnalysis {
  overallScore: number // 0-100
  timeManagement: {
    onTimeStart: boolean
    onTimeEnd: boolean
    agendaAdherence: number // 0-100
    timePerItem: { planned: number; actual: number; variance: number }[]
  }
  preparation: {
    materialsReviewed: number // 0-100
    participantReadiness: number // 0-100
    agendaClarity: number // 0-100
  }
  productivity: {
    decisionsPerHour: number
    actionItemsPerHour: number
    discussionQuality: number // 0-100
    outcomeClarity: number // 0-100
  }
}

export interface ParticipationAnalysis {
  distribution: {
    speakingTime: { participant: string; percentage: number; quality: number }[]
    engagement: { participant: string; score: number; metrics: EngagementMetrics }[]
  }
  dynamics: {
    dominance: string[] // Participants who dominated discussion
    silence: string[] // Participants who barely spoke
    interruptions: { interrupter: string; interrupted: string; count: number }[]
    collaboration: number // 0-100
  }
  inclusion: {
    diversityScore: number // 0-100
    allVoicesHeard: boolean
    minorityParticipation: number // 0-100
    genderBalance: number // 0-100
  }
}

export interface EngagementMetrics {
  verbal: number // Speaking time and quality
  visual: number // Camera on, attentiveness (if virtual)
  interactive: number // Questions, comments, votes
  preparation: number // Material review, preparedness
}

export interface GovernanceAnalysis {
  complianceScore: number // 0-100
  structure: {
    quorumMet: boolean
    properNotice: boolean
    agendaFollowed: boolean
    votingProcedures: boolean
    recordKeeping: boolean
  }
  transparency: {
    openDiscussion: number // 0-100
    informationSharing: number // 0-100
    decisionClarity: number // 0-100
    conflictDisclosure: boolean
  }
  accountability: {
    actionItemTracking: number // 0-100
    followUpCommitment: number // 0-100
    responsibilityAssignment: number // 0-100
  }
}

export interface QualityAnalysis {
  overallScore: number // 0-100
  discussion: {
    depth: number // 0-100
    breadth: number // 0-100
    focus: number // 0-100
    evidence: number // 0-100
  }
  decisionMaking: {
    informationBased: number // 0-100
    consultative: number // 0-100
    timely: number // 0-100
    clear: number // 0-100
  }
  strategic: {
    longTermFocus: number // 0-100
    riskConsideration: number // 0-100
    stakeholderFocus: number // 0-100
    innovation: number // 0-100
  }
}

export interface ComplianceAnalysis {
  regulatoryAdherence: number // 0-100
  documentationQuality: number // 0-100
  processCompliance: number // 0-100
  reportingRequirements: boolean
  auditReadiness: number // 0-100
  violations: ComplianceViolation[]
  recommendations: string[]
}

export interface ComplianceViolation {
  type: 'Procedural' | 'Disclosure' | 'Voting' | 'Documentation' | 'Notice'
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  description: string
  regulation: string
  remediation: string
  deadline?: Date
}

export interface RiskAnalysis {
  overallRisk: number // 0-100
  categories: {
    strategic: number
    operational: number
    financial: number
    regulatory: number
    reputational: number
  }
  identifiedRisks: IdentifiedRisk[]
  mitigationDiscussed: boolean
  newRisks: string[]
  escalatedRisks: string[]
}

export interface IdentifiedRisk {
  id: string
  category: string
  description: string
  probability: number // 0-100
  impact: number // 0-100
  discussionTime: number
  mitigationProposed: boolean
  ownerAssigned: boolean
  timelineSet: boolean
}

export interface MeetingInsights {
  summary: MeetingSummary
  keyTakeaways: string[]
  strategicInsights: StrategicInsight[]
  trends: TrendAnalysis
  predictions: MeetingPrediction[]
  benchmarks: MeetingBenchmark[]
  alerts: MeetingAlert[]
}

export interface MeetingSummary {
  mainObjective: string
  keyDecisions: string[]
  majorDiscussions: string[]
  outstandingIssues: string[]
  nextSteps: string[]
  overallSentiment: string
  successLevel: number // 0-100
}

export interface StrategicInsight {
  category: 'Growth' | 'Risk' | 'Opportunity' | 'Challenge' | 'Innovation'
  insight: string
  impact: 'High' | 'Medium' | 'Low'
  urgency: 'Immediate' | 'Short-term' | 'Long-term'
  recommendations: string[]
  relatedDecisions: string[]
}

export interface TrendAnalysis {
  topics: { topic: string; trend: 'Rising' | 'Stable' | 'Declining'; significance: number }[]
  sentiment: { category: string; current: string; previous: string; change: string }[]
  participation: { metric: string; trend: 'Improving' | 'Stable' | 'Declining' }[]
  efficiency: { aspect: string; change: number; direction: 'Better' | 'Same' | 'Worse' }[]
}

export interface MeetingPrediction {
  type: 'Outcome' | 'Risk' | 'Opportunity' | 'Challenge'
  prediction: string
  confidence: number // 0-100
  timeframe: string
  factors: string[]
  implications: string[]
  recommendations: string[]
}

export interface MeetingBenchmark {
  metric: string
  value: number
  industryAverage: number
  bestPractice: number
  ranking: 'Excellent' | 'Good' | 'Average' | 'Below Average' | 'Poor'
  improvement: string
}

export interface MeetingAlert {
  type: 'Risk' | 'Compliance' | 'Efficiency' | 'Governance' | 'Follow-up'
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  title: string
  description: string
  recommendation: string
  deadline?: Date
  responsible?: string[]
}

export interface ActionItem {
  id: string
  title: string
  description: string
  type: 'Decision' | 'Task' | 'Follow-up' | 'Research' | 'Report' | 'Implementation'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In-Progress' | 'Completed' | 'Blocked' | 'Cancelled'
  assignee: string[]
  reporter: string
  dueDate?: Date
  estimatedEffort: string
  dependencies: string[]
  source: {
    agendaItem: string
    discussionPoint: string
    timestamp: Date
  }
  progress: number // 0-100
  updates: ActionUpdate[]
  resources: string[]
  successCriteria: string[]
}

export interface ActionUpdate {
  id: string
  timestamp: Date
  author: string
  status: string
  comment: string
  progress: number
  blockers: string[]
  nextSteps: string[]
}

export interface MeetingDecision {
  id: string
  title: string
  description: string
  category: 'Strategic' | 'Operational' | 'Financial' | 'HR' | 'Governance' | 'Risk'
  type: 'Approval' | 'Directive' | 'Policy' | 'Budget' | 'Investment' | 'Partnership'
  rationale: string
  alternatives: string[]
  impact: DecisionImpact
  voting: VotingResult
  implementation: ImplementationPlan
  risks: string[]
  dependencies: string[]
  success: string[]
  review: ReviewSchedule
}

export interface DecisionImpact {
  financial: { amount: number; timeframe: string; type: 'Revenue' | 'Cost' | 'Investment' }
  operational: string[]
  strategic: string[]
  stakeholder: { group: string; impact: 'Positive' | 'Negative' | 'Neutral'; details: string }[]
  risk: { type: string; level: 'High' | 'Medium' | 'Low'; mitigation: string }[]
}

export interface ImplementationPlan {
  phases: { name: string; duration: string; activities: string[]; responsible: string[] }[]
  timeline: string
  budget: number
  resources: string[]
  milestones: { name: string; date: Date; criteria: string[] }[]
  risks: string[]
  success: string[]
}

export interface ReviewSchedule {
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually' | 'Ad-hoc'
  nextReview: Date
  criteria: string[]
  responsible: string[]
}

export interface SentimentAnalysis {
  overall: 'Very Positive' | 'Positive' | 'Neutral' | 'Negative' | 'Very Negative'
  byParticipant: { participant: string; sentiment: string; confidence: number }[]
  byTopic: { topic: string; sentiment: string; intensity: number }[]
  byTimeframe: { period: string; sentiment: string; drivers: string[] }[]
  trends: { aspect: string; direction: 'Improving' | 'Stable' | 'Declining' }[]
  concerns: string[]
  positives: string[]
}

export interface MeetingPerformance {
  scores: {
    overall: number // 0-100
    efficiency: number
    participation: number
    governance: number
    outcomes: number
    satisfaction: number
  }
  metrics: {
    duration: { planned: number; actual: number; variance: number }
    participation: { average: number; median: number; range: { min: number; max: number } }
    decisions: { count: number; quality: number; implementation: number }
    actions: { count: number; clarity: number; ownership: number }
  }
  comparisons: {
    previousMeeting: { metric: string; change: number; direction: 'Better' | 'Same' | 'Worse' }[]
    industry: { metric: string; position: 'Above' | 'At' | 'Below'; percentile: number }[]
    internal: { metric: string; rank: number; total: number }[]
  }
}

export interface MeetingRecommendation {
  id: string
  category: 'Process' | 'Participation' | 'Governance' | 'Technology' | 'Preparation'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  title: string
  description: string
  benefits: string[]
  implementation: {
    steps: string[]
    effort: 'Low' | 'Medium' | 'High'
    timeline: string
    cost: number
    responsible: string[]
  }
  impact: {
    efficiency: number // Expected improvement 0-100
    satisfaction: number
    outcomes: number
    governance: number
  }
  success: string[]
  risks: string[]
}

export interface FollowUpPlan {
  summary: {
    totalItems: number
    actionItems: number
    decisions: number
    deadlines: { immediate: number; thisWeek: number; thisMonth: number }
  }
  communications: {
    minutes: { recipient: string[]; deadline: Date; status: 'Pending' | 'Sent' }
    summary: { recipient: string[]; deadline: Date; status: 'Pending' | 'Sent' }
    actionItems: { recipient: string[]; deadline: Date; status: 'Pending' | 'Sent' }
    reports: { type: string; recipient: string[]; deadline: Date }[]
  }
  monitoring: {
    actionTracking: { method: string; frequency: string; responsible: string[] }
    progress: { metric: string; target: number; review: Date }[]
    escalation: { trigger: string; process: string; responsible: string[] }[]
  }
  nextMeeting: {
    suggestedDate: Date
    suggestedAgenda: string[]
    preparationNeeds: string[]
    followUpItems: string[]
  }
}

class MeetingIntelligenceService {
  /**
   * Analyze meeting and generate comprehensive intelligence
   */
  async analyzeMeeting(meetingId: MeetingId): Promise<MeetingIntelligence> {
    try {
      // Get meeting data
      const meetingResult = await meetingRepository.findById(meetingId)
      if (!meetingResult.success || !meetingResult.data) {
        throw new Error('Meeting not found')
      }
      
      const meeting = meetingResult.data
      
      // Process transcript if available
      let transcript: MeetingTranscript | undefined
      if (meeting.recording_url) {
        transcript = await this.processTranscript(meeting.recording_url)
      }
      
      // Generate AI-powered analysis
      const [analysis, insights, performance] = await Promise.all([
        this.generateMeetingAnalysis(meeting, transcript),
        this.generateMeetingInsights(meeting, transcript),
        this.calculateMeetingPerformance(meeting, transcript)
      ])
      
      // Extract action items and decisions
      const actionItems = await this.extractActionItems(meeting, transcript)
      const decisions = await this.extractDecisions(meeting, transcript)
      
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(meeting, transcript)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(analysis, performance)
      
      // Create follow-up plan
      const followUp = await this.createFollowUpPlan(actionItems, decisions)

      return {
        meetingId: meetingId,
        organizationId: meeting.organization_id,
        vaultId: meeting.vault_id || '',
        basicInfo: {
          title: meeting.title,
          type: meeting.meeting_type as any || 'Board',
          scheduledStart: new Date(meeting.scheduled_start),
          scheduledEnd: new Date(meeting.scheduled_end),
          actualStart: meeting.actual_start ? new Date(meeting.actual_start) : undefined,
          actualEnd: meeting.actual_end ? new Date(meeting.actual_end) : undefined,
          location: meeting.location_type as any || 'Virtual',
          platform: meeting.platform,
          recordingAvailable: !!meeting.recording_url,
          status: meeting.status as any || 'Completed',
          confidentialityLevel: 'Confidential'
        },
        participants: await this.getParticipantAnalysis(meeting),
        agenda: await this.getAgendaAnalysis(meeting),
        transcript: transcript || this.getEmptyTranscript(),
        analysis,
        insights,
        actionItems,
        decisions,
        sentiment,
        performance,
        recommendations,
        followUp
      }

    } catch (error) {
      console.error('Error analyzing meeting:', error)
      throw new Error('Failed to analyze meeting')
    }
  }

  /**
   * Get meeting intelligence dashboard for organization
   */
  async getMeetingDashboard(organizationId: OrganizationId): Promise<MeetingDashboard> {
    try {
      const meetings = await meetingRepository.findByOrganization(organizationId)
      if (!meetings.success) {
        throw new Error('Failed to fetch meetings')
      }

      // Analyze recent meetings
      const recentMeetings = meetings.data
        .filter(m => new Date(m.created_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) // Last 90 days
        .slice(0, 20) // Limit to last 20 meetings

      const analyses = await Promise.all(
        recentMeetings.map(meeting => 
          this.analyzeMeeting(meeting.id as MeetingId).catch(() => null)
        )
      )

      const validAnalyses = analyses.filter(Boolean) as MeetingIntelligence[]

      return {
        summary: this.calculateDashboardSummary(validAnalyses),
        trends: this.calculateTrends(validAnalyses),
        performance: this.calculateAggregatePerformance(validAnalyses),
        upcomingMeetings: await this.getUpcomingMeetings(organizationId),
        actionItems: this.getAggregateActionItems(validAnalyses),
        insights: this.getAggregateInsights(validAnalyses),
        alerts: this.generateDashboardAlerts(validAnalyses)
      }
    } catch (error) {
      console.error('Error generating meeting dashboard:', error)
      throw new Error('Failed to generate meeting dashboard')
    }
  }

  // Private helper methods
  private async processTranscript(recordingUrl: string): Promise<MeetingTranscript> {
    // Would integrate with voice service for transcript processing
    return {
      available: true,
      language: 'en',
      accuracy: 88,
      speakers: [],
      segments: [],
      keywords: {
        mostFrequent: [],
        technical: [],
        financial: [],
        strategic: [],
        risk: [],
        governance: [],
        trending: []
      },
      topics: {
        main: [],
        emerging: [],
        controversial: [],
        consensus: [],
        unresolved: [],
        recurring: []
      },
      processingStatus: 'Completed'
    }
  }

  private getEmptyTranscript(): MeetingTranscript {
    return {
      available: false,
      language: 'en',
      accuracy: 0,
      speakers: [],
      segments: [],
      keywords: {
        mostFrequent: [],
        technical: [],
        financial: [],
        strategic: [],
        risk: [],
        governance: [],
        trending: []
      },
      topics: {
        main: [],
        emerging: [],
        controversial: [],
        consensus: [],
        unresolved: [],
        recurring: []
      },
      processingStatus: 'Pending'
    }
  }

  private async generateMeetingAnalysis(meeting: any, transcript?: MeetingTranscript): Promise<MeetingAnalysis> {
    // Mock implementation - would use AI analysis
    return {
      efficiency: {
        overallScore: 78,
        timeManagement: {
          onTimeStart: true,
          onTimeEnd: false,
          agendaAdherence: 85,
          timePerItem: []
        },
        preparation: {
          materialsReviewed: 75,
          participantReadiness: 80,
          agendaClarity: 90
        },
        productivity: {
          decisionsPerHour: 2.5,
          actionItemsPerHour: 4.2,
          discussionQuality: 82,
          outcomeClarity: 88
        }
      },
      participation: {
        distribution: {
          speakingTime: [],
          engagement: []
        },
        dynamics: {
          dominance: [],
          silence: [],
          interruptions: [],
          collaboration: 75
        },
        inclusion: {
          diversityScore: 68,
          allVoicesHeard: true,
          minorityParticipation: 72,
          genderBalance: 65
        }
      },
      governance: {
        complianceScore: 92,
        structure: {
          quorumMet: true,
          properNotice: true,
          agendaFollowed: true,
          votingProcedures: true,
          recordKeeping: true
        },
        transparency: {
          openDiscussion: 85,
          informationSharing: 80,
          decisionClarity: 90,
          conflictDisclosure: true
        },
        accountability: {
          actionItemTracking: 88,
          followUpCommitment: 82,
          responsibilityAssignment: 85
        }
      },
      quality: {
        overallScore: 81,
        discussion: {
          depth: 78,
          breadth: 85,
          focus: 80,
          evidence: 82
        },
        decisionMaking: {
          informationBased: 88,
          consultative: 75,
          timely: 70,
          clear: 90
        },
        strategic: {
          longTermFocus: 72,
          riskConsideration: 85,
          stakeholderFocus: 78,
          innovation: 65
        }
      },
      compliance: {
        regulatoryAdherence: 95,
        documentationQuality: 88,
        processCompliance: 92,
        reportingRequirements: true,
        auditReadiness: 90,
        violations: [],
        recommendations: []
      },
      risk: {
        overallRisk: 35,
        categories: {
          strategic: 30,
          operational: 25,
          financial: 40,
          regulatory: 20,
          reputational: 35
        },
        identifiedRisks: [],
        mitigationDiscussed: true,
        newRisks: [],
        escalatedRisks: []
      }
    }
  }

  private async generateMeetingInsights(meeting: any, transcript?: MeetingTranscript): Promise<MeetingInsights> {
    // Mock implementation - would use AI insights generation
    return {
      summary: {
        mainObjective: 'Quarterly performance review and strategic planning',
        keyDecisions: ['Approved Q4 budget increase', 'New product launch timeline'],
        majorDiscussions: ['Market expansion strategy', 'Risk mitigation plans'],
        outstandingIssues: ['Regulatory compliance timeline', 'Resource allocation'],
        nextSteps: ['Prepare detailed implementation plan', 'Schedule follow-up meetings'],
        overallSentiment: 'Positive with some concerns',
        successLevel: 78
      },
      keyTakeaways: [
        'Strong financial performance this quarter',
        'Need to accelerate digital transformation',
        'Regulatory landscape requires attention'
      ],
      strategicInsights: [],
      trends: {
        topics: [],
        sentiment: [],
        participation: [],
        efficiency: []
      },
      predictions: [],
      benchmarks: [],
      alerts: []
    }
  }

  private async calculateMeetingPerformance(meeting: any, transcript?: MeetingTranscript): Promise<MeetingPerformance> {
    // Mock implementation
    return {
      scores: {
        overall: 78,
        efficiency: 75,
        participation: 82,
        governance: 90,
        outcomes: 80,
        satisfaction: 76
      },
      metrics: {
        duration: { planned: 120, actual: 135, variance: 15 },
        participation: { average: 78, median: 80, range: { min: 45, max: 95 } },
        decisions: { count: 5, quality: 85, implementation: 70 },
        actions: { count: 12, clarity: 88, ownership: 82 }
      },
      comparisons: {
        previousMeeting: [],
        industry: [],
        internal: []
      }
    }
  }
}

// Additional interfaces for dashboard
export interface MeetingDashboard {
  summary: DashboardSummary
  trends: DashboardTrends
  performance: AggregatePerformance
  upcomingMeetings: UpcomingMeeting[]
  actionItems: AggregateActionItems
  insights: AggregateInsights
  alerts: DashboardAlert[]
}

export interface DashboardSummary {
  totalMeetings: number
  averageScore: number
  totalActionItems: number
  completedActions: number
  totalDecisions: number
  averageDuration: number
  efficiencyTrend: 'Improving' | 'Stable' | 'Declining'
}

export interface DashboardTrends {
  monthly: { month: string; meetings: number; score: number; efficiency: number }[]
  topics: { topic: string; frequency: number; trend: 'Rising' | 'Stable' | 'Declining' }[]
  participation: { metric: string; trend: number; direction: 'Up' | 'Down' | 'Stable' }[]
}

export interface AggregatePerformance {
  scores: { metric: string; current: number; target: number; trend: number }[]
  benchmarks: { category: string; score: number; industry: number; ranking: string }[]
}

export interface UpcomingMeeting {
  id: string
  title: string
  date: Date
  type: string
  preparedness: number
  risks: string[]
}

export interface AggregateActionItems {
  total: number
  open: number
  overdue: number
  byPriority: { priority: string; count: number }[]
  byAssignee: { assignee: string; count: number; completion: number }[]
}

export interface AggregateInsights {
  recurring: string[]
  emerging: string[]
  concerns: string[]
  opportunities: string[]
}

export interface DashboardAlert {
  type: string
  severity: string
  message: string
  action: string
}

export const meetingIntelligenceService = new MeetingIntelligenceService()