import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schemas
const createAnnotationSchema = z.object({
  asset_id: z.string().uuid(),
  vault_id: z.string().uuid().optional(),
  organization_id: z.string().uuid(),
  annotation_type: z.enum(['highlight', 'area', 'textbox', 'drawing', 'stamp']),
  content: z.object({
    text: z.string().optional(),
    image: z.string().optional(),
  }),
  page_number: z.number().int().positive(),
  position: z.object({
    pageNumber: z.number().int().positive(),
    rects: z.array(z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      width: z.number(),
      height: z.number(),
    })),
    boundingRect: z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      width: z.number(),
      height: z.number(),
    }),
  }),
  selected_text: z.string().optional(),
  comment_text: z.string().optional(),
  color: z.string().default('#FFFF00'),
  opacity: z.number().min(0).max(1).default(0.3),
  is_private: z.boolean().default(false),
});

// const updateAnnotationSchema = createAnnotationSchema.partial().omit({
//   asset_id: true,
//   organization_id: true,
// });

/**
 * GET /api/assets/[id]/annotations
 * Retrieve all annotations for an asset
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assetId = (await params).id;
    
    // Verify user has access to this asset
    const { data: asset, error: assetError } = await (supabase as any)
      .from('board_packs')
      .select(`
        id,
        uploaded_by,
        organization_id,
        title
      `)
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 404 });
    }

    // Get annotations with user information
    const { data: annotations, error: annotationsError } = await (supabase as any)
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
          users!created_by (
            id,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('asset_id', assetId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (annotationsError) {
      console.error('Error fetching annotations:', annotationsError);
      return NextResponse.json({ error: 'Failed to fetch annotations' }, { status: 500 });
    }

    // Transform annotations to include replies count
    const transformedAnnotations = (annotations as any[])?.map((annotation: any) => ({
      ...annotation,
      user: (annotation as any)?.users,
      replies_count: (annotation as any)?.annotation_replies?.length || 0,
      replies: (annotation as any)?.annotation_replies?.map((reply: any) => ({
        ...reply,
        user: (reply as any)?.users,
      })) || [],
    }));

    return NextResponse.json({
      annotations: transformedAnnotations,
      total: transformedAnnotations.length,
    });

  } catch (error) {
    console.error('Error in GET /api/assets/[id]/annotations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/assets/[id]/annotations
 * Create a new annotation for an asset
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Get current user with profile information
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for full name
    const { data: userProfile } = await (supabase as any)
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const assetId = (await params).id;
    const body = await request.json();
    
    // Validate request body
    const validationResult = createAnnotationSchema.safeParse({
      ...body,
      asset_id: assetId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const annotationData = validationResult.data;

    // Verify user has access to this asset and can create annotations
    const { data: asset, error: assetError } = await (supabase as any)
      .from('board_packs')
      .select(`
        id,
        uploaded_by,
        organization_id,
        title
      `)
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found or access denied' }, { status: 404 });
    }

    // Create annotation
    const { data: annotation, error: createError } = await (supabase as any)
      .from('asset_annotations')
      .insert({
        asset_id: assetId,
        organization_id: (asset as any)?.organization_id,
        created_by: user.id,
        annotation_type: annotationData.annotation_type,
        content: annotationData.content,
        page_number: annotationData.page_number,
        position: annotationData.position,
        selected_text: annotationData.selected_text,
        comment_text: annotationData.comment_text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        is_private: annotationData.is_private,
      } as any)
      .select(`
        *,
        users!created_by (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating annotation:', createError);
      return NextResponse.json({ error: 'Failed to create annotation' }, { status: 500 });
    }

    // Log annotation creation activity using comprehensive logging system
    const { logAnnotationActivity, getRequestContext } = await import('@/lib/services/activity-logger')
    const requestContext = getRequestContext(request)
    
    await logAnnotationActivity(
      user.id,
      (asset as any)?.organization_id,
      'created',
      (annotation as any)?.id,
      (asset as any)?.title,
      {
        ...requestContext,
        annotation_type: annotationData.annotation_type,
        page_number: annotationData.page_number,
        has_selected_text: !!annotationData.selected_text,
        comment_text: annotationData.comment_text,
        color: annotationData.color,
        opacity: annotationData.opacity,
        is_private: annotationData.is_private
      }
    )

    // Get all organization members to notify them about the annotation
    const { data: orgMembers } = await (supabase as any)
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', (asset as any)?.organization_id)
      .eq('status', 'active')
      .neq('user_id', user.id); // Exclude the annotation creator

    // Create activity log entries for all vault members
    if (orgMembers && orgMembers.length > 0) {
      const notificationLogs = (orgMembers as any[])?.map((member: any) => ({
        organization_id: (asset as any)?.organization_id,
        user_id: member.user_id,
        event_type: 'notification',
        event_category: 'annotations',
        action: 'annotation_created',
        resource_type: 'asset_annotation',
        resource_id: (annotation as any)?.id,
        event_description: `${(userProfile as any)?.full_name || user.email} made an annotation on "${(asset as any)?.title}"`,
        outcome: 'success',
        details: {
          asset_id: assetId,
          asset_title: (asset as any)?.title,
          annotation_creator_id: user.id,
          annotation_creator_name: (userProfile as any)?.full_name || user.email,
          annotation_type: annotationData.annotation_type,
          page_number: annotationData.page_number,
          has_comment: !!annotationData.comment_text,
        },
      })) || [];

      await (supabase as any)
        .from('audit_logs')
        .insert(notificationLogs as any);
    }

    return NextResponse.json({
      annotation: {
        ...(annotation as any),
        user: (annotation as any)?.users,
        replies_count: 0,
        replies: [],
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/assets/[id]/annotations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}