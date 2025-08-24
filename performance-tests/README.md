# BoardGuru Performance Testing Suite

A comprehensive performance and load testing framework designed for enterprise-scale board governance systems.

## Overview

This testing suite validates BoardGuru's performance under enterprise conditions including:
- **Concurrent User Load**: 100-1000+ concurrent users during board meetings
- **Real-time Performance**: WebSocket messaging, collaborative editing, live voting
- **Data Volume Testing**: Large-scale document processing, audit trails, meeting records
- **AI Processing Load**: Multiple AI models, transcription, document analysis
- **System Resilience**: Database performance, memory management, error recovery

## Architecture

```
performance-tests/
├── k6/                          # K6 load testing framework
│   ├── config/                  # Test configuration and thresholds
│   ├── scenarios/               # Individual test scenarios
│   ├── utils/                   # Shared utilities (auth, websockets)
│   └── monitoring/              # Performance monitoring dashboard
├── capacity-planning/           # Enterprise readiness assessments
├── scripts/                     # Test execution and automation scripts
└── reports/                     # Generated test reports and results
```

## Quick Start

### Prerequisites

1. **Install K6**:
   ```bash
   # macOS
   brew install k6
   
   # Ubuntu/Debian
   sudo gpg -k && \
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69 && \
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list && \
   sudo apt-get update && \
   sudo apt-get install k6
   
   # Windows (Chocolatey)
   choco install k6
   ```

2. **Verify Installation**:
   ```bash
   k6 version
   ```

### Running Tests

#### Basic Smoke Test
```bash
# Run basic functionality verification
./scripts/run-comprehensive-load-tests.sh --scenario smoke
```

#### Enterprise Load Testing
```bash
# Run all performance test scenarios
./scripts/run-comprehensive-load-tests.sh --all-scenarios --html

# Run specific scenarios
./scripts/run-comprehensive-load-tests.sh --scenario concurrent-meetings --scenario ai-processing

# Test against different environments
./scripts/run-comprehensive-load-tests.sh --env staging --scenario database-load
```

#### Individual Test Scenarios
```bash
# Concurrent board meetings
k6 run k6/scenarios/concurrent-meetings.js

# Document collaboration stress test
k6 run k6/scenarios/document-collaboration-stress.js

# Database performance testing
k6 run k6/scenarios/database-load-test.js

# AI processing load test
k6 run k6/scenarios/ai-processing-load.js
```

## Test Scenarios

### 1. Concurrent Meetings (`concurrent-meetings.js`)
**Simulates multiple board meetings happening simultaneously**

- **Load**: 10 concurrent meetings with 20+ participants each
- **Features Tested**:
  - Real-time WebSocket communication
  - AI transcription and analysis
  - Voting and decision tracking
  - Meeting progression and agenda management
- **Duration**: 30-90 minutes per meeting
- **Metrics**: Join latency, transcription accuracy, voting response times

### 2. Document Collaboration Stress (`document-collaboration-stress.js`)
**Tests real-time collaborative editing with conflict resolution**

- **Load**: 50+ users editing documents simultaneously
- **Features Tested**:
  - Operational transform conflict resolution
  - Version control under load
  - Large document handling (100+ pages)
  - Real-time synchronization
- **Operations**: Annotations, comments, highlights, text edits
- **Metrics**: Operation latency, sync success rate, conflict resolution time

### 3. Database Load Test (`database-load-test.js`)
**Validates database performance with enterprise-scale data**

- **Load**: Complex queries, bulk operations, analytics processing
- **Data Volumes**:
  - 10,000+ documents with annotations
  - 1,000,000+ audit entries
  - 100,000+ meeting records
- **Operations**: CRUD, analytics queries, bulk inserts, reporting
- **Metrics**: Query response times, connection pool usage, deadlock detection

### 4. AI Processing Load (`ai-processing-load.js`)
**Tests AI-powered features under concurrent load**

- **AI Features**:
  - Real-time transcription and speaker identification
  - Document intelligence and summarization
  - Interactive chat with context awareness
  - Compliance analysis and risk assessment
- **Load**: Multiple AI models processing simultaneously
- **Metrics**: Processing latency, accuracy rates, queue management

## Performance Thresholds

### SLA Requirements
- **API Response Time**: 95th percentile < 200ms
- **WebSocket Latency**: 95th percentile < 100ms
- **Database Queries**: Simple queries < 50ms, complex < 500ms
- **AI Processing**: Document analysis < 15s, transcription < 5s
- **Error Rate**: < 0.1%
- **Availability**: 99.9% uptime

### Load Capacity Targets
- **Concurrent Users**: 1,000+ for multi-organization deployments
- **Concurrent Meetings**: 50+ simultaneous board meetings
- **Document Collaborators**: 100+ users per document
- **AI Queue Processing**: 200+ concurrent AI operations

## Monitoring and Alerting

### Real-time Performance Dashboard
```javascript
import { createPerformanceDashboard } from './k6/monitoring/performance-dashboard.js';

// Start monitoring during load tests
const dashboard = createPerformanceDashboard(baseUrl, authHeaders, 10000);
```

