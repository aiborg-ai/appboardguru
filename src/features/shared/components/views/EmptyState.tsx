'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Folder,
  Plus,
  Search,
  Filter,
  FileText,
  Users,
  Building2,
  Calendar,
  Package,
  Upload,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'outline';
  primary?: boolean;
}

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  className?: string;
  variant?: 'default' | 'filtered' | 'error' | 'loading';
  illustration?: React.ReactNode;
  compact?: boolean;
  children?: React.ReactNode;
}

const VARIANT_CONFIGS = {
  default: {
    iconColor: 'text-gray-300',
    titleColor: 'text-gray-900',
    descriptionColor: 'text-gray-600',
    background: 'bg-white'
  },
  filtered: {
    iconColor: 'text-blue-300',
    titleColor: 'text-gray-900',
    descriptionColor: 'text-gray-600',
    background: 'bg-blue-50/30'
  },
  error: {
    iconColor: 'text-red-300',
    titleColor: 'text-red-900',
    descriptionColor: 'text-red-600',
    background: 'bg-red-50/30'
  },
  loading: {
    iconColor: 'text-blue-300',
    titleColor: 'text-gray-900',
    descriptionColor: 'text-gray-600',
    background: 'bg-white'
  }
};

// Default illustrations for common empty states
const DEFAULT_ILLUSTRATIONS = {
  organizations: Building2,
  vaults: Package,
  meetings: Calendar,
  assets: Folder,
  boardmates: Users,
  search: Search,
  filter: Filter,
  upload: Upload,
  default: FileText
};

export default function EmptyState({
  icon,
  title,
  description,
  actions = [],
  className,
  variant = 'default',
  illustration,
  compact = false,
  children
}: EmptyStateProps) {
  const config = VARIANT_CONFIGS[variant];
  const IconComponent = icon || FileText;
  const primaryActions = actions.filter(action => action.primary);
  const secondaryActions = actions.filter(action => !action.primary);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1] as any,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Card className={cn(
      "border-0 shadow-none",
      config.background,
      compact ? "p-8" : "p-12",
      className
    )}>
      <CardContent className="p-0">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-md mx-auto"
        >
          {/* Illustration or Icon */}
          {illustration ? (
            <motion.div variants={itemVariants} className="mb-6">
              {illustration}
            </motion.div>
          ) : (
            <motion.div 
              variants={itemVariants}
              className={cn(
                "mx-auto mb-6 flex items-center justify-center",
                compact ? "w-12 h-12" : "w-16 h-16",
                "rounded-full bg-gray-100"
              )}
            >
              <IconComponent className={cn(
                compact ? "h-6 w-6" : "h-8 w-8",
                config.iconColor
              )} />
            </motion.div>
          )}

          {/* Title */}
          <motion.h3 
            variants={itemVariants}
            className={cn(
              compact ? "text-lg" : "text-xl",
              "font-semibold mb-2",
              config.titleColor
            )}
          >
            {title}
          </motion.h3>

          {/* Description */}
          <motion.p 
            variants={itemVariants}
            className={cn(
              "text-sm leading-relaxed mb-6",
              config.descriptionColor
            )}
          >
            {description}
          </motion.p>

          {/* Custom Content */}
          {children && (
            <motion.div variants={itemVariants} className="mb-6">
              {children}
            </motion.div>
          )}

          {/* Actions */}
          {actions.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-3">
              {/* Primary Actions */}
              {primaryActions.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {primaryActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        onClick={action.onClick}
                        variant={action.variant || 'default'}
                        className="flex items-center space-x-2"
                      >
                        <ActionIcon className="h-4 w-4" />
                        <span>{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Secondary Actions */}
              {secondaryActions.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {secondaryActions.map((action) => {
                    const ActionIcon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        onClick={action.onClick}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1 text-xs"
                      >
                        <ActionIcon className="h-3 w-3" />
                        <span>{action.label}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Loading indicator for loading variant */}
          {variant === 'loading' && (
            <motion.div 
              variants={itemVariants}
              className="flex justify-center mt-4"
            >
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

// Predefined empty states for common scenarios
export const EmptyStates = {
  noOrganizations: (onCreateOrganization: () => void) => (
    <EmptyState
      icon={Building2}
      title="No Organizations Yet"
      description="Create your first organization to get started with BoardGuru's enterprise board management platform."
      actions={[
        {
          id: 'create',
          label: 'Create Organization',
          icon: Plus,
          onClick: onCreateOrganization,
          primary: true
        }
      ]}
    />
  ),

  noVaults: (onCreateVault: () => void) => (
    <EmptyState
      icon={Package}
      title="No Vaults Yet"
      description="Create your first vault to securely store and share board documents with your team."
      actions={[
        {
          id: 'create',
          label: 'Create Vault',
          icon: Plus,
          onClick: onCreateVault,
          primary: true
        }
      ]}
    />
  ),

  noMeetings: (onCreateMeeting: () => void) => (
    <EmptyState
      icon={Calendar}
      title="No Meetings Yet"
      description="Schedule your first board meeting, AGM, or committee session to get started."
      actions={[
        {
          id: 'create',
          label: 'Create Meeting',
          icon: Plus,
          onClick: onCreateMeeting,
          primary: true
        }
      ]}
    />
  ),

  noAssets: (onUploadAsset: () => void) => (
    <EmptyState
      icon={Folder}
      title="No Assets Yet"
      description="Upload your first document to get started with asset management."
      actions={[
        {
          id: 'upload',
          label: 'Upload Document',
          icon: Upload,
          onClick: onUploadAsset,
          primary: true
        }
      ]}
    />
  ),

  noBoardMates: (onAddBoardMate: () => void) => (
    <EmptyState
      icon={Users}
      title="No BoardMates Yet"
      description="Add your first board member, director, or key stakeholder to get started."
      actions={[
        {
          id: 'add',
          label: 'Add BoardMate',
          icon: Plus,
          onClick: onAddBoardMate,
          primary: true
        }
      ]}
    />
  ),

  noSearchResults: (onClearSearch: () => void) => (
    <EmptyState
      variant="filtered"
      icon={Search}
      title="No Results Found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      actions={[
        {
          id: 'clear',
          label: 'Clear Search',
          icon: RefreshCw,
          onClick: onClearSearch,
          primary: true
        }
      ]}
    />
  ),

  noFilterResults: (onClearFilters: () => void) => (
    <EmptyState
      variant="filtered"
      icon={Filter}
      title="No Items Match Filters"
      description="Try adjusting your filters to see more results."
      actions={[
        {
          id: 'clear',
          label: 'Clear Filters',
          icon: RefreshCw,
          onClick: onClearFilters,
          primary: true
        }
      ]}
    />
  ),

  loading: (message: string = "Loading...") => (
    <EmptyState
      variant="loading"
      icon={RefreshCw}
      title={message}
      description="Please wait while we fetch your data."
    />
  ),

  error: (onRetry: () => void, message: string = "Something went wrong") => (
    <EmptyState
      variant="error"
      title={message}
      description="We encountered an error while loading your data. Please try again."
      actions={[
        {
          id: 'retry',
          label: 'Try Again',
          icon: RefreshCw,
          onClick: onRetry,
          primary: true
        }
      ]}
    />
  )
};