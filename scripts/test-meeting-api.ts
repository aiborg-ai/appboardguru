import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const API_URL = 'http://localhost:3000';

async function testMeetingAPI() {
  try {
    console.log('Testing Meeting Creation via API...\n');
    
    // Test data for meeting creation
    const meetingData = {
      organizationId: '39fbf63f-efd9-4c68-a91f-e8c36bc88ecc', // TestOrg ID from previous tests
      title: 'API Test Meeting - ' + new Date().toLocaleString(),
      description: 'Testing meeting creation through the API',
      meetingType: 'board',
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      scheduledEnd: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      timezone: 'America/New_York',
      location: 'Conference Room B',
      virtualMeetingUrl: 'https://meet.google.com/test-meeting',
      isHybrid: true,
      agendaItems: [
        {
          title: 'Welcome and Introduction',
          description: 'Opening remarks',
          type: 'information',
          estimatedDuration: 10,
          presenter: 'Board Chair',
          order: 1
        },
        {
          title: 'Financial Review',
          description: 'Q4 financial results',
          type: 'presentation',
          estimatedDuration: 30,
          presenter: 'CFO',
          order: 2
        }
      ],
      invitees: [
        {
          email: 'board.member1@example.com',
          name: 'John Doe',
          role: 'board_member',
          isRequired: true,
          canVote: true
        },
        {
          email: 'board.member2@example.com',
          name: 'Jane Smith',
          role: 'board_member',
          isRequired: true,
          canVote: true
        }
      ],
      settings: {
        allowGuests: true,
        recordMeeting: false,
        autoGenerateMinutes: false,
        requireRsvp: true,
        allowProxyVoting: false,
        publicMeeting: false
      }
    };
    
    console.log('Sending POST request to /api/meetings...\n');
    console.log('Meeting data:', JSON.stringify(meetingData, null, 2), '\n');
    
    // Make the API call
    const response = await fetch(`${API_URL}/api/meetings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need proper auth headers
      },
      body: JSON.stringify(meetingData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Error details:', JSON.stringify(result, null, 2));
      
      if (result.details) {
        console.error('\nDetailed error information:');
        console.error(result.details);
      }
      return;
    }
    
    console.log('✅ Meeting created successfully!\n');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.data) {
      console.log('\n📋 Meeting Summary:');
      console.log('- ID:', result.data.id);
      console.log('- Title:', result.data.title);
      console.log('- Meeting Number:', result.data.meeting_number);
      console.log('- Status:', result.data.status);
      console.log('- Date:', new Date(result.data.scheduled_start).toLocaleDateString());
      console.log('- Time:', new Date(result.data.scheduled_start).toLocaleTimeString());
      console.log('- Agenda Items:', result.data.agenda_item_count);
      console.log('- Attendees:', result.data.attendee_count);
    }
    
    console.log('\n✅ API test completed successfully!');
    console.log('The meeting creation endpoint is working properly.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testMeetingAPI();