#!/bin/bash

# Comprehensive Load Testing Script for BoardGuru
# Executes all performance test scenarios and generates consolidated reports

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
K6_DIR="$TESTS_DIR/k6"
REPORTS_DIR="$TESTS_DIR/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_ENV=${TEST_ENV:-"local"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test scenarios and their configurations
declare -A TEST_SCENARIOS=(
    ["smoke"]="smoke test - basic functionality verification"
    ["concurrent-meetings"]="concurrent board meetings with real-time features"
    ["database-load"]="database performance under enterprise load"
    ["document-collaboration"]="document collaboration with conflict resolution"
    ["ai-processing"]="AI processing pipeline with multiple models"
    ["full-enterprise"]="complete enterprise load simulation"
)

# Performance thresholds for pass/fail determination
declare -A PERFORMANCE_THRESHOLDS=(
    ["response_time_p95"]=500
    ["error_rate_max"]=0.01
    ["websocket_latency_p95"]=200
    ["database_query_p95"]=1000
    ["ai_processing_p95"]=15000
)

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        log_error "k6 is not installed. Please install k6 from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    # Check k6 version
    K6_VERSION=$(k6 version | head -n1 | awk '{print $2}')
    log_info "Using k6 version: $K6_VERSION"
    
    # Check if Node.js is available (for report generation)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found. HTML report generation will be skipped."
    fi
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$REPORTS_DIR/$TIMESTAMP"
    
    log_success "Prerequisites check completed"
}

# Validate environment
validate_environment() {
    log_info "Validating test environment: $TEST_ENV"
    
    case $TEST_ENV in
        "local")
            BASE_URL=${BASE_URL:-"http://localhost:3000"}
            ;;
        "staging")
            BASE_URL=${BASE_URL:-"https://staging.boardguru.ai"}
            ;;
        "production")
            BASE_URL=${BASE_URL:-"https://app.boardguru.ai"}
            log_warning "Running tests against production environment. Use with caution!"
            ;;
        *)
            log_error "Invalid environment: $TEST_ENV. Use 'local', 'staging', or 'production'"
            exit 1
            ;;
    esac
    
    log_info "Target URL: $BASE_URL"
    
    # Health check
    log_info "Performing health check..."
    if curl -f -s "$BASE_URL/api/health" > /dev/null; then
        log_success "Health check passed"
    else
        log_error "Health check failed. Ensure the application is running at $BASE_URL"
        exit 1
    fi
}

# Run individual test scenario
run_test_scenario() {
    local scenario=$1
    local description=$2
    
    log_info "Running test scenario: $scenario ($description)"
    
    local test_file="$K6_DIR/scenarios/${scenario}.js"
    local output_file="$REPORTS_DIR/$TIMESTAMP/${scenario}-results.json"
    local log_file="$REPORTS_DIR/$TIMESTAMP/${scenario}.log"
    
    if [[ ! -f "$test_file" ]]; then
        log_error "Test file not found: $test_file"
        return 1
    fi
    
    # Set environment variables for k6
    export TEST_ENV="$TEST_ENV"
    export BASE_URL="$BASE_URL"
    
    # Run k6 test
    log_info "Executing k6 test..."
    if k6 run \
        --out json="$output_file" \
        --env TEST_ENV="$TEST_ENV" \
        --env BASE_URL="$BASE_URL" \
        "$test_file" 2>&1 | tee "$log_file"; then
        log_success "Test scenario '$scenario' completed successfully"
        return 0
    else
        log_error "Test scenario '$scenario' failed"
        return 1
    fi
}

# Analyze test results
analyze_results() {
    local scenario=$1
    local results_file="$REPORTS_DIR/$TIMESTAMP/${scenario}-results.json"
    
    if [[ ! -f "$results_file" ]]; then
        log_error "Results file not found: $results_file"
        return 1
    fi
    
    log_info "Analyzing results for $scenario..."
    
    # Extract key metrics using jq
    if command -v jq &> /dev/null; then
        local response_time_p95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // "N/A"' "$results_file")
        local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$results_file")
        local total_requests=$(jq -r '.metrics.http_reqs.values.count // 0' "$results_file")
        local failed_requests=$(jq -r '.metrics.http_req_failed.values.fails // 0' "$results_file")
        
        echo "  Response Time (95th percentile): ${response_time_p95}ms"
        echo "  Error Rate: $(echo "$error_rate * 100" | bc -l | cut -d. -f1)%"
        echo "  Total Requests: $total_requests"
        echo "  Failed Requests: $failed_requests"
        
        # Check against thresholds
        local pass_fail="UNKNOWN"
        if [[ "$response_time_p95" != "N/A" ]] && [[ $(echo "$response_time_p95 <= ${PERFORMANCE_THRESHOLDS[response_time_p95]}" | bc -l) -eq 1 ]] && \
           [[ $(echo "$error_rate <= ${PERFORMANCE_THRESHOLDS[error_rate_max]}" | bc -l) -eq 1 ]]; then
            pass_fail="PASS"
            log_success "Performance thresholds met for $scenario"
        else
            pass_fail="FAIL"
            log_error "Performance thresholds not met for $scenario"
        fi
        
        echo "  Overall Result: $pass_fail"
    else
        log_warning "jq not installed. Detailed analysis skipped."
    fi
}

