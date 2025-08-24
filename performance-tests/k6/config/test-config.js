// K6 Load Testing Configuration for BoardGuru Enterprise
// Performance testing configuration for enterprise-grade board management platform

export const testConfig = {
  // Environment configurations
  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      websocketUrl: 'ws://localhost:3000',
      dbConnectionLimit: 10
    },
    staging: {
      baseUrl: 'https://staging.boardguru.ai',
      websocketUrl: 'wss://staging.boardguru.ai',
      dbConnectionLimit: 50
    },
    production: {
      baseUrl: 'https://app.boardguru.ai',
      websocketUrl: 'wss://app.boardguru.ai',
      dbConnectionLimit: 200
    }
  },

  // Performance targets (SLA requirements)
  performanceTargets: {
    apiResponseTime: {
      p95: 200, // ms - 95th percentile under 200ms
      p99: 500  // ms - 99th percentile under 500ms
    },
    websocketLatency: {
      p95: 100, // ms - Real-time messaging under 100ms
      p99: 200  // ms
    },
    databaseQuery: {
      simple: 50,   // ms - Simple queries under 50ms
      complex: 500, // ms - Complex queries under 500ms
      analytics: 2000 // ms - Analytics queries under 2s
    },
    errorRate: 0.1, // % - Less than 0.1% error rate
    availability: 99.9 // % - 99.9% uptime target
  },

  // Load testing scenarios
  loadScenarios: {
    // Smoke test - minimal load to verify functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
    },

    // Average load - typical business usage
    average: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },

    // Peak load - high usage periods (AGM, board meetings)
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
    },

    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 0 },
      ],
    },

    // Spike test - sudden traffic spikes
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 }, // Sudden spike
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
    },

    // Concurrent meetings - multiple board meetings simultaneously
    concurrentMeetings: {
      executor: 'constant-vus',
      vus: 200, // 10 meetings × 20 participants each
      duration: '10m',
    },

    // Document collaboration stress
    documentCollaboration: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '10m', target: 50 }, // 50 users editing simultaneously
        { duration: '1m', target: 0 },
      ],
    },

    // AI processing load
    aiProcessing: {
      executor: 'constant-arrival-rate',
      rate: 10, // 10 AI requests per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },

    // Database intensive operations
    databaseLoad: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },

    // Enterprise multi-tenant load
    multiTenant: {
      executor: 'per-vu-iterations',
      vus: 500, // Multiple organizations
      iterations: 100,
      maxDuration: '30m',
    }
  },

  // Test data configuration
  testData: {
    organizations: {
      count: 10,
      usersPerOrg: 100,
      documentsPerOrg: 1000
    },
    meetings: {
      concurrent: 10,
      participantsPerMeeting: 20,
      durationMinutes: 60
    },
    documents: {
      sizes: {
        small: 1024,      // 1KB
        medium: 1048576,  // 1MB
        large: 10485760,  // 10MB
        xlarge: 104857600 // 100MB
      },
      types: ['pdf', 'docx', 'pptx', 'xlsx'],
      annotationsPerDoc: 50
    },
    users: {
      roles: ['admin', 'board_member', 'observer', 'secretary'],
      sessionDuration: 30 // minutes
    }
  },

  // API endpoints for testing
  apiEndpoints: {
    auth: {
      login: '/api/auth/signin',
      refresh: '/api/auth/refresh',
      logout: '/api/auth/signout'
    },
    dashboard: {
      metrics: '/api/dashboard/metrics',
      activity: '/api/dashboard/activity',
      insights: '/api/dashboard/insights'
    },
    assets: {
      list: '/api/assets',
      upload: '/api/assets/upload',
      download: '/api/assets/[id]/download',
      annotations: '/api/assets/[id]/annotations'
    },
    meetings: {
      list: '/api/meetings',
      create: '/api/meetings',
      transcription: '/api/meetings/transcription',
      actionables: '/api/meetings/[id]/actionables'
    },
    collaboration: {
      sessions: '/api/collaboration/sessions',
      operations: '/api/collaboration/sessions/[sessionId]/operations',
      cursors: '/api/collaboration/sessions/[sessionId]/cursors',
      comments: '/api/collaboration/sessions/[sessionId]/comments'
    },
    ai: {
      transcription: '/api/ai-meeting/transcription',
      analysis: '/api/document-intelligence/analyze',
      summarize: '/api/document-intelligence/summarize',
      chat: '/api/chat/enhanced'
    },
    realtime: {
      websocket: '/api/websocket',
      presence: '/api/presence',
      notifications: '/api/notifications'
    }
  },

  // Thresholds for pass/fail criteria
  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    
    // Error rate thresholds
    http_req_failed: ['rate<0.001'], // Less than 0.1% errors
    
    // Custom metrics thresholds
    websocket_connect_duration: ['p(95)<1000'],
    websocket_message_duration: ['p(95)<100'],
    database_query_duration: ['p(95)<500'],
    ai_processing_duration: ['p(95)<10000'], // 10s for AI processing
    
    // System resource thresholds
    memory_usage: ['value<85'], // Less than 85% memory usage
    cpu_usage: ['value<80'],    // Less than 80% CPU usage
    
    // Business logic thresholds
    document_upload_success: ['rate>0.99'],
    meeting_join_success: ['rate>0.995'],
    collaboration_sync_success: ['rate>0.998']
  }
};

// Export environment-specific configuration
export function getConfig(env = 'local') {
  return {
    ...testConfig,
    environment: testConfig.environments[env] || testConfig.environments.local
  };
}

// Helper function to get scenario configuration
export function getScenario(scenarioName) {
  return testConfig.loadScenarios[scenarioName];
}