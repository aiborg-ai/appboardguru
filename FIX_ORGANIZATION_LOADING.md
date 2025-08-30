# Fix Organization Loading for Test Director Account

## Problem Summary
The test director account (`test.director@appboardguru.com`) is not seeing pre-populated organizations in the vault creation wizard, even though the database setup scripts should create 10 organizations for this user.

## Root Causes Identified

### 1. Database Seeding Issue
- The `ORGANIZATION_SETUP_FIXED.sql` script exists and creates 10 organizations
- However, it may not have been executed on the current database instance
- Organizations created: GlobalTech Solutions, Executive Analytics Corp, Strategic Governance Inc, etc.

### 2. Data Relationship Requirements
- The system uses Row Level Security (RLS) policies
- Users can only see organizations where they have a membership entry in `organization_members` table
- The query requires both:
  - Organizations to exist in the `organizations` table
  - Corresponding entries in `organization_members` linking the user to those organizations

### 3. Current Query Location
- File: `/src/features/vaults/steps/OrganizationStep.tsx`
- Lines: 45-51
- Query structure is correct but may not be finding data

## Actionable Tasks

### Task 1: Add Debugging to OrganizationStep Component
**File:** `src/features/vaults/steps/OrganizationStep.tsx`

**Add after line 43 (before the query):**
```typescript
console.log('Loading organizations for user:', user.id, user.email);
```

**Add after line 51 (after the query):**
```typescript
console.log('Organization members query result:', {
  orgMembers,
  count: orgMembers?.length,
  raw: JSON.stringify(orgMembers, null, 2)
});
```

**Add in the error catch block (line 60):**
```typescript
console.error('Error loading organizations:', {
  error,
  userId: user?.id,
  userEmail: user?.email
});
```

### Task 2: Create a Seed Script for Test Organizations
**Create new file:** `src/scripts/seed-test-organizations.ts`

```typescript
import { createClient } from '@/lib/supabase-client';

export async function seedTestOrganizations() {
  const supabase = createClient();
  
  // Get the test director user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.email !== 'test.director@appboardguru.com') {
    console.error('Must be logged in as test.director@appboardguru.com');
    return;
  }

  const organizations = [
    {
      name: 'GlobalTech Solutions',
      slug: 'globaltech-solutions',
      description: 'Leading technology solutions provider for enterprise board management.',
      industry: 'Technology',
      organization_size: 'enterprise',
      website: 'https://globaltech-solutions.com'
    },
    {
      name: 'Executive Analytics Corp',
      slug: 'executive-analytics-corp',
      description: 'Data-driven insights and analytics platform for executive decision making.',
      industry: 'Healthcare',
      organization_size: 'large',
      website: 'https://executive-analytics-corp.com'
    },
    {
      name: 'Strategic Governance Inc',
      slug: 'strategic-governance-inc',
      description: 'Strategic consulting firm specializing in corporate governance best practices.',
      industry: 'Finance',
      organization_size: 'medium',
      website: 'https://strategic-governance-inc.com'
    }
    // Add more organizations as needed
  ];

  for (const org of organizations) {
    // Create organization
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        ...org,
        created_by: user.id,
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      continue;
    }

    // Add user as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: newOrg.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        invited_by: user.id,
        is_primary: organizations.indexOf(org) === 0
      });

    if (memberError) {
      console.error('Error adding member:', memberError);
    } else {
      console.log('Created organization:', org.name);
    }
  }
}
```

### Task 3: Create API Endpoint for Seeding (Development Only)
**Create new file:** `src/app/api/seed-organizations/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if user already has organizations
  const { data: existingMemberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id);

  if (existingMemberships && existingMemberships.length > 0) {
    return NextResponse.json({ 
      message: 'User already has organizations',
      count: existingMemberships.length 
    });
  }

  // Seed organizations
  const organizations = [
    // ... (same array as in the seed script)
  ];

  let created = 0;
  for (const org of organizations) {
    // Create organization and membership
    // ... (same logic as seed script)
    created++;
  }

  return NextResponse.json({ 
    success: true, 
    message: `Created ${created} organizations` 
  });
}
```

### Task 4: Add UI Button for Manual Seeding (Dev Mode)
**File:** `src/features/vaults/steps/OrganizationStep.tsx`

**Add after line 108 (inside the main div, before the search box):**
```typescript
{process.env.NODE_ENV === 'development' && organizations.length === 0 && (
  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <p className="text-sm text-yellow-800 mb-2">
      No organizations found. This might be because the test data hasn't been seeded.
    </p>
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        const response = await fetch('/api/seed-organizations', {
          method: 'POST'
        });
        const data = await response.json();
        console.log('Seed result:', data);
        loadOrganizations(); // Refresh the list
      }}
    >
      Seed Test Organizations
    </Button>
  </div>
)}
```

### Task 5: Run Database Migration Script Manually
**If the above doesn't work, run this SQL directly in Supabase SQL Editor:**

```sql
-- Check if test director exists
SELECT id, email FROM auth.users WHERE email = 'test.director@appboardguru.com';

-- If user exists, check their organizations
SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    om.status
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.user_id = (SELECT id FROM auth.users WHERE email = 'test.director@appboardguru.com');

-- If no organizations, create them
DO $$
DECLARE
    director_user_id UUID;
    org_id UUID;
BEGIN
    -- Get the test director user ID
    SELECT id INTO director_user_id 
    FROM auth.users 
    WHERE email = 'test.director@appboardguru.com';
    
    IF director_user_id IS NOT NULL THEN
        -- Create first organization
        INSERT INTO organizations (
            name, slug, description, website, industry, 
            organization_size, created_by, is_active
        ) VALUES (
            'GlobalTech Solutions',
            'globaltech-solutions',
            'Leading technology solutions provider for enterprise board management.',
            'https://globaltech-solutions.com',
            'Technology',
            'enterprise',
            director_user_id,
            true
        ) RETURNING id INTO org_id;
        
        -- Add user as owner
        INSERT INTO organization_members (
            organization_id, user_id, role, status, 
            invited_by, is_primary
        ) VALUES (
            org_id, director_user_id, 'owner', 'active',
            director_user_id, true
        );
        
        RAISE NOTICE 'Created organization for test director';
    END IF;
END $$;
```

## Testing Steps

1. **Check Current State:**
   - Log in as `test.director@appboardguru.com`
   - Open browser console
   - Navigate to vault creation
   - Check console for debug logs

2. **If No Organizations Appear:**
   - Run the SQL script in Supabase SQL Editor
   - Or use the "Seed Test Organizations" button (if in dev mode)
   - Refresh the page

3. **Verify Fix:**
   - Organizations should now appear in the selection
   - User should be able to select an organization
   - Proceed with vault creation

## Additional Notes

- The issue is likely that the database wasn't properly seeded with test data
- RLS policies are working correctly - they just need the proper data relationships
- The query structure in the component is correct
- This is a data issue, not a code issue

## Files Referenced
- `/src/features/vaults/steps/OrganizationStep.tsx` - Component loading organizations
- `/home/vik/appboardguru2/ORGANIZATION_SETUP_FIXED.sql` - Original seed script
- Database tables: `organizations`, `organization_members`

---
*Created: August 30, 2025*
*Issue: Test director not seeing organizations in vault creation wizard*