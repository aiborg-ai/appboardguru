/**
 * Voice Command Patterns and Execution Logic
 * Handles structured command parsing and execution workflows for BoardGuru
 */

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { VoiceCommandResponse, VoiceCommandType } from '@/app/api/voice/commands/route';

export interface CommandExecutionContext {
  userId: string;
  organizationId?: string;
  vaultId?: string;
  sessionId?: string;
  currentPage?: string;
}

export interface CommandExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  redirectUrl?: string;
  followUpActions?: FollowUpAction[];
}

export interface FollowUpAction {
  type: 'redirect' | 'api_call' | 'notification' | 'file_upload';
  label: string;
  action: string;
  parameters?: Record<string, any>;
}

/**
 * Execute a voice command based on its type and parameters
 */
export async function executeVoiceCommand(
  command: VoiceCommandResponse,
  context: CommandExecutionContext
): Promise<CommandExecutionResult> {
  try {
    switch (command.commandType) {
      case 'create_vault':
        return await executeCreateVaultCommand(command.parameters, context);
      case 'schedule_meeting':
        return await executeScheduleMeetingCommand(command.parameters, context);
      case 'upload_document':
        return await executeUploadDocumentCommand(command.parameters, context);
      case 'invite_member':
        return await executeInviteMemberCommand(command.parameters, context);
      default:
        return {
          success: false,
          error: `Unknown command type: ${command.commandType}`
        };
    }
  } catch (error) {
    console.error('Voice command execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown execution error'
    };
  }
}

/**
 * Create Vault Command Implementation
 */
async function executeCreateVaultCommand(
  parameters: Record<string, any>,
  context: CommandExecutionContext
): Promise<CommandExecutionResult> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Create the vault (using board_packs table as vault equivalent)
    const { data: vault, error: vaultError } = await supabase
      .from('board_packs')
      .insert({
        title: parameters.name,
        description: parameters.description || `Vault created via voice command: "${parameters.name}"`,
        uploaded_by: context.userId,
        organization_id: context.organizationId,
        visibility: parameters.visibility || 'private',
        category: parameters.category || 'other',
        status: 'ready',
        file_path: '', // Will be updated when documents are added
        file_name: parameters.name,
        file_size: 0,
        file_type: 'vault',
      })
      .select()
      .single();

    if (vaultError) {
      throw vaultError;
    }

    // Set up default permissions for the creator
    await supabase
      .from('board_pack_permissions')
      .insert({
        board_pack_id: vault.id,
        organization_id: context.organizationId!,
        granted_to_user_id: context.userId,
        can_view: true,
        can_download: true,
        can_comment: true,
        can_share: true,
        can_edit_metadata: true,
        granted_by: context.userId,
      });

    const followUpActions: FollowUpAction[] = [
      {
        type: 'redirect',
        label: 'Open Vault',
        action: `/dashboard/vaults?id=${vault.id}`,
      },
      {
        type: 'notification',
        label: 'Add Documents',
        action: 'upload_documents',
        parameters: { vaultId: vault.id, vaultName: parameters.name }
      }
    ];

    // If documents were mentioned, add them to follow-up
    if (parameters.documents) {
      followUpActions.push({
        type: 'file_upload',
        label: 'Upload Mentioned Documents',
        action: 'upload_specific_documents',
        parameters: { 
          vaultId: vault.id, 
          documents: parameters.documents,
          vaultName: parameters.name 
        }
      });
    }

    return {
      success: true,
      result: vault,
      followUpActions,
      redirectUrl: `/dashboard/vaults?id=${vault.id}`
    };

  } catch (error) {
    console.error('Create vault error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create vault'
    };
  }
}

/**
 * Schedule Meeting Command Implementation
 */
async function executeScheduleMeetingCommand(
  parameters: Record<string, any>,
  context: CommandExecutionContext
): Promise<CommandExecutionResult> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Parse date and time from voice input
    const { startDate, endDate } = parseMeetingDateTime(parameters.date, parameters.time);
    
    // Create the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title: parameters.title,
        description: parameters.description || `Meeting scheduled via voice command`,
        organization_id: context.organizationId!,
        created_by: context.userId,
        meeting_type: parameters.meeting_type || 'board',
        status: 'draft',
        visibility: 'organization',
        scheduled_start: startDate.toISOString(),
        scheduled_end: endDate.toISOString(),
        timezone: parameters.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        estimated_duration_minutes: parameters.duration || 120,
        location: parameters.location,
        virtual_meeting_url: parameters.virtual_url,
      })
      .select()
      .single();

    if (meetingError) {
      throw meetingError;
    }

    // Create calendar event
    await supabase
      .from('calendar_events')
      .insert({
        meeting_id: meeting.id,
        user_id: context.userId,
        organization_id: context.organizationId,
        title: parameters.title,
        description: parameters.description || `Meeting scheduled via voice command`,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        timezone: parameters.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        event_type: 'meeting',
        status: 'tentative',
        visibility: 'organization',
        created_by: context.userId,
      });

    const followUpActions: FollowUpAction[] = [
      {
        type: 'redirect',
        label: 'Edit Meeting Details',
        action: `/dashboard/meetings/${meeting.id}`,
      },
      {
        type: 'notification',
        label: 'Add Attendees',
        action: 'invite_attendees',
        parameters: { meetingId: meeting.id, meetingTitle: parameters.title }
      },
      {
        type: 'notification',
        label: 'Create Agenda',
        action: 'create_agenda',
        parameters: { meetingId: meeting.id }
      }
    ];

    return {
      success: true,
      result: meeting,
      followUpActions,
      redirectUrl: `/dashboard/meetings/${meeting.id}`
    };

  } catch (error) {
    console.error('Schedule meeting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule meeting'
    };
  }
}

