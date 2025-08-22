import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { 
  MeetingPreparation as ImportedMeetingPreparation, 
  MeetingDetails as ImportedMeetingDetails, 
  MeetingAttendee as ImportedMeetingAttendee, 
  AgendaAnalysis as ImportedAgendaAnalysis, 
 
  StakeholderPreparation as ImportedStakeholderPreparation, 
  MeetingRiskAssessment as ImportedMeetingRiskAssessment, 
  ComplianceReview as ImportedComplianceReview, 
  DiscussionGuide as ImportedDiscussionGuide, 
  DecisionPoint as ImportedDecisionPoint, 
  FollowUpAction as ImportedFollowUpAction, 
  ContextualInsight as ImportedContextualInsight, 
  PreparationTimeline as ImportedPreparationTimeline,
  VoiceBriefing as ImportedVoiceBriefing,
  PreparationRecommendation as ImportedPreparationRecommendation,
  PreparationAlert as ImportedPreparationAlert,
  Meeting,
  MeetingContext,
  SupabaseClient
} from '@/types/voice';

const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'];
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AgendaPreparationRequest {
  meetingId: string;
  organizationId: string;
  preparationMode: 'automatic' | 'guided' | 'comprehensive';
  includeDocumentAnalysis: boolean;
  includeRiskAssessment: boolean;
  includeComplianceCheck: boolean;
  includeStakeholderAnalysis: boolean;
  voiceOptimized?: boolean;
}

export interface AgendaPreparationResponse {
  success: boolean;
  preparation: MeetingPreparation;
  voiceBriefing?: ImportedVoiceBriefing;
  recommendations: ImportedPreparationRecommendation[];
  alerts: ImportedPreparationAlert[];
  error?: string;
}

export interface MeetingPreparation {
  meetingId: string;
  meetingDetails: MeetingDetails;
  agendaAnalysis: ImportedAgendaAnalysis;
  documentPackage: DocumentPackage;
  stakeholderPreparation: ImportedStakeholderPreparation;
  riskAssessment: ImportedMeetingRiskAssessment;
  complianceReview: ImportedComplianceReview;
  discussionGuides: ImportedDiscussionGuide[];
  keyDecisionPoints: ImportedDecisionPoint[];
  followUpActions: ImportedFollowUpAction[];
  contextualInsights: ImportedContextualInsight[];
  preparationTimeline: ImportedPreparationTimeline;
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
  categorizedDocuments: LocalCategorizedDocuments;
  readingTime: ReadingTimeEstimate;
  keyInsights: DocumentInsight[];
  missingDocuments: string[];
  documentRelationships: DocumentRelationship[];
  priorityOrder: string[];
}

export interface LocalCategorizedDocuments {
  pre_read: LocalDocumentSummary[];
  reference: LocalDocumentSummary[];
  supporting: LocalDocumentSummary[];
  background: LocalDocumentSummary[];
  appendices: LocalDocumentSummary[];
}

