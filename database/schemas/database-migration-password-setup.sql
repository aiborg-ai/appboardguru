-- Database Migration: Add Password Setup Tracking
-- Run this step by step in your Supabase SQL Editor

-- Step 1: Add password_set column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT true;