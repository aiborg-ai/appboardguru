# Fix Annotation Saving Issue - Database Migration Required

## Problem Identified
The annotation saving is failing because the `asset_annotations` table is missing critical columns:
1. `created_by` column (foreign key to users table)
2. Proper foreign key relationships

## Error Messages
- "Could not find a relationship between 'asset_annotations' and 'users'"
- "column asset_annotations.created_by does not exist"

## Solution
Run the SQL migration script in your Supabase dashboard to add the missing columns.

## Steps to Apply the Fix

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

2. **Run the Migration Script**
   - Copy the entire contents of `fix-annotation-columns.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute

3. **Verify the Migration**
   The script will:
   - Add `created_by` and `organization_id` columns if missing
   - Create foreign key relationships
   - Update RLS policies
   - Show a success message when complete

4. **Test Annotation Creation**
   After running the migration:
   ```bash
   # Run the test script to verify everything works
   npx tsx test-annotation-api.ts
   ```

## What the Migration Does

1. **Adds missing columns**:
   - `created_by` (UUID) - links to auth.users table
   - `organization_id` (UUID) - links to organizations table

2. **Creates foreign key constraints**:
   - Links `created_by` to `auth.users(id)`
   - Links `organization_id` to `organizations(id)`

3. **Updates RLS policies**:
   - Users can view their own annotations
   - Users can view public annotations
   - Users can only create/update/delete their own annotations

4. **Adds indexes** for better query performance

## Expected Result
After running the migration, annotations should save successfully with:
- Proper user attribution
- Organization tracking
- Working RLS policies

## Troubleshooting
If you see any errors:
1. Make sure you're connected to the correct database
2. Check that the auth.users table exists
3. Verify you have at least one user in the database

## Files Created
- `fix-annotation-columns.sql` - Main migration script to run
- `database/migrations/20250904_add_created_by_column.sql` - Detailed migration for created_by
- `database/migrations/20250904_add_organization_id_column.sql` - Detailed migration for organization_id