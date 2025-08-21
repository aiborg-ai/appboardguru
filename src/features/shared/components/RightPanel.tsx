'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { 
  MessageSquare, 
  FileText, 
  X, 
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  Bot,
  Settings,
  MoreVertical,
  Minimize2,
  Maximize2,
  Copy,
  Download,
  Trash2,
  Filter,
  Globe,
  Building2,
  Folder,
  FileIcon,
  ChevronDown,
  Loader2,
  RefreshCw,
  ExternalLink,
  FileText as DocumentIcon,
  Calendar,
  BarChart3,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/features/shared/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/contexts/OrganizationContext';
import { CONTEXT_SCOPE_OPTIONS, mapContextScopeToChat, type ContextScopeOption } from '@/features/ai-chat/ai/ScopeSelectorTypes';
import { EnhancedChatResponse, AssetReference, WebReference, VaultReference, MeetingReference, ReportReference } from '@/types/search';

interface RightPanelProps {
  className?: string;
  externalControl?: {
    isOpen: boolean;
    activeTab: PanelTab;
    onOpenChange: (open: boolean) => void;
    onTabChange: (tab: PanelTab) => void;
  };
}

type PanelTab = 'ai-chat' | 'logs';

type ContextScope = 'general' | 'boardguru' | 'organization' | 'vault' | 'asset';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface Vault {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
}

interface Asset {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface SelectedContext {
  organizationId?: string;
  organizationName?: string;
  vaultId?: string;
  vaultName?: string;
  assetId?: string;
  assetName?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  scope?: {
    type: string;
    label: string;
  };
  isWebSearch?: boolean;
  references?: EnhancedChatResponse['references'];
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: any;
}


const MOCK_LOG_ENTRIES: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    level: 'info',
    source: 'meetings.create',
    message: 'Meeting wizard opened',
    details: { organizationId: 'org_123', userId: 'user_456' }
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 90 * 1000),
    level: 'info',
    source: 'ai.chat',
    message: 'Chat session started',
    details: { sessionId: 'chat_789' }
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 30 * 1000),
    level: 'warn',
    source: 'api.dashboard',
    message: 'Rate limit approaching',
    details: { endpoint: '/api/dashboard/metrics', remaining: 5 }
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 10 * 1000),
    level: 'error',
    source: 'vault.upload',
    message: 'File upload failed',
    details: { fileName: 'board-pack.pdf', error: 'Network timeout' }
  }
];

const LOG_LEVEL_CONFIG = {
  info: { color: 'text-blue-600 bg-blue-50', label: 'INFO' },
  warn: { color: 'text-yellow-600 bg-yellow-50', label: 'WARN' },
  error: { color: 'text-red-600 bg-red-50', label: 'ERROR' },
  debug: { color: 'text-gray-600 bg-gray-50', label: 'DEBUG' }
};


