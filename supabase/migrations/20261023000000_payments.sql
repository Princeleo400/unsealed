-- Payments (FR-PAY-01/02/04): who owns what. Written only by the server (service role) after Stripe or
-- Paystack confirms a payment; players can read their own rows and nothing else.

-- ---------------------------------------------------------------- entitlements
-- The single source of truth for access. A Case Pass is a row with kind 'pass' and an expiry that each
-- renewal pushes forward; a bought case is a row with kind 'case' and no expiry (owned forever).
create table if not exists public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('pass', 'case')),
  case_id text check ((kind = 'case') = (case_id is not null) and (case_id is null or char_length(case_id) <= 60)),
  source text not null check (source in ('stripe', 'paystack', 'promo', 'admin')),
  source_ref text not null check (char_length(source_ref) <= 200),
  product_id text not null check (char_length(product_id) <= 60),
  expires_at timestamptz,          -- null = never expires
  revoked_at timestamptz,          -- set when a payment is refunded
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_ref)
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);
alter table public.entitlements enable row level security;

create policy "entitlements: read own" on public.entitlements
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies: only the service role (which bypasses RLS) writes here.

-- ---------------------------------------------------------------- payments ledger
-- One row per successful charge. Kept (without the user link) if the account is deleted, for accounting.
create table if not exists public.payments (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  provider text not null check (provider in ('stripe', 'paystack')),
  provider_ref text not null check (char_length(provider_ref) <= 200),
  product_id text not null check (char_length(product_id) <= 60),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  unique (provider, provider_ref)
);
create index if not exists payments_user_idx on public.payments (user_id);
alter table public.payments enable row level security;

create policy "payments: read own" on public.payments
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------- billing customers
-- Links a player to their Stripe customer / Paystack customer. Server-only: RLS on, no policies.
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  paystack_customer_code text unique,
  updated_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;

-- ---------------------------------------------------------------- grant_entitlement
-- Idempotent grant used by checkout confirmation and webhooks (the same event may arrive twice).
--   mode 'extend': keep the later expiry (Paystack renewals, case purchases)
--   mode 'set':    take the provider's value as the truth (Stripe subscription sync, cancellations)
-- An existing row is never moved to a different player, and a refunded row stays refunded.
create or replace function public.grant_entitlement(
  p_user uuid, p_kind text, p_case text, p_source text, p_ref text, p_product text,
  p_expires timestamptz, p_mode text default 'extend'
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_mode not in ('extend', 'set') then
    raise exception 'grant_entitlement: bad mode %', p_mode;
  end if;
  insert into public.entitlements (user_id, kind, case_id, source, source_ref, product_id, expires_at)
  values (p_user, p_kind, p_case, p_source, p_ref, p_product, p_expires)
  on conflict (source, source_ref) do update set
    expires_at = case
      when p_mode = 'set' then excluded.expires_at
      when public.entitlements.expires_at is null or excluded.expires_at is null then null
      else greatest(public.entitlements.expires_at, excluded.expires_at)
    end,
    updated_at = now()
  where public.entitlements.user_id = excluded.user_id;
end;
$$;

revoke execute on function public.grant_entitlement(uuid, text, text, text, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.grant_entitlement(uuid, text, text, text, text, text, timestamptz, text) to service_role;
