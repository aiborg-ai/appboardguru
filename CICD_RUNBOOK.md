# BoardGuru CI/CD Operations Runbook

## Quick Reference

### Emergency Contacts
- **Platform Team Lead**: hirendra.vikram@boardguru.ai
- **DevOps On-Call**: [PagerDuty rotation]
- **Security Team**: security@boardguru.ai

### Critical URLs
- **Production App**: https://boardguru.ai
- **Staging App**: https://staging.boardguru.ai
- **Status Page**: https://status.boardguru.ai
- **Monitoring**: https://grafana.boardguru.ai
- **CI/CD Dashboard**: https://github.com/boardguru/appboardguru/actions

## Daily Operations

### Morning Checklist (5 minutes)

```bash
# 1. Check application health
curl -f https://boardguru.ai/api/health

# 2. Verify last night's deployments
gh run list --limit 5

# 3. Check error rates in Grafana
open https://grafana.boardguru.ai/d/boardguru-overview

# 4. Review security alerts
gh issue list --label security --state open

# 5. Check infrastructure costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-02 \
  --granularity DAILY --metrics BlendedCost
```

### Weekly Maintenance (30 minutes)

```bash
# 1. Update dependencies
npm audit
npm update

# 2. Rotate secrets (monthly, but check weekly)
./secrets/scripts/setup-secrets.sh validate production

# 3. Clean up old artifacts
gh run list --status completed --limit 100 | grep "weeks ago" | \
  awk '{print $1}' | xargs -I {} gh run delete {}

# 4. Review and apply security patches
kubectl get nodes -o wide
aws eks describe-update --name boardguru-production-eks

# 5. Test disaster recovery procedures
./deployment/scripts/test-backup-restore.sh staging
```

## Deployment Procedures

### Standard Deployment Flow

1. **Developer pushes to feature branch**
   - Automated tests run via GitHub Actions
   - Security scans execute
   - Code quality checks performed

2. **Pull Request Review**
   - Peer review required
   - All checks must pass
   - Deployment preview available

3. **Merge to develop**
   - Automatic deployment to staging
   - E2E tests execute
   - Performance testing

4. **Merge to main**
   - Production deployment pipeline starts
   - Database migrations run
   - Blue-green deployment executes
   - Health checks verify success

### Emergency Deployment

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-security-fix

# 2. Make minimal necessary changes
# ... edit files ...

# 3. Commit and push
git add .
git commit -m "HOTFIX: Critical security vulnerability fix"
git push origin hotfix/critical-security-fix

# 4. Create emergency PR
gh pr create --title "HOTFIX: Critical Security Fix" \
  --body "Emergency fix for security vulnerability. Skip normal review process." \
  --label emergency

# 5. Emergency deployment (skip tests if necessary)
gh workflow run ci-cd-pipeline.yml \
  --field environment=production \
  --field skip_tests=true

# 6. Monitor deployment
watch kubectl get pods -n boardguru-production
```

### Rollback Procedures

#### Immediate Rollback (< 5 minutes)

```bash
# 1. Blue-green rollback
./deployment/scripts/blue-green-deploy.sh rollback

# 2. Or kubectl rollback
kubectl rollout undo deployment/boardguru-app -n boardguru-production

# 3. Verify rollback
curl -f https://boardguru.ai/api/health
kubectl get pods -n boardguru-production
```

#### Database Rollback (15-30 minutes)

```bash
# 1. Check recent migrations
npm run db:status

# 2. Rollback specific migration
npm run db:rollback --steps=1

# 3. Verify database state
npm run db:status
```

## Incident Response

### Severity Levels

- **SEV-0 (Critical)**: Complete service outage
- **SEV-1 (High)**: Major feature broken, security incident
- **SEV-2 (Medium)**: Minor feature issues, performance degradation
- **SEV-3 (Low)**: Cosmetic issues, non-critical bugs

### SEV-0 Response (Complete Outage)

```bash
# Immediate Response (0-5 minutes)
echo "SEV-0 INCIDENT: $(date)" >> incident.log

