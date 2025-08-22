-- AppBoardGuru Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('pending', 'director', 'admin', 'viewer');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE pack_status AS ENUM ('processing', 'ready', 'failed', 'archived');
CREATE TYPE email_processing_status AS ENUM ('received', 'processing', 'completed', 'failed', 'rejected');

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

-- Email to Assets Integration Tables
-- Create email_processing_logs table for email-to-asset ingestion
CREATE TABLE IF NOT EXISTS email_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status email_processing_status DEFAULT 'received',
  user_id UUID REFERENCES users(id),
  organization_id UUID,
  assets_created UUID[] DEFAULT '{}',
  error_message TEXT,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for email processing logs
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_message_id ON email_processing_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_from_email ON email_processing_logs(from_email);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_user_id ON email_processing_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_status ON email_processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_processing_logs_created_at ON email_processing_logs(created_at);

-- Add trigger for email processing logs updated_at
CREATE TRIGGER update_email_processing_logs_updated_at 
  BEFORE UPDATE ON email_processing_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for email processing logs
ALTER TABLE email_processing_logs ENABLE ROW LEVEL SECURITY;

-- Email processing logs policies
CREATE POLICY "Users can view their own email processing logs" ON email_processing_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email processing logs" ON email_processing_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );

CREATE POLICY "System can insert email processing logs" ON email_processing_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update email processing logs" ON email_processing_logs
  FOR UPDATE USING (true);

-- Create storage bucket for email assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('email-assets', 'email-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for email-assets bucket
CREATE POLICY "Users can view their email assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'email-assets' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "System can upload email assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'email-assets'
  );

CREATE POLICY "System can update email assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'email-assets'
  );

CREATE POLICY "Admins can delete email assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'email-assets' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'director') 
      AND status = 'approved'
    )
  );