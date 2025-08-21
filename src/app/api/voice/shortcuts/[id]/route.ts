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

    const { data: shortcut, error } = await supabase
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
      id: shortcut.id,
      userId: shortcut.user_id,
      organizationId: shortcut.organization_id,
      phrase: shortcut.context.phrase,
      commandType: shortcut.context.command_type,
      parameters: shortcut.context.parameters || {},
      createdAt: new Date(shortcut.created_at),
      updatedAt: new Date(shortcut.timestamp),
      useCount: shortcut.engagement_score || 0,
      lastUsed: shortcut.context.last_used ? new Date(shortcut.context.last_used) : undefined,
      isActive: shortcut.context.is_active !== false
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
    const { data: existing, error: fetchError } = await supabase
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
    if (phrase && phrase.trim() !== existing.context.phrase) {
      const { data: conflicting } = await supabase
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
      ...existing.context,
      ...(phrase && { phrase: phrase.toLowerCase().trim() }),
      ...(commandType && { command_type: commandType }),
      ...(parameters !== undefined && { parameters }),
      ...(isActive !== undefined && { is_active: isActive }),
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateError } = await supabase
      .from('user_behavior_metrics')
      .update({
        context: updatedContext,
        timestamp: new Date().toISOString()
      })
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the update
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: existing.organization_id,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'update_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: resolvedParams.id,
        event_description: `User updated voice shortcut: "${updatedContext.phrase}"`,
        outcome: 'success',
        details: {
          old_phrase: existing.context.phrase,
          new_phrase: updatedContext.phrase,
          command_type: updatedContext.command_type
        },
      });

    const updatedShortcut = {
      id: updated.id,
      userId: updated.user_id,
      organizationId: updated.organization_id,
      phrase: updated.context.phrase,
      commandType: updated.context.command_type,
      parameters: updated.context.parameters || {},
      createdAt: new Date(updated.created_at),
      updatedAt: new Date(updated.timestamp),
      useCount: updated.engagement_score || 0,
      lastUsed: updated.context.last_used ? new Date(updated.context.last_used) : undefined,
      isActive: updated.context.is_active !== false
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
    const { data: shortcut, error: fetchError } = await supabase
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
    const { error: deleteError } = await supabase
      .from('user_behavior_metrics')
      .delete()
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    // Log the deletion
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: shortcut.organization_id,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'delete_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: resolvedParams.id,
        event_description: `User deleted voice shortcut: "${shortcut.context.phrase}"`,
        outcome: 'success',
        details: {
          phrase: shortcut.context.phrase,
          command_type: shortcut.context.command_type,
          use_count: shortcut.engagement_score || 0
        },
      });

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