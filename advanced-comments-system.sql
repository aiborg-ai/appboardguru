-- Advanced Commenting System with @mentions and Real-time Features
-- Extends existing annotation system for comprehensive commenting
-- Following CLAUDE.md patterns with security and performance optimization

-- Enhanced comments table with advanced threading and features
CREATE TABLE IF NOT EXISTS enhanced_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core relationships
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Threading support
  parent_comment_id UUID REFERENCES enhanced_comments(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL, -- Root comment ID for efficient querying
  thread_depth INTEGER NOT NULL DEFAULT 0 CHECK (thread_depth >= 0 AND thread_depth <= 10),
  thread_order INTEGER NOT NULL DEFAULT 0, -- For ordering within thread
  
  -- Comment content
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 10000),
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'rich_text')),
  content_html TEXT, -- Rendered HTML for rich content
  
  -- Position and context
  page_number INTEGER,
  position_x NUMERIC CHECK (position_x >= 0 AND position_x <= 1), -- Relative position 0-1
  position_y NUMERIC CHECK (position_y >= 0 AND position_y <= 1),
  selection_text TEXT, -- Text that was selected when commenting
  selection_start INTEGER,
  selection_end INTEGER,
  context_before TEXT, -- Text before selection for context
  context_after TEXT, -- Text after selection for context
  
  -- Comment properties
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_note TEXT,
  
  -- Priority and categorization
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'question', 'suggestion', 'issue', 'approval_required', 'action_item')),
  tags TEXT[] DEFAULT '{}',
  
  -- Real-time collaboration
  is_editing BOOLEAN NOT NULL DEFAULT false,
  editing_started_at TIMESTAMPTZ,
  last_edit_activity TIMESTAMPTZ,
  concurrent_editors UUID[] DEFAULT '{}',
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES enhanced_comments(id),
  edit_summary TEXT,
  
  -- Reactions and engagement
  reaction_counts JSONB DEFAULT '{}', -- {"👍": 5, "👎": 2, "❤️": 3}
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_by JSONB DEFAULT '{}', -- {userId: timestamp}
  
  -- AI and smart features
  ai_summary TEXT,
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  ai_topics TEXT[] DEFAULT '{}',
  ai_action_items TEXT[] DEFAULT '{}',
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete for audit trail
  
  -- Indexes for performance
  INDEX(asset_id, created_at),
  INDEX(thread_id, thread_order),
  INDEX(user_id, created_at),
  INDEX(organization_id, created_at),
  INDEX(is_resolved, priority),
  INDEX(category, created_at)
);

-- @mentions table with advanced features
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES enhanced_comments(id) ON DELETE CASCADE,
  
  -- Mention details
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mention_text TEXT NOT NULL, -- Original @mention text (e.g., "@john.doe")
  mention_display_name TEXT NOT NULL, -- Display name at time of mention
  position_start INTEGER NOT NULL CHECK (position_start >= 0),
  position_end INTEGER NOT NULL CHECK (position_end > position_start),
  
  -- Context
  surrounding_text TEXT, -- Text around the mention for context
  mention_type TEXT DEFAULT 'user' CHECK (mention_type IN ('user', 'role', 'team', 'everyone')),
  
  -- Notification status
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  notification_read BOOLEAN NOT NULL DEFAULT false,
  notification_read_at TIMESTAMPTZ,
  notification_method TEXT[] DEFAULT '{}', -- email, push, in_app
  
  -- Response tracking
  has_responded BOOLEAN NOT NULL DEFAULT false,
  response_comment_id UUID REFERENCES enhanced_comments(id),
  acknowledged_at TIMESTAMPTZ,
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate mentions in same comment
  UNIQUE(comment_id, mentioned_user_id, position_start)
);

-- Comment reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES enhanced_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Reaction details
  reaction_type TEXT NOT NULL, -- Unicode emoji or reaction name
  reaction_category TEXT DEFAULT 'emoji' CHECK (reaction_category IN ('emoji', 'custom', 'vote')),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint - one reaction type per user per comment
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Comment subscriptions for notifications
CREATE TABLE IF NOT EXISTS comment_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Subscription target
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES enhanced_comments(id) ON DELETE CASCADE,
  thread_id UUID, -- Subscribe to entire thread
  
  -- Subscription preferences
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('asset', 'comment', 'thread', 'mentions')),
  notification_frequency TEXT DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'daily', 'weekly', 'disabled')),
  notification_methods TEXT[] DEFAULT '{in_app,email}',
  
  -- Filters
  only_mentions BOOLEAN DEFAULT false,
  only_replies_to_me BOOLEAN DEFAULT false,
  priority_filter TEXT[] DEFAULT '{}', -- Only certain priorities
  category_filter TEXT[] DEFAULT '{}', -- Only certain categories
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure logical consistency
  CHECK (
    (asset_id IS NOT NULL AND comment_id IS NULL) OR
    (asset_id IS NULL AND comment_id IS NOT NULL) OR
    (thread_id IS NOT NULL)
  ),
  
  -- Prevent duplicate subscriptions
  UNIQUE(user_id, asset_id, comment_id, thread_id, subscription_type)
);

