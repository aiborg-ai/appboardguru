#!/bin/bash

# Secrets Management Script for BoardGuru
# This script helps manage secrets across different environments

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SECRETS_DIR="${PROJECT_ROOT}/secrets"
K8S_DIR="${PROJECT_ROOT}/k8s"

# Default values
ENVIRONMENT="${ENVIRONMENT:-staging}"
NAMESPACE="${NAMESPACE:-boardguru-${ENVIRONMENT}}"
DRY_RUN="${DRY_RUN:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    local missing_tools=()

    if ! command -v kubectl &> /dev/null; then
        missing_tools+=("kubectl")
    fi

    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    fi

    if ! command -v base64 &> /dev/null; then
        missing_tools+=("base64")
    fi

    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install these tools before running the script"
        exit 1
    fi

    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi

    log_info "Prerequisites check passed"
}

# Function to generate secure random string
generate_secure_string() {
    local length=${1:-32}
    openssl rand -base64 $((length * 3 / 4)) | tr -d '/+' | head -c ${length}
}

# Function to generate secrets file from template
generate_secrets_file() {
    local env=$1
    local template_file="${SECRETS_DIR}/templates/${env}-secrets.env.example"
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"

    if [[ ! -f "$template_file" ]]; then
        log_error "Template file not found: $template_file"
        return 1
    fi

    if [[ -f "$secrets_file" ]]; then
        log_warning "Secrets file already exists: $secrets_file"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping secrets file generation"
            return 0
        fi
    fi

    log_info "Generating secrets file: $secrets_file"

    # Copy template and replace placeholders with generated values
    cp "$template_file" "$secrets_file"

    # Generate and replace common secrets
    local nextauth_secret=$(generate_secure_string 64)
    local jwt_secret=$(generate_secure_string 32)
    local session_secret=$(generate_secure_string 32)
    local encryption_key=$(generate_secure_string 32)

    # Use different approach based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-nextauth-secret-key-minimum-32-characters/${nextauth_secret}/g" "$secrets_file"
        sed -i '' "s/your-jwt-secret-key/${jwt_secret}/g" "$secrets_file"
        sed -i '' "s/your-session-secret-key/${session_secret}/g" "$secrets_file"
        sed -i '' "s/your-32-character-encryption-key/${encryption_key}/g" "$secrets_file"
    else
        # Linux
        sed -i "s/your-nextauth-secret-key-minimum-32-characters/${nextauth_secret}/g" "$secrets_file"
        sed -i "s/your-jwt-secret-key/${jwt_secret}/g" "$secrets_file"
        sed -i "s/your-session-secret-key/${session_secret}/g" "$secrets_file"
        sed -i "s/your-32-character-encryption-key/${encryption_key}/g" "$secrets_file"
    fi

    log_success "Secrets file generated: $secrets_file"
    log_warning "IMPORTANT: Please edit the file and replace placeholder values with actual secrets"
    log_warning "DO NOT commit this file to version control"
}

# Function to create Kubernetes secret from env file
create_k8s_secret() {
    local env=$1
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"
    local secret_name="boardguru-secrets"
    local namespace="boardguru-${env}"

    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        log_info "Run './setup-secrets.sh generate $env' first"
        return 1
    fi

    log_info "Creating Kubernetes secret from: $secrets_file"

    # Create namespace if it doesn't exist
    if ! kubectl get namespace "$namespace" &> /dev/null; then
        log_info "Creating namespace: $namespace"
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY RUN] Would create namespace: $namespace"
        else
            kubectl create namespace "$namespace"
        fi
    fi

    # Convert env file to Kubernetes secret
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would create secret: $secret_name in namespace: $namespace"
        log_info "[DRY RUN] Secret would contain:"
        grep -v '^#\|^$' "$secrets_file" | cut -d'=' -f1 | sed 's/^/  - /'
    else
        # Delete existing secret if it exists
        kubectl delete secret "$secret_name" -n "$namespace" --ignore-not-found=true

        # Create new secret from env file
        kubectl create secret generic "$secret_name" \
            --from-env-file="$secrets_file" \
            -n "$namespace"

        log_success "Kubernetes secret created: $secret_name in namespace: $namespace"
    fi
}

