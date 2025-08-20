import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for updates
const updateAnnotationSchema = z.object({
  comment_text: z.string().optional(),
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  is_private: z.boolean().optional(),
  is_resolved: z.boolean().optional(),
}).partial();

/**
 * GET /api/assets/[id]/annotations/[annotationId]
 * Get a specific annotation with replies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId, annotationId } = await params;

    // Get annotation with user information and replies
    const { data: annotation, error: annotationError } = await supabase
      .from('asset_annotations')
      .select(`
        *,
        users!created_by (
          id,
          full_name,
          avatar_url
        ),
        annotation_replies (
          id,
          reply_text,
          created_by,
          created_at,
          updated_at,
          is_edited,
          edited_at,
          users!created_by (
            id,
            full_name,
            avatar_url
          ),
          annotation_reactions (
            id,
            user_id,
            emoji,
            created_at
          )
        ),
        annotation_reactions (
          id,
          user_id,
          emoji,
          created_at
        )
      `)
      .eq('id', annotationId)
      .eq('asset_id', assetId)
      .eq('is_deleted', false)
      .single();

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found' }, { status: 404 });
    }

    // Transform the response
    const transformedAnnotation = {
      ...annotation,
      user: annotation.users,
      replies: annotation.annotation_replies?.map((reply: any) => ({
        ...reply,
        user: reply.users,
        reactions: reply.annotation_reactions || [],
      })) || [],
      reactions: annotation.annotation_reactions || [],
      replies_count: annotation.annotation_replies?.length || 0,
    };

    return NextResponse.json({ annotation: transformedAnnotation });

  } catch (error) {
    console.error('Error in GET /api/assets/[id]/annotations/[annotationId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/assets/[id]/annotations/[annotationId]
 * Update an annotation
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId, annotationId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = updateAnnotationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const updates = validationResult.data;

    // Check if user owns the annotation or has permission to edit
    const { data: annotation, error: checkError } = await supabase
      .from('asset_annotations')
      .select(`
        id,
        created_by,
        asset_id,
        organization_id,
        assets!inner (
          vaults!inner (
            organization_members!inner (
              user_id,
              status,
              role
            )
          )
        )
      `)
      .eq('id', annotationId)
      .eq('asset_id', assetId)
      .eq('is_deleted', false)
      .eq('assets.vaults.organization_members.user_id', user.id)
      .eq('assets.vaults.organization_members.status', 'active')
      .single();

    if (checkError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found or access denied' }, { status: 404 });
    }

    // Only allow owner to edit or admins
    const isOwner = annotation.created_by === user.id;
    const isAdmin = (annotation as any).assets?.[0]?.vaults?.[0]?.organization_members?.some(
      (member: any) => member.user_id === user.id && ['owner', 'admin'].includes(member.role)
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update annotation
    const { data: updatedAnnotation, error: updateError } = await supabase
      .from('asset_annotations')
      .update(updates)
      .eq('id', annotationId)
      .select(`
        *,
        users!created_by (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating annotation:', updateError);
      return NextResponse.json({ error: 'Failed to update annotation' }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: annotation.organization_id,
        user_id: user.id,
        event_type: 'user_action',
        event_category: 'annotations',
        action: 'update_annotation',
        resource_type: 'asset_annotation',
        resource_id: annotationId,
        event_description: `Updated annotation on asset ${assetId}`,
        outcome: 'success',
        details: {
          asset_id: assetId,
          updated_fields: Object.keys(updates),
          is_owner: isOwner,
        },
      });

    return NextResponse.json({
      annotation: {
        ...updatedAnnotation,
        user: updatedAnnotation.users,
      },
    });

  } catch (error) {
    console.error('Error in PATCH /api/assets/[id]/annotations/[annotationId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/assets/[id]/annotations/[annotationId]
 * Delete an annotation (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId, annotationId } = await params;

    // Check if user owns the annotation or has permission to delete
    const { data: annotation, error: checkError } = await supabase
      .from('asset_annotations')
      .select(`
        id,
        created_by,
        asset_id,
        organization_id,
        assets!inner (
          vaults!inner (
            organization_members!inner (
              user_id,
              status,
              role
            )
          )
        )
      `)
      .eq('id', annotationId)
      .eq('asset_id', assetId)
      .eq('is_deleted', false)
      .eq('assets.vaults.organization_members.user_id', user.id)
      .eq('assets.vaults.organization_members.status', 'active')
      .single();

    if (checkError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found or access denied' }, { status: 404 });
    }

    // Only allow owner to delete or admins
    const isOwner = annotation.created_by === user.id;
    const isAdmin = (annotation as any).assets?.[0]?.vaults?.[0]?.organization_members?.some(
      (member: any) => member.user_id === user.id && ['owner', 'admin'].includes(member.role)
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Soft delete annotation
    const { error: deleteError } = await supabase
      .from('asset_annotations')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('id', annotationId);

    if (deleteError) {
      console.error('Error deleting annotation:', deleteError);
      return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: annotation.organization_id,
        user_id: user.id,
        event_type: 'user_action',
        event_category: 'annotations',
        action: 'delete_annotation',
        resource_type: 'asset_annotation',
        resource_id: annotationId,
        event_description: `Deleted annotation on asset ${assetId}`,
        outcome: 'success',
        details: {
          asset_id: assetId,
          is_owner: isOwner,
        },
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/assets/[id]/annotations/[annotationId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}