export interface LocalDocumentSummary {
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI preparation service not configured' }, { status: 500 });
    }

    const body: AgendaPreparationRequest = await request.json();
    
    if (!body.meetingId || !body.organizationId) {
      return NextResponse.json({ error: 'Meeting ID and Organization ID are required' }, { status: 400 });
    }

    // Verify user has access to organization and meeting
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', body.organizationId)
      .eq('user_id', user.id)
      .single();

    if (!orgAccess) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', body.meetingId)
      .eq('organization_id', body.organizationId)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Generate comprehensive meeting preparation
    const preparation = await generateMeetingPreparation(supabase, meeting, body, user.id);
    
    // Generate voice briefing if requested
    let voiceBriefing = undefined;
    if (body.voiceOptimized) {
      voiceBriefing = await generateVoiceBriefing(preparation);
    }

    // Generate recommendations
    const recommendations = await generatePreparationRecommendations(preparation);
    
    // Generate alerts
    const alerts = await generatePreparationAlerts(preparation);

    // Store preparation for future reference
    await storePreparationData(supabase, preparation, body.organizationId, user.id);

    // Log preparation activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId,
        event_type: 'system_action',
        event_category: 'meeting_preparation',
        action: 'generate_agenda_preparation',
        resource_type: 'meeting_preparation',
        resource_id: body.meetingId,
        event_description: `Generated comprehensive preparation for meeting: ${meeting.title}`,
        outcome: 'success',
        details: {
          meeting_id: body.meetingId,
          preparation_mode: body.preparationMode,
          total_documents: preparation.documentPackage.totalDocuments,
          total_attendees: preparation.meetingDetails.attendees.length,
          estimated_prep_time: preparation.preparationTimeline.totalPreparationTime,
          voice_optimized: body.voiceOptimized || false
        },
      });

    const response: AgendaPreparationResponse = {
      success: true,
      preparation,
      ...(voiceBriefing && { voiceBriefing }),
      recommendations,
      alerts
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating agenda preparation:', error);
    return NextResponse.json({ 
      success: false,
      preparation: {} as MeetingPreparation,
      recommendations: [],
      alerts: [],
      error: 'Internal server error during preparation generation'
    }, { status: 500 });
  }
}

async function generateMeetingPreparation(
  supabase: SupabaseClient,
  meeting: Meeting,
  request: AgendaPreparationRequest,
  userId: string
): Promise<MeetingPreparation> {
  // Fetch comprehensive meeting context
  const context = await fetchMeetingContext(supabase, meeting, request.organizationId);
  
  // Analyze agenda items
  const agendaAnalysis = await analyzeAgenda(meeting, context);
  
  // Prepare document package
  const documentPackage = await prepareDocumentPackage(supabase, meeting, context, request);
  
  // Prepare stakeholder analysis
  const stakeholderPreparation = await prepareStakeholderAnalysis(meeting, context);
  
  // Assess meeting risks
  const riskAssessment = request.includeRiskAssessment 
    ? await assessMeetingRisks(meeting, context) 
    : createDefaultRiskAssessment();
  
  // Review compliance requirements
  const complianceReview = request.includeComplianceCheck 
    ? await reviewComplianceRequirements(meeting, context) 
    : createDefaultComplianceReview();
  
  // Generate discussion guides
  const discussionGuides = await generateDiscussionGuides(meeting, context, agendaAnalysis);
  
  // Identify key decision points
  const keyDecisionPoints = await identifyDecisionPoints(meeting, context, agendaAnalysis);
  
  // Plan follow-up actions
  const followUpActions = await planFollowUpActions(meeting, context);
  
  // Generate contextual insights
  const contextualInsights = await generateContextualInsights(meeting, context);
  
  // Create preparation timeline
  const preparationTimeline = await createPreparationTimeline(meeting, agendaAnalysis, documentPackage);

  return {
    meetingId: meeting.id,
    meetingDetails: {
      id: meeting.id,
      title: meeting.title,
      type: meeting.meeting_type,
      date: meeting.meeting_date,
      duration: meeting.duration || 120,
      attendees: meeting.attendees || [],
      location: meeting.location || 'Virtual',
      objectives: meeting.objectives || [],
      expectedOutcomes: meeting.expected_outcomes || []
    } as ImportedMeetingDetails,
    agendaAnalysis,
    documentPackage,
    stakeholderPreparation,
    riskAssessment,
    complianceReview,
    discussionGuides,
    keyDecisionPoints,
    followUpActions,
    contextualInsights,
    preparationTimeline,
    generatedAt: new Date().toISOString()
  };
}

