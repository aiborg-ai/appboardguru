# BoardGuru Infrastructure - Main Configuration

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    # Backend configuration will be provided via -backend-config
    # bucket = "boardguru-terraform-state"
    # key    = "boardguru/staging/terraform.tfstate"
    # region = "us-east-1"
    encrypt        = true
    dynamodb_table = "boardguru-terraform-locks"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "BoardGuru"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Platform Team"
      CostCenter  = "Engineering"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  account_id = data.aws_caller_identity.current.account_id
  azs        = slice(data.aws_availability_zones.available.names, 0, 3)
  
  common_tags = {
    Project     = "BoardGuru"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Repository  = "boardguru/appboardguru"
  }

  # Naming convention
  name_prefix = "boardguru-${var.environment}"
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix = local.name_prefix
  environment = var.environment
  
  vpc_cidr = var.vpc_cidr
  azs      = local.azs
  
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets
  
  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  # VPC Flow Logs
  enable_flow_log                      = true
  create_flow_log_cloudwatch_log_group = true
  create_flow_log_cloudwatch_iam_role  = true
  flow_log_max_aggregation_interval    = 60
  
  tags = local.common_tags
}

# EKS Cluster
module "eks" {
  source = "./modules/eks"

  name_prefix = local.name_prefix
  environment = var.environment
  
  cluster_version = var.cluster_version
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.public_subnets
  
  # OIDC Provider
  enable_irsa = true
  
  # Cluster logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  
  # Node groups
  node_groups = {
    main = {
      desired_size    = var.node_group_desired_size
      max_size        = var.node_group_max_size
      min_size        = var.node_group_min_size
      instance_types  = var.node_group_instance_types
      capacity_type   = "ON_DEMAND"
      
      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "main"
      }
      
      k8s_taints = []
      
      additional_tags = {
        "kubernetes.io/cluster/${local.name_prefix}-eks" = "owned"
      }
    }
    
    spot = {
      desired_size    = 1
      max_size        = 5
      min_size        = 0
      instance_types  = ["t3.medium", "t3a.medium", "t3.large"]
      capacity_type   = "SPOT"
      
      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "spot"
        WorkloadType = "batch"
      }
      
      k8s_taints = [{
        key    = "spot-instance"
        value  = "true"
        effect = "NO_SCHEDULE"
      }]
    }
  }
  
  # Cluster access
  cluster_endpoint_private_access = true
  cluster_endpoint_public_access  = true
  cluster_endpoint_public_access_cidrs = var.cluster_endpoint_public_access_cidrs
  
  tags = local.common_tags
}

# RDS Database
module "rds" {
  source = "./modules/rds"

  name_prefix = local.name_prefix
  environment = var.environment
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_encrypted     = true
  
  database_name = "boardguru"
  username      = "boardguru_admin"
  
  # Security
  allowed_security_groups = [module.eks.node_security_group_id]
  allowed_cidr_blocks     = module.vpc.private_subnets_cidr_blocks
  
  # Backup and maintenance
  backup_retention_period = var.db_backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  # Monitoring
  performance_insights_enabled = true
  monitoring_interval         = 60
  
  # High availability
  multi_az = var.environment == "production" ? true : false
  
  tags = local.common_tags
}

# S3 Buckets for file storage
module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  environment = var.environment
  
  # Application file storage
  create_app_bucket = true
  app_bucket_name   = "${local.name_prefix}-files"
  
  # Backup storage
  create_backup_bucket = true
  backup_bucket_name   = "${local.name_prefix}-backups"
  
  # Static assets (for CDN)
  create_static_bucket = true
  static_bucket_name   = "${local.name_prefix}-static"
  
  # Logs storage
  create_logs_bucket = true
  logs_bucket_name   = "${local.name_prefix}-logs"
  
  # Cross-region replication for production
  enable_cross_region_replication = var.environment == "production"
  replication_region = "us-west-2"
  
  tags = local.common_tags
}

# CloudFront CDN
module "cloudfront" {
  source = "./modules/cloudfront"

  name_prefix = local.name_prefix
  environment = var.environment
  
  # Origin configuration
  origin_domain_name = var.app_domain_name
  static_bucket_domain_name = module.s3.static_bucket_domain_name
  
  # Domain configuration
  domain_name = var.app_domain_name
  alternate_domain_names = var.alternate_domain_names
  
  # SSL certificate
  acm_certificate_arn = var.acm_certificate_arn
  
  # WAF
  web_acl_id = module.waf.web_acl_id
  
  tags = local.common_tags
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"

  name_prefix = local.name_prefix
  environment = var.environment
  
  # Service accounts
  cluster_oidc_issuer_url = module.eks.cluster_oidc_issuer_url
  
  # Application roles
  create_app_role = true
  app_role_policies = [
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
  ]
  
  # Database access
  create_db_role = true
  db_instance_resource_id = module.rds.db_instance_resource_id
  
  tags = local.common_tags
}

# WAF for application protection
resource "aws_wafv2_web_acl" "boardguru" {
  name  = "${local.name_prefix}-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }

    action {
      block {}
    }
  }

  # AWS Managed Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  tags = local.common_tags
}

# Monitoring and Observability
module "monitoring" {
  source = "./modules/monitoring"

  name_prefix = local.name_prefix
  environment = var.environment
  
  # CloudWatch configuration
  log_retention_in_days = var.log_retention_in_days
  
  # SNS topics for alerts
  create_sns_topics = true
  alert_email = var.alert_email
  
  # Dashboard creation
  create_dashboards = true
  
  tags = local.common_tags
}

# Parameter Store for configuration
resource "aws_ssm_parameter" "app_config" {
  for_each = {
    "/boardguru/${var.environment}/database/url" = module.rds.database_url
    "/boardguru/${var.environment}/s3/bucket" = module.s3.app_bucket_id
    "/boardguru/${var.environment}/cloudfront/distribution_id" = module.cloudfront.distribution_id
  }

  name  = each.key
  type  = "SecureString"
  value = each.value

  tags = local.common_tags
}