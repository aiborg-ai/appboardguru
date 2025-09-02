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
    
    // Check if user can access the annotation
    const canAccess = await service.canUserAccessAnnotation(params.id, user.id);
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Get replies
    const result = await repository.findReplies(params.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ replies: result.data });
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { reply_text } = body;
    
    if (!reply_text || reply_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      );
    }
    
    // Initialize repository and service
    const repository = new AnnotationRepository(supabase);
    const service = new AnnotationService(repository);
    
    // Check if user can access the annotation
    const canAccess = await service.canUserAccessAnnotation(params.id, user.id);
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Create the reply
    const result = await repository.createReply(params.id, reply_text, user.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
    
    // Get user details for response
    const { data: userData } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    // Format the response
    const reply = {
      ...result.data,
      user: userData || { id: user.id, full_name: 'Unknown User' }
    };
    
    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    );
  }
}