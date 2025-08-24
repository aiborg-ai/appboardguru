// BoardGuru Load Testing with K6
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');
export let responseTime = new Trend('response_time');
export let requestCount = new Counter('requests');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up
    { duration: '5m', target: 50 },   // Normal load
    { duration: '2m', target: 100 },  // Peak load
    { duration: '5m', target: 100 },  // Sustained peak
    { duration: '2m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],      // Error rate under 5%
    errors: ['rate<0.05'],               // Custom error rate under 5%
  },
  ext: {
    loadimpact: {
      projectID: 3595341,
      name: 'BoardGuru Load Test'
    }
  }
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// Test data
const testUsers = [
  { email: 'test1@boardguru.ai', password: 'TestPassword123!' },
  { email: 'test2@boardguru.ai', password: 'TestPassword123!' },
  { email: 'test3@boardguru.ai', password: 'TestPassword123!' },
];

const testFiles = [
  { name: 'board-pack-q1.pdf', size: '2MB' },
  { name: 'meeting-minutes.docx', size: '500KB' },
  { name: 'financial-report.xlsx', size: '1MB' },
];

// Helper functions
function authenticateUser(user) {
  let loginRes = http.post(`${BASE_URL}/api/auth/signin`, {
    email: user.email,
    password: user.password,
  }, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  let authSuccess = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'auth token received': (r) => r.json('token') !== null,
  });
  
  errorRate.add(!authSuccess);
  requestCount.add(1);
  
  if (authSuccess) {
    return loginRes.json('token');
  }
  return null;
}

function simulateFileUpload(token) {
  let file = testFiles[Math.floor(Math.random() * testFiles.length)];
  
  let uploadRes = http.post(`${BASE_URL}/api/assets/upload`, {
    file: http.file(new ArrayBuffer(1024 * 1024), file.name, 'application/pdf'),
    metadata: JSON.stringify({
      name: file.name,
      description: 'Load test file upload',
      category: 'board-pack'
    })
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  let uploadSuccess = check(uploadRes, {
    'file upload successful': (r) => r.status === 200 || r.status === 201,
    'upload response time OK': (r) => r.timings.duration < 10000,
  });
  
  errorRate.add(!uploadSuccess);
  requestCount.add(1);
  responseTime.add(uploadRes.timings.duration);
  
  return uploadSuccess;
}

function simulateAIChat(token, assetId) {
  let chatRes = http.post(`${BASE_URL}/api/assets/${assetId}/chat`, {
    message: 'What are the key points in this document?',
    context: 'board-meeting-preparation'
  }, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  let chatSuccess = check(chatRes, {
    'AI chat successful': (r) => r.status === 200,
    'chat response time OK': (r) => r.timings.duration < 5000,
    'AI response received': (r) => r.json('response') !== null,
  });
  
  errorRate.add(!chatSuccess);
  requestCount.add(1);
  responseTime.add(chatRes.timings.duration);
  
  return chatSuccess;
}

function simulateDashboardActivity(token) {
  // Dashboard main page
  let dashboardRes = http.get(`${BASE_URL}/dashboard`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(dashboardRes, {
    'dashboard loaded': (r) => r.status === 200,
    'dashboard response time OK': (r) => r.timings.duration < 3000,
  });
  
  // Assets listing
  let assetsRes = http.get(`${BASE_URL}/api/assets`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(assetsRes, {
    'assets listing successful': (r) => r.status === 200,
    'assets response time OK': (r) => r.timings.duration < 2000,
  });
  
  // Organizations listing
  let orgsRes = http.get(`${BASE_URL}/api/organizations`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(orgsRes, {
    'organizations listing successful': (r) => r.status === 200,
    'orgs response time OK': (r) => r.timings.duration < 2000,
  });
  
  requestCount.add(3);
  responseTime.add(dashboardRes.timings.duration);
  responseTime.add(assetsRes.timings.duration);
  responseTime.add(orgsRes.timings.duration);
}

// Main test scenario
export default function() {
  // Select random user
  let user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test 1: Authentication
  let token = authenticateUser(user);
  if (!token) {
    errorRate.add(1);
    return;
  }
  
  sleep(1);
  
  // Test 2: Dashboard activity (70% of users)
  if (Math.random() < 0.7) {
    simulateDashboardActivity(token);
    sleep(2);
  }
  
  // Test 3: File upload (30% of users)
  if (Math.random() < 0.3) {
    let uploadSuccess = simulateFileUpload(token);
    if (uploadSuccess) {
      sleep(5); // Simulate processing time
      
      // Test 4: AI chat interaction (50% of uploads)
      if (Math.random() < 0.5) {
        let assetId = 'test-asset-' + Math.floor(Math.random() * 1000);
        simulateAIChat(token, assetId);
      }
    }
  }
  
  // Random think time
  sleep(Math.random() * 5 + 1);
}

// Setup and teardown
export function setup() {
  console.log('Starting BoardGuru load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test users: ${testUsers.length}`);
  
  // Health check
  let healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    throw new Error(`Application health check failed: ${healthRes.status}`);
  }
  
  console.log('Application health check passed');
  return {};
}

export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${requestCount.count}`);
  console.log(`Error rate: ${errorRate.rate * 100}%`);
  console.log(`Average response time: ${responseTime.avg}ms`);
}

// Advanced scenarios for different test types
export function boardMeetingScenario() {
  // Simulate a board meeting workflow
  let user = testUsers[0];
  let token = authenticateUser(user);
  
  if (token) {
    // Create meeting
    let meetingRes = http.post(`${BASE_URL}/api/meetings`, {
      title: 'Board Meeting Q1 2024',
      date: '2024-03-15T10:00:00Z',
      agenda: 'Quarterly review and strategic planning'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    check(meetingRes, {
      'meeting created': (r) => r.status === 201,
    });
    
    // Upload board pack
    simulateFileUpload(token);
    
    // AI analysis
    simulateAIChat(token, 'meeting-asset-123');
  }
}

export function complianceAuditScenario() {
  // Simulate compliance audit workflow
  let user = testUsers[1];
  let token = authenticateUser(user);
  
  if (token) {
    // Generate compliance report
    let complianceRes = http.post(`${BASE_URL}/api/compliance/generate-report`, {
      period: 'Q1-2024',
      frameworks: ['SOX', 'SEC']
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    check(complianceRes, {
      'compliance report generated': (r) => r.status === 200,
      'report generation time OK': (r) => r.timings.duration < 15000,
    });
  }
}

// Stress test scenario
export function stressTest() {
  // Aggressive load testing
  let user = testUsers[Math.floor(Math.random() * testUsers.length)];
  let token = authenticateUser(user);
  
  if (token) {
    // Rapid-fire API calls
    for (let i = 0; i < 5; i++) {
      http.get(`${BASE_URL}/api/assets?page=${i}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (i % 2 === 0) {
        http.get(`${BASE_URL}/api/organizations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    }
  }
}