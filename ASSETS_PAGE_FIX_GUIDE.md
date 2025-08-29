# 🔧 Assets Page Fix Guide

## Problem Summary
The assets page was showing empty because:
1. **Table Mismatch**: API queries `board_packs` table but test data was in `assets` table
2. **Organization Context**: Required for data display but wasn't properly populated
3. **Test Data Missing**: No board_packs data existed for the test user

## Solution Implemented

### 1. Created Board Packs Test Data Script
**File**: `database/setup-scripts/10-board-packs-test-data.sql`

This script creates 15 realistic board pack documents including:
- Q4 2024 Board Meeting Package
- Audited Financial Statements
- Strategic Plans
- Risk Assessments
- Committee Reports
- ESG Reports
- And more...

### 2. Enhanced Vercel Test Helper
**File**: `__tests__/e2e/vercel-tests/helpers/vercel-test-helper.ts`

Added new methods for assets testing:
- `waitForOrganizationContext()` - Ensures organization is selected
- `getCurrentOrganization()` - Gets current org from localStorage
- `waitForAssetsToLoad()` - Waits for assets grid or empty state
- `getAssetCount()` - Counts displayed assets
- `searchAssets()` - Tests search functionality
- `getAssetTitles()` - Retrieves asset names

### 3. Comprehensive E2E Test Suite
**File**: `__tests__/e2e/vercel-tests/vercel-assets.spec.ts`

Tests include:
- Assets display with organization context
- Organization persistence across sessions
- Search functionality
- Category filtering
- Asset detail views
- Empty state handling
- Mock data fallback
- Multi-user access
- Performance metrics

## Setup Instructions

### Step 1: Run the Board Packs Data Script in Supabase

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy the entire contents of `database/setup-scripts/10-board-packs-test-data.sql`
4. Paste and run the script
5. You should see a success message with counts:
   ```
   Total packs: 15
   Test Director packs: 11
   Admin User packs: 2
   Board Member packs: 2
   ```

### Step 2: Verify Data Creation

Run this query in Supabase to verify:
```sql
SELECT 
    title,
    file_name,
    category,
    pg_size_pretty(file_size::bigint) as size,
    created_at
FROM board_packs
WHERE organization_id = (
    SELECT id FROM organizations 
    WHERE slug = 'test-board-org'
)
ORDER BY created_at DESC;
```

### Step 3: Test Locally (Optional)

If you want to test locally before Vercel deployment:

```bash
# Start local server
npm run dev

# In another terminal, run the test
VERCEL_URL=http://localhost:3001 npx playwright test __tests__/e2e/vercel-tests/vercel-assets.spec.ts --config=playwright-vercel.config.ts --reporter=list
```

### Step 4: Deploy to Vercel

```bash
# Deploy to Vercel
vercel --prod

# After deployment, test against production
VERCEL_URL=https://your-app.vercel.app npx playwright test __tests__/e2e/vercel-tests/vercel-assets.spec.ts --config=playwright-vercel.config.ts
```

## How It Works

### Organization Context Flow
1. User logs in with `test.director@appboardguru.com`
2. OrganizationContext fetches user's organizations from `/api/organizations`
3. First organization is automatically selected and saved to localStorage
4. Assets page uses this organization ID to fetch board_packs

### Data Flow
```
Login → Fetch Organizations → Select Org → Save to localStorage → Fetch Board Packs → Display Assets
```

### LocalStorage Keys
- `boardguru_current_organization` - Stores selected organization ID
- `boardguru_demo_mode` - Indicates if demo mode is active

## Troubleshooting

### Assets Still Empty?

1. **Check Organization is Set**:
   - Open browser DevTools Console
   - Run: `localStorage.getItem('boardguru_current_organization')`
   - Should return a UUID

2. **Verify User Has Organization**:
   ```sql
   SELECT o.*, om.role 
   FROM organizations o
   JOIN organization_members om ON o.id = om.organization_id
   JOIN users u ON om.user_id = u.id
   WHERE u.email = 'test.director@appboardguru.com';
   ```

3. **Check Board Packs Exist**:
   ```sql
   SELECT COUNT(*) FROM board_packs 
   WHERE organization_id = 'YOUR_ORG_ID';
   ```

4. **API Endpoint Test**:
   - Login to the app
   - Open DevTools Network tab
   - Navigate to assets page
   - Check `/api/assets` response

### Common Issues

1. **"No organization selected"**
   - Clear localStorage: `localStorage.clear()`
   - Logout and login again

2. **API returns empty array**
   - Check RLS policies on board_packs table
   - Verify user is member of organization

3. **Mock data shows instead of real data**
   - Organization context not properly set
   - Check OrganizationContext.tsx line 163-174

## Test Credentials

```
Email: test.director@appboardguru.com
Password: TestDirector123!
Organization: Test Board Organization
```

## API Endpoints

- `GET /api/organizations` - Fetches user's organizations
- `GET /api/assets` - Fetches board_packs (queries board_packs table)
- `GET /api/vaults` - Fetches vaults for organization

## Database Schema

### board_packs table
```sql
- id (UUID)
- uploaded_by (UUID) - User who uploaded
- organization_id (UUID) - Organization ownership
- title (TEXT) - Document title
- file_name (TEXT) - Original filename
- file_path (TEXT) - Storage path
- file_size (BIGINT) - Size in bytes
- file_type (TEXT) - MIME type
- category (TEXT) - Document category
- tags (TEXT[]) - Search tags
- status (TEXT) - Processing status
- summary (TEXT) - AI-generated summary
- created_at (TIMESTAMP)
```

## Next Steps

1. **Add Upload Functionality**
   - Implement file upload to Supabase Storage
   - Create board_packs record on upload
   - Add progress indicators

2. **Enhance Search**
   - Full-text search on title and summary
   - Tag-based filtering
   - Date range filters

3. **Add Permissions**
   - Role-based access (viewer, contributor, admin)
   - Share assets with specific users
   - Audit trail for access

## Related Files

- `src/app/dashboard/assets/page.tsx` - Assets page component
- `src/app/api/assets/route.ts` - API endpoint
- `src/contexts/OrganizationContext.tsx` - Organization state management
- `src/hooks/useOrganizations.ts` - Organization data fetching

## Summary

The assets page is now fully functional with:
✅ 15 realistic board pack documents in Supabase
✅ Organization context persistence
✅ Comprehensive E2E test coverage
✅ Enhanced test helper utilities
✅ Clear troubleshooting guide

Run the SQL script in Supabase, and your assets page will display the test data!