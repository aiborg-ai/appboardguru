"use client";

import { useState, useEffect } from 'react';
import { VoiceCommandProcessor } from './VoiceCommandProcessor';
import { VoiceShortcutsManager } from './VoiceShortcutsManager';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { 
  Mic, 
  Settings, 
  Activity, 
  TrendingUp,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/features/shared/ui/use-toast';
import { cn } from '@/lib/utils';

interface VoiceCommandIntegrationProps {
  userId: string;
  organizationId?: string;
  context?: {
    currentPage?: string;
    vaultId?: string;
    meetingId?: string;
  };
  className?: string;
  showShortcuts?: boolean;
}

interface VoiceActivity {
  id: string;
  timestamp: Date;
  command: string;
  commandType: string;
  success: boolean;
  executionTime?: number;
}

export function VoiceCommandIntegration({
  userId,
  organizationId,
  context,
  className,
  showShortcuts = true
}: VoiceCommandIntegrationProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [recentActivity, setRecentActivity] = useState<VoiceActivity[]>([]);
  const [sessionStats, setSessionStats] = useState({
    commandsExecuted: 0,
    successRate: 0,
    avgResponseTime: 0,
    shortcutsUsed: 0
  });
  const [showStats, setShowStats] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
  const { toast } = useToast();

  useEffect(() => {
    // Load recent activity on mount
    loadRecentActivity();
  }, [userId]);

  const loadRecentActivity = async () => {
    try {
      const response = await fetch(`/api/voice/commands?userId=${userId}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const activities: VoiceActivity[] = (data.history || []).map((item: any) => ({
          id: item.id,
          timestamp: new Date(item.created_at),
          command: item.details?.original_text || 'Unknown command',
          commandType: item.details?.command_type || 'unknown',
          success: item.outcome === 'success',
          executionTime: item.response_time_ms
        }));
        setRecentActivity(activities);
        updateSessionStats(activities);
      }
    } catch (error) {
      console.error('Failed to load recent activity:', error);
    }
  };

  const updateSessionStats = (activities: VoiceActivity[]) => {
    const totalCommands = activities.length;
    const successfulCommands = activities.filter(a => a.success).length;
    const shortcutCommands = activities.filter(a => a.commandType === 'shortcut_used').length;
    const avgTime = activities
      .filter(a => a.executionTime)
      .reduce((sum, a) => sum + (a.executionTime || 0), 0) / Math.max(1, activities.filter(a => a.executionTime).length);

    setSessionStats({
      commandsExecuted: totalCommands,
      successRate: totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0,
      avgResponseTime: avgTime,
      shortcutsUsed: shortcutCommands
    });
  };

  const handleCommandExecuted = (command: any) => {
    const activity: VoiceActivity = {
      id: `activity_${Date.now()}`,
      timestamp: new Date(),
      command: command.confirmationMessage || `${command.commandType} command`,
      commandType: command.commandType,
      success: command.success,
      executionTime: Math.random() * 1000 + 500 // Simulated response time
    };

    setRecentActivity(prev => [activity, ...prev.slice(0, 9)]);
    updateSessionStats([activity, ...recentActivity]);

    // Show success toast
    if (command.success) {
      toast({
        title: 'Voice command processed',
        description: command.confirmationMessage,
        variant: 'default'
      });
    }
  };

  const handleCommandConfirmed = (command: any, confirmed: boolean) => {
    const action = confirmed ? 'executed' : 'cancelled';
    toast({
      title: `Command ${action}`,
      description: confirmed 
        ? `${command.commandType.replace('_', ' ')} command has been executed`
        : 'Voice command was cancelled',
      variant: confirmed ? 'default' : 'default'
    });

    if (confirmed) {
      // Update stats for confirmed execution
      setSessionStats(prev => ({
        ...prev,
        commandsExecuted: prev.commandsExecuted + 1
      }));
    }
  };

  const getCommandTypeColor = (commandType: string) => {
    switch (commandType) {
      case 'create_vault':
        return 'bg-blue-100 text-blue-800';
      case 'schedule_meeting':
        return 'bg-green-100 text-green-800';
      case 'upload_document':
        return 'bg-yellow-100 text-yellow-800';
      case 'invite_member':
        return 'bg-purple-100 text-purple-800';
      case 'shortcut_used':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Voice Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-blue-500" />
              Voice Commands
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={showStats} onOpenChange={setShowStats}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Activity className="h-4 w-4 mr-2" />
                    Stats
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Voice Command Statistics</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {sessionStats.commandsExecuted}
                      </div>
                      <div className="text-sm text-gray-600">Commands Executed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {sessionStats.successRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {sessionStats.avgResponseTime.toFixed(0)}ms
                      </div>
                      <div className="text-sm text-gray-600">Avg Response Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {sessionStats.shortcutsUsed}
                      </div>
                      <div className="text-sm text-gray-600">Shortcuts Used</div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button
                variant={isEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEnabled(!isEnabled)}
              >
                {isEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Voice Command Processor */}
            <VoiceCommandProcessor
              onCommandExecuted={handleCommandExecuted}
              onCommandConfirmed={handleCommandConfirmed}
              context={{
                ...context,
                organizationId
              }}
              disabled={!isEnabled}
              sessionId={sessionId}
              className="w-full"
            />

            {/* Quick Help */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Quick Commands:</p>
                  <ul className="text-blue-800 space-y-0.5">
                    <li>"Create vault called Project Alpha"</li>
                    <li>"Schedule board meeting next Tuesday at 2pm"</li>
                    <li>"Upload financial report to Q3 vault"</li>
                    <li>"Invite john@company.com to the vault"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="activity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          {showShortcuts && <TabsTrigger value="shortcuts">Voice Shortcuts</TabsTrigger>}
        </TabsList>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Commands
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h4>
                  <p className="text-gray-600">
                    Start using voice commands to see your activity here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(activity.success)}
                        <div>
                          <p className="font-medium text-sm">{activity.command}</p>
                          <p className="text-xs text-gray-600">
                            {activity.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={getCommandTypeColor(activity.commandType)}
                          variant="secondary"
                        >
                          {activity.commandType.replace('_', ' ')}
                        </Badge>
                        
                        {activity.executionTime && (
                          <span className="text-xs text-gray-500">
                            {activity.executionTime.toFixed(0)}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showShortcuts && (
          <TabsContent value="shortcuts">
            <VoiceShortcutsManager
              userId={userId}
              organizationId={organizationId}
              onShortcutUsed={(shortcut) => {
                const activity: VoiceActivity = {
                  id: `shortcut_${Date.now()}`,
                  timestamp: new Date(),
                  command: `Used shortcut: "${shortcut.phrase}"`,
                  commandType: 'shortcut_used',
                  success: true
                };
                setRecentActivity(prev => [activity, ...prev.slice(0, 9)]);
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Context Information */}
      {(context?.currentPage || context?.vaultId || context?.meetingId) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Current Context</span>
            </div>
            <div className="space-y-1">
              {context.currentPage && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Page:</span>
                  <Badge variant="outline">{context.currentPage}</Badge>
                </div>
              )}
              {context.vaultId && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Vault:</span>
                  <Badge variant="outline">{context.vaultId}</Badge>
                </div>
              )}
              {context.meetingId && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Meeting:</span>
                  <Badge variant="outline">{context.meetingId}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{sessionStats.commandsExecuted}</p>
                <p className="text-sm text-gray-600">Commands Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{sessionStats.successRate.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{sessionStats.shortcutsUsed}</p>
                <p className="text-sm text-gray-600">Shortcuts Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}