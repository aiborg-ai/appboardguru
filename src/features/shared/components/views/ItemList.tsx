'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { 
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  Users,
  Eye,
  Edit,
  Share2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ListColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: any, value: any) => React.ReactNode;
}

export interface ListAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: (item: any) => void;
  variant?: 'default' | 'destructive';
  disabled?: (item: any) => boolean;
}

export interface ItemListProps {
  items: any[];
  columns: ListColumn[];
  actions?: ListAction[];
  onItemClick?: (item: any) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  selectedIds?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  className?: string;
  emptyMessage?: string;
  showSelection?: boolean;
  striped?: boolean;
  hover?: boolean;
  compact?: boolean;
  loading?: boolean;
  loadingRows?: number;
}

// Loading skeleton row
function LoadingRow({ columns, compact }: { columns: ListColumn[]; compact?: boolean }) {
  return (
    <tr className={cn("animate-pulse", compact ? "h-12" : "h-16")}>
      <td className="px-4 py-3">
        <div className="w-4 h-4 bg-gray-200 rounded" />
      </td>
      {columns.map((column, index) => (
        <td key={column.key} className={cn("px-4 py-3", `text-${column.align || 'left'}`)}>
          <div className={cn(
            "bg-gray-200 rounded",
            index === 0 ? "h-4 w-32" : index === 1 ? "h-4 w-24" : "h-4 w-16"
          )} />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="w-8 h-8 bg-gray-200 rounded" />
      </td>
    </tr>
  );
}

export default function ItemList({
  items,
  columns,
  actions = [],
  onItemClick,
  onSelectionChange,
  selectedIds = [],
  sortBy,
  sortOrder,
  onSort,
  className,
  emptyMessage = "No items found",
  showSelection = false,
  striped = true,
  hover = true,
  compact = false,
  loading = false,
  loadingRows = 5
}: ItemListProps) {
  const [localSelectedIds, setLocalSelectedIds] = React.useState<string[]>(selectedIds);

  React.useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

  const handleSelectAll = (checked: boolean) => {
    const newSelection = checked ? items.map(item => item.id) : [];
    setLocalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelection = checked 
      ? [...localSelectedIds, itemId]
      : localSelectedIds.filter(id => id !== itemId);
    setLocalSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    
    if (sortBy === columnKey) {
      onSort(columnKey, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnKey, 'asc');
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return ArrowUpDown;
    return sortOrder === 'asc' ? ArrowUp : ArrowDown;
  };

  const allSelected = items.length > 0 && localSelectedIds.length === items.length;
  const someSelected = localSelectedIds.length > 0 && localSelectedIds.length < items.length;

  if (loading) {
    return (
      <div className={cn("overflow-hidden bg-white border border-gray-200 rounded-lg", className)}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showSelection && (
                <th className="w-12 px-4 py-3 text-left">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider",
                    `text-${column.align || 'left'}`,
                    column.width
                  )}
                >
                  <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: '60%' }} />
                </th>
              ))}
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.from({ length: loadingRows }).map((_, index) => (
              <LoadingRow key={index} columns={columns} compact={compact} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("bg-white border border-gray-200 rounded-lg p-12 text-center", className)}>
        <div className="text-gray-500 text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden bg-white border border-gray-200 rounded-lg", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showSelection && (
                <th className="w-12 px-4 py-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all items"
                    {...(someSelected ? { 'data-indeterminate': true } : {})}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider",
                    `text-${column.align || 'left'}`,
                    column.width,
                    column.sortable && "cursor-pointer hover:bg-gray-100 select-none"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex-shrink-0">
                        {React.createElement(getSortIcon(column.key), {
                          className: cn(
                            "h-3 w-3 transition-colors",
                            sortBy === column.key ? "text-gray-900" : "text-gray-400"
                          )
                        })}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="w-12 px-4 py-3" />
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => {
              const isSelected = localSelectedIds.includes(item.id);
              
              return (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.02 }}
                  className={cn(
                    compact ? "h-12" : "h-16",
                    striped && index % 2 === 0 && "bg-gray-50/50",
                    hover && "hover:bg-blue-50/50 transition-colors duration-150",
                    isSelected && "bg-blue-50 border-l-4 border-l-blue-500",
                    onItemClick && "cursor-pointer"
                  )}
                  onClick={() => onItemClick?.(item)}
                >
                  {showSelection && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        aria-label={`Select ${item.title || item.name || item.id}`}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = item[column.key];
                    const renderedValue = column.render ? column.render(item, value) : value;
                    
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          "px-4 py-3 text-sm",
                          `text-${column.align || 'left'}`,
                          column.key === 'title' || column.key === 'name' ? "font-medium text-gray-900" : "text-gray-600"
                        )}
                      >
                        {renderedValue}
                      </td>
                    );
                  })}
                  {actions.length > 0 && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[180px]">
                          {actions.map((action) => {
                            const ActionIcon = action.icon;
                            const isDisabled = action.disabled?.(item) || false;
                            
                            return (
                              <DropdownMenuItem
                                key={action.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDisabled) {
                                    action.onClick(item);
                                  }
                                }}
                                disabled={isDisabled}
                                className={cn(
                                  action.variant === 'destructive' && "text-red-600 focus:text-red-600"
                                )}
                              >
                                <ActionIcon className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}