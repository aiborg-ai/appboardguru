'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Clock,
  CheckCircle,
  User,
  Users,
  Calendar,
  Hash,
  MoreVertical,
  Reply,
  Heart,
  AlertCircle,
  Edit3,
  Trash2,
  Pin,
  Archive,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import AnnotationThread from './AnnotationThread';

interface Annotation {
  id: string;
  page_number: number;
  position: any;
  comment_text?: string;
  selected_text?: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_resolved: boolean;
  is_private: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies?: any[];
  reactions?: { emoji: string; users: string[] }[];
}

interface AnnotationsPanelProps {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  currentUserId: string;
  connectedUsers: any[];
  filters: any;
  onAnnotationSelect: (annotationId: string | null) => void;
  onFiltersChange: (filters: any) => void;
  onAnnotationReply: (annotationId: string, reply: string) => void;
  onAnnotationResolve: (annotationId: string) => void;
}

export default function AnnotationsPanel({
  annotations,
  selectedAnnotation,
  currentUserId,
  connectedUsers,
  filters,
  onAnnotationSelect,
  onFiltersChange,
  onAnnotationReply,
  onAnnotationResolve
}: AnnotationsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<'time' | 'page' | 'user'>('time');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'mostReplies'>('newest');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Filter and sort annotations
  const processedAnnotations = useMemo(() => {
    let filtered = [...annotations];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.comment_text?.toLowerCase().includes(query) ||
        a.selected_text?.toLowerCase().includes(query) ||
        a.user.full_name.toLowerCase().includes(query)
      );
    }
    
    // Apply other filters
    if (filters.showOnlyMine) {
      filtered = filtered.filter(a => a.created_by === currentUserId);
    }
    if (filters.showResolved !== undefined) {
      filtered = filtered.filter(a => a.is_resolved === filters.showResolved);
    }
    if (filters.pageNumber) {
      filtered = filtered.filter(a => a.page_number === filters.pageNumber);
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'mostReplies':
          return (b.replies?.length || 0) - (a.replies?.length || 0);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    
    return filtered;
  }, [annotations, searchQuery, filters, sortBy, currentUserId]);

  // Group annotations
  const groupedAnnotations = useMemo(() => {
    const groups = new Map<string, Annotation[]>();
    
    processedAnnotations.forEach(annotation => {
      let key: string;
      
      switch (groupBy) {
        case 'page':
          key = `Page ${annotation.page_number}`;
          break;
        case 'user':
          key = annotation.user.full_name;
          break;
        case 'time':
        default:
          const date = new Date(annotation.created_at);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (date.toDateString() === today.toDateString()) {
            key = 'Today';
          } else if (date.toDateString() === yesterday.toDateString()) {
            key = 'Yesterday';
          } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
            key = 'This Week';
          } else {
            key = 'Older';
          }
          break;
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(annotation);
    });
    
    return Array.from(groups.entries());
  }, [processedAnnotations, groupBy]);

  // Toggle thread expansion
  const toggleThread = (annotationId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(annotationId)) {
      newExpanded.delete(annotationId);
    } else {
      newExpanded.add(annotationId);
    }
    setExpandedThreads(newExpanded);
  };

  // Handle reply submission
  const handleReplySubmit = (annotationId: string) => {
    if (!replyText.trim()) return;
    
    onAnnotationReply(annotationId, replyText);
    setReplyText('');
    setReplyingTo(null);
  };

  // Auto-expand selected annotation
  useEffect(() => {
    if (selectedAnnotation) {
      setExpandedThreads(prev => new Set([...prev, selectedAnnotation]));
    }
  }, [selectedAnnotation]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Annotations
            <Badge variant="secondary" className="ml-1">
              {processedAnnotations.length}
            </Badge>
          </h2>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 overflow-hidden"
            >
              <div className="flex items-center gap-2">
                <Button
                  variant={filters.showOnlyMine ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, showOnlyMine: !filters.showOnlyMine })}
                >
                  <User className="h-3 w-3 mr-1" />
                  My Annotations
                </Button>
                
                <Button
                  variant={filters.showResolved === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, showResolved: filters.showResolved === false ? undefined : false })}
                >
                  <Clock className="h-3 w-3 mr-1" />
                  Active
                </Button>
                
                <Button
                  variant={filters.showResolved === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFiltersChange({ ...filters, showResolved: filters.showResolved === true ? undefined : true })}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Resolved
                </Button>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Group by:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="time">Time</option>
                  <option value="page">Page</option>
                  <option value="user">User</option>
                </select>
                
                <span className="text-gray-500 ml-2">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="mostReplies">Most Replies</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Annotations List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {groupedAnnotations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {searchQuery ? 'No annotations match your search' : 'No annotations yet'}
              </p>
            </div>
          ) : (
            groupedAnnotations.map(([groupName, groupAnnotations]) => (
              <div key={groupName} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {groupBy === 'page' && <Hash className="h-3 w-3" />}
                  {groupBy === 'user' && <User className="h-3 w-3" />}
                  {groupBy === 'time' && <Calendar className="h-3 w-3" />}
                  {groupName}
                  <Badge variant="outline" className="ml-auto text-xs">
                    {groupAnnotations.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {groupAnnotations.map(annotation => {
                    const isSelected = selectedAnnotation === annotation.id;
                    const isExpanded = expandedThreads.has(annotation.id);
                    const isOwn = annotation.created_by === currentUserId;
                    const hasReplies = (annotation.replies?.length || 0) > 0;
                    const isReplying = replyingTo === annotation.id;
                    
                    return (
                      <motion.div
                        key={annotation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "bg-white rounded-lg border transition-all",
                          isSelected && "ring-2 ring-blue-500 shadow-md",
                          annotation.is_resolved && "opacity-60"
                        )}
                      >
                        <div
                          className="p-3 cursor-pointer"
                          onClick={() => onAnnotationSelect(annotation.id)}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={annotation.user.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {annotation.user.full_name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {annotation.user.full_name}
                                  </span>
                                  {isOwn && (
                                    <Badge variant="outline" className="text-xs">
                                      You
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}</span>
                                  <span>•</span>
                                  <span>Page {annotation.page_number}</span>
                                </div>
                              </div>
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onAnnotationSelect(annotation.id)}>
                                  <Eye className="h-3 w-3 mr-2" />
                                  View in Document
                                </DropdownMenuItem>
                                {!annotation.is_resolved && (
                                  <DropdownMenuItem onClick={() => onAnnotationResolve(annotation.id)}>
                                    <CheckCircle className="h-3 w-3 mr-2" />
                                    Mark as Resolved
                                  </DropdownMenuItem>
                                )}
                                {isOwn && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                      <Edit3 className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-600">
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          {/* Selected Text */}
                          {annotation.selected_text && (
                            <div 
                              className="text-sm px-2 py-1 rounded mb-2 inline-block"
                              style={{ backgroundColor: annotation.color + '30' }}
                            >
                              "{annotation.selected_text}"
                            </div>
                          )}
                          
                          {/* Comment */}
                          {annotation.comment_text && (
                            <p className="text-sm text-gray-700 mb-2">
                              {annotation.comment_text}
                            </p>
                          )}
                          
                          {/* Footer */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Reactions */}
                              {annotation.reactions?.map(reaction => (
                                <button
                                  key={reaction.emoji}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs"
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.users.length}</span>
                                </button>
                              ))}
                              
                              <button className="text-gray-400 hover:text-gray-600 text-xs">
                                +😀
                              </button>
                            </div>
                            
                            {/* Reply Count */}
                            {hasReplies && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleThread(annotation.id);
                                }}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              >
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                {annotation.replies?.length} {annotation.replies?.length === 1 ? 'reply' : 'replies'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Replies */}
                        <AnimatePresence>
                          {(isExpanded || isReplying) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t"
                            >
                              {/* Existing Replies */}
                              {isExpanded && annotation.replies && annotation.replies.length > 0 && (
                                <div className="p-3 space-y-2 bg-gray-50">
                                  {annotation.replies.map((reply: any) => (
                                    <div key={reply.id} className="flex gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">
                                          {reply.user?.name?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-1">
                                          <span className="font-medium">{reply.user?.name || 'Unknown'}</span>
                                          <span className="mx-1">•</span>
                                          <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-sm text-gray-700">{reply.text}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Reply Input */}
                              <div className="p-3 bg-gray-50">
                                {isReplying ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Write a reply..."
                                      className="min-h-[60px] text-sm"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setReplyingTo(null);
                                          setReplyText('');
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleReplySubmit(annotation.id)}
                                        disabled={!replyText.trim()}
                                      >
                                        Reply
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReplyingTo(annotation.id);
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  >
                                    <Reply className="h-3 w-3" />
                                    Reply
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Active Users */}
      {connectedUsers.length > 1 && (
        <div className="p-3 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-600">Active now:</span>
            <div className="flex -space-x-1">
              {connectedUsers.slice(0, 5).map((user) => (
                <Avatar key={user.id} className="h-5 w-5 border-2 border-white">
                  <AvatarFallback className="text-xs">
                    {user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {connectedUsers.length > 5 && (
                <div className="h-5 w-5 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                  +{connectedUsers.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}