import { describe, expect, it } from 'vitest';
import { newSession } from '@unsealed/engine';
import { playGoldenPath } from '../../../packages/engine/src/golden';
import { issueTicket } from '@/server/bonus';
import { getCase } from '@/server/cases';
import { dailyView, handleDaily } from '@/server/daily';
import { signState } from '@/server/session';
import { createShare, readShare } from '@/server/share';

const NOW = new Date('2026-10-23T12:00:00Z');
const TODAY = '2026-10-23';

const tokenOf = (result: ReturnType<typeof createShare>) => {
  if (!result.json.ok) throw new Error(result.json.message);
  return result.json.token;
};

describe('share cards', () => {
  it('a case card is built from the signed play state and never names the killer', () => {
    const loaded = getCase('001-dead-air')!;
    const { state } = playGoldenPath(loaded.pub, loaded.sol);
    const result = createShare(
      { kind: 'case', caseId: loaded.pub.id, token: signState(state) },
      NOW,
    );
    const card = readShare(tokenOf(result))!;
    expect(card).toMatchObject({ kind: 'case', solved: true, accusations: 1 });
    // Spoiler-free: no suspect is named on the card at all.
    for (const suspect of loaded.pub.suspects)
      expect(JSON.stringify(card)).not.toContain(suspect.name);
  });

  it('refuses unfinished cases and forged play states', () => {
    const loaded = getCase('001-dead-air')!;
    const fresh = signState(newSession(loaded.pub));
    expect(
      createShare({ kind: 'case', caseId: loaded.pub.id, token: fresh }).status,
    ).toBe(409);
    const [, mac] = fresh.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ ...newSession(loaded.pub), status: 'solved' }),
    ).toString('base64url');
    expect(
      createShare({
        kind: 'case',
        caseId: loaded.pub.id,
        token: `${forgedBody}.${mac}`,
      }).status,
    ).toBe(404);
  });

  it('a Daily card says solved only with the server’s proof', () => {
    const view = dailyView(TODAY, NOW);
    // Find the right answer by asking the grader (the answer is not in the view).
    let proof: string | undefined;
    for (let suspect = 0; suspect < view.suspects.length && !proof; suspect++)
      for (let place = 0; place < view.places.length && !proof; place++) {
        const graded = handleDaily(
          { type: 'answer', date: TODAY, suspect, place },
          NOW,
        );
        if (graded.json.ok && graded.json.correct) proof = graded.json.proof;
      }
    expect(proof).toBeTruthy();
    const solved = readShare(
      tokenOf(
        createShare(
          { kind: 'daily', date: TODAY, proof, wrong: 1, seconds: 151 },
          NOW,
        ),
      ),
    );
    expect(solved).toMatchObject({
      label: `Daily Brief #${view.number}`,
      solved: true,
      wrong: 1,
      seconds: 151,
    });
    const claimed = readShare(
      tokenOf(
        createShare(
          {
            kind: 'daily',
            date: TODAY,
            proof: 'made-up',
            wrong: 0,
            seconds: 5,
          },
          NOW,
        ),
      ),
    );
    expect(claimed).toMatchObject({ solved: false, wrong: 3 });
    // A proof for another day doesn't count.
    const otherDay = readShare(
      tokenOf(
        createShare(
          { kind: 'daily', date: '2026-10-22', proof, wrong: 0, seconds: 5 },
          NOW,
        ),
      ),
    );
    expect(otherDay?.solved).toBe(false);
  });

  it('Bonus Brief cards and bad share tokens', () => {
    const ticket = issueTicket(
      'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      'chief',
      NOW,
    );
    const card = readShare(
      tokenOf(
        createShare({ kind: 'daily', ticket, wrong: 3, seconds: 90 }, NOW),
      ),
    );
    expect(card).toMatchObject({ label: 'Bonus Brief', difficulty: 'Chief' });
    expect(
      createShare(
        { kind: 'daily', date: '2030-01-01', wrong: 0, seconds: 1 },
        NOW,
      ).status,
    ).toBe(404);
    expect(readShare('garbage')).toBeNull();
    expect(readShare(ticket)).toBeNull(); // a ticket is not a share token
  });
});
