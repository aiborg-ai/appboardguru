import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { chatWithOpenRouter } from '@/lib/openrouter';

const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'];

// Voice command types
export type VoiceCommandType = 
  | 'create_vault' 
  | 'schedule_meeting' 
  | 'upload_document' 
  | 'invite_member'
  | 'unknown';

export interface VoiceCommandRequest {
  text: string;
  context?: {
    currentPage?: string;
    organizationId?: string;
    vaultId?: string;
    sessionId?: string;
  };
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface VoiceCommandResponse {
  success: boolean;
  commandType: VoiceCommandType;
  parameters: Record<string, unknown>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  nextSteps?: string[];
  error?: string;
  conversationId?: string;
}

interface CommandPattern {
  type: VoiceCommandType;
  patterns: RegExp[];
  requiredParams: string[];
  optionalParams: string[];
  requiresConfirmation: boolean;
}

// Command patterns for voice recognition
const COMMAND_PATTERNS: CommandPattern[] = [
  {
    type: 'create_vault',
    patterns: [
      /create\s+(vault|folder)\s+(called|named|titled)\s+(.+?)(?:\s+with\s+documents?\s+(.+?))?$/i,
      /new\s+(vault|folder)\s+(.+?)(?:\s+with\s+(.+?))?$/i,
      /make\s+(?:a\s+)?(?:new\s+)?(vault|folder)\s+(.+?)$/i
    ],
    requiredParams: ['name'],
    optionalParams: ['description', 'documents'],
    requiresConfirmation: true
  },
  {
    type: 'schedule_meeting',
    patterns: [
      /schedule\s+(?:a\s+)?(?:board\s+)?meeting\s+(.+?)(?:\s+(?:on|for)\s+(.+?))?(?:\s+at\s+(.+?))?$/i,
      /book\s+(?:a\s+)?meeting\s+(.+?)(?:\s+(?:on|for)\s+(.+?))?(?:\s+at\s+(.+?))?$/i,
      /create\s+(?:a\s+)?meeting\s+(.+?)(?:\s+(?:on|for)\s+(.+?))?(?:\s+at\s+(.+?))?$/i
    ],
    requiredParams: ['title'],
    optionalParams: ['date', 'time', 'duration', 'attendees'],
    requiresConfirmation: true
  },
  {
    type: 'upload_document',
    patterns: [
      /upload\s+(.+?)\s+to\s+(.+?)\s+vault$/i,
      /add\s+(.+?)\s+to\s+(.+?)$/i,
      /put\s+(.+?)\s+in(?:to)?\s+(.+?)$/i
    ],
    requiredParams: ['document', 'vault'],
    optionalParams: ['category', 'description'],
    requiresConfirmation: true
  },
  {
    type: 'invite_member',
    patterns: [
      /invite\s+(.+?)\s+to\s+(.+?)(?:\s+vault)?$/i,
      /add\s+(.+?)\s+to\s+(.+?)(?:\s+vault)?(?:\s+as\s+(.+?))?$/i,
      /give\s+(.+?)\s+access\s+to\s+(.+?)$/i
    ],
    requiredParams: ['email', 'vault'],
    optionalParams: ['role', 'message'],
    requiresConfirmation: true
  }
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'AI features not configured' }, { status: 500 });
    }

    const body: VoiceCommandRequest = await request.json();
    
    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Voice command text is required' }, { status: 400 });
    }

    // First, try pattern matching for quick recognition
    const patternResult = await matchCommandPattern(body.text);
    
    // If pattern matching fails, use AI for more sophisticated parsing
    let commandResult: VoiceCommandResponse;
    
    if (patternResult.commandType !== 'unknown') {
      commandResult = patternResult;
    } else {
      commandResult = await parseCommandWithAI(body, user.id);
    }

    // Store command in session for context management
    if (body.context?.sessionId) {
      await storeCommandInSession(supabase, user.id, body.context.sessionId, body.text, commandResult);
    }

    // Log the voice command activity
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: body.context?.organizationId || null,
        event_type: 'user_action',
        event_category: 'voice',
        action: 'parse_voice_command',
        resource_type: 'voice_command',
        event_description: `User issued voice command: ${commandResult.commandType}`,
        outcome: commandResult.success ? 'success' : 'failure',
        details: {
          command_type: commandResult.commandType,
          requires_confirmation: commandResult.requiresConfirmation,
          parameters: commandResult.parameters,
          original_text: body.text,
        },
      });

    return NextResponse.json(commandResult);

  } catch (error) {
    console.error('Error in voice commands:', error);
    return NextResponse.json({ 
      error: 'Internal server error during command processing' 
    }, { status: 500 });
  }
}

async function matchCommandPattern(text: string): Promise<VoiceCommandResponse> {
  const normalizedText = text.trim();
  
  for (const pattern of COMMAND_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = normalizedText.match(regex);
      if (match) {
        const parameters: Record<string, unknown> = {};
        
        // Extract parameters based on command type
        switch (pattern.type) {
          case 'create_vault':
            parameters.name = match[3] || match[2];
            if (match[4]) parameters.documents = match[4];
            break;
          case 'schedule_meeting':
            parameters.title = match[1];
            if (match[2]) parameters.date = match[2];
            if (match[3]) parameters.time = match[3];
            break;
          case 'upload_document':
            parameters.document = match[1];
            parameters.vault = match[2];
            break;
          case 'invite_member':
            parameters.email = match[1];
            parameters.vault = match[2];
            if (match[3]) parameters.role = match[3];
            break;
        }

        return {
          success: true,
          commandType: pattern.type,
          parameters,
          requiresConfirmation: pattern.requiresConfirmation,
          confirmationMessage: generateConfirmationMessage(pattern.type, parameters),
          nextSteps: generateNextSteps(pattern.type),
          conversationId: generateConversationId()
        };
      }
    }
  }

  return {
    success: false,
    commandType: 'unknown',
    parameters: {},
    requiresConfirmation: false,
    error: 'Command not recognized'
  };
}

