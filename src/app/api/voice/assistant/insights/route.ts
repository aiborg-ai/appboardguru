import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Database } from '@/types/database';
import {
  ProactiveInsight,
  ProactiveInsightRequest,
  ProactiveInsightResponse,
  ContextTrigger,
  InsightType,
  InsightEvidence,
  DocumentReference,
  MeetingReference,
  StakeholderReference,
  ActionableRecommendation,
  TimelineItem,
  InsightSummary,
  ScheduledInsight,
  AnalyticsMetadata,
  ContextData,
  SupabaseClient,
  User,
  Meeting,
  Asset,
  ComplianceWorkflow,
  RiskAssessment
} from '@/types/voice';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// All interfaces now imported from @/types/voice

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = await createSupabaseServerClient() as any;
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI insights not configured' }, { status: 500 });
    }

    const body: ProactiveInsightRequest = await request.json();
    
    if (!body.organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Verify user has access to organization
    const { data: orgAccess } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', body.organizationId)
      .eq('user_id', user.id)
      .single();

    if (!orgAccess) {
      return NextResponse.json({ error: 'Access denied to organization' }, { status: 403 });
    }

    // Gather context data for insight generation
    const contextData = await gatherContextData(supabase, body, user.id);
    
    // Generate proactive insights
    const insights = await generateProactiveInsights(supabase, body, contextData, user.id);
    
    // Create insight summary
    const summary = createInsightSummary(insights);
    
    // Determine scheduled insights
    const scheduledInsights = determineScheduledInsights(insights, user.id);
    
    // Create analytics metadata
    const analyticsMetadata: AnalyticsMetadata = {
      processingTime: Date.now() - startTime,
      dataSources: ['assets', 'meetings', 'compliance', 'audit_logs', 'risk_assessments'],
      algorithmsUsed: ['pattern_matching', 'anomaly_detection', 'trend_analysis', 'ai_reasoning'],
      freshness: {
        assets: '5m',
        meetings: '1h',
        compliance: '15m',
        risks: '30m'
      },
      confidence: {
        overall: insights.length > 0 ? insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length : 0,
        byCategory: {}
      }
    };

    // Store insights for future reference
    await storeGeneratedInsights(supabase, insights, body.organizationId, user.id);

    // Log insight generation activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId,
        event_type: 'system_action',
        action: 'generate_insights',
        resource_type: 'proactive_insights',
        details: {
          event_category: 'proactive_insights',
          outcome: 'success',
          event_description: `Generated ${insights.length} proactive insights`,
          insight_types: body.insightTypes,
          total_insights: insights.length,
          critical_insights: insights.filter(i => i.urgency === 'critical').length,
          context_triggers: body.contextTriggers.length,
          processing_time_ms: analyticsMetadata.processingTime
        },
      });

    const response: ProactiveInsightResponse = {
      success: true,
      insights,
      summary,
      scheduledInsights,
      analyticsMetadata
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating proactive insights:', error);
    return NextResponse.json({ 
      success: false,
      insights: [],
      summary: {
        totalInsights: 0,
        criticalInsights: 0,
        highPriorityInsights: 0,
        categoryCounts: {},
        avgConfidence: 0,
        avgRelevance: 0,
        newInsightsSinceLastCheck: 0
      },
      scheduledInsights: [],
      analyticsMetadata: {
        processingTime: Date.now() - startTime,
        dataSources: [],
        algorithmsUsed: [],
        freshness: {},
        confidence: { overall: 0, byCategory: {} }
      },
      error: 'Internal server error during insight generation'
    }, { status: 500 });
  }
}

