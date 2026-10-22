-- Waitlist for the UNSEALED launch (Phase 0).
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null,
  country text,
  source text,
  created_at timestamptz not null default now(),
  constraint waitlist_email_unique unique (email),
  constraint waitlist_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Only the server (service role) may read or write. No public policies on purpose.
alter table public.waitlist enable row level security;