# Generate consolidated report
generate_consolidated_report() {
    log_info "Generating consolidated performance report..."
    
    local report_file="$REPORTS_DIR/$TIMESTAMP/consolidated-report.md"
    local summary_file="$REPORTS_DIR/$TIMESTAMP/test-summary.json"
    
    cat > "$report_file" << EOF
# BoardGuru Performance Test Report

**Test Date:** $(date)
**Test Environment:** $TEST_ENV
**Target URL:** $BASE_URL
**Test Duration:** $TEST_DURATION

## Executive Summary

This report summarizes the performance testing results for BoardGuru enterprise board management platform.

## Test Scenarios Executed

EOF

    # Initialize summary JSON
    echo '{"timestamp": "'$(date -Iseconds)'", "environment": "'$TEST_ENV'", "base_url": "'$BASE_URL'", "scenarios": {}}' > "$summary_file"

    local overall_pass=true
    
    # Process each test scenario
    for scenario in "${!TEST_SCENARIOS[@]}"; do
        local results_file="$REPORTS_DIR/$TIMESTAMP/${scenario}-results.json"
        
        if [[ -f "$results_file" ]]; then
            echo "### $scenario" >> "$report_file"
            echo "${TEST_SCENARIOS[$scenario]}" >> "$report_file"
            echo "" >> "$report_file"
            
            if command -v jq &> /dev/null; then
                # Extract metrics and add to summary
                local response_time_p95=$(jq -r '.metrics.http_req_duration.values["p(95)"] // null' "$results_file")
                local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$results_file")
                local total_requests=$(jq -r '.metrics.http_reqs.values.count // 0' "$results_file")
                
                # Update summary JSON
                jq --arg scenario "$scenario" \
                   --argjson response_time "$response_time_p95" \
                   --argjson error_rate "$error_rate" \
                   --argjson total_requests "$total_requests" \
                   '.scenarios[$scenario] = {
                       "response_time_p95": $response_time,
                       "error_rate": $error_rate,
                       "total_requests": $total_requests
                   }' "$summary_file" > "$summary_file.tmp" && mv "$summary_file.tmp" "$summary_file"
                
                echo "- Response Time (95th percentile): ${response_time_p95}ms" >> "$report_file"
                echo "- Error Rate: $(echo "$error_rate * 100" | bc -l | cut -d. -f1)%" >> "$report_file"
                echo "- Total Requests: $total_requests" >> "$report_file"
                
                # Check thresholds
                if [[ "$response_time_p95" != "null" ]] && [[ $(echo "$response_time_p95 > ${PERFORMANCE_THRESHOLDS[response_time_p95]}" | bc -l) -eq 1 ]] || \
                   [[ $(echo "$error_rate > ${PERFORMANCE_THRESHOLDS[error_rate_max]}" | bc -l) -eq 1 ]]; then
                    echo "- **Result: FAIL** ❌" >> "$report_file"
                    overall_pass=false
                else
                    echo "- **Result: PASS** ✅" >> "$report_file"
                fi
            else
                echo "- Analysis: jq not available for detailed metrics" >> "$report_file"
            fi
            
            echo "" >> "$report_file"
        fi
    done
    
    # Add overall conclusion
    cat >> "$report_file" << EOF

## Overall Assessment

EOF
    
    if [[ "$overall_pass" == true ]]; then
        echo "✅ **PASS**: All performance tests meet the defined thresholds." >> "$report_file"
        echo "The system is ready for enterprise deployment." >> "$report_file"
    else
        echo "❌ **FAIL**: Some performance tests did not meet the defined thresholds." >> "$report_file"
        echo "Review individual test results and optimize before enterprise deployment." >> "$report_file"
    fi
    
    cat >> "$report_file" << EOF

## Performance Thresholds

- Response Time (95th percentile): ≤ ${PERFORMANCE_THRESHOLDS[response_time_p95]}ms
- Error Rate: ≤ $(echo "${PERFORMANCE_THRESHOLDS[error_rate_max]} * 100" | bc -l)%
- WebSocket Latency (95th percentile): ≤ ${PERFORMANCE_THRESHOLDS[websocket_latency_p95]}ms

## Recommendations

Based on the test results:

