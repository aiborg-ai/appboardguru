/**
 * Organizations WebSocket Subscription API Endpoint
 * Handles real-time organization data subscriptions via WebSocket
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { WebSocketService } from '@/lib/services/websocket.service'
import { WebSocketRepository } from '@/lib/repositories/websocket.repository'
import type { OrganizationEvent, OrganizationSubscription } from '@/lib/websocket/organizationChannel'
import type { UserId, OrganizationId } from '@/types/database'
import type { WebSocketMessage, RoomId, SocketId } from '@/types/websocket'
import { createRoomId, createSocketId } from '@/types/websocket'
import { nanoid } from 'nanoid'

// In-memory storage for active subscriptions (in production, use Redis)
const activeSubscriptions = new Map<string, {
  subscription: OrganizationSubscription
  lastActivity: number
  messageQueue: OrganizationEvent[]
}>()

// WebSocket connection tracking
const connections = new Map<SocketId, {
  userId: UserId
  organizationIds: OrganizationId[]
  subscriptionId: string
  connectedAt: number
}>()

/**
 * GET - Get subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    const subscription = activeSubscriptions.get(subscriptionId)
    
    return NextResponse.json({
      success: true,
      data: {
        isActive: !!subscription,
        lastActivity: subscription?.lastActivity || null,
        queuedMessages: subscription?.messageQueue.length || 0
      }
    })

  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST - Create new subscription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { organizationIds, eventTypes, enablePresence, socketId } = body

    if (!organizationIds || !Array.isArray(organizationIds) || organizationIds.length === 0) {
      return NextResponse.json(
        { error: 'Organization IDs required' },
        { status: 400 }
      )
    }

    // Validate user has access to organizations
    const { data: userOrgs, error: orgsError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .in('organization_id', organizationIds)

    if (orgsError) {
      return NextResponse.json(
        { error: 'Failed to validate organization access' },
        { status: 500 }
      )
    }

    const accessibleOrgIds = userOrgs?.map(org => org.organization_id) || []
    const validOrgIds = organizationIds.filter(id => accessibleOrgIds.includes(id))

    if (validOrgIds.length === 0) {
      return NextResponse.json(
        { error: 'No accessible organizations found' },
        { status: 403 }
      )
    }

    // Create subscription
    const subscriptionId = nanoid()
    const roomId = createRoomId(`org_sub_${subscriptionId}`)
    
    const subscription: OrganizationSubscription = {
      id: subscriptionId,
      userId: user.id as UserId,
      organizationIds: validOrgIds,
      eventTypes: eventTypes || [
        'organization_created',
        'organization_updated',
        'organization_deleted',
        'member_added',
        'member_removed',
        'member_role_changed',
        'activity_updated',
        'status_changed'
      ],
      roomId,
      isActive: true,
      lastActivity: new Date().toISOString(),
      connectionStatus: 'connected',
      retryCount: 0,
      autoRefreshInterval: 30000
    }

    // Store subscription
    activeSubscriptions.set(subscriptionId, {
      subscription,
      lastActivity: Date.now(),
      messageQueue: []
    })

    // Track connection if socketId provided
    if (socketId) {
      connections.set(socketId as SocketId, {
        userId: user.id as UserId,
        organizationIds: validOrgIds,
        subscriptionId,
        connectedAt: Date.now()
      })
    }

    // Set up database change listeners for each organization
    await Promise.all(validOrgIds.map(async (orgId) => {
      await setupOrganizationListener(orgId, subscriptionId, supabase)
    }))

    console.log(`Organization subscription created: ${subscriptionId} for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId,
        roomId,
        organizationIds: validOrgIds,
        eventTypes: subscription.eventTypes
      }
    })

  } catch (error) {
    console.error('Create subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update existing subscription
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { subscriptionId, organizationIds, eventTypes, autoRefreshInterval } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    const existingSubscription = activeSubscriptions.get(subscriptionId)
    if (!existingSubscription || existingSubscription.subscription.userId !== user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Update subscription
    const updatedSubscription: OrganizationSubscription = {
      ...existingSubscription.subscription,
      organizationIds: organizationIds || existingSubscription.subscription.organizationIds,
      eventTypes: eventTypes || existingSubscription.subscription.eventTypes,
      autoRefreshInterval: autoRefreshInterval || existingSubscription.subscription.autoRefreshInterval,
      lastActivity: new Date().toISOString()
    }

    activeSubscriptions.set(subscriptionId, {
      ...existingSubscription,
      subscription: updatedSubscription,
      lastActivity: Date.now()
    })

    console.log(`Organization subscription updated: ${subscriptionId}`)

    return NextResponse.json({
      success: true,
      data: updatedSubscription
    })

  } catch (error) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove subscription
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')
    const socketId = searchParams.get('socketId')

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    // Remove subscription
    const removed = activeSubscriptions.delete(subscriptionId)
    
    // Remove connection tracking
    if (socketId) {
      connections.delete(socketId as SocketId)
    }

    // Remove database listeners
    await cleanupOrganizationListeners(subscriptionId)

    console.log(`Organization subscription removed: ${subscriptionId}`)

    return NextResponse.json({
      success: true,
      data: { removed }
    })

  } catch (error) {
    console.error('Delete subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Set up real-time database listeners for organization changes
 */
