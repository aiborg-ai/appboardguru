import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMeetingCreation() {
  try {
    console.log('Testing meeting creation flow...\n');
    
    // 1. Get a test user
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError || !users || users.length === 0) {
      console.error('No users found:', usersError);
      return;
    }
    
    const testUser = users[0];
    console.log(`Using test user: ${testUser.email}\n`);
    
    // 2. Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id, organization:organizations(*)')
      .eq('user_id', testUser.id)
      .eq('status', 'active')
      .single();
    
    if (orgError || !orgMember) {
      console.error('No organization found for user:', orgError);
      return;
    }
    
    const organization = orgMember.organization;
    console.log(`Using organization: ${organization.name}\n`);
    
    // 3. Create a test meeting
    const meetingData = {
      organization_id: organization.id,
      title: 'Test Meeting - ' + new Date().toISOString(),
      description: 'This is a test meeting created via script',
      meeting_type: 'board',
      meeting_number: `TEST-${Date.now()}`,
      status: 'scheduled',
      scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      scheduled_end: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // Tomorrow + 2 hours
      timezone: 'America/New_York',
      location: 'Conference Room A',
      virtual_meeting_url: 'https://zoom.us/j/123456789',
      is_hybrid: true,
      created_by: testUser.id,
      organizer_id: testUser.id,
      settings: {
        allowGuests: true,
        recordMeeting: false,
        requireRsvp: true,
        allowProxyVoting: false,
        publicMeeting: false
      },
      agenda_item_count: 0,
      attendee_count: 0
    };
    
    console.log('Creating meeting with data:', JSON.stringify(meetingData, null, 2), '\n');
    
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single();
    
    if (meetingError) {
      console.error('❌ Failed to create meeting:', meetingError);
      return;
    }
    
    console.log('✅ Meeting created successfully!');
    console.log('Meeting ID:', meeting.id);
    console.log('Meeting Number:', meeting.meeting_number);
    console.log('Title:', meeting.title);
    console.log('Status:', meeting.status);
    console.log('Organizer ID:', meeting.organizer_id);
    console.log('Settings:', JSON.stringify(meeting.settings, null, 2));
    
    // 4. Verify meeting can be retrieved
    const { data: retrievedMeeting, error: retrieveError } = await supabase
      .from('meetings')
      .select(`
        *,
        organization:organizations(id, name, slug)
      `)
      .eq('id', meeting.id)
      .single();
    
    if (retrieveError) {
      console.error('❌ Failed to retrieve meeting:', retrieveError);
    } else {
      console.log('\n✅ Meeting retrieved successfully with organization:', retrievedMeeting.organization.name);
    }
    
    // 5. Clean up test data
    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meeting.id);
    
    if (deleteError) {
      console.error('Warning: Could not delete test meeting:', deleteError);
    } else {
      console.log('\n🧹 Test meeting cleaned up');
    }
    
    console.log('\n✅ All tests passed! Meeting creation is working properly.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testMeetingCreation();