/**
 * AI-Powered Meeting Summarization & Insights Types
 * 
 * Comprehensive type definitions for enterprise-grade AI meeting analysis system
 * following the DDD architecture with branded types and Result patterns
 */

import type {
  UserId,
  OrganizationId,
  MeetingId,
  MeetingTranscriptionId,
  TranscriptionSegmentId,
  SpeakerIdentificationId,
  MeetingSummaryId,
  ActionItemExtractionId,
  DecisionTrackingId,
  SentimentAnalysisId,
  MeetingInsightId,
  EngagementMetricId,
  TopicAnalysisId,
  ComplianceRiskId,
  MeetingPatternId,
  PredictiveOutcomeId,
  SmartAgendaId,
  FollowUpRecommendationId,
  ConflictPredictionId,
  GovernanceInsightId,
  AIModelConfigId,
  MLPipelineId,
  SpeakerAnalyticsId
} from './branded'
import type { ISODateString, Timestamp } from './branded'

// ==== Core Meeting Analysis Types ====

/**
 * Real-time meeting transcription with AI analysis
 */
export interface MeetingTranscription {
  readonly id: MeetingTranscriptionId
  readonly meetingId: MeetingId
  readonly organizationId: OrganizationId
  readonly title: string
  readonly status: TranscriptionStatus
  readonly audioConfig: AudioConfiguration
  readonly segments: TranscriptionSegment[]
  readonly speakers: SpeakerProfile[]
  readonly metadata: TranscriptionMetadata
  readonly createdBy: UserId
  readonly createdAt: ISODateString
  readonly updatedAt: ISODateString
  readonly completedAt?: ISODateString
}

export type TranscriptionStatus = 
  | 'initializing'
  | 'recording'
  | 'processing'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'archived'

export interface AudioConfiguration {
  readonly sampleRate: number
  readonly channels: number
  readonly bitDepth: number
  readonly format: 'wav' | 'mp3' | 'flac' | 'webm'
  readonly noiseReduction: boolean
  readonly echoCancellation: boolean
  readonly autoGainControl: boolean
}

/**
 * Individual transcription segment with AI enhancements
 */
export interface TranscriptionSegment {
  readonly id: TranscriptionSegmentId
  readonly transcriptionId: MeetingTranscriptionId
  readonly text: string
  readonly originalAudioHash: string
  readonly startTime: Timestamp
  readonly endTime: Timestamp
  readonly speakerId?: SpeakerIdentificationId
  readonly confidence: number // 0.0 - 1.0
  readonly language: string
  readonly translations?: Record<string, string>
  readonly sentiment?: SentimentScore
  readonly topics?: string[]
  readonly actionItems?: string[]
  readonly decisions?: string[]
  readonly keywords?: string[]
  readonly processing: SegmentProcessingStatus
  readonly createdAt: ISODateString
}

export type SegmentProcessingStatus = {
  readonly transcribed: boolean
  readonly speakerIdentified: boolean
  readonly sentimentAnalyzed: boolean
  readonly topicExtracted: boolean
  readonly actionItemsExtracted: boolean
  readonly decisionsExtracted: boolean
}

/**
 * Speaker identification and analytics
 */
export interface SpeakerProfile {
  readonly id: SpeakerIdentificationId
  readonly transcriptionId: MeetingTranscriptionId
  readonly userId?: UserId
  readonly name: string
  readonly email?: string
  readonly role?: string
  readonly voiceFingerprint: string
  readonly confidence: number
  readonly speakingMetrics: SpeakingMetrics
  readonly engagementScore: number
  readonly contributionAnalysis: ContributionAnalysis
  readonly firstAppearance: Timestamp
  readonly lastAppearance: Timestamp
}

export interface SpeakingMetrics {
  readonly totalSpeakingTime: number // milliseconds
  readonly averageSegmentLength: number
  readonly wordsPerMinute: number
  readonly pauseFrequency: number
  readonly interruptionCount: number
  readonly sentimentDistribution: Record<SentimentCategory, number>
}

export interface ContributionAnalysis {
  readonly participationPercentage: number
  readonly topicLeadership: string[]
  readonly questionAsked: number
  readonly decisionsInfluenced: number
  readonly actionItemsOwned: number
  readonly expertiseAreas: string[]
}

// ==== AI Analysis Types ====

/**
 * Comprehensive meeting summary with AI insights
 */
