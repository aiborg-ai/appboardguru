"use client";

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Textarea } from './textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Separator } from './separator';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Mic, 
  Settings, 
  Zap, 
  Clock,
  TrendingUp,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/features/shared/ui/use-toast';
import { cn } from '@/lib/utils';

export interface VoiceShortcut {
  id: string;
  phrase: string;
  commandType: string;
  parameters: Record<string, any>;
  createdAt: Date;
  useCount: number;
  lastUsed?: Date;
  isActive: boolean;
}

interface VoiceShortcutsManagerProps {
  userId: string;
  organizationId?: string;
  onShortcutUsed?: (shortcut: VoiceShortcut) => void;
  className?: string;
}

const COMMAND_TYPES = [
  { value: 'create_vault', label: 'Create Vault', icon: '📁', description: 'Create a new document vault' },
  { value: 'schedule_meeting', label: 'Schedule Meeting', icon: '📅', description: 'Schedule a new meeting' },
  { value: 'upload_document', label: 'Upload Document', icon: '📄', description: 'Upload a document to a vault' },
  { value: 'invite_member', label: 'Invite Member', icon: '👥', description: 'Invite someone to a vault' },
  { value: 'custom', label: 'Custom Action', icon: '⚡', description: 'Custom command action' }
];

const SAMPLE_SHORTCUTS = [
  {
    phrase: "weekly board prep",
    commandType: "create_vault",
    parameters: { name: "Weekly Board Meeting Prep", category: "board_pack" },
    description: "Creates a vault for weekly board meeting preparation"
  },
  {
    phrase: "quarterly review meeting",
    commandType: "schedule_meeting",
    parameters: { title: "Quarterly Business Review", duration: 180, type: "board" },
    description: "Schedules a quarterly review meeting"
  },
  {
    phrase: "add financial report",
    commandType: "upload_document",
    parameters: { category: "financial_report", vault: "current" },
    description: "Uploads a financial report to the current vault"
  }
];