async function setupOrganizationListener(
  organizationId: OrganizationId, 
  subscriptionId: string, 
  supabase: any
) {
  try {
    // Listen for organization table changes
    const orgChannel = supabase
      .channel(`org_${organizationId}_${subscriptionId}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${organizationId}`
        },
        (payload: any) => {
          handleOrganizationChange(subscriptionId, organizationId, 'organization', payload)
        }
      )
      .on('postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload: any) => {
          handleOrganizationChange(subscriptionId, organizationId, 'member', payload)
        }
      )
      .subscribe()

    return orgChannel

  } catch (error) {
    console.error('Failed to set up organization listener:', error)
  }
}

/**
 * Handle database changes and broadcast to subscribers
 */
async function handleOrganizationChange(
  subscriptionId: string,
  organizationId: OrganizationId,
  changeType: 'organization' | 'member',
  payload: any
) {
  try {
    const subscription = activeSubscriptions.get(subscriptionId)
    if (!subscription) return

    let eventType: OrganizationEvent['type']
    let eventData: any = payload.new || payload.old || {}

    // Determine event type based on change
    switch (payload.eventType) {
      case 'INSERT':
        eventType = changeType === 'organization' ? 'organization_created' : 'member_added'
        break
      case 'UPDATE':
        if (changeType === 'organization') {
          eventType = 'organization_updated'
        } else {
          // Check if role changed
          if (payload.old?.role !== payload.new?.role) {
            eventType = 'member_role_changed'
          } else {
            eventType = 'member_added' // Generic member update
          }
        }
        break
      case 'DELETE':
        eventType = changeType === 'organization' ? 'organization_deleted' : 'member_removed'
        eventData = payload.old
        break
      default:
        return
    }

    // Create organization event
    const event: OrganizationEvent = {
      id: nanoid(),
      type: eventType,
      organizationId,
      userId: eventData.user_id || eventData.created_by,
      timestamp: new Date().toISOString(),
      data: eventData,
      metadata: {
        priority: 'normal',
        persistent: false,
        source: 'api'
      }
    }

    // Add to message queue
    subscription.messageQueue.push(event)
    subscription.lastActivity = Date.now()

    // Broadcast to connected clients (this would typically use WebSocket server)
    await broadcastEvent(subscriptionId, event)

    console.log(`Organization event broadcasted: ${eventType} for org ${organizationId}`)

  } catch (error) {
    console.error('Failed to handle organization change:', error)
  }
}

/**
 * Broadcast event to all connected clients for a subscription
 */
async function broadcastEvent(subscriptionId: string, event: OrganizationEvent) {
  try {
    // In a real implementation, this would use WebSocket server to broadcast
    // For now, we'll just log and store for polling
    
    const subscription = activeSubscriptions.get(subscriptionId)
    if (!subscription) return

    // Find connections for this subscription
    const subscriptionConnections = Array.from(connections.entries())
      .filter(([_, conn]) => conn.subscriptionId === subscriptionId)
      .map(([socketId, _]) => socketId)

    console.log(`Broadcasting event to ${subscriptionConnections.length} connections:`, {
      subscriptionId,
      eventType: event.type,
      organizationId: event.organizationId,
      connections: subscriptionConnections.length
    })

    // Here you would send via WebSocket to each connection
    // For demonstration, we're just updating the message queue

  } catch (error) {
    console.error('Failed to broadcast event:', error)
  }
}

/**
 * Clean up database listeners for a subscription
 */
async function cleanupOrganizationListeners(subscriptionId: string) {
  try {
    // In a real implementation, this would clean up Supabase real-time subscriptions
    console.log(`Cleaning up listeners for subscription: ${subscriptionId}`)
  } catch (error) {
    console.error('Failed to cleanup listeners:', error)
  }
}

/**
 * Periodic cleanup of inactive subscriptions
 */
setInterval(() => {
  const now = Date.now()
  const inactiveThreshold = 5 * 60 * 1000 // 5 minutes

  for (const [subscriptionId, subscription] of activeSubscriptions.entries()) {
    if (now - subscription.lastActivity > inactiveThreshold) {
      activeSubscriptions.delete(subscriptionId)
      cleanupOrganizationListeners(subscriptionId)
      console.log(`Cleaned up inactive subscription: ${subscriptionId}`)
    }
  }
}, 60000) // Run every minute

/**
 * GET recent events for a subscription (polling fallback)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const subscriptionId = searchParams.get('subscriptionId')
    const since = searchParams.get('since') // timestamp

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    const subscription = activeSubscriptions.get(subscriptionId)
    if (!subscription || subscription.subscription.userId !== user.id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Filter events since timestamp
    let events = subscription.messageQueue
    if (since) {
      const sinceTime = new Date(since).getTime()
      events = events.filter(event => new Date(event.timestamp).getTime() > sinceTime)
    }

    // Update activity
    subscription.lastActivity = Date.now()

    return NextResponse.json({
      success: true,
      data: {
        events,
        hasMore: false,
        subscription: subscription.subscription
      }
    })

  } catch (error) {
    console.error('Get events error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}