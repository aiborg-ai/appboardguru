-- AppBoardGuru Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('pending', 'director', 'admin', 'viewer');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE pack_status AS ENUM ('processing', 'ready', 'failed', 'archived');

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'pending',
  status user_status DEFAULT 'pending',
  company TEXT,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ
);

-- Create registration_requests table
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  company TEXT,
  position TEXT,
  message TEXT,
  status user_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  approval_token TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create board_packs table
CREATE TABLE IF NOT EXISTS board_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  status pack_status DEFAULT 'processing',
  summary TEXT,
  audio_summary_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  watermark_applied BOOLEAN DEFAULT false
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_approval_token ON registration_requests(approval_token) WHERE approval_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_registration_requests_token_expires_at ON registration_requests(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_board_packs_uploaded_by ON board_packs(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_board_packs_status ON board_packs(status);
CREATE INDEX IF NOT EXISTS idx_board_packs_created_at ON board_packs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_board_packs_updated_at BEFORE UPDATE ON board_packs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

-- Registration requests policies
CREATE POLICY "Anyone can create registration requests" ON registration_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view registration requests" ON registration_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "Admins can update registration requests" ON registration_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

-- Board packs policies
CREATE POLICY "Approved users can view board packs" ON board_packs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND status = 'approved'
    )
  );

CREATE POLICY "Directors and admins can insert board packs" ON board_packs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "Directors and admins can update board packs" ON board_packs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "Directors and admins can delete board packs" ON board_packs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for board pack files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('board-packs', 'board-packs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for board-packs bucket
CREATE POLICY "Approved users can view files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'board-packs' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND status = 'approved'
    )
  );

CREATE POLICY "Directors and admins can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'board-packs' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "Directors and admins can update files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'board-packs' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "Directors and admins can delete files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'board-packs' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );