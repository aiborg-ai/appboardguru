#!/bin/bash

# AppBoardGuru Playwright MCP Test Runner
# This script helps run E2E tests without requiring system-level browser installations

echo "🎭 AppBoardGuru Playwright MCP Test Runner"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo "📦 Checking Playwright installation..."

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright" ]; then
    echo -e "${YELLOW}⚠️  Playwright not found. Installing...${NC}"
    npm install @playwright/test --save-dev
fi

# Try to install browsers (may fail without sudo, but we'll handle it)
echo "🌐 Attempting to install Playwright browsers..."
npx playwright install chromium 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Could not install browsers system-wide.${NC}"
    echo "   Trying alternative installation method..."
    
    # Try installing in user directory
    PLAYWRIGHT_BROWSERS_PATH="$HOME/.cache/playwright" npx playwright install chromium 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Browser installation requires system dependencies.${NC}"
        echo ""
        echo "To install system dependencies, run:"
        echo -e "${GREEN}sudo apt-get install -y libavif16 libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1${NC}"
        echo ""
        echo "Or use Docker for testing (see docker-playwright-tests.sh)"
    }
}

# Check if development server is running
echo ""
echo "🔍 Checking if development server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Development server is running${NC}"
else
    echo -e "${YELLOW}⚠️  Development server not detected${NC}"
    echo "   Starting development server in background..."
    npm run dev > /dev/null 2>&1 &
    DEV_PID=$!
    echo "   Waiting for server to start..."
    sleep 10
    
    # Check again
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Development server started${NC}"
    else
        echo -e "${RED}❌ Failed to start development server${NC}"
        kill $DEV_PID 2>/dev/null
        exit 1
    fi
fi

# Menu for test selection
echo ""
echo "📋 Select test suite to run:"
echo "1) All MCP Tests"
echo "2) Authentication Tests"
echo "3) Board Management Tests"
echo "4) Asset & Vault Tests"
echo "5) Run with UI Mode"
echo "6) Run with Debug Mode"
echo "7) Generate New Tests (Codegen)"
echo "8) Exit"
echo ""
read -p "Enter your choice (1-8): " choice

# Function to run tests
run_tests() {
    local test_command=$1
    local test_name=$2
    
    echo ""
    echo "🚀 Running ${test_name}..."
    echo "================================"
    
    # Set environment variables for better compatibility
    export PLAYWRIGHT_BROWSERS_PATH=${PLAYWRIGHT_BROWSERS_PATH:-"$HOME/.cache/playwright"}
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
    
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
        run_tests "npx playwright test __tests__/e2e/playwright-mcp/tests/*.spec.ts --config=playwright.enhanced.config.ts" "All MCP Tests"
        ;;
    2)
        run_tests "npx playwright test __tests__/e2e/playwright-mcp/tests/auth-flow.spec.ts --config=playwright.enhanced.config.ts" "Authentication Tests"
        ;;
    3)
        run_tests "npx playwright test __tests__/e2e/playwright-mcp/tests/board-management.spec.ts --config=playwright.enhanced.config.ts" "Board Management Tests"
        ;;
    4)
        run_tests "npx playwright test __tests__/e2e/playwright-mcp/tests/asset-vault-management.spec.ts --config=playwright.enhanced.config.ts" "Asset & Vault Tests"
        ;;
    5)
        echo ""
        echo "🎨 Opening Playwright UI..."
        npx playwright test __tests__/e2e/playwright-mcp/tests/*.spec.ts --config=playwright.enhanced.config.ts --ui
        ;;
    6)
        echo ""
        echo "🐛 Running in Debug Mode..."
        npx playwright test __tests__/e2e/playwright-mcp/tests/*.spec.ts --config=playwright.enhanced.config.ts --debug
        ;;
    7)
        echo ""
        echo "🎬 Starting Playwright Codegen..."
        npx playwright codegen http://localhost:3000
        ;;
    8)
        echo -e "${GREEN}👋 Exiting...${NC}"
        # Kill dev server if we started it
        [ ! -z "$DEV_PID" ] && kill $DEV_PID 2>/dev/null
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
echo "   - HTML Report: playwright-report/index.html"
echo "   - JSON Results: test-results/results.json"
echo "   - MCP Analysis: __tests__/e2e/playwright-mcp/reports/mcp-results.json"
echo ""
echo "To view HTML report, run:"
echo -e "${GREEN}npx playwright show-report${NC}"

# Cleanup
[ ! -z "$DEV_PID" ] && kill $DEV_PID 2>/dev/null

echo ""
echo "✨ Done!"