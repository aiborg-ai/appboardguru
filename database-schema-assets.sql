-- Assets Management Database Schema
-- Comprehensive schema for document upload, management, and sharing with BoardMates

-- Assets table for storing document metadata
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(500) NOT NULL,
  original_file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  mime_type VARCHAR(200) NOT NULL,
  storage_bucket VARCHAR(100) DEFAULT 'assets',
  
  -- Categorization and organization
  category VARCHAR(100) DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  folder_path TEXT DEFAULT '/',
  
  -- Asset metadata
  thumbnail_url TEXT,
  preview_url TEXT,
  is_processed BOOLEAN DEFAULT FALSE,
  processing_status VARCHAR(50) DEFAULT 'pending',
  processing_error TEXT,
  
  -- Access and security
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Asset sharing permissions table
CREATE TABLE asset_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission levels
  permission_level VARCHAR(20) DEFAULT 'view' CHECK (permission_level IN ('view', 'download', 'edit', 'admin')),
  
  -- Sharing details
  share_message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Access tracking
  accessed_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate shares
  UNIQUE(asset_id, shared_with_user_id)
);

-- Asset folders for organization
CREATE TABLE asset_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_folder_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL,
  
  -- Folder metadata
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for folder icon
  is_shared BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent circular references and ensure unique paths per user
  UNIQUE(owner_id, folder_path),
  CHECK (id != parent_folder_id)
);

-- Asset tags for better organization
CREATE TABLE asset_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6B7280',
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(name, created_by_user_id)
);

-- Asset comments for collaboration
CREATE TABLE asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES asset_comments(id) ON DELETE CASCADE,
  
  -- Comment metadata
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CHECK (id != parent_comment_id)
);

-- Asset activity log for audit trail
CREATE TABLE asset_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type VARCHAR(50) NOT NULL, -- upload, download, share, view, edit, delete, etc.
  activity_details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared links for external sharing (optional future feature)
CREATE TABLE asset_shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token VARCHAR(100) UNIQUE NOT NULL,
  
  -- Link settings
  password_hash TEXT,
  max_downloads INTEGER,
  download_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Access control
  allow_download BOOLEAN DEFAULT TRUE,
  allow_preview BOOLEAN DEFAULT TRUE,
  require_email BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_assets_owner_id ON assets(owner_id);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX idx_assets_file_type ON assets(file_type);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_visibility ON assets(visibility);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_assets_folder_path ON assets(folder_path);
CREATE INDEX idx_assets_is_deleted ON assets(is_deleted) WHERE is_deleted = FALSE;

