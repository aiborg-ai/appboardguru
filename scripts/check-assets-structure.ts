import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAssetsStructure() {
  // Try to fetch one asset to see the structure
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    if (data && data.length > 0) {
      console.log('Asset fields:', Object.keys(data[0]));
      console.log('Sample asset:', data[0]);
    } else {
      console.log('No assets found in database');
    }
  }
}

checkAssetsStructure();