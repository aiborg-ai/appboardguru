#!/bin/bash

echo "🚀 Checking Vercel Deployment Status"
echo "===================================="
echo ""

# Get the latest commit hash
COMMIT_HASH=$(git rev-parse HEAD | head -c 7)
echo "📦 Latest commit: $COMMIT_HASH"
echo ""

# Check if site is accessible
echo "🔍 Checking site availability..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://appboardguru.vercel.app/)

if [ "$RESPONSE" == "200" ]; then
    echo "✅ Site is live and accessible!"
    echo ""
    echo "🌐 URL: https://appboardguru.vercel.app/"
    echo ""
    echo "📝 Next steps:"
    echo "1. Apply the database migration in Supabase Dashboard"
    echo "2. Test the upload functionality"
else
    echo "⏳ Site returned status code: $RESPONSE"
    echo "   Deployment might still be in progress..."
    echo ""
    echo "Check deployment status at:"
    echo "https://vercel.com/boardguruhv/appboardguru"
fi

echo ""
echo "===================================="
echo "📋 Migration reminder:"
echo "You MUST apply the migration before uploads will work!"
echo "File: database/migrations/20250104_fix_assets_table_columns.sql"