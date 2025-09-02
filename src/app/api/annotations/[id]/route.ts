import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { AnnotationRepository } from '@/lib/repositories/annotation.repository';
import { AnnotationService } from '@/lib/services/annotation.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize repository and service
    const repository = new AnnotationRepository(supabase);
    const service = new AnnotationService(repository);
    
    // Get the annotation
    const result = await service.getAnnotationById(params.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.message === 'Annotation not found' ? 404 : 500 }
      );
    }
    
    // Check if user can access this annotation
    const canAccess = await service.canUserAccessAnnotation(params.id, user.id);
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    return NextResponse.json({ annotation: result.data });
  } catch (error) {
    console.error('Error fetching annotation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch annotation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    
    // Initialize repository and service
    const repository = new AnnotationRepository(supabase);
    const service = new AnnotationService(repository);
    
    // Prepare update data
    const updateData = {
      commentText: body.comment_text,
      color: body.color,
      opacity: body.opacity,
      isPrivate: body.is_private,
      isResolved: body.is_resolved
    };
    
    // Update the annotation
    const result = await service.updateAnnotation(params.id, updateData, user.id);
    
    if (!result.success) {
      const statusCode = result.error.message.includes('Permission denied') ? 403 : 400;
      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode }
      );
    }
    
    return NextResponse.json({ annotation: result.data });
  } catch (error) {
    console.error('Error updating annotation:', error);
    return NextResponse.json(
      { error: 'Failed to update annotation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Initialize repository and service
    const repository = new AnnotationRepository(supabase);
    const service = new AnnotationService(repository);
    
    // Delete the annotation (soft delete)
    const result = await service.deleteAnnotation(params.id, user.id);
    
    if (!result.success) {
      const statusCode = result.error.message.includes('Permission denied') ? 403 : 404;
      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode }
      );
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    return NextResponse.json(
      { error: 'Failed to delete annotation' },
      { status: 500 }
    );
  }
}