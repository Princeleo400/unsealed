import { describe, expect, it } from 'vitest';
import solution from '../../../content/cases/001-dead-air/solution.json';
import type { PlayAction, PlayResponse } from '@/lib/view-types';
import { handlePlay } from '@/server/play';

const SLUG = '001-dead-air';
type Ok = Extract<PlayResponse, { ok: true }>;

async function call(action: PlayAction, token?: string) {
  const r = await handlePlay(SLUG, { token, action });
  return { status: r.status, json: r.json };
}
async function ok(action: PlayAction, token?: string): Promise<Ok> {
  const r = await call(action, token);
  if (!r.json.ok) throw new Error(`expected ok, got ${r.status} ${r.json.error.code}`);
  return r.json;
}

describe('play API', () => {
  it('starts a fresh case with only the initial file visible', async () => {
    const r = await ok({ type: 'start' });
    expect(r.view.evidence).toHaveLength(15);
    expect(r.view.evidence.map((e) => e.id)).not.toContain('E-17');
    expect(r.view.status).toBe('active');
    expect(r.sync).toEqual({ signedIn: false, source: 'new', saved: false });
  });

  it('never sends solution data or locked evidence to the browser', async () => {
    const r = await ok({ type: 'start' });
    const text = JSON.stringify(r);
    for (const b of solution.breakthroughs) expect(text).not.toContain(b.insight);
    for (const c of solution.confrontations) for (const l of c.revealLines) expect(text).not.toContain(l.text);
    for (const h of solution.hints) expect(text).not.toContain(h.reveal);
    expect(text).not.toContain('VT_THANDI_EASTER_02'); // only inside search-gated E-17
    expect(text).not.toContain('Sole director'); // only inside E-19
    expect(text).not.toContain('"killer":"marguerite"');
    const trick = r.view.case.verdict.how.find((b) => b.blankId === 'trick')!;
    expect(trick.options.map((o) => o.id)).not.toContain('k-vt');
  });

  it('rejects tampered or missing session tokens', async () => {
    const r = await ok({ type: 'start' });
    const [body, mac] = r.token.split('.');
    const state = JSON.parse(Buffer.from(body!, 'base64url').toString());
    state.breakthroughs = ['BT-1', 'BT-2', 'BT-3', 'BT-4'];
    state.unlocked.push('search:E-17');
    const forged = `${Buffer.from(JSON.stringify(state)).toString('base64url')}.${mac}`;
    expect((await call({ type: 'view' }, forged)).status).toBe(409);
    expect((await call({ type: 'view' })).status).toBe(409);
    expect((await ok({ type: 'start' }, forged)).view.breakthroughs).toEqual([]); // start quietly begins again
  });

  it('validates input and unknown cases', async () => {
    expect((await handlePlay('nope', { action: { type: 'start' } })).status).toBe(404);
    expect((await handlePlay(SLUG, { action: { type: 'hack' } })).status).toBe(400);
  });

  it('returns engine errors as 422 with the unchanged state', async () => {
    const t = (await ok({ type: 'start' })).token;
    const r = await call({ type: 'read', evidenceId: 'E-17' }, t);
    expect(r.status).toBe(422);
    expect(r.json.ok).toBe(false);
  });

  it('gives 1 free hint, then needs a rewarded video for up to 3 more', async () => {
    let t = (await ok({ type: 'start' })).token;
    const first = await ok({ type: 'hint', tier: 'nudge' }, t);
    expect(first.view.hintAllowance).toEqual({ freeLeft: 0, adLeft: 3, unlimited: false });
    t = first.token;
    const noAd = await call({ type: 'hint', tier: 'nudge' }, t);
    expect(noAd.status).toBe(422);
    expect(!noAd.json.ok && noAd.json.error.code).toBe('ad_required');
    for (let i = 0; i < 3; i++) t = (await ok({ type: 'hint', tier: 'pointer', adReward: { provider: 'gam', id: `ad${i}` } }, t)).token;
    const over = await call({ type: 'hint', tier: 'nudge', adReward: { provider: 'gam', id: 'ad9' } }, t);
    expect(!over.json.ok && over.json.error.code).toBe('hint_limit');
  });

  it('can be solved end to end through the API, and only then shows the debrief', async () => {
    let t = (await ok({ type: 'start' })).token;
    for (const id of ['E-02', 'E-03', 'E-05', 'E-06', 'E-07', 'E-09']) t = (await ok({ type: 'read', evidenceId: id }, t)).token;

    const s1 = await ok({ type: 'string', a: 'E-02', b: 'E-05', relation: 'contradiction' }, t);
    expect(s1.result).toMatchObject({ type: 'string', valid: true, breakthrough: { id: 'BT-1' } });
    t = s1.token;

    const search = await ok({ type: 'search', query: 'VT' }, t);
    expect(search.result).toMatchObject({ type: 'search', results: [{ id: 'E-17' }] });
    expect(search.unlocked.map((u) => u.id)).toEqual(['E-17']);
    t = search.token;

    t = (await ok({ type: 'string', a: 'E-06', b: 'E-07', relation: 'contradiction' }, t)).token;
    t = (await ok({ type: 'string', a: 'E-17', b: 'E-04', relation: 'corroboration' }, t)).token;
    const lead = await ok({ type: 'lead', leadId: 'L2' }, t);
    expect(lead.unlocked.map((u) => u.id)).toEqual(['E-18']);
    t = lead.token;
    const c = await ok({ type: 'confront', statementId: 'E-09', line: 4, evidenceId: 'E-18' }, t);
    expect(c.result).toMatchObject({ type: 'confront', valid: true });
    t = c.token;
    for (const id of ['E-17', 'E-18', 'E-24']) t = (await ok({ type: 'read', evidenceId: id }, t)).token;

    const answer = { how: { method: 'm-plaque', time: 't-0030', trick: 'k-vt' }, why: { motive: 'y-fraud' } };
    const wrong = await ok({ type: 'verdict', answer: { who: { killer: 'sipho' }, ...answer, proof: ['E-17', 'E-04', 'E-09'] } }, t);
    expect(wrong.result).toEqual({ type: 'verdict', correctSections: 3, accusationsLeft: 2, status: 'active' });
    expect(wrong.view.debrief).toBeUndefined();
    t = wrong.token;

    const right = await ok({ type: 'verdict', answer: { who: { killer: 'marguerite' }, ...answer, proof: ['E-17', 'E-04', 'E-24'] } }, t);
    expect(right.view.status).toBe('solved');
    expect(right.view.debrief?.solution.who).toBe('Marguerite Vos');
    expect(right.view.debrief?.score.total).toBeGreaterThan(0);
  });
});
