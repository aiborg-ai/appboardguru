import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkVaultAssets() {
  // Try to fetch vault_assets table
  const { data, error } = await supabase
    .from('vault_assets')
    .select('*')
    .limit(1);

  if (error) {
    console.error('vault_assets error:', error);
  } else {
    if (data && data.length > 0) {
      console.log('vault_assets fields:', Object.keys(data[0]));
    } else {
      console.log('vault_assets table exists but is empty');
    }
  }
}

checkVaultAssets();