# URGENT: Database Migration Required for Asset Uploads

## Problem
Asset uploads are failing because the `assets` table is missing the `organization_id` field that the application code expects.

## Solution
You need to run the following SQL migration in your Supabase Dashboard:

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New query**

### Step 2: Run the Migration
Copy and paste the contents of this file:
```
/database/migrations/20250103_add_organization_id_to_assets.sql
```

### Step 3: Execute the Query
1. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
2. You should see "Success" message
3. The migration adds:
   - `organization_id` column to assets table
   - `vault_id` column to assets table
   - Proper indexes for performance
   - Updated RLS policies

### Step 4: Verify the Migration
Run this query to verify:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN ('organization_id', 'vault_id');
```

You should see both columns listed.

### Step 5: Update Application Code
After the migration is applied:
1. Uncomment lines 858-859 in `/src/lib/repositories/asset.repository.enhanced.ts`
2. Regenerate Supabase types: `npm run db:generate`

## Alternative: Quick Fix (Temporary)
If you cannot run the migration immediately, the code has been updated to work without these fields temporarily. However, this is not recommended for production use.

## What the Migration Does
- Adds `organization_id` field to track which organization owns each asset
- Adds `vault_id` field to associate assets with specific vaults
- Creates proper indexes for fast queries
- Updates RLS policies to check organization membership
- Migrates existing assets to have organization_id from their owner's organization

## Error Messages You Might See
- "column assets.organization_id does not exist" - Migration not applied yet
- "null value in column organization_id" - Migration needed
- "permission denied for table assets" - RLS policies need updating

## Support
If you encounter issues:
1. Check that you're logged into Supabase as an admin
2. Ensure you're in the correct project
3. Try running the migration in smaller parts if it fails
4. Check Supabase logs for detailed error messages