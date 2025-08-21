/**
 * Comprehensive Voice API Type Definitions
 * Consolidated types for voice assistant, biometric, scheduling, and workflow systems
 */

import { Database } from './database';

// Base types
export type SupabaseClient = any; // Will be properly typed elsewhere
export type User = Database['public']['Tables']['users']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];

// Voice Assistant Types
export interface VoiceAssistantSession {
  id: string;
  userId: string;
  organizationId: string;
  conversationHistory: ConversationEntry[];
  contextState: ContextState;
  proactiveInsights: ProactiveInsight[];
  createdAt: string;
  lastActivity: string;
  isActive: boolean;
}

export interface ConversationEntry {
  id: string;
  timestamp: string;
  type: 'user_voice' | 'user_text' | 'assistant_voice' | 'assistant_text' | 'system_insight';
  content: string;
  audioUrl?: string;
  emotion?: string;
  stressLevel?: number;
  urgencyLevel?: number;
  confidence: number;
  intent?: VoiceIntent;
  entities?: ExtractedEntity[];
  followUpRequired?: boolean;
  escalationTriggered?: boolean;
}

export interface ContextState {
  currentFocus: 'dashboard' | 'documents' | 'meetings' | 'compliance' | 'analysis' | 'general';
  activeDocument?: string;
  activeMeeting?: string;
  activeVault?: string;
  currentPage?: string;
  recentDocuments: string[];
  upcomingMeetings: string[];
  pendingTasks: string[];
  riskAlerts: string[];
  complianceDeadlines: string[];
  interruptionContext?: InterruptionContext;
}

export interface InterruptionContext {
  pausedAt: string;
  contextSummary: string;
  urgencyLevel: number;
  resumptionCue: string;
  preservedState: Record<string, unknown>;
}

export interface ProactiveInsight {
  id: string;
  type: InsightType;
  category: 'strategic' | 'operational' | 'compliance' | 'risk' | 'governance';
  title: string;
  description: string;
  detailedAnalysis: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  relevanceScore: number;
  
  // Evidence and supporting data
  evidence: InsightEvidence[];
  supportingDocuments: DocumentReference[];
  relatedMeetings: MeetingReference[];
  stakeholdersAffected: StakeholderReference[];
  
  // Actionable recommendations
  recommendations: ActionableRecommendation[];
  nextSteps: string[];
  timeline: TimelineItem[];
  
  // Context and timing
  contextTriggers: ContextTrigger[];
  optimalTiming: string;
  expiryConditions: string[];
  
  // Metadata
  createdAt: string;
  scheduledFor?: string;
  acknowledgedAt?: string;
  dismissedAt?: string;
  escalatedAt?: string;
  
  // Personalization
  personalizedToUser: boolean;
  communicationStyle: 'concise' | 'detailed' | 'technical' | 'executive_summary';
  deliveryPreference: 'immediate' | 'scheduled' | 'digest';
}

export interface VoiceIntent {
  intent: string;
  confidence: number;
  domain: 'board_governance' | 'document_management' | 'meeting_management' | 'compliance' | 'analytics' | 'general';
  action: string;
  parameters: Record<string, unknown>;
}

export interface ExtractedEntity {
  type: 'document' | 'meeting' | 'person' | 'date' | 'metric' | 'company' | 'topic';
  value: string;
  confidence: number;
  context: string;
}

export interface VoiceAssistantRequest {
  sessionId?: string;
  audioData?: string;
  textInput?: string;
  requestType: 'voice_query' | 'text_query' | 'proactive_insight' | 'context_resume' | 'session_init';
  context?: {
    currentPage?: string;
    organizationId: string;
    vaultId?: string;
    documentId?: string;
    meetingId?: string;
    emotionState?: Record<string, unknown>;
  };
  preferences?: {
    responseMode: 'voice_only' | 'text_only' | 'voice_with_text';
    verbosityLevel: 'concise' | 'balanced' | 'detailed';
    proactiveLevel: 'minimal' | 'moderate' | 'aggressive';
    voicePersonality: 'professional' | 'friendly' | 'supportive';
  };
}

export interface VoiceAssistantResponse {
  success: boolean;
  sessionId: string;
  response: {
    text: string;
    audioUrl?: string;
    emotion?: string;
    intent?: VoiceIntent;
    confidence: number;
  };
  proactiveInsights?: ProactiveInsight[];
  contextUpdates?: Partial<ContextState>;
  followUpSuggestions?: string[];
  recommendations?: BoardRecommendation[];
  analytics?: BoardAnalytics;
  interruption?: InterruptionData;
  error?: string;
}

// Board Analytics Types
export interface BoardAnalytics {
  type: 'revenue_trends' | 'risk_metrics' | 'compliance_status' | 'performance_kpis' | 'governance_health';
  summary: string;
  keyMetrics: Record<string, number>;
  trends: TrendData[];
  alerts: AlertData[];
  visualizationUrl?: string;
}

