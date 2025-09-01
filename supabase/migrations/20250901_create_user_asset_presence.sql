-- Create user_asset_presence table for tracking user presence on assets
CREATE TABLE IF NOT EXISTS public.user_asset_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  vault_id UUID REFERENCES public.vaults(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Presence information
  status TEXT CHECK (status IN ('online', 'idle', 'offline')) DEFAULT 'online',
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_viewing_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Activity tracking
  page_number INTEGER DEFAULT 1,
  scroll_position NUMERIC DEFAULT 0,
  zoom_level NUMERIC DEFAULT 100,
  viewing_mode TEXT DEFAULT 'read',
  
  -- Device info
  device_id TEXT,
  browser_info JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate active sessions
  UNIQUE(user_id, asset_id, device_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_asset_presence_user_id ON public.user_asset_presence(user_id);
CREATE INDEX idx_user_asset_presence_asset_id ON public.user_asset_presence(asset_id);
CREATE INDEX idx_user_asset_presence_status ON public.user_asset_presence(status);
CREATE INDEX idx_user_asset_presence_last_seen ON public.user_asset_presence(last_seen_at DESC);

-- Enable RLS
ALTER TABLE public.user_asset_presence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view presence for assets they have access to
CREATE POLICY "Users can view presence for accessible assets"
  ON public.user_asset_presence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.vault_assets va
      JOIN public.vault_members vm ON vm.vault_id = va.vault_id
      WHERE va.asset_id = user_asset_presence.asset_id
      AND vm.user_id = auth.uid()
      AND vm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = user_asset_presence.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
    )
  );

-- Users can insert their own presence
CREATE POLICY "Users can insert their own presence"
  ON public.user_asset_presence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence
CREATE POLICY "Users can update their own presence"
  ON public.user_asset_presence
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own presence
CREATE POLICY "Users can delete their own presence"
  ON public.user_asset_presence
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_asset_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_asset_presence_updated_at
  BEFORE UPDATE ON public.user_asset_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_user_asset_presence_updated_at();

-- Function to clean up old presence records (offline for more than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_presence_records()
RETURNS void AS $$
BEGIN
  DELETE FROM public.user_asset_presence
  WHERE status = 'offline' 
  AND last_seen_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON public.user_asset_presence TO authenticated;
GRANT SELECT ON public.user_asset_presence TO anon;