import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { continuingEducationService } from '@/lib/services/continuing-education-service';
import { Database } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, earned_through, certificate_url, validity_months } = body;

    const finalUserId = user_id || session.user.id;

    // Only allow awarding to self unless admin
    if (finalUserId !== session.user.id) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'learning_admin'].includes(userRole.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const userCertification = await continuingEducationService.awardCertification(
      finalUserId,
      params.id,
      {
        earned_through,
        certificate_url,
        validity_months
      }
    );

    return NextResponse.json({
      success: true,
      data: userCertification
    });
  } catch (error) {
    console.error('Error awarding certification:', error);
    
    if (error instanceof Error && error.message === 'User already has an active certification') {
      return NextResponse.json(
        { 
          success: false,
          error: error.message
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to award certification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}