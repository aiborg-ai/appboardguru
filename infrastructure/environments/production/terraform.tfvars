# Production Environment Configuration for BoardGuru

environment = "production"
region      = "us-east-1"

# VPC Configuration
vpc_cidr        = "10.0.0.0/16"
private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# EKS Configuration
cluster_version                      = "1.28"
node_group_desired_size             = 3
node_group_max_size                 = 10
node_group_min_size                 = 2
node_group_instance_types           = ["t3.large", "t3.xlarge"]
cluster_endpoint_public_access_cidrs = [
  # Add your office/admin IPs here for better security
  # "203.0.113.0/24",  # Example office IP range
  "0.0.0.0/0"  # Consider restricting this
]

# RDS Configuration - Production specifications
db_instance_class           = "db.t3.small"
db_allocated_storage        = 100
db_max_allocated_storage    = 1000
db_backup_retention_period  = 30  # Extended backup retention for production

# Domain Configuration
app_domain_name        = "boardguru.ai"
alternate_domain_names = [
  "www.boardguru.ai",
  "api.boardguru.ai",
  "app.boardguru.ai"
]
# acm_certificate_arn    = "arn:aws:acm:us-east-1:123456789012:certificate/production-cert-id"

# Monitoring Configuration - Extended for production
log_retention_in_days = 90
alert_email          = "hirendra.vikram@boardguru.ai"

# Feature Flags - All enabled for production
enable_monitoring               = true
enable_backup                  = true
enable_waf                     = true
enable_cloudtrail              = true
enable_cost_anomaly_detection  = true
enable_security_hub            = true
enable_guardduty               = true
enable_config                  = true

# Cost Management - Higher budget for production
cost_budget_limit = 1000

# Environment-specific Configuration
environment_config = {
  node_group_desired_size = 3
  node_group_max_size     = 10
  db_instance_class       = "db.t3.small"
  enable_multi_az         = true   # High availability for production
  backup_retention_days   = 30
}

# Application Configuration
app_config = {
  max_file_size      = "100MB"  # Higher limit for production
  session_timeout    = 86400
  enable_ai_features = true
  enable_voice_input = true
}

# Security Configuration - More restrictive for production
allowed_cidr_blocks  = ["0.0.0.0/0"]  # Consider restricting to known IP ranges
enable_vpc_flow_logs = true

# Disaster Recovery - Full configuration for production
enable_cross_region_backup = true
backup_region             = "us-west-2"

# Additional Tags
additional_tags = {
  CostCenter       = "Engineering"
  Team            = "Platform"
  Purpose         = "Production"
  DataClass       = "Confidential"
  Backup          = "Critical"
  Monitoring      = "Enhanced"
  Compliance      = "SOC2"
  BusinessUnit    = "BoardGuru"
  SLA             = "99.9%"
  DisasterRecovery = "Enabled"
  SecurityLevel   = "High"
}