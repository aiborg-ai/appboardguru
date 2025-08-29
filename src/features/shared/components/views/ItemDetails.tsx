'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  X,
  Edit,
  Share2,
  Download,
  Eye,
  Calendar,
  Clock,
  User,
  Users,
  Tag,
  FileText,
  Activity,
  Settings,
  Star,
  ExternalLink,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface DetailTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  badge?: string | number;
}

export interface DetailAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  disabled?: boolean;
  primary?: boolean;
}

export interface DetailField {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  copyable?: boolean;
  type?: 'text' | 'badge' | 'date' | 'user' | 'link' | 'tags';
}

export interface ItemDetailsProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  fields?: DetailField[];
  tabs?: DetailTab[];
  actions?: DetailAction[];
  className?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  position?: 'right' | 'left';
  children?: React.ReactNode;
}

const WIDTH_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full'
};

// Field renderers based on type
function renderFieldValue(field: DetailField) {
  const { value, type, copyable } = field;

  const handleCopy = async () => {
    if (typeof value === 'string') {
      await navigator.clipboard.writeText(value);
    }
  };

  const content = (() => {
    switch (type) {
      case 'badge':
        return <Badge variant="secondary">{value}</Badge>;
      case 'date':
        return (
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>{typeof value === 'string' ? new Date(value).toLocaleDateString() : value}</span>
          </div>
        );
      case 'user':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-gray-500" />
            </div>
            <span className="text-sm text-gray-900">{value}</span>
          </div>
        );
      case 'link':
        return (
          <div className="flex items-center space-x-1">
            <ExternalLink className="h-3 w-3 text-blue-500" />
            <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">{value}</span>
          </div>
        );
      case 'tags':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          );
        }
        return value;
      default:
        return <span className="text-sm text-gray-900">{value}</span>;
    }
  })();

  return (
    <div className="flex items-center justify-between">
      {content}
      {copyable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export default function ItemDetails({
  item,
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  fields = [],
  tabs = [],
  actions = [],
  className,
  width = 'lg',
  position = 'right',
  children
}: ItemDetailsProps) {
  const [activeTab, setActiveTab] = React.useState(tabs[0]?.id || 'overview');

  const primaryActions = actions.filter(action => action.primary);
  const secondaryActions = actions.filter(action => !action.primary);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ 
              x: position === 'right' ? '100%' : '-100%',
              opacity: 0 
            }}
            animate={{ 
              x: 0,
              opacity: 1 
            }}
            exit={{ 
              x: position === 'right' ? '100%' : '-100%',
              opacity: 0 
            }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30 
            }}
            className={cn(
              "fixed top-0 z-50 h-full bg-white shadow-2xl border-l",
              position === 'right' ? 'right-0' : 'left-0',
              WIDTH_CLASSES[width],
              "w-full sm:w-auto sm:min-w-[32rem]",
              className
            )}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex-shrink-0 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {Icon && (
                      <div className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                        "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
                      )}>
                        <Icon className={cn("h-5 w-5", iconColor)} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-semibold text-gray-900 truncate">
                        {title}
                      </h2>
                      {subtitle && (
                        <p className="text-sm text-gray-600 truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    {primaryActions.map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <Button
                          key={action.id}
                          variant={action.variant || 'default'}
                          size="sm"
                          onClick={action.onClick}
                          disabled={action.disabled}
                          className="flex items-center space-x-1"
                        >
                          <ActionIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">{action.label}</span>
                        </Button>
                      );
                    })}
                    
                    {secondaryActions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {secondaryActions.map((action) => {
                            const ActionIcon = action.icon;
                            return (
                              <DropdownMenuItem
                                key={action.id}
                                onClick={action.onClick}
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
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {description && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {description}
                    </p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {tabs.length > 0 ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <div className="flex-shrink-0 border-b">
                      <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent">
                        {tabs.map((tab) => {
                          const TabIcon = tab.icon;
                          return (
                            <TabsTrigger
                              key={tab.id}
                              value={tab.id}
                              className={cn(
                                "relative rounded-none border-b-2 border-transparent",
                                "data-[state=active]:border-blue-500 data-[state=active]:bg-transparent",
                                "px-4 py-3 text-sm font-medium transition-all"
                              )}
                            >
                              <div className="flex items-center space-x-2">
                                {TabIcon && <TabIcon className="h-4 w-4" />}
                                <span>{tab.label}</span>
                                {tab.badge && (
                                  <Badge variant="secondary" className="text-xs">
                                    {tab.badge}
                                  </Badge>
                                )}
                              </div>
                            </TabsTrigger>
                          );
                        })}
                      </TabsList>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      {tabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id} className="h-full mt-0">
                          <ScrollArea className="h-full">
                            <div className="p-6">
                              {tab.content}
                            </div>
                          </ScrollArea>
                        </TabsContent>
                      ))}
                    </div>
                  </Tabs>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="p-6 space-y-6">
                      {/* Fields */}
                      {fields.length > 0 && (
                        <div className="space-y-4">
                          {fields.map((field, index) => {
                            const FieldIcon = field.icon;
                            return (
                              <div key={index} className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  {FieldIcon && (
                                    <FieldIcon className="h-4 w-4 text-gray-400" />
                                  )}
                                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {field.label}
                                  </label>
                                </div>
                                {renderFieldValue(field)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Custom Content */}
                      {children}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}