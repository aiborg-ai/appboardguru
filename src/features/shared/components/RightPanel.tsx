'use client';

import React, { useState } from 'react';
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
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  details?: any;
}

const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    content: 'Hello! How can I help you with BoardGuru today?',
    role: 'assistant',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'sent'
  },
  {
    id: '2',
    content: 'Can you help me analyze the Q4 financial report?',
    role: 'user',
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    status: 'sent'
  },
  {
    id: '3',
    content: 'I\'d be happy to help you analyze the Q4 financial report. Could you please upload the document or let me know which specific metrics you\'d like me to focus on?',
    role: 'assistant',
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    status: 'sent'
  }
];

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
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState<PanelTab>('ai-chat');
  
  // Use external control if provided, otherwise use internal state
  const isOpen = externalControl?.isOpen ?? internalIsOpen;
  const activeTab = externalControl?.activeTab ?? internalActiveTab;
  const setIsOpen = externalControl?.onOpenChange ?? setInternalIsOpen;
  const setActiveTab = externalControl?.onTabChange ?? setInternalActiveTab;
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOG_ENTRIES);
  const [logFilter, setLogFilter] = useState<string>('all');

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatMessage,
      role: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    setChatMessage('');

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );

      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'I understand you need help with that. Let me analyze the information and provide you with insights.',
        role: 'assistant',
        timestamp: new Date(),
        status: 'sent'
      };

      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
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

  const panelWidth = isMinimized ? 'w-12' : 'w-96';

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
                <div className="p-3 border-b border-gray-100">
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
                        <p>{message.content}</p>
                        <div className={cn(
                          "text-xs mt-1 flex items-center justify-between",
                          message.role === 'user' ? "text-blue-100" : "text-gray-500"
                        )}>
                          <span>{formatTime(message.timestamp)}</span>
                          {message.status === 'sending' && (
                            <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask me anything..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!chatMessage.trim()}
                      size="sm"
                      className="px-3"
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
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