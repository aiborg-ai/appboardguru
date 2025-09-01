-- Add missing columns to meetings table
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Add index for organizer_id for better query performance
CREATE INDEX IF NOT EXISTS idx_meetings_organizer_id ON meetings(organizer_id);

-- Update existing meetings to set organizer_id from created_by if not set
UPDATE meetings 
SET organizer_id = created_by 
WHERE organizer_id IS NULL AND created_by IS NOT NULL;