async function parseCommandWithAI(body: VoiceCommandRequest, userId: string): Promise<VoiceCommandResponse> {
  const systemPrompt = `You are BoardGuru's voice command processor. Parse natural language voice commands and extract structured data.

Available command types:
1. create_vault - Creating new document vaults/folders
2. schedule_meeting - Scheduling board meetings or calls  
3. upload_document - Adding documents to vaults
4. invite_member - Inviting people to vaults or meetings

Parse the user's voice command and respond with a JSON object containing:
- commandType: one of the above types or 'unknown'
- parameters: extracted parameters (e.g., names, dates, emails)
- requiresConfirmation: true for sensitive actions
- confidence: 0-1 confidence score

Context about BoardGuru:
- Users work with document vaults containing board materials
- Common meeting types: board meetings, AGMs, committee meetings
- Users can invite members by email to vaults
- Document categories: financial reports, presentations, legal documents

Respond only with valid JSON. Be conservative - if unsure, use commandType: 'unknown'.`;

  const userPrompt = `Voice command: "${body.text}"

${body.context ? `Context: Current page: ${body.context.currentPage}, Organization: ${body.context.organizationId}` : ''}

Parse this command and extract relevant parameters.`;

  const aiResult = await chatWithOpenRouter({
    message: userPrompt,
    conversationHistory: body.conversationHistory || [],
  });

  if (!aiResult.success || !aiResult.data?.message) {
    return {
      success: false,
      commandType: 'unknown',
      parameters: {},
      requiresConfirmation: false,
      error: 'AI parsing failed'
    };
  }

  try {
    // Extract JSON from AI response
    const jsonMatch = aiResult.data.message.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      commandType: parsed.commandType || 'unknown',
      parameters: parsed.parameters || {},
      requiresConfirmation: parsed.requiresConfirmation !== false,
      confirmationMessage: generateConfirmationMessage(parsed.commandType, parsed.parameters),
      nextSteps: generateNextSteps(parsed.commandType),
      conversationId: generateConversationId()
    };

  } catch (error) {
    console.error('Error parsing AI response:', error);
    return {
      success: false,
      commandType: 'unknown',
      parameters: {},
      requiresConfirmation: false,
      error: 'Failed to parse command'
    };
  }
}

function generateConfirmationMessage(commandType: VoiceCommandType, parameters: Record<string, unknown>): string {
  switch (commandType) {
    case 'create_vault':
      return `Create vault "${parameters.name}"${parameters.documents ? ` with documents: ${parameters.documents}` : ''}?`;
    case 'schedule_meeting':
      return `Schedule meeting "${parameters.title}"${parameters.date ? ` on ${parameters.date}` : ''}${parameters.time ? ` at ${parameters.time}` : ''}?`;
    case 'upload_document':
      return `Upload "${parameters.document}" to ${parameters.vault} vault?`;
    case 'invite_member':
      return `Invite ${parameters.email} to ${parameters.vault} vault${parameters.role ? ` as ${parameters.role}` : ''}?`;
    default:
      return 'Execute this command?';
  }
}

function generateNextSteps(commandType: VoiceCommandType): string[] {
  switch (commandType) {
    case 'create_vault':
      return [
        'Confirm vault creation',
        'Set vault permissions',
        'Add initial documents (optional)',
        'Invite members (optional)'
      ];
    case 'schedule_meeting':
      return [
        'Confirm meeting details',
        'Select attendees',
        'Add agenda items',
        'Send invitations'
      ];
    case 'upload_document':
      return [
        'Select document file',
        'Confirm vault destination', 
        'Set document category',
        'Process and analyze document'
      ];
    case 'invite_member':
      return [
        'Confirm invitation details',
        'Set member permissions',
        'Add personal message (optional)',
        'Send invitation'
      ];
    default:
      return ['Review command details', 'Confirm execution'];
  }
}

async function storeCommandInSession(
  supabase: any, 
  userId: string, 
  sessionId: string, 
  text: string, 
  result: VoiceCommandResponse
) {
  // Store in a session cache or database table for context management
  // This could be implemented with a voice_command_sessions table
  try {
    // For now, we'll use the audit_logs table with a specific category
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        event_type: 'user_action',
        event_category: 'voice_session',
        action: 'store_command_context',
        resource_type: 'voice_session',
        resource_id: sessionId,
        event_description: 'Voice command stored for context',
        outcome: 'success',
        details: {
          session_id: sessionId,
          original_text: text,
          parsed_command: result,
          timestamp: new Date().toISOString()
        },
      });
  } catch (error) {
    console.error('Failed to store command in session:', error);
  }
}

function generateConversationId(): string {
  return `voice_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// GET endpoint for retrieving command history/context
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_category', 'voice_session')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('resource_id', sessionId);
    }

    const { data: commandHistory, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      history: commandHistory || []
    });

  } catch (error) {
    console.error('Error fetching command history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch command history' 
    }, { status: 500 });
  }
}