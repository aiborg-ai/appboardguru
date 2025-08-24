// Database Performance Load Testing
// Tests database performance under high load with enterprise-scale data volumes

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { getConfig } from '../config/test-config.js';
import { 
  getRandomUser, 
  authenticateUser, 
  getAuthHeaders 
} from '../utils/auth.js';

// Custom metrics for database performance
const dbQueryTime = new Trend('database_query_time');
const dbQueryComplexTime = new Trend('database_complex_query_time');
const dbWriteTime = new Trend('database_write_time');
const dbBatchTime = new Trend('database_batch_time');
const dbConnectionTime = new Trend('database_connection_time');
const dbQuerySuccess = new Rate('database_query_success_rate');
const dbWriteSuccess = new Rate('database_write_success_rate');
const dbDeadlocks = new Counter('database_deadlocks');
const dbConnectionPool = new Gauge('database_connection_pool_usage');

// Test data generation utilities
const testDataGenerators = {
  // Generate large organization data
  generateOrganization: (size = 'large') => {
    const sizes = {
      small: { users: 50, documents: 500, meetings: 100 },
      medium: { users: 200, documents: 2000, meetings: 500 },
      large: { users: 1000, documents: 10000, meetings: 2500 },
      enterprise: { users: 5000, documents: 50000, meetings: 10000 }
    };
    
    const config = sizes[size] || sizes.large;
    
    return {
      name: `Test Organization ${Math.random().toString(36).substr(2, 9)}`,
      slug: `test-org-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'corporation',
      industry: ['technology', 'finance', 'healthcare', 'manufacturing'][Math.floor(Math.random() * 4)],
      settings: {
        max_users: config.users,
        max_documents: config.documents,
        max_meetings_per_month: config.meetings,
        compliance_frameworks: ['sox', 'gdpr', 'iso27001'],
        ai_features_enabled: true,
        advanced_analytics: true
      },
      metadata: {
        created_for_testing: true,
        test_scenario: 'database_load_test',
        expected_load: size
      }
    };
  },

  // Generate meeting with many participants and complex data
  generateMeetingWithComplexData: (participantCount = 50) => ({
    title: `Large Board Meeting ${Date.now()}`,
    type: 'annual_general_meeting',
    scheduled_start: new Date(Date.now() + Math.random() * 86400000).toISOString(),
    expected_duration: 180,
    participants: Array.from({ length: participantCount }, (_, i) => ({
      user_id: `bulk_user_${i}`,
      role: ['board_member', 'observer', 'secretary'][i % 3],
      email: `bulkuser${i}@test.boardguru.ai`
    })),
    agenda: Array.from({ length: 15 }, (_, i) => `Agenda Item ${i + 1}`),
    documents: Array.from({ length: 20 }, (_, i) => `document_${i}.pdf`),
    voting_items: Array.from({ length: 10 }, (_, i) => ({
      title: `Resolution ${i + 1}`,
      description: `Corporate resolution requiring board approval ${i + 1}`,
      voting_method: 'recorded',
      options: ['Approve', 'Reject', 'Abstain']
    })),
    compliance_requirements: {
      recording_required: true,
      transcript_required: true,
      audit_trail: true,
      quorum_tracking: true
    }
  }),

  // Generate bulk document data
  generateBulkDocuments: (count = 100) => {
    return Array.from({ length: count }, (_, i) => ({
      title: `Bulk Document ${i + 1}`,
      type: ['board_pack', 'financial_report', 'legal_document', 'presentation'][i % 4],
      size: Math.floor(Math.random() * 10485760) + 1024, // 1KB to 10MB
      pages: Math.floor(Math.random() * 100) + 1,
      annotations: Array.from({ length: Math.floor(Math.random() * 50) }, (_, j) => ({
        page: Math.floor(Math.random() * 100) + 1,
        x: Math.floor(Math.random() * 800),
        y: Math.floor(Math.random() * 600),
        width: Math.floor(Math.random() * 200) + 50,
        height: Math.floor(Math.random() * 100) + 20,
        content: `Annotation ${j + 1} for document ${i + 1}`,
        type: ['highlight', 'note', 'question', 'action_item'][j % 4],
        created_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
      })),
      ai_analysis: {
        summary_generated: true,
        key_points_extracted: true,
        sentiment_analysis: Math.random() > 0.5 ? 'positive' : 'neutral',
        complexity_score: Math.random(),
        processing_time: Math.floor(Math.random() * 30000) + 1000
      },
      version_history: Array.from({ length: Math.floor(Math.random() * 10) + 1 }, (_, v) => ({
        version: v + 1,
        changed_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        change_summary: `Version ${v + 1} changes`
      }))
    }));
  },

  // Generate audit log entries
  generateAuditEntries: (count = 1000) => {
    const actions = [
      'document_viewed', 'document_downloaded', 'document_annotated',
      'meeting_joined', 'meeting_left', 'vote_cast',
      'user_login', 'user_logout', 'permission_granted',
      'data_exported', 'settings_changed', 'invitation_sent'
    ];

    return Array.from({ length: count }, (_, i) => ({
      action: actions[Math.floor(Math.random() * actions.length)],
      user_id: `bulk_user_${Math.floor(Math.random() * 100)}`,
      resource_type: ['document', 'meeting', 'user', 'organization'][Math.floor(Math.random() * 4)],
      resource_id: `resource_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date(Date.now() - Math.random() * 2592000000).toISOString(), // Last 30 days
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      user_agent: 'K6 Load Test Agent',
      details: {
        test_generated: true,
        batch_id: `batch_${Math.floor(i / 100)}`,
        sequence: i
      }
    }));
  }
};

