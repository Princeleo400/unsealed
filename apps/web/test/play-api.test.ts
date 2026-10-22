import { describe, expect, it } from 'vitest';
import solution from '../../../content/cases/001-dead-air/solution.json';
import type { PlayAction, PlayResponse } from '@/lib/view-types';
import { handlePlay } from '@/server/play';

const SLUG = '001-dead-air';
type Ok = Extract<PlayResponse, { ok: true }>;

async function call(action: PlayAction, token?: string) {
  const response = await handlePlay(SLUG, { token, action });
  return { status: response.status, json: response.json };
}
async function ok(action: PlayAction, token?: string): Promise<Ok> {
  const response = await call(action, token);
  if (!response.json.ok)
    throw new Error(
      `expected ok, got ${response.status} ${response.json.error.code}`,
    );
  return response.json;
}

describe('play API', () => {
  it('starts a fresh case with only the initial file visible', async () => {
    const response = await ok({ type: 'start' });
    expect(response.view.evidence).toHaveLength(15);
    expect(response.view.evidence.map((evidence) => evidence.id)).not.toContain(
      'E-17',
    );
    expect(response.view.status).toBe('active');
    expect(response.sync).toEqual({
      signedIn: false,
      source: 'new',
      saved: false,
    });
  });

  it('never sends solution data or locked evidence to the browser', async () => {
    const response = await ok({ type: 'start' });
    const text = JSON.stringify(response);
    for (const breakthrough of solution.breakthroughs)
      expect(text).not.toContain(breakthrough.insight);
    for (const confrontation of solution.confrontations)
      for (const line of confrontation.revealLines)
        expect(text).not.toContain(line.text);
    for (const hint of solution.hints) expect(text).not.toContain(hint.reveal);
    expect(text).not.toContain('VT_THANDI_EASTER_02'); // only inside search-gated E-17
    expect(text).not.toContain('Sole director'); // only inside E-19
    expect(text).not.toContain('"killer":"marguerite"');
    const trick = response.view.case.verdict.how.find(
      (blank) => blank.blankId === 'trick',
    )!;
    expect(trick.options.map((option) => option.id)).not.toContain('k-vt');
  });

  it('rejects tampered or missing session tokens', async () => {
    const response = await ok({ type: 'start' });
    const [body, mac] = response.token.split('.');
    const state = JSON.parse(Buffer.from(body!, 'base64url').toString());
    state.breakthroughs = ['BT-1', 'BT-2', 'BT-3', 'BT-4'];
    state.unlocked.push('search:E-17');
    const forged = `${Buffer.from(JSON.stringify(state)).toString('base64url')}.${mac}`;
    expect((await call({ type: 'view' }, forged)).status).toBe(409);
    expect((await call({ type: 'view' })).status).toBe(409);
    expect((await ok({ type: 'start' }, forged)).view.breakthroughs).toEqual(
      [],
    ); // start quietly begins again
  });

  it('validates input and unknown cases', async () => {
    expect(
      (await handlePlay('nope', { action: { type: 'start' } })).status,
    ).toBe(404);
    expect((await handlePlay(SLUG, { action: { type: 'hack' } })).status).toBe(
      400,
    );
  });

  it('returns engine errors as 422 with the unchanged state', async () => {
    const token = (await ok({ type: 'start' })).token;
    const response = await call({ type: 'read', evidenceId: 'E-17' }, token);
    expect(response.status).toBe(422);
    expect(response.json.ok).toBe(false);
  });

  it('gives 1 free hint, then needs a rewarded video for up to 3 more', async () => {
    let token = (await ok({ type: 'start' })).token;
    const first = await ok({ type: 'hint', tier: 'nudge' }, token);
    expect(first.view.hintAllowance).toEqual({
      freeLeft: 0,
      adLeft: 3,
      unlimited: false,
    });
    token = first.token;
    const noAd = await call({ type: 'hint', tier: 'nudge' }, token);
    expect(noAd.status).toBe(422);
    expect(!noAd.json.ok && noAd.json.error.code).toBe('ad_required');
    for (let index = 0; index < 3; index++)
      token = (
        await ok(
          {
            type: 'hint',
            tier: 'pointer',
            adReward: { provider: 'gam', id: `ad${index}` },
          },
          token,
        )
      ).token;
    const over = await call(
      { type: 'hint', tier: 'nudge', adReward: { provider: 'gam', id: 'ad9' } },
      token,
    );
    expect(!over.json.ok && over.json.error.code).toBe('hint_limit');
  });

  it('can be solved end to end through the API, and only then shows the debrief', async () => {
    let token = (await ok({ type: 'start' })).token;
    for (const id of ['E-02', 'E-03', 'E-05', 'E-06', 'E-07', 'E-09'])
      token = (await ok({ type: 'read', evidenceId: id }, token)).token;

    const s1 = await ok(
      { type: 'string', a: 'E-02', b: 'E-05', relation: 'contradiction' },
      token,
    );
    expect(s1.result).toMatchObject({
      type: 'string',
      valid: true,
      breakthrough: { id: 'BT-1' },
    });
    token = s1.token;

    const search = await ok({ type: 'search', query: 'VT' }, token);
    expect(search.result).toMatchObject({
      type: 'search',
      results: [{ id: 'E-17' }],
    });
    expect(search.unlocked.map((evidenceBrief) => evidenceBrief.id)).toEqual([
      'E-17',
    ]);
    token = search.token;

    token = (
      await ok(
        { type: 'string', a: 'E-06', b: 'E-07', relation: 'contradiction' },
        token,
      )
    ).token;
    token = (
      await ok(
        { type: 'string', a: 'E-17', b: 'E-04', relation: 'corroboration' },
        token,
      )
    ).token;
    const lead = await ok({ type: 'lead', leadId: 'L2' }, token);
    expect(lead.unlocked.map((evidenceBrief) => evidenceBrief.id)).toEqual([
      'E-18',
    ]);
    token = lead.token;
    const response = await ok(
      { type: 'confront', statementId: 'E-09', line: 4, evidenceId: 'E-18' },
      token,
    );
    expect(response.result).toMatchObject({ type: 'confront', valid: true });
    token = response.token;
    for (const id of ['E-17', 'E-18', 'E-24'])
      token = (await ok({ type: 'read', evidenceId: id }, token)).token;

    const answer = {
      how: { method: 'm-plaque', time: 't-0030', trick: 'k-vt' },
      why: { motive: 'y-fraud' },
    };
    const wrong = await ok(
      {
        type: 'verdict',
        answer: {
          who: { killer: 'sipho' },
          ...answer,
          proof: ['E-17', 'E-04', 'E-09'],
        },
      },
      token,
    );
    expect(wrong.result).toEqual({
      type: 'verdict',
      correctSections: 3,
      accusationsLeft: 2,
      status: 'active',
    });
    expect(wrong.view.debrief).toBeUndefined();
    token = wrong.token;

    const right = await ok(
      {
        type: 'verdict',
        answer: {
          who: { killer: 'marguerite' },
          ...answer,
          proof: ['E-17', 'E-04', 'E-24'],
        },
      },
      token,
    );
    expect(right.view.status).toBe('solved');
    expect(right.view.debrief?.solution.who).toBe('Marguerite Vos');
    expect(right.view.debrief?.score.total).toBeGreaterThan(0);
  });
});
