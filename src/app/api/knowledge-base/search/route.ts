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
    const query = searchParams.get('q');
    const categoryId = searchParams.get('category_id');
    const articleType = searchParams.get('article_type');
    const tags = searchParams.get('tags');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: q (search query)'
        },
        { status: 400 }
      );
    }

    const filters: any = { limit };
    if (categoryId) filters.category_id = categoryId;
    if (articleType) filters.article_type = articleType;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());

    const searchResults = await knowledgeBaseService.searchArticles(query, filters);

    return NextResponse.json({
      success: true,
      data: searchResults
    });
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search knowledge base',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}