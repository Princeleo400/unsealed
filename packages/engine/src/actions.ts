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
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ActionError';
  }
}

const fail = (code: string, message: string): never => {
  throw new ActionError(code, message);
};

function assertActive(state: SessionState) {
  if (state.status !== 'active')
    fail('case_closed', `Case is ${state.status}.`);
}

function newlyVisible(
  pub: CasePublic,
  before: SessionState,
  after: SessionState,
): Evidence[] {
  return pub.evidence.filter(
    (evidence) =>
      !isGateOpen(before, evidence.gate) && isGateOpen(after, evidence.gate),
  );
}

const uniq = <T>(xs: T[]) => [...new Set(xs)];

// ---------------------------------------------------------------- read / pin

export function readEvidence(
  pub: CasePublic,
  state: SessionState,
  evidenceId: string,
): SessionState {
  if (!isVisible(pub, state, evidenceId))
    fail('not_visible', `Evidence ${evidenceId} is not available.`);
  if (state.read.includes(evidenceId)) return state;
  return { ...state, read: [...state.read, evidenceId] };
}

export function togglePin(
  pub: CasePublic,
  state: SessionState,
  evidenceId: string,
): SessionState {
  if (!isVisible(pub, state, evidenceId))
    fail('not_visible', `Evidence ${evidenceId} is not available.`);
  const pinned = state.pinned.includes(evidenceId)
    ? state.pinned.filter((pinnedId) => pinnedId !== evidenceId)
    : [...state.pinned, evidenceId];
  return { ...state, pinned };
}

// ---------------------------------------------------------------- leads

