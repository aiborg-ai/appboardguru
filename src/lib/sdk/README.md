# Integration Hub SDK

The official TypeScript/JavaScript SDK for the Integration Hub platform, providing seamless access to all integration features including ERP connectors, workflow automation, marketplace extensions, AI optimization, and monitoring capabilities.

## Installation

```bash
npm install @boardguru/integration-hub-sdk
# or
yarn add @boardguru/integration-hub-sdk
```

## Quick Start

```typescript
import { createSDK } from '@boardguru/integration-hub-sdk';

// Initialize the SDK
const sdk = createSDK({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.boardguru.ai', // Optional, defaults to production
  debug: true, // Optional, enables request logging
});

// Check SDK health
const health = await sdk.healthCheck();
console.log('SDK Status:', health.data?.status);
```

## Authentication

Get your API key from the Integration Hub dashboard:

1. Navigate to **Settings** > **API Keys**
2. Click **Create New Key**
3. Copy the generated key and store it securely

```typescript
const sdk = createSDK({
  apiKey: 'ih_1234567890abcdef...',
});
```

## Core Features

### 1. Integration Management

Manage connections to ERP, legal, and financial systems:

```typescript
// List all integrations
const integrations = await sdk.integrations.list();

// Create new ERP integration
const erpIntegration = await sdk.integrations.create({
  name: 'SAP Production',
  type: 'ERP',
  config: {
    host: 'sap.company.com',
    username: 'integration_user',
    // ... other SAP config
  },
});

// Connect to the integration
await sdk.integrations.connect(erpIntegration.data.integrationId);

// Sync data
const syncResult = await sdk.integrations.sync(
  erpIntegration.data.integrationId,
  { dataType: 'financial', fullSync: false }
);
```

### 2. Workflow Automation

Create and manage automated workflows:

```typescript
// Create a workflow rule
const workflow = await sdk.workflows.create({
  name: 'Document Approval Workflow',
  description: 'Automatically route documents for approval',
  trigger: {
    type: 'EVENT',
    config: {
      eventType: 'document.uploaded',
      filters: { department: 'legal' }
    }
  },
  conditions: [
    {
      field: 'document.size',
      operator: 'GREATER_THAN',
      value: 1000000 // 1MB
    }
  ],
  actions: [
    {
      type: 'EMAIL',
      config: {
        to: 'legal@company.com',
        subject: 'Document Approval Required',
        template: 'Please review the attached document.'
      },
      order: 1
    }
  ],
  enabled: true
});

// Execute workflow manually
const execution = await sdk.workflows.execute(
  workflow.data.ruleId,
  { document: { id: 'doc-123', name: 'contract.pdf' } }
);

// Check execution status
const status = await sdk.workflows.getExecution(execution.data.id);
```

### 3. Marketplace Extensions

Browse, install, and manage marketplace extensions:

```typescript
// Search marketplace
const searchResults = await sdk.marketplace.search('compliance', {
  category: 'COMPLIANCE',
  pricing: 'FREE'
});

// Get featured extensions
const featured = await sdk.marketplace.getFeatured();

// Install an extension
await sdk.marketplace.install(
  'ext-compliance-checker',
  'user-123',
  'org-456'
);

// Publish your own extension
const extension = await sdk.marketplace.publish('developer-789', {
  name: 'Custom Analytics Dashboard',
  description: 'Advanced analytics for board meetings',
  version: '1.0.0',
  category: 'ANALYTICS',
  pricing: { type: 'FREE' }
});
```

### 4. AI Process Optimization

Analyze and optimize your processes with AI:

```typescript
// Start AI analysis of a process
const optimization = await sdk.optimization.analyze(
  'workflow-123',
  'WORKFLOW'
);

// Get AI recommendations
const recommendations = await sdk.optimization.getRecommendations(
  optimization.data.optimizationId
);

// Implement a recommendation
await sdk.optimization.implementRecommendation(
  optimization.data.optimizationId,
  recommendations.data.recommendations[0].id
);

// Get predictive insights
const insights = await sdk.optimization.getInsights('process-456');
```

### 5. Monitoring & Analytics

Monitor integrations and view comprehensive analytics:

```typescript
// Get system overview
const overview = await sdk.monitoring.getOverview();

// Create monitoring dashboard
const dashboard = await sdk.monitoring.createDashboard({
  name: 'Integration Health Dashboard',
  description: 'Monitor all integration health metrics',
  widgets: [
    {
      id: 'widget-1',
      type: 'LINE_CHART',
      title: 'Response Time Trends',
      configuration: {
        metric: 'response_time',
        timeRange: '24h'
      }
    }
  ]
});

// Get widget data
const widgetData = await sdk.monitoring.getWidgetData(
  dashboard.data.dashboardId,
  'widget-1',
  { relative: '24h' }
);

// Get detailed analytics for integration
const analytics = await sdk.monitoring.getAnalytics(
  'integration-123',
  { relative: '7d' }
);
```

## Error Handling

The SDK provides structured error handling:

