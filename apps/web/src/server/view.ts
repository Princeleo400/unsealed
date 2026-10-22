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
 * hint is unlocked by an opt-in rewarded video, up to AD_HINTS_PER_CASE. Case Pass (later) = unlimited, no ads.
 */
export const FREE_HINTS_PER_CASE = 1;
export const AD_HINTS_PER_CASE = 3;

export const hintsUsed = (s: SessionState) => s.hints.nudge + s.hints.pointer + s.hints.reveal;

export function hintAllowance(s: SessionState) {
  const used = hintsUsed(s);
  return {
    freeLeft: Math.max(0, FREE_HINTS_PER_CASE - used),
    adLeft: Math.max(0, Math.min(AD_HINTS_PER_CASE, FREE_HINTS_PER_CASE + AD_HINTS_PER_CASE - used)),
    unlimited: false,
  };
}

export function buildView(pub: CasePublic, sol: CaseSolution, s: SessionState): CaseView {
  const word = (id: string) => pub.words.find((w) => w.id === id)?.text ?? id;
  const blank = (b: CasePublic['verdict']['how'][number]) => ({
    blankId: b.blankId,
    prompt: b.prompt,
    options: b.wordIds.filter((id) => isWordAvailable(pub, s, id)).map((id) => ({ id, text: word(id) })),
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
    evidence: visibleEvidence(pub, s),
    leads: {
      available: availableLeads(pub, s),
      followed: pub.leads.filter((l) => s.unlocked.includes(`lead:${l.id}`)),
    },
    breakthroughs: s.breakthroughs.map((id) => ({ id, insight: sol.breakthroughs.find((b) => b.id === id)?.insight ?? '' })),
    strings: s.strings,
    revealedLines: s.revealedLines,
    confrontAttempts: s.confrontAttempts,
    read: s.read,
    searches: s.searches,
    clockMinutes: s.clockMinutes,
    hints: s.hints,
    hintAllowance: hintAllowance(s),
    accusations: s.accusations,
    accusationsLeft: accusationsLeft(s),
    status: s.status,
  };

  if (s.status !== 'active') view.debrief = buildDebrief(pub, sol, s);
  return view;
}

function buildDebrief(pub: CasePublic, sol: CaseSolution, s: SessionState): DebriefView {
  const word = (id: string) => pub.words.find((w) => w.id === id)?.text ?? id;
  const ev = (id: string) => {
    const e = pub.evidence.find((x) => x.id === id);
    return e ? `${e.number}. ${e.title}` : id;
  };
  return {
    score: computeScore(s, sol, pub.parHours),
    steps: sol.debrief,
    solution: {
      who: Object.values(sol.verdict.who)
        .map((id) => pub.suspects.find((x) => x.id === id)?.name ?? id)
        .join(', '),
      how: Object.values(sol.verdict.how).map((ids) => word(ids[0]!)),
      why: Object.values(sol.verdict.why).map((ids) => word(ids[0]!)),
      proofCore: sol.verdict.proof.core.map(ev),
    },
    breakthroughs: [...sol.breakthroughs]
      .sort((a, b) => a.order - b.order)
      .map((b) => ({ id: b.id, insight: b.insight, found: s.breakthroughs.includes(b.id), essential: b.essential })),
  };
}
