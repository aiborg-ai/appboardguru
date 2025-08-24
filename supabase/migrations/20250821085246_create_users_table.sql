-- Create users table that extends auth.users with additional profile fields
-- This allows us to have additional user profile data while using Supabase auth

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'suspended', 'banned')),
    company TEXT,
    position TEXT,
    linkedin_url TEXT,
    designation VARCHAR(200),
    bio TEXT CHECK (length(bio) <= 2000),
    phone TEXT,
    location TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_linkedin_url_format CHECK (
        linkedin_url IS NULL OR 
        linkedin_url ~ '^https?://(www\.)?linkedin\.com/.*' OR
        linkedin_url ~ '^https?://(www\.)?linkedin\.com/in/.*'
    ),
    CONSTRAINT check_designation_length CHECK (designation IS NULL OR length(designation) <= 200),
    CONSTRAINT check_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_company ON users(company);
CREATE INDEX idx_users_designation ON users(designation);
CREATE INDEX idx_users_linkedin_url ON users(linkedin_url) WHERE linkedin_url IS NOT NULL;
CREATE INDEX idx_users_last_seen ON users(last_seen_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated at trigger
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view all other users (for boardmate listings, etc.)
CREATE POLICY "Users can view all user profiles" ON users FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (for profile creation after signup)
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to automatically create user profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Comments for documentation
COMMENT ON TABLE users IS 'Extended user profiles with additional fields beyond auth.users';
COMMENT ON COLUMN users.linkedin_url IS 'LinkedIn profile URL for professional networking';
COMMENT ON COLUMN users.designation IS 'Official title or designation (e.g., Chairman, CEO, Independent Director)';
COMMENT ON COLUMN users.bio IS 'Professional biography or summary';
COMMENT ON COLUMN users.role IS 'Application role (user, admin, super_admin)';
COMMENT ON COLUMN users.status IS 'Account status (approved, pending, suspended, banned)';

-- Test users will be created through the auth system via the trigger