CREATE INDEX idx_asset_shares_asset_id ON asset_shares(asset_id);
CREATE INDEX idx_asset_shares_shared_with ON asset_shares(shared_with_user_id);
CREATE INDEX idx_asset_shares_active ON asset_shares(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_asset_folders_owner_id ON asset_folders(owner_id);
CREATE INDEX idx_asset_folders_parent ON asset_folders(parent_folder_id);
CREATE INDEX idx_asset_folders_path ON asset_folders(folder_path);

CREATE INDEX idx_asset_comments_asset_id ON asset_comments(asset_id);
CREATE INDEX idx_asset_comments_created_at ON asset_comments(created_at DESC);

CREATE INDEX idx_asset_activity_log_asset_id ON asset_activity_log(asset_id);
CREATE INDEX idx_asset_activity_log_user_id ON asset_activity_log(user_id);
CREATE INDEX idx_asset_activity_log_created_at ON asset_activity_log(created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_shared_links ENABLE ROW LEVEL SECURITY;

-- Policies for assets table
CREATE POLICY "Users can view their own assets" ON assets
  FOR SELECT USING (owner_id = auth.uid() AND is_deleted = FALSE);

CREATE POLICY "Users can view shared assets" ON assets
  FOR SELECT USING (
    is_deleted = FALSE AND (
      owner_id = auth.uid() OR
      id IN (
        SELECT asset_id FROM asset_shares 
        WHERE shared_with_user_id = auth.uid() 
        AND is_active = TRUE 
        AND (expires_at IS NULL OR expires_at > NOW())
      )
    )
  );

CREATE POLICY "Users can create their own assets" ON assets
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own assets" ON assets
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own assets" ON assets
  FOR DELETE USING (owner_id = auth.uid());

-- Policies for asset_shares table
CREATE POLICY "Users can view shares for their assets" ON asset_shares
  FOR SELECT USING (
    shared_by_user_id = auth.uid() OR 
    shared_with_user_id = auth.uid()
  );

CREATE POLICY "Asset owners can create shares" ON asset_shares
  FOR INSERT WITH CHECK (
    shared_by_user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM assets 
      WHERE id = asset_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Asset owners can update their shares" ON asset_shares
  FOR UPDATE USING (shared_by_user_id = auth.uid());

CREATE POLICY "Asset owners can delete their shares" ON asset_shares
  FOR DELETE USING (shared_by_user_id = auth.uid());

-- Policies for asset_folders table
CREATE POLICY "Users can manage their own folders" ON asset_folders
  FOR ALL USING (owner_id = auth.uid());

-- Policies for asset_tags table  
CREATE POLICY "Users can manage their own tags" ON asset_tags
  FOR ALL USING (created_by_user_id = auth.uid());

-- Policies for asset_comments table
CREATE POLICY "Users can view comments on accessible assets" ON asset_comments
  FOR SELECT USING (
    asset_id IN (
      SELECT id FROM assets 
      WHERE (owner_id = auth.uid() AND is_deleted = FALSE) OR
      id IN (
        SELECT asset_id FROM asset_shares 
        WHERE shared_with_user_id = auth.uid() AND is_active = TRUE
      )
    )
  );

CREATE POLICY "Users can create comments on accessible assets" ON asset_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    asset_id IN (
      SELECT id FROM assets 
      WHERE (owner_id = auth.uid() AND is_deleted = FALSE) OR
      id IN (
        SELECT asset_id FROM asset_shares 
        WHERE shared_with_user_id = auth.uid() AND is_active = TRUE
      )
    )
  );

CREATE POLICY "Users can update their own comments" ON asset_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON asset_comments
  FOR DELETE USING (user_id = auth.uid());

-- Policies for asset_activity_log table
CREATE POLICY "Users can view activity for their assets" ON asset_activity_log
  FOR SELECT USING (
    user_id = auth.uid() OR
    asset_id IN (
      SELECT id FROM assets WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "System can log all activities" ON asset_activity_log
  FOR INSERT WITH CHECK (true);

-- Policies for asset_shared_links table
CREATE POLICY "Users can manage shared links for their assets" ON asset_shared_links
  FOR ALL USING (created_by_user_id = auth.uid());

-- Trigger functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();

CREATE OR REPLACE FUNCTION update_asset_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_asset_shares_updated_at
  BEFORE UPDATE ON asset_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_shares_updated_at();

-- Function to log asset activities
CREATE OR REPLACE FUNCTION log_asset_activity(
  p_asset_id UUID,
  p_user_id UUID,
  p_activity_type VARCHAR,
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO asset_activity_log (
    asset_id, user_id, activity_type, activity_details, ip_address, user_agent
  ) VALUES (
    p_asset_id, p_user_id, p_activity_type, p_details, p_ip_address, p_user_agent
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's accessible assets (owned + shared)
CREATE OR REPLACE FUNCTION get_user_accessible_assets(p_user_id UUID)
RETURNS TABLE (
  asset_id UUID,
  title VARCHAR,
  file_name VARCHAR,
  file_type VARCHAR,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  is_owner BOOLEAN,
  permission_level VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  -- User's own assets
  SELECT 
    a.id as asset_id,
    a.title,
    a.file_name,
    a.file_type,
    a.file_size,
    a.created_at,
    true as is_owner,
    'admin'::VARCHAR as permission_level
  FROM assets a
  WHERE a.owner_id = p_user_id AND a.is_deleted = FALSE
  
  UNION ALL
  
  -- Shared assets
  SELECT 
    a.id as asset_id,
    a.title,
    a.file_name,
    a.file_type,
    a.file_size,
    a.created_at,
    false as is_owner,
    s.permission_level
  FROM assets a
  JOIN asset_shares s ON a.id = s.asset_id
  WHERE s.shared_with_user_id = p_user_id 
    AND s.is_active = TRUE 
    AND (s.expires_at IS NULL OR s.expires_at > NOW())
    AND a.is_deleted = FALSE
  
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON assets TO authenticated;
GRANT ALL ON asset_shares TO authenticated;
GRANT ALL ON asset_folders TO authenticated;
GRANT ALL ON asset_tags TO authenticated;
GRANT ALL ON asset_comments TO authenticated;
GRANT ALL ON asset_activity_log TO authenticated;
GRANT ALL ON asset_shared_links TO authenticated;