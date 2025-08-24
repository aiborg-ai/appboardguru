# BoardGuru Deployment Guide

This comprehensive guide covers the deployment and operation of BoardGuru's enterprise board management platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Application Deployment](#application-deployment)
5. [Monitoring & Observability](#monitoring--observability)
6. [Security Configuration](#security-configuration)
7. [Disaster Recovery](#disaster-recovery)
8. [Troubleshooting](#troubleshooting)
9. [Runbooks](#runbooks)

## Overview

BoardGuru uses a modern, cloud-native deployment architecture:

- **Infrastructure**: AWS EKS, RDS PostgreSQL, ElastiCache Redis
- **Container Orchestration**: Kubernetes with Helm
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Monitoring**: Prometheus, Grafana, CloudWatch
- **Security**: WAF, Security Hub, GuardDuty, encrypted secrets

### Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │    Route 53      │    │      WAF        │
│      (CDN)      │    │     (DNS)        │    │  (Protection)   │
└─────────┬───────┘    └────────┬─────────┘    └─────────┬───────┘
          │                     │                       │
          └─────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    Application LB      │
                    │      (ALB/NLB)        │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │      EKS Cluster       │
                    │   ┌─────────────────┐  │
                    │   │  BoardGuru App  │  │
                    │   │   (3 replicas)  │  │
                    │   └─────────────────┘  │
                    └───────────┬────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
  ┌─────────▼────────┐ ┌────────▼────────┐ ┌───────▼────────┐
  │   RDS PostgreSQL │ │  ElastiCache    │ │      S3        │
  │  (Multi-AZ/RO)   │ │    (Redis)      │ │   (Storage)    │
  └──────────────────┘ └─────────────────┘ └────────────────┘
```

## Prerequisites

### Required Tools

```bash
# Core tools
brew install kubectl
brew install terraform
brew install helm
brew install awscli

# Optional but recommended
brew install k9s          # Kubernetes dashboard
brew install kubectx      # Context switching
brew install jq           # JSON processing
```

### AWS Configuration

```bash
# Configure AWS CLI
aws configure

# Verify access
aws sts get-caller-identity
```

### Environment Setup

```bash
# Clone repository
git clone https://github.com/boardguru/appboardguru.git
cd appboardguru

# Set up environment variables
export ENVIRONMENT=staging  # or production
export AWS_REGION=us-east-1
```

## Infrastructure Setup

### 1. Terraform Backend Preparation

```bash
# Create S3 bucket for Terraform state
aws s3 mb s3://boardguru-terraform-state-${AWS_REGION}

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name boardguru-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

### 2. Deploy Infrastructure

```bash
cd infrastructure

# Initialize Terraform
terraform init \
  -backend-config="bucket=boardguru-terraform-state-${AWS_REGION}" \
  -backend-config="key=boardguru/${ENVIRONMENT}/terraform.tfstate" \
  -backend-config="region=${AWS_REGION}"

# Plan deployment
terraform plan -var-file="environments/${ENVIRONMENT}/terraform.tfvars"

# Apply infrastructure
terraform apply -var-file="environments/${ENVIRONMENT}/terraform.tfvars"

# Save outputs
terraform output > ../deployment/terraform-outputs.txt
```

### 3. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region ${AWS_REGION} \
  --name boardguru-${ENVIRONMENT}-eks

# Verify connection
kubectl cluster-info
kubectl get nodes
```

## Application Deployment

### 1. Build and Push Container Image

```bash
# Build with GitHub Actions (recommended)
# Push to main/develop branch triggers automatic build

# Or build locally
docker build -t boardguru:latest .
docker tag boardguru:latest ghcr.io/boardguru/appboardguru:latest
docker push ghcr.io/boardguru/appboardguru:latest
```

### 2. Secrets Management

```bash
# Generate secrets from templates
./secrets/scripts/setup-secrets.sh generate ${ENVIRONMENT}

# Edit secrets file with actual values
vi secrets/${ENVIRONMENT}-secrets.env

# Create Kubernetes secrets
./secrets/scripts/setup-secrets.sh create ${ENVIRONMENT}

# Validate secrets
./secrets/scripts/setup-secrets.sh validate ${ENVIRONMENT}
```

### 3. Deploy to Kubernetes

```bash
# Create namespaces
kubectl apply -f k8s/namespace.yaml

# Deploy ConfigMaps
kubectl apply -f k8s/configmaps/ -n boardguru-${ENVIRONMENT}

# Deploy application
kubectl apply -f k8s/app/ -n boardguru-${ENVIRONMENT}

# Deploy ingress
kubectl apply -f k8s/ingress/ -n boardguru-${ENVIRONMENT}

# Wait for deployment
kubectl rollout status deployment/boardguru-app -n boardguru-${ENVIRONMENT}
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n boardguru-${ENVIRONMENT}

# Check services
kubectl get svc -n boardguru-${ENVIRONMENT}

# Check ingress
kubectl get ingress -n boardguru-${ENVIRONMENT}

# Health check
curl -f https://${ENVIRONMENT}.boardguru.ai/api/health
```

## Monitoring & Observability

### 1. Install Monitoring Stack

```bash
# Add Helm repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values k8s/monitoring/prometheus-values.yaml

# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --values k8s/monitoring/grafana-values.yaml
```

### 2. Configure Dashboards

```bash
# Import BoardGuru dashboards
kubectl apply -f k8s/monitoring/dashboards/ -n monitoring

# Get Grafana admin password
kubectl get secret --namespace monitoring grafana \
  -o jsonpath="{.data.admin-password}" | base64 --decode
```

### 3. Set Up Alerts

```bash
# Configure alert rules
kubectl apply -f k8s/monitoring/alerts/ -n monitoring

# Test alert notifications
kubectl create job test-alert --image=curlimages/curl \
  -- curl -X POST http://alertmanager:9093/api/v1/alerts
```

## Security Configuration

### 1. SSL/TLS Certificates

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Configure Let's Encrypt issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: hirendra.vikram@boardguru.ai
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 2. Network Policies

```bash
# Apply network policies
kubectl apply -f k8s/security/network-policies/ -n boardguru-${ENVIRONMENT}

# Verify policies
kubectl get networkpolicy -n boardguru-${ENVIRONMENT}
```

### 3. RBAC Configuration

```bash
# Create service accounts
kubectl apply -f k8s/security/rbac/ -n boardguru-${ENVIRONMENT}

# Verify RBAC
kubectl auth can-i get pods --as=system:serviceaccount:boardguru-production:boardguru-app
```

## Disaster Recovery

### 1. Database Backups

```bash
# Manual backup
kubectl run postgres-backup --rm -it --restart=Never \
  --image=postgres:15 \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} > backup.sql

# Restore from backup
kubectl run postgres-restore --rm -it --restart=Never \
  --image=postgres:15 \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} < backup.sql
```

### 2. Application State Backup

```bash
# Backup secrets
./secrets/scripts/setup-secrets.sh backup ${ENVIRONMENT}

# Backup configurations
kubectl get configmap -n boardguru-${ENVIRONMENT} -o yaml > config-backup.yaml
```

### 3. Cross-Region Replication

For production environments, the Terraform configuration automatically sets up:
- RDS read replicas in secondary regions
- S3 cross-region replication
- CloudWatch log replication

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues

```bash
# Check pod logs
kubectl logs -f deployment/boardguru-app -n boardguru-${ENVIRONMENT}

# Describe pod for events
kubectl describe pod -l app=boardguru -n boardguru-${ENVIRONMENT}

# Check resource constraints
kubectl top pods -n boardguru-${ENVIRONMENT}
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl run db-test --rm -it --restart=Never \
  --image=postgres:15 \
  --env="PGPASSWORD=${DB_PASSWORD}" \
  -- psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;"

# Check RDS security groups
aws rds describe-db-instances \
  --db-instance-identifier boardguru-${ENVIRONMENT}
```

#### 3. SSL/Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n boardguru-${ENVIRONMENT}

# Describe certificate for details
kubectl describe certificate boardguru-tls-cert -n boardguru-${ENVIRONMENT}

# Force certificate renewal
kubectl delete secret boardguru-tls-cert -n boardguru-${ENVIRONMENT}
```

#### 4. Performance Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n boardguru-${ENVIRONMENT}

# Scale deployment if needed
kubectl scale deployment boardguru-app --replicas=5 -n boardguru-${ENVIRONMENT}

# Check HPA status
kubectl get hpa -n boardguru-${ENVIRONMENT}
```

## Runbooks

### Daily Operations

#### Morning Health Check
1. Check application status: `kubectl get pods -n boardguru-production`
2. Verify ingress: `curl -f https://boardguru.ai/api/health`
3. Review overnight alerts in Grafana
4. Check error rates and response times
5. Verify backup completion status

#### Weekly Maintenance
1. Review and apply security updates
2. Check storage usage and clean up old logs
3. Review and rotate access keys if needed
4. Update documentation with any changes
5. Test disaster recovery procedures

### Emergency Procedures

#### Application Outage Response

1. **Immediate Assessment** (0-5 minutes)
   ```bash
   # Check pod status
   kubectl get pods -n boardguru-production
   
   # Check recent deployments
   kubectl rollout history deployment/boardguru-app -n boardguru-production
   
   # Check system events
   kubectl get events -n boardguru-production --sort-by='.lastTimestamp'
   ```

2. **Quick Fixes** (5-15 minutes)
   ```bash
   # Restart deployment if needed
   kubectl rollout restart deployment/boardguru-app -n boardguru-production
   
   # Scale up replicas
   kubectl scale deployment boardguru-app --replicas=5 -n boardguru-production
   
   # Check load balancer health
   kubectl get ingress -n boardguru-production
   ```

3. **Rollback if Necessary** (15-30 minutes)
   ```bash
   # Use blue-green deployment script
   ./deployment/scripts/blue-green-deploy.sh rollback
   
   # Or kubectl rollback
   kubectl rollout undo deployment/boardguru-app -n boardguru-production
   ```

#### Database Emergency Response

1. **Connection Issues**
   ```bash
   # Check RDS status
   aws rds describe-db-instances --db-instance-identifier boardguru-production
   
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-xxxxxx
   
   # Test connectivity from pod
   kubectl run db-test --rm -it --restart=Never \
     --image=postgres:15 -- psql -h ${DB_HOST} -c "SELECT 1;"
   ```

2. **Performance Issues**
   ```bash
   # Enable read replica traffic
   kubectl patch configmap boardguru-config -n boardguru-production \
     --patch '{"data":{"use_read_replica":"true"}}'
   
   # Check slow queries
   kubectl logs -f deployment/boardguru-app -n boardguru-production | grep "slow query"
   ```

3. **Data Recovery**
   ```bash
   # List available snapshots
   aws rds describe-db-snapshots --db-instance-identifier boardguru-production
   
   # Point-in-time recovery (if needed)
   aws rds restore-db-instance-to-point-in-time \
     --target-db-instance-identifier boardguru-production-recovery \
     --source-db-instance-identifier boardguru-production \
     --restore-time 2024-01-01T10:00:00.000Z
   ```

### Deployment Strategies

#### Blue-Green Deployment

```bash
# Deploy new version to inactive environment
./deployment/scripts/blue-green-deploy.sh deploy v1.2.3

# Check status
./deployment/scripts/blue-green-deploy.sh status

# Manual rollback if needed
./deployment/scripts/blue-green-deploy.sh rollback
```

#### Canary Deployment

```bash
# Start canary deployment
./deployment/scripts/canary-deploy.sh deploy v1.2.3

# Monitor metrics and promote if successful
./deployment/scripts/canary-deploy.sh status

# Rollback if issues detected
./deployment/scripts/canary-deploy.sh rollback
```

### Maintenance Windows

#### Scheduled Maintenance Template

1. **Pre-maintenance** (30 minutes before)
   - Notify users via status page
   - Disable automated deployments
   - Scale up redundancy
   - Take final backups

2. **During Maintenance**
   - Apply updates using deployment scripts
   - Monitor health checks continuously
   - Keep stakeholders updated on progress

3. **Post-maintenance** (30 minutes after)
   - Verify all systems operational
   - Re-enable automated deployments
   - Update status page
   - Document any issues encountered

### Contact Information

- **Platform Team**: hirendra.vikram@boardguru.ai
- **On-call Rotation**: Use PagerDuty escalation
- **Emergency Hotline**: [Emergency contact number]
- **Status Page**: https://status.boardguru.ai

### Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [BoardGuru Architecture Documentation](./TECHNICAL_ARCHITECTURE.md)

---

**Last Updated**: $(date)  
**Version**: 1.0  
**Next Review**: $(date -d "+3 months")