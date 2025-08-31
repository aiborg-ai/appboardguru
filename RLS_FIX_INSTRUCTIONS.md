# 🚨 RLS Recursion Fix Required

## Current Status
The application's fallback mechanisms are working, but the main database queries are failing due to **infinite recursion in RLS policies**.

## ❌ The Problem
Your `organization_members` table has RLS policies that create a circular dependency:
- `organization_members` policy checks `organizations` table
- `organizations` policy checks `organization_members` table
- This creates infinite recursion

## ✅ The Solution

### Step 1: Open Supabase Dashboard
Go to your [Supabase Project Dashboard](https://supabase.com/dashboard)

### Step 2: Navigate to SQL Editor
Click on **SQL Editor** in the left sidebar

### Step 3: Run the Fix Script
1. Copy the **ENTIRE** contents of: `scripts/fix-rls-policies.sql`
2. Paste it into the SQL Editor
3. Click **Run** button
4. You should see success messages for each policy creation

### Step 4: Verify the Fix
Run this command to test:
```bash
npm run test:auth
```

You should see:
- ✅ Database queries working
- ✅ No recursion errors

## 📋 What the Script Does

The script replaces problematic circular policies with simple, safe ones:

**For `organization_members`:**
- Old: Complex policy that references organizations table
- New: Simple `auth.uid() = user_id` check

**For `organizations`:**
- Old: May have circular reference to organization_members
- New: Safe EXISTS check without recursion

## 🧪 Quick Test Commands

```bash
# Test authentication flow
npm run test:auth

# Test database queries
npm run test:db

# Check RLS status
npm run test:rls

# Check specific endpoints
curl http://localhost:3000/api/basic-health
curl http://localhost:3000/api/debug-env
```

## 📊 Expected Results After Fix

When RLS is fixed, `npm run test:auth` will show:
```
- Basic APIs: ✅ Working
- Fallback mechanism: ✅ Working
- Environment variables: ✅ Configured
- RLS Policies: ✅ Fixed
```

## ⚠️ Important Notes

1. **Don't modify policies manually** - Use the provided SQL script
2. **The script is safe** - It drops and recreates policies cleanly
3. **Service role bypasses RLS** - That's why some queries work
4. **Anon key uses RLS** - That's why user queries fail with recursion

## 🔍 How to Check Current Policies

In Supabase Dashboard:
1. Go to **Authentication** > **Policies**
2. Find tables: `organizations` and `organization_members`
3. Look for any policy that has complex JOINs or nested queries
4. These are likely causing the recursion

## 🚀 After Fixing

Once RLS is fixed:
1. Users can sign in successfully
2. Organizations list will load
3. New organizations can be created
4. All features will work properly

---

**File to run:** `scripts/fix-rls-policies.sql`
**Test command:** `npm run test:auth`