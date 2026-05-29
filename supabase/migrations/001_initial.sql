-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- user_profiles table
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  age integer check (age >= 13 and age <= 120),
  sex text check (sex in ('male', 'female', 'other')),
  height_cm numeric(5,1) check (height_cm > 0),
  weight_kg numeric(6,2) check (weight_kg > 0),
  fitness_goal text check (
    fitness_goal in ('lose_weight', 'build_muscle', 'endurance', 'sport_performance', 'general_health')
  ),
  experience_level text check (
    experience_level in ('beginner', 'intermediate', 'advanced')
  ),
  days_per_week integer check (days_per_week >= 1 and days_per_week <= 7),
  available_equipment text[] default '{}',
  sports_activities text[] default '{}',
  specific_goal text,
  injuries_limitations text,
  personal_context text,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row-level security
alter table public.user_profiles enable row level security;

-- Users can only read and modify their own profile
create policy "Users can view own profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.user_profiles
  for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_user_profiles_updated
  before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, created_at, updated_at)
  values (new.id, now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
