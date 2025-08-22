import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  message_type: z.enum(['text', 'file', 'image', 'reply']).default('text'),
  reply_to_message_id: z.string().uuid().optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().max(255).optional(),
  file_size: z.number().int().positive().optional(),
  file_type: z.string().max(50).optional(),
  mentions: z.array(z.string().uuid()).default([])
})

/**
 * GET /api/boardchat/conversations/[id]/messages
 * 
 * Returns messages for a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // TODO: Implement pagination with limit, before, after parameters

    // Verify user is a participant in this conversation
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('role, status, last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Sample messages data (in real implementation, query chat_messages table)
    const sampleMessages = [
      {
        id: '1',
        conversation_id: conversationId,
        sender_id: '2',
        sender_name: 'John Director',
        sender_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
        content: 'Welcome to BoardChat! 👋 This is where board members can collaborate and discuss governance matters in real-time.',
        message_type: 'system',
        reply_to_message_id: null,
        file_url: null,
        file_name: null,
        is_edited: false,
        is_deleted: false,
        delivered_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        read_by: [user.id, '2', '3'],
        mentions: [],
        reactions: [
          { emoji: '👋', count: 3, users: ['2', '3', '4'] },
          { emoji: '🎉', count: 1, users: ['5'] }
        ],
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        conversation_id: conversationId,
        sender_id: '3',
        sender_name: 'Sarah CFO',
        sender_avatar: 'https://images.unsplash.com/photo-1494790108755-2616c36d37d3?w=32&h=32&fit=crop&crop=face',
        content: 'Great to have this communication channel! Looking forward to more efficient board discussions.',
        message_type: 'text',
        reply_to_message_id: null,
        file_url: null,
        file_name: null,
        is_edited: false,
        is_deleted: false,
        delivered_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        read_by: ['2', '3'],
        mentions: [],
        reactions: [
          { emoji: '👍', count: 2, users: ['2', '4'] }
        ],
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        conversation_id: conversationId,
        sender_id: '4',
        sender_name: 'Mike Secretary',
        sender_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
        content: 'I\'ve uploaded the agenda for next week\'s board meeting. Please review before our discussion.',
        message_type: 'file',
        reply_to_message_id: null,
        file_url: '/api/files/board-agenda-q3-2025.pdf',
        file_name: 'Board Agenda Q3 2025.pdf',
        is_edited: false,
        is_deleted: false,
        delivered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read_by: ['4'],
        mentions: [],
        reactions: [],
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        conversation_id: conversationId,
        sender_id: '2',
        sender_name: 'John Director',
        sender_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
        content: 'Thanks Mike! I\'ll review this today. @Sarah, can you also take a look at the financial sections?',
        message_type: 'text',
        reply_to_message_id: '3',
        file_url: null,
        file_name: null,
        is_edited: false,
        is_deleted: false,
        delivered_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        read_by: ['2'],
        mentions: ['3'], // Sarah's user ID
        reactions: [],
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ]

    // In real implementation:
    /*
    let query = supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users!sender_id(id, full_name, avatar_url),
        reply_to:chat_messages!reply_to_message_id(id, content, sender:users!sender_id(full_name)),
        reactions:chat_message_reactions(emoji, user_id, users(full_name))
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      query = query.lt('created_at', before)
    }
    if (after) {
      query = query.gt('created_at', after)
    }

    const { data: messages, error } = await query
    */

    // Mark messages as read
    // await supabase.rpc('mark_messages_read', {
    //   p_conversation_id: conversationId,
    //   p_user_id: user.id
    // })

    const response = {
      messages: sampleMessages.reverse(), // Oldest first for display
      conversation_id: conversationId,
      participant_role: (participant as any)?.role,
      has_more: false, // For pagination
      fetched_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/boardchat/conversations/[id]/messages
 * 
 * Send a new message to the conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = sendMessageSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid message data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const messageData = validation.data

    // Verify user is a participant
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('role, status')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!participant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // In real implementation, use the send_chat_message function:
    /*
    const { data: messageId, error: sendError } = await supabase
      .rpc('send_chat_message', {
        p_conversation_id: conversationId,
        p_sender_id: user.id,
        p_content: messageData.content,
        p_message_type: messageData.message_type,
        p_reply_to_message_id: messageData.reply_to_message_id,
        p_file_url: messageData.file_url,
        p_file_name: messageData.file_name,
        p_file_size: messageData.file_size,
        p_file_type: messageData.file_type,
        p_mentions: JSON.stringify(messageData.mentions)
      })

    if (sendError) {
      console.error('Message send error:', sendError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
    */

    // For now, return a mock success response
    const message = {
      id: Math.random().toString(36).substr(2, 9),
      conversation_id: conversationId,
      sender_id: user.id,
      content: messageData.content,
      message_type: messageData.message_type,
      reply_to_message_id: messageData.reply_to_message_id,
      file_url: messageData.file_url,
      file_name: messageData.file_name,
      file_size: messageData.file_size,
      file_type: messageData.file_type,
      mentions: messageData.mentions,
      is_edited: false,
      is_deleted: false,
      delivered_at: new Date().toISOString(),
      read_by: [user.id],
      reactions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    return NextResponse.json({ message }, { status: 201 })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}