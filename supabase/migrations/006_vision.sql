-- Phase 5: Vision Layer — Progress Photos + meal_photo_session_id

-- Progress photos table (must exist before food_logs references it)
CREATE TABLE IF NOT EXISTS progress_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  public_url    TEXT,
  photo_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg     NUMERIC(5,2),
  body_fat_pct  NUMERIC(4,1),
  notes         TEXT,
  tags          TEXT[] DEFAULT '{}',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress photos"
  ON progress_photos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON progress_photos(user_id, photo_date DESC);

-- Add meal_photo_session_id to food_logs (now progress_photos exists)
ALTER TABLE food_logs
  ADD COLUMN IF NOT EXISTS meal_photo_session_id UUID REFERENCES progress_photos(id) ON DELETE SET NULL;

-- Storage bucket for progress photos (run via Supabase dashboard or service role)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('progress-photos', 'progress-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
-- CREATE POLICY "User owns folder" ON storage.objects FOR ALL
--   USING ((storage.foldername(name))[1] = auth.uid()::text)
--   WITH CHECK ((storage.foldername(name))[1] = auth.uid()::text);
