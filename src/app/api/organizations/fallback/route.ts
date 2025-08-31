import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Fallback API that always returns an empty array
 * Used when the main organizations API fails
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Returning empty organizations array for user:', user.id);
    
    // Return empty array - user can create their first organization
    return NextResponse.json([]);
    
  } catch (error) {
    console.error('Fallback organizations API error:', error);
    // Even if there's an error, return empty array
    return NextResponse.json([]);
  }
}