-- Comment activity log for real-time updates
CREATE TABLE IF NOT EXISTS comment_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Activity details
  comment_id UUID NOT NULL REFERENCES enhanced_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'updated', 'deleted', 'resolved', 'reopened', 
    'mentioned', 'reacted', 'viewed', 'started_editing', 'stopped_editing'
  )),
  
  -- Activity metadata
  details JSONB DEFAULT '{}',
  previous_value TEXT, -- For tracking changes
  new_value TEXT,
  
  -- Real-time sync
  websocket_event_id UUID,
  broadcast_to_users UUID[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for real-time queries
  INDEX(comment_id, created_at),
  INDEX(user_id, activity_type, created_at),
  INDEX(activity_type, created_at)
);

-- Comment drafts for auto-save functionality
CREATE TABLE IF NOT EXISTS comment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Draft context
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES enhanced_comments(id) ON DELETE CASCADE,
  
  -- Draft content
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  
  -- Position (for new comments)
  page_number INTEGER,
  position_x NUMERIC,
  position_y NUMERIC,
  selection_text TEXT,
  
  -- Mentions in draft
  draft_mentions JSONB DEFAULT '[]', -- Array of mention objects
  
  -- Metadata
  auto_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Unique draft per context
  UNIQUE(user_id, asset_id, parent_comment_id)
);

-- Triggers for maintaining data integrity and real-time updates

-- Update thread_id for new comments
CREATE OR REPLACE FUNCTION set_comment_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set thread_id to root comment (or self if root)
  IF NEW.parent_comment_id IS NULL THEN
    NEW.thread_id = NEW.id;
    NEW.thread_depth = 0;
  ELSE
    -- Find root thread and increment depth
    WITH RECURSIVE thread_path AS (
      SELECT id, parent_comment_id, thread_id, thread_depth, 1 as depth
      FROM enhanced_comments 
      WHERE id = NEW.parent_comment_id
      
      UNION ALL
      
      SELECT c.id, c.parent_comment_id, c.thread_id, c.thread_depth, tp.depth + 1
      FROM enhanced_comments c
      JOIN thread_path tp ON c.id = tp.parent_comment_id
      WHERE tp.parent_comment_id IS NOT NULL
    )
    SELECT thread_id, depth INTO NEW.thread_id, NEW.thread_depth
    FROM thread_path 
    WHERE parent_comment_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_comment_thread_id
  BEFORE INSERT ON enhanced_comments
  FOR EACH ROW
  EXECUTE FUNCTION set_comment_thread_id();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_timestamp
  BEFORE UPDATE ON enhanced_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_timestamp();

-- Log comment activity
CREATE OR REPLACE FUNCTION log_comment_activity()
RETURNS TRIGGER AS $$
DECLARE
  activity_type_val TEXT;
  details_val JSONB;
