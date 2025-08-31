import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!hasUrl || !hasKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl,
          hasKey
        }
      }, { status: 500 });
    }
    
    // Try to create Supabase client
    const supabase = await createSupabaseServerClient();
    
    // Try to get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({
        success: false,
        error: 'Auth error',
        details: authError.message
      }, { status: 401 });
    }
    
    // Try a simple query to test database connection
    const { data: testQuery, error: queryError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (queryError) {
      return NextResponse.json({
        success: false,
        error: 'Database query error',
        details: {
          message: queryError.message,
          code: queryError.code,
          hint: queryError.hint
        }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      user: user ? { id: user.id, email: user.email } : null,
      databaseConnected: true,
      organizationsTableAccessible: true,
      message: 'All connections working properly'
    });
    
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}