async function gatherContextData(
  supabase: SupabaseClient,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ContextData> {
  const lookbackDate = getLookbackDate(request.lookbackPeriod);
  
  // Gather comprehensive context data
  const [
    organization,
    recentAssets,
    upcomingMeetings,
    pastMeetings,
    complianceWorkflows,
    riskAssessments,
    auditActivity,
    userActivity,
    financialMetrics
  ] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', request.organizationId).single(),
    
    supabase.from('assets').select(`
      id, title, description, category, file_type, created_at, updated_at,
      vault:vaults(id, name, description),
      tags
    `).eq('organization_id', request.organizationId)
      .gte('created_at', lookbackDate)
      .order('created_at', { ascending: false })
      .limit(50),
      
    supabase.from('meetings').select(`
      id, title, description, meeting_date, meeting_type, status,
      agenda_items, attendees
    `).eq('organization_id', request.organizationId)
      .gte('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: true })
      .limit(20),
      
    supabase.from('meetings').select(`
      id, title, description, meeting_date, meeting_type, status,
      agenda_items, minutes_summary
    `).eq('organization_id', request.organizationId)
      .gte('meeting_date', lookbackDate)
      .lt('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: false })
      .limit(30),
      
    supabase.from('compliance_workflows').select('*')
      .eq('organization_id', request.organizationId)
      .gte('created_at', lookbackDate)
      .order('due_date', { ascending: true }),
      
    supabase.from('risk_assessments').select('*')
      .eq('organization_id', request.organizationId)
      .gte('assessment_date', lookbackDate)
      .order('assessment_date', { ascending: false }),
      
    supabase.from('audit_logs').select('*')
      .eq('organization_id', request.organizationId)
      .gte('created_at', lookbackDate)
      .order('created_at', { ascending: false })
      .limit(500),
      
    supabase.from('audit_logs').select('*')
      .eq('organization_id', request.organizationId)
      .eq('user_id', userId)
      .gte('created_at', lookbackDate)
      .order('created_at', { ascending: false })
      .limit(200),
      
    supabase.from('financial_metrics').select('*')
      .eq('organization_id', request.organizationId)
      .gte('reporting_date', lookbackDate)
      .order('reporting_date', { ascending: false })
  ]);

  return {
    organization: organization.data,
    recentAssets: recentAssets.data || [],
    upcomingMeetings: upcomingMeetings.data || [],
    pastMeetings: pastMeetings.data || [],
    complianceWorkflows: complianceWorkflows.data || [],
    riskAssessments: riskAssessments.data || [],
    auditActivity: auditActivity.data || [],
    userActivity: userActivity.data || [],
    financialMetrics: financialMetrics.data || [],
    lookbackDate
  };
}

function getLookbackDate(period: string): string {
  const now = new Date();
  switch (period) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }
}

async function generateProactiveInsights(
  supabase: SupabaseClient,
  request: ProactiveInsightRequest,
  contextData: ContextData,
  userId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];

  // Generate different types of insights based on request
  for (const insightType of request.insightTypes) {
    const typeInsights = await generateInsightsByType(
      insightType, 
      contextData, 
      request, 
      userId
    );
    insights.push(...typeInsights);
  }

  // Filter by urgency threshold
  const filteredInsights = insights.filter(insight => {
    const urgencyLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = urgencyLevels[request.urgencyThreshold];
    const insightLevel = urgencyLevels[insight.urgency];
    return insightLevel >= thresholdLevel;
  });

  // Sort by relevance score and confidence
  return filteredInsights.sort((a, b) => {
    const scoreA = a.relevanceScore * a.confidence;
    const scoreB = b.relevanceScore * b.confidence;
    return scoreB - scoreA;
  }).slice(0, 10); // Limit to top 10 insights
}

async function generateInsightsByType(
  type: InsightType,
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  switch (type) {
    case 'document_relationships':
      return await generateDocumentRelationshipInsights(contextData, request, userId);
    case 'meeting_preparation':
      return await generateMeetingPreparationInsights(contextData, request, userId);
    case 'compliance_deadlines':
      return await generateComplianceDeadlineInsights(contextData, request, userId);
    case 'risk_patterns':
      return await generateRiskPatternInsights(contextData, request, userId);
    case 'performance_anomalies':
      return await generatePerformanceAnomalyInsights(contextData, request, userId);
    case 'strategic_opportunities':
      return await generateStrategicOpportunityInsights(contextData, request, userId);
    case 'governance_gaps':
      return await generateGovernanceGapInsights(contextData, request, userId);
    default:
      return [];
  }
}

