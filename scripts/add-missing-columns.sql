-- Add Missing Columns to Assets Table
-- This adds commonly needed columns if they don't exist

-- Check current columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add uploaded_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'uploaded_by') THEN
        ALTER TABLE assets ADD COLUMN uploaded_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added uploaded_by column';
    END IF;
    
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'user_id') THEN
        ALTER TABLE assets ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column';
    END IF;
    
    -- Add created_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'created_at') THEN
        ALTER TABLE assets ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    -- Add updated_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'updated_at') THEN
        ALTER TABLE assets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
    
    -- Add title if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'title') THEN
        ALTER TABLE assets ADD COLUMN title TEXT;
        RAISE NOTICE 'Added title column';
    END IF;
    
    -- Add description if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'description') THEN
        ALTER TABLE assets ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    END IF;
    
    -- Add category if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'category') THEN
        ALTER TABLE assets ADD COLUMN category TEXT;
        RAISE NOTICE 'Added category column';
    END IF;
    
    -- Add tags if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'assets' AND column_name = 'tags') THEN
        ALTER TABLE assets ADD COLUMN tags TEXT[];
        RAISE NOTICE 'Added tags column';
    END IF;
END $$;

-- Show final structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

SELECT '✅ Missing columns have been added!' as status;
SELECT 'The assets table now has all required columns.' as message;