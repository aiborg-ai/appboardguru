/**
 * Voice Command Context Manager
 * Handles multi-step workflows and conversation continuity for voice commands
 */

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { VoiceCommandResponse } from '@/app/api/voice/commands/route';

export interface VoiceSession {
  sessionId: string;
  userId: string;
  organizationId?: string;
  startedAt: Date;
  lastActivity: Date;
  context: SessionContext;
  conversationHistory: ConversationMessage[];
  activeWorkflow?: WorkflowState;
}

export interface SessionContext {
  currentPage?: string;
  vaultId?: string;
  meetingId?: string;
  documentId?: string;
  recentEntities: RecentEntity[];
  userPreferences: UserPreferences;
  environmentInfo: EnvironmentInfo;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  commandType?: string;
  parameters?: Record<string, any>;
  confidence?: number;
}

export interface RecentEntity {
  type: 'vault' | 'meeting' | 'document' | 'user';
  id: string;
  name: string;
  lastReferenced: Date;
  referenceCount: number;
}

export interface UserPreferences {
  preferredMeetingDuration: number;
  defaultVaultVisibility: 'private' | 'organization' | 'public';
  timezone: string;
  voiceCommandShortcuts: VoiceShortcut[];
}

export interface VoiceShortcut {
  id: string;
  phrase: string;
  commandType: string;
  parameters: Record<string, any>;
  createdAt: Date;
  useCount: number;
}

export interface WorkflowState {
  workflowId: string;
  type: 'multi_step_vault_creation' | 'meeting_setup' | 'document_upload' | 'bulk_invitation';
  currentStep: number;
  totalSteps: number;
  stepData: Record<string, any>;
  nextExpectedInput?: string;
  timeout?: Date;
}

export interface EnvironmentInfo {
  currentTime: Date;
  businessHours: { start: number; end: number };
  workingDays: number[];
  locale: string;
  dateFormat: string;
}

