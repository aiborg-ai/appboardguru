# Outputs for BoardGuru Infrastructure

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr_block
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "nat_gateway_ips" {
  description = "List of public Elastic IPs created for AWS NAT Gateway"
  value       = module.vpc.nat_public_ips
}

# EKS Outputs
output "cluster_id" {
  description = "The name/id of the EKS cluster"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "The Amazon Resource Name (ARN) of the cluster"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for your Kubernetes API server"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_oidc_issuer_url" {
  description = "The URL on the EKS cluster for the OpenID Connect identity provider"
  value       = module.eks.cluster_oidc_issuer_url
}

output "cluster_ca_certificate" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "node_groups" {
  description = "Outputs from EKS node groups"
  value       = module.eks.node_groups
}

# RDS Outputs
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_instance_port
}

output "database_name" {
  description = "Name of the database"
  value       = module.rds.db_instance_name
}

output "database_url" {
  description = "Database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

# S3 Outputs
output "s3_app_bucket_id" {
  description = "Name of the application S3 bucket"
  value       = module.s3.app_bucket_id
}

output "s3_app_bucket_arn" {
  description = "ARN of the application S3 bucket"
  value       = module.s3.app_bucket_arn
}

output "s3_static_bucket_id" {
  description = "Name of the static assets S3 bucket"
  value       = module.s3.static_bucket_id
}

output "s3_backup_bucket_id" {
  description = "Name of the backup S3 bucket"
  value       = module.s3.backup_bucket_id
}

# CloudFront Outputs
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = module.cloudfront.distribution_id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cloudfront.distribution_arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.distribution_domain_name
}

output "app_url" {
  description = "Application URL"
  value       = var.app_domain_name != "" ? "https://${var.app_domain_name}" : "https://${module.cloudfront.distribution_domain_name}"
}

# IAM Outputs
output "app_role_arn" {
  description = "ARN of the application IAM role"
  value       = module.iam.app_role_arn
}

output "app_role_name" {
  description = "Name of the application IAM role"
  value       = module.iam.app_role_name
}

# Monitoring Outputs
output "cloudwatch_log_groups" {
  description = "CloudWatch log groups created"
  value       = module.monitoring.log_groups
}

output "sns_topic_arns" {
  description = "SNS topic ARNs for alerts"
  value       = module.monitoring.sns_topic_arns
}

# Security Outputs
output "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  value       = aws_wafv2_web_acl.boardguru.id
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.boardguru.arn
}

# Connection Information
output "kubectl_config_command" {
  description = "Command to configure kubectl"
  value       = "aws eks --region ${var.region} update-kubeconfig --name ${module.eks.cluster_id}"
}

output "database_connection_info" {
  description = "Database connection information"
  value = {
    host     = module.rds.db_instance_address
    port     = module.rds.db_instance_port
    database = module.rds.db_instance_name
    username = module.rds.db_instance_username
  }
  sensitive = true
}

# Environment Information
output "environment_info" {
  description = "Environment configuration summary"
  value = {
    environment     = var.environment
    region          = var.region
    cluster_version = var.cluster_version
    node_count      = var.node_group_desired_size
    db_instance     = var.db_instance_class
    created_at      = timestamp()
  }
}

# Resource Costs (estimated)
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    eks_cluster = "~$73"
    eks_nodes   = "~${var.node_group_desired_size * 25}"
    rds         = var.db_instance_class == "db.t3.micro" ? "~$15" : "~$50+"
    s3_storage  = "~$10"
    cloudfront  = "~$5"
    total_estimate = "~$${73 + (var.node_group_desired_size * 25) + (var.db_instance_class == "db.t3.micro" ? 15 : 50) + 15}"
  }
}

# Security Configuration Summary
output "security_configuration" {
  description = "Security configuration summary"
  value = {
    vpc_flow_logs_enabled = var.enable_vpc_flow_logs
    waf_enabled          = var.enable_waf
    security_hub_enabled = var.enable_security_hub
    guardduty_enabled    = var.enable_guardduty
    config_enabled       = var.enable_config
    ssl_certificate      = var.acm_certificate_arn != "" ? "Custom Certificate" : "CloudFront Default"
  }
}

# Compliance Information
output "compliance_status" {
  description = "Compliance and governance configuration"
  value = {
    cloudtrail_enabled           = var.enable_cloudtrail
    cost_anomaly_detection      = var.enable_cost_anomaly_detection
    backup_enabled              = var.enable_backup
    cross_region_backup         = var.enable_cross_region_backup
    encryption_at_rest          = "Enabled"
    encryption_in_transit       = "Enabled"
    multi_az_database          = var.environment == "production" ? true : false
  }
}

# Terraform State Information
output "terraform_state_info" {
  description = "Terraform state configuration"
  value = {
    backend_bucket = "boardguru-terraform-state"
    state_key      = "boardguru/${var.environment}/terraform.tfstate"
    lock_table     = "boardguru-terraform-locks"
    region         = var.region
  }
}