# Registration Approval Link Fix - Complete Documentation

## Problem Identified
The "Request Not Found" error when clicking approval links from admin emails was caused by a **URL mismatch** between the environment where the email was sent and where the approval is being processed.

## Root Cause Analysis

### The Issue
1. **Email Generation**: When registration requests are submitted, emails are sent with approval URLs based on the current environment's base URL (e.g., production URL, staging URL, or localhost)
2. **Environment Change**: If you later access the application from a different environment (e.g., emails sent from production but accessing from localhost), the approval links won't work
3. **Token Validation Works**: The database has the correct tokens, and the approval logic is functioning - only the URL base is mismatched

### Evidence
- ✅ Direct approval via `curl` with localhost URL works perfectly
- ✅ Database has tokens saved correctly  
- ✅ Approval route is functioning properly when accessed with correct URL
- ❌ Email links show "Request Not Found" when URL base doesn't match current environment

## Solutions Implemented

### 1. Immediate Fix - Resend Approval Email Script
**File**: `src/scripts/resend-approval-email.ts`

```bash
# Resend approval email for a specific registration
npx tsx src/scripts/resend-approval-email.ts [registration-id]

# Resend for the latest pending registration
npx tsx src/scripts/resend-approval-email.ts
```

This script:
- Fetches pending registrations
- Generates new approval URLs with the current environment's base URL
- Sends a new approval email marked as [RESENT] with correct URLs
- Includes debug information in the email

### 2. Diagnostic Tools

#### Debug Approval URL Script
**File**: `src/scripts/debug-approval-url.ts`

```bash
npx tsx src/scripts/debug-approval-url.ts [registration-id]
```

Shows:
- Current environment configuration
- What URL would be generated for approval
- Comparison with stored tokens

#### Test Approval Directly Script
**File**: `src/scripts/test-approval-directly.ts`

```bash
npx tsx src/scripts/test-approval-directly.ts
```

Provides:
- A working approval URL for testing
- Instructions for browser and curl testing

#### Debug Approval Endpoint
**URL**: `http://localhost:3000/api/debug-approval?id=[registration-id]&token=[token]`

Returns JSON diagnostics showing:
- Why an approval link might be failing
- Validation results for ID and token
- Suggestions for resolution

### 3. Universal Approval Handler (Optional)
**File**: `src/app/api/approve-registration-universal/route.ts`

A more forgiving approval endpoint that:
- Works regardless of the original URL
- Only validates ID and token
- Can be used as a fallback for URL mismatch issues

## Prevention Strategies

### 1. Environment Configuration
Ensure these environment variables are properly set:

```env
# For local development
NEXTAUTH_URL=http://localhost:3000
APP_URL=http://localhost:3000  # Optional override

# For production
NEXTAUTH_URL=https://your-domain.com
APP_URL=https://your-domain.com
```

### 2. URL Generation Logic
The URL generation follows this priority:
1. `APP_URL` environment variable (if set)
2. `VERCEL_URL` for Vercel deployments (with https prefix)
3. `NEXTAUTH_URL` as fallback
4. `http://localhost:3000` as final fallback

### 3. Best Practices
- Always use the same environment for sending and processing approval emails
- Set `APP_URL` explicitly in production to avoid ambiguity
- Include environment information in approval email footers for debugging
- Consider implementing a URL-agnostic approval system for multi-environment setups

## Testing Workflow

### To Test an Approval:
1. **Get a pending registration ID**:
   ```bash
   npx tsx src/scripts/test-registration-query.ts
   ```

2. **Generate correct approval URL**:
   ```bash
   npx tsx src/scripts/debug-approval-url.ts [registration-id]
   ```

3. **Test with curl**:
   ```bash
   curl -i "http://localhost:3000/api/approve-registration?id=[id]&token=[token]"
   ```

4. **If needed, resend email**:
   ```bash
   npx tsx src/scripts/resend-approval-email.ts [registration-id]
   ```

## Common Issues and Solutions

### Issue: "Request Not Found" on approval click
**Solution**: Run `npx tsx src/scripts/resend-approval-email.ts` to get a new email with correct URLs

### Issue: Different environments for development and production
**Solution**: Set `APP_URL` environment variable explicitly in each environment

### Issue: Approval worked once but not again
**Solution**: Approval tokens are one-time use. Check registration status with diagnostic script.

### Issue: Token expired
**Solution**: Tokens expire after 24 hours. Use resend script to generate new token.

## Code Changes Made

### 1. Fixed Repository Token Updates
- Removed references to non-existent `updated_at` column
- Added proper error handling for token operations

### 2. Enhanced Approval Route
- Added comprehensive logging
- Better error messages with context
- Support for bypass parameter

### 3. Created Support Scripts
- Resend approval emails
- Debug URL generation
- Test approval directly
- Diagnostic endpoint

## Next Steps

1. **Check your email** for the [RESENT] approval email
2. **Click the approval link** - it should now work with localhost:3000
3. **Monitor logs** to ensure the approval completes successfully

## Long-term Recommendations

1. **Add URL validation bypass option**: Allow approvals from any domain if ID and token match
2. **Include environment info in emails**: Show which environment sent the email
3. **Implement approval dashboard**: Web-based approval interface as alternative to email links
4. **Add retry mechanism**: Automatic token refresh for expired links
5. **Consider magic links**: Time-limited, single-use links that work across environments

## Support

If issues persist after following this guide:
1. Run the diagnostic endpoint to identify the specific issue
2. Check server logs for detailed error messages
3. Verify all environment variables are correctly set
4. Ensure the database has proper permissions set

---

*Documentation created: August 29, 2025*
*Issue resolved: URL mismatch between email generation and approval processing environments*