-- Coins (Daily Brief "play more"): a wallet per player and a ledger of every change.
-- Only the server (service role) changes coins, through coin_apply(); players can read their own.

create table if not exists public.coin_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.coin_wallets enable row level security;

create policy "coin_wallets: read own" on public.coin_wallets
  for select using (auth.uid() = user_id);

create table if not exists public.coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  reason text not null check (reason in ('daily_login', 'daily_solve', 'ad', 'bonus_spend', 'admin')),
  ref text not null check (char_length(ref) <= 120),
  delta integer not null check (delta between -100 and 100),
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index if not exists coin_ledger_user_day_idx on public.coin_ledger (user_id, reason, day);
alter table public.coin_ledger enable row level security;

create policy "coin_ledger: read own" on public.coin_ledger
  for select using (auth.uid() = user_id);

-- Applies one coin change atomically. Returns {"status": ..., "balance": n} where status is
--   applied     the change was made
--   duplicate   this (reason, ref) was already applied: nothing changes (safe to retry)
--   cap         the daily limit for this reason is reached
--   insufficient not enough coins to spend
-- The wallet row is locked first, so two requests at once can't both pass a cap or overspend.
create or replace function public.coin_apply(
  p_user uuid, p_delta integer, p_reason text, p_ref text, p_day date, p_daily_cap integer default null
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_balance integer;
  v_count integer;
begin
  insert into public.coin_wallets (user_id) values (p_user) on conflict (user_id) do nothing;
  select balance into v_balance from public.coin_wallets where user_id = p_user for update;

  if exists (select 1 from public.coin_ledger where user_id = p_user and reason = p_reason and ref = p_ref) then
    return jsonb_build_object('status', 'duplicate', 'balance', v_balance);
  end if;
  if p_daily_cap is not null then
    select count(*) into v_count from public.coin_ledger where user_id = p_user and reason = p_reason and day = p_day;
    if v_count >= p_daily_cap then
      return jsonb_build_object('status', 'cap', 'balance', v_balance);
    end if;
  end if;
  if v_balance + p_delta < 0 then
    return jsonb_build_object('status', 'insufficient', 'balance', v_balance);
  end if;

  insert into public.coin_ledger (user_id, day, reason, ref, delta) values (p_user, p_day, p_reason, p_ref, p_delta);
  update public.coin_wallets set balance = balance + p_delta, updated_at = now()
    where user_id = p_user returning balance into v_balance;
  return jsonb_build_object('status', 'applied', 'balance', v_balance);
end;
$$;

revoke execute on function public.coin_apply(uuid, integer, text, text, date, integer) from public, anon, authenticated;
grant execute on function public.coin_apply(uuid, integer, text, text, date, integer) to service_role;
