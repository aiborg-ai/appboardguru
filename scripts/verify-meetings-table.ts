import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMeetingsTable() {
  try {
    console.log('Checking meetings table structure...\n');
    
    // Get table columns
    const { data: columns, error } = await supabase
      .rpc('get_table_columns', { table_name: 'meetings' });
    
    if (error) {
      // Fallback: try a simple query
      const { data, error: queryError } = await supabase
        .from('meetings')
        .select('*')
        .limit(0);
      
      if (queryError) {
        console.error('Error checking table:', queryError);
        return;
      }
      
      console.log('✅ Meetings table exists and is accessible');
      
      // Try to insert a test meeting to check columns
      const testMeeting = {
        organization_id: '00000000-0000-0000-0000-000000000000',
        title: 'Test Meeting',
        meeting_number: 'TEST-' + Date.now(),
        meeting_type: 'other',
        organizer_id: '00000000-0000-0000-0000-000000000000',
        settings: { test: true }
      };
      
      const { error: insertError } = await supabase
        .from('meetings')
        .insert(testMeeting)
        .select();
      
      if (insertError) {
        if (insertError.message.includes('organizer_id')) {
          console.log('❌ organizer_id column missing');
        } else if (insertError.message.includes('settings')) {
          console.log('❌ settings column missing');
        } else {
          console.log('✅ Both organizer_id and settings columns exist');
        }
      } else {
        console.log('✅ Both organizer_id and settings columns exist and work');
        
        // Clean up test data
        await supabase
          .from('meetings')
          .delete()
          .eq('meeting_number', testMeeting.meeting_number);
      }
      
      return;
    }
    
    console.log('Table columns:', columns);
    
    const hasOrganizerId = columns?.some((col: any) => col.column_name === 'organizer_id');
    const hasSettings = columns?.some((col: any) => col.column_name === 'settings');
    
    console.log('\nColumn check:');
    console.log(`- organizer_id: ${hasOrganizerId ? '✅' : '❌'}`);
    console.log(`- settings: ${hasSettings ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Create RPC function if it doesn't exist
async function createRpcFunction() {
  const sql = `
    CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
    RETURNS TABLE(column_name text, data_type text) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.column_name::text,
        c.data_type::text
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
        AND c.table_name = get_table_columns.table_name;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  const { error } = await supabase.rpc('query', { sql });
  if (error && !error.message.includes('already exists')) {
    console.log('Could not create helper function:', error.message);
  }
}

createRpcFunction().then(() => verifyMeetingsTable());