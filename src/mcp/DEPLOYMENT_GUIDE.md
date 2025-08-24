# BoardGuru MCP Demo - Deployment Guide

## Quick Start - Deploy to demo.boardguru.ai

### Option 1: One-Click Deployment (Recommended)

```bash
cd /home/vik/appboardguru/src/mcp
./deploy/deploy-demo.sh vercel production
```

This will:
- ✅ Build the demo application
- ✅ Deploy to Vercel with automatic SSL
- ✅ Set up DNS configuration guidance
- ✅ Configure monitoring and health checks
- ✅ Verify deployment is live

### Option 2: Platform-Specific Deployment

#### Vercel (Recommended for Demo)
```bash
# Quick Vercel deployment
./deploy/deploy.sh vercel production

# Manual Vercel setup
npm install -g vercel
vercel --prod
vercel domains add demo.boardguru.ai
```

#### Netlify
```bash
# Quick Netlify deployment
./deploy/deploy.sh netlify production

# Manual Netlify setup
npm install -g netlify-cli
netlify deploy --prod --dir=demo/public --functions=demo
```

#### AWS (Enterprise Production)
```bash
# Deploy complete AWS infrastructure
./deploy/deploy.sh aws production

# Requires AWS CLI configured with appropriate permissions
# Creates: ECS Fargate, CloudFront, ALB, Route53, SSL certificates
```

#### Docker (Self-Hosted)
```bash
# Deploy with Docker Compose
./deploy/deploy.sh docker production

# Includes: Nginx, Redis, Prometheus, Grafana monitoring
```

## Deployment Architecture

### Vercel Deployment (Recommended)
- **Frontend**: Static demo hosted on Vercel Edge Network
- **Backend**: Serverless functions for MCP API
- **Domain**: Auto-SSL with demo.boardguru.ai
- **Monitoring**: Built-in Vercel Analytics
- **Cost**: Free tier suitable for demo usage

### AWS Deployment (Enterprise)
- **Frontend**: CloudFront CDN + S3 static hosting
- **Backend**: ECS Fargate containers (2 replicas)
- **Database**: RDS PostgreSQL (optional)
- **Load Balancer**: Application Load Balancer with SSL
- **Monitoring**: CloudWatch + Optional Prometheus/Grafana
- **Cost**: ~$50-100/month for demo usage

### Docker Deployment (Self-Hosted)
- **Frontend**: Nginx reverse proxy with SSL
- **Backend**: Node.js containers
- **Caching**: Redis for session/API caching
- **Monitoring**: Prometheus + Grafana stack
- **SSL**: Let's Encrypt with auto-renewal
- **Cost**: VPS costs (~$10-50/month)

## DNS Configuration

### Required DNS Records

For all deployments, you need to configure DNS for `demo.boardguru.ai`:

#### Vercel
```
Type: CNAME
Name: demo
Value: cname.vercel-dns.com
```

#### Netlify
```
Type: CNAME  
Name: demo
Value: [your-site-name].netlify.app
```

#### AWS CloudFront
```
Type: CNAME
Name: demo
Value: [cloudfront-distribution-id].cloudfront.net
```

#### Docker/VPS
```
Type: A
Name: demo
Value: [your-server-ip]
```

### DNS Setup Script
```bash
./deploy/setup-dns.sh
# Interactive script to guide DNS configuration
```

## SSL Certificate Setup

### Automatic SSL (Vercel/Netlify)
- SSL certificates are provisioned automatically
- No manual configuration required
- Certificates auto-renew

### AWS Certificate Manager
```bash
./deploy/ssl-setup.sh
# Choose option 2 for AWS ACM
```

### Let's Encrypt (Docker/VPS)
```bash
./deploy/ssl-setup.sh
# Choose option 1 for Let's Encrypt
```

## Environment Variables

### Required Variables
```bash
# Core Configuration
NODE_ENV=production
DEMO_MODE=true
NEXT_PUBLIC_APP_URL=https://demo.boardguru.ai
PORT=3000
DEMO_PORT=3001

# Platform Specific
VERCEL_PROJECT_ID=your-project-id        # For Vercel
NETLIFY_SITE_ID=your-site-id             # For Netlify
AWS_CERTIFICATE_ARN=your-cert-arn        # For AWS
```

### Optional Variables
```bash
# Monitoring & Analytics
PERFORMANCE_MONITORING_ENABLED=true
SLACK_WEBHOOK=https://hooks.slack.com/... # For alerts
GRAFANA_PASSWORD=your-secure-password     # For Docker

# API Configuration  
API_RATE_LIMIT_REQUESTS_PER_MINUTE=100
API_VERSION_DEFAULT=v1
```

## Monitoring & Health Checks

### Built-in Health Checks
- **Health Endpoint**: `https://demo.boardguru.ai/health`
- **API Status**: `https://demo.boardguru.ai/api/demo/board-analysis`
- **SSL Monitoring**: Automatic certificate expiry alerts

