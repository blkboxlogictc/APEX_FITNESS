-- ── Food Logs ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_id text NOT NULL,
  food_name text NOT NULL,
  brand text,
  meal_type text NOT NULL,
  servings numeric(6,2) NOT NULL DEFAULT 1,
  serving_size_label text NOT NULL DEFAULT '',
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(7,2) NOT NULL DEFAULT 0,
  carbs_g numeric(7,2) NOT NULL DEFAULT 0,
  fat_g numeric(7,2) NOT NULL DEFAULT 0,
  fiber_g numeric(7,2) NOT NULL DEFAULT 0,
  sugar_g numeric(7,2) NOT NULL DEFAULT 0,
  sodium_mg numeric(8,2) NOT NULL DEFAULT 0,
  saturated_fat_g numeric(7,2) NOT NULL DEFAULT 0,
  is_supplement boolean NOT NULL DEFAULT false,
  supplement_category text,
  notes text,
  image_url text,
  logged_at date NOT NULL DEFAULT CURRENT_DATE,
  logged_time time,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own food logs"
  ON food_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_food_logs_user_date ON food_logs (user_id, logged_at DESC);
CREATE INDEX idx_food_logs_food_id ON food_logs (user_id, food_id);

-- ── Custom Foods ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_foods (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  brand text,
  serving_size text NOT NULL DEFAULT '1 serving',
  serving_quantity numeric(8,2),
  serving_unit text NOT NULL DEFAULT 'g',
  calories integer NOT NULL DEFAULT 0,
  protein_g numeric(7,2) NOT NULL DEFAULT 0,
  carbs_g numeric(7,2) NOT NULL DEFAULT 0,
  fat_g numeric(7,2) NOT NULL DEFAULT 0,
  fiber_g numeric(7,2),
  sugar_g numeric(7,2),
  sodium_mg numeric(8,2),
  is_supplement boolean NOT NULL DEFAULT false,
  supplement_category text,
  barcode text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE custom_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own custom foods"
  ON custom_foods FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_custom_foods_user ON custom_foods (user_id, created_at DESC);

-- ── Supplement Stack ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplement_stack (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  brand text,
  supplement_type text NOT NULL DEFAULT 'other',
  serving_size text NOT NULL DEFAULT '1 serving',
  calories_per_serving integer NOT NULL DEFAULT 0,
  protein_g_per_serving numeric(7,2) NOT NULL DEFAULT 0,
  key_ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  timing_recommendation text NOT NULL DEFAULT '',
  daily_timing text[] NOT NULL DEFAULT '{}',
  ai_notes text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  food_log_id text,
  image_url text,
  added_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE supplement_stack ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own supplement stack"
  ON supplement_stack FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_supplement_stack_user_active ON supplement_stack (user_id, is_active);

-- ── Water Logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS water_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_ml integer NOT NULL,
  logged_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own water logs"
  ON water_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_water_logs_user_date ON water_logs (user_id, logged_at DESC);