export function followLead(
  pub: CasePublic,
  state: SessionState,
  leadId: string,
) {
  assertActive(state);
  const lead =
    pub.leads.find((lead) => lead.id === leadId) ??
    fail('unknown_lead', `No lead ${leadId}.`);
  if (!isGateOpen(state, lead.gate))
    fail('lead_locked', `Lead ${leadId} is not available yet.`);
  const key = `lead:${leadId}`;
  if (state.unlocked.includes(key))
    fail('lead_done', `Lead ${leadId} was already followed.`);
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
  firstEvidenceId: string,
  secondEvidenceId: string,
  relation: Relation,
) {
  assertActive(state);
  if (firstEvidenceId === secondEvidenceId)
    fail('same_card', 'Pick two different cards.');
  if (
    !isVisible(pub, state, firstEvidenceId) ||
    !isVisible(pub, state, secondEvidenceId)
  )
    fail('not_visible', 'Both cards must be in your file.');
  const samePair = (pair: { a: string; b: string }) =>
    (pair.a === firstEvidenceId && pair.b === secondEvidenceId) ||
    (pair.a === secondEvidenceId && pair.b === firstEvidenceId);

  const previous = state.strings.find(
    (breakthrough) =>
      samePair(breakthrough) && breakthrough.relation === relation,
  );
  if (previous)
    return {
      state,
      valid: previous.valid,
      duplicate: true as const,
      unlockedEvidence: [] as Evidence[],
    };

  const bt = sol.breakthroughs.find(
    (breakthrough) =>
      samePair(breakthrough) && breakthrough.relation === relation,
  );
  const valid = bt !== undefined && !state.breakthroughs.includes(bt.id);
  const next: SessionState = {
    ...state,
    clockMinutes: state.clockMinutes + CHECK_COST_MINUTES,
    strings: [
      ...state.strings,
      {
        a: firstEvidenceId,
        b: secondEvidenceId,
        relation,
        valid: bt !== undefined,
        breakthroughId: bt?.id,
      },
    ],
    breakthroughs:
      valid && bt ? [...state.breakthroughs, bt.id] : state.breakthroughs,
    unlocked:
      valid && bt
        ? uniq([...state.unlocked, `breakthrough:${bt.id}`])
        : state.unlocked,
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
  const stmt = pub.evidence.find((evidence) => evidence.id === statementId);
  if (!stmt || stmt.body.type !== 'statement')
    fail('not_statement', `${statementId} is not a statement.`);
  if (!isVisible(pub, state, statementId) || !isVisible(pub, state, evidenceId))
    fail('not_visible', 'Not in your file.');
  if (
    stmt &&
    stmt.body.type === 'statement' &&
    !stmt.body.lines.some((statementLine) => statementLine.n === line)
  )
    fail('bad_line', `No line ${line}.`);

  const key = `${statementId}|${line}|${evidenceId}`;
  if (state.confrontAttempts.includes(key)) {
    const done = sol.confrontations.find(
      (confrontation) =>
        confrontation.statementId === statementId &&
        confrontation.line === line &&
        confrontation.evidenceIds.includes(evidenceId),
    );
    return {
      state,
      valid: done !== undefined,
      duplicate: true as const,
      revealLines: [] as { n: string; text: string }[],
      unlockedEvidence: [] as Evidence[],
    };
  }

  const matchedConfrontation = sol.confrontations.find(
    (confrontation) =>
      confrontation.statementId === statementId &&
      confrontation.line === line &&
      confrontation.evidenceIds.includes(evidenceId),
  );
  const alreadyDone =
    matchedConfrontation !== undefined &&
    state.confrontations.includes(matchedConfrontation.id);
  const valid = matchedConfrontation !== undefined && !alreadyDone;
  const next: SessionState = {
    ...state,
    confrontAttempts: [...state.confrontAttempts, key],
    clockMinutes:
      valid || alreadyDone
        ? state.clockMinutes
        : state.clockMinutes + CHECK_COST_MINUTES,
    confrontations:
      valid && matchedConfrontation
        ? [...state.confrontations, matchedConfrontation.id]
        : state.confrontations,
    unlocked:
      valid && matchedConfrontation
        ? uniq([...state.unlocked, `confront:${matchedConfrontation.id}`])
        : state.unlocked,
    revealedLines:
      valid && matchedConfrontation
        ? {
            ...state.revealedLines,
            [statementId]: [
              ...(state.revealedLines[statementId] ?? []),
              ...matchedConfrontation.revealLines,
            ],
          }
        : state.revealedLines,
  };
  return {
    state: next,
    valid: matchedConfrontation !== undefined,
    duplicate: false as const,
    revealLines:
      valid && matchedConfrontation ? matchedConfrontation.revealLines : [],
    unlockedEvidence: newlyVisible(pub, state, next),
  };
}

// ---------------------------------------------------------------- archive search

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_RESULTS = 5;

export function normalizeTerm(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exact whole-term match against the author's terms and synonyms. Free; never costs clock. */
export function searchArchive(
  pub: CasePublic,
  sol: CaseSolution,
  state: SessionState,
  query: string,
) {
  assertActive(state);
  const normalizedQuery = normalizeTerm(query);
  if (normalizedQuery.length < SEARCH_MIN_CHARS)
    fail('query_too_short', `Type at least ${SEARCH_MIN_CHARS} characters.`);
  const hits = sol.archiveIndex
    .filter((entry) =>
      entry.terms.some((term) => normalizeTerm(term) === normalizedQuery),
    )
    .slice(0, SEARCH_MAX_RESULTS)
    .map((entry) => entry.evidenceId);
  const keys = hits.map((id) => `search:${id}`);
  const next: SessionState = {
    ...state,
    searches: [...state.searches, normalizedQuery],
    unlocked: uniq([...state.unlocked, ...keys]),
  };
  const results = hits
    .map((id) => pub.evidence.find((evidence) => evidence.id === id))
    .filter(
      (evidence): evidence is Evidence =>
        evidence !== undefined && isGateOpen(next, evidence.gate),
    );
  return {
    state: next,
    results,
    unlockedEvidence: newlyVisible(pub, state, next),
  };
}

// ---------------------------------------------------------------- hints

export type HintTier = 'nudge' | 'pointer' | 'reveal';
export const HINT_COST: Record<HintTier, number> = {
  nudge: 10,
  pointer: 30,
  reveal: 75,
};

export function currentStuckPoint(
  sol: CaseSolution,
  state: SessionState,
): string | null {
  const next = [...sol.breakthroughs]
    .filter(
      (breakthrough) =>
        breakthrough.essential &&
        !state.breakthroughs.includes(breakthrough.id),
    )
    .sort((first, second) => first.order - second.order)[0];
  return next ? next.id : null;
}

export function getHint(
  pub: CasePublic,
  sol: CaseSolution,
  state: SessionState,
  tier: HintTier,
) {
  assertActive(state);
  const stuck = currentStuckPoint(sol, state);
  let text: string;
  if (stuck === null) {
    text =
      'You have found every essential breakthrough. Build your verdict from them.';
  } else if (tier === 'nudge') {
    text =
      pub.nudges.find((nudge) => nudge.stuckPointId === stuck)?.text ??
      'Look again at the times in your file.';
  } else {
    const hint = sol.hints.find((hint) => hint.stuckPointId === stuck);
    text =
      (tier === 'pointer' ? hint?.pointer : hint?.reveal) ??
      'Compare the records with the statements.';
  }
  const next: SessionState = {
    ...state,
    hints: { ...state.hints, [tier]: state.hints[tier] + 1 },
  };
  return { state: next, stuckPointId: stuck, text, scoreCost: HINT_COST[tier] };
}

// ---------------------------------------------------------------- verdict

export type VerdictAnswer = {
  who: Record<string, string>;
  how: Record<string, string>;
  why: Record<string, string>;
  proof: string[];
};

export function isProofCorrect(
  sol: CaseSolution,
  proof: string[],
  count = 3,
): boolean {
  const set = new Set(proof);
  if (set.size !== count || proof.length !== count) return false;
  const { core, support } = sol.verdict.proof;
  if (!core.every((coreId) => set.has(coreId))) return false;
  return [...set].every((id) => core.includes(id) || support.includes(id));
}

function sectionCorrect(
  expected: Record<string, string[] | string>,
  given: Record<string, string>,
): boolean {
  return Object.entries(expected).every(([blank, ok]) => {
    const givenWordId = given[blank];
    return (
      givenWordId !== undefined &&
      (Array.isArray(ok) ? ok.includes(givenWordId) : ok === givenWordId)
    );
  });
}

export function validateVerdictAnswer(
  pub: CasePublic,
  state: SessionState,
  ans: VerdictAnswer,
) {
  const suspectIds = pub.suspects.map((suspect) => suspect.id);
  for (const blank of pub.verdict.who) {
    const chosenSuspectId = ans.who[blank.blankId];
    if (!chosenSuspectId || !suspectIds.includes(chosenSuspectId))
      fail('incomplete', `Choose a suspect for "${blank.prompt}".`);
  }
  const blanks = [
    ...pub.verdict.how.map((blank) => ({
      blank,
      value: ans.how[blank.blankId],
    })),
    ...pub.verdict.why.map((blank) => ({
      blank,
      value: ans.why[blank.blankId],
    })),
  ];
  for (const { blank, value } of blanks) {
    if (!value) fail('incomplete', `Fill "${blank.prompt}".`);
    if (value && !blank.wordIds.includes(value))
      fail('bad_word', `"${value}" is not an option for "${blank.prompt}".`);
    if (value && !isWordAvailable(pub, state, value))
      fail('word_locked', 'You have not discovered that word yet.');
  }
  if (
    ans.proof.length !== pub.verdict.proofCount ||
    new Set(ans.proof).size !== ans.proof.length
  )
    fail(
      'proof_count',
      `Pin exactly ${pub.verdict.proofCount} different pieces of evidence.`,
    );
  for (const id of ans.proof)
    if (!isVisible(pub, state, id))
      fail('not_visible', `${id} is not in your file.`);
}

/** Grades a verdict. The result never says WHICH sections were right — only how many. */
export function submitVerdict(
  pub: CasePublic,
  sol: CaseSolution,
  state: SessionState,
  ans: VerdictAnswer,
) {
  assertActive(state);
  validateVerdictAnswer(pub, state, ans);
  const correctSections = [
    sectionCorrect(sol.verdict.who, ans.who),
    sectionCorrect(sol.verdict.how, ans.how),
    sectionCorrect(sol.verdict.why, ans.why),
    isProofCorrect(sol, ans.proof, pub.verdict.proofCount),
  ].filter(Boolean).length;

  const accusations = [...state.accusations, { correctSections }];
  const status =
    correctSections === 4
      ? 'solved'
      : accusations.length >= MAX_ACCUSATIONS
        ? 'cold'
        : 'active';
  const next: SessionState = { ...state, accusations, status };
  return {
    state: next,
    correctSections,
    accusationsLeft: MAX_ACCUSATIONS - accusations.length,
    status,
  };
}
