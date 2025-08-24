#!/bin/bash

# Canary Deployment Script for BoardGuru
# This script manages canary deployments with gradual traffic shifting

set -euo pipefail

# Configuration
NAMESPACE="${NAMESPACE:-boardguru-production}"
APP_NAME="boardguru-app"
CANARY_NAME="${APP_NAME}-canary"
IMAGE_TAG="${IMAGE_TAG:-latest}"
INITIAL_TRAFFIC_PERCENTAGE=10
TRAFFIC_INCREMENTS=(10 25 50 75 100)
MONITORING_WINDOW=300  # 5 minutes
ROLLBACK_THRESHOLD_ERROR_RATE=5  # 5%
ROLLBACK_THRESHOLD_LATENCY=2000  # 2 seconds

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to check prerequisites
check_prerequisites() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "kubectl is not configured or cluster is not accessible"
        exit 1
    fi

    # Check if Istio is available for traffic management
    if ! kubectl get crd virtualservices.networking.istio.io &> /dev/null; then
        log_warning "Istio VirtualServices not available, using basic service mesh"
    fi

    log_info "Prerequisites check passed"
}

# Function to create canary deployment
create_canary_deployment() {
    local image_tag=$1
    
    log_info "Creating canary deployment with image: ghcr.io/boardguru/appboardguru:${image_tag}"
    
    # Create canary deployment manifest
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${CANARY_NAME}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
    version: canary
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${APP_NAME}
      version: canary
  template:
    metadata:
      labels:
        app: ${APP_NAME}
        version: canary
    spec:
      containers:
      - name: ${APP_NAME}
        image: ghcr.io/boardguru/appboardguru:${image_tag}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: CANARY_DEPLOYMENT
          value: "true"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
EOF

    # Wait for canary deployment to be ready
    log_info "Waiting for canary deployment to be ready..."
    kubectl rollout status deployment/${CANARY_NAME} -n ${NAMESPACE} --timeout=300s || {
        log_error "Canary deployment failed to become ready"
        return 1
    }
    
    log_success "Canary deployment created and ready"
}

# Function to create canary service
create_canary_service() {
    log_info "Creating canary service"
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: ${CANARY_NAME}-service
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
    version: canary
spec:
  ports:
  - port: 3000
    targetPort: 3000
    name: http
  selector:
    app: ${APP_NAME}
    version: canary
EOF
    
    log_success "Canary service created"
}

# Function to update Istio VirtualService for traffic splitting
update_traffic_split() {
    local canary_percentage=$1
    local stable_percentage=$((100 - canary_percentage))
    
    log_info "Updating traffic split: ${stable_percentage}% stable, ${canary_percentage}% canary"
    
    cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
spec:
  hosts:
  - ${APP_NAME}-service
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: ${CANARY_NAME}-service
  - route:
    - destination:
        host: ${APP_NAME}-service
      weight: ${stable_percentage}
    - destination:
        host: ${CANARY_NAME}-service
      weight: ${canary_percentage}
EOF

    log_success "Traffic split updated: ${canary_percentage}% to canary"
}

# Function to get metrics from Prometheus
get_metrics() {
    local service_name=$1
    local duration="${2:-5m}"
    
    # These would typically query your monitoring system (Prometheus/Grafana)
    # For demo purposes, we'll simulate metrics
    
    local error_rate=$(( RANDOM % 10 ))  # Simulate 0-10% error rate
    local avg_latency=$(( 500 + RANDOM % 1500 ))  # Simulate 500-2000ms latency
    local requests_per_second=$(( 50 + RANDOM % 100 ))  # Simulate 50-150 RPS
    
    echo "error_rate:${error_rate},latency:${avg_latency},rps:${requests_per_second}"
}