export interface TrendData {
  metric: string;
  current: number;
  previous: number;
  change: number;
  direction: 'up' | 'down' | 'stable';
  significance: 'minor' | 'moderate' | 'major';
}

export interface AlertData {
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold: number;
  current: number;
  recommendedAction: string;
}

export interface BoardRecommendation {
  type: 'meeting_preparation' | 'document_review' | 'compliance_action' | 'risk_mitigation' | 'strategic_planning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeline: string;
  requiredActions: string[];
  relatedItems: string[];
  estimatedTime: number;
}

export interface InterruptionData {
  canInterrupt: boolean;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  contextPreservation: boolean;
  estimatedResumeTime: number;
}

// Meeting Preparation Types
export interface MeetingPreparation {
  meetingId: string;
  meetingDetails: MeetingDetails;
  agendaAnalysis: AgendaAnalysis;
  documentPackage: DocumentPackage;
  stakeholderPreparation: StakeholderPreparation;
  riskAssessment: MeetingRiskAssessment;
  complianceReview: ComplianceReview;
  discussionGuides: DiscussionGuide[];
  keyDecisionPoints: DecisionPoint[];
  followUpActions: FollowUpAction[];
  contextualInsights: ContextualInsight[];
  preparationTimeline: PreparationTimeline;
  generatedAt: string;
}

export interface MeetingDetails {
  id: string;
  title: string;
  type: string;
  date: string;
  duration: number;
  attendees: MeetingAttendee[];
  location: string;
  objectives: string[];
  expectedOutcomes: string[];
}

export interface MeetingAttendee {
  id: string;
  name: string;
  role: string;
  department: string;
  preparationStatus: 'not_started' | 'in_progress' | 'completed';
  keyTopicsOfInterest: string[];
  decisionMakingAuthority: string[];
  backgroundNeeded: string[];
}

export interface AgendaAnalysis {
  totalItems: number;
  estimatedDuration: number;
  itemBreakdown: AgendaItemAnalysis[];
  timeAllocation: TimeAllocation;
  criticalPath: string[];
  potentialOverruns: string[];
  dependencyMap: AgendaDependency[];
}

export interface AgendaItemAnalysis {
  id: string;
  title: string;
  type: 'discussion' | 'decision' | 'information' | 'action';
  estimatedTime: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex';
  requiredPreparation: string[];
  keyStakeholders: string[];
  prerequisites: string[];
  expectedDeliverables: string[];
  riskFactors: string[];
}

export interface TimeAllocation {
  administrative: number;
  discussion: number;
  decision: number;
  information: number;
  buffer: number;
  breakdown: Record<string, number>;
}

export interface AgendaDependency {
  fromItem: string;
  toItem: string;
  dependencyType: 'information' | 'decision' | 'approval' | 'resource';
  critical: boolean;
  description: string;
}

export interface DocumentPackage {
  totalDocuments: number;
  categorizedDocuments: CategorizedDocuments;
  readingTime: ReadingTimeEstimate;
  keyInsights: DocumentInsight[];
  missingDocuments: string[];
  documentRelationships: DocumentRelationship[];
  priorityOrder: string[];
}

export interface CategorizedDocuments {
  pre_read: DocumentSummary[];
  reference: DocumentSummary[];
  supporting: DocumentSummary[];
  background: DocumentSummary[];
  appendices: DocumentSummary[];
}

export interface DocumentSummary {
  id: string;
  title: string;
  type: string;
  pageCount?: number;
  estimatedReadTime: number;
  summary: string;
  keyPoints: string[];
  relevanceToAgenda: string[];
  criticality: 'essential' | 'important' | 'optional';
  lastUpdated: string;
  author: string;
  downloadUrl: string;
}

export interface ReadingTimeEstimate {
  total: number;
  byPriority: {
    essential: number;
    important: number;
    optional: number;
  };
  byAttendee: Record<string, number>;
}

export interface DocumentInsight {
  category: 'financial' | 'strategic' | 'risk' | 'compliance' | 'operational';
  insight: string;
  supportingEvidence: string[];
  relevantAgendaItems: string[];
  actionRequired: boolean;
  urgency: 'low' | 'medium' | 'high';
}

export interface DocumentRelationship {
  documentIds: string[];
  relationshipType: 'complementary' | 'contradictory' | 'sequential' | 'comparative';
  description: string;
  implications: string[];
}

export interface StakeholderPreparation {
  attendeePreparation: AttendeePreparation[];
  externalStakeholderContext: ExternalStakeholderContext[];
  influenceMap: InfluenceMap;
  communicationPlan: CommunicationPlan;
}

