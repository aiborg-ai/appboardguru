'use client';

import React from 'react';
import { Button } from '@/features/shared/ui/button';
import { Card } from '@/features/shared/ui/card';
import { 
  Grid3X3, 
  List, 
  Eye,
  LayoutGrid,
  LayoutList,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'card' | 'list' | 'details';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal';
}

const VIEW_CONFIG = {
  card: {
    icon: LayoutGrid,
    label: 'Card View',
    description: 'Visual overview with rich cards',
    shortLabel: 'Cards'
  },
  list: {
    icon: LayoutList,
    label: 'List View', 
    description: 'Compact rows for efficient scanning',
    shortLabel: 'List'
  },
  details: {
    icon: FileText,
    label: 'Details View',
    description: 'Comprehensive information panel',
    shortLabel: 'Details'
  }
} as const;

export default function ViewToggle({ 
  currentView, 
  onViewChange, 
  className,
  size = 'md',
  variant = 'default'
}: ViewToggleProps) {
  const sizeClasses = {
    sm: 'h-8 px-2',
    md: 'h-9 px-3',
    lg: 'h-10 px-4'
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center", className)}>
        {Object.entries(VIEW_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = currentView === key;
          
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(key as ViewMode)}
              className={cn(
                "relative",
                sizeClasses[size],
                isActive && "bg-blue-600 hover:bg-blue-700 text-white",
                !isActive && "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
              title={config.description}
            >
              <Icon className={iconSizeClasses[size]} />
              {size === 'lg' && (
                <span className="ml-1 hidden sm:inline">{config.shortLabel}</span>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <Card className={cn("p-1", className)}>
      <div className="flex items-center space-x-1">
        {Object.entries(VIEW_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = currentView === key;
          
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewChange(key as ViewMode)}
              className={cn(
                "relative transition-all duration-200",
                sizeClasses[size],
                isActive && "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
                !isActive && "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
              title={config.description}
            >
              <Icon className={cn(iconSizeClasses[size], isActive && "scale-110")} />
              {size === 'lg' && (
                <span className="ml-2 font-medium">{config.shortLabel}</span>
              )}
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-300 rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

// Hook for managing view preferences
export function useViewPreferences(defaultView: ViewMode = 'card', storageKey?: string) {
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultView);
  const [sortBy, setSortBy] = React.useState<string>('updated_at');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`viewPrefs_${storageKey}`);
      if (stored) {
        try {
          const prefs = JSON.parse(stored);
          setViewMode(prefs.viewMode || defaultView);
          setSortBy(prefs.sortBy || 'updated_at');
          setSortOrder(prefs.sortOrder || 'desc');
        } catch (error) {
          console.warn('Failed to parse view preferences:', error);
        }
      }
    }
  }, [defaultView, storageKey]);

  // Save preferences to localStorage when they change
  React.useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      const prefs = { viewMode, sortBy, sortOrder };
      localStorage.setItem(`viewPrefs_${storageKey}`, JSON.stringify(prefs));
    }
  }, [viewMode, sortBy, sortOrder, storageKey]);

  return {
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  };
}