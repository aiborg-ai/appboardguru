# Staging Environment Configuration for BoardGuru

environment = "staging"
region      = "us-east-1"

# VPC Configuration
vpc_cidr        = "10.1.0.0/16"
private_subnets = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
public_subnets  = ["10.1.101.0/24", "10.1.102.0/24", "10.1.103.0/24"]

# EKS Configuration
cluster_version                      = "1.28"
node_group_desired_size             = 2
node_group_max_size                 = 5
node_group_min_size                 = 1
node_group_instance_types           = ["t3.medium"]
cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]  # Consider restricting in production

# RDS Configuration
db_instance_class           = "db.t3.micro"
db_allocated_storage        = 20
db_max_allocated_storage    = 100
db_backup_retention_period  = 7

# Domain Configuration
app_domain_name        = "staging.boardguru.ai"
alternate_domain_names = ["staging-api.boardguru.ai"]
# acm_certificate_arn    = "arn:aws:acm:us-east-1:123456789012:certificate/your-cert-id"

# Monitoring Configuration
log_retention_in_days = 14
alert_email          = "hirendra.vikram@boardguru.ai"

# Feature Flags - Staging
enable_monitoring               = true
enable_backup                  = true
enable_waf                     = true
enable_cloudtrail              = true
enable_cost_anomaly_detection  = false  # Disabled in staging to reduce costs
enable_security_hub            = false  # Disabled in staging to reduce costs
enable_guardduty               = false  # Disabled in staging to reduce costs
enable_config                  = false  # Disabled in staging to reduce costs

# Cost Management
cost_budget_limit = 200  # Lower budget for staging

# Environment-specific Configuration
environment_config = {
  node_group_desired_size = 2
  node_group_max_size     = 5
  db_instance_class       = "db.t3.micro"
  enable_multi_az         = false
  backup_retention_days   = 7
}

# Application Configuration
app_config = {
  max_file_size      = "50MB"
  session_timeout    = 86400
  enable_ai_features = true
  enable_voice_input = true
}

# Security Configuration
allowed_cidr_blocks    = ["0.0.0.0/0"]  # More permissive for staging testing
enable_vpc_flow_logs   = true

# Disaster Recovery - Minimal for staging
enable_cross_region_backup = false
backup_region             = "us-west-2"

# Additional Tags
additional_tags = {
  CostCenter     = "Engineering"
  Team           = "Platform"
  Purpose        = "Staging"
  DataClass      = "Internal"
  Backup         = "Standard"
  Monitoring     = "Basic"
}