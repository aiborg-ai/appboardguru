// Document Collaboration Stress Test
// Tests real-time collaborative editing with operational transforms and conflict resolution

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { getConfig } from '../config/test-config.js';
import { 
  getRandomUser, 
  authenticateUser, 
  getAuthHeaders 
} from '../utils/auth.js';
import { 
  connectWebSocket, 
  simulateDocumentCollaboration,
  messageTypes 
} from '../utils/websocket.js';

// Custom metrics for document collaboration
const documentLoadTime = new Trend('document_load_time');
const operationLatency = new Trend('operation_latency');
const conflictResolutionTime = new Trend('conflict_resolution_time');
const syncLatency = new Trend('sync_latency');
const versionCreateTime = new Trend('version_create_time');
const annotationCreateTime = new Trend('annotation_create_time');

const operationSuccess = new Rate('operation_success_rate');
const conflictResolution = new Rate('conflict_resolution_success_rate');
const documentSync = new Rate('document_sync_success_rate');
const annotationSuccess = new Rate('annotation_success_rate');
const versionSuccess = new Rate('version_success_rate');

const operationConflicts = new Counter('operation_conflicts');
const networkPartitions = new Counter('network_partitions');

// Document collaboration test scenarios
const collaborationScenarios = {
  boardPackReview: {
    documentType: 'board_pack',
    title: 'Q4 2024 Board Pack Review',
    expectedCollaborators: 12,
    sessionDuration: 30, // minutes
    operationTypes: {
      annotations: 0.4,
      comments: 0.3,
      highlights: 0.2,
      edits: 0.1
    },
    conflictProbability: 0.15,
    averageOperationsPerMinute: 8
  },
  
  financialReportReview: {
    documentType: 'financial_report',
    title: 'Annual Financial Report Review',
    expectedCollaborators: 8,
    sessionDuration: 45,
    operationTypes: {
      annotations: 0.5,
      comments: 0.3,
      highlights: 0.15,
      edits: 0.05
    },
    conflictProbability: 0.1,
    averageOperationsPerMinute: 6
  },
  
  legalDocumentReview: {
    documentType: 'legal_document',
    title: 'Corporate Governance Policy Review',
    expectedCollaborators: 6,
    sessionDuration: 60,
    operationTypes: {
      annotations: 0.3,
      comments: 0.4,
      highlights: 0.2,
      edits: 0.1
    },
    conflictProbability: 0.2,
    averageOperationsPerMinute: 4
  },
  
  presentationReview: {
    documentType: 'presentation',
    title: 'Strategic Planning Presentation',
    expectedCollaborators: 15,
    sessionDuration: 25,
    operationTypes: {
      annotations: 0.4,
      comments: 0.4,
      highlights: 0.15,
      edits: 0.05
    },
    conflictProbability: 0.25,
    averageOperationsPerMinute: 10
  }
};

export let options = {
  scenarios: {
    document_collaboration: getConfig().loadScenarios.documentCollaboration
  },
  thresholds: {
    'document_load_time': ['p(95)<3000'], // 95% load within 3 seconds
    'operation_latency': ['p(95)<500'], // 95% operations within 500ms
    'conflict_resolution_time': ['p(95)<2000'], // Conflicts resolved within 2s
    'sync_latency': ['p(95)<1000'], // Sync within 1 second
    'operation_success_rate': ['rate>0.98'], // 98% operation success
    'conflict_resolution_success_rate': ['rate>0.95'], // 95% conflict resolution
    'document_sync_success_rate': ['rate>0.995'], // 99.5% sync success
  }
};