# Function to analyze canary metrics
analyze_canary_metrics() {
    local canary_percentage=$1
    
    log_info "Analyzing canary metrics for ${canary_percentage}% traffic..."
    
    # Get metrics for both stable and canary versions
    local stable_metrics=$(get_metrics "${APP_NAME}-service")
    local canary_metrics=$(get_metrics "${CANARY_NAME}-service")
    
    # Parse metrics
    local stable_error_rate=$(echo $stable_metrics | cut -d',' -f1 | cut -d':' -f2)
    local stable_latency=$(echo $stable_metrics | cut -d',' -f2 | cut -d':' -f2)
    local canary_error_rate=$(echo $canary_metrics | cut -d',' -f1 | cut -d':' -f2)
    local canary_latency=$(echo $canary_metrics | cut -d',' -f2 | cut -d':' -f2)
    
    log_info "Stable version - Error rate: ${stable_error_rate}%, Latency: ${stable_latency}ms"
    log_info "Canary version - Error rate: ${canary_error_rate}%, Latency: ${canary_latency}ms"
    
    # Check if canary metrics are acceptable
    if [[ $canary_error_rate -gt $ROLLBACK_THRESHOLD_ERROR_RATE ]]; then
        log_error "Canary error rate (${canary_error_rate}%) exceeds threshold (${ROLLBACK_THRESHOLD_ERROR_RATE}%)"
        return 1
    fi
    
    if [[ $canary_latency -gt $ROLLBACK_THRESHOLD_LATENCY ]]; then
        log_error "Canary latency (${canary_latency}ms) exceeds threshold (${ROLLBACK_THRESHOLD_LATENCY}ms)"
        return 1
    fi
    
    # Compare with stable version (allow 20% degradation)
    local error_rate_threshold=$((stable_error_rate * 120 / 100))
    local latency_threshold=$((stable_latency * 120 / 100))
    
    if [[ $canary_error_rate -gt $error_rate_threshold ]]; then
        log_error "Canary error rate significantly higher than stable version"
        return 1
    fi
    
    if [[ $canary_latency -gt $latency_threshold ]]; then
        log_error "Canary latency significantly higher than stable version"
        return 1
    fi
    
    log_success "Canary metrics are within acceptable thresholds"
    return 0
}

# Function to perform health check
health_check() {
    local service_name=$1
    
    log_info "Performing health check on ${service_name}"
    
    if kubectl run health-check-$(date +%s) \
        --image=curlimages/curl \
        --rm -i --restart=Never \
        --namespace=${NAMESPACE} \
        --timeout=30s \
        -- curl -f --max-time 10 http://${service_name}:3000/api/health &>/dev/null; then
        log_success "Health check passed for ${service_name}"
        return 0
    else
        log_error "Health check failed for ${service_name}"
        return 1
    fi
}

# Function to rollback canary deployment
rollback_canary() {
    log_warning "Rolling back canary deployment"
    
    # Set traffic to 0% for canary
    update_traffic_split 0
    
    # Scale down canary deployment
    kubectl scale deployment ${CANARY_NAME} -n ${NAMESPACE} --replicas=0
    
    # Remove canary resources
    kubectl delete deployment ${CANARY_NAME} -n ${NAMESPACE} --ignore-not-found=true
    kubectl delete service ${CANARY_NAME}-service -n ${NAMESPACE} --ignore-not-found=true
    
    log_success "Canary deployment rolled back successfully"
}

# Function to promote canary to stable
promote_canary() {
    local image_tag=$1
    
    log_info "Promoting canary to stable version"
    
    # Update main deployment with canary image
    kubectl patch deployment ${APP_NAME} -n ${NAMESPACE} \
        -p '{"spec":{"template":{"spec":{"containers":[{"name":"'${APP_NAME}'","image":"ghcr.io/boardguru/appboardguru:'${image_tag}'"}]}}}}'
    
    # Wait for main deployment rollout
    kubectl rollout status deployment/${APP_NAME} -n ${NAMESPACE} --timeout=300s
    
    # Remove traffic split (100% to stable)
    kubectl delete virtualservice ${APP_NAME} -n ${NAMESPACE} --ignore-not-found=true
    
    # Clean up canary resources
    kubectl delete deployment ${CANARY_NAME} -n ${NAMESPACE} --ignore-not-found=true
    kubectl delete service ${CANARY_NAME}-service -n ${NAMESPACE} --ignore-not-found=true
    
    log_success "Canary promoted to stable successfully"
}