export function VoiceShortcutsManager({ 
  userId, 
  organizationId, 
  onShortcutUsed,
  className 
}: VoiceShortcutsManagerProps) {
  const [shortcuts, setShortcuts] = useState<VoiceShortcut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<VoiceShortcut | null>(null);
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state for creating/editing shortcuts
  const [formData, setFormData] = useState({
    phrase: '',
    commandType: '',
    parameters: {} as Record<string, any>,
    isActive: true
  });

  useEffect(() => {
    loadShortcuts();
  }, [userId]);

  const loadShortcuts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/voice/shortcuts?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setShortcuts(data.shortcuts || []);
      }
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
      toast({
        title: 'Failed to load shortcuts',
        description: 'Please try refreshing the page',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createShortcut = async () => {
    if (!formData.phrase.trim() || !formData.commandType) {
      toast({
        title: 'Missing information',
        description: 'Please provide a phrase and command type',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/voice/shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          organizationId,
          phrase: formData.phrase.trim(),
          commandType: formData.commandType,
          parameters: formData.parameters,
          isActive: formData.isActive
        })
      });

      if (response.ok) {
        const newShortcut = await response.json();
        setShortcuts(prev => [...prev, newShortcut.shortcut]);
        setShowCreateDialog(false);
        resetForm();
        toast({
          title: 'Shortcut created',
          description: `Voice shortcut "${formData.phrase}" has been created`,
          variant: 'default'
        });
      } else {
        throw new Error('Failed to create shortcut');
      }
    } catch (error) {
      console.error('Create shortcut error:', error);
      toast({
        title: 'Failed to create shortcut',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const updateShortcut = async (shortcut: VoiceShortcut) => {
    try {
      const response = await fetch(`/api/voice/shortcuts/${shortcut.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: formData.phrase,
          commandType: formData.commandType,
          parameters: formData.parameters,
          isActive: formData.isActive
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setShortcuts(prev => prev.map(s => s.id === shortcut.id ? updated.shortcut : s));
        setEditingShortcut(null);
        resetForm();
        toast({
          title: 'Shortcut updated',
          description: 'Your changes have been saved',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Update shortcut error:', error);
      toast({
        title: 'Failed to update shortcut',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const deleteShortcut = async (shortcut: VoiceShortcut) => {
    try {
      const response = await fetch(`/api/voice/shortcuts/${shortcut.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setShortcuts(prev => prev.filter(s => s.id !== shortcut.id));
        toast({
          title: 'Shortcut deleted',
          description: `"${shortcut.phrase}" has been removed`,
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Delete shortcut error:', error);
      toast({
        title: 'Failed to delete shortcut',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const duplicateShortcut = async (shortcut: VoiceShortcut) => {
    const duplicated = {
      ...shortcut,
      phrase: `${shortcut.phrase} copy`,
      id: `duplicate_${Date.now()}`
    };
    
    setFormData({
      phrase: duplicated.phrase,
      commandType: duplicated.commandType,
      parameters: duplicated.parameters,
      isActive: duplicated.isActive
    });
    
    setShowCreateDialog(true);
  };

  const startEditing = (shortcut: VoiceShortcut) => {
    setFormData({
      phrase: shortcut.phrase,
      commandType: shortcut.commandType,
      parameters: shortcut.parameters,
      isActive: shortcut.isActive
    });
    setEditingShortcut(shortcut);
  };

  const resetForm = () => {
    setFormData({
      phrase: '',
      commandType: '',
      parameters: {},
      isActive: true
    });
  };

  const handleParameterChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: { ...prev.parameters, [key]: value }
    }));
  };

  const copyPhrase = (phrase: string) => {
    navigator.clipboard.writeText(phrase);
    setCopiedShortcut(phrase);
    setTimeout(() => setCopiedShortcut(null), 2000);
    toast({
      title: 'Copied to clipboard',
      description: `"${phrase}" copied to clipboard`,
      variant: 'default'
    });
  };

  const renderParameterInputs = (commandType: string) => {
    switch (commandType) {
      case 'create_vault':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="vault-name">Default Vault Name</Label>
              <Input
                id="vault-name"
                placeholder="e.g., Board Meeting Prep"
                value={formData.parameters.name || ''}
                onChange={(e) => handleParameterChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vault-category">Category</Label>
              <Select
                value={formData.parameters.category || ''}
                onValueChange={(value) => handleParameterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board_pack">Board Pack</SelectItem>
                  <SelectItem value="meeting_notes">Meeting Notes</SelectItem>
                  <SelectItem value="financial_report">Financial Report</SelectItem>
                  <SelectItem value="legal_document">Legal Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'schedule_meeting':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="meeting-title">Default Meeting Title</Label>
              <Input
                id="meeting-title"
                placeholder="e.g., Board Meeting"
                value={formData.parameters.title || ''}
                onChange={(e) => handleParameterChange('title', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="meeting-duration">Default Duration (minutes)</Label>
              <Input
                id="meeting-duration"
                type="number"
                placeholder="120"
                value={formData.parameters.duration || ''}
                onChange={(e) => handleParameterChange('duration', parseInt(e.target.value) || 120)}
              />
            </div>
            <div>
              <Label htmlFor="meeting-type">Meeting Type</Label>
              <Select
                value={formData.parameters.type || ''}
                onValueChange={(value) => handleParameterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meeting type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="board">Board Meeting</SelectItem>
                  <SelectItem value="committee">Committee Meeting</SelectItem>
                  <SelectItem value="agm">Annual General Meeting</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'upload_document':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="doc-category">Document Category</Label>
              <Select
                value={formData.parameters.category || ''}
                onValueChange={(value) => handleParameterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agenda">Agenda</SelectItem>
                  <SelectItem value="financial_report">Financial Report</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="legal_document">Legal Document</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="target-vault">Target Vault</Label>
              <Select
                value={formData.parameters.vault || ''}
                onValueChange={(value) => handleParameterChange('vault', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vault" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Vault</SelectItem>
                  <SelectItem value="recent">Most Recent Vault</SelectItem>
                  <SelectItem value="prompt">Ask Every Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'invite_member':
        return (
          <div className="space-y-3">
            <div>
              <Label htmlFor="default-role">Default Role</Label>
              <Select
                value={formData.parameters.role || ''}
                onValueChange={(value) => handleParameterChange('role', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="default-message">Default Invitation Message</Label>
              <Textarea
                id="default-message"
                placeholder="You've been invited to collaborate..."
                value={formData.parameters.message || ''}
                onChange={(e) => handleParameterChange('message', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div>
            <Label htmlFor="custom-params">Custom Parameters (JSON)</Label>
            <Textarea
              id="custom-params"
              placeholder='{"key": "value"}'
              value={JSON.stringify(formData.parameters, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData(prev => ({ ...prev, parameters: parsed }));
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        );
    }
  };

  const getShortcutStats = () => {
    const totalUses = shortcuts.reduce((sum, s) => sum + s.useCount, 0);
    const activeShortcuts = shortcuts.filter(s => s.isActive).length;
    const mostUsed = shortcuts.sort((a, b) => b.useCount - a.useCount)[0];
    
    return { totalUses, activeShortcuts, mostUsed };
  };

  const stats = getShortcutStats();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Voice Shortcuts
          </h3>
          <p className="text-sm text-gray-600">
            Create custom voice commands for quick actions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingShortcut(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Shortcut
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingShortcut ? 'Edit Voice Shortcut' : 'Create Voice Shortcut'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="phrase">Voice Phrase</Label>
                <Input
                  id="phrase"
                  placeholder="e.g., 'weekly board prep'"
                  value={formData.phrase}
                  onChange={(e) => setFormData(prev => ({ ...prev, phrase: e.target.value }))}
                />
                <p className="text-xs text-gray-600 mt-1">
                  The phrase you'll say to trigger this command
                </p>
              </div>

              <div>
                <Label htmlFor="commandType">Command Type</Label>
                <Select
                  value={formData.commandType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commandType: value, parameters: {} }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select command type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMAND_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-600">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.commandType && (
                <div>
                  <Label>Parameters</Label>
                  {renderParameterInputs(formData.commandType)}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingShortcut(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => editingShortcut ? updateShortcut(editingShortcut) : createShortcut()}
                >
                  {editingShortcut ? 'Update Shortcut' : 'Create Shortcut'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalUses}</p>
                <p className="text-sm text-gray-600">Total Uses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeShortcuts}</p>
                <p className="text-sm text-gray-600">Active Shortcuts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium truncate">
                  {stats.mostUsed?.phrase || 'None yet'}
                </p>
                <p className="text-sm text-gray-600">Most Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="shortcuts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shortcuts">My Shortcuts</TabsTrigger>
          <TabsTrigger value="samples">Sample Shortcuts</TabsTrigger>
        </TabsList>

        <TabsContent value="shortcuts" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading shortcuts...</div>
          ) : shortcuts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">No shortcuts yet</h4>
                <p className="text-gray-600 mb-4">
                  Create your first voice shortcut to get started with quick commands
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create Your First Shortcut
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {shortcuts.map(shortcut => (
                <Card key={shortcut.id} className={cn(
                  'transition-all duration-200',
                  !shortcut.isActive && 'opacity-60'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {COMMAND_TYPES.find(t => t.value === shortcut.commandType)?.icon}
                            {COMMAND_TYPES.find(t => t.value === shortcut.commandType)?.label || shortcut.commandType}
                          </Badge>
                          {!shortcut.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPhrase(shortcut.phrase)}
                            className="h-auto p-0 text-left font-medium"
                          >
                            "{shortcut.phrase}"
                            {copiedShortcut === shortcut.phrase ? (
                              <Check className="h-3 w-3 ml-1 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100" />
                            )}
                          </Button>
                        </div>

                        <div className="text-sm text-gray-600">
                          <div>Used {shortcut.useCount} times</div>
                          {shortcut.lastUsed && (
                            <div>Last used {new Date(shortcut.lastUsed).toLocaleDateString()}</div>
                          )}
                        </div>

                        {/* Parameters preview */}
                        {Object.keys(shortcut.parameters).length > 0 && (
                          <div className="mt-2 text-xs">
                            <details>
                              <summary className="text-gray-600 cursor-pointer">Parameters</summary>
                              <pre className="mt-1 text-gray-800 bg-gray-50 p-2 rounded text-xs">
                                {JSON.stringify(shortcut.parameters, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateShortcut(shortcut)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(shortcut)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteShortcut(shortcut)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="samples" className="space-y-4">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Get started with these sample shortcuts. Click "Use Template" to customize them.
            </p>
            
            {SAMPLE_SHORTCUTS.map((sample, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          {COMMAND_TYPES.find(t => t.value === sample.commandType)?.icon}
                          {COMMAND_TYPES.find(t => t.value === sample.commandType)?.label}
                        </Badge>
                      </div>
                      
                      <p className="font-medium mb-1">"{sample.phrase}"</p>
                      <p className="text-sm text-gray-600 mb-2">{sample.description}</p>
                      
                      <details>
                        <summary className="text-xs text-gray-600 cursor-pointer">Parameters</summary>
                        <pre className="mt-1 text-gray-800 bg-gray-50 p-2 rounded text-xs">
                          {JSON.stringify(sample.parameters, null, 2)}
                        </pre>
                      </details>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          phrase: sample.phrase,
                          commandType: sample.commandType,
                          parameters: sample.parameters,
                          isActive: true
                        });
                        setShowCreateDialog(true);
                      }}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingShortcut} onOpenChange={(open) => !open && setEditingShortcut(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Voice Shortcut</DialogTitle>
          </DialogHeader>
          
          {editingShortcut && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-phrase">Voice Phrase</Label>
                <Input
                  id="edit-phrase"
                  value={formData.phrase}
                  onChange={(e) => setFormData(prev => ({ ...prev, phrase: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-commandType">Command Type</Label>
                <Select
                  value={formData.commandType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, commandType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMAND_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.commandType && (
                <div>
                  <Label>Parameters</Label>
                  {renderParameterInputs(formData.commandType)}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setEditingShortcut(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateShortcut(editingShortcut)}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}