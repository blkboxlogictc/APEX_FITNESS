-- ─── Push Subscriptions ──────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth_key     text not null,
  device_name  text,
  user_agent   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push_subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists push_subscriptions_user_active
  on public.push_subscriptions(user_id, is_active);

-- ─── Notification Preferences ────────────────────────────────────────────────

create table if not exists public.notification_preferences (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid not null references auth.users(id) on delete cascade unique,
  workout_reminders            boolean not null default true,
  workout_reminder_time        time not null default '07:00',
  workout_reminder_days        int[] not null default '{1,2,3,4,5}',
  nutrition_reminders          boolean not null default true,
  meal_reminder_times          time[] not null default '{"08:00","12:30","18:30"}',
  prehab_reminders             boolean not null default true,
  weekly_recap_notification    boolean not null default true,
  coach_proactive_messages     boolean not null default true,
  supplement_reminders         boolean not null default false,
  supplement_reminder_time     time not null default '08:00',
  water_reminders              boolean not null default false,
  water_reminder_interval_hours int not null default 2,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "Users manage own notification_preferences"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
