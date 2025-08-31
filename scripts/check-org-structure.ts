import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrgStructure() {
  // Try to fetch one organization to see the structure
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample organization:', data);
    if (data && data.length > 0) {
      console.log('Organization fields:', Object.keys(data[0]));
    }
  }

  // Try to check user_organizations
  const { data: userOrgData, error: userOrgError } = await supabase
    .from('user_organizations')
    .select('*')
    .limit(1);

  if (userOrgError) {
    console.log('user_organizations error:', userOrgError);
    
    // Try organization_members
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('*')
      .limit(1);
      
    if (memberError) {
      console.log('organization_members error:', memberError);
    } else {
      console.log('organization_members sample:', memberData);
    }
  } else {
    console.log('user_organizations sample:', userOrgData);
  }
}

checkOrgStructure();