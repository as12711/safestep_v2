-- Migration: Add gender column to user_profiles
-- Run this in Supabase SQL Editor if you already have the schema deployed

-- Add gender column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_profiles 
    ADD COLUMN gender TEXT CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say', NULL));
    
    RAISE NOTICE 'Added gender column to user_profiles';
  ELSE
    RAISE NOTICE 'Gender column already exists';
  END IF;
END $$;

-- Add app_settings table for admin configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO app_settings (key, value, description) VALUES
  ('safety_infrastructure_enabled', 'true', 'Master toggle for safety systems'),
  ('auto_verify_ambient', 'true', 'Auto-verify ambient report types (lighting, crowds)'),
  ('verification_threshold', '2', 'Number of confirmations needed for auto-approval'),
  ('report_expiration_hours', '6', 'Hours before pending reports expire')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings
DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
CREATE POLICY "Admins can manage settings" ON app_settings
  FOR ALL USING (is_admin());

-- Allow anyone to read settings (for app to check if features enabled)
DROP POLICY IF EXISTS "Anyone can read settings" ON app_settings;
CREATE POLICY "Anyone can read settings" ON app_settings
  FOR SELECT USING (true);

-- Function to get a setting value
CREATE OR REPLACE FUNCTION get_setting(setting_key TEXT)
RETURNS JSONB AS $$
  SELECT value FROM app_settings WHERE key = setting_key;
$$ LANGUAGE SQL STABLE;

-- Function to update a setting (admin only)
CREATE OR REPLACE FUNCTION update_setting(setting_key TEXT, new_value JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE app_settings 
  SET value = new_value, updated_by = auth.uid(), updated_at = NOW()
  WHERE key = setting_key;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Migration completed successfully' as status;
