#!/bin/bash

# Check Vercel deployment status
echo "🚀 Vercel Deployment Status Check"
echo "================================="
echo ""

# Your Vercel app URL
VERCEL_URL="https://app-boardguru-i69zkb3zn-h-viks-projects.vercel.app"

echo "Checking deployment at: $VERCEL_URL"
echo ""

# Check basic health endpoint
echo "1. Testing Basic Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$VERCEL_URL/api/basic-health" 2>/dev/null)
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$HEALTH_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ Basic health check: OK"
    echo "   Response: $BODY"
else
    echo "   ❌ Basic health check failed (HTTP $HTTP_STATUS)"
fi
echo ""

# Check fallback endpoint
echo "2. Testing Fallback Endpoint..."
FALLBACK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$VERCEL_URL/api/organizations/fallback" 2>/dev/null)
HTTP_STATUS=$(echo "$FALLBACK_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$FALLBACK_RESPONSE" | grep -v "HTTP_STATUS")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ Fallback endpoint: OK"
    if [ "$BODY" = "[]" ]; then
        echo "   Response: Empty array (correct)"
    else
        echo "   Response: $BODY"
    fi
else
    echo "   ❌ Fallback endpoint failed (HTTP $HTTP_STATUS)"
fi
echo ""

# Check debug environment endpoint
echo "3. Testing Debug Environment..."
DEBUG_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$VERCEL_URL/api/debug-env" 2>/dev/null)
HTTP_STATUS=$(echo "$DEBUG_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "503" ]; then
    echo "   ✅ Debug endpoint responding"
    
    # Check if Supabase is configured
    if echo "$DEBUG_RESPONSE" | grep -q '"hasSupabaseUrl":true'; then
        echo "   ✅ Supabase URL configured"
    else
        echo "   ❌ Supabase URL NOT configured"
    fi
    
    if echo "$DEBUG_RESPONSE" | grep -q '"hasSupabaseKey":true'; then
        echo "   ✅ Supabase Key configured"
    else
        echo "   ❌ Supabase Key NOT configured"
    fi
    
    if echo "$DEBUG_RESPONSE" | grep -q '"clientCreation":"success"'; then
        echo "   ✅ Supabase client creation successful"
    else
        echo "   ⚠️  Supabase client creation issues"
    fi
else
    echo "   ❌ Debug endpoint failed (HTTP $HTTP_STATUS)"
fi
echo ""

echo "================================="
echo "📊 Deployment Summary:"
echo ""
echo "If all checks pass:"
echo "  ✅ Deployment successful!"
echo "  ✅ Environment variables configured"
echo "  ✅ APIs are working"
echo ""
echo "If any checks fail:"
echo "  1. Check Vercel dashboard for build logs"
echo "  2. Verify environment variables are set"
echo "  3. Check https://vercel.com/dashboard for deployment status"
echo ""
echo "Vercel Dashboard: https://vercel.com/dashboard"
echo "GitHub Repo: https://github.com/BoardGuruHV/appboardguru"