async function generateDocumentRelationshipInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const recentAssets = contextData.recentAssets;

  // Find document clusters by category and topic
  const documentGroups = groupDocumentsByTopic(recentAssets);
  
  for (const [topic, documents] of Object.entries(documentGroups)) {
    if (documents.length >= 3) {
      const insight: ProactiveInsight = {
        id: `doc_rel_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'document_relationships',
        category: 'operational',
        title: `Related Documents Detected: ${topic}`,
        description: `Found ${documents.length} documents related to ${topic} that may benefit from coordinated review`,
        detailedAnalysis: `Analysis of recent document uploads shows a cluster of ${documents.length} documents all relating to ${topic}. This suggests an emerging focus area that would benefit from comprehensive review and potential consolidation of insights.`,
        urgency: documents.length > 5 ? 'high' : 'medium',
        confidence: 0.85,
        relevanceScore: 0.8,
        
        evidence: [
          {
            type: 'pattern_match',
            description: `${documents.length} documents with similar topics uploaded recently`,
            dataSource: 'assets',
            metadata: { documentIds: documents.map(d => d.id) },
            confidence: 0.9
          }
        ],
        
        supportingDocuments: documents.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.file_type,
          relevanceReason: `Part of ${topic} document cluster`,
          lastModified: doc.updated_at,
          url: `/dashboard/assets/${doc.id}`
        })),
        
        relatedMeetings: [],
        stakeholdersAffected: [],
        
        recommendations: [
          {
            priority: 'medium',
            category: 'process_improvement',
            title: 'Coordinate Document Review',
            description: `Schedule a coordinated review session for all ${topic}-related documents`,
            expectedOutcome: 'Comprehensive understanding and consolidated insights',
            estimatedEffort: 'medium',
            timeframe: '1-2 weeks',
            dependencies: ['Reviewer availability'],
            resources: ['Document reviewers', 'Meeting room'],
            successMetrics: ['All documents reviewed', 'Summary report created'],
            riskOfInaction: 'Missed connections and incomplete analysis'
          }
        ],
        
        nextSteps: [
          'Review all related documents',
          'Identify key themes and insights',
          'Schedule stakeholder discussion',
          'Create consolidated summary'
        ],
        
        timeline: [
          {
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            milestone: 'Document Review Complete',
            description: 'Complete review of all related documents',
            responsible: ['Document reviewers'],
            critical: false
          }
        ],
        
        contextTriggers: request.contextTriggers.filter(t => t.type === 'document_upload'),
        optimalTiming: 'Within 1-2 weeks while documents are fresh',
        expiryConditions: ['New documents uploaded that change context'],
        
        createdAt: new Date().toISOString(),
        personalizedToUser: true,
        communicationStyle: 'detailed',
        deliveryPreference: 'immediate'
      };
      
      insights.push(insight);
    }
  }

  return insights;
}

async function generateMeetingPreparationInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const upcomingMeetings = contextData.upcomingMeetings;
  const recentAssets = contextData.recentAssets;

  for (const meeting of upcomingMeetings) {
    const meetingDate = new Date(meeting.meeting_date);
    const daysUntilMeeting = Math.ceil((meetingDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    
    if (daysUntilMeeting <= 7 && daysUntilMeeting > 0) {
      // Find relevant documents for this meeting
      const relevantDocs = findRelevantDocumentsForMeeting(meeting, recentAssets);
      
      const insight: ProactiveInsight = {
        id: `meet_prep_${meeting.id}_${Date.now()}`,
        type: 'meeting_preparation',
        category: 'governance',
        title: `Meeting Preparation Required: ${meeting.title}`,
        description: `${meeting.title} is scheduled in ${daysUntilMeeting} days. Found ${relevantDocs.length} relevant documents for review.`,
        detailedAnalysis: `Upcoming ${meeting.meeting_type} "${meeting.title}" requires preparation. Analysis shows ${relevantDocs.length} recently uploaded documents that are relevant to the meeting agenda.`,
        urgency: daysUntilMeeting <= 3 ? 'high' : 'medium',
        confidence: 0.9,
        relevanceScore: 0.95,
        
        evidence: [
          {
            type: 'data_point',
            description: `Meeting scheduled for ${meetingDate.toLocaleDateString()}`,
            dataSource: 'meetings',
            metadata: { meetingId: meeting.id, daysUntil: daysUntilMeeting },
            confidence: 1.0
          }
        ],
        
        supportingDocuments: relevantDocs.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          type: doc.file_type,
          relevanceReason: 'Recent upload relevant to meeting topic',
          lastModified: doc.updated_at,
          url: `/dashboard/assets/${doc.id}`
        })),
        
        relatedMeetings: [
          {
            id: meeting.id,
            title: meeting.title,
            date: meeting.meeting_date,
            type: meeting.meeting_type,
            relevanceReason: 'Upcoming meeting requiring preparation',
            url: `/dashboard/meetings/${meeting.id}`
          }
        ],
        
        stakeholdersAffected: meeting.attendees ? (meeting.attendees as unknown[]).map((attendee: unknown) => ({
          id: (attendee as {id?: string; email: string}).id || (attendee as {email: string}).email,
          name: (attendee as {name?: string; email: string}).name || (attendee as {email: string}).email,
          role: (attendee as {role?: string}).role || 'Attendee',
          department: '',
          impactLevel: 'high' as const,
          requiresNotification: true
        })) : [],
        
        recommendations: [
          {
            priority: daysUntilMeeting <= 3 ? 'urgent' : 'high',
            category: 'immediate_action',
            title: 'Review Meeting Materials',
            description: 'Review all relevant documents before the meeting',
            expectedOutcome: 'Well-prepared meeting with informed discussion',
            estimatedEffort: 'medium',
            timeframe: `Complete ${daysUntilMeeting - 1} days before meeting`,
            dependencies: ['Document availability'],
            resources: ['Meeting attendees', 'Preparation time'],
            successMetrics: ['All materials reviewed', 'Questions prepared'],
            riskOfInaction: 'Unprepared meeting leading to poor decisions'
          }
        ],
        
        nextSteps: [
          'Distribute relevant documents to attendees',
          'Schedule preparation time for key participants',
          'Prepare questions and discussion points',
          'Confirm all materials are current'
        ],
        
        timeline: [
          {
            date: new Date(meetingDate.getTime() - 48 * 60 * 60 * 1000).toISOString(),
            milestone: 'Materials Distributed',
            description: 'All meeting materials sent to attendees',
            responsible: ['Meeting organizer'],
            critical: true
          },
          {
            date: new Date(meetingDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            milestone: 'Preparation Complete',
            description: 'All attendees have reviewed materials',
            responsible: ['All attendees'],
            critical: false
          }
        ],
        
        contextTriggers: request.contextTriggers.filter(t => t.type === 'meeting_scheduled'),
        optimalTiming: `${daysUntilMeeting - 1} days before meeting`,
        expiryConditions: ['Meeting completed', 'Meeting cancelled'],
        
        createdAt: new Date().toISOString(),
        scheduledFor: new Date(meetingDate.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        personalizedToUser: true,
        communicationStyle: 'executive_summary',
        deliveryPreference: 'scheduled'
      };
      
      insights.push(insight);
    }
  }

  return insights;
}

async function generateComplianceDeadlineInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const workflows = contextData.complianceWorkflows;

  const upcomingDeadlines = workflows.filter(w => {
    const dueDate = new Date(w.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return daysUntilDue > 0 && daysUntilDue <= 30 && w.status !== 'completed';
  });

  for (const workflow of upcomingDeadlines) {
    const dueDate = new Date(workflow.due_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    
    const insight: ProactiveInsight = {
      id: `comp_dead_${workflow.id}_${Date.now()}`,
      type: 'compliance_deadlines',
      category: 'compliance',
      title: `Compliance Deadline Approaching: ${workflow.workflow_name}`,
      description: `${workflow.workflow_name} is due in ${daysUntilDue} days (${dueDate.toLocaleDateString()})`,
      detailedAnalysis: `Compliance workflow "${workflow.workflow_name}" has a deadline of ${dueDate.toLocaleDateString()}, which is ${daysUntilDue} days away. Current status is ${workflow.status}.`,
      urgency: daysUntilDue <= 7 ? 'critical' : daysUntilDue <= 14 ? 'high' : 'medium',
      confidence: 1.0,
      relevanceScore: 0.95,
      
      evidence: [
        {
          type: 'data_point',
          description: `Compliance deadline in ${daysUntilDue} days`,
          dataSource: 'compliance_workflows',
          metadata: { workflowId: workflow.id, daysUntilDue },
          confidence: 1.0
        }
      ],
      
      supportingDocuments: [],
      relatedMeetings: [],
      stakeholdersAffected: [],
      
      recommendations: [
        {
          priority: daysUntilDue <= 7 ? 'urgent' : 'high',
          category: 'immediate_action',
          title: 'Complete Compliance Workflow',
          description: `Complete ${workflow.workflow_name} before deadline`,
          expectedOutcome: 'Regulatory compliance maintained',
          estimatedEffort: 'medium',
          timeframe: `${daysUntilDue - 2} days`,
          dependencies: ['Required documentation', 'Approvals'],
          resources: ['Compliance team', 'Supporting documentation'],
          successMetrics: ['Workflow completed', 'Regulatory requirements met'],
          riskOfInaction: 'Regulatory non-compliance and potential penalties'
        }
      ],
      
      nextSteps: [
        'Review workflow requirements',
        'Gather necessary documentation',
        'Complete all workflow steps',
        'Submit before deadline'
      ],
      
      timeline: [
        {
          date: new Date(dueDate.getTime() - 48 * 60 * 60 * 1000).toISOString(),
          milestone: 'Final Review',
          description: 'Complete final review of compliance materials',
          responsible: ['Compliance team'],
          critical: true
        }
      ],
      
      contextTriggers: request.contextTriggers.filter(t => t.type === 'deadline_approaching'),
      optimalTiming: 'Immediate attention required',
      expiryConditions: ['Workflow completed', 'Deadline passed'],
      
      createdAt: new Date().toISOString(),
      personalizedToUser: true,
      communicationStyle: 'concise',
      deliveryPreference: 'immediate'
    };
    
    insights.push(insight);
  }

  return insights;
}

async function generateRiskPatternInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  const insights: ProactiveInsight[] = [];
  const risks = contextData.riskAssessments;

  // Identify patterns in risk data
  const risksByCategory = groupRisksByCategory(risks);
  const highRiskCategories = Object.entries(risksByCategory)
    .filter(([_, categoryRisks]) => categoryRisks.length >= 2)
    .filter(([_, categoryRisks]) => 
      categoryRisks.some(r => r.risk_level === 'high' || r.risk_level === 'critical')
    );

  for (const [category, categoryRisks] of highRiskCategories) {
    const highRisks = categoryRisks.filter(r => 
      r.risk_level === 'high' || r.risk_level === 'critical'
    );

    const insight: ProactiveInsight = {
      id: `risk_pattern_${category}_${Date.now()}`,
      type: 'risk_patterns',
      category: 'risk',
      title: `Risk Pattern Detected: ${category}`,
      description: `Multiple high-risk items identified in ${category} category (${highRisks.length} high/critical risks)`,
      detailedAnalysis: `Pattern analysis reveals concentration of risk in ${category} with ${highRisks.length} high or critical risk items out of ${categoryRisks.length} total risks in this category.`,
      urgency: highRisks.length >= 3 ? 'critical' : 'high',
      confidence: 0.9,
      relevanceScore: 0.88,
      
      evidence: [
        {
          type: 'pattern_match',
          description: `${highRisks.length} high-risk items in ${category} category`,
          dataSource: 'risk_assessments',
          metadata: { category, riskCount: highRisks.length },
          confidence: 0.95
        }
      ],
      
      supportingDocuments: [],
      relatedMeetings: [],
      stakeholdersAffected: [],
      
      recommendations: [
        {
          priority: 'urgent',
          category: 'risk_mitigation',
          title: `Address ${category} Risk Concentration`,
          description: `Develop comprehensive mitigation strategy for ${category} risks`,
          expectedOutcome: 'Reduced risk exposure in vulnerable category',
          estimatedEffort: 'high',
          timeframe: '2-4 weeks',
          dependencies: ['Risk assessment completion', 'Stakeholder alignment'],
          resources: ['Risk management team', 'Department heads', 'External consultants'],
          successMetrics: ['Risk levels reduced', 'Mitigation plans implemented'],
          riskOfInaction: 'Escalating risk exposure could lead to significant business impact'
        }
      ],
      
      nextSteps: [
        'Conduct detailed risk analysis',
        'Develop mitigation strategies',
        'Assign risk owners',
        'Implement monitoring controls'
      ],
      
      timeline: [
        {
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          milestone: 'Risk Analysis Complete',
          description: 'Complete detailed analysis of all category risks',
          responsible: ['Risk management team'],
          critical: true
        }
      ],
      
      contextTriggers: request.contextTriggers.filter(t => t.type === 'risk_threshold'),
      optimalTiming: 'Immediate attention required',
      expiryConditions: ['Risks mitigated to acceptable levels'],
      
      createdAt: new Date().toISOString(),
      personalizedToUser: true,
      communicationStyle: 'technical',
      deliveryPreference: 'immediate'
    };
    
    insights.push(insight);
  }

  return insights;
}

async function generatePerformanceAnomalyInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  // Placeholder for performance anomaly detection
  // This would analyze metrics and identify unusual patterns
  return [];
}

async function generateStrategicOpportunityInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  // Placeholder for strategic opportunity identification
  // This would analyze trends and market data for opportunities
  return [];
}

async function generateGovernanceGapInsights(
  contextData: ContextData,
  request: ProactiveInsightRequest,
  userId: string
): Promise<ProactiveInsight[]> {
  // Placeholder for governance gap analysis
  // This would identify areas where governance practices could be improved
  return [];
}

// Utility functions
function groupDocumentsByTopic(documents: Asset[]): Record<string, Asset[]> {
  const groups: Record<string, Asset[]> = {};
  
  for (const doc of documents) {
    const topic = doc.category || extractTopicFromTitle(doc.title);
    if (!groups[topic]) {
      groups[topic] = [];
    }
    groups[topic].push(doc);
  }
  
  return groups;
}

function extractTopicFromTitle(title: string): string {
  // Simple topic extraction - could be enhanced with NLP
  const keywords = ['financial', 'risk', 'compliance', 'strategic', 'operational'];
  const lowerTitle = title.toLowerCase();
  
  for (const keyword of keywords) {
    if (lowerTitle.includes(keyword)) {
      return keyword;
    }
  }
  
  return 'general';
}

function findRelevantDocumentsForMeeting(meeting: Meeting, documents: Asset[]): Asset[] {
  const meetingKeywords = [
    ...meeting.title.toLowerCase().split(' '),
    ...meeting.description?.toLowerCase().split(' ') || [],
    ...(meeting.agenda_items || []).join(' ').toLowerCase().split(' ')
  ];

  return documents.filter((doc: any) => {
    const docKeywords = [
      ...doc.title.toLowerCase().split(' '),
      ...doc.description?.toLowerCase().split(' ') || [],
      doc.category?.toLowerCase() || ''
    ];

    const overlap = meetingKeywords.filter(keyword => 
      docKeywords.some(docKeyword => 
        docKeyword.includes(keyword) || keyword.includes(docKeyword)
      )
    );

    return overlap.length >= 2; // At least 2 keyword matches
  });
}

function groupRisksByCategory(risks: RiskAssessment[]): Record<string, RiskAssessment[]> {
  const groups: Record<string, RiskAssessment[]> = {};
  
  for (const risk of risks) {
    const category = risk.category || 'general';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(risk);
  }
  
  return groups;
}

function createInsightSummary(insights: ProactiveInsight[]): InsightSummary {
  const categoryCounts: Record<string, number> = {};
  
  insights.forEach(insight => {
    categoryCounts[insight.category] = (categoryCounts[insight.category] || 0) + 1;
  });

  return {
    totalInsights: insights.length,
    criticalInsights: insights.filter(i => i.urgency === 'critical').length,
    highPriorityInsights: insights.filter(i => i.urgency === 'high').length,
    categoryCounts,
    avgConfidence: insights.length > 0 ? 
      insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length : 0,
    avgRelevance: insights.length > 0 ? 
      insights.reduce((sum, i) => sum + i.relevanceScore, 0) / insights.length : 0,
    newInsightsSinceLastCheck: insights.length // Simplified - would compare with previous run
  };
}

function determineScheduledInsights(insights: ProactiveInsight[], userId: string): ScheduledInsight[] {
  return insights
    .filter(insight => insight.scheduledFor)
    .map(insight => ({
      insightId: insight.id,
      scheduledFor: insight.scheduledFor!,
      deliveryMethod: insight.deliveryPreference === 'immediate' ? 'notification' as const : 'dashboard' as const,
      conditions: insight.expiryConditions
    }));
}

async function storeGeneratedInsights(
  supabase: SupabaseClient,
  insights: ProactiveInsight[],
  organizationId: string,
  userId: string
): Promise<void> {
  try {
    // Store insights for future reference and tracking
    const insightRecords = insights.map(insight => ({
      id: insight.id,
      user_id: userId,
      organization_id: organizationId,
      insight_type: insight.type,
      category: insight.category,
      title: insight.title,
      description: insight.description,
      urgency: insight.urgency,
      confidence: insight.confidence,
      relevance_score: insight.relevanceScore,
      insight_data: JSON.stringify(insight),
      scheduled_for: insight.scheduledFor,
      created_at: insight.createdAt,
      acknowledged_at: insight.acknowledgedAt,
      dismissed_at: insight.dismissedAt
    }));

    await supabase
      .from('proactive_insights')
      .insert(insightRecords);
  } catch (error) {
    console.error('Failed to store generated insights:', error);
  }
}

// GET endpoint for retrieving insights
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');
    const insightType = url.searchParams.get('insightType');
    const urgency = url.searchParams.get('urgency');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    let query = supabase
      .from('proactive_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (insightType) {
      query = query.eq('insight_type', insightType);
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    const { data: insights, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      insights: (insights || []).map((insight: any) => insight.insight_data ? JSON.parse(insight.insight_data) : insight)
    });

  } catch (error) {
    console.error('Error fetching proactive insights:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch insights' 
    }, { status: 500 });
  }
}