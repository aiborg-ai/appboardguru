import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { knowledgeBaseService } from '@/lib/services/knowledge-base-service';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'popular'; // 'popular' or 'recent'

    let articles;
    if (type === 'recent') {
      articles = await knowledgeBaseService.getRecentlyUpdatedArticles(limit);
    } else {
      articles = await knowledgeBaseService.getPopularArticles(limit);
    }

    return NextResponse.json({
      success: true,
      data: articles,
      count: articles.length,
      type
    });
  } catch (error) {
    console.error('Error fetching popular/recent articles:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch articles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}