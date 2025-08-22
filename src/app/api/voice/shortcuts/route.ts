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
    let query = (supabase as any)
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

    const shortcuts: VoiceShortcut[] = (shortcutRecords || []).map((record: any) => ({
      id: (record as any)?.id,
      userId: (record as any)?.user_id,
      organizationId: (record as any)?.organization_id,
      phrase: (record as any)?.context?.phrase,
      commandType: (record as any)?.context?.command_type,
      parameters: (record as any)?.context?.parameters || {},
      createdAt: new Date((record as any)?.created_at),
      updatedAt: new Date((record as any)?.timestamp),
      useCount: (record as any)?.engagement_score || 0,
      ...((record as any)?.context?.last_used && { lastUsed: new Date((record as any)?.context?.last_used) }),
      isActive: (record as any)?.context?.is_active !== false
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
    const { data: existing } = await (supabase as any)
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

    const { data: shortcut, error: insertError } = await (supabase as any)
      .from('user_behavior_metrics')
      .insert(shortcutData as any)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Log the activity
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.organizationId || null,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'create_voice_shortcut',
        resource_type: 'voice_shortcut',
        resource_id: (shortcut as any)?.id,
        event_description: `User created voice shortcut: "${body.phrase}"`,
        outcome: 'success',
        details: {
          phrase: body.phrase,
          command_type: body.commandType,
          parameters: body.parameters
        },
      } as any);

    const createdShortcut: VoiceShortcut = {
      id: (shortcut as any)?.id,
      userId: (shortcut as any)?.user_id,
      organizationId: (shortcut as any)?.organization_id,
      phrase: (shortcut as any)?.context?.phrase,
      commandType: (shortcut as any)?.context?.command_type,
      parameters: (shortcut as any)?.context?.parameters,
      createdAt: new Date((shortcut as any)?.created_at),
      updatedAt: new Date((shortcut as any)?.timestamp),
      useCount: 0,
      isActive: (shortcut as any)?.context?.is_active
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
      const { data: shortcut, error: fetchError } = await (supabase as any)
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
        ...(shortcut as any)?.context,
        last_used: new Date().toISOString()
      };

      const { error: updateError } = await (supabase as any)
        .from('user_behavior_metrics')
        .update({
          engagement_score: ((shortcut as any)?.engagement_score || 0) + 1,
          context: updatedContext,
          timestamp: new Date().toISOString()
        } as any)
        .eq('id', shortcutId);

      if (updateError) {
        throw updateError;
      }

      // Log the usage
      await (supabase as any)
        .from('user_behavior_metrics')
        .insert({
          user_id: user.id,
          organization_id: (shortcut as any)?.organization_id,
          action_type: 'voice_shortcut_used',
          timestamp: new Date().toISOString(),
          context: {
            shortcut_id: shortcutId,
            phrase: (shortcut as any)?.context?.phrase,
            command_type: (shortcut as any)?.context?.command_type
          },
          engagement_score: 1
        } as any);
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