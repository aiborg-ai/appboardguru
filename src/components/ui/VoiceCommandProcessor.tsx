"use client";

import { useState, useCallback, useEffect } from 'react';
import { VoiceInputButton } from './VoiceInputButton';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { Loader2, CheckCircle, XCircle, AlertCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { useToast } from '@/features/shared/ui/use-toast';
import { cn } from '@/lib/utils';

export interface VoiceCommandResponse {
  success: boolean;
  commandType: string;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  nextSteps?: string[];
  error?: string;
  conversationId?: string;
}

interface VoiceCommandProcessorProps {
  onCommandExecuted?: (command: VoiceCommandResponse) => void;
  onCommandConfirmed?: (command: VoiceCommandResponse, confirmed: boolean) => void;
  className?: string;
  context?: {
    currentPage?: string;
    organizationId?: string;
    vaultId?: string;
  };
  disabled?: boolean;
  sessionId?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function VoiceCommandProcessor({
  onCommandExecuted,
  onCommandConfirmed,
  className,
  context,
  disabled = false,
  sessionId
}: VoiceCommandProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCommand, setCurrentCommand] = useState<VoiceCommandResponse | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(sessionId || '');
  const { toast } = useToast();

  // Generate session ID on mount if not provided
  useEffect(() => {
    if (!sessionId && !currentSessionId) {
      setCurrentSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
    }
  }, [sessionId, currentSessionId]);

  const handleVoiceInput = useCallback(async (transcribedText: string) => {
    if (!transcribedText.trim()) return;

    setIsProcessing(true);
    
    // Add user message to conversation history
    const userMessage: ConversationMessage = {
      role: 'user',
      content: transcribedText,
      timestamp: new Date()
    };
    
    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);

    try {
      const response = await fetch('/api/voice/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcribedText,
          context: {
            ...context,
            sessionId: currentSessionId,
          },
          conversationHistory: updatedHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const commandResult: VoiceCommandResponse = await response.json();

      if (!response.ok) {
        throw new Error(commandResult.error || 'Failed to process voice command');
      }

      if (commandResult.success) {
        setCurrentCommand(commandResult);
        
        // Add assistant response to conversation history
        const assistantMessage: ConversationMessage = {
          role: 'assistant',
          content: commandResult.confirmationMessage || `Recognized: ${commandResult.commandType}`,
          timestamp: new Date()
        };
        setConversationHistory(prev => [...prev, assistantMessage]);

        if (commandResult.requiresConfirmation) {
          setShowConfirmDialog(true);
        } else {
          await executeCommand(commandResult);
        }

        onCommandExecuted?.(commandResult);
      } else {
        toast({
          title: 'Command not recognized',
          description: commandResult.error || 'Please try rephrasing your command.',
          variant: 'default',
        });
      }

    } catch (error) {
      console.error('Voice command processing error:', error);
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Failed to process voice command',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [conversationHistory, currentSessionId, context, onCommandExecuted, toast]);

  const handleConfirmCommand = useCallback(async (confirmed: boolean) => {
    if (!currentCommand) return;

    setShowConfirmDialog(false);
    onCommandConfirmed?.(currentCommand, confirmed);

    if (confirmed) {
      await executeCommand(currentCommand);
    } else {
      toast({
        title: 'Command cancelled',
        description: 'The voice command was not executed.',
        variant: 'default',
      });
      setCurrentCommand(null);
    }
  }, [currentCommand, onCommandConfirmed, toast]);

  const executeCommand = useCallback(async (command: VoiceCommandResponse) => {
    try {
      // Execute the actual command based on type
      const success = await executeSpecificCommand(command);
      
      if (success) {
        toast({
          title: 'Command executed',
          description: `Successfully executed: ${command.commandType}`,
          variant: 'default',
        });
      } else {
        throw new Error('Command execution failed');
      }
    } catch (error) {
      console.error('Command execution error:', error);
      toast({
        title: 'Execution failed',
        description: error instanceof Error ? error.message : 'Failed to execute command',
        variant: 'destructive',
      });
    } finally {
      setCurrentCommand(null);
    }
  }, [toast]);

  const executeSpecificCommand = async (command: VoiceCommandResponse): Promise<boolean> => {
    switch (command.commandType) {
      case 'create_vault':
        return await executeCreateVault(command.parameters);
      case 'schedule_meeting':
        return await executeScheduleMeeting(command.parameters);
      case 'upload_document':
        return await executeUploadDocument(command.parameters);
      case 'invite_member':
        return await executeInviteMember(command.parameters);
      default:
        console.warn('Unknown command type:', command.commandType);
        return false;
    }
  };

  const executeCreateVault = async (parameters: Record<string, any>): Promise<boolean> => {
    try {
      const response = await fetch('/api/vaults/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parameters.name,
          description: parameters.description || `Vault created via voice command`,
          organization_id: context?.organizationId,
          visibility: 'private',
          category: 'other'
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const executeScheduleMeeting = async (parameters: Record<string, any>): Promise<boolean> => {
    try {
      // Parse date/time if provided
      const scheduledStart = parseDateTimeFromVoice(parameters.date, parameters.time);
      const scheduledEnd = new Date(scheduledStart.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hours

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parameters.title,
          description: parameters.description || `Meeting scheduled via voice command`,
          organization_id: context?.organizationId,
          start_datetime: scheduledStart.toISOString(),
          end_datetime: scheduledEnd.toISOString(),
          meeting_type: 'board',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const executeUploadDocument = async (parameters: Record<string, any>): Promise<boolean> => {
    // This would typically open a file picker or redirect to upload page
    // For now, we'll show a notification to guide the user
    toast({
      title: 'Ready to upload',
      description: `Please select the "${parameters.document}" file to upload to ${parameters.vault} vault.`,
      variant: 'default',
    });
    
    // Navigate to upload page or open file picker
    if (typeof window !== 'undefined') {
      // Could redirect to upload page with pre-filled vault selection
      const uploadUrl = `/dashboard/assets?vault=${encodeURIComponent(parameters.vault)}`;
      window.location.href = uploadUrl;
    }
    
    return true;
  };

  const executeInviteMember = async (parameters: Record<string, any>): Promise<boolean> => {
    try {
      // Find vault ID by name (simplified - in practice would need proper vault lookup)
      const response = await fetch('/api/vault-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: parameters.email,
          vault_name: parameters.vault,
          role: parameters.role || 'viewer',
          message: parameters.message || `Invitation sent via voice command`,
          organization_id: context?.organizationId,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const parseDateTimeFromVoice = (dateStr?: string, timeStr?: string): Date => {
    const now = new Date();
    let targetDate = new Date(now);

    if (dateStr) {
      // Handle relative dates like "tomorrow", "next Tuesday", etc.
      const lowerDate = dateStr.toLowerCase();
      if (lowerDate.includes('tomorrow')) {
        targetDate.setDate(now.getDate() + 1);
      } else if (lowerDate.includes('next tuesday')) {
        const daysUntilTuesday = (2 + 7 - now.getDay()) % 7 || 7;
        targetDate.setDate(now.getDate() + daysUntilTuesday);
      } else if (lowerDate.includes('next week')) {
        targetDate.setDate(now.getDate() + 7);
      } else {
        // Try to parse as date
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          targetDate = parsed;
        }
      }
    }

    if (timeStr) {
      // Parse time like "2pm", "14:00", "2:30 PM"
      const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);
      }
    } else {
      // Default to next hour
      targetDate.setHours(now.getHours() + 1, 0, 0, 0);
    }

    return targetDate;
  };

  const getCommandTypeIcon = (commandType: string) => {
    switch (commandType) {
      case 'create_vault':
        return '📁';
      case 'schedule_meeting':
        return '📅';
      case 'upload_document':
        return '📄';
      case 'invite_member':
        return '👥';
      default:
        return '⚡';
    }
  };

  const getCommandTypeBadgeColor = (commandType: string) => {
    switch (commandType) {
      case 'create_vault':
        return 'bg-blue-100 text-blue-800';
      case 'schedule_meeting':
        return 'bg-green-100 text-green-800';
      case 'upload_document':
        return 'bg-yellow-100 text-yellow-800';
      case 'invite_member':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Voice Input Button with Processing State */}
      <div className="flex items-center gap-2">
        <VoiceInputButton
          onTranscription={handleVoiceInput}
          disabled={disabled || isProcessing}
          size="default"
          variant="outline"
          className={cn(
            'transition-all duration-200',
            isProcessing && 'opacity-50',
          )}
        />
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing command...
          </div>
        )}
      </div>

      {/* Conversation History (last few messages) */}
      {conversationHistory.length > 0 && (
        <Card className="max-w-md">
          <CardContent className="p-3">
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {conversationHistory.slice(-3).map((msg, idx) => (
                <div key={idx} className={cn(
                  'text-xs p-2 rounded',
                  msg.role === 'user' 
                    ? 'bg-blue-50 text-blue-900 ml-4' 
                    : 'bg-gray-50 text-gray-900 mr-4'
                )}>
                  <span className="font-medium">
                    {msg.role === 'user' ? 'You: ' : 'Assistant: '}
                  </span>
                  {msg.content}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Command Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Confirm Voice Command
            </DialogTitle>
            <DialogDescription>
              Please review and confirm the following action:
            </DialogDescription>
          </DialogHeader>
          
          {currentCommand && (
            <div className="space-y-4">
              {/* Command Type Badge */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCommandTypeIcon(currentCommand.commandType)}</span>
                <Badge className={getCommandTypeBadgeColor(currentCommand.commandType)}>
                  {currentCommand.commandType.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>

              {/* Confirmation Message */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">
                  {currentCommand.confirmationMessage}
                </p>
              </div>

              {/* Parameters */}
              {Object.keys(currentCommand.parameters).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                    Parameters:
                  </p>
                  <div className="space-y-1">
                    {Object.entries(currentCommand.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                        <span className="text-gray-900 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {currentCommand.nextSteps && currentCommand.nextSteps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700 uppercase tracking-wide flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Next Steps:
                  </p>
                  <ol className="text-xs space-y-1">
                    {currentCommand.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleConfirmCommand(true)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Execute Command
                </Button>
                <Button
                  onClick={() => handleConfirmCommand(false)}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}