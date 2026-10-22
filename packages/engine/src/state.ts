import type { CasePublic, Evidence, Gate, Relation } from './schema';

export type StringCheck = { a: string; b: string; relation: Relation; valid: boolean; breakthroughId?: string };
export type VerdictAttempt = { correctSections: number };
export type CaseStatus = 'active' | 'solved' | 'cold';

export type SessionState = {
  caseId: string;
  version: number;
  read: string[];
  pinned: string[];
  /** Satisfied gate keys, e.g. "lead:L1", "breakthrough:BT-5", "search:E-17", "confront:C-1". */
  unlocked: string[];
  strings: StringCheck[];
  breakthroughs: string[];
  confrontAttempts: string[]; // "statementId|line|evidenceId"
  confrontations: string[]; // successful confrontation ids
  revealedLines: Record<string, { n: string; text: string }[]>;
  searches: string[];
  clockMinutes: number;
  hints: { nudge: number; pointer: number; reveal: number };
  accusations: VerdictAttempt[];
  status: CaseStatus;
};

export const MAX_ACCUSATIONS = 3;
export const CHECK_COST_MINUTES = 10;

export function newSession(pub: Pick<CasePublic, 'id' | 'version'>): SessionState {
  return {
    caseId: pub.id,
    version: pub.version,
    read: [],
    pinned: [],
    unlocked: [],
    strings: [],
    breakthroughs: [],
    confrontAttempts: [],
    confrontations: [],
    revealedLines: {},
    searches: [],
    clockMinutes: 0,
    hints: { nudge: 0, pointer: 0, reveal: 0 },
    accusations: [],
    status: 'active',
  };
}

export const gateKey = (g: Gate): string => `${g.kind}:${g.id}`;

export function isGateOpen(state: SessionState, gate: Gate | undefined): boolean {
  return gate === undefined || state.unlocked.includes(gateKey(gate));
}

export function visibleEvidence(pub: CasePublic, state: SessionState): Evidence[] {
  return pub.evidence.filter((e) => isGateOpen(state, e.gate));
}

export function isVisible(pub: CasePublic, state: SessionState, evidenceId: string): boolean {
  const e = pub.evidence.find((x) => x.id === evidenceId);
  return e !== undefined && isGateOpen(state, e.gate);
}

export function availableLeads(pub: CasePublic, state: SessionState) {
  return pub.leads.filter((l) => isGateOpen(state, l.gate) && !state.unlocked.includes(`lead:${l.id}`));
}

export function isWordAvailable(pub: CasePublic, state: SessionState, wordId: string): boolean {
  const w = pub.words.find((x) => x.id === wordId);
  if (!w) return false;
  if (w.revealedBy.length === 0) return true;
  return w.revealedBy.some((id) => state.read.includes(id) || state.breakthroughs.includes(id));
}

export function accusationsLeft(state: SessionState): number {
  return MAX_ACCUSATIONS - state.accusations.length;
}
