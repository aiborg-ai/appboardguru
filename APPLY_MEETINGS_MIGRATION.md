# Apply Meetings System Database Migration

## Important: Database Migration Required

The meeting creation system requires database tables to be created in Supabase. Please follow these steps:

## Step 1: Apply the Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/pgeuvjihhfmzqymoygwb
2. Navigate to the **SQL Editor** section
3. Open the migration file: `/home/vik/appboardguru2/supabase/migrations/20250830211948_create_meetings_system.sql`
4. Copy the entire SQL content
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the migration

## What This Migration Creates

The migration creates a comprehensive meeting management system with:

### Tables Created:
- `meetings` - Main meetings table with all meeting details
- `meeting_attendees` - Attendee list with roles and RSVP status
- `meeting_agenda_items` - Agenda items for each meeting
- `meeting_documents` - Documents attached to meetings
- `meeting_resolutions` - Meeting resolutions and decisions
- `meeting_action_items` - Action items from meetings

### Features Implemented:
- Row Level Security (RLS) policies for proper access control
- Automatic count updates via triggers
- Helper functions for common operations
- Proper foreign key relationships
- Indexes for performance

## Step 2: Verify the Migration

After running the migration, verify it worked:

1. In Supabase SQL Editor, run:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'meeting%';
```

You should see all 6 meeting-related tables.

## Step 3: Test Meeting Creation

1. Go to http://localhost:3000/dashboard/meetings
2. Click "Create Meeting"
3. Fill in the meeting details through the wizard
4. After creation, you should see:
   - Success confirmation screen with meeting details
   - Meeting immediately appears in the meetings list
   - Meeting ID that can be copied

## Troubleshooting

If you encounter errors:

1. **"relation meetings does not exist"** - The migration hasn't been applied yet
2. **Permission errors** - Check that RLS policies were created correctly
3. **Meeting not showing after creation** - Refresh the page or check browser console for errors

## Next Steps

Once the migration is applied:
- Create test meetings to verify the system works
- Check that meetings appear immediately in the list
- Verify the success confirmation shows after creation
- Test different meeting types (AGM, Board, Committee)

---

Migration file location: `/home/vik/appboardguru2/supabase/migrations/20250830211948_create_meetings_system.sql`
Created: August 30, 2025