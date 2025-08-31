# Test Director Account Analysis

## Date: August 31, 2025

## Issue
Test director account (test.director@appboardguru.com) cannot see organizations in the UI despite having them in the database.

## Investigation Findings

### 1. Demo Mode Logic
**Location**: `/src/contexts/DemoContext.tsx`

Demo mode is determined by:
- URL parameter: `?demo=true`
- localStorage: `boardguru_demo_mode=true`  
- Path-based: URLs starting with `/demo`
- Dashboard path with demo parameter

**Important**: Demo mode is NOT determined by user email. There's no hardcoded check that makes test.director@appboardguru.com a demo user.

### 2. Test Director Special Handling
**Location**: `/src/contexts/OrganizationContext.tsx` (lines 177-180)

```typescript
// Check if this is the test director account
if (user.email === 'test.director@appboardguru.com') {
  setIsTestDirector(true)
}
```

**Key Behavior**:
- Test director is NOT treated as a demo user
- Gets `isTestDirector = true` flag
- Should use REAL organizations from database
- Prefers "Fortune 500 Companies" as default organization

### 3. Data Source Problem (ROOT CAUSE)
**Location**: `/src/contexts/OrganizationContext.tsx` (lines 140-160)

```typescript
// Use demo organizations or real organizations based on mode
// Skip the hook entirely in demo mode to prevent API calls
// Note: Test director now uses real organizations to enable uploads
const { 
  data: realOrganizations = [], 
  isLoading: isLoadingRealOrganizations,
  refetch: refetchOrganizations
} = useUserOrganizations(isDemoMode ? '' : userId)

// Use demo organizations ONLY in demo mode
// Test director uses real organizations to enable actual uploads
const organizations = isDemoMode
  ? demoOrganizations.map(org => ({...}))
  : realOrganizations
```

**The Problem**: 
- When `isDemoMode` is false, test director gets real organizations
- But the `useUserOrganizations` hook is called with userId
- If there's any caching or session issue, this might not return data properly

### 4. Database Status
Running `npx tsx scripts/fix-test-director-organizations.ts` shows:
- Test director has 6 organizations in database
- All with "owner" role and "active" status
- Organizations exist and memberships are correct

### 5. API Query Issue
**Location**: `/src/app/api/organizations/simple/route.ts`

The API queries:
```sql
FROM organization_members
  .select(`organizations(...)`)
  .eq('user_id', user.id)
  .eq('status', 'active')
```

This should work, but may fail if:
- Session user.id doesn't match database user_id
- React Query cache is stale
- There's a mismatch between auth.users and organization_members

## Hypothesis

The issue is likely one of these:

1. **Session/Auth Mismatch**: The user ID from `supabase.auth.getUser()` might not match the user_id in organization_members table

2. **React Query Caching**: The `useUserOrganizations` hook might be caching empty results

3. **Demo Mode Interference**: Even though test director shouldn't be in demo mode, there might be edge cases where `isDemoMode` is true

4. **Hybrid Data Confusion**: The comment "Test director now uses real organizations to enable uploads" suggests there was a previous hybrid approach that might still have remnants

## Recommended Solution

1. **Remove ALL special handling for test director**
   - Treat it as a regular authenticated user
   - No `isTestDirector` flag
   - No special demo/real data logic

2. **Ensure pure database access**
   - Always use real Supabase queries
   - No demo data fallbacks
   - Clear React Query cache on login

3. **Verify auth consistency**
   - Check that auth.users.id matches organization_members.user_id
   - Ensure session is properly established

4. **Test organization creation**
   - Creating a new organization from UI will verify if real database operations work
   - This will bypass any caching issues

## Next Steps

1. Try creating a new organization from the UI (this will test if the real database connection works)
2. Remove special test director handling in OrganizationContext.tsx
3. Clear all caches (browser, React Query, localStorage)
4. If still not working, check auth.users vs organization_members user_id consistency