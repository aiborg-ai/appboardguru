/**
 * Real-Time Activity Stream WebSocket Server
 * Provides live activity updates for the analytics dashboard
 */

import { Server as SocketIOServer } from 'socket.io'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { UserActivityEvent } from '@/lib/services/activity-logger'

interface SocketUser {
  userId: string
  organizationIds: string[]
  role: string
}

export class ActivityStreamServer {
  private io: SocketIOServer
  private connectedUsers = new Map<string, SocketUser>()

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      path: '/api/socketio'
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      console.log('🔌 WebSocket connection established:', socket.id)

      // Authenticate user
      socket.on('authenticate', async (token: string) => {
        try {
          const user = await this.authenticateUser(token)
          if (user) {
            this.connectedUsers.set(socket.id, user)
            socket.join(`org:${user.organizationIds.join(':')}`)
            socket.emit('authenticated', { success: true, userId: user.userId })
            
            // Send recent activity for this organization
            const recentActivity = await this.getRecentActivity(user.organizationIds)
            socket.emit('activity:initial', recentActivity)
          } else {
            socket.emit('authenticated', { success: false, error: 'Invalid token' })
            socket.disconnect()
          }
        } catch (error) {
          console.error('Authentication error:', error)
          socket.emit('authenticated', { success: false, error: 'Authentication failed' })
          socket.disconnect()
        }
      })

      // Handle subscription to specific activity types
      socket.on('subscribe:activity-types', (activityTypes: string[]) => {
        const user = this.connectedUsers.get(socket.id)
        if (user) {
          activityTypes.forEach(type => {
            socket.join(`activity:${type}`)
          })
          socket.emit('subscribed', { activityTypes })
        }
      })

      // Handle subscription to specific users/resources
      socket.on('subscribe:user-activity', (targetUserId: string) => {
        const user = this.connectedUsers.get(socket.id)
        if (user && (user.role === 'admin' || user.role === 'owner' || user.userId === targetUserId)) {
          socket.join(`user:${targetUserId}`)
          socket.emit('subscribed', { userId: targetUserId })
        }
      })

      // Handle real-time search queries
      socket.on('search:activity', async (searchQuery: any) => {
        try {
          const user = this.connectedUsers.get(socket.id)
          if (user) {
            const searchResults = await this.searchActivity(searchQuery, user.organizationIds)
            socket.emit('search:results', searchResults)
          }
        } catch (error) {
          socket.emit('search:error', { error: 'Search failed' })
        }
      })

      // Handle analytics requests
      socket.on('analytics:request', async (metricsRequest: any) => {
        try {
          const user = this.connectedUsers.get(socket.id)
          if (user) {
            const analytics = await this.getAnalytics(metricsRequest, user.organizationIds)
            socket.emit('analytics:data', analytics)
          }
        } catch (error) {
          socket.emit('analytics:error', { error: 'Analytics request failed' })
        }
      })

