import { describe, expect, it } from 'vitest';
import solution from '../../../content/cases/002-the-last-toast/solution.json';
import type { PlayAction, PlayResponse } from '@/lib/view-types';
import type { Access } from '@/server/billing/access';
import { handlePlay } from '@/server/play';

const SLUG = '002-the-last-toast';
type Ok = Extract<PlayResponse, { ok: true }>;
const OWNER: Access = { pass: null, cases: [SLUG] };
const PASS: Access = { pass: { productId: 'pass-monthly', source: 'paystack', expiresAt: null }, cases: [] };

async function ok(action: PlayAction, token: string | undefined, access: Access = OWNER): Promise<Ok> {
  const r = await handlePlay(SLUG, { token, action }, { userId: 'u1', access });
  if (!r.json.ok) throw new Error(`expected ok, got ${r.status} ${r.json.error.code}`);
  return r.json;
}

describe('Case 002: The Last Toast (paid)', () => {
  it('is locked for visitors and for players who have not bought it', async () => {
    const anon = await handlePlay(SLUG, { action: { type: 'start' } }, {});
    expect(anon.status).toBe(402);
    expect(anon.json).toMatchObject({ paywall: { slug: SLUG, title: 'The Last Toast', productId: 'case-standard', signedIn: false } });
    const notBought = await handlePlay(SLUG, { action: { type: 'start' } }, { userId: 'u1', access: { pass: null, cases: ['some-other-case'] } });
    expect(notBought.status).toBe(402);
    expect(JSON.stringify(notBought.json)).not.toContain('Glasshouse');
  });

  it('opens for an owner or a Case Pass holder, with only the initial file visible', async () => {
    for (const access of [OWNER, PASS]) {
      const r = await ok({ type: 'start' }, undefined, access);
      expect(r.view.case.title).toBe('The Last Toast');
      expect(r.view.evidence).toHaveLength(17);
      expect(r.view.evidence.map((e) => e.id)).not.toContain('E-22');
    }
  });

  it('never sends solution text or locked evidence to the browser', async () => {
    const r = await ok({ type: 'start' }, undefined);
    const text = JSON.stringify(r);
    for (const b of solution.breakthroughs) expect(text).not.toContain(b.insight);
    for (const c of solution.confrontations) for (const l of c.revealLines) expect(text).not.toContain(l.text);
    for (const h of solution.hints) expect(text).not.toContain(h.reveal);
    expect(text).not.toContain('J. AJAYI'); // only in the Room B search
    expect(text).not.toContain('née Ajayi'); // only in the business register
    expect(text).not.toContain('"killer":"ronke"');
  });

  it('can be solved through the play API by following the evidence', async () => {
    let s = await ok({ type: 'start' }, undefined);
    const go = async (a: PlayAction) => (s = await ok(a, s.token));
    await go({ type: 'string', a: 'E-06', b: 'E-07', relation: 'contradiction' }); // BT-1 opens lead L4
    await go({ type: 'string', a: 'E-04', b: 'E-05', relation: 'contradiction' }); // BT-2 opens lead L5
    for (const lead of ['L1', 'L2', 'L4', 'L5']) await go({ type: 'lead', leadId: lead });
    await go({ type: 'search', query: 'aso-ebi' });
    await go({ type: 'search', query: 'LD/1187/2019' });
    await go({ type: 'search', query: 'Gold Petal' });
    await go({ type: 'string', a: 'E-18', b: 'E-24', relation: 'link' });
    await go({ type: 'string', a: 'E-14', b: 'E-23', relation: 'contradiction' });
    expect(s.view.breakthroughs.map((b) => b.id)).toEqual(expect.arrayContaining(['BT-1', 'BT-2', 'BT-3', 'BT-4']));
    for (const e of s.view.evidence) if (!s.view.read.includes(e.id)) await go({ type: 'read', evidenceId: e.id });
    const v = await go({
      type: 'verdict',
      answer: { who: { killer: 'ronke' }, how: { method: 'm-flute', when: 'w-1926', trick: 'k-blackout' }, why: { motive: 'y-father' }, proof: ['E-18', 'E-22', 'E-24'] },
    });
    expect(v.result).toMatchObject({ type: 'verdict', correctSections: 4, status: 'solved' });
    expect(v.view.debrief?.solution.who).toBe('Ronke Bello');
  });

  it('a wrong accusation gets only a section count, never which parts were right', async () => {
    let s = await ok({ type: 'start' }, undefined);
    for (const id of ['E-06', 'E-15']) s = await ok({ type: 'read', evidenceId: id }, s.token);
    // A herring verdict built from the opening file: the finance director at the toast.
    const r = await ok(
      { type: 'verdict', answer: { who: { killer: 'tunde' }, how: { method: 'm-bottle', when: 'w-1932', trick: 'k-waiter' }, why: { motive: 'y-audit' }, proof: ['E-05', 'E-06', 'E-07'] } },
      s.token,
    );
    expect(r.result).toEqual({ type: 'verdict', correctSections: 0, accusationsLeft: 2, status: 'active' });
    expect(JSON.stringify(r)).not.toContain('Ronke Bello (née');
  });
});
