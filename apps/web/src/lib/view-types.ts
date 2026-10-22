import type { Evidence, Lead, Relation, ScoreBreakdown, StringCheck } from '@unsealed/engine';

/** Everything the browser is allowed to know. Built on the server from case + solution + state. */
export type CaseView = {
  case: {
    id: string;
    title: string;
    hook: string;
    city: { name: string; country: string };
    difficulty: number;
    estMinutes: [number, number];
    contentNotes: string[];
    parHours: number;
    briefing: string;
    suspects: { id: string; name: string; role: string; short: string }[];
    archive: { label: string; placeholder: string };
    totalEvidence: number;
    totalBreakthroughs: number;
    verdict: {
      who: { blankId: string; prompt: string }[];
      how: VerdictBlankView[];
      why: VerdictBlankView[];
      proofCount: number;
    };
  };
  evidence: Evidence[];
  leads: { available: Lead[]; followed: Lead[] };
  breakthroughs: { id: string; insight: string }[];
  strings: StringCheck[];
  revealedLines: Record<string, { n: string; text: string }[]>;
  confrontAttempts: string[];
  read: string[];
  searches: string[];
  clockMinutes: number;
  hints: { nudge: number; pointer: number; reveal: number };
  hintsLeft: number | null;
  accusations: { correctSections: number }[];
  accusationsLeft: number;
  status: 'active' | 'solved' | 'cold';
  debrief?: DebriefView;
};

export type VerdictBlankView = { blankId: string; prompt: string; options: { id: string; text: string }[] };

export type DebriefView = {
  score: ScoreBreakdown;
  steps: { step: number; time: string; text: string }[];
  solution: { who: string; how: string[]; why: string[]; proofCore: string[] };
  breakthroughs: { id: string; insight: string; found: boolean; essential: boolean }[];
};

export type PlayAction =
  | { type: 'start' }
  | { type: 'view' }
  | { type: 'read'; evidenceId: string }
  | { type: 'lead'; leadId: string }
  | { type: 'string'; a: string; b: string; relation: Relation }
  | { type: 'confront'; statementId: string; line: number; evidenceId: string }
  | { type: 'search'; query: string }
  | { type: 'hint'; tier: 'nudge' | 'pointer' | 'reveal' }
  | {
      type: 'verdict';
      answer: { who: Record<string, string>; how: Record<string, string>; why: Record<string, string>; proof: string[] };
    };

export type PlayResult =
  | { type: 'string'; valid: boolean; duplicate: boolean; breakthrough?: { id: string; insight: string } }
  | { type: 'confront'; valid: boolean; duplicate: boolean; revealLines: { n: string; text: string }[] }
  | { type: 'search'; query: string; results: { id: string; number: number; title: string }[] }
  | { type: 'lead'; title: string; costHours: number }
  | { type: 'hint'; tier: string; text: string; cost: number }
  | { type: 'verdict'; correctSections: number; accusationsLeft: number; status: string }
  | { type: 'none' };

export type PlayResponse =
  | { ok: true; token: string; view: CaseView; result: PlayResult; unlocked: { id: string; number: number; title: string }[] }
  | { ok: false; error: { code: string; message: string }; token?: string; view?: CaseView };
