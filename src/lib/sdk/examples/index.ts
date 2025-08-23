/**
 * Integration Hub SDK Examples
 * Comprehensive examples for using the Integration Hub SDK
 */

import { createSDK, utils, SDKError } from '../integration-hub-sdk';

// Initialize SDK (you would get this from environment variables)
const sdk = createSDK({
  apiKey: process.env.INTEGRATION_HUB_API_KEY || 'your-api-key-here',
  debug: true,
});

/**
 * Example 1: ERP Integration Setup
 */
export async function setupSAPIntegration() {
  console.log('🔧 Setting up SAP Integration...');
  
  try {
    // Create SAP integration
    const sapIntegration = await sdk.integrations.create({
      name: 'SAP Production System',
      type: 'ERP',
      config: {
        host: 'sap.company.com',
        port: 3300,
        username: 'integration_user',
        password: process.env.SAP_PASSWORD,
        clientId: '100',
        syncInterval: 3600000, // 1 hour
        batchSize: 1000,
        timeout: 30000
      }
    });

    console.log('✅ SAP Integration created:', sapIntegration.data?.integrationId);

    // Connect to SAP
    await sdk.integrations.connect(sapIntegration.data!.integrationId);
    console.log('✅ Connected to SAP');

    // Initial data sync
    const syncResult = await sdk.integrations.sync(
      sapIntegration.data!.integrationId,
      { dataType: 'financial', fullSync: false }
    );
    console.log('✅ Initial sync completed:', syncResult.data?.recordsSync, 'records');

    return sapIntegration.data!.integrationId;
  } catch (error) {
    console.error('❌ SAP Integration failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 2: Workflow Automation
 */
export async function createDocumentApprovalWorkflow() {
  console.log('📋 Creating Document Approval Workflow...');
  
  try {
    const workflow = await sdk.workflows.create({
      name: 'Board Document Approval Workflow',
      description: 'Automatically route board documents for approval based on criteria',
      trigger: {
        type: 'EVENT',
        config: {
          eventType: 'document.uploaded',
          sourceSystem: 'document-management',
          filters: {
            category: 'board-materials',
            confidentiality: 'restricted'
          }
        }
      },
      conditions: [
        {
          field: 'document.size',
          operator: 'GREATER_THAN',
          value: 5000000 // 5MB
        },
        {
          field: 'document.type',
          operator: 'IN',
          value: ['pdf', 'docx', 'xlsx']
        },
        {
          field: 'metadata.requiresApproval',
          operator: 'EQUALS',
          value: true
        }
      ],
      actions: [
        {
          type: 'EMAIL',
          config: {
            to: ['legal@company.com', 'compliance@company.com'],
            subject: 'Board Document Approval Required: {{document.name}}',
            template: `
              A new board document requires approval:
              
              Document: {{document.name}}
              Size: {{document.size}} bytes
              Uploaded by: {{document.createdBy}}
              Upload date: {{document.createdAt}}
              
              Please review and approve at: {{approvalUrl}}
            `
          },
          order: 1
        },
        {
          type: 'API_CALL',
          config: {
            url: 'https://approval-system.company.com/api/requests',
            method: 'POST',
            headers: {
              'Authorization': 'Bearer {{apiToken}}',
              'Content-Type': 'application/json'
            },
            body: {
              documentId: '{{document.id}}',
              requestType: 'board-document-approval',
              priority: 'high',
              approvers: ['legal@company.com', 'compliance@company.com']
            }
          },
          order: 2
        },
        {
          type: 'NOTIFICATION',
          config: {
            recipients: ['board-secretary@company.com'],
            message: 'Board document {{document.name}} has been submitted for approval',
            type: 'INFO',
            channels: ['email', 'slack']
          },
          order: 3
        }
      ],
      enabled: true,
      priority: 8
    });

    console.log('✅ Workflow created:', workflow.data?.ruleId);

    // Test the workflow with sample data
    const testExecution = await sdk.workflows.execute(
      workflow.data!.ruleId,
      {
        document: {
          id: 'doc-test-123',
          name: 'Board Meeting Minutes - Q4 2024.pdf',
          size: 7500000,
          type: 'pdf',
          createdBy: 'secretary@company.com',
          createdAt: new Date().toISOString()
        },
        metadata: {
          requiresApproval: true,
          category: 'board-materials',
          confidentiality: 'restricted'
        },
        apiToken: 'test-api-token',
        approvalUrl: 'https://boardguru.ai/approvals/doc-test-123'
      },
      { async: false }
    );

    console.log('✅ Test execution completed:', testExecution.data?.status);
    return workflow.data!.ruleId;
  } catch (error) {
    console.error('❌ Workflow creation failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 3: Marketplace Extension Management
 */
export async function manageMarketplaceExtensions() {
  console.log('🛒 Managing Marketplace Extensions...');
  
  try {
    // Search for compliance extensions
    const searchResults = await sdk.marketplace.search('compliance audit', {
      category: 'COMPLIANCE',
      rating: 4.0
    });

    console.log('🔍 Found', searchResults.data?.extensions.length, 'compliance extensions');

    // Get featured extensions
    const featured = await sdk.marketplace.getFeatured();
    console.log('⭐ Featured extensions:', featured.data?.extensions.length);

    // Install a specific extension (example)
    if (searchResults.data?.extensions.length > 0) {
      const extensionToInstall = searchResults.data.extensions[0];
      
      try {
        const installation = await sdk.marketplace.install(
          extensionToInstall.id,
          'user-123',
          'org-456'
        );
        console.log('✅ Installed extension:', extensionToInstall.name);
      } catch (error) {
        if (error instanceof SDKError && error.code === 'ALREADY_INSTALLED') {
          console.log('ℹ️  Extension already installed:', extensionToInstall.name);
        } else {
          throw error;
        }
      }
    }

    return searchResults.data?.extensions.map(ext => ({
      id: ext.id,
      name: ext.name,
      rating: ext.ratings.length > 0 
        ? ext.ratings.reduce((sum, r) => sum + r.score, 0) / ext.ratings.length 
        : 0
    }));
  } catch (error) {
    console.error('❌ Marketplace management failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 4: AI Process Optimization
 */
export async function optimizeWorkflowProcess() {
  console.log('🤖 Starting AI Process Optimization...');
  
  try {
    // Start AI analysis of a workflow process
    const optimization = await sdk.optimization.analyze(
      'workflow-approval-process',
      'WORKFLOW'
    );

    console.log('🔍 AI Analysis started:', optimization.data?.optimizationId);

    // Wait for analysis to complete (in real usage, use webhooks)
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get AI recommendations
    const recommendations = await sdk.optimization.getRecommendations(
      optimization.data!.optimizationId
    );

    console.log('💡 AI Recommendations received:');
    recommendations.data?.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority}] ${rec.title}`);
      console.log(`     ${rec.description}`);
      console.log(`     💰 Estimated benefits: ${rec.estimatedBenefit.timeReduction}% time, ${rec.estimatedBenefit.costReduction}% cost`);
    });

    // Implement the highest priority recommendation
    const highPriorityRec = recommendations.data?.recommendations
      .find(r => r.priority === 'HIGH' || r.priority === 'CRITICAL');

    if (highPriorityRec) {
      console.log('⚡ Implementing recommendation:', highPriorityRec.title);
      
      const implementation = await sdk.optimization.implementRecommendation(
        optimization.data!.optimizationId,
        highPriorityRec.id
      );

      console.log('✅ Implementation started:', implementation.data?.status);
    }

    return optimization.data!.optimizationId;
  } catch (error) {
    console.error('❌ AI Optimization failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 5: Comprehensive Monitoring Setup
 */
export async function setupMonitoringDashboard() {
  console.log('📊 Setting up Monitoring Dashboard...');
  
  try {
    // Create comprehensive monitoring dashboard
    const dashboard = await sdk.monitoring.createDashboard({
      name: 'Integration Health & Performance Dashboard',
      description: 'Comprehensive view of all integration health metrics and KPIs',
      widgets: [
        {
          id: 'system-overview',
          type: 'COUNTER',
          title: 'Active Integrations',
          configuration: {
            metric: 'active_integrations_count',
            color: '#10B981',
            icon: 'link'
          }
        },
        {
          id: 'response-time-trend',
          type: 'LINE_CHART',
          title: 'Average Response Time (24h)',
          configuration: {
            metrics: ['avg_response_time'],
            timeRange: '24h',
            colors: ['#3B82F6'],
            yAxis: {
              label: 'Response Time (ms)',
              min: 0
            }
          }
        },
        {
          id: 'error-rate-gauge',
          type: 'GAUGE',
          title: 'System Error Rate',
          configuration: {
            metric: 'error_rate',
            min: 0,
            max: 10,
            thresholds: [
              { value: 2, color: '#10B981', label: 'Good' },
              { value: 5, color: '#F59E0B', label: 'Warning' },
              { value: 10, color: '#EF4444', label: 'Critical' }
            ],
            unit: '%'
          }
        },
        {
          id: 'integration-status',
          type: 'STATUS_GRID',
          title: 'Integration Status Overview',
          configuration: {
            metric: 'integration_status',
            gridColumns: 4,
            statusColors: {
              'CONNECTED': '#10B981',
              'DISCONNECTED': '#6B7280',
              'ERROR': '#EF4444',
              'SYNCING': '#3B82F6'
            }
          }
        },
        {
          id: 'workflow-executions',
          type: 'BAR_CHART',
          title: 'Workflow Executions (7 days)',
          configuration: {
            metric: 'workflow_executions',
            timeRange: '7d',
            groupBy: 'workflow_name',
            colors: ['#8B5CF6', '#06B6D4', '#10B981']
          }
        },
        {
          id: 'cost-breakdown',
          type: 'PIE_CHART',
          title: 'Cost Breakdown by Service',
          configuration: {
            metric: 'cost_by_service',
            colors: ['#F59E0B', '#EF4444', '#8B5CF6', '#10B981'],
            showPercentages: true,
            showTotal: true
          }
        },
        {
          id: 'recent-alerts',
          type: 'ALERT_LIST',
          title: 'Recent Alerts',
          configuration: {
            maxItems: 10,
            severityColors: {
              'info': '#3B82F6',
              'warning': '#F59E0B',
              'error': '#EF4444',
              'critical': '#DC2626'
            }
          }
        },
        {
          id: 'performance-heatmap',
          type: 'HEATMAP',
          title: 'Performance Heatmap (24h)',
          configuration: {
            metric: 'response_time_by_hour',
            timeRange: '24h',
            colorScale: ['#10B981', '#F59E0B', '#EF4444']
          }
        }
      ],
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 100,
        gap: 16,
        responsive: true
      },
      filters: [
        {
          id: 'time-range',
          name: 'Time Range',
          field: 'timeRange',
          type: 'select',
          values: [
            { value: '1h', label: 'Last Hour' },
            { value: '24h', label: 'Last 24 Hours' },
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' }
          ],
          defaultValue: '24h'
        },
        {
          id: 'integration-filter',
          name: 'Integration',
          field: 'integrationId',
          type: 'multi_select',
          multiSelect: true
        }
      ],
      refreshInterval: 30, // 30 seconds
      permissions: [
        {
          roleId: 'admin',
          permissions: ['view', 'edit', 'delete', 'share']
        },
        {
          roleId: 'viewer',
          permissions: ['view']
        }
      ],
      createdBy: 'system',
      isPublic: false
    });

    console.log('✅ Dashboard created:', dashboard.data?.dashboardId);

    // Get some sample widget data
    const widgetData = await sdk.monitoring.getWidgetData(
      dashboard.data!.dashboardId,
      'system-overview',
      { relative: '24h' }
    );

    console.log('📈 Sample widget data:', widgetData.data);

    return dashboard.data!.dashboardId;
  } catch (error) {
    console.error('❌ Monitoring setup failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 6: Financial Data Integration
 */
export async function setupFinancialDataFeed() {
  console.log('💰 Setting up Financial Data Feed...');
  
  try {
    // Create Bloomberg Terminal connection
    const bloombergConnection = await sdk.integrations.create({
      name: 'Bloomberg Terminal - Trading Desk',
      type: 'FINANCIAL',
      config: {
        provider: 'BLOOMBERG',
        username: process.env.BLOOMBERG_USERNAME,
        apiKey: process.env.BLOOMBERG_API_KEY,
        environment: 'PRODUCTION',
        region: 'US',
        timeout: 10000,
        maxRetries: 3,
        compression: true,
        encryption: true
      }
    });

    console.log('📡 Bloomberg connection created:', bloombergConnection.data?.integrationId);

    // Connect and subscribe to real-time market data
    await sdk.integrations.connect(bloombergConnection.data!.integrationId);

    // Subscribe to key financial instruments
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'SPY'];
    const subscription = await sdk.integrations.sync(
      bloombergConnection.data!.integrationId,
      {
        dataType: 'market-data',
        symbols,
        fields: ['price', 'change', 'volume', 'high', 'low'],
        realTime: true
      }
    );

    console.log('📊 Subscribed to market data for:', symbols.join(', '));

    return {
      connectionId: bloombergConnection.data!.integrationId,
      symbols
    };
  } catch (error) {
    console.error('❌ Financial data setup failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 7: Legal Document Workflow
 */
export async function setupLegalDocumentWorkflow() {
  console.log('📄 Setting up Legal Document Workflow...');
  
  try {
    // Create DocuSign integration
    const docusignConnection = await sdk.integrations.create({
      name: 'DocuSign - Legal Department',
      type: 'LEGAL',
      config: {
        system: 'DOCUSIGN',
        apiKey: process.env.DOCUSIGN_API_KEY,
        clientId: process.env.DOCUSIGN_CLIENT_ID,
        environment: 'PRODUCTION',
        timeout: 30000
      }
    });

    await sdk.integrations.connect(docusignConnection.data!.integrationId);
    console.log('✏️  DocuSign connected:', docusignConnection.data?.integrationId);

    // Create workflow for contract processing
    const contractWorkflow = await sdk.workflows.create({
      name: 'Board Resolution Signature Workflow',
      description: 'Automated signature workflow for board resolutions',
      trigger: {
        type: 'EVENT',
        config: {
          eventType: 'resolution.approved',
          sourceSystem: 'board-management'
        }
      },
      conditions: [
        {
          field: 'resolution.requiresSignature',
          operator: 'EQUALS',
          value: true
        },
        {
          field: 'resolution.status',
          operator: 'EQUALS',
          value: 'approved'
        }
      ],
      actions: [
        {
          type: 'INTEGRATION_CALL',
          config: {
            integrationId: docusignConnection.data!.integrationId,
            method: 'createDocument',
            parameters: {
              document: {
                name: '{{resolution.title}} - Board Resolution',
                type: 'RESOLUTION'
              },
              recipients: '{{resolution.signers}}'
            }
          },
          order: 1
        },
        {
          type: 'EMAIL',
          config: {
            to: '{{resolution.signers}}',
            subject: 'Board Resolution Ready for Signature: {{resolution.title}}',
            template: `
              Dear Board Member,
              
              The following board resolution is ready for your electronic signature:
              
              Resolution: {{resolution.title}}
              Date: {{resolution.date}}
              
              Please sign the document using the DocuSign link that will be sent separately.
              
              Best regards,
              Board Secretary
            `
          },
          order: 2
        }
      ],
      enabled: true
    });

    console.log('✅ Legal workflow created:', contractWorkflow.data?.ruleId);

    return {
      connectionId: docusignConnection.data!.integrationId,
      workflowId: contractWorkflow.data!.ruleId
    };
  } catch (error) {
    console.error('❌ Legal workflow setup failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Example 8: Error Handling and Retry Logic
 */
export async function demonstrateErrorHandling() {
  console.log('🚨 Demonstrating Error Handling...');
  
  try {
    // Example of retry with exponential backoff
    const result = await utils.retry(
      async () => {
        // Simulate an operation that might fail
        const integrations = await sdk.integrations.list();
        return integrations;
      },
      {
        retries: 5,
        minDelay: 1000,
        maxDelay: 30000,
        factor: 2
      }
    );

    console.log('✅ Retry successful, got', result.data?.length, 'integrations');
  } catch (error) {
    if (error instanceof SDKError) {
      console.log('🔧 SDK Error Details:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
      console.log('  Status:', error.statusCode);
      console.log('  Details:', error.details);
    }
  }

  // Example of handling specific error types
  try {
    await sdk.workflows.execute('non-existent-workflow', {});
  } catch (error) {
    if (error instanceof SDKError) {
      switch (error.code) {
        case 'WORKFLOW_NOT_FOUND':
          console.log('📋 Workflow not found - creating new one...');
          // Handle by creating workflow
          break;
        case 'AUTHENTICATION_ERROR':
          console.log('🔐 Authentication failed - refreshing token...');
          // Handle authentication
          break;
        case 'RATE_LIMIT_ERROR':
          console.log('⏱️  Rate limited - waiting before retry...');
          // Handle rate limiting
          break;
        default:
          console.log('❌ Unexpected error:', utils.formatError(error));
      }
    }
  }
}

/**
 * Example 9: Bulk Operations
 */
export async function performBulkOperations() {
  console.log('📦 Performing Bulk Operations...');
  
  try {
    // Get all integrations
    const integrations = await sdk.integrations.list();
    console.log('📊 Found', integrations.data?.length, 'integrations');

    // Bulk sync all financial integrations
    const financialIntegrations = integrations.data?.filter(
      integration => integration.type === 'FINANCIAL'
    ) || [];

    const syncPromises = financialIntegrations.map(async (integration) => {
      try {
        const result = await sdk.integrations.sync(integration.id, { dataType: 'current' });
        return { integrationId: integration.id, success: true, records: result.data?.length || 0 };
      } catch (error) {
        return { integrationId: integration.id, success: false, error: utils.formatError(error) };
      }
    });

    const syncResults = await Promise.all(syncPromises);
    
    const successful = syncResults.filter(r => r.success);
    const failed = syncResults.filter(r => !r.success);

    console.log('✅ Successful syncs:', successful.length);
    console.log('❌ Failed syncs:', failed.length);
    
    if (failed.length > 0) {
      console.log('Failed integrations:', failed.map(f => f.integrationId));
    }

    return syncResults;
  } catch (error) {
    console.error('❌ Bulk operations failed:', utils.formatError(error));
    throw error;
  }
}

/**
 * Run All Examples
 */
export async function runAllExamples() {
  console.log('🚀 Running Integration Hub SDK Examples...\n');

  try {
    // Check SDK health first
    const health = await sdk.healthCheck();
    console.log('💚 SDK Health:', health.data?.status, '\n');

    const results: Record<string, any> = {};

    // Run examples sequentially to avoid rate limiting
    results.sapIntegration = await setupSAPIntegration();
    console.log('\n---\n');

    results.documentWorkflow = await createDocumentApprovalWorkflow();
    console.log('\n---\n');

    results.marketplaceExtensions = await manageMarketplaceExtensions();
    console.log('\n---\n');

    results.aiOptimization = await optimizeWorkflowProcess();
    console.log('\n---\n');

    results.monitoringDashboard = await setupMonitoringDashboard();
    console.log('\n---\n');

    results.financialDataFeed = await setupFinancialDataFeed();
    console.log('\n---\n');

    results.legalWorkflow = await setupLegalDocumentWorkflow();
    console.log('\n---\n');

    await demonstrateErrorHandling();
    console.log('\n---\n');

    results.bulkOperations = await performBulkOperations();
    console.log('\n---\n');

    console.log('🎉 All examples completed successfully!');
    console.log('📋 Summary:', Object.keys(results));

    return results;
  } catch (error) {
    console.error('💥 Example execution failed:', utils.formatError(error));
    throw error;
  }
}

// Export individual examples
export {
  setupSAPIntegration,
  createDocumentApprovalWorkflow,
  manageMarketplaceExtensions,
  optimizeWorkflowProcess,
  setupMonitoringDashboard,
  setupFinancialDataFeed,
  setupLegalDocumentWorkflow,
  demonstrateErrorHandling,
  performBulkOperations
};

// Main execution for direct running
if (require.main === module) {
  runAllExamples().catch(console.error);
}