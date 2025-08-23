import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { trainingService } from '@/lib/services/training-service';
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
    const contentType = searchParams.get('content_type') as 'course' | 'learning_path' | 'all' | null;
    const difficultyLevel = searchParams.get('difficulty_level');
    const tags = searchParams.get('tags');

    if (!query) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: q (search query)'
        },
        { status: 400 }
      );
    }

    const filters: any = {};
    if (contentType) filters.content_type = contentType;
    if (difficultyLevel) filters.difficulty_level = difficultyLevel;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());

    const results = await trainingService.searchLearningContent(query, filters);

    return NextResponse.json({
      success: true,
      data: results,
      count: {
        courses: results.courses.length,
        learning_paths: results.learning_paths.length,
        total: results.courses.length + results.learning_paths.length
      }
    });
  } catch (error) {
    console.error('Error searching learning content:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to search learning content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}