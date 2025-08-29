'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VoiceInputButton } from '@/components/ui/VoiceInputButton';
import { 
  Search,
  Filter,
  SortAsc,
  SortDesc,
  X,
  RefreshCw,
  ChevronDown,
  Calendar,
  Tag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
  disabled?: boolean;
}

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'search' | 'date' | 'range';
  options?: FilterOption[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  clearable?: boolean;
  searchable?: boolean;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string | string[];
  displayValue?: string;
}

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  activeFilters?: Record<string, unknown>;
  onFilterChange?: (key: string, value: any) => void;
  sortOptions?: SortOption[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, order: 'asc' | 'desc') => void;
  onClearAll?: () => void;
  className?: string;
  compact?: boolean;
  showActiveFilters?: boolean;
  resultCount?: number;
  totalCount?: number;
  loading?: boolean;
  children?: React.ReactNode;
}

export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilters = {},
  onFilterChange,
  sortOptions = [],
  sortBy,
  sortOrder = 'desc',
  onSortChange,
  onClearAll,
  className,
  compact = false,
  showActiveFilters = true,
  resultCount,
  totalCount,
  loading = false,
  children
}: FilterBarProps) {
  // Calculate active filters for display
  const activeFiltersList: ActiveFilter[] = React.useMemo(() => {
    return Object.entries(activeFilters)
      .filter(([key, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '' && value !== 'all';
      })
      .map(([key, value]) => {
        const filterConfig = filters.find(f => f.key === key);
        const label = filterConfig?.label || key;
        
        let displayValue = '';
        if (Array.isArray(value)) {
          displayValue = value.length === 1 
            ? (filterConfig?.options?.find(opt => opt.value === value[0])?.label || value[0])
            : `${value.length} selected`;
        } else {
          displayValue = filterConfig?.options?.find(opt => opt.value === value)?.label || value;
        }

        return {
          key,
          label,
          value,
          displayValue
        };
      });
  }, [activeFilters, filters]);

  const hasActiveFilters = activeFiltersList.length > 0 || searchValue.length > 0;

  const handleSortClick = () => {
    if (onSortChange && sortBy) {
      onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    }
  };

  const handleClearFilter = (filterKey: string) => {
    onFilterChange?.(filterKey, Array.isArray(activeFilters[filterKey]) ? [] : '');
  };

  const handleClearAll = () => {
    onClearAll?.();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Filter Bar */}
      <Card>
        <CardContent className={cn("p-4", compact && "p-3")}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Left Side - Search and Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              {onSearchChange && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 pr-20"
                    disabled={loading}
                  />
                  <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <VoiceInputButton
                      onTranscription={(text) => onSearchChange(searchValue + (searchValue ? ' ' : '') + text)}
                      disabled={loading}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                    />
                    {searchValue && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onSearchChange('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Dropdowns */}
              {filters.map((filter) => {
                const FilterIcon = filter.icon || Filter;
                const currentValue = activeFilters[filter.key];
                const hasValue = Array.isArray(currentValue) ? currentValue.length > 0 : 
                  currentValue !== undefined && currentValue !== null && currentValue !== '' && currentValue !== 'all';

                if (filter.type === 'select') {
                  return (
                    <DropdownMenu key={filter.key}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "flex items-center space-x-2",
                            hasValue && "bg-blue-50 border-blue-200 text-blue-700"
                          )}
                          disabled={loading}
                        >
                          <FilterIcon className="h-4 w-4" />
                          <span>{filter.label}</span>
                          {hasValue && (
                            <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                              1
                            </Badge>
                          )}
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="min-w-[200px]">
                        <DropdownMenuItem
                          onClick={() => onFilterChange?.(filter.key, 'all')}
                          className={cn(
                            !hasValue && "bg-blue-50 text-blue-700"
                          )}
                        >
                          All {filter.label}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {filter.options?.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => onFilterChange?.(filter.key, option.value)}
                            disabled={option.disabled}
                            className={cn(
                              currentValue === option.value && "bg-blue-50 text-blue-700"
                            )}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{option.label}</span>
                              {option.count !== undefined && (
                                <Badge variant="outline" className="text-xs">
                                  {option.count}
                                </Badge>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // Add other filter types (multiselect, date, range) here as needed
                return null;
              })}

              {/* Custom Children */}
              {children}
            </div>

            {/* Right Side - Sort and Actions */}
            <div className="flex items-center space-x-3">
              {/* Result Count */}
              {(resultCount !== undefined || totalCount !== undefined) && !loading && (
                <div className="text-sm text-gray-600 whitespace-nowrap">
                  {resultCount !== undefined && totalCount !== undefined ? (
                    resultCount === totalCount ? (
                      `${totalCount} items`
                    ) : (
                      `${resultCount} of ${totalCount} items`
                    )
                  ) : (
                    `${resultCount || totalCount} items`
                  )}
                </div>
              )}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}

              {/* Sort */}
              {sortOptions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={loading}>
                      <div className="flex items-center space-x-2">
                        {sortOrder === 'asc' ? (
                          <SortAsc className="h-4 w-4" />
                        ) : (
                          <SortDesc className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">
                          {sortOptions.find(opt => opt.value === sortBy)?.label || 'Sort'}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[180px]">
                    {sortOptions.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => onSortChange?.(option.value, sortOrder)}
                          className={cn(
                            sortBy === option.value && "bg-blue-50 text-blue-700"
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            {OptionIcon && <OptionIcon className="h-4 w-4" />}
                            <span>{option.label}</span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                    {sortBy && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSortClick}>
                          <div className="flex items-center space-x-2">
                            {sortOrder === 'asc' ? (
                              <SortDesc className="h-4 w-4" />
                            ) : (
                              <SortAsc className="h-4 w-4" />
                            )}
                            <span>{sortOrder === 'asc' ? 'Descending' : 'Ascending'}</span>
                          </div>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Clear All */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={loading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {showActiveFilters && activeFiltersList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2"
        >
          {activeFiltersList.map((filter) => (
            <motion.div
              key={filter.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Badge
                variant="secondary"
                className="flex items-center space-x-1 bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer group"
                onClick={() => handleClearFilter(filter.key)}
              >
                <span className="text-xs">
                  {filter.label}: {filter.displayValue}
                </span>
                <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
              </Badge>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}