// Concurrent Board Meetings Load Test
// Simulates multiple board meetings happening simultaneously with realistic user behavior

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { getConfig } from '../config/test-config.js';
import { 
  getRandomUser, 
  getUserByOrg, 
  authenticateUser, 
  getAuthHeaders 
} from '../utils/auth.js';
import { 
  connectWebSocket, 
  simulateMeetingParticipant,
  messageTypes 
} from '../utils/websocket.js';

// Custom metrics for meeting performance
const meetingJoinTime = new Trend('meeting_join_time');
const meetingParticipantCount = new Trend('meeting_participant_count');
const transcriptionLatency = new Trend('transcription_latency');
const votingResponseTime = new Trend('voting_response_time');
const meetingJoinSuccess = new Rate('meeting_join_success_rate');
const transcriptionSuccess = new Rate('transcription_success_rate');
const votingSuccess = new Rate('voting_success_rate');
const aiProcessingSuccess = new Rate('ai_processing_success_rate');

// Meeting data for concurrent testing
const meetingTemplates = [
  {
    id: 'board_meeting_1',
    title: 'Quarterly Board Review - Q4 2024',
    type: 'board_meeting',
    expectedParticipants: 12,
    duration: 90, // minutes
    agenda: [
      'Financial Performance Review',
      'Strategic Initiative Updates',
      'Risk Management Report',
      'Executive Compensation',
      'Upcoming Investments'
    ]
  },
  {
    id: 'committee_meeting_1',
    title: 'Audit Committee Session',
    type: 'committee_meeting',
    expectedParticipants: 6,
    duration: 60,
    agenda: [
      'Internal Audit Findings',
      'External Auditor Report',
      'Compliance Updates',
      'Risk Assessment Review'
    ]
  },
  {
    id: 'strategic_meeting_1',
    title: 'Strategic Planning Workshop',
    type: 'strategic_planning',
    expectedParticipants: 15,
    duration: 120,
    agenda: [
      'Market Analysis',
      'Competitive Landscape',
      'Growth Opportunities',
      'Resource Allocation',
      'Timeline Planning'
    ]
  },
  {
    id: 'emergency_meeting_1',
    title: 'Emergency Board Session',
    type: 'emergency_meeting',
    expectedParticipants: 8,
    duration: 45,
    agenda: [
      'Crisis Response',
      'Immediate Actions Required',
      'Communication Strategy',
      'Board Resolutions'
    ]
  }
];

export let options = {
  scenarios: {
    concurrent_meetings: getConfig().loadScenarios.concurrentMeetings
  },
  thresholds: {
    'meeting_join_time': ['p(95)<2000'], // 95% join within 2 seconds
    'transcription_latency': ['p(95)<5000'], // 95% transcription within 5 seconds
    'voting_response_time': ['p(95)<1000'], // 95% voting within 1 second
    'meeting_join_success_rate': ['rate>0.995'], // 99.5% success rate
    'transcription_success_rate': ['rate>0.98'], // 98% success rate
    'voting_success_rate': ['rate>0.99'], // 99% success rate
  }
};

export default function concurrentMeetingsTest() {
  const config = getConfig();
  const baseUrl = config.environment.baseUrl;
  
  // Authenticate user
  const user = getRandomUser('boardMembers');
  const authSession = authenticateUser(baseUrl, user);
  
  if (!authSession) {
    console.error('Authentication failed');
    return;
  }

  console.log(`User ${user.email} authenticated, starting meeting simulation`);
  
  // Select a meeting to join
  const meeting = meetingTemplates[Math.floor(Math.random() * meetingTemplates.length)];
  const meetingId = `${meeting.id}_${Date.now()}_${__VU}`;
  
  try {
    // Phase 1: Create/Join Meeting
    const joinStartTime = new Date();
    const meetingData = createOrJoinMeeting(baseUrl, authSession, meetingId, meeting);
    const joinDuration = new Date() - joinStartTime;
    
    meetingJoinTime.add(joinDuration);
    meetingJoinSuccess.add(meetingData.success);
    
    if (!meetingData.success) {
      console.error(`Failed to join meeting ${meetingId}`);
      return;
    }

    console.log(`Joined meeting ${meetingId} in ${joinDuration}ms`);
    
    // Phase 2: WebSocket Connection for Real-time Features
    const wsConnection = connectWebSocket(baseUrl, authSession, {
      enablePeriodicMessages: true
    });
    
    if (wsConnection) {
      // Simulate meeting participant behavior
      simulateMeetingParticipant(wsConnection, authSession, meetingId, meeting.duration * 60 * 1000);
      
      // Phase 3: Meeting Activities
      sleep(2); // Wait for connection to stabilize
      
      // Start transcription if user is secretary or admin
      if (authSession.user.role === 'secretary' || authSession.user.role === 'admin') {
        startMeetingTranscription(baseUrl, authSession, meetingId);
      }
      
      // Simulate meeting progression
      simulateMeetingProgression(baseUrl, authSession, meetingId, meeting);
      
      // Phase 4: Voting Scenarios
      if (Math.random() < 0.7) { // 70% chance to have voting
        simulateVotingSession(baseUrl, authSession, meetingId);
      }
      
      // Phase 5: AI Processing
      if (Math.random() < 0.5) { // 50% chance to use AI features
        simulateAIProcessing(baseUrl, authSession, meetingId);
      }
      
      // Clean up WebSocket connection
      wsConnection.close();
    }
    
  } catch (error) {
    console.error(`Error in meeting simulation: ${error}`);
    meetingJoinSuccess.add(false);
  }
  
  // Random think time between activities
  sleep(Math.random() * 3 + 1);
}