export interface AIMeetingSummary {
  readonly id: MeetingSummaryId
  readonly transcriptionId: MeetingTranscriptionId
  readonly organizationId: OrganizationId
  readonly executiveSummary: string
  readonly keyTopics: TopicAnalysis[]
  readonly majorDecisions: DecisionSummary[]
  readonly actionItemsSummary: ActionItemSummary[]
  readonly participantInsights: ParticipantInsight[]
  readonly meetingEffectiveness: EffectivenessScore
  readonly complianceFlags: ComplianceFlag[]
  readonly followUpRecommendations: FollowUpRecommendation[]
  readonly generatedAt: ISODateString
  readonly model: AIModelInfo
  readonly confidence: number
}

export interface TopicAnalysis {
  readonly id: TopicAnalysisId
  readonly topic: string
  readonly category: TopicCategory
  readonly timeSpent: number // minutes
  readonly participantEngagement: Record<SpeakerIdentificationId, number>
  readonly keyPoints: string[]
  readonly outcomes: string[]
  readonly priority: 'critical' | 'high' | 'medium' | 'low'
  readonly relatedDecisions: DecisionTrackingId[]
}

export type TopicCategory = 
  | 'strategic'
  | 'operational'
  | 'financial'
  | 'compliance'
  | 'governance'
  | 'risk'
  | 'technology'
  | 'human-resources'
  | 'other'

/**
 * AI-enhanced action item extraction
 */
export interface AIActionItem {
  readonly id: ActionItemExtractionId
  readonly transcriptionId: MeetingTranscriptionId
  readonly extractedText: string
  readonly processedDescription: string
  readonly assignee?: {
    readonly speakerId: SpeakerIdentificationId
    readonly userId?: UserId
    readonly name: string
    readonly confidence: number
  }
  readonly dueDate?: {
    readonly date: ISODateString
    readonly confidence: number
    readonly source: 'explicit' | 'inferred' | 'default'
  }
  readonly priority: {
    readonly level: 'critical' | 'high' | 'medium' | 'low'
    readonly confidence: number
    readonly reasoning: string[]
  }
  readonly category: string
  readonly complexity: ComplexityScore
  readonly dependencies: string[]
  readonly estimatedHours?: number
  readonly riskFactors: string[]
  readonly complianceRelevant: boolean
  readonly status: ActionItemStatus
  readonly extractedAt: ISODateString
  readonly lastAnalyzed: ISODateString
}

export type ActionItemStatus = 
  | 'extracted'
  | 'validated'
  | 'assigned'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'overdue'

export interface ComplexityScore {
  readonly technical: number // 0-10
  readonly organizational: number // 0-10
  readonly timeline: number // 0-10
  readonly overall: number // 0-10
  readonly factors: string[]
}

/**
 * AI-powered decision tracking
 */
export interface AIDecisionTracking {
  readonly id: DecisionTrackingId
  readonly transcriptionId: MeetingTranscriptionId
  readonly title: string
  readonly context: string
  readonly discussionSummary: string
  readonly stakeholders: DecisionStakeholder[]
  readonly votingAnalysis?: VotingAnalysis
  readonly consensus: ConsensusAnalysis
  readonly implementationPlan: ImplementationStep[]
  readonly riskAssessment: RiskAssessment
  readonly complianceImplications: ComplianceImplication[]
  readonly followUpRequired: boolean
  readonly confidence: number
  readonly extractedAt: ISODateString
}

export interface DecisionStakeholder {
  readonly speakerId: SpeakerIdentificationId
  readonly name: string
  readonly position: 'supporter' | 'opponent' | 'neutral' | 'abstain'
  readonly influence: number // 0-10
  readonly arguments: string[]
  readonly confidence: number
}

export interface VotingAnalysis {
  readonly votesCast: number
  readonly votesFor: number
  readonly votesAgainst: number
  readonly abstentions: number
  readonly quorumMet: boolean
  readonly majorityAchieved: boolean
  readonly unanimity: boolean
}

export interface ConsensusAnalysis {
  readonly level: number // 0-100
  readonly methodology: 'unanimous' | 'majority' | 'plurality' | 'consensus-building'
  readonly timeToConsensus: number // minutes
  readonly controversyLevel: number // 0-10
  readonly remainingConcerns: string[]
}

// ==== Advanced Analytics Types ====

/**
 * Sentiment analysis with granular insights
 */