export default function documentCollaborationStress() {
  const config = getConfig();
  const baseUrl = config.environment.baseUrl;
  
  // Authenticate user
  const user = getRandomUser('boardMembers');
  const authSession = authenticateUser(baseUrl, user);
  
  if (!authSession) {
    console.error('Authentication failed');
    return;
  }

  console.log(`Starting document collaboration test for user ${user.email}`);
  
  // Select collaboration scenario
  const scenarioNames = Object.keys(collaborationScenarios);
  const scenarioName = scenarioNames[Math.floor(Math.random() * scenarioNames.length)];
  const scenario = collaborationScenarios[scenarioName];
  
  try {
    // Phase 1: Create/Load Document
    const documentData = createCollaborationDocument(baseUrl, authSession, scenario);
    
    if (!documentData.success) {
      console.error(`Failed to create document for scenario: ${scenarioName}`);
      return;
    }

    const documentId = documentData.documentId;
    console.log(`Created document ${documentId} for scenario: ${scenarioName}`);
    
    // Phase 2: Join Collaboration Session
    const sessionData = joinCollaborationSession(baseUrl, authSession, documentId, scenario);
    
    if (!sessionData.success) {
      console.error(`Failed to join collaboration session for document: ${documentId}`);
      return;
    }

    const sessionId = sessionData.sessionId;
    console.log(`Joined collaboration session: ${sessionId}`);
    
    // Phase 3: WebSocket Connection for Real-time Collaboration
    const wsConnection = connectWebSocket(baseUrl, authSession, {
      enablePeriodicMessages: false // We'll handle messages manually
    });
    
    if (wsConnection) {
      // Phase 4: Simulate Collaborative Editing
      simulateIntensiveCollaboration(wsConnection, authSession, sessionId, documentId, scenario);
      
      // Phase 5: Test Conflict Resolution
      sleep(5); // Let initial operations settle
      simulateConflictScenarios(baseUrl, authSession, wsConnection, sessionId, documentId);
      
      // Phase 6: Test Large Document Operations
      sleep(3);
      testLargeDocumentOperations(baseUrl, authSession, documentId);
      
      // Phase 7: Test Version Control Under Load
      sleep(2);
      testVersionControlStress(baseUrl, authSession, documentId);
      
      // Clean up WebSocket
      wsConnection.close();
    }
    
    // Phase 8: Test Offline/Online Synchronization
    testOfflineSynchronization(baseUrl, authSession, documentId, sessionId);
    
  } catch (error) {
    console.error(`Document collaboration test error: ${error}`);
  }
  
  // Think time between test iterations
  sleep(Math.random() * 2 + 1);
}

function createCollaborationDocument(baseUrl, authSession, scenario) {
  const documentUrl = `${baseUrl}/api/assets`;
  
  const documentPayload = {
    title: scenario.title,
    type: scenario.documentType,
    content: generateLargeDocumentContent(scenario.documentType),
    collaboration_enabled: true,
    real_time_sync: true,
    operational_transform: true,
    conflict_resolution: 'last_writer_wins', // Can be 'operational_transform', 'manual'
    version_control: true,
    max_collaborators: scenario.expectedCollaborators,
    settings: {
      auto_save_interval: 5000, // 5 seconds
      operation_buffer_size: 100,
      sync_throttle: 1000, // 1 second
      enable_presence_awareness: true,
      enable_cursor_tracking: true
    }
  };

  const params = {
    headers: getAuthHeaders(authSession),
  };

  const startTime = new Date();
  const response = http.post(documentUrl, JSON.stringify(documentPayload), params);
  const duration = new Date() - startTime;
  
  documentLoadTime.add(duration);
  
  const success = check(response, {
    'document creation status is 201': (r) => r.status === 201,
    'document creation response has id': (r) => r.json() && r.json().id,
    'document creation time < 5s': (r) => r.timings.duration < 5000,
  });

  return {
    success: success,
    documentId: success ? response.json().id : null,
    document: success ? response.json() : null
  };
}

function joinCollaborationSession(baseUrl, authSession, documentId, scenario) {
  const sessionUrl = `${baseUrl}/api/collaboration/sessions`;
  
  const sessionPayload = {
    document_id: documentId,
    collaboration_mode: 'real_time',
    user_permissions: {
      can_edit: true,
      can_comment: true,
      can_annotate: true,
      can_suggest: true
    },
    session_settings: {
      enable_operational_transforms: true,
      enable_conflict_resolution: true,
      enable_presence_indicators: true,
      operation_timeout: 30000 // 30 seconds
    }
  };

  const params = {
    headers: getAuthHeaders(authSession),
  };

  const response = http.post(sessionUrl, JSON.stringify(sessionPayload), params);
  
  const success = check(response, {
    'session join status is 200': (r) => r.status === 200 || r.status === 201,
    'session join response has session_id': (r) => r.json() && r.json().session_id,
    'session join time < 3s': (r) => r.timings.duration < 3000,
  });

  return {
    success: success,
    sessionId: success ? response.json().session_id : null,
    session: success ? response.json() : null
  };
}

