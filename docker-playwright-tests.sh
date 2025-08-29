#!/bin/bash

# Docker-based Playwright Test Runner for AppBoardGuru
# This runs tests in a Docker container with all dependencies pre-installed

echo "🐳 Docker Playwright Test Runner"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✅ Docker is available"
echo ""

# Create a Dockerfile for Playwright tests
cat > Dockerfile.playwright << 'EOF'
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit

# Set environment variables
ENV CI=false
ENV NODE_ENV=test

# Default command
CMD ["npm", "test"]
EOF

echo "📦 Building Docker image..."
docker build -f Dockerfile.playwright -t appboardguru-playwright-tests . || {
    echo "❌ Failed to build Docker image"
    exit 1
}

echo ""
echo "🚀 Running tests in Docker container..."
echo ""

# Run tests in Docker
docker run --rm \
    -v "$(pwd):/app" \
    -v /app/node_modules \
    --network host \
    -e BASE_URL=http://localhost:3000 \
    -e NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    -e NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    appboardguru-playwright-tests \
    npx playwright test __tests__/e2e/playwright-mcp/tests/*.spec.ts --config=playwright.enhanced.config.ts

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Tests completed successfully!"
else
    echo ""
    echo "❌ Some tests failed. Check the report for details."
fi

# Copy results from container
echo ""
echo "📊 Test results saved to:"
echo "   - playwright-report/"
echo "   - test-results/"

# Clean up
rm -f Dockerfile.playwright

echo ""
echo "✨ Done!"