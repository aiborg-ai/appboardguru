# URGENT: Deployment Steps for Documents Feature

## Current Status
- ✅ Code has been pushed to GitHub (commit 86f0af97)
- ⏳ Waiting for Vercel deployment to complete
- ❌ Database migrations need to be applied to production

## Step 1: Apply Database Migration to Production Supabase

### IMPORTANT: This must be done BEFORE the Vercel deployment goes live!

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project: `pgeuvjihhfmzqymoygwb`

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Run the Migration**
   - Copy the ENTIRE contents of: `/database/migrations/20250103_PRODUCTION_MIGRATION.sql`
   - Paste it into the SQL editor
   - Click "Run" or press Ctrl+Enter (Windows) / Cmd+Enter (Mac)
   - You should see "Success. No rows returned" message

4. **Verify the Migration**
   Run this verification query:
   ```sql
   -- Check if tables were created
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('asset_annotations', 'annotation_replies', 'vault_assets');

   -- Check if columns were added
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'assets' 
   AND column_name IN ('attribution_status', 'document_type');
   ```
   You should see 3 tables and 2 columns listed.

## Step 2: Verify Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select your project: `appboardguru`

2. **Check Environment Variables**
   Go to Settings → Environment Variables and ensure these are set:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://pgeuvjihhfmzqymoygwb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = Your service role key (for storage uploads)

## Step 3: Check Deployment Status

1. **Monitor Vercel Deployment**
   - The deployment should trigger automatically from the GitHub push
   - Check: https://vercel.com/your-username/appboardguru/deployments
   - Look for deployment from commit `86f0af97`

2. **If Deployment Hasn't Started**
   - Click "Redeploy" on the latest deployment
   - Or push another commit to trigger it

## Step 4: Verify the Documents Feature

Once deployed, test the following:

1. **Check Menu Item**
   - Log in to: https://appboardguru.vercel.app
   - Look for "Documents" in the sidebar menu (between Assets and Meetings)

2. **Test Document Upload**
   - Click on Documents menu
   - Click "Upload Document" button
   - Try uploading a PDF or other document

3. **Test Annotations** (for PDF files)
   - Open a PDF document
   - Select text to create an annotation
   - Add a comment and save

## Troubleshooting

### If Documents menu doesn't appear:
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Check console for errors

### If upload fails:
- Check that database migration was applied
- Verify SUPABASE_SERVICE_ROLE_KEY is set in Vercel

### If you see database errors:
- The migration hasn't been applied yet
- Run the migration script in Supabase SQL Editor

## Files Changed

### Key Changes:
- `/src/features/dashboard/layout/EnhancedSidebar.tsx` - Added Documents menu item
- `/src/app/dashboard/documents/page.tsx` - Documents page
- `/src/components/documents/` - All document components
- `/database/migrations/20250103_PRODUCTION_MIGRATION.sql` - Database schema

### Latest Commits:
- `86f0af97` - Bump version to 1.0.5 with Documents feature
- `7a2d94e6` - Force Vercel rebuild with cache refresh
- `c4409550` - Fix Documents page errors and database issues

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check Vercel function logs for API errors
3. Verify database migration was applied correctly
4. Ensure all environment variables are set

---
**Last Updated**: January 3, 2025
**Feature**: Documents with Collaborative Annotations
**Version**: 1.0.5