1. **Monitor** response times during peak usage periods
2. **Optimize** any endpoints exceeding performance thresholds
3. **Scale** infrastructure components as needed
4. **Review** error patterns and implement fixes

## Test Artifacts

All test results and logs are available in:
\`$REPORTS_DIR/$TIMESTAMP/\`

EOF
    
    log_success "Consolidated report generated: $report_file"
    
    # Update summary with overall result
    jq --argjson overall_pass "$overall_pass" '. + {"overall_pass": $overall_pass}' "$summary_file" > "$summary_file.tmp" && mv "$summary_file.tmp" "$summary_file"
}

# Generate HTML report (if Node.js is available)
generate_html_report() {
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not available. Skipping HTML report generation."
        return
    fi
    
    log_info "Generating HTML performance report..."
    
    local html_generator="$SCRIPT_DIR/generate-html-report.js"
    
    if [[ -f "$html_generator" ]]; then
        node "$html_generator" "$REPORTS_DIR/$TIMESTAMP" > "$REPORTS_DIR/$TIMESTAMP/performance-report.html"
        log_success "HTML report generated: $REPORTS_DIR/$TIMESTAMP/performance-report.html"
    else
        log_warning "HTML report generator not found. Skipping HTML report."
    fi
}

# Cleanup old reports
cleanup_old_reports() {
    log_info "Cleaning up old reports (keeping last 10)..."
    
    # Keep only the last 10 report directories
    ls -t "$REPORTS_DIR" | tail -n +11 | while read -r old_report; do
        if [[ -d "$REPORTS_DIR/$old_report" ]]; then
            rm -rf "$REPORTS_DIR/$old_report"
            log_info "Removed old report: $old_report"
        fi
    done
}

# Main execution function
main() {
    local start_time=$(date +%s)
    
    echo "========================================="
    echo "BoardGuru Comprehensive Load Testing"
    echo "========================================="
    
    # Parse command line arguments
    local selected_scenarios=()
    local generate_html=false
    local cleanup_old=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --scenario)
                selected_scenarios+=("$2")
                shift 2
                ;;
            --all-scenarios)
                selected_scenarios=("${!TEST_SCENARIOS[@]}")
                shift
                ;;
            --html)
                generate_html=true
                shift
                ;;
            --cleanup)
                cleanup_old=true
                shift
                ;;
            --env)
                TEST_ENV="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --scenario <name>    Run specific test scenario"
                echo "  --all-scenarios      Run all available test scenarios"
                echo "  --html              Generate HTML report"
                echo "  --cleanup           Clean up old reports"
                echo "  --env <environment>  Set test environment (local, staging, production)"
                echo "  --help              Show this help message"
                echo ""
                echo "Available scenarios:"
                for scenario in "${!TEST_SCENARIOS[@]}"; do
                    echo "  - $scenario: ${TEST_SCENARIOS[$scenario]}"
                done
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Default to smoke test if no scenarios selected
    if [[ ${#selected_scenarios[@]} -eq 0 ]]; then
        selected_scenarios=("smoke")
        log_info "No scenarios specified. Running smoke test by default."
    fi
    
    # Prerequisites and environment validation
    check_prerequisites
    validate_environment
    
    # Run selected test scenarios
    local failed_scenarios=()
    
    for scenario in "${selected_scenarios[@]}"; do
        if [[ -z "${TEST_SCENARIOS[$scenario]}" ]]; then
            log_error "Unknown test scenario: $scenario"
            continue
        fi
        
        if run_test_scenario "$scenario" "${TEST_SCENARIOS[$scenario]}"; then
            analyze_results "$scenario"
        else
            failed_scenarios+=("$scenario")
        fi
        
        echo "" # Add spacing between scenarios
    done
    
    # Calculate test duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    export TEST_DURATION="${duration}s"
    
    # Generate reports
    generate_consolidated_report
    
    if [[ "$generate_html" == true ]]; then
        generate_html_report
    fi
    
    if [[ "$cleanup_old" == true ]]; then
        cleanup_old_reports
    fi
    
    # Final summary
    echo "========================================="
    echo "Test Execution Summary"
    echo "========================================="
    echo "Total Duration: ${duration}s"
    echo "Scenarios Run: ${#selected_scenarios[@]}"
    echo "Failed Scenarios: ${#failed_scenarios[@]}"
    
    if [[ ${#failed_scenarios[@]} -gt 0 ]]; then
        echo "Failed: ${failed_scenarios[*]}"
        log_error "Some test scenarios failed. Check individual results for details."
    else
        log_success "All test scenarios completed successfully!"
    fi
    
    echo ""
    echo "Reports available in: $REPORTS_DIR/$TIMESTAMP"
    echo "========================================="
    
    # Exit with error code if any scenarios failed
    if [[ ${#failed_scenarios[@]} -gt 0 ]]; then
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"