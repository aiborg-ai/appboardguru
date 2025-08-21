-- Migration: BoardChat System
-- Description: Creates real-time messaging system for BoardMates and vault group communication

-- UP MIGRATION

-- =============================================
-- CHAT CONVERSATIONS SYSTEM
-- =============================================

-- Chat conversations (direct messages or group chats)
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Conversation metadata
    name VARCHAR(100), -- For group chats, null for direct messages
    description TEXT,
    conversation_type VARCHAR(20) NOT NULL CHECK (conversation_type IN ('direct', 'group', 'vault_group')),
    
    -- Vault-specific group chat
    vault_id UUID, -- References vault if this is a vault group chat
    
    -- Privacy and permissions
    is_private BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,
    archived_by UUID REFERENCES auth.users(id),
    
    -- Message settings
    allow_file_sharing BOOLEAN NOT NULL DEFAULT true,
    allow_mentions BOOLEAN NOT NULL DEFAULT true,
    message_retention_days INTEGER DEFAULT 365, -- Auto-delete messages after this many days
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Stats
    total_messages INTEGER NOT NULL DEFAULT 0,
    total_participants INTEGER NOT NULL DEFAULT 0
);

-- Conversation participants (who can access the chat)
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Participant role and permissions
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    can_add_participants BOOLEAN NOT NULL DEFAULT false,
    can_remove_participants BOOLEAN NOT NULL DEFAULT false,
    can_edit_conversation BOOLEAN NOT NULL DEFAULT false,
    can_delete_messages BOOLEAN NOT NULL DEFAULT false,
    
    -- Participation status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'muted', 'left', 'removed')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    
    -- User preferences for this conversation
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    notification_sound BOOLEAN NOT NULL DEFAULT true,
    custom_name VARCHAR(100), -- User can set custom name for the conversation
    
    -- Read status tracking
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_message_id UUID,
    
    -- Metadata
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(conversation_id, user_id)
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (
        message_type IN ('text', 'file', 'image', 'system', 'reply', 'forward')
    ),
    
    -- Reply and threading
    reply_to_message_id UUID REFERENCES chat_messages(id),
    thread_root_id UUID REFERENCES chat_messages(id), -- For threaded conversations
    
    -- File attachments
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(50),
    
    -- Message status
    is_edited BOOLEAN NOT NULL DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES auth.users(id),
    
    -- Delivery and read tracking
    delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_by JSONB DEFAULT '[]', -- Array of user IDs who have read this message
    
    -- Message metadata
    metadata JSONB DEFAULT '{}',
    mentions JSONB DEFAULT '[]', -- Array of mentioned user IDs
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Auto-delete based on retention policy
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Message reactions (emojis)
CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reaction details
    emoji VARCHAR(10) NOT NULL, -- Unicode emoji
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(message_id, user_id, emoji)
);

