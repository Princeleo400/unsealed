/**
 * Runs the real migrations on PGlite (Postgres compiled to WASM) with a minimal stand-in for
 * Supabase's `auth` schema, then checks row-level security the way Supabase applies it:
 * as the `authenticated` role with the user's id in `request.jwt.claim.sub`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const MIGRATIONS = join(import.meta.dirname, '../migrations');
const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
let db;

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

async function as(user, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false); set role ${user ? 'authenticated' : 'anon'};`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const rows = async (sql, params) => (await db.query(sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of readdirSync(MIGRATIONS).sort()) await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');`);
});

describe('accounts migration', () => {
  it('creates a profile for every new user', async () => {
    expect((await rows('select id from public.profiles order by id')).map((r) => r.id)).toEqual([A, B]);
  });

  it('profiles: users see and edit only their own', async () => {
    await as(A, async () => {
      expect(await rows('select id from public.profiles')).toEqual([{ id: A }]);
      await db.query(`update public.profiles set display_name = 'Ada' where id = $1`, [B]); // silently affects 0 rows
      await db.query(`update public.profiles set display_name = 'Ada' where id = $1`, [A]);
    });
    expect((await rows(`select display_name from public.profiles where id = $1`, [B]))[0].display_name).toBeNull();
    expect((await rows(`select display_name from public.profiles where id = $1`, [A]))[0].display_name).toBe('Ada');
  });

  it('play_saves: own rows only, cannot write as someone else', async () => {
    await as(A, () => db.query(`insert into public.play_saves (user_id, case_id, token) values ($1, '001-dead-air', 'tokA')`, [A]));
    await as(B, () => db.query(`insert into public.play_saves (user_id, case_id, token) values ($1, '001-dead-air', 'tokB')`, [B]));
    await expect(as(A, () => db.query(`insert into public.play_saves (user_id, case_id, token) values ($1, 'x', 'evil')`, [B]))).rejects.toThrow(/row-level security/);
    expect(await as(A, () => rows('select token from public.play_saves'))).toEqual([{ token: 'tokA' }]);
    await as(A, () => db.query(`update public.play_saves set token = 'hacked' where user_id = $1`, [B]));
    expect((await rows(`select token from public.play_saves where user_id = $1`, [B]))[0].token).toBe('tokB');
  });

  it('anonymous visitors see nothing', async () => {
    expect(await as(null, () => rows('select * from public.play_saves'))).toEqual([]);
    expect(await as(null, () => rows('select * from public.profiles'))).toEqual([]);
    await expect(as(null, () => db.query(`insert into public.daily_results (user_id, date, solved, wrong, seconds) values ($1, '2026-10-22', true, 0, 60)`, [A]))).rejects.toThrow(/row-level security/);
  });

  it('daily_results: insert own once, no rewriting', async () => {
    await as(A, () => db.query(`insert into public.daily_results (user_id, date, solved, wrong, seconds) values ($1, '2026-10-22', false, 3, 200)`, [A]));
    await expect(as(A, () => db.query(`insert into public.daily_results (user_id, date, solved, wrong, seconds) values ($1, '2026-10-22', true, 0, 10)`, [A]))).rejects.toThrow(/duplicate key/);
    await as(A, () => db.query(`update public.daily_results set solved = true where user_id = $1`, [A])); // no update policy: 0 rows
    expect((await rows(`select solved from public.daily_results where user_id = $1`, [A]))[0].solved).toBe(false);
    await expect(as(A, () => db.query(`insert into public.daily_results (user_id, date, solved, wrong, seconds) values ($1, '2026-10-21', true, 9, 10)`, [A]))).rejects.toThrow(/check constraint/);
  });

  it('waitlist is closed to everyone but the server', async () => {
    await expect(as(A, () => db.query(`insert into public.waitlist (email) values ('x@example.com')`))).rejects.toThrow(/row-level security/);
    expect(await as(A, () => rows('select * from public.waitlist'))).toEqual([]);
  });

  it('sign-up trigger still works but cannot be called directly by players', async () => {
    const C = '33333333-3333-3333-3333-333333333333';
    for (const role of ['anon', 'authenticated'])
      expect((await rows(`select has_function_privilege('${role}', 'public.handle_new_user()', 'execute') as ok`))[0].ok).toBe(false);
    await db.query(`insert into auth.users (id, email) values ($1, 'c@example.com')`, [C]);
    expect(await rows('select id from public.profiles where id = $1', [C])).toEqual([{ id: C }]);
  });

  it('deleting the account removes all of the player’s data', async () => {
    await db.query(`delete from auth.users where id = $1`, [A]);
    for (const t of ['profiles', 'play_saves', 'daily_results']) {
      const col = t === 'profiles' ? 'id' : 'user_id';
      expect(await rows(`select 1 from public.${t} where ${col} = $1`, [A])).toEqual([]);
    }
    expect(await rows(`select 1 from public.play_saves where user_id = $1`, [B])).toHaveLength(1);
  });
});
