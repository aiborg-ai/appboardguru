/**
 * Rich Notification Card Component
 * 
 * Enterprise-grade notification display with:
 * - Interactive action buttons
 * - Rich media support (images, charts, documents)
 * - Expandable content
 * - Deep linking
 * - Priority-based styling
 * - Accessibility compliance
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/features/shared/ui/avatar';
import { Separator } from '@/features/shared/ui/separator';
import { Progress } from '@/features/shared/ui/progress';
import { useToast } from '@/features/shared/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  Bell,
  BellRing,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Vote,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
  Check,
  X,
  Archive,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Share2,
  Download,
  Flag,
  Star,
  StarOff
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Database } from '@/types/database';
import type { NotificationCategory, NotificationPriority } from '@/lib/services/push-notification.service';

type Notification = Database['public']['Tables']['notifications']['Row'] & {
  actions?: NotificationAction[];
  media?: NotificationMedia;
  progress?: NotificationProgress;
}

interface NotificationAction {
  id: string;
  title: string;
  type: 'primary' | 'secondary' | 'destructive';
  icon?: React.ComponentType<any>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  loading?: boolean;
  disabled?: boolean;
}

interface NotificationMedia {
  type: 'image' | 'video' | 'chart' | 'document';
  url: string;
  thumbnail?: string;
  caption?: string;
  metadata?: Record<string, any>;
}

interface NotificationProgress {
  label: string;
  value: number;
  max: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface RichNotificationCardProps {
  notification: Notification;
  compact?: boolean;
  expandable?: boolean;
  showActions?: boolean;
  showTimestamp?: boolean;
  onAction?: (actionId: string, notificationId: string) => Promise<void>;
  onMarkAsRead?: (notificationId: string) => Promise<void>;
  onMarkAsUnread?: (notificationId: string) => Promise<void>;
  onArchive?: (notificationId: string) => Promise<void>;
  onDelete?: (notificationId: string) => Promise<void>;
  onShare?: (notificationId: string) => Promise<void>;
  className?: string;
}

// Priority to styling mapping
const priorityConfig = {
  critical: {
    cardClass: 'border-red-500 bg-red-50 dark:bg-red-950',
    badgeClass: 'bg-red-500 text-white',
    iconClass: 'text-red-500',
    glowClass: 'shadow-red-500/20 shadow-lg',
    icon: ShieldAlert
  },
  high: {
    cardClass: 'border-orange-500 bg-orange-50 dark:bg-orange-950',
    badgeClass: 'bg-orange-500 text-white',
    iconClass: 'text-orange-500',
    glowClass: 'shadow-orange-500/20 shadow-md',
    icon: AlertTriangle
  },
  medium: {
    cardClass: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
    badgeClass: 'bg-blue-500 text-white',
    iconClass: 'text-blue-500',
    glowClass: 'shadow-blue-500/20 shadow-sm',
    icon: BellRing
  },
  low: {
    cardClass: 'border-gray-300 bg-gray-50 dark:bg-gray-900',
    badgeClass: 'bg-gray-500 text-white',
    iconClass: 'text-gray-500',
    glowClass: '',
    icon: Bell
  }
};

// Category to icon mapping
const categoryIcons = {
  emergency_board_matter: ShieldAlert,
  time_sensitive_voting: Vote,
  compliance_alert: Flag,
  meeting_notification: Calendar,
  governance_update: FileText,
  security_alert: ShieldAlert
};

export function RichNotificationCard({
  notification,
  compact = false,
  expandable = true,
  showActions = true,
  showTimestamp = true,
  onAction,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onDelete,
  onShare,
  className
}: RichNotificationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [starred, setStarred] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const priority = (notification.priority as NotificationPriority) || 'medium';
  const category = (notification.category as NotificationCategory) || 'governance_update';
  const config = priorityConfig[priority];
  const CategoryIcon = categoryIcons[category];
  const PriorityIcon = config.icon;

  const isUnread = notification.status === 'unread';
  const isStarred = starred; // This would come from user preferences

  // Handle action clicks
  const handleAction = useCallback(async (actionId: string) => {
    if (!onAction) return;

    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;

    if (action.requiresConfirmation) {
      const confirmed = window.confirm(action.confirmationMessage || 'Are you sure?');
      if (!confirmed) return;
    }

    try {
      setActionLoading(actionId);
      await onAction(actionId, notification.id);
      toast({
        title: 'Action completed',
        description: `Successfully executed ${action.title}`,
      });
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  }, [notification, onAction, toast]);

  // Handle built-in actions
  const handleMarkAsRead = useCallback(async () => {
    if (!onMarkAsRead) return;
    try {
      await onMarkAsRead(notification.id);
    } catch (error) {
      toast({
        title: 'Failed to mark as read',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [notification.id, onMarkAsRead, toast]);

  const handleMarkAsUnread = useCallback(async () => {
    if (!onMarkAsUnread) return;
    try {
      await onMarkAsUnread(notification.id);
    } catch (error) {
      toast({
        title: 'Failed to mark as unread',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [notification.id, onMarkAsUnread, toast]);

  const handleArchive = useCallback(async () => {
    if (!onArchive) return;
    try {
      await onArchive(notification.id);
      toast({
        title: 'Notification archived',
        description: 'The notification has been moved to archive',
      });
    } catch (error) {
      toast({
        title: 'Failed to archive',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [notification.id, onArchive, toast]);

  const handleShare = useCallback(async () => {
    if (!onShare) return;
    try {
      await onShare(notification.id);
      toast({
        title: 'Notification shared',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Failed to share',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [notification.id, onShare, toast]);

  const toggleStar = useCallback(() => {
    setStarred(!starred);
    toast({
      title: starred ? 'Notification unstarred' : 'Notification starred',
      description: starred ? 'Removed from favorites' : 'Added to favorites',
    });
  }, [starred, toast]);

  // Format timestamp
  const timestamp = notification.created_at ? new Date(notification.created_at) : new Date();
  const timeAgo = formatDistanceToNow(timestamp, { addSuffix: true });
  const fullTime = format(timestamp, 'PPP at p');

  // Auto-mark as read when viewed for critical notifications
  useEffect(() => {
    if (priority === 'critical' && isUnread && onMarkAsRead) {
      const timer = setTimeout(() => {
        handleMarkAsRead();
      }, 3000); // Mark as read after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [priority, isUnread, onMarkAsRead, handleMarkAsRead]);

  // Click handler for deep linking
  const handleNotificationClick = useCallback(() => {
    if (notification.action_url) {
      if (notification.action_url.startsWith('http')) {
        window.open(notification.action_url, '_blank');
      } else {
        // Internal route
        window.location.href = notification.action_url;
      }
    }

    // Mark as read on click
    if (isUnread && onMarkAsRead) {
      handleMarkAsRead();
    }
  }, [notification.action_url, isUnread, onMarkAsRead, handleMarkAsRead]);

  // Render media content
  const renderMedia = () => {
    if (!notification.media) return null;

    const { type, url, thumbnail, caption } = notification.media;

    switch (type) {
      case 'image':
        return (
          <div className="mt-3">
            <img 
              src={url} 
              alt={caption || 'Notification image'} 
              className="rounded-md max-h-48 w-full object-cover"
              loading="lazy"
            />
            {caption && (
              <p className="text-sm text-muted-foreground mt-1">{caption}</p>
            )}
          </div>
        );
      
      case 'chart':
        return (
          <div className="mt-3 p-4 bg-muted rounded-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Chart Data</span>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Full
              </Button>
            </div>
            {/* Chart would be rendered here */}
            <div className="h-24 bg-background rounded border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Chart placeholder</span>
            </div>
          </div>
        );
      
      case 'document':
        return (
          <div className="mt-3 p-3 bg-muted rounded-md flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{caption || 'Document'}</p>
              <p className="text-xs text-muted-foreground">Click to view document</p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-3 w-3" />
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render progress indicator
  const renderProgress = () => {
    if (!notification.progress) return null;

    const { label, value, max, status } = notification.progress;
    const percentage = (value / max) * 100;

    const statusColors = {
      pending: 'bg-gray-500',
      in_progress: 'bg-blue-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500'
    };

    return (
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>{label}</span>
          <span className="text-muted-foreground">{value}/{max}</span>
        </div>
        <Progress 
          value={percentage} 
          className={cn("h-2", statusColors[status])}
        />
      </div>
    );
  };

  // Render action buttons
  const renderActions = () => {
    if (!showActions || !notification.actions?.length) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-4">
        {notification.actions.map((action) => {
          const IconComponent = action.icon;
          const isLoading = actionLoading === action.id;

          return (
            <Button
              key={action.id}
              variant={action.type === 'primary' ? 'default' : 
                     action.type === 'destructive' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleAction(action.id)}
              disabled={action.disabled || isLoading}
              className="flex items-center space-x-1"
            >
              {IconComponent && !isLoading && <IconComponent className="h-3 w-3" />}
              {isLoading && <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              <span>{action.title}</span>
            </Button>
          );
        })}
      </div>
    );
  };

  // Render built-in action menu
  const renderActionMenu = () => {
    return (
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleStar}
          className="h-8 w-8 p-0"
        >
          {isStarred ? 
            <Star className="h-4 w-4 fill-current text-yellow-500" /> :
            <StarOff className="h-4 w-4" />
          }
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={isUnread ? handleMarkAsRead : handleMarkAsUnread}
          className="h-8 w-8 p-0"
        >
          {isUnread ? <Eye className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="h-8 w-8 p-0"
        >
          <Share2 className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleArchive}
          className="h-8 w-8 p-0"
        >
          <Archive className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        config.cardClass,
        config.glowClass,
        isUnread && 'ring-2 ring-primary/20',
        compact ? 'p-3' : '',
        className
      )}
      onClick={handleNotificationClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleNotificationClick();
        }
      }}
    >
      <CardHeader className={cn("pb-3", compact && "pb-2")}>
        <div className="flex items-start justify-between space-x-4">
          <div className="flex items-start space-x-3">
            {/* Category Icon */}
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              priority === 'critical' ? 'bg-red-100 dark:bg-red-900' :
              priority === 'high' ? 'bg-orange-100 dark:bg-orange-900' :
              priority === 'medium' ? 'bg-blue-100 dark:bg-blue-900' :
              'bg-gray-100 dark:bg-gray-800'
            )}>
              <CategoryIcon className={cn("h-5 w-5", config.iconClass)} />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold line-clamp-1">
                  {notification.title}
                </h4>
                {isUnread && (
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={config.badgeClass}>
                  <PriorityIcon className="h-3 w-3 mr-1" />
                  {priority.toUpperCase()}
                </Badge>
                
                {showTimestamp && (
                  <span className="text-xs text-muted-foreground" title={fullTime}>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {timeAgo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <div className="flex items-center space-x-2">
            {renderActionMenu()}
            
            {expandable && (expanded || notification.media || notification.progress || notification.actions?.length) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="h-8 w-8 p-0"
              >
                {expanded ? 
                  <ChevronDown className="h-4 w-4" /> :
                  <ChevronRight className="h-4 w-4" />
                }
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-0", compact && "px-3 pb-3")}>
        {/* Message */}
        <p className={cn(
          "text-sm text-muted-foreground",
          compact ? "line-clamp-2" : expanded ? "" : "line-clamp-3"
        )}>
          {notification.message}
        </p>

        {/* Expandable Content */}
        {expanded && (
          <div className="mt-4 space-y-4">
            {renderMedia()}
            {renderProgress()}
            
            {/* Metadata */}
            {notification.metadata && (
              <div className="text-xs text-muted-foreground">
                <Separator className="mb-2" />
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(notification.metadata).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span>{' '}
                      <span>{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {(expanded || !expandable) && renderActions()}

        {/* Action URL Link */}
        {notification.action_url && notification.action_text && (
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <a href={notification.action_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                {notification.action_text}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}