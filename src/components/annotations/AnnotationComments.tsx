'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Reply, 
  ThumbsUp, 
  MoreVertical,
  Check,
  X,
  Edit
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface AnnotationReply {
  id: string;
  reply_text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  reactions: Array<{
    id: string;
    user_id: string;
    emoji: string;
  }>;
}

interface AnnotationData {
  id: string;
  selected_text?: string;
  comment_text?: string;
  color: string;
  page_number: number;
  created_by: string;
  created_at: string;
  is_resolved: boolean;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies: AnnotationReply[];
  replies_count: number;
}

interface AnnotationCommentsProps {
  annotation: AnnotationData;
  currentUserId: string;
  assetId: string;
  onAnnotationUpdate?: (annotation: AnnotationData) => void;
}

export default function AnnotationComments({
  annotation,
  currentUserId,
  assetId,
  onAnnotationUpdate,
}: AnnotationCommentsProps) {
  const { toast } = useToast();
  const [replies, setReplies] = useState<AnnotationReply[]>(annotation.replies || []);
  const [newReply, setNewReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolved, setIsResolved] = useState(annotation.is_resolved);
  const [expandedReplies, setExpandedReplies] = useState(true);

  // Load replies when annotation changes
  useEffect(() => {
    setReplies(annotation.replies || []);
    setIsResolved(annotation.is_resolved);
  }, [annotation]);

  // Create reply
  const handleCreateReply = async () => {
    if (!newReply.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/assets/${assetId}/annotations/${annotation.id}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reply_text: newReply.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create reply');
      }

      const result = await response.json();
      setReplies(prev => [...prev, result.reply]);
      setNewReply('');

      toast({
        title: 'Success',
        description: 'Reply added successfully',
      });

    } catch (error) {
      console.error('Error creating reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to add reply',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle resolved status
  const handleToggleResolved = async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations/${annotation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_resolved: !isResolved,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update annotation');
      }

      setIsResolved(!isResolved);
      
      if (onAnnotationUpdate) {
        onAnnotationUpdate({
          ...annotation,
          is_resolved: !isResolved,
        });
      }

      toast({
        title: 'Success',
        description: isResolved ? 'Annotation reopened' : 'Annotation resolved',
      });

    } catch (error) {
      console.error('Error updating annotation:', error);
      toast({
        title: 'Error',
        description: 'Failed to update annotation',
        variant: 'destructive',
      });
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div
              className="w-4 h-4 rounded mt-1 flex-shrink-0"
              style={{ backgroundColor: annotation.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={annotation.user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getUserInitials(annotation.user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {annotation.user.full_name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Page {annotation.page_number}
                </Badge>
                {isResolved && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Resolved
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(annotation.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleResolved}
              className="h-auto p-1"
            >
              {isResolved ? (
                <X className="w-4 h-4 text-orange-500" />
              ) : (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Selected text highlight */}
        {annotation.selected_text && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3 rounded-r">
            <div className="text-sm text-gray-700 italic">
              "{annotation.selected_text}"
            </div>
          </div>
        )}

        {/* Annotation comment */}
        {annotation.comment_text && (
          <div className="mb-4">
            <p className="text-sm text-gray-800">
              {annotation.comment_text}
            </p>
          </div>
        )}

        {/* Replies section */}
        {replies.length > 0 && (
          <div className="border-t pt-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedReplies(!expandedReplies)}
              className="mb-2 h-auto p-1 text-gray-600"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </Button>

            {expandedReplies && (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2">
                    <Avatar className="w-5 h-5 mt-1">
                      <AvatarImage src={reply.user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(reply.user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {reply.user.full_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                        {reply.is_edited && (
                          <span className="text-xs text-gray-400">(edited)</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        {reply.reply_text}
                      </p>
                      
                      {/* Reply reactions */}
                      {reply.reactions.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {Object.entries(
                            reply.reactions.reduce((acc, reaction) => {
                              acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>)
                          ).map(([emoji, count]) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-xs"
                            >
                              {emoji} {count}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* New reply input */}
        {!isResolved && (
          <div className="space-y-2">
            <Textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Add a reply..."
              className="text-sm"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={handleCreateReply}
                disabled={!newReply.trim() || isSubmitting}
              >
                <Reply className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Replying...' : 'Reply'}
              </Button>
            </div>
          </div>
        )}

        {isResolved && (
          <div className="text-center text-sm text-gray-500 py-2">
            This annotation has been resolved
          </div>
        )}
      </CardContent>
    </Card>
  );
}