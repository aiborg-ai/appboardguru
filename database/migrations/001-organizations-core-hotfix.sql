-- =====================================================
-- HOTFIX: Remove Invalid Check Constraint
-- Fixes: cannot use subquery in check constraint error
-- =====================================================

-- Remove the problematic check constraint if it exists
ALTER TABLE organization_members 
DROP CONSTRAINT IF EXISTS only_one_owner_per_org;

-- Update the trigger function to handle all ownership scenarios
CREATE OR REPLACE FUNCTION ensure_organization_owner()
RETURNS TRIGGER AS $$
DECLARE
  owner_count INTEGER;
BEGIN
  -- Handle INSERT and UPDATE operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- If inserting/updating to owner role, check if another owner already exists
    IF NEW.role = 'owner' AND NEW.status = 'active' THEN
      SELECT COUNT(*) INTO owner_count
      FROM organization_members 
      WHERE organization_id = NEW.organization_id
        AND role = 'owner' 
        AND status = 'active'
        AND (TG_OP = 'INSERT' OR id != NEW.id);
      
      IF owner_count > 0 THEN
        RAISE EXCEPTION 'Organization can only have one owner. Transfer ownership first.';
      END IF;
    END IF;
  END IF;
  
  -- Handle DELETE and UPDATE operations that remove/change owner
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND (NEW.role != 'owner' OR NEW.status != 'active')) THEN
    -- Check if this would leave the organization without an owner
    SELECT COUNT(*) INTO owner_count
    FROM organization_members 
    WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
      AND role = 'owner' 
      AND status = 'active'
      AND id != COALESCE(OLD.id, NEW.id);
    
    IF owner_count = 0 THEN
      RAISE EXCEPTION 'Organization must have at least one owner';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Ensure trigger exists with correct operations
DROP TRIGGER IF EXISTS ensure_org_owner_trigger ON organization_members;

CREATE TRIGGER ensure_org_owner_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION ensure_organization_owner();

-- Log the hotfix
INSERT INTO _migrations (name, executed_at) 
VALUES ('001-organizations-core-hotfix', NOW())
ON CONFLICT (name) DO NOTHING;