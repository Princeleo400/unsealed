import { describe, expect, it } from 'vitest';
import { checkString, confront, followLead, searchArchive, submitVerdict } from '../src/actions';
import { correctAnswer, playGoldenPath, runGolden } from '../src/golden';
import { explore, lintCase } from '../src/lint';
import { computeScore, rankFor } from '../src/scoring';
import { newSession, type SessionState } from '../src/state';
import { buildTimeline, findConflicts } from '../src/timeline';
import { pub, rawPub, rawSol, sol } from './fixtures';

/** The shortest sensible route: 1 lead, 1 search, 4 essential strings, 1 confrontation. */
function efficientSolve(): SessionState {
  let s = newSession(pub);
  s = followLead(pub, s, 'L2').state;
  s = searchArchive(pub, sol, s, 'VT').state;
  s = checkString(pub, sol, s, 'E-02', 'E-05', 'contradiction').state;
  s = checkString(pub, sol, s, 'E-06', 'E-07', 'contradiction').state;
  s = checkString(pub, sol, s, 'E-17', 'E-04', 'corroboration').state;
  s = checkString(pub, sol, s, 'E-09', 'E-04', 'contradiction').state;
  s = confront(pub, sol, s, 'E-09', 4, 'E-18').state;
  s = { ...s, read: pub.evidence.map((e) => e.id) };
  return submitVerdict(pub, sol, s, correctAnswer(pub, sol)).state;
}

describe('scoring (GDD §7)', () => {
  it('par is achievable: the efficient route earns Sharp + Swift + Unassisted', () => {
    const s = efficientSolve();
    expect(s.clockMinutes).toBe(160);
    expect(s.clockMinutes).toBeLessThanOrEqual(pub.parHours * 60);
    const score = computeScore(s, sol, pub.parHours);
    expect(score.badges).toEqual(['sharp', 'swift', 'unassisted']);
    expect(score.total).toBe(1000); // 600 + 200 + 200 + 4×5, capped at 1000
  });

  it('applies second-accusation, overtime and hint penalties', () => {
    const base = efficientSolve();
    const s: SessionState = {
      ...base,
      clockMinutes: pub.parHours * 60 + 61, // 2 started hours over par
      hints: { nudge: 1, pointer: 1, reveal: 0 },
      accusations: [{ correctSections: 2 }, { correctSections: 4 }],
    };
    const score = computeScore(s, sol, pub.parHours);
    expect(score.accusation).toBe(100);
    expect(score.time).toBe(160);
    expect(score.hints).toBe(-40);
    expect(score.total).toBe(600 + 100 + 160 - 40 + 20);
    expect(score.badges).toEqual([]);
  });

  it('gives a cold case only breakthrough points', () => {
    const s: SessionState = { ...newSession(pub), status: 'cold', breakthroughs: ['BT-1', 'BT-2'] };
    expect(computeScore(s, sol, 5)).toMatchObject({ total: 10, badges: [] });
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
    const s = { ...newSession(pub), read: ['E-05', 'E-04'] };
    const t = buildTimeline(pub, s);
    expect(t[0]?.label).toBe('Sipho badges in');
    expect(t.every((ev, i) => i === 0 || t[i - 1]!.at <= ev.at)).toBe(true);
    expect(t.some((ev) => ev.evidenceId === 'E-02')).toBe(false);
  });

  it("flags Marguerite's statement against the keycard log", () => {
    const s = { ...newSession(pub), read: ['E-04', 'E-09'] };
    const c = findConflicts(pub, s, []);
    expect(c.some((x) => x.suspectId === 'marguerite')).toBe(true);
    expect(c.some((x) => x.suspectId === 'lena')).toBe(false);
  });

  it('flags player placements that clash', () => {
    const s = { ...newSession(pub), read: ['E-20'] };
    const c = findConflicts(pub, s, [{ suspectId: 'sipho', at: '2026-03-06T00:32', place: 'Studio B' }]);
    expect(c).toHaveLength(1);
  });
});

describe('case linter and golden path (FR-ADMIN-01/02, NFR-11)', () => {
  it('Case 001 lints clean', () => {
    const { issues } = lintCase(rawPub(), rawSol());
    expect(issues).toEqual([]);
  });

  it('Case 001 is solvable end to end', () => {
    const r = runGolden(rawPub(), rawSol());
    expect(r.ok).toBe(true);
    const run = playGoldenPath(pub, sol);
    expect(run.state.breakthroughs).toHaveLength(sol.breakthroughs.length);
  });

  it('every item is reachable', () => {
    expect(explore(pub, sol).visible.size).toBe(pub.evidence.length);
  });

  it('catches broken content', () => {
    const p = rawPub();
    const s = rawSol();
    p.evidence.find((e: { id: string }) => e.id === 'E-07').body.scene = 'A blank wall.';
    p.evidence.find((e: { id: string }) => e.id === 'E-07').body.caption = 'Wall.';
    s.breakthroughs.push({ id: 'BT-9', a: 'E-01', b: 'E-99', relation: 'link', essential: true, order: 9, insight: 'x' });
    s.verdict.who.killer = 'nobody';
    s.verdict.proof.core.push('E-98');
    p.words.find((w: { id: string }) => w.id === 'k-vt').revealedBy = [];
    p.evidence.push({ ...p.evidence[0], id: 'E-01' });
    const codes = lintCase(p, s).issues.map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining(['bad_breakthrough', 'bad_verdict', 'bad_proof', 'dup_evidence', 'dup_number', 'missing_hint', 'free_answer']),
    );
  });

  it('flags undiscoverable search terms and unreachable items', () => {
    const p = rawPub();
    const s = rawSol();
    s.archiveIndex.find((a: { evidenceId: string }) => a.evidenceId === 'E-23').terms = ['ZZ 000-000'];
    const codes = lintCase(p, s).issues.map((i) => i.code);
    expect(codes).toContain('search_undiscoverable');
    expect(codes).toContain('unreachable_evidence');
  });

  it('reports schema errors and id/version mismatch', () => {
    expect(lintCase({}, {}).issues.length).toBeGreaterThan(0);
    const s = rawSol();
    s.version = 2;
    s.caseId = 'other';
    const codes = lintCase(rawPub(), s).issues.map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['version_mismatch', 'id_mismatch']));
  });

  it('rejects markdown tables the evidence viewer cannot render', () => {
    const p = rawPub();
    p.evidence.find((e: { id: string }) => e.id === 'E-01').body.markdown += '\n\n| Time | Event |\n|---|---|\n| 01:00 | x |';
    expect(lintCase(p, rawSol()).issues.map((i) => i.code)).toContain('unsupported_markdown');
  });

  it('detects a solution leak into the public file', () => {
    const p = rawPub();
    p.briefing += ' ' + sol.breakthroughs[0]!.insight;
    expect(lintCase(p, rawSol()).issues.map((i) => i.code)).toContain('leak');
  });
});
