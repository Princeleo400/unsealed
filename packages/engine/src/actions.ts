import type { CasePublic, CaseSolution, Evidence, Relation } from './schema';
import {
  CHECK_COST_MINUTES,
  MAX_ACCUSATIONS,
  isGateOpen,
  isVisible,
  isWordAvailable,
  type SessionState,
} from './state';

export class ActionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

const fail = (code: string, message: string): never => {
  throw new ActionError(code, message);
};

function assertActive(state: SessionState) {
  if (state.status !== 'active') fail('case_closed', `Case is ${state.status}.`);
}

function newlyVisible(pub: CasePublic, before: SessionState, after: SessionState): Evidence[] {
  return pub.evidence.filter((e) => !isGateOpen(before, e.gate) && isGateOpen(after, e.gate));
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];

// ---------------------------------------------------------------- read / pin

export function readEvidence(pub: CasePublic, state: SessionState, evidenceId: string): SessionState {
  if (!isVisible(pub, state, evidenceId)) fail('not_visible', `Evidence ${evidenceId} is not available.`);
  if (state.read.includes(evidenceId)) return state;
  return { ...state, read: [...state.read, evidenceId] };
}

export function togglePin(pub: CasePublic, state: SessionState, evidenceId: string): SessionState {
  if (!isVisible(pub, state, evidenceId)) fail('not_visible', `Evidence ${evidenceId} is not available.`);
  const pinned = state.pinned.includes(evidenceId)
    ? state.pinned.filter((x) => x !== evidenceId)
    : [...state.pinned, evidenceId];
  return { ...state, pinned };
}

// ---------------------------------------------------------------- leads

export function followLead(pub: CasePublic, state: SessionState, leadId: string) {
  assertActive(state);
  const lead = pub.leads.find((l) => l.id === leadId) ?? fail('unknown_lead', `No lead ${leadId}.`);
  if (!isGateOpen(state, lead.gate)) fail('lead_locked', `Lead ${leadId} is not available yet.`);
  const key = `lead:${leadId}`;
  if (state.unlocked.includes(key)) fail('lead_done', `Lead ${leadId} was already followed.`);
  const next: SessionState = {
    ...state,
    unlocked: [...state.unlocked, key],
    clockMinutes: state.clockMinutes + Math.round(lead.costHours * 60),
  };
  return { state: next, unlockedEvidence: newlyVisible(pub, state, next) };
}

// ---------------------------------------------------------------- red string

export function checkString(
  pub: CasePublic,
  sol: CaseSolution,
  state: SessionState,
  a: string,
  b: string,
  relation: Relation,
) {
  assertActive(state);
  if (a === b) fail('same_card', 'Pick two different cards.');
  if (!isVisible(pub, state, a) || !isVisible(pub, state, b)) fail('not_visible', 'Both cards must be in your file.');
  const samePair = (x: { a: string; b: string }) => (x.a === a && x.b === b) || (x.a === b && x.b === a);

  const previous = state.strings.find((s) => samePair(s) && s.relation === relation);
  if (previous) return { state, valid: previous.valid, duplicate: true as const, unlockedEvidence: [] as Evidence[] };

  const bt = sol.breakthroughs.find((x) => samePair(x) && x.relation === relation);
  const valid = bt !== undefined && !state.breakthroughs.includes(bt.id);
  const next: SessionState = {
    ...state,
    clockMinutes: state.clockMinutes + CHECK_COST_MINUTES,
    strings: [...state.strings, { a, b, relation, valid: bt !== undefined, breakthroughId: bt?.id }],
    breakthroughs: valid && bt ? [...state.breakthroughs, bt.id] : state.breakthroughs,
    unlocked: valid && bt ? uniq([...state.unlocked, `breakthrough:${bt.id}`]) : state.unlocked,
  };
  return {
    state: next,
    valid: bt !== undefined,
    duplicate: false as const,
    breakthrough: bt ? { id: bt.id, insight: bt.insight } : undefined,
    unlockedEvidence: newlyVisible(pub, state, next),
  };
}

