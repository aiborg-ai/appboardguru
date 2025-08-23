import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { knowledgeBaseService } from '@/lib/services/knowledge-base-service';
import { Database } from '@/types/database';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { question, session_id } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing or invalid required field: question'
        },
        { status: 400 }
      );
    }

    const response = await knowledgeBaseService.askAIAssistant(
      session.user.id,
      question.trim(),
      session_id
    );

    return NextResponse.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error with AI assistant:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process AI assistant request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const limit = parseInt(searchParams.get('limit') || '20');

    const conversations = await knowledgeBaseService.getConversationHistory(
      session.user.id,
      sessionId || undefined,
      limit
    );

    return NextResponse.json({
      success: true,
      data: conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('Error fetching AI conversation history:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch AI conversation history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}