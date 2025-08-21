import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface VoiceShortcut {
  id: string;
  userId: string;
  organizationId?: string;
  phrase: string;
  commandType: string;
  parameters: Record<string, any>;
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
  parameters: Record<string, any>;
  isActive?: boolean;
}

// GET - Retrieve user's voice shortcuts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || user.id;
    const organizationId = url.searchParams.get('organizationId');

    // Fetch shortcuts from user behavior metrics table
    let query = supabase
      .from('user_behavior_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'voice_shortcut_definition')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: shortcutRecords, error } = await query;

    if (error) {
      throw error;
    }

    const shortcuts: VoiceShortcut[] = (shortcutRecords || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      organizationId: record.organization_id,
      phrase: record.context.phrase,
      commandType: record.context.command_type,
      parameters: record.context.parameters || {},
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.timestamp),
      useCount: record.engagement_score || 0,
      lastUsed: record.context.last_used ? new Date(record.context.last_used) : undefined,
      isActive: record.context.is_active !== false
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
    const supabase = await createSupabaseServerClient();
    
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
      .from('user_behavior_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('action_type', 'voice_shortcut_definition')
      .textSearch('context', `"${body.phrase.toLowerCase()}"`);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        error: 'A shortcut with this phrase already exists' 
      }, { status: 409 });
    }

    // Create the shortcut record
    const shortcutData = {
      user_id: user.id,
      organization_id: body.organizationId || null,
      action_type: 'voice_shortcut_definition',
      timestamp: new Date().toISOString(),
      context: {
        phrase: body.phrase.toLowerCase().trim(),
        command_type: body.commandType,
        parameters: body.parameters || {},
        is_active: body.isActive !== false,
        created_at: new Date().toISOString()
      },
      response_time_ms: null,
      engagement_score: 0,
      session_id: `shortcut_${Date.now()}`,
      metadata: {
        source: 'voice_shortcuts_manager',
        version: '1.0'
      }
    };

    const { data: shortcut, error: insertError } = await supabase
      .from('user_behavior_metrics')
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
        event_category: 'voice',
        action: 'create_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: shortcut.id,
        event_description: `User created voice shortcut: "${body.phrase}"`,
        outcome: 'success',
        details: {
          phrase: body.phrase,
          command_type: body.commandType,
          parameters: body.parameters
        },
      });

    const createdShortcut: VoiceShortcut = {
      id: shortcut.id,
      userId: shortcut.user_id,
      organizationId: shortcut.organization_id,
      phrase: shortcut.context.phrase,
      commandType: shortcut.context.command_type,
      parameters: shortcut.context.parameters,
      createdAt: new Date(shortcut.created_at),
      updatedAt: new Date(shortcut.timestamp),
      useCount: 0,
      isActive: shortcut.context.is_active
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
    const supabase = await createSupabaseServerClient();
    
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
        .from('user_behavior_metrics')
        .select('*')
        .eq('id', shortcutId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !shortcut) {
        return NextResponse.json({ error: 'Shortcut not found' }, { status: 404 });
      }

      // Update usage count and last used
      const updatedContext = {
        ...shortcut.context,
        last_used: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('user_behavior_metrics')
        .update({
          engagement_score: (shortcut.engagement_score || 0) + 1,
          context: updatedContext,
          timestamp: new Date().toISOString()
        })
        .eq('id', shortcutId);

      if (updateError) {
        throw updateError;
      }

      // Log the usage
      await supabase
        .from('user_behavior_metrics')
        .insert({
          user_id: user.id,
          organization_id: shortcut.organization_id,
          action_type: 'voice_shortcut_used',
          timestamp: new Date().toISOString(),
          context: {
            shortcut_id: shortcutId,
            phrase: shortcut.context.phrase,
            command_type: shortcut.context.command_type
          },
          engagement_score: 1
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