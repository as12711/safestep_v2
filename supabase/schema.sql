-- ===========================================
-- SafeStep Supabase Schema v3.0 (Minimal)
-- ===========================================
-- 
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard > SQL Editor
-- 2. Copy this entire file
-- 3. Paste and click "Run" 
--
-- ===========================================

-- ===========================================
-- USER PROFILES TABLE (Extended User Data)
-- Stores user preferences and accessibility needs
-- Links to Supabase Auth via auth.users
-- ===========================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  
  -- Basic Info (collected at signup)
  full_name TEXT,
  address TEXT,
  date_of_birth TEXT,
  phone_number TEXT,
  university TEXT CHECK (university IN ('nyu_wsq', 'nyu_tandon', 'new_school', 'liu', NULL)),
  
  -- Demographics (for safety algorithm personalization)
  age_range TEXT CHECK (age_range IN ('under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', NULL)),
  gender TEXT CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say', NULL)),
  
  -- Mobility & Accessibility
  mobility_needs TEXT CHECK (mobility_needs IN ('no_limitations', 'minor_limitations', 'moderate_limitations', 'significant_limitations', 'wheelchair_user', NULL)),
  walking_speed TEXT DEFAULT 'average' CHECK (walking_speed IN ('slow', 'average', 'fast')),
  accessibility_requirements TEXT[] DEFAULT '{}', -- Array: ['wheelchair_accessible', 'avoid_stairs', 'well_lit_paths', 'avoid_uneven_terrain']
  
  -- Preferences
  preferred_route_type TEXT DEFAULT 'safe' CHECK (preferred_route_type IN ('safe', 'quick', 'accessible')),
  avoid_stairs BOOLEAN DEFAULT FALSE,
  avoid_hills BOOLEAN DEFAULT FALSE,
  night_mode_sensitivity TEXT DEFAULT 'normal' CHECK (night_mode_sensitivity IN ('low', 'normal', 'high')),
  
  -- Home Beacon/Emergency
  home_beacon_enabled BOOLEAN DEFAULT FALSE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- Policies: Users can only access their own profile
