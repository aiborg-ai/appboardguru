// AI Processing Load Test
// Tests AI-powered features under enterprise load including transcription, analysis, and document processing

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { getConfig } from '../config/test-config.js';
import { 
  getRandomUser, 
  authenticateUser, 
  getAuthHeaders 
} from '../utils/auth.js';

// Custom metrics for AI processing performance
const aiProcessingTime = new Trend('ai_processing_time');
const transcriptionLatency = new Trend('ai_transcription_latency');
const documentAnalysisTime = new Trend('ai_document_analysis_time');
const summarizationTime = new Trend('ai_summarization_time');
const chatResponseTime = new Trend('ai_chat_response_time');
const insightGenerationTime = new Trend('ai_insight_generation_time');

const aiProcessingSuccess = new Rate('ai_processing_success_rate');
const transcriptionAccuracy = new Rate('ai_transcription_accuracy_rate');
const documentAnalysisSuccess = new Rate('ai_document_analysis_success_rate');
const chatQuality = new Rate('ai_chat_quality_rate');
const insightQuality = new Rate('ai_insight_quality_rate');

const aiQueueLength = new Gauge('ai_queue_length');
const concurrentAIRequests = new Gauge('concurrent_ai_requests');
const aiModelSwitches = new Counter('ai_model_switches');
const aiErrors = new Counter('ai_processing_errors');

// AI processing scenarios for different enterprise use cases
const aiScenarios = {
  boardMeetingTranscription: {
    type: 'real_time_transcription',
    duration: 90, // minutes
    expectedWords: 15000,
    speakers: 8,
    complexity: 'high', // Legal/financial terminology
    languages: ['en'],
    features: {
      speaker_identification: true,
      sentiment_analysis: true,
      key_point_extraction: true,
      action_item_detection: true,
      decision_tracking: true
    }
  },
  
  documentIntelligence: {
    type: 'document_analysis',
    documentTypes: ['financial_report', 'legal_contract', 'board_pack', 'compliance_document'],
    avgDocumentSize: 5242880, // 5MB
    avgPages: 50,
    complexity: 'enterprise',
    features: {
      content_extraction: true,
      key_insights: true,
      risk_assessment: true,
      compliance_check: true,
      cross_reference_analysis: true,
      trend_analysis: true
    }
  },
  
  interactiveChat: {
    type: 'enhanced_chat',
    sessionDuration: 30, // minutes
    messagesPerSession: 25,
    complexity: 'strategic', // Board-level strategic questions
    features: {
      context_awareness: true,
      multi_document_reference: true,
      real_time_analysis: true,
      follow_up_questions: true,
      source_citations: true
    }
  },
  
  complianceAnalysis: {
    type: 'compliance_processing',
    frameworks: ['sox', 'gdpr', 'iso27001', 'sec_regulations'],
    documentCount: 100,
    avgComplexity: 'enterprise',
    features: {
      regulation_mapping: true,
      risk_scoring: true,
      gap_analysis: true,
      remediation_suggestions: true,
      audit_trail_analysis: true
    }
  },
  
  strategicInsights: {
    type: 'strategic_analysis',
    dataPoints: 10000,
    timeRange: '5_years',
    analysisDepth: 'comprehensive',
    features: {
      trend_analysis: true,
      predictive_modeling: true,
      scenario_planning: true,
      competitive_analysis: true,
      market_intelligence: true
    }
  }
};

export let options = {
  scenarios: {
    ai_processing: getConfig().loadScenarios.aiProcessing
  },
  thresholds: {
    'ai_processing_time': ['p(95)<10000'], // 95% under 10 seconds
    'ai_transcription_latency': ['p(95)<5000'], // Real-time transcription under 5s
    'ai_document_analysis_time': ['p(95)<15000'], // Document analysis under 15s
    'ai_chat_response_time': ['p(95)<3000'], // Chat responses under 3s
    'ai_processing_success_rate': ['rate>0.95'], // 95% success rate
    'ai_transcription_accuracy_rate': ['rate>0.90'], // 90% accuracy
    'ai_chat_quality_rate': ['rate>0.88'], // 88% quality responses
  }
};

