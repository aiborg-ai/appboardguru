'use client';

import React from 'react';
import { Button } from '@/features/shared/ui/button';
import { cn } from '@/lib/utils';
import { LayoutGrid, List, FileText } from 'lucide-react';

export type ViewMode = 'cards' | 'list' | 'details';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

const VIEW_OPTIONS = [
  { value: 'cards' as const, icon: LayoutGrid, label: 'Cards' },
  { value: 'list' as const, icon: List, label: 'List' },
  { value: 'details' as const, icon: FileText, label: 'Details' }
];

export const ViewToggle = React.memo(function ViewToggle({
  currentView,
  onViewChange,
  className
}: ViewToggleProps) {
  return (
    <div className={cn("flex border rounded-md bg-gray-50 p-1", className)}>
      {VIEW_OPTIONS.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant={currentView === value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange(value)}
          className={cn(
            "h-8 px-3 transition-all",
            currentView === value
              ? "bg-white shadow-sm text-gray-900"
              : "text-gray-600 hover:text-gray-900"
          )}
          aria-label={`Switch to ${label} view`}
        >
          <Icon className="h-4 w-4 mr-1.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
});