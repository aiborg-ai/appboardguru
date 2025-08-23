import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { continuingEducationService } from '@/lib/services/continuing-education-service';
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
    const contentType = searchParams.get('content_type') as 'internal' | 'external' | 'certification' | 'all' | null;
    const maxCost = searchParams.get('max_cost');
    const skillLevel = searchParams.get('skill_level');
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
    if (contentType) filters.content_type = contentType;
    if (maxCost) filters.max_cost = parseFloat(maxCost);
    if (skillLevel) filters.skill_level = skillLevel;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());

    const results = await continuingEducationService.searchAllLearningContent(query, filters);

    const totalCount = results.internal_courses.length + 
                      results.external_courses.length + 
                      results.certifications.length;

    return NextResponse.json({
      success: true,
      data: results,
      count: {
        internal_courses: results.internal_courses.length,
        external_courses: results.external_courses.length,
        certifications: results.certifications.length,
        total: totalCount
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