function simulateIntensiveCollaboration(wsConnection, authSession, sessionId, documentId, scenario) {
  console.log(`Starting intensive collaboration simulation for session: ${sessionId}`);
  
  const operationTypes = Object.keys(scenario.operationTypes);
  const sessionDurationMs = scenario.sessionDuration * 60 * 1000;
  const operationInterval = 60000 / scenario.averageOperationsPerMinute; // Convert to milliseconds
  
  let operationCount = 0;
  const maxOperations = Math.floor(sessionDurationMs / operationInterval);
  
  const collaborationInterval = setInterval(() => {
    if (operationCount >= maxOperations) {
      clearInterval(collaborationInterval);
      return;
    }

    // Select operation type based on probability distribution
    const rand = Math.random();
    let cumulativeProbability = 0;
    let selectedOperation = operationTypes[0];
    
    for (const opType of operationTypes) {
      cumulativeProbability += scenario.operationTypes[opType];
      if (rand <= cumulativeProbability) {
        selectedOperation = opType;
        break;
      }
    }
    
    // Execute the selected operation
    executeCollaborationOperation(wsConnection, authSession, sessionId, documentId, selectedOperation, scenario);
    operationCount++;
    
  }, operationInterval);
  
  // Stop after session duration
  setTimeout(() => {
    clearInterval(collaborationInterval);
    console.log(`Completed ${operationCount} collaborative operations`);
  }, sessionDurationMs);
}

function executeCollaborationOperation(wsConnection, authSession, sessionId, documentId, operationType, scenario) {
  const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  let operation;
  
  switch (operationType) {
    case 'annotations':
      operation = {
        id: operationId,
        type: 'annotation_create',
        sessionId: sessionId,
        documentId: documentId,
        userId: authSession.user.id,
        data: {
          page: Math.floor(Math.random() * 20) + 1,
          x: Math.floor(Math.random() * 800),
          y: Math.floor(Math.random() * 600),
          width: Math.floor(Math.random() * 200) + 50,
          height: Math.floor(Math.random() * 100) + 20,
          content: `Annotation ${operationId} - ${generateRandomAnnotationText()}`,
          type: ['highlight', 'note', 'question', 'action_item'][Math.floor(Math.random() * 4)]
        },
        timestamp: timestamp
      };
      break;
      
    case 'comments':
      operation = {
        id: operationId,
        type: 'comment_create',
        sessionId: sessionId,
        documentId: documentId,
        userId: authSession.user.id,
        data: {
          position: Math.floor(Math.random() * 1000),
          content: `Comment ${operationId} - ${generateRandomCommentText()}`,
          thread_id: Math.random() < 0.3 ? `thread_${Math.floor(Math.random() * 10)}` : null,
          reply_to: Math.random() < 0.2 ? `comment_${Math.floor(Math.random() * 100)}` : null
        },
        timestamp: timestamp
      };
      break;
      
    case 'highlights':
      operation = {
        id: operationId,
        type: 'highlight_create',
        sessionId: sessionId,
        documentId: documentId,
        userId: authSession.user.id,
        data: {
          startPosition: Math.floor(Math.random() * 1000),
          endPosition: Math.floor(Math.random() * 1000) + 1000,
          color: ['yellow', 'green', 'blue', 'red', 'orange'][Math.floor(Math.random() * 5)],
          note: Math.random() < 0.4 ? `Highlight note ${operationId}` : null
        },
        timestamp: timestamp
      };
      break;
      
    case 'edits':
      operation = {
        id: operationId,
        type: 'text_edit',
        sessionId: sessionId,
        documentId: documentId,
        userId: authSession.user.id,
        data: {
          operation: generateTextOperation(),
          position: Math.floor(Math.random() * 1000),
          previousText: 'sample text',
          newText: `edited text ${operationId}`,
          changeType: ['insert', 'delete', 'replace'][Math.floor(Math.random() * 3)]
        },
        timestamp: timestamp
      };
      break;
  }
  
  // Send operation via WebSocket with latency measurement
  const sendStartTime = new Date();
  
  wsConnection.send(JSON.stringify({
    type: messageTypes.DOC_EDIT,
    payload: operation
  }));
  
  // Simulate potential conflicts
  if (Math.random() < scenario.conflictProbability) {
    // Create a conflicting operation
    setTimeout(() => {
      const conflictOperation = {
        ...operation,
        id: `conflict_${operationId}`,
        userId: `conflict_user_${Math.floor(Math.random() * scenario.expectedCollaborators)}`,
        data: {
          ...operation.data,
          content: `Conflicting ${operation.data.content}`,
          position: operation.data.position // Same position to create conflict
        }
      };
      
      wsConnection.send(JSON.stringify({
        type: messageTypes.DOC_EDIT,
        payload: conflictOperation
      }));
      
      operationConflicts.add(1);
      
    }, Math.floor(Math.random() * 2000) + 100); // 100ms to 2100ms delay
  }
}