export interface SentimentAnalysis {
  readonly id: SentimentAnalysisId
  readonly transcriptionId: MeetingTranscriptionId
  readonly overallSentiment: SentimentScore
  readonly speakerSentiments: Record<SpeakerIdentificationId, SentimentProfile>
  readonly topicSentiments: Record<string, SentimentScore>
  readonly sentimentEvolution: SentimentTimeline[]
  readonly emotionalHighlights: EmotionalHighlight[]
  readonly conflictDetection: ConflictIndicator[]
  readonly engagementIndicators: EngagementIndicator[]
  readonly analyzedAt: ISODateString
}

export interface SentimentScore {
  readonly polarity: number // -1 to 1
  readonly magnitude: number // 0 to 1
  readonly category: SentimentCategory
  readonly confidence: number
}

export type SentimentCategory = 
  | 'very-positive'
  | 'positive' 
  | 'neutral'
  | 'negative'
  | 'very-negative'
  | 'mixed'

export interface SentimentProfile {
  readonly averageSentiment: SentimentScore
  readonly sentimentRange: number
  readonly emotionalStability: number
  readonly dominantEmotion: string
  readonly stressIndicators: string[]
}

export interface SentimentTimeline {
  readonly timestamp: Timestamp
  readonly sentiment: SentimentScore
  readonly speakers: SpeakerIdentificationId[]
  readonly context: string
}

/**
 * Meeting effectiveness and engagement metrics
 */
export interface MeetingInsights {
  readonly id: MeetingInsightId
  readonly transcriptionId: MeetingTranscriptionId
  readonly organizationId: OrganizationId
  readonly effectivenessScore: EffectivenessScore
  readonly engagementMetrics: EngagementMetrics
  readonly productivityMetrics: ProductivityMetrics
  readonly communicationPatterns: CommunicationPattern[]
  readonly improvementRecommendations: ImprovementRecommendation[]
  readonly benchmarkComparison: BenchmarkComparison
  readonly trendAnalysis: TrendAnalysis
  readonly predictiveInsights: PredictiveInsight[]
  readonly generatedAt: ISODateString
}

export interface EffectivenessScore {
  readonly overall: number // 0-100
  readonly dimensions: {
    readonly clarity: number
    readonly participation: number
    readonly decisiveness: number
    readonly actionOrientation: number
    readonly timeManagement: number
    readonly goalAlignment: number
  }
  readonly factors: EffectivenessFactor[]
  readonly improvementAreas: string[]
}

export interface EffectivenessFactor {
  readonly category: string
  readonly impact: number // -10 to 10
  readonly description: string
  readonly recommendation: string
}

export interface EngagementMetrics {
  readonly averageEngagement: number // 0-100
  readonly speakerEngagement: Record<SpeakerIdentificationId, EngagementProfile>
  readonly peakEngagementMoments: EngagementPeak[]
  readonly disengagementSignals: DisengagementSignal[]
  readonly participationBalance: number // 0-100 (100 = perfectly balanced)
}

export interface EngagementProfile {
  readonly participationRate: number
  readonly initiativeScore: number
  readonly responsiveness: number
  readonly questioningFrequency: number
  readonly buildingOnOthers: number
  readonly topicOwnership: string[]
}

// ==== Predictive Analytics Types ====

/**
 * Pattern recognition and predictive insights
 */
export interface MeetingPatternAnalysis {
  readonly id: MeetingPatternId
  readonly organizationId: OrganizationId
  readonly analysisWindow: DateRange
  readonly patterns: DetectedPattern[]
  readonly trends: Trend[]
  readonly anomalies: Anomaly[]
  readonly predictions: Prediction[]
  readonly recommendedActions: RecommendedAction[]
  readonly modelAccuracy: ModelAccuracy
  readonly analyzedAt: ISODateString
}

export interface DetectedPattern {
  readonly type: PatternType
  readonly description: string
  readonly frequency: number
  readonly confidence: number
  readonly examples: PatternExample[]
  readonly impact: PatternImpact
}

export type PatternType = 
  | 'recurring-topic'
  | 'decision-delay'
  | 'action-item-overflow'
  | 'participation-imbalance'
  | 'sentiment-cycling'
  | 'time-overrun'
  | 'agenda-deviation'
  | 'conflict-escalation'

export interface Prediction {
  readonly type: PredictionType
  readonly description: string
  readonly probability: number
  readonly timeframe: string
  readonly impact: ImpactLevel
  readonly preventionStrategies: string[]
  readonly monitoringMetrics: string[]
}