export let options = {
  scenarios: {
    database_load: getConfig().loadScenarios.databaseLoad
  },
  thresholds: {
    'database_query_time': ['p(95)<500'], // 95% of queries under 500ms
    'database_complex_query_time': ['p(95)<2000'], // Complex queries under 2s
    'database_write_time': ['p(95)<1000'], // Writes under 1s
    'database_batch_time': ['p(95)<5000'], // Batch operations under 5s
    'database_query_success_rate': ['rate>0.99'], // 99% success rate
    'database_write_success_rate': ['rate>0.995'], // 99.5% write success
  }
};

export default function databaseLoadTest() {
  const config = getConfig();
  const baseUrl = config.environment.baseUrl;
  
  // Authenticate user
  const user = getRandomUser('admin'); // Use admin for database operations
  const authSession = authenticateUser(baseUrl, user);
  
  if (!authSession) {
    console.error('Authentication failed');
    return;
  }

  console.log(`Starting database load test for user ${user.email}`);
  
  try {
    // Test 1: Simple Query Performance
    performSimpleQueries(baseUrl, authSession);
    
    sleep(1);
    
    // Test 2: Complex Query Performance
    performComplexQueries(baseUrl, authSession);
    
    sleep(1);
    
    // Test 3: Write Operations Performance
    performWriteOperations(baseUrl, authSession);
    
    sleep(1);
    
    // Test 4: Batch Operations Performance
    performBatchOperations(baseUrl, authSession);
    
    sleep(1);
    
    // Test 5: Analytics Queries
    performAnalyticsQueries(baseUrl, authSession);
    
  } catch (error) {
    console.error(`Database load test error: ${error}`);
  }
  
  // Random think time
  sleep(Math.random() * 2 + 1);
}

function performSimpleQueries(baseUrl, authSession) {
  console.log('Testing simple database queries...');
  
  const simpleQueries = [
    // User profile queries
    { endpoint: '/api/user/profile', description: 'User profile lookup' },
    
    // Organization queries
    { endpoint: '/api/organizations', description: 'Organization list' },
    
    // Asset queries
    { endpoint: '/api/assets', description: 'Asset list' },
    
    // Recent activity
    { endpoint: '/api/dashboard/activity', description: 'Recent activity' },
    
    // Notification count
    { endpoint: '/api/notifications/count', description: 'Notification count' }
  ];

  simpleQueries.forEach(query => {
    const startTime = new Date();
    const response = http.get(`${baseUrl}${query.endpoint}`, {
      headers: getAuthHeaders(authSession)
    });
    const duration = new Date() - startTime;

    dbQueryTime.add(duration);
    
    const success = check(response, {
      [`${query.description} status is 200`]: (r) => r.status === 200,
      [`${query.description} response time < 500ms`]: (r) => r.timings.duration < 500,
    });

    dbQuerySuccess.add(success);
    
    if (!success) {
      console.error(`Simple query failed: ${query.description}`);
    }
  });
}

