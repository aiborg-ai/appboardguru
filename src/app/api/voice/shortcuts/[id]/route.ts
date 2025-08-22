import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Database } from '@/types/database';

type VoiceWorkflowTrigger = Database['public']['Tables']['voice_workflow_triggers']['Row'];
type VoiceWorkflowTriggerUpdate = Database['public']['Tables']['voice_workflow_triggers']['Update'];

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Get specific shortcut
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const supabase = await createSupabaseServerClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: shortcut, error } = await supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    if (error || !shortcut) {
      return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
    }

    const voiceShortcut = {
      id: shortcut.id,
      userId: shortcut.user_id,
      organizationId: shortcut.organization_id,
      phrase: shortcut.trigger_phrase,
      commandType: shortcut.workflow_name,
      parameters: (shortcut.action_config as Record<string, any>) || {},
      createdAt: new Date(shortcut.created_at || ''),
      updatedAt: new Date(shortcut.updated_at || ''),
      useCount: shortcut.trigger_count || 0,
      lastUsed: shortcut.last_triggered ? new Date(shortcut.last_triggered) : undefined,
      isActive: shortcut.is_active !== false
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
    const supabase = await createSupabaseServerClient() as any;
    
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
    if (phrase && phrase.trim() !== existing.trigger_phrase) {
      const { data: conflicting } = await supabase
        .from('voice_workflow_triggers')
        .select('id')
        .eq('user_id', user.id)
        .eq('trigger_phrase', phrase.toLowerCase().trim())
        .neq('id', resolvedParams.id);

      if (conflicting && conflicting.length > 0) {
        return NextResponse.json({ 
          error: 'A shortcut with this phrase already exists' 
        }, { status: 409 });
      }
    }

    // Update the shortcut
    const updateData: VoiceWorkflowTriggerUpdate = {
      ...(phrase && { trigger_phrase: phrase.toLowerCase().trim() }),
      ...(commandType && { workflow_name: commandType }),
      ...(parameters !== undefined && { action_config: parameters }),
      ...(isActive !== undefined && { is_active: isActive }),
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateError } = await supabase
      .from('voice_workflow_triggers')
      .update(updateData)
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
        action: 'update_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: resolvedParams.id,
        details: {
          event_category: 'voice',
          outcome: 'success',
          event_description: `User updated voice shortcut: "${phrase || existing.trigger_phrase}"`,
          old_phrase: existing.trigger_phrase,
          new_phrase: phrase || existing.trigger_phrase,
          command_type: commandType || existing.workflow_name
        },
      });

    const updatedShortcut = {
      id: updated.id,
      userId: updated.user_id,
      organizationId: updated.organization_id,
      phrase: updated.trigger_phrase,
      commandType: updated.workflow_name,
      parameters: (updated.action_config as Record<string, any>) || {},
      createdAt: new Date(updated.created_at || ''),
      updatedAt: new Date(updated.updated_at || ''),
      useCount: updated.trigger_count || 0,
      lastUsed: updated.last_triggered ? new Date(updated.last_triggered) : undefined,
      isActive: updated.is_active !== false
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
    const supabase = await createSupabaseServerClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get shortcut details before deletion for logging
    const { data: shortcut, error: fetchError } = await supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !shortcut) {
      return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
    }

    // Delete the shortcut
    const { error: deleteError } = await supabase
      .from('voice_workflow_triggers')
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
        action: 'delete_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: resolvedParams.id,
        details: {
          event_category: 'voice',
          outcome: 'success',
          event_description: `User deleted voice shortcut: "${shortcut.trigger_phrase}"`,
          phrase: shortcut.trigger_phrase,
          command_type: shortcut.workflow_name,
          use_count: shortcut.trigger_count || 0
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