export type PredictionType = 
  | 'meeting-outcome'
  | 'decision-timeline'
  | 'conflict-likelihood'
  | 'action-completion'
  | 'engagement-trend'
  | 'compliance-risk'

// ==== AI Model Management Types ====

/**
 * AI model configuration and management
 */
export interface AIModelConfiguration {
  readonly id: AIModelConfigId
  readonly name: string
  readonly version: string
  readonly provider: AIProvider
  readonly capabilities: AICapability[]
  readonly config: ModelConfig
  readonly performance: ModelPerformance
  readonly usage: ModelUsage
  readonly lastUpdated: ISODateString
}

export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'huggingface'
  | 'openrouter'
  | 'azure-openai'
  | 'aws-bedrock'

export type AICapability = 
  | 'transcription'
  | 'sentiment-analysis'
  | 'topic-extraction'
  | 'action-item-extraction'
  | 'decision-tracking'
  | 'speaker-identification'
  | 'meeting-summarization'
  | 'predictive-analysis'

export interface ModelConfig {
  readonly temperature: number
  readonly maxTokens: number
  readonly topP: number
  readonly frequencyPenalty: number
  readonly presencePenalty: number
  readonly customInstructions: string
  readonly promptTemplates: Record<string, string>
}

export interface ModelPerformance {
  readonly accuracy: number
  readonly latency: number // milliseconds
  readonly throughput: number // requests per minute
  readonly errorRate: number
  readonly costPerRequest: number
  readonly qualityScore: number
}

export interface ModelUsage {
  readonly totalRequests: number
  readonly successfulRequests: number
  readonly failedRequests: number
  readonly totalTokensUsed: number
  readonly totalCost: number
  readonly lastUsed: ISODateString
}

// ==== Utility Types ====

export interface DateRange {
  readonly start: ISODateString
  readonly end: ISODateString
}

export interface TranscriptionMetadata {
  readonly duration: number // milliseconds
  readonly wordCount: number
  readonly speakerCount: number
  readonly languagesDetected: string[]
  readonly qualityMetrics: QualityMetrics
  readonly processingTime: number
  readonly modelVersions: Record<string, string>
}

export interface QualityMetrics {
  readonly audioQuality: number // 0-10
  readonly transcriptionAccuracy: number // 0-1
  readonly speakerIdentificationAccuracy: number // 0-1
  readonly backgroundNoiseLevel: number // 0-10
  readonly speechClarity: number // 0-10
}

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low'

export interface ActionItemSummary {
  readonly total: number
  readonly byPriority: Record<string, number>
  readonly byAssignee: Record<string, number>
  readonly averageComplexity: number
  readonly estimatedTotalHours: number
}

export interface DecisionSummary {
  readonly total: number
  readonly approved: number
  readonly rejected: number
  readonly deferred: number
  readonly averageConsensusTime: number
  readonly controversyLevel: number
}

export interface ParticipantInsight {
  readonly speakerId: SpeakerIdentificationId
  readonly name: string
  readonly role: string
  readonly participationScore: number
  readonly leadershipIndicators: string[]
  readonly expertiseAreas: string[]
  readonly communicationStyle: CommunicationStyle
  readonly influenceMetrics: InfluenceMetrics
}

export interface CommunicationStyle {
  readonly dominant: boolean
  readonly collaborative: boolean
  readonly analytical: boolean
  readonly emotional: boolean
  readonly directive: boolean
  readonly supportive: boolean
}

export interface InfluenceMetrics {
  readonly decisionInfluence: number
  readonly topicShaping: number
  readonly questionGeneration: number
  readonly ideaGeneration: number
  readonly consensusBuilding: number
}

// ==== Export Collections ====

export type AIAnalysisResult = 
  | MeetingTranscription
  | AIMeetingSummary 
  | AIActionItem
  | AIDecisionTracking
  | SentimentAnalysis
  | MeetingInsights
  | MeetingPatternAnalysis

export type AIModelResult = 
  | AIModelConfiguration
  | ModelPerformance
  | ModelUsage

export type MeetingAnalyticsData = 
  | EffectivenessScore
  | EngagementMetrics
  | ProductivityMetrics
  | SentimentAnalysis
  | TopicAnalysis

// Additional types referenced but not fully defined above
export interface EmotionalHighlight {
  readonly timestamp: Timestamp
  readonly emotion: string
  readonly intensity: number
  readonly speaker: SpeakerIdentificationId
  readonly context: string
}