function performComplexQueries(baseUrl, authSession) {
  console.log('Testing complex database queries...');
  
  const complexQueries = [
    // Analytics dashboard with aggregations
    {
      endpoint: '/api/dashboard/insights',
      method: 'POST',
      payload: {
        date_range: { start: '2024-01-01', end: '2024-12-31' },
        metrics: ['user_activity', 'document_usage', 'meeting_analytics'],
        group_by: ['month', 'organization', 'user_role'],
        include_trends: true
      },
      description: 'Analytics dashboard with aggregations'
    },
    
    // Search across multiple entities
    {
      endpoint: '/api/search/global',
      method: 'POST',
      payload: {
        query: 'financial performance board meeting',
        filters: {
          types: ['documents', 'meetings', 'annotations'],
          date_range: { start: '2024-01-01', end: '2024-12-31' },
          organizations: ['all']
        },
        sort: 'relevance',
        limit: 100
      },
      description: 'Global search across entities'
    },
    
    // Compliance reporting
    {
      endpoint: '/api/compliance/reports',
      method: 'POST',
      payload: {
        framework: 'sox',
        period: { start: '2024-01-01', end: '2024-12-31' },
        include_audit_trail: true,
        include_risk_assessment: true,
        detailed_analysis: true
      },
      description: 'Compliance reporting with audit trail'
    },
    
    // Meeting analytics with participant data
    {
      endpoint: '/api/analytics/meeting-effectiveness',
      method: 'GET',
      queryParams: {
        organization_id: authSession.user.organizationId,
        include_transcription_analysis: 'true',
        include_sentiment_analysis: 'true',
        include_participation_metrics: 'true',
        date_range: '2024-01-01,2024-12-31'
      },
      description: 'Meeting effectiveness analytics'
    }
  ];

  complexQueries.forEach(query => {
    const startTime = new Date();
    let response;
    
    if (query.method === 'POST') {
      response = http.post(
        `${baseUrl}${query.endpoint}`,
        JSON.stringify(query.payload),
        { headers: getAuthHeaders(authSession) }
      );
    } else {
      const url = query.queryParams 
        ? `${baseUrl}${query.endpoint}?${new URLSearchParams(query.queryParams).toString()}`
        : `${baseUrl}${query.endpoint}`;
      response = http.get(url, {
        headers: getAuthHeaders(authSession)
      });
    }
    
    const duration = new Date() - startTime;
    dbComplexTime.add(duration);
    
    const success = check(response, {
      [`${query.description} status is 200`]: (r) => r.status === 200,
      [`${query.description} response time < 5s`]: (r) => r.timings.duration < 5000,
      [`${query.description} has data`]: (r) => r.json() && Object.keys(r.json()).length > 0,
    });

    dbQuerySuccess.add(success);
    
    if (!success) {
      console.error(`Complex query failed: ${query.description} - Status: ${response.status}`);
    }
  });
}

function performWriteOperations(baseUrl, authSession) {
  console.log('Testing database write operations...');
  
  // Test 1: Create organization with bulk data
  const orgData = testDataGenerators.generateOrganization('large');
  
  const createOrgStartTime = new Date();
  const createOrgResponse = http.post(
    `${baseUrl}/api/organizations`,
    JSON.stringify(orgData),
    { headers: getAuthHeaders(authSession) }
  );
  const createOrgDuration = new Date() - createOrgStartTime;
  
  dbWriteTime.add(createOrgDuration);
  
  const createOrgSuccess = check(createOrgResponse, {
    'create organization status is 200': (r) => r.status === 200 || r.status === 201,
    'create organization response time < 2s': (r) => r.timings.duration < 2000,
  });

  dbWriteSuccess.add(createOrgSuccess);
  
  if (createOrgSuccess) {
    const orgId = createOrgResponse.json().id;
    
    // Test 2: Create meeting with complex data
    const meetingData = testDataGenerators.generateMeetingWithComplexData(25);
    
    const createMeetingStartTime = new Date();
    const createMeetingResponse = http.post(
      `${baseUrl}/api/meetings`,
      JSON.stringify({ ...meetingData, organization_id: orgId }),
      { headers: getAuthHeaders(authSession) }
    );
    const createMeetingDuration = new Date() - createMeetingStartTime;
    
    dbWriteTime.add(createMeetingDuration);
    
    const createMeetingSuccess = check(createMeetingResponse, {
      'create complex meeting status is 200': (r) => r.status === 200 || r.status === 201,
      'create meeting response time < 3s': (r) => r.timings.duration < 3000,
    });

    dbWriteSuccess.add(createMeetingSuccess);
    
    if (createMeetingSuccess) {
      const meetingId = createMeetingResponse.json().id;
      
      // Test 3: Add annotations to documents
      sleep(0.5);
      performDocumentAnnotations(baseUrl, authSession, orgId, meetingId);
    }
  }
}

