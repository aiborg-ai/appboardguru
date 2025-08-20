import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// Validation schema for creating replies
const createReplySchema = z.object({
  reply_text: z.string().min(1, 'Reply text is required').max(1000, 'Reply text too long'),
  parent_reply_id: z.string().uuid().optional(),
});

/**
 * GET /api/assets/[id]/annotations/[annotationId]/replies
 * Get all replies for an annotation
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

    // Verify user has access to the annotation
    const { data: annotation, error: annotationError } = await supabase
      .from('asset_annotations')
      .select(`
        id,
        asset_id,
        organization_id,
        assets!inner (
          vaults!inner (
            organization_members!inner (
              user_id,
              status
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

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found or access denied' }, { status: 404 });
    }

    // Get replies with user information and reactions
    const { data: replies, error: repliesError } = await supabase
      .from('annotation_replies')
      .select(`
        *,
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
        ),
        parent_reply:annotation_replies!parent_reply_id (
          id,
          reply_text,
          created_by,
          users!created_by (
            id,
            full_name
          )
        )
      `)
      .eq('annotation_id', annotationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 });
    }

    // Transform replies to include user info and reactions
    const transformedReplies = replies.map(reply => ({
      ...reply,
      user: reply.users,
      reactions: reply.annotation_reactions || [],
      parent_reply: reply.parent_reply ? {
        ...reply.parent_reply,
        user: reply.parent_reply.users,
      } : null,
    }));

    return NextResponse.json({
      replies: transformedReplies,
      total: transformedReplies.length,
    });

  } catch (error) {
    console.error('Error in GET /api/assets/[id]/annotations/[annotationId]/replies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/assets/[id]/annotations/[annotationId]/replies
 * Create a new reply to an annotation
 */
export async function POST(
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
    const validationResult = createReplySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { reply_text, parent_reply_id } = validationResult.data;

    // Verify user has access to the annotation
    const { data: annotation, error: annotationError } = await supabase
      .from('asset_annotations')
      .select(`
        id,
        asset_id,
        organization_id,
        created_by,
        assets!inner (
          vaults!inner (
            organization_members!inner (
              user_id,
              status
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

    if (annotationError || !annotation) {
      return NextResponse.json({ error: 'Annotation not found or access denied' }, { status: 404 });
    }

    // If replying to a specific reply, verify it exists
    if (parent_reply_id) {
      const { data: parentReply, error: parentError } = await supabase
        .from('annotation_replies')
        .select('id, annotation_id')
        .eq('id', parent_reply_id)
        .eq('annotation_id', annotationId)
        .eq('is_deleted', false)
        .single();

      if (parentError || !parentReply) {
        return NextResponse.json({ error: 'Parent reply not found' }, { status: 404 });
      }
    }

    // Create reply
    const { data: reply, error: createError } = await supabase
      .from('annotation_replies')
      .insert({
        annotation_id: annotationId,
        parent_reply_id,
        reply_text,
        created_by: user.id,
      })
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
      console.error('Error creating reply:', createError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    // Check for @mentions in the reply text
    const mentionPattern = /@(\w+)/g;
    const mentions = [...reply_text.matchAll(mentionPattern)];
    
    if (mentions.length > 0) {
      // Find mentioned users by username/name
      const mentionedNames = mentions.map(match => match[1]);
      
      const { data: mentionedUsers } = await supabase
        .from('users')
        .select('id, full_name, email')
        .ilike('full_name', `%${mentionedNames.join('%')}%`);

      // Create mention records
      if (mentionedUsers && mentionedUsers.length > 0) {
        const mentionRecords = mentionedUsers.map(mentionedUser => ({
          reply_id: reply.id,
          mentioned_user_id: mentionedUser.id,
          mentioned_by: user.id,
        }));

        await supabase
          .from('annotation_mentions')
          .insert(mentionRecords);
      }
    }

    // Log activity
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: annotation.organization_id,
        user_id: user.id,
        event_type: 'user_action',
        event_category: 'annotations',
        action: 'create_reply',
        resource_type: 'annotation_reply',
        resource_id: reply.id,
        event_description: `Created reply to annotation ${annotationId}`,
        outcome: 'success',
        details: {
          asset_id: assetId,
          annotation_id: annotationId,
          parent_reply_id,
          has_mentions: mentions.length > 0,
        },
      });

    return NextResponse.json({
      reply: {
        ...reply,
        user: reply.users,
        reactions: [],
        parent_reply: null,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/assets/[id]/annotations/[annotationId]/replies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}