function createOrJoinMeeting(baseUrl, authSession, meetingId, meetingTemplate) {
  const createMeetingUrl = `${baseUrl}/api/meetings`;
  
  const payload = {
    id: meetingId,
    title: meetingTemplate.title,
    type: meetingTemplate.type,
    scheduled_start: new Date().toISOString(),
    expected_duration: meetingTemplate.duration,
    agenda: meetingTemplate.agenda,
    participants: generateParticipantList(meetingTemplate.expectedParticipants),
    settings: {
      enable_recording: true,
      enable_transcription: true,
      enable_ai_insights: true,
      voting_enabled: true
    }
  };

  const params = {
    headers: getAuthHeaders(authSession),
  };

  const response = http.post(createMeetingUrl, JSON.stringify(payload), params);
  
  const success = check(response, {
    'meeting create/join status is 200 or 409': (r) => r.status === 200 || r.status === 409,
    'meeting response has id': (r) => r.json() && (r.json().id || r.json().meeting_id),
    'meeting join response time < 3s': (r) => r.timings.duration < 3000,
  });

  return {
    success: success,
    meeting: response.json(),
    participantCount: meetingTemplate.expectedParticipants
  };
}

function startMeetingTranscription(baseUrl, authSession, meetingId) {
  const transcriptionUrl = `${baseUrl}/api/ai-meeting/transcription/start`;
  
  const payload = {
    meeting_id: meetingId,
    language: 'en',
    real_time: true,
    speaker_identification: true
  };

  const params = {
    headers: getAuthHeaders(authSession),
  };

  const startTime = new Date();
  const response = http.post(transcriptionUrl, JSON.stringify(payload), params);
  const duration = new Date() - startTime;
  
  transcriptionLatency.add(duration);
  
  const success = check(response, {
    'transcription start status is 200': (r) => r.status === 200,
    'transcription response has session_id': (r) => r.json() && r.json().session_id,
    'transcription start time < 5s': (r) => r.timings.duration < 5000,
  });

  transcriptionSuccess.add(success);
  
  if (success) {
    console.log(`Started transcription for meeting ${meetingId} in ${duration}ms`);
    
    // Simulate periodic transcription segments
    setTimeout(() => {
      simulateTranscriptionSegments(baseUrl, authSession, meetingId, response.json().session_id);
    }, 10000); // Start segments after 10 seconds
  }
}

function simulateTranscriptionSegments(baseUrl, authSession, meetingId, sessionId) {
  const segmentUrl = `${baseUrl}/api/ai-meeting/transcription/segment`;
  
  const segments = [
    'Thank you all for joining today\'s board meeting.',
    'Let\'s begin with the financial performance review for this quarter.',
    'The revenue figures show a significant increase compared to last quarter.',
    'Are there any questions about the financial report?',
    'Moving on to the strategic initiatives update.',
    'I\'d like to motion for approval of the proposed budget allocation.'
  ];

  let segmentIndex = 0;
  const segmentInterval = setInterval(() => {
    if (segmentIndex >= segments.length) {
      clearInterval(segmentInterval);
      return;
    }

    const payload = {
      session_id: sessionId,
      meeting_id: meetingId,
      speaker_id: `speaker_${Math.floor(Math.random() * 5) + 1}`,
      text: segments[segmentIndex],
      confidence: 0.9 + Math.random() * 0.1,
      timestamp: new Date().toISOString(),
      is_final: true
    };

    const params = {
      headers: getAuthHeaders(authSession),
    };

    const response = http.post(segmentUrl, JSON.stringify(payload), params);
    
    check(response, {
      'transcription segment status is 200': (r) => r.status === 200,
    });

    segmentIndex++;
  }, 15000); // New segment every 15 seconds
}

function simulateMeetingProgression(baseUrl, authSession, meetingId, meeting) {
  // Simulate agenda progression
  meeting.agenda.forEach((agendaItem, index) => {
    setTimeout(() => {
      const progressUrl = `${baseUrl}/api/meetings/${meetingId}/progress`;
      
      const payload = {
        current_agenda_item: index,
        agenda_item_title: agendaItem,
        timestamp: new Date().toISOString()
      };

      const params = {
        headers: getAuthHeaders(authSession),
      };

      http.put(progressUrl, JSON.stringify(payload), params);
    }, index * 30000); // 30 seconds per agenda item
  });
}

