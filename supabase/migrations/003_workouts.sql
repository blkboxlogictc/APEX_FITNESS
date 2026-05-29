-- Weight unit preference on user profile
alter table public.user_profiles
  add column if not exists weight_unit text default 'lbs';

-- ─── workout_sessions ──────────────────────────────────────────────────────────

create table if not exists public.workout_sessions (
  id                  uuid        default gen_random_uuid() primary key,
  user_id             uuid        references auth.users(id) on delete cascade not null,
  plan_day_reference  text,
  session_name        text        not null,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz,
  duration_minutes    int,
  total_volume_kg     numeric,
  notes               text,
  ai_feedback         text,
  created_at          timestamptz default now() not null
);

alter table public.workout_sessions enable row level security;

create policy "Users manage own workout sessions"
  on public.workout_sessions for all
  using (auth.uid() = user_id);

-- ─── workout_sets ─────────────────────────────────────────────────────────────

create table if not exists public.workout_sets (
  id            uuid        default gen_random_uuid() primary key,
  session_id    uuid        references public.workout_sessions(id) on delete cascade not null,
  user_id       uuid        references auth.users(id) on delete cascade not null,
  exercise_id   text        not null,
  exercise_name text        not null,
  set_number    int         not null,
  target_reps   int,
  actual_reps   int,
  weight_kg     numeric,
  weight_lbs    numeric,
  rpe           int,
  is_warmup     boolean     default false,
  completed     boolean     default false,
  notes         text,
  logged_at     timestamptz default now() not null
);

alter table public.workout_sets enable row level security;

create policy "Users manage own workout sets"
  on public.workout_sets for all
  using (auth.uid() = user_id);

-- ─── exercise_history ────────────────────────────────────────────────────────
-- One row per user+exercise — upserted after each completed set

create table if not exists public.exercise_history (
  id                      uuid        default gen_random_uuid() primary key,
  user_id                 uuid        references auth.users(id) on delete cascade not null,
  exercise_id             text        not null,
  exercise_name           text        not null,
  best_weight_kg          numeric     default 0,
  best_reps               int         default 0,
  total_sets_logged       int         default 0,
  last_logged_at          timestamptz default now(),
  personal_record_set_at  timestamptz,
  constraint exercise_history_unique unique (user_id, exercise_id)
);

alter table public.exercise_history enable row level security;

create policy "Users manage own exercise history"
  on public.exercise_history for all
  using (auth.uid() = user_id);
