-- Fix RLS Infinite Recursion for AppBoardGuru
-- Run this script in your Supabase SQL Editor
-- This will fix the circular dependency between organization_members and organizations tables

-- Step 1: Drop ALL existing policies to start fresh
-- Drop all policies on organization_members
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organization_members;
DROP POLICY IF EXISTS "Users can view their organization memberships" ON organization_members;
DROP POLICY IF EXISTS "Members can view their organizations" ON organization_members;
DROP POLICY IF EXISTS "Enable read access for users" ON organization_members;
DROP POLICY IF EXISTS "Users can select their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can create their own memberships" ON organization_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON organization_members;

-- Drop all policies on organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Enable read access for members" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;

-- Step 2: Create simple, non-recursive policies for organization_members
-- This policy only checks if the user_id matches, no circular references
CREATE POLICY "Users can view their own memberships"
ON organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own memberships (for creating organizations)
CREATE POLICY "Users can create their own memberships"
ON organization_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own memberships
CREATE POLICY "Users can update their own memberships"
ON organization_members
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 3: Create simple policy for organizations table
-- This uses EXISTS but won't cause recursion because organization_members policy is simple
CREATE POLICY "Users can view organizations they are members of"
ON organizations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 
        FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
);

-- Allow authenticated users to create organizations
CREATE POLICY "Authenticated users can create organizations"
ON organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow organization admins to update their organizations
CREATE POLICY "Admins can update their organizations"
ON organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 
        FROM organization_members om
        WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
);

-- Step 4: Verify the policies are working
-- These queries should work without recursion errors after applying the above policies

-- Test query 1: Check if organization_members is accessible
SELECT COUNT(*) as member_count FROM organization_members WHERE user_id = auth.uid();

-- Test query 2: Check if organizations is accessible
SELECT COUNT(*) as org_count FROM organizations WHERE EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = organizations.id 
    AND user_id = auth.uid()
);

-- If these queries work without errors, the recursion issue is fixed!