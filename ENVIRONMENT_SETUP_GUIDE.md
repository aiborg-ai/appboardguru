# Environment Setup Guide - Fixing Approval Link Issues

## The Problem
Your approval emails are being sent with production URLs (`https://app-boardguru.vercel.app/`) but your registration data might be in a different database (local development).

## Solution 1: Use Same Database Everywhere (Recommended)

### In Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Set these variables to match your local `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://pgeuvjihhfmzqymoygwb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Configuration
ADMIN_EMAIL=hirendra.vikram@boardguru.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hirendra.vikram@boardguru.ai
SMTP_PASS="zyzr hvkc tlwk jjqs"

# IMPORTANT: Set the APP_URL to your Vercel URL
APP_URL=https://app-boardguru.vercel.app
```

## Solution 2: Environment-Specific URLs

### For Local Development (.env.local):
```env
APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

### For Production (Vercel):
```env
APP_URL=https://app-boardguru.vercel.app
NEXTAUTH_URL=https://app-boardguru.vercel.app
```

## Solution 3: Universal Approval Handler

Create an approval endpoint that works regardless of environment:

1. The approval route should accept registrations from any environment
2. Use the service role key to bypass RLS
3. Validate only the ID and token, not the URL origin

## Quick Fixes When Stuck

### Option A: Resend with Correct URL
```bash
# For local development
npx tsx src/scripts/resend-approval-email.ts [registration-id]

# For production
npx tsx src/scripts/resend-approval-for-production.ts [registration-id]
```

### Option B: Direct Database Approval
```sql
-- Run in Supabase SQL Editor to manually approve
UPDATE registration_requests 
SET 
  status = 'approved',
  reviewed_at = NOW(),
  approval_token = NULL
WHERE email = 'user@example.com';
```

### Option C: Use Debug Endpoint
Visit: `https://app-boardguru.vercel.app/api/debug-approval?id=[registration-id]&token=[token]`
This will tell you exactly what's wrong.

## Best Practices

1. **Development**: Always use localhost URLs
2. **Staging**: Use staging URLs with staging database
3. **Production**: Use production URLs with production database
4. **Testing**: Use the resend scripts to generate environment-specific emails

## Verification Steps

1. **Check Current Environment**:
```bash
npx tsx src/scripts/verify-env.ts
```

2. **Test Approval Flow**:
```bash
npx tsx src/scripts/test-approval-directly.ts
```

3. **Debug Failed Approval**:
```bash
npx tsx src/scripts/debug-approval-url.ts [registration-id]
```

## Common Issues and Solutions

### "Request Not Found" Error
- **Cause**: URL mismatch between email and current environment
- **Fix**: Use resend script for correct environment

### Token Invalid
- **Cause**: Token expired or already used
- **Fix**: Generate new token with resend script

### Database Not Found
- **Cause**: Different databases for different environments  
- **Fix**: Ensure all environments use same Supabase project

## Emergency Bypass

If you need to approve immediately and nothing else works:

1. **Create user directly in Supabase Auth Dashboard**
2. **Update registration status manually**:
```sql
UPDATE registration_requests SET status = 'approved' WHERE email = 'user@email.com';
```
3. **Send welcome email manually**

---

**Remember**: The key is ensuring your email generation environment matches where you're trying to approve from!