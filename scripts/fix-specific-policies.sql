-- Fix the specific problematic policies
-- Based on the screenshot, we need to fix these policies

-- First, drop the problematic SELECT policies that might have circular references
DROP POLICY IF EXISTS "Members can view organization membership" ON organization_members;
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;

-- Now create a single, simple SELECT policy without any circular references
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Verify the fix
SELECT 'Testing organization_members access...' as status;
SELECT COUNT(*) as test_count FROM organization_members WHERE user_id = auth.uid();

SELECT 'If you see a count above without errors, the fix worked!' as message;