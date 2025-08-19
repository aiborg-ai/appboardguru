# 🔧 CRITICAL: Vercel Environment Variables Setup

## Root Cause of 404 Approval Link Errors

The approval links in emails were returning 404 errors because:
1. Local `.env.local` contained `APP_URL=http://localhost:3000`
2. This localhost URL was being used in production emails
3. Vercel deployment needs production-specific environment variables

## Required Vercel Environment Variables

### 🚨 CRITICAL - Set These in Vercel Dashboard

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add/Update these variables for **Production** environment:

```bash
# Application URL (CRITICAL - fixes approval links)
APP_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app

# Authentication URL
NEXTAUTH_URL=https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app

# Node Environment
NODE_ENV=production
```

### 🚫 AI Features Removed
- **No AI dependencies** - Anthropic SDK and all AI features have been removed
- **Simplified codebase** - Focus on core board management functionality
- **Faster deployment** - No external AI API dependencies

### ✅ Existing Variables (Already Set)
These should already be configured in Vercel:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pgeuvjihhfmzqymoygwb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hirendra.vikram@boardguru.ai
SMTP_PASS=zyzr hvkc tlwk jjqs

# Security
NEXTAUTH_SECRET=boardguru-secure-secret-key-2025
```

## How URL Detection Works

The `getAppUrl()` function follows this priority order:

1. **APP_URL** (if explicitly set) ← **Set this in Vercel**
2. **VERCEL_URL** (automatic Vercel variable) 
3. **NEXTAUTH_URL** (fallback)
4. **localhost:3000** (development only)

## After Setting Variables

1. **Redeploy** your application (automatic after environment variable changes)
2. **Test registration workflow**:
   - Submit new registration
   - Check approval email links
   - Click APPROVE - should now work correctly
   - See beautiful success page instead of 404

## Verification Commands

Test URL generation in production:
```bash
# In Vercel deployment logs, you should see:
# 🔗 URL Configuration:
#    App URL: https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app
#    Environment: production
#    VERCEL_URL: appboardguru-nuexkl4gi-h-viks-projects.vercel.app
#    APP_URL: https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app
```

## 🎯 Expected Result

✅ **Before Fix**: `http://localhost:3000/api/approve-registration?id=...` (404 error)

✅ **After Fix**: `https://appboardguru-nuexkl4gi-h-viks-projects.vercel.app/api/approve-registration?id=...` (works perfectly)

---

**Status**: Environment variables must be set in Vercel Dashboard manually.
**Next**: Test complete approval workflow after environment variable deployment.