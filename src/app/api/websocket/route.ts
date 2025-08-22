/**
 * WebSocket API Route
 * Next.js API route for WebSocket server integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerRepositoryFactory } from '../../../lib/repositories'
import { WebSocketService } from '../../../lib/services/websocket.service'
import type { WebSocketConfig } from '../../../types/websocket'
import { createSocketId, createRoomId } from '../../../types/websocket'
import type { UserId, OrganizationId } from '../../../types/database'
import { nanoid } from 'nanoid'

// WebSocket configuration
const wsConfig: WebSocketConfig = {
  url: process.env.WS_URL || 'ws://localhost:3001',
  heartbeatInterval: 30000,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  maxMessageSize: 1024 * 1024, // 1MB
  compression: true,
  authentication: {
    type: 'jwt',
    refreshThreshold: 300000
  },
  rooms: {
    maxParticipants: 100,
    defaultPermissions: {
      canView: [],
      canEdit: [],
      canComment: [],
      canModerate: [],
      publicAccess: true
    },
    sessionRecording: false
  },
  rateLimit: {
    messagesPerSecond: 10,
    burstLimit: 50,
    windowMs: 60000
  }
}

// Global WebSocket service instance
let wsService: WebSocketService | null = null

async function getWebSocketService(): Promise<WebSocketService> {
  if (!wsService) {
    const repositoryFactory = await createServerRepositoryFactory()
    wsService = new WebSocketService(repositoryFactory['monitoredClient'], wsConfig)
  }
  return wsService
}

/**
 * Handle WebSocket connection requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, socketId, userId, organizationId, roomId, message } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const service = await getWebSocketService()

    switch (action) {
      case 'connect':
        if (!socketId || !userId || !organizationId) {
          return NextResponse.json(
            { error: 'socketId, userId, and organizationId are required for connection' },
            { status: 400 }
          )
        }

        await service.handleConnection(
          createSocketId(socketId),
          userId as UserId,
          organizationId as OrganizationId
        )

        return NextResponse.json({ 
          success: true, 
          message: 'Connected successfully' 
        })

      case 'disconnect':
        if (!socketId) {
          return NextResponse.json(
            { error: 'socketId is required for disconnection' },
            { status: 400 }
          )
        }

        await service.handleDisconnection(createSocketId(socketId))

        return NextResponse.json({ 
          success: true, 
          message: 'Disconnected successfully' 
        })

      case 'join_room':
        if (!socketId || !roomId) {
          return NextResponse.json(
            { error: 'socketId and roomId are required to join room' },
            { status: 400 }
          )
        }

        await service.joinRoom(
          createSocketId(socketId),
          createRoomId(roomId)
        )

        return NextResponse.json({ 
          success: true, 
          message: 'Joined room successfully' 
        })

      case 'leave_room':
        if (!socketId || !roomId) {
          return NextResponse.json(
            { error: 'socketId and roomId are required to leave room' },
            { status: 400 }
          )
        }

        await service.leaveRoom(
          createSocketId(socketId),
          createRoomId(roomId)
        )

        return NextResponse.json({ 
          success: true, 
          message: 'Left room successfully' 
        })

      case 'send_message':
        if (!roomId || !message) {
          return NextResponse.json(
            { error: 'roomId and message are required to send message' },
            { status: 400 }
          )
        }

        await service.broadcastToRoom(
          createRoomId(roomId),
          {
            id: nanoid(),
            type: message.type,
            roomId: createRoomId(roomId),
            userId: userId as UserId,
            timestamp: new Date().toISOString(),
            data: message.data,
            metadata: message.metadata
          }
        )

        return NextResponse.json({ 
          success: true, 
          message: 'Message sent successfully' 
        })

      case 'get_presence':
        if (!roomId) {
          return NextResponse.json(
            { error: 'roomId is required to get room presence' },
            { status: 400 }
          )
        }

        const presence = await service.getRoomPresence(createRoomId(roomId))

        return NextResponse.json({ 
          success: true, 
          presence 
        })

      case 'update_presence':
        if (!userId || !body.status) {
          return NextResponse.json(
            { error: 'userId and status are required to update presence' },
            { status: 400 }
          )
        }

        await service.updateUserPresenceStatus(
          userId as UserId,
          body.status
        )

        return NextResponse.json({ 
          success: true, 
          message: 'Presence updated successfully' 
        })

      case 'get_metrics':
        const metrics = service.getMetrics()

        return NextResponse.json({ 
          success: true, 
          metrics 
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('WebSocket API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle WebSocket status requests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    const service = await getWebSocketService()

    switch (action) {
      case 'metrics':
        const metrics = service.getMetrics()
        return NextResponse.json({ success: true, metrics })

      case 'health':
        return NextResponse.json({ 
          success: true, 
          status: 'healthy',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({ 
          success: true,
          status: 'WebSocket API is running',
          actions: [
            'POST /api/websocket - Handle WebSocket operations',
            'GET /api/websocket?action=metrics - Get metrics',
            'GET /api/websocket?action=health - Health check'
          ]
        })
    }

  } catch (error) {
    console.error('WebSocket API GET error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}