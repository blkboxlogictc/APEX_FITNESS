-- Nutrition plans
create table if not exists public.nutrition_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  version integer not null default 1,
  daily_calories integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  meal_structure jsonb not null default '[]'::jsonb,
  notes text,
  generated_from_context text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fitness plans
create table if not exists public.fitness_plans (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  version integer not null default 1,
  plan_name text,
  days_per_week integer,
  weekly_structure jsonb not null default '[]'::jsonb,
  periodization_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Plan edit history (never deleted — audit trail + future undo)
create table if not exists public.plan_edit_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  plan_type text not null check (plan_type in ('nutrition', 'fitness', 'both')),
  plan_id uuid not null,
  version_before integer not null,
  version_after integer not null,
  user_message text,
  ai_response text,
  diff_summary text,
  created_at timestamptz not null default now()
);

-- Chat messages
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  has_plan_edit boolean not null default false,
  plan_edit_id uuid references public.plan_edit_history(id),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.nutrition_plans enable row level security;
alter table public.fitness_plans enable row level security;
alter table public.plan_edit_history enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users can select own nutrition_plans"
  on public.nutrition_plans for select using (auth.uid() = user_id);
create policy "Users can insert own nutrition_plans"
  on public.nutrition_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own nutrition_plans"
  on public.nutrition_plans for update using (auth.uid() = user_id);

create policy "Users can select own fitness_plans"
  on public.fitness_plans for select using (auth.uid() = user_id);
create policy "Users can insert own fitness_plans"
  on public.fitness_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own fitness_plans"
  on public.fitness_plans for update using (auth.uid() = user_id);

create policy "Users can select own plan_edit_history"
  on public.plan_edit_history for select using (auth.uid() = user_id);
create policy "Users can insert own plan_edit_history"
  on public.plan_edit_history for insert with check (auth.uid() = user_id);

create policy "Users can select own chat_messages"
  on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own chat_messages"
  on public.chat_messages for insert with check (auth.uid() = user_id);

-- updated_at triggers
create trigger on_nutrition_plans_updated
  before update on public.nutrition_plans
  for each row execute procedure public.handle_updated_at();

create trigger on_fitness_plans_updated
  before update on public.fitness_plans
  for each row execute procedure public.handle_updated_at();

-- Realtime: need REPLICA IDENTITY FULL so UPDATE payloads include the old row
alter table public.nutrition_plans replica identity full;
alter table public.fitness_plans replica identity full;