# Function to update existing Kubernetes secret
update_k8s_secret() {
    local env=$1
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"
    local secret_name="boardguru-secrets"
    local namespace="boardguru-${env}"

    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        return 1
    fi

    log_info "Updating Kubernetes secret: $secret_name"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would update secret: $secret_name in namespace: $namespace"
    else
        # Apply the secret (create or update)
        kubectl create secret generic "$secret_name" \
            --from-env-file="$secrets_file" \
            -n "$namespace" \
            --dry-run=client -o yaml | kubectl apply -f -

        log_success "Kubernetes secret updated: $secret_name"
    fi
}

# Function to backup secrets
backup_secrets() {
    local env=$1
    local backup_dir="${SECRETS_DIR}/backups"
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="${backup_dir}/${env}-secrets-${timestamp}.env.enc"

    mkdir -p "$backup_dir"

    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"
    
    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        return 1
    fi

    log_info "Creating encrypted backup: $backup_file"

    # Encrypt the secrets file
    openssl enc -aes-256-cbc -salt -in "$secrets_file" -out "$backup_file" -k "$(whoami)-$(date +%Y%m%d)"

    log_success "Encrypted backup created: $backup_file"
    log_info "Backup password: $(whoami)-$(date +%Y%m%d)"
}

# Function to restore secrets from backup
restore_secrets() {
    local backup_file=$1
    local env=$2
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"

    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    log_info "Restoring secrets from backup: $backup_file"

    # Decrypt the backup file
    if openssl enc -aes-256-cbc -d -in "$backup_file" -out "$secrets_file"; then
        log_success "Secrets restored from backup: $secrets_file"
    else
        log_error "Failed to decrypt backup file"
        return 1
    fi
}