async function fetchMeetingContext(
  supabase: SupabaseClient,
  meeting: Meeting,
  organizationId: string
): Promise<MeetingContext> {
  const [
    relatedDocuments,
    previousMeetings,
    attendeeProfiles,
    organizationData,
    complianceData,
    riskData
  ] = await Promise.all([
    fetchRelatedDocuments(supabase, meeting, organizationId),
    fetchPreviousMeetings(supabase, meeting, organizationId),
    fetchAttendeeProfiles(supabase, (meeting.attendees as ImportedMeetingAttendee[]) || []),
    supabase.from('organizations').select('*').eq('id', organizationId).single(),
    supabase.from('compliance_workflows').select('*').eq('organization_id', organizationId),
    supabase.from('risk_assessments').select('*').eq('organization_id', organizationId)
  ]);

  return {
    meeting,
    relatedDocuments: relatedDocuments.data || [],
    previousMeetings: previousMeetings.data || [],
    attendeeProfiles: attendeeProfiles || [],
    organization: organizationData.data,
    compliance: complianceData.data || [],
    risks: riskData.data || [],
    lookbackDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ago
  };
}

async function fetchRelatedDocuments(supabase: SupabaseClient, meeting: Meeting, organizationId: string) {
  // Find documents related to meeting topics
  const searchTerms = [
    ...meeting.title.toLowerCase().split(' '),
    ...(meeting.description || '').toLowerCase().split(' '),
    ...(meeting.agenda_items || []).join(' ').toLowerCase().split(' ')
  ].filter(term => term.length > 3);

  return await supabase
    .from('assets')
    .select(`
      id, title, description, file_type, file_size, created_at, updated_at,
      vault:vaults(id, name),
      category, tags
    `)
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(50);
}