CREATE POLICY "Users can view own profile" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- REPORTS TABLE (Core)
-- Crowdsourced safety reports from users
-- ===========================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  ts BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  user_id TEXT DEFAULT 'anonymous',
  verified BOOLEAN DEFAULT FALSE,
  photo_uri TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_ts ON reports(ts DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(lat, lng);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Reports are viewable by everyone" ON reports;
DROP POLICY IF EXISTS "Anyone can create reports" ON reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reports;

-- Policies
CREATE POLICY "Reports are viewable by everyone" 
  ON reports FOR SELECT USING (true);

CREATE POLICY "Anyone can create reports" 
  ON reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own reports" 
  ON reports FOR DELETE USING (user_id = 'anonymous' OR auth.uid()::text = user_id);

-- ===========================================
-- ADMIN USERS TABLE (Must be created BEFORE pending_reports)
-- Tracks who has admin privileges
-- ===========================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'moderator' CHECK (role IN ('moderator', 'admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policies for admin_users
DROP POLICY IF EXISTS "Admins can view admin list" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admins" ON admin_users;
DROP POLICY IF EXISTS "Allow first admin insert" ON admin_users;

-- Allow viewing admin list if you're an admin
CREATE POLICY "Admins can view admin list" 
  ON admin_users FOR SELECT 
  USING (true); -- Allow reading to check admin status

-- Allow super admins to manage other admins
CREATE POLICY "Super admins can manage admins" 
  ON admin_users FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
    OR NOT EXISTS (SELECT 1 FROM admin_users) -- Allow first admin
  );

-- ===========================================
-- FUNCTION: Check if user is admin
-- ===========================================
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE user_id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- PENDING REPORTS TABLE (Verification Queue)
-- Reports awaiting community/admin verification
-- ===========================================
CREATE TABLE IF NOT EXISTS pending_reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  ts BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  user_id TEXT DEFAULT 'anonymous',
  photo_uri TEXT,
  description TEXT,
  
  -- Verification tracking
  verification_count INTEGER DEFAULT 0,
  verification_threshold INTEGER DEFAULT 2,
  is_ambient BOOLEAN DEFAULT FALSE,
  priority INTEGER DEFAULT 0,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_reports_status ON pending_reports(status);
CREATE INDEX IF NOT EXISTS idx_pending_reports_priority ON pending_reports(priority DESC, verification_count DESC);
CREATE INDEX IF NOT EXISTS idx_pending_reports_location ON pending_reports(lat, lng);
CREATE INDEX IF NOT EXISTS idx_pending_reports_expires ON pending_reports(expires_at);

-- Enable RLS
ALTER TABLE pending_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Pending reports viewable by authenticated" ON pending_reports;
DROP POLICY IF EXISTS "Anyone can create pending reports" ON pending_reports;
DROP POLICY IF EXISTS "Admins can update pending reports" ON pending_reports;

-- Policies
CREATE POLICY "Pending reports viewable by authenticated" 
  ON pending_reports FOR SELECT 
  USING (true); -- Allow all to view for now

CREATE POLICY "Anyone can create pending reports" 
  ON pending_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update pending reports" 
  ON pending_reports FOR UPDATE 
  USING (is_admin());

-- ===========================================
-- REPORT VERIFICATIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS report_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES pending_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('confirm', 'deny', 'still_valid', 'not_valid')),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(report_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verifications_report ON report_verifications(report_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON report_verifications(user_id);

-- Enable RLS
ALTER TABLE report_verifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view verifications" ON report_verifications;
DROP POLICY IF EXISTS "Authenticated users can verify" ON report_verifications;

CREATE POLICY "Users can view verifications" 
  ON report_verifications FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can verify" 
  ON report_verifications FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- FUNCTION: Calculate distance between points (meters)
-- ===========================================
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371000; -- Earth radius in meters
  phi1 DOUBLE PRECISION;
  phi2 DOUBLE PRECISION;
  delta_phi DOUBLE PRECISION;
  delta_lambda DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  phi1 := RADIANS(lat1);
  phi2 := RADIANS(lat2);
  delta_phi := RADIANS(lat2 - lat1);
  delta_lambda := RADIANS(lng2 - lng1);
  
  a := SIN(delta_phi / 2) * SIN(delta_phi / 2) +
       COS(phi1) * COS(phi2) * SIN(delta_lambda / 2) * SIN(delta_lambda / 2);
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===========================================
-- FUNCTION: Find nearby pending reports (for verification)
-- ===========================================
CREATE OR REPLACE FUNCTION find_nearby_pending_reports(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  id TEXT,
  type TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  verification_count INTEGER,
  verification_threshold INTEGER,
  priority INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.type,
    pr.lat,
    pr.lng,
    calculate_distance_meters(user_lat, user_lng, pr.lat, pr.lng) as distance_meters,
    pr.verification_count,
    pr.verification_threshold,
    pr.priority,
    pr.created_at
  FROM pending_reports pr
  WHERE pr.status = 'pending'
    AND pr.expires_at > NOW()
    AND calculate_distance_meters(user_lat, user_lng, pr.lat, pr.lng) <= radius_meters
  ORDER BY pr.priority DESC, distance_meters ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Check for duplicate/nearby reports (within 15m)
-- ===========================================
CREATE OR REPLACE FUNCTION check_duplicate_report(
  report_type TEXT,
  report_lat DOUBLE PRECISION,
  report_lng DOUBLE PRECISION,
  proximity_threshold DOUBLE PRECISION DEFAULT 15
)
RETURNS TABLE (
  existing_id TEXT,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  -- Check pending reports
  SELECT 
    pr.id as existing_id,
    calculate_distance_meters(report_lat, report_lng, pr.lat, pr.lng) as distance_meters
  FROM pending_reports pr
  WHERE pr.type = report_type
    AND pr.status = 'pending'
    AND pr.expires_at > NOW()
    AND calculate_distance_meters(report_lat, report_lng, pr.lat, pr.lng) <= proximity_threshold
  UNION ALL
  -- Check verified reports
  SELECT 
    r.id as existing_id,
    calculate_distance_meters(report_lat, report_lng, r.lat, r.lng) as distance_meters
  FROM reports r
  WHERE r.type = report_type
    AND r.ts > (EXTRACT(EPOCH FROM (NOW() - INTERVAL '6 hours')) * 1000)::BIGINT
    AND calculate_distance_meters(report_lat, report_lng, r.lat, r.lng) <= proximity_threshold
  ORDER BY distance_meters ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Submit verification for a report
-- ===========================================
CREATE OR REPLACE FUNCTION submit_verification(
  p_report_id TEXT,
  p_verification_type TEXT,
  p_user_lat DOUBLE PRECISION DEFAULT NULL,
  p_user_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report pending_reports%ROWTYPE;
  v_distance DOUBLE PRECISION;
  v_new_count INTEGER;
BEGIN
  -- Get the report
  SELECT * INTO v_report FROM pending_reports WHERE id = p_report_id AND status = 'pending';
  
  IF v_report IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found or already processed');
  END IF;
  
  -- Calculate distance if location provided
  IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
    v_distance := calculate_distance_meters(p_user_lat, p_user_lng, v_report.lat, v_report.lng);
  END IF;
  
  -- Insert verification
  INSERT INTO report_verifications (report_id, user_id, verification_type, lat, lng, distance_meters)
  VALUES (p_report_id, auth.uid(), p_verification_type, p_user_lat, p_user_lng, v_distance)
  ON CONFLICT (report_id, user_id) DO UPDATE SET
    verification_type = EXCLUDED.verification_type,
    lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    distance_meters = EXCLUDED.distance_meters,
    created_at = NOW();
  
  -- Update verification count
  SELECT COUNT(*) INTO v_new_count 
  FROM report_verifications 
  WHERE report_id = p_report_id AND verification_type IN ('confirm', 'still_valid');
  
  UPDATE pending_reports SET verification_count = v_new_count WHERE id = p_report_id;
  
  -- Auto-approve if threshold reached
  IF v_new_count >= v_report.verification_threshold THEN
    -- Move to verified reports
    INSERT INTO reports (id, type, lat, lng, ts, user_id, verified, photo_uri, description)
    VALUES (v_report.id, v_report.type, v_report.lat, v_report.lng, v_report.ts, 
            v_report.user_id, true, v_report.photo_uri, v_report.description);
    
    -- Update pending status
    UPDATE pending_reports SET status = 'approved', reviewed_at = NOW() WHERE id = p_report_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'approved', 'message', 'Report verified and published');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'status', 'pending', 'verification_count', v_new_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Admin approve/deny report
-- ===========================================
CREATE OR REPLACE FUNCTION admin_review_report(
  p_report_id TEXT,
  p_action TEXT, -- 'approve' or 'deny'
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report pending_reports%ROWTYPE;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Get the report
  SELECT * INTO v_report FROM pending_reports WHERE id = p_report_id AND status = 'pending';
  
  IF v_report IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found or already processed');
  END IF;
  
  IF p_action = 'approve' THEN
    -- Move to verified reports
    INSERT INTO reports (id, type, lat, lng, ts, user_id, verified, photo_uri, description)
    VALUES (v_report.id, v_report.type, v_report.lat, v_report.lng, v_report.ts, 
            v_report.user_id, true, v_report.photo_uri, v_report.description);
    
    UPDATE pending_reports 
    SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW() 
    WHERE id = p_report_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'approved');
    
  ELSIF p_action = 'deny' THEN
    UPDATE pending_reports 
    SET status = 'denied', reviewed_by = auth.uid(), reviewed_at = NOW(), denial_reason = p_reason 
    WHERE id = p_report_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'denied');
  END IF;
  
  RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- FUNCTION: Clean up expired pending reports
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_expired_reports()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE pending_reports SET status = 'expired' 
  WHERE status = 'pending' AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ANALYTICS TABLE (Core)
-- App usage events for insights
-- ===========================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  user_id TEXT DEFAULT 'anonymous',
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at DESC);

-- Enable RLS
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can log analytics" ON analytics;

-- Policy: Anyone can insert analytics
CREATE POLICY "Anyone can log analytics" 
  ON analytics FOR INSERT WITH CHECK (true);

-- ===========================================
-- WALKS/TRIPS TABLE (Track user navigation)
-- Records completed and in-progress walks
-- ===========================================
CREATE TABLE IF NOT EXISTS walks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Route info
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  origin_name TEXT,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  dest_name TEXT,
  
  -- Walk metrics
  distance_meters DOUBLE PRECISION,
  duration_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'rerouted')),
  
  -- Safety metrics
  safety_score DOUBLE PRECISION, -- 0-100 based on route
  reports_encountered INTEGER DEFAULT 0,
  reroute_count INTEGER DEFAULT 0,
  home_beacon_active BOOLEAN DEFAULT FALSE,
  
  -- Route data (stored as JSON for flexibility)
  route_coords JSONB, -- Array of {lat, lng} points
  original_route JSONB, -- If rerouted, store original
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_walks_user ON walks(user_id);
CREATE INDEX IF NOT EXISTS idx_walks_status ON walks(status);
CREATE INDEX IF NOT EXISTS idx_walks_created ON walks(created_at DESC);

-- Enable RLS
ALTER TABLE walks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own walks" ON walks;
DROP POLICY IF EXISTS "Users can insert own walks" ON walks;
DROP POLICY IF EXISTS "Users can update own walks" ON walks;

CREATE POLICY "Users can view own walks" ON walks FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own walks" ON walks FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own walks" ON walks FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- REROUTES TABLE (Track safety reroutes)
-- Records when users were rerouted due to safety
-- ===========================================
CREATE TABLE IF NOT EXISTS reroutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walk_id UUID REFERENCES walks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Reroute trigger
  trigger_type TEXT CHECK (trigger_type IN ('report', 'safety_score', 'user_request', 'blocked_path')),
  trigger_report_id TEXT, -- If triggered by a report
  
  -- Location where reroute occurred
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  
  -- Time/distance saved or added
  distance_delta_meters DOUBLE PRECISION, -- Positive = longer, negative = shorter
  time_delta_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reroutes_walk ON reroutes(walk_id);
CREATE INDEX IF NOT EXISTS idx_reroutes_trigger ON reroutes(trigger_type);

ALTER TABLE reroutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view reroutes" ON reroutes;
CREATE POLICY "Users can view reroutes" ON reroutes FOR SELECT USING (true);
CREATE POLICY "Users can insert reroutes" ON reroutes FOR INSERT WITH CHECK (true);

-- ===========================================
-- USER ENGAGEMENT TABLE (Track feature usage)
-- ===========================================
CREATE TABLE IF NOT EXISTS user_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session tracking
  session_id TEXT,
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Feature usage counts
  walks_started INTEGER DEFAULT 0,
  walks_completed INTEGER DEFAULT 0,
  reports_submitted INTEGER DEFAULT 0,
  reports_verified INTEGER DEFAULT 0,
  home_beacon_activations INTEGER DEFAULT 0,
  
  -- App engagement
  app_opens INTEGER DEFAULT 0,
  search_queries INTEGER DEFAULT 0,
  settings_changed INTEGER DEFAULT 0,
  
  -- Device/context info
  platform TEXT, -- 'ios' or 'android'
  app_version TEXT,
  is_university_user BOOLEAN DEFAULT FALSE,
  university TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_user ON user_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_session ON user_engagement(session_id);
CREATE INDEX IF NOT EXISTS idx_engagement_university ON user_engagement(university);

ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own engagement" ON user_engagement;
DROP POLICY IF EXISTS "Users can insert engagement" ON user_engagement;
CREATE POLICY "Users can view own engagement" ON user_engagement FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert engagement" ON user_engagement FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update engagement" ON user_engagement FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- SUBSCRIPTIONS TABLE (Track paid users)
-- ===========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'family', 'business')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  
  -- Billing
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Features
  family_members_limit INTEGER DEFAULT 0,
  priority_support BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ===========================================