export interface ConflictIndicator {
  readonly type: 'disagreement' | 'tension' | 'interruption' | 'frustration'
  readonly severity: number
  readonly participants: SpeakerIdentificationId[]
  readonly timestamp: Timestamp
  readonly resolution?: string
}

export interface EngagementIndicator {
  readonly type: 'question' | 'agreement' | 'building-on' | 'challenging'
  readonly timestamp: Timestamp
  readonly speaker: SpeakerIdentificationId
  readonly target?: SpeakerIdentificationId
}

export interface EngagementPeak {
  readonly timestamp: Timestamp
  readonly level: number
  readonly triggers: string[]
  readonly participants: SpeakerIdentificationId[]
}

export interface DisengagementSignal {
  readonly timestamp: Timestamp
  readonly type: 'silence' | 'distraction' | 'repetition' | 'off-topic'
  readonly speaker: SpeakerIdentificationId
  readonly duration: number
}

export interface ProductivityMetrics {
  readonly decisionsPerHour: number
  readonly actionItemsPerHour: number
  readonly timeToDecision: number
  readonly agendaAdherence: number
  readonly focusScore: number
}

export interface CommunicationPattern {
  readonly type: 'turn-taking' | 'interruption' | 'building' | 'questioning'
  readonly frequency: number
  readonly participants: SpeakerIdentificationId[]
  readonly effectiveness: number
}

export interface ImprovementRecommendation {
  readonly category: string
  readonly priority: 'high' | 'medium' | 'low'
  readonly description: string
  readonly actionSteps: string[]
  readonly expectedImpact: string
}

export interface BenchmarkComparison {
  readonly industryAverage: Record<string, number>
  readonly organizationHistory: Record<string, number>
  readonly peerComparison: Record<string, number>
  readonly improvementOpportunities: string[]
}

export interface TrendAnalysis {
  readonly timeframe: string
  readonly trends: Trend[]
  readonly seasonality: string[]
  readonly projections: string[]
}

export interface Trend {
  readonly metric: string
  readonly direction: 'improving' | 'declining' | 'stable'
  readonly magnitude: number
  readonly confidence: number
}

export interface PredictiveInsight {
  readonly type: string
  readonly prediction: string
  readonly probability: number
  readonly timeframe: string
  readonly recommendation: string
}

export interface ComplianceFlag {
  readonly type: 'governance' | 'regulatory' | 'policy' | 'risk'
  readonly severity: 'critical' | 'high' | 'medium' | 'low'
  readonly description: string
  readonly recommendation: string
  readonly segment: TranscriptionSegmentId
}

export interface FollowUpRecommendation {
  readonly type: 'meeting' | 'action' | 'decision' | 'communication'
  readonly priority: 'urgent' | 'high' | 'medium' | 'low'
  readonly description: string
  readonly suggestedTimeframe: string
  readonly participants: SpeakerIdentificationId[]
}

export interface AIModelInfo {
  readonly provider: AIProvider
  readonly model: string
  readonly version: string
  readonly confidence: number
}

export interface PatternExample {
  readonly transcriptionId: MeetingTranscriptionId
  readonly timestamp: Timestamp
  readonly description: string
}

export interface PatternImpact {
  readonly positive: string[]
  readonly negative: string[]
  readonly neutral: string[]
}

export interface RecommendedAction {
  readonly priority: 'high' | 'medium' | 'low'
  readonly category: string
  readonly description: string
  readonly expectedOutcome: string
  readonly timeline: string
}

export interface ModelAccuracy {
  readonly overall: number
  readonly byCapability: Record<AICapability, number>
  readonly confidenceIntervals: Record<string, [number, number]>
}

export interface Anomaly {
  readonly type: string
  readonly description: string
  readonly severity: number
  readonly timestamp: Timestamp
  readonly affectedMetrics: string[]
}

export interface RiskAssessment {
  readonly level: 'critical' | 'high' | 'medium' | 'low'
  readonly factors: string[]
  readonly mitigationStrategies: string[]
  readonly monitoringRequired: boolean
}

export interface ComplianceImplication {
  readonly framework: string
  readonly requirement: string
  readonly impact: string
  readonly actionRequired: string
}

export interface ImplementationStep {
  readonly order: number
  readonly description: string
  readonly owner?: string
  readonly timeline: string
  readonly dependencies: string[]
}