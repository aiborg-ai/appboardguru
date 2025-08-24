#!/bin/bash

# Blue-Green Deployment Script for BoardGuru
# This script manages blue-green deployments in Kubernetes

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-boardguru-production}"
APP_NAME="boardguru-app"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HEALTH_CHECK_TIMEOUT=300
ROLLBACK_TIMEOUT=60

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

# Function to check if kubectl is available and configured
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi

    log_info "kubectl is configured and cluster is accessible"
}

# Function to get current active environment (blue or green)
get_active_environment() {
    local selector=$(kubectl get service ${APP_NAME}-service -n ${NAMESPACE} -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "")
    
    if [[ "$selector" == "blue" ]]; then
        echo "blue"
    elif [[ "$selector" == "green" ]]; then
        echo "green"
    else
        log_warning "No active environment found, defaulting to blue"
        echo "blue"
    fi
}

# Function to get inactive environment
get_inactive_environment() {
    local active=$(get_active_environment)
    if [[ "$active" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to update deployment image
update_deployment_image() {
    local env=$1
    local image_tag=$2
    
    log_info "Updating ${env} deployment with image tag: ${image_tag}"
    
    kubectl patch deployment ${APP_NAME}-${env} -n ${NAMESPACE} \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"'${APP_NAME}'","image":"ghcr.io/boardguru/appboardguru:'${image_tag}'"}]}}}}' \
        || {
            log_error "Failed to update ${env} deployment image"
            return 1
        }
    
    log_success "${env} deployment updated successfully"
}

# Function to scale deployment
scale_deployment() {
    local env=$1
    local replicas=$2
    
    log_info "Scaling ${env} deployment to ${replicas} replicas"
    
    kubectl scale deployment ${APP_NAME}-${env} -n ${NAMESPACE} --replicas=${replicas} || {
        log_error "Failed to scale ${env} deployment"
        return 1
    }
    
    log_success "${env} deployment scaled to ${replicas} replicas"
}

# Function to wait for deployment rollout
wait_for_rollout() {
    local env=$1
    local timeout=${2:-300}
    
    log_info "Waiting for ${env} deployment rollout to complete (timeout: ${timeout}s)"
    
    if kubectl rollout status deployment/${APP_NAME}-${env} -n ${NAMESPACE} --timeout=${timeout}s; then
        log_success "${env} deployment rolled out successfully"
        return 0
    else
        log_error "${env} deployment rollout failed or timed out"
        return 1
    fi
}

# Function to perform health check
health_check() {
    local env=$1
    local timeout=${2:-60}
    local endpoint="http://${APP_NAME}-${env}-service:3000/api/health"
    
    log_info "Performing health check for ${env} environment (timeout: ${timeout}s)"
    
    local count=0
    local max_attempts=$((timeout / 10))
    
    while [[ $count -lt $max_attempts ]]; do
        if kubectl run health-check-${env}-$(date +%s) \
            --image=curlimages/curl \
            --rm -i --restart=Never \
            --namespace=${NAMESPACE} \
            --timeout=10s \
            -- curl -f --max-time 5 ${endpoint} &>/dev/null; then
            log_success "Health check passed for ${env} environment"
            return 0
        fi
        
        count=$((count + 1))
        log_info "Health check attempt ${count}/${max_attempts} failed, retrying in 10s..."
        sleep 10
    done
    
    log_error "Health check failed for ${env} environment after ${timeout}s"
    return 1
}

# Function to switch traffic
switch_traffic() {
    local target_env=$1
    
    log_info "Switching traffic to ${target_env} environment"
    
    kubectl patch service ${APP_NAME}-service -n ${NAMESPACE} \
        -p '{"spec":{"selector":{"version":"'${target_env}'"}}}' || {
        log_error "Failed to switch traffic to ${target_env}"
        return 1
    }
    
    log_success "Traffic switched to ${target_env} environment"
}

# Function to rollback deployment
rollback() {
    local current_active=$(get_active_environment)
    local rollback_target
    
    if [[ "$current_active" == "blue" ]]; then
        rollback_target="green"
    else
        rollback_target="blue"
    fi
    
    log_warning "Initiating rollback to ${rollback_target} environment"
    
    # Scale up the rollback target
    scale_deployment ${rollback_target} 3
    
    # Wait for rollback target to be ready
    if wait_for_rollout ${rollback_target} ${ROLLBACK_TIMEOUT}; then
        # Switch traffic back
        switch_traffic ${rollback_target}
        log_success "Rollback completed successfully"
        
        # Scale down the failed environment
        scale_deployment ${current_active} 0
    else
        log_error "Rollback failed - ${rollback_target} environment is not healthy"
        return 1
    fi
}

