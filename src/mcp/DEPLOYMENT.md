# 🚀 BoardGuru MCP Server Deployment Guide
## Production-Ready Enterprise Deployment

This guide covers production deployment of the BoardGuru MCP Server for enterprise environments targeting £1M+ annual revenue.

---

## 📋 **Deployment Options**

### 1. **One-Click Cloud Deployment** ⭐ *Recommended*
```bash
# AWS/Azure/GCP deployment with Terraform
curl -sSL https://deploy.boardguru.com/mcp | bash -s -- --cloud=aws --region=eu-west-1
```

### 2. **Docker Container Deployment**
```bash
# Production Docker deployment
docker run -d \
  --name boardguru-mcp \
  -p 3000:3000 \
  -e ENTERPRISE_LICENSE_KEY=your_key \
  -v /opt/boardguru/data:/app/data \
  boardguru/governance-mcp:latest
```

### 3. **Kubernetes Deployment**
```bash
# Helm chart deployment
helm repo add boardguru https://charts.boardguru.com
helm install boardguru-mcp boardguru/governance-mcp \
  --set enterprise.licenseKey=your_key \
  --set ingress.hostname=mcp.yourcompany.com
```

### 4. **On-Premises Installation**
```bash
# Automated server installation
curl -sSL https://install.boardguru.com/mcp | sudo bash -s mcp.yourcompany.com admin@yourcompany.com
```

---

## 🏗️ **Architecture Overview**

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx/HAProxy]
    end
    
    subgraph "Application Tier"
        MCP1[MCP Server 1]
        MCP2[MCP Server 2]
        MCP3[MCP Server 3]
    end
    
    subgraph "Data Tier"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
        S3[(Object Storage)]
    end
    
    subgraph "External Services"
        AI[AI APIs]
        SUPABASE[Supabase]
        EMAIL[Email Service]
    end
    
    LB --> MCP1
    LB --> MCP2
    LB --> MCP3
    MCP1 --> DB
    MCP2 --> DB
    MCP3 --> DB
    MCP1 --> REDIS
    MCP2 --> REDIS
    MCP3 --> REDIS
    MCP1 --> S3
    MCP1 --> AI
    MCP1 --> SUPABASE
    MCP1 --> EMAIL
```

---

## 🔧 **Production Configuration**

### **Environment Variables**
```bash
# Core Application
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# Enterprise License
ENTERPRISE_LICENSE_KEY=ent_your_enterprise_license_key_here

# Security
JWT_SECRET=your-super-secure-jwt-secret-64-characters-minimum
ENCRYPTION_KEY=your-32-character-encryption-key
API_KEY_PREFIX=bg_mcp_prod_

# Database
DATABASE_URL=postgresql://boardguru:secure_password@db.internal:5432/boardguru_mcp
REDIS_URL=redis://redis.internal:6379

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
PROMETHEUS_ENABLED=true
```

### **Docker Compose Production**
```yaml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - boardguru-mcp-1
      - boardguru-mcp-2

  # MCP Server Instances (HA)
  boardguru-mcp-1:
    image: boardguru/governance-mcp:latest
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=mcp-1
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  boardguru-mcp-2:
    image: boardguru/governance-mcp:latest
    environment:
      - NODE_ENV=production
      - INSTANCE_ID=mcp-2
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=boardguru_mcp
      - POSTGRES_USER=boardguru
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'

  # Cache
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

volumes:
  postgres_data:
  redis_data:
```

---

## ☸️ **Kubernetes Deployment**

### **Helm Values (values.yaml)**
```yaml
# BoardGuru MCP Helm Chart Values
replicaCount: 3

image:
  repository: boardguru/governance-mcp
  tag: "latest"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
  hosts:
    - host: mcp.yourcompany.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: boardguru-mcp-tls
      hosts:
        - mcp.yourcompany.com

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

enterprise:
  licenseKey: "ent_your_license_key"
  
database:
  host: postgres.internal
  port: 5432
  database: boardguru_mcp
  username: boardguru
  password: secure_password

redis:
  host: redis.internal
  port: 6379
  password: secure_password

monitoring:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

### **Deploy with Helm**
```bash
# Add BoardGuru Helm repository
helm repo add boardguru https://charts.boardguru.com
helm repo update

# Install with custom values
helm install boardguru-mcp boardguru/governance-mcp \
  --namespace boardguru \
  --create-namespace \
  --values values.yaml

# Check deployment status
kubectl get pods -n boardguru
kubectl logs -f deployment/boardguru-mcp -n boardguru
```

---

## 🔒 **Security Configuration**

### **SSL/TLS Setup**
```bash
# Let's Encrypt with Certbot
certbot --nginx -d mcp.yourcompany.com \
  --email admin@yourcompany.com \
  --agree-tos \
  --non-interactive

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### **Firewall Rules (UFW)**
```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

### **Nginx Security Configuration**
```nginx
# /etc/nginx/sites-available/boardguru-mcp
server {
    listen 443 ssl http2;
    server_name mcp.yourcompany.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/mcp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.yourcompany.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'";
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy configuration
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

---

## 📊 **Monitoring & Observability**

### **Prometheus Configuration**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "boardguru_rules.yml"

scrape_configs:
  - job_name: 'boardguru-mcp'
    static_configs:
      - targets: ['localhost:3000']
    scrape_interval: 10s
    metrics_path: /metrics
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093
```

