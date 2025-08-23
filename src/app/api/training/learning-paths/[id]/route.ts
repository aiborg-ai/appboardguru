import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { trainingService } from '@/lib/services/training-service';
import { Database } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const learningPathDetails = await trainingService.getLearningPathDetails(params.id);

    return NextResponse.json({
      success: true,
      data: learningPathDetails
    });
  } catch (error) {
    console.error('Error fetching learning path details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch learning path details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}