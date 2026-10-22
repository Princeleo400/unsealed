import { describe, expect, it } from 'vitest';
import { safeNext, signInErrorMessage } from '@/lib/supabase/config';
import { parseBoard } from '@/lib/board';
import type { PlayAction, PlayResponse } from '@/lib/view-types';
import { validResultDate } from '@/server/daily-results';
import { handlePlay } from '@/server/play';
import { MemorySaveStore, progressScore } from '@/server/saves';

const SLUG = '001-dead-air';
const CASE_ID = '001-dead-air';
type Ok = Extract<PlayResponse, { ok: true }>;

function device(store: MemorySaveStore, userId: string | null) {
  let token: string | undefined;
  const send = async (action: PlayAction): Promise<Ok> => {
    const response = await handlePlay(
      SLUG,
      { token, action },
      userId ? { userId, store } : {},
    );
    if (!response.json.ok) throw new Error(response.json.error.code);
    token = response.json.token;
    return response.json;
  };
  return {
    send,
    get token() {
      return token;
    },
    set token(nextToken: string | undefined) {
      token = nextToken;
    },
  };
}

describe('account sync of case progress', () => {
  it('saves every action for a signed-in player', async () => {
    const store = new MemorySaveStore();
    const session = device(store, 'u1');
    const start = await session.send({ type: 'start' });
    expect(start.sync).toMatchObject({
      signedIn: true,
      source: 'new',
      saved: true,
    });
    await session.send({ type: 'read', evidenceId: 'E-02' });
    expect(store.rows.get(`u1|${CASE_ID}`)?.token).toBe(session.token);
  });

  it('resumes on a second device from the account', async () => {
    const store = new MemorySaveStore();
    const phone = device(store, 'u1');
    await phone.send({ type: 'start' });
    await phone.send({ type: 'read', evidenceId: 'E-02' });
    await phone.send({ type: 'read', evidenceId: 'E-05' });
    await phone.send({
      type: 'string',
      a: 'E-02',
      b: 'E-05',
      relation: 'contradiction',
    });

    const laptop = device(store, 'u1'); // nothing in this browser yet
    const response = await laptop.send({ type: 'start' });
    expect(response.sync?.source).toBe('account');
    expect(
      response.view.breakthroughs.map((breakthrough) => breakthrough.id),
    ).toEqual(['BT-1']);
    expect(response.view.read).toEqual(['E-02', 'E-05']);
  });

  it('uploads progress made before signing in (anonymous → account)', async () => {
    const store = new MemorySaveStore();
    const browser = device(store, null);
    await browser.send({ type: 'start' });
    await browser.send({ type: 'read', evidenceId: 'E-01' });
    expect(store.rows.size).toBe(0); // signed out: nothing stored

    const signedIn = device(store, 'u2');
    signedIn.token = browser.token; // same browser, now signed in
    const response = await signedIn.send({ type: 'start' });
    expect(response.sync?.source).toBe('device');
    expect(response.view.read).toEqual(['E-01']);
    expect(store.rows.get(`u2|${CASE_ID}`)?.token).toBe(signedIn.token);
  });

  it('keeps whichever save is further along', async () => {
    const store = new MemorySaveStore();
    const far = device(store, 'u3');
    await far.send({ type: 'start' });
    for (const id of ['E-01', 'E-02', 'E-03', 'E-04'])
      await far.send({ type: 'read', evidenceId: id });

    const behind = device(new MemorySaveStore(), null); // a different browser that played less, signed out
    await behind.send({ type: 'start' });
    await behind.send({ type: 'read', evidenceId: 'E-05' });

    const merged = device(store, 'u3');
    merged.token = behind.token;
    const response = await merged.send({ type: 'start' });
    expect(response.sync?.source).toBe('account');
    expect(response.view.read).toHaveLength(4);
  });

  it('"Play again" starts clean and overwrites the save', async () => {
    const store = new MemorySaveStore();
    const session = device(store, 'u4');
    await session.send({ type: 'start' });
    await session.send({ type: 'read', evidenceId: 'E-01' });
    session.token = undefined;
    const response = await session.send({ type: 'start', fresh: true });
    expect(response.view.read).toEqual([]);
    const again = await device(store, 'u4').send({ type: 'start' });
    expect(again.view.read).toEqual([]);
  });

  it('ignores a tampered save in the database', async () => {
    const store = new MemorySaveStore();
    store.rows.set(`u5|${CASE_ID}`, { token: 'forged.token', board: {} });
    const response = await device(store, 'u5').send({ type: 'start' });
    expect(response.sync?.source).toBe('new');
    expect(response.view.breakthroughs).toEqual([]);
  });

  it('keeps playing when the database is down', async () => {
    const store = new MemorySaveStore();
    store.failing = true;
    const session = device(store, 'u6');
    const response = await session.send({ type: 'start' });
    expect(response.view.status).toBe('active');
    expect(response.sync?.saved).toBe(false);
    const read = await session.send({ type: 'read', evidenceId: 'E-01' });
    expect(read.view.read).toEqual(['E-01']);
  });

  it('returns the account board with the account save', async () => {
    const store = new MemorySaveStore();
    const session = device(store, 'u7');
    await session.send({ type: 'start' });
    await store.putBoard('u7', CASE_ID, {
      pins: ['E-02'],
      notes: 'hm',
      crossed: [],
      placements: [],
      seenBriefing: true,
    });
    const response = await device(store, 'u7').send({ type: 'start' });
    expect(parseBoard(response.sync?.board)?.pins).toEqual(['E-02']);
  });

  it('scores progress sensibly', () => {
    expect(progressScore(null)).toBe(-1);
  });
});

describe('sign-in safety', () => {
  it('only redirects to same-site paths after sign-in', () => {
    expect(safeNext('/play/001-dead-air')).toBe('/play/001-dead-air');
    expect(safeNext('/daily?date=2026-10-20')).toBe('/daily?date=2026-10-20');
    for (const evil of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'evil',
      '/x\nSet-Cookie: a',
      '',
      null,
      undefined,
    ])
      expect(safeNext(evil as string)).toBe('/');
  });

  it('shows only our own wording for sign-in errors', () => {
    expect(signInErrorMessage('expired')).toMatch(/expired/);
    expect(
      signInErrorMessage('Your account is locked, call +1 555'),
    ).toBeUndefined();
    expect(signInErrorMessage('constructor')).toBeUndefined();
    expect(signInErrorMessage(undefined)).toBeUndefined();
  });

  it('validates synced boards and Daily result dates', () => {
    expect(parseBoard({ pins: ['E-01'], notes: 'x' })?.pins).toEqual(['E-01']);
    expect(parseBoard({ pins: 'nope' })).toBeNull();
    expect(parseBoard({ notes: 'x'.repeat(6000) })).toBeNull();
    const now = new Date('2026-10-23T12:00:00Z');
    expect(validResultDate('2026-10-23', now)).toBe(true);
    expect(validResultDate('2026-10-24', now)).toBe(false);
    expect(validResultDate('2026-09-30', now)).toBe(false);
  });
});
