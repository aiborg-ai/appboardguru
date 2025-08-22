import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Database } from '@/types/database';

type VoiceWorkflowTrigger = Database['public']['Tables']['voice_workflow_triggers']['Row'];
type VoiceWorkflowTriggerInsert = Database['public']['Tables']['voice_workflow_triggers']['Insert'];
type VoiceWorkflowTriggerUpdate = Database['public']['Tables']['voice_workflow_triggers']['Update'];

export interface VoiceShortcut {
  id: string;
  userId: string;
  organizationId?: string;
  phrase: string;
  commandType: string;
  parameters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  useCount: number;
  lastUsed?: Date;
  isActive: boolean;
}

export interface CreateShortcutRequest {
  userId: string;
  organizationId?: string;
  phrase: string;
  commandType: string;
  parameters: Record<string, unknown>;
  isActive?: boolean;
}

// GET - Retrieve user's voice shortcuts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || user.id;
    const organizationId = url.searchParams.get('organizationId');

    // Fetch shortcuts from voice workflow triggers table
    let query = supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: shortcutRecords, error } = await query;

    if (error) {
      throw error;
    }

    const shortcuts: VoiceShortcut[] = (shortcutRecords || []).map((record: any) => ({
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      phrase: record.trigger_phrase,
      commandType: record.workflow_name,
      parameters: (record.action_config as Record<string, unknown>) || {},
      createdAt: new Date(record.created_at || ''),
      updatedAt: new Date(record.updated_at || ''),
      useCount: record.trigger_count || 0,
      ...(record.last_triggered && { lastUsed: new Date(record.last_triggered) }),
      isActive: record.is_active !== false
    }));

    return NextResponse.json({
      success: true,
      shortcuts
    });

  } catch (error) {
    console.error('Error fetching voice shortcuts:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch shortcuts' 
    }, { status: 500 });
  }
}

// POST - Create a new voice shortcut
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateShortcutRequest = await request.json();

    // Validate required fields
    if (!body.phrase?.trim() || !body.commandType) {
      return NextResponse.json({ 
        error: 'Phrase and command type are required' 
      }, { status: 400 });
    }

    // Check if phrase already exists for this user
    const { data: existing } = await supabase
      .from('voice_workflow_triggers')
      .select('*')
      .eq('user_id', user.id)
      .eq('trigger_phrase', body.phrase.toLowerCase().trim());

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        error: 'A shortcut with this phrase already exists' 
      }, { status: 409 });
    }

    // Create the shortcut record
    const shortcutData: VoiceWorkflowTriggerInsert = {
      user_id: user.id,
      organization_id: body.organizationId || null,
      workflow_name: body.commandType,
      trigger_phrase: body.phrase.toLowerCase().trim(),
      action_config: body.parameters || {},
      is_active: body.isActive !== false,
      trigger_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: shortcut, error: insertError } = await supabase
      .from('voice_workflow_triggers')
      .insert(shortcutData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Log the activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId || null,
        event_type: 'user_action',
        action: 'create_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: shortcut?.id,
        details: {
          event_category: 'voice',
          outcome: 'success',
          event_description: `User created voice shortcut: "${body.phrase}"`,
          phrase: body.phrase,
          command_type: body.commandType,
          parameters: body.parameters
        },
      });

    const createdShortcut: VoiceShortcut = {
      id: shortcut.id,
      userId: shortcut.user_id,
      organizationId: shortcut.organization_id,
      phrase: shortcut.trigger_phrase,
      commandType: shortcut.workflow_name,
      parameters: (shortcut.action_config as Record<string, unknown>) || {},
      createdAt: new Date(shortcut.created_at || ''),
      updatedAt: new Date(shortcut.updated_at || ''),
      useCount: 0,
      isActive: shortcut.is_active !== false
    };

    return NextResponse.json({
      success: true,
      shortcut: createdShortcut
    });

  } catch (error) {
    console.error('Error creating voice shortcut:', error);
    return NextResponse.json({ 
      error: 'Failed to create shortcut' 
    }, { status: 500 });
  }
}

// PUT - Update shortcut usage statistics
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient() as any;
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { shortcutId, incrementUsage = false } = body;

    if (!shortcutId) {
      return NextResponse.json({ error: 'Shortcut ID required' }, { status: 400 });
    }

    if (incrementUsage) {
      // Increment usage count
      const { data: shortcut, error: fetchError } = await supabase
        .from('voice_workflow_triggers')
        .select('*')
        .eq('id', shortcutId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !shortcut) {
        return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
      }

      // Update usage count and last used
      const updateData: VoiceWorkflowTriggerUpdate = {
        trigger_count: (shortcut.trigger_count || 0) + 1,
        last_triggered: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('voice_workflow_triggers')
        .update(updateData)
        .eq('id', shortcutId);

      if (updateError) {
        throw updateError;
      }

      // Log the usage in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          organization_id: shortcut.organization_id,
          event_type: 'user_action',
          action: 'use_voice_shortcut',
          resource_type: 'voice_shortcut',
          resource_id: shortcutId,
          details: {
            event_category: 'voice',
            outcome: 'success',
            event_description: `Voice shortcut used: "${shortcut.trigger_phrase}"`,
            shortcut_id: shortcutId,
            phrase: shortcut.trigger_phrase,
            command_type: shortcut.workflow_name
          }
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Shortcut updated successfully'
    });

  } catch (error) {
    console.error('Error updating voice shortcut:', error);
    return NextResponse.json({ 
      error: 'Failed to update shortcut' 
    }, { status: 500 });
  }
}