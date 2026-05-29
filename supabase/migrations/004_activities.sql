-- ── Activity Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_id text NOT NULL,
  activity_name text NOT NULL,
  category text NOT NULL,
  duration_minutes integer NOT NULL,
  calories_burned integer NOT NULL DEFAULT 0,
  met_value numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  logged_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity logs"
  ON activity_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_activity_logs_user_logged ON activity_logs (user_id, logged_at DESC);

-- ── Activity Goals ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weekly_active_minutes integer NOT NULL DEFAULT 150,
  weekly_sessions integer NOT NULL DEFAULT 5,
  daily_calorie_burn integer NOT NULL DEFAULT 300,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

ALTER TABLE activity_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity goals"
  ON activity_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Sport Programs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sport_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sport text NOT NULL,
  program_name text NOT NULL,
  weekly_sessions integer NOT NULL DEFAULT 3,
  duration_weeks integer NOT NULL DEFAULT 8,
  weekly_structure jsonb NOT NULL DEFAULT '[]'::jsonb,
  coaching_notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sport_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sport programs"
  ON sport_programs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_sport_programs_user_active ON sport_programs (user_id, is_active);