function performDocumentAnnotations(baseUrl, authSession, orgId, meetingId) {
  // Generate and upload bulk documents with annotations
  const documents = testDataGenerators.generateBulkDocuments(5);
  
  documents.forEach((doc, index) => {
    const documentPayload = {
      ...doc,
      organization_id: orgId,
      meeting_id: meetingId,
      uploaded_for_testing: true
    };
    
    const startTime = new Date();
    const response = http.post(
      `${baseUrl}/api/assets`,
      JSON.stringify(documentPayload),
      { headers: getAuthHeaders(authSession) }
    );
    const duration = new Date() - startTime;
    
    dbWriteTime.add(duration);
    
    const success = check(response, {
      'create document with annotations status is 200': (r) => r.status === 200 || r.status === 201,
      'create document response time < 2s': (r) => r.timings.duration < 2000,
    });

    dbWriteSuccess.add(success);
    
    if (success && response.json().id) {
      // Add individual annotations
      const assetId = response.json().id;
      doc.annotations.forEach((annotation, annotationIndex) => {
        setTimeout(() => {
          const annotationPayload = {
            ...annotation,
            asset_id: assetId,
            user_id: authSession.user.id,
            for_testing: true
          };
          
          http.post(
            `${baseUrl}/api/assets/${assetId}/annotations`,
            JSON.stringify(annotationPayload),
            { headers: getAuthHeaders(authSession) }
          );
        }, annotationIndex * 100); // Stagger annotation creation
      });
    }
    
    sleep(0.1); // Small delay between documents
  });
}

function performBatchOperations(baseUrl, authSession) {
  console.log('Testing batch database operations...');
  
  // Test 1: Bulk audit log insertion
  const auditEntries = testDataGenerators.generateAuditEntries(500);
  
  const batchAuditStartTime = new Date();
  const batchAuditResponse = http.post(
    `${baseUrl}/api/audit/bulk`,
    JSON.stringify({ entries: auditEntries }),
    { headers: getAuthHeaders(authSession) }
  );
  const batchAuditDuration = new Date() - batchAuditStartTime;
  
  dbBatchTime.add(batchAuditDuration);
  
  const batchAuditSuccess = check(batchAuditResponse, {
    'bulk audit insert status is 200': (r) => r.status === 200 || r.status === 201,
    'bulk audit insert response time < 10s': (r) => r.timings.duration < 10000,
  });

  dbWriteSuccess.add(batchAuditSuccess);
  
  // Test 2: Bulk user operations
  const bulkUsers = Array.from({ length: 50 }, (_, i) => ({
    email: `bulkuser${i}_${Date.now()}@test.boardguru.ai`,
    name: `Bulk User ${i}`,
    role: ['board_member', 'observer'][i % 2],
    organization_id: authSession.user.organizationId,
    created_for_testing: true
  }));
  
  const batchUsersStartTime = new Date();
  const batchUsersResponse = http.post(
    `${baseUrl}/api/users/bulk`,
    JSON.stringify({ users: bulkUsers }),
    { headers: getAuthHeaders(authSession) }
  );
  const batchUsersDuration = new Date() - batchUsersStartTime;
  
  dbBatchTime.add(batchUsersDuration);
  
  const batchUsersSuccess = check(batchUsersResponse, {
    'bulk users insert status is 200': (r) => r.status === 200 || r.status === 201,
    'bulk users insert response time < 5s': (r) => r.timings.duration < 5000,
  });

  dbWriteSuccess.add(batchUsersSuccess);
  
  // Test 3: Bulk notification processing
  const bulkNotifications = Array.from({ length: 100 }, (_, i) => ({
    type: 'system_announcement',
    title: `Bulk Notification ${i}`,
    message: `This is a test notification ${i} for database load testing`,
    recipient_type: 'all_users',
    organization_id: authSession.user.organizationId,
    created_for_testing: true,
    scheduled_at: new Date(Date.now() + i * 1000).toISOString()
  }));
  
  const batchNotificationsStartTime = new Date();
  const batchNotificationsResponse = http.post(
    `${baseUrl}/api/notifications/bulk`,
    JSON.stringify({ notifications: bulkNotifications }),
    { headers: getAuthHeaders(authSession) }
  );
  const batchNotificationsDuration = new Date() - batchNotificationsStartTime;
  
  dbBatchTime.add(batchNotificationsDuration);
  
  const batchNotificationsSuccess = check(batchNotificationsResponse, {
    'bulk notifications insert status is 200': (r) => r.status === 200 || r.status === 201,
    'bulk notifications response time < 3s': (r) => r.timings.duration < 3000,
  });

  dbWriteSuccess.add(batchNotificationsSuccess);
}

