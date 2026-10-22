-- Accounts: profiles, synced case saves and Daily Brief results (FR-AUTH-*, FR-CASE-10, FR-DAILY-04).
-- Every table uses row-level security: a signed-in player can only touch their own rows.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- case saves
-- `token` is the server-signed session state (HMAC). Even if a player wrote a fake token here,
-- the server rejects it because the signature would not match.
create table if not exists public.play_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  case_id text not null check (char_length(case_id) <= 60),
  token text not null check (char_length(token) <= 60000),
  board jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, case_id)
);
alter table public.play_saves enable row level security;

create policy "play_saves: read own" on public.play_saves
  for select using (auth.uid() = user_id);
create policy "play_saves: insert own" on public.play_saves
  for insert with check (auth.uid() = user_id);
create policy "play_saves: update own" on public.play_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "play_saves: delete own" on public.play_saves
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------- daily results
-- One row per player per day. The first result recorded for a day is the one that counts.
create table if not exists public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  solved boolean not null,
  wrong smallint not null check (wrong between 0 and 3),
  seconds integer not null check (seconds between 0 and 86400),
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.daily_results enable row level security;

create policy "daily_results: read own" on public.daily_results
  for select using (auth.uid() = user_id);
create policy "daily_results: insert own" on public.daily_results
  for insert with check (auth.uid() = user_id);
-- No update policy: a day's result can't be rewritten after the fact.
