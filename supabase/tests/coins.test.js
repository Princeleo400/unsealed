/**
 * Coins migration on PGlite: only the service role changes coins, changes are idempotent,
 * daily caps hold, balances never go negative, and players read only their own.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

const MIGRATIONS = join(import.meta.dirname, '../migrations');
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
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

async function as(user, work) {
  const role =
    user === 'service' ? 'service_role' : user ? 'authenticated' : 'anon';
  const subject = user && user !== 'service' ? user : '';
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${subject}', false); set role ${role};`,
  );
  try {
    return await work();
  } finally {
    await db.exec(
      `reset role; select set_config('request.jwt.claim.sub', '', false);`,
    );
  }
}
const apply = async (
  user,
  delta,
  reason,
  ref,
  day = '2026-10-23',
  cap = null,
) =>
  (
    await db.query(
      'select public.coin_apply($1, $2, $3, $4, $5, $6) as result',
      [user, delta, reason, ref, day, cap],
    )
  ).rows[0].result;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const migrationFile of readdirSync(MIGRATIONS).sort())
    await db.exec(readFileSync(join(MIGRATIONS, migrationFile), 'utf8'));
  await db.exec(
    `insert into auth.users (id, email) values ('${USER_A}', 'a@example.com'), ('${USER_B}', 'b@example.com');`,
  );
});

describe('coins migration', () => {
  it('players cannot change coins themselves', async () => {
    for (const role of ['anon', 'authenticated']) {
      const row = (
        await db.query(
          `select has_function_privilege('${role}', 'public.coin_apply(uuid,integer,text,text,date,integer)', 'execute') as allowed`,
        )
      ).rows[0];
      expect(row.allowed).toBe(false);
    }
    await expect(
      as(USER_A, () => apply(USER_A, 50, 'admin', 'free')),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(USER_A, () =>
        db.query(
          `insert into public.coin_wallets (user_id, balance) values ($1, 999)`,
          [USER_A],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('a daily login is paid once, however often it is claimed', async () => {
    await as('service', async () => {
      expect(await apply(USER_A, 1, 'daily_login', '2026-10-23')).toEqual({
        status: 'applied',
        balance: 1,
      });
      expect(await apply(USER_A, 1, 'daily_login', '2026-10-23')).toEqual({
        status: 'duplicate',
        balance: 1,
      });
    });
  });

  it('ad rewards stop at the daily cap', async () => {
    await as('service', async () => {
      for (let adNumber = 1; adNumber <= 3; adNumber++)
        expect(
          (
            await apply(
              USER_A,
              1,
              'ad',
              `2026-10-23:ad${adNumber}`,
              '2026-10-23',
              3,
            )
          ).status,
        ).toBe('applied');
      expect(
        await apply(USER_A, 1, 'ad', '2026-10-23:ad4', '2026-10-23', 3),
      ).toEqual({ status: 'cap', balance: 4 });
      // A new day resets the cap.
      expect(
        (await apply(USER_A, 1, 'ad', '2026-10-24:ad1', '2026-10-24', 3))
          .status,
      ).toBe('applied');
    });
  });

  it('spending can never take the balance below zero', async () => {
    await as('service', async () => {
      expect(await apply(USER_B, -1, 'bonus_spend', 'seed1')).toEqual({
        status: 'insufficient',
        balance: 0,
      });
      await apply(USER_B, 1, 'daily_login', '2026-10-23');
      expect(await apply(USER_B, -1, 'bonus_spend', 'seed1')).toEqual({
        status: 'applied',
        balance: 0,
      });
      expect(await apply(USER_B, -1, 'bonus_spend', 'seed1')).toEqual({
        status: 'duplicate',
        balance: 0,
      });
    });
  });

  it('players read only their own wallet and ledger', async () => {
    expect(
      await as(
        USER_A,
        async () =>
          (await db.query('select balance from public.coin_wallets')).rows,
      ),
    ).toEqual([{ balance: 5 }]);
    const ledger = await as(
      USER_B,
      async () =>
        (await db.query('select reason from public.coin_ledger order by id'))
          .rows,
    );
    expect(ledger.map((row) => row.reason)).toEqual([
      'daily_login',
      'bonus_spend',
    ]);
    expect(
      await as(
        null,
        async () => (await db.query('select * from public.coin_wallets')).rows,
      ),
    ).toEqual([]);
  });

  it('deleting the account deletes its coins', async () => {
    await db.query('delete from auth.users where id = $1', [USER_B]);
    expect(
      (
        await db.query('select 1 from public.coin_ledger where user_id = $1', [
          USER_B,
        ])
      ).rows,
    ).toEqual([]);
    expect(
      (
        await db.query('select 1 from public.coin_wallets where user_id = $1', [
          USER_B,
        ])
      ).rows,
    ).toEqual([]);
  });
});