-- Message delivery status (for important messages)
CREATE TABLE IF NOT EXISTS chat_message_delivery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Delivery tracking
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (
        status IN ('sent', 'delivered', 'read', 'failed')
    ),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(message_id, user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_org ON chat_conversations(organization_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_vault ON chat_conversations(vault_id) WHERE vault_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON chat_conversations(conversation_type, updated_at DESC);

-- Participant indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON chat_participants(conversation_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_chat_participants_unread ON chat_participants(user_id, last_read_at);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_root_id, created_at) WHERE thread_root_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_mentions ON chat_messages USING gin(mentions) WHERE mentions != '[]';

-- Reaction indexes
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_message_reactions(message_id, emoji);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_user ON chat_message_reactions(user_id, created_at DESC);

-- =============================================
-- FUNCTIONS FOR CHAT OPERATIONS
-- =============================================

-- Function to create a direct message conversation
CREATE OR REPLACE FUNCTION create_direct_conversation(
    p_organization_id UUID,
    p_user1_id UUID,
    p_user2_id UUID
) RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    existing_conversation_id UUID;
BEGIN
    -- Check if direct conversation already exists between these users
    SELECT c.id INTO existing_conversation_id
    FROM chat_conversations c
    JOIN chat_participants p1 ON c.id = p1.conversation_id AND p1.user_id = p_user1_id
    JOIN chat_participants p2 ON c.id = p2.conversation_id AND p2.user_id = p_user2_id
    WHERE c.conversation_type = 'direct'
    AND c.organization_id = p_organization_id
    AND p1.status = 'active'
    AND p2.status = 'active'
    LIMIT 1;

    -- Return existing conversation if found
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;

    -- Create new direct conversation
    INSERT INTO chat_conversations (
        organization_id,
        conversation_type,
        created_by,
        total_participants
    ) VALUES (
        p_organization_id,
        'direct',
        p_user1_id,
        2
    ) RETURNING id INTO conversation_id;

    -- Add both participants
    INSERT INTO chat_participants (conversation_id, user_id, role, added_by) VALUES
        (conversation_id, p_user1_id, 'member', p_user1_id),
        (conversation_id, p_user2_id, 'member', p_user1_id);

    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's conversations with unread counts
CREATE OR REPLACE FUNCTION get_user_conversations(p_user_id UUID, p_organization_id UUID)
RETURNS TABLE (
    conversation_id UUID,
    conversation_name VARCHAR(100),
    conversation_type VARCHAR(20),
    vault_id UUID,
    is_private BOOLEAN,
    last_message_content TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT,
    total_participants INTEGER,
    other_participant_name VARCHAR(255), -- For direct messages
    other_participant_avatar VARCHAR(500)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        CASE 
            WHEN c.conversation_type = 'direct' THEN NULL
            ELSE c.name
        END,
        c.conversation_type,
        c.vault_id,
        c.is_private,
        m_last.content,
        c.last_message_at,
        COALESCE(unread.unread_count, 0)::BIGINT,
        c.total_participants,
        CASE 
            WHEN c.conversation_type = 'direct' THEN other_user.full_name
            ELSE NULL
        END,
        CASE 
            WHEN c.conversation_type = 'direct' THEN other_user.avatar_url
            ELSE NULL
        END
    FROM chat_conversations c
    JOIN chat_participants cp ON c.id = cp.conversation_id
    LEFT JOIN LATERAL (
        SELECT content, created_at
        FROM chat_messages m
        WHERE m.conversation_id = c.id
        AND m.is_deleted = false
        ORDER BY m.created_at DESC
        LIMIT 1
    ) m_last ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as unread_count
        FROM chat_messages m
        WHERE m.conversation_id = c.id
        AND m.created_at > cp.last_read_at
        AND m.sender_id != p_user_id
        AND m.is_deleted = false
    ) unread ON true
    LEFT JOIN LATERAL (
        SELECT u.full_name, u.avatar_url
        FROM chat_participants cp2
        JOIN users u ON cp2.user_id = u.id
        WHERE cp2.conversation_id = c.id
        AND cp2.user_id != p_user_id
        AND c.conversation_type = 'direct'
        LIMIT 1
    ) other_user ON c.conversation_type = 'direct'
    WHERE cp.user_id = p_user_id
    AND cp.status = 'active'
    AND c.organization_id = p_organization_id
    AND c.is_archived = false
    ORDER BY c.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
    p_conversation_id UUID,
    p_user_id UUID,
    p_up_to_message_id UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
    latest_message_id UUID;
BEGIN
    -- Get the latest message ID if not provided
    IF p_up_to_message_id IS NULL THEN
        SELECT id INTO latest_message_id
        FROM chat_messages
        WHERE conversation_id = p_conversation_id
        AND is_deleted = false
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        latest_message_id := p_up_to_message_id;
    END IF;

    -- Update participant's last_read_at
    UPDATE chat_participants
    SET 
        last_read_at = NOW(),
        last_read_message_id = latest_message_id,
        updated_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

    -- Update message delivery status
    INSERT INTO chat_message_delivery (message_id, user_id, status, read_at)
    SELECT m.id, p_user_id, 'read', NOW()
    FROM chat_messages m
    WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND m.created_at <= (
        SELECT created_at FROM chat_messages WHERE id = latest_message_id
    )
    ON CONFLICT (message_id, user_id) 
    DO UPDATE SET 
        status = 'read',
        read_at = NOW(),
        updated_at = NOW();

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_chat_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type VARCHAR(20) DEFAULT 'text',
    p_reply_to_message_id UUID DEFAULT NULL,
    p_file_url VARCHAR(500) DEFAULT NULL,
    p_file_name VARCHAR(255) DEFAULT NULL,
    p_file_size INTEGER DEFAULT NULL,
    p_file_type VARCHAR(50) DEFAULT NULL,
    p_mentions JSONB DEFAULT '[]'
) RETURNS UUID AS $$
DECLARE
    message_id UUID;
    participant_count INTEGER;
BEGIN
    -- Verify sender is a participant
    SELECT COUNT(*) INTO participant_count
    FROM chat_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_sender_id
    AND status = 'active';

    IF participant_count = 0 THEN
        RAISE EXCEPTION 'User is not a participant in this conversation';
    END IF;

    -- Insert the message
    INSERT INTO chat_messages (
        conversation_id,
        sender_id,
        content,
        message_type,
        reply_to_message_id,
        file_url,
        file_name,
        file_size,
        file_type,
        mentions
    ) VALUES (
        p_conversation_id,
        p_sender_id,
        p_content,
        p_message_type,
        p_reply_to_message_id,
        p_file_url,
        p_file_name,
        p_file_size,
        p_file_type,
        p_mentions
    ) RETURNING id INTO message_id;

    -- Update conversation last_message_at and total_messages
    UPDATE chat_conversations
    SET 
        last_message_at = NOW(),
        total_messages = total_messages + 1,
        updated_at = NOW()
    WHERE id = p_conversation_id;

    -- Create delivery records for all participants (except sender)
    INSERT INTO chat_message_delivery (message_id, user_id, status)
    SELECT message_id, cp.user_id, 'delivered'
    FROM chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
    AND cp.user_id != p_sender_id
    AND cp.status = 'active';

    RETURN message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all chat tables
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_delivery ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON chat_conversations
    FOR SELECT USING (
        id IN (
            SELECT conversation_id 
            FROM chat_participants 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can create conversations in their organization" ON chat_conversations
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Conversation admins can update conversations" ON chat_conversations
    FOR UPDATE USING (
        id IN (
            SELECT conversation_id 
            FROM chat_participants 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'moderator')
            AND status = 'active'
        )
    );

-- RLS Policies for participants
CREATE POLICY "Users can view participants in their conversations" ON chat_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM chat_participants 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can update their own participation" ON chat_participants
    FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON chat_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT conversation_id 
            FROM chat_participants 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Users can send messages to their conversations" ON chat_messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT conversation_id 
            FROM chat_participants 
            WHERE user_id = auth.uid() AND status = 'active'
        )
        AND sender_id = auth.uid()
    );

