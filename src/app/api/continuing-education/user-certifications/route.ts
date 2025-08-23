import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { continuingEducationService } from '@/lib/services/continuing-education-service';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id') || session.user.id;
    const status = searchParams.get('status');

    // Only allow users to view their own certifications unless they have admin role
    if (userId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'learning_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const userCertifications = await continuingEducationService.getUserCertifications(userId, status || undefined);

    return NextResponse.json({
      success: true,
      data: userCertifications,
      count: userCertifications.length
    });
  } catch (error) {
    console.error('Error fetching user certifications:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch user certifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}