/**
 * Upload Document Command Implementation
 */
async function executeUploadDocumentCommand(
  parameters: Record<string, any>,
  context: CommandExecutionContext
): Promise<CommandExecutionResult> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Find the target vault by name
    const { data: vaults, error: vaultError } = await supabase
      .from('board_packs')
      .select('*')
      .eq('organization_id', context.organizationId)
      .ilike('title', `%${parameters.vault}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (vaultError || !vaults || vaults.length === 0) {
      return {
        success: false,
        error: `Vault "${parameters.vault}" not found. Please specify the correct vault name.`,
        followUpActions: [
          {
            type: 'redirect',
            label: 'Browse Vaults',
            action: '/dashboard/vaults',
          }
        ]
      };
    }

    const targetVault = vaults[0]; // Use the most recent matching vault

    const followUpActions: FollowUpAction[] = [
      {
        type: 'file_upload',
        label: 'Select Document to Upload',
        action: 'upload_to_vault',
        parameters: { 
          vaultId: targetVault.id,
          vaultName: targetVault.title,
          documentName: parameters.document,
          category: parameters.category || 'other'
        }
      },
      {
        type: 'redirect',
        label: 'Go to Upload Page',
        action: `/dashboard/assets?vault=${targetVault.id}&action=upload`,
      }
    ];

    return {
      success: true,
      result: { targetVault, documentName: parameters.document },
      followUpActions,
      redirectUrl: `/dashboard/assets?vault=${targetVault.id}&action=upload`
    };

  } catch (error) {
    console.error('Upload document error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process upload command'
    };
  }
}

/**
 * Invite Member Command Implementation
 */
async function executeInviteMemberCommand(
  parameters: Record<string, any>,
  context: CommandExecutionContext
): Promise<CommandExecutionResult> {
  const supabase = await createSupabaseServerClient();
  
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parameters.email)) {
      return {
        success: false,
        error: `"${parameters.email}" is not a valid email address`
      };
    }

    // Find the target vault
    let targetVault = null;
    if (parameters.vault) {
      const { data: vaults, error: vaultError } = await supabase
        .from('board_packs')
        .select('*')
        .eq('organization_id', context.organizationId)
        .ilike('title', `%${parameters.vault}%`)
        .limit(1);

      if (!vaultError && vaults && vaults.length > 0) {
        targetVault = vaults[0];
      }
    }

    // Create organization invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: context.organizationId!,
        email: parameters.email,
        role: parameters.role || 'viewer',
        invited_by: context.userId,
        personal_message: parameters.message || `Invitation sent via voice command`,
        status: 'pending',
      })
      .select()
      .single();

    if (invitationError) {
      throw invitationError;
    }

    const followUpActions: FollowUpAction[] = [
      {
        type: 'api_call',
        label: 'Send Invitation Email',
        action: 'send_invitation_email',
        parameters: { 
          invitationId: invitation.id,
          email: parameters.email,
          vaultName: targetVault?.title
        }
      },
      {
        type: 'redirect',
        label: 'Manage Invitations',
        action: '/dashboard/organizations/invitations',
      }
    ];

    return {
      success: true,
      result: { invitation, targetVault },
      followUpActions
    };

  } catch (error) {
    console.error('Invite member error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation'
    };
  }
}

/**
 * Parse date and time from natural language input
 */
function parseMeetingDateTime(dateStr?: string, timeStr?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate = new Date(now);

  // Parse date
  if (dateStr) {
    const lowerDate = dateStr.toLowerCase();
    
    if (lowerDate.includes('today')) {
      // Keep current date
    } else if (lowerDate.includes('tomorrow')) {
      startDate.setDate(now.getDate() + 1);
    } else if (lowerDate.includes('next monday')) {
      const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
      startDate.setDate(now.getDate() + daysUntilMonday);
    } else if (lowerDate.includes('next tuesday')) {
      const daysUntilTuesday = (2 + 7 - now.getDay()) % 7 || 7;
      startDate.setDate(now.getDate() + daysUntilTuesday);
    } else if (lowerDate.includes('next wednesday')) {
      const daysUntilWednesday = (3 + 7 - now.getDay()) % 7 || 7;
      startDate.setDate(now.getDate() + daysUntilWednesday);
    } else if (lowerDate.includes('next thursday')) {
      const daysUntilThursday = (4 + 7 - now.getDay()) % 7 || 7;
      startDate.setDate(now.getDate() + daysUntilThursday);
    } else if (lowerDate.includes('next friday')) {
      const daysUntilFriday = (5 + 7 - now.getDay()) % 7 || 7;
      startDate.setDate(now.getDate() + daysUntilFriday);
    } else if (lowerDate.includes('next week')) {
      startDate.setDate(now.getDate() + 7);
    } else if (lowerDate.includes('next month')) {
      startDate.setMonth(now.getMonth() + 1);
    } else {
      // Try to parse as a specific date
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
  }

  // Parse time
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)?/);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]!);
      const minutes = parseInt(timeMatch[2] || '0');
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }

      startDate.setHours(hours, minutes, 0, 0);
    }
  } else {
    // Default to next business hour
    const currentHour = now.getHours();
    if (currentHour < 9) {
      startDate.setHours(9, 0, 0, 0);
    } else if (currentHour < 17) {
      startDate.setHours(currentHour + 1, 0, 0, 0);
    } else {
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(9, 0, 0, 0);
    }
  }

  // End date is typically 2 hours after start
  const endDate = new Date(startDate);
  endDate.setHours(startDate.getHours() + 2);

  return { startDate, endDate };
}

/**
 * Enhanced command pattern matching with fuzzy matching
 */
export function enhancedPatternMatching(input: string): {
  commandType: VoiceCommandType;
  confidence: number;
  parameters: Record<string, any>;
} {
  const normalizedInput = input.toLowerCase().trim();
  
  // Vault creation patterns
  const vaultPatterns = [
    { pattern: /(?:create|make|new)\s+(?:a\s+)?(?:vault|folder|space)\s+(?:called|named|titled)?\s*(.+?)(?:\s+with\s+(?:documents?|files?)\s+(.+?))?$/i, confidence: 0.9 },
    { pattern: /(?:start|begin)\s+(?:a\s+)?new\s+(?:vault|project)\s+(.+?)$/i, confidence: 0.8 },
    { pattern: /set\s+up\s+(?:a\s+)?(?:vault|folder)\s+for\s+(.+?)$/i, confidence: 0.8 }
  ];

  // Meeting scheduling patterns  
  const meetingPatterns = [
    { pattern: /(?:schedule|book|plan)\s+(?:a\s+)?(?:meeting|call|session)\s+(.+?)(?:\s+(?:for|on)\s+(.+?))?(?:\s+at\s+(.+?))?$/i, confidence: 0.9 },
    { pattern: /(?:set\s+up|arrange)\s+(?:a\s+)?meeting\s+(.+?)$/i, confidence: 0.8 },
    { pattern: /(?:board|committee)\s+meeting\s+(.+?)(?:\s+(?:on|for)\s+(.+?))?$/i, confidence: 0.9 }
  ];

  // Document upload patterns
  const uploadPatterns = [
    { pattern: /(?:upload|add|put)\s+(.+?)\s+(?:to|in|into)\s+(?:the\s+)?(.+?)\s+(?:vault|folder)$/i, confidence: 0.9 },
    { pattern: /(?:attach|include)\s+(.+?)\s+(?:to|in)\s+(.+?)$/i, confidence: 0.7 }
  ];

  // Member invitation patterns
  const invitePatterns = [
    { pattern: /(?:invite|add)\s+(.+?)\s+to\s+(?:the\s+)?(.+?)(?:\s+vault|\s+as\s+(.+?))?$/i, confidence: 0.9 },
    { pattern: /(?:give|grant)\s+(.+?)\s+access\s+to\s+(.+?)$/i, confidence: 0.8 }
  ];

  // Test patterns in order of confidence
  for (const { pattern, confidence } of vaultPatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      return {
        commandType: 'create_vault',
        confidence,
        parameters: {
          name: match[1]?.trim(),
          documents: match[2]?.trim()
        }
      };
    }
  }

  for (const { pattern, confidence } of meetingPatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      return {
        commandType: 'schedule_meeting',
        confidence,
        parameters: {
          title: match[1]?.trim(),
          date: match[2]?.trim(),
          time: match[3]?.trim()
        }
      };
    }
  }

  for (const { pattern, confidence } of uploadPatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      return {
        commandType: 'upload_document',
        confidence,
        parameters: {
          document: match[1]?.trim(),
          vault: match[2]?.trim()
        }
      };
    }
  }

  for (const { pattern, confidence } of invitePatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      return {
        commandType: 'invite_member',
        confidence,
        parameters: {
          email: match[1]?.trim(),
          vault: match[2]?.trim(),
          role: match[3]?.trim() || 'viewer'
        }
      };
    }
  }

  return {
    commandType: 'unknown',
    confidence: 0,
    parameters: {}
  };
}