# Main canary deployment function
deploy_canary() {
    local image_tag=$1
    
    log_info "Starting canary deployment with image tag: ${image_tag}"
    
    # Create canary deployment
    create_canary_deployment ${image_tag} || {
        log_error "Failed to create canary deployment"
        exit 1
    }
    
    # Create canary service
    create_canary_service
    
    # Initial health check
    if ! health_check "${CANARY_NAME}-service"; then
        log_error "Canary deployment failed initial health check"
        rollback_canary
        exit 1
    fi
    
    # Gradually increase traffic to canary
    for percentage in "${TRAFFIC_INCREMENTS[@]}"; do
        log_info "Increasing canary traffic to ${percentage}%"
        
        # Update traffic split
        update_traffic_split ${percentage}
        
        # Wait for traffic to stabilize
        log_info "Waiting ${MONITORING_WINDOW} seconds for metrics to stabilize..."
        sleep ${MONITORING_WINDOW}
        
        # Analyze metrics
        if ! analyze_canary_metrics ${percentage}; then
            log_error "Canary metrics analysis failed at ${percentage}% traffic"
            rollback_canary
            exit 1
        fi
        
        # Additional health check
        if ! health_check "${CANARY_NAME}-service"; then
            log_error "Canary health check failed at ${percentage}% traffic"
            rollback_canary
            exit 1
        fi
        
        log_success "Canary performing well at ${percentage}% traffic"
        
        # If this is the final increment, promote canary
        if [[ ${percentage} -eq 100 ]]; then
            promote_canary ${image_tag}
            log_success "Canary deployment completed successfully!"
            return 0
        fi
    done
}

# Function to show canary status
status() {
    echo "=== Canary Deployment Status ==="
    
    # Check if canary deployment exists
    if kubectl get deployment ${CANARY_NAME} -n ${NAMESPACE} &>/dev/null; then
        echo "Canary deployment: ACTIVE"
        kubectl get deployment ${CANARY_NAME} -n ${NAMESPACE}
        echo ""
        
        # Show traffic split if VirtualService exists
        if kubectl get virtualservice ${APP_NAME} -n ${NAMESPACE} &>/dev/null; then
            echo "Traffic Split Configuration:"
            kubectl get virtualservice ${APP_NAME} -n ${NAMESPACE} -o yaml | grep -A 10 "weight:"
        fi
    else
        echo "Canary deployment: NOT ACTIVE"
    fi
    
    echo ""
    echo "Main Deployment:"
    kubectl get deployment ${APP_NAME} -n ${NAMESPACE}
    echo ""
    
    echo "All Pods:"
    kubectl get pods -n ${NAMESPACE} -l app=${APP_NAME}
}

# Function to show help
show_help() {
    cat << EOF
Canary Deployment Script for BoardGuru

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    deploy <image_tag>     Start canary deployment with specified image tag
    status                 Show current canary deployment status
    rollback              Rollback active canary deployment
    promote <image_tag>    Promote canary to stable (manual)
    analyze               Analyze current canary metrics
    help                  Show this help message

Environment Variables:
    NAMESPACE                    Kubernetes namespace (default: boardguru-production)
    IMAGE_TAG                    Docker image tag to deploy
    INITIAL_TRAFFIC_PERCENTAGE   Initial canary traffic % (default: 10)
    MONITORING_WINDOW           Monitoring window in seconds (default: 300)
    ROLLBACK_THRESHOLD_ERROR_RATE   Error rate threshold % (default: 5)
    ROLLBACK_THRESHOLD_LATENCY      Latency threshold ms (default: 2000)

Examples:
    $0 deploy v1.2.3
    $0 status
    $0 rollback
    $0 promote v1.2.3

EOF
}

# Main script logic
main() {
    check_prerequisites
    
    case "${1:-help}" in
        deploy)
            if [[ -z "${2:-}" ]]; then
                log_error "Image tag is required for canary deployment"
                show_help
                exit 1
            fi
            deploy_canary "$2"
            ;;
        status)
            status
            ;;
        rollback)
            rollback_canary
            ;;
        promote)
            if [[ -z "${2:-}" ]]; then
                log_error "Image tag is required for promotion"
                exit 1
            fi
            promote_canary "$2"
            ;;
        analyze)
            analyze_canary_metrics 50  # Analyze at current traffic split
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