/**
 * Payments migration on PGlite: players can read their own entitlements and payments but never write
 * them; only the service role can grant, and grants are idempotent.
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
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

async function as(user, fn) {
  const role = user === 'service' ? 'service_role' : user ? 'authenticated' : 'anon';
  const sub = user && user !== 'service' ? user : '';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub}', false); set role ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const rows = async (sql, params) => (await db.query(sql, params)).rows;
const grant = (args) =>
  db.query('select public.grant_entitlement($1, $2, $3, $4, $5, $6, $7, $8)', [
    args.user, args.kind, args.caseId ?? null, args.source, args.ref, args.product, args.expires ?? null, args.mode ?? 'extend',
  ]);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of readdirSync(MIGRATIONS).sort()) await db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com');`);
});

describe('payments migration', () => {
  it('players cannot call grant_entitlement or write entitlements themselves', async () => {
    for (const role of ['anon', 'authenticated']) {
      const ok = (await rows(`select has_function_privilege('${role}', 'public.grant_entitlement(uuid,text,text,text,text,text,timestamptz,text)', 'execute') as ok`))[0].ok;
      expect(ok).toBe(false);
    }
    await expect(as(A, () => grant({ user: A, kind: 'pass', source: 'admin', ref: 'x', product: 'pass-annual' }))).rejects.toThrow(/permission denied/);
    await expect(
      as(A, () => db.query(`insert into public.entitlements (user_id, kind, source, source_ref, product_id) values ($1, 'pass', 'admin', 'free', 'pass-annual')`, [A])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(A, () => db.query(`insert into public.payments (user_id, provider, provider_ref, product_id, amount_minor, currency) values ($1, 'stripe', 'x', 'p', 0, 'USD')`, [A])),
    ).rejects.toThrow(/row-level security/);
  });

  it('the service role grants; renewals extend; replays are harmless', async () => {
    await as('service', async () => {
      await grant({ user: A, kind: 'pass', source: 'paystack', ref: 'CUS_a:PLN_m', product: 'pass-monthly', expires: '2026-11-24T00:00:00Z' });
      await grant({ user: A, kind: 'pass', source: 'paystack', ref: 'CUS_a:PLN_m', product: 'pass-monthly', expires: '2026-12-24T00:00:00Z' });
      await grant({ user: A, kind: 'pass', source: 'paystack', ref: 'CUS_a:PLN_m', product: 'pass-monthly', expires: '2026-11-24T00:00:00Z' }); // late replay
    });
    const [row] = await rows(`select expires_at from public.entitlements where source_ref = 'CUS_a:PLN_m'`);
    expect(new Date(row.expires_at).toISOString()).toBe('2026-12-24T00:00:00.000Z');
  });

  it("'set' mode lets the provider shorten a pass (cancellation)", async () => {
    await as('service', async () => {
      await grant({ user: A, kind: 'pass', source: 'stripe', ref: 'sub_1', product: 'pass-annual', expires: '2027-10-23T00:00:00Z', mode: 'set' });
      await grant({ user: A, kind: 'pass', source: 'stripe', ref: 'sub_1', product: 'pass-annual', expires: '2026-10-23T00:00:00Z', mode: 'set' });
    });
    const [row] = await rows(`select expires_at from public.entitlements where source_ref = 'sub_1'`);
    expect(new Date(row.expires_at).toISOString()).toBe('2026-10-23T00:00:00.000Z');
  });

  it('a grant can never move an entitlement to another player', async () => {
    await as('service', () => grant({ user: B, kind: 'pass', source: 'stripe', ref: 'sub_1', product: 'pass-annual', expires: '2030-01-01T00:00:00Z', mode: 'set' }));
    const [row] = await rows(`select user_id, expires_at from public.entitlements where source_ref = 'sub_1'`);
    expect(row.user_id).toBe(A);
    expect(new Date(row.expires_at).getUTCFullYear()).toBe(2026);
  });

  it('case purchases need a case id and never expire', async () => {
    await expect(as('service', () => grant({ user: A, kind: 'case', source: 'stripe', ref: 'pi_x', product: 'case-standard' }))).rejects.toThrow(/check constraint/);
    await as('service', () => grant({ user: A, kind: 'case', caseId: '002-the-last-toast', source: 'stripe', ref: 'pi_1', product: 'case-standard' }));
    const [row] = await rows(`select case_id, expires_at from public.entitlements where source_ref = 'pi_1'`);
    expect(row).toEqual({ case_id: '002-the-last-toast', expires_at: null });
  });

  it('players read only their own entitlements and payments', async () => {
    await as('service', async () => {
      await grant({ user: B, kind: 'case', caseId: '003-checkout-at-room-9', source: 'paystack', ref: 'ref_b', product: 'case-standard' });
      await db.query(`insert into public.payments (user_id, provider, provider_ref, product_id, amount_minor, currency) values ($1, 'paystack', 'ref_b', 'case-standard', 100000, 'NGN')`, [B]);
    });
    expect((await as(A, () => rows('select source_ref from public.entitlements order by source_ref'))).map((r) => r.source_ref)).toEqual(['CUS_a:PLN_m', 'pi_1', 'sub_1']);
    expect(await as(A, () => rows('select * from public.payments'))).toEqual([]);
    expect(await as(B, () => rows('select provider_ref from public.payments'))).toEqual([{ provider_ref: 'ref_b' }]);
    expect(await as(null, () => rows('select * from public.entitlements'))).toEqual([]);
    expect(await as(A, () => rows('select * from public.billing_customers'))).toEqual([]);
  });

  it('deleting an account removes entitlements but keeps the anonymised payment record', async () => {
    await db.query(`delete from auth.users where id = $1`, [B]);
    expect(await rows(`select 1 from public.entitlements where user_id = $1`, [B])).toEqual([]);
    expect(await rows(`select user_id from public.payments where provider_ref = 'ref_b'`)).toEqual([{ user_id: null }]);
  });
});
