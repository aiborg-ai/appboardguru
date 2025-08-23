import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { knowledgeBaseService } from '@/lib/services/knowledge-base-service';
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
    const { feedback_type, comment } = body;

    if (!feedback_type || !['helpful', 'not_helpful'].includes(feedback_type)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid feedback_type. Must be "helpful" or "not_helpful"'
        },
        { status: 400 }
      );
    }

    const result = await knowledgeBaseService.submitFeedback(
      session.user.id,
      params.id,
      feedback_type,
      comment
    );

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error submitting article feedback:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit article feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}