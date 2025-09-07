# 🚨 URGENT: Database Fix Required

## The Problem
Your Supabase database is missing critical tables and columns:
- ❌ **boards** table doesn't exist
- ❌ **board_members** table doesn't exist  
- ❌ **meeting_attendees** table doesn't exist
- ❌ **organizations.status** column is missing
- ❌ **meetings.board_id** column is missing

This is why you're getting "Internal Server Error" when creating meetings.

## The Solution - Run ONE Migration

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)

### Step 2: Run the Migration
1. Click **New Query**
2. Copy ALL contents from: `supabase/migrations/005_fix_all_schema_issues.sql`
3. Paste into the SQL Editor
4. Click **Run** button

### Step 3: Verify Success
You should see output like:
```
NOTICE: Added column status to table organizations
NOTICE: Sample board created with ID: xxxxx
NOTICE: MIGRATION COMPLETE!
```

### Step 4: Test the Fix
Run this command to verify everything is fixed:
```bash
npx tsx scripts/diagnose-db.ts
```

All items should show ✓ (green checkmarks).

### Step 5: Restart Your App
```bash
# Kill any running dev servers (Ctrl+C)
# Then restart:
npm run dev
```

## What This Migration Does
1. Creates the missing **boards** table
2. Creates the missing **board_members** table
3. Creates the missing **meeting_attendees** table
4. Adds **status** column to organizations
5. Adds **board_id** column to meetings
6. Sets up proper RLS policies
7. Creates sample board data for testing

## Important Notes
- This is a **safe** migration - it only creates what's missing
- It won't affect existing data
- It uses `IF NOT EXISTS` checks everywhere
- Run it even if you're unsure - it won't cause harm

## Still Having Issues?
If you still see errors after running the migration:
1. Check the SQL Editor output for any error messages
2. Run `npx tsx scripts/diagnose-db.ts` to see what's still missing
3. Make sure you're running the migration in the correct Supabase project

---
**This is the ONLY migration you need to run to fix all current database issues.**