# Function to validate secrets file
validate_secrets() {
    local env=$1
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"

    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        return 1
    fi

    log_info "Validating secrets file: $secrets_file"

    local errors=0

    # Check for placeholder values
    if grep -q "your-.*-key\|your-.*-secret\|your-.*-password" "$secrets_file"; then
        log_warning "Found placeholder values in secrets file:"
        grep "your-.*-key\|your-.*-secret\|your-.*-password" "$secrets_file" | head -5
        ((errors++))
    fi

    # Check for required secrets based on environment
    local required_secrets=(
        "DATABASE_URL"
        "NEXTAUTH_SECRET"
        "SUPABASE_SERVICE_ROLE_KEY"
    )

    for secret in "${required_secrets[@]}"; do
        if ! grep -q "^${secret}=" "$secrets_file"; then
            log_error "Required secret missing: $secret"
            ((errors++))
        fi
    done

    # Check secret strength
    local nextauth_secret=$(grep "^NEXTAUTH_SECRET=" "$secrets_file" | cut -d'=' -f2 | tr -d '"')
    if [[ ${#nextauth_secret} -lt 32 ]]; then
        log_error "NEXTAUTH_SECRET is too short (minimum 32 characters)"
        ((errors++))
    fi

    if [[ $errors -eq 0 ]]; then
        log_success "Secrets validation passed"
        return 0
    else
        log_error "Secrets validation failed with $errors errors"
        return 1
    fi
}

# Function to rotate secrets
rotate_secrets() {
    local env=$1
    local secrets_to_rotate=("NEXTAUTH_SECRET" "JWT_SECRET" "SESSION_SECRET" "ENCRYPTION_KEY")
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"

    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        return 1
    fi

    log_info "Rotating secrets for environment: $env"

    # Backup current secrets first
    backup_secrets "$env"

    # Rotate specified secrets
    for secret_name in "${secrets_to_rotate[@]}"; do
        local new_value=$(generate_secure_string 32)
        log_info "Rotating secret: $secret_name"
        
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^${secret_name}=.*/${secret_name}=\"${new_value}\"/" "$secrets_file"
        else
            sed -i "s/^${secret_name}=.*/${secret_name}=\"${new_value}\"/" "$secrets_file"
        fi
    done

    log_success "Secrets rotated successfully"
    log_warning "Don't forget to update the Kubernetes secret and restart applications"
}

# Function to sync secrets with AWS Secrets Manager
sync_aws_secrets() {
    local env=$1
    local secrets_file="${SECRETS_DIR}/${env}-secrets.env"
    local secret_name="boardguru/${env}/application"

    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        return 1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI first."
        return 1
    fi

    log_info "Syncing secrets with AWS Secrets Manager: $secret_name"

    # Convert env file to JSON
    local json_secrets=$(cat "$secrets_file" | grep -v '^#\|^$' | jq -R 'split("=") | {(.[0]): (.[1:] | join("="))}' | jq -s 'add')

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] Would sync secrets to AWS Secrets Manager: $secret_name"
    else
        # Check if secret exists
        if aws secretsmanager describe-secret --secret-id "$secret_name" &> /dev/null; then
            # Update existing secret
            aws secretsmanager update-secret \
                --secret-id "$secret_name" \
                --secret-string "$json_secrets"
            log_success "AWS Secrets Manager secret updated: $secret_name"
        else
            # Create new secret
            aws secretsmanager create-secret \
                --name "$secret_name" \
                --description "BoardGuru ${env} application secrets" \
                --secret-string "$json_secrets"
            log_success "AWS Secrets Manager secret created: $secret_name"
        fi
    fi
}

# Function to show help
show_help() {
    cat << EOF
Secrets Management Script for BoardGuru

Usage: $0 [COMMAND] [ENVIRONMENT] [OPTIONS]

Commands:
    generate <env>          Generate secrets file from template
    create <env>           Create Kubernetes secret from env file
    update <env>           Update existing Kubernetes secret
    backup <env>           Create encrypted backup of secrets
    restore <backup> <env> Restore secrets from encrypted backup
    validate <env>         Validate secrets file
    rotate <env>           Rotate sensitive secrets
    sync-aws <env>         Sync secrets with AWS Secrets Manager
    list                   List available secrets files
    help                   Show this help message

Environments:
    staging                Staging environment
    production             Production environment

Options:
    --dry-run              Show what would be done without making changes
    --namespace <name>     Override default namespace

Environment Variables:
    ENVIRONMENT            Default environment (default: staging)
    NAMESPACE              Kubernetes namespace override
    DRY_RUN                Enable dry run mode (true/false)

Examples:
    $0 generate staging
    $0 create production --dry-run
    $0 update staging
    $0 backup production
    $0 validate staging
    $0 rotate production --dry-run
    $0 sync-aws production

Security Notes:
    - Never commit actual secrets files to version control
    - Use strong, unique passwords for each environment
    - Regularly rotate secrets, especially after team changes
    - Monitor secret access and usage
    - Use AWS Secrets Manager for production environments

EOF
}

# Function to list secrets files
list_secrets() {
    echo "Available secrets files:"
    
    if [[ -d "$SECRETS_DIR" ]]; then
        find "$SECRETS_DIR" -name "*.env" -type f | while read -r file; do
            local basename=$(basename "$file")
            local size=$(du -h "$file" | cut -f1)
            local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d' ' -f1-2)
            echo "  - $basename ($size, modified: $modified)"
        done
    else
        echo "  No secrets directory found"
    fi
    
    echo ""
    echo "Available templates:"
    if [[ -d "$SECRETS_DIR/templates" ]]; then
        find "$SECRETS_DIR/templates" -name "*.example" -type f | while read -r file; do
            local basename=$(basename "$file")
            echo "  - $basename"
        done
    else
        echo "  No templates directory found"
    fi
}

# Main script logic
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --help|-h|help)
                show_help
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done

    # Check prerequisites
    check_prerequisites

    case "${1:-help}" in
        generate)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for generate command"
                show_help
                exit 1
            fi
            generate_secrets_file "$2"
            ;;
        create)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for create command"
                exit 1
            fi
            create_k8s_secret "$2"
            ;;
        update)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for update command"
                exit 1
            fi
            update_k8s_secret "$2"
            ;;
        backup)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for backup command"
                exit 1
            fi
            backup_secrets "$2"
            ;;
        restore)
            if [[ -z "${2:-}" || -z "${3:-}" ]]; then
                log_error "Backup file and environment are required for restore command"
                exit 1
            fi
            restore_secrets "$2" "$3"
            ;;
        validate)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for validate command"
                exit 1
            fi
            validate_secrets "$2"
            ;;
        rotate)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for rotate command"
                exit 1
            fi
            rotate_secrets "$2"
            ;;
        sync-aws)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment is required for sync-aws command"
                exit 1
            fi
            sync_aws_secrets "$2"
            ;;
        list)
            list_secrets
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: ${1:-}"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"