# Function to cleanup old deployments
cleanup() {
    local inactive_env=$(get_inactive_environment)
    
    log_info "Cleaning up ${inactive_env} environment"
    scale_deployment ${inactive_env} 0
    
    # Clean up old pods
    kubectl delete pods -n ${NAMESPACE} -l app=${APP_NAME},version=${inactive_env} --grace-period=30 || true
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    local image_tag=$1
    
    log_info "Starting blue-green deployment with image tag: ${image_tag}"
    
    # Get current active environment
    local active_env=$(get_active_environment)
    local target_env=$(get_inactive_environment)
    
    log_info "Current active environment: ${active_env}"
    log_info "Target deployment environment: ${target_env}"
    
    # Update target environment with new image
    update_deployment_image ${target_env} ${image_tag} || {
        log_error "Failed to update ${target_env} deployment"
        exit 1
    }
    
    # Scale up target environment
    scale_deployment ${target_env} 3 || {
        log_error "Failed to scale up ${target_env} deployment"
        exit 1
    }
    
    # Wait for target environment to be ready
    if ! wait_for_rollout ${target_env} ${HEALTH_CHECK_TIMEOUT}; then
        log_error "Target environment ${target_env} failed to deploy"
        log_info "Cleaning up failed deployment"
        scale_deployment ${target_env} 0
        exit 1
    fi
    
    # Perform health check on target environment
    if ! health_check ${target_env} 120; then
        log_error "Health check failed for ${target_env} environment"
        log_info "Cleaning up failed deployment"
        scale_deployment ${target_env} 0
        exit 1
    fi
    
    # Switch traffic to target environment
    if ! switch_traffic ${target_env}; then
        log_error "Failed to switch traffic to ${target_env}"
        log_info "Initiating rollback"
        rollback
        exit 1
    fi
    
    log_success "Deployment completed successfully!"
    log_info "New active environment: ${target_env}"
    
    # Wait a bit before cleanup to ensure traffic switch is successful
    log_info "Waiting 30 seconds before cleanup..."
    sleep 30
    
    # Cleanup old environment
    cleanup
    
    log_success "Blue-green deployment completed successfully!"
}

# Function to show deployment status
status() {
    local active_env=$(get_active_environment)
    local inactive_env=$(get_inactive_environment)
    
    echo "=== Blue-Green Deployment Status ==="
    echo "Active Environment: ${active_env}"
    echo "Inactive Environment: ${inactive_env}"
    echo ""
    
    echo "=== Deployment Status ==="
    kubectl get deployments -n ${NAMESPACE} -l app=${APP_NAME}
    echo ""
    
    echo "=== Service Configuration ==="
    kubectl get service ${APP_NAME}-service -n ${NAMESPACE} -o wide
    echo ""
    
    echo "=== Pod Status ==="
    kubectl get pods -n ${NAMESPACE} -l app=${APP_NAME}
}

# Function to show help
show_help() {
    cat << EOF
Blue-Green Deployment Script for BoardGuru

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy <image_tag>  Perform blue-green deployment with specified image tag
    status             Show current deployment status
    rollback           Rollback to previous environment
    cleanup            Clean up inactive environment
    health-check <env> Perform health check on specified environment (blue|green)
    switch <env>       Manually switch traffic to specified environment
    help               Show this help message

Environment Variables:
    NAMESPACE          Kubernetes namespace (default: boardguru-production)
    IMAGE_TAG          Docker image tag to deploy
    HEALTH_CHECK_TIMEOUT  Timeout for health checks in seconds (default: 300)
    ROLLBACK_TIMEOUT     Timeout for rollback operations in seconds (default: 60)

Examples:
    $0 deploy v1.2.3
    $0 status
    $0 rollback
    $0 health-check blue
    $0 switch green

EOF
}

# Main script logic
main() {
    # Check prerequisites
    check_kubectl
    
    case "${1:-help}" in
        deploy)
            if [[ -z "${2:-}" ]]; then
                log_error "Image tag is required for deployment"
                show_help
                exit 1
            fi
            deploy "$2"
            ;;
        status)
            status
            ;;
        rollback)
            rollback
            ;;
        cleanup)
            cleanup
            ;;
        health-check)
            if [[ -z "${2:-}" ]]; then
                log_error "Environment (blue|green) is required for health check"
                exit 1
            fi
            health_check "$2"
            ;;
        switch)
            if [[ -z "${2:-}" ]]; then
                log_error "Target environment (blue|green) is required"
                exit 1
            fi
            switch_traffic "$2"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"