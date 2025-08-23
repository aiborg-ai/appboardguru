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
    const providerId = searchParams.get('provider_id');
    const category = searchParams.get('category');
    const skillLevel = searchParams.get('skill_level');
    const maxCost = searchParams.get('max_cost');
    const currency = searchParams.get('currency');
    const tags = searchParams.get('tags');
    const search = searchParams.get('search');
    const isAvailable = searchParams.get('is_available');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const filters: any = { limit, offset };
    if (providerId) filters.provider_id = providerId;
    if (category) filters.category = category;
    if (skillLevel) filters.skill_level = skillLevel;
    if (maxCost) filters.max_cost = parseFloat(maxCost);
    if (currency) filters.currency = currency;
    if (tags) filters.tags = tags.split(',').map(tag => tag.trim());
    if (search) filters.search = search;
    if (isAvailable !== null) filters.is_available = isAvailable === 'true';

    const courses = await continuingEducationService.getExternalCourses(filters);

    return NextResponse.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching external courses:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch external courses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}