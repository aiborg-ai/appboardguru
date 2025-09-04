# Step-by-Step Supabase Database Migration Guide

## 📋 Prerequisites
- Access to your Supabase Dashboard
- Admin privileges on the database
- Project ID: `pgeuvjihhfmzqymoygwb`

---

## 🚀 Step-by-Step Instructions

### Step 1: Access Supabase Dashboard
1. Open your browser and go to: **https://app.supabase.com**
2. Log in with your Supabase credentials
3. Select your project: **`pgeuvjihhfmzqymoygwb`**

### Step 2: Navigate to SQL Editor
1. In the left sidebar, click on **"SQL Editor"** (it has a database icon)
2. Once in SQL Editor, click the **"New query"** button (usually a + icon or "New" button)

### Step 3: Copy the Migration Script
1. Open the file: `/database/migrations/20250103_PRODUCTION_MIGRATION.sql`
2. Select ALL the content (Ctrl+A or Cmd+A)
3. Copy it (Ctrl+C or Cmd+C)

### Step 4: Paste and Run the Migration
1. In the Supabase SQL Editor, paste the entire script
2. Review that all content is pasted (should be about 308 lines)
3. Click the **"Run"** button (or press Ctrl+Enter on Windows / Cmd+Enter on Mac)
4. Wait for execution to complete (usually 5-10 seconds)

### Step 5: Check for Success
You should see one of these messages:
- ✅ **"Success. No rows returned"** - This is GOOD!
- ✅ **"Query executed successfully"** - This is GOOD!
- ❌ If you see any errors, stop and note them down

---

## ✅ Verification Steps (IMPORTANT!)

After the migration completes, run these verification queries ONE BY ONE:

### Verification Query 1: Check New Tables
```sql
-- Check if the 3 new tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('asset_annotations', 'annotation_replies', 'vault_assets');
```

**Expected Result:** You should see 3 rows:
- asset_annotations
- annotation_replies  
- vault_assets

### Verification Query 2: Check New Columns
```sql
-- Check if new columns were added to assets table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'assets' 
AND column_name IN ('attribution_status', 'document_type');
```

**Expected Result:** You should see 2 rows:
- attribution_status
- document_type

### Verification Query 3: Check RLS Policies
```sql
-- Check Row Level Security policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('asset_annotations', 'annotation_replies', 'vault_assets')
ORDER BY tablename, policyname;
```

**Expected Result:** You should see multiple policy rows for each table

### Verification Query 4: Check Functions
```sql
-- Check if helper functions were created
SELECT proname 
FROM pg_proc 
WHERE proname IN ('get_asset_annotation_count', 'can_user_annotate_asset');
```

**Expected Result:** You should see 2 rows:
- get_asset_annotation_count
- can_user_annotate_asset

---

## 🔍 What This Migration Does

### 1. **Adds New Columns to Assets Table**
   - `attribution_status` - Tracks document attribution status (pending/partial/complete)
   - `document_type` - Categorizes document types

### 2. **Creates New Tables**
   - `asset_annotations` - Stores annotations on documents
   - `annotation_replies` - Stores replies to annotations (collaborative feature)
   - `vault_assets` - Links assets to vaults for organization

### 3. **Sets Up Security**
   - Enables Row Level Security (RLS) on new tables
   - Creates policies so users can only see/edit their own data
   - Ensures data privacy between organizations

### 4. **Adds Performance Indexes**
   - Creates indexes for faster queries
   - Optimizes lookups by user_id, asset_id, vault_id

### 5. **Creates Helper Functions**
   - Functions to count annotations
   - Functions to check user permissions

---

## ⚠️ Troubleshooting

### If you get an error about missing tables:
- Make sure you have the `assets`, `organizations`, `vaults`, and `vault_members` tables
- These should already exist from previous migrations

### If you get permission errors:
- Make sure you're logged in as an admin user
- Check that you're in the correct project

### If the migration seems to run but nothing happens:
- The script uses IF NOT EXISTS checks
- It won't create duplicate tables/columns
- This is safe to run multiple times

---

## 🎯 Final Steps After Migration

1. **Clear your browser cache** (Ctrl+F5 or Cmd+Shift+R)
2. **Restart your application** if running locally
3. **Test the Documents feature** by:
   - Going to Dashboard → Documents
   - Uploading a test document
   - Creating an annotation (for PDFs)

---

## 📝 Summary of Changes

| Component | Before Migration | After Migration |
|-----------|-----------------|-----------------|
| Assets Table | Basic columns | + attribution_status, document_type |
| Annotations | Not supported | Full annotation system |
| Collaboration | Not available | Reply system for annotations |
| Vault Integration | Limited | Full asset-vault linking |
| Security | Basic RLS | Enhanced RLS with policies |

---

## ✨ Migration Complete!

Once all verification queries return the expected results, your database is ready for the Documents feature with collaborative annotations!

If you encounter any issues, the migration script is safe to run again - it won't duplicate anything thanks to the IF NOT EXISTS checks.

---

**File Location:** `/database/migrations/20250103_PRODUCTION_MIGRATION.sql`
**Last Updated:** January 3, 2025
**Feature:** Documents with Collaborative Annotations