### Monitoring Setup
```bash
./deploy/monitoring-setup.sh
# Sets up Prometheus, Grafana, alerting
```

### Health Check Endpoints
- `/health` - Application health status
- `/api/demo/health` - Demo-specific health check
- `/metrics` - Prometheus metrics (if enabled)

## Verification Checklist

After deployment, verify these items:

### ✅ Basic Functionality
- [ ] `https://demo.boardguru.ai` loads successfully
- [ ] Health check returns 200: `curl https://demo.boardguru.ai/health`
- [ ] Demo API responds: `curl https://demo.boardguru.ai/api/demo/board-analysis`

### ✅ SSL/Security
- [ ] HTTPS redirect working: `curl -I http://demo.boardguru.ai`
- [ ] SSL certificate valid: Check browser security indicator
- [ ] Security headers present: `curl -I https://demo.boardguru.ai`

### ✅ Performance
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] All static assets loading correctly

### ✅ Demo Features
- [ ] Board analysis demo functional
- [ ] Meeting intelligence working
- [ ] Compliance scanning operational
- [ ] ROI calculator displaying results

## Troubleshooting

### Common Issues

#### Build Timeouts
```bash
# Increase Node.js memory
NODE_OPTIONS="--max_old_space_size=4096" npm run build:demo
```

#### DNS Propagation
```bash
# Check DNS status
dig demo.boardguru.ai A
dig demo.boardguru.ai CNAME

# Clear local DNS cache
sudo systemctl flush-dns  # Linux
sudo dscacheutil -flushcache  # macOS
```

#### SSL Certificate Issues
```bash
# Check certificate status
openssl s_client -connect demo.boardguru.ai:443 -servername demo.boardguru.ai

# For Let's Encrypt renewal
sudo certbot renew --dry-run
```

#### Health Check Failures
```bash
# Check application logs
docker logs boardguru-mcp-demo  # Docker
vercel logs                     # Vercel
netlify logs                    # Netlify

# Test locally
npm run demo
curl http://localhost:3001/health
```

### Support Commands

#### Debug Deployment
```bash
# Run deployment with verbose logging
./deploy/deploy-demo.sh vercel production 2>&1 | tee deployment.log
```

#### Reset and Redeploy
```bash
# Clean build cache
rm -rf .next dist demo/public/.next node_modules/.cache

# Reinstall dependencies
npm ci

# Redeploy
./deploy/deploy-demo.sh [platform] production
```

## Production Readiness

### Before Going Live
1. **Test thoroughly**: All demo features working
2. **Performance audit**: Load testing completed  
3. **Security scan**: Vulnerability assessment done
4. **Monitoring setup**: Alerts and dashboards configured
5. **Backup strategy**: Data backup procedures in place
6. **Documentation**: Admin guide and user manual ready

### Post-Launch
1. **Monitor metrics**: Performance, errors, uptime
2. **User feedback**: Collect and analyze demo usage
3. **Regular updates**: Keep dependencies current
4. **Security patches**: Apply updates promptly
5. **Capacity planning**: Scale based on usage patterns

## Cost Estimation

### Platform Costs (Monthly)

#### Vercel
- **Free Tier**: Suitable for demo (100GB bandwidth)
- **Pro Plan**: $20/month (1TB bandwidth, analytics)

#### Netlify  
- **Free Tier**: Suitable for demo (100GB bandwidth)
- **Pro Plan**: $19/month (400GB bandwidth)

#### AWS
- **Demo Usage**: ~$50-100/month
  - ECS Fargate: ~$30/month (2 tasks)
  - CloudFront: ~$10/month
  - Load Balancer: ~$25/month
  - Route53: ~$1/month

#### Docker/VPS
- **VPS Server**: $10-50/month depending on specs
- **Domain**: ~$12/year
- **SSL**: Free (Let's Encrypt)

## Success Metrics

### Deployment Success
- ✅ Site loads in < 2 seconds
- ✅ 99.9% uptime SLA maintained  
- ✅ All demo features functional
- ✅ SSL certificate valid
- ✅ Health checks passing

### Business Success
- 📈 Demo engagement metrics
- 🎯 Lead generation from demo
- 💰 Conversion to paid plans
- 📊 ROI demonstration effectiveness

---

## Quick Commands Reference

```bash
# Complete deployment
./deploy/deploy-demo.sh vercel production

# Individual scripts
./deploy/deploy.sh vercel production      # Deploy only
./deploy/setup-dns.sh                    # Configure DNS
./deploy/ssl-setup.sh                    # Setup SSL
./deploy/monitoring-setup.sh             # Setup monitoring

# Verification
curl -f https://demo.boardguru.ai/health
curl -f https://demo.boardguru.ai/api/demo/board-analysis

# Monitoring
docker-compose -f deploy/docker-compose.prod.yml logs
tail -f /var/log/nginx/access.log
```

Ready to deploy? Run: `./deploy/deploy-demo.sh vercel production`