import { describe, expect, it } from 'vitest';
import {
  checkString,
  confront,
  followLead,
  searchArchive,
  submitVerdict,
} from '../src/actions';
import { correctAnswer, playGoldenPath, runGolden } from '../src/golden';
import { explore, lintCase } from '../src/lint';
import { computeScore, rankFor } from '../src/scoring';
import { newSession, type SessionState } from '../src/state';
import { buildTimeline, findConflicts } from '../src/timeline';
import { pub, rawPub, rawSol, sol } from './fixtures';

/** The shortest sensible route: 1 lead, 1 search, 4 essential strings, 1 confrontation. */
function efficientSolve(): SessionState {
  let sessionState = newSession(pub);
  sessionState = followLead(pub, sessionState, 'L2').state;
  sessionState = searchArchive(pub, sol, sessionState, 'VT').state;
  sessionState = checkString(
    pub,
    sol,
    sessionState,
    'E-02',
    'E-05',
    'contradiction',
  ).state;
  sessionState = checkString(
    pub,
    sol,
    sessionState,
    'E-06',
    'E-07',
    'contradiction',
  ).state;
  sessionState = checkString(
    pub,
    sol,
    sessionState,
    'E-17',
    'E-04',
    'corroboration',
  ).state;
  sessionState = checkString(
    pub,
    sol,
    sessionState,
    'E-09',
    'E-04',
    'contradiction',
  ).state;
  sessionState = confront(pub, sol, sessionState, 'E-09', 4, 'E-18').state;
  sessionState = {
    ...sessionState,
    read: pub.evidence.map((evidence) => evidence.id),
  };
  return submitVerdict(pub, sol, sessionState, correctAnswer(pub, sol)).state;
}

describe('scoring (GDD §7)', () => {
  it('par is achievable: the efficient route earns Sharp + Swift + Unassisted', () => {
    const sessionState = efficientSolve();
    expect(sessionState.clockMinutes).toBe(160);
    expect(sessionState.clockMinutes).toBeLessThanOrEqual(pub.parHours * 60);
    const score = computeScore(sessionState, sol, pub.parHours);
    expect(score.badges).toEqual(['sharp', 'swift', 'unassisted']);
    expect(score.total).toBe(1000); // 600 + 200 + 200 + 4×5, capped at 1000
  });

  it('applies second-accusation, overtime and hint penalties', () => {
    const base = efficientSolve();
    const sessionState: SessionState = {
      ...base,
      clockMinutes: pub.parHours * 60 + 61, // 2 started hours over par
      hints: { nudge: 1, pointer: 1, reveal: 0 },
      accusations: [{ correctSections: 2 }, { correctSections: 4 }],
    };
    const score = computeScore(sessionState, sol, pub.parHours);
    expect(score.accusation).toBe(100);
    expect(score.time).toBe(160);
    expect(score.hints).toBe(-40);
    expect(score.total).toBe(600 + 100 + 160 - 40 + 20);
    expect(score.badges).toEqual([]);
  });

  it('gives a cold case only breakthrough points', () => {
    const sessionState: SessionState = {
      ...newSession(pub),
      status: 'cold',
      breakthroughs: ['BT-1', 'BT-2'],
    };
    expect(computeScore(sessionState, sol, 5)).toMatchObject({
      total: 10,
      badges: [],
    });
  });

  it('maps XP to ranks', () => {
    expect(rankFor(0)).toBe('Rookie');
    expect(rankFor(1499)).toBe('Constable');
    expect(rankFor(1500)).toBe('Sergeant');
    expect(rankFor(10 ** 6)).toBe('Legend');
  });
});

describe('timeline (FR-TIME-01..03)', () => {
  it('only shows timestamps from read evidence, in order', () => {
    const session = { ...newSession(pub), read: ['E-05', 'E-04'] };
    const event = buildTimeline(pub, session);
    expect(event[0]?.label).toBe('Sipho badges in');
    expect(
      event.every((ev, index) => index === 0 || event[index - 1]!.at <= ev.at),
    ).toBe(true);
    expect(event.some((ev) => ev.evidenceId === 'E-02')).toBe(false);
  });

  it("flags Marguerite's statement against the keycard log", () => {
    const session = { ...newSession(pub), read: ['E-04', 'E-09'] };
    const conflicts = findConflicts(pub, session, []);
    expect(
      conflicts.some((conflict) => conflict.suspectId === 'marguerite'),
    ).toBe(true);
    expect(conflicts.some((conflict) => conflict.suspectId === 'lena')).toBe(
      false,
    );
  });

  it('flags player placements that clash', () => {
    const session = { ...newSession(pub), read: ['E-20'] };
    const conflicts = findConflicts(pub, session, [
      { suspectId: 'sipho', at: '2026-03-06T00:32', place: 'Studio B' },
    ]);
    expect(conflicts).toHaveLength(1);
  });
});

