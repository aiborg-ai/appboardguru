// Performance Monitoring Dashboard
// Real-time performance monitoring and alerting system for BoardGuru load testing

import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// System health metrics
const systemCpuUsage = new Gauge('system_cpu_usage_percent');
const systemMemoryUsage = new Gauge('system_memory_usage_percent');
const systemDiskUsage = new Gauge('system_disk_usage_percent');
const systemNetworkLatency = new Trend('system_network_latency_ms');

// Database performance metrics
const dbConnectionPoolUsage = new Gauge('db_connection_pool_usage_percent');
const dbQueryQueueLength = new Gauge('db_query_queue_length');
const dbReplicationLag = new Trend('db_replication_lag_ms');
const dbDeadlockCount = new Counter('db_deadlock_count');
const dbSlowQueryCount = new Counter('db_slow_query_count');

// Application performance metrics
const appResponseTime = new Trend('app_response_time_ms');
const appErrorRate = new Rate('app_error_rate');
const appThroughput = new Rate('app_requests_per_second');
const appActiveUsers = new Gauge('app_active_users');
const appMemoryLeakIndicator = new Gauge('app_memory_leak_indicator');

// WebSocket metrics
const wsConnectionCount = new Gauge('websocket_connection_count');
const wsMessageLatency = new Trend('websocket_message_latency_ms');
const wsConnectionFailures = new Counter('websocket_connection_failures');
const wsReconnectionCount = new Counter('websocket_reconnection_count');

// AI processing metrics
const aiProcessingQueueLength = new Gauge('ai_processing_queue_length');
const aiModelResponseTime = new Trend('ai_model_response_time_ms');
const aiModelSwitchCount = new Counter('ai_model_switch_count');
const aiProcessingErrors = new Counter('ai_processing_errors');

// Business logic metrics
const meetingConcurrency = new Gauge('meeting_concurrent_sessions');
const documentCollaborators = new Gauge('document_concurrent_collaborators');
const complianceProcessingBacklog = new Gauge('compliance_processing_backlog');
const auditLogBacklog = new Gauge('audit_log_processing_backlog');

// Alert thresholds configuration
export const alertThresholds = {
  critical: {
    system_cpu_usage: 90,        // 90% CPU usage
    system_memory_usage: 85,     // 85% memory usage
    app_response_time_p95: 5000, // 5 second response time
    app_error_rate: 0.05,        // 5% error rate
    db_connection_pool_usage: 90, // 90% pool usage
    websocket_connection_failures: 10, // 10 failures per minute
    ai_processing_queue_length: 100    // 100 items in queue
  },
  warning: {
    system_cpu_usage: 70,        // 70% CPU usage
    system_memory_usage: 70,     // 70% memory usage
    app_response_time_p95: 2000, // 2 second response time
    app_error_rate: 0.02,        // 2% error rate
    db_connection_pool_usage: 70, // 70% pool usage
    websocket_connection_failures: 5,  // 5 failures per minute
    ai_processing_queue_length: 50     // 50 items in queue
  }
};

// Performance dashboard class
export class PerformanceDashboard {
  constructor(baseUrl, authHeaders) {
    this.baseUrl = baseUrl;
    this.authHeaders = authHeaders;
    this.monitoringInterval = null;
    this.alertHistory = [];
    this.metrics = {
      system: {},
      database: {},
      application: {},
      websocket: {},
      ai: {},
      business: {}
    };
  }

