import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';
it('trigger fires for a non-superuser inserter without EXECUTE on the function', async () => {
  const db = new PGlite();
  await db.exec(`
    create schema auth; create table auth.users (id uuid primary key);
    create table public.profiles (id uuid primary key);
    create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as
      $$ begin insert into public.profiles (id) values (new.id); return new; end; $$;
    create trigger t after insert on auth.users for each row execute function public.handle_new_user();
    create role auth_admin nologin;
    grant usage on schema auth to auth_admin; grant insert on auth.users to auth_admin;
    revoke execute on function public.handle_new_user() from public;
  `);
  const priv = (await db.query(`select has_function_privilege('auth_admin','public.handle_new_user()','execute') as p`)).rows[0].p;
  await db.exec(`set role auth_admin; insert into auth.users values ('44444444-4444-4444-4444-444444444444'); reset role;`);
  const n = (await db.query('select count(*)::int as n from public.profiles')).rows[0].n;
  console.log('auth_admin has execute:', priv, '| profiles created:', n);
  expect(n).toBe(1);
});
