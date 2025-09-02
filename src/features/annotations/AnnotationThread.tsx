'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Reply,
  Heart,
  MoreVertical,
  Edit3,
  Trash2,
  Flag,
  CheckCircle,
  Clock,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  Send,
  Paperclip,
  Smile,
  AtSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Reply {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  created_at: string;
  edited_at?: string;
  reactions?: { emoji: string; users: string[] }[];
  replies?: Reply[];
}

interface Annotation {
  id: string;
  comment_text?: string;
  selected_text?: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  created_at: string;
  is_resolved: boolean;
  replies?: Reply[];
  reactions?: { emoji: string; users: string[] }[];
}

interface AnnotationThreadProps {
  annotation: Annotation;
  currentUserId: string;
  depth?: number;
  onReply: (text: string, parentId?: string) => void;
  onResolve: () => void;
  onEdit: (text: string, replyId?: string) => void;
  onDelete: (replyId?: string) => void;
  onReaction: (emoji: string, targetId?: string) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '🤔', '👀', '🚀'];

export default function AnnotationThread({
  annotation,
  currentUserId,
  depth = 0,
  onReply,
  onResolve,
  onEdit,
  onDelete,
  onReaction
}: AnnotationThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  const isOwn = annotation.user.id === currentUserId;
  const hasReplies = (annotation.replies?.length || 0) > 0;

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onReply(replyText);
    setReplyText('');
    setIsReplying(false);
  };

  const handleEditSubmit = (replyId?: string) => {
    if (!editText.trim()) return;
    onEdit(editText, replyId);
    setEditText('');
    setEditingId(null);
  };

  const toggleReplyExpansion = (replyId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(replyId)) {
      newExpanded.delete(replyId);
    } else {
      newExpanded.add(replyId);
    }
    setExpandedReplies(newExpanded);
  };

  const renderReply = (reply: Reply, parentDepth: number = 0) => {
    const isReplyOwn = reply.user.id === currentUserId;
    const isEditing = editingId === reply.id;
    const hasNestedReplies = (reply.replies?.length || 0) > 0;
    const isExpanded = expandedReplies.has(reply.id);

    return (
      <motion.div
        key={reply.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={cn(
          "group",
          parentDepth > 0 && "ml-8 border-l-2 border-gray-100 pl-4"
        )}
      >
        <div className="flex gap-3 py-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={reply.user.avatar} />
            <AvatarFallback className="text-xs">
              {reply.user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{reply.user.name}</span>
                {isReplyOwn && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                </span>
                {reply.edited_at && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                {/* Reactions */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1"
                    onClick={() => setShowEmojiPicker(showEmojiPicker === reply.id ? null : reply.id)}
                  >
                    <Smile className="h-3 w-3" />
                  </Button>

                  {showEmojiPicker === reply.id && (
                    <div className="absolute bottom-full right-0 mb-1 bg-white rounded-lg shadow-lg border p-1 flex gap-1 z-10">
                      {REACTION_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            onReaction(emoji, reply.id);
                            setShowEmojiPicker(null);
                          }}
                          className="hover:bg-gray-100 rounded p-1 text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isReplyOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingId(reply.id);
                        setEditText(reply.text);
                      }}>
                        <Edit3 className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(reply.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[60px] text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEditSubmit(reply.id)}
                    disabled={!editText.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.text}</p>

                {/* Reactions */}
                {reply.reactions && reply.reactions.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {reply.reactions.map(reaction => (
                      <TooltipProvider key={reaction.emoji}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onReaction(reaction.emoji, reply.id)}
                              className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                                reaction.users.includes(currentUserId)
                                  ? "bg-blue-100 hover:bg-blue-200"
                                  : "bg-gray-100 hover:bg-gray-200"
                              )}
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.users.length}</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {reaction.users.slice(0, 3).join(', ')}
                              {reaction.users.length > 3 && ` and ${reaction.users.length - 3} more`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}

                {/* Nested replies indicator */}
                {hasNestedReplies && (
                  <button
                    onClick={() => toggleReplyExpansion(reply.id)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    {reply.replies?.length} {reply.replies?.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Nested replies */}
        {hasNestedReplies && isExpanded && (
          <div className="mt-2">
            {reply.replies?.map(nestedReply => renderReply(nestedReply, parentDepth + 1))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={cn("space-y-3", depth > 0 && "ml-4")}>
      {/* Main annotation */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={annotation.user.avatar_url} />
            <AvatarFallback>
              {annotation.user.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{annotation.user.full_name}</span>
                  {isOwn && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                  {annotation.is_resolved && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {!annotation.is_resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onResolve}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
                
                {isOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingId('main');
                        setEditText(annotation.comment_text || '');
                      }}>
                        <Edit3 className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete()}
                        className="text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Content */}
            {annotation.selected_text && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2 text-sm">
                "{annotation.selected_text}"
              </div>
            )}

            {editingId === 'main' ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[80px]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditText('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleEditSubmit()}
                    disabled={!editText.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {annotation.comment_text && (
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                    {annotation.comment_text}
                  </p>
                )}

                {/* Reactions */}
                {annotation.reactions && annotation.reactions.length > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {annotation.reactions.map(reaction => (
                      <button
                        key={reaction.emoji}
                        onClick={() => onReaction(reaction.emoji)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                          reaction.users.includes(currentUserId)
                            ? "bg-blue-100 hover:bg-blue-200"
                            : "bg-gray-100 hover:bg-gray-200"
                        )}
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reply button */}
                {!isReplying && (
                  <button
                    onClick={() => setIsReplying(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Reply input */}
        {isReplying && (
          <div className="mt-4 ml-13 space-y-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="min-h-[60px] text-sm"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Paperclip className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <AtSign className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReplySubmit}
                  disabled={!replyText.trim()}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Replies */}
      {hasReplies && (
        <div className="space-y-2">
          {annotation.replies?.map(reply => renderReply(reply))}
        </div>
      )}
    </div>
  );
}