# 1. Check infrastructure status
kubectl get pods --all-namespaces
aws eks describe-cluster --name boardguru-production-eks

# 2. Check recent deployments
kubectl rollout history deployment/boardguru-app -n boardguru-production

# 3. Quick rollback if recent deployment
./deployment/scripts/blue-green-deploy.sh rollback

# 4. Update status page
curl -X POST https://api.statuspage.io/v1/pages/PAGE_ID/incidents \
  -H "Authorization: OAuth TOKEN" \
  -d '{"incident":{"name":"Service Outage","status":"investigating"}}'

# 5. Notify team
slack-notify "#incidents" "SEV-0: BoardGuru production outage - investigating"
```

### SEV-1 Response (Major Issues)

```bash
# Assessment Phase (0-15 minutes)
echo "SEV-1 INCIDENT: $(date)" >> incident.log

# 1. Gather information
kubectl describe deployment boardguru-app -n boardguru-production
kubectl get events -n boardguru-production --sort-by='.lastTimestamp'

# 2. Check monitoring dashboards
open https://grafana.boardguru.ai/d/boardguru-overview

# 3. Review recent changes
git log --oneline --since="2 hours ago"

# 4. Determine impact scope
kubectl logs deployment/boardguru-app -n boardguru-production --tail=100
```

## CI/CD Troubleshooting

### GitHub Actions Failures

#### Build Failures

```bash
# 1. Check build logs
gh run list --limit 5
gh run view RUN_ID

# 2. Common issues and fixes:

# TypeScript errors
npm run type-check
npm run lint

# Dependency issues
rm -rf node_modules package-lock.json
npm install

# Test failures
npm run test:unit
npm run test:integration
```

#### Deployment Failures

```bash
# 1. Check deployment status
kubectl rollout status deployment/boardguru-app -n boardguru-production

# 2. Check pod events
kubectl describe pods -l app=boardguru -n boardguru-production

# 3. Check resource constraints
kubectl top nodes
kubectl top pods -n boardguru-production

# 4. Check secrets and config
kubectl get secret boardguru-secrets -n boardguru-production
kubectl get configmap boardguru-config -n boardguru-production
```

#### Infrastructure Failures

```bash
# 1. Check Terraform state
cd infrastructure
terraform plan -var-file="environments/production/terraform.tfvars"

# 2. Check AWS resources
aws eks describe-cluster --name boardguru-production-eks
aws rds describe-db-instances --db-instance-identifier boardguru-production

# 3. Check for drift
terraform plan -detailed-exitcode
```

### Performance Issues

#### High Response Times

```bash
# 1. Check application metrics
kubectl logs deployment/boardguru-app -n boardguru-production | grep "slow"

# 2. Scale up if needed
kubectl scale deployment boardguru-app --replicas=5 -n boardguru-production

# 3. Check database performance
aws rds describe-db-instances --db-instance-identifier boardguru-production \
  --query 'DBInstances[0].{CPUUtilization:CPUUtilization,DatabaseConnections:DatabaseConnections}'

# 4. Check Redis performance
kubectl exec deployment/boardguru-app -n boardguru-production -- \
  redis-cli -h REDIS_HOST info stats
```

#### Memory Issues

```bash
# 1. Check memory usage
kubectl top pods -n boardguru-production --sort-by=memory

# 2. Increase memory limits if needed
kubectl patch deployment boardguru-app -n boardguru-production \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"boardguru-app","resources":{"limits":{"memory":"2Gi"}}}]}}}}'

