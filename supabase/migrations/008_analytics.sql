-- ─── Body Measurements ───────────────────────────────────────────────────────

create table if not exists public.body_measurements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  measured_at     date not null default current_date,
  weight_kg       numeric(6,2),
  body_fat_percent numeric(5,2),
  muscle_mass_kg  numeric(6,2),
  measurements    jsonb default '{}'::jsonb,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.body_measurements enable row level security;

create policy "Users manage own body_measurements"
  on public.body_measurements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists body_measurements_user_date
  on public.body_measurements(user_id, measured_at desc);

-- ─── Weekly Recaps ────────────────────────────────────────────────────────────

create table if not exists public.weekly_recaps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  week_start     date not null,
  week_end       date not null,
  recap_data     jsonb not null default '{}'::jsonb,
  ai_narrative   text,
  headline       text,
  highlights     text[] not null default '{}',
  focus_areas    text[] not null default '{}',
  apex_score     int not null default 0,
  generated_at   timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.weekly_recaps enable row level security;

create policy "Users manage own weekly_recaps"
  on public.weekly_recaps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists weekly_recaps_user_week
  on public.weekly_recaps(user_id, week_start desc);

-- ─── Goals ───────────────────────────────────────────────────────────────────

create table if not exists public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  goal_type       text not null check (goal_type in ('event','weight','strength','habit','body_comp','custom')),
  title           text not null,
  description     text,
  target_value    numeric,
  target_unit     text,
  target_date     date,
  current_value   numeric,
  start_value     numeric,
  exercise_id     text,
  is_active       boolean not null default true,
  is_achieved     boolean not null default false,
  achieved_at     timestamptz,
  coach_note      text,
  milestones      jsonb default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.goals enable row level security;

create policy "Users manage own goals"
  on public.goals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists goals_user_active
  on public.goals(user_id, is_active, created_at desc);

-- ─── RPC: workout volume by week ─────────────────────────────────────────────

create or replace function public.get_workout_volume_by_week(
  p_user_id uuid,
  p_since    timestamptz
)
returns table(
  week_start     date,
  total_volume   numeric,
  sessions_count bigint,
  total_duration int
) language sql stable security definer as $$
  select
    date_trunc('week', started_at)::date as week_start,
    sum(total_volume_kg)                 as total_volume,
    count(*)                             as sessions_count,
    sum(duration_minutes)                as total_duration
  from workout_sessions
  where user_id = p_user_id
    and completed_at is not null
    and started_at >= p_since
  group by date_trunc('week', started_at)
  order by week_start;
$$;

-- ─── RPC: nutrition compliance by day ────────────────────────────────────────

create or replace function public.get_nutrition_by_day(
  p_user_id uuid,
  p_since    date
)
returns table(
  log_date     date,
  total_cal    numeric,
  total_protein numeric,
  total_carbs  numeric,
  total_fat    numeric
) language sql stable security definer as $$
  select
    logged_at::date      as log_date,
    sum(calories)        as total_cal,
    sum(protein_g)       as total_protein,
    sum(carbs_g)         as total_carbs,
    sum(fat_g)           as total_fat
  from food_logs
  where user_id = p_user_id
    and logged_at >= p_since
  group by logged_at::date
  order by log_date;
$$;

-- ─── RPC: activity minutes by week ───────────────────────────────────────────

create or replace function public.get_activity_by_week(
  p_user_id uuid,
  p_since    timestamptz
)
returns table(
  week_start date,
  total_minutes int,
  total_calories int
) language sql stable security definer as $$
  select
    date_trunc('week', logged_at::timestamptz)::date as week_start,
    sum(duration_minutes)::int                       as total_minutes,
    sum(calories_burned)::int                        as total_calories
  from activity_logs
  where user_id = p_user_id
    and logged_at::timestamptz >= p_since
  group by date_trunc('week', logged_at::timestamptz)
  order by week_start;
$$;
