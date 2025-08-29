# Approval Testing Guide - Debug & Fix

## 🔍 Test These URLs After Deployment (1-2 minutes)

### 1. Test Parameter Reception
First, test if your Vercel deployment can receive parameters at all:

```
https://app-boardguru.vercel.app/api/approve-test?id=123&token=abc
```

This should return JSON showing:
- `params.id`: "123" 
- `params.token`: "abc"

If this shows "NOT_FOUND", then Vercel isn't receiving the parameters.

### 2. Test Simple Approval
Test the simplified approval endpoint:

```
https://app-boardguru.vercel.app/api/approve-simple?id=d090d433-3575-4e4a-9e38-181caef43f24&token=4b2e4778db39a5b9f7114b8305117204
```

This returns JSON instead of redirecting, making it easier to debug.

### 3. Test Debug Endpoint
Get detailed information about what's happening:

```
https://app-boardguru.vercel.app/api/approve-registration-debug?id=d090d433-3575-4e4a-9e38-181caef43f24&token=4b2e4778db39a5b9f7114b8305117204
```

This shows:
- Environment variables
- Database connection status
- Registration details
- Exact error messages

### 4. Force Approval (If Needed)
If token is wrong but you need to approve:

```
https://app-boardguru.vercel.app/api/approve-registration-debug?id=d090d433-3575-4e4a-9e38-181caef43f24&token=anything&force=true
```

## 🐛 Common Issues & Solutions

### Issue: "Missing registration ID or security token"
**Cause**: Parameters not reaching the API route
**Solutions**:
1. Test with `/api/approve-test` endpoint first
2. Check if Vercel is stripping query parameters
3. Try URL encoding the entire query string

### Issue: "Request Not Found" 
**Cause**: Registration doesn't exist in database
**Solutions**:
1. Verify the registration ID is correct
2. Check if using the right database (production vs development)
3. Use debug endpoint to see exact database error

### Issue: "Invalid security token"
**Cause**: Token mismatch or expired
**Solutions**:
1. Resend approval email with fresh token
2. Use force=true parameter to bypass
3. Check if token was already used

## 🛠️ Quick Fixes

### Fix 1: Resend Approval Email
```bash
npx tsx src/scripts/resend-approval-for-production.ts
```

### Fix 2: Get Fresh Test URLs
```bash
npx tsx src/scripts/test-vercel-approval.ts
```

### Fix 3: Check Vercel Logs
```bash
vercel logs --follow
```
Or check in Vercel dashboard: Functions tab → View logs

### Fix 4: Test Locally First
```bash
# Start local server
npm run dev

# Test local approval
curl "http://localhost:3000/api/approve-test?id=123&token=abc"
```

## 📊 Debugging Checklist

1. [ ] Can `/api/approve-test` receive parameters?
2. [ ] Does `/api/approve-simple` find the registration?
3. [ ] What does `/api/approve-registration-debug` show?
4. [ ] Are Vercel env variables set correctly?
5. [ ] Is the registration in the database?
6. [ ] Is the token correct?
7. [ ] Has the registration already been processed?

## 🚨 If Nothing Works

### Nuclear Option 1: Direct Database Update
```sql
-- Run in Supabase SQL Editor
UPDATE registration_requests 
SET status = 'approved', reviewed_at = NOW()
WHERE email = 'user@example.com';
```

### Nuclear Option 2: Create User Manually
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. User can now login

### Nuclear Option 3: Bypass Approval System
Create a temporary admin route that approves without checks:
```typescript
// /api/force-approve/route.ts
export async function GET() {
  // Approve all pending registrations
  await supabaseAdmin
    .from('registration_requests')
    .update({ status: 'approved' })
    .eq('status', 'pending')
  
  return NextResponse.json({ message: 'All approved' })
}
```

## 📱 Contact for Help

If you're still stuck after trying everything:
1. Check Vercel Function logs for errors
2. Check browser console for client-side errors
3. Check network tab to see actual request/response

The issue is most likely:
- Query parameters being stripped by Vercel
- Database connection issues
- Environment variable misconfiguration

Try the test endpoints first - they'll tell you exactly what's wrong!