export default function aiProcessingLoad() {
  const config = getConfig();
  const baseUrl = config.environment.baseUrl;
  
  // Authenticate user with appropriate permissions for AI features
  const user = getRandomUser('admin'); // Admin users typically have full AI access
  const authSession = authenticateUser(baseUrl, user);
  
  if (!authSession) {
    console.error('Authentication failed');
    return;
  }

  console.log(`Starting AI processing load test for user ${user.email}`);
  
  // Select AI scenario based on realistic enterprise distribution
  const scenarioWeights = {
    documentIntelligence: 0.35,  // 35% - Most common enterprise use case
    interactiveChat: 0.25,       // 25% - Interactive analysis
    boardMeetingTranscription: 0.20, // 20% - Real-time transcription
    complianceAnalysis: 0.12,    // 12% - Regulatory compliance
    strategicInsights: 0.08      // 8% - Advanced analytics
  };
  
  const selectedScenario = selectWeightedScenario(scenarioWeights);
  
  try {
    switch (selectedScenario) {
      case 'documentIntelligence':
        performDocumentIntelligenceTest(baseUrl, authSession);
        break;
      case 'interactiveChat':
        performInteractiveChatTest(baseUrl, authSession);
        break;
      case 'boardMeetingTranscription':
        performTranscriptionTest(baseUrl, authSession);
        break;
      case 'complianceAnalysis':
        performComplianceAnalysisTest(baseUrl, authSession);
        break;
      case 'strategicInsights':
        performStrategicInsightsTest(baseUrl, authSession);
        break;
      default:
        performDocumentIntelligenceTest(baseUrl, authSession);
    }
    
  } catch (error) {
    console.error(`AI processing test error: ${error}`);
    aiErrors.add(1);
  }
  
  // Random think time
  sleep(Math.random() * 3 + 2);
}