      socket.on('disconnect', () => {
        console.log('🔌 WebSocket disconnected:', socket.id)
        this.connectedUsers.delete(socket.id)
      })
    })
  }

  private async authenticateUser(token: string): Promise<SocketUser | null> {
    try {
      const supabase = await createSupabaseServerClient()
      
      // Verify JWT token
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return null

      // Get user's organizations
      const { data: memberships } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations(id, name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (!memberships?.length) return null

      return {
        userId: user.id,
        organizationIds: memberships.map((m: any) => (m as any)?.organization_id),
        role: (memberships.find((m: any) => (m as any)?.role === 'owner') as any)?.role || 
              (memberships.find((m: any) => (m as any)?.role === 'admin') as any)?.role || 'member'
      }
    } catch (error) {
      console.error('User authentication error:', error)
      return null
    }
  }

  private async getRecentActivity(organizationIds: string[]) {
    try {
      const supabase = await createSupabaseServerClient()
      
      const { data: activities } = await (supabase as any)
        .from('audit_logs')
        .select(`
          id,
          event_type,
          event_category,
          action,
          event_description,
          created_at,
          user_id,
          resource_type,
          resource_id,
          outcome,
          users(full_name, email)
        `)
        .in('organization_id', organizationIds)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(50)

      return activities || []
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      return []
    }
  }

  private async searchActivity(searchQuery: any, organizationIds: string[]) {
    try {
      const supabase = await createSupabaseServerClient()
      
      let query = supabase
        .from('audit_logs')
        .select(`
          id,
          event_type,
          event_category,
          action,
          event_description,
          created_at,
          user_id,
          resource_type,
          resource_id,
          outcome,
          severity,
          details,
          users(full_name, email)
        `)
        .in('organization_id', organizationIds)

      // Apply filters from search query
      if (searchQuery.dateRange) {
        query = query
          .gte('created_at', searchQuery.dateRange.start)
          .lte('created_at', searchQuery.dateRange.end)
      }

      if (searchQuery.activityTypes?.length) {
        query = query.in('event_category', searchQuery.activityTypes)
      }

      if (searchQuery.userIds?.length) {
        query = query.in('user_id', searchQuery.userIds)
      }

      if (searchQuery.textSearch) {
        query = query.ilike('event_description', `%${searchQuery.textSearch}%`)
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(searchQuery.limit || 100)

      return data || []
    } catch (error) {
      console.error('Activity search error:', error)
      return []
    }
  }

  private async getAnalytics(metricsRequest: any, organizationIds: string[]) {
    try {
      const supabase = await createSupabaseServerClient()
      
      // Get analytics data based on request type
      if (metricsRequest.type === 'engagement_scores') {
        const { data } = await (supabase as any).rpc('calculate_user_engagement_score', {
          input_user_id: metricsRequest.userId,
          input_org_id: organizationIds[0], // Primary org
          days_back: metricsRequest.daysBack || 30
        } as any)
        return { engagementScore: data }
      }

      if (metricsRequest.type === 'anomaly_detection') {
        const { data } = await (supabase as any).rpc('detect_activity_anomalies', {
          input_user_id: metricsRequest.userId,
          input_org_id: organizationIds[0]
        } as any)
        return { anomalies: data }
      }

      // Default: return activity summary
      const { data: summary } = await (supabase as any)
        .from('daily_activity_summary')
        .select('*')
        .in('organization_id', organizationIds)
        .gte('activity_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('activity_date', { ascending: false })

      return { activitySummary: summary }
    } catch (error) {
      console.error('Analytics error:', error)
      return { error: 'Analytics request failed' }
    }
  }

  /**
   * Broadcast activity to connected clients
   */
  public broadcastActivity(activity: UserActivityEvent & { id: string; timestamp: string }) {
    // Broadcast to organization rooms
    if (activity.organizationId) {
      this.io.to(`org:${activity.organizationId}`).emit('activity:new', activity)
    }

    // Broadcast to activity type subscribers
    this.io.to(`activity:${activity.activityType}`).emit('activity:new', activity)

    // Broadcast to user subscribers
    if (activity.userId) {
      this.io.to(`user:${activity.userId}`).emit('activity:new', activity)
    }

    // Update real-time analytics
    this.updateRealtimeAnalytics(activity)
  }

  private updateRealtimeAnalytics(activity: UserActivityEvent & { id: string; timestamp: string }) {
    // Send real-time metrics updates
    if (activity.organizationId) {
      this.io.to(`org:${activity.organizationId}`).emit('analytics:update', {
        type: 'activity_count_increment',
        category: activity.activityType,
        timestamp: activity.timestamp,
        userId: activity.userId
      })
    }
  }

  /**
   * Send system-wide alerts
   */
  public broadcastAlert(alert: {
    id: string
    type: 'security' | 'compliance' | 'anomaly' | 'system'
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    message: string
    organizationId?: string
    userId?: string
    metadata?: Record<string, any>
  }) {
    const target = alert.organizationId ? `org:${alert.organizationId}` : 'system'
    this.io.to(target).emit('alert:new', alert)
  }

  /**
   * Get connected users count for monitoring
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  /**
   * Get organization activity stats
   */
  public getOrganizationStats(organizationId: string) {
    const orgUsers = Array.from(this.connectedUsers.values())
      .filter(user => user.organizationIds.includes(organizationId))
    
    return {
      connectedUsers: orgUsers.length,
      adminUsers: orgUsers.filter(u => u.role === 'admin' || u.role === 'owner').length,
      lastActivity: new Date().toISOString()
    }
  }
}

// Singleton instance
let activityStreamServer: ActivityStreamServer | null = null

export function getActivityStreamServer(server?: any): ActivityStreamServer {
  if (!activityStreamServer && server) {
    activityStreamServer = new ActivityStreamServer(server)
  }
  return activityStreamServer!
}

export function broadcastActivityEvent(activity: UserActivityEvent & { id: string; timestamp: string }) {
  if (activityStreamServer) {
    activityStreamServer.broadcastActivity(activity)
  }
}

export function broadcastSystemAlert(alert: Parameters<ActivityStreamServer['broadcastAlert']>[0]) {
  if (activityStreamServer) {
    activityStreamServer.broadcastAlert(alert)
  }
}