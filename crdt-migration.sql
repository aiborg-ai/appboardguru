-- CRDT Tables Migration
-- Add conflict-free replicated data types support for collaborative editing

-- Create CRDT documents table
CREATE TABLE IF NOT EXISTS crdt_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  content TEXT,
  metadata JSONB DEFAULT '{}',
  version INTEGER DEFAULT 1,
  last_modified_by UUID REFERENCES users(id),
  last_modified_at TIMESTAMP WITH TIME ZONE,
  state_vector TEXT, -- Yjs state vector for sync
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(asset_id), -- One CRDT document per asset
  CHECK(version > 0)
);

-- Create CRDT operations table
CREATE TABLE IF NOT EXISTS crdt_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES crdt_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  operation_type VARCHAR(20) NOT NULL CHECK(operation_type IN ('insert', 'delete', 'format')),
  position INTEGER NOT NULL CHECK(position >= 0),
  content TEXT,
  length INTEGER CHECK(length >= 0),
  attributes JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  vector_clock JSONB DEFAULT '{}', -- Vector clock for ordering
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX(document_id, timestamp),
  INDEX(user_id, timestamp),
  INDEX(timestamp)
);

-- Create CRDT conflicts table
CREATE TABLE IF NOT EXISTS crdt_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES crdt_documents(id) ON DELETE CASCADE,
  operation_ids UUID[] NOT NULL, -- Array of conflicting operation IDs
  conflict_type VARCHAR(50) NOT NULL,
  resolution_strategy VARCHAR(50), -- 'manual', 'automatic', 'last-writer-wins'
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK(array_length(operation_ids, 1) >= 2), -- At least 2 operations for conflict
  CHECK(
    (resolved_at IS NULL AND resolved_by IS NULL) OR 
    (resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crdt_documents_asset_id ON crdt_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_crdt_documents_organization_id ON crdt_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_crdt_documents_last_modified_at ON crdt_documents(last_modified_at);

CREATE INDEX IF NOT EXISTS idx_crdt_operations_document_id ON crdt_operations(document_id);
CREATE INDEX IF NOT EXISTS idx_crdt_operations_user_id ON crdt_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_crdt_operations_timestamp ON crdt_operations(timestamp);
CREATE INDEX IF NOT EXISTS idx_crdt_operations_operation_type ON crdt_operations(operation_type);

CREATE INDEX IF NOT EXISTS idx_crdt_conflicts_document_id ON crdt_conflicts(document_id);
CREATE INDEX IF NOT EXISTS idx_crdt_conflicts_resolved_at ON crdt_conflicts(resolved_at);
CREATE INDEX IF NOT EXISTS idx_crdt_conflicts_conflict_type ON crdt_conflicts(conflict_type);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crdt_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crdt_documents_updated_at
  BEFORE UPDATE ON crdt_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_crdt_documents_updated_at();

-- Create function to clean up old operations (optional, for performance)
CREATE OR REPLACE FUNCTION cleanup_old_crdt_operations(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM crdt_operations 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your security model)
GRANT SELECT, INSERT, UPDATE, DELETE ON crdt_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crdt_operations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crdt_conflicts TO authenticated;

-- RLS policies (Row Level Security)
ALTER TABLE crdt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crdt_conflicts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access CRDT documents in their organization
CREATE POLICY crdt_documents_organization_access ON crdt_documents
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy: Users can only access operations for documents they have access to
CREATE POLICY crdt_operations_document_access ON crdt_operations
  FOR ALL USING (
    document_id IN (
      SELECT id FROM crdt_documents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Policy: Users can only access conflicts for documents they have access to
CREATE POLICY crdt_conflicts_document_access ON crdt_conflicts
  FOR ALL USING (
    document_id IN (
      SELECT id FROM crdt_documents
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Add comments for documentation
COMMENT ON TABLE crdt_documents IS 'Conflict-free replicated data types documents for collaborative editing';
COMMENT ON TABLE crdt_operations IS 'Individual operations performed on CRDT documents';
COMMENT ON TABLE crdt_conflicts IS 'Records of conflicts that occurred during collaborative editing';

COMMENT ON COLUMN crdt_documents.state_vector IS 'Yjs state vector for synchronization';
COMMENT ON COLUMN crdt_operations.vector_clock IS 'Vector clock for operation ordering';
COMMENT ON COLUMN crdt_conflicts.operation_ids IS 'Array of operation IDs that caused the conflict';
COMMENT ON COLUMN crdt_conflicts.resolution_strategy IS 'How the conflict was resolved: manual, automatic, last-writer-wins';