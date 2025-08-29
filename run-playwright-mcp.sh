#!/bin/bash

# Simple Playwright MCP Test Runner
echo "🎭 Playwright MCP E2E Tests for AppBoardGuru"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Set BASE_URL to port 3001 (where your dev server is running)
export BASE_URL=http://localhost:3001

# Menu
echo "Select test suite to run:"
echo ""
echo "  1) Standalone Tests (No Auth Required)"
echo "  2) All MCP Tests (Requires Auth Setup)"
echo "  3) Authentication Tests"
echo "  4) Board Management Tests"
echo "  5) Asset & Vault Tests"
echo "  6) Open Playwright UI"
echo "  7) Run in Debug Mode"
echo "  8) Exit"
echo ""
read -p "Enter choice (1-8): " choice

case $choice in
  1)
    echo -e "\n${GREEN}Running Standalone Tests...${NC}\n"
    npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts \
      --config=playwright-mcp.config.ts \
      --project=chromium
    ;;
  2)
    echo -e "\n${GREEN}Running All MCP Tests...${NC}\n"
    npx playwright test \
      --config=playwright-mcp.config.ts \
      --project=chromium
    ;;
  3)
    echo -e "\n${GREEN}Running Authentication Tests...${NC}\n"
    npx playwright test __tests__/e2e/playwright-mcp/tests/auth-flow.spec.ts \
      --config=playwright-mcp.config.ts \
      --project=chromium
    ;;
  4)
    echo -e "\n${GREEN}Running Board Management Tests...${NC}\n"
    npx playwright test __tests__/e2e/playwright-mcp/tests/board-management.spec.ts \
      --config=playwright-mcp.config.ts \
      --project=chromium
    ;;
  5)
    echo -e "\n${GREEN}Running Asset & Vault Tests...${NC}\n"
    npx playwright test __tests__/e2e/playwright-mcp/tests/asset-vault-management.spec.ts \
      --config=playwright-mcp.config.ts \
      --project=chromium
    ;;
  6)
    echo -e "\n${GREEN}Opening Playwright UI...${NC}\n"
    npx playwright test \
      --config=playwright-mcp.config.ts \
      --ui
    ;;
  7)
    echo -e "\n${GREEN}Running in Debug Mode...${NC}\n"
    npx playwright test __tests__/e2e/playwright-mcp/tests/standalone-test.spec.ts \
      --config=playwright-mcp.config.ts \
      --project=chromium \
      --debug
    ;;
  8)
    echo -e "${GREEN}Exiting...${NC}"
    exit 0
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ Test execution complete!${NC}"
echo ""
echo "View HTML report with:"
echo "  npx playwright show-report"
echo ""