### Key Metrics Monitored
- **System Resources**: CPU, memory, disk, network utilization
- **Database Performance**: Connection pools, query times, replication lag
- **Application Metrics**: Response times, error rates, throughput
- **WebSocket Metrics**: Connection count, message latency, failures
- **AI Processing**: Queue length, model response times, accuracy
- **Business Metrics**: Concurrent meetings, document collaborators

### Alert Thresholds
- **Critical**: CPU > 90%, Memory > 85%, Response Time P95 > 5s
- **Warning**: CPU > 70%, Memory > 70%, Response Time P95 > 2s
- **Auto-scaling**: Triggered at 75% resource utilization

## Enterprise Deployment

### Infrastructure Recommendations

#### Small Enterprise (100-500 users)
```yaml
Application Servers: 2 instances (8 vCPU, 16GB RAM)
Database: Single instance (16 vCPU, 64GB RAM)
Cache: Redis cluster (3 nodes)
Expected Cost: $2,500-4,000/month
```

#### Large Enterprise (2,000-5,000 users)
```yaml
Application Servers: 8+ instances with auto-scaling
Database: Multi-region cluster with read replicas
Cache: Redis cluster with failover
Load Balancer: Multi-AZ with SSL termination
Expected Cost: $25,000-40,000/month
```

### Capacity Planning
- **Horizontal Scaling**: Auto-scale at 75% CPU utilization
- **Database Scaling**: Read replicas for reporting queries
- **AI Processing**: Dedicated GPU instances for ML workloads
- **CDN**: Global content delivery for document assets

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Performance Tests
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.46.0/k6-v0.46.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1
      - name: Run Load Tests
        run: |
          ./performance-tests/scripts/run-comprehensive-load-tests.sh --all-scenarios --html
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-test-results
          path: performance-tests/reports/
```

### Performance Regression Detection
```bash
# Compare results with baseline
k6 run --out json=results.json k6/scenarios/smoke.js
./scripts/compare-with-baseline.sh results.json baseline.json
```

## Best Practices

### Test Environment Setup
1. **Dedicated Environment**: Use isolated environment for performance testing
2. **Production-like Data**: Use realistic data volumes and user patterns
3. **Network Conditions**: Test under various latency and bandwidth conditions
4. **Monitoring**: Deploy comprehensive monitoring before testing

### Test Execution Guidelines
1. **Gradual Ramp-up**: Start with low load and gradually increase
2. **Sustained Load**: Run tests for sufficient duration (10+ minutes)
3. **Think Time**: Include realistic user think time between operations
4. **Error Handling**: Gracefully handle and report errors

### Result Analysis
1. **Percentile Analysis**: Focus on 95th and 99th percentiles, not averages
2. **Resource Correlation**: Correlate performance with system resource usage
3. **Baseline Comparison**: Compare results with established baselines
4. **Bottleneck Identification**: Identify and prioritize performance bottlenecks

## Troubleshooting

### Common Issues

#### High Response Times
```bash
# Check system resources during test
htop
iostat -x 1
netstat -i
```

#### Database Performance Issues
```sql
-- Check slow queries
SELECT query, mean_time, calls FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;

-- Check connection pool status
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

#### WebSocket Connection Issues
```bash
# Check WebSocket connections
ss -tuln | grep :3000
# Monitor WebSocket logs
tail -f /var/log/boardguru/websocket.log
```

### Performance Optimization

#### Application Level
- **Caching**: Implement Redis caching for frequently accessed data
- **Database Indexing**: Optimize queries with proper indexes
- **Connection Pooling**: Configure database connection pools
- **Asset Optimization**: Use CDN for static assets

#### Infrastructure Level
- **Auto-scaling**: Configure horizontal pod autoscaling
- **Load Balancing**: Distribute traffic across multiple instances
- **Resource Allocation**: Right-size CPU and memory allocations
- **Storage Optimization**: Use SSD storage for databases

## Reporting

### Automated Reports
- **HTML Dashboard**: Interactive performance dashboard with charts
- **JSON Results**: Machine-readable test results for CI/CD
- **Markdown Summary**: Human-readable summary for documentation
- **CSV Export**: Raw metrics data for further analysis

### Custom Metrics
```javascript
import { Trend, Rate, Counter } from 'k6/metrics';

const customMetric = new Trend('custom_response_time');
const businessMetric = new Rate('meeting_join_success_rate');

// Use in test scenarios
customMetric.add(responseTime);
businessMetric.add(success);
```

## Contributing

### Adding New Test Scenarios
1. Create test file in `k6/scenarios/`
2. Follow existing patterns for authentication and metrics
3. Add scenario to `run-comprehensive-load-tests.sh`
4. Document performance thresholds and expected results

### Test Data Management
- Use realistic but anonymized test data
- Implement data cleanup after tests
- Maintain separate test databases
- Version control test data schemas

## Support

For questions and support:
- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues for bugs and feature requests
- **Performance Optimization**: Contact the platform engineering team

---

**Enterprise Ready**: This performance testing suite ensures BoardGuru can handle enterprise-scale board governance requirements with confidence.