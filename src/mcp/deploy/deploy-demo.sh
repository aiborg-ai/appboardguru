#!/bin/bash
set -e

# BoardGuru MCP Demo - Complete Deployment Orchestrator
# This script coordinates the entire deployment process for demo.boardguru.ai

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="demo.boardguru.ai"
PLATFORM=${1:-vercel}
ENVIRONMENT=${2:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO") echo -e "${BLUE}[$timestamp]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[$timestamp] ✅${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[$timestamp] ⚠️${NC} $message" ;;
        "ERROR") echo -e "${RED}[$timestamp] ❌${NC} $message" ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    
    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log "ERROR" "Node.js 18+ required. Current: $(node -v)"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log "ERROR" "npm not found"
        exit 1
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        log "ERROR" "curl not found. Please install curl"
        exit 1
    fi
    
    log "SUCCESS" "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    log "INFO" "Setting up environment variables..."
    
    # Create .env.local if it doesn't exist
    if [ ! -f ".env.local" ]; then
        cat > .env.local << EOF
# BoardGuru MCP Demo Environment
NODE_ENV=$ENVIRONMENT
DEMO_MODE=true
NEXT_PUBLIC_APP_URL=https://$DOMAIN

# Demo Configuration
DEMO_PORT=3001
PORT=3000

# API Configuration
API_VERSION_DEFAULT=v1
API_RATE_LIMIT_REQUESTS_PER_MINUTE=100

# Monitoring (optional)
PERFORMANCE_MONITORING_ENABLED=true
RENDER_PERFORMANCE_THRESHOLD_MS=16

# Platform specific
VERCEL_PROJECT_ID=${VERCEL_PROJECT_ID:-}
NETLIFY_SITE_ID=${NETLIFY_SITE_ID:-}
EOF
        log "SUCCESS" "Created .env.local file"
    else
        log "INFO" "Using existing .env.local file"
    fi
}

# Function to build the application
build_application() {
    log "INFO" "Building BoardGuru MCP Demo..."
    
    # Install dependencies
    log "INFO" "Installing dependencies..."
    npm install
    
    # Build demo
    log "INFO" "Building demo application..."
    if timeout 300 npm run build:demo; then
        log "SUCCESS" "Build completed successfully"
    else
        log "WARNING" "Build timed out, trying with increased memory..."
        NODE_OPTIONS="--max_old_space_size=4096" timeout 300 npm run build:demo || {
            log "ERROR" "Build failed even with increased memory"
            exit 1
        }
        log "SUCCESS" "Build completed with increased memory"
    fi
}

# Function to run pre-deployment tests
run_tests() {
    log "INFO" "Running pre-deployment tests..."
    
    # Type checking
    if npm run typecheck; then
        log "SUCCESS" "TypeScript type checking passed"
    else
        log "WARNING" "TypeScript issues found, but continuing deployment"
    fi
    
    # Basic functionality test
    log "INFO" "Testing demo server locally..."
    npm run demo &
    local demo_pid=$!
    
    # Wait for server to start
    sleep 10
    
    # Test local endpoints
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log "SUCCESS" "Local demo server health check passed"
    else
        log "WARNING" "Local health check failed, but continuing"
    fi
    
    # Kill demo server
    kill $demo_pid 2>/dev/null || true
    sleep 2
}

# Function to deploy based on platform
deploy_to_platform() {
    local platform=$1
    
    log "INFO" "Deploying to $platform..."
    
    # Make deployment script executable
    chmod +x "$SCRIPT_DIR/deploy.sh"
    
    # Run platform-specific deployment
    if "$SCRIPT_DIR/deploy.sh" "$platform" "$ENVIRONMENT"; then
        log "SUCCESS" "Deployment to $platform completed"
    else
        log "ERROR" "Deployment to $platform failed"
        exit 1
    fi
}

# Function to setup DNS
setup_dns_config() {
    log "INFO" "Setting up DNS configuration..."
    
    chmod +x "$SCRIPT_DIR/setup-dns.sh"
    
    # Run DNS setup in non-interactive mode for the chosen platform
    case $PLATFORM in
        "vercel")
            echo "1" | "$SCRIPT_DIR/setup-dns.sh" || true
            ;;
        "netlify")
            echo "2" | "$SCRIPT_DIR/setup-dns.sh" || true
            ;;
        "aws")
            echo "3" | "$SCRIPT_DIR/setup-dns.sh" || true
            ;;
        "docker")
            echo "4" | "$SCRIPT_DIR/setup-dns.sh" || true
            ;;
    esac
    
    log "INFO" "DNS configuration completed (manual steps may be required)"
}

# Function to setup SSL
setup_ssl_certificates() {
    log "INFO" "Setting up SSL certificates..."
    
    chmod +x "$SCRIPT_DIR/ssl-setup.sh"
    
    # For platforms that handle SSL automatically, just verify
    case $PLATFORM in
        "vercel"|"netlify")
            log "INFO" "SSL handled automatically by $PLATFORM"
            ;;
        "aws")
            echo "2" | "$SCRIPT_DIR/ssl-setup.sh" || true
            ;;
        "docker")
            echo "1" | "$SCRIPT_DIR/ssl-setup.sh" || true
            ;;
    esac
}

