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
  /** freeLeft: hints with no ad; adLeft: hints unlocked by a rewarded video; unlimited: Case Pass. */
  hintAllowance: { freeLeft: number; adLeft: number; unlimited: boolean };
  accusations: { correctSections: number }[];
  accusationsLeft: number;
  status: 'active' | 'solved' | 'cold';
  debrief?: DebriefView;
};

/**
 * Proof the player finished a rewarded video. On the web this can't be verified server-side
 * (Google's web rewarded ads have no server callback), so the server also caps ad hints per case.
 * On mobile, AdMob server-side verification will fill `id` with a verifiable token.
 */
export type AdReward = { provider: 'gam' | 'no-fill' | 'dev'; id: string };

export type VerdictBlankView ={ blankId: string; prompt: string; options: { id: string; text: string }[] };

export type DebriefView = {
  score: ScoreBreakdown;
  steps: { step: number; time: string; text: string }[];
  solution: { who: string; how: string[]; why: string[]; proofCore: string[] };
  breakthroughs: { id: string; insight: string; found: boolean; essential: boolean }[];
};

export type PlayAction =
  | { type: 'start'; fresh?: boolean }
  | { type: 'view' }
  | { type: 'read'; evidenceId: string }
  | { type: 'lead'; leadId: string }
  | { type: 'string'; a: string; b: string; relation: Relation }
  | { type: 'confront'; statementId: string; line: number; evidenceId: string }
  | { type: 'search'; query: string }
  | { type: 'hint'; tier: 'nudge' | 'pointer' | 'reveal'; adReward?: AdReward }
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
  | {
      ok: true;
      token: string;
      view: CaseView;
      result: PlayResult;
      unlocked: { id: string; number: number; title: string }[];
      /** Account sync: where the progress came from on start, and whether this action was saved to the account. */
      sync?: { signedIn: boolean; source: 'account' | 'device' | 'new'; saved: boolean; board?: unknown };
    }
  | { ok: false; error: { code: string; message: string }; token?: string; view?: CaseView; paywall?: PaywallInfo };

/** What the player owns, safe to send to the browser. */
export type AccessSummary = {
  pass: { productId: string; source: string; expiresAt: string | null } | null;
  cases: string[];
};

/** Sent with a 402 when a paid case is opened without access. */
export type PaywallInfo = { slug: string; title: string; productId: 'case-standard' | 'case-premium'; signedIn: boolean };
