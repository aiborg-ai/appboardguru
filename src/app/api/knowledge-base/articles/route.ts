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
    const categoryId = searchParams.get('category_id');
    const articleType = searchParams.get('article_type');
    const status = searchParams.get('status');
    const authorId = searchParams.get('author_id');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: any = {};
    if (categoryId) filters.category_id = categoryId;
    if (articleType) filters.article_type = articleType;
    if (status) filters.status = status;
    if (authorId) filters.author_id = authorId;
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());
    filters.limit = limit;
    filters.offset = offset;

    // Default to published articles for regular users
    if (!status) {
      const { data: userRole } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!userRole || !['admin', 'content_admin'].includes(userRole.role)) {
        filters.status = 'published';
      }
    }

    const articles = await knowledgeBaseService.getArticles(filters);

    return NextResponse.json({
      success: true,
      data: articles,
      count: articles.length
    });
  } catch (error) {
    console.error('Error fetching knowledge base articles:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch knowledge base articles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      summary,
      category_id,
      article_type,
      tags,
      status,
      is_searchable,
      attachments
    } = body;

    if (!title || !content || !category_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: title, content, category_id'
        },
        { status: 400 }
      );
    }

    const article = await knowledgeBaseService.createArticle({
      title,
      content,
      summary,
      category_id,
      article_type,
      tags,
      status,
      is_searchable,
      attachments,
      author_id: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error creating knowledge base article:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create knowledge base article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}