function simulateVotingSession(baseUrl, authSession, meetingId) {
  // Create a vote
  const createVoteUrl = `${baseUrl}/api/virtual-board-room/${meetingId}/voting`;
  
  const votePayload = {
    title: 'Approval of Annual Budget Allocation',
    description: 'Vote to approve the proposed budget allocation for next fiscal year',
    options: ['Approve', 'Reject', 'Abstain'],
    voting_method: 'secret',
    duration: 300 // 5 minutes
  };

  const params = {
    headers: getAuthHeaders(authSession),
  };

  const createResponse = http.post(createVoteUrl, JSON.stringify(votePayload), params);
  
  const createSuccess = check(createResponse, {
    'vote create status is 200': (r) => r.status === 200,
    'vote response has id': (r) => r.json() && r.json().vote_id,
  });

  if (createSuccess) {
    const voteId = createResponse.json().vote_id;
    
    // Cast vote after random delay
    setTimeout(() => {
      const castVoteUrl = `${baseUrl}/api/virtual-board-room/${meetingId}/voting/${voteId}/cast`;
      
      const voteChoice = {
        option: ['Approve', 'Reject', 'Abstain'][Math.floor(Math.random() * 3)],
        timestamp: new Date().toISOString()
      };

      const startTime = new Date();
      const castResponse = http.post(castVoteUrl, JSON.stringify(voteChoice), params);
      const duration = new Date() - startTime;
      
      votingResponseTime.add(duration);
      
      const castSuccess = check(castResponse, {
        'vote cast status is 200': (r) => r.status === 200,
        'vote cast response time < 2s': (r) => r.timings.duration < 2000,
      });

      votingSuccess.add(castSuccess);
      
      if (castSuccess) {
        console.log(`Cast vote for ${voteChoice.option} in ${duration}ms`);
      }
    }, Math.random() * 60000); // Random delay up to 1 minute
  }
}

function simulateAIProcessing(baseUrl, authSession, meetingId) {
  // Generate meeting insights
  const insightsUrl = `${baseUrl}/api/ai-meeting/insights`;
  
  const payload = {
    meeting_id: meetingId,
    analysis_type: 'comprehensive',
    include_sentiment: true,
    include_action_items: true,
    include_decisions: true
  };

  const params = {
    headers: getAuthHeaders(authSession),
  };

  const startTime = new Date();
  const response = http.post(insightsUrl, JSON.stringify(payload), params);
  const duration = new Date() - startTime;

  const success = check(response, {
    'ai insights status is 200': (r) => r.status === 200,
    'ai insights has results': (r) => r.json() && r.json().insights,
    'ai insights response time < 10s': (r) => r.timings.duration < 10000,
  });

  aiProcessingSuccess.add(success);
  
  if (success) {
    console.log(`Generated AI insights for meeting ${meetingId} in ${duration}ms`);
  }
}

function generateParticipantList(expectedCount) {
  const participants = [];
  const roles = ['board_member', 'observer', 'secretary', 'admin'];
  
  for (let i = 0; i < expectedCount; i++) {
    participants.push({
      user_id: `test_user_${i}`,
      role: roles[i % roles.length],
      email: `participant${i}@test.boardguru.ai`
    });
  }
  
  return participants;
}

export function handleSummary(data) {
  return {
    'concurrent-meetings-summary.json': JSON.stringify(data),
    stdout: `
Concurrent Meetings Load Test Summary:
=====================================

Meeting Performance Metrics:
- Average Meeting Join Time: ${data.metrics.meeting_join_time.values.avg.toFixed(2)}ms
- 95th Percentile Join Time: ${data.metrics.meeting_join_time.values['p(95)'].toFixed(2)}ms
- Meeting Join Success Rate: ${(data.metrics.meeting_join_success_rate.values.rate * 100).toFixed(2)}%

Real-time Features:
- Average Transcription Latency: ${data.metrics.transcription_latency ? data.metrics.transcription_latency.values.avg.toFixed(2) : 'N/A'}ms
- Transcription Success Rate: ${data.metrics.transcription_success_rate ? (data.metrics.transcription_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Voting Performance:
- Average Voting Response Time: ${data.metrics.voting_response_time ? data.metrics.voting_response_time.values.avg.toFixed(2) : 'N/A'}ms
- Voting Success Rate: ${data.metrics.voting_success_rate ? (data.metrics.voting_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

AI Processing:
- AI Processing Success Rate: ${data.metrics.ai_processing_success_rate ? (data.metrics.ai_processing_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Overall Test Results:
- Total HTTP Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed ? data.metrics.http_req_failed.values.fails : 0}
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- 95th Percentile Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms

Test passed: ${data.metrics.meeting_join_success_rate.values.rate >= 0.995 ? 'YES' : 'NO'}
    `
  };
}