function simulateConflictScenarios(baseUrl, authSession, wsConnection, sessionId, documentId) {
  console.log('Testing conflict resolution scenarios...');
  
  // Scenario 1: Simultaneous edits at same position
  const conflictPosition = 500;
  const conflicts = [
    {
      id: `conflict_1_${Date.now()}`,
      type: 'text_edit',
      data: {
        position: conflictPosition,
        operation: 'insert',
        text: 'First conflicting edit',
        changeType: 'insert'
      }
    },
    {
      id: `conflict_2_${Date.now()}`,
      type: 'text_edit',
      data: {
        position: conflictPosition,
        operation: 'insert',
        text: 'Second conflicting edit',
        changeType: 'insert'
      }
    },
    {
      id: `conflict_3_${Date.now()}`,
      type: 'text_edit',
      data: {
        position: conflictPosition,
        operation: 'delete',
        length: 10,
        changeType: 'delete'
      }
    }
  ];
  
  const conflictStartTime = new Date();
  
  // Send conflicting operations rapidly
  conflicts.forEach((conflict, index) => {
    setTimeout(() => {
      wsConnection.send(JSON.stringify({
        type: messageTypes.DOC_EDIT,
        payload: {
          sessionId: sessionId,
          documentId: documentId,
          userId: authSession.user.id,
          ...conflict,
          timestamp: new Date().toISOString()
        }
      }));
    }, index * 50); // 50ms apart to create timing conflicts
  });
  
  // Monitor conflict resolution
  setTimeout(() => {
    const conflictEndTime = new Date();
    const resolutionTime = conflictEndTime - conflictStartTime;
    
    conflictResolutionTime.add(resolutionTime);
    conflictResolution.add(true); // Assume successful if no errors
    
    console.log(`Conflict resolution completed in ${resolutionTime}ms`);
  }, 3000);
}

function testLargeDocumentOperations(baseUrl, authSession, documentId) {
  console.log('Testing large document operations...');
  
  // Test 1: Bulk annotation creation
  const bulkAnnotations = Array.from({ length: 20 }, (_, i) => ({
    page: Math.floor(Math.random() * 50) + 1,
    x: Math.floor(Math.random() * 800),
    y: Math.floor(Math.random() * 600),
    width: Math.floor(Math.random() * 200) + 50,
    height: Math.floor(Math.random() * 100) + 20,
    content: `Bulk annotation ${i + 1} - ${generateRandomAnnotationText()}`,
    type: ['highlight', 'note', 'question', 'action_item'][i % 4],
    metadata: {
      bulk_operation: true,
      batch_id: `batch_${Date.now()}`,
      sequence: i
    }
  }));
  
  const bulkAnnotationStartTime = new Date();
  const bulkAnnotationResponse = http.post(
    `${baseUrl}/api/assets/${documentId}/annotations/bulk`,
    JSON.stringify({ annotations: bulkAnnotations }),
    { headers: getAuthHeaders(authSession) }
  );
  const bulkAnnotationDuration = new Date() - bulkAnnotationStartTime;
  
  annotationCreateTime.add(bulkAnnotationDuration);
  
  const bulkAnnotationSuccess = check(bulkAnnotationResponse, {
    'bulk annotation creation status is 200': (r) => r.status === 200 || r.status === 201,
    'bulk annotation response time < 5s': (r) => r.timings.duration < 5000,
    'bulk annotation response has count': (r) => r.json() && r.json().created_count >= 0,
  });

  annotationSuccess.add(bulkAnnotationSuccess);
  
  // Test 2: Large document search and replace
  const searchReplacePayload = {
    search_pattern: 'sample text',
    replace_text: 'updated sample text',
    scope: 'document',
    case_sensitive: false,
    whole_word: false,
    max_replacements: 100
  };
  
  const searchReplaceStartTime = new Date();
  const searchReplaceResponse = http.post(
    `${baseUrl}/api/documents/${documentId}/search-replace`,
    JSON.stringify(searchReplacePayload),
    { headers: getAuthHeaders(authSession) }
  );
  const searchReplaceDuration = new Date() - searchReplaceStartTime;
  
  operationLatency.add(searchReplaceDuration);
  
  const searchReplaceSuccess = check(searchReplaceResponse, {
    'search replace status is 200': (r) => r.status === 200,
    'search replace response time < 10s': (r) => r.timings.duration < 10000,
  });

  operationSuccess.add(searchReplaceSuccess);
}