export class VoiceContextManager {
  private sessions: Map<string, VoiceSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Clean up expired sessions every 10 minutes
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
  }

  /**
   * Get or create a voice session
   */
  async getSession(sessionId: string, userId: string, organizationId?: string): Promise<VoiceSession> {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = await this.createSession(sessionId, userId, organizationId);
      this.sessions.set(sessionId, session);
    } else {
      // Update last activity
      session.lastActivity = new Date();
    }

    return session;
  }

  /**
   * Create a new voice session with context
   */
  private async createSession(sessionId: string, userId: string, organizationId?: string): Promise<VoiceSession> {
    const now = new Date();
    
    // Load user preferences from database
    const userPreferences = await this.loadUserPreferences(userId);
    
    // Get recent entities the user has interacted with
    const recentEntities = await this.loadRecentEntities(userId, organizationId);

    const session: VoiceSession = {
      sessionId,
      userId,
      startedAt: now,
      lastActivity: now,
      context: {
        recentEntities,
        userPreferences,
        environmentInfo: {
          currentTime: now,
          businessHours: { start: 9, end: 17 },
          workingDays: [1, 2, 3, 4, 5], // Monday to Friday
          locale: 'en-US',
          dateFormat: 'MM/dd/yyyy'
        }
      },
      conversationHistory: []
    };

    // Add organizationId only if it exists
    if (organizationId) {
      session.organizationId = organizationId;
    }

    return session;
  }

  /**
   * Add a message to the conversation history
   */
  addToConversation(
    sessionId: string, 
    role: 'user' | 'assistant' | 'system',
    content: string,
    commandType?: string,
    parameters?: Record<string, any>,
    confidence?: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      role,
      content,
      timestamp: new Date()
    };

    // Add optional fields only if they have values
    if (commandType) {
      message.commandType = commandType;
    }
    if (parameters) {
      message.parameters = parameters;
    }
    if (confidence !== undefined) {
      message.confidence = confidence;
    }

    session.conversationHistory.push(message);
    
    // Keep only the last 20 messages to prevent memory issues
    if (session.conversationHistory.length > 20) {
      session.conversationHistory = session.conversationHistory.slice(-20);
    }

    session.lastActivity = new Date();
  }

  /**
   * Process context-aware command with follow-up handling
   */
  async processContextualCommand(
    sessionId: string,
    input: string,
    currentContext?: Partial<SessionContext>
  ): Promise<{
    command: VoiceCommandResponse;
    contextualHelp?: string[];
    suggestedFollowUps?: string[];
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Update context if provided
    if (currentContext) {
      session.context = { ...session.context, ...currentContext };
    }

    // Handle follow-up commands based on conversation history
    const enhancedInput = this.enhanceInputWithContext(input, session);
    
    // Add contextual suggestions based on recent activity
    const contextualHelp = this.generateContextualHelp(session);
    const suggestedFollowUps = this.generateFollowUpSuggestions(session);

    // Add to conversation history
    this.addToConversation(sessionId, 'user', input);

    return {
      command: {
        success: true,
        commandType: 'unknown',
        parameters: { enhancedInput },
        requiresConfirmation: false
      },
      contextualHelp,
      suggestedFollowUps
    };
  }

  /**
   * Handle multi-step workflows
   */
  async startWorkflow(
    sessionId: string,
    workflowType: WorkflowState['type'],
    initialData: Record<string, any>
  ): Promise<WorkflowState> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const workflowState: WorkflowState = {
      workflowId: `workflow_${Date.now()}`,
      type: workflowType,
      currentStep: 1,
      totalSteps: this.getWorkflowSteps(workflowType),
      stepData: initialData,
      timeout: new Date(Date.now() + 10 * 60 * 1000) // 10 minute timeout
    };

    session.activeWorkflow = workflowState;
    return workflowState;
  }

  /**
   * Advance workflow to next step
   */
  async advanceWorkflow(
    sessionId: string,
    stepData: Record<string, any>
  ): Promise<WorkflowState | null> {
    const session = this.sessions.get(sessionId);
    if (!session?.activeWorkflow) return null;

    const workflow = session.activeWorkflow;
    workflow.currentStep++;
    workflow.stepData = { ...workflow.stepData, ...stepData };

    if (workflow.currentStep > workflow.totalSteps) {
      // Workflow complete
      const completedWorkflow = workflow;
      delete session.activeWorkflow;
      await this.executeCompleteWorkflow(sessionId, completedWorkflow);
      return null;
    }

    workflow.nextExpectedInput = this.getNextStepPrompt(workflow);
    return workflow;
  }

  /**
   * Create and manage custom voice shortcuts
   */
  async createVoiceShortcut(
    userId: string,
    phrase: string,
    commandType: string,
    parameters: Record<string, any>
  ): Promise<VoiceShortcut> {
    const shortcut: VoiceShortcut = {
      id: `shortcut_${Date.now()}`,
      phrase: phrase.toLowerCase().trim(),
      commandType,
      parameters,
      createdAt: new Date(),
      useCount: 0
    };

    // Save to database
    const supabase = await createSupabaseServerClient();
    await (supabase as any)
      .from('user_behavior_metrics')
      .insert({
        user_id: userId,
        action_type: 'voice_shortcut_created',
        timestamp: new Date().toISOString(),
        context: {
          shortcut_id: shortcut.id,
          phrase: shortcut.phrase,
          command_type: shortcut.commandType
        }
      } as any);

    return shortcut;
  }

  /**
   * Match input against user's custom shortcuts
   */
  async matchVoiceShortcut(userId: string, input: string): Promise<VoiceShortcut | null> {
    const userPreferences = await this.loadUserPreferences(userId);
    const normalizedInput = input.toLowerCase().trim();

    for (const shortcut of userPreferences.voiceCommandShortcuts) {
      if (normalizedInput.includes(shortcut.phrase)) {
        // Update use count
        shortcut.useCount++;
        await this.updateShortcutUsage(userId, shortcut.id);
        return shortcut;
      }
    }

    return null;
  }

  /**
   * Enhanced input processing with context
   */
  private enhanceInputWithContext(input: string, session: VoiceSession): string {
    let enhanced = input;

    // Handle pronouns and references
    if (input.toLowerCase().includes('that vault') || input.toLowerCase().includes('it')) {
      const lastVault = session.context.recentEntities.find(e => e.type === 'vault');
      if (lastVault) {
        enhanced = enhanced.replace(/that vault|it/gi, lastVault.name);
      }
    }

    if (input.toLowerCase().includes('that meeting')) {
      const lastMeeting = session.context.recentEntities.find(e => e.type === 'meeting');
      if (lastMeeting) {
        enhanced = enhanced.replace(/that meeting/gi, lastMeeting.name);
      }
    }

    // Add implicit context based on recent activity
    if (enhanced.includes('add') && !enhanced.includes('to') && session.context.vaultId) {
      enhanced += ' to current vault';
    }

    return enhanced;
  }

  /**
   * Generate contextual help based on current state
   */
  private generateContextualHelp(session: VoiceSession): string[] {
    const help: string[] = [];

    // Suggest based on recent entities
    if (session.context.recentEntities.length > 0) {
      const recentVault = session.context.recentEntities.find(e => e.type === 'vault');
      if (recentVault) {
        help.push(`Try: "Upload document to ${recentVault.name}"`);
        help.push(`Try: "Invite someone to ${recentVault.name}"`);
      }
    }

    // Suggest based on active workflow
    if (session.activeWorkflow) {
      help.push(session.activeWorkflow.nextExpectedInput || 'Continue with the current workflow');
    }

    // Time-based suggestions
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 11) {
      help.push('Good morning! Try: "Schedule board meeting for next Tuesday"');
    }

    return help;
  }

  /**
   * Generate follow-up suggestions
   */
  private generateFollowUpSuggestions(session: VoiceSession): string[] {
    const suggestions: string[] = [];

    // Based on last command type
    const userCommands = session.conversationHistory.filter(m => m.role === 'user' && m.commandType);
    const lastCommand = userCommands[userCommands.length - 1];
    if (lastCommand) {
      switch (lastCommand.commandType) {
        case 'create_vault':
          suggestions.push('Add documents to the new vault');
          suggestions.push('Invite team members to the vault');
          break;
        case 'schedule_meeting':
          suggestions.push('Add agenda items to the meeting');
          suggestions.push('Invite attendees to the meeting');
          break;
        case 'upload_document':
          suggestions.push('Summarize the uploaded document');
          suggestions.push('Share the document with team');
          break;
      }
    }

    return suggestions;
  }

  /**
   * Load user preferences from database
   */
  private async loadUserPreferences(userId: string): Promise<UserPreferences> {
    const supabase = await createSupabaseServerClient();
    
    // Load user's timezone and preferences
    const { data: user } = await (supabase as any)
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Load custom shortcuts
    const { data: shortcuts } = await (supabase as any)
      .from('user_behavior_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('action_type', 'voice_shortcut_created')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      preferredMeetingDuration: 120,
      defaultVaultVisibility: 'private',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      voiceCommandShortcuts: shortcuts?.map((s: any) => ({
        id: (s as any)?.context?.shortcut_id,
        phrase: (s as any)?.context?.phrase,
        commandType: (s as any)?.context?.command_type,
        parameters: (s as any)?.context?.parameters || {},
        createdAt: new Date((s as any)?.created_at),
        useCount: (s as any)?.engagement_score || 0
      })) || []
    };
  }

  /**
   * Load recent entities user has interacted with
   */
  private async loadRecentEntities(userId: string, organizationId?: string): Promise<RecentEntity[]> {
    const supabase = await createSupabaseServerClient();
    const entities: RecentEntity[] = [];

    // Recent vaults
    const { data: vaults } = await (supabase as any)
      .from('board_packs')
      .select('id, title, updated_at')
      .eq('uploaded_by', userId)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (vaults) {
      entities.push(...vaults.map((v: any) => ({
        type: 'vault' as const,
        id: (v as any)?.id,
        name: (v as any)?.title,
        lastReferenced: new Date((v as any)?.updated_at),
        referenceCount: 1
      })));
    }

    // Recent meetings
    const { data: meetings } = await (supabase as any)
      .from('meetings')
      .select('id, title, updated_at')
      .eq('created_by', userId)
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (meetings) {
      entities.push(...meetings.map((m: any) => ({
        type: 'meeting' as const,
        id: (m as any)?.id,
        name: (m as any)?.title,
        lastReferenced: new Date((m as any)?.updated_at),
        referenceCount: 1
      })));
    }

    return entities.sort((a, b) => b.lastReferenced.getTime() - a.lastReferenced.getTime());
  }

  /**
   * Get number of steps for workflow type
   */
  private getWorkflowSteps(workflowType: WorkflowState['type']): number {
    switch (workflowType) {
      case 'multi_step_vault_creation':
        return 4; // Name, description, documents, permissions
      case 'meeting_setup':
        return 5; // Title, date/time, attendees, agenda, confirmation
      case 'document_upload':
        return 3; // File selection, vault, metadata
      case 'bulk_invitation':
        return 3; // Email list, role, message
      default:
        return 3;
    }
  }

  /**
   * Get next step prompt for workflow
   */
  private getNextStepPrompt(workflow: WorkflowState): string {
    const prompts = {
      multi_step_vault_creation: [
        'What should the vault be called?',
        'Provide a description for the vault',
        'Which documents should be added?',
        'Who should have access to this vault?'
      ],
      meeting_setup: [
        'What is the meeting title?',
        'When should the meeting be scheduled?',
        'Who should be invited?',
        'What agenda items should be included?',
        'Please confirm the meeting details'
      ],
      document_upload: [
        'Select documents to upload',
        'Choose the destination vault',
        'Confirm upload details'
      ],
      bulk_invitation: [
        'Provide email addresses',
        'Select permission levels',
        'Send invitations'
      ]
    };

    const typePrompts = prompts[workflow.type] || ['Continue with next step'];
    return typePrompts[workflow.currentStep - 1] || 'Complete the workflow';
  }

  /**
   * Execute completed workflow
   */
  private async executeCompleteWorkflow(sessionId: string, workflow: WorkflowState): Promise<void> {
    // Implementation would execute the complete workflow
    console.log(`Executing completed workflow: ${workflow.type}`, workflow.stepData);
  }

  /**
   * Update shortcut usage statistics
   */
  private async updateShortcutUsage(userId: string, shortcutId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    await (supabase as any)
      .from('user_behavior_metrics')
      .insert({
        user_id: userId,
        action_type: 'voice_shortcut_used',
        timestamp: new Date().toISOString(),
        context: { shortcut_id: shortcutId }
      } as any);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    this.sessions.forEach((session, sessionId) => {
      if (now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    });

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }
  }
}

// Singleton instance
export const voiceContextManager = new VoiceContextManager();