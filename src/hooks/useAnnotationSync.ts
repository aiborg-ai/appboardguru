'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useToast } from '@/components/ui/use-toast';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Type-safe annotation content based on annotation type
type AnnotationContent = 
  | { type: 'text'; text: string; formatting?: Record<string, unknown> }
  | { type: 'highlight'; selection: { start: number; end: number; text: string } }
  | { type: 'comment'; comment: string; attachments?: readonly string[] }
  | { type: 'note'; note: string; tags?: readonly string[] }
  | { type: 'drawing'; paths: readonly unknown[]; strokeWidth?: number }
  | Record<string, unknown>; // Fallback for extensibility

// Type-safe position data for annotations
interface AnnotationPosition {
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly page?: number;
  readonly boundingRect?: {
    readonly top: number;
    readonly left: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly rects?: readonly {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }[];
}

interface AnnotationData {
  readonly id: string;
  readonly asset_id: string;
  readonly vault_id?: string;
  readonly organization_id: string;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly annotation_type: string;
  readonly content: AnnotationContent;
  readonly page_number: number;
  readonly position: AnnotationPosition | null;
  readonly selected_text?: string;
  readonly comment_text?: string;
  readonly color: string;
  readonly opacity: number;
  readonly is_private: boolean;
  readonly is_resolved: boolean;
  readonly is_deleted: boolean;
  readonly user?: {
    readonly id: string;
    readonly full_name: string;
    readonly avatar_url?: string;
  };
  readonly replies_count?: number;
}

interface AnnotationReply {
  readonly id: string;
  readonly annotation_id: string;
  readonly reply_text: string;
  readonly created_by: string;
  readonly created_at: string;
  readonly user?: {
    readonly id: string;
    readonly full_name: string;
    readonly avatar_url?: string;
  };
}

// Type-safe Supabase payload types
type AnnotationPayload = RealtimePostgresChangesPayload<AnnotationData>;
type ReplyPayload = RealtimePostgresChangesPayload<AnnotationReply>;

// Type-safe user presence data
interface UserPresenceData {
  readonly user_id: string;
  readonly user_name: string;
  readonly last_seen: string;
  readonly avatar_url?: string;
  readonly status?: 'online' | 'away' | 'offline';
}

// Type-safe presence event payloads
interface PresenceJoinPayload {
  readonly newPresences: readonly UserPresenceData[];
}

interface PresenceLeavePayload {
  readonly leftPresences: readonly UserPresenceData[];
}

interface UseAnnotationSyncProps {
  assetId: string;
  organizationId: string;
  currentUserId: string;
  onAnnotationChange?: (annotation: AnnotationData, action: 'created' | 'updated' | 'deleted') => void;
  onReplyChange?: (reply: AnnotationReply, action: 'created' | 'updated' | 'deleted') => void;
  onUserPresence?: (users: UserPresenceData[]) => void;
}

export function useAnnotationSync({
  assetId,
  organizationId,
  currentUserId,
  onAnnotationChange,
  onReplyChange,
  onUserPresence,
}: UseAnnotationSyncProps): {
  isConnected: boolean;
  connectedUsers: UserPresenceData[];
  syncAnnotation: (annotation: any) => Promise<void>;
} {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserPresenceData[]>([]);
  
  const supabase = createSupabaseBrowserClient();

  // Update user presence
  const updatePresence = useCallback(async () => {
    try {
      // Update user presence in the asset (table may not exist yet)
      try {
        await supabase
          .from('user_asset_presence')
          .upsert({
            user_id: currentUserId,
            asset_id: assetId,
            organization_id: organizationId,
            last_seen: new Date().toISOString(),
            is_active: true,
          });
      } catch (presenceError) {
        // Ignore if presence table doesn't exist
        console.debug('User presence table not available:', presenceError);
      }
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [supabase, currentUserId, assetId, organizationId]);

  // Set up real-time subscriptions
  useEffect(() => {
    let annotationChannel: RealtimeChannel | null = null;
    let replyChannel: RealtimeChannel | null = null;
    let presenceChannel: RealtimeChannel | null = null;

    const setupSubscriptions = async (): Promise<() => void> => {
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
            async (payload: AnnotationPayload) => {
              if (payload.new && 'created_by' in payload.new && payload.new.created_by !== currentUserId) {
                // Fetch user information for the annotation
                const { data: userInfo } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', payload.new.created_by)
                  .single();

                const annotationData = {
                  ...payload.new,
                  user: userInfo,
                } as unknown as AnnotationData;

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
            async (payload: ReplyPayload) => {
              if (payload.new && 'created_by' in payload.new && payload.new.created_by !== currentUserId) {
                // Fetch user information for the reply
                const { data: userInfo } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', payload.new.created_by)
                  .single();

                const replyData = {
                  ...payload.new,
                  user: userInfo,
                } as unknown as AnnotationReply;

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
            const state = presenceChannel?.presenceState();
            const users = Object.values(state || {}).flat().filter(u => 
              u && typeof u === 'object' && 'user_id' in u && 'user_name' in u && 'last_seen' in u
            ) as unknown as UserPresenceData[];
            setActiveUsers(users);
            onUserPresence?.(users);
          })
          .on('presence', { event: 'join' }, ({ newPresences }: PresenceJoinPayload) => {
            const newUsers = newPresences;
            setActiveUsers(prev => [...prev, ...newUsers]);
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }: PresenceLeavePayload) => {
            const leftUsers = leftPresences;
            setActiveUsers(prev => prev.filter(user => 
              !leftUsers.some(leftUser => leftUser.user_id === user.user_id)
            ));
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track presence
              await presenceChannel?.track({
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
        return () => {}; // Return empty cleanup function
      }
    };

    let cleanupFunction: (() => void) | undefined;
    setupSubscriptions().then((cleanup) => {
      cleanupFunction = cleanup;
    });

    // Cleanup on unmount
    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
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

  // Sync a single annotation (for real-time updates)
  const syncAnnotation = useCallback(async (annotation: any) => {
    try {
      // Broadcast annotation to other users via Supabase real-time
      const { error } = await supabase
        .from('asset_annotations')
        .upsert({
          ...annotation,
          asset_id: assetId,
          organization_id: organizationId,
          created_by: currentUserId,
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error syncing annotation:', error);
      toast({
        title: 'Sync Error',
        description: 'Failed to sync annotation',
        variant: 'destructive',
      });
    }
  }, [assetId, organizationId, currentUserId, supabase, toast]);

  return {
    isConnected,
    connectedUsers: activeUsers,
    syncAnnotation,
  };
}