// ---------------------------------------------------------------- confront

export function confront(
  pub: CasePublic,
  sol: CaseSolution,
  state: SessionState,
  statementId: string,
  line: number,
  evidenceId: string,
) {
  assertActive(state);
  const stmt = pub.evidence.find((e) => e.id === statementId);
  if (!stmt || stmt.body.type !== 'statement') fail('not_statement', `${statementId} is not a statement.`);
  if (!isVisible(pub, state, statementId) || !isVisible(pub, state, evidenceId)) fail('not_visible', 'Not in your file.');
  if (stmt && stmt.body.type === 'statement' && !stmt.body.lines.some((l) => l.n === line)) fail('bad_line', `No line ${line}.`);

  const key = `${statementId}|${line}|${evidenceId}`;
  if (state.confrontAttempts.includes(key)) {
    const done = sol.confrontations.find(
      (c) => c.statementId === statementId && c.line === line && c.evidenceIds.includes(evidenceId),
    );
    return {
      state,
      valid: done !== undefined,
      duplicate: true as const,
      revealLines: [] as { n: string; text: string }[],
      unlockedEvidence: [] as Evidence[],
    };
  }

  const c = sol.confrontations.find(
    (x) => x.statementId === statementId && x.line === line && x.evidenceIds.includes(evidenceId),
  );
  const alreadyDone = c !== undefined && state.confrontations.includes(c.id);
  const valid = c !== undefined && !alreadyDone;
  const next: SessionState = {
    ...state,
    confrontAttempts: [...state.confrontAttempts, key],
    clockMinutes: valid || alreadyDone ? state.clockMinutes : state.clockMinutes + CHECK_COST_MINUTES,
    confrontations: valid && c ? [...state.confrontations, c.id] : state.confrontations,
    unlocked: valid && c ? uniq([...state.unlocked, `confront:${c.id}`]) : state.unlocked,
    revealedLines:
      valid && c
        ? { ...state.revealedLines, [statementId]: [...(state.revealedLines[statementId] ?? []), ...c.revealLines] }
        : state.revealedLines,
  };
  return {
    state: next,
    valid: c !== undefined,
    duplicate: false as const,
    revealLines: valid && c ? c.revealLines : [],
    unlockedEvidence: newlyVisible(pub, state, next),
  };
}

// ---------------------------------------------------------------- archive search

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_RESULTS = 5;

export function normalizeTerm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exact whole-term match against the author's terms and synonyms. Free; never costs clock. */
export function searchArchive(pub: CasePublic, sol: CaseSolution, state: SessionState, query: string) {
  assertActive(state);
  const q = normalizeTerm(query);
  if (q.length < SEARCH_MIN_CHARS) fail('query_too_short', `Type at least ${SEARCH_MIN_CHARS} characters.`);
  const hits = sol.archiveIndex
    .filter((entry) => entry.terms.some((t) => normalizeTerm(t) === q))
    .slice(0, SEARCH_MAX_RESULTS)
    .map((entry) => entry.evidenceId);
  const keys = hits.map((id) => `search:${id}`);
  const next: SessionState = {
    ...state,
    searches: [...state.searches, q],
    unlocked: uniq([...state.unlocked, ...keys]),
  };
  const results = hits
    .map((id) => pub.evidence.find((e) => e.id === id))
    .filter((e): e is Evidence => e !== undefined && isGateOpen(next, e.gate));
  return { state: next, results, unlockedEvidence: newlyVisible(pub, state, next) };
}

// ---------------------------------------------------------------- hints

export type HintTier = 'nudge' | 'pointer' | 'reveal';
export const HINT_COST: Record<HintTier, number> = { nudge: 10, pointer: 30, reveal: 75 };

export function currentStuckPoint(sol: CaseSolution, state: SessionState): string | null {
  const next = [...sol.breakthroughs]
    .filter((b) => b.essential && !state.breakthroughs.includes(b.id))
    .sort((x, y) => x.order - y.order)[0];
  return next ? next.id : null;
}

