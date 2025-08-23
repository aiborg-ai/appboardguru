/**
 * Integration Hub Service Tests
 * Comprehensive test suite for the core Integration Hub service
 */

import { IntegrationHubService } from '../integration-hub.service';

describe('IntegrationHubService', () => {
  let hubService: IntegrationHubService;

  beforeEach(() => {
    hubService = new IntegrationHubService();
  });

  afterEach(() => {
    // Clean up any event listeners
    hubService.removeAllListeners();
  });

  describe('Service Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(hubService).toBeInstanceOf(IntegrationHubService);
    });

    it('should emit ready event when initialized', (done) => {
      const newHub = new IntegrationHubService();
      newHub.on('ready', () => {
        done();
      });
    }, 10000);
  });

  describe('Integration Management', () => {
    const mockIntegration = {
      name: 'Test Integration',
      type: 'ERP' as const,
      credentials: {
        apiKey: 'test-key',
        host: 'test.example.com',
      },
      endpoints: [{
        id: 'endpoint-1',
        url: 'https://test.example.com/api',
        method: 'GET' as const,
        headers: {},
        authentication: {
          type: 'API_KEY' as const,
          credentials: { apiKey: 'test-key' },
        },
        timeout: 5000,
      }],
      mappings: [{
        sourceField: 'id',
        targetField: 'integrationId',
      }],
      settings: {
        syncInterval: 3600000,
        batchSize: 100,
        enableRealtime: true,
        errorHandling: 'RETRY' as const,
        dataRetention: 30,
        encryption: {
          enabled: true,
          algorithm: 'AES-256-GCM' as const,
          keyRotationInterval: 90,
        },
      },
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'EXPONENTIAL' as const,
        initialDelay: 1000,
        maxDelay: 30000,
      },
    };

    it('should create integration successfully', async () => {
      const integrationId = await hubService.createIntegration(mockIntegration);
      
      expect(integrationId).toBeDefined();
      expect(typeof integrationId).toBe('string');
    });

    it('should validate integration configuration', async () => {
      const invalidIntegration = {
        ...mockIntegration,
        name: '', // Invalid empty name
      };

      await expect(hubService.createIntegration(invalidIntegration))
        .rejects.toThrow('Invalid integration configuration');
    });

    it('should activate integration', async () => {
      const integrationId = await hubService.createIntegration(mockIntegration);
      
      await expect(hubService.activateIntegration(integrationId))
        .resolves.not.toThrow();
    });

    it('should deactivate integration', async () => {
      const integrationId = await hubService.createIntegration(mockIntegration);
      await hubService.activateIntegration(integrationId);
      
      await expect(hubService.deactivateIntegration(integrationId))
        .resolves.not.toThrow();
    });

    it('should handle non-existent integration', async () => {
      await expect(hubService.activateIntegration('non-existent'))
        .rejects.toThrow('Integration non-existent not found');
    });
  });

  describe('Workflow Management', () => {
    const mockWorkflowRule = {
      name: 'Test Workflow',
      description: 'Test workflow for unit testing',
      trigger: {
        type: 'EVENT' as const,
        config: {
          eventType: 'test.event',
          sourceSystem: 'test-system',
          filters: { type: 'test' },
        },
      },
      conditions: [{
        type: 'AND' as const,
        field: 'data.value',
        operator: 'GREATER_THAN' as const,
        value: 100,
      }],
      actions: [{
        type: 'EMAIL' as const,
        config: {
          to: 'test@example.com',
          subject: 'Test notification',
          template: 'Test message: {{data.value}}',
        },
        order: 1,
      }],
      enabled: true,
      priority: 5,
      createdBy: 'test-user',
      lastModified: new Date(),
    };

    it('should create workflow rule successfully', async () => {
      const ruleId = await hubService.createWorkflowRule(mockWorkflowRule);
      
      expect(ruleId).toBeDefined();
      expect(typeof ruleId).toBe('string');
    });

    it('should execute workflow rule', async () => {
      const ruleId = await hubService.createWorkflowRule(mockWorkflowRule);
      
      const context = {
        data: { value: 150, type: 'test' },
        user: 'test-user',
      };

      const result = await hubService.executeWorkflow(ruleId, context);
      
      expect(result.success).toBe(true);
      expect(result.execution).toBeDefined();
      expect(result.execution.status).toBe('COMPLETED');
    });

    it('should skip workflow when conditions not met', async () => {
      const ruleId = await hubService.createWorkflowRule(mockWorkflowRule);
      
      const context = {
        data: { value: 50, type: 'test' }, // Value too low
        user: 'test-user',
      };

      const result = await hubService.executeWorkflow(ruleId, context);
      
      expect(result.success).toBe(true);
      expect(result.execution.status).toBe('SKIPPED');
    });

    it('should validate workflow rule configuration', async () => {
      const invalidRule = {
        ...mockWorkflowRule,
        name: '', // Invalid empty name
      };

      await expect(hubService.createWorkflowRule(invalidRule))
        .rejects.toThrow('Rule validation failed');
    });
  });

  describe('Extension Management', () => {
    const mockExtension = {
      name: 'Test Extension',
      description: 'Test extension for unit testing',
      version: '1.0.0',
      publisher: 'test-publisher',
      category: 'INTEGRATION' as const,
      pricing: {
        type: 'FREE' as const,
      },
      permissions: [{
        resource: 'integrations',
        actions: ['read', 'write'],
      }],
      documentation: [{
        title: 'API Documentation',
        url: 'https://docs.example.com',
        type: 'API' as const,
      }],
      ratings: [],
      manifest: {
        endpoints: [{
          path: '/api/test',
          method: 'GET',
          description: 'Test endpoint',
          parameters: [],
        }],
        webhooks: [],
        schemas: [],
        dependencies: [],
      },
    };

    it('should publish extension successfully', async () => {
      const extensionId = await hubService.publishExtension(mockExtension);
      
      expect(extensionId).toBeDefined();
      expect(typeof extensionId).toBe('string');
    });

    it('should install extension', async () => {
      const extensionId = await hubService.publishExtension(mockExtension);
      const organizationId = 'org-123';
      
      await expect(hubService.installExtension(extensionId, organizationId))
        .resolves.not.toThrow();
    });

    it('should validate extension manifest', async () => {
      const invalidExtension = {
        ...mockExtension,
        manifest: {
          ...mockExtension.manifest,
          endpoints: [], // Invalid: no endpoints
        },
      };

      await expect(hubService.publishExtension(invalidExtension))
        .rejects.toThrow('Extension manifest with endpoints is required');
    });
  });

  describe('Event Handling', () => {
    it('should emit events for integration lifecycle', (done) => {
      let eventCount = 0;
      
      hubService.on('integrationCreated', () => {
        eventCount++;
        if (eventCount === 1) done();
      });

      hubService.createIntegration({
        name: 'Event Test Integration',
        type: 'CUSTOM',
        credentials: {},
        endpoints: [],
        mappings: [],
        settings: {
          syncInterval: 3600000,
          batchSize: 100,
          enableRealtime: false,
          errorHandling: 'SKIP',
          dataRetention: 30,
          encryption: {
            enabled: false,
            algorithm: 'AES-256-GCM',
            keyRotationInterval: 90,
          },
        },
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'LINEAR',
          initialDelay: 1000,
          maxDelay: 30000,
        },
      });
    });

    it('should emit events for workflow execution', (done) => {
      hubService.on('workflowExecuted', (event) => {
        expect(event.execution).toBeDefined();
        done();
      });

      const mockRule = {
        name: 'Event Test Workflow',
        description: 'Test workflow for event testing',
        trigger: {
          type: 'EVENT' as const,
          config: {},
        },
        conditions: [],
        actions: [{
          type: 'NOTIFICATION' as const,
          config: {
            message: 'Test notification',
          },
          order: 1,
        }],
        enabled: true,
        priority: 1,
        createdBy: 'test',
        lastModified: new Date(),
      };

      hubService.createWorkflowRule(mockRule)
        .then(ruleId => hubService.executeWorkflow(ruleId, {}));
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid integration configuration gracefully', async () => {
      const invalidConfig = {
        // Missing required fields
        name: 'Invalid Integration',
      };

      await expect(hubService.createIntegration(invalidConfig as any))
        .rejects.toThrow();
    });

    it('should handle workflow execution errors gracefully', async () => {
      const errorRule = {
        name: 'Error Test Workflow',
        description: 'Workflow that should fail',
        trigger: {
          type: 'EVENT' as const,
          config: {},
        },
        conditions: [],
        actions: [{
          type: 'API_CALL' as const,
          config: {
            url: 'https://invalid-url-that-should-fail.invalid',
            method: 'GET',
          },
          order: 1,
        }],
        enabled: true,
        priority: 1,
        createdBy: 'test',
        lastModified: new Date(),
      };

      const ruleId = await hubService.createWorkflowRule(errorRule);
      const result = await hubService.executeWorkflow(ruleId, {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle extension installation errors', async () => {
      await expect(hubService.installExtension('non-existent-extension', 'org-123'))
        .rejects.toThrow('Extension non-existent-extension not found');
    });
  });

  describe('Data Streaming', () => {
    it('should create data stream successfully', async () => {
      const streamConfig = {
        source: 'test-source',
        filters: { type: 'test' },
        batchSize: 100,
      };

      const streamId = await hubService.startDataStream('integration-123', streamConfig);
      
      expect(streamId).toBeDefined();
      expect(typeof streamId).toBe('string');
    });

    it('should stop data stream successfully', async () => {
      const streamConfig = {
        source: 'test-source',
        filters: { type: 'test' },
        batchSize: 100,
      };

      const streamId = await hubService.startDataStream('integration-123', streamConfig);
      
      await expect(hubService.stopDataStream(streamId))
        .resolves.not.toThrow();
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      // Create test integration
      await hubService.createIntegration({
        name: 'Metrics Test Integration',
        type: 'ERP',
        credentials: {},
        endpoints: [],
        mappings: [],
        settings: {
          syncInterval: 3600000,
          batchSize: 100,
          enableRealtime: false,
          errorHandling: 'RETRY',
          dataRetention: 30,
          encryption: {
            enabled: true,
            algorithm: 'AES-256-GCM',
            keyRotationInterval: 90,
          },
        },
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'EXPONENTIAL',
          initialDelay: 1000,
          maxDelay: 30000,
        },
      });
    });

    it('should return integration metrics', () => {
      const metrics = hubService.getIntegrationMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalIntegrations).toBeGreaterThan(0);
      expect(typeof metrics.successRate).toBe('number');
    });

    it('should return workflow metrics', () => {
      const metrics = hubService.getWorkflowMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.totalRules).toBe('number');
      expect(typeof metrics.successRate).toBe('number');
    });

    it('should return specific integration metrics', async () => {
      const integrationId = await hubService.createIntegration({
        name: 'Specific Metrics Test',
        type: 'LEGAL',
        credentials: {},
        endpoints: [],
        mappings: [],
        settings: {
          syncInterval: 3600000,
          batchSize: 100,
          enableRealtime: false,
          errorHandling: 'SKIP',
          dataRetention: 30,
          encryption: {
            enabled: false,
            algorithm: 'AES-256-GCM',
            keyRotationInterval: 90,
          },
        },
        retryPolicy: {
          maxRetries: 1,
          backoffStrategy: 'LINEAR',
          initialDelay: 500,
          maxDelay: 5000,
        },
      });

      const metrics = hubService.getIntegrationMetrics(integrationId);
      
      expect(metrics).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent integrations', async () => {
      const integrations = Array.from({ length: 10 }, (_, i) => ({
        name: `Performance Test Integration ${i}`,
        type: 'CUSTOM' as const,
        credentials: { key: `key-${i}` },
        endpoints: [],
        mappings: [],
        settings: {
          syncInterval: 3600000,
          batchSize: 100,
          enableRealtime: false,
          errorHandling: 'SKIP' as const,
          dataRetention: 30,
          encryption: {
            enabled: false,
            algorithm: 'AES-256-GCM' as const,
            keyRotationInterval: 90,
          },
        },
        retryPolicy: {
          maxRetries: 1,
          backoffStrategy: 'LINEAR' as const,
          initialDelay: 500,
          maxDelay: 5000,
        },
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        integrations.map(integration => hubService.createIntegration(integration))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(id => typeof id === 'string')).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    it('should handle multiple concurrent workflow executions', async () => {
      const rule = {
        name: 'Performance Test Workflow',
        description: 'Workflow for performance testing',
        trigger: {
          type: 'EVENT' as const,
          config: {},
        },
        conditions: [],
        actions: [{
          type: 'NOTIFICATION' as const,
          config: {
            message: 'Performance test notification',
          },
          order: 1,
        }],
        enabled: true,
        priority: 1,
        createdBy: 'performance-test',
        lastModified: new Date(),
      };

      const ruleId = await hubService.createWorkflowRule(rule);
      
      const executions = Array.from({ length: 20 }, (_, i) => ({
        context: { testId: i, timestamp: Date.now() },
      }));

      const startTime = Date.now();
      
      const results = await Promise.all(
        executions.map(exec => hubService.executeWorkflow(ruleId, exec.context))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(20);
      expect(results.every(result => result.success)).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, 15000);
  });
});