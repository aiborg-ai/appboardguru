-- Migration: Add Event Outbox and Optimistic Locking Support
-- Date: 2025-08-30
-- Description: Implements event outbox pattern for atomic operations and adds version columns for optimistic locking

-- =====================================================
-- 1. CREATE EVENT OUTBOX TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.event_outbox (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for efficient querying
  CONSTRAINT event_outbox_status_check CHECK (
    status IN ('pending', 'processing', 'published', 'failed', 'dead_letter', 'cancelled')
  )
);

-- Create indexes for event outbox
CREATE INDEX IF NOT EXISTS idx_event_outbox_status ON public.event_outbox(status);
CREATE INDEX IF NOT EXISTS idx_event_outbox_created_at ON public.event_outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_event_outbox_aggregate_id ON public.event_outbox(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_outbox_event_type ON public.event_outbox(event_type);
CREATE INDEX IF NOT EXISTS idx_event_outbox_pending ON public.event_outbox(status, attempts) 
  WHERE status IN ('pending', 'failed');

-- =====================================================
-- 2. CREATE TRANSACTION LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.transaction_logs (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  step_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  error JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT transaction_logs_level_check CHECK (
    level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')
  )
);

-- Create indexes for transaction logs
CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON public.transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_timestamp ON public.transaction_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_level ON public.transaction_logs(level);

-- =====================================================
-- 3. ADD VERSION COLUMNS FOR OPTIMISTIC LOCKING
-- =====================================================

-- Add version column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE public.users ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX idx_users_version ON public.users(version);
  END IF;
END $$;

-- Add version column to boards table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'boards' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE public.boards ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX idx_boards_version ON public.boards(version);
  END IF;
END $$;

-- Add version column to meetings table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meetings' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE public.meetings ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX idx_meetings_version ON public.meetings(version);
  END IF;
END $$;

-- Add version column to documents table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'version'
  ) THEN
    ALTER TABLE public.documents ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX idx_documents_version ON public.documents(version);
  END IF;
END $$;

-- =====================================================
-- 4. CREATE FUNCTIONS FOR ATOMIC OPERATIONS
-- =====================================================

-- Function to update entity version
CREATE OR REPLACE FUNCTION update_entity_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old event outbox entries
CREATE OR REPLACE FUNCTION cleanup_old_event_outbox_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM public.event_outbox
  WHERE status = 'published' 
  AND published_at < NOW() - INTERVAL '7 days';
  
  DELETE FROM public.event_outbox
  WHERE status = 'dead_letter'
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to process pending events (can be called by a cron job)
CREATE OR REPLACE FUNCTION process_pending_events(batch_size INTEGER DEFAULT 100)
RETURNS TABLE(processed_count INTEGER) AS $$
DECLARE
  processed INTEGER := 0;
BEGIN
  -- Mark events as processing
  WITH events_to_process AS (
    SELECT id FROM public.event_outbox
    WHERE status = 'pending'
    AND attempts < max_attempts
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.event_outbox
  SET status = 'processing',
      last_attempt_at = NOW(),
      attempts = attempts + 1,
      updated_at = NOW()
  WHERE id IN (SELECT id FROM events_to_process);
  
  GET DIAGNOSTICS processed = ROW_COUNT;
  RETURN QUERY SELECT processed;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Add triggers for version updates on UPDATE operations
CREATE TRIGGER update_users_version
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_entity_version();

CREATE TRIGGER update_boards_version
  BEFORE UPDATE ON public.boards
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_entity_version();

CREATE TRIGGER update_meetings_version
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_entity_version();

CREATE TRIGGER update_documents_version
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_entity_version();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- Event Outbox Policies
CREATE POLICY "Service role can manage event_outbox"
  ON public.event_outbox
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view their events"
  ON public.event_outbox
  FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND aggregate_id IN (
      SELECT id FROM public.users WHERE id = auth.uid()
    )
  );

-- Transaction Logs Policies
CREATE POLICY "Service role can manage transaction_logs"
  ON public.transaction_logs
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view their transaction logs"
  ON public.transaction_logs
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND transaction_id IN (
      SELECT id FROM public.event_outbox 
      WHERE aggregate_id = auth.uid()
    )
  );

-- =====================================================
-- 7. PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_event_outbox_composite_pending 
  ON public.event_outbox(status, attempts, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_users_email_version 
  ON public.users(email, version);

CREATE INDEX IF NOT EXISTS idx_boards_org_version 
  ON public.boards(organization_id, version);

-- =====================================================
-- 8. GRANTS (if needed for different roles)
-- =====================================================

-- Grant permissions to authenticated role
GRANT SELECT ON public.event_outbox TO authenticated;
GRANT SELECT ON public.transaction_logs TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON public.event_outbox TO service_role;
GRANT ALL ON public.transaction_logs TO service_role;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.event_outbox IS 'Stores domain events for atomic publishing with database operations';
COMMENT ON TABLE public.transaction_logs IS 'Stores detailed logs of saga transactions for debugging and auditing';

COMMENT ON COLUMN public.event_outbox.status IS 'Event processing status: pending, processing, published, failed, dead_letter, cancelled';
COMMENT ON COLUMN public.event_outbox.attempts IS 'Number of publishing attempts made';
COMMENT ON COLUMN public.event_outbox.max_attempts IS 'Maximum number of attempts before moving to dead_letter';

COMMENT ON COLUMN public.users.version IS 'Optimistic locking version number';
COMMENT ON COLUMN public.boards.version IS 'Optimistic locking version number';
COMMENT ON COLUMN public.meetings.version IS 'Optimistic locking version number';
COMMENT ON COLUMN public.documents.version IS 'Optimistic locking version number';