function performDocumentIntelligenceTest(baseUrl, authSession) {
  console.log('Testing AI document intelligence processing...');
  
  const scenario = aiScenarios.documentIntelligence;
  const documentType = scenario.documentTypes[Math.floor(Math.random() * scenario.documentTypes.length)];
  
  // Phase 1: Document Analysis
  const analysisPayload = {
    document_type: documentType,
    analysis_depth: scenario.complexity,
    features: Object.keys(scenario.features).filter(f => scenario.features[f]),
    priority: 'high',
    expected_completion_time: 30000, // 30 seconds
    metadata: {
      test_scenario: 'document_intelligence_load',
      document_size: scenario.avgDocumentSize,
      pages: scenario.avgPages
    }
  };
  
  const analysisStartTime = new Date();
  const analysisResponse = http.post(
    `${baseUrl}/api/document-intelligence/analyze`,
    JSON.stringify(analysisPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const analysisDuration = new Date() - analysisStartTime;
  
  documentAnalysisTime.add(analysisDuration);
  
  const analysisSuccess = check(analysisResponse, {
    'document analysis status is 200': (r) => r.status === 200 || r.status === 202,
    'document analysis has job_id': (r) => r.json() && (r.json().job_id || r.json().analysis_id),
    'document analysis response time < 20s': (r) => r.timings.duration < 20000,
  });

  documentAnalysisSuccess.add(analysisSuccess);
  
  if (analysisSuccess) {
    const analysisData = analysisResponse.json();
    const jobId = analysisData.job_id || analysisData.analysis_id;
    
    // Phase 2: Poll for completion (simulate async processing)
    if (analysisData.status === 'processing' || analysisResponse.status === 202) {
      pollAIJobCompletion(baseUrl, authSession, jobId, 'document_analysis');
    }
    
    // Phase 3: Document Summarization
    sleep(1);
    performDocumentSummarization(baseUrl, authSession, jobId);
    
    // Phase 4: Key Insights Extraction
    sleep(1);
    performInsightExtraction(baseUrl, authSession, jobId, documentType);
  }
}

function performDocumentSummarization(baseUrl, authSession, documentId) {
  const summarizationPayload = {
    document_id: documentId,
    summary_type: 'executive',
    length: 'comprehensive',
    focus_areas: [
      'key_decisions',
      'financial_impact',
      'risk_factors',
      'recommendations',
      'action_items'
    ],
    audience: 'board_members'
  };
  
  const summaryStartTime = new Date();
  const summaryResponse = http.post(
    `${baseUrl}/api/document-intelligence/summarize`,
    JSON.stringify(summarizationPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const summaryDuration = new Date() - summaryStartTime;
  
  summarizationTime.add(summaryDuration);
  
  const summarySuccess = check(summaryResponse, {
    'summarization status is 200': (r) => r.status === 200,
    'summarization has content': (r) => r.json() && r.json().summary && r.json().summary.length > 100,
    'summarization response time < 15s': (r) => r.timings.duration < 15000,
    'summarization has key points': (r) => r.json() && r.json().key_points && r.json().key_points.length > 0,
  });

  aiProcessingSuccess.add(summarySuccess);
  
  if (summarySuccess) {
    const summaryData = summaryResponse.json();
    console.log(`Generated summary with ${summaryData.summary.length} characters and ${summaryData.key_points.length} key points`);
  }
}

function performInsightExtraction(baseUrl, authSession, documentId, documentType) {
  const insightPayload = {
    document_id: documentId,
    document_type: documentType,
    insight_types: [
      'financial_metrics',
      'risk_indicators',
      'compliance_status',
      'strategic_implications',
      'stakeholder_impact'
    ],
    analysis_depth: 'comprehensive',
    cross_reference: true
  };
  
  const insightStartTime = new Date();
  const insightResponse = http.post(
    `${baseUrl}/api/document-intelligence/insights`,
    JSON.stringify(insightPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const insightDuration = new Date() - insightStartTime;
  
  insightGenerationTime.add(insightDuration);
  
  const insightSuccess = check(insightResponse, {
    'insight generation status is 200': (r) => r.status === 200,
    'insight response has insights': (r) => r.json() && r.json().insights && r.json().insights.length > 0,
    'insight response time < 12s': (r) => r.timings.duration < 12000,
    'insight has confidence scores': (r) => {
      const data = r.json();
      return data && data.insights && data.insights.every(i => i.confidence !== undefined);
    },
  });

  insightQuality.add(insightSuccess);
  
  if (insightSuccess) {
    const insightData = insightResponse.json();
    const avgConfidence = insightData.insights.reduce((sum, i) => sum + i.confidence, 0) / insightData.insights.length;
    console.log(`Generated ${insightData.insights.length} insights with avg confidence: ${avgConfidence.toFixed(2)}`);
  }
}

function performInteractiveChatTest(baseUrl, authSession) {
  console.log('Testing AI interactive chat processing...');
  
  const scenario = aiScenarios.interactiveChat;
  const sessionId = `chat_session_${Date.now()}_${__VU}`;
  
  // Create chat session
  const sessionPayload = {
    session_id: sessionId,
    context_type: 'board_governance',
    capabilities: Object.keys(scenario.features).filter(f => scenario.features[f]),
    user_role: authSession.user.role,
    organization_context: authSession.user.organizationId
  };
  
  const sessionResponse = http.post(
    `${baseUrl}/api/chat/enhanced`,
    JSON.stringify(sessionPayload),
    { headers: getAuthHeaders(authSession) }
  );
  
  check(sessionResponse, {
    'chat session creation status is 200': (r) => r.status === 200 || r.status === 201,
  });
  
  if (sessionResponse.status === 200 || sessionResponse.status === 201) {
    // Simulate realistic chat conversation
    const chatQuestions = [
      "What are the key financial highlights from our latest board pack?",
      "Can you analyze the risk factors mentioned in our Q3 compliance report?",
      "What are the main action items from last month's board meeting?",
      "How do our current governance practices compare to industry standards?",
      "What regulatory changes might affect our upcoming strategic initiatives?",
      "Can you summarize the key decisions made in our recent audit committee meeting?",
      "What are the potential impacts of the proposed budget allocation changes?",
      "How effective have our recent board resolutions been in terms of implementation?"
    ];
    
    // Send multiple messages to simulate conversation
    for (let i = 0; i < Math.min(scenario.messagesPerSession, 8); i++) {
      const question = chatQuestions[i % chatQuestions.length];
      
      const messagePayload = {
        session_id: sessionId,
        message: question,
        context_documents: generateContextDocuments(),
        analysis_depth: 'comprehensive',
        require_sources: true
      };
      
      const messageStartTime = new Date();
      const messageResponse = http.post(
        `${baseUrl}/api/chat/enhanced`,
        JSON.stringify(messagePayload),
        { headers: getAuthHeaders(authSession) }
      );
      const messageDuration = new Date() - messageStartTime;
      
      chatResponseTime.add(messageDuration);
      
      const messageSuccess = check(messageResponse, {
        [`chat message ${i + 1} status is 200`]: (r) => r.status === 200,
        [`chat message ${i + 1} has response`]: (r) => r.json() && r.json().response && r.json().response.length > 50,
        [`chat message ${i + 1} response time < 5s`]: (r) => r.timings.duration < 5000,
        [`chat message ${i + 1} has sources`]: (r) => r.json() && r.json().sources && r.json().sources.length > 0,
      });

      chatQuality.add(messageSuccess);
      
      if (messageSuccess) {
        const responseData = messageResponse.json();
        console.log(`Chat response ${i + 1}: ${responseData.response.length} chars, ${responseData.sources.length} sources`);
      }
      
      // Think time between messages
      sleep(Math.random() * 2 + 1);
    }
  }
}

function performTranscriptionTest(baseUrl, authSession) {
  console.log('Testing AI real-time transcription processing...');
  
  const scenario = aiScenarios.boardMeetingTranscription;
  const meetingId = `meeting_${Date.now()}_${__VU}`;
  
  // Start transcription session
  const transcriptionPayload = {
    meeting_id: meetingId,
    language: 'en',
    features: Object.keys(scenario.features).filter(f => scenario.features[f]),
    real_time: true,
    expected_duration: scenario.duration,
    speaker_count: scenario.speakers,
    complexity: scenario.complexity
  };
  
  const transcriptionStartTime = new Date();
  const transcriptionResponse = http.post(
    `${baseUrl}/api/ai-meeting/transcription/start`,
    JSON.stringify(transcriptionPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const transcriptionSetupDuration = new Date() - transcriptionStartTime;
  
  transcriptionLatency.add(transcriptionSetupDuration);
  
  const transcriptionSuccess = check(transcriptionResponse, {
    'transcription start status is 200': (r) => r.status === 200,
    'transcription has session_id': (r) => r.json() && r.json().session_id,
    'transcription start time < 3s': (r) => r.timings.duration < 3000,
  });

  transcriptionAccuracy.add(transcriptionSuccess);
  
  if (transcriptionSuccess) {
    const sessionId = transcriptionResponse.json().session_id;
    
    // Simulate real-time transcription segments
    simulateTranscriptionSegments(baseUrl, authSession, sessionId, meetingId, scenario);
    
    // Complete transcription and get final results
    sleep(5);
    completeTranscriptionSession(baseUrl, authSession, sessionId, meetingId);
  }
}

function simulateTranscriptionSegments(baseUrl, authSession, sessionId, meetingId, scenario) {
  const segments = [
    { speaker: 'Chairman', text: 'Good morning, everyone. Let\'s call this board meeting to order.', confidence: 0.95 },
    { speaker: 'CFO', text: 'Thank you, Chairman. I\'d like to present the quarterly financial results.', confidence: 0.92 },
    { speaker: 'CEO', text: 'The revenue figures show strong growth compared to the previous quarter.', confidence: 0.88 },
    { speaker: 'Legal Counsel', text: 'From a compliance perspective, we\'ve successfully met all regulatory requirements.', confidence: 0.90 },
    { speaker: 'Board Member 1', text: 'I have concerns about the proposed expansion into new markets.', confidence: 0.87 },
    { speaker: 'Board Member 2', text: 'What are the risk factors we should consider for this initiative?', confidence: 0.93 },
    { speaker: 'Chairman', text: 'Let\'s move to a formal vote on the budget allocation proposal.', confidence: 0.96 },
    { speaker: 'Secretary', text: 'The motion has been seconded. All in favor, please indicate.', confidence: 0.91 }
  ];
  
  segments.forEach((segment, index) => {
    setTimeout(() => {
      const segmentPayload = {
        session_id: sessionId,
        meeting_id: meetingId,
        segment_id: `segment_${index + 1}`,
        speaker_id: segment.speaker.toLowerCase().replace(' ', '_'),
        speaker_name: segment.speaker,
        text: segment.text,
        confidence: segment.confidence,
        timestamp: new Date().toISOString(),
        is_final: true,
        metadata: {
          audio_duration: Math.random() * 10 + 5, // 5-15 seconds
          words_count: segment.text.split(' ').length
        }
      };
      
      const segmentStartTime = new Date();
      const segmentResponse = http.post(
        `${baseUrl}/api/ai-meeting/transcription/segment`,
        JSON.stringify(segmentPayload),
        { headers: getAuthHeaders(authSession) }
      );
      const segmentDuration = new Date() - segmentStartTime;
      
      transcriptionLatency.add(segmentDuration);
      
      const segmentSuccess = check(segmentResponse, {
        [`transcription segment ${index + 1} status is 200`]: (r) => r.status === 200,
        [`transcription segment ${index + 1} response time < 2s`]: (r) => r.timings.duration < 2000,
      });

      transcriptionAccuracy.add(segmentSuccess);
      
    }, index * 3000); // 3 second intervals between segments
  });
}

function completeTranscriptionSession(baseUrl, authSession, sessionId, meetingId) {
  const completionPayload = {
    session_id: sessionId,
    meeting_id: meetingId,
    generate_summary: true,
    extract_action_items: true,
    analyze_sentiment: true,
    identify_decisions: true
  };
  
  const completionStartTime = new Date();
  const completionResponse = http.post(
    `${baseUrl}/api/ai-meeting/transcription/${meetingId}/complete`,
    JSON.stringify(completionPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const completionDuration = new Date() - completionStartTime;
  
  aiProcessingTime.add(completionDuration);
  
  const completionSuccess = check(completionResponse, {
    'transcription completion status is 200': (r) => r.status === 200,
    'transcription has full_transcript': (r) => r.json() && r.json().full_transcript,
    'transcription has action_items': (r) => r.json() && r.json().action_items && r.json().action_items.length > 0,
    'transcription completion time < 10s': (r) => r.timings.duration < 10000,
  });

  aiProcessingSuccess.add(completionSuccess);
  
  if (completionSuccess) {
    const transcriptData = completionResponse.json();
    console.log(`Transcription completed: ${transcriptData.full_transcript.length} chars, ${transcriptData.action_items.length} action items`);
  }
}

function performComplianceAnalysisTest(baseUrl, authSession) {
  console.log('Testing AI compliance analysis processing...');
  
  const scenario = aiScenarios.complianceAnalysis;
  const framework = scenario.frameworks[Math.floor(Math.random() * scenario.frameworks.length)];
  
  const compliancePayload = {
    framework: framework,
    analysis_scope: 'comprehensive',
    document_count: scenario.documentCount,
    features: Object.keys(scenario.features).filter(f => scenario.features[f]),
    priority: 'high',
    compliance_period: {
      start: '2024-01-01',
      end: '2024-12-31'
    }
  };
  
  const complianceStartTime = new Date();
  const complianceResponse = http.post(
    `${baseUrl}/api/compliance/advanced`,
    JSON.stringify(compliancePayload),
    { headers: getAuthHeaders(authSession) }
  );
  const complianceDuration = new Date() - complianceStartTime;
  
  aiProcessingTime.add(complianceDuration);
  
  const complianceSuccess = check(complianceResponse, {
    'compliance analysis status is 200': (r) => r.status === 200 || r.status === 202,
    'compliance analysis has job_id': (r) => r.json() && r.json().analysis_id,
    'compliance analysis response time < 15s': (r) => r.timings.duration < 15000,
  });

  aiProcessingSuccess.add(complianceSuccess);
  
  if (complianceSuccess) {
    const analysisData = complianceResponse.json();
    console.log(`Compliance analysis started for ${framework} framework`);
    
    // If async, poll for completion
    if (complianceResponse.status === 202) {
      pollAIJobCompletion(baseUrl, authSession, analysisData.analysis_id, 'compliance_analysis');
    }
  }
}

function performStrategicInsightsTest(baseUrl, authSession) {
  console.log('Testing AI strategic insights processing...');
  
  const scenario = aiScenarios.strategicInsights;
  
  const insightsPayload = {
    analysis_type: 'strategic_planning',
    data_points: scenario.dataPoints,
    time_range: scenario.timeRange,
    depth: scenario.analysisDepth,
    features: Object.keys(scenario.features).filter(f => scenario.features[f]),
    focus_areas: [
      'market_trends',
      'competitive_landscape',
      'financial_performance',
      'operational_efficiency',
      'risk_assessment',
      'growth_opportunities'
    ]
  };
  
  const insightsStartTime = new Date();
  const insightsResponse = http.post(
    `${baseUrl}/api/analytics/strategic-insights`,
    JSON.stringify(insightsPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const insightsDuration = new Date() - insightsStartTime;
  
  insightGenerationTime.add(insightsDuration);
  
  const insightsSuccess = check(insightsResponse, {
    'strategic insights status is 200': (r) => r.status === 200,
    'strategic insights has analysis': (r) => r.json() && r.json().insights && r.json().insights.length > 0,
    'strategic insights has recommendations': (r) => r.json() && r.json().recommendations,
    'strategic insights response time < 20s': (r) => r.timings.duration < 20000,
  });

  insightQuality.add(insightsSuccess);
  
  if (insightsSuccess) {
    const insightsData = insightsResponse.json();
    console.log(`Generated ${insightsData.insights.length} strategic insights with ${insightsData.recommendations.length} recommendations`);
  }
}

function pollAIJobCompletion(baseUrl, authSession, jobId, jobType) {
  const maxPolls = 10;
  const pollInterval = 2000; // 2 seconds
  
  for (let poll = 0; poll < maxPolls; poll++) {
    sleep(pollInterval / 1000); // Convert to seconds for K6
    
    const statusResponse = http.get(
      `${baseUrl}/api/ai/jobs/${jobId}/status`,
      { headers: getAuthHeaders(authSession) }
    );
    
    if (statusResponse.status === 200) {
      const statusData = statusResponse.json();
      
      if (statusData.status === 'completed') {
        console.log(`${jobType} job ${jobId} completed after ${poll + 1} polls`);
        return true;
      } else if (statusData.status === 'failed') {
        console.error(`${jobType} job ${jobId} failed: ${statusData.error}`);
        aiErrors.add(1);
        return false;
      }
      
      // Update queue metrics if available
      if (statusData.queue_position !== undefined) {
        aiQueueLength.add(statusData.queue_position);
      }
    }
  }
  
  console.warn(`${jobType} job ${jobId} did not complete within polling timeout`);
  return false;
}

function selectWeightedScenario(weights) {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const [scenario, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return scenario;
    }
  }
  
  // Fallback to first scenario
  return Object.keys(weights)[0];
}

function generateContextDocuments() {
  // Simulate document references for chat context
  const documentTypes = ['board_pack', 'financial_report', 'meeting_minutes', 'compliance_report'];
  const docCount = Math.floor(Math.random() * 3) + 1; // 1-3 documents
  
  return Array.from({ length: docCount }, (_, i) => ({
    id: `doc_${Date.now()}_${i}`,
    type: documentTypes[i % documentTypes.length],
    title: `Context Document ${i + 1}`,
    relevance_score: Math.random() * 0.3 + 0.7 // 0.7-1.0 relevance
  }));
}

export function handleSummary(data) {
  return {
    'ai-processing-load-summary.json': JSON.stringify(data),
    stdout: `
AI Processing Load Test Summary:
================================

AI Processing Performance Metrics:
- Average AI Processing Time: ${data.metrics.ai_processing_time ? data.metrics.ai_processing_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile AI Processing: ${data.metrics.ai_processing_time ? data.metrics.ai_processing_time.values['p(95)'].toFixed(2) : 'N/A'}ms
- AI Processing Success Rate: ${data.metrics.ai_processing_success_rate ? (data.metrics.ai_processing_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Transcription Metrics:
- Average Transcription Latency: ${data.metrics.ai_transcription_latency ? data.metrics.ai_transcription_latency.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Transcription: ${data.metrics.ai_transcription_latency ? data.metrics.ai_transcription_latency.values['p(95)'].toFixed(2) : 'N/A'}ms
- Transcription Accuracy Rate: ${data.metrics.ai_transcription_accuracy_rate ? (data.metrics.ai_transcription_accuracy_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Document Analysis Metrics:
- Average Document Analysis Time: ${data.metrics.ai_document_analysis_time ? data.metrics.ai_document_analysis_time.values.avg.toFixed(2) : 'N/A'}ms
- Document Analysis Success Rate: ${data.metrics.ai_document_analysis_success_rate ? (data.metrics.ai_document_analysis_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Summarization Metrics:
- Average Summarization Time: ${data.metrics.ai_summarization_time ? data.metrics.ai_summarization_time.values.avg.toFixed(2) : 'N/A'}ms

Chat AI Metrics:
- Average Chat Response Time: ${data.metrics.ai_chat_response_time ? data.metrics.ai_chat_response_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Chat Response: ${data.metrics.ai_chat_response_time ? data.metrics.ai_chat_response_time.values['p(95)'].toFixed(2) : 'N/A'}ms
- Chat Quality Rate: ${data.metrics.ai_chat_quality_rate ? (data.metrics.ai_chat_quality_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Strategic Insights Metrics:
- Average Insight Generation Time: ${data.metrics.ai_insight_generation_time ? data.metrics.ai_insight_generation_time.values.avg.toFixed(2) : 'N/A'}ms
- Insight Quality Rate: ${data.metrics.ai_insight_quality_rate ? (data.metrics.ai_insight_quality_rate.values.rate * 100).toFixed(2) : 'N/A'}%

System Metrics:
- AI Processing Errors: ${data.metrics.ai_processing_errors ? data.metrics.ai_processing_errors.values.count : 0}
- AI Model Switches: ${data.metrics.ai_model_switches ? data.metrics.ai_model_switches.values.count : 0}
- Max Concurrent AI Requests: ${data.metrics.concurrent_ai_requests ? data.metrics.concurrent_ai_requests.values.max : 'N/A'}

Overall Test Results:
- Total HTTP Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed ? data.metrics.http_req_failed.values.fails : 0}
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms

Test passed: ${(data.metrics.ai_processing_success_rate?.values.rate || 0) >= 0.95 && (data.metrics.ai_transcription_accuracy_rate?.values.rate || 0) >= 0.90 ? 'YES' : 'NO'}
    `
  };
}