```typescript
import { SDKError, AuthenticationError, RateLimitError } from '@boardguru/integration-hub-sdk';

try {
  await sdk.integrations.list();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key:', error.message);
  } else if (error instanceof RateLimitError) {
    console.error('Rate limit exceeded:', error.message);
  } else if (error instanceof SDKError) {
    console.error('SDK Error:', error.code, error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration Options

```typescript
const sdk = createSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.boardguru.ai', // API base URL
  version: '1.0.0', // API version
  timeout: 30000, // Request timeout in ms
  retries: 3, // Number of retry attempts
  debug: false, // Enable debug logging
  rateLimit: {
    requests: 100, // Max requests
    window: 60000 // Per time window (ms)
  }
});
```

## Event Handling

The SDK supports event-driven architecture:

```typescript
// Listen for integration events
sdk.on('integration.connected', (event) => {
  console.log('Integration connected:', event.integrationId);
});

sdk.on('workflow.executed', (event) => {
  console.log('Workflow executed:', event.executionId, event.status);
});

sdk.on('error', (error) => {
  console.error('SDK Error:', error);
});
```

## Webhooks

Handle webhook events from the Integration Hub:

```typescript
import { utils } from '@boardguru/integration-hub-sdk';

// Parse webhook payload
app.post('/webhooks/integration-hub', (req, res) => {
  try {
    const payload = utils.parseWebhookPayload(req.body);
    
    switch (payload.type) {
      case 'integration.sync_completed':
        console.log('Sync completed:', payload.data);
        break;
      case 'workflow.failed':
        console.log('Workflow failed:', payload.data);
        break;
      case 'optimization.recommendation_ready':
        console.log('New optimization recommendations:', payload.data);
        break;
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', utils.formatError(error));
    res.status(400).json({ error: 'Invalid payload' });
  }
});
```

## Utilities

The SDK includes helpful utility functions:

```typescript
import { utils } from '@boardguru/integration-hub-sdk';

// Validate API key format
const isValid = utils.validateApiKey('ih_1234567890...');

// Retry with exponential backoff
const result = await utils.retry(
  () => sdk.integrations.sync('integration-123'),
  { retries: 5, minDelay: 1000, maxDelay: 30000 }
);

// Generate request ID for tracking
const requestId = utils.generateRequestId();

// Format error messages
const errorMessage = utils.formatError(error);
```

## TypeScript Support

The SDK is built with TypeScript and provides full type safety:

```typescript
import { 
  Integration, 
  WorkflowRule, 
  MarketplaceExtension,
  ProcessOptimization 
} from '@boardguru/integration-hub-sdk';

const integration: Integration = await sdk.integrations.get('int-123');
const workflows: WorkflowRule[] = await sdk.workflows.list({ enabled: true });
```

## Rate Limiting

The SDK automatically handles rate limiting:

- Default: 100 requests per minute
- Automatic retry with exponential backoff
- Configurable limits and retry behavior

```typescript
const sdk = createSDK({
  apiKey: 'your-key',
  rateLimit: {
    requests: 200, // Custom limit
    window: 60000  // 1 minute window
  }
});
```

## Examples

### Complete Integration Setup

```typescript
async function setupERPIntegration() {
  const sdk = createSDK({ apiKey: process.env.INTEGRATION_HUB_API_KEY });
  
  try {
    // 1. Create ERP integration
    const integration = await sdk.integrations.create({
      name: 'SAP Production System',
      type: 'ERP',
      config: {
        host: 'sap.company.com',
        port: 3300,
        username: 'integration_user',
        password: process.env.SAP_PASSWORD,
        clientId: '100'
      }
    });
    
    // 2. Connect to ERP
    await sdk.integrations.connect(integration.data.integrationId);
    
    // 3. Create workflow for data processing
    const workflow = await sdk.workflows.create({
      name: 'Process SAP Financial Data',
      trigger: {
        type: 'SCHEDULE',
        config: { cronExpression: '0 0 * * *' } // Daily
      },
      actions: [{
        type: 'INTEGRATION_CALL',
        config: {
          integrationId: integration.data.integrationId,
          method: 'sync',
          parameters: { dataType: 'financial' }
        },
        order: 1
      }],
      enabled: true
    });
    
    // 4. Set up monitoring
    const dashboard = await sdk.monitoring.createDashboard({
      name: 'SAP Integration Health',
      widgets: [{
        id: 'sync-status',
        type: 'GAUGE',
        title: 'Sync Success Rate',
        configuration: {
          metric: 'sync_success_rate',
          thresholds: [
            { value: 95, color: 'green' },
            { value: 85, color: 'yellow' },
            { value: 0, color: 'red' }
          ]
        }
      }]
    });
    
    console.log('ERP Integration setup complete!');
    return {
      integrationId: integration.data.integrationId,
      workflowId: workflow.data.ruleId,
      dashboardId: dashboard.data.dashboardId
    };
    
  } catch (error) {
    console.error('Setup failed:', utils.formatError(error));
    throw error;
  }
}
```

## Support

- **Documentation**: [https://docs.boardguru.ai/integration-hub](https://docs.boardguru.ai/integration-hub)
- **API Reference**: [https://api.boardguru.ai/docs](https://api.boardguru.ai/docs)
- **Support**: support@boardguru.ai
- **GitHub**: [https://github.com/boardguru/integration-hub-sdk](https://github.com/boardguru/integration-hub-sdk)

## License

MIT License - see LICENSE file for details.