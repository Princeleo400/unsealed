import { describe, expect, it } from 'vitest';
import solution from '../../../content/cases/002-the-last-toast/solution.json';
import type { PlayAction, PlayResponse } from '@/lib/view-types';
import type { Access } from '@/server/billing/access';
import { handlePlay } from '@/server/play';

const SLUG = '002-the-last-toast';
type Ok = Extract<PlayResponse, { ok: true }>;
const OWNER: Access = { pass: null, cases: [SLUG] };
const PASS: Access = {
  pass: { productId: 'pass-monthly', source: 'paystack', expiresAt: null },
  cases: [],
};

async function ok(
  action: PlayAction,
  token: string | undefined,
  access: Access = OWNER,
): Promise<Ok> {
  const response = await handlePlay(
    SLUG,
    { token, action },
    { userId: 'u1', access },
  );
  if (!response.json.ok)
    throw new Error(
      `expected ok, got ${response.status} ${response.json.error.code}`,
    );
  return response.json;
}

describe('Case 002: The Last Toast (paid)', () => {
  it('is locked for visitors and for players who have not bought it', async () => {
    const anon = await handlePlay(SLUG, { action: { type: 'start' } }, {});
    expect(anon.status).toBe(402);
    expect(anon.json).toMatchObject({
      paywall: {
        slug: SLUG,
        title: 'The Last Toast',
        productId: 'case-standard',
        signedIn: false,
      },
    });
    const notBought = await handlePlay(
      SLUG,
      { action: { type: 'start' } },
      { userId: 'u1', access: { pass: null, cases: ['some-other-case'] } },
    );
    expect(notBought.status).toBe(402);
    expect(JSON.stringify(notBought.json)).not.toContain('Glasshouse');
  });

  it('opens for an owner or a Case Pass holder, with only the initial file visible', async () => {
    for (const access of [OWNER, PASS]) {
      const response = await ok({ type: 'start' }, undefined, access);
      expect(response.view.case.title).toBe('The Last Toast');
      expect(response.view.evidence).toHaveLength(17);
      expect(
        response.view.evidence.map((evidence) => evidence.id),
      ).not.toContain('E-22');
    }
  });

  it('never sends solution text or locked evidence to the browser', async () => {
    const response = await ok({ type: 'start' }, undefined);
    const text = JSON.stringify(response);
    for (const breakthrough of solution.breakthroughs)
      expect(text).not.toContain(breakthrough.insight);
    for (const confrontation of solution.confrontations)
      for (const line of confrontation.revealLines)
        expect(text).not.toContain(line.text);
    for (const hint of solution.hints) expect(text).not.toContain(hint.reveal);
    expect(text).not.toContain('J. AJAYI'); // only in the Room B search
    expect(text).not.toContain('née Ajayi'); // only in the business register
    expect(text).not.toContain('"killer":"ronke"');
  });

  it('can be solved through the play API by following the evidence', async () => {
    let response = await ok({ type: 'start' }, undefined);
    const go = async (breakthrough: PlayAction) =>
      (response = await ok(breakthrough, response.token));
    await go({
      type: 'string',
      a: 'E-06',
      b: 'E-07',
      relation: 'contradiction',
    }); // BT-1 opens lead L4
    await go({
      type: 'string',
      a: 'E-04',
      b: 'E-05',
      relation: 'contradiction',
    }); // BT-2 opens lead L5
    for (const lead of ['L1', 'L2', 'L4', 'L5'])
      await go({ type: 'lead', leadId: lead });
    await go({ type: 'search', query: 'aso-ebi' });
    await go({ type: 'search', query: 'LD/1187/2019' });
    await go({ type: 'search', query: 'Gold Petal' });
    await go({ type: 'string', a: 'E-18', b: 'E-24', relation: 'link' });
    await go({
      type: 'string',
      a: 'E-14',
      b: 'E-23',
      relation: 'contradiction',
    });
    expect(
      response.view.breakthroughs.map((breakthrough) => breakthrough.id),
    ).toEqual(expect.arrayContaining(['BT-1', 'BT-2', 'BT-3', 'BT-4']));
    for (const evidence of response.view.evidence)
      if (!response.view.read.includes(evidence.id))
        await go({ type: 'read', evidenceId: evidence.id });
    const verdictResponse = await go({
      type: 'verdict',
      answer: {
        who: { killer: 'ronke' },
        how: { method: 'm-flute', when: 'w-1926', trick: 'k-blackout' },
        why: { motive: 'y-father' },
        proof: ['E-18', 'E-22', 'E-24'],
      },
    });
    expect(verdictResponse.result).toMatchObject({
      type: 'verdict',
      correctSections: 4,
      status: 'solved',
    });
    expect(verdictResponse.view.debrief?.solution.who).toBe('Ronke Bello');
  });

  it('a wrong accusation gets only a section count, never which parts were right', async () => {
    let response = await ok({ type: 'start' }, undefined);
    for (const id of ['E-06', 'E-15'])
      response = await ok({ type: 'read', evidenceId: id }, response.token);
    // A herring verdict built from the opening file: the finance director at the toast.
    const verdictResponse = await ok(
      {
        type: 'verdict',
        answer: {
          who: { killer: 'tunde' },
          how: { method: 'm-bottle', when: 'w-1932', trick: 'k-waiter' },
          why: { motive: 'y-audit' },
          proof: ['E-05', 'E-06', 'E-07'],
        },
      },
      response.token,
    );
    expect(verdictResponse.result).toEqual({
      type: 'verdict',
      correctSections: 0,
      accusationsLeft: 2,
      status: 'active',
    });
    expect(JSON.stringify(verdictResponse)).not.toContain('Ronke Bello (née');
  });
});
