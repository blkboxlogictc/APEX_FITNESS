-- Phase 6: Joint Health & Rehabilitation Module

-- Pain Screenings
CREATE TABLE IF NOT EXISTS pain_screenings (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joint                  TEXT NOT NULL,
  side                   TEXT NOT NULL DEFAULT 'both',  -- 'left'|'right'|'both'|'center'
  pain_level             INT NOT NULL CHECK (pain_level BETWEEN 0 AND 10),
  pain_description       JSONB NOT NULL DEFAULT '{}',
  ai_assessment          TEXT,
  recommended_program_id UUID,
  red_flags_detected     BOOLEAN NOT NULL DEFAULT FALSE,
  referral_recommended   BOOLEAN NOT NULL DEFAULT FALSE,
  context                TEXT,  -- 'initial'|'during_workout'|'follow_up'
  resolved_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pain_screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pain screenings"
  ON pain_screenings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_pain_screenings_user ON pain_screenings(user_id, created_at DESC);
CREATE INDEX idx_pain_screenings_active ON pain_screenings(user_id, resolved_at) WHERE resolved_at IS NULL;

-- Prehab Programs
CREATE TABLE IF NOT EXISTS prehab_programs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_name             TEXT NOT NULL,
  target_joints            TEXT[] NOT NULL DEFAULT '{}',
  program_type             TEXT NOT NULL DEFAULT 'prehab',  -- 'injury_rehab'|'prehab'|'mobility'|'performance'
  exercises                JSONB NOT NULL DEFAULT '[]',
  frequency_per_week       INT NOT NULL DEFAULT 3,
  estimated_duration_minutes INT NOT NULL DEFAULT 12,
  ai_rationale             TEXT,
  pain_screening_id        UUID REFERENCES pain_screenings(id) ON DELETE SET NULL,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  weeks_prescribed         INT NOT NULL DEFAULT 6,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE prehab_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prehab programs"
  ON prehab_programs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_prehab_programs_user ON prehab_programs(user_id, is_active);

-- Prehab Logs
CREATE TABLE IF NOT EXISTS prehab_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id            UUID NOT NULL REFERENCES prehab_programs(id) ON DELETE CASCADE,
  completed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes      INT NOT NULL DEFAULT 0,
  exercises_completed   JSONB NOT NULL DEFAULT '[]',
  pain_level_before     INT CHECK (pain_level_before BETWEEN 0 AND 10),
  pain_level_after      INT CHECK (pain_level_after BETWEEN 0 AND 10),
  notes                 TEXT
);

ALTER TABLE prehab_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prehab logs"
  ON prehab_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_prehab_logs_user ON prehab_logs(user_id, completed_at DESC);
CREATE INDEX idx_prehab_logs_program ON prehab_logs(program_id, completed_at DESC);

-- Movement Assessments
CREATE TABLE IF NOT EXISTS movement_assessments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type      TEXT NOT NULL,  -- 'overhead_squat'|'single_leg'|'hip_hinge'|'shoulder_mobility'
  results              JSONB NOT NULL DEFAULT '[]',
  ai_summary           TEXT,
  priority_corrections TEXT[] DEFAULT '{}',
  score                INT,  -- 0-100 overall quality score
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE movement_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own movement assessments"
  ON movement_assessments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_movement_assessments_user ON movement_assessments(user_id, assessment_type, created_at DESC);

-- Add FK for recommended_program_id now that prehab_programs exists
ALTER TABLE pain_screenings
  ADD CONSTRAINT fk_pain_screening_program
  FOREIGN KEY (recommended_program_id) REFERENCES prehab_programs(id) ON DELETE SET NULL;