  // Start real-time monitoring
  startMonitoring(intervalMs = 10000) {
    console.log('Starting performance monitoring dashboard...');
    
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectDatabaseMetrics();
      this.collectApplicationMetrics();
      this.collectWebSocketMetrics();
      this.collectAIMetrics();
      this.collectBusinessMetrics();
      this.evaluateAlerts();
      this.logDashboardStatus();
    }, intervalMs);

    return this.monitoringInterval;
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Performance monitoring stopped');
    }
  }

  // Collect system-level metrics
  collectSystemMetrics() {
    const healthResponse = http.get(
      `${this.baseUrl}/api/health/detailed`,
      { headers: this.authHeaders }
    );

    if (healthResponse.status === 200) {
      const healthData = healthResponse.json();
      
      if (healthData.system) {
        systemCpuUsage.add(healthData.system.cpu_usage_percent || 0);
        systemMemoryUsage.add(healthData.system.memory_usage_percent || 0);
        systemDiskUsage.add(healthData.system.disk_usage_percent || 0);
        systemNetworkLatency.add(healthData.system.network_latency_ms || 0);

        this.metrics.system = {
          cpu_usage: healthData.system.cpu_usage_percent,
          memory_usage: healthData.system.memory_usage_percent,
          disk_usage: healthData.system.disk_usage_percent,
          network_latency: healthData.system.network_latency_ms,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Collect database performance metrics
  collectDatabaseMetrics() {
    const dbHealthResponse = http.get(
      `${this.baseUrl}/api/health/database/comprehensive`,
      { headers: this.authHeaders }
    );

    if (dbHealthResponse.status === 200) {
      const dbData = dbHealthResponse.json();
      
      if (dbData.database) {
        dbConnectionPoolUsage.add(dbData.database.connection_pool_usage_percent || 0);
        dbQueryQueueLength.add(dbData.database.query_queue_length || 0);
        dbReplicationLag.add(dbData.database.replication_lag_ms || 0);

        if (dbData.database.deadlocks_since_last_check) {
          dbDeadlockCount.add(dbData.database.deadlocks_since_last_check);
        }

        if (dbData.database.slow_queries_since_last_check) {
          dbSlowQueryCount.add(dbData.database.slow_queries_since_last_check);
        }

        this.metrics.database = {
          connection_pool_usage: dbData.database.connection_pool_usage_percent,
          query_queue_length: dbData.database.query_queue_length,
          replication_lag: dbData.database.replication_lag_ms,
          deadlocks: dbData.database.deadlocks_since_last_check,
          slow_queries: dbData.database.slow_queries_since_last_check,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Collect application performance metrics
  collectApplicationMetrics() {
    const appMetricsResponse = http.get(
      `${this.baseUrl}/api/metrics`,
      { headers: this.authHeaders }
    );

    if (appMetricsResponse.status === 200) {
      const appData = appMetricsResponse.json();
      
      if (appData.application) {
        appResponseTime.add(appData.application.avg_response_time_ms || 0);
        appErrorRate.add(appData.application.error_rate || 0);
        appThroughput.add(appData.application.requests_per_second || 0);
        appActiveUsers.add(appData.application.active_users || 0);
        appMemoryLeakIndicator.add(appData.application.memory_usage_trend || 0);

        this.metrics.application = {
          avg_response_time: appData.application.avg_response_time_ms,
          error_rate: appData.application.error_rate,
          requests_per_second: appData.application.requests_per_second,
          active_users: appData.application.active_users,
          memory_trend: appData.application.memory_usage_trend,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Collect WebSocket metrics
  collectWebSocketMetrics() {
    const wsMetricsResponse = http.get(
      `${this.baseUrl}/api/websocket/metrics`,
      { headers: this.authHeaders }
    );

    if (wsMetricsResponse.status === 200) {
      const wsData = wsMetricsResponse.json();
      
      if (wsData.websocket) {
        wsConnectionCount.add(wsData.websocket.active_connections || 0);
        wsMessageLatency.add(wsData.websocket.avg_message_latency_ms || 0);

        if (wsData.websocket.connection_failures_since_last_check) {
          wsConnectionFailures.add(wsData.websocket.connection_failures_since_last_check);
        }

        if (wsData.websocket.reconnections_since_last_check) {
          wsReconnectionCount.add(wsData.websocket.reconnections_since_last_check);
        }

        this.metrics.websocket = {
          active_connections: wsData.websocket.active_connections,
          avg_message_latency: wsData.websocket.avg_message_latency_ms,
          connection_failures: wsData.websocket.connection_failures_since_last_check,
          reconnections: wsData.websocket.reconnections_since_last_check,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Collect AI processing metrics
  collectAIMetrics() {
    const aiMetricsResponse = http.get(
      `${this.baseUrl}/api/ai/metrics`,
      { headers: this.authHeaders }
    );

    if (aiMetricsResponse.status === 200) {
      const aiData = aiMetricsResponse.json();
      
      if (aiData.ai_processing) {
        aiProcessingQueueLength.add(aiData.ai_processing.queue_length || 0);
        aiModelResponseTime.add(aiData.ai_processing.avg_response_time_ms || 0);

        if (aiData.ai_processing.model_switches_since_last_check) {
          aiModelSwitchCount.add(aiData.ai_processing.model_switches_since_last_check);
        }

        if (aiData.ai_processing.errors_since_last_check) {
          aiProcessingErrors.add(aiData.ai_processing.errors_since_last_check);
        }

        this.metrics.ai = {
          queue_length: aiData.ai_processing.queue_length,
          avg_response_time: aiData.ai_processing.avg_response_time_ms,
          model_switches: aiData.ai_processing.model_switches_since_last_check,
          errors: aiData.ai_processing.errors_since_last_check,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Collect business logic metrics
  collectBusinessMetrics() {
    const businessMetricsResponse = http.get(
      `${this.baseUrl}/api/dashboard/metrics`,
      { headers: this.authHeaders }
    );

    if (businessMetricsResponse.status === 200) {
      const businessData = businessMetricsResponse.json();
      
      if (businessData.business) {
        meetingConcurrency.add(businessData.business.concurrent_meetings || 0);
        documentCollaborators.add(businessData.business.concurrent_document_collaborators || 0);
        complianceProcessingBacklog.add(businessData.business.compliance_processing_backlog || 0);
        auditLogBacklog.add(businessData.business.audit_log_backlog || 0);

        this.metrics.business = {
          concurrent_meetings: businessData.business.concurrent_meetings,
          concurrent_document_collaborators: businessData.business.concurrent_document_collaborators,
          compliance_backlog: businessData.business.compliance_processing_backlog,
          audit_log_backlog: businessData.business.audit_log_backlog,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // Evaluate alert conditions
  evaluateAlerts() {
    const currentTime = new Date().toISOString();
    const alerts = [];

    // System alerts
    if (this.metrics.system.cpu_usage >= alertThresholds.critical.system_cpu_usage) {
      alerts.push({
        level: 'critical',
        type: 'system',
        metric: 'cpu_usage',
        current_value: this.metrics.system.cpu_usage,
        threshold: alertThresholds.critical.system_cpu_usage,
        message: `Critical: CPU usage at ${this.metrics.system.cpu_usage}% (threshold: ${alertThresholds.critical.system_cpu_usage}%)`,
        timestamp: currentTime
      });
    } else if (this.metrics.system.cpu_usage >= alertThresholds.warning.system_cpu_usage) {
      alerts.push({
        level: 'warning',
        type: 'system',
        metric: 'cpu_usage',
        current_value: this.metrics.system.cpu_usage,
        threshold: alertThresholds.warning.system_cpu_usage,
        message: `Warning: CPU usage at ${this.metrics.system.cpu_usage}% (threshold: ${alertThresholds.warning.system_cpu_usage}%)`,
        timestamp: currentTime
      });
    }

    // Memory alerts
    if (this.metrics.system.memory_usage >= alertThresholds.critical.system_memory_usage) {
      alerts.push({
        level: 'critical',
        type: 'system',
        metric: 'memory_usage',
        current_value: this.metrics.system.memory_usage,
        threshold: alertThresholds.critical.system_memory_usage,
        message: `Critical: Memory usage at ${this.metrics.system.memory_usage}% (threshold: ${alertThresholds.critical.system_memory_usage}%)`,
        timestamp: currentTime
      });
    }

    // Database connection pool alerts
    if (this.metrics.database.connection_pool_usage >= alertThresholds.critical.db_connection_pool_usage) {
      alerts.push({
        level: 'critical',
        type: 'database',
        metric: 'connection_pool_usage',
        current_value: this.metrics.database.connection_pool_usage,
        threshold: alertThresholds.critical.db_connection_pool_usage,
        message: `Critical: DB connection pool usage at ${this.metrics.database.connection_pool_usage}% (threshold: ${alertThresholds.critical.db_connection_pool_usage}%)`,
        timestamp: currentTime
      });
    }

    // AI processing queue alerts
    if (this.metrics.ai.queue_length >= alertThresholds.critical.ai_processing_queue_length) {
      alerts.push({
        level: 'critical',
        type: 'ai',
        metric: 'queue_length',
        current_value: this.metrics.ai.queue_length,
        threshold: alertThresholds.critical.ai_processing_queue_length,
        message: `Critical: AI processing queue length at ${this.metrics.ai.queue_length} (threshold: ${alertThresholds.critical.ai_processing_queue_length})`,
        timestamp: currentTime
      });
    }

    // Store and log alerts
    if (alerts.length > 0) {
      this.alertHistory.push(...alerts);
      alerts.forEach(alert => {
        console.error(`[${alert.level.toUpperCase()}] ${alert.message}`);
      });
    }
  }

  // Log dashboard status
  logDashboardStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      system: this.metrics.system,
      database: this.metrics.database,
      application: this.metrics.application,
      websocket: this.metrics.websocket,
      ai: this.metrics.ai,
      business: this.metrics.business,
      recent_alerts: this.alertHistory.slice(-5) // Last 5 alerts
    };

    console.log('=== Performance Dashboard Status ===');
    console.log(`Timestamp: ${status.timestamp}`);
    
    if (status.system.cpu_usage !== undefined) {
      console.log(`System - CPU: ${status.system.cpu_usage}%, Memory: ${status.system.memory_usage}%, Disk: ${status.system.disk_usage}%`);
    }
    
    if (status.database.connection_pool_usage !== undefined) {
      console.log(`Database - Pool: ${status.database.connection_pool_usage}%, Queue: ${status.database.query_queue_length}, Lag: ${status.database.replication_lag}ms`);
    }
    
    if (status.application.avg_response_time !== undefined) {
      console.log(`Application - Response: ${status.application.avg_response_time}ms, Error Rate: ${(status.application.error_rate * 100).toFixed(2)}%, Active Users: ${status.application.active_users}`);
    }
    
    if (status.websocket.active_connections !== undefined) {
      console.log(`WebSocket - Connections: ${status.websocket.active_connections}, Latency: ${status.websocket.avg_message_latency}ms`);
    }
    
    if (status.ai.queue_length !== undefined) {
      console.log(`AI Processing - Queue: ${status.ai.queue_length}, Response Time: ${status.ai.avg_response_time}ms`);
    }
    
    if (status.business.concurrent_meetings !== undefined) {
      console.log(`Business - Meetings: ${status.business.concurrent_meetings}, Doc Collaborators: ${status.business.concurrent_document_collaborators}`);
    }
    
    console.log('=====================================');
  }

  // Generate performance report
  generateReport() {
    const report = {
      generated_at: new Date().toISOString(),
      test_duration: this.getTestDuration(),
      summary: {
        total_alerts: this.alertHistory.length,
        critical_alerts: this.alertHistory.filter(a => a.level === 'critical').length,
        warning_alerts: this.alertHistory.filter(a => a.level === 'warning').length
      },
      current_metrics: {
        system: this.metrics.system,
        database: this.metrics.database,
        application: this.metrics.application,
        websocket: this.metrics.websocket,
        ai: this.metrics.ai,
        business: this.metrics.business
      },
      alert_history: this.alertHistory,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = [];

    // CPU recommendations
    if (this.metrics.system.cpu_usage > 80) {
      recommendations.push({
        category: 'system',
        priority: 'high',
        issue: 'High CPU usage',
        recommendation: 'Consider scaling horizontally or optimizing CPU-intensive operations'
      });
    }

    // Memory recommendations
    if (this.metrics.system.memory_usage > 75) {
      recommendations.push({
        category: 'system',
        priority: 'high',
        issue: 'High memory usage',
        recommendation: 'Review memory allocation and consider increasing available memory or implementing memory optimization'
      });
    }

    // Database recommendations
    if (this.metrics.database.connection_pool_usage > 80) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        issue: 'High database connection pool usage',
        recommendation: 'Increase connection pool size or optimize database queries to reduce connection hold time'
      });
    }

    if (this.metrics.database.slow_queries > 5) {
      recommendations.push({
        category: 'database',
        priority: 'medium',
        issue: 'High number of slow queries',
        recommendation: 'Review and optimize database queries, consider adding indexes'
      });
    }

    // WebSocket recommendations
    if (this.metrics.websocket.avg_message_latency > 500) {
      recommendations.push({
        category: 'websocket',
        priority: 'medium',
        issue: 'High WebSocket message latency',
        recommendation: 'Optimize WebSocket message processing and consider scaling WebSocket servers'
      });
    }

    // AI processing recommendations
    if (this.metrics.ai.queue_length > 20) {
      recommendations.push({
        category: 'ai',
        priority: 'high',
        issue: 'AI processing queue backlog',
        recommendation: 'Scale AI processing capacity or optimize AI model performance'
      });
    }

    return recommendations;
  }

  // Get test duration
  getTestDuration() {
    // This would be calculated based on when monitoring started
    // For now, return a placeholder
    return 'N/A';
  }
}

// Utility function to create and start dashboard
export function createPerformanceDashboard(baseUrl, authHeaders, intervalMs = 10000) {
  const dashboard = new PerformanceDashboard(baseUrl, authHeaders);
  dashboard.startMonitoring(intervalMs);
  return dashboard;
}

// Export metrics for external use
export {
  systemCpuUsage,
  systemMemoryUsage,
  systemDiskUsage,
  systemNetworkLatency,
  dbConnectionPoolUsage,
  dbQueryQueueLength,
  dbReplicationLag,
  dbDeadlockCount,
  dbSlowQueryCount,
  appResponseTime,
  appErrorRate,
  appThroughput,
  appActiveUsers,
  appMemoryLeakIndicator,
  wsConnectionCount,
  wsMessageLatency,
  wsConnectionFailures,
  wsReconnectionCount,
  aiProcessingQueueLength,
  aiModelResponseTime,
  aiModelSwitchCount,
  aiProcessingErrors,
  meetingConcurrency,
  documentCollaborators,
  complianceProcessingBacklog,
  auditLogBacklog
};