export function getHint(pub: CasePublic, sol: CaseSolution, state: SessionState, tier: HintTier) {
  assertActive(state);
  const stuck = currentStuckPoint(sol, state);
  let text: string;
  if (stuck === null) {
    text = 'You have found every essential breakthrough. Build your verdict from them.';
  } else if (tier === 'nudge') {
    text = pub.nudges.find((n) => n.stuckPointId === stuck)?.text ?? 'Look again at the times in your file.';
  } else {
    const h = sol.hints.find((x) => x.stuckPointId === stuck);
    text = (tier === 'pointer' ? h?.pointer : h?.reveal) ?? 'Compare the records with the statements.';
  }
  const next: SessionState = { ...state, hints: { ...state.hints, [tier]: state.hints[tier] + 1 } };
  return { state: next, stuckPointId: stuck, text, scoreCost: HINT_COST[tier] };
}

// ---------------------------------------------------------------- verdict

export type VerdictAnswer = {
  who: Record<string, string>;
  how: Record<string, string>;
  why: Record<string, string>;
  proof: string[];
};

export function isProofCorrect(sol: CaseSolution, proof: string[], count = 3): boolean {
  const set = new Set(proof);
  if (set.size !== count || proof.length !== count) return false;
  const { core, support } = sol.verdict.proof;
  if (!core.every((c) => set.has(c))) return false;
  return [...set].every((id) => core.includes(id) || support.includes(id));
}

function sectionCorrect(expected: Record<string, string[] | string>, given: Record<string, string>): boolean {
  return Object.entries(expected).every(([blank, ok]) => {
    const g = given[blank];
    return g !== undefined && (Array.isArray(ok) ? ok.includes(g) : ok === g);
  });
}

export function validateVerdictAnswer(pub: CasePublic, state: SessionState, ans: VerdictAnswer) {
  const suspectIds = pub.suspects.map((s) => s.id);
  for (const b of pub.verdict.who) {
    const v = ans.who[b.blankId];
    if (!v || !suspectIds.includes(v)) fail('incomplete', `Choose a suspect for "${b.prompt}".`);
  }
  const blanks = [
    ...pub.verdict.how.map((b) => ({ b, v: ans.how[b.blankId] })),
    ...pub.verdict.why.map((b) => ({ b, v: ans.why[b.blankId] })),
  ];
  for (const { b, v } of blanks) {
    if (!v) fail('incomplete', `Fill "${b.prompt}".`);
    if (v && !b.wordIds.includes(v)) fail('bad_word', `"${v}" is not an option for "${b.prompt}".`);
    if (v && !isWordAvailable(pub, state, v)) fail('word_locked', 'You have not discovered that word yet.');
  }
  if (ans.proof.length !== pub.verdict.proofCount || new Set(ans.proof).size !== ans.proof.length)
    fail('proof_count', `Pin exactly ${pub.verdict.proofCount} different pieces of evidence.`);
  for (const id of ans.proof) if (!isVisible(pub, state, id)) fail('not_visible', `${id} is not in your file.`);
}

/** Grades a verdict. The result never says WHICH sections were right — only how many. */
export function submitVerdict(pub: CasePublic, sol: CaseSolution, state: SessionState, ans: VerdictAnswer) {
  assertActive(state);
  validateVerdictAnswer(pub, state, ans);
  const correctSections = [
    sectionCorrect(sol.verdict.who, ans.who),
    sectionCorrect(sol.verdict.how, ans.how),
    sectionCorrect(sol.verdict.why, ans.why),
    isProofCorrect(sol, ans.proof, pub.verdict.proofCount),
  ].filter(Boolean).length;

  const accusations = [...state.accusations, { correctSections }];
  const status = correctSections === 4 ? 'solved' : accusations.length >= MAX_ACCUSATIONS ? 'cold' : 'active';
  const next: SessionState = { ...state, accusations, status };
  return { state: next, correctSections, accusationsLeft: MAX_ACCUSATIONS - accusations.length, status };
}