export interface AttendeePreparation {
  attendeeId: string;
  name: string;
  role: string;
  preparationNeeds: PreparationNeed[];
  briefingPoints: string[];
  questionsToExpect: string[];
  decisionPointsInvolvement: string[];
  backgroundBriefing: string;
  estimatedPrepTime: number;
}

export interface PreparationNeed {
  category: 'document_review' | 'data_analysis' | 'stakeholder_consultation' | 'research';
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  dependencies: string[];
  resources: string[];
}

export interface ExternalStakeholderContext {
  stakeholder: string;
  relationship: string;
  currentStatus: string;
  relevantToAgenda: string[];
  potentialImpact: 'positive' | 'neutral' | 'negative';
  communicationNeeded: boolean;
}

export interface InfluenceMap {
  decisionMakers: string[];
  influencers: string[];
  experts: string[];
  stakeholders: string[];
  relationships: StakeholderRelationship[];
}

export interface StakeholderRelationship {
  from: string;
  to: string;
  relationshipType: 'reports_to' | 'collaborates_with' | 'influences' | 'expert_to';
  strength: 'weak' | 'moderate' | 'strong';
}

export interface CommunicationPlan {
  preeMeetingCommunications: Communication[];
  duringMeetingProtocol: MeetingProtocol;
  postMeetingFollowUp: FollowUpCommunication[];
}

export interface Communication {
  recipient: string;
  type: 'email' | 'phone' | 'meeting' | 'document';
  timing: string;
  purpose: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
}

export interface MeetingProtocol {
  facilitation: FacilitationGuidance;
  decisionMaking: DecisionMakingProtocol;
  timeManagement: TimeManagementGuidance;
  conflictResolution: ConflictResolutionGuidance;
}

export interface FacilitationGuidance {
  openingApproach: string;
  participationEncouragement: string[];
  discussionTechniques: string[];
  consensusBuilding: string[];
}

export interface DecisionMakingProtocol {
  decisionMethod: 'consensus' | 'majority' | 'authority' | 'consultative';
  votingProcedure?: string;
  quorumRequirements?: string;
  documentationRequirements: string[];
}

export interface TimeManagementGuidance {
  pacing: string;
  timeKeeping: string[];
  overrunProtocol: string[];
  prioritizationApproach: string;
}

export interface ConflictResolutionGuidance {
  preventionStrategies: string[];
  interventionTechniques: string[];
  escalationProcedure: string[];
}

export interface FollowUpCommunication {
  type: 'meeting_minutes' | 'action_items' | 'decisions_summary' | 'stakeholder_update';
  recipients: string[];
  timeline: string;
  template: string;
}

export interface MeetingRiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: MeetingRisk[];
  mitigationStrategies: RiskMitigation[];
  contingencyPlans: ContingencyPlan[];
  monitoringPoints: string[];
}

export interface MeetingRisk {
  category: 'attendance' | 'preparation' | 'decision_making' | 'time_management' | 'stakeholder_conflict' | 'technical';
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  riskScore: number;
  indicators: string[];
  rootCauses: string[];
}

export interface RiskMitigation {
  riskId: string;
  strategy: string;
  actions: string[];
  responsibility: string[];
  timeline: string;
  successMetrics: string[];
  fallbackPlan?: string;
}

export interface ContingencyPlan {
  scenario: string;
  triggers: string[];
  response: string[];
  responsibility: string[];
  communicationPlan: string;
}

export interface ComplianceReview {
  overallStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';
  governanceRequirements: GovernanceRequirement[];
  regulatoryConsiderations: RegulatoryConsideration[];
  policyCompliance: PolicyCompliance[];
  documentationRequirements: DocumentationRequirement[];
  approvalWorkflows: ApprovalWorkflow[];
}

export interface GovernanceRequirement {
  requirement: string;
  status: 'met' | 'partially_met' | 'not_met' | 'not_applicable';
  evidence: string[];
  gapsIdentified: string[];
  remedialActions: string[];
}

export interface RegulatoryConsideration {
  regulation: string;
  applicability: 'high' | 'medium' | 'low' | 'none';
  requirements: string[];
  complianceStatus: 'compliant' | 'at_risk' | 'non_compliant';
  actions: string[];
  deadlines?: string[];
}

export interface PolicyCompliance {
  policy: string;
  relevantSections: string[];
  complianceLevel: 'full' | 'partial' | 'none';
  deviations: string[];
  justifications: string[];
  approvalRequired: boolean;
}

export interface DocumentationRequirement {
  type: 'meeting_minutes' | 'decision_record' | 'compliance_certificate' | 'audit_trail';
  description: string;
  responsibility: string;
  deadline: string;
  template?: string;
  retentionPeriod: string;
}