export default function RightPanel({ className, externalControl }: RightPanelProps) {
  // Organization context
  const { currentOrganization, currentVault, organizations } = useOrganization();
  
  // Internal state - always start closed to prevent auto-opening
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState<PanelTab>('ai-chat');
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalControl?.isOpen ?? internalIsOpen;
  const activeTab = externalControl?.activeTab ?? internalActiveTab;
  const setIsOpen = externalControl?.onOpenChange ?? setInternalIsOpen;
  const setActiveTab = externalControl?.onTabChange ?? setInternalActiveTab;
  const [isMinimized, setIsMinimized] = useState(false);
  
  // AI Chat state
  const [contextScope, setContextScope] = useState<ContextScope>('boardguru');
  const [selectedContext, setSelectedContext] = useState<SelectedContext>({});
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Available data for selection
  const [availableVaults, setAvailableVaults] = useState<Vault[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [isLoadingVaults, setIsLoadingVaults] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Debug context scope changes
  React.useEffect(() => {
    console.log('Context scope changed to:', contextScope, 'Selected context:', selectedContext);
  }, [contextScope, selectedContext]);
  
  // Load state from localStorage on mount
  useEffect(() => {
    const savedScope = localStorage.getItem('ai-chat-context-scope');
    const savedContext = localStorage.getItem('ai-chat-selected-context');
    
    if (savedScope && ['general', 'boardguru', 'organization', 'vault', 'asset'].includes(savedScope)) {
      setContextScope(savedScope as ContextScope);
    }
    
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext);
        setSelectedContext(parsed);
      } catch (e) {
        console.error('Failed to parse saved context:', e);
      }
    }
  }, []);
  
  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('ai-chat-context-scope', contextScope);
    localStorage.setItem('ai-chat-selected-context', JSON.stringify(selectedContext));
  }, [contextScope, selectedContext]);
  
  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOG_ENTRIES);
  const [logFilter, setLogFilter] = useState<string>('all');

  // Fetch vaults for a specific organization
  const fetchVaultsForOrganization = useCallback(async (orgId: string) => {
    setIsLoadingVaults(true);
    try {
      const response = await fetch(`/api/vaults?organizationId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableVaults(data.vaults || []);
      } else {
        console.error('Failed to fetch vaults');
        setAvailableVaults([]);
      }
    } catch (error) {
      console.error('Error fetching vaults:', error);
      setAvailableVaults([]);
    } finally {
      setIsLoadingVaults(false);
    }
  }, []);
  
  // Fetch assets for a specific vault
  const fetchAssetsForVault = useCallback(async (vaultId: string) => {
    setIsLoadingAssets(true);
    try {
      const response = await fetch(`/api/vaults/${vaultId}/assets`);
      if (response.ok) {
        const data = await response.json();
        const transformedAssets = data.assets?.map((va: any) => ({
          id: va.asset.id,
          title: va.asset.title,
          fileName: va.asset.fileName,
          fileType: va.asset.fileType,
          fileSize: va.asset.fileSize
        })) || [];
        setAvailableAssets(transformedAssets);
      } else {
        console.error('Failed to fetch assets');
        setAvailableAssets([]);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setAvailableAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  }, []);
  
  // Helper functions
  const getAvailableScopes = (): ContextScopeOption[] => {
    const availableScopes = [...CONTEXT_SCOPE_OPTIONS.filter(scope => 
      scope.id === 'general' || scope.id === 'boardguru'
    )];
    
    // Always show organization and vault options
    const orgScope = CONTEXT_SCOPE_OPTIONS.find(s => s.id === 'organization');
    const vaultScope = CONTEXT_SCOPE_OPTIONS.find(s => s.id === 'vault');
    const assetScope = CONTEXT_SCOPE_OPTIONS.find(s => s.id === 'asset');
    
    if (orgScope) availableScopes.push(orgScope);
    if (vaultScope) availableScopes.push(vaultScope);
    if (assetScope) availableScopes.push(assetScope);
    
    return availableScopes;
  };

  const getContextScopeLabel = (scope: ContextScope): string => {
    const baseOption = CONTEXT_SCOPE_OPTIONS.find(o => o.id === scope);
    if (!baseOption) return 'Unknown';
    
    switch (scope) {
      case 'organization':
        return selectedContext.organizationName || 'Select Organization';
      case 'vault':
        return selectedContext.vaultName || 'Select Vault';
      case 'asset':
        return selectedContext.assetName || 'Select Asset';
      default:
        return baseOption.label;
    }
  };
  
  const getCurrentContextHierarchy = (): string[] => {
    const hierarchy: string[] = [];
    if (selectedContext.organizationName) hierarchy.push(selectedContext.organizationName);
    if (selectedContext.vaultName) hierarchy.push(selectedContext.vaultName);
    if (selectedContext.assetName) hierarchy.push(selectedContext.assetName);
    return hierarchy;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setChatMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: {
            scope: contextScope,
            organizationId: selectedContext.organizationId,
            organizationName: selectedContext.organizationName,
            vaultId: selectedContext.vaultId,
            vaultName: selectedContext.vaultName,
            assetId: selectedContext.assetId,
            assetName: selectedContext.assetName
          },
          options: {
            includeWebSearch: contextScope === 'general',
            includeReferences: true,
            maxReferences: 5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: EnhancedChatResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        references: data.references,
        scope: {
          type: contextScope,
          label: getContextScopeLabel(contextScope)
        },
        isWebSearch: contextScope === 'general'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setError(null);
  };
  
  const handleScopeChange = (newScope: ContextScope) => {
    setContextScope(newScope);
    // Clear selected context when changing scope
    setSelectedContext({});
    setAvailableVaults([]);
    setAvailableAssets([]);
  };
  
  const handleContextSelection = (type: 'organization' | 'vault' | 'asset', selection: any) => {
    const newContext = { ...selectedContext };
    
    if (type === 'organization') {
      newContext.organizationId = selection.id;
      newContext.organizationName = selection.name;
      // Clear vault and asset when organization changes
      delete newContext.vaultId;
      delete newContext.vaultName;
      delete newContext.assetId;
      delete newContext.assetName;
      setAvailableAssets([]);
      fetchVaultsForOrganization(selection.id);
    } else if (type === 'vault') {
      newContext.vaultId = selection.id;
      newContext.vaultName = selection.name;
      // Clear asset when vault changes
      delete newContext.assetId;
      delete newContext.assetName;
      fetchAssetsForVault(selection.id);
    } else if (type === 'asset') {
      newContext.assetId = selection.id;
      newContext.assetName = selection.title;
    }
    
    setSelectedContext(newContext);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => 
    logFilter === 'all' || log.level === logFilter
  );

  const panelWidth = isMinimized ? 'w-12' : 'w-80';

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40">
          <Button
            onClick={() => setIsOpen(true)}
            className="rounded-l-lg rounded-r-none bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Panel */}
      <div className={cn(
        "fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl z-50 transform transition-all duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full",
        panelWidth,
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
          {!isMinimized && (
            <>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Button
                    variant={activeTab === 'ai-chat' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('ai-chat')}
                    className="text-xs px-2 py-1"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    AI Chat
                  </Button>
                  <Button
                    variant={activeTab === 'logs' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('logs')}
                    className="text-xs px-2 py-1"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Logs
                    <Badge variant="outline" className="ml-1 text-xs px-1">
                      {logs.length}
                    </Badge>
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(true)}
                  className="h-6 w-6 p-0"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}

          {isMinimized && (
            <div className="flex flex-col items-center space-y-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(false)}
                className="h-8 w-8 p-0"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('ai-chat')}
                className={cn(
                  "h-8 w-8 p-0",
                  activeTab === 'ai-chat' && "bg-blue-100 text-blue-600"
                )}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab('logs')}
                className={cn(
                  "h-8 w-8 p-0 relative",
                  activeTab === 'logs' && "bg-blue-100 text-blue-600"
                )}
              >
                <FileText className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {logs.length > 99 ? '99+' : logs.length}
                </div>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 mt-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* AI Chat Tab */}
            {activeTab === 'ai-chat' && (
              <div className="flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-3 border-b border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">AI Assistant</h3>
                        <p className="text-xs text-gray-500">Always ready to help</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Context Scope Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Context Scope</label>
                    
                    {/* Context hierarchy breadcrumb */}
                    {getCurrentContextHierarchy().length > 0 && (
                      <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        {getCurrentContextHierarchy().join(' → ')}
                      </div>
                    )}
                    
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between text-xs h-8"
                        >
                          <div className="flex items-center space-x-2">
                            {React.createElement(
                              CONTEXT_SCOPE_OPTIONS.find(o => o.id === contextScope)?.icon || Bot,
                              { className: "h-3 w-3" }
                            )}
                            <span>{getContextScopeLabel(contextScope)}</span>
                          </div>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-80" align="start" side="bottom" sideOffset={4}>
                        {/* Basic scopes */}
                        <DropdownMenuLabel>Basic Scopes</DropdownMenuLabel>
                        {getAvailableScopes().filter(s => s.id === 'general' || s.id === 'boardguru').map((scopeOption) => {
                          const Icon = scopeOption.icon;
                          return (
                            <DropdownMenuItem
                              key={scopeOption.id}
                              onSelect={() => handleScopeChange(scopeOption.id as ContextScope)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center space-x-2 w-full">
                                <Icon className="h-4 w-4" />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{scopeOption.label}</div>
                                  <div className="text-xs text-gray-500">{scopeOption.description}</div>
                                </div>
                                {contextScope === scopeOption.id && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </div>
                            </DropdownMenuItem>
                          );
                        })}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Organization scope */}
                        <DropdownMenuLabel>Organization Context</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => handleScopeChange('organization')}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 w-full">
                            <Building2 className="h-4 w-4" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Organization</div>
                              <div className="text-xs text-gray-500">Select a specific organization</div>
                            </div>
                            {contextScope === 'organization' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        
                        {/* Show organization selection if in organization mode */}
                        {contextScope === 'organization' && organizations.length > 0 && (
                          <div className="pl-6 space-y-1">
                            {organizations.map((org: any) => (
                              <DropdownMenuItem
                                key={org.id}
                                onSelect={() => handleContextSelection('organization', org)}
                                className={cn(
                                  "cursor-pointer text-xs",
                                  selectedContext.organizationId === org.id && "bg-blue-50"
                                )}
                              >
                                {org.name}
                                {selectedContext.organizationId === org.id && (
                                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Vault scope */}
                        <DropdownMenuLabel>Vault Context</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => handleScopeChange('vault')}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 w-full">
                            <Folder className="h-4 w-4" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Vault</div>
                              <div className="text-xs text-gray-500">Select a specific vault</div>
                            </div>
                            {contextScope === 'vault' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        
                        {/* Show vault selection if in vault mode */}
                        {contextScope === 'vault' && (
                          <div className="pl-6 space-y-1">
                            {/* Organization selection for vaults */}
                            {!selectedContext.organizationId && (
                              <div className="text-xs text-gray-500 p-2">First select an organization:</div>
                            )}
                            {!selectedContext.organizationId && organizations.map((org: any) => (
                              <DropdownMenuItem
                                key={org.id}
                                onSelect={() => handleContextSelection('organization', org)}
                                className="cursor-pointer text-xs"
                              >
                                <Building2 className="h-3 w-3 mr-2" />
                                {org.name}
                              </DropdownMenuItem>
                            ))}
                            
                            {/* Vault selection */}
                            {selectedContext.organizationId && (
                              <>
                                {isLoadingVaults && (
                                  <div className="flex items-center text-xs text-gray-500 p-2">
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    Loading vaults...
                                  </div>
                                )}
                                {!isLoadingVaults && availableVaults.length === 0 && (
                                  <div className="text-xs text-gray-500 p-2">No vaults found</div>
                                )}
                                {availableVaults.map((vault) => (
                                  <DropdownMenuItem
                                    key={vault.id}
                                    onSelect={() => handleContextSelection('vault', vault)}
                                    className={cn(
                                      "cursor-pointer text-xs",
                                      selectedContext.vaultId === vault.id && "bg-blue-50"
                                    )}
                                  >
                                    <Folder className="h-3 w-3 mr-2" />
                                    {vault.name}
                                    {selectedContext.vaultId === vault.id && (
                                      <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Asset scope */}
                        <DropdownMenuLabel>Asset Context</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={() => handleScopeChange('asset')}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 w-full">
                            <FileIcon className="h-4 w-4" />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Asset</div>
                              <div className="text-xs text-gray-500">Select a specific asset</div>
                            </div>
                            {contextScope === 'asset' && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </DropdownMenuItem>
                        
                        {/* Show asset selection if in asset mode */}
                        {contextScope === 'asset' && (
                          <div className="pl-6 space-y-1 max-h-32 overflow-y-auto">
                            {/* Organization and vault selection for assets */}
                            {!selectedContext.organizationId && (
                              <div className="text-xs text-gray-500 p-2">First select an organization:</div>
                            )}
                            {!selectedContext.organizationId && organizations.map((org: any) => (
                              <DropdownMenuItem
                                key={org.id}
                                onSelect={() => handleContextSelection('organization', org)}
                                className="cursor-pointer text-xs"
                              >
                                <Building2 className="h-3 w-3 mr-2" />
                                {org.name}
                              </DropdownMenuItem>
                            ))}
                            
                            {selectedContext.organizationId && !selectedContext.vaultId && (
                              <>
                                <div className="text-xs text-gray-500 p-2">Then select a vault:</div>
                                {isLoadingVaults && (
                                  <div className="flex items-center text-xs text-gray-500 p-2">
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    Loading vaults...
                                  </div>
                                )}
                                {availableVaults.map((vault) => (
                                  <DropdownMenuItem
                                    key={vault.id}
                                    onSelect={() => handleContextSelection('vault', vault)}
                                    className="cursor-pointer text-xs"
                                  >
                                    <Folder className="h-3 w-3 mr-2" />
                                    {vault.name}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                            
                            {/* Asset selection */}
                            {selectedContext.vaultId && (
                              <>
                                {isLoadingAssets && (
                                  <div className="flex items-center text-xs text-gray-500 p-2">
                                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    Loading assets...
                                  </div>
                                )}
                                {!isLoadingAssets && availableAssets.length === 0 && (
                                  <div className="text-xs text-gray-500 p-2">No assets found</div>
                                )}
                                {availableAssets.map((asset) => (
                                  <DropdownMenuItem
                                    key={asset.id}
                                    onSelect={() => handleContextSelection('asset', asset)}
                                    className={cn(
                                      "cursor-pointer text-xs",
                                      selectedContext.assetId === asset.id && "bg-blue-50"
                                    )}
                                  >
                                    <FileIcon className="h-3 w-3 mr-2" />
                                    <div className="flex-1 min-w-0">
                                      <div className="truncate">{asset.title}</div>
                                      <div className="text-xs text-gray-400">{asset.fileName}</div>
                                    </div>
                                    {selectedContext.assetId === asset.id && (
                                      <div className="ml-2 w-2 h-2 bg-blue-500 rounded-full" />
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Clear selection option */}
                        {(selectedContext.organizationId || selectedContext.vaultId || selectedContext.assetId) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() => {
                                setSelectedContext({});
                                setAvailableVaults([]);
                                setAvailableAssets([]);
                              }}
                              className="cursor-pointer text-red-600"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Clear Selection
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          message.role === 'user'
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        {/* Context scope indicator for messages */}
                        {message.scope && message.scope.type !== 'global' && (
                          <div className={cn(
                            "flex items-center space-x-1 text-xs mb-2 pb-1 border-b",
                            message.role === 'user' 
                              ? "text-blue-100 border-blue-400" 
                              : "text-gray-500 border-gray-300"
                          )}>
                            <Bot className="h-3 w-3" />
                            <span>{message.scope.label}</span>
                          </div>
                        )}
                        <div className="space-y-2">
                          <p className="whitespace-pre-wrap">{message.content}</p>
                          
                          {/* References Section */}
                          {message.references && (
                            <div className="mt-3 space-y-3">
                              {/* Asset References */}
                              {message.references.assets && message.references.assets.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                                    📄 Documents ({message.references.assets.length})
                                  </div>
                                  <div className="space-y-1">
                                    {message.references.assets.map((asset, index) => (
                                      <a
                                        key={asset.id}
                                        href={asset.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start space-x-2 p-2 bg-white bg-opacity-50 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-xs group"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        <DocumentIcon className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                                            {asset.title}
                                          </div>
                                          <div className="text-gray-500 truncate">
                                            {asset.description || asset.metadata.fileName}
                                          </div>
                                          {asset.metadata.vault && (
                                            <div className="text-gray-400 text-xs">
                                              📁 {asset.metadata.vault.name}
                                            </div>
                                          )}
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Vault References */}
                              {message.references.vaults && message.references.vaults.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                                    📁 Vaults ({message.references.vaults.length})
                                  </div>
                                  <div className="space-y-1">
                                    {message.references.vaults.map((vault, index) => (
                                      <a
                                        key={vault.id}
                                        href={vault.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start space-x-2 p-2 bg-white bg-opacity-50 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-xs group"
                                      >
                                        <Folder className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate group-hover:text-green-600">
                                            {vault.name}
                                          </div>
                                          <div className="text-gray-500 truncate">
                                            {vault.description}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            {vault.asset_count} assets • {vault.member_count} members
                                          </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-green-600" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Meeting References */}
                              {message.references.meetings && message.references.meetings.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                                    🗓️ Meetings ({message.references.meetings.length})
                                  </div>
                                  <div className="space-y-1">
                                    {message.references.meetings.map((meeting, index) => (
                                      <a
                                        key={meeting.id}
                                        href={meeting.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start space-x-2 p-2 bg-white bg-opacity-50 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-xs group"
                                      >
                                        <Calendar className="h-3 w-3 text-purple-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate group-hover:text-purple-600">
                                            {meeting.title}
                                          </div>
                                          <div className="text-gray-500 truncate">
                                            {meeting.description}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            {meeting.meeting_type} • {meeting.status}
                                          </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Website References */}
                              {message.references.websites && message.references.websites.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                                    🌐 Web Resources ({message.references.websites.length})
                                  </div>
                                  <div className="space-y-1">
                                    {message.references.websites.map((website, index) => (
                                      <a
                                        key={index}
                                        href={website.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start space-x-2 p-2 bg-white bg-opacity-50 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-xs group"
                                      >
                                        <Globe className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate group-hover:text-blue-500">
                                            {website.title}
                                          </div>
                                          <div className="text-gray-500 truncate">
                                            {website.description || website.domain}
                                          </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-500" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Reports References */}
                              {message.references.reports && message.references.reports.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs font-semibold text-gray-600 border-b border-gray-300 pb-1">
                                    📊 Reports ({message.references.reports.length})
                                  </div>
                                  <div className="space-y-1">
                                    {message.references.reports.map((report, index) => (
                                      <a
                                        key={report.id}
                                        href={report.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start space-x-2 p-2 bg-white bg-opacity-50 rounded border border-gray-200 hover:bg-gray-50 transition-colors text-xs group"
                                      >
                                        <BarChart3 className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-gray-900 truncate group-hover:text-orange-600">
                                            {report.title}
                                          </div>
                                          <div className="text-gray-500 truncate">
                                            {report.description}
                                          </div>
                                          <div className="text-gray-400 text-xs">
                                            {report.type}
                                          </div>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-orange-600" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "text-xs mt-1 flex items-center justify-between",
                          message.role === 'user' ? "text-blue-100" : "text-gray-500"
                        )}>
                          <span>{formatTime(message.timestamp)}</span>
                          {message.isWebSearch && (
                            <Globe className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 rounded-lg px-3 py-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Error display */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      <p className="font-medium">Error:</p>
                      <p>{error}</p>
                    </div>
                  )}
                  
                  {/* Welcome message when no messages */}
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      <Bot className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>Hello! I'm your AI assistant.</p>
                      <p>Ask me anything about BoardGuru or your organization.</p>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder="Ask me anything..."
                      disabled={isLoading}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim() || isLoading}
                      size="sm"
                      className="px-3"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Clear messages button */}
                  {messages.length > 0 && (
                    <div className="flex justify-center mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearMessages}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear conversation
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="flex flex-col h-full">
                {/* Logs Header */}
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">System Logs</h3>
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="all">All Levels</option>
                    <option value="error">Errors</option>
                    <option value="warn">Warnings</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </select>
                </div>

                {/* Log Entries */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {filteredLogs.map((log) => {
                    const levelConfig = LOG_LEVEL_CONFIG[log.level];
                    return (
                      <div
                        key={log.id}
                        className="p-2 text-xs border border-gray-200 rounded hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Badge className={cn("text-xs px-1 py-0", levelConfig.color)}>
                            {levelConfig.label}
                          </Badge>
                          <span className="text-gray-500">
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        <div className="font-mono text-gray-700 mb-1">
                          {log.source}
                        </div>
                        <div className="text-gray-900 mb-1">
                          {log.message}
                        </div>
                        {log.details && (
                          <div className="bg-gray-50 p-1 rounded text-gray-600 font-mono text-xs">
                            {JSON.stringify(log.details, null, 2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}