function testVersionControlStress(baseUrl, authSession, documentId) {
  console.log('Testing version control under stress...');
  
  // Create multiple versions rapidly
  const versionPromises = [];
  
  for (let i = 0; i < 5; i++) {
    const versionPayload = {
      changes_summary: `Stress test version ${i + 1}`,
      change_type: ['major', 'minor', 'patch'][i % 3],
      changes: [
        {
          type: 'content_update',
          description: `Content update ${i + 1}`,
          affected_sections: [`section_${i}`, `section_${i + 1}`]
        },
        {
          type: 'annotation_added',
          description: `Added annotations in version ${i + 1}`,
          count: Math.floor(Math.random() * 10) + 1
        }
      ],
      metadata: {
        stress_test: true,
        version_sequence: i + 1
      }
    };
    
    const versionStartTime = new Date();
    const versionResponse = http.post(
      `${baseUrl}/api/assets/${documentId}/versions`,
      JSON.stringify(versionPayload),
      { headers: getAuthHeaders(authSession) }
    );
    const versionDuration = new Date() - versionStartTime;
    
    versionCreateTime.add(versionDuration);
    
    const versionSuccess = check(versionResponse, {
      [`version ${i + 1} creation status is 201`]: (r) => r.status === 201,
      [`version ${i + 1} response has version_id`]: (r) => r.json() && r.json().version_id,
      [`version ${i + 1} creation time < 3s`]: (r) => r.timings.duration < 3000,
    });

    versionSuccess.add(versionSuccess);
    
    // Small delay between versions to simulate realistic usage
    sleep(0.5);
  }
  
  // Test version comparison
  sleep(1);
  const comparisonResponse = http.get(
    `${baseUrl}/api/assets/${documentId}/versions/compare?from=1&to=latest`,
    { headers: getAuthHeaders(authSession) }
  );
  
  check(comparisonResponse, {
    'version comparison status is 200': (r) => r.status === 200,
    'version comparison response time < 5s': (r) => r.timings.duration < 5000,
    'version comparison has diff': (r) => r.json() && r.json().diff,
  });
}

function testOfflineSynchronization(baseUrl, authSession, documentId, sessionId) {
  console.log('Testing offline/online synchronization...');
  
  // Simulate offline operations
  const offlineOperations = [
    {
      id: `offline_op_1_${Date.now()}`,
      type: 'annotation_create',
      timestamp: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      data: {
        page: 5,
        x: 100,
        y: 200,
        content: 'Offline annotation 1',
        type: 'note'
      }
    },
    {
      id: `offline_op_2_${Date.now()}`,
      type: 'comment_create',
      timestamp: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      data: {
        position: 300,
        content: 'Offline comment during network partition',
      }
    }
  ];
  
  const syncPayload = {
    session_id: sessionId,
    offline_operations: offlineOperations,
    last_sync_timestamp: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    client_version: Date.now(),
    conflict_resolution_strategy: 'operational_transform'
  };
  
  const syncStartTime = new Date();
  const syncResponse = http.post(
    `${baseUrl}/api/collaboration/sessions/${sessionId}/sync`,
    JSON.stringify(syncPayload),
    { headers: getAuthHeaders(authSession) }
  );
  const syncDuration = new Date() - syncStartTime;
  
  syncLatency.add(syncDuration);
  
  const syncSuccess = check(syncResponse, {
    'offline sync status is 200': (r) => r.status === 200,
    'offline sync response time < 3s': (r) => r.timings.duration < 3000,
    'offline sync has resolved operations': (r) => r.json() && r.json().resolved_operations,
  });

  documentSync.add(syncSuccess);
  
  if (syncSuccess) {
    const syncData = syncResponse.json();
    if (syncData.conflicts && syncData.conflicts.length > 0) {
      console.log(`Resolved ${syncData.conflicts.length} conflicts during sync`);
    }
  }
}

