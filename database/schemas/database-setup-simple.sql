-- BoardGuru Database Schema Setup (Supabase Compatible)

-- Create custom types (enums)
CREATE TYPE user_role AS ENUM ('pending', 'director', 'admin', 'viewer');
CREATE TYPE user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE pack_status AS ENUM ('processing', 'ready', 'failed');

-- 1. Registration Requests Table
CREATE TABLE public.registration_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    position VARCHAR(255),
    message TEXT,
    status user_status DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users Table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role user_role DEFAULT 'pending',
    status user_status DEFAULT 'pending',
    company VARCHAR(255),
    position VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 3. Board Packs Table
CREATE TABLE public.board_packs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    uploaded_by UUID REFERENCES public.users(id) NOT NULL,
    status pack_status DEFAULT 'processing',
    summary TEXT,
    audio_summary_url TEXT,
    watermark_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Audit Logs Table
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_registration_requests_email ON public.registration_requests(email);
CREATE INDEX idx_registration_requests_status ON public.registration_requests(status);
CREATE INDEX idx_registration_requests_created_at ON public.registration_requests(created_at);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_status ON public.users(status);

CREATE INDEX idx_board_packs_uploaded_by ON public.board_packs(uploaded_by);
CREATE INDEX idx_board_packs_status ON public.board_packs(status);
CREATE INDEX idx_board_packs_created_at ON public.board_packs(created_at);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Registration Requests: Anyone can insert (for public registration)
CREATE POLICY "Anyone can insert registration requests" ON public.registration_requests
    FOR INSERT WITH CHECK (true);

-- Users: Users can read their own data
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Board Packs: Basic access for authenticated users
CREATE POLICY "Authenticated users can view board packs" ON public.board_packs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Audit Logs: Basic insert policy
CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- Functions for automatic user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email));
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_board_packs_updated_at BEFORE UPDATE ON public.board_packs
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();