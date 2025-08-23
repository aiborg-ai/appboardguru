import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { knowledgeBaseService } from '@/lib/services/knowledge-base-service';
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

    const article = await knowledgeBaseService.getArticle(params.id, session.user.id);

    // Get related articles
    const relatedArticles = await knowledgeBaseService.getRelatedArticles(params.id);

    return NextResponse.json({
      success: true,
      data: {
        article,
        related_articles: relatedArticles
      }
    });
  } catch (error) {
    console.error('Error fetching knowledge base article:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch knowledge base article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: existingArticle } = await supabase
      .from('knowledge_base_articles')
      .select('author_id')
      .eq('id', params.id)
      .single();

    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const canUpdate = (existingArticle && existingArticle.author_id === session.user.id) ||
                     (userRole && ['admin', 'content_admin'].includes(userRole.role));

    if (!canUpdate) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const updates = {
      title: body.title,
      content: body.content,
      summary: body.summary,
      category_id: body.category_id,
      article_type: body.article_type,
      tags: body.tags,
      status: body.status,
      is_searchable: body.is_searchable,
      attachments: body.attachments,
      reviewer_id: body.reviewer_id,
      last_reviewed_at: body.last_reviewed_at,
      expires_at: body.expires_at
    };

    const article = await knowledgeBaseService.updateArticle(params.id, updates);

    return NextResponse.json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Error updating knowledge base article:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update knowledge base article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const { data: existingArticle } = await supabase
      .from('knowledge_base_articles')
      .select('author_id')
      .eq('id', params.id)
      .single();

    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const canDelete = (existingArticle && existingArticle.author_id === session.user.id) ||
                     (userRole && ['admin', 'content_admin'].includes(userRole.role));

    if (!canDelete) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const article = await knowledgeBaseService.deleteArticle(params.id);

    return NextResponse.json({
      success: true,
      message: 'Article archived successfully',
      data: article
    });
  } catch (error) {
    console.error('Error deleting knowledge base article:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete knowledge base article',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}