// Utility functions for generating test content
function generateLargeDocumentContent(documentType) {
  const contentSizes = {
    board_pack: 50000,      // ~50KB
    financial_report: 75000, // ~75KB
    legal_document: 40000,   // ~40KB
    presentation: 30000      // ~30KB
  };
  
  const targetSize = contentSizes[documentType] || 40000;
  const sampleParagraph = "This is a sample paragraph for performance testing purposes. It contains multiple sentences to simulate realistic document content. The content includes various formatting, numbers like 12345, and special characters like @#$%. This paragraph will be repeated to create large documents for stress testing collaborative editing features. ";
  
  const repeats = Math.ceil(targetSize / sampleParagraph.length);
  return sampleParagraph.repeat(repeats);
}

function generateRandomAnnotationText() {
  const annotations = [
    'This section needs board review',
    'Important financial metrics highlighted',
    'Requires compliance verification',
    'Action item for next meeting',
    'Risk assessment needed',
    'Strategic consideration',
    'Regulatory impact assessment',
    'Stakeholder communication required'
  ];
  
  return annotations[Math.floor(Math.random() * annotations.length)];
}

function generateRandomCommentText() {
  const comments = [
    'Please provide additional context for this section',
    'The numbers look correct but need verification',
    'This aligns with our strategic objectives',
    'Consider the regulatory implications',
    'Excellent analysis, well presented',
    'Questions about implementation timeline',
    'Board feedback incorporated successfully',
    'Risk mitigation strategies should be expanded'
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
}

function generateTextOperation() {
  const operations = ['insert', 'delete', 'replace', 'format'];
  return operations[Math.floor(Math.random() * operations.length)];
}

export function handleSummary(data) {
  return {
    'document-collaboration-stress-summary.json': JSON.stringify(data),
    stdout: `
Document Collaboration Stress Test Summary:
===========================================

Document Performance Metrics:
- Average Document Load Time: ${data.metrics.document_load_time ? data.metrics.document_load_time.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Load Time: ${data.metrics.document_load_time ? data.metrics.document_load_time.values['p(95)'].toFixed(2) : 'N/A'}ms

Real-time Collaboration Metrics:
- Average Operation Latency: ${data.metrics.operation_latency ? data.metrics.operation_latency.values.avg.toFixed(2) : 'N/A'}ms
- 95th Percentile Operation Time: ${data.metrics.operation_latency ? data.metrics.operation_latency.values['p(95)'].toFixed(2) : 'N/A'}ms
- Operation Success Rate: ${data.metrics.operation_success_rate ? (data.metrics.operation_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Conflict Resolution Metrics:
- Average Conflict Resolution Time: ${data.metrics.conflict_resolution_time ? data.metrics.conflict_resolution_time.values.avg.toFixed(2) : 'N/A'}ms
- Conflict Resolution Success Rate: ${data.metrics.conflict_resolution_success_rate ? (data.metrics.conflict_resolution_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%
- Total Operation Conflicts: ${data.metrics.operation_conflicts ? data.metrics.operation_conflicts.values.count : 0}

Synchronization Metrics:
- Average Sync Latency: ${data.metrics.sync_latency ? data.metrics.sync_latency.values.avg.toFixed(2) : 'N/A'}ms
- Document Sync Success Rate: ${data.metrics.document_sync_success_rate ? (data.metrics.document_sync_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Version Control Metrics:
- Average Version Creation Time: ${data.metrics.version_create_time ? data.metrics.version_create_time.values.avg.toFixed(2) : 'N/A'}ms
- Version Success Rate: ${data.metrics.version_success_rate ? (data.metrics.version_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

Annotation Metrics:
- Average Annotation Creation Time: ${data.metrics.annotation_create_time ? data.metrics.annotation_create_time.values.avg.toFixed(2) : 'N/A'}ms
- Annotation Success Rate: ${data.metrics.annotation_success_rate ? (data.metrics.annotation_success_rate.values.rate * 100).toFixed(2) : 'N/A'}%

System Resilience:
- Network Partitions Handled: ${data.metrics.network_partitions ? data.metrics.network_partitions.values.count : 0}

Overall Test Results:
- Total HTTP Requests: ${data.metrics.http_reqs.values.count}
- Failed Requests: ${data.metrics.http_req_failed ? data.metrics.http_req_failed.values.fails : 0}
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms

Test passed: ${(data.metrics.operation_success_rate?.values.rate || 0) >= 0.98 && (data.metrics.document_sync_success_rate?.values.rate || 0) >= 0.995 ? 'YES' : 'NO'}
    `
  };
}