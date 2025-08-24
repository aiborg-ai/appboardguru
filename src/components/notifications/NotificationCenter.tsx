/**
 * Notification Center Component
 * 
 * Enterprise notification management center with:
 * - Real-time notification feed
 * - Advanced filtering and search
 * - Bulk actions
 * - Category grouping
 * - Performance optimization
 * - Accessibility compliance
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Input } from '@/features/shared/ui/input';
import { Badge } from '@/features/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs';
import { ScrollArea } from '@/features/shared/ui/scroll-area';
import { Separator } from '@/features/shared/ui/separator';
import { Checkbox } from '@/features/shared/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/features/shared/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/features/shared/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/shared/ui/select';
import { useToast } from '@/features/shared/ui/use-toast';
import { cn } from '@/lib/utils';
import { RichNotificationCard } from './RichNotificationCard';
import { useNotifications } from '@/hooks/useNotifications';
import {
  Bell,
  BellRing,
  Search,
  Filter,
  MoreVertical,
  Archive,
  Trash2,
  MarkAsRead,
  Settings,
  RefreshCw,
  SortAsc,
  SortDesc,
  Calendar,
  AlertTriangle,
  Shield,
  Vote,
  FileText,
  Flag,
  X,
  CheckSquare,
  Square,
  Loader2,
  Inbox,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import type { Database } from '@/types/database';
import type { NotificationCategory, NotificationPriority } from '@/lib/services/push-notification.service';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface NotificationCenterProps {
  className?: string;
  maxHeight?: string;
  showHeader?: boolean;
  showTabs?: boolean;
  defaultTab?: string;
  onNotificationAction?: (actionId: string, notificationId: string) => Promise<void>;
}

// Category configurations
const categoryConfig = {
  emergency_board_matter: {
    label: 'Emergency',
    icon: Shield,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950'
  },
  time_sensitive_voting: {
    label: 'Voting',
    icon: Vote,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950'
  },
  compliance_alert: {
    label: 'Compliance',
    icon: Flag,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950'
  },
  meeting_notification: {
    label: 'Meetings',
    icon: Calendar,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950'
  },
  governance_update: {
    label: 'Governance',
    icon: FileText,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950'
  },
  security_alert: {
    label: 'Security',
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950'
  }
};

// Filter and sort options
const filterOptions = [
  { value: 'all', label: 'All Notifications' },
  { value: 'unread', label: 'Unread Only' },
  { value: 'starred', label: 'Starred' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest First', icon: SortDesc },
  { value: 'oldest', label: 'Oldest First', icon: SortAsc },
  { value: 'priority', label: 'Priority', icon: AlertTriangle },
  { value: 'category', label: 'Category', icon: FileText }
];

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'critical', label: 'Critical', color: 'text-red-500' },
  { value: 'high', label: 'High', color: 'text-orange-500' },
  { value: 'medium', label: 'Medium', color: 'text-blue-500' },
  { value: 'low', label: 'Low', color: 'text-gray-500' }
];

export function NotificationCenter({
  className,
  maxHeight = 'h-96',
  showHeader = true,
  showTabs = true,
  defaultTab = 'all',
  onNotificationAction
}: NotificationCenterProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Use the notifications hook
  const {
    notifications,
    counts,
    loading,
    error,
    hasMore,
    markAsRead,
    markAsUnread,
    archiveNotification,
    deleteNotification,
    bulkAction,
    loadMore,
    refresh
  } = useNotifications({
    limit: 50,
    status: selectedFilter === 'unread' ? 'unread' : undefined,
    priority: selectedPriority === 'all' ? undefined : selectedPriority,
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Filter and sort notifications
  const filteredAndSortedNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(notification =>
        notification.title?.toLowerCase().includes(query) ||
        notification.message?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(notification =>
        notification.category === selectedCategory
      );
    }

    // Apply time-based filters
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    switch (selectedFilter) {
      case 'today':
        filtered = filtered.filter(notification => 
          new Date(notification.created_at || '') >= today
        );
        break;
      case 'this_week':
        filtered = filtered.filter(notification =>
          new Date(notification.created_at || '') >= weekAgo
        );
        break;
      case 'starred':
        // This would be implemented with user preferences
        filtered = filtered.filter(notification => 
          notification.metadata?.starred === true
        );
        break;
    }

    // Apply sorting
    switch (selectedSort) {
      case 'newest':
        filtered.sort((a, b) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        break;
      case 'oldest':
        filtered.sort((a, b) => 
          new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        );
        break;
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        filtered.sort((a, b) => {
          const aPriority = priorityOrder[a.priority as NotificationPriority] || 0;
          const bPriority = priorityOrder[b.priority as NotificationPriority] || 0;
          return bPriority - aPriority;
        });
        break;
      case 'category':
        filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        break;
    }

    return filtered;
  }, [notifications, searchQuery, selectedCategory, selectedFilter, selectedSort]);

  // Group notifications by category for tab view
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {
      all: filteredAndSortedNotifications
    };

    Object.keys(categoryConfig).forEach(category => {
      groups[category] = filteredAndSortedNotifications.filter(
        notification => notification.category === category
      );
    });

    return groups;
  }, [filteredAndSortedNotifications]);

  // Handle notification selection
  const handleSelectNotification = useCallback((notificationId: string, selected: boolean) => {
    const newSelected = new Set(selectedNotifications);
    if (selected) {
      newSelected.add(notificationId);
    } else {
      newSelected.delete(notificationId);
    }
    setSelectedNotifications(newSelected);
  }, [selectedNotifications]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    const currentNotifications = activeTab === 'all' 
      ? filteredAndSortedNotifications 
      : groupedNotifications[activeTab] || [];
    
    const allSelected = currentNotifications.every(n => selectedNotifications.has(n.id));
    
    if (allSelected) {
      // Deselect all current notifications
      const newSelected = new Set(selectedNotifications);
      currentNotifications.forEach(n => newSelected.delete(n.id));
      setSelectedNotifications(newSelected);
    } else {
      // Select all current notifications
      const newSelected = new Set(selectedNotifications);
      currentNotifications.forEach(n => newSelected.add(n.id));
      setSelectedNotifications(newSelected);
    }
  }, [activeTab, filteredAndSortedNotifications, groupedNotifications, selectedNotifications]);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: 'mark_read' | 'mark_unread' | 'archive' | 'dismiss' | 'delete') => {
    if (selectedNotifications.size === 0) return;

    setBulkActionLoading(true);
    try {
      if (action === 'delete') {
        // Handle delete separately as it's not a bulk action in the hook
        const deletePromises = Array.from(selectedNotifications).map(id => deleteNotification(id));
        await Promise.all(deletePromises);
      } else {
        await bulkAction(action, Array.from(selectedNotifications));
      }
      
      setSelectedNotifications(new Set());
      toast({
        title: 'Bulk action completed',
        description: `Successfully ${action.replace('_', ' ')} ${selectedNotifications.size} notifications`,
      });
    } catch (error) {
      toast({
        title: 'Bulk action failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedNotifications, bulkAction, deleteNotification, toast]);

  // Handle infinite scroll
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedFilter('all');
    setSelectedSort('newest');
    setSelectedPriority('all');
    setSelectedCategory('all');
  }, []);

  // Get counts for tabs
  const getTabCount = useCallback((tab: string) => {
    if (tab === 'all') return counts.total;
    return groupedNotifications[tab]?.length || 0;
  }, [counts.total, groupedNotifications]);

  // Render tab content
  const renderTabContent = (tab: string) => {
    const tabNotifications = tab === 'all' ? filteredAndSortedNotifications : groupedNotifications[tab] || [];
    
    if (loading && tabNotifications.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading notifications...</span>
        </div>
      );
    }

    if (tabNotifications.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-sm text-center">
            {searchQuery || selectedFilter !== 'all' 
              ? 'No notifications match your current filters'
              : 'You\'re all caught up!'
            }
          </p>
          {(searchQuery || selectedFilter !== 'all') && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tabNotifications.map((notification) => {
          const isSelected = selectedNotifications.has(notification.id);
          
          return (
            <div key={notification.id} className="relative">
              {/* Selection checkbox */}
              <div className="absolute left-2 top-4 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => 
                    handleSelectNotification(notification.id, checked === true)
                  }
                  aria-label={`Select notification: ${notification.title}`}
                />
              </div>
              
              {/* Notification card with left margin for checkbox */}
              <div className="ml-8">
                <RichNotificationCard
                  notification={notification}
                  expandable={true}
                  showActions={true}
                  showTimestamp={true}
                  onAction={onNotificationAction}
                  onMarkAsRead={markAsRead}
                  onMarkAsUnread={markAsUnread}
                  onArchive={archiveNotification}
                  onDelete={deleteNotification}
                  className={cn(
                    'transition-all duration-200',
                    isSelected && 'ring-2 ring-primary shadow-md'
                  )}
                />
              </div>
            </div>
          );
        })}

        {/* Load more indicator */}
        {hasMore && (
          <div className="flex items-center justify-center py-4">
            {loading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading more...</span>
              </div>
            ) : (
              <Button variant="outline" onClick={loadMore}>
                Load More
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      {showHeader && (
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellRing className="h-5 w-5" />
              <CardTitle className="text-lg">Notifications</CardTitle>
              {counts.unread > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {counts.unread}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>

              {/* Filter toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-8 w-8 p-0"
              >
                <Filter className="h-4 w-4" />
              </Button>

              {/* Bulk actions menu */}
              {selectedNotifications.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={bulkActionLoading}>
                      {bulkActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <MoreVertical className="h-4 w-4 mr-2" />
                      )}
                      {selectedNotifications.size} Selected
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction('mark_read')}>
                      <Eye className="h-4 w-4 mr-2" />
                      Mark as Read
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('mark_unread')}>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Mark as Unread
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBulkAction('archive')}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleBulkAction('delete')}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Settings */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Notification Settings</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      Notification preferences and settings would be configured here.
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/50">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filter controls */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedSort} onValueChange={setSelectedSort}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center">
                          <option.icon className="h-4 w-4 mr-2" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className={option.color}>{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center">
                          <config.icon className={cn("h-4 w-4 mr-2", config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8"
                  >
                    {filteredAndSortedNotifications.length > 0 && 
                     filteredAndSortedNotifications.every(n => selectedNotifications.has(n.id)) ? (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    Select All
                  </Button>
                </div>
                
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="flex-1 p-0">
        {showTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <div className="px-6 pt-2">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="all" className="text-xs">
                  All ({getTabCount('all')})
                </TabsTrigger>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    <config.icon className="h-3 w-3 mr-1" />
                    {config.label} ({getTabCount(key)})
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="px-6 pb-6">
              <ScrollArea 
                className={cn('w-full', maxHeight)}
                ref={scrollAreaRef}
                onScrollCapture={handleScroll}
              >
                <TabsContent value="all" className="mt-4">
                  {renderTabContent('all')}
                </TabsContent>
                
                {Object.keys(categoryConfig).map(category => (
                  <TabsContent key={category} value={category} className="mt-4">
                    {renderTabContent(category)}
                  </TabsContent>
                ))}
              </ScrollArea>
            </div>
          </Tabs>
        ) : (
          <div className="px-6 pb-6">
            <ScrollArea 
              className={cn('w-full', maxHeight)}
              ref={scrollAreaRef}
              onScrollCapture={handleScroll}
            >
              <div className="mt-4">
                {renderTabContent('all')}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>

      {/* Error display */}
      {error && (
        <div className="px-6 pb-4">
          <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}
    </Card>
  );
}