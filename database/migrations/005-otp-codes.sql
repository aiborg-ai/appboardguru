-- Create OTP codes table for first-time login authentication
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'first_login' CHECK (purpose IN ('first_login', 'password_reset')),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_otp_code ON public.otp_codes(otp_code);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON public.otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON public.otp_codes(used);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_otp_codes_updated_at
    BEFORE UPDATE ON public.otp_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired OTP codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.otp_codes 
    WHERE expires_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Enable RLS (Row Level Security)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service role (full access)
CREATE POLICY "Service role can manage all OTP codes" ON public.otp_codes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create RLS policy for authenticated users (read their own OTPs)
CREATE POLICY "Users can read their own OTP codes" ON public.otp_codes
    FOR SELECT
    TO authenticated
    USING (email = auth.email());

-- Comment on table and columns
COMMENT ON TABLE public.otp_codes IS 'Stores one-time passwords for user authentication and password resets';
COMMENT ON COLUMN public.otp_codes.email IS 'Email address associated with the OTP';
COMMENT ON COLUMN public.otp_codes.otp_code IS '6-digit one-time password';
COMMENT ON COLUMN public.otp_codes.purpose IS 'Purpose of the OTP: first_login or password_reset';
COMMENT ON COLUMN public.otp_codes.expires_at IS 'Timestamp when the OTP expires';
COMMENT ON COLUMN public.otp_codes.used IS 'Whether the OTP has been used';
COMMENT ON COLUMN public.otp_codes.used_at IS 'Timestamp when the OTP was used';