BEGIN
  -- Determine activity type
  IF TG_OP = 'INSERT' THEN
    activity_type_val = 'created';
    details_val = jsonb_build_object(
      'content_length', length(NEW.content),
      'has_mentions', exists(SELECT 1 FROM comment_mentions WHERE comment_id = NEW.id),
      'category', NEW.category,
      'priority', NEW.priority
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_resolved != NEW.is_resolved THEN
      activity_type_val = CASE WHEN NEW.is_resolved THEN 'resolved' ELSE 'reopened' END;
      details_val = jsonb_build_object('resolved_by', NEW.resolved_by);
    ELSE
      activity_type_val = 'updated';
      details_val = jsonb_build_object(
        'fields_changed', 
        CASE 
          WHEN OLD.content != NEW.content THEN array['content']
          ELSE array[]::text[]
        END
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    activity_type_val = 'deleted';
    details_val = jsonb_build_object('soft_delete', OLD.deleted_at IS NOT NULL);
  END IF;

  -- Insert activity record
  INSERT INTO comment_activity (comment_id, user_id, activity_type, details)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    activity_type_val,
    details_val
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_comment_activity
  AFTER INSERT OR UPDATE OR DELETE ON enhanced_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_activity();

-- RLS Policies for security

-- Enhanced comments policies
ALTER TABLE enhanced_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY enhanced_comments_organization_access ON enhanced_comments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY enhanced_comments_privacy_access ON enhanced_comments
  FOR SELECT USING (
    NOT is_private OR 
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM comment_mentions 
      WHERE comment_id = enhanced_comments.id AND mentioned_user_id = auth.uid()
    )
  );

-- Comment mentions policies
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_mentions_access ON comment_mentions
  FOR ALL USING (
    mentioned_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM enhanced_comments ec
      WHERE ec.id = comment_mentions.comment_id 
      AND ec.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM enhanced_comments ec
      JOIN organization_members om ON ec.organization_id = om.organization_id
      WHERE ec.id = comment_mentions.comment_id 
      AND om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Comment reactions policies
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_reactions_access ON comment_reactions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM enhanced_comments ec
      JOIN organization_members om ON ec.organization_id = om.organization_id
      WHERE ec.id = comment_reactions.comment_id 
      AND om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Subscription policies
ALTER TABLE comment_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_subscriptions_own_access ON comment_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Activity policies
ALTER TABLE comment_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_activity_access ON comment_activity
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM enhanced_comments ec
      JOIN organization_members om ON ec.organization_id = om.organization_id
      WHERE ec.id = comment_activity.comment_id 
      AND om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Draft policies
ALTER TABLE comment_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY comment_drafts_own_access ON comment_drafts
  FOR ALL USING (user_id = auth.uid());

-- Indexes for performance optimization
CREATE INDEX CONCURRENTLY idx_enhanced_comments_thread_performance ON enhanced_comments(thread_id, thread_order, created_at);
CREATE INDEX CONCURRENTLY idx_enhanced_comments_real_time ON enhanced_comments(asset_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_enhanced_comments_user_activity ON enhanced_comments(user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_enhanced_comments_unresolved ON enhanced_comments(asset_id, is_resolved, priority, created_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_enhanced_comments_mentions_lookup ON enhanced_comments(id) WHERE EXISTS (SELECT 1 FROM comment_mentions WHERE comment_id = enhanced_comments.id);

CREATE INDEX CONCURRENTLY idx_comment_mentions_user_notifications ON comment_mentions(mentioned_user_id, notification_read, created_at);
CREATE INDEX CONCURRENTLY idx_comment_mentions_comment_lookup ON comment_mentions(comment_id, mention_type);

CREATE INDEX CONCURRENTLY idx_comment_reactions_aggregation ON comment_reactions(comment_id, reaction_type);
CREATE INDEX CONCURRENTLY idx_comment_reactions_user_activity ON comment_reactions(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_comment_activity_real_time ON comment_activity(comment_id, activity_type, created_at DESC);
CREATE INDEX CONCURRENTLY idx_comment_activity_user_feed ON comment_activity(user_id, created_at DESC);

-- Functions for common queries

-- Get comment thread with all replies
CREATE OR REPLACE FUNCTION get_comment_thread(thread_root_id UUID)
RETURNS TABLE (
  id UUID,
  content TEXT,
  user_name TEXT,
  user_avatar TEXT,
  created_at TIMESTAMPTZ,
  thread_depth INTEGER,
  is_resolved BOOLEAN,
  reaction_counts JSONB,
  mention_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.id,
    ec.content,
    u.full_name as user_name,
    u.avatar_url as user_avatar,
    ec.created_at,
    ec.thread_depth,
    ec.is_resolved,
    ec.reaction_counts,
    COUNT(cm.id) as mention_count
  FROM enhanced_comments ec
  LEFT JOIN users u ON ec.user_id = u.id
  LEFT JOIN comment_mentions cm ON ec.id = cm.comment_id
  WHERE ec.thread_id = thread_root_id 
    AND ec.deleted_at IS NULL
  GROUP BY ec.id, u.full_name, u.avatar_url
  ORDER BY ec.thread_depth, ec.thread_order, ec.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's unread mentions
CREATE OR REPLACE FUNCTION get_user_unread_mentions(user_id_param UUID)
RETURNS TABLE (
  mention_id UUID,
  comment_id UUID,
  comment_content TEXT,
  asset_title TEXT,
  mentioner_name TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id as mention_id,
    cm.comment_id,
    ec.content as comment_content,
    a.title as asset_title,
    u.full_name as mentioner_name,
    cm.created_at
  FROM comment_mentions cm
  JOIN enhanced_comments ec ON cm.comment_id = ec.id
  JOIN assets a ON ec.asset_id = a.id
  JOIN users u ON ec.user_id = u.id
  WHERE cm.mentioned_user_id = user_id_param
    AND cm.notification_read = false
    AND ec.deleted_at IS NULL
  ORDER BY cm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE enhanced_comments IS 'Advanced commenting system with threading, real-time collaboration, and AI features';
COMMENT ON TABLE comment_mentions IS '@mention system with notification tracking and response management';
COMMENT ON TABLE comment_reactions IS 'Emoji reactions and voting system for comments';
COMMENT ON TABLE comment_subscriptions IS 'User subscription preferences for comment notifications';
COMMENT ON TABLE comment_activity IS 'Real-time activity log for comment events and WebSocket synchronization';
COMMENT ON TABLE comment_drafts IS 'Auto-saved comment drafts with expiration and mention detection';

COMMENT ON COLUMN enhanced_comments.thread_id IS 'Root comment ID for efficient thread querying';
COMMENT ON COLUMN enhanced_comments.concurrent_editors IS 'Array of user IDs currently editing this comment';
COMMENT ON COLUMN enhanced_comments.ai_summary IS 'AI-generated summary of comment content and context';
COMMENT ON COLUMN comment_mentions.surrounding_text IS 'Context text around mention for notification clarity';
COMMENT ON COLUMN comment_subscriptions.notification_frequency IS 'How often to send notification digests';
COMMENT ON COLUMN comment_activity.websocket_event_id IS 'Correlation ID for real-time event tracking';