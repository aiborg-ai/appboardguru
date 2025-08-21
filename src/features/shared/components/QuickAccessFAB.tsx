'use client';

import React, { useState } from 'react';
import { Button } from '@/features/shared/ui/button';
import { MessageSquare, FileText, Zap, ChevronUp, ChevronDown, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAccessFABProps {
  onOpenPanel: (tab: 'ai-chat' | 'logs') => void;
  className?: string;
}

export default function QuickAccessFAB({ onOpenPanel, className }: QuickAccessFABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    {
      id: 'ai-chat',
      label: 'AI Assistant',
      icon: MessageSquare,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Ask questions, get insights',
      shortcut: 'Ctrl+K'
    },
    {
      id: 'logs',
      label: 'System Logs',
      icon: FileText,
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'View system activity',
      shortcut: 'Ctrl+Shift+L'
    }
  ];

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-30 flex flex-col items-end space-y-3",
      className
    )}>
      {/* Quick Action Buttons */}
      {isExpanded && (
        <div className="flex flex-col space-y-2 animate-in slide-in-from-bottom-2 duration-200">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div key={action.id} className="flex items-center space-x-3">
                <div className="bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200 min-w-[200px]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm font-medium text-gray-900">{action.label}</div>
                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                      <Keyboard className="h-3 w-3" />
                      <span>{action.shortcut}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
                <Button
                  onClick={() => {
                    onOpenPanel(action.id as 'ai-chat' | 'logs');
                    setIsExpanded(false);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-full text-white shadow-lg",
                    action.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg transition-all duration-200",
          isExpanded && "rotate-45"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <Zap className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}