function performAnalyticsQueries(baseUrl, authSession) {
  console.log('Testing analytics database queries...');
  
  const analyticsQueries = [
    // Time-series analytics
    {
      endpoint: '/api/analytics/time-series',
      payload: {
        metrics: ['user_activity', 'document_views', 'meeting_duration'],
        timeframe: 'last_90_days',
        granularity: 'daily',
        organization_ids: [authSession.user.organizationId]
      },
      description: 'Time-series analytics'
    },
    
    // User engagement analytics
    {
      endpoint: '/api/analytics/engagement',
      payload: {
        analysis_type: 'comprehensive',
        include_behavioral_patterns: true,
        include_usage_trends: true,
        date_range: { start: '2024-01-01', end: '2024-12-31' }
      },
      description: 'User engagement analytics'
    },
    
    // Document collaboration metrics
    {
      endpoint: '/api/analytics/collaboration',
      payload: {
        metrics: ['annotation_frequency', 'collaboration_time', 'version_history'],
        aggregation_level: 'organization',
        include_user_breakdown: true
      },
      description: 'Document collaboration metrics'
    },
    
    // Compliance analytics
    {
      endpoint: '/api/analytics/compliance',
      payload: {
        frameworks: ['sox', 'gdpr', 'iso27001'],
        include_risk_scores: true,
        include_audit_trail_analysis: true,
        generate_recommendations: true
      },
      description: 'Compliance analytics'
    }
  ];

  analyticsQueries.forEach(query => {
    const startTime = new Date();
    const response = http.post(
      `${baseUrl}${query.endpoint}`,
      JSON.stringify(query.payload),
      { headers: getAuthHeaders(authSession) }
    );
    const duration = new Date() - startTime;
    
    dbComplexTime.add(duration);
    
    const success = check(response, {
      [`${query.description} status is 200`]: (r) => r.status === 200,
      [`${query.description} response time < 10s`]: (r) => r.timings.duration < 10000,
      [`${query.description} has analytics data`]: (r) => {
        const data = r.json();
        return data && (data.data || data.results || data.analytics);
      },
    });

    dbQuerySuccess.add(success);
    
    if (!success) {
      console.error(`Analytics query failed: ${query.description} - Status: ${response.status}`);
    }
  });
}

export function handleSummary(data) {
  return {
    'database-load-test-summary.json': JSON.stringify(data),
    stdout: `
Database Load Test Summary:
===========================

Query Performance Metrics:
- Average Simple Query Time: ${data.metrics.database_query_time ? data.metrics.database_query_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Simple Query: ${data.metrics.database_query_time ? data.metrics.database_query_time.values['p(95)'].toFixed(2) : 'N/A'}ms
- Average Complex Query Time: ${data.metrics.database_complex_query_time ? data.metrics.database_complex_query_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Complex Query: ${data.metrics.database_complex_query_time ? data.metrics.database_complex_query_time.values['p(95)'].toFixed(2) : 'N/A'}ms

Write Performance Metrics:
- Average Write Time: ${data.metrics.database_write_time ? data.metrics.database_write_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Write Time: ${data.metrics.database_write_time ? data.metrics.database_write_time.values['p(95)'].toFixed(2) : 'N/A'}ms
- Average Batch Time: ${data.metrics.database_batch_time ? data.metrics.database_batch_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Batch Time: ${data.metrics.database_batch_time ? data.metrics.database_batch_time.values['p(95)'].toFixed(2) : 'N/A'}ms

Success Rates:
- Database Query Success: ${data.metrics.database_query_success_rate ? (data.metrics.database_query_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%
- Database Write Success: ${data.metrics.database_write_success_rate ? (data.metrics.database_write_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

System Metrics:
- Total Database Operations: ${(data.metrics.database_query_success_rate?.values.passes || 0) + (data.metrics.database_write_success_rate?.values.passes || 0)}
- Database Deadlocks: ${data.metrics.database_deadlocks ? data.metrics.database_deadlocks.values.count : 0}

Overall Test Results:
- Total HTTP Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed ? data.metrics.http_req_failed.values.fails : 0}
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms

Test passed: ${(data.metrics.database_query_success_rate?.values.rate || 0) >= 0.99 && (data.metrics.database_write_success_rate?.values.rate || 0) >= 0.995 ? 'YES' : 'NO'}
    `
  };
}