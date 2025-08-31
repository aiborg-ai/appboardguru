import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientSafe } from '@/lib/supabase-server';

/**
 * Debug endpoint to check environment configuration
 * Provides detailed information about what's configured and what's not
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    deployment: process.env.VERCEL ? 'vercel' : 'local',
  };
  
  // Check environment variables
  diagnostics.env = {
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 
      'NOT_SET',
    supabaseKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...' : 
      'NOT_SET',
  };
  
  // Test Supabase client creation
  diagnostics.supabase = {
    clientCreation: 'pending',
    authentication: 'pending',
    databaseQuery: 'pending'
  };
  
  try {
    const supabase = await createSupabaseServerClientSafe();
    
    if (!supabase) {
      diagnostics.supabase.clientCreation = 'failed';
      diagnostics.supabase.error = 'Client returned null';
    } else {
      diagnostics.supabase.clientCreation = 'success';
      
      // Test authentication
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          diagnostics.supabase.authentication = 'error';
          diagnostics.supabase.authError = error.message;
        } else if (user) {
          diagnostics.supabase.authentication = 'authenticated';
          diagnostics.supabase.userId = user.id;
          diagnostics.supabase.userEmail = user.email;
        } else {
          diagnostics.supabase.authentication = 'not_authenticated';
        }
      } catch (authError: any) {
        diagnostics.supabase.authentication = 'exception';
        diagnostics.supabase.authException = authError?.message || 'Unknown error';
      }
      
      // Test database query
      try {
        const { error } = await supabase
          .from('organizations')
          .select('count')
          .limit(1)
          .single();
          
        if (error) {
          diagnostics.supabase.databaseQuery = 'error';
          diagnostics.supabase.dbError = {
            message: error.message,
            code: error.code,
            hint: error.hint
          };
        } else {
          diagnostics.supabase.databaseQuery = 'success';
        }
      } catch (dbError: any) {
        diagnostics.supabase.databaseQuery = 'exception';
        diagnostics.supabase.dbException = dbError?.message || 'Unknown error';
      }
    }
  } catch (error: any) {
    diagnostics.supabase.clientCreation = 'exception';
    diagnostics.supabase.exception = error?.message || 'Unknown error';
  }
  
  // Determine overall status
  const isHealthy = 
    diagnostics.env.hasSupabaseUrl && 
    diagnostics.env.hasSupabaseKey &&
    diagnostics.supabase.clientCreation === 'success';
  
  diagnostics.status = isHealthy ? 'operational' : 'degraded';
  diagnostics.recommendations = [];
  
  if (!diagnostics.env.hasSupabaseUrl || !diagnostics.env.hasSupabaseKey) {
    diagnostics.recommendations.push('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
  }
  
  if (diagnostics.supabase.clientCreation !== 'success') {
    diagnostics.recommendations.push('Check Supabase configuration and credentials');
  }
  
  if (diagnostics.supabase.databaseQuery === 'error') {
    diagnostics.recommendations.push('Check database connection and RLS policies');
  }
  
  return NextResponse.json(diagnostics, { 
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}