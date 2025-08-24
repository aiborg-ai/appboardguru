#!/bin/bash
set -e

# Simple deployment script for BoardGuru MCP Demo
# Creates a deployable package that can be uploaded to any platform

echo "📦 Creating deployable package for BoardGuru MCP Demo"
echo "===================================================="

# Create deployment directory
DEPLOY_DIR="boardguru-demo-deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy essential files
echo "📁 Copying demo files..."
cp -r demo/ "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp .env.local "$DEPLOY_DIR/" 2>/dev/null || echo "No .env.local found"

# Copy deployment configs
echo "⚙️  Copying deployment configurations..."
cp deploy/vercel.json "$DEPLOY_DIR/"
cp deploy/netlify.toml "$DEPLOY_DIR/"

# Create simple package.json for deployment
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "boardguru-mcp-demo",
  "version": "1.0.0",
  "description": "BoardGuru MCP Demo - AI-powered governance intelligence",
  "main": "demo/demo-server.cjs",
  "scripts": {
    "start": "node demo/demo-server.cjs",
    "dev": "node demo/demo-server.cjs"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "engines": {
    "node": "18.x"
  }
}
EOF

# Create simple .env file
cat > "$DEPLOY_DIR/.env" << EOF
NODE_ENV=production
PORT=3000
DEMO_MODE=true
NEXT_PUBLIC_APP_URL=https://demo.boardguru.ai
EOF

# Create README for deployment
cat > "$DEPLOY_DIR/README.md" << 'EOF'
# BoardGuru MCP Demo Deployment

This package contains the BoardGuru MCP demo ready for deployment.

## Quick Deploy Options

### Option 1: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Follow prompts to connect domain

### Option 2: Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Configure domain in Netlify dashboard

### Option 3: Manual Upload
Upload this entire directory to your hosting provider.

## Environment Variables
- NODE_ENV=production
- DEMO_MODE=true
- PORT=3000

## Domain Configuration
Point demo.boardguru.ai to your deployment URL.

## Support
Email: mcp-support@appboardguru.com
EOF

echo "✅ Deployment package created in: $DEPLOY_DIR"
echo ""
echo "📋 Next steps:"
echo "1. cd $DEPLOY_DIR"
echo "2. Choose deployment option:"
echo "   - Vercel: vercel --prod"
echo "   - Netlify: netlify deploy --prod"
echo "   - Manual: Upload folder to hosting provider"
echo ""
echo "🌐 Configure DNS:"
echo "   - Type: CNAME"
echo "   - Name: demo"
echo "   - Value: [your-deployment-url]"
echo ""
echo "🎉 Ready for deployment!"