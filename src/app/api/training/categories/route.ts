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
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const categories = await trainingService.getTrainingCategories(includeInactive);

    // Group categories by parent_id to create hierarchy
    const rootCategories = categories.filter(cat => !cat.parent_id);
    const subcategories = categories.filter(cat => cat.parent_id);

    const categoriesWithChildren = rootCategories.map(category => ({
      ...category,
      children: subcategories.filter(sub => sub.parent_id === category.id)
    }));

    return NextResponse.json({
      success: true,
      data: categoriesWithChildren,
      flat_data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error fetching training categories:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch training categories',
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

    // Check if user has permission to create categories
    const { data: userRole } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!userRole || !['admin', 'training_admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, parent_id, icon, color, display_order } = body;

    if (!name) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: name'
        },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabase
      .from('training_categories')
      .insert({
        name,
        description,
        parent_id,
        icon,
        color,
        display_order,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error creating training category:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create training category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}