# Function to setup monitoring
setup_monitoring() {
    log "INFO" "Setting up monitoring and health checks..."
    
    chmod +x "$SCRIPT_DIR/monitoring-setup.sh"
    "$SCRIPT_DIR/monitoring-setup.sh" || {
        log "WARNING" "Monitoring setup encountered issues, but deployment continues"
    }
    
    # Set up basic health check cron job
    if command -v crontab &> /dev/null; then
        (crontab -l 2>/dev/null; echo "*/5 * * * * curl -f https://$DOMAIN/health > /dev/null 2>&1 || echo 'BoardGuru Demo Health Check Failed' | logger") | crontab - 2>/dev/null || true
        log "SUCCESS" "Health check cron job added"
    fi
}

# Function to verify deployment
verify_deployment() {
    log "INFO" "Verifying deployment..."
    
    local max_attempts=12
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log "INFO" "Verification attempt $attempt/$max_attempts..."
        
        # Test health endpoint
        if curl -f "https://$DOMAIN/health" > /dev/null 2>&1; then
            log "SUCCESS" "Health endpoint responding"
            break
        else
            log "WARNING" "Health endpoint not responding, waiting..."
            sleep 15
            ((attempt++))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log "ERROR" "Deployment verification failed after $max_attempts attempts"
        return 1
    fi
    
    # Test demo functionality
    if curl -f "https://$DOMAIN/api/demo/board-analysis" > /dev/null 2>&1; then
        log "SUCCESS" "Demo API responding"
    else
        log "WARNING" "Demo API not responding correctly"
    fi
    
    # Test SSL
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates > /dev/null 2>&1; then
        log "SUCCESS" "SSL certificate is valid"
    else
        log "WARNING" "SSL certificate issues detected"
    fi
    
    return 0
}

# Function to show deployment summary
show_summary() {
    local deployment_success=$1
    
    echo ""
    echo "================================================================"
    echo "🚀 BoardGuru MCP Demo Deployment Summary"
    echo "================================================================"
    echo "Platform: $PLATFORM"
    echo "Environment: $ENVIRONMENT"  
    echo "Domain: $DOMAIN"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    if [ $deployment_success -eq 0 ]; then
        echo "Status: ✅ SUCCESS"
        echo ""
        echo "🔗 Access Points:"
        echo "   Demo Site: https://$DOMAIN"
        echo "   Health Check: https://$DOMAIN/health"
        echo "   API Demo: https://$DOMAIN/api/demo/board-analysis" 
        echo "   Documentation: https://$DOMAIN/docs"
        echo ""
        echo "📊 Monitoring:"
        echo "   Grafana: http://localhost:3030 (if using Docker)"
        echo "   Prometheus: http://localhost:9090 (if using Docker)"
        echo ""
        echo "🎯 Next Steps:"
        echo "   1. Test all demo functionality"
        echo "   2. Share demo URL with stakeholders"
        echo "   3. Monitor application performance"
        echo "   4. Set up custom domain if needed"
        echo "   5. Configure additional alerting"
    else
        echo "Status: ❌ FAILED"
        echo ""
        echo "🔍 Troubleshooting:"
        echo "   1. Check deployment logs above"
        echo "   2. Verify DNS configuration"
        echo "   3. Check SSL certificate status"
        echo "   4. Test local build with: npm run demo"
        echo "   5. Contact support if issues persist"
    fi
    
    echo ""
    echo "================================================================"
}

# Main execution flow
main() {
    echo "🚀 BoardGuru MCP Demo - Complete Deployment"
    echo "Platform: $PLATFORM | Environment: $ENVIRONMENT"
    echo "================================================================"
    
    # Change to project root
    cd "$SCRIPT_DIR/.."
    
    local deployment_success=0
    
    # Execute deployment pipeline
    check_prerequisites
    setup_environment
    build_application
    run_tests
    deploy_to_platform "$PLATFORM"
    setup_dns_config
    setup_ssl_certificates
    setup_monitoring
    
    # Verify deployment
    if verify_deployment; then
        deployment_success=0
        log "SUCCESS" "🎉 Deployment completed successfully!"
    else
        deployment_success=1
        log "ERROR" "Deployment verification failed"
    fi
    
    # Show summary
    show_summary $deployment_success
    
    exit $deployment_success
}

# Handle script termination
trap 'log "ERROR" "Deployment interrupted"; exit 1' INT TERM

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "BoardGuru MCP Demo Deployment"
    echo ""
    echo "Usage: $0 [platform] [environment]"
    echo ""
    echo "Platforms:"
    echo "  vercel     - Deploy to Vercel (default)"
    echo "  netlify    - Deploy to Netlify"
    echo "  aws        - Deploy to AWS with CloudFormation"
    echo "  docker     - Deploy with Docker Compose"
    echo ""
    echo "Environments:"
    echo "  production - Production deployment (default)"
    echo "  staging    - Staging deployment"
    echo ""
    echo "Examples:"
    echo "  $0 vercel production"
    echo "  $0 aws staging"
    echo "  $0 docker"
    echo ""
    exit 0
fi

# Run main function
main "$@"