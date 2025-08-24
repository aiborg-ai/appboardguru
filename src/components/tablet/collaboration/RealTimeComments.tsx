'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/features/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card';
import { Badge } from '@/features/shared/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare,
  Reply,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Edit3,
  Trash2,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Send,
  AtSign,
  Hash,
  Clock,
  User,
  Filter,
  Search
} from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  timestamp: Date;
  parentId?: string; // For replies
  mentions?: string[]; // User IDs mentioned in comment
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
  }>;
  reactions: { [emoji: string]: string[] }; // emoji -> array of user IDs
  isEdited?: boolean;
  isPinned?: boolean;
  isPrivate?: boolean;
  thread?: Comment[];
  status: 'active' | 'resolved' | 'archived';
}

interface RealTimeCommentsProps {
  meetingId: string;
  currentUserId: string;
  comments: Comment[];
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
    isOnline: boolean;
  }>;
  onCommentCreate: (content: string, parentId?: string, mentions?: string[]) => void;
  onCommentUpdate: (id: string, content: string) => void;
  onCommentDelete: (id: string) => void;
  onCommentReact: (id: string, emoji: string) => void;
  onCommentPin: (id: string, pinned: boolean) => void;
  onCommentResolve: (id: string, resolved: boolean) => void;
  onCommentPrivacy: (id: string, isPrivate: boolean) => void;
  className?: string;
}

type CommentFilter = 'all' | 'pinned' | 'mentions' | 'private' | 'resolved';

const EMOJI_REACTIONS = ['👍', '👎', '❤️', '😊', '😢', '😮', '😡', '🎉'];

