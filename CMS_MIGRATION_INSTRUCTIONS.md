# CMS Dropdown Migration Instructions

## Current Status
✅ **Form Functionality**: Organization creation form is working with static fallback options
✅ **Backend Infrastructure**: All API endpoints and admin interface are complete
⚠️ **Database Tables**: CMS tables need to be created manually

## Manual Migration Required

To enable dynamic dropdown management, run the following SQL in your Supabase dashboard:

1. Go to: https://pgeuvjihhfmzqymoygwb.supabase.co
2. Navigate to: **SQL Editor**
3. Copy and execute the contents of: `database/migrations/009-cms-dropdown-options.sql`

## What This Enables

Once the migration is complete:
- **Dynamic Options**: Industry and organization size options can be managed via admin panel
- **Admin Interface**: Available at `/admin/cms/dropdown-options`
- **Extensible**: Easy to add new dropdown categories
- **Fallback Support**: Form continues to work even if database is unavailable

## Current Fallback Options

The form currently uses these static options:

**Industries:**
- Technology
- Finance & Banking
- Healthcare & Life Sciences
- Education
- Manufacturing
- Retail & E-commerce
- Real Estate
- Legal Services
- Consulting
- Other

**Organization Sizes:**
- Startup (1-10 employees)
- Small Business (11-50 employees)
- Medium Business (51-250 employees)  
- Large Business (251-1000 employees)
- Enterprise (1000+ employees)

## Files Modified

1. `src/hooks/useDropdownOptions.ts` - Enhanced fallback logic
2. `src/features/organizations/steps/OrganizationSetupStep.tsx` - Uses dynamic options with fallback
3. `src/app/api/cms/dropdown-options/route.ts` - API endpoints for CMS
4. `src/app/admin/cms/dropdown-options/page.tsx` - Admin interface
5. `database/migrations/009-cms-dropdown-options.sql` - Database schema