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
    const { rating, comment } = body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid rating. Must be a number between 1 and 5'
        },
        { status: 400 }
      );
    }

    // Verify the conversation belongs to the user
    const { data: conversation, error: verifyError } = await supabase
      .from('manual_ai_conversations')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (verifyError || conversation?.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await knowledgeBaseService.provideFeedback(
      params.id,
      rating,
      comment
    );

    return NextResponse.json({
      success: true,
      message: 'AI assistant feedback submitted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error submitting AI assistant feedback:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to submit AI assistant feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}