export const RealTimeComments: React.FC<RealTimeCommentsProps> = ({
  meetingId,
  currentUserId,
  comments,
  participants,
  onCommentCreate,
  onCommentUpdate,
  onCommentDelete,
  onCommentReact,
  onCommentPin,
  onCommentResolve,
  onCommentPrivacy,
  className
}) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filter, setFilter] = useState<CommentFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const editCommentRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest comment
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Handle @ mentions
  const handleInputChange = useCallback((value: string, setCursorPos?: (pos: number) => void) => {
    setNewComment(value);
    
    const cursorPos = newCommentRef.current?.selectionStart || 0;
    const textUpToCursor = value.substring(0, cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const afterAt = textUpToCursor.substring(lastAtSymbol + 1);
      if (afterAt.length >= 0 && !afterAt.includes(' ')) {
        const filtered = participants.filter(p =>
          p.name.toLowerCase().includes(afterAt.toLowerCase())
        );
        setMentionSuggestions(filtered.map(p => ({ id: p.id, name: p.name })));
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
    
    if (setCursorPos) setCursorPos(cursorPos);
  }, [participants]);

  const insertMention = useCallback((userId: string, userName: string) => {
    const cursorPos = newCommentRef.current?.selectionStart || 0;
    const textUpToCursor = newComment.substring(0, cursorPos);
    const textAfterCursor = newComment.substring(cursorPos);
    const lastAtSymbol = textUpToCursor.lastIndexOf('@');
    
    const beforeAt = newComment.substring(0, lastAtSymbol);
    const newText = `${beforeAt}@${userName} ${textAfterCursor}`;
    
    setNewComment(newText);
    setShowMentions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      newCommentRef.current?.focus();
      const newCursorPos = lastAtSymbol + userName.length + 2;
      newCommentRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [newComment]);

  const extractMentions = useCallback((content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedUser = participants.find(p => p.name === match[1]);
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }
    
    return mentions;
  }, [participants]);

  const handleSubmitComment = useCallback(() => {
    if (!newComment.trim()) return;
    
    const mentions = extractMentions(newComment);
    onCommentCreate(newComment.trim(), replyingTo || undefined, mentions);
    
    setNewComment('');
    setReplyingTo(null);
  }, [newComment, replyingTo, extractMentions, onCommentCreate]);

  const handleEditSubmit = useCallback(() => {
    if (!editContent.trim() || !editingComment) return;
    
    onCommentUpdate(editingComment, editContent.trim());
    setEditingComment(null);
    setEditContent('');
  }, [editContent, editingComment, onCommentUpdate]);

  const startEdit = useCallback((comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingComment(null);
    setEditContent('');
  }, []);

  const filteredComments = React.useMemo(() => {
    let filtered = comments.filter(comment => !comment.parentId); // Only root comments
    
    switch (filter) {
      case 'pinned':
        filtered = filtered.filter(c => c.isPinned);
        break;
      case 'mentions':
        filtered = filtered.filter(c => c.mentions?.includes(currentUserId));
        break;
      case 'private':
        filtered = filtered.filter(c => c.isPrivate);
        break;
      case 'resolved':
        filtered = filtered.filter(c => c.status === 'resolved');
        break;
    }
    
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.author.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [comments, filter, searchQuery, currentUserId]);

  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  }, []);

  const renderComment = useCallback((comment: Comment, level = 0) => {
    const isOwner = comment.author.id === currentUserId;
    const replies = comments.filter(c => c.parentId === comment.id);
    
    return (
      <div
        key={comment.id}
        className={cn(
          "border-l-2 pl-4 py-2",
          level > 0 ? "ml-6 border-gray-200" : "border-transparent",
          comment.isPinned && "bg-yellow-50 border-yellow-200"
        )}
      >
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              {comment.author.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
          
          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <Badge variant="outline" className="text-xs">
                {comment.author.role}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatTimestamp(comment.timestamp)}
              </span>
              {comment.isEdited && (
                <Badge variant="secondary" className="text-xs">
                  edited
                </Badge>
              )}
              {comment.isPinned && (
                <Pin className="h-3 w-3 text-yellow-600" />
              )}
              {comment.isPrivate && (
                <EyeOff className="h-3 w-3 text-gray-500" />
              )}
            </div>
            
            {/* Comment Text */}
            {editingComment === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  ref={editCommentRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                  placeholder="Edit your comment..."
                />
                <div className="flex space-x-2">
                  <Button size="sm" onClick={handleEditSubmit}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </div>
            )}
            
            {/* Reactions */}
            {Object.keys(comment.reactions).length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                {Object.entries(comment.reactions).map(([emoji, userIds]) => (
                  <button
                    key={emoji}
                    onClick={() => onCommentReact(comment.id, emoji)}
                    className={cn(
                      "flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors",
                      userIds.includes(currentUserId)
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{userIds.length}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-2 text-xs">
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="text-gray-500 hover:text-blue-600 flex items-center space-x-1"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
              
              <button
                onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                className="text-gray-500 hover:text-blue-600 flex items-center space-x-1"
              >
                <ThumbsUp className="h-3 w-3" />
                <span>React</span>
              </button>
              
              {isOwner && (
                <button
                  onClick={() => startEdit(comment)}
                  className="text-gray-500 hover:text-blue-600 flex items-center space-x-1"
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Edit</span>
                </button>
              )}
              
              {(isOwner || participants.find(p => p.id === currentUserId)?.role === 'moderator') && (
                <>
                  <button
                    onClick={() => onCommentPin(comment.id, !comment.isPinned)}
                    className="text-gray-500 hover:text-blue-600 flex items-center space-x-1"
                  >
                    {comment.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    <span>{comment.isPinned ? 'Unpin' : 'Pin'}</span>
                  </button>
                  
                  <button
                    onClick={() => onCommentDelete(comment.id)}
                    className="text-gray-500 hover:text-red-600 flex items-center space-x-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
            
            {/* Emoji Picker */}
            {showEmojiPicker === comment.id && (
              <div className="mt-2 p-2 bg-white border rounded-lg shadow-lg">
                <div className="flex flex-wrap gap-1">
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onCommentReact(comment.id, emoji);
                        setShowEmojiPicker(null);
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-3">
            {replies.map(reply => renderComment(reply, level + 1))}
          </div>
        )}
        
        {/* Reply Form */}
        {replyingTo === comment.id && (
          <div className="mt-3 ml-11">
            <div className="flex space-x-2">
              <Textarea
                value={newComment}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={`Reply to ${comment.author.name}...`}
                className="min-h-[60px] text-sm"
                rows={2}
              />
              <div className="flex flex-col space-y-1">
                <Button size="sm" onClick={handleSubmitComment} disabled={!newComment.trim()}>
                  <Send className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    currentUserId,
    comments,
    editingComment,
    editContent,
    showEmojiPicker,
    replyingTo,
    newComment,
    formatTimestamp,
    participants,
    onCommentReact,
    onCommentPin,
    onCommentDelete,
    handleEditSubmit,
    cancelEdit,
    startEdit,
    handleSubmitComment,
    handleInputChange
  ]);

  return (
    <div className={cn("h-full flex flex-col bg-white", className)}>
      {/* Header */}
      <div className="border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Comments ({filteredComments.length})</span>
          </h3>
        </div>
        
        {/* Filters and Search */}
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            {[
              { id: 'all' as CommentFilter, label: 'All' },
              { id: 'pinned' as CommentFilter, label: 'Pinned' },
              { id: 'mentions' as CommentFilter, label: '@Me' },
              { id: 'resolved' as CommentFilter, label: 'Resolved' }
            ].map((filterOption) => (
              <Button
                key={filterOption.id}
                variant={filter === filterOption.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(filterOption.id)}
                className="text-xs"
              >
                {filterOption.label}
              </Button>
            ))}
          </div>
          
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet. Start the conversation!</p>
          </div>
        ) : (
          filteredComments.map(comment => renderComment(comment))
        )}
        <div ref={commentsEndRef} />
      </div>
      
      {/* New Comment Form */}
      <div className="border-t bg-gray-50 p-4">
        <div className="relative">
          <Textarea
            ref={newCommentRef}
            value={newComment}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Add a comment... Use @ to mention participants"
            className="min-h-[80px] pr-12"
            rows={3}
          />
          
          {/* Mention Suggestions */}
          {showMentions && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-lg shadow-lg max-h-32 overflow-y-auto">
              {mentionSuggestions.map((user) => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user.id, user.name)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <AtSign className="h-4 w-4 text-gray-400" />
                  <span>{user.name}</span>
                </button>
              ))}
            </div>
          )}
          
          <Button
            size="sm"
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="absolute bottom-2 right-2"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span>💡 Use @name to mention participants</span>
            <span>📌 Moderators can pin important comments</span>
          </div>
          <div className="flex items-center space-x-2">
            <span>{participants.filter(p => p.isOnline).length} online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeComments;