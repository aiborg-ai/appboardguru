#!/bin/bash

# Clean webpack cache script
# This script cleans webpack cache and fixes common build issues

echo "🧹 Starting webpack cache cleanup..."

# Stop any running dev servers
echo "📦 Stopping any running Next.js processes..."
pkill -f "next dev" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

# Remove .next directory
if [ -d ".next" ]; then
    echo "🗑️  Removing .next directory..."
    rm -rf .next
fi

# Remove node_modules cache
if [ -d "node_modules/.cache" ]; then
    echo "🗑️  Removing node_modules cache..."
    rm -rf node_modules/.cache
fi

# Remove webpack specific cache
if [ -d ".next/cache" ]; then
    echo "🗑️  Removing webpack cache..."
    rm -rf .next/cache
fi

# Remove any temp files
echo "🗑️  Removing temporary files..."
find . -name "*.hot-update.*" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# Clear npm cache
echo "📦 Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

# Fix permissions
echo "🔧 Fixing file permissions..."
chmod -R 755 .next 2>/dev/null || true
chmod -R 755 node_modules 2>/dev/null || true

# Create cache directories with proper permissions
echo "📁 Creating cache directories..."
mkdir -p .next/cache/webpack
mkdir -p .next/cache/webpack-prod
chmod -R 755 .next/cache

echo "✅ Cache cleanup complete!"
echo ""
echo "You can now run:"
echo "  npm run dev    - for development"
echo "  npm run build  - for production build"
echo ""