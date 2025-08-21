import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const createConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  conversation_type: z.enum(['direct', 'group', 'vault_group']),
  vault_id: z.string().uuid().optional(),
  participant_ids: z.array(z.string().uuid()).min(1),
  is_private: z.boolean().default(false)
})

/**
 * GET /api/boardchat/conversations
 * 
 * Returns all conversations for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's primary organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get conversations using the database function (when implemented)
    // For now, return sample data
    const sampleConversations = [
      {
        id: '1',
        name: 'BoardMates General',
        conversation_type: 'group',
        vault_id: null,
        is_private: false,
        last_message_content: 'Welcome to BoardChat! 👋 This is where board members can collaborate...',
        last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        unread_count: 2,
        total_participants: 5,
        other_participant_name: null,
        other_participant_avatar: null,
        participants: [
          { id: user.id, name: 'You', role: 'member' },
          { id: '2', name: 'John Director', role: 'admin' },
          { id: '3', name: 'Sarah CFO', role: 'member' },
          { id: '4', name: 'Mike Secretary', role: 'member' },
          { id: '5', name: 'Lisa Advisor', role: 'member' }
        ]
      },
      {
        id: '2',
        name: null, // Direct message
        conversation_type: 'direct',
        vault_id: null,
        is_private: true,
        last_message_content: 'Can you review the Q3 financial projections?',
        last_message_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        unread_count: 1,
        total_participants: 2,
        other_participant_name: 'John Director',
        other_participant_avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
        participants: [
          { id: user.id, name: 'You', role: 'member' },
          { id: '2', name: 'John Director', role: 'member' }
        ]
      },
      {
        id: '3',
        name: 'Q3 Strategy Vault',
        conversation_type: 'vault_group',
        vault_id: 'vault-1',
        is_private: true,
        last_message_content: 'Updated the strategic initiatives document',
        last_message_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        unread_count: 0,
        total_participants: 3,
        other_participant_name: null,
        other_participant_avatar: null,
        participants: [
          { id: user.id, name: 'You', role: 'member' },
          { id: '2', name: 'John Director', role: 'admin' },
          { id: '3', name: 'Sarah CFO', role: 'member' }
        ]
      }
    ]

    // Calculate total unread messages
    const totalUnread = sampleConversations.reduce((sum, conv) => sum + conv.unread_count, 0)

    const response = {
      conversations: sampleConversations,
      total_unread: totalUnread,
      organization_id: userOrg.organization_id,
      user_id: user.id,
      fetched_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Conversations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/boardchat/conversations
 * 
 * Create a new conversation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createConversationSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { 
      name, 
      description, 
      conversation_type, 
      vault_id, 
      participant_ids, 
      is_private 
    } = validation.data

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('status', 'active')
      .single()

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Validate participants are in the same organization
    const { data: validParticipants, error: participantsError } = await supabase
      .from('organization_members')
      .select('user_id, users(id, full_name, avatar_url)')
      .eq('organization_id', userOrg.organization_id)
      .in('user_id', participant_ids)
      .eq('status', 'active')

    if (participantsError || !validParticipants || validParticipants.length !== participant_ids.length) {
      return NextResponse.json(
        { error: 'Some participants are not valid organization members' },
        { status: 400 }
      )
    }

    // For direct messages, use the database function
    if (conversation_type === 'direct' && participant_ids.length === 1) {
      const otherUserId = participant_ids[0]
      
      // Call create_direct_conversation function
      const { data: conversationId, error: createError } = await supabase
        .rpc('create_direct_conversation', {
          p_organization_id: userOrg.organization_id,
          p_user1_id: user.id,
          p_user2_id: otherUserId
        })

      if (createError) {
        console.error('Direct conversation creation error:', createError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      return NextResponse.json({ 
        conversation_id: conversationId,
        type: 'direct',
        participants: validParticipants
      }, { status: 201 })
    }

    // For group conversations, create manually
    const { data: conversation, error: conversationError } = await supabase
      .from('chat_conversations')
      .insert({
        organization_id: userOrg.organization_id,
        name,
        description,
        conversation_type,
        vault_id,
        is_private,
        created_by: user.id,
        total_participants: participant_ids.length + 1 // Include creator
      })
      .select()
      .single()

    if (conversationError) {
      console.error('Conversation creation error:', conversationError)
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Add participants
    const participantInserts = [
      // Add creator as admin
      {
        conversation_id: conversation.id,
        user_id: user.id,
        role: 'admin',
        can_add_participants: true,
        can_remove_participants: true,
        can_edit_conversation: true
      },
      // Add other participants as members
      ...participant_ids.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: 'member',
        added_by: user.id
      }))
    ]

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participantInserts)

    if (participantsError) {
      console.error('Participants creation error:', participantsError)
      // Try to clean up conversation
      await supabase.from('chat_conversations').delete().eq('id', conversation.id)
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 })
    }

    return NextResponse.json({
      conversation,
      participants: validParticipants
    }, { status: 201 })

  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}