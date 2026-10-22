import 'server-only';
import {
  accusationsLeft,
  availableLeads,
  computeScore,
  isWordAvailable,
  visibleEvidence,
  type CasePublic,
  type CaseSolution,
  type SessionState,
} from '@unsealed/engine';
import type { CaseView, DebriefView } from '@/lib/view-types';

/**
 * Hint allowance for free players (FR-HINT-03): the first hint per case is free, then each further
 * hint is unlocked by an opt-in rewarded video, up to AD_HINTS_PER_CASE. Case Pass = unlimited, no ads
 * (hints still cost score).
 */
export const FREE_HINTS_PER_CASE = 1;
export const AD_HINTS_PER_CASE = 3;

export const hintsUsed = (sessionState: SessionState) =>
  sessionState.hints.nudge +
  sessionState.hints.pointer +
  sessionState.hints.reveal;

export function hintAllowance(sessionState: SessionState, unlimited = false) {
  if (unlimited) return { freeLeft: 0, adLeft: 0, unlimited: true };
  const used = hintsUsed(sessionState);
  return {
    freeLeft: Math.max(0, FREE_HINTS_PER_CASE - used),
    adLeft: Math.max(
      0,
      Math.min(
        AD_HINTS_PER_CASE,
        FREE_HINTS_PER_CASE + AD_HINTS_PER_CASE - used,
      ),
    ),
    unlimited: false,
  };
}

export function buildView(
  pub: CasePublic,
  sol: CaseSolution,
  sessionState: SessionState,
  opts: { unlimitedHints?: boolean } = {},
): CaseView {
  const word = (id: string) =>
    pub.words.find((word) => word.id === id)?.text ?? id;
  const blank = (blank: CasePublic['verdict']['how'][number]) => ({
    blankId: blank.blankId,
    prompt: blank.prompt,
    options: blank.wordIds
      .filter((id) => isWordAvailable(pub, sessionState, id))
      .map((id) => ({ id, text: word(id) })),
  });

  const view: CaseView = {
    case: {
      id: pub.id,
      title: pub.title,
      hook: pub.hook,
      city: pub.city,
      difficulty: pub.difficulty,
      estMinutes: pub.estMinutes,
      contentNotes: pub.contentNotes,
      parHours: pub.parHours,
      briefing: pub.briefing,
      suspects: pub.suspects,
      archive: pub.archive,
      totalEvidence: pub.evidence.length,
      totalBreakthroughs: sol.breakthroughs.length,
      verdict: {
        who: pub.verdict.who,
        how: pub.verdict.how.map(blank),
        why: pub.verdict.why.map(blank),
        proofCount: pub.verdict.proofCount,
      },
    },
    evidence: visibleEvidence(pub, sessionState),
    leads: {
      available: availableLeads(pub, sessionState),
      followed: pub.leads.filter((lead) =>
        sessionState.unlocked.includes(`lead:${lead.id}`),
      ),
    },
    breakthroughs: sessionState.breakthroughs.map((id) => ({
      id,
      insight:
        sol.breakthroughs.find((breakthrough) => breakthrough.id === id)
          ?.insight ?? '',
    })),
    strings: sessionState.strings,
    revealedLines: sessionState.revealedLines,
    confrontAttempts: sessionState.confrontAttempts,
    read: sessionState.read,
    searches: sessionState.searches,
    clockMinutes: sessionState.clockMinutes,
    hints: sessionState.hints,
    hintAllowance: hintAllowance(sessionState, opts.unlimitedHints),
    accusations: sessionState.accusations,
    accusationsLeft: accusationsLeft(sessionState),
    status: sessionState.status,
  };

  if (sessionState.status !== 'active')
    view.debrief = buildDebrief(pub, sol, sessionState);
  return view;
}

function buildDebrief(
  pub: CasePublic,
  sol: CaseSolution,
  sessionState: SessionState,
): DebriefView {
  const word = (id: string) =>
    pub.words.find((word) => word.id === id)?.text ?? id;
  const ev = (id: string) => {
    const evidence = pub.evidence.find((evidence) => evidence.id === id);
    return evidence ? `${evidence.number}. ${evidence.title}` : id;
  };
  return {
    score: computeScore(sessionState, sol, pub.parHours),
    steps: sol.debrief,
    solution: {
      who: Object.values(sol.verdict.who)
        .map(
          (id) => pub.suspects.find((suspect) => suspect.id === id)?.name ?? id,
        )
        .join(', '),
      how: Object.values(sol.verdict.how).map((ids) => word(ids[0]!)),
      why: Object.values(sol.verdict.why).map((ids) => word(ids[0]!)),
      proofCore: sol.verdict.proof.core.map(ev),
    },
    breakthroughs: [...sol.breakthroughs]
      .sort((first, second) => first.order - second.order)
      .map((breakthrough) => ({
        id: breakthrough.id,
        insight: breakthrough.insight,
        found: sessionState.breakthroughs.includes(breakthrough.id),
        essential: breakthrough.essential,
      })),
  };
}
