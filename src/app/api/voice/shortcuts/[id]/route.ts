import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Get specific shortcut
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: shortcut, error } = await (supabase as any)
      .from('user_behavior_metrics')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .eq('action_type', 'voice_shortcut_definition')
      .single();

    if (error || !shortcut) {
      return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
    }

    const voiceShortcut = {
      id: (shortcut as any)?.id,
      userId: (shortcut as any)?.user_id,
      organizationId: (shortcut as any)?.organization_id,
      phrase: (shortcut as any)?.context?.phrase,
      commandType: (shortcut as any)?.context?.command_type,
      parameters: (shortcut as any)?.context?.parameters || {},
      createdAt: new Date((shortcut as any)?.created_at),
      updatedAt: new Date((shortcut as any)?.timestamp),
      useCount: (shortcut as any)?.engagement_score || 0,
      lastUsed: (shortcut as any)?.context?.last_used ? new Date((shortcut as any)?.context?.last_used) : undefined,
      isActive: (shortcut as any)?.context?.is_active !== false
    };

    return NextResponse.json({
      success: true,
      shortcut: voiceShortcut
    });

  } catch (error) {
    console.error('Error fetching voice shortcut:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch shortcut' 
    }, { status: 500 });
  }
}

// PUT - Update specific shortcut
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phrase, commandType, parameters, isActive } = body;

    // Get existing shortcut
    const { data: existing, error: fetchError } = await (supabase as any)
      .from('user_behavior_metrics')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .eq('action_type', 'voice_shortcut_definition')
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
    }

    // Check if new phrase conflicts with existing shortcuts (excluding current one)
    if (phrase && phrase.trim() !== (existing as any)?.context?.phrase) {
      const { data: conflicting } = await (supabase as any)
        .from('user_behavior_metrics')
        .select('id')
        .eq('user_id', user.id)
        .eq('action_type', 'voice_shortcut_definition')
        .textSearch('context', `"${phrase.toLowerCase().trim()}"`)
        .neq('id', resolvedParams.id);

      if (conflicting && conflicting.length > 0) {
        return NextResponse.json({ 
          error: 'A shortcut with this phrase already exists' 
        }, { status: 409 });
      }
    }

    // Update the shortcut
    const updatedContext = {
      ...(existing as any)?.context,
      ...(phrase && { phrase: phrase.toLowerCase().trim() }),
      ...(commandType && { command_type: commandType }),
      ...(parameters !== undefined && { parameters }),
      ...(isActive !== undefined && { is_active: isActive }),
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateError } = await (supabase as any)
      .from('user_behavior_metrics')
      .update({
        context: updatedContext,
        timestamp: new Date().toISOString()
      } as any)
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the update
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: (existing as any)?.organization_id,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'update_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: resolvedParams.id,
        event_description: `User updated voice shortcut: "${updatedContext.phrase}"`,
        outcome: 'success',
        details: {
          old_phrase: (existing as any)?.context?.phrase,
          new_phrase: updatedContext.phrase,
          command_type: updatedContext.command_type
        },
      } as any);

    const updatedShortcut = {
      id: (updated as any)?.id,
      userId: (updated as any)?.user_id,
      organizationId: (updated as any)?.organization_id,
      phrase: (updated as any)?.context?.phrase,
      commandType: (updated as any)?.context?.command_type,
      parameters: (updated as any)?.context?.parameters || {},
      createdAt: new Date((updated as any)?.created_at),
      updatedAt: new Date((updated as any)?.timestamp),
      useCount: (updated as any)?.engagement_score || 0,
      lastUsed: (updated as any)?.context?.last_used ? new Date((updated as any)?.context?.last_used) : undefined,
      isActive: (updated as any)?.context?.is_active !== false
    };

    return NextResponse.json({
      success: true,
      shortcut: updatedShortcut
    });

  } catch (error) {
    console.error('Error updating voice shortcut:', error);
    return NextResponse.json({ 
      error: 'Failed to update shortcut' 
    }, { status: 500 });
  }
}

// DELETE - Delete specific shortcut
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get shortcut details before deletion for logging
    const { data: shortcut, error: fetchError } = await (supabase as any)
      .from('user_behavior_metrics')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .eq('action_type', 'voice_shortcut_definition')
      .single();

    if (fetchError || !shortcut) {
      return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
    }

    // Delete the shortcut
    const { error: deleteError } = await (supabase as any)
      .from('user_behavior_metrics')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Log the deletion
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: (shortcut as any)?.organization_id,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'delete_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: resolvedParams.id,
        event_description: `User deleted voice shortcut: "${(shortcut as any)?.context?.phrase}"`,
        outcome: 'success',
        details: {
          phrase: (shortcut as any)?.context?.phrase,
          command_type: (shortcut as any)?.context?.command_type,
          use_count: (shortcut as any)?.engagement_score || 0
        },
      } as any);

    return NextResponse.json({
      success: true,
      message: 'Shortcut deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting voice shortcut:', error);
    return NextResponse.json({ 
      error: 'Failed to delete shortcut' 
    }, { status: 500 });
  }
}