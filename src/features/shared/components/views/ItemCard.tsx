'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/features/shared/ui/card';
import { Button } from '@/features/shared/ui/button';
import { Badge } from '@/features/shared/ui/badge';
import { 
  MoreVertical, 
  Eye,
  Edit,
  Share2,
  ExternalLink,
  Star,
  Clock,
  Users,
  Calendar,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface ItemCardAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export interface ItemCardBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  color?: string;
  pulse?: boolean;
}

export interface ItemCardMetric {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}

export interface ItemCardProps {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  badges?: ItemCardBadge[];
  metrics?: ItemCardMetric[];
  actions?: ItemCardAction[];
  onClick?: () => void;
  isSelected?: boolean;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  coverImage?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'active' | 'inactive' | 'pending' | 'draft' | 'archived';
  lastActivity?: string;
  createdAt?: string;
}

const STATUS_COLORS = {
  active: 'border-green-200 bg-green-50',
  inactive: 'border-gray-200 bg-gray-50',
  pending: 'border-yellow-200 bg-yellow-50',
  draft: 'border-blue-200 bg-blue-50',
  archived: 'border-gray-300 bg-gray-100'
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

export default function ItemCard({
  id,
  title,
  description,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  badges = [],
  metrics = [],
  actions = [],
  onClick,
  isSelected,
  isLoading,
  className,
  children,
  footer,
  coverImage,
  priority,
  status,
  lastActivity,
  createdAt
}: ItemCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const cardVariants = {
    initial: { 
      scale: 1, 
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' 
    },
    hover: { 
      scale: 1.02, 
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      transition: { duration: 0.2 }
    },
    tap: { scale: 0.98 }
  };

  const statusColorClass = status ? STATUS_COLORS[status] : '';

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileTap={onClick ? "tap" : undefined}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn("group", className)}
    >
      <Card 
        className={cn(
          "relative cursor-pointer transition-all duration-200 overflow-hidden",
          "border border-gray-200 bg-white",
          isSelected && "ring-2 ring-blue-500 border-blue-300",
          onClick && "hover:border-gray-300",
          statusColorClass,
          isLoading && "opacity-50 pointer-events-none"
        )}
        onClick={onClick}
      >
        {/* Cover Image */}
        {coverImage && (
          <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
            <img 
              src={coverImage} 
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>
        )}

        {/* Priority Indicator */}
        {priority && (
          <div className="absolute top-2 left-2 z-10">
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-medium", PRIORITY_COLORS[priority])}
            >
              {priority}
            </Badge>
          </div>
        )}

        {/* Actions Menu */}
        {actions.length > 0 && (
          <div className={cn(
            "absolute top-3 right-3 z-10 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm border border-gray-200 hover:bg-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {actions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      disabled={action.disabled}
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
          </div>
        )}

        <CardHeader className={cn("pb-3", coverImage ? "pt-4" : "pt-6")}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Icon & Title */}
              <div className="flex items-center space-x-3 mb-2">
                {Icon && (
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                    "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
                  )}>
                    <Icon className={cn("h-5 w-5", iconColor)} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-lg leading-6">
                    {title}
                  </h3>
                  {subtitle && (
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges */}
              {badges.length > 0 && (
                <div className="flex items-center flex-wrap gap-1.5 mb-3">
                  {badges.map((badge, index) => (
                    <Badge
                      key={index}
                      variant={badge.variant || 'secondary'}
                      className={cn(
                        "text-xs font-medium",
                        badge.color,
                        badge.pulse && "animate-pulse"
                      )}
                    >
                      {badge.label}
                    </Badge>
                  ))}
                  {isSelected && (
                    <Badge variant="outline" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Description */}
          {description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
              {description}
            </p>
          )}

          {/* Custom Content */}
          {children}

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {metrics.map((metric, index) => {
                const MetricIcon = metric.icon;
                return (
                  <div key={index} className="flex items-center space-x-2">
                    {MetricIcon && (
                      <MetricIcon className={cn("h-4 w-4", metric.color || "text-gray-400")} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {metric.value}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {metric.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline info */}
          {(lastActivity || createdAt) && (
            <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
              {createdAt && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created {new Date(createdAt).toLocaleDateString()}</span>
                </div>
              )}
              {lastActivity && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>Active {lastActivity}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {footer}
        </CardContent>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Hover Gradient Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
      </Card>
    </motion.div>
  );
}