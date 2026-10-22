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
import {
  availableLeads,
  newSession,
  visibleEvidence,
  type SessionState,
} from './state';

/** The correct verdict, built from the solution. */
export function correctAnswer(
  pub: CasePublic,
  sol: CaseSolution,
): VerdictAnswer {
  const pick = (answers: Record<string, string[]>) =>
    Object.fromEntries(
      Object.entries(answers).map(([blankId, wordIds]) => [
        blankId,
        wordIds[0]!,
      ]),
    );
  const extra = sol.verdict.proof.support.slice(
    0,
    pub.verdict.proofCount - sol.verdict.proof.core.length,
  );
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
  let sessionState: SessionState = newSession(pub);
  const log: string[] = [];
  const readAll = () => {
    for (const evidence of visibleEvidence(pub, sessionState))
      sessionState = readEvidence(pub, sessionState, evidence.id);
  };
  let progress = true;
  let guard = 0;
  while (progress && guard++ < 50) {
    progress = false;
    readAll();
    for (const lead of availableLeads(pub, sessionState)) {
      sessionState = followLead(pub, sessionState, lead.id).state;
      log.push(`lead ${lead.id}`);
      progress = true;
    }
    readAll();
    for (const entry of sol.archiveIndex) {
      if (sessionState.unlocked.includes(`search:${entry.evidenceId}`))
        continue;
      const seen = JSON.stringify(
        visibleEvidence(pub, sessionState),
      ).toLowerCase();
      const term = entry.terms.find((term) =>
        seen.includes(term.toLowerCase()),
      );
      if (term) {
        sessionState = searchArchive(pub, sol, sessionState, term).state;
        log.push(`search "${term}"`);
        progress = true;
      }
    }
    readAll();
    const vis = new Set(
      visibleEvidence(pub, sessionState).map((evidence) => evidence.id),
    );
    for (const breakthrough of sol.breakthroughs) {
      if (
        sessionState.breakthroughs.includes(breakthrough.id) ||
        !vis.has(breakthrough.a) ||
        !vis.has(breakthrough.b)
      )
        continue;
      const outcome = checkString(
        pub,
        sol,
        sessionState,
        breakthrough.a,
        breakthrough.b,
        breakthrough.relation,
      );
      if (!outcome.valid)
        throw new Error(`Breakthrough ${breakthrough.id} did not validate`);
      sessionState = outcome.state;
      log.push(`string ${breakthrough.id}`);
      progress = true;
    }
    for (const confrontation of sol.confrontations) {
      if (
        sessionState.confrontations.includes(confrontation.id) ||
        !vis.has(confrontation.statementId)
      )
        continue;
      const ev = confrontation.evidenceIds.find((id) => vis.has(id));
      if (!ev) continue;
      const outcome = confront(
        pub,
        sol,
        sessionState,
        confrontation.statementId,
        confrontation.line,
        ev,
      );
      if (!outcome.valid)
        throw new Error(`Confrontation ${confrontation.id} did not validate`);
      sessionState = outcome.state;
      log.push(`confront ${confrontation.id}`);
      progress = true;
    }
  }
  readAll();
  const verdict = submitVerdict(
    pub,
    sol,
    sessionState,
    correctAnswer(pub, sol),
  );
  sessionState = verdict.state;
  return {
    state: sessionState,
    log,
    verdict,
    score: computeScore(sessionState, sol, pub.parHours),
  };
}

export function runGolden(pubRaw: unknown, solRaw: unknown) {
  const { issues, pub, sol } = lintCase(pubRaw, solRaw);
  const errors = issues.filter((lintIssue) => lintIssue.level === 'error');
  if (!pub || !sol || errors.length)
    return {
      ok: false as const,
      reason: `lint errors: ${errors.map((lintIssue) => lintIssue.code).join(', ')}`,
    };
  const run = playGoldenPath(pub, sol);
  const ok = run.verdict.correctSections === 4 && run.state.status === 'solved';
  return {
    ok,
    run,
    reason: ok
      ? undefined
      : `golden verdict scored ${run.verdict.correctSections}/4`,
  };
}
