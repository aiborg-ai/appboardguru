#!/bin/bash

# Playwright E2E Tests for Vercel/Supabase Environment
# Tests against the deployed application with existing test data

echo "🎭 AppBoardGuru Vercel E2E Tests"
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default Vercel URL (can be overridden)
DEFAULT_URL="https://appboardguru.vercel.app"
STAGING_URL="https://appboardguru-staging.vercel.app"
LOCAL_URL="http://localhost:3001"

# Check if custom URL is provided
if [ -n "$1" ]; then
    export VERCEL_URL="$1"
elif [ -n "$VERCEL_URL" ]; then
    echo "Using VERCEL_URL from environment: $VERCEL_URL"
else
    # Ask user which environment to test
    echo "Select environment to test:"
    echo ""
    echo "  1) Production (${DEFAULT_URL})"
    echo "  2) Staging (${STAGING_URL})"
    echo "  3) Local (${LOCAL_URL})"
    echo "  4) Custom URL"
    echo ""
    read -p "Enter choice (1-4): " env_choice
    
    case $env_choice in
        1)
            export VERCEL_URL="$DEFAULT_URL"
            echo -e "${GREEN}Testing Production environment${NC}"
            ;;
        2)
            export VERCEL_URL="$STAGING_URL"
            echo -e "${YELLOW}Testing Staging environment${NC}"
            ;;
        3)
            export VERCEL_URL="$LOCAL_URL"
            echo -e "${BLUE}Testing Local environment${NC}"
            ;;
        4)
            read -p "Enter custom URL: " custom_url
            export VERCEL_URL="$custom_url"
            echo -e "${BLUE}Testing custom URL: $custom_url${NC}"
            ;;
        *)
            export VERCEL_URL="$DEFAULT_URL"
            echo -e "${GREEN}Defaulting to Production environment${NC}"
            ;;
    esac
fi

echo ""
echo "🌐 Target URL: $VERCEL_URL"
echo ""

# Test connection to the URL
echo "🔍 Checking connection to $VERCEL_URL..."
if curl -s --head --request GET "$VERCEL_URL" | grep "200\|301\|302" > /dev/null; then
    echo -e "${GREEN}✅ Connection successful${NC}"
else
    echo -e "${YELLOW}⚠️  Connection might be slow or require authentication${NC}"
fi

echo ""
echo "📋 Test User Credentials:"
echo "  Email: test.director@appboardguru.com"
echo "  Password: TestDirector123!"
echo ""

# Create results directory
mkdir -p test-results-vercel/screenshots

# Menu for test selection
echo "Select test suite to run:"
echo ""
echo "  1) All Vercel Tests"
echo "  2) Authentication Tests Only"
echo "  3) Dashboard Tests Only"
echo "  4) Quick Smoke Test"
echo "  5) Run with UI Mode"
echo "  6) Run with Debug Mode"
echo "  7) Generate Test Report"
echo "  8) Exit"
echo ""
read -p "Enter choice (1-8): " choice

# Function to run tests
run_tests() {
    local test_command=$1
    local test_name=$2
    
    echo ""
    echo -e "${BLUE}🚀 Running ${test_name}...${NC}"
    echo "================================"
    
    # Run the test command
    eval $test_command
    
    # Check exit status
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Tests completed successfully!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Some tests failed. Check the report for details.${NC}"
    fi
}

# Execute based on choice
case $choice in
    1)
        run_tests "npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts" "All Vercel Tests"
        ;;
    2)
        run_tests "npx playwright test __tests__/e2e/vercel-tests/vercel-auth.spec.ts --config=playwright-vercel.config.ts" "Authentication Tests"
        ;;
    3)
        run_tests "npx playwright test __tests__/e2e/vercel-tests/vercel-dashboard.spec.ts --config=playwright-vercel.config.ts" "Dashboard Tests"
        ;;
    4)
        echo -e "${BLUE}🔥 Running Quick Smoke Test...${NC}"
        run_tests "npx playwright test __tests__/e2e/vercel-tests/vercel-auth.spec.ts --config=playwright-vercel.config.ts --grep='should successfully login'" "Smoke Test"
        ;;
    5)
        echo -e "${BLUE}🎨 Opening Playwright UI...${NC}"
        npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts --ui
        ;;
    6)
        echo -e "${BLUE}🐛 Running in Debug Mode...${NC}"
        npx playwright test __tests__/e2e/vercel-tests/*.spec.ts --config=playwright-vercel.config.ts --debug
        ;;
    7)
        echo -e "${BLUE}📊 Opening Test Report...${NC}"
        npx playwright show-report playwright-report-vercel
        ;;
    8)
        echo -e "${GREEN}👋 Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Show report location
echo ""
echo "📊 Test reports available at:"
echo "   - HTML Report: playwright-report-vercel/index.html"
echo "   - Screenshots: test-results-vercel/screenshots/"
echo "   - JSON Results: test-results/vercel-results.json"
echo ""
echo "To view HTML report, run:"
echo -e "${GREEN}npx playwright show-report playwright-report-vercel${NC}"
echo ""

# Show test summary if results exist
if [ -f "test-results/vercel-results.json" ]; then
    echo "📈 Test Summary:"
    # Try to parse and show basic stats (requires jq)
    if command -v jq &> /dev/null; then
        TOTAL=$(jq '.stats.total' test-results/vercel-results.json 2>/dev/null)
        PASSED=$(jq '.stats.passed' test-results/vercel-results.json 2>/dev/null)
        FAILED=$(jq '.stats.failed' test-results/vercel-results.json 2>/dev/null)
        
        if [ -n "$TOTAL" ]; then
            echo "   Total: $TOTAL"
            echo "   Passed: $PASSED"
            echo "   Failed: $FAILED"
        fi
    fi
fi

echo ""
echo "✨ Done!"