### **Grafana Dashboard**
```json
{
  "dashboard": {
    "title": "BoardGuru MCP Server",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      }
    ]
  }
}
```

### **Health Checks**
```bash
# Application health check
curl -f http://localhost:3000/health || exit 1

# Database connectivity
curl -f http://localhost:3000/health/db || exit 1

# Redis connectivity
curl -f http://localhost:3000/health/redis || exit 1

# AI services connectivity
curl -f http://localhost:3000/health/ai || exit 1
```

---

## 💾 **Backup & Disaster Recovery**

### **Database Backup Script**
```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/boardguru/backups"
DB_NAME="boardguru_mcp"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h localhost -U boardguru $DB_NAME | \
  gzip > $BACKUP_DIR/boardguru_mcp_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/boardguru_mcp_$DATE.sql.gz \
  s3://boardguru-backups/database/

# Clean up local backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: boardguru_mcp_$DATE.sql.gz"
```

### **Automated Backup Cron**
```bash
# Crontab entry for daily backups at 2 AM
0 2 * * * /opt/boardguru/scripts/backup-db.sh >> /var/log/boardguru-backup.log 2>&1
```

### **Disaster Recovery Procedure**
```bash
# 1. Restore database from backup
gunzip -c boardguru_mcp_backup.sql.gz | psql -h localhost -U boardguru boardguru_mcp

# 2. Restore application data
aws s3 sync s3://boardguru-backups/data/ /opt/boardguru/data/

# 3. Restart services
systemctl restart boardguru-mcp
systemctl restart nginx

# 4. Verify health
curl -f http://localhost:3000/health
```

---

## 📈 **Performance Optimization**

### **Application Tuning**
```bash
# Node.js performance settings
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"
export UV_THREADPOOL_SIZE=16

# PM2 cluster mode
pm2 start dist/server.js \
  --name boardguru-mcp \
  --instances max \
  --max-memory-restart 2G \
  --node-args="--max-old-space-size=2048"
```

### **Database Optimization**
```sql
-- PostgreSQL performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.7;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### **Redis Configuration**
```conf
# redis.conf optimizations
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

#### **High Memory Usage**
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -20

# Restart if needed
systemctl restart boardguru-mcp
```

#### **Database Connection Issues**
```bash
# Check PostgreSQL status
systemctl status postgresql
tail -f /var/log/postgresql/postgresql-15-main.log

# Test connection
psql -h localhost -U boardguru -d boardguru_mcp -c "SELECT 1;"
```

#### **SSL Certificate Issues**
```bash
# Check certificate status
certbot certificates

# Renew certificate
certbot renew --dry-run
certbot renew --force-renewal -d mcp.yourcompany.com
```

### **Log Analysis**
```bash
# Application logs
journalctl -u boardguru-mcp -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Database logs
tail -f /var/log/postgresql/postgresql-15-main.log
```

---

## 📞 **Support & Maintenance**

### **Enterprise Support**
- **24/7 Support**: enterprise-support@boardguru.com
- **Emergency Hotline**: +44 20 1234 5678
- **Slack Channel**: #boardguru-enterprise
- **Video Support**: https://meet.boardguru.com/support

### **Maintenance Schedule**
- **Security Updates**: Weekly (automatic)
- **Feature Updates**: Monthly (scheduled)
- **Database Maintenance**: Weekly (scheduled)
- **Certificate Renewal**: Automatic (Let's Encrypt)

### **SLA Commitments**
- **Uptime**: 99.9% (Enterprise), 99.99% (Premium)
- **Response Time**: <4 hours (Enterprise), <1 hour (Premium)
- **Resolution Time**: <24 hours (critical issues)
- **Data Recovery**: <2 hours (RTO), <1 hour (RPO)

---

## 🎯 **Post-Deployment Checklist**

### **Functional Testing**
- [ ] API endpoints responding correctly
- [ ] Authentication and authorization working
- [ ] Database connectivity established
- [ ] AI services integration functional
- [ ] Email notifications working
- [ ] File upload/download operational

### **Security Testing**
- [ ] SSL/TLS certificate valid and configured
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] Authentication tokens secure
- [ ] Database access restricted
- [ ] Firewall rules applied

### **Performance Testing**
- [ ] Load testing completed
- [ ] Response times within SLA
- [ ] Memory usage optimized
- [ ] Database performance tuned
- [ ] Caching operational
- [ ] CDN configured (if applicable)

### **Monitoring Setup**
- [ ] Prometheus metrics collecting
- [ ] Grafana dashboards configured
- [ ] Alert rules defined
- [ ] Log aggregation working
- [ ] Health checks operational
- [ ] Backup procedures tested

### **Documentation**
- [ ] Deployment documented
- [ ] Runbooks created
- [ ] Contact information updated
- [ ] Access credentials secured
- [ ] Change management process defined

---

**Ready to deploy BoardGuru MCP for £1M+ revenue potential!** 🚀

For deployment support: **enterprise@boardguru.com**