import {
  checkString,
  confront,
  followLead,
  readEvidence,
  searchArchive,
  submitVerdict,
  type VerdictAnswer,
} from './actions';
import { lintCase } from './lint';
import type { CasePublic, CaseSolution } from './schema';
import { computeScore } from './scoring';
import { availableLeads, newSession, visibleEvidence, type SessionState } from './state';

/** The correct verdict, built from the solution. */
export function correctAnswer(pub: CasePublic, sol: CaseSolution): VerdictAnswer {
  const pick = (r: Record<string, string[]>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v[0]!]));
  const extra = sol.verdict.proof.support.slice(0, pub.verdict.proofCount - sol.verdict.proof.core.length);
  return {
    who: { ...sol.verdict.who },
    how: pick(sol.verdict.how),
    why: pick(sol.verdict.why),
    proof: [...sol.verdict.proof.core, ...extra],
  };
}

/**
 * Plays the case like an ideal detective, using only the public engine actions:
 * reads everything visible, follows every lead, searches every term it has seen,
 * checks every true breakthrough and confrontation, then submits the correct verdict.
 */
export function playGoldenPath(pub: CasePublic, sol: CaseSolution) {
  let s: SessionState = newSession(pub);
  const log: string[] = [];
  const readAll = () => {
    for (const e of visibleEvidence(pub, s)) s = readEvidence(pub, s, e.id);
  };
  let progress = true;
  let guard = 0;
  while (progress && guard++ < 50) {
    progress = false;
    readAll();
    for (const l of availableLeads(pub, s)) {
      s = followLead(pub, s, l.id).state;
      log.push(`lead ${l.id}`);
      progress = true;
    }
    readAll();
    for (const entry of sol.archiveIndex) {
      if (s.unlocked.includes(`search:${entry.evidenceId}`)) continue;
      const seen = JSON.stringify(visibleEvidence(pub, s)).toLowerCase();
      const term = entry.terms.find((t) => seen.includes(t.toLowerCase()));
      if (term) {
        s = searchArchive(pub, sol, s, term).state;
        log.push(`search "${term}"`);
        progress = true;
      }
    }
    readAll();
    const vis = new Set(visibleEvidence(pub, s).map((e) => e.id));
    for (const b of sol.breakthroughs) {
      if (s.breakthroughs.includes(b.id) || !vis.has(b.a) || !vis.has(b.b)) continue;
      const r = checkString(pub, sol, s, b.a, b.b, b.relation);
      if (!r.valid) throw new Error(`Breakthrough ${b.id} did not validate`);
      s = r.state;
      log.push(`string ${b.id}`);
      progress = true;
    }
    for (const c of sol.confrontations) {
      if (s.confrontations.includes(c.id) || !vis.has(c.statementId)) continue;
      const ev = c.evidenceIds.find((id) => vis.has(id));
      if (!ev) continue;
      const r = confront(pub, sol, s, c.statementId, c.line, ev);
      if (!r.valid) throw new Error(`Confrontation ${c.id} did not validate`);
      s = r.state;
      log.push(`confront ${c.id}`);
      progress = true;
    }
  }
  readAll();
  const verdict = submitVerdict(pub, sol, s, correctAnswer(pub, sol));
  s = verdict.state;
  return { state: s, log, verdict, score: computeScore(s, sol, pub.parHours) };
}

export function runGolden(pubRaw: unknown, solRaw: unknown) {
  const { issues, pub, sol } = lintCase(pubRaw, solRaw);
  const errors = issues.filter((i) => i.level === 'error');
  if (!pub || !sol || errors.length) return { ok: false as const, reason: `lint errors: ${errors.map((e) => e.code).join(', ')}` };
  const run = playGoldenPath(pub, sol);
  const ok = run.verdict.correctSections === 4 && run.state.status === 'solved';
  return { ok, run, reason: ok ? undefined : `golden verdict scored ${run.verdict.correctSections}/4` };
}
