-- Cache entries table for database cache layer
CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  size_bytes INTEGER GENERATED ALWAYS AS (LENGTH(value::text)) STORED
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON cache_entries (expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_created_at ON cache_entries (created_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_size ON cache_entries (size_bytes);

-- Partial index for non-expired entries (commented out due to NOW() immutability issue)
-- CREATE INDEX IF NOT EXISTS idx_cache_entries_active 
-- ON cache_entries (key) WHERE expires_at > NOW();

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cache_entries WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  expired_entries BIGINT,
  active_entries BIGINT,
  total_size_mb NUMERIC,
  avg_entry_size_bytes NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
    COUNT(*) FILTER (WHERE expires_at >= NOW()) as active_entries,
    ROUND(SUM(size_bytes)::NUMERIC / (1024*1024), 2) as total_size_mb,
    ROUND(AVG(size_bytes)::NUMERIC, 0) as avg_entry_size_bytes
  FROM cache_entries;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup of expired entries (every hour)
-- Note: This requires pg_cron extension in production
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');

-- Alternative: Function to be called by application periodically
CREATE OR REPLACE FUNCTION maintain_cache()
RETURNS void AS $$
BEGIN
  -- Clean up expired entries
  PERFORM cleanup_expired_cache();
  
  -- Vacuum the table if it's gotten too large
  -- Only in production, this might be too aggressive for development
  IF (SELECT COUNT(*) FROM cache_entries) > 10000 THEN
    VACUUM ANALYZE cache_entries;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- RLS policies for cache entries
ALTER TABLE cache_entries ENABLE ROW LEVEL SECURITY;

-- Allow the application to manage its own cache
CREATE POLICY "Service role can manage cache" ON cache_entries
  FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE cache_entries IS 'Database-backed cache storage layer';
COMMENT ON COLUMN cache_entries.key IS 'Unique cache key identifier';
COMMENT ON COLUMN cache_entries.value IS 'JSON-encoded cached value';
COMMENT ON COLUMN cache_entries.expires_at IS 'When this cache entry expires';
COMMENT ON COLUMN cache_entries.size_bytes IS 'Size of the cached value in bytes (computed)';

COMMENT ON FUNCTION cleanup_expired_cache() IS 'Removes expired cache entries and returns count deleted';
COMMENT ON FUNCTION get_cache_stats() IS 'Returns comprehensive cache usage statistics';
COMMENT ON FUNCTION maintain_cache() IS 'Performs routine cache maintenance tasks';