-- ADMIN DASHBOARD VIEWS (for easier querying)
-- ===========================================

-- Daily signups view
CREATE OR REPLACE VIEW admin_daily_signups AS
SELECT 
  DATE(created_at) as signup_date,
  COUNT(*) as total_signups,
  COUNT(CASE WHEN university IS NOT NULL THEN 1 END) as university_signups,
  COUNT(CASE WHEN onboarding_completed THEN 1 END) as completed_onboarding
FROM user_profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- University breakdown view
CREATE OR REPLACE VIEW admin_university_stats AS
SELECT 
  COALESCE(university, 'non_university') as university,
  COUNT(*) as user_count,
  COUNT(CASE WHEN onboarding_completed THEN 1 END) as onboarded_count,
  COUNT(CASE WHEN home_beacon_enabled THEN 1 END) as home_beacon_users
FROM user_profiles
GROUP BY university
ORDER BY user_count DESC;

-- Report activity view
CREATE OR REPLACE VIEW admin_report_activity AS
SELECT 
  DATE(created_at) as report_date,
  COUNT(*) as total_reports,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM pending_reports
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY report_date DESC;

-- Walk metrics view
CREATE OR REPLACE VIEW admin_walk_metrics AS
SELECT 
  DATE(created_at) as walk_date,
  COUNT(*) as total_walks,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned,
  COUNT(CASE WHEN reroute_count > 0 THEN 1 END) as had_reroutes,
  AVG(distance_meters) as avg_distance,
  AVG(duration_seconds) as avg_duration,
  AVG(safety_score) as avg_safety_score
FROM walks
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY walk_date DESC;

-- ===========================================
-- VERIFICATION
-- ===========================================
SELECT 'Schema created successfully!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
