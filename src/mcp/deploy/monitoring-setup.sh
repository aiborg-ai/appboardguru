#!/bin/bash
set -e

# BoardGuru Monitoring & Health Check Setup
# Sets up comprehensive monitoring for demo.boardguru.ai

DOMAIN="demo.boardguru.ai"
SLACK_WEBHOOK=${SLACK_WEBHOOK:-""}
PAGERDUTY_KEY=${PAGERDUTY_KEY:-""}

echo "📊 Setting up monitoring for BoardGuru MCP Demo"
echo "==============================================="

# Create monitoring directory
mkdir -p monitoring/{prometheus,grafana/{dashboards,datasources},alertmanager}

# Prometheus configuration
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'boardguru-demo'
    static_configs:
      - targets: ['boardguru-demo:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:8080']
    metrics_path: '/nginx-status'

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
EOF

# Alert rules
mkdir -p monitoring/rules
cat > monitoring/rules/boardguru-alerts.yml << EOF
groups:
  - name: boardguru.rules
    rules:
      # Application health
      - alert: BoardGuruDown
        expr: up{job="boardguru-demo"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "BoardGuru MCP Demo is down"
          description: "BoardGuru demo has been down for more than 1 minute"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is above 500ms"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 10%"

      # Resource usage
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 85%"

      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is above 80%"

      # SSL Certificate
      - alert: SSLCertificateExpiry
        expr: probe_ssl_earliest_cert_expiry - time() < 86400 * 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL certificate expiring soon"
          description: "SSL certificate for $DOMAIN expires in less than 30 days"
EOF

# Grafana datasource
cat > monitoring/grafana/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

# Grafana dashboard
cat > monitoring/grafana/dashboards/boardguru-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "BoardGuru MCP Demo",
    "tags": ["boardguru"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "color": {"mode": "palette-classic"},
            "custom": {"displayMode": "basic"},
            "unit": "reqps"
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "color": {"mode": "palette-classic"}
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors/sec"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "30s"
  }
}
EOF

# Health check script
cat > monitoring/health-check.sh << EOF
#!/bin/bash

DOMAIN="$DOMAIN"
SLACK_WEBHOOK="$SLACK_WEBHOOK"

# Function to send alert
send_alert() {
    local message="\$1"
    local status="\$2"
    
    echo "\$(date): \$message"
    
    if [ -n "\$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\\"text\\": \\"🚨 BoardGuru Demo Alert: \$message\\"}" \
            "\$SLACK_WEBHOOK"
    fi
}

# Health checks
echo "Running health checks for \$DOMAIN..."

# 1. HTTP Response Check
response=\$(curl -s -o /dev/null -w "%{http_code}" "https://\$DOMAIN/health" || echo "000")
if [ "\$response" != "200" ]; then
    send_alert "Health endpoint returned \$response" "critical"
    exit 1
fi

# 2. SSL Certificate Check  
cert_days=\$(echo | openssl s_client -servername \$DOMAIN -connect \$DOMAIN:443 2>/dev/null | openssl x509 -noout -checkend \$((30*24*3600)) && echo "OK" || echo "EXPIRING")
if [ "\$cert_days" = "EXPIRING" ]; then
    send_alert "SSL certificate expires in less than 30 days" "warning"
fi

# 3. Response Time Check
response_time=\$(curl -o /dev/null -s -w '%{time_total}' "https://\$DOMAIN/api/demo/health")
if (( \$(echo "\$response_time > 2.0" | bc -l) )); then
    send_alert "High response time: \${response_time}s" "warning"
fi

# 4. Demo Functionality Check
demo_response=\$(curl -s "https://\$DOMAIN/api/demo/board-analysis" | jq -r '.boardScore' 2>/dev/null || echo "error")
if [ "\$demo_response" = "error" ]; then
    send_alert "Demo API not responding correctly" "critical"
    exit 1
fi

echo "✅ All health checks passed"
EOF

chmod +x monitoring/health-check.sh

# Uptime monitoring script
cat > monitoring/uptime-monitor.sh << 'EOF'
#!/bin/bash

# Simple uptime monitoring for BoardGuru demo
DOMAIN="demo.boardguru.ai"
LOG_FILE="/var/log/boardguru-uptime.log"
INTERVAL=300  # 5 minutes

while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check if site is up
    if curl -f -s "https://$DOMAIN/health" > /dev/null; then
        echo "$timestamp - UP" >> "$LOG_FILE"
    else
        echo "$timestamp - DOWN" >> "$LOG_FILE"
        
        # Send alert (customize as needed)
        if [ -n "$SLACK_WEBHOOK" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data '{"text": "🚨 BoardGuru Demo is DOWN"}' \
                "$SLACK_WEBHOOK"
        fi
    fi
    
    sleep $INTERVAL
done
EOF

chmod +x monitoring/uptime-monitor.sh

# System monitoring service
cat > monitoring/boardguru-monitor.service << 'EOF'
[Unit]
Description=BoardGuru Demo Health Monitor
After=network.target

[Service]
Type=simple
ExecStart=/opt/boardguru/monitoring/health-check.sh
Restart=always
RestartSec=300
User=monitoring
Group=monitoring

[Install]
WantedBy=multi-user.target
EOF

# Docker compose monitoring services
cat > monitoring/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  # Prometheus monitoring
  prometheus:
    image: prom/prometheus:latest
    container_name: boardguru-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks:
      - monitoring

  # Grafana dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: boardguru-grafana
    restart: unless-stopped
    ports:
      - "3030:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin123}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
      - ./grafana/datasources:/etc/grafana/provisioning/datasources:ro
    networks:
      - monitoring
    depends_on:
      - prometheus

  # Alert manager
  alertmanager:
    image: prom/alertmanager:latest
    container_name: boardguru-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    networks:
      - monitoring

  # Node exporter for system metrics
  node-exporter:
    image: prom/node-exporter:latest
    container_name: boardguru-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
    name: boardguru-monitoring

volumes:
  prometheus_data:
    name: boardguru-prometheus-data
  grafana_data:
    name: boardguru-grafana-data
  alertmanager_data:
    name: boardguru-alertmanager-data
EOF

# Alert manager configuration
cat > monitoring/alertmanager.yml << EOF
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@boardguru.ai'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: '${SLACK_WEBHOOK}'
        send_resolved: true
EOF

echo "📊 Monitoring setup completed!"
echo ""
echo "Created monitoring components:"
echo "✅ Prometheus configuration"
echo "✅ Grafana dashboards"
echo "✅ Alert rules and notifications"
echo "✅ Health check scripts"
echo "✅ Uptime monitoring"
echo "✅ System monitoring service"
echo ""
echo "To start monitoring:"
echo "docker-compose -f monitoring/docker-compose.monitoring.yml up -d"
echo ""
echo "Access points:"
echo "📊 Grafana: http://localhost:3030 (admin/admin123)"
echo "📈 Prometheus: http://localhost:9090" 
echo "🚨 AlertManager: http://localhost:9093"
echo ""
echo "Set up cron job for regular health checks:"
echo "*/5 * * * * /path/to/monitoring/health-check.sh"