CREATE POLICY "Users can edit their own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policies for reactions
CREATE POLICY "Users can view reactions in their conversations" ON chat_message_reactions
    FOR SELECT USING (
        message_id IN (
            SELECT m.id 
            FROM chat_messages m
            JOIN chat_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = auth.uid() AND cp.status = 'active'
        )
    );

CREATE POLICY "Users can manage their own reactions" ON chat_message_reactions
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for delivery tracking
CREATE POLICY "Users can view delivery for their messages" ON chat_message_delivery
    FOR SELECT USING (
        user_id = auth.uid() OR
        message_id IN (
            SELECT id FROM chat_messages WHERE sender_id = auth.uid()
        )
    );

-- =============================================
-- TRIGGERS AND AUTOMATION
-- =============================================

-- Update conversation updated_at when participants change
CREATE OR REPLACE FUNCTION update_conversation_on_participant_change()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations
    SET 
        updated_at = NOW(),
        total_participants = (
            SELECT COUNT(*) 
            FROM chat_participants 
            WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
            AND status = 'active'
        )
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_participant_change
    AFTER INSERT OR UPDATE OR DELETE ON chat_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_participant_change();

-- Auto-delete messages based on retention policy
CREATE OR REPLACE FUNCTION auto_delete_expired_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark messages as deleted based on conversation retention policy
    UPDATE chat_messages
    SET 
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = NULL -- System deletion
    FROM chat_conversations c
    WHERE chat_messages.conversation_id = c.id
    AND c.message_retention_days IS NOT NULL
    AND chat_messages.created_at < NOW() - (c.message_retention_days || ' days')::INTERVAL
    AND chat_messages.is_deleted = false;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Create a sample group conversation for BoardMates
INSERT INTO chat_conversations (
    organization_id,
    name,
    description,
    conversation_type,
    created_by,
    allow_file_sharing,
    allow_mentions
) 
SELECT 
    o.id,
    'BoardMates General',
    'General discussion for all board members',
    'group',
    om.user_id,
    true,
    true
FROM organizations o
JOIN organization_members om ON o.id = om.organization_id
WHERE om.role = 'owner'
AND NOT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE name = 'BoardMates General' 
    AND organization_id = o.id
)
LIMIT 1;

-- Add sample welcome message
INSERT INTO chat_messages (conversation_id, sender_id, content, message_type)
SELECT 
    c.id,
    c.created_by,
    'Welcome to BoardChat! 👋 This is where board members can collaborate and discuss governance matters in real-time.',
    'system'
FROM chat_conversations c
WHERE c.name = 'BoardMates General'
AND NOT EXISTS (
    SELECT 1 FROM chat_messages 
    WHERE conversation_id = c.id
);

-- DOWN MIGRATION

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_update_conversation_on_participant_change ON chat_participants;
DROP FUNCTION IF EXISTS update_conversation_on_participant_change();
DROP FUNCTION IF EXISTS auto_delete_expired_messages();
DROP FUNCTION IF EXISTS send_chat_message(UUID, UUID, TEXT, VARCHAR(20), UUID, VARCHAR(500), VARCHAR(255), INTEGER, VARCHAR(50), JSONB);
DROP FUNCTION IF EXISTS mark_messages_read(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS get_user_conversations(UUID, UUID);
DROP FUNCTION IF EXISTS create_direct_conversation(UUID, UUID, UUID);

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view delivery for their messages" ON chat_message_delivery;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON chat_message_reactions;
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON chat_message_reactions;
DROP POLICY IF EXISTS "Users can edit their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own participation" ON chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Conversation admins can update conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations in their organization" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON chat_conversations;

-- Drop indexes
DROP INDEX IF EXISTS idx_chat_reactions_user;
DROP INDEX IF EXISTS idx_chat_reactions_message;
DROP INDEX IF EXISTS idx_chat_messages_mentions;
DROP INDEX IF EXISTS idx_chat_messages_thread;
DROP INDEX IF EXISTS idx_chat_messages_sender;
DROP INDEX IF EXISTS idx_chat_messages_conversation;
DROP INDEX IF EXISTS idx_chat_participants_unread;
DROP INDEX IF EXISTS idx_chat_participants_conversation;
DROP INDEX IF EXISTS idx_chat_participants_user;
DROP INDEX IF EXISTS idx_chat_conversations_type;
DROP INDEX IF EXISTS idx_chat_conversations_vault;
DROP INDEX IF EXISTS idx_chat_conversations_org;

-- Drop tables
DROP TABLE IF EXISTS chat_message_delivery;
DROP TABLE IF EXISTS chat_message_reactions;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_participants;
DROP TABLE IF EXISTS chat_conversations;