describe('case linter and golden path (FR-ADMIN-01/02, NFR-11)', () => {
  it('Case 001 lints clean', () => {
    const { issues } = lintCase(rawPub(), rawSol());
    expect(issues).toEqual([]);
  });

  it('Case 001 is solvable end to end', () => {
    const outcome = runGolden(rawPub(), rawSol());
    expect(outcome.ok).toBe(true);
    const run = playGoldenPath(pub, sol);
    expect(run.state.breakthroughs).toHaveLength(sol.breakthroughs.length);
  });

  it('every item is reachable', () => {
    expect(explore(pub, sol).visible.size).toBe(pub.evidence.length);
  });

  it('catches broken content', () => {
    const publicCase = rawPub();
    const solutionFile = rawSol();
    publicCase.evidence.find(
      (evidence: { id: string }) => evidence.id === 'E-07',
    ).body.scene = 'A blank wall.';
    publicCase.evidence.find(
      (evidence: { id: string }) => evidence.id === 'E-07',
    ).body.caption = 'Wall.';
    solutionFile.breakthroughs.push({
      id: 'BT-9',
      a: 'E-01',
      b: 'E-99',
      relation: 'link',
      essential: true,
      order: 9,
      insight: 'x',
    });
    solutionFile.verdict.who.killer = 'nobody';
    solutionFile.verdict.proof.core.push('E-98');
    publicCase.words.find(
      (word: { id: string }) => word.id === 'k-vt',
    ).revealedBy = [];
    publicCase.evidence.push({ ...publicCase.evidence[0], id: 'E-01' });
    const codes = lintCase(publicCase, solutionFile).issues.map(
      (lintIssue) => lintIssue.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        'bad_breakthrough',
        'bad_verdict',
        'bad_proof',
        'dup_evidence',
        'dup_number',
        'missing_hint',
        'free_answer',
      ]),
    );
  });

  it('flags undiscoverable search terms and unreachable items', () => {
    const publicCase = rawPub();
    const solutionFile = rawSol();
    solutionFile.archiveIndex.find(
      (archiveEntry: { evidenceId: string }) =>
        archiveEntry.evidenceId === 'E-23',
    ).terms = ['ZZ 000-000'];
    const codes = lintCase(publicCase, solutionFile).issues.map(
      (lintIssue) => lintIssue.code,
    );
    expect(codes).toContain('search_undiscoverable');
    expect(codes).toContain('unreachable_evidence');
  });

  it('reports schema errors and id/version mismatch', () => {
    expect(lintCase({}, {}).issues.length).toBeGreaterThan(0);
    const solutionFile = rawSol();
    solutionFile.version = 2;
    solutionFile.caseId = 'other';
    const codes = lintCase(rawPub(), solutionFile).issues.map(
      (lintIssue) => lintIssue.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining(['version_mismatch', 'id_mismatch']),
    );
  });

  it('rejects markdown tables the evidence viewer cannot render', () => {
    const publicCase = rawPub();
    publicCase.evidence.find(
      (evidence: { id: string }) => evidence.id === 'E-01',
    ).body.markdown += '\n\n| Time | Event |\n|---|---|\n| 01:00 | x |';
    expect(
      lintCase(publicCase, rawSol()).issues.map((lintIssue) => lintIssue.code),
    ).toContain('unsupported_markdown');
  });

  it('detects a solution leak into the public file', () => {
    const publicCase = rawPub();
    publicCase.briefing += ' ' + sol.breakthroughs[0]!.insight;
    expect(
      lintCase(publicCase, rawSol()).issues.map((lintIssue) => lintIssue.code),
    ).toContain('leak');
  });
});
