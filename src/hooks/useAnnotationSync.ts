'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface AnnotationData {
  id: string;
  asset_id: string;
  vault_id?: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  annotation_type: string;
  content: any;
  page_number: number;
  position: any;
  selected_text?: string;
  comment_text?: string;
  color: string;
  opacity: number;
  is_private: boolean;
  is_resolved: boolean;
  is_deleted: boolean;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  replies_count?: number;
}

interface AnnotationReply {
  id: string;
  annotation_id: string;
  reply_text: string;
  created_by: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface UseAnnotationSyncProps {
  assetId: string;
  organizationId: string;
  currentUserId: string;
  onAnnotationChange?: (annotation: AnnotationData, action: 'created' | 'updated' | 'deleted') => void;
  onReplyChange?: (reply: AnnotationReply, action: 'created' | 'updated' | 'deleted') => void;
  onUserPresence?: (users: Array<{ user_id: string; user_name: string; last_seen: string }>) => void;
}

export function useAnnotationSync({
  assetId,
  organizationId,
  currentUserId,
  onAnnotationChange,
  onReplyChange,
  onUserPresence,
}: UseAnnotationSyncProps) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<Array<{ user_id: string; user_name: string; last_seen: string }>>([]);
  
  const supabase = createSupabaseBrowserClient();

  // Update user presence
  const updatePresence = useCallback(async () => {
    try {
      // Update user presence in the asset
      await supabase
        .from('user_asset_presence')
        .upsert({
          user_id: currentUserId,
          asset_id: assetId,
          organization_id: organizationId,
          last_seen: new Date().toISOString(),
          is_active: true,
        });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [supabase, currentUserId, assetId, organizationId]);

  // Set up real-time subscriptions
  useEffect(() => {
    let annotationChannel: any;
    let replyChannel: any;
    let presenceChannel: any;

    const setupSubscriptions = async () => {
      try {
        // Subscribe to annotation changes
        annotationChannel = supabase
          .channel(`annotations_${assetId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'asset_annotations',
              filter: `asset_id=eq.${assetId}`,
            },
            async (payload) => {
              if (payload.new && (payload.new as any).created_by !== currentUserId) {
                // Fetch user information for the annotation
                const { data: userInfo } = await supabase
                  .from('users')
                  .select('id, full_name, avatar_url')
                  .eq('id', (payload.new as any).created_by)
                  .single();

                const annotationData: AnnotationData = {
                  ...payload.new,
                  user: userInfo,
                } as AnnotationData;

                if (payload.eventType === 'INSERT') {
                  onAnnotationChange?.(annotationData, 'created');
                  
                  toast({
                    title: 'New Annotation',
                    description: `${userInfo?.full_name || 'Someone'} added an annotation`,
                  });
                } else if (payload.eventType === 'UPDATE') {
                  onAnnotationChange?.(annotationData, 'updated');
                } else if (payload.eventType === 'DELETE') {
                  onAnnotationChange?.(annotationData, 'deleted');
                }
              }
            }
          )
          .subscribe();

        // Subscribe to reply changes
        replyChannel = supabase
          .channel(`replies_${assetId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'annotation_replies',
              filter: `annotation_id=in.(${assetId})`, // This would need to be adjusted to filter by asset's annotations
            },
            async (payload) => {
              if (payload.new && (payload.new as any).created_by !== currentUserId) {
                // Fetch user information for the reply
                const { data: userInfo } = await supabase
                  .from('users')
                  .select('id, full_name, avatar_url')
                  .eq('id', (payload.new as any).created_by)
                  .single();

                const replyData: AnnotationReply = {
                  ...payload.new,
                  user: userInfo,
                } as AnnotationReply;

                if (payload.eventType === 'INSERT') {
                  onReplyChange?.(replyData, 'created');
                  
                  toast({
                    title: 'New Reply',
                    description: `${userInfo?.full_name || 'Someone'} replied to an annotation`,
                  });
                } else if (payload.eventType === 'UPDATE') {
                  onReplyChange?.(replyData, 'updated');
                } else if (payload.eventType === 'DELETE') {
                  onReplyChange?.(replyData, 'deleted');
                }
              }
            }
          )
          .subscribe();

        // Subscribe to user presence (if presence table exists)
        presenceChannel = supabase
          .channel(`presence_${assetId}`)
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const users = Object.values(state).flat() as Array<{ user_id: string; user_name: string; last_seen: string }>;
            setActiveUsers(users);
            onUserPresence?.(users);
          })
          .on('presence', { event: 'join' }, ({ newPresences }: any) => {
            const newUsers = newPresences as Array<{ user_id: string; user_name: string; last_seen: string }>;
            setActiveUsers(prev => [...prev, ...newUsers]);
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
            const leftUsers = leftPresences as Array<{ user_id: string; user_name: string; last_seen: string }>;
            setActiveUsers(prev => prev.filter(user => 
              !leftUsers.some(leftUser => leftUser.user_id === user.user_id)
            ));
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track presence
              await presenceChannel.track({
                user_id: currentUserId,
                user_name: 'Current User', // This should come from user data
                last_seen: new Date().toISOString(),
              });
            }
          });

        setIsConnected(true);

        // Update presence periodically
        updatePresence();
        const presenceInterval = setInterval(updatePresence, 30000); // Every 30 seconds

        return () => {
          clearInterval(presenceInterval);
        };

      } catch (error) {
        console.error('Error setting up subscriptions:', error);
        setIsConnected(false);
      }
    };

    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      if (annotationChannel) {
        supabase.removeChannel(annotationChannel);
      }
      if (replyChannel) {
        supabase.removeChannel(replyChannel);
      }
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
      setIsConnected(false);
    };
  }, [assetId, organizationId, currentUserId, onAnnotationChange, onReplyChange, onUserPresence, supabase, toast, updatePresence]);

  // Handle page visibility changes to update presence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updatePresence]);

  // Manual sync function for when user wants to refresh
  const syncAnnotations = useCallback(async () => {
    try {
      const response = await fetch(`/api/assets/${assetId}/annotations`);
      if (!response.ok) {
        throw new Error('Failed to sync annotations');
      }
      
      const data = await response.json();
      return data.annotations;
    } catch (error) {
      console.error('Error syncing annotations:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to sync annotations',
        variant: 'destructive',
      });
      return null;
    }
  }, [assetId, toast]);

  return {
    isConnected,
    activeUsers,
    syncAnnotations,
  };
}