-- ===========================================
-- SafeStep Migration: Fix user_id Consistency
-- ===========================================
-- 
-- This migration addresses the inconsistency between:
-- - reports.user_id (TEXT, 'anonymous' fallback)
-- - user_profiles.id (UUID, references auth.users)
--
-- The fix ensures user_ids in reports properly link to auth.users when available
-- while still supporting anonymous reports for non-authenticated users.
--
-- Run this migration in Supabase SQL Editor

-- ===========================================
-- Step 1: Add user_uuid column to reports table
-- This provides proper UUID reference while maintaining backward compatibility
-- ===========================================

-- Add nullable UUID column for proper user reference
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_reports_user_uuid ON reports(user_uuid);

-- ===========================================
-- Step 2: Same for pending_reports table
-- ===========================================

ALTER TABLE pending_reports ADD COLUMN IF NOT EXISTS user_uuid UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pending_reports_user_uuid ON pending_reports(user_uuid);

-- ===========================================
-- Step 3: Update RLS policies to use user_uuid when available
-- ===========================================

-- Drop and recreate reports delete policy
-- SECURITY FIX: Removed 'user_id = anonymous' condition which allowed
-- any user to delete any anonymous report. Now only allows:
-- 1. Users to delete their own reports (matching user_id or user_uuid)
-- 2. Admins to delete any report (including anonymous ones)
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;
CREATE POLICY "Users can delete own reports" 
  ON reports FOR DELETE 
  USING (
    -- Users can delete their own reports
    (auth.uid()::text = user_id OR auth.uid() = user_uuid)
    -- Admins can delete any report (including anonymous ones)
    OR is_admin()
  );

-- Add update policy for users to edit their own reports
DROP POLICY IF EXISTS "Users can update own reports" ON reports;
CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  USING (auth.uid()::text = user_id OR auth.uid() = user_uuid);

-- ===========================================
-- Step 4: Create helper function to get reports by user
-- ===========================================

CREATE OR REPLACE FUNCTION get_user_reports(p_user_id UUID)
RETURNS SETOF reports AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM reports
  WHERE user_uuid = p_user_id 
     OR user_id = p_user_id::text
  ORDER BY ts DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- Step 5: Create trigger to auto-populate user_uuid on insert
-- ===========================================

CREATE OR REPLACE FUNCTION populate_report_user_uuid()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id looks like a UUID and user_uuid is null, try to set it
  IF NEW.user_uuid IS NULL AND NEW.user_id IS NOT NULL AND NEW.user_id != 'anonymous' THEN
    BEGIN
      NEW.user_uuid := NEW.user_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      -- user_id is not a valid UUID, leave user_uuid as null
      NULL;
    END;
  END IF;
  
  -- Also try to set user_uuid from auth.uid() if available
  -- BUT: Don't overwrite anonymous reports (preserve user_id = 'anonymous')
  -- Only set from auth.uid() if user_id is NULL or matches auth.uid()
  IF NEW.user_uuid IS NULL 
     AND auth.uid() IS NOT NULL 
     AND (NEW.user_id IS NULL OR NEW.user_id = auth.uid()::text) THEN
    NEW.user_uuid := auth.uid();
    -- Also update user_id to match (only if it was NULL, not if it was already set)
    IF NEW.user_id IS NULL THEN
      NEW.user_id := auth.uid()::text;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS set_report_user_uuid ON reports;
CREATE TRIGGER set_report_user_uuid
  BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION populate_report_user_uuid();

DROP TRIGGER IF EXISTS set_pending_report_user_uuid ON pending_reports;
CREATE TRIGGER set_pending_report_user_uuid
  BEFORE INSERT ON pending_reports
  FOR EACH ROW EXECUTE FUNCTION populate_report_user_uuid();

-- ===========================================
-- Step 6: Backfill existing reports where possible
-- ===========================================

-- Update existing reports where user_id is a valid UUID
UPDATE reports 
SET user_uuid = user_id::UUID 
WHERE user_uuid IS NULL 
  AND user_id IS NOT NULL 
  AND user_id != 'anonymous'
  AND user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

UPDATE pending_reports 
SET user_uuid = user_id::UUID 
WHERE user_uuid IS NULL 
  AND user_id IS NOT NULL 
  AND user_id != 'anonymous'
  AND user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ===========================================
-- Step 7: Create view joining reports with user info
-- ===========================================

CREATE OR REPLACE VIEW reports_with_user AS
SELECT 
  r.*,
  up.full_name as reporter_name,
  up.university as reporter_university,
  up.email as reporter_email
FROM reports r
LEFT JOIN user_profiles up ON r.user_uuid = up.id;

CREATE OR REPLACE VIEW pending_reports_with_user AS
SELECT 
  pr.*,
  up.full_name as reporter_name,
  up.university as reporter_university,
  up.email as reporter_email
FROM pending_reports pr
LEFT JOIN user_profiles up ON pr.user_uuid = up.id;

-- Grant access to views
GRANT SELECT ON reports_with_user TO authenticated;
GRANT SELECT ON pending_reports_with_user TO authenticated;

-- ===========================================
-- Verification
-- ===========================================
SELECT 'Migration 002 completed successfully!' as status;