export interface ApprovalWorkflow {
  decision: string;
  approvers: string[];
  sequence: 'parallel' | 'sequential';
  criteria: string[];
  documentation: string[];
  timeline: string;
}

export interface DiscussionGuide {
  agendaItemId: string;
  title: string;
  objectives: string[];
  keyQuestions: string[];
  facilitationNotes: string[];
  timeAllocation: number;
  expectedOutcomes: string[];
  successMetrics: string[];
}

export interface DecisionPoint {
  id: string;
  decision: string;
  context: string;
  options: DecisionOption[];
  criteria: string[];
  stakeholders: string[];
  timeline: string;
  dependencies: string[];
  consequences: DecisionConsequence[];
  recommendedApproach: string;
}

export interface DecisionOption {
  option: string;
  pros: string[];
  cons: string[];
  risks: string[];
  costs: string[];
  benefits: string[];
  feasibility: 'high' | 'medium' | 'low';
  stakeholderSupport: string;
}

export interface DecisionConsequence {
  scenario: string;
  impact: string;
  probability: string;
  mitigation: string[];
  monitoring: string[];
}

export interface FollowUpAction {
  category: 'decision_implementation' | 'information_gathering' | 'stakeholder_communication' | 'compliance' | 'monitoring';
  action: string;
  responsibility: string[];
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dependencies: string[];
  successMetrics: string[];
  resources: string[];
}

export interface ContextualInsight {
  category: 'market_context' | 'organizational_context' | 'regulatory_context' | 'stakeholder_context';
  insight: string;
  relevance: string[];
  implications: string[];
  actionable: boolean;
  confidence: number;
  sources: string[];
}

export interface PreparationTimeline {
  totalPreparationTime: number;
  milestones: PreparationMilestone[];
  criticalPath: string[];
  bufferTime: number;
  lastMinuteChecks: string[];
}

export interface PreparationMilestone {
  date: string;
  milestone: string;
  description: string;
  deliverables: string[];
  responsibility: string[];
  dependencies: string[];
  critical: boolean;
}

export interface VoiceBriefing {
  executiveSummary: string;
  audioScript: string;
  keyTalkingPoints: string[];
  anticipatedQuestions: string[];
  criticalReminders: string[];
  estimatedBriefingTime: number;
  audioUrl?: string;
}

export interface PreparationRecommendation {
  category: 'immediate_action' | 'preparation_enhancement' | 'risk_mitigation' | 'efficiency_improvement';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timeline: string;
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
  resources: string[];
  successMetrics: string[];
}

export interface PreparationAlert {
  type: 'missing_document' | 'insufficient_time' | 'stakeholder_unavailable' | 'compliance_risk' | 'preparation_gap';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendedAction: string;
  deadline?: string;
  escalationRequired: boolean;
}

// Voice Analytics Types
export interface BoardAnalyticsRequest {
  organizationId: string;
  analysisType: 'revenue_trends' | 'risk_assessment' | 'compliance_status' | 'performance_kpis' | 'governance_health' | 'comprehensive';
  timeframe: '30d' | '90d' | '6m' | '1y' | 'ytd';
  includeForecasting?: boolean;
  includeBenchmarking?: boolean;
  voiceOptimized?: boolean;
}

export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  significance: 'minor' | 'moderate' | 'major' | 'critical';
  benchmark?: number;
  target?: number;
}

// Organization Context Types
export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  title: string;
  description: string;
  file_type: string;
  file_size: number;
  category: string;
  tags: string[];
  organization_id: string;
  vault_id: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  meeting_date: string;
  meeting_type: string;
  duration?: number;
  location?: string;
  status: string;
  agenda_items?: unknown[];
  attendees?: unknown[];
  objectives?: string[];
  expected_outcomes?: string[];
  organization_id: string;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  totalCount?: number;
  hasMore?: boolean;
  nextCursor?: string;
}

// Meeting Context Types
export interface MeetingContext {
  meeting: Meeting;
  relatedDocuments: Asset[];
  previousMeetings: Meeting[];
  attendeeProfiles: MeetingAttendee[];
  organization: Organization;
  compliance: ComplianceWorkflow[];
  risks: RiskAssessment[];
  lookbackDate: string;
}

export interface ComplianceWorkflow {
  id: string;
  workflow_name: string;
  due_date: string;
  status: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  id: string;
  category: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation_strategies: string[];
  monitoring_approach: string;
  assessment_date: string;
  organization_id: string;
}

// Voice Assistant Supporting Types
export interface EmotionAnalysis {
  emotionId: string;
  userId: string;
  sessionId?: string;
  dominantEmotion: string;
  emotionScores: Record<string, number>;
  stressLevel: number;
  urgencyLevel: number;
  cognitiveLoad: number;
  arousal: number;
  valence: number;
  confidence: number;
  escalationRecommended: boolean;
  supportNeeded: boolean;
  timestamp: string;
}

export interface VoiceAssistantContext {
  currentPage?: string;
  organizationId: string;
  vaultId?: string;
  documentId?: string;
  meetingId?: string;
  emotionState?: Record<string, unknown>;
}

export interface VoicePreferences {
  responseMode: 'voice_only' | 'text_only' | 'voice_with_text';
  verbosityLevel: 'concise' | 'balanced' | 'detailed';
  proactiveLevel: 'minimal' | 'moderate' | 'aggressive';
  voicePersonality: 'professional' | 'friendly' | 'supportive';
}

export interface SearchResult {
  id: string;
  asset: {
    id: string;
    title: string;
    description?: string;
    file_type: string;
  };
  relevanceScore: number;
  matchedText?: string;
  context?: string;
}

export interface ContextualInfo {
  currentActivity: string;
  focusArea?: string;
  availableActions?: string[];
  relevantData?: Record<string, unknown>;
}

// Insights Types
export interface ProactiveInsightRequest {
  organizationId: string;
  userId?: string;
  contextTriggers: ContextTrigger[];
  insightTypes: InsightType[];
  urgencyThreshold: 'low' | 'medium' | 'high' | 'critical';
  lookbackPeriod: '24h' | '7d' | '30d' | '90d';
  includeForecasting?: boolean;
  includePeerComparison?: boolean;
}

export interface ContextTrigger {
  type: 'document_upload' | 'meeting_scheduled' | 'deadline_approaching' | 'risk_threshold' | 'pattern_detected' | 'anomaly_detected';
  entityId?: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  confidence: number;
}

export type InsightType = 
  | 'document_relationships'
  | 'meeting_preparation'
  | 'compliance_deadlines'
  | 'risk_patterns'
  | 'performance_anomalies'
  | 'strategic_opportunities'
  | 'governance_gaps'
  | 'stakeholder_insights'
  | 'market_trends'
  | 'regulatory_changes';

export interface InsightEvidence {
  type: 'data_point' | 'trend_analysis' | 'pattern_match' | 'anomaly' | 'correlation' | 'external_factor';
  description: string;
  dataSource: string;
  value?: number;
  metadata: Record<string, unknown>;
  confidence: number;
}

export interface DocumentReference {
  id: string;
  title: string;
  type: string;
  relevanceReason: string;
  lastModified: string;
  url: string;
}

export interface MeetingReference {
  id: string;
  title: string;
  date: string;
  type: string;
  relevanceReason: string;
  url: string;
}

export interface StakeholderReference {
  id: string;
  name: string;
  role: string;
  department: string;
  impactLevel: 'low' | 'medium' | 'high';
  requiresNotification: boolean;
}

export interface ActionableRecommendation {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'immediate_action' | 'strategic_planning' | 'risk_mitigation' | 'process_improvement' | 'stakeholder_engagement';
  title: string;
  description: string;
  expectedOutcome: string;
  estimatedEffort: 'low' | 'medium' | 'high';
  timeframe: string;
  dependencies: string[];
  resources: string[];
  successMetrics: string[];
  riskOfInaction: string;
}

export interface TimelineItem {
  date: string;
  milestone: string;
  description: string;
  responsible: string[];
  critical: boolean;
}

export interface ProactiveInsightResponse {
  success: boolean;
  insights: ProactiveInsight[];
  summary: InsightSummary;
  scheduledInsights: ScheduledInsight[];
  analyticsMetadata: AnalyticsMetadata;
  error?: string;
}

export interface InsightSummary {
  totalInsights: number;
  criticalInsights: number;
  highPriorityInsights: number;
  categoryCounts: Record<string, number>;
  avgConfidence: number;
  avgRelevance: number;
  newInsightsSinceLastCheck: number;
}

export interface ScheduledInsight {
  insightId: string;
  scheduledFor: string;
  deliveryMethod: 'voice' | 'notification' | 'email' | 'dashboard';
  conditions: string[];
}

export interface AnalyticsMetadata {
  processingTime: number;
  dataSources: string[];
  algorithmsUsed: string[];
  freshness: Record<string, string>;
  confidence: {
    overall: number;
    byCategory: Record<string, number>;
  };
}

export interface ContextData {
  organization: Organization;
  recentAssets: Asset[];
  upcomingMeetings: Meeting[];
  pastMeetings: Meeting[];
  complianceWorkflows: ComplianceWorkflow[];
  riskAssessments: RiskAssessment[];
  auditActivity: AuditLog[];
  userActivity: AuditLog[];
  financialMetrics: FinancialMetric[];
  lookbackDate: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  organization_id: string;
  event_type: string;
  event_category: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  event_description: string;
  outcome: string;
  details?: Record<string, unknown>;
  created_at: string;
}

export interface FinancialMetric {
  id: string;
  organization_id: string;
  metric_type: string;
  value: number;
  unit: string;
  reporting_date: string;
  created_at: string;
}

// Voice Integration Types
export interface VoiceSession {
  id: string;
  user_id: string;
  organization_id: string;
  session_data: string;
  is_active: boolean;
  created_at: string;
  last_activity: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  organization_id: string;
  session_data: string;
  created_at: string;
  updated_at: string;
}

export interface EnhancedChatContext {
  combinedHistory: SessionHistory[];
  contextContinuity: boolean;
  intelligentTransitions: boolean;
  enhancedHistory?: ConversationEntry[];
  documentContext?: DocumentContext[];
}

export interface SessionHistory {
  id: string;
  source: 'voice' | 'chat';
  created_at: string;
  session_data?: string;
}

export interface VoiceDocumentInsight {
  documentId: string;
  voiceInsight: string;
  spokenSummary: string;
  keyPoints: string[];
  voiceQuestions: string[];
}

export interface VoiceEnhancedMeeting {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  voiceEnhanced: boolean;
  voiceBriefing: VoiceBriefing | null;
  preparationInsights: MeetingPreparation | null;
  voiceCommands: string[];
  status?: string;
  agenda_items?: unknown[];
  attendees?: unknown[];
}

export interface VaultWithAssets {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  vault_assets: VaultAsset[];
}

export interface VaultAsset {
  asset: Asset;
}

export interface DocumentSummary {
  id: string;
  organization_id: string;
  asset_id: string;
  summary: string;
  key_points: string[];
  created_at: string;
}

// Voice Analytics Types
export interface OrganizationAnalyticsData {
  organization: Organization;
  assets: Asset[];
  meetings: Meeting[];
  compliance: ComplianceWorkflow[];
  financials: FinancialMetric[];
  risks: RiskAssessment[];
  auditLogs: AuditLog[];
}

// Voice Scheduling Types
export interface VoiceSchedulingRequest {
  command: string;
  audioData?: string;
  context?: {
    userId: string;
    organizationId: string;
    timeZone?: string;
    preferences?: Record<string, unknown>;
  };
  preferences?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
}

export interface VoiceSchedulingResponse {
  success: boolean;
  sessionId: string;
  intent: SchedulingIntent;
  confidence: number;
  response: string;
  actions: SchedulingAction[];
  suggestions: Suggestion[];
  clarifications: Clarification[];
}

export type SchedulingIntent = 
  | 'schedule_meeting'
  | 'reschedule_meeting'
  | 'cancel_meeting'
  | 'check_availability'
  | 'find_time_slot'
  | 'book_resource'
  | 'set_recurring_meeting'
  | 'add_participants'
  | 'change_duration'
  | 'suggest_alternatives'
  | 'block_calendar'
  | 'create_event_series';

export interface SchedulingAction {
  action: string;
  type: 'create' | 'update' | 'delete' | 'query' | 'suggest';
  target: 'meeting' | 'calendar' | 'time_slot' | 'system';
  parameters: Record<string, unknown>;
  confidence: number;
  impact: {
    participants: string[];
    timeSlots: TimeSlot[];
    resources: string[];
    estimated_effort: number;
    reversible: boolean;
  };
}

export interface TimeSlot {
  start: string;
  end: string;
  duration: number;
  timezone: string;
  availability: 'free' | 'busy' | 'tentative';
}

export interface Suggestion {
  type: 'alternative_time' | 'optimization' | 'best_practice';
  content: string;
  confidence: number;
  rationale: string;
  impact: {
    beneficiaries: string[];
    trade_offs: string[];
    estimated_improvement: number;
    effort_required: 'low' | 'medium' | 'high';
  };
}

export interface Clarification {
  question: string;
  type: 'missing_info' | 'ambiguous' | 'confirmation';
  options?: string[];
  default_value?: string;
  required: boolean;
  context: string;
}

export interface AlternativeOption {
  option_id: string;
  type: 'time' | 'date' | 'duration' | 'location' | 'participants';
  description: string;
  details: Record<string, unknown>;
  confidence: number;
  trade_offs: string[];
}

export interface SchedulingEntity {
  type: string;
  value: string;
  confidence: number;
  source: 'speech' | 'text' | 'calendar';
  validated: boolean;
}

// Voice Workflow Types
export interface VoiceWorkflowTrigger {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  trigger: WorkflowTriggerCondition;
  actions: WorkflowAction[];
  enabled: boolean;
  permissions: WorkflowPermissions;
  usage: WorkflowUsageStats;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}

export interface WorkflowTriggerCondition {
  phrases: string[];
  context: string[];
  roles: string[];
  confidence: number;
  requireExactMatch: boolean;
  caseSensitive: boolean;
}

export interface WorkflowAction {
  type: 'approval' | 'notification' | 'document_action' | 'meeting_action' | 'api_call' | 'navigation';
  target: string;
  parameters: Record<string, unknown>;
  condition?: WorkflowCondition;
  timeout?: number;
  retryCount?: number;
  fallbackAction?: WorkflowAction;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: unknown;
}

export interface WorkflowPermissions {
  canTrigger: string[];
  canModify: string[];
  canView: string[];
  requiresApproval: boolean;
  approvers: string[];
}

export interface WorkflowUsageStats {
  totalTriggers: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

export interface TriggerWorkflowRequest {
  phrase: string;
  context?: string;
  parameters?: Record<string, unknown>;
  confidence?: number;
}

export interface WorkflowTriggerResponse {
  success: boolean;
  triggered: boolean;
  workflows: VoiceWorkflowTrigger[];
  actions: WorkflowAction[];
  confirmationRequired: boolean;
}

export interface WorkflowExecution {
  id: string;
  userId: string;
  organizationId: string;
  triggerPhrase: string;
  matchedWorkflows: string[];
  actions: WorkflowAction[];
  status: 'pending_confirmation' | 'executing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  completedAt?: string;
  executionTime?: number;
  context?: string;
  parameters?: Record<string, unknown>;
  results?: WorkflowActionResult[];
  error?: string;
}

export interface WorkflowActionResult {
  actionIndex: number;
  result: {
    success: boolean;
    message?: string;
    data?: unknown;
    error?: string;
  };
  success: boolean;
}

// Workflow Management Request Types
export interface WorkflowCreateRequest {
  name: string;
  description: string;
  trigger: WorkflowTriggerCondition;
  actions: WorkflowAction[];
  permissions?: Partial<WorkflowPermissions>;
  enabled?: boolean;
  userId?: string;
  organizationId?: string;
}

export interface WorkflowUpdateRequest {
  workflowId: string;
  updates: Partial<VoiceWorkflowTrigger>;
  userId?: string;
}

export interface WorkflowDeleteRequest {
  workflowId: string;
  userId?: string;
}

export interface WorkflowListRequest {
  organizationId: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface WorkflowGetRequest {
  workflowId: string;
  userId?: string;
}

export interface ActionExecuteRequest {
  executionId: string;
  actionIndex: number;
}

export interface ExecutionHistoryRequest {
  organizationId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ExecutionConfirmRequest {
  executionId: string;
  userId?: string;
}

export interface ExecutionCancelRequest {
  executionId: string;
  userId?: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
  target?: string;
  status?: number;
  navigationTarget?: string;
  parameters?: Record<string, unknown>;
}

// Voice Biometric Types
export interface VoiceAuthenticationRequest {
  audioData: string;
  authPhrase?: string;
  challengeType?: 'text_dependent' | 'text_independent';
  context: AuthenticationContext;
}

export interface VoiceAuthenticationResponse {
  success: boolean;
  confidence: number;
  authenticationId: string;
  matchingScore: number;
  verificationTime: number;
  securityAssessment: SecurityAssessment;
  biometricQuality: BiometricQuality;
  recommendations: string[];
  fallbackOptions: FallbackOption[];
  errorDetails?: ErrorDetails;
}

export interface AuthenticationContext {
  purpose: string;
  risk_level: 'low' | 'medium' | 'high';
  device_info?: Record<string, unknown>;
  location?: string;
}

export interface SecurityAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  spoofingDetection: SpoofingResult;
  livenessScore: number;
  environmentalFactors: EnvironmentalFactors;
  behavioralFactors: BehavioralFactors;
}

export interface SpoofingResult {
  isSpoofed: boolean;
  confidence: number;
  spoofingType?: string[];
}

export interface EnvironmentalFactors {
  backgroundNoise: number;
  signalClarity: number;
  recordingDevice: string;
  transmissionQuality: number;
}

export interface BehavioralFactors {
  speakingRate: number;
  stressLevel: number;
  naturalness: number;
  hesitationPatterns: number;
}

export interface BiometricQuality {
  templateQuality: number;
  signalQuality: number;
  featureExtraction: number;
  matchingReliability: number;
}

export interface FallbackOption {
  method: string;
  available: boolean;
  description: string;
  estimatedTime: number;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details: unknown;
  recoverable: boolean;
  retryAfter?: number;
}

export interface BiometricEnrollmentRequest {
  audioData: string;
  sessionNumber: number;
  utterance: string;
  format?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface BiometricEnrollmentResponse {
  success: boolean;
  sessionId: string;
  progress: number;
  qualityScore: number;
  enrollmentComplete: boolean;
  nextSteps: string[];
  recommendations: string[];
}

export interface EmotionAnalysisRequest {
  audioData: string;
  sessionId?: string;
  context?: string;
  analysisType?: 'basic' | 'comprehensive';
}

export interface VoiceBiometricProfile {
  id: string;
  userId: string;
  organizationId: string;
  voiceprintTemplate: string;
  voiceCharacteristics: VoiceCharacteristics;
  enrollmentData: EnrollmentData;
  securitySettings: SecuritySettings;
  personalizationProfile: PersonalizationProfile;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceCharacteristics {
  fundamentalFrequency: number;
  speechRate: number;
  pitchVariance: number;
  spectralCentroid: number;
  mfccFeatures: number[];
  formantFrequencies: number[];
  voiceQualityMetrics: VoiceQualityMetrics;
}

export interface VoiceQualityMetrics {
  harmonicToNoiseRatio: number;
  roughness: number;
  breathiness: number;
  signalToNoiseRatio: number;
}

export interface EnrollmentData {
  enrollmentSessions: EnrollmentSession[];
  qualityScore: number;
  templateVersion: string;
  enrollmentComplete: boolean;
  minSessionsRequired: number;
  backgroundNoiseProfile: number[];
  recordingQualityMetrics: RecordingQualityMetrics;
}

export interface EnrollmentSession {
  id: string;
  sessionNumber: number;
  recordingDuration: number;
  utterances: string[];
  qualityScore: number;
  signalToNoiseRatio: number;
  recordedAt: string;
  deviceInfo?: Record<string, unknown>;
}

export interface RecordingQualityMetrics {
  sampleRate: number;
  bitDepth: number;
  channels: number;
  avgAmplitude: number;
  backgroundNoise: number;
  clipping: boolean;
  overallQuality: string;
}

export interface SecuritySettings {
  authenticationThreshold: number;
  verificationTimeout: number;
  maxAttempts: number;
  enableLivenessDetection: boolean;
  enableAntiSpoofing: boolean;
  requirePhraseMatching: boolean;
  fallbackAuthEnabled: boolean;
  adaptiveThreshold: boolean;
  securityLevel: 'minimal' | 'standard' | 'high' | 'maximum';
}

export interface PersonalizationProfile {
  userId: string;
  communicationStyle: CommunicationStyle;
  preferredInteractionModes: string[];
  adaptiveSettings: AdaptiveSettings;
  voiceShortcuts: VoiceShortcut[];
  personalizedResponses: PersonalizedResponse[];
  learningHistory: LearningHistory;
  preferences: UserPreferences;
}

export interface CommunicationStyle {
  formality: 'casual' | 'professional' | 'formal';
  verbosity: 'concise' | 'balanced' | 'detailed';
  pace: 'slow' | 'normal' | 'fast';
  tone: 'neutral' | 'friendly' | 'supportive';
  technicalLevel: 'basic' | 'intermediate' | 'advanced';
}

export interface AdaptiveSettings {
  autoAdjustVolume: boolean;
  autoAdjustSpeechRate: boolean;
  adaptToBackground: boolean;
  learningEnabled: boolean;
  suggestionLevel: 'minimal' | 'moderate' | 'aggressive';
  contextAwareness: boolean;
}

export interface VoiceShortcut {
  phrase: string;
  action: string;
  confidence: number;
  usage_count: number;
}

export interface PersonalizedResponse {
  context: string;
  response: string;
  effectiveness: number;
}

export interface LearningHistory {
  totalInteractions: number;
  successfulAuthentications: number;
  averageAuthenticationTime: number;
  commonPhrases: Record<string, number>;
  errorPatterns: string[];
  improvementAreas: string[];
  adaptationHistory: AdaptationEvent[];
}

export interface AdaptationEvent {
  timestamp: string;
  type: string;
  change: string;
  effectiveness: number;
}

export interface UserPreferences {
  voiceFeedback: boolean;
  visualFeedback: boolean;
  hapticFeedback: boolean;
  confidenceDisplay: boolean;
  debugMode: boolean;
  privacyMode: boolean;
  dataSharing: 'none' | 'anonymous' | 'full';
  retentionPeriod: number;
}

export interface FraudDetectionResult {
  riskScore: number;
  fraudIndicators: string[];
  recommendation: 'proceed' | 'verify' | 'block';
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
}

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  indicators: string[];
}

// Utility Types
export type VoiceOperationType = 
  | 'transcribe'
  | 'authenticate' 
  | 'analyze_emotion'
  | 'detect_fraud'
  | 'schedule_meeting'
  | 'trigger_workflow'
  | 'generate_insights';

export interface VoiceOperationContext {
  userId: string;
  organizationId: string;
  sessionId?: string;
  deviceInfo?: Record<string, unknown>;
  environment?: 'development' | 'staging' | 'production';
}