async function fetchPreviousMeetings(supabase: SupabaseClient, meeting: Meeting, organizationId: string) {
  return await supabase
    .from('meetings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('meeting_type', meeting.meeting_type)
    .lt('meeting_date', meeting.meeting_date)
    .order('meeting_date', { ascending: false })
    .limit(5);
}

async function fetchAttendeeProfiles(supabase: SupabaseClient, attendees: ImportedMeetingAttendee[]) {
  if (!attendees.length) return [];

  const userIds = attendees.map(a => a.id || (a as any).user_id).filter(Boolean);
  if (!userIds.length) return attendees;

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('user_id', userIds);

  return attendees.map(attendee => ({
    ...attendee,
    profile: profiles?.find((p: any) => p.user_id === (attendee.id || (attendee as any).user_id))
  }));
}

async function analyzeAgenda(meeting: Meeting, context: MeetingContext): Promise<ImportedAgendaAnalysis> {
  const agendaItems = meeting.agenda_items as unknown[] || [];
  const totalItems = agendaItems.length;
  
  const itemBreakdown = agendaItems.map((item: unknown, index: number) => {
    const itemAny = item as any;
    return {
      id: itemAny.id || `item_${index}`,
      title: itemAny.title || itemAny.description || `Agenda Item ${index + 1}`,
      type: itemAny.type || 'discussion',
      estimatedTime: itemAny.estimated_time || 15,
      priority: itemAny.priority || 'medium',
      complexity: itemAny.complexity || 'moderate',
      requiredPreparation: itemAny.preparation || [],
      keyStakeholders: itemAny.stakeholders || [],
      prerequisites: itemAny.prerequisites || [],
      expectedDeliverables: itemAny.deliverables || [],
      riskFactors: itemAny.risks || []
    };
  });

  const estimatedDuration = itemBreakdown.reduce((sum: number, item: any) => sum + item.estimatedTime, 0);

  const timeAllocation = {
    administrative: 15,
    discussion: itemBreakdown.filter((i: any) => i.type === 'discussion').reduce((s: number, i: any) => s + i.estimatedTime, 0),
    decision: itemBreakdown.filter((i: any) => i.type === 'decision').reduce((s: number, i: any) => s + i.estimatedTime, 0),
    information: itemBreakdown.filter((i: any) => i.type === 'information').reduce((s: number, i: any) => s + i.estimatedTime, 0),
    buffer: Math.ceil(estimatedDuration * 0.1),
    breakdown: {}
  };

  return {
    totalItems,
    estimatedDuration,
    itemBreakdown,
    timeAllocation,
    criticalPath: itemBreakdown.filter((i: any) => i.priority === 'high' || i.priority === 'critical').map((i: any) => i.id),
    potentialOverruns: itemBreakdown.filter((i: any) => i.complexity === 'complex').map((i: any) => i.id),
    dependencyMap: [] // Would analyze dependencies between items
  };
}

async function prepareDocumentPackage(
  supabase: SupabaseClient,
  meeting: Meeting,
  context: MeetingContext,
  request: AgendaPreparationRequest
): Promise<DocumentPackage> {
  const documents = context.relatedDocuments;
  const totalDocuments = documents.length;

  // Categorize documents
  const categorizedDocuments: LocalCategorizedDocuments = {
    pre_read: [],
    reference: [],
    supporting: [],
    background: [],
    appendices: []
  };

  // Simple categorization logic - would be enhanced with AI
  for (const doc of documents) {
    const docSummary: LocalDocumentSummary = {
      id: doc.id,
      title: doc.title,
      type: doc.file_type,
      pageCount: estimatePageCount(doc.file_size, doc.file_type),
      estimatedReadTime: estimateReadingTime(doc.file_size, doc.file_type),
      summary: doc.description || 'Document summary not available',
      keyPoints: [],
      relevanceToAgenda: [],
      criticality: 'important',
      lastUpdated: doc.updated_at,
      author: '',
      downloadUrl: `/api/assets/${doc.id}/download`
    };

    // Categorize based on file type and recency
    if (doc.file_type.includes('pdf') && isRecent(doc.updated_at, 7)) {
      categorizedDocuments.pre_read.push(docSummary);
    } else if (doc.file_type.includes('excel') || doc.file_type.includes('csv')) {
      categorizedDocuments.reference.push(docSummary);
    } else {
      categorizedDocuments.supporting.push(docSummary);
    }
  }

  const readingTime: ReadingTimeEstimate = {
    total: documents.reduce((sum: number, doc: any) => sum + estimateReadingTime(doc.file_size, doc.file_type), 0),
    byPriority: {
      essential: categorizedDocuments.pre_read.reduce((s: number, d: any) => s + d.estimatedReadTime, 0),
      important: categorizedDocuments.reference.reduce((s: number, d: any) => s + d.estimatedReadTime, 0),
      optional: categorizedDocuments.supporting.reduce((s: number, d: any) => s + d.estimatedReadTime, 0)
    },
    byAttendee: {} // Would calculate based on attendee roles
  };

  return {
    totalDocuments,
    categorizedDocuments: categorizedDocuments as any,
    readingTime,
    keyInsights: [], // Would analyze document content for insights
    missingDocuments: [], // Would identify gaps in documentation
    documentRelationships: [], // Would identify relationships between documents
    priorityOrder: documents.map((d: any) => d.id) // Would prioritize based on relevance
  };
}

function estimatePageCount(fileSize: number, fileType: string): number {
  // Rough estimation based on file type and size
  if (fileType.includes('pdf')) {
    return Math.ceil(fileSize / 50000); // ~50KB per page average
  }
  return 1;
}

function estimateReadingTime(fileSize: number, fileType: string): number {
  // Estimate in minutes based on average reading speeds
  const pageCount = estimatePageCount(fileSize, fileType);
  return Math.ceil(pageCount * 2); // 2 minutes per page average
}

function isRecent(dateString: string, days: number): boolean {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

async function prepareStakeholderAnalysis(meeting: Meeting, context: MeetingContext): Promise<StakeholderPreparation> {
  const attendees = meeting.attendees || [];
  
  const attendeePreparation: AttendeePreparation[] = attendees.map((attendee: any) => ({
    attendeeId: attendee.id || attendee.email,
    name: attendee.name || attendee.email,
    role: attendee.role || 'Participant',
    preparationNeeds: [
      {
        category: 'document_review',
        description: 'Review meeting materials',
        priority: 'high',
        estimatedTime: 30,
        dependencies: ['Document availability'],
        resources: ['Meeting documents']
      }
    ],
    briefingPoints: ['Key agenda items', 'Expected outcomes', 'Role in discussions'],
    questionsToExpect: ['What are your thoughts on...?', 'How does this impact your department?'],
    decisionPointsInvolvement: [],
    backgroundBriefing: 'Standard meeting preparation required',
    estimatedPrepTime: 45
  }));

  return {
    attendeePreparation,
    externalStakeholderContext: [],
    influenceMap: {
      decisionMakers: attendees.filter((a: any) => a.role?.includes('Director') || a.role?.includes('Manager')).map((a: any) => a.name),
      influencers: [],
      experts: [],
      stakeholders: attendees.map((a: any) => a.name),
      relationships: []
    },
    communicationPlan: {
      preeMeetingCommunications: [
        {
          recipient: 'All attendees',
          type: 'email',
          timing: '48 hours before',
          purpose: 'Meeting preparation and document distribution',
          content: 'Meeting agenda and materials attached',
          priority: 'high'
        }
      ],
      duringMeetingProtocol: {
        facilitation: {
          openingApproach: 'Welcome and agenda review',
          participationEncouragement: ['Direct questions', 'Round-robin discussions'],
          discussionTechniques: ['Structured discussion', 'Time-boxed segments'],
          consensusBuilding: ['Summarize key points', 'Confirm agreement']
        },
        decisionMaking: {
          decisionMethod: 'consultative',
          documentationRequirements: ['Decision rationale', 'Action items']
        },
        timeManagement: {
          pacing: 'Moderate with buffer time',
          timeKeeping: ['5-minute warnings', 'Agenda progress updates'],
          overrunProtocol: ['Identify critical items', 'Schedule follow-up if needed'],
          prioritizationApproach: 'Address high-priority items first'
        },
        conflictResolution: {
          preventionStrategies: ['Clear ground rules', 'Respectful dialogue'],
          interventionTechniques: ['Acknowledge all viewpoints', 'Focus on common goals'],
          escalationProcedure: ['Pause discussion', 'Seek common ground', 'Table for follow-up if needed']
        }
      },
      postMeetingFollowUp: [
        {
          type: 'meeting_minutes',
          recipients: ['All attendees'],
          timeline: '24 hours',
          template: 'Standard meeting minutes template'
        }
      ]
    }
  };
}

async function assessMeetingRisks(meeting: Meeting, context: MeetingContext): Promise<MeetingRiskAssessment> {
  const risks: MeetingRisk[] = [
    {
      category: 'attendance',
      description: 'Key attendees may not be available',
      probability: 'medium',
      impact: 'high',
      riskScore: 70,
      indicators: ['No RSVP confirmations', 'Conflicting calendar events'],
      rootCauses: ['Short notice', 'Calendar conflicts']
    },
    {
      category: 'preparation',
      description: 'Attendees may come unprepared',
      probability: 'medium',
      impact: 'medium',
      riskScore: 50,
      indicators: ['Documents not reviewed', 'No preparation time allocated'],
      rootCauses: ['Heavy workload', 'Late document distribution']
    }
  ];

  return {
    overallRiskLevel: 'medium',
    riskFactors: risks,
    mitigationStrategies: risks.map(risk => ({
      riskId: risk.category,
      strategy: 'Proactive communication and preparation',
      actions: ['Send reminders', 'Provide preparation guide'],
      responsibility: ['Meeting organizer'],
      timeline: 'Before meeting',
      successMetrics: ['Confirmed attendance', 'Preparation completion']
    })),
    contingencyPlans: [
      {
        scenario: 'Low attendance',
        triggers: ['Less than 70% attendance'],
        response: ['Reschedule if critical decisions needed', 'Proceed with information items'],
        responsibility: ['Meeting chair'],
        communicationPlan: 'Notify all stakeholders of decision'
      }
    ],
    monitoringPoints: ['24 hours before', '2 hours before', 'Meeting start']
  };
}

function createDefaultRiskAssessment(): MeetingRiskAssessment {
  return {
    overallRiskLevel: 'low',
    riskFactors: [],
    mitigationStrategies: [],
    contingencyPlans: [],
    monitoringPoints: []
  };
}

async function reviewComplianceRequirements(meeting: Meeting, context: MeetingContext): Promise<ComplianceReview> {
  return {
    overallStatus: 'compliant',
    governanceRequirements: [
      {
        requirement: 'Meeting minutes documentation',
        status: 'met',
        evidence: ['Minutes template available'],
        gapsIdentified: [],
        remedialActions: []
      }
    ],
    regulatoryConsiderations: [],
    policyCompliance: [],
    documentationRequirements: [
      {
        type: 'meeting_minutes',
        description: 'Comprehensive meeting minutes required',
        responsibility: 'Secretary',
        deadline: '48 hours post-meeting',
        retentionPeriod: '7 years'
      }
    ],
    approvalWorkflows: []
  };
}

function createDefaultComplianceReview(): ComplianceReview {
  return {
    overallStatus: 'compliant',
    governanceRequirements: [],
    regulatoryConsiderations: [],
    policyCompliance: [],
    documentationRequirements: [],
    approvalWorkflows: []
  };
}

async function generateDiscussionGuides(
  meeting: Meeting,
  context: MeetingContext,
  agendaAnalysis: ImportedAgendaAnalysis
): Promise<DiscussionGuide[]> {
  return agendaAnalysis.itemBreakdown.map(item => ({
    agendaItemId: item.id,
    title: item.title,
    objectives: [`Discuss ${item.title}`, 'Reach consensus on next steps'],
    keyQuestions: [
      `What are the key considerations for ${item.title}?`,
      'What are the potential risks and opportunities?',
      'What decisions need to be made?'
    ],
    facilitationNotes: [
      'Ensure all voices are heard',
      'Focus on actionable outcomes',
      'Document key decisions'
    ],
    timeAllocation: item.estimatedTime,
    expectedOutcomes: item.expectedDeliverables,
    successMetrics: ['Clear next steps identified', 'Stakeholder alignment achieved']
  }));
}

async function identifyDecisionPoints(
  meeting: Meeting,
  context: MeetingContext,
  agendaAnalysis: ImportedAgendaAnalysis
): Promise<DecisionPoint[]> {
  const decisionItems = agendaAnalysis.itemBreakdown.filter(item => item.type === 'decision');
  
  return decisionItems.map(item => ({
    id: item.id,
    decision: item.title,
    context: `Decision required on ${item.title}`,
    options: [
      {
        option: 'Approve as proposed',
        pros: ['Quick implementation'],
        cons: ['Limited alternatives considered'],
        risks: ['Unforeseen consequences'],
        costs: [],
        benefits: ['Progress maintained'],
        feasibility: 'high',
        stakeholderSupport: 'TBD'
      },
      {
        option: 'Request more information',
        pros: ['Better informed decision'],
        cons: ['Delayed timeline'],
        risks: ['Analysis paralysis'],
        costs: ['Time delay'],
        benefits: ['Reduced risk'],
        feasibility: 'high',
        stakeholderSupport: 'TBD'
      }
    ],
    criteria: ['Strategic alignment', 'Resource impact', 'Risk level'],
    stakeholders: item.keyStakeholders,
    timeline: 'During meeting',
    dependencies: item.prerequisites,
    consequences: [
      {
        scenario: 'Approval',
        impact: 'Project proceeds as planned',
        probability: 'TBD',
        mitigation: ['Regular monitoring'],
        monitoring: ['Progress reviews']
      }
    ],
    recommendedApproach: 'Structured decision-making process with clear criteria'
  }));
}

async function planFollowUpActions(meeting: Meeting, context: MeetingContext): Promise<FollowUpAction[]> {
  return [
    {
      category: 'decision_implementation',
      action: 'Implement decisions made during meeting',
      responsibility: ['Action item owners'],
      deadline: '2 weeks post-meeting',
      priority: 'high',
      dependencies: ['Clear decision documentation'],
      successMetrics: ['Actions completed on time'],
      resources: ['Implementation team']
    },
    {
      category: 'stakeholder_communication',
      action: 'Communicate meeting outcomes to stakeholders',
      responsibility: ['Communications lead'],
      deadline: '48 hours post-meeting',
      priority: 'medium',
      dependencies: ['Meeting minutes completed'],
      successMetrics: ['All stakeholders informed'],
      resources: ['Communication channels']
    }
  ];
}

async function generateContextualInsights(meeting: Meeting, context: MeetingContext): Promise<ContextualInsight[]> {
  return [
    {
      category: 'organizational_context',
      insight: 'This meeting is part of regular governance cycle',
      relevance: ['Strategic planning', 'Compliance requirements'],
      implications: ['Decisions will impact quarterly objectives'],
      actionable: true,
      confidence: 0.8,
      sources: ['Meeting schedule', 'Organization calendar']
    }
  ];
}

async function createPreparationTimeline(
  meeting: Meeting,
  agendaAnalysis: ImportedAgendaAnalysis,
  documentPackage: DocumentPackage
): Promise<PreparationTimeline> {
  const meetingDate = new Date(meeting.meeting_date);
  const totalPreparationTime = documentPackage.readingTime.total + 60; // Reading time plus 1 hour for other prep

  const milestones: PreparationMilestone[] = [
    {
      date: new Date(meetingDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      milestone: 'Document Distribution',
      description: 'All meeting materials distributed to attendees',
      deliverables: ['Meeting agenda', 'Supporting documents'],
      responsibility: ['Meeting organizer'],
      dependencies: ['All documents finalized'],
      critical: true
    },
    {
      date: new Date(meetingDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      milestone: 'Preparation Complete',
      description: 'All attendees have completed their preparation',
      deliverables: ['Document review completed', 'Questions prepared'],
      responsibility: ['All attendees'],
      dependencies: ['Documents available'],
      critical: false
    }
  ];

  return {
    totalPreparationTime,
    milestones,
    criticalPath: ['Document Distribution'],
    bufferTime: 30,
    lastMinuteChecks: [
      'Confirm all attendees can join',
      'Verify technology setup',
      'Review agenda timing',
      'Prepare backup plans'
    ]
  };
}

async function generateVoiceBriefing(preparation: MeetingPreparation): Promise<ImportedVoiceBriefing> {
  const executiveSummary = `Meeting preparation for ${preparation.meetingDetails.title} scheduled for ${new Date(preparation.meetingDetails.date).toLocaleDateString()}. ${preparation.documentPackage.totalDocuments} documents require review with estimated ${preparation.documentPackage.readingTime.total} minutes of reading time. ${preparation.keyDecisionPoints.length} key decisions expected.`;

  const keyTalkingPoints = [
    `Meeting objectives: ${preparation.meetingDetails.objectives.join(', ') || 'Standard agenda review'}`,
    `Key decisions: ${preparation.keyDecisionPoints.map(d => d.decision).join(', ')}`,
    `Critical preparation: ${preparation.documentPackage.readingTime.byPriority.essential} minutes of essential reading`
  ];

  const anticipatedQuestions = preparation.discussionGuides.flatMap(guide => guide.keyQuestions).slice(0, 5);

  const audioScript = `
    Good day. Here's your briefing for the upcoming ${preparation.meetingDetails.type} titled "${preparation.meetingDetails.title}".
    
    [PAUSE]
    
    The meeting is scheduled for ${new Date(preparation.meetingDetails.date).toLocaleDateString()} and is expected to last ${preparation.meetingDetails.duration} minutes.
    
    [PAUSE]
    
    Key preparation requirements include reviewing ${preparation.documentPackage.totalDocuments} documents, with ${preparation.documentPackage.readingTime.byPriority.essential} minutes of essential reading.
    
    [EMPHASIS] The main decision points for this meeting are: ${preparation.keyDecisionPoints.map(d => d.decision).join(', ')}.
    
    [PAUSE]
    
    Please ensure you complete your preparation at least 24 hours before the meeting for optimal outcomes.
  `;

  return {
    executiveSummary,
    audioScript,
    keyTalkingPoints,
    anticipatedQuestions,
    criticalReminders: [
      'Complete document review 24 hours before meeting',
      'Prepare questions in advance',
      'Confirm attendance and technology setup'
    ],
    estimatedBriefingTime: 3 // minutes
  };
}

async function generatePreparationRecommendations(preparation: MeetingPreparation): Promise<ImportedPreparationRecommendation[]> {
  const recommendations: ImportedPreparationRecommendation[] = [];

  if (preparation.documentPackage.readingTime.total > 120) {
    recommendations.push({
      category: 'preparation_enhancement',
      title: 'Schedule Additional Preparation Time',
      description: 'The document reading time exceeds 2 hours. Consider extending preparation timeline.',
      priority: 'medium',
      timeline: '1 week before meeting',
      expectedBenefit: 'Better prepared attendees and more productive discussion',
      effort: 'low',
      resources: ['Calendar time'],
      successMetrics: ['All documents reviewed', 'Prepared questions available']
    });
  }

  if (preparation.keyDecisionPoints.length > 5) {
    recommendations.push({
      category: 'efficiency_improvement',
      title: 'Consider Breaking Up Complex Decisions',
      description: 'Multiple complex decisions may require additional time or separate meetings.',
      priority: 'high',
      timeline: 'Before meeting',
      expectedBenefit: 'More focused decision-making and better outcomes',
      effort: 'medium',
      resources: ['Meeting planning time'],
      successMetrics: ['Clear decision process', 'Quality outcomes']
    });
  }

  return recommendations;
}

async function generatePreparationAlerts(preparation: MeetingPreparation): Promise<ImportedPreparationAlert[]> {
  const alerts: ImportedPreparationAlert[] = [];
  const meetingDate = new Date(preparation.meetingDetails.date);
  const daysUntilMeeting = Math.ceil((meetingDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (preparation.documentPackage.totalDocuments === 0) {
    alerts.push({
      type: 'missing_document',
      severity: 'warning',
      title: 'No Supporting Documents Found',
      description: 'No documents have been identified for this meeting',
      impact: 'Attendees may be unprepared for discussions',
      recommendedAction: 'Identify and distribute relevant documents',
      escalationRequired: false
    });
  }

  if (daysUntilMeeting <= 2 && preparation.documentPackage.readingTime.total > 60) {
    alerts.push({
      type: 'insufficient_time',
      severity: 'critical',
      title: 'Insufficient Preparation Time',
      description: 'Limited time remaining for document review',
      impact: 'Attendees may come unprepared',
      recommendedAction: 'Prioritize essential documents or consider rescheduling',
      deadline: meetingDate.toISOString(),
      escalationRequired: true
    });
  }

  return alerts;
}

async function storePreparationData(
  supabase: SupabaseClient,
  preparation: MeetingPreparation,
  organizationId: string,
  userId: string
): Promise<void> {
  try {
    await supabase
      .from('meeting_preparations')
      .insert({
        id: `prep_${preparation.meetingId}_${Date.now()}`,
        meeting_id: preparation.meetingId,
        user_id: userId,
        organization_id: organizationId,
        preparation_data: JSON.stringify(preparation),
        generated_at: preparation.generatedAt,
        total_documents: preparation.documentPackage.totalDocuments,
        estimated_prep_time: preparation.preparationTimeline.totalPreparationTime,
        key_decisions_count: preparation.keyDecisionPoints.length
      });
  } catch (error) {
    console.error('Failed to store preparation data:', error);
  }
}

// GET endpoint for retrieving meeting preparations
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const meetingId = url.searchParams.get('meetingId');
    const organizationId = url.searchParams.get('organizationId');

    if (!meetingId || !organizationId) {
      return NextResponse.json({ error: 'meetingId and organizationId are required' }, { status: 400 });
    }

    const { data: preparation, error } = await supabase
      .from('meeting_preparations')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !preparation) {
      return NextResponse.json({ error: 'Meeting preparation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preparation: JSON.parse(preparation.preparation_data),
      generatedAt: preparation.generated_at
    });

  } catch (error) {
    console.error('Error fetching meeting preparation:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch preparation data' 
    }, { status: 500 });
  }
}