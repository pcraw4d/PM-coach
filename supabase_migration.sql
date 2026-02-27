-- Migration to support storing scriptExample in goldenPath within the history table

-- 1. Ensure the history table exists
CREATE TABLE IF NOT EXISTS history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  title TEXT,
  question_type TEXT,
  xp_awarded INTEGER DEFAULT 0,
  result JSONB, -- This column stores the full InterviewResult, including goldenPath with scriptExample
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure the result column is JSONB (if it was created differently)
-- This is idempotent; if it's already JSONB, it does nothing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'history' 
    AND column_name = 'result' 
    AND data_type != 'jsonb'
  ) THEN
    ALTER TABLE history ALTER COLUMN result TYPE JSONB USING result::JSONB;
  END IF;
END $$;

-- 3. Add an index on the result column for faster querying of JSON fields (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_history_result ON history USING GIN (result);

-- Note: The `scriptExample` field is added to the `goldenPath` array inside the `result` JSONB column.
-- No schema change is required to the table structure itself to accommodate this new field,
-- as JSONB is schema-less for its contents. The application logic handles the structure.