# 3. Check for memory leaks
kubectl logs deployment/boardguru-app -n boardguru-production | grep "OutOfMemory\|heap"
```

## Security Incident Response

### Data Breach Response

1. **Immediate Containment**
   ```bash
   # Isolate affected systems
   kubectl scale deployment boardguru-app --replicas=0 -n boardguru-production
   
   # Preserve evidence
   kubectl logs deployment/boardguru-app -n boardguru-production > incident-logs.txt
   ```

2. **Assessment**
   ```bash
   # Check access logs
   aws logs filter-log-events --log-group-name /aws/eks/boardguru/application \
     --start-time $(date -d "1 hour ago" +%s)000
   
   # Review audit trails
   kubectl logs -l app=audit-logger -n boardguru-production
   ```

3. **Recovery**
   ```bash
   # Rotate all secrets
   ./secrets/scripts/setup-secrets.sh rotate production
   
   # Force user re-authentication
   kubectl exec deployment/boardguru-app -n boardguru-production -- \
     redis-cli FLUSHDB
   ```

### Vulnerability Response

```bash
# 1. Immediate assessment
npm audit --audit-level high
snyk test --severity-threshold=high

# 2. Apply security patches
npm update
npm audit fix

# 3. Emergency deployment
gh workflow run ci-cd-pipeline.yml --field environment=production

# 4. Verify fix
npm audit --audit-level high
```

## Monitoring Alerts

### Critical Alerts (Immediate Response)

- Application Down (5xx errors > 50%)
- Database Connection Lost
- Security Breach Detected
- SSL Certificate Expiring (< 7 days)

### Warning Alerts (Response within 1 hour)

- High Response Time (> 2 seconds)
- High Error Rate (> 5%)
- High Memory Usage (> 85%)
- Disk Space Low (> 80%)

### Alert Response Scripts

```bash
# High error rate response
kubectl logs deployment/boardguru-app -n boardguru-production --tail=500 | \
  grep ERROR | tail -20

# High memory usage response
kubectl top pods -n boardguru-production --sort-by=memory
kubectl describe nodes | grep -A 5 "Non-terminated Pods"

# SSL certificate renewal
kubectl delete secret boardguru-tls-cert -n boardguru-production
# cert-manager will automatically renew
```

## Backup and Recovery

### Daily Backup Verification

```bash
# Check RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier boardguru-production \
  --snapshot-type automated

# Check S3 backup status
aws s3 ls s3://boardguru-production-backups/ --recursive \
  | tail -10

# Verify backup integrity
./deployment/scripts/verify-backup-integrity.sh production
```

### Recovery Testing

```bash
# Monthly recovery test (staging)
# 1. Create test restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier boardguru-test-restore \
  --db-snapshot-identifier boardguru-production-snapshot-latest

# 2. Test application connectivity
DATABASE_URL="postgresql://user:pass@test-restore-endpoint:5432/boardguru" \
  npm run test:integration

# 3. Clean up test resources
aws rds delete-db-instance \
  --db-instance-identifier boardguru-test-restore \
  --skip-final-snapshot
```

## Cost Optimization

### Weekly Cost Review

```bash
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE

# Check for cost anomalies
aws ce get-anomalies \
  --date-interval Start=$(date -d "7 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d)
```

### Optimization Actions

```bash
# Right-size EC2 instances based on utilization
kubectl top nodes
aws ec2 describe-instances --filters "Name=tag:Environment,Values=production"

# Clean up unused resources
# - Old EBS snapshots
# - Unused elastic IPs
# - Idle load balancers
```

## Compliance and Audit

### Monthly Compliance Report

```bash
# Generate compliance evidence
./deployment/scripts/generate-compliance-report.sh production

# Security scan results
gh run list --workflow="Security Monitoring & Compliance" --limit 10

# Access review
kubectl get rolebindings --all-namespaces -o wide
```

### Audit Trail Verification

```bash
# Check CloudTrail logs
aws logs filter-log-events \
  --log-group-name CloudTrail/BoardGuruAudit \
  --start-time $(date -d "24 hours ago" +%s)000

# Application audit logs
kubectl logs -l app=audit-logger -n boardguru-production --